import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  ShoppingBag, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw, 
  BadgeCheck, 
  Search, 
  MapPin, 
  DollarSign, 
  AlertCircle,
  Clock,
  ExternalLink
} from "lucide-react";
import { Order } from "../types";

interface OrderHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  onReorder: (order: Order) => void;
  onTrackOrder?: (order: Order) => void;
}

export default function OrderHistoryDrawer({
  isOpen,
  onClose,
  orders,
  onReorder,
  onTrackOrder,
}: OrderHistoryDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "food" | "grocery" | "service">("all");
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  const toggleExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  // Filter and search logic
  const filteredOrders = orders.filter((order) => {
    // Search query matches Order ID, Address, or Item Names
    const matchesSearch = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.userAddress || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = 
      filterType === "all" || 
      order.orderType === filterType;

    return matchesSearch && matchesType;
  });

  const getStatusBadge = (status: string) => {
    const defaultStyle = "bg-zinc-100 text-zinc-800 border-zinc-200";
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: "bg-amber-50 text-amber-700 border-amber-200", text: "text-amber-700", label: "Pending Setup" },
      placed: { bg: "bg-blue-50 text-blue-700 border-blue-200", text: "text-blue-700", label: "Received" },
      accepted: { bg: "bg-purple-50 text-purple-700 border-purple-200", text: "text-purple-700", label: "Accepted" },
      confirmed: { bg: "bg-purple-100 text-purple-800 border-purple-300", text: "text-purple-800", label: "Confirmed" },
      preparing: { bg: "bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse", text: "text-indigo-700", label: "Kitchen/Preparing" },
      out_for_delivery: { bg: "bg-pink-50 text-[#D70F64] border-pink-200 animate-pulse", text: "text-[#D70F64]", label: "On the way 🛵" },
      delivered: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", text: "text-emerald-700", label: "Delivered 🎉" },
      cancelled: { bg: "bg-pink-50 text-pink-700 border-pink-200", text: "text-pink-700", label: "Cancelled" },
      // Service statuses
      booked: { bg: "bg-yellow-50 text-yellow-800 border-yellow-300", text: "text-yellow-800", label: "Booked" },
      diagnostic_on_way: { bg: "bg-pink-50 text-pink-700 border-orange-200", text: "text-orange-700", label: "Expert en Route" },
      diagnostic_underway: { bg: "bg-sky-50 text-sky-700 border-sky-200 animate-pulse", text: "text-sky-700", label: "Diagnostic Check" },
      completed: { bg: "bg-teal-50 text-teal-700 border-teal-200", text: "text-teal-700", label: "Completed" },
    };

    const config = statusMap[status] || { bg: defaultStyle, label: status };
    return (
      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${config.bg}`}>
        {config.label}
      </span>
    );
  };

  const getFormattedDate = (timestamp: any) => {
    if (!timestamp) return "Date unavailable";
    let date: Date;
    if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-55 flex justify-end overflow-hidden">
          {/* Solid transparent backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-xs"
            id="order-history-backdrop"
          />

          {/* Drawer container body */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative w-full max-w-md bg-zinc-50 h-full flex flex-col shadow-2xl border-l border-zinc-200 z-10"
            id="order-history-container"
          >
            {/* Header top section */}
            <div className="p-4 bg-white border-b border-zinc-250 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#D70F64]/10 flex items-center justify-center text-[#D70F64]">
                  <RotateCcw className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-base font-black text-zinc-900 tracking-tight leading-none">Order History</h2>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Your previous shipments</span>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 transition flex items-center justify-center cursor-pointer"
                id="close-history-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Top Toolbar: filters, search */}
            <div className="p-3 bg-white border-b border-zinc-150 space-y-2">
              {/* Search Bar input */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Search previous dishes or orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-none focus:border-[#D70F64] transition"
                  id="history-search-input"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-2 text-zinc-400 hover:text-zinc-650 text-xs font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Segmented Filter Pills */}
              <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                {(["all", "food", "grocery", "service"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border cursor-pointer shrink-0 transition ${
                      filterType === type 
                        ? "bg-[#D70F64] text-white border-[#D70F64]" 
                        : "bg-zinc-50 border-zinc-200 text-zinc-650 hover:bg-zinc-100"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable list of orders */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3" id="history-scrollable-list">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const isExpanded = !!expandedOrders[order.id];
                  const isActive = order.status !== "delivered" && order.status !== "completed" && order.status !== "cancelled";
                  
                  return (
                    <div 
                      key={order.id} 
                      className={`bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden transition hover:border-zinc-300 ${
                        isActive ? "ring-1 ring-[#D70F64]/30" : ""
                      }`}
                    >
                      {/* Main card header summary (clickable to toggle zoom) */}
                      <div 
                        onClick={() => toggleExpand(order.id)}
                        className="p-3.5 flex flex-col gap-2 cursor-pointer hover:bg-zinc-50/50 transition select-none"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <span className="text-[9px] font-black text-[#D70F64] bg-[#D70F64]/10 border border-[#D70F64]/15 px-2 py-0.5 rounded uppercase leading-none">
                              {order.orderType === "grocery" ? "Grocery" : order.orderType === "service" ? "Service Visit" : "Dadu Food"}
                            </span>
                            <div className="text-xs font-black text-zinc-800 flex items-center gap-1 mt-1">
                              ID: <span className="font-mono text-zinc-500 uppercase tracking-tight">dadu-{order.id.slice(-6)}</span>
                            </div>
                          </div>
                          
                          {getStatusBadge(order.status)}
                        </div>

                        {/* Order snippet list of item names */}
                        <div className="text-[11.5px] font-bold text-zinc-650 leading-relaxed max-w-[90%] truncate mt-0.5">
                          {order.items.map((it) => `${it.quantity}x ${it.name}`).join(", ")}
                        </div>

                        {/* Info strip */}
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold border-t border-zinc-100 pt-2.5 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {getFormattedDate(order.createdAt)}
                          </span>
                          <span className="text-zinc-800 text-xs font-black">
                            Rs. {order.grandTotal}
                          </span>
                        </div>
                      </div>

                      {/* Expandable details segment */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden bg-zinc-50 border-t border-zinc-150 p-3 flex flex-col gap-3"
                          >
                            {/* Complete items loop */}
                            <div className="space-y-1.5">
                              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block pb-1 border-b border-zinc-200/50">Purchased Items</span>
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex flex-col gap-0.5 text-[11px] font-bold text-zinc-700">
                                  <div className="flex justify-between items-center">
                                    <span className="truncate max-w-[200px]">{item.quantity}x {item.name}</span>
                                    <span className="font-mono text-zinc-600">Rs. {item.price * item.quantity}</span>
                                  </div>
                                  {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                                    <span className="text-[9px] text-zinc-400">Add-ons: {Object.entries(item.selectedAddOns.reduce((acc, curr) => {
                                      acc[curr.name] = (acc[curr.name] || 0) + 1;
                                      return acc;
                                    }, {} as Record<string, number>)).map(([name, count]) => `${count * (item.quantity || 1)}x ${name}`).join(', ')}</span>
                                  )}
                                  {item.specialInstructions && (
                                    <span className="text-[9px] text-zinc-400 italic">Note: {item.specialInstructions}</span>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Logistics details wrap */}
                            <div className="space-y-1 text-[10.5px] text-zinc-500 font-bold bg-white border border-zinc-200 rounded-xl p-2.5">
                              <div className="flex justify-between">
                                <span>Item Total:</span>
                                <span className="text-zinc-805">Rs. {order.totalPrice}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Delivery Fee:</span>
                                <span className="text-zinc-805">Rs. {order.deliveryFee}</span>
                              </div>
                              <div className="flex justify-between border-t border-zinc-100 pt-1.5 text-zinc-800 leading-none">
                                <span className="font-bold">Grand Total:</span>
                                <span className="text-[#D70F64] text-xs font-black">Rs. {order.grandTotal}</span>
                              </div>
                              
                              <div className="mt-2.5 pt-2 border-t border-dashed border-zinc-205 flex flex-col gap-1 text-[9.5px]">
                                <span className="flex items-start gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-zinc-400 mt-0.5 shrink-0" />
                                  <span className="truncate max-w-[250px]">{order.userAddress}</span>
                                </span>
                                {order.riderName && (
                                  <span className="flex items-center gap-1 text-emerald-600 font-extrabold mt-1">
                                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-500" />
                                    Driver: {order.riderName} ({order.riderPhone})
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Prompt and interactions panel */}
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              {/* Keep live track active if possible */}
                              {isActive && onTrackOrder && (
                                <button
                                  onClick={() => {
                                    onTrackOrder(order);
                                    onClose();
                                  }}
                                  className="py-2 px-2.5 rounded-xl border border-pink-200 text-[#D70F64] hover:bg-pink-50 transition font-black text-[10.5px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                                  id={`track-order-${order.id}`}
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  Track Live Map
                                </button>
                              )}
                              
                              <button
                                onClick={() => {
                                  onReorder(order);
                                  onClose();
                                }}
                                className={`py-2 px-2.5 rounded-xl bg-[#D70F64] hover:bg-[#b00c50] text-white transition font-black text-[10.5px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-pink-500/10 ${
                                  isActive ? "" : "col-span-2"
                                }`}
                                id={`reorder-btn-${order.id}`}
                              >
                                <ShoppingBag className="w-3.5 h-3.5" />
                                Reorder Items 🔄
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      
                      {/* Accordion expand line */}
                      <div 
                        onClick={() => toggleExpand(order.id)} 
                        className="bg-zinc-50 border-t border-zinc-100 flex items-center justify-center p-1 cursor-pointer text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400 mb-4 shadow-inner">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <h3 className="text-zinc-800 font-bold text-sm">No historical orders matched</h3>
                  <p className="text-zinc-405 text-xs mt-1.5 max-w-xs leading-relaxed">
                    Once you make standard fast food checkout runs or purchase groceries, your records will populate here!
                  </p>
                </div>
              )}
            </div>
            
            {/* Drawer footer watermark details */}
            <div className="p-3.5 bg-white border-t border-zinc-200 text-center text-[10px] text-zinc-455 font-bold tracking-wider">
              🎁 Fresh shipment dispatch logs • DADUFOOD
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
