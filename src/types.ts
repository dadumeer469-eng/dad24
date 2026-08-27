export interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  category: "Burgers" | "Pizzas" | "Chicken & Rice" | "Only Tea" | "Home Services" | "Specials" | "Drinks" | "Pizza" | "Burger" | "Broast" | "Rolls" | "Pasta" | "Lazania" | "Fries" | "Paratha" | "Sandwich" | "Ice Cream" | "Dessert" | "Milkshake" | "Limca" | "Beverages" | string;
  imageUrl: string;
  isAvailable: boolean; // ON/OFF toggle switch from admin
  openingTime?: string;
  closingTime?: string;
  isFeatured?: boolean; position?: number; // Highlighted / favorite item shown in top spots
  isBestseller?: boolean;
  isVeg?: boolean;
  type: "food" | "service";
  serviceDuration?: string;
  restaurantName?: string;
  commission?: number;
  sizes?: { name: string; price: number; imageUrl?: string }[];
  flavors?: { name: string; price: number; imageUrl?: string; isPopular?: boolean; originalPrice?: number }[];
  addOns?: { name: string; price: number; imageUrl?: string; originalPrice?: number }[];
}

export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  address: string;
  role: "admin" | "buyer" | "rider" | "customer";
  status?: "locked" | "verified" | "blocked";
  isBlacklisted?: boolean;
  unlockedAt?: any;
  unlockedBy?: string;
  registeredAt?: any;
  ordersCount: number;
  createdAt?: any;
  lastOrder?: any;
  totalOrders?: number;
  savedLocation?: {
    area: string;
    street: string;
    lat: number;
    lng: number;
  };
  vehicleNumber?: string;
  riderCoords?: { latitude: number; longitude: number; lastUpdated?: number };
  isOnline?: boolean; // Duty status: true = Online, false = Offline
  dutyStatus?: "online" | "offline";
  lastDutyChangeAt?: any;
  loyaltyCoins?: number; // User's custom loyalty coin wallet balance
  coinsCollected?: number; // Total customer coins collected by rider
  voucherSubsidyCollected?: number; // Total voucher discount subsidy absorbed by rider
  totalDiscountSubsidyCollected?: number; // Total combined voucher + coin discount subsidy
  settledEarnings?: number; // Total amount paid out to rider by admin
  password?: string; // Stored plaintext passcode or password for easy admin control
  lastSettledAt?: any; // Timestamp when admin cleared/settled the rider's commission and deliveries
  blockReason?: string;
  blockContact?: string;
  needsUnblockAlert?: boolean;
  unblockAlertMessage?: string;
}

export interface RiderWithdrawalRequest {
  id: string;
  riderId: string;
  riderName: string;
  riderPhone: string;
  amount: number;
  paymentMethod: "easypaisa" | "jazzcash" | "bank" | "cash";
  accountTitle?: string;
  accountNumber?: string;
  bankName?: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: any;
  settledAt?: any;
  adminNote?: string;
  processedBy?: string;
  transactionRef?: string;
}

export interface OrderItem {
  dishId: string;
  name: string;
  price: number;
  discountPrice?: number;
  quantity: number;
  type: "food" | "service";
  serviceDuration?: string;
  restaurantName?: string;
  commission?: number;
  selectedSize?: string;
  selectedFlavor?: string;
  selectedAddOns?: { name: string; price: number }[];
  specialInstructions?: string;
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  name?: string;
  userPhone: string;
  phone?: string;
  userAddress: string;
  address?: string;
  items: OrderItem[];
  totalPrice: number;
  deliveryFee: number;
  grandTotal: number;
  status: 
    | "placed" | "pending" | "accepted" | "confirmed" | "preparing" | "out_for_delivery" | "delivered" | "cancelled" // Food statuses
    | "booked" | "diagnostic_on_way" | "diagnostic_underway" | "completed"; // Service statuses
  riderName?: string; // or technician name
  riderId?: string;
  riderPhone?: string;
  restaurantName?: string;
  deliveryCompletedAt?: any; // Timestamp when delivered
  eta?: string; // e.g. "1 Hour", "25 mins"
  serviceTiming?: string;
  createdAt: any; // Firestore Timestamp
  paymentMethod: "COD" | "Pay on Appointment" | "cod";
  orderType: "food" | "service" | "grocery";
  deviceId?: string;
  userCoords?: { latitude: number; longitude: number };
  location?: {
    area: string;
    street: string;
    lat?: number;
    lng?: number;
    googleMapsLink?: string;
  };
  riderCoords?: { latitude: number; longitude: number; lastUpdated?: number };
  totalCommission?: number;
  voucher?: {
    code: string;
    discountAmount: number;
  };
  rating?: number;
  ratingComment?: string;
  ratedAt?: any;
  orderNumber?: string; // Human-friendly distinct Order ID e.g. DF-849201
  cancelledReason?: string;
  cancelledBy?: string;
  cancelledAt?: any;
  cancelledNotes?: string;
  coinsUsed?: number; // How many coins were redeemed/deducted for this order
  coinsEarned?: number; // How many coins were rewarded for this order
  coinsCreditedToRider?: boolean; // Whether redeemed coins have been credited to rider wallet
  discountCreditedToRider?: boolean; // Whether discount reimbursement has been credited to rider
  discountSubsidyAmount?: number; // Total discount subsidy (Voucher + Coins)
  riderSettled?: boolean;
  riderSettledAt?: any;
}

export interface SystemSettings {
  deliveryFee: number;
  minOrderAmount?: number;
  riderRangeKm?: number;
  userRangeKm?: number;
  baseLocationCoords?: { lat: number; lng: number };
  bannerVersion?: number;
  heroBgUrl?: string;
  partnerShopsBgUrl?: string;
  isMaintenanceMode?: boolean;
  maintenanceMessage?: string;
  liveTrackingEnabled?: boolean;
  restaurantStatus?: {
    isTemporarilyUnavailable: boolean; // manual toggle
    openingTime: string; // e.g. "09:00"
    closingTime: string; // e.g. "23:00"
  };
  restaurantStatuses?: Record<string, {
    isTemporarilyUnavailable: boolean;
    openingTime: string;
    closingTime: string;
    imageUrl?: string;
    bgImageUrl?: string;
    phone?: string;
    minOrder?: string;
    deliveryCharge?: string;
    coords?: { lat: number; lng: number };
    lastSettledAt?: any;
    commissionEnabled?: boolean;
    commissionType?: "percentage" | "fixed";
    commissionValue?: number;
  }>;
  // Loyalty Wallet Settings controlled by admin
  loyaltyEnabled?: boolean;
  loyaltyMinOrderForEarn?: number;
  loyaltyEarnCoins?: number; // coin earn value (e.g. 15 flat or 5 percent)
  loyaltyEarnType?: "fixed" | "percentage";
  loyaltyMaxSpendCoins?: number; // max coins spendable per order
  loyaltyAllowOnFood?: boolean;
  loyaltyAllowOnGrocery?: boolean;
  // Global image announcement or popup offer triggered by admin
  announcement?: {
    id: string;
    imageUrl: string;
    title?: string;
    description?: string;
    active: boolean;
  };
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  createdAt: any;
  read: boolean;
}

export interface FoodCategory {
  id: string;
  name: string;
  subtitle?: string;
  imageUrl?: string;
  bgImageUrl?: string;
  emoji?: string;
  color?: string;
  position?: number;
  isAvailable: boolean;
}

export interface GroceryCategory {
  id: string;
  name: string;
  imageUrl?: string;
  isAvailable: boolean;
  position?: number;
}

export interface GroceryProduct {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  price: number;
  discountPrice?: number;
  unit: "kg" | "litre" | "piece" | "pack";
  stock: number; // custom number or boolean representation
  categoryId: string;
  isAvailable: boolean;
  commission?: number;
}

export interface GroceryOrderItem {
  productId: string;
  name: string;
  price: number;
  discountPrice?: number;
  quantity: number;
  unit: string;
  imageUrl: string;
  commission?: number;
}

export interface GroceryOrder {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  userAddress: string;
  items: GroceryOrderItem[];
  totalPrice: number;
  deliveryFee: number;
  grandTotal: number;
  status: "placed" | "accepted" | "out_for_delivery" | "delivered" | "cancelled";
  createdAt: any;
  paymentMethod: "COD";
  orderType: "grocery";
  deviceId?: string;
  riderId?: string;
  riderName?: string;
  riderPhone?: string;
  userCoords?: { latitude: number; longitude: number };
  location?: {
    area: string;
    street: string;
    lat?: number;
    lng?: number;
    googleMapsLink?: string;
  };
  totalCommission?: number;
  eta?: string;
  voucher?: {
    code: string;
    discountAmount: number;
  };
  coinsUsed?: number;
  coinsEarned?: number;
  coinsCreditedToRider?: boolean;
  discountCreditedToRider?: boolean;
  discountSubsidyAmount?: number;
  riderSettled?: boolean;
  riderSettledAt?: any;
}

export interface GroceryDeliveryConfig {
  baseDeliveryFee: number;
  freeDeliveryAboveAmount: number;
  allowMixedCart: boolean;
}

export interface Device {
  id: string;
  banned: boolean;
  lastActive: any;
  lastUserName?: string;
  lastUserPhone?: string;
}

export interface Banner {
  id: string;
  imageUrl: string;
  restaurantName: string;
  detail?: string;
  isActive: boolean;
  position?: number;
  createdAt?: any;
}

export interface Voucher {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  applicableType?: "all" | "food_only" | "grocery_only" | "restaurant";
  applicableRestaurant?: string;
  expiryDate?: string; // ISO format e.g. "2026-12-31T23:59" or date string
  maxUses: number; // 0 = unlimited total claims across all users
  currentUses: number; // total redemptions so far
  perUserLimit?: number; // max uses allowed per user (default: 1)
  usedUserIds?: string[]; // uids of users who have redeemed this voucher
  userUsageCount?: { [uid: string]: number }; // count of redemptions by each uid
  assignedUserIds?: string[];
  assignedUserNames?: { [uid: string]: string };
  successMessage?: string;
  isActive: boolean;
  createdAt?: any;
}

/**
 * Checks if a voucher has expired based on its expiryDate field.
 */
export function isVoucherExpired(voucher?: Voucher | null): boolean {
  if (!voucher || !voucher.expiryDate) return false;
  try {
    const expTime = new Date(voucher.expiryDate).getTime();
    if (isNaN(expTime)) return false;
    return Date.now() > expTime;
  } catch {
    return false;
  }
}

/**
 * Checks whether a specific user is eligible to use this voucher based on:
 * - Active state
 * - Expiry date
 * - Total system limit (maxUses)
 * - Assigned user restrictions
 * - Per-user redemption limit (perUserLimit, default 1)
 */
export function canUserUseVoucher(
  voucher?: Voucher | null,
  userId?: string | null
): { allowed: boolean; reason?: string } {
  if (!voucher) return { allowed: false, reason: "Voucher not found." };
  if (!voucher.isActive) return { allowed: false, reason: "Yeh voucher is waqt active nahi hai." };
  if (isVoucherExpired(voucher)) return { allowed: false, reason: "Yeh voucher expire ho chuka hai." };

  // Total system claims cap
  if (voucher.maxUses && voucher.maxUses > 0 && (voucher.currentUses || 0) >= voucher.maxUses) {
    return { allowed: false, reason: `Is voucher ki total limit (${voucher.maxUses} users) khatam ho chuki hai.` };
  }

  // Assigned user restriction
  if (voucher.assignedUserIds && voucher.assignedUserIds.length > 0) {
    if (!userId || !voucher.assignedUserIds.includes(userId)) {
      return { allowed: false, reason: "Yeh exclusive voucher aapke account ke liye assign nahi kiya gaya." };
    }
  }

  // Per-user usage limit (default 1 use per user)
  const limitPerUser = voucher.perUserLimit !== undefined && voucher.perUserLimit > 0 ? voucher.perUserLimit : 1;
  if (userId) {
    const userUsedCount = voucher.userUsageCount?.[userId] ?? (voucher.usedUserIds?.includes(userId) ? 1 : 0);
    if (userUsedCount >= limitPerUser) {
      return {
        allowed: false,
        reason: `Aap yeh voucher pehle hi ${limitPerUser === 1 ? "ek bar" : `${limitPerUser} bar`} use kar chuke hain.`
      };
    }
  }

  return { allowed: true };
}

/**
 * Checks if a voucher is exhausted for a user (should be hidden or marked used)
 */
export function isVoucherExhaustedForUser(
  voucher: Voucher,
  userId?: string | null
): boolean {
  if (!voucher.isActive || isVoucherExpired(voucher)) return true;
  if (voucher.maxUses && voucher.maxUses > 0 && (voucher.currentUses || 0) >= voucher.maxUses) return true;
  if (userId) {
    const limitPerUser = voucher.perUserLimit !== undefined && voucher.perUserLimit > 0 ? voucher.perUserLimit : 1;
    const userUsedCount = voucher.userUsageCount?.[userId] ?? (voucher.usedUserIds?.includes(userId) ? 1 : 0);
    if (userUsedCount >= limitPerUser) return true;
  }
  return false;
}

/**
 * Calculates the exact rupee discount given a voucher and order subtotal.
 */
export function calculateVoucherDiscount(voucher: Voucher, subtotal: number): number {
  if (!voucher || subtotal <= 0) return 0;
  if (voucher.minOrderAmount && subtotal < voucher.minOrderAmount) return 0;
  
  if (voucher.discountType === "percentage") {
    let discount = (subtotal * voucher.discountValue) / 100;
    if (voucher.maxDiscountAmount && voucher.maxDiscountAmount > 0) {
      discount = Math.min(discount, voucher.maxDiscountAmount);
    }
    return Math.round(discount);
  } else {
    return Math.min(subtotal, Math.round(voucher.discountValue));
  }
}

/**
 * Standardized utility to fetch a user's loyalty coin balance.
 * Backward-compatible: falls back to ordersCount * earnCoins if loyaltyCoins is undefined.
 */
export function getUserCoins(user: UserProfile | null, settings?: SystemSettings): number {
  if (!user) return 0;
  if (user.loyaltyCoins !== undefined) return user.loyaltyCoins;
  const earnRate = settings?.loyaltyEarnCoins ?? 15;
  return (user.ordersCount || 0) * earnRate;
}
