import React, { useState } from "react";
import { 
  X, 
  Search, 
  Phone, 
  PhoneCall, 
  MessageSquare, 
  MapPin, 
  Navigation, 
  ExternalLink, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Bike, 
  User, 
  ShoppingBag, 
  Receipt, 
  Copy, 
  Check, 
  Ticket, 
  Coins, 
  DollarSign, 
  TrendingUp, 
  Sparkles, 
  AlertCircle,
  Truck,
  RotateCcw
} from "lucide-react";
import { Order, UserProfile } from "../types";
import { getDisplayOrderId } from "../lib/orderUtils";
import { formatOrderDateTime } from "./OrderReceiptModal";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

interface AdminOrderInspectorModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  riders: UserProfile[];
  onPrintReceipt?: (order: Order) => void;
  onStatusChange?: (orderId: string, newStatus: string) => void;
  onAssignRider?: (orderId: string, riderId: string, riderName: string, riderPhone: string) => void;
}

export default function AdminOrderInspectorModal({
  order,
  isOpen,
  onClose,
  riders,
  onPrintReceipt,
  onStatusChange,
  onAssignRider,
}: AdminOrderInspectorModalProps) {
  const [copied, setCopied] = useState(false);
  const [selectedRiderId, setSelectedRiderId] = useState("");
  const [isUpdatingRider, setIsUpdatingRider] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [cancelPromptOpen, setCancelPromptOpen] = useState(false);
  const [cancelReasonInput, setCancelReasonInput] = useState("");

  if (!isOpen || !order) return null;

  const displayId = getDisplayOrderId(order);
  const customerName = order.userName || order.name || "Customer";
  const customerPhone = order.userPhone || order.phone || "";
  const cleanPhone = customerPhone.replace(/\D/g, "");
  const address = order.userAddress || order.address || "Dadu Address";
  const isSvc = order.orderType === "service";
  const isGrocery = order.orderType === "grocery";
  const isDelivered = order.status === "delivered" || order.status === "completed";
  const isCancelled = order.status === "cancelled";
  const isActive = !isDelivered && !isCancelled;

  const voucherDisc = order.voucher?.discountAmount || 0;
  const coinsDisc = order.coinsUsed || 0;
  const totalDiscount = voucherDisc + coinsDisc;
  const itemsSubtotal = order.totalPrice || 0;
  const deliveryFee = order.deliveryFee || 0;
  const grandTotal = order.grandTotal || 0;

  const riderPayout = deliveryFee + totalDiscount;

  const handleCopyId = () => {
    navigator.clipboard.writeText(displayId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAssignRiderClick = async (rId: string) => {
    if (!rId) return;
    const targetRider = riders.find((r) => r.uid === rId);
    if (!targetRider) return;

    try {
      setIsUpdatingRider(true);
      if (onAssignRider) {
        onAssignRider(order.id, targetRider.uid, targetRider.name, targetRider.phone || "");
      } else {
        await updateDoc(doc(db, "orders", order.id), {
          riderId: targetRider.uid,
          riderName: targetRider.name,
          riderPhone: targetRider.phone || "",
          status: order.status === "placed" || order.status === "pending" ? "accepted" : order.status,
        });
      }
      setSelectedRiderId("");
    } catch (err) {
      console.error("Failed to assign rider:", err);
      alert("Could not assign rider. Please try again.");
    } finally {
      setIsUpdatingRider(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setIsUpdatingStatus(true);
      if (onStatusChange) {
        onStatusChange(order.id, newStatus);
      } else {
        const updateData: any = { status: newStatus };
        if (newStatus === "delivered" || newStatus === "completed") {
          updateData.deliveryCompletedAt = { seconds: Math.floor(Date.now() / 1000) };
        }
        await updateDoc(doc(db, "orders", order.id), updateData);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelReasonInput.trim()) {
      alert("Please enter a reason for cancelling this order.");
      return;
    }
    try {
      setIsUpdatingStatus(true);
      await updateDoc(doc(db, "orders", order.id), {
        status: "cancelled",
        cancelledReason: cancelReasonInput.trim(),
        cancelledBy: "Admin",
        cancelledAt: { seconds: Math.floor(Date.now() / 1000) },
      });
      setCancelPromptOpen(false);
      setCancelReasonInput("");
    } catch (err) {
      console.error("Failed to cancel order:", err);
      alert("Failed to cancel order.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* TOP ACCENT LINE */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#D70F64] via-rose-500 to-amber-500" />

        {/* MODAL HEADER */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleCopyId}
              className="inline-flex items-center gap-1.5 bg-[#D70F64]/10 hover:bg-[#D70F64]/20 text-[#D70F64] border border-[#D70F64]/25 px-3 py-1.5 rounded-xl font-mono font-black text-sm transition cursor-pointer"
              title="Click to copy Order ID"
            >
              <span>{displayId}</span>
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
              isGrocery 
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                : isSvc 
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                : "bg-pink-500/15 text-[#D70F64] border border-pink-500/30"
            }`}>
              {isGrocery ? "🛒 Grocery Order" : isSvc ? "🔧 Service Visit" : "🍔 Food Delivery"}
            </span>

            {/* Status Pill */}
            <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 ${
              isDelivered
                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200"
                : isCancelled
                ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200"
                : "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 animate-pulse"
            }`}>
              {isDelivered && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              {isCancelled && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
              {isActive && <Truck className="w-3.5 h-3.5 text-blue-600" />}
              <span>{order.status}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onPrintReceipt && (
              <button
                type="button"
                onClick={() => onPrintReceipt(order)}
                className="px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Receipt className="w-3.5 h-3.5 text-[#D70F64]" />
                <span className="hidden sm:inline">Receipt</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-200">
          
          {/* CANCELLATION NOTICE IF CANCELLED */}
          {isCancelled && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h5 className="text-sm font-black text-rose-700 dark:text-rose-400 uppercase tracking-wide">
                  Order Cancelled
                </h5>
                <p className="text-xs font-bold text-rose-800 dark:text-rose-300">
                  <span className="opacity-80">Reason:</span> {order.cancelledReason || order.cancelledNotes || "Cancelled by User/Admin"}
                </p>
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                  Cancelled by: <span className="font-bold">{order.cancelledBy || "Admin"}</span> • {order.cancelledAt ? formatOrderDateTime(order.cancelledAt) : "Archived"}
                </p>
              </div>
            </div>
          )}

          {/* TWO COLUMN GRID: CUSTOMER INFO & RIDER/LOGISTICS INFO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. CUSTOMER DOSSIER */}
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-2">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#D70F64]" /> Customer Information
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  {formatOrderDateTime(order.createdAt)}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Full Name</span>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{customerName}</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Phone Number</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono font-extrabold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                      {customerPhone || "No Phone"}
                    </span>
                    {customerPhone && (
                      <>
                        <a
                          href={`tel:${customerPhone}`}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs transition"
                          title="Call Customer"
                        >
                          <PhoneCall className="w-3 h-3" /> Call
                        </a>
                        <a
                          href={`https://wa.me/${cleanPhone}?text=Assalam-o-Alaikum ${encodeURIComponent(customerName)}, your Dadu Food order ${displayId} is being processed.`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs transition"
                          title="WhatsApp Customer"
                        >
                          <MessageSquare className="w-3 h-3" /> WhatsApp
                        </a>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Delivery Address</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 leading-relaxed">
                    📍 {address}
                  </p>
                </div>

                {order.location?.googleMapsLink && (
                  <a
                    href={order.location.googleMapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#D70F64] hover:underline font-bold"
                  >
                    <Navigation className="w-3.5 h-3.5" /> View on Google Maps <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* 2. RIDER & LOGISTICS DOSSIER */}
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-2">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <Bike className="w-3.5 h-3.5 text-blue-600" /> Dispatch & Rider Logistics
                </span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                  order.riderId 
                    ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                }`}>
                  {order.riderId ? "Assigned" : "Unassigned"}
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                {order.riderName ? (
                  <>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Rider</span>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{order.riderName}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Rider Contact</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono font-extrabold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                          {order.riderPhone || "No Phone"}
                        </span>
                        {order.riderPhone && (
                          <>
                            <a
                              href={`tel:${order.riderPhone}`}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs transition"
                            >
                              <PhoneCall className="w-3 h-3" /> Call
                            </a>
                            <a
                              href={`https://wa.me/${order.riderPhone.replace(/\D/g, '')}?text=Regarding Order ${displayId} for ${customerName}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs transition"
                            >
                              <MessageSquare className="w-3 h-3" /> WhatsApp
                            </a>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Rider financial compensation breakdown */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-2.5 space-y-1 text-[11px]">
                      <div className="flex justify-between font-bold text-blue-900 dark:text-blue-300">
                        <span>Rider Delivery Fee:</span>
                        <span>Rs. {deliveryFee}</span>
                      </div>
                      {totalDiscount > 0 && (
                        <div className="flex justify-between font-bold text-amber-700 dark:text-amber-400">
                          <span>Platform Subsidy Due:</span>
                          <span>+Rs. {totalDiscount}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-black text-xs text-blue-700 dark:text-blue-300 border-t border-blue-500/20 pt-1 mt-1">
                        <span>Total Net Payout:</span>
                        <span>Rs. {riderPayout}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-800 dark:text-amber-300 text-xs font-bold">
                    ⚠️ No rider is assigned yet for this order. Select an active rider below to dispatch immediately.
                  </div>
                )}

                {/* Quick Rider Assignment Box */}
                {!isDelivered && !isCancelled && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">
                      {order.riderId ? "Change / Reassign Rider:" : "Assign Rider Now:"}
                    </span>
                    <div className="flex gap-2">
                      <select
                        value={selectedRiderId}
                        onChange={(e) => setSelectedRiderId(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[#D70F64]"
                      >
                        <option value="">-- Choose Active Rider --</option>
                        {riders.map((r) => (
                          <option key={r.uid} value={r.uid}>
                            {r.name} ({r.phone || "No Phone"}) {(r as any).isOnline ? "🟢 Online" : "⚪ Active"}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleAssignRiderClick(selectedRiderId)}
                        disabled={!selectedRiderId || isUpdatingRider}
                        className="px-3 py-1.5 bg-[#D70F64] hover:bg-[#b00c50] disabled:opacity-50 text-white rounded-xl font-black text-xs transition cursor-pointer shrink-0"
                      >
                        {isUpdatingRider ? "Saving..." : "Assign"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. ORDER CART ITEMS TABLE */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-2">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-[#D70F64]" /> Order Cart Items ({order.items?.length || 0})
              </span>
              <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                Subtotal: Rs. {itemsSubtotal}
              </span>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {order.items && order.items.map((item, idx) => {
                const lineTotal = Number(item.price || 0) * Number(item.quantity || 1);
                return (
                  <div key={idx} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span className="bg-[#D70F64]/10 text-[#D70F64] px-2 py-0.5 rounded-md font-mono font-black text-[11px]">
                          {item.quantity}x
                        </span>
                        <span>{item.name}</span>
                        {item.restaurantName && (
                          <span className="text-[10px] font-bold text-slate-400">
                            ({item.restaurantName})
                          </span>
                        )}
                      </div>

                      {/* Add-ons & flavors */}
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 ml-7 mt-0.5 space-y-0.5 font-medium">
                        {item.selectedSize && <div>Size: {item.selectedSize}</div>}
                        {item.selectedFlavor && <div>Flavor: {item.selectedFlavor}</div>}
                        {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                          <div>Add-ons: {item.selectedAddOns.map(a => `${a.name} (+Rs.${a.price})`).join(", ")}</div>
                        )}
                        {item.specialInstructions && (
                          <div className="text-[#D70F64] font-semibold italic">Note: "{item.specialInstructions}"</div>
                        )}
                      </div>
                    </div>

                    <div className="text-right sm:text-right ml-7 sm:ml-0 font-mono">
                      <span className="text-slate-400 text-[10px] block">Rs. {item.price} each</span>
                      <span className="font-black text-slate-900 dark:text-slate-100 text-sm">Rs. {lineTotal}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. FINANCIAL BREAKDOWN & PAYMENT DETAILS */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block border-b border-slate-200 dark:border-slate-700/60 pb-2">
              💳 Payment & Financial Breakdown
            </span>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between font-bold text-slate-600 dark:text-slate-300">
                <span>Items Subtotal:</span>
                <span className="font-mono">Rs. {itemsSubtotal}</span>
              </div>

              <div className="flex justify-between font-bold text-slate-600 dark:text-slate-300">
                <span>Delivery Fee:</span>
                <span className="font-mono">Rs. {deliveryFee}</span>
              </div>

              {voucherDisc > 0 && (
                <div className="flex justify-between font-black text-rose-600 dark:text-rose-400">
                  <span className="flex items-center gap-1">
                    <Ticket className="w-3.5 h-3.5" /> Voucher Discount ({order.voucher?.code}):
                  </span>
                  <span className="font-mono">-Rs. {voucherDisc}</span>
                </div>
              )}

              {coinsDisc > 0 && (
                <div className="flex justify-between font-black text-amber-600 dark:text-amber-400">
                  <span className="flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5" /> Coins Redeemed ({coinsDisc} coins):
                  </span>
                  <span className="font-mono">-Rs. {coinsDisc}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-base font-black text-slate-900 dark:text-slate-100 border-t-2 border-dashed border-slate-300 dark:border-slate-700 pt-3">
                <div>
                  <span className="text-sm block">GRAND TOTAL (CASH TO COLLECT):</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    Payment Method: {order.paymentMethod === "COD" || order.paymentMethod === "cod" ? "Cash On Delivery" : order.paymentMethod}
                  </span>
                </div>
                <span className="text-2xl text-[#D70F64] font-black font-mono">
                  Rs. {grandTotal}
                </span>
              </div>
            </div>
          </div>

          {/* 5. CANCELLATION PROMPT FORM */}
          {cancelPromptOpen && (
            <div className="bg-rose-500/10 border-2 border-rose-500/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-xs uppercase text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Cancel this Order
                </span>
                <button
                  type="button"
                  onClick={() => setCancelPromptOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  Dismiss
                </button>
              </div>
              <p className="text-xs text-rose-800 dark:text-rose-200 font-medium">
                Please provide the cancellation reason (e.g., "Customer called to cancel", "Out of stock", "Rider unreachable"):
              </p>
              <textarea
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                placeholder="Enter cancellation reason..."
                rows={2}
                className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCancelPromptOpen(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 rounded-xl"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={isUpdatingStatus}
                  className="px-4 py-1.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition cursor-pointer"
                >
                  {isUpdatingStatus ? "Cancelling..." : "Confirm Cancellation ❌"}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER: ACTION TOOLBAR */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-850 flex flex-wrap items-center justify-between gap-3">
          
          {/* Status quick toggles */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase text-slate-500 mr-1">
              Change Status:
            </span>
            <button
              type="button"
              onClick={() => handleStatusUpdate("accepted")}
              disabled={order.status === "accepted" || isUpdatingStatus}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                order.status === "accepted"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-blue-50"
              }`}
            >
              Accepted
            </button>
            <button
              type="button"
              onClick={() => handleStatusUpdate("preparing")}
              disabled={order.status === "preparing" || isUpdatingStatus}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                order.status === "preparing"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-amber-50"
              }`}
            >
              Preparing
            </button>
            <button
              type="button"
              onClick={() => handleStatusUpdate("out_for_delivery")}
              disabled={order.status === "out_for_delivery" || isUpdatingStatus}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                order.status === "out_for_delivery"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-purple-50"
              }`}
            >
              On The Way
            </button>
            <button
              type="button"
              onClick={() => handleStatusUpdate("delivered")}
              disabled={order.status === "delivered" || isUpdatingStatus}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                order.status === "delivered"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-emerald-50"
              }`}
            >
              Mark Delivered ✅
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {!isCancelled && !isDelivered && (
              <button
                type="button"
                onClick={() => setCancelPromptOpen(true)}
                className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/30 rounded-xl text-xs font-black transition cursor-pointer"
              >
                Cancel Order ❌
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-sm"
            >
              Done / Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
