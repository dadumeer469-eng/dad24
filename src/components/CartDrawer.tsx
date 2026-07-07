import React, { useState } from "react";
import { UserProfile, OrderItem, Voucher } from "../types";
import { X, ShoppingBag, MapPin, Phone, User, AlertTriangle, ShieldCheck, Heart, Edit2, Compass, Tag, Loader2 } from "lucide-react";
import { CHECKOUT_DRINKS } from "../data";
import { LazyImage } from "./LazyImage";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: OrderItem[];
  onUpdateQuantity: (dishId: string, quantity: number) => void;
  onRemoveItem: (dishId: string) => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  deliveryFee: number; // Stored inside Firestore settings!
  onPlaceOrder: (details: { name: string; phone: string; location: { area: string; street: string; lat?: number; lng?: number; googleMapsLink?: string }; paymentMethod: string; orderType: "food" | "service"; userCoords?: { latitude: number; longitude: number }; voucher?: { code: string; discountAmount: number } }) => Promise<void>;
  onAddDrink: (drink: any) => void;
  userCoords?: { latitude: number; longitude: number } | null;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  currentUser,
  onOpenAuth,
  deliveryFee,
  onPlaceOrder,
  onAddDrink,
  userCoords,
}: CartDrawerProps) {
  const [submitting, setSubmitting] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{code: string, discountAmount: number, successMessage?: string} | null>(null);
  const [voucherError, setVoucherError] = useState("");
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);




  React.useEffect(() => {
    if (!isOpen || cartItems.length === 0) {
      setVoucherCode("");
      setAppliedVoucher(null);
      setVoucherError("");
    }
  }, [isOpen, cartItems.length]);

  if (!isOpen) return null;

  const totalFoodItemsPrice = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  
  // Checking if there are only services or foods in the cart
  const hasFood = cartItems.some((item) => item.type === "food");
  const hasService = cartItems.some((item) => item.type === "service");

  // Determine delivery charge: Rs. 0 for pure diagnostic home services, custom delivery charge for food!
  // If order total (items price) is below 500, double the delivery fee!
  const isDoubleFee = hasFood && totalFoodItemsPrice < 500;
  const finalDeliveryFee = hasFood ? (isDoubleFee ? deliveryFee * 2 : deliveryFee) : 0;
  
  let grandTotal = totalFoodItemsPrice + finalDeliveryFee;
  if (appliedVoucher) {
    grandTotal = Math.max(0, grandTotal - appliedVoucher.discountAmount);
  }

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) return;
    setVoucherError("");
    setIsApplyingVoucher(true);
    
    try {
      const code = voucherCode.toUpperCase().trim();
      const docRef = doc(db, "vouchers", code);
      const snap = await getDoc(docRef);
      
      if (!snap.exists()) {
        setVoucherError("Invalid voucher code.");
        setIsApplyingVoucher(false);
        return;
      }
      
      const v = snap.data() as Voucher;
      
      if (!v.isActive) {
        setVoucherError("This voucher is inactive.");
        setIsApplyingVoucher(false);
        return;
      }
      if (v.currentUses >= v.maxUses) {
        setVoucherError("This voucher has reached its usage limit.");
        setIsApplyingVoucher(false);
        return;
      }
      if (v.minOrderAmount && totalFoodItemsPrice < v.minOrderAmount) {
        setVoucherError(`Minimum order amount of Rs ${v.minOrderAmount} required.`);
        setIsApplyingVoucher(false);
        return;
      }
      
      let discountAmount = 0;
      if (v.discountType === "percentage") {
        discountAmount = (totalFoodItemsPrice * v.discountValue) / 100;
        if (v.maxDiscountAmount) {
          discountAmount = Math.min(discountAmount, v.maxDiscountAmount);
        }
      } else {
        discountAmount = v.discountValue;
      }
      
      setAppliedVoucher({
        code: v.code,
        discountAmount: Math.round(discountAmount),
        successMessage: v.successMessage
      });
      
    } catch (err) {
      setVoucherError("Failed to apply voucher.");
    }
    
    setIsApplyingVoucher(false);
  };

  // Handles auto checkout detail mapping
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    if (!currentUser) {
      alert("Please Sign In or Register to place your order!");
      onOpenAuth();
      return;
    }

    const userHasNoAddress = !currentUser.address && (!currentUser.savedLocation?.area || !currentUser.savedLocation?.street);
    if (userHasNoAddress) {
      alert("Address not assigned! Please contact the admin to configure your delivery address.");
      return;
    }

    setSubmitting(true);

    let finalName = currentUser?.name || "";
    const isFirstOrder = !currentUser.ordersCount || currentUser.ordersCount === 0 || !currentUser.name;

    if (isFirstOrder) {
      const promptName = window.prompt("Pehli dafa order karne par apna naam dalein (Please enter your name):");
      if (!promptName || !promptName.trim()) {
        alert("Naam dalna lazmi hai order karne ke liye! (Name is required to place an order!)");
        setSubmitting(false);
        return;
      }
      finalName = promptName.trim();
    }

    let finalPhone = currentUser?.phone || "";
    let finalArea = currentUser?.savedLocation?.area || "";
    let finalStreet = currentUser?.savedLocation?.street || "";

    if (!finalArea || !finalStreet) {
      if (currentUser?.address) {
        const parts = currentUser.address.split(",");
        finalArea = parts[0]?.trim() || currentUser.address;
        finalStreet = parts.slice(1).join(",")?.trim() || "Default Street";
      }
    }

    if (!finalName || !finalPhone || !finalArea || !finalStreet) {
      alert("Delivery details are incomplete. Please contact admin to configure your profile!");
      setSubmitting(false);
      return;
    }

    // Determine type
    const orderTypeValue = hasService && !hasFood ? "service" : "food";
    const paymentMethodValue = orderTypeValue === "service" ? "Pay on Appointment" : "COD";

    let activeCoords = userCoords;
    
    try {
      // Force fetch fresh pinpoint location for every order
      const coords = await new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
      });
      activeCoords = coords;
    } catch (err) {
      console.error("Could not fetch fresh GPS location", err);
      if (!activeCoords) {
        alert("❌ Could not fetch GPS location. Location access is required to place an order!");
        setSubmitting(false);
        return;
      }
    }

    try {
      await onPlaceOrder({
        name: finalName,
        phone: finalPhone,
        location: {
          area: finalArea,
          street: finalStreet,
          lat: activeCoords?.latitude,
          lng: activeCoords?.longitude,
          googleMapsLink: activeCoords ? `https://maps.google.com/?q=${activeCoords.latitude},${activeCoords.longitude}` : undefined
        },
        paymentMethod: paymentMethodValue,
        orderType: orderTypeValue,
        userCoords: activeCoords || undefined,
        voucher: appliedVoucher ? { code: appliedVoucher.code, discountAmount: appliedVoucher.discountAmount } : undefined,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
      {/* Tap space to slide out drawer */}
      <div className="flex-1" onClick={onClose}></div>

      <div className="w-full max-w-md bg-zinc-900 text-zinc-100 h-full flex flex-col shadow-2xl border-l border-zinc-800 animate-slide-in">
        
        {/* Banner with close */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#D70F64]" />
            <h3 className="font-extrabold text-sm tracking-wide text-zinc-100 uppercase">Your Delivery Cart</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-850 rounded-full transition cursor-pointer text-zinc-400 hover:text-zinc-250"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List of items inside the drawer */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-950">
          
          {cartItems.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <span className="text-4xl block animate-bounce">🛒</span>
              <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Your Dadu Cart is empty!</p>
              <button
                onClick={onClose}
                className="bg-[#D70F64] hover:bg-[#b00c50] transition text-white font-black text-xs uppercase tracking-wider py-3 px-6 rounded-xl cursor-pointer shadow-xs"
              >
                Go Add Tea & Food
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {cartItems.map((item) => (
                <div key={item.dishId} className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-zinc-100 block truncate">{item.name}</span>
                      {item.type === "service" && (
                        <span className="bg-amber-950/40 border border-amber-900/40 text-amber-500 text-[9px] font-black uppercase px-2 py-0.5 rounded-sm shrink-0">
                          Service
                        </span>
                      )}
                    </div>
                    {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                      <div className="text-[10px] text-zinc-400 font-medium mt-0.5">
                        Add-ons: {Object.entries(item.selectedAddOns.reduce((acc, curr) => {
                          acc[curr.name] = (acc[curr.name] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)).map(([name, count]) => `${Number(count) * (item.quantity || 1)}x ${name}`).join(', ')}
                      </div>
                    )}
                    {item.specialInstructions && (
                      <div className="text-[10px] text-zinc-400 font-medium mt-0.5 italic">
                        Note: {item.specialInstructions}
                      </div>
                    )}
                    <div className="text-[10px] text-[#D70F64] font-black tracking-wider uppercase flex items-center gap-1 select-none mt-0.5">
                      <span>🏪</span> {item.restaurantName || (item.type === "service" ? "Dadu Home Services" : "Dadu Fast Food & Kitchen")}
                    </div>
                    <span className="text-xs text-zinc-400 font-bold block mt-0.5">Rs. {item.price} each</span>
                  </div>

                  {/* Quantity adjustments */}
                  <div className="flex items-center gap-2 select-none shrink-0 bg-zinc-950 border border-zinc-800 p-1 rounded-xl">
                    <button
                      onClick={() => onUpdateQuantity(item.dishId, item.quantity - 1)}
                      className="w-6 h-6 rounded-lg text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 font-extrabold flex items-center justify-center cursor-pointer hover:bg-zinc-800"
                    >
                      -
                    </button>
                    <span className="text-xs font-black min-w-4 text-center text-zinc-200">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(item.dishId, item.quantity + 1)}
                      className="w-6 h-6 rounded-lg text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 font-extrabold flex items-center justify-center cursor-pointer hover:bg-zinc-800"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.dishId)}
                    className="p-1 text-zinc-450 hover:text-[#D70F64] shrink-0 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Checkout-Exclusive Drinks Recommendation Section */}
          {cartItems.length > 0 && (
            <div className="bg-gradient-to-br from-[#D70F64]/5 to-zinc-900 border border-[#D70F64]/15 p-4 rounded-3xl mt-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[#D70F64] flex items-center gap-1.5">
                  <span className="text-base">🥤</span> Complete Your Meal
                </span>
                <span className="bg-[#D70F64]/10 text-[#D70F64] text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
                  Checkout Exclusive
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-semibold leading-tight">
                Add an ice-cold beverage to go with your hot food! (Served chilled)
              </p>

              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory">
                {CHECKOUT_DRINKS.map((drink) => {
                  const alreadyInCart = cartItems.find(item => item.dishId === drink.id);
                  return (
                    <div 
                      key={drink.id} 
                      className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-2.5 w-36 shrink-0 flex flex-col justify-between gap-2 snap-start hover:border-[#D70F64]/30 transition"
                    >
                      <div className="relative h-20 rounded-xl overflow-hidden bg-zinc-900 shrink-0">
                        <LazyImage 
                          src={drink.imageUrl} 
                          alt={drink.name} 
                          className="w-full h-full"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-xs text-[8px] font-black text-white px-1.5 py-0.5 rounded">
                          Rs. {drink.price}
                        </div>
                      </div>
                      
                      <div className="space-y-1 min-w-0 flex-1">
                        <h5 className="font-extrabold text-[11px] text-zinc-100 truncate leading-tight">{drink.name}</h5>
                        <p className="text-[9px] text-zinc-500 font-semibold truncate leading-none">{drink.description}</p>
                      </div>

                      {alreadyInCart ? (
                        <div className="flex items-center justify-between bg-[#D70F64]/10 border border-[#D70F64]/20 p-0.5 rounded-xl text-xs">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(drink.id, alreadyInCart.quantity - 1)}
                            className="w-5 h-5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-extrabold flex items-center justify-center cursor-pointer hover:bg-zinc-800"
                          >
                            -
                          </button>
                          <span className="text-[10px] font-black text-zinc-200">{alreadyInCart.quantity}</span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(drink.id, alreadyInCart.quantity + 1)}
                            className="w-5 h-5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-extrabold flex items-center justify-center cursor-pointer hover:bg-zinc-800"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAddDrink(drink)}
                          className="w-full bg-[#D70F64] hover:bg-[#b00c50] text-white py-1.5 rounded-xl font-black text-[9px] uppercase tracking-wider transition cursor-pointer text-center hover:scale-[1.02] active:scale-95"
                        >
                          + Add Drink
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Checkout address inputs flow */}
          {cartItems.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-3xl mt-6 space-y-4 shadow-3xs">
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-300 border-b border-zinc-800 pb-2 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#D70F64]" />
                Delivery Information Details
              </h4>

              <div className="space-y-2.5 pt-2">
                {currentUser ? (
                  <div className="space-y-3">
                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-1">
                      <span className="text-[10px] font-black uppercase text-zinc-450 tracking-wider block">Customer Name</span>
                      <p className="text-xs text-zinc-200 font-bold leading-normal">{currentUser.name || "No name configured"}</p>
                    </div>

                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-1">
                      <span className="text-[10px] font-black uppercase text-zinc-450 tracking-wider block">Delivery Address</span>
                      {currentUser.address ? (
                        <p className="text-xs text-zinc-200 font-bold leading-normal">{currentUser.address}</p>
                      ) : (
                        <p className="text-xs text-rose-500 font-black leading-normal">
                          No address assigned! Please contact Admin to configure your delivery address.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-center">
                    <p className="text-xs text-zinc-400 font-semibold">Please sign in to place your order</p>
                  </div>
                )}

                {userCoords ? (
                  <div className="bg-zinc-950 border border-emerald-500/30 rounded-xl overflow-hidden relative">
                    {/* Simulated Map Background */}
                    <div className="h-24 w-full bg-zinc-900 relative overflow-hidden">
                      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500 via-zinc-900 to-zinc-900"></div>
                      {/* Grid pattern */}
                      <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#3f3f46 1px, transparent 1px), linear-gradient(90deg, #3f3f46 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.2 }}></div>
                      {/* Pin */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-bounce">
                        <div className="bg-[#D70F64] text-white p-1.5 rounded-full shadow-lg">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="w-1.5 h-1.5 bg-black/40 rounded-full mt-1 blur-[1px]"></div>
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[10px] uppercase tracking-wider mb-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            Location coordinates attached
                          </div>
                          <p className="text-zinc-200 text-xs font-bold">{currentUser?.savedLocation?.area || currentUser?.address?.split(',')[0]?.trim() || "Location detected"}</p>
                          <p className="text-zinc-400 text-[10px]">{currentUser?.savedLocation?.street || currentUser?.address?.split(',')[1]?.trim() || "Auto-filled"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex flex-col items-center text-center gap-2">
                    <MapPin className="w-6 h-6 text-zinc-500 animate-pulse" />
                    <p className="text-zinc-400 text-xs font-bold">Detecting your exact location...</p>
                  </div>
                )}
              </div>

              {/* Secure Loyalty Indicator */}
              {currentUser && currentUser.ordersCount > 0 && (
                <div className="bg-[#D70F64]/10 border border-[#D70F64]/20 text-[#D70F64] text-[11px] p-2.5 rounded-2xl flex items-center gap-2 font-bold">
                  <Heart className="w-4 h-4 fill-[#D70F64] text-[#D70F64] shrink-0 animate-pulse" />
                  <span>
                    Thank you! You are a **Loyal Customer** with **{currentUser.ordersCount} previous orders!**
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Diagnostic Visitation Note for Pure Home Services ordered to omit Food terms */}
          {hasService && (
            <div className="bg-amber-950/20 border border-amber-900/40 text-amber-500 text-xs p-3.5 rounded-3xl mt-4 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
              <div>
                <span className="font-extrabold block">⚠️ Visitation & Checkup Note:</span>
                <p className="text-[10.5px] text-zinc-400 mt-1 leading-relaxed font-semibold">
                  The Rs. 500 charge is purely the diagnostic/visitation fee (Aane ke charges). Complete material and secondary repair estimates will be evaluated and quoted on-site by the technician once they inspect the job at your home.
                </p>
              </div>
            </div>
          )}

          {/* GPS Location Pinpoint Widget for buyers */}
          {cartItems.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-3xl space-y-2 mt-4">
              <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                <span className="text-[10px] font-black uppercase text-pink-400 tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> GPS PINPOINT TRACKING
                </span>
                {userCoords ? (
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">Locked</span>
                ) : (
                  <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">Missing</span>
                )}
              </div>
              
              {userCoords ? (
                <div className="text-zinc-300 text-xs font-semibold flex items-center justify-between">
                  <span>📍 Doorstep Pin Coordinates Locked ({userCoords.latitude.toFixed(5)}, {userCoords.longitude.toFixed(5)})</span>

                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-[10.5px] text-zinc-400 font-semibold leading-normal">
                    Recommended: Lock your high-accuracy GPS coordinates so our delivery riders can locate you directly on the Google Map directions!
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      alert("Requesting high-precision GPS coordinate signal... Please accept browser permissions.");
                      if (!navigator.geolocation) {
                        alert("Geolocation is not supported by your browser status.");
                        return;
                      }
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          //  latitude: pos.coords.latitude, longitude: pos.coords.longitude });
                          alert("📍 Pinpoint GPS Coordinates Locked successfully!");
                        },
                        (err) => {
                          alert(`GPS Signal Retrieval Fail: ${err.message}. Please input address manually.`);
                        },
                        { enableHighAccuracy: true, timeout: 8000 }
                      );
                    }}
                    className="bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-[#D70F64] font-black text-[10px] uppercase py-2 px-3.5 rounded-xl w-full transition cursor-pointer text-center block"
                  >
                    🛰️ Auto-Detect & Pinpoint Current GPS Location
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Pricing Summary Bottom Card */}
        {cartItems.length > 0 && (
          <div className="p-4 bg-zinc-950 border-t border-zinc-800 space-y-3.5 rounded-t-3xl shadow-2xl shrink-0">
            {hasFood && totalFoodItemsPrice < 500 && (
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3 text-[11px] text-amber-400 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold block text-amber-300">Delivery Charges Doubled (Below Rs. 500)</span>
                  Rs. 500 se kam order par delivery charges double hain. Add Rs. {500 - totalFoodItemsPrice} more of delicious food to get standard delivery rate!
                </div>
              </div>
            )}
            {/* Voucher Section */}
            <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-3xl space-y-3 mt-4">
              <div className="flex items-center gap-2 text-pink-400 font-black uppercase tracking-widest text-[10px]">
                <Tag className="w-4 h-4" /> Apply Promo Code
              </div>
              
              {appliedVoucher ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 flex justify-between items-center">
                  <div className="text-emerald-400 font-bold text-xs flex flex-col">
                    <span className="font-black uppercase tracking-wider">{appliedVoucher.code} APPLIED</span>
                    <span className="text-[10px] mt-0.5">{appliedVoucher.successMessage || 'Voucher applied successfully!'}</span>
                  </div>
                  <button 
                    onClick={() => {
                      setAppliedVoucher(null);
                      setVoucherCode("");
                    }}
                    className="text-emerald-400 hover:text-emerald-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      placeholder="ENTER CODE"
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-bold text-white uppercase outline-none focus:border-pink-500/50 transition-colors"
                    />
                    <button
                      onClick={handleApplyVoucher}
                      disabled={isApplyingVoucher || !voucherCode.trim()}
                      className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
                    >
                      {isApplyingVoucher ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                    </button>
                  </div>
                  {voucherError && <div className="text-red-400 text-[10px] font-bold px-1">{voucherError}</div>}
                </div>
              )}
            </div>

            <div className="space-y-1.5 text-xs text-zinc-400 font-semibold mt-4">
              <div className="flex justify-between">
                <span>Items Subtotal:</span>
                <span className="text-zinc-100 font-extrabold font-mono">Rs. {totalFoodItemsPrice}</span>
              </div>
              
              {appliedVoucher && (
                <div className="flex justify-between text-emerald-400">
                  <span>Voucher Discount:</span>
                  <span className="font-extrabold font-mono">- Rs. {appliedVoucher.discountAmount}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Delivery / Service Fee:</span>
                <span className="text-zinc-100 font-extrabold">
                  {finalDeliveryFee === 0 ? (
                    <span className="text-emerald-500 font-black">FREE (Home Service Booking)</span>
                  ) : (
                    <span className="font-mono">Rs. {finalDeliveryFee}</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-zinc-100 text-sm font-black border-t border-zinc-855 pt-2.5">
                <span>Grand Total:</span>
                <span className="text-[#D70F64] text-base font-bold font-mono">Rs. {grandTotal}</span>
              </div>
            </div>



            <button
              onClick={handleSubmitOrder}
              disabled={submitting}
              className={`w-full ${!userCoords ? 'bg-pink-600 hover:bg-orange-700' : 'bg-[#D70F64] hover:bg-[#b00c50]'} text-white py-3 rounded-2xl font-black uppercase text-xs tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75`}
            >
              {submitting ? (
                <>Loading...</>
              ) : !userCoords ? (
                <>
                  <MapPin className="w-4 h-4" />
                  Locating...
                </>
              ) : hasService && !hasFood ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Book Service (Pay on Visit)
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Order Lagao!
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
