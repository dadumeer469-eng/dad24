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
}

export interface SystemSettings {
  deliveryFee: number;
  minOrderAmount?: number;
  riderRangeKm?: number;
  userRangeKm?: number;
  baseLocationCoords?: { lat: number; lng: number };
  bannerVersion?: number;
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
  }>;
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
