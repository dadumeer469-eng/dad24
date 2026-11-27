// On-device user data store for Munchi (user 28 Nov 03:27).
//
// The user's whole profile — name, phone, location, favourites, order
// history, active order — is saved ON THE USER'S OWN PHONE (localStorage)
// so Munchi reads it from the device instead of asking the server again
// and again. This is faster, works even on a slow connection, and saves
// Firestore reads (the daily quota is a real problem).
//
// How it stays fresh: the app writes to this store whenever it already
// has fresh data from Firestore (VoiceOrderModal writes its props on open;
// App.tsx writes when orders load). Munchi READS from here only.
// Nothing here ever sends data anywhere — it is purely local.
import type { LocalOrder } from "./voiceAgentLocal";

const PROFILE_KEY = "dadu_user_profile";
const ORDERS_KEY = "dadu_user_orders";
const LOCATION_KEY = "dadu_user_location";

export interface LocalUserProfile {
  name?: string;
  phone?: string;
  totalOrders: number;
  totalSpent: number;
  favourites: string[];
  lastOrderText?: string;
  lastOrderMinsAgo?: number;
  isNew: boolean;
  updatedAt: number;
}

export interface LocalUserLocation {
  area: string;
  street: string;
  updatedAt: number;
}

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full / private mode — ignore, Munchi falls back to props.
  }
}

// ---- Writers (called when the app already has fresh server data) ----

export function saveUserProfile(profile: Omit<LocalUserProfile, "updatedAt">) {
  writeJSON(PROFILE_KEY, { ...profile, updatedAt: Date.now() });
}

export function saveUserLocation(location: { area: string; street: string }) {
  writeJSON(LOCATION_KEY, { ...location, updatedAt: Date.now() });
}

// Keep only the 10 most recent orders on the device.
export function saveUserOrders(orders: LocalOrder[]) {
  const sorted = [...orders].sort((a, b) => b.placedAtMs - a.placedAtMs).slice(0, 10);
  writeJSON(ORDERS_KEY, sorted);
}

// ---- Readers (Munchi reads ONLY from here) ----

export function getUserProfile(): LocalUserProfile | null {
  return readJSON<LocalUserProfile>(PROFILE_KEY);
}

export function getUserLocation(): LocalUserLocation | null {
  return readJSON<LocalUserLocation>(LOCATION_KEY);
}

export function getUserOrders(): LocalOrder[] {
  return readJSON<LocalOrder[]>(ORDERS_KEY) || [];
}

// The user's CURRENT active order (not delivered / cancelled / completed).
// This is what Munchi uses when the user asks "mera order abhi aya nahi".
export function getActiveOrder(): LocalOrder | null {
  const orders = getUserOrders();
  const active = orders.find(
    (o) => !["delivered", "cancelled", "completed"].includes((o.status || "").toLowerCase()),
  );
  return active || null;
}

// ---- Munchi context (built entirely from on-device data) ----

const STATUS_URDU: Record<string, string> = {
  payment_verification_pending: "Easypaisa receipt ki tasdeeq ho rahi hai (admin check kar raha hai)",
  placed: "order mil gaya hai, admin approval ka intezar hai",
  pending: "order mil gaya hai, admin approval ka intezar hai",
  confirmed: "admin ne approve kar diya hai, restaurant tayyar kar raha hai",
  preparing: "khana tayyar ho raha hai",
  out_for_delivery: "rider nikal gaya hai, raste mein hai",
  delivered: "deliver ho gaya hai",
  cancelled: "cancel ho gaya hai",
  booked: "booking ho gayi hai",
  completed: "mukammal ho gaya hai",
};

export function buildActiveOrderText(): string {
  const order = getActiveOrder();
  if (!order) return "";
  const items = order.items.map((i) => `${i.qty} ${i.name}`).join(", ");
  const mins = Math.max(0, Math.floor((Date.now() - order.placedAtMs) / 60000));
  const statusUrdu = STATUS_URDU[(order.status || "").toLowerCase()] || "order par kaam ho raha hai";
  const expected = order.speed === "priority" ? "15 se 25 minute" : "20 se 35 minute";
  let text =
    `ACTIVE ORDER (the customer's current order — use this FIRST when they ask ` +
    `about their order, "kahan hai", "kab aayega", "abhi aya nahi"): ` +
    `Order ${order.id}: ${items} — Rs ${order.total} — status: ${order.status} ` +
    `(${statusUrdu}) — placed ${mins} minute pehle — payment ${order.payment} — ` +
    `normal delivery time ${expected}.`;
  if (mins > 40) {
    text += ` NOTE: this order is LATE (over 40 minutes) — apologize sincerely and reassure the customer.`;
  }
  return text;
}

export function buildLocalProfileText(): string {
  const p = getUserProfile();
  if (!p) return "";
  if (p.isNew) {
    return "NEW CUSTOMER (from on-device data) — this is their first time ordering. No previous orders. Their first order gets FREE delivery. Welcome them warmly as a new customer and mention the free first delivery.";
  }
  return (
    `RETURNING CUSTOMER (from on-device data) — ${p.totalOrders} previous orders, ` +
    `total spent Rs ${p.totalSpent}. Favourite items: ${p.favourites.join(", ") || "none yet"}. ` +
    `${p.lastOrderText ? `Last order ${p.lastOrderMinsAgo ?? 0} min ago: ${p.lastOrderText}. ` : ""}` +
    `Greet them warmly as a returning customer, and feel free to suggest their favourites.`
  );
}

export function buildLocalOrdersText(): string {
  const orders = getUserOrders();
  if (orders.length === 0) return "";
  return orders
    .map((o) => {
      const items = o.items.map((i) => `${i.qty} ${i.name}`).join(", ");
      const mins = Math.max(0, Math.floor((Date.now() - o.placedAtMs) / 60000));
      return `Order ${o.id}: ${items} — Rs ${o.total} — status ${o.status} — placed ${mins} min ago — payment ${o.payment} — ${o.speed}`;
    })
    .join("\n");
}
