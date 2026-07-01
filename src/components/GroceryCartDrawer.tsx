import React, { useState } from "react";
import { UserProfile, GroceryOrderItem, GroceryDeliveryConfig } from "../types";
import { X, ShoppingBag, MapPin, Phone, User, AlertTriangle, ShieldCheck, Heart, Edit2, Compass, Trash2, CheckCircle } from "lucide-react";
import { LazyImage } from "./LazyImage";

interface GroceryCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: GroceryOrderItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  deliveryConfig: GroceryDeliveryConfig;
  onPlaceGroceryOrder: (details: {
    name: string;
    phone: string;
    location: { area: string; street: string; lat?: number; lng?: number; googleMapsLink?: string };
    items: GroceryOrderItem[];
    totalPrice: number;
    deliveryFee: number;
    grandTotal: number;
    userCoords?: { latitude: number; longitude: number };
  }) => Promise<void>;
  userCoords?: { latitude: number; longitude: number } | null;
}

export default function GroceryCartDrawer({
  isOpen,
  onClose,
  cartItems = [],
  onUpdateQuantity,
  onRemoveItem,
  currentUser,
  onOpenAuth,
  deliveryConfig,
  onPlaceGroceryOrder,
  userCoords,
}: GroceryCartDrawerProps) {
  const [nameInput, setNameInput] = useState(currentUser?.name || "");
  const [phoneInput, setPhoneInput] = useState(currentUser?.phone || "");
  const [areaInput, setAreaInput] = useState(currentUser?.savedLocation?.area || currentUser?.address || "");
  const [streetInput, setStreetInput] = useState(currentUser?.savedLocation?.street || "");
  const [submitting, setSubmitting] = useState(false);




  if (!isOpen) return null;

  // Totals calculations
  const totalGroceryPrice = cartItems.reduce(
    (acc, item) => acc + (item.price) * item.quantity,
    0
  );

  // Delivery configuration calculations
  const deliveryRequired = totalGroceryPrice > 0;
  const isFreeDelivery = totalGroceryPrice >= (deliveryConfig?.freeDeliveryAboveAmount || 1000);
  const baseDeliveryFee = deliveryConfig?.baseDeliveryFee || 40;
  // If grocery total is below 500, double the base delivery fee!
  const isDoubleFee = totalGroceryPrice < 500;
  const deliveryFeeRate = isDoubleFee ? baseDeliveryFee * 2 : baseDeliveryFee;
  const finalDeliveryFee = !deliveryRequired
    ? 0
    : isFreeDelivery
    ? 0
    : deliveryFeeRate;

  const taxesAmount = Math.round(totalGroceryPrice * 0.02); // 2% GST
  const grandTotal = totalGroceryPrice + finalDeliveryFee + taxesAmount;

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) return;
    setSubmitting(true);

    let finalName = nameInput.trim() || currentUser?.name || "";
    let finalPhone = currentUser?.phone || phoneInput.trim() || "";
    let finalArea = areaInput.trim();
    let finalStreet = streetInput.trim();

    if (!finalName || !finalPhone || !finalArea || !finalStreet) {
      alert("Please enter your name, contact phone, and complete delivery location to complete the purchase!");
      setSubmitting(false);
      return;
    }

    let activeCoords = userCoords;

    // Enforce GPS pinpoint map coordinates for every order if not already active
    if (!activeCoords) {
      const wantGPS = window.confirm(
        "📍 LOCATE VIA GPS!\n\nWe require your precise GPS location to ensure our riders navigate directly to your doorstep.\n\nPlease allow auto-detect location to continue placing your order."
      );
      if (wantGPS) {
        try {
          alert("Acquiring GPS coordinates...");
          const coords = await new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
              (err) => reject(err),
              { enableHighAccuracy: true, timeout: 8000 }
            );
          });
          activeCoords = coords;
          alert("📍 GPS pinpoint successfully attached! Your rider will receive turn-by-turn directions.");
        } catch (err) {
          alert("❌ Could not fetch GPS location. Location access is required to place an order!");
          setSubmitting(false);
          return;
        }
      } else {
        alert("❌ Location access is required to place an order!");
        setSubmitting(false);
        return;
      }
    }

    try {
      await onPlaceGroceryOrder({
        name: finalName,
        phone: finalPhone,
        location: {
          area: finalArea,
          street: finalStreet,
          lat: activeCoords?.latitude,
          lng: activeCoords?.longitude,
          googleMapsLink: activeCoords ? `https://maps.google.com/?q=${activeCoords.latitude},${activeCoords.longitude}` : undefined
        },
        items: cartItems,
        totalPrice: totalGroceryPrice,
        deliveryFee: finalDeliveryFee,
        grandTotal: grandTotal,
        userCoords: activeCoords || undefined,
      });
      onClose();
    } catch (err) {
      console.error("Order submission fail:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-zinc-950 text-zinc-100 border-l border-zinc-900 shadow-2xl flex flex-col h-full">
          
          {/* Header */}
          <div className="p-5 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/40">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-pink-500" />
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-zinc-100">Dadu Grocery Basket</h3>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Standalone Express Checkout</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900/60 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart items list */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-20 space-y-4">
                <div className="w-16 h-16 bg-pink-600/10 border border-orange-500/20 rounded-full flex items-center justify-center text-orange-500">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-200">Your basket is empty</h4>
                  <p className="text-[10.5px] text-zinc-500 font-semibold max-w-xs leading-normal">
                    Browse our ultra fresh categories and tap "Add To Grocery Cart" to populate your express shipping!
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase text-orange-500 tracking-widest block mb-2">Itemized List ({cartItems.length})</span>
                {cartItems.map((item) => (
                  <div
                    key={item.productId}
                    className="bg-zinc-900/40 border border-zinc-900/80 p-3 rounded-2xl flex items-center gap-3"
                  >
                    <LazyImage src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-xl overflow-hidden shrink-0" referrerPolicy="no-referrer" />
                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-xs text-zinc-100 truncate">{item.name}</h5>
                      <span className="text-[10px] text-zinc-400 block font-semibold">Unit: {item.unit} • Price: Rs. {item.price}</span>
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center gap-2 border border-zinc-800 p-1 rounded-xl bg-zinc-950">
                      <button
                        onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                        className="w-5 h-5 rounded-md bg-zinc-900 hover:bg-zinc-850 text-zinc-400 font-bold flex items-center justify-center text-xs active:scale-90"
                      >
                        -
                      </button>
                      <span className="text-[11px] font-mono font-black text-white px-0.5">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                        className="w-5 h-5 rounded-md bg-orange-600/80 hover:bg-orange-600 text-white font-bold flex items-center justify-center text-xs active:scale-90"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => onRemoveItem(item.productId)}
                      className="p-1.5 bg-pink-950/20 hover:bg-pink-950 text-pink-400 rounded-lg hover:text-pink-300 transition shrink-0 cursor-pointer"
                      title="Remove product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Address Form or Credentials Check */}
            {cartItems.length > 0 && (
              <div className="bg-zinc-900/50 border border-zinc-900 p-4.5 rounded-2.5xl space-y-4">
                <span className="text-[10px] font-black uppercase text-orange-500 tracking-widest block">Recipient and Shipping info</span>

                {!currentUser ? (
                  <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl text-center space-y-2">
                    <p className="text-[10.5px] text-orange-200 font-semibold leading-relaxed">
                      💡 Sign in to automatically map your pre-configured address info and track deliveries instantly!
                    </p>
                    <button
                      type="button"
                      onClick={onOpenAuth}
                      className="text-xs bg-orange-600 text-white py-1.5 px-4 rounded-lg font-black uppercase tracking-wider hover:bg-orange-700 transition"
                    >
                      Sign In Now
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 text-zinc-300">
                      <User className="w-4 h-4 text-orange-500 shrink-0" />
                      <span className="font-bold">{currentUser.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-300">
                      <Phone className="w-4 h-4 text-orange-400 shrink-0" />
                      <span className="font-semibold font-mono">{currentUser.phone}</span>
                    </div>

                    <div className="border-t border-zinc-850 pt-2 mt-2 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-zinc-300">
                          <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                          <span className="font-bold text-zinc-250 truncate">Shipment Destination Address:</span>
                        </div>

                      </div>

                        <p className="bg-zinc-950 p-2.5 rounded-xl text-[11px] text-zinc-300 font-semibold line-clamp-2 leading-normal border border-zinc-850">
                          {currentUser?.savedLocation?.area ? currentUser.savedLocation.area + ', ' + currentUser.savedLocation.street : currentUser.address}
                        </p>
                    </div>
                  </div>
                )}

                {/* Form Inputs for guest checkouts */}
                {!currentUser && (
                  <form onSubmit={handleCheckoutSubmit} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Recipient Name</label>
                      <input
                        type="text"
                        required
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="E.g., Muhammad Faisal"
                        className="w-full p-2.5 bg-zinc-955 border border-zinc-800 rounded-xl text-xs outline-none text-zinc-100 placeholder-zinc-600 focus:border-orange-500 transition"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">WhatsApp / Contact Phone</label>
                      <input
                        type="tel"
                        required
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="E.g., 03277004471"
                        className="w-full p-2.5 bg-zinc-955 border border-zinc-800 rounded-xl text-xs outline-none text-zinc-100 placeholder-zinc-600 focus:border-orange-500 transition font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Area Name</label>
                      <input
                        type="text"
                        required
                        value={areaInput}
                        onChange={(e) => setAreaInput(e.target.value)}
                        placeholder="e.g. Shahani Muhalla"
                        className="w-full p-2.5 bg-zinc-955 border border-zinc-800 rounded-xl text-xs outline-none text-zinc-100 focus:border-orange-500 transition"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Street / House No.</label>
                      <input
                        type="text"
                        required
                        value={streetInput}
                        onChange={(e) => setStreetInput(e.target.value)}
                        placeholder="e.g. Gali No 5"
                        className="w-full p-2.5 bg-zinc-955 border border-zinc-800 rounded-xl text-xs outline-none text-zinc-100 focus:border-orange-500 transition"
                      />
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Pricing & Checkout Panel */}
          {cartItems.length > 0 && (
            <div className="p-5 border-t border-zinc-900 bg-zinc-900/60 space-y-4">
              <div className="space-y-1.5 text-xs">
                {totalGroceryPrice < 500 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-[10.5px] text-amber-400 flex items-start gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold block text-amber-300">Delivery Charges Doubled (Below Rs. 500)</span>
                      Rs. 500 se kam order par delivery charges double hain. Add Rs. {500 - totalGroceryPrice} more grocery items to get standard delivery!
                    </div>
                  </div>
                )}
                <div className="flex justify-between text-zinc-400 font-semibold">
                  <span>Cart Subtotal</span>
                  <span>Rs. {totalGroceryPrice}</span>
                </div>
                
                {/* GST Tax representation */}
                <div className="flex justify-between text-zinc-400 font-semibold">
                  <span>GST/Standard Retail Tax (2%)</span>
                  <span>Rs. {taxesAmount}</span>
                </div>

                {/* Delivery fee checkout representation using only grocery settings! */}
                <div className="flex justify-between text-zinc-400 font-semibold">
                  <span>Grocery Shipping Fee</span>
                  <span>
                    {isFreeDelivery ? (
                      <span className="text-emerald-500 font-black uppercase">FREE SHIPPING</span>
                    ) : (
                      `Rs. ${finalDeliveryFee}`
                    )}
                  </span>
                </div>

                {/* Free Delivery Promo Bar */}
                {!isFreeDelivery && (
                  <div className="text-[9.5px] bg-orange-650/15 text-orange-400 border border-orange-500/20 p-2 rounded-lg font-bold uppercase tracking-wide text-center">
                    💡 Spend Rs. {deliveryConfig?.freeDeliveryAboveAmount - totalGroceryPrice} more to claim FREE SHIPPING!
                  </div>
                )}

                <div className="border-t border-zinc-805 my-2.5 pt-2 flex justify-between text-white font-black text-sm">
                  <span>TOTAL BILLING</span>
                  <span className="font-mono text-orange-500">Rs. {grandTotal}</span>
                </div>
              </div>

              {/* Secure checkout info indicator */}
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-850 flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-[9.5px] leading-snug">
                  <span className="font-black text-white block uppercase tracking-wider">CASH ON DELIVERY (COD) EXPRESS</span>
                  <p className="text-zinc-500 font-semibold mt-0.5">Pay only when products get delivered safely within minutes. Fast packing & premium quality guarantee.</p>
                </div>
              </div>

              {!userCoords && (
                <div className="bg-pink-500/10 border border-red-500/20 rounded-xl p-3 text-center flex flex-col items-center justify-center gap-2">
                  <span className="text-pink-400 text-xs font-bold uppercase tracking-tight flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Location Access Required
                  </span>
                  <span className="text-pink-300/70 text-[10px] leading-tight max-w-[250px]">
                    Please allow GPS location access to place your order. This ensures accurate and fast delivery to your exact doorstep.
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        alert("Getting high precision coordinates... Please permit browser prompts if any.");
                        const coords = await new Promise<{ latitude: number, longitude: number }>((resolve, reject) => {
                          navigator.geolocation.getCurrentPosition(
                            (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                            (err) => reject(err),
                            { enableHighAccuracy: true, timeout: 8000 }
                          );
                        });
                        // setUserCoords(coords);
                        alert("📍 GPS pinpoint successfully attached! Your rider will receive turn-by-turn directions.");
                      } catch (err: any) {
                        alert("❌ Could not fetch GPS location. Location access is required to place an order!");
                      }
                    }}
                    className="mt-1 bg-red-500 hover:bg-pink-600 text-white font-bold text-[10px] uppercase tracking-wider py-2 px-5 rounded-lg transition-colors cursor-pointer"
                  >
                    Allow Location Access
                  </button>
                </div>
              )}

              <button
                onClick={handleCheckoutSubmit}
                disabled={submitting}
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-850 text-white font-black text-xs uppercase tracking-widest rounded-2-xl shadow-xl shadow-orange-600/10 transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {submitting ? (
                  <>Packing Shipment...</>
                ) : !userCoords ? (
                  <>
                    <MapPin className="w-4 h-4" />
                    Grant Location to Place Order
                  </>
                ) : (
                  <>Place Express Grocery Order (COD) 🛒</>
                )}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
