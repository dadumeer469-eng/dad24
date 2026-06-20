export interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "Burgers" | "Pizzas" | "Chicken & Rice" | "Only Tea" | "Home Services" | "Specials";
  imageUrl: string;
  isAvailable: boolean; // ON/OFF toggle switch from admin
  type: "food" | "service";
  serviceDuration?: string;
  restaurantName?: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  address: string;
  role: "admin" | "buyer" | "rider" | "customer";
  ordersCount: number;
  vehicleNumber?: string;
}

export interface OrderItem {
  dishId: string;
  name: string;
  price: number;
  quantity: number;
  type: "food" | "service";
  serviceDuration?: string;
  restaurantName?: string;
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  userAddress: string;
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
  paymentMethod: "COD" | "Pay on Appointment";
  orderType: "food" | "service";
}

export interface SystemSettings {
  deliveryFee: number;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  createdAt: any;
  read: boolean;
}
