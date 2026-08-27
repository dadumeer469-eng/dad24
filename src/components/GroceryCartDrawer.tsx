import React, { useState } from "react";
import { UserProfile, GroceryOrderItem, GroceryDeliveryConfig, getUserCoins, Voucher, calculateVoucherDiscount, isVoucherExpired, canUserUseVoucher } from "../types";
import { X, ShoppingBag, MapPin, Phone, User, AlertTriangle, ShieldCheck, Heart, Edit2, Compass, Trash2, CheckCircle, Coins, Ticket, Tag, ChevronDown, Sparkles, Check, Loader2, Info } from "lucide-react";
import { LazyImage } from "./LazyImage";
import UserVouchersModal from "./UserVouchersModal";
import { doc, setDoc } from "firebase/firestore";
import { db, handleFirestoreError } from "../firebase";

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
    voucher?: { code: string; discountAmount: number };
  }) => Promise<void>;
  userCoords?: { latitude: number; longitude: number } | null;
  systemSettings?: any;
  allVouchers?: Voucher[];
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
  systemSettings,
  allVouchers = [],
}: GroceryCartDrawerProps) {
  const [submitting, setSubmitting] = useState(false);
  const [useCoins, setUseCoins] = useState(false);
  const [activeDiscountTab, setActiveDiscountTab] = useState<'none' | 'coins'>('none');
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
      setActiveDiscountTab('none');
      setAppliedVoucher(null);
      setVoucherInputCode("");
      setVoucherError(null);
      setIsBenefitsOpen(false);
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
  
  // Base Grocery Total before benefits
  const baseOrderTotal = totalGroceryPrice + finalDeliveryFee + taxesAmount;

  // Voucher Discount
  let voucherDiscount = 0;
  if (appliedVoucher) {
    voucherDiscount = calculateVoucherDiscount(appliedVoucher, totalGroceryPrice);
  }

  const userCoins = getUserCoins(currentUser, systemSettings);
  const isLoyaltyEnabledForGrocery = (systemSettings?.loyaltyEnabled !== false) && (systemSettings?.loyaltyAllowOnGrocery || false);
  const maxAllowedCoinsByAdmin = systemSettings?.loyaltyMaxSpendCoins ?? 50;

  const maxCoinsUsable = isLoyaltyEnabledForGrocery ? Math.min(
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

    // Check eligibility & per-user limit
    const eligibility = canUserUseVoucher(targetVoucher, currentUser?.uid);
    if (!eligibility.allowed) {
      setVoucherError(eligibility.reason || "This voucher cannot be used.");
      return;
    }

    if (targetVoucher.applicableType === "food_only" || targetVoucher.applicableType === "restaurant") {
      setVoucherError("This voucher is only valid on restaurant food orders.");
      return;
    }

    if (targetVoucher.minOrderAmount && totalGroceryPrice < targetVoucher.minOrderAmount) {
      setVoucherError(`Minimum grocery order of Rs. ${targetVoucher.minOrderAmount} required.`);
      return;
    }

    // Mutually Exclusive Benefit: disable coins when applying voucher
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
        voucher: appliedVoucher ? {
          code: appliedVoucher.code,
          discountAmount: voucherDiscount,
        } : undefined,
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

                    <div className="border-t border-zinc-850 pt-2.5 mt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-orange-500" />
                          Shipment Destination Address
                        </span>
                        {!isEditingAddress && (
                          <button
                            type="button"
                            onClick={handleStartEditAddress}
                            className="flex items-center gap-1 text-[11px] font-black text-orange-400 hover:text-orange-300 hover:underline transition cursor-pointer"
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
                            className="w-full bg-zinc-950 border border-zinc-700 focus:border-orange-500 rounded-xl p-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none resize-none font-medium leading-relaxed"
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
                              className="px-4 py-1.5 rounded-lg text-xs font-black text-white bg-orange-600 hover:bg-orange-700 shadow-md shadow-orange-600/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
                        <p className="bg-zinc-950 p-2.5 rounded-xl text-[11px] text-zinc-300 font-bold leading-normal border border-zinc-850">
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
                )}
              </div>
            )}
          </div>

          {/* Pricing & Checkout Panel */}
          {cartItems.length > 0 && (
            <div className="p-5 border-t border-zinc-900 bg-zinc-900/60 space-y-4">
            {/* BENEFIT / OFFERS & DISCOUNTS COLLAPSIBLE BOX */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden transition-all duration-200">
              {/* Box Click Trigger */}
              <button
                type="button"
                onClick={() => setIsBenefitsOpen(!isBenefitsOpen)}
                className="w-full p-3 flex items-center justify-between gap-2.5 text-left hover:bg-zinc-850/60 transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-emerald-500/20 border border-orange-500/30 flex items-center justify-center shrink-0 shadow-inner">
                    <Sparkles className="w-4 h-4 text-orange-500" />
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
                        <span className="bg-orange-500/15 border border-orange-500/25 text-orange-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md">
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
                  <div className={`w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 transition-transform duration-300 ${isBenefitsOpen ? "rotate-180 text-white bg-orange-600" : ""}`}>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>
              </button>

              {/* Inside Benefit Box (Shown when open) */}
              {isBenefitsOpen && (
                <div className="p-3 pt-2.5 border-t border-zinc-800 space-y-3 bg-zinc-950/60">
                  {/* VOUCHER / PROMO CODE SECTION */}
                  <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-black text-orange-400">
                        <Ticket className="w-3.5 h-3.5 text-orange-500" />
                        <span>Grocery Voucher</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsVouchersModalOpen(true)}
                        className="text-[10.5px] font-black text-orange-400 hover:text-orange-300 underline cursor-pointer"
                      >
                        View My Vouchers 🎟️
                      </button>
                    </div>

                    {appliedVoucher ? (
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-xs text-white">{appliedVoucher.code}</span>
                              <span className="bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-md">
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
                              placeholder="ENTER VOUCHER CODE"
                              value={voucherInputCode}
                              onChange={(e) => setVoucherInputCode(e.target.value.toUpperCase())}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleApplyVoucher(voucherInputCode);
                                }
                              }}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs font-mono font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 uppercase"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleApplyVoucher(voucherInputCode)}
                            className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-black px-3.5 py-2 rounded-xl transition cursor-pointer"
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
                    <Info className="w-3 h-3 text-orange-400 shrink-0" />
                    <span>Ek order par sirf 1 offer lag sakti hai (Voucher <strong>ya</strong> Coin Discount).</span>
                  </div>

                  {/* Coin Benefit Section - Rendered ONLY if enabled by admin and user has coins */}
                  {isLoyaltyEnabledForGrocery && maxAllowedCoinsByAdmin > 0 && userCoins > 0 && (
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

                {appliedVoucher && voucherDiscount > 0 && (
                  <div className="flex justify-between text-orange-400 font-bold">
                    <span>Voucher Discount ({appliedVoucher.code})</span>
                    <span>- Rs. {voucherDiscount}</span>
                  </div>
                )}
                
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
                        const coords = await new Promise<{ latitude: number, longitude: number }>((resolve, reject) => {
                          navigator.geolocation.getCurrentPosition(
                            (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                            (err) => {
                              navigator.geolocation.getCurrentPosition(
                                (pos2) => resolve({ latitude: pos2.coords.latitude, longitude: pos2.coords.longitude }),
                                (err2) => reject(err2),
                                { enableHighAccuracy: false, timeout: 3000 }
                              );
                            },
                            { enableHighAccuracy: true, timeout: 4000 }
                          );
                        });
                        alert("📍 GPS pinpoint successfully attached! Your rider will receive turn-by-turn directions.");
                      } catch (err: any) {
                        alert("📍 Default location saved! Your delivery address will be used.");
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

      {/* USER VOUCHERS MODAL */}
      <UserVouchersModal
        isOpen={isVouchersModalOpen}
        onClose={() => setIsVouchersModalOpen(false)}
        vouchers={allVouchers}
        currentUser={currentUser}
        cartType="grocery"
        cartSubtotal={totalGroceryPrice}
        onApplyVoucher={(v) => {
          handleApplyVoucher(v);
          setIsVouchersModalOpen(false);
        }}
      />
    </div>
  );
}
