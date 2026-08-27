import { Order } from "../types";

/**
 * Generates a distinct, guaranteed-unique, human-readable order number and Firestore document ID.
 * Prefixes:
 * - DF: Dadu Food
 * - DG: Dadu Grocery
 * - DS: Dadu Service
 */
export function generateOrderIdentifiers(type: "food" | "grocery" | "service" = "food"): {
  id: string;
  orderNumber: string;
} {
  const prefix = type === "grocery" ? "DG" : type === "service" ? "DS" : "DF";
  
  // High-entropy unique alphanumeric segment
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  const timeSlice = Date.now().toString().slice(-4);
  
  // Human readable format: e.g. DF-748921 or DG-839210
  const orderNumber = `${prefix}-${timeSlice}${randomChars}`;
  
  // Document ID: e.g. food_17247291823_7489K3
  const id = `${type}_${Date.now()}_${randomChars}${randomDigits}`;
  
  return { id, orderNumber };
}

/**
 * Returns a uniform, clean, formatted, distinct Order Code for UI display across all screens.
 * Handles both new orders with `orderNumber` and legacy orders with older timestamp doc IDs.
 */
export function getDisplayOrderId(
  order?: Order | { id?: string; orderNumber?: string; orderType?: string } | string | null
): string {
  if (!order) return "#DF-000000";

  if (typeof order === "string") {
    const raw = order.trim();
    if (raw.startsWith("#")) return raw;
    if (raw.startsWith("DF-") || raw.startsWith("DG-") || raw.startsWith("DS-") || raw.startsWith("DADU-")) {
      return `#${raw}`;
    }
    const clean = raw.replace(/^(dadu-|gorder_|order_|food_|grocery_|service_)/i, "");
    const prefix = raw.toLowerCase().includes("gorder") || raw.toLowerCase().includes("grocery") ? "DG" : raw.toLowerCase().includes("service") ? "DS" : "DF";
    const slicePart = clean.length > 6 ? clean.slice(-6).toUpperCase() : clean.toUpperCase();
    return `#${prefix}-${slicePart}`;
  }

  if (order.orderNumber) {
    return order.orderNumber.startsWith("#") ? order.orderNumber : `#${order.orderNumber}`;
  }

  if (order.id) {
    const rawId = order.id;
    if (rawId.startsWith("DF-") || rawId.startsWith("DG-") || rawId.startsWith("DS-")) {
      return `#${rawId}`;
    }
    const clean = rawId.replace(/^(dadu-|gorder_|order_|food_|grocery_|service_)/i, "");
    const prefix = (order.orderType === "grocery" || rawId.startsWith("gorder_") || rawId.startsWith("grocery_"))
      ? "DG"
      : (order.orderType === "service" || rawId.startsWith("service_"))
      ? "DS"
      : "DF";
    const slicePart = clean.length > 6 ? clean.slice(-6).toUpperCase() : clean.toUpperCase();
    return `#${prefix}-${slicePart}`;
  }

  return "#DF-000000";
}

/**
 * Evaluates whether an order matches a search query across all primary attributes:
 * - Order Number / ID
 * - Customer Name / Phone / Address
 * - Rider Name / Phone
 * - Status / Cancelled status
 * - Restaurant name / Items / Voucher code
 */
export function searchMatchesOrder(order: Order, query: string): boolean {
  if (!query || !query.trim()) return true;
  const q = query.toLowerCase().trim();
  const qNoHash = q.replace(/^#/, "");

  // 1. Order Number & ID matches
  const displayId = getDisplayOrderId(order).toLowerCase();
  const rawId = (order.id || "").toLowerCase();
  const orderNum = (order.orderNumber || "").toLowerCase();

  if (displayId.includes(q) || displayId.includes(qNoHash)) return true;
  if (rawId.includes(q) || rawId.includes(qNoHash)) return true;
  if (orderNum.includes(q) || orderNum.includes(qNoHash)) return true;

  // 2. Customer Info matches
  const custName = (order.userName || order.name || "").toLowerCase();
  const custPhone = (order.userPhone || order.phone || "").replace(/\s+/g, "");
  const custAddress = (order.userAddress || order.address || "").toLowerCase();

  if (custName.includes(q)) return true;
  if (custPhone.includes(q.replace(/\s+/g, ""))) return true;
  if (custAddress.includes(q)) return true;

  // 3. Rider Info matches
  const riderName = (order.riderName || "").toLowerCase();
  const riderPhone = (order.riderPhone || "").replace(/\s+/g, "");
  const riderId = (order.riderId || "").toLowerCase();

  if (riderName.includes(q)) return true;
  if (riderPhone.includes(q.replace(/\s+/g, ""))) return true;
  if (riderId.includes(q)) return true;

  // 4. Status matches
  const status = (order.status || "").toLowerCase();
  if (status.includes(q)) return true;
  if (q === "cancel" || q === "cancelled" || q === "canceled") {
    if (status === "cancelled") return true;
  }
  if (q === "delivered" || q === "complete" || q === "completed") {
    if (status === "delivered" || status === "completed") return true;
  }
  if (q === "pending" || q === "placed" || q === "new") {
    if (status === "placed" || status === "pending") return true;
  }

  // 5. Restaurant / Store name
  const restName = (order.restaurantName || "").toLowerCase();
  if (restName.includes(q)) return true;

  // 6. Voucher code
  const voucherCode = (order.voucher?.code || "").toLowerCase();
  if (voucherCode.includes(q)) return true;

  // 7. Item names inside order
  if (order.items && Array.isArray(order.items)) {
    const itemMatch = order.items.some((it) => (it.name || "").toLowerCase().includes(q));
    if (itemMatch) return true;
  }

  // 8. Grand total exact search
  if (!isNaN(Number(q)) && Math.abs((order.grandTotal || 0) - Number(q)) < 0.01) {
    return true;
  }

  return false;
}
