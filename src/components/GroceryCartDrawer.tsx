import React, { useState } from "react";
import { UserProfile, GroceryOrderItem, GroceryDeliveryConfig, getUserCoins } from "../types";
import { X, ShoppingBag, MapPin, Phone, User, AlertTriangle, ShieldCheck, Heart, Edit2, Compass, Trash2, CheckCircle, Coins } from "lucide-react";
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
    coinsUsed?: number;
  }) => Promise<void>;
  userCoords?: { latitude: number; longitude: number } | null;
  onUpdateUserCoords?: (coords: { latitude: number; longitude: number }) => void;
  systemSettings?: any;
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
  onUpdateUserCoords,
  systemSettings,
}: GroceryCartDrawerProps) {
  const [submitting, setSubmitting] = useState(false);
  const [useCoins, setUseCoins] = useState(false);
  const [activeDiscountTab, setActiveDiscountTab] = useState<'none' | 'coins'>('none');
  const [isLocating, setIsLocating] = useState(false);
  const [locatingError, setLocatingError] = useState<string | null>(null);

  const handleRequestLocationPermission = async (): Promise<{ latitude: number; longitude: number } | null> => {
    setIsLocating(true);
    setLocatingError(null);

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      const msg = "Aapke browser mein GPS Geolocation support nahi hai.";
      setLocatingError(msg);
      alert(msg);
      setIsLocating(false);
      return null;
    }

    return new Promise((resolve) => {
      // Direct call to trigger Chrome / Safari browser permission popup immediately
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          if (onUpdateUserCoords) {
            onUpdateUserCoords(coords);
          }
          setIsLocating(false);
          setLocatingError(null);
          resolve(coords);
        },
        (err) => {
          setIsLocating(false);
          let errMsg = "Chrome / Safari mein location permission block ya denied hai.";
          if (err.code === 1) { // PERMISSION_DENIED
            errMsg = "Location Permission Deny ho gayi. Phir se 'Allow Location' button dabayein ya browser ke address bar (🔒 icon) par tap karke Location Allow karein!";
          } else if (err.code === 2) { // POSITION_UNAVAILABLE
            errMsg = "GPS Signal nahi mila. Kripya Mobile GPS / Location Services ON karke dobara click karein.";
          } else if (err.code === 3) { // TIMEOUT
            errMsg = "Location request timeout ho gaya. Phir se 'Allow Location' dabayein.";
          }
          setLocatingError(errMsg);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  };

  React.useEffect(() => {
    if (!isOpen || cartItems.length === 0) {
      setUseCoins(false);
      setActiveDiscountTab('none');
    }
  }, [isOpen, cartItems.length]);

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
  let grandTotal = totalGroceryPrice + finalDeliveryFee + taxesAmount;

  const userCoins = getUserCoins(currentUser, systemSettings);
  const isLoyaltyEnabledForGrocery = (systemSettings?.loyaltyEnabled !== false) && (systemSettings?.loyaltyAllowOnGrocery || false);
  const maxAllowedCoinsByAdmin = systemSettings?.loyaltyMaxSpendCoins ?? 50;

  const maxCoinsUsable = isLoyaltyEnabledForGrocery ? Math.min(
    userCoins,
    maxAllowedCoinsByAdmin,
    Math.floor(grandTotal)
  ) : 0;

  const coinsDeducted = useCoins ? maxCoinsUsable : 0;
  if (useCoins) {
    grandTotal = Math.max(0, grandTotal - coinsDeducted);
  }

  // Real-time Order Reward Calculation (from Admin Loyalty Settings)
  const loyaltyEarnVal = systemSettings?.loyaltyEarnCoins ?? 15;
  const loyaltyEarnEnabled = (systemSettings?.loyaltyEnabled !== false) && (loyaltyEarnVal > 0);
  const loyaltyMinOrder = systemSettings?.loyaltyMinOrderForEarn ?? 100;
  const loyaltyEarnType = systemSettings?.loyaltyEarnType ?? "fixed";

  let estimatedCoinsEarned = 0;
  if (loyaltyEarnEnabled && grandTotal >= loyaltyMinOrder) {
    if (loyaltyEarnType === "fixed") {
      estimatedCoinsEarned = Math.floor(loyaltyEarnVal);
    } else {
      estimatedCoinsEarned = Math.floor(grandTotal * (loyaltyEarnVal / 100));
    }
  }

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    if (!currentUser) {
      alert("Please Sign In or Register to place an order!");
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

    let activeCoords = userCoords;
    if (!activeCoords && currentUser?.savedLocation?.lat && currentUser?.savedLocation?.lng) {
      activeCoords = { latitude: currentUser.savedLocation.lat, longitude: currentUser.savedLocation.lng };
    }

    if (!activeCoords) {
      activeCoords = await handleRequestLocationPermission();
    }

    if (!activeCoords) {
      alert("⚠️ Pinpoint Location Access Required!\n\nGrocery order submit karne ke liye location access allow karein. Kripya Chrome ya Safari popup mein 'Allow' select karein.");
      setSubmitting(false);
      return;
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
        coinsUsed: useCoins ? coinsDeducted : undefined,
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
      <div className="absolute inset-0 bg-black/80 transition-opacity" onClick={onClose} />

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
                      className="text-xs bg-orange-600 text-white py-1.5 px-4 rounded-lg font-black uppercase tracking-wider hover:bg-orange-700 transition cursor-pointer"
                    >
                      Sign In Now
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 text-zinc-300">
                      <User className="w-4 h-4 text-orange-500 shrink-0" />
                      <span className="font-bold">{currentUser.name || "No name configured"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-300">
                      <Phone className="w-4 h-4 text-orange-400 shrink-0" />
                      <span className="font-semibold font-mono">{currentUser.phone}</span>
                    </div>

                    <div className="border-t border-zinc-850 pt-2 mt-2 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-zinc-300">
                        <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                        <span className="font-bold text-zinc-250 truncate">Shipment Destination Address:</span>
                      </div>
                      {currentUser.address ? (
                        <p className="bg-zinc-950 p-2.5 rounded-xl text-[11px] text-zinc-350 font-bold leading-normal border border-zinc-850">
                          {currentUser.address}
                        </p>
                      ) : (
                        <p className="bg-zinc-955 p-2.5 rounded-xl text-[11px] text-rose-500 font-black leading-normal border border-rose-500/20">
                          No address assigned! Please contact Admin to configure your delivery address.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pricing & Checkout Panel */}
          {cartItems.length > 0 && (
            <div className="p-5 border-t border-zinc-900 bg-zinc-900/60 space-y-4">
                        {/* Coin Benefit Section - Rendered ONLY if enabled by admin and user has coins */}
              {isLoyaltyEnabledForGrocery && maxAllowedCoinsByAdmin > 0 && userCoins > 0 && (
                <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-amber-600/10 border border-amber-500/30 rounded-2xl p-3.5 mt-3 space-y-2.5 animate-fadeIn text-left shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-inner">
                        <Coins className="w-5 h-5 text-amber-400 animate-pulse" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-amber-300 truncate">
                            🪙 Coin Benefit Discount
                          </span>
                          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${useCoins ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}>
                            {useCoins ? `Rs. ${maxCoinsUsable} OFF` : 'OFF'}
                          </span>
                        </div>
                        <span className="text-[10px] text-amber-400/90 font-bold block truncate mt-0.5">
                          Wallet: <span className="font-mono font-black text-amber-300">{userCoins} Coins</span> (1 Coin = Rs. 1)
                        </span>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => setUseCoins(!useCoins)}
                      className={`w-12 h-6.5 rounded-full transition-all relative cursor-pointer outline-none shrink-0 border ${
                        useCoins ? "bg-amber-500 border-amber-400 shadow-md shadow-amber-500/20" : "bg-zinc-800 border-zinc-700"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform flex items-center justify-center text-[9px] font-black ${
                          useCoins ? "transform translate-x-5.5 text-amber-600" : "text-zinc-500"
                        }`}
                      >
                        {useCoins ? "✓" : ""}
                      </span>
                    </button>
                  </div>

                  {/* Admin settings info row */}
                  <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between text-[10px] text-amber-300/80 font-semibold">
                    <span>
                      ⚡ Admin Max Limit: <strong className="text-amber-300 font-mono">Rs. {maxAllowedCoinsByAdmin}</strong> per order
                    </span>
                    <span className="text-amber-400 font-bold">
                      {useCoins ? `Applied: Rs. ${coinsDeducted}` : `Available: Rs. ${maxCoinsUsable}`}
                    </span>
                  </div>
                </div>
              )}

              {/* Real-time Loyalty Cashback Earning Banner - Rendered ONLY if enabled by admin */}
              {loyaltyEarnEnabled && loyaltyEarnVal > 0 && (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-left text-xs animate-fadeIn shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8.5 h-8.5 rounded-xl bg-emerald-500/20 border border-emerald-500/35 flex items-center justify-center shrink-0">
                      <Coins className="w-4.5 h-4.5 text-emerald-400 animate-bounce" />
                    </div>
                    <div>
                      {grandTotal >= loyaltyMinOrder ? (
                        <>
                          <span className="text-xs font-black text-emerald-300 block">
                            🎉 Order Receive Par Earn Karenge: <span className="text-emerald-200 font-mono font-black">+{estimatedCoinsEarned} Coins</span>
                          </span>
                          <span className="text-[10px] text-emerald-400/90 font-bold block mt-0.5">
                            {loyaltyEarnType === "fixed" 
                              ? `Admin Reward: Flat ${loyaltyEarnVal} Coins (Rs. ${estimatedCoinsEarned} Cashback)` 
                              : `Admin Reward: ${loyaltyEarnVal}% Cashback on Order Total (Rs. ${estimatedCoinsEarned})`}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs font-black text-amber-300 block">
                            💡 Rs. {loyaltyMinOrder - Math.floor(grandTotal)} Ka Aur Order Karein
                          </span>
                          <span className="text-[10px] text-amber-400/90 font-bold block mt-0.5">
                            Min order Rs. {loyaltyMinOrder} hone par milega +{loyaltyEarnType === 'fixed' ? `${loyaltyEarnVal} Coins` : `${loyaltyEarnVal}% Coins`} cashback!
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

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

                {useCoins && coinsDeducted > 0 && (
                  <div className="flex justify-between text-amber-500 font-bold">
                    <span>Coins Benefit Applied</span>
                    <span>- Rs. {coinsDeducted}</span>
                  </div>
                )}

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

              {/* GPS Location Pinpoint Widget for buyers - Persistent until location allowed */}
              <div className={`p-4 rounded-3xl space-y-3 mt-4 border transition-all ${
                userCoords 
                  ? 'bg-emerald-950/20 border-emerald-500/30' 
                  : 'bg-gradient-to-br from-orange-500/10 via-zinc-900 to-amber-950/20 border-orange-500/50 shadow-lg shadow-orange-500/10'
              }`}>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <span className="text-[11px] font-black uppercase text-orange-400 tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-orange-500 animate-bounce" /> GROCERY GPS PINPOINT LOCATION
                  </span>
                  {userCoords ? (
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      Locked
                    </span>
                  ) : (
                    <span className="bg-orange-500/20 text-orange-300 border border-orange-500/40 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                      Allow Needed
                    </span>
                  )}
                </div>

                {userCoords ? (
                  <div className="space-y-2">
                    <div className="text-zinc-200 text-xs font-bold flex items-center justify-between flex-wrap gap-1">
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        📍 Doorstep Pin Coordinates Locked
                      </span>
                      <span className="font-mono text-[10px] text-zinc-400">
                        ({userCoords.latitude.toFixed(5)}, {userCoords.longitude.toFixed(5)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRequestLocationPermission}
                      disabled={isLocating}
                      className="text-[10px] text-zinc-400 hover:text-white underline font-bold cursor-pointer transition"
                    >
                      {isLocating ? "Refetching GPS..." : "🔄 Refresh Pinpoint GPS Location"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <p className="text-xs text-zinc-300 font-bold leading-normal">
                      📍 Rider ko aapke ghar ka exact rasta dikhane ke liye Chrome / Safari location trigger allow karein:
                    </p>

                    {locatingError && (
                      <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-[11px] text-rose-300 font-semibold leading-tight">
                        ⚠️ {locatingError}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleRequestLocationPermission}
                      disabled={isLocating}
                      className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-zinc-800 text-white font-black text-xs uppercase tracking-wider py-3 px-4 rounded-2xl transition-all cursor-pointer shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 border border-orange-400/30 animate-pulse hover:animate-none active:scale-95"
                    >
                      {isLocating ? (
                        <>
                          <Compass className="w-4 h-4 animate-spin text-white" />
                          Requesting Chrome / Safari Location...
                        </>
                      ) : (
                        <>
                          <Compass className="w-4 h-4 text-white" />
                          📍 Allow Location (Chrome / Safari Trigger)
                        </>
                      )}
                    </button>

                    {typeof window !== "undefined" && window.self !== window.top && (
                      <button
                        type="button"
                        onClick={() => window.open(window.location.href, "_blank")}
                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-orange-300 font-extrabold text-[11px] py-2.5 px-3 rounded-2xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-zinc-700"
                      >
                        🌐 Open App in New Tab to Allow Location (Chrome / Safari)
                      </button>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={handleCheckoutSubmit}
                disabled={submitting || isLocating}
                className={`w-full py-3.5 ${!userCoords ? 'bg-gradient-to-r from-orange-600 to-amber-600 animate-pulse' : 'bg-orange-600 hover:bg-orange-700'} disabled:bg-orange-850 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-600/10 transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer`}
              >
                {submitting ? (
                  <>Packing Shipment...</>
                ) : isLocating ? (
                  <>
                    <Compass className="w-4 h-4 animate-spin" />
                    Fetching Location...
                  </>
                ) : !userCoords ? (
                  <>
                    <MapPin className="w-4 h-4 animate-bounce" />
                    Allow Location to Place Order 📍
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
