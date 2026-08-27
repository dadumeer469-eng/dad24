import React, { useState } from "react";
import { UserProfile, OrderItem, getUserCoins, Voucher, calculateVoucherDiscount, isVoucherExpired, canUserUseVoucher } from "../types";
import { X, ShoppingBag, MapPin, Phone, User, AlertTriangle, ShieldCheck, Heart, Edit2, Compass, Coins, Ticket, CheckCircle, Tag, ChevronDown, Sparkles, Gift, Check, Loader2, Info } from "lucide-react";
import { CHECKOUT_DRINKS } from "../data";
import { LazyImage } from "./LazyImage";
import UserVouchersModal from "./UserVouchersModal";
import { doc, setDoc } from "firebase/firestore";
import { db, handleFirestoreError } from "../firebase";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: OrderItem[];
  onUpdateQuantity: (dishId: string, quantity: number) => void;
  onRemoveItem: (dishId: string) => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  deliveryFee: number; // Stored inside Firestore settings!
  onPlaceOrder: (details: {
    name: string;
    phone: string;
    location: { area: string; street: string; lat?: number; lng?: number; googleMapsLink?: string };
    paymentMethod: string;
    orderType: "food" | "service";
    userCoords?: { latitude: number; longitude: number };
    coinsUsed?: number;
    voucher?: { code: string; discountAmount: number };
  }) => Promise<void>;
  onAddDrink: (drink: any) => void;
  userCoords?: { latitude: number; longitude: number } | null;
  systemSettings?: any;
  allVouchers?: Voucher[];
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
  systemSettings,
  allVouchers = [],
}: CartDrawerProps) {
  const [submitting, setSubmitting] = useState(false);
  const [useCoins, setUseCoins] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [voucherInputCode, setVoucherInputCode] = useState("");
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [isVouchersModalOpen, setIsVouchersModalOpen] = useState(false);
  const [isBenefitsOpen, setIsBenefitsOpen] = useState(false);

  // Address editing states
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressInput, setAddressInput] = useState("");
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressSaveSuccess, setAddressSaveSuccess] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  const handleStartEditAddress = () => {
    setAddressInput(currentUser?.address || "");
    setIsEditingAddress(true);
    setAddressError(null);
    setAddressSaveSuccess(false);
  };

  const handleSaveAddress = async () => {
    if (!currentUser) return;
    const trimmed = addressInput.trim();
    if (!trimmed) {
      setAddressError("Please enter a valid address.");
      return;
    }
    if (trimmed.length < 5) {
      setAddressError("Address must be at least 5 characters long.");
      return;
    }

    try {
      setIsSavingAddress(true);
      setAddressError(null);

      const updatedData: any = {
        address: trimmed,
        savedLocation: {
          area: trimmed.split(",")[0]?.trim() || trimmed,
          street: trimmed,
          lat: currentUser.savedLocation?.lat || 26.7341,
          lng: currentUser.savedLocation?.lng || 67.7795,
        }
      };

      await setDoc(doc(db, "users", currentUser.uid), updatedData, { merge: true });
      setIsEditingAddress(false);
      setAddressSaveSuccess(true);
      setTimeout(() => setAddressSaveSuccess(false), 3500);
    } catch (err: any) {
      console.error("Failed to save address to Firebase:", err);
      setAddressError(handleFirestoreError(err) || "Failed to update address in database.");
    } finally {
      setIsSavingAddress(false);
    }
  };

  React.useEffect(() => {
    if (!isOpen || cartItems.length === 0) {
      setUseCoins(false);
      setAppliedVoucher(null);
      setVoucherInputCode("");
      setVoucherError(null);
      setIsBenefitsOpen(false);
    }
  }, [isOpen, cartItems.length]);

  if (!isOpen) return null;

  const totalFoodItemsPrice = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  
  // Checking if there are only services or foods in the cart
  const hasFood = cartItems.some((item) => item.type === "food");
  const hasService = cartItems.some((item) => item.type === "service");

  // Determine delivery charge: Rs. 0 for pure diagnostic home services, custom delivery charge for food!
  // If order total (items price) is below 500, double the delivery fee!
  // Delivery Fee calculation
  const isDoubleFee = hasFood && totalFoodItemsPrice < 500;
  const finalDeliveryFee = hasFood ? (isDoubleFee ? deliveryFee * 2 : deliveryFee) : 0;
  
  // Base total before any discounts
  const baseOrderTotal = totalFoodItemsPrice + finalDeliveryFee;

  // Voucher discount
  let voucherDiscount = 0;
  if (appliedVoucher) {
    voucherDiscount = calculateVoucherDiscount(appliedVoucher, totalFoodItemsPrice);
  }

  const userCoins = getUserCoins(currentUser, systemSettings);
  const isLoyaltyEnabledForFood = (systemSettings?.loyaltyEnabled !== false) && (systemSettings?.loyaltyAllowOnFood !== false);
  const maxAllowedCoinsByAdmin = systemSettings?.loyaltyMaxSpendCoins ?? 50;

  const maxCoinsUsable = isLoyaltyEnabledForFood ? Math.min(
    userCoins,
    maxAllowedCoinsByAdmin,
    Math.floor(baseOrderTotal)
  ) : 0;

  // Mutually Exclusive Benefit: Only voucher OR coins (not both)
  const coinsDeducted = (useCoins && !appliedVoucher) ? maxCoinsUsable : 0;
  const totalBenefitDiscount = appliedVoucher ? voucherDiscount : coinsDeducted;

  let grandTotal = Math.max(0, baseOrderTotal - totalBenefitDiscount);

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

  // Voucher application logic
  const handleApplyVoucher = (codeOrVoucher: string | Voucher) => {
    let targetVoucher: Voucher | undefined;
    if (typeof codeOrVoucher === "string") {
      const code = codeOrVoucher.trim().toUpperCase();
      if (!code) {
        setVoucherError("Please enter a voucher code.");
        return;
      }
      targetVoucher = allVouchers.find((v) => v.code.toUpperCase() === code);
    } else {
      targetVoucher = codeOrVoucher;
    }

    setVoucherError(null);

    if (!targetVoucher) {
      setVoucherError("Invalid voucher code.");
      return;
    }

    // Check comprehensive voucher validity & per-user limit
    const eligibility = canUserUseVoucher(targetVoucher, currentUser?.uid);
    if (!eligibility.allowed) {
      setVoucherError(eligibility.reason || "This voucher cannot be used.");
      return;
    }

    if (targetVoucher.applicableType === "grocery_only") {
      setVoucherError("This voucher is only valid on Grocery orders.");
      return;
    }

    if (targetVoucher.applicableType === "restaurant" && targetVoucher.applicableRestaurant) {
      const matchRest = cartItems.some(
        (i) => i.restaurantName?.toLowerCase() === targetVoucher?.applicableRestaurant?.toLowerCase()
      );
      if (!matchRest) {
        setVoucherError(`This voucher is valid only for ${targetVoucher.applicableRestaurant}.`);
        return;
      }
    }

    if (targetVoucher.minOrderAmount && totalFoodItemsPrice < targetVoucher.minOrderAmount) {
      setVoucherError(`Minimum food order of Rs. ${targetVoucher.minOrderAmount} required.`);
      return;
    }

    // Exclusive Benefit: Turn off coins if applied
    if (useCoins) {
      setUseCoins(false);
    }

    setAppliedVoucher(targetVoucher);
    setVoucherInputCode(targetVoucher.code);
    setVoucherError(null);
    setIsBenefitsOpen(true);
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherInputCode("");
    setVoucherError(null);
  };

  const handleToggleCoins = () => {
    if (!useCoins) {
      // Switching to Coins: Remove any applied voucher for mutual exclusivity
      if (appliedVoucher) {
        setAppliedVoucher(null);
        setVoucherInputCode("");
        setVoucherError(null);
      }
      setUseCoins(true);
    } else {
      setUseCoins(false);
    }
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
    if (!activeCoords && currentUser?.savedLocation?.lat && currentUser?.savedLocation?.lng) {
      activeCoords = { latitude: currentUser.savedLocation.lat, longitude: currentUser.savedLocation.lng };
    }

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      try {
        const coords = await new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            () => {
              navigator.geolocation.getCurrentPosition(
                (pos2) => resolve({ latitude: pos2.coords.latitude, longitude: pos2.coords.longitude }),
                (err2) => reject(err2),
                { enableHighAccuracy: false, timeout: 3000 }
              );
            },
            { enableHighAccuracy: true, timeout: 3000, maximumAge: 30000 }
          );
        });
        activeCoords = coords;
      } catch (err) {
        console.warn("Could not fetch fresh GPS location, using fallback coordinates", err);
      }
    }

    if (!activeCoords) {
      activeCoords = { latitude: 26.7322, longitude: 67.7771 };
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
        coinsUsed: useCoins ? coinsDeducted : undefined,
        voucher: appliedVoucher ? {
          code: appliedVoucher.code,
          discountAmount: voucherDiscount,
        } : undefined,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75">
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

                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#D70F64]" />
                          Delivery Address
                        </span>
                        {!isEditingAddress && (
                          <button
                            type="button"
                            onClick={handleStartEditAddress}
                            className="flex items-center gap-1 text-[11px] font-black text-[#D70F64] hover:text-[#ff2b7f] hover:underline transition cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            {currentUser.address ? "Change Address" : "Add Address"}
                          </button>
                        )}
                      </div>

                      {addressSaveSuccess && (
                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold flex items-center gap-1.5 animate-fadeIn">
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          Address updated in database successfully!
                        </div>
                      )}

                      {isEditingAddress ? (
                        <div className="space-y-2 pt-1 animate-fadeIn">
                          <textarea
                            value={addressInput}
                            onChange={(e) => {
                              setAddressInput(e.target.value);
                              if (addressError) setAddressError(null);
                            }}
                            placeholder="Enter full delivery address (House/Shop #, Street, Area, Dadu)..."
                            rows={3}
                            className="w-full bg-zinc-900 border border-zinc-700 focus:border-[#D70F64] rounded-xl p-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none resize-none font-medium leading-relaxed"
                            autoFocus
                          />
                          {addressError && (
                            <p className="text-[10.5px] text-rose-400 font-semibold">{addressError}</p>
                          )}
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditingAddress(false);
                                setAddressError(null);
                              }}
                              disabled={isSavingAddress}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 transition cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveAddress}
                              disabled={isSavingAddress}
                              className="px-4 py-1.5 rounded-lg text-xs font-black text-white bg-[#D70F64] hover:bg-[#b00c50] shadow-md shadow-[#D70F64]/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {isSavingAddress ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  Save & Update
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : currentUser.address ? (
                        <p className="text-xs text-zinc-200 font-bold leading-normal bg-zinc-900/60 p-2 rounded-lg border border-zinc-850">
                          {currentUser.address}
                        </p>
                      ) : (
                        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold space-y-1">
                          <p>No address assigned yet!</p>
                          <button
                            type="button"
                            onClick={handleStartEditAddress}
                            className="text-[11px] underline font-black text-white cursor-pointer"
                          >
                            + Click here to add your delivery address
                          </button>
                        </div>
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

            {/* BENEFIT / OFFERS & DISCOUNTS COLLAPSIBLE BOX */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden transition-all duration-200">
              {/* Box Click Trigger */}
              <button
                type="button"
                onClick={() => setIsBenefitsOpen(!isBenefitsOpen)}
                className="w-full p-3 flex items-center justify-between gap-2.5 text-left hover:bg-zinc-850/60 transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D70F64]/20 via-pink-500/10 to-amber-500/20 border border-[#D70F64]/30 flex items-center justify-center shrink-0 shadow-inner">
                    <Sparkles className="w-4 h-4 text-[#D70F64]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-black text-white tracking-wide">
                        Offers & Benefits
                      </span>
                      {(appliedVoucher || (useCoins && coinsDeducted > 0)) ? (
                        <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">
                          Rs. {voucherDiscount + coinsDeducted} Saved
                        </span>
                      ) : (
                        <span className="bg-[#D70F64]/15 border border-[#D70F64]/25 text-pink-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md">
                          Vouchers & Coins
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 font-medium truncate mt-0.5">
                      {appliedVoucher && useCoins
                        ? `Voucher: ${appliedVoucher.code} + 🪙 ${coinsDeducted} Coins Active`
                        : appliedVoucher
                        ? `Applied: ${appliedVoucher.code} (-Rs. ${voucherDiscount})`
                        : useCoins
                        ? `🪙 ${coinsDeducted} Coins Applied (-Rs. ${coinsDeducted})`
                        : "Tap to apply voucher code or redeem coins"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-bold text-zinc-400 hidden sm:inline">
                    {isBenefitsOpen ? "Close" : "Open"}
                  </span>
                  <div className={`w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 transition-transform duration-300 ${isBenefitsOpen ? "rotate-180 text-white bg-[#D70F64]" : ""}`}>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>
              </button>

              {/* Inside Benefit Box (Shown when open) */}
              {isBenefitsOpen && (
                <div className="p-3 pt-2.5 border-t border-zinc-800 space-y-3 bg-zinc-950/60">
                  {/* VOUCHER / DISCOUNT CODE SECTION */}
                  <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-black text-pink-400">
                        <Ticket className="w-3.5 h-3.5 text-[#D70F64]" />
                        <span>Promo Voucher</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsVouchersModalOpen(true)}
                        className="text-[10.5px] font-black text-[#D70F64] hover:text-pink-300 underline cursor-pointer"
                      >
                        View My Vouchers 🎟️
                      </button>
                    </div>

                    {appliedVoucher ? (
                      <div className="bg-pink-500/10 border border-[#D70F64]/30 rounded-xl p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-xs text-white">{appliedVoucher.code}</span>
                              <span className="bg-[#D70F64] text-white text-[9px] font-black px-1.5 py-0.2 rounded-md">
                                Rs. {voucherDiscount} OFF
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-400 block">{appliedVoucher.title}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveVoucher}
                          className="text-xs text-rose-400 hover:text-rose-300 font-bold px-2 py-1 bg-rose-500/10 rounded-lg cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Tag className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              placeholder="ENTER PROMO CODE"
                              value={voucherInputCode}
                              onChange={(e) => setVoucherInputCode(e.target.value.toUpperCase())}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleApplyVoucher(voucherInputCode);
                                }
                              }}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs font-mono font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#D70F64] uppercase"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleApplyVoucher(voucherInputCode)}
                            className="bg-[#D70F64] hover:bg-[#b00c50] text-white text-xs font-black px-3.5 py-2 rounded-xl transition cursor-pointer"
                          >
                            Apply
                          </button>
                        </div>
                        {voucherError && (
                          <p className="text-[10px] text-rose-400 font-semibold">{voucherError}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Policy banner for 1 offer limit */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[9.5px] text-zinc-400">
                    <Info className="w-3 h-3 text-pink-400 shrink-0" />
                    <span>Ek order par sirf 1 offer lag sakti hai (Voucher <strong>ya</strong> Coin Discount).</span>
                  </div>

                  {/* Coin Benefit Section - Rendered ONLY if enabled by admin and user has coins */}
                  {isLoyaltyEnabledForFood && maxAllowedCoinsByAdmin > 0 && userCoins > 0 && (
                    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-amber-600/10 border border-amber-500/30 rounded-xl p-3 space-y-2.5 animate-fadeIn text-left shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-inner">
                            <Coins className="w-4 h-4 text-amber-400 animate-pulse" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-amber-300 truncate">
                                🪙 Coin Benefit Discount
                              </span>
                              <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${useCoins && !appliedVoucher ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}>
                                {useCoins && !appliedVoucher ? `Rs. ${maxCoinsUsable} OFF` : 'OFF'}
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
                          onClick={handleToggleCoins}
                          className={`w-11 h-6 rounded-full transition-all relative cursor-pointer outline-none shrink-0 border ${
                            useCoins && !appliedVoucher ? "bg-amber-500 border-amber-400 shadow-md shadow-amber-500/20" : "bg-zinc-800 border-zinc-700"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-md transition-transform flex items-center justify-center text-[9px] font-black ${
                              useCoins && !appliedVoucher ? "transform translate-x-5 text-amber-600" : "text-zinc-500"
                            }`}
                          >
                            {useCoins && !appliedVoucher ? "✓" : ""}
                          </span>
                        </button>
                      </div>

                      {/* Admin settings info row */}
                      <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between text-[10px] text-amber-300/80 font-semibold">
                        <span>
                          ⚡ Admin Max Limit: <strong className="text-amber-300 font-mono">Rs. {maxAllowedCoinsByAdmin}</strong>
                        </span>
                        <span className="text-amber-400 font-bold">
                          {useCoins && !appliedVoucher ? `Applied: Rs. ${coinsDeducted}` : `Available: Rs. ${maxCoinsUsable}`}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Real-time Loyalty Cashback Earning Banner - Rendered ONLY if enabled by admin */}
                  {loyaltyEarnEnabled && loyaltyEarnVal > 0 && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-left text-xs animate-fadeIn shadow-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/35 flex items-center justify-center shrink-0">
                          <Coins className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                        </div>
                        <div>
                          {grandTotal >= loyaltyMinOrder ? (
                            <>
                              <span className="text-xs font-black text-emerald-300 block">
                                🎉 Cashback: <span className="text-emerald-200 font-mono font-black">+{estimatedCoinsEarned} Coins</span>
                              </span>
                              <span className="text-[10px] text-emerald-400/90 font-medium block mt-0.5">
                                {loyaltyEarnType === "fixed" 
                                  ? `Flat ${loyaltyEarnVal} Coins (Rs. ${estimatedCoinsEarned} Cashback)` 
                                  : `${loyaltyEarnVal}% Cashback on Order (Rs. ${estimatedCoinsEarned})`}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-xs font-black text-amber-300 block">
                                💡 Rs. {loyaltyMinOrder - Math.floor(grandTotal)} Ka Aur Order Karein
                              </span>
                              <span className="text-[10px] text-amber-400/90 font-medium block mt-0.5">
                                Min order Rs. {loyaltyMinOrder} par +{loyaltyEarnType === 'fixed' ? `${loyaltyEarnVal} Coins` : `${loyaltyEarnVal}% Coins`} cashback!
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5 text-xs text-zinc-400 font-semibold mt-4">
              <div className="flex justify-between">
                <span>Items Subtotal:</span>
                <span className="text-zinc-100 font-extrabold font-mono">Rs. {totalFoodItemsPrice}</span>
              </div>

              {appliedVoucher && voucherDiscount > 0 && (
                <div className="flex justify-between text-pink-400">
                  <span>Voucher Discount ({appliedVoucher.code}):</span>
                  <span className="font-extrabold font-mono">- Rs. {voucherDiscount}</span>
                </div>
              )}

              {useCoins && coinsDeducted > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Coin Benefit Discount:</span>
                  <span className="font-extrabold font-mono">- Rs. {coinsDeducted}</span>
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

      {/* USER VOUCHERS MODAL */}
      <UserVouchersModal
        isOpen={isVouchersModalOpen}
        onClose={() => setIsVouchersModalOpen(false)}
        vouchers={allVouchers}
        currentUser={currentUser}
        cartType="food"
        cartSubtotal={totalFoodItemsPrice}
        cartRestaurant={cartItems[0]?.restaurantName}
        onApplyVoucher={(v) => {
          handleApplyVoucher(v);
          setIsVouchersModalOpen(false);
        }}
      />
    </div>
  );
}
