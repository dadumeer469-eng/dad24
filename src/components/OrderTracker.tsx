import React from "react";
import { Order } from "../types";
import { Check, ClipboardList, Clock, ShieldCheck, Heart, ArrowRight, Server, Wrench, User, CalendarDays, MapPin, Compass } from "lucide-react";

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

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(2);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string, text: string, label: string }> = {
      placed: { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-500", label: "Placed" },
      pending: { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-500", label: "Pending" },
      accepted: { bg: "bg-sky-500/10 border-sky-500/20", text: "text-sky-400", label: "Accepted" },
      confirmed: { bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-400", label: "Confirmed" },
      preparing: { bg: "bg-purple-500/10 border-purple-500/20", text: "text-purple-400", label: "Cooking" },
      out_for_delivery: { bg: "bg-pink-500/10 border-pink-500/20", text: "text-pink-400", label: "Out For Delivery" },
      delivered: { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400", label: "Delivered" },
      cancelled: { bg: "bg-red-500/10 border-red-500/20", text: "text-red-400", label: "Cancelled x" },
      
      booked: { bg: "bg-yellow-500/10 border-yellow-500/20", text: "text-yellow-500", label: "Booked" },
      diagnostic_on_way: { bg: "bg-[#FF5C00]/10 border-[#FF5C00]/20", text: "text-[#FF5C00]", label: "Traveling" },
      diagnostic_underway: { bg: "bg-indigo-500/10 border-indigo-500/20", text: "text-indigo-400", label: "Inspecting" },
      completed: { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400", label: "Completed" },
    };

    const item = map[status] || { bg: "bg-zinc-800 border-zinc-700", text: "text-zinc-400", label: status };
    return (
      <span className={`inline-flex items-center gap-1 py-0.5 px-2 rounded-sm border text-[9px] font-black uppercase tracking-wider ${item.bg} ${item.text}`}>
        <span className="w-1 h-1 rounded-full bg-current animate-pulse shrink-0"></span>
        {item.label}
      </span>
    );
  };

  const renderFoodpandaRiderCard = () => {
    if (isService) {
      // If it is a service order, we can also style it nicely
      return null;
    }
    
    const hasRider = !!order.riderName;

    return (
      <div className="mt-6 bg-[#161618] border border-zinc-800 rounded-2xl p-4 space-y-4 shadow-xl relative overflow-hidden">
        {/* Top header */}
        <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">🚴</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#FF5C00]">Rider Assigned Details</span>
          </div>
          <span className="text-[8px] bg-[#FF5C00]/10 text-[#FF5C00] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
            {order.status === "out_for_delivery" ? "On The Way" : "Preparing Package"}
          </span>
        </div>

        {hasRider ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {/* Foodpanda styled pink-themed avatar circle */}
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#FF5C00] via-orange-400 to-pink-500 p-0.5 shadow-md">
                  <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center text-white font-extrabold text-sm font-mono">
                    {order.riderName.charAt(0).toUpperCase()}
                  </div>
                </div>
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-zinc-950 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                </span>
              </div>

              {/* Rider Info text */}
              <div>
                <span className="text-zinc-500 text-[9px] uppercase font-black tracking-wider block">Your Delivery Hero</span>
                <span className="text-xs font-black text-white block mt-0.5">{order.riderName}</span>
                <span className="inline-flex items-center gap-1.5 text-[9px] font-extrabold text-[#FF5C00] mt-1 bg-[#FF5C00]/5 border border-[#FF5C00]/10 py-0.5 px-2 rounded-lg">
                  🛵 Standard Delivery Bike
                </span>
              </div>
            </div>

            {/* Quick Contact controls */}
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              {order.riderPhone && (
                <>
                  <a
                    href={`tel:${order.riderPhone}`}
                    className="flex-1 sm:flex-initial bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-100 py-1.5 px-3 rounded-xl transition text-center font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    📞 Call Rider
                  </a>
                  <a
                    href={`https://wa.me/${order.riderPhone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-initial bg-[#FF5C00] hover:bg-[#d44d00] text-zinc-950 py-1.5 px-3 rounded-xl transition text-center font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  >
                    💬 Chat on WA
                  </a>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-1">
            <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 animate-pulse shrink-0">
              🚴
            </div>
            <div>
              <span className="text-xs font-black text-zinc-350 block uppercase tracking-wide">Looking for a Rider...</span>
              <span className="text-[10px] text-zinc-500 font-semibold block mt-1 leading-snug">
                Your order is being compiled & prepared in the kitchen. A premier rider is standing by to accept dispatch!
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderLocationTracking = () => {
    if (!order.userCoords) return null;

    const userLat = order.userCoords.latitude;
    const userLng = order.userCoords.longitude;
    const riderLat = order.riderCoords?.latitude;
    const riderLng = order.riderCoords?.longitude;

    let distanceText = "Awaiting rider GPS tracking signal...";
    if (userLat && userLng && riderLat && riderLng) {
      const d = calculateDistance(userLat, userLng, riderLat, riderLng);
      if (parseFloat(d) < 1) {
        distanceText = `Rider is extremely nearby! About ${(parseFloat(d) * 1000).toFixed(0)} meters away.`;
      } else {
        distanceText = `Rider is currently ${d} km away from your pinpoint.`;
      }
    }

    return (
      <div className="mt-6 bg-zinc-950/80 border border-zinc-800 rounded-3xl p-4.5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
          <div>
            <span className="text-[9px] font-black uppercase text-[#FF5C00] tracking-widest block">Live GPS Coordinates Delivery tracker</span>
            <span className="text-[11px] text-zinc-400 font-semibold block mt-0.5">{distanceText}</span>
          </div>
          <MapPin className="w-4 h-4 text-[#FF5C00]" />
        </div>

        {/* Visual map trajectory simulator */}
        <div className="relative h-24 bg-zinc-900/40 border border-zinc-850 rounded-2xl overflow-hidden flex items-center justify-between px-8 select-none">
          {/* Animated grid background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f23_1px,transparent_1px),linear-gradient(to_bottom,#1f1f23_1px,transparent_1px)] bg-[size:16px_16px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20"></div>

          {/* Path line */}
          <div className="absolute left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-emerald-500 via-orange-500 to-[#FF5C00] opacity-40"></div>

          {/* Start / Rider Node */}
          <div className="relative flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border shadow-lg ${
              riderLat ? "bg-emerald-950 border-emerald-500/50 text-emerald-400 animate-pulse" : "bg-zinc-800 border-zinc-700 text-zinc-500"
            }`}>
              <Compass className={`w-4.5 h-4.5 ${riderLat ? "animate-spin" : ""}`} style={{ animationDuration: "12s" }} />
            </div>
            <span className="text-[9px] font-black text-zinc-400 mt-1 uppercase tracking-wider">
              {riderLat ? "RIDER GPS" : "Awaiting Dispatch"}
            </span>
          </div>

          {/* Signal Indicator */}
          {riderLat && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <span className="text-[8px] uppercase tracking-widest text-emerald-400 font-black bg-emerald-950/50 border border-emerald-900/40 px-2 py-0.5 rounded-full animate-bounce">
                Live Signal
              </span>
            </div>
          )}

          {/* End / Customer Destination Node */}
          <div className="relative flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-orange-950/40 border border-[#FF5C00] text-[#FF5C00] flex items-center justify-center shadow-lg relative">
              <MapPin className="w-4.5 h-4.5" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#FF5C00] animate-ping scale-150 opacity-20"></span>
            </div>
            <span className="text-[9px] font-black text-[#FF5C00] mt-1 uppercase tracking-wider">
              YOUR DOORSTEP
            </span>
          </div>
        </div>

        {/* Map Action triggers */}
        <div className="grid grid-cols-2 gap-2 text-[10.5px]">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${userLat},${userLng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 py-2 px-3 rounded-xl transition text-center font-extrabold text-zinc-200 block shadow-xs"
          >
            📍 Pinpoint Google Map
          </a>
          {riderLat ? (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${riderLat},${riderLng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#FF5C00] text-zinc-950 py-2 px-3 rounded-xl hover:bg-[#d44d00] transition text-center font-extrabold block shadow-md"
            >
              🧭 Track Rider on Map
            </a>
          ) : (
            <button
              disabled
              className="bg-zinc-900 border border-zinc-805 text-zinc-500 py-2 rounded-xl text-center font-extrabold block opacity-50 cursor-not-allowed"
            >
              🧭 GPS Pending Signal
            </button>
          )}
        </div>
      </div>
    );
  };

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
          <h3 className="font-extrabold text-sm text-zinc-100 mt-1 flex items-center gap-1.5 flex-wrap">
            Booking ID: <span className="font-mono text-xs text-zinc-400">dadu-{order.id.substring(0, 8)}</span>
            {getStatusBadge(order.status)}
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

      {/* Foodpanda Style Rider Detail Card */}
      {renderFoodpandaRiderCard()}

      {/* Live Coordinate Pin-point Tracking section */}
      {renderLocationTracking()}

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
