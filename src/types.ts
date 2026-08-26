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
  scheduleDays?: string[]; // e.g. ["Monday", "Tuesday", "Sunday"] or ["All"]
  stockCount?: number; // Real inventory stock count
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
  loyaltyCoins?: number; // User's custom loyalty coin wallet balance
  coins?: number; // Synced alias for loyalty coins balance
  password?: string; // Stored plaintext passcode or password for easy admin control
  lastSettledAt?: any; // Timestamp when admin cleared/settled the rider's commission and deliveries
  blockReason?: string;
  blockContact?: string;
  needsUnblockAlert?: boolean;
  unblockAlertMessage?: string;
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
  coinsUsed?: number; // How many coins were redeemed/deducted for this order
  coinsEarned?: number; // How many coins were rewarded for this order
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
    temporaryClosure?: {
      isTemporarilyClosed: boolean;
      reason: string;
      closedAt: any;
      expectedReopenAt?: any;
      closedBy: "ai" | "admin";
      riderIncidentId?: string;
    };
  }>;
  // Configurable COD Limit & Safety rules
  maxCodLimit?: number; // e.g. Rs. 3,000 (configurable from admin/AI)
  autoReopenDurationHours?: number; // Default 2 hours for AI temporary closures
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

export interface IncidentReport {
  id: string;
  riderId: string;
  riderName: string;
  riderPhone: string;
  restaurantId?: string;
  restaurantName?: string;
  orderId?: string;
  orderTotal?: number;
  customerName?: string;
  customerPhone?: string;
  customerId?: string;
  incidentType: 
    | "restaurant_closed" 
    | "customer_unavailable" 
    | "restaurant_delay" 
    | "wrong_address" 
    | "customer_refused" 
    | "item_unavailable" 
    | "payment_issue" 
    | "accident_emergency" 
    | "other";
  riderMessage: string;
  status: "reported" | "under_review" | "resolved" | "dismissed";
  severity: "low" | "medium" | "high" | "critical";
  aiAnalysis?: string;
  aiActionTaken?: string;
  decisionDetails?: {
    action: string;
    reason: string;
    confidence: number;
    autoReopenAt?: any;
  };
  adminNotes?: string;
  createdAt: any;
  resolvedAt?: any;
  resolvedBy?: string;
}

export interface AiAuditLog {
  id: string;
  action: string;
  reason: string;
  source: "rider_report" | "admin_command" | "cron_monitor" | "anomaly_detector" | "manual_admin";
  riderId?: string;
  riderName?: string;
  restaurantName?: string;
  customerPhone?: string;
  orderId?: string;
  previousStatus?: string;
  newStatus?: string;
  aiDecision: string;
  adminOverridden?: boolean;
  timestamp: any;
}

export interface CustomerRiskProfile {
  userId?: string;
  phone: string;
  name: string;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  failedCodOrders: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  trustScore: number; // 0 to 100
  isCodRestricted?: boolean;
  isAccountRestricted?: boolean;
  lastIncidentDate?: any;
  notes?: string;
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
  maxUses: number;
  currentUses: number;
  successMessage?: string;
  isActive: boolean;
  createdAt?: any;
}

/**
 * Standardized utility to fetch a user's loyalty coin balance.
 * Backward-compatible: falls back to ordersCount * earnCoins if loyaltyCoins is undefined.
 */
export function getUserCoins(user: UserProfile | null, settings?: SystemSettings): number {
  if (!user) return 0;
  if (user.loyaltyCoins !== undefined && user.loyaltyCoins !== null) return Number(user.loyaltyCoins);
  if (user.coins !== undefined && user.coins !== null) return Number(user.coins);
  const earnRate = settings?.loyaltyEarnCoins ?? 15;
  return (user.ordersCount || 0) * earnRate;
}
