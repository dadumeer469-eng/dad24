import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { springSmooth } from "../utils/motion";
import { useFocusTrap } from "../hooks/useFocusTrap";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { UserProfile, OrderItem, Dish, getUserCoins, Voucher, calculateVoucherDiscount, isVoucherExpired, canUserUseVoucher } from "../types";
import { X, ShoppingBag, MapPin, Phone, User, AlertTriangle, ShieldCheck, Heart, Edit2, Compass, Coins, Ticket, CheckCircle, Tag, ChevronDown, Gift, Check, Loader2, Info } from "lucide-react";
import { CHECKOUT_DRINKS } from "../data";
import { LazyImage } from "./LazyImage";
import UserVouchersModal from "./UserVouchersModal";
import { doc, setDoc } from "firebase/firestore";
import { db, handleFirestoreError } from "../firebase";
import { getSavedAddresses, saveRecentAddress, SavedAddressEntry } from "../utils/savedAddresses";
import EasypaisaPaymentBox from "./EasypaisaPaymentBox";

const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const CART_PIN_ICON = L.divIcon({
  html: `<div style="width:32px;height:32px;background:#E21B70;border-radius:9999px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(0,0,0,.3);border:2px solid #fff"><svg style="width:18px;height:18px;fill:#fff" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg></div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// The cart slides in with an animation; re-measure the map once it settles
// so Leaflet tiles fill the box instead of rendering blank/grey.
function InvalidateSizeOnMount() {
  const map = useMap();
  useEffect(() => {
    const t = window.setTimeout(() => map.invalidateSize(), 350);
    return () => window.clearTimeout(t);
  }, [map]);
  return null;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: OrderItem[];
  onUpdateQuantity: (dishId: string, quantity: number) => void;
  onRemoveItem: (dishId: string) => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  deliveryFee: number; // Stored inside Firestore settings!
  isRiderRangeExceeded?: boolean; // Customer beyond the admin-set rider range — delivery fee doubles (matches App's saved order total)
  isFirstOrderFreeDelivery?: boolean; // New user's first order ships FREE (food/grocery/medicine)
  onPlaceOrder: (details: {
    name: string;
    phone: string;
    location: { area: string; street: string; lat?: number; lng?: number; googleMapsLink?: string };
    paymentMethod: "COD" | "Easypaisa" | "Pay on Appointment";
    paymentReceiptUrl?: string;
    orderType: "food" | "service";
    userCoords?: { latitude: number; longitude: number };
    coinsUsed?: number;
    riderTip?: number;
    isScheduled?: boolean;
    scheduledTime?: string;
    deliverySpeed?: "standard" | "priority";
    leaveAtDoor?: boolean;
    messageUponArrival?: boolean;
    cutlery?: boolean;
    voucher?: { code: string; discountAmount: number };
  }) => Promise<void>;
  onAddDrink: (drink: any) => void;
  popularDishes?: Dish[];
  onAddPopularDish?: (dish: Dish) => void;
  userCoords?: { latitude: number; longitude: number } | null;
  systemSettings?: any;
  allVouchers?: Voucher[];
  onRequireLocation?: () => void;
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
  isRiderRangeExceeded,
  isFirstOrderFreeDelivery,
  onPlaceOrder,
  onAddDrink,
  popularDishes = [],
  onAddPopularDish,
  userCoords,
  systemSettings,
  allVouchers = [],
  onRequireLocation,
}: CartDrawerProps) {
  const [submitting, setSubmitting] = useState(false);
  const [useCoins, setUseCoins] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [voucherInputCode, setVoucherInputCode] = useState("");
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [isVouchersModalOpen, setIsVouchersModalOpen] = useState(false);
  const [isBenefitsOpen, setIsBenefitsOpen] = useState(false);

  // Customer Name, Phone, Payment, Schedule, Tip & Address states
  const [nameInput, setNameInput] = useState(currentUser?.name || "");
  const [phoneInput, setPhoneInput] = useState(currentUser?.phone || "");
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "Easypaisa">(() => {
    const saved = localStorage.getItem("dadu_preferred_payment");
    return saved === "Easypaisa" ? "Easypaisa" : "COD";
  });
  const [paymentReceiptUrl, setPaymentReceiptUrl] = useState<string | null>(null);
  const [riderTip, setRiderTip] = useState<number>(0);
  const [isScheduled, setIsScheduled] = useState<boolean>(false);
  const [scheduledTime, setScheduledTime] = useState<string>("Today, +1 Hour");
  // Foodpanda-style delivery speed + delivery preferences
  const [deliverySpeed, setDeliverySpeed] = useState<"standard" | "priority">("standard");
  const [leaveAtDoor, setLeaveAtDoor] = useState<boolean>(false);
  const [messageUponArrival, setMessageUponArrival] = useState<boolean>(false);
  const [cutlery, setCutlery] = useState<boolean>(false);
  const [locationTimedOut, setLocationTimedOut] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isEditingAddress, setIsEditingAddress] = useState(!currentUser?.address);
  const [addressInput, setAddressInput] = useState(currentUser?.address || "");
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressSaveSuccess, setAddressSaveSuccess] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressLabel, setAddressLabel] = useState<SavedAddressEntry["label"]>("Ghar");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddressEntry[]>([]);

  // Geolocation timeout fallback (never stay stuck on "Locating...")
  React.useEffect(() => {
    if (!isOpen || userCoords) {
      setLocationTimedOut(false);
      return;
    }
    const timer = setTimeout(() => {
      setLocationTimedOut(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, [isOpen, userCoords]);

  // If the user already has a saved address, show it (not the edit form)
  // when the drawer opens. The initial state is computed once at mount —
  // usually before the profile has loaded — so without this a logged-in
  // user with a saved address would always land in edit mode.
  React.useEffect(() => {
    if (isOpen && currentUser?.address) {
      setIsEditingAddress(false);
    }
  }, [isOpen, currentUser?.address]);

  React.useEffect(() => {
    if (currentUser?.name && !nameInput) {
      setNameInput(currentUser.name);
    }
    if (currentUser?.phone && !phoneInput) {
      setPhoneInput(currentUser.phone);
    }
    if (currentUser?.address && !addressInput) {
      setAddressInput(currentUser.address);
    }
    if (currentUser?.uid) {
      const stored = getSavedAddresses(currentUser.uid);
      if (stored.length === 0 && currentUser.address) {
        setSavedAddresses(saveRecentAddress(currentUser.uid, currentUser.address, "Ghar"));
      } else {
        setSavedAddresses(stored);
      }
    } else {
      setSavedAddresses([]);
    }
  }, [currentUser]);

  const handleStartEditAddress = () => {
    setAddressInput(currentUser?.address || addressInput || "");
    setIsEditingAddress(true);
    setAddressError(null);
    setAddressSaveSuccess(false);
  };

  const handleQuickSelectSavedAddress = async (entry: SavedAddressEntry) => {
    if (!currentUser) return;
    setAddressInput(entry.address);
    setAddressLabel(entry.label);
    setAddressError(null);
    if (currentUser.address?.trim().toLowerCase() === entry.address.trim().toLowerCase()) {
      setIsEditingAddress(false);
      return;
    }
    try {
      setIsSavingAddress(true);
      const updatedData: any = {
        address: entry.address,
        savedLocation: {
          area: entry.address.split(",")[0]?.trim() || entry.address,
          street: entry.address,
          lat: currentUser.savedLocation?.lat || 26.7341,
          lng: currentUser.savedLocation?.lng || 67.7795,
        }
      };
      await setDoc(doc(db, "users", currentUser.uid), updatedData, { merge: true });
      setSavedAddresses(saveRecentAddress(currentUser.uid, entry.address, entry.label));
      setIsEditingAddress(false);
      setAddressSaveSuccess(true);
      setTimeout(() => setAddressSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error("Failed to switch saved address:", err);
      setAddressError(handleFirestoreError(err) || "Failed to update address.");
    } finally {
      setIsSavingAddress(false);
    }
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
      setSavedAddresses(saveRecentAddress(currentUser.uid, trimmed, addressLabel));
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

  // Focus trap + ESC to close (a11y fix 27 Nov 2026). Must sit above the
  // `if (!isOpen) return null` below so the hook order never changes.
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(dialogRef, isOpen, onClose);

  if (!isOpen) return null;

  const totalFoodItemsPrice = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  
  // Checking if there are only services or foods in the cart
  const hasFood = cartItems.some((item) => item.type === "food");
  const hasService = cartItems.some((item) => item.type === "service");

  // Consistent Delivery Fee Policy (amounts controlled by Admin Panel → Store Controls):
  // - Pure home service: Rs. 0 delivery fee
  // - Food >= freeDeliveryAboveAmount: FREE delivery
  // - Food < doubleFeeBelowAmount: Doubled delivery fee (2x standard, 0 = disabled)
  // - Otherwise: Standard delivery fee
  const freeDeliveryAbove = Number(systemSettings?.freeDeliveryAboveAmount ?? 1000);
  const doubleFeeBelow = Number(systemSettings?.doubleFeeBelowAmount ?? 500);
  const priorityFee = Number(systemSettings?.priorityFee ?? 30);
  const tipOptions = (Array.isArray(systemSettings?.tipOptions) && systemSettings.tipOptions.length > 0
    ? systemSettings.tipOptions
    : [0, 50, 100, 200, 300]) as number[];
  const speedOptions = [
    { id: "standard" as const, label: "Standard", eta: "25–35 min", feeNote: "Standard", enabled: true },
    { id: "priority" as const, label: "Priority", eta: "15–25 min", feeNote: `+Rs. ${priorityFee}`, enabled: systemSettings?.priorityEnabled !== false },
  ].filter((o) => o.enabled);
  const effectiveSpeed = speedOptions.some((o) => o.id === deliverySpeed) ? deliverySpeed : "standard";
  const showDeliveryPreferences =
    systemSettings?.leaveAtDoorEnabled !== false ||
    systemSettings?.messageOnArrivalEnabled !== false ||
    systemSettings?.cutleryEnabled !== false;
  const easypaisaTitle = systemSettings?.easypaisaTitle || "Ghulam Murtaza";
  const easypaisaNumber = systemSettings?.easypaisaNumber || "03277004471";
  const isFreeFoodDelivery = hasFood && totalFoodItemsPrice >= freeDeliveryAbove;
  const isDoubleFee = hasFood && doubleFeeBelow > 0 && totalFoodItemsPrice < doubleFeeBelow;
  // First-order FREE delivery (user decision 27 Nov 2026): a signed-in user
  // with zero previous orders pays no delivery fee on their first order.
  const isFirstOrderFree = isFirstOrderFreeDelivery === true && !!currentUser;
  // NEW FEE STRUCTURE (user decision 27 Nov 2026, overrides the old Rs. 50):
  // food delivery Rs. 70 — read from settings/delivery_config
  // (foodDeliveryFee) with the App-passed deliveryFee prop as fallback.
  const foodDeliveryFee =
    Number(systemSettings?.foodDeliveryFee ?? 0) > 0
      ? Number(systemSettings.foodDeliveryFee)
      : deliveryFee > 0
        ? deliveryFee
        : 70;
  const standardFee = foodDeliveryFee;
  const baseDeliveryFee = !hasFood
    ? 0
    : isFirstOrderFree
    ? 0
    : isFreeFoodDelivery
    ? 0
    : isDoubleFee
    ? standardFee * 2
    : standardFee;
  // Rider-range doubling (27 Nov 2026): beyond the admin-set rider range
  // the delivery fee doubles — applied here to the (possibly below-Rs-500
  // doubled) base, BEFORE Priority, exactly like App's saved food total
  // (handlePlaceOrderSubmit). The App-passed deliveryFee prop is NOT
  // pre-doubled any more, so this is the single x2.
  const rangeAdjustedFee = isRiderRangeExceeded ? baseDeliveryFee * 2 : baseDeliveryFee;
  // Delivery speed adjustment (admin-controlled): Priority +priorityFee
  const speedFeeAdjustment =
    !hasFood || effectiveSpeed === "standard"
      ? 0
      : priorityFee;
  const finalDeliveryFee = isFirstOrderFree ? 0 : Math.max(0, rangeAdjustedFee + speedFeeAdjustment);

  // Site tax (user decision 27 Nov 2026): flat Rs. 12 per order, from
  // settings/delivery_config (siteTax, default 12). Still charged on free
  // and first-order-free delivery; never doubled, never waived.
  const siteTax = cartItems.length > 0 ? Number(systemSettings?.siteTax ?? 12) : 0;

  // Night surcharge (user decision 27 Nov 2026, confirmed same day):
  // +nightSurchargeAmount (default Rs. 30) from nightSurchargeStartHour
  // (default 21:00 local time). Applies ON TOP of the final delivery fee,
  // AFTER any below-500 doubling — but free delivery (subtotal >= 1000 or
  // first order) waives the WHOLE delivery fee including the surcharge.
  const nightSurchargeAmount = Number(systemSettings?.nightSurchargeAmount ?? 30);
  const nightSurchargeStartHour = Number(systemSettings?.nightSurchargeStartHour ?? 21);
  const isNightSurcharge =
    hasFood &&
    !isFirstOrderFree &&
    !isFreeFoodDelivery &&
    new Date().getHours() >= nightSurchargeStartHour;
  const nightSurcharge = isNightSurcharge ? nightSurchargeAmount : 0;

  // Base total before any discounts (items + delivery + night surcharge + site tax + optional rider tip)
  const baseOrderTotal = totalFoodItemsPrice + finalDeliveryFee + nightSurcharge + siteTax + riderTip;

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

  let grandTotal = Math.max(0, totalFoodItemsPrice + finalDeliveryFee + nightSurcharge + siteTax + riderTip - totalBenefitDiscount);

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
    setCheckoutError(null);
    if (cartItems.length === 0) return;

    if (!currentUser) {
      onOpenAuth();
      return;
    }

    const trimmedName = (nameInput.trim() || currentUser.name || "").trim();
    if (!trimmedName) {
      setCheckoutError("Apna naam enter karein (Please enter your name).");
      return;
    }

    const currentAddr = (addressInput.trim() || currentUser.address || "").trim();
    if (!currentAddr || currentAddr.length < 4) {
      setIsEditingAddress(true);
      setCheckoutError("Ghar ya shop ka delivery address enter karein.");
      return;
    }

    setSubmitting(true);

    const finalName = trimmedName;
    const cleanPhoneInput = (phoneInput || currentUser.phone || "").replace(/\D/g, "");
    if (!/^03\d{9}$/.test(cleanPhoneInput)) {
      setCheckoutError("Please enter a valid 11-digit mobile number (03XXXXXXXXX) for rider contact.");
      setSubmitting(false);
      return;
    }
    const finalPhone = cleanPhoneInput;

    // Auto-save address if updated
    if (currentAddr !== currentUser.address) {
      const parts = currentAddr.split(",");
      const areaPart = parts[0]?.trim() || currentAddr;
      const streetPart = parts.slice(1).join(",")?.trim() || currentAddr;
      setDoc(doc(db, "users", currentUser.uid), {
        name: finalName,
        address: currentAddr,
        savedLocation: {
          area: areaPart,
          street: streetPart,
          lat: currentUser.savedLocation?.lat || 26.7341,
          lng: currentUser.savedLocation?.lng || 67.7795,
        }
      }, { merge: true }).catch(console.warn);
    }

    const parts = currentAddr.split(",");
    const finalArea = parts[0]?.trim() || currentAddr;
    const finalStreet = parts.slice(1).join(",")?.trim() || "Dadu";

    const orderTypeValue = hasService && !hasFood ? "service" : "food";
    const paymentMethodValue: "COD" | "Easypaisa" | "Pay on Appointment" =
      orderTypeValue === "service" && paymentMethod === "COD" ? "Pay on Appointment" : paymentMethod;

    // Strict location requirement: must have GPS coords OR valid entered/saved address
    const hasManualAddress = currentAddr.length >= 6;
    if (!userCoords && !hasManualAddress) {
      setCheckoutError("Aapka order sahi address par pahunche, is liye location zaroori hai. Apni location on karein ya complete Dadu address enter karein.");
      setSubmitting(false);
      onRequireLocation?.();
      return;
    }

    // Strict Easypaisa receipt upload requirement
    if (paymentMethod === "Easypaisa" && !paymentReceiptUrl) {
      setCheckoutError("Easypaisa payment receipt screenshot/photo upload karna zaroori hai.");
      setSubmitting(false);
      return;
    }

    let activeCoords = userCoords;
    if (!activeCoords && currentUser?.savedLocation?.lat && currentUser?.savedLocation?.lng) {
      activeCoords = { latitude: currentUser.savedLocation.lat, longitude: currentUser.savedLocation.lng };
    }

    if (!activeCoords && typeof navigator !== "undefined" && navigator.geolocation) {
      try {
        const coords = await new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
          const fallbackTimer = setTimeout(() => reject(new Error("GPS timeout")), 2500);
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              clearTimeout(fallbackTimer);
              resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
            },
            (err) => {
              clearTimeout(fallbackTimer);
              reject(err);
            },
            { enableHighAccuracy: false, timeout: 2400, maximumAge: 60000 }
          );
        });
        activeCoords = coords;
      } catch {
        // Proceed with verified manual Dadu address
      }
    }

    if (!activeCoords && hasManualAddress) {
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
        paymentReceiptUrl: paymentMethod === "Easypaisa" ? (paymentReceiptUrl || undefined) : undefined,
        orderType: orderTypeValue,
        userCoords: activeCoords || undefined,
        coinsUsed: useCoins ? coinsDeducted : undefined,
        riderTip: riderTip > 0 ? riderTip : undefined,
        isScheduled: isScheduled || undefined,
        scheduledTime: isScheduled ? scheduledTime : undefined,
        deliverySpeed: hasFood ? effectiveSpeed : undefined,
        leaveAtDoor: leaveAtDoor || undefined,
        messageUponArrival: messageUponArrival || undefined,
        cutlery: cutlery || undefined,
        voucher: appliedVoucher ? {
          code: appliedVoucher.code,
          discountAmount: voucherDiscount,
        } : undefined,
      });
      setPaymentReceiptUrl(null);
    } catch (err) {
      console.error(err);
      // Previously the order just silently failed (spinner stopped, no
      // message) — surface it so the user can retry instead of wondering.
      setCheckoutError("Order place nahi ho saka. Please dobara try karein.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={dialogRef} className="fixed inset-0 z-50 flex justify-end bg-black/75">
      {/* Tap space to slide out drawer */}
      <div className="flex-1" onClick={onClose}></div>

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-heading"
        tabIndex={-1}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        transition={springSmooth}
        className="w-full max-w-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 h-full flex flex-col shadow-2xl border-l border-zinc-200 dark:border-zinc-800"
      >
        
        {/* Banner with close */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#D70F64]" />
            <h3 id="cart-drawer-heading" className="font-extrabold text-sm tracking-wide text-zinc-900 dark:text-zinc-100 uppercase">Your Delivery Cart</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close cart"
            className="w-11 h-11 shrink-0 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-full transition-all duration-300 active:scale-[0.97] active:brightness-110 cursor-pointer text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 focus-visible:outline-2 focus-visible:outline-[#E21B70]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Foodpanda 3-Step Cart Progress Bar */}
        {cartItems.length > 0 && (
          <div className="px-4 py-2.5 bg-white dark:bg-zinc-950 border-b border-zinc-200/80 dark:border-zinc-800/80">
            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">✓</span>
                <span>1. Menu</span>
              </div>
              <div className="flex-1 h-[2px] mx-2 bg-[#D70F64] transition-colors duration-300" />
              <div className="flex items-center gap-1.5 text-[#FF4D94]">
                <span className="w-5 h-5 rounded-full bg-[#D70F64] text-white flex items-center justify-center text-[10px]">2</span>
                <span>2. Cart</span>
              </div>
              <div className="flex-1 h-[2px] mx-2 bg-zinc-300 dark:bg-zinc-700 transition-colors duration-300" />
              <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-all duration-300 ${currentUser && (userCoords || addressInput.trim().length >= 6) ? "bg-[#D70F64] text-white" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"}`}>3</span>
                <span>3. Checkout</span>
              </div>
            </div>
          </div>
        )}

        {/* List of items inside the drawer */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 bg-white dark:bg-zinc-950">
          
          {cartItems.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <span className="text-4xl block animate-bounce">🛒</span>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Your Dadu Cart is empty!</p>
              <button
                onClick={onClose}
                className="bg-[#E21B70] hover:bg-[#C2145E] transition-all duration-300 active:scale-[0.97] active:brightness-110 text-white font-black text-xs uppercase tracking-wider py-3 px-6 rounded-xl cursor-pointer shadow-xs relative overflow-hidden after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0)_65%)] after:opacity-0 after:scale-50 after:transition-all after:duration-300 after:pointer-events-none active:after:opacity-100 active:after:scale-125 active:after:duration-100"
              >
                Go Add Tea & Food
              </button>
            </div>
          ) : (
            <div className="space-y-3 animate-fade-in">
              {cartItems.map((item) => (
                <div key={item.dishId} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-xs transition-transform duration-300 md:hover:-translate-y-0.5">
                  {/* Dish thumbnail — Foodpanda-style, same as the grocery basket.
                      Only renders when the item carries a photo (items added before
                      this change have none and simply show no thumbnail). */}
                  {item.imageUrl && (
                    <LazyImage
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-12 h-12 rounded-xl overflow-hidden shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 block truncate">{item.name}</span>
                      {item.type === "service" && (
                        <span className="bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900/40 text-amber-600 dark:text-amber-500 text-[9px] font-black uppercase px-2 py-0.5 rounded-sm shrink-0">
                          Service
                        </span>
                      )}
                    </div>
                    {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
                        Add-ons: {Object.entries(item.selectedAddOns.reduce((acc, curr) => {
                          acc[curr.name] = (acc[curr.name] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)).map(([name, count]) => `${Number(count) * (item.quantity || 1)}x ${name}`).join(', ')}
                      </div>
                    )}
                    {item.specialInstructions && (
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium mt-0.5 italic">
                        Note: {item.specialInstructions}
                      </div>
                    )}
                    <div className="text-[10px] text-[#E21B70] dark:text-[#FF4D94] font-extrabold tracking-wider uppercase flex items-center gap-1 select-none mt-0.5">
                      <span>🏪</span> {item.restaurantName || "Dadu Fast Food & Kitchen"}
                    </div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-bold block mt-0.5">Rs. {item.price} each</span>
                  </div>

                  {/* Quantity adjustments */}
                  <div className="flex items-center gap-2 select-none shrink-0 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-1 rounded-xl">
                    <button
                      onClick={() => onUpdateQuantity(item.dishId, item.quantity - 1)}
                      aria-label={`Decrease quantity of ${item.name}`}
                      className="w-11 h-11 rounded-lg text-base bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-extrabold flex items-center justify-center cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-[#E21B70] transition-transform duration-180 active:scale-[0.97] active:brightness-110"
                    >
                      -
                    </button>
                    <span className="text-xs font-black min-w-4 text-center text-zinc-800 dark:text-zinc-200 transition-all duration-200">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(item.dishId, item.quantity + 1)}
                      aria-label={`Increase quantity of ${item.name}`}
                      className="w-11 h-11 rounded-lg text-base bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-extrabold flex items-center justify-center cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-[#E21B70] transition-transform duration-180 active:scale-[0.97] active:brightness-110"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.dishId)}
                    aria-label={`Remove ${item.name} from cart`}
                    className="w-11 h-11 shrink-0 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-[#E21B70] rounded-lg transition-all duration-300 active:scale-[0.97] active:brightness-110 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#E21B70]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Popular with your order — real bestsellers from the live menu */}
          {cartItems.length > 0 && popularDishes.length > 0 && onAddPopularDish && (
            <div className="bg-gradient-to-br from-[#E21B70]/5 to-white dark:to-zinc-900 border border-[#E21B70]/15 p-4 rounded-3xl mt-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[#E21B70] flex items-center gap-1.5">
                  <span className="text-base">🔥</span> Popular with your order
                </span>
                <span className="bg-[#E21B70]/10 text-[#E21B70] text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
                  Bestsellers
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold leading-tight">
                Dadu's most-loved dishes — tap + to add one to your order.
              </p>

              <div className="flex gap-3 overflow-x-auto pb-1 pr-3 scrollbar-none snap-x snap-mandatory">
                {popularDishes.filter((d) => d.isAvailable !== false).map((dish) => {
                  const alreadyInCart = cartItems.find(item => item.dishId === dish.id);
                  const price = dish.discountPrice && dish.discountPrice > 0 ? dish.discountPrice : dish.price;
                  return (
                    <div
                      key={dish.id}
                      className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-2.5 w-36 shrink-0 flex flex-col justify-between gap-2 snap-start hover:border-[#E21B70]/30 transition-all duration-300 md:hover:-translate-y-0.5"
                    >
                      <div className="relative h-20 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 shrink-0">
                        <LazyImage
                          src={dish.imageUrl}
                          alt={dish.name}
                          className="w-full h-full"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-xs text-[8px] font-black text-white px-1.5 py-0.5 rounded">
                          Rs. {price}
                        </div>
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <h5 className="font-extrabold text-[11px] text-zinc-900 dark:text-zinc-100 truncate leading-tight">{dish.name}</h5>
                        <p className="text-[9px] text-zinc-500 dark:text-zinc-400 font-semibold truncate leading-none">{dish.restaurantName || "Dadu Fast Food & Kitchen"}</p>
                      </div>

                      {alreadyInCart ? (
                        <div className="flex items-center justify-between bg-[#E21B70]/10 border border-[#E21B70]/20 p-1 rounded-xl text-xs">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(dish.id, alreadyInCart.quantity - 1)}
                            aria-label={`Decrease quantity of ${dish.name}`}
                            className="w-10 h-10 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-extrabold flex items-center justify-center cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-[#E21B70] transition-transform duration-180 active:scale-[0.97] active:brightness-110"
                          >
                            -
                          </button>
                          <span className="text-[10px] font-black text-zinc-800 dark:text-zinc-200 transition-all duration-200">{alreadyInCart.quantity}</span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(dish.id, alreadyInCart.quantity + 1)}
                            aria-label={`Increase quantity of ${dish.name}`}
                            className="w-10 h-10 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-extrabold flex items-center justify-center cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-[#E21B70] transition-transform duration-180 active:scale-[0.97] active:brightness-110"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAddPopularDish(dish)}
                          className="w-full min-h-[44px] bg-[#E21B70] hover:bg-[#C2145E] text-white py-1.5 rounded-xl font-black text-[9px] uppercase tracking-wider transition-transform duration-180 cursor-pointer text-center hover:scale-[1.02] active:scale-[0.97] active:brightness-110 relative overflow-hidden after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0)_65%)] after:opacity-0 after:scale-50 after:transition-all after:duration-300 after:pointer-events-none active:after:opacity-100 active:after:scale-125 active:after:duration-100"
                        >
                          + Add Dish
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Checkout-Exclusive Drinks Recommendation Section */}
          {cartItems.length > 0 && (
            <div className="bg-gradient-to-br from-[#E21B70]/5 to-white dark:to-zinc-900 border border-[#E21B70]/15 p-4 rounded-3xl mt-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[#E21B70] flex items-center gap-1.5">
                  <span className="text-base">🥤</span> Complete Your Meal
                </span>
                <span className="bg-[#E21B70]/10 text-[#E21B70] text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
                  Checkout Exclusive
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold leading-tight">
                Add an ice-cold beverage to go with your hot food! (Served chilled)
              </p>

              <div className="flex gap-3 overflow-x-auto pb-1 pr-3 scrollbar-none snap-x snap-mandatory">
                {CHECKOUT_DRINKS.map((drink) => {
                  const alreadyInCart = cartItems.find(item => item.dishId === drink.id);
                  return (
                    <div 
                      key={drink.id} 
                      className="bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-2.5 w-36 shrink-0 flex flex-col justify-between gap-2 snap-start hover:border-[#E21B70]/30 transition-all duration-300 md:hover:-translate-y-0.5"
                    >
                      <div className="relative h-20 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shrink-0">
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
                        <h5 className="font-extrabold text-[11px] text-zinc-900 dark:text-zinc-100 truncate leading-tight">{drink.name}</h5>
                        <p className="text-[9px] text-zinc-500 dark:text-zinc-500 font-semibold truncate leading-none">{drink.description}</p>
                      </div>

                      {alreadyInCart ? (
                        <div className="flex items-center justify-between bg-[#E21B70]/10 border border-[#E21B70]/20 p-1 rounded-xl text-xs">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(drink.id, alreadyInCart.quantity - 1)}
                            aria-label={`Decrease quantity of ${drink.name}`}
                            className="w-10 h-10 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-extrabold flex items-center justify-center cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-[#E21B70] transition-transform duration-180 active:scale-[0.97] active:brightness-110"
                          >
                            -
                          </button>
                          <span className="text-[10px] font-black text-zinc-800 dark:text-zinc-200 transition-all duration-200">{alreadyInCart.quantity}</span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(drink.id, alreadyInCart.quantity + 1)}
                            aria-label={`Increase quantity of ${drink.name}`}
                            className="w-10 h-10 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-extrabold flex items-center justify-center cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-[#E21B70] transition-transform duration-180 active:scale-[0.97] active:brightness-110"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAddDrink(drink)}
                          className="w-full min-h-[44px] bg-[#E21B70] hover:bg-[#C2145E] text-white py-1.5 rounded-xl font-black text-[9px] uppercase tracking-wider transition-transform duration-180 cursor-pointer text-center hover:scale-[1.02] active:scale-[0.97] active:brightness-110 relative overflow-hidden after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0)_65%)] after:opacity-0 after:scale-50 after:transition-all after:duration-300 after:pointer-events-none active:after:opacity-100 active:after:scale-125 active:after:duration-100"
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
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-3xl mt-6 space-y-4 shadow-3xs">
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800 pb-2 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#E21B70]" />
                Delivery Information Details
              </h4>

              <div className="space-y-2.5 pt-2">
                {currentUser ? (
                  <div className="space-y-3">
                    <div className="bg-white dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider block">Customer Name</span>
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => {
                          setNameInput(e.target.value);
                          if (checkoutError) setCheckoutError(null);
                        }}
                        placeholder="Apna naam likhein (e.g. Ali Ahmed)..."
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 focus:border-[#E21B70] rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none font-bold"
                      />
                    </div>

                    <div className="bg-white dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#E21B70]" />
                          Delivery Address
                        </span>
                        {!isEditingAddress && (
                          <button
                            type="button"
                            onClick={handleStartEditAddress}
                            className="flex items-center gap-1 text-[11px] font-black text-[#E21B70] hover:text-[#ff2b7f] hover:underline transition-all duration-300 active:scale-[0.97] cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            {currentUser.address ? "Change Address" : "Add Address"}
                          </button>
                        )}
                      </div>

                      {addressSaveSuccess && (
                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold flex items-center gap-1.5 animate-fade-in">
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          Address updated in database successfully!
                        </div>
                      )}

                      {isEditingAddress ? (
                        <div className="space-y-2 pt-1 animate-fade-in">
                          {/* Quick Address Tag Selector */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(["Ghar", "Dukan / Office", "Hostel", "Other"] as SavedAddressEntry["label"][]).map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => setAddressLabel(tag)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all duration-300 active:scale-[0.97] active:brightness-110 cursor-pointer border ${
                                  addressLabel === tag
                                    ? "bg-[#E21B70] text-white border-[#E21B70]"
                                    : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:text-zinc-900 dark:hover:text-white"
                                }`}
                              >
                                {tag === "Ghar" ? "🏠 Ghar" : tag === "Dukan / Office" ? "🏪 Dukan / Office" : tag === "Hostel" ? "🎓 Hostel" : "📍 Other"}
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={addressInput}
                            onChange={(e) => {
                              setAddressInput(e.target.value);
                              if (addressError) setAddressError(null);
                            }}
                            placeholder="Enter full delivery address (House/Shop #, Street, Area, Dadu)..."
                            rows={3}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 focus:border-[#E21B70] rounded-xl p-2.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none resize-none font-medium leading-relaxed"
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
                              className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-all duration-300 active:scale-[0.97] active:brightness-110 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveAddress}
                              disabled={isSavingAddress}
                              className="min-h-[44px] px-4 py-1.5 rounded-lg text-xs font-black text-white bg-[#E21B70] hover:bg-[#C2145E] shadow-md shadow-[#E21B70]/20 transition-all duration-300 active:scale-[0.97] active:brightness-110 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 relative overflow-hidden after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0)_65%)] after:opacity-0 after:scale-50 after:transition-all after:duration-300 after:pointer-events-none active:after:opacity-100 active:after:scale-125 active:after:duration-100"
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
                        <p className="text-xs text-zinc-800 dark:text-zinc-200 font-bold leading-normal bg-zinc-200/70 dark:bg-zinc-900/60 p-2 rounded-lg border border-zinc-200 dark:border-zinc-850">
                          {currentUser.address}
                        </p>
                      ) : (
                        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold space-y-1">
                          <p>No address assigned yet!</p>
                          <button
                            type="button"
                            onClick={handleStartEditAddress}
                            className="text-[11px] underline font-black text-rose-600 dark:text-white cursor-pointer"
                          >
                            + Click here to add your delivery address
                          </button>
                        </div>
                      )}

                      {/* 1-Tap Saved Recent Addresses */}
                      {savedAddresses.length > 0 && (
                        <div className="pt-1.5 space-y-1.5 border-t border-zinc-200/80 dark:border-zinc-800/80">
                          <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-500 block">
                            1-Tap Saved Addresses
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {savedAddresses.map((entry, idx) => {
                              const isActive =
                                (currentUser.address || "").trim().toLowerCase() ===
                                entry.address.trim().toLowerCase();
                              const icon =
                                entry.label === "Ghar"
                                  ? "🏠"
                                  : entry.label === "Dukan / Office"
                                    ? "🏪"
                                    : entry.label === "Hostel"
                                      ? "🎓"
                                      : "📍";
                              return (
                                <button
                                  key={`${entry.label}-${idx}`}
                                  type="button"
                                  disabled={isSavingAddress}
                                  onClick={() => handleQuickSelectSavedAddress(entry)}
                                  title={entry.address}
                                  className={`max-w-full text-left px-2.5 py-1.5 rounded-xl text-[10.5px] font-bold transition-all duration-300 active:scale-[0.97] active:brightness-110 cursor-pointer flex items-center gap-1.5 border ${
                                    isActive
                                      ? "bg-[#E21B70]/15 border-[#E21B70]/60 text-pink-700 dark:text-pink-200"
                                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600"
                                  }`}
                                >
                                  <span>{icon}</span>
                                  <span className="font-black text-zinc-900 dark:text-white shrink-0">{entry.label}:</span>
                                  <span className="truncate max-w-[140px] text-zinc-500 dark:text-zinc-400">{entry.address}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl text-center">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">Please sign in to place your order</p>
                  </div>
                )}

                {userCoords ? (
                  <div className="bg-white dark:bg-zinc-950 border border-emerald-500/30 rounded-xl overflow-hidden relative">
                    {/* Real Map Preview (Leaflet + OpenStreetMap) */}
                    <div className="h-24 w-full relative overflow-hidden">
                      <MapContainer
                        center={[userCoords.latitude, userCoords.longitude]}
                        zoom={15}
                        zoomControl={false}
                        dragging={false}
                        scrollWheelZoom={false}
                        doubleClickZoom={false}
                        touchZoom={false}
                        keyboard={false}
                        style={{ width: "100%", height: "100%", zIndex: 0 }}
                      >
                        <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
                        <Marker position={[userCoords.latitude, userCoords.longitude]} icon={CART_PIN_ICON} />
                        <InvalidateSizeOnMount />
                      </MapContainer>
                    </div>
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider mb-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            Location coordinates attached
                          </div>
                          <p className="text-zinc-800 dark:text-zinc-200 text-xs font-bold">{currentUser?.savedLocation?.area || currentUser?.address?.split(',')[0]?.trim() || "Location detected"}</p>
                          <p className="text-zinc-500 dark:text-zinc-400 text-[10px]">{currentUser?.savedLocation?.street || currentUser?.address?.split(',')[1]?.trim() || "Auto-filled"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-xl flex flex-col items-center text-center gap-2">
                    <MapPin className={`w-5 h-5 ${locationTimedOut ? "text-[#E21B70]" : "text-zinc-500 dark:text-zinc-400 animate-pulse"}`} />
                    <p className="text-zinc-800 dark:text-zinc-200 text-xs font-bold">
                      {locationTimedOut
                        ? "GPS unavailable — proceed smoothly with your manual Dadu address!"
                        : "Checking optional GPS signal..."}
                    </p>
                    <button
                      type="button"
                      onClick={handleStartEditAddress}
                      className="text-[11px] font-black text-[#E21B70] hover:underline cursor-pointer"
                    >
                      Enter / Edit Delivery Address Manually
                    </button>
                  </div>
                )}

                {/* Editable Contact Phone Number */}
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-xl space-y-2">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#E21B70]" /> Contact Phone Number *
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 11))}
                    placeholder="03XX-XXXXXXX"
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-bold focus:outline-none focus:border-[#E21B70]"
                  />
                </div>

                {/* Payment Method Selector (ONLY Cash on Delivery & Easypaisa) */}
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-xl space-y-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                    Payment Method
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {(["COD", "Easypaisa"] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(method);
                          setCheckoutError(null);
                          localStorage.setItem("dadu_preferred_payment", method);
                        }}
                        aria-pressed={paymentMethod === method}
                        className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-extrabold border transition-all duration-300 active:scale-[0.97] active:brightness-110 cursor-pointer ${
                          paymentMethod === method
                            ? "bg-[#D70F64] border-[#D70F64] text-white shadow-sm"
                            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600"
                        }`}
                      >
                        {method === "COD" ? "💵 Cash on Delivery" : "📱 Easypaisa"}
                      </button>
                    ))}
                  </div>
                  {paymentMethod === "Easypaisa" && (
                    <EasypaisaPaymentBox
                      receiptUrl={paymentReceiptUrl}
                      onReceiptChange={setPaymentReceiptUrl}
                      amount={grandTotal}
                      accountTitle={easypaisaTitle}
                      accountNumber={easypaisaNumber}
                    />
                  )}
                </div>

                {/* Delivery Timing: Deliver Now vs Scheduled Pre-Order */}
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-xl space-y-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                    Delivery Timing
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsScheduled(false)}
                      aria-pressed={!isScheduled}
                      className={`min-h-[48px] py-2 px-2.5 rounded-xl text-xs font-bold border transition-all duration-300 active:scale-[0.97] active:brightness-110 cursor-pointer ${
                        !isScheduled
                          ? "bg-[#E21B70] border-[#E21B70] text-white"
                          : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      Deliver Now (ASAP)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsScheduled(true)}
                      aria-pressed={isScheduled}
                      className={`min-h-[48px] py-2 px-2.5 rounded-xl text-xs font-bold border transition-all duration-300 active:scale-[0.97] active:brightness-110 cursor-pointer ${
                        isScheduled
                          ? "bg-[#E21B70] border-[#E21B70] text-white"
                          : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      Schedule Pre-Order
                    </button>
                  </div>
                  {isScheduled && (
                    <select
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-bold"
                    >
                      <option value="Today, +45 Mins">Today, in 45 Minutes</option>
                      <option value="Today, +1 Hour">Today, in 1 Hour</option>
                      <option value="Today, +2 Hours">Today, in 2 Hours</option>
                      <option value="Tonight, 8:00 PM">Tonight, 8:00 PM (Dinner)</option>
                      <option value="Tonight, 9:30 PM">Tonight, 9:30 PM</option>
                      <option value="Tomorrow, 1:00 PM">Tomorrow, 1:00 PM (Lunch)</option>
                    </select>
                  )}
                </div>

                {/* Delivery Speed: Standard / Priority */}
                {hasFood && (
                  <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-xl space-y-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                      Delivery Speed
                    </span>
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${speedOptions.length}, minmax(0, 1fr))` }}>
                      {speedOptions.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setDeliverySpeed(opt.id)}
                          aria-pressed={effectiveSpeed === opt.id}
                          className={`min-h-[48px] py-2 px-2 rounded-xl text-center border transition-all duration-300 active:scale-[0.97] active:brightness-110 cursor-pointer ${
                            effectiveSpeed === opt.id
                              ? "bg-[#E21B70] border-[#E21B70] text-white"
                              : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600"
                          }`}
                        >
                          <span className="block text-xs font-extrabold">{opt.label}</span>
                          <span className="block text-[10px] font-bold opacity-80">{opt.eta}</span>
                          <span className="block text-[10px] font-bold opacity-80">{opt.feeNote}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Delivery Preferences: Leave at door / Message upon arrival / Cutlery */}
                {hasFood && showDeliveryPreferences && (
                  <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-xl space-y-3">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                      Delivery Preferences
                    </span>
                    {(
                      [
                        { key: "leaveAtDoor", label: "Leave at door", desc: "Rider order darwaze par chhor dega", value: leaveAtDoor, set: setLeaveAtDoor, enabled: systemSettings?.leaveAtDoorEnabled !== false },
                        { key: "messageUponArrival", label: "Message upon arrival", desc: "Pahunchne par rider message karega", value: messageUponArrival, set: setMessageUponArrival, enabled: systemSettings?.messageOnArrivalEnabled !== false },
                        { key: "cutlery", label: "Cutlery", desc: "Chammach / kaanta saath chahiye", value: cutlery, set: setCutlery, enabled: systemSettings?.cutleryEnabled !== false },
                      ] as const
                    ).filter((pref) => pref.enabled).map((pref) => (
                      <button
                        key={pref.key}
                        type="button"
                        role="switch"
                        aria-checked={pref.value}
                        aria-label={pref.label}
                        onClick={() => pref.set(!pref.value)}
                        className="w-full min-h-[44px] flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <span className="text-left">
                          <span className="block text-xs font-bold text-zinc-900 dark:text-zinc-100">{pref.label}</span>
                          <span className="block text-[10px] text-zinc-500 dark:text-zinc-400">{pref.desc}</span>
                        </span>
                        <span
                          className={`shrink-0 w-11 h-6 rounded-full p-0.5 transition-colors duration-300 ${pref.value ? "bg-[#E21B70]" : "bg-zinc-300 dark:bg-zinc-700"}`}
                        >
                          <span
                            className={`block w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${pref.value ? "translate-x-5" : "translate-x-0"}`}
                          />
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Optional Rider Tip */}
                {hasFood && (
                  <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Rider Tip (100% goes to rider)
                      </span>
                      <span className="text-[11px] font-black text-[#E21B70]">
                        {riderTip > 0 ? `Rs. ${riderTip}` : "Optional"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {tipOptions.map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setRiderTip(amt)}
                          aria-pressed={riderTip === amt}
                          className={`flex-1 min-w-[60px] min-h-[44px] py-1.5 px-1 rounded-lg text-xs font-bold border transition-all duration-300 active:scale-[0.97] active:brightness-110 cursor-pointer ${
                            riderTip === amt
                              ? "bg-[#E21B70] border-[#E21B70] text-white"
                              : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600"
                          }`}
                        >
                          {amt === 0 ? "None" : `Rs. ${amt}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Diagnostic Visitation Note for Pure Home Services ordered to omit Food terms */}
          {hasService && (
            <div className="bg-amber-100 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-900/40 text-amber-600 dark:text-amber-500 text-xs p-3.5 rounded-3xl mt-4 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
              <div>
                <span className="font-extrabold block">⚠️ Visitation & Checkup Note:</span>
                <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed font-semibold">
                  The Rs. 500 charge is purely the diagnostic/visitation fee (Aane ke charges). Complete material and secondary repair estimates will be evaluated and quoted on-site by the technician once they inspect the job at your home.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Pricing Summary Bottom Card — scrollable so Place Order is always
            reachable on short phones even with the voucher box expanded. */}
        {cartItems.length > 0 && (
          <div className="p-4 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 space-y-3.5 rounded-t-3xl shadow-2xl shrink-0 max-h-[58dvh] overflow-y-auto overscroll-contain">
            {hasFood && isDoubleFee && (
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3 text-[11px] text-amber-600 dark:text-amber-400 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold block text-amber-600 dark:text-amber-300">Delivery Charges Doubled (Below Rs. {doubleFeeBelow})</span>
                  Rs. {doubleFeeBelow} se kam order par delivery charges double hain. Add Rs. {doubleFeeBelow - totalFoodItemsPrice} more of delicious food to get standard delivery rate!
                </div>
              </div>
            )}

            {/* 1-TAP AUTO-APPLY BEST VOUCHER BANNER */}
            {!appliedVoucher && (() => {
              const eligibleFoodVouchers = allVouchers
                .filter((v) => {
                  const elig = canUserUseVoucher(v, currentUser?.uid);
                  if (!elig.allowed) return false;
                  if (v.applicableType === "grocery_only") return false;
                  if (v.applicableType === "restaurant" && v.applicableRestaurant) {
                    const matchRest = cartItems.some(
                      (i) => i.restaurantName?.toLowerCase() === v.applicableRestaurant?.toLowerCase()
                    );
                    if (!matchRest) return false;
                  }
                  if (v.minOrderAmount && totalFoodItemsPrice < v.minOrderAmount) return false;
                  return calculateVoucherDiscount(v, totalFoodItemsPrice) > 0;
                })
                .sort(
                  (a, b) =>
                    calculateVoucherDiscount(b, totalFoodItemsPrice) -
                    calculateVoucherDiscount(a, totalFoodItemsPrice)
                );

              const bestVoucher = eligibleFoodVouchers[0];
              if (!bestVoucher) return null;
              const bestSave = calculateVoucherDiscount(bestVoucher, totalFoodItemsPrice);

              return (
                <div className="bg-gradient-to-r from-[#E21B70]/20 via-pink-600/15 to-amber-500/15 border border-[#E21B70]/40 rounded-2xl p-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-[#E21B70] text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Ticket className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-zinc-900 dark:text-white truncate">
                        Save Rs. {bestSave} with <span className="font-mono text-[#D70F64] dark:text-pink-300">{bestVoucher.code}</span>
                      </p>
                      <p className="text-[9.5px] text-zinc-700 dark:text-zinc-300 truncate">
                        {bestVoucher.successMessage || "Instant promo discount available!"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyVoucher(bestVoucher)}
                    className="bg-[#E21B70] hover:bg-[#C2145E] text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl shrink-0 shadow-md shadow-[#E21B70]/25 cursor-pointer transition-all duration-300 active:scale-[0.97] active:brightness-110 relative overflow-hidden after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0)_65%)] after:opacity-0 after:scale-50 after:transition-all after:duration-300 after:pointer-events-none active:after:opacity-100 active:after:scale-125 active:after:duration-100"
                  >
                    1-Tap Apply
                  </button>
                </div>
              );
            })()}

            {/* BENEFIT / OFFERS & DISCOUNTS COLLAPSIBLE BOX */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden transition-all duration-300">
              {/* Box Click Trigger */}
              <button
                type="button"
                onClick={() => setIsBenefitsOpen(!isBenefitsOpen)}
                aria-expanded={isBenefitsOpen}
                className="w-full min-h-[48px] p-3 flex items-center justify-between gap-2.5 text-left hover:bg-zinc-100/70 dark:hover:bg-zinc-850/60 transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E21B70]/20 via-pink-500/10 to-amber-500/20 border border-[#E21B70]/30 flex items-center justify-center shrink-0 shadow-inner">
                    <Tag className="w-4 h-4 text-[#E21B70]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-black text-zinc-900 dark:text-white tracking-wide">
                        Offers & Benefits
                      </span>
                      {(appliedVoucher || (useCoins && coinsDeducted > 0)) ? (
                        <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">
                          Rs. {voucherDiscount + coinsDeducted} Saved
                        </span>
                      ) : (
                        <span className="bg-[#E21B70]/15 border border-[#E21B70]/25 text-[#D70F64] dark:text-pink-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md">
                          Vouchers & Coins
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium truncate mt-0.5">
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
                  <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 hidden sm:inline">
                    {isBenefitsOpen ? "Close" : "Open"}
                  </span>
                  <div className={`w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 transition-transform duration-300 ${isBenefitsOpen ? "rotate-180 text-white bg-[#E21B70]" : ""}`}>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>
              </button>

              {/* Inside Benefit Box (Shown when open) */}
              {isBenefitsOpen && (
                <div className="p-3 pt-2.5 border-t border-zinc-200 dark:border-zinc-800 space-y-3 bg-zinc-100/70 dark:bg-zinc-950/60">
                  {/* VOUCHER / DISCOUNT CODE SECTION */}
                  <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-black text-[#D70F64] dark:text-pink-400">
                        <Ticket className="w-3.5 h-3.5 text-[#E21B70]" />
                        <span>Promo Voucher</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsVouchersModalOpen(true)}
                        className="text-[10.5px] font-black text-[#E21B70] hover:text-[#C2145E] dark:hover:text-pink-300 underline cursor-pointer"
                      >
                        View My Vouchers 🎟️
                      </button>
                    </div>

                    {appliedVoucher ? (
                      <div className="bg-pink-500/10 border border-[#E21B70]/30 rounded-xl p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-xs text-zinc-900 dark:text-white">{appliedVoucher.code}</span>
                              <span className="bg-[#E21B70] text-white text-[9px] font-black px-1.5 py-0.2 rounded-md">
                                Rs. {voucherDiscount} OFF
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">{appliedVoucher.title}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveVoucher}
                          className="text-xs text-rose-400 hover:text-rose-500 dark:hover:text-rose-300 font-bold px-2 py-1 bg-rose-500/10 rounded-lg cursor-pointer transition-transform duration-180 active:scale-[0.97] active:brightness-110"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Tag className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
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
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs font-mono font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-[#E21B70] uppercase"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleApplyVoucher(voucherInputCode)}
                            className="min-h-[44px] bg-[#E21B70] hover:bg-[#C2145E] text-white text-xs font-black px-3.5 py-2 rounded-xl transition-all duration-300 active:scale-[0.97] active:brightness-110 cursor-pointer relative overflow-hidden after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0)_65%)] after:opacity-0 after:scale-50 after:transition-all after:duration-300 after:pointer-events-none active:after:opacity-100 active:after:scale-125 active:after:duration-100"
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
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[9.5px] text-zinc-500 dark:text-zinc-400">
                    <Info className="w-3 h-3 text-[#D70F64] dark:text-pink-400 shrink-0" />
                    <span>Ek order par sirf 1 offer lag sakti hai (Voucher <strong>ya</strong> Coin Discount).</span>
                  </div>

                  {/* Coin Benefit Section - Rendered ONLY if enabled by admin and user has coins */}
                  {isLoyaltyEnabledForFood && maxAllowedCoinsByAdmin > 0 && userCoins > 0 && (
                    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-amber-600/10 border border-amber-500/30 rounded-xl p-3 space-y-2.5 animate-fade-in text-left shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-inner">
                            <Coins className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-amber-600 dark:text-amber-300 truncate">
                                🪙 Coin Benefit Discount
                              </span>
                              <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${useCoins && !appliedVoucher ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}>
                                {useCoins && !appliedVoucher ? `Rs. ${maxCoinsUsable} OFF` : 'OFF'}
                              </span>
                            </div>
                            <span className="text-[10px] text-amber-600/90 dark:text-amber-400/90 font-bold block truncate mt-0.5">
                              Wallet: <span className="font-mono font-black text-amber-600 dark:text-amber-300">{userCoins} Coins</span> (1 Coin = Rs. 1)
                            </span>
                          </div>
                        </div>

                        {/* Toggle Switch */}
                        <button
                          type="button"
                          onClick={handleToggleCoins}
                          role="switch"
                          aria-checked={useCoins && !appliedVoucher}
                          aria-label="Use coins for discount"
                          className={`w-11 h-6 rounded-full transition-colors duration-300 relative cursor-pointer outline-none shrink-0 border ${
                            useCoins && !appliedVoucher ? "bg-amber-500 border-amber-400 shadow-md shadow-amber-500/20" : "bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-md transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] flex items-center justify-center text-[9px] font-black ${
                              useCoins && !appliedVoucher ? "transform translate-x-5 text-amber-600" : "text-zinc-500 dark:text-zinc-500"
                            }`}
                          >
                            {useCoins && !appliedVoucher ? "✓" : ""}
                          </span>
                        </button>
                      </div>

                      {/* Admin settings info row */}
                      <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between text-[10px] text-amber-600/80 dark:text-amber-300/80 font-semibold">
                        <span>
                          ⚡ Admin Max Limit: <strong className="text-amber-600 dark:text-amber-300 font-mono">Rs. {maxAllowedCoinsByAdmin}</strong>
                        </span>
                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                          {useCoins && !appliedVoucher ? `Applied: Rs. ${coinsDeducted}` : `Available: Rs. ${maxCoinsUsable}`}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Real-time Loyalty Cashback Earning Banner - Rendered ONLY if enabled by admin */}
                  {loyaltyEarnEnabled && loyaltyEarnVal > 0 && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-left text-xs animate-fade-in shadow-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/35 flex items-center justify-center shrink-0">
                          <Coins className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-bounce" />
                        </div>
                        <div>
                          {grandTotal >= loyaltyMinOrder ? (
                            <>
                              <span className="text-xs font-black text-emerald-600 dark:text-emerald-300 block">
                                🎉 Cashback: <span className="text-emerald-700 dark:text-emerald-200 font-mono font-black">+{estimatedCoinsEarned} Coins</span>
                              </span>
                              <span className="text-[10px] text-emerald-600/90 dark:text-emerald-400/90 font-medium block mt-0.5">
                                {loyaltyEarnType === "fixed" 
                                  ? `Flat ${loyaltyEarnVal} Coins (Rs. ${estimatedCoinsEarned} Cashback)` 
                                  : `${loyaltyEarnVal}% Cashback on Order (Rs. ${estimatedCoinsEarned})`}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-xs font-black text-amber-600 dark:text-amber-300 block">
                                💡 Rs. {loyaltyMinOrder - Math.floor(grandTotal)} Ka Aur Order Karein
                              </span>
                              <span className="text-[10px] text-amber-600/90 dark:text-amber-400/90 font-medium block mt-0.5">
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

            <div className="space-y-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-semibold mt-4">
              <div className="flex justify-between">
                <span>Items Subtotal:</span>
                <span className="text-zinc-900 dark:text-zinc-100 font-extrabold font-mono">Rs. {totalFoodItemsPrice}</span>
              </div>

              {appliedVoucher && voucherDiscount > 0 && (
                <div className="flex justify-between text-[#D70F64] dark:text-pink-400">
                  <span>Voucher Discount ({appliedVoucher.code}):</span>
                  <span className="font-extrabold font-mono">- Rs. {voucherDiscount}</span>
                </div>
              )}

              {useCoins && coinsDeducted > 0 && (
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>Coin Benefit Discount:</span>
                  <span className="font-extrabold font-mono">- Rs. {coinsDeducted}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Delivery / Service Fee:</span>
                <span className="text-zinc-900 dark:text-zinc-100 font-extrabold">
                  {finalDeliveryFee === 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-black">
                      {isFirstOrderFree
                        ? "FREE delivery — first order"
                        : isFreeFoodDelivery
                          ? `FREE (Order ≥ Rs. ${freeDeliveryAbove.toLocaleString()})`
                          : "FREE (Home Service Booking)"}
                    </span>
                  ) : (
                    <span className="font-mono">Rs. {finalDeliveryFee}</span>
                  )}
                </span>
              </div>
              {nightSurcharge > 0 && (
                <div className="flex justify-between">
                  <span>Night Surcharge +Rs. {nightSurcharge}</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-extrabold font-mono">Rs. {nightSurcharge}</span>
                </div>
              )}
              {siteTax > 0 && (
                <div className="flex justify-between">
                  <span>Site Tax:</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-extrabold font-mono">Rs. {siteTax}</span>
                </div>
              )}
              {riderTip > 0 && (
                <div className="flex justify-between">
                  <span>Rider Tip:</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-extrabold font-mono">Rs. {riderTip}</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-900 dark:text-zinc-100 text-sm font-black border-t border-zinc-200 dark:border-zinc-800 pt-2.5">
                <span>Grand Total ({paymentMethod}):</span>
                <span className="text-[#D70F64] text-base font-bold font-mono">Rs. {grandTotal}</span>
              </div>
            </div>

            {checkoutError && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-500 dark:text-rose-300 font-bold flex items-center gap-2 micro-toast-in">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            <button
              onClick={handleSubmitOrder}
              disabled={submitting}
              aria-busy={submitting}
              className="w-full min-h-[48px] btn-pink relative overflow-hidden after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0)_65%)] after:opacity-0 after:scale-50 after:transition-all after:duration-300 after:pointer-events-none active:after:opacity-100 active:after:scale-125 active:after:duration-100 text-white py-3.5 rounded-2xl font-black uppercase text-xs tracking-wider shadow-md transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 active:scale-[0.97] active:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E21B70]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Placing Order...
                </>
              ) : paymentMethod === "Easypaisa" ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Submit Easypaisa Order • Rs. {grandTotal}
                </>
              ) : isScheduled ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Schedule Order • Rs. {grandTotal}
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Place Order • Rs. {grandTotal}
                </>
              )}
            </button>
          </div>
        )}

      </motion.div>

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
