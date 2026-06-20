import React from "react";
import { Order } from "../types";
import { Check, ClipboardList, Clock, ShieldCheck, Heart, ArrowRight, Server, Wrench, User, CalendarDays } from "lucide-react";

interface OrderTrackerProps {
  order: Order;
  onClose?: () => void;
}

export default function OrderTracker({ order, onClose }: OrderTrackerProps) {
  const isService = order.orderType === "service";

  // Food progress configurations
  const foodSteps = [
    { label: "Placed", desc: "Order submitted to database", key: "placed" },
    { label: "Accepted", desc: "Dadu kitchen accepted order", key: "confirmed" },
    { label: "Preparing", desc: "Fresh food cooking in progress", key: "preparing" },
    { label: "Out For Delivery", desc: "Rider dispatched with food", key: "out_for_delivery" },
    { label: "Enjoy Food!", desc: "Delivered to your address", key: "delivered" },
  ];

  // Service progress configurations (No kitchen references, no cooking times!)
  const serviceSteps = [
    { label: "Booked", desc: "Service appointment recorded", key: "booked" },
    { label: "Accepted", desc: "Technician schedule confirmed", key: "confirmed" },
    { label: "Technician Out", desc: "Professional dispatched to home", key: "diagnostic_on_way" },
    { label: "Diagnostics", desc: "Inspections and repair underway", key: "diagnostic_underway" },
    { label: "Job Completed", desc: "Service finalized on-site", key: "completed" },
  ];

  const steps = isService ? serviceSteps : foodSteps;

  // Determine current active index based on order status
  const getActiveIndex = () => {
    const status = order.status;
    if (isService) {
      if (status === "booked") return 0;
      if (status === "confirmed") return 1;
      if (status === "diagnostic_on_way") return 2;
      if (status === "diagnostic_underway") return 3;
      if (status === "completed") return 4;
      return 0;
    } else {
      if (status === "placed" || status === "pending") return 0;
      if (status === "accepted" || status === "confirmed") return 1;
      if (status === "preparing") return 2;
      if (status === "out_for_delivery") return 3;
      if (status === "delivered") return 4;
      if (status === "cancelled") return -1;
      return 0;
    }
  };

  const activeIndex = getActiveIndex();
  const isCancelled = order.status === "cancelled";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3.5xl p-5 sm:p-6 shadow-xs relative overflow-hidden text-zinc-100">
      
      {/* Background Decorative Neon Light */}
      <div className={`absolute top-0 right-0 w-44 h-44 rounded-full blur-3xl pointer-events-none -mt-10 -mr-10 ${
        isService ? "bg-amber-500/5" : "bg-[#FF5C00]/5"
      }`}></div>

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#FF5C00] block">
            {isService ? "🛠️ Active Service Live Track" : "☕ Live Tea & Food Tracker"}
          </span>
          <h3 className="font-extrabold text-sm text-zinc-100 mt-0.5">
            Booking ID: <span className="font-mono text-xs text-zinc-400">dadu-{order.id.substring(0, 8)}</span>
          </h3>
          <p className="text-[11px] text-zinc-400 mt-1 font-semibold">
            Date Placed: {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString() : "Just Now"}
          </p>
        </div>

        {/* ETA Widget */}
        <div className={`py-2 px-4 rounded-2xl flex items-center gap-2 border shadow-xs ${
          isService 
            ? "bg-amber-950/20 border border-amber-900/40 text-amber-500" 
            : "bg-[#FF5C00]/10 border border-[#FF5C00]/20 text-[#FF5C00]"
        }`}>
          <Clock className={`w-4 h-4 shrink-0 ${isService ? "text-amber-550" : "text-[#FF5C00]"}`} />
          <div>
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-400 block leading-none">
              {isService ? "Service Timing" : "Est. Delivery"}
            </span>
            <span className="text-sm font-black leading-tight block mt-0.5">
              {isService ? (order.serviceTiming || order.eta || "Expected arrival within 1 hour") : (order.eta || "25 - 35 mins")}
            </span>
          </div>
        </div>
      </div>

      {/* Status Indicators list */}
      <div className="mt-6 space-y-4">
        {isCancelled ? (
          <div className="bg-red-950/20 border border-red-900/40 text-red-400 rounded-2xl p-4 text-center shadow-xs">
            <span className="font-extrabold text-sm block">🚫 Order Cancelled</span>
            <p className="text-xs text-zinc-400 mt-1 leading-normal font-semibold">
              This order has been cancelled by the administrator. For assistance, reach out directly to our WhatsApp Hotline 03277004471.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 border-l-2 border-zinc-800 space-y-6">
            {steps.map((step, idx) => {
              const isPast = idx < activeIndex;
              const isCurrent = idx === activeIndex;
              const isFuture = idx > activeIndex;

              return (
                <div key={idx} className="relative">
                  {/* Step bullet dot */}
                  <div className={`absolute -left-[31px] top-0.5 w-4.5 h-4.5 rounded-full flex items-center justify-center border transition-all ${
                    isPast 
                      ? "bg-[#FF5C00] border-[#FF5C00] text-zinc-950" 
                      : isCurrent 
                        ? isService 
                          ? "bg-amber-500 text-neutral-950 border-amber-500 scale-125 shadow-md shadow-amber-500/20 font-black" 
                          : "bg-[#FF5C00] text-zinc-950 border-[#FF5C00] scale-125 shadow-md shadow-orange-500/20 animate-pulse font-black"
                        : "bg-zinc-950 text-zinc-500 border-zinc-800"
                  }`}>
                    {isPast ? (
                      <Check className="w-2.5 h-2.5 stroke-[4.5]" />
                    ) : (
                      <span className="text-[9px] font-black">{idx + 1}</span>
                    )}
                  </div>

                  {/* Step labels context */}
                  <div className="pl-2">
                    <span className={`text-xs font-black uppercase tracking-wider block ${
                      isPast 
                        ? "text-zinc-500" 
                        : isCurrent 
                          ? isService 
                            ? "text-amber-500" 
                            : "text-[#FF5C00]" 
                          : "text-zinc-500"
                    }`}>
                      {step.label}
                    </span>
                    <p className="text-[11px] text-zinc-400 mt-0.5 font-medium">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Details Footer Card */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mt-8 space-y-3 font-medium text-xs">
        <h4 className="font-bold text-[10px] text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-800 pb-2">
          {isService ? <Wrench className="w-3.5 h-3.5 text-amber-500" /> : <User className="w-3.5 h-3.5 text-[#FF5C00]" />}
          {isService ? "Assigned Professional Details" : "Delivery Logistics Details"}
        </h4>
        
        <div className="grid grid-cols-2 gap-3 text-[11px]">
          <div>
            <span className="text-zinc-500 block font-semibold">Name:</span>
            <span className="text-zinc-100 font-extrabold">{order.userName}</span>
          </div>
          <div>
            <span className="text-zinc-500 block font-semibold">{isService ? "Expert Assigned:" : "Active Rider:"}</span>
            <span className="text-zinc-100 font-extrabold text-[11px] block mt-0.5">
              {order.riderName ? (
                <>
                  {order.riderName}
                  {order.riderPhone && (
                    <span className="text-emerald-400 block font-mono">
                      (Contact: {order.riderPhone})
                    </span>
                  )}
                </>
              ) : (
                isService ? "Assigning Mechanic..." : "Assigning Driver..."
              )}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-zinc-500 block font-semibold">Destination Address:</span>
            <span className="text-zinc-200 block truncate leading-relaxed font-semibold">{order.userAddress}</span>
          </div>
          <div>
            <span className="text-zinc-500 block font-semibold">Payment Mode:</span>
            <span className={`font-extrabold uppercase ${isService ? "text-amber-500" : "text-[#FF5C00]"}`}>
              {isService ? "Pay on Visit" : "Cash on Delivery"}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block font-semibold">Cart Items Total:</span>
            <span className="text-zinc-100 font-extrabold">Rs. {order.grandTotal}</span>
          </div>
        </div>

        {isService && (
          <div className="border-t border-zinc-800 pt-2 flex items-center gap-1.5 text-[10px] text-zinc-500 font-semibold">
            <CalendarDays className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Technician will examine issues and verify extra repair material needs.</span>
          </div>
        )}
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="w-full mt-4 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 transition text-zinc-200 text-xs font-extrabold py-2 px-4 rounded-xl cursor-pointer shadow-xs"
        >
          Track Another Order
        </button>
      )}

    </div>
  );
}
