export interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  category: "Burgers" | "Pizzas" | "Chicken & Rice" | "Only Tea" | "Home Services" | "Specials" | "Drinks";
  imageUrl: string;
  isAvailable: boolean; // ON/OFF toggle switch from admin
  type: "food" | "service";
  serviceDuration?: string;
  restaurantName?: string;
  commission?: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  address: string;
  role: "admin" | "buyer" | "rider" | "customer";
  ordersCount: number;
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
  userCoords?: { latitude: number; longitude: number };
  riderCoords?: { latitude: number; longitude: number; lastUpdated?: number };
  totalCommission?: number;
}

export interface SystemSettings {
  deliveryFee: number;
  restaurantStatus?: {
    isTemporarilyUnavailable: boolean; // manual toggle
    openingTime: string; // e.g. "09:00"
    closingTime: string; // e.g. "23:00"
  };
  restaurantStatuses?: Record<string, {
    isTemporarilyUnavailable: boolean;
    openingTime: string;
    closingTime: string;
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
  riderId?: string;
  riderName?: string;
  riderPhone?: string;
  userCoords?: { latitude: number; longitude: number };
  totalCommission?: number;
}

export interface GroceryDeliveryConfig {
  baseDeliveryFee: number;
  freeDeliveryAboveAmount: number;
  allowMixedCart: boolean;
}
