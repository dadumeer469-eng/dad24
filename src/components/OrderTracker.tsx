import React, { useState, useEffect } from "react";
import { Order } from "../types";
import { Check, ClipboardList, Clock, ShieldCheck, Heart, ArrowRight, Server, Wrench, User, CalendarDays, MapPin, Compass } from "lucide-react";
import { doc, updateDoc, collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import OrderChat from "./OrderChat";
import FoodDeliveryTracker from "./FoodDeliveryTracker";

interface OrderTrackerProps {
  order: Order;
  onClose?: () => void;
  currentUser?: any;
  deliverySettings?: any;
}

export default function OrderTracker({ order, onClose, currentUser, deliverySettings }: OrderTrackerProps) {
  const isService = order.orderType === "service";
  const [showLiveChat, setShowLiveChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Listen to unread messages for this order
  useEffect(() => {
    if (!order?.id || !currentUser?.uid) return;
    const messagesRef = collection(db, "orders", order.id, "messages");
    const unsubscribe = onSnapshot(messagesRef, (snapshot) => {
      let unread = 0;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.senderId !== currentUser.uid && !data.isRead) {
          unread++;
        }
      });
      setUnreadCount(unread);
    }, (err) => console.error("Unread listener error:", err));

    return () => unsubscribe();
  }, [order?.id, currentUser?.uid]);

  const statusLower = (order.status || "").toLowerCase().trim();
  const isDispatched = !isService && (
    statusLower === "out_for_delivery" || 
    statusLower === "out_for_delivery_active" || 
    statusLower === "dispatched" || 
    statusLower === "delivered" ||
    statusLower === "completed" ||
    (!!order.riderName && statusLower !== "cancelled")
  );

  const restaurantCoords =
    (order as any).restaurantCoords ||
    (order as any).baseLocationCoords ||
    (deliverySettings?.baseLocationCoords
      ? {
          latitude: deliverySettings.baseLocationCoords.lat,
          longitude: deliverySettings.baseLocationCoords.lng,
        }
      : undefined);

  if (!isService) {
    return (
      <FoodDeliveryTracker
        orderId={order.id}
        orderStatus={order.status}
        destinationCoords={
          order.userCoords || {
            latitude: 26.7323,
            longitude: 67.7744,
          }
        }
        restaurantCoords={restaurantCoords}
        orderEta={order.eta}
        initialRiderCoords={order.riderCoords}
        riderName={order.riderName}
        riderPhone={order.riderPhone}
        restaurantName={order.restaurantName || "Dadu Central Kitchen"}
        items={order.items}
        grandTotal={order.grandTotal}
        currentUser={currentUser}
        onClose={onClose}
      />
    );
  }

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
      cancelled: { bg: "bg-pink-500/10 border-red-500/20", text: "text-pink-400", label: "Cancelled x" },
      
      booked: { bg: "bg-yellow-500/10 border-yellow-500/20", text: "text-yellow-500", label: "Booked" },
      diagnostic_on_way: { bg: "bg-[#D70F64]/10 border-[#D70F64]/20", text: "text-[#D70F64]", label: "Traveling" },
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
      <div className="mt-6 bg-[#161618] border border-zinc-800 rounded-2xl p-4.5 space-y-4 shadow-xl relative overflow-hidden">
        {/* Top header */}
        <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🚴</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#D70F64]">Rider Assigned Details</span>
          </div>
          <span className="text-[9px] bg-[#D70F64]/10 text-[#D70F64] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
            {order.status === "out_for_delivery" ? "On The Way" : "Preparing Package"}
          </span>
        </div>

        {hasRider ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-900">
              <div className="flex items-center gap-3.5">
                {/* Dadu Food styled pink-themed avatar circle */}
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#D70F64] via-pink-500 to-amber-500 p-0.5 shadow-md">
                    <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center text-white font-black text-lg font-mono">
                      {order.riderName.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-zinc-950 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                  </span>
                </div>

                {/* Rider Info text */}
                <div>
                  <span className="text-zinc-500 text-[9px] uppercase font-black tracking-wider block">Your Dadu Food Hero</span>
                  <span className="text-sm font-black text-white block mt-0.5">{order.riderName}</span>
                  
                  {/* Dadu Food style rating & vehicle information */}
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1.5 text-[10px] text-zinc-400 font-extrabold">
                    <span className="text-amber-400 flex items-center gap-0.5 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      ⭐ 4.9 <span className="text-[8.5px] text-zinc-400">(420+ trips)</span>
                    </span>
                    <span className="text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                      🏍️ LEA-5829 (Hon. 125)
                    </span>
                  </div>
                </div>
              </div>

              {/* Vaccine & safety clearance stamp */}
              <div className="text-right sm:text-left shrink-0">
                <span className="inline-flex items-center gap-1 text-[9.5px] font-black text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 py-1 px-2 rounded-lg">
                  🛡️ Sanitized & Vaccinated
                </span>
              </div>
            </div>

            {/* Contact controls with Mobile-friendly Action Bar */}
            <div className="flex flex-col gap-3 w-full">
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full">
                {order.riderPhone ? (
                  <a
                    href={`tel:${order.riderPhone}`}
                    className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-100 py-2 sm:py-2.5 px-2 rounded-xl transition text-center font-black text-[10.5px] sm:text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer truncate active:scale-95"
                  >
                    📞 Call
                  </a>
                ) : (
                  <div className="bg-zinc-900/50 border border-zinc-800 text-zinc-600 py-2 sm:py-2.5 px-2 rounded-xl text-center font-black text-[10.5px] sm:text-xs flex items-center justify-center gap-1 opacity-50 cursor-not-allowed">
                    📞 Call
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowLiveChat(!showLiveChat)}
                  className={`py-2 sm:py-2.5 px-2 rounded-xl transition text-center font-black text-[10.5px] sm:text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-95 truncate relative ${
                    showLiveChat 
                      ? "bg-zinc-800 border border-[#D70F64] text-white hover:bg-zinc-750 ring-2 ring-[#D70F64]/30" 
                      : "bg-gradient-to-r from-[#D70F64] to-pink-600 text-white hover:from-[#b00c50] hover:to-pink-700"
                  }`}
                >
                  <span>💬 {showLiveChat ? "Close Chat" : "Live Chat"}</span>
                  {unreadCount > 0 && !showLiveChat && (
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-80"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 ring-2 ring-zinc-900"></span>
                    </span>
                  )}
                </button>

                {order.riderPhone ? (
                  <a
                    href={`https://wa.me/${order.riderPhone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 sm:py-2.5 px-2 rounded-xl transition text-center font-black text-[10.5px] sm:text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer truncate active:scale-95"
                  >
                    💬 WhatsApp
                  </a>
                ) : (
                  <div className="bg-zinc-900/50 border border-zinc-800 text-zinc-600 py-2 sm:py-2.5 px-2 rounded-xl text-center font-black text-[10.5px] sm:text-xs flex items-center justify-center gap-1 opacity-50 cursor-not-allowed">
                    💬 WhatsApp
                  </div>
                )}
              </div>

              {showLiveChat && (
                <div className="w-full mt-1 animate-fade-in">
                  <OrderChat
                    orderId={order.id}
                    currentUser={{
                      uid: currentUser?.uid || "guest",
                      name: currentUser?.name || order.userName || "Customer",
                      role: currentUser?.role || "user"
                    }}
                    recipientName={order.riderName || "Rider"}
                    recipientRole="rider"
                    onClose={() => setShowLiveChat(false)}
                    isOpen={showLiveChat}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3.5 py-1">
            <div className="w-12 h-12 rounded-full bg-[#D70F64]/10 border border-[#D70F64]/20 flex items-center justify-center text-[#D70F64] shrink-0 shadow-sm">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-black text-zinc-350 block uppercase tracking-wide">Assigning Premier Rider...</span>
              <span className="text-[10px] text-zinc-400 font-semibold block mt-1 leading-relaxed">
                Your order is currently cooking hot inside the kitchen. A Dadu Food captain is standing by to accept dispatch instantly!
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const [updatingLocation, setUpdatingLocation] = useState(false);

  const handleUpdateCurrentLocation = async () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser status.");
      return;
    }
    setUpdatingLocation(true);
    try {
      alert("Fetching high-precision GPS signal... Please accept browser location prompts.");
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          const orderRef = doc(db, "orders", order.id);
          await updateDoc(orderRef, {
            userCoords: coords
          });
          alert("🎯 Success! Precise GPS coordinates updated and synchronized. Your delivery hero can see your exact pinpoint live on the map!");
          setUpdatingLocation(false);
        },
        (err) => {
          alert(`GPS Retrieval Fail: ${err.message}. Please try again close to a window.`);
          setUpdatingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } catch (error: any) {
      alert("Error: " + error.message);
      setUpdatingLocation(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3.5xl p-5 sm:p-6 shadow-xs relative overflow-hidden text-zinc-100">
      
      {/* Background Decorative Neon Light */}
      <div className={`absolute top-0 right-0 w-44 h-44 rounded-full blur-3xl pointer-events-none -mt-10 -mr-10 ${
        isService ? "bg-amber-500/5" : "bg-[#D70F64]/5"
      }`}></div>

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#D70F64] block">
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
            : "bg-[#D70F64]/10 border border-[#D70F64]/20 text-[#D70F64]"
        }`}>
          <Clock className={`w-4 h-4 shrink-0 ${isService ? "text-amber-550" : "text-[#D70F64]"}`} />
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

      {/* Status Indicators Horizontal Timeline */}
      <div className="mt-5 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3 sm:p-4 shadow-inner">
        {isCancelled ? (
          <div className="bg-pink-950/20 border border-pink-900/40 text-pink-400 rounded-2xl p-4 text-center shadow-xs">
            <span className="font-extrabold text-sm block">🚫 Order Cancelled</span>
            <p className="text-xs text-zinc-400 mt-1 leading-normal font-semibold">
              This order has been cancelled by the administrator. For assistance, reach out directly to our WhatsApp Hotline 03277004471.
            </p>
          </div>
        ) : (
          <div className="relative flex items-center justify-between w-full overflow-x-auto pb-1 space-x-2 scrollbar-none">
            {/* Background connecting bar */}
            <div className="absolute left-4 right-4 top-4 h-1 bg-zinc-800 -z-0 rounded-full" />
            <div
              className="absolute left-4 top-4 h-1 bg-gradient-to-r from-pink-500 to-[#D70F64] z-0 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(0, (activeIndex / (steps.length - 1)) * 100)}%` }}
            />

            {steps.map((step, idx) => {
              const isPast = idx < activeIndex;
              const isCurrent = idx === activeIndex;

              return (
                <div key={idx} className="flex flex-col items-center relative z-10 shrink-0 min-w-[65px] sm:min-w-[80px]">
                  {/* Step bullet dot */}
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border transition-all text-xs font-black shadow-md ${
                    isPast 
                      ? "bg-[#D70F64] border-[#D70F64] text-white" 
                      : isCurrent 
                        ? isService 
                          ? "bg-amber-500 text-neutral-950 border-amber-500 scale-110 shadow-amber-500/30" 
                          : "bg-[#D70F64] text-white border-[#D70F64] scale-110 shadow-pink-500/30 animate-pulse"
                        : "bg-zinc-900 text-zinc-500 border-zinc-750"
                  }`}>
                    {isPast ? (
                      <Check className="w-3 h-3 stroke-[3.5]" />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>

                  {/* Step label */}
                  <span className={`text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider mt-1.5 text-center leading-tight truncate max-w-[75px] ${
                    isPast 
                      ? "text-zinc-400" 
                      : isCurrent 
                        ? isService 
                          ? "text-amber-400 font-extrabold" 
                          : "text-[#D70F64] font-extrabold" 
                        : "text-zinc-600"
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Foodpanda Style Rider Detail Card */}
      {renderFoodpandaRiderCard()}

      {/* Details Footer Card */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mt-8 space-y-3 font-medium text-xs">
        <h4 className="font-bold text-[10px] text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-800 pb-2">
          {isService ? <Wrench className="w-3.5 h-3.5 text-amber-500" /> : <User className="w-3.5 h-3.5 text-[#D70F64]" />}
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
            <span className={`font-extrabold uppercase ${isService ? "text-amber-500" : "text-[#D70F64]"}`}>
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

      {/* Delivery Pinpoint Leaflet Live Tracker */}
      {!isService && (
        <div className="mt-4">
          <FoodDeliveryTracker
            orderId={order.id}
            orderStatus={order.status}
            destinationCoords={
              order.userCoords || {
                latitude: 26.7323,
                longitude: 67.7744,
              }
            }
            riderName={order.riderName || "Fateh Muhammad"}
            riderPhone={order.riderPhone}
            restaurantName={order.restaurantName || "Dadu Central Kitchen"}
            items={order.items}
            grandTotal={order.grandTotal}
            currentUser={currentUser}
            onClose={onClose}
          />
        </div>
      )}

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
