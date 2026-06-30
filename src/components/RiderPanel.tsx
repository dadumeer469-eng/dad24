import React, { useState, useEffect } from "react";
import { 
  collection, query, where, onSnapshot, doc, updateDoc, Timestamp, addDoc
} from "firebase/firestore";
import { db, handleFirestoreError } from "../firebase";
import { Order, UserProfile } from "../types";
import { 
  CheckCircle2, Compass, Coins, CalendarDays, TrendingUp, History, User, 
  MapPin, PhoneCall, LogOut, ArrowRight, ClipboardList, DollarSign, Clock, Check, Store, XCircle
} from "lucide-react";

interface RiderPanelProps {
  currentUser: UserProfile;
  onLogout: () => void;
  deliverySettings?: any;
}

export default function RiderPanel({ currentUser, onLogout, deliverySettings }: RiderPanelProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "history">("dashboard");
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [etaInputs, setEtaInputs] = useState<{ [orderId: string]: string }>({});
  const [autoPinnedOrderId, setAutoPinnedOrderId] = useState<string>("");

  // sound buzzer for notification when new available order arrives
  const playContinuousAlarm = () => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth"; // dramatic siren sound!
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.3);
      
      gain.gain.setValueAtTime(0.35, now); // loud "zor se"
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.6);
    } catch (e) {
      // Ignored
    }
  };

  // Continuous loop siren effect for unaccepted pending orders
  useEffect(() => {
    if (availableOrders.length === 0) return;

    playContinuousAlarm();

    const interval = setInterval(() => {
      playContinuousAlarm();
    }, 1600);

    return () => clearInterval(interval);
  }, [availableOrders.length, isMuted]);

  // Get active accepted orders
  const riderActiveOrders = myOrders.filter((o) => o.status === "accepted" || o.status === "preparing" || o.status === "out_for_delivery");
  const [focusedActiveOrderId, setFocusedActiveOrderId] = useState<string | null>(null);

  // Live rider coordinates for distance calculation
  const [liveRiderCoords, setLiveRiderCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLiveRiderCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      (err) => console.log("Rider coords fetching skipped:", err.message),
      { enableHighAccuracy: true }
    );
  }, [myOrders.length]);

  // Set default focused active order when list changes
  useEffect(() => {
    if (riderActiveOrders.length > 0) {
      if (!focusedActiveOrderId || !riderActiveOrders.some(o => o.id === focusedActiveOrderId)) {
        setFocusedActiveOrderId(riderActiveOrders[0].id);
      }
    } else {
      setFocusedActiveOrderId(null);
    }
  }, [riderActiveOrders.length, focusedActiveOrderId]);

  // Haversine formula to find distance in KM between two points
  const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
  };

  // Helper to extract unique restaurant names from order items
  const getOrderRestaurants = (order: Order) => {
    if (!order.items || order.items.length === 0) {
      return ["Dadu Fast Food & Kitchen"];
    }
    const names = order.items
      .map((item) => item.restaurantName)
      .filter((name): name is string => !!name && name.trim() !== "");
    if (names.length === 0) {
      return ["Dadu Fast Food & Kitchen"];
    }
    return Array.from(new Set(names));
  };

  // Removed live rider GPS pinpoint tracking to save data usage and database writes.
  // The system now only relies on static user delivery coordinates.

  // 1. Subscribe to Available Orders (unaccepted status === "pending" or "placed" for food deliveries)
  useEffect(() => {
    // Only food deliveries are routed to standard riders
    const q = query(
      collection(db, "orders"), 
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Order;
        if (data.orderType !== "service") {
          list.push(data);
        }
      });
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      
      setAvailableOrders((prev) => {
        if (list.length > prev.length) {
          playContinuousAlarm();
        }
        return list;
      });
    }, (err) => {
      console.error("Firestore listening available orders error:", handleFirestoreError(err));
    });

    return () => unsubscribe();
  }, []);

  // 2. Subscribe to Rider's Orders (accepted, complete, delivered, where riderId === uid)
  useEffect(() => {
    const q = query(
      collection(db, "orders"), 
      where("riderId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Order);
      });
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setMyOrders(list);
    }, (err) => {
      console.error("Firestore listening rider orders error:", handleFirestoreError(err));
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Helper date parsing (handles firestore timestamp and object objects safely)
  const parseCompletedDate = (order: Order): Date | null => {
    if (!order.deliveryCompletedAt) return null;
    if (order.deliveryCompletedAt.seconds) {
      return new Date(order.deliveryCompletedAt.seconds * 1000);
    }
    if (order.deliveryCompletedAt.toDate) {
      return order.deliveryCompletedAt.toDate();
    }
    return new Date(order.deliveryCompletedAt);
  };

  // Dynamic calculations based on delivered orders
  const deliveredOrders = myOrders.filter((o) => o.status === "delivered");

  const todayStr = new Date().toDateString();
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Metrics calculating functions
  const stats = deliveredOrders.reduce(
    (acc, order) => {
      const compDate = parseCompletedDate(order);
      if (!compDate) return acc;

      const charge = order.deliveryFee || 0;
      const isToday = compDate.toDateString() === todayStr;
      const isThisMonth = compDate.getMonth() === currentMonth && compDate.getFullYear() === currentYear;

      if (isToday) {
        acc.todayCount += 1;
        acc.todayEarnings += charge;
      }
      if (isThisMonth) {
        acc.thisMonthCount += 1;
        acc.thisMonthEarnings += charge;
      }
      return acc;
    },
    { todayCount: 0, todayEarnings: 0, thisMonthCount: 0, thisMonthEarnings: 0 }
  );

  // Group delivered history by Date format: YYYY-MM-DD
  const historyGroupedByDate = deliveredOrders.reduce((groups: Record<string, Order[]>, order) => {
    const compDate = parseCompletedDate(order);
    if (!compDate) return groups;
    
    const yyyy = compDate.getFullYear();
    const mm = String(compDate.getMonth() + 1).padStart(2, "0");
    const dd = String(compDate.getDate()).padStart(2, "0");
    const dateKey = `${yyyy}-${mm}-${dd}`;

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(order);
    return groups;
  }, {});

  // Sort dates descending
  const sortedDates = Object.keys(historyGroupedByDate).sort((a, b) => b.localeCompare(a));

  // Rider Action: Accept Order (Cap to 3 orders)
  const handleAcceptOrder = async (orderId: string) => {
    if (riderActiveOrders.length >= 3) {
      alert("⚠️ LIMIT REACHED!\n\nYou can only accept up to 3 active orders at the same time to ensure fast deliveries.");
      return;
    }
    setLoadingActionId(orderId);
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        status: "accepted",
        riderId: currentUser.uid,
        riderName: currentUser.name,
        riderPhone: currentUser.phone,
        acceptedAt: Timestamp.now()
      });
    } catch (err) {
      alert("Acceptance failed: " + handleFirestoreError(err));
    } finally {
      setLoadingActionId(null);
    }
  };

  // Rider Action: Cancel/Return Order
  const handleCancelOrder = async (orderId: string) => {
    const reason = prompt("Please provide a reason for cancelling / returning the order (e.g. Customer not responding, location not found):");
    if (reason === null) return;
    if (reason.trim() === "") {
      alert("Reason is required to cancel an order.");
      return;
    }

    setLoadingActionId(orderId);
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        status: "cancelled",
        cancelReason: `Rider Cancelled: ${reason}`,
        cancelledBy: "rider",
        cancelledAt: Timestamp.now()
      });
      // Optionally notify admin/customer
      const targetOrder = myOrders.find(o => o.id === orderId);
      if (targetOrder) {
        await addDoc(collection(db, "notifications"), {
          userId: targetOrder.userId,
          title: "Order Cancelled",
          body: `Your order was cancelled by the rider. Reason: ${reason}`,
          createdAt: { seconds: Date.now() / 1000 },
          read: false,
        }).catch(() => {});
      }
    } catch (err) {
      alert("Cancel transaction failed: " + handleFirestoreError(err));
    } finally {
      setLoadingActionId(null);
    }
  };

  // Rider Action: Delivered
  const handleMarkAsDelivered = async (orderId: string) => {
    setLoadingActionId(orderId);
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        status: "delivered",
        deliveryCompletedAt: Timestamp.now()
      });
    } catch (err) {
      alert("Deliver transaction failed: " + handleFirestoreError(err));
    } finally {
      setLoadingActionId(null);
    }
  };

  // Rider Action: Preparing status tracker update
  const handleMarkAsPreparing = async (orderId: string) => {
    setLoadingActionId(orderId);
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        status: "preparing"
      });
      const targetOrder = myOrders.find(o => o.id === orderId);
      if (targetOrder) {
        await addDoc(collection(db, "notifications"), {
          userId: targetOrder.userId,
          title: "🍳 Order is being Prepared!",
          message: `Your dadufood order is currently cooking & compiling in the kitchen!`,
          createdAt: { seconds: Date.now() / 1000 },
          read: false,
        });
      }
    } catch (err) {
      alert("Preparing change failed: " + handleFirestoreError(err));
    } finally {
      setLoadingActionId(null);
    }
  };

  // Rider Action: Out for Delivery status tracker update
  const handleMarkAsOutForDelivery = async (orderId: string) => {
    setLoadingActionId(orderId);
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        status: "out_for_delivery"
      });
      const targetOrder = myOrders.find(o => o.id === orderId);
      if (targetOrder) {
        await addDoc(collection(db, "notifications"), {
          userId: targetOrder.userId,
          title: "🛵 Order Out for Delivery!",
          message: `Your delivery hero ${currentUser.name} has picked up your food and is on the way!`,
          createdAt: { seconds: Date.now() / 1000 },
          read: false,
        });
      }
    } catch (err) {
      alert("Out for delivery change failed: " + handleFirestoreError(err));
    } finally {
      setLoadingActionId(null);
    }
  };

  // Find active accepted order for this rider if any (defaults to focused order, falls back to first)
  const riderActiveOrder = riderActiveOrders.find(o => o.id === focusedActiveOrderId) || riderActiveOrders[0] || null;

  // Format YYYY-MM-DD into a more readable date
  const formatNiceDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      
      {/* Header bar */}
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center gap-2.5">
              <div className="bg-[#D70F64] text-white p-2 rounded-2xl shadow-md">
                <Compass className="w-5 h-5 animate-spin-slow text-white shrink-0" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">Dadu24 Rider Gate</h1>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] sm:text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full uppercase">
                    Active Duty
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-[#D70F64] font-bold mt-0.5">Logged in as {currentUser.name}</p>
              </div>
            </div>

            {/* Logout button on mobile */}
            <button
              onClick={onLogout}
              className="sm:hidden bg-zinc-950 text-pink-400 hover:text-pink-300 border border-zinc-800 p-2.5 rounded-xl transition cursor-pointer active:scale-95"
              title="Sign Out rider profile"
            >
              <LogOut className="w-4.5 h-4.5 shrink-0" />
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto border-t border-zinc-800/50 pt-2 sm:pt-0 sm:border-0">
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex-1 sm:flex-initial py-2.5 px-3 sm:px-4 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition cursor-pointer active:scale-95 ${
                  activeTab === "dashboard"
                    ? "bg-[#D70F64] text-white"
                    : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                }`}
              >
                🚚 Dashboard
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`flex-1 sm:flex-initial py-2.5 px-3 sm:px-4 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition cursor-pointer active:scale-95 ${
                  activeTab === "history"
                    ? "bg-[#D70F64] text-white"
                    : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                }`}
              >
                📚 history & catalog
              </button>
            </div>
            
            <span className="hidden sm:inline text-zinc-800 mx-1">|</span>

            <button
              onClick={onLogout}
              className="hidden sm:inline-block bg-zinc-950 text-pink-400 hover:text-pink-300 border border-zinc-800 p-2 rounded-xl transition cursor-pointer"
              title="Sign Out rider profile"
            >
              <LogOut className="w-4 h-4 shrink-0" />
            </button>
          </div>

        </div>
      </header>

      {/* Main Panel views layout */}
      <main className="max-w-7xl mx-auto px-4 py-5 sm:py-8 flex-grow w-full space-y-6 sm:space-y-8">
        
        {activeTab === "dashboard" && (
          <div className="space-y-6 sm:space-y-8 animate-fade-in">
            
            {/* Continuous Loud Alarm status indicator */}
            {availableOrders.length > 0 && (
              <div className="bg-pink-950/40 border border-pink-900/40 p-4 sm:p-5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl pointer-events-none -mt-8 -mr-8 bg-pink-500/10"></div>
                <div className="flex items-center gap-3 text-center md:text-left relative z-10">
                  <span className="text-2xl animate-bounce shrink-0">🚨</span>
                  <div>
                    <span className="text-xs font-black uppercase tracking-widest text-[#D70F64] block">New Dispatch Alert Siren Active</span>
                    <span className="text-xs text-zinc-300 font-semibold block mt-0.5">
                      {availableOrders.length} unassigned order{availableOrders.length !== 1 ? "s" : ""} waiting in queue! Accept before someone else does.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsMuted(prev => !prev)}
                  className="w-full md:w-auto py-2.5 px-6 rounded-xl text-xs font-black uppercase tracking-wider transition shrink-0 cursor-pointer bg-[#D70F64] hover:bg-[#b00c50] text-white shadow-md shadow-pink-500/10 active:scale-95"
                >
                  {isMuted ? "🔊 Unmute Alarm Tone" : "🔊 Mute Alarm Tone"}
                </button>
              </div>
            )}

            {/* 1. Analytics Widgets Grid */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              
              <div className="bg-zinc-900 border border-zinc-800 p-4 sm:p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between shadow-sm">
                <div className="absolute top-0 right-0 p-3 text-[#D70F64] opacity-10">
                  <ClipboardList className="w-12 h-12" />
                </div>
                <div>
                  <span className="text-[9px] sm:text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest block">Today's Orders</span>
                  <p className="text-2xl sm:text-3xl font-black text-white mt-1">{stats.todayCount}</p>
                </div>
                <div className="border-t border-zinc-850 pt-2 flex items-center gap-1.5 text-[10px] sm:text-[10.5px] text-emerald-400 mt-3 font-bold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Completed Today</span>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-4 sm:p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between shadow-sm">
                <div className="absolute top-0 right-0 p-3 text-emerald-500 opacity-10">
                  <Coins className="w-12 h-12" />
                </div>
                <div>
                  <span className="text-[9px] sm:text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest block">Today's Earnings</span>
                  <p className="text-2xl sm:text-3xl font-black text-white mt-1">Rs. {stats.todayEarnings}</p>
                </div>
                <div className="border-t border-zinc-850 pt-2 flex items-center gap-1.5 text-[10px] sm:text-[10.5px] text-amber-500 mt-3 font-bold">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Pure Rider Fees</span>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-4 sm:p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between shadow-sm">
                <div className="absolute top-0 right-0 p-3 text-purple-500 opacity-10">
                  <CalendarDays className="w-12 h-12" />
                </div>
                <div>
                  <span className="text-[9px] sm:text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest block">This Month's Orders</span>
                  <p className="text-2xl sm:text-3xl font-black text-white mt-1">{stats.thisMonthCount}</p>
                </div>
                <div className="border-t border-zinc-850 pt-2 flex items-center gap-1.5 text-[10px] sm:text-[10.5px] text-[#D70F64] mt-3 font-bold">
                  <Check className="w-3.5 h-3.5" />
                  <span>Monthly Total</span>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-4 sm:p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between shadow-sm">
                <div className="absolute top-0 right-0 p-3 text-amber-500 opacity-10">
                  <TrendingUp className="w-12 h-12" />
                </div>
                <div>
                  <span className="text-[9px] sm:text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest block">This Month's Earnings</span>
                  <p className="text-2xl sm:text-3xl font-black text-white mt-1">Rs. {stats.thisMonthEarnings}</p>
                </div>
                <div className="border-t border-zinc-850 pt-2 flex items-center gap-1.5 text-[10px] sm:text-[10.5px] text-emerald-400 mt-3 font-bold">
                  <Coins className="w-3.5 h-3.5" />
                  <span>Accumulated Earnings</span>
                </div>
              </div>

            </section>

            {/* 2. Active Order Pipeline & Available Orders Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              
              {/* Left Column: Active Order Assignment */}
              <section className="space-y-4 sm:space-y-5">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2 flex-wrap gap-2">
                  <h2 className="text-xs sm:text-sm font-black uppercase tracking-widest text-[#D70F64]">
                    🛡️ Active Order Shipment
                  </h2>
                  {riderActiveOrders.length > 0 && (
                    <span className="text-[9px] sm:text-[10px] bg-red-500/10 text-pink-400 py-0.5 px-2.5 rounded-full font-black uppercase">
                      {riderActiveOrders.length}/3 Accepted
                    </span>
                  )}
                </div>

                {/* Multi-Run Status Header Banner */}
                {riderActiveOrders.length > 0 && (
                  <div className="bg-[#D70F64]/5 border border-[#D70F64]/20 p-3 sm:p-4 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-[11px] sm:text-xs text-pink-200">
                      <span className="font-extrabold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        🚀 Multi-Order Active Mode
                      </span>
                      <span className="font-bold text-[9px] sm:text-[10px] text-zinc-400 uppercase tracking-widest">
                        Max 3 active orders
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-semibold leading-relaxed">
                      You are delivering multiple orders concurrently. Tap any order selector below to manage or navigate that specific route.
                    </p>

                    {/* Order selector tabs */}
                    <div className="flex gap-2 flex-wrap pt-1">
                      {riderActiveOrders.map((order, idx) => {
                        const isFocused = order.id === focusedActiveOrderId;
                        const statusBadgeColor = 
                          order.status === "preparing" ? "border-amber-500/20 text-amber-400 bg-amber-500/10" :
                          order.status === "out_for_delivery" ? "border-sky-500/20 text-sky-400 bg-sky-500/10" :
                          "border-pink-500/20 text-pink-400 bg-[#D70F64]/10";
                        return (
                          <button
                            key={order.id}
                            onClick={() => setFocusedActiveOrderId(order.id)}
                            className={`flex-1 min-w-[100px] text-left p-2 sm:p-2.5 rounded-xl transition border cursor-pointer active:scale-95 ${
                              isFocused
                                ? "bg-[#D70F64] text-white border-[#D70F64] shadow-md shadow-pink-500/10"
                                : "bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            <span className="text-[9.5px] sm:text-[10px] font-black block tracking-wide truncate">
                              #{idx + 1}: {order.userName}
                            </span>
                            <span className={`text-[8px] sm:text-[8.5px] px-1 rounded block uppercase mt-1 font-black w-max border ${isFocused ? "border-white/20 text-white bg-white/10" : statusBadgeColor}`}>
                              {order.status === "accepted" ? "accepted" : order.status}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {riderActiveOrder ? (
                  <div className="bg-zinc-900 border-2 border-[#D70F64]/40 rounded-3xl p-4 sm:p-6 space-y-5 sm:space-y-6 shadow-xl relative overflow-hidden animate-fade-in text-zinc-100">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3 gap-2 flex-wrap">
                      <div className="space-y-1">
                        <span className="text-[10px] text-[#D70F64] font-black uppercase tracking-wider block">Currently Delivering</span>
                        <h3 className="text-base font-black flex items-center gap-1.5 flex-wrap">
                          Delivery ID: <span className="font-mono text-zinc-400">dadu-{riderActiveOrder.id.substring(0, 8)}</span>
                        </h3>
                        <p className="text-[11px] text-zinc-400 font-semibold">Accepted at: {riderActiveOrder.createdAt?.seconds ? new Date(riderActiveOrder.createdAt.seconds * 1000).toLocaleString() : "Just now"}</p>
                      </div>
                      <span className="bg-[#D70F64] text-white font-black tracking-widest text-[9px] py-1 px-3 rounded-full uppercase">
                        In-Progress
                      </span>
                    </div>

                    {/* Customer Logistics details */}
                    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-4 font-medium text-xs">
                      <div className="flex items-start gap-3">
                        <User className="w-4 h-4 text-[#D70F64] shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] uppercase text-zinc-500 font-black tracking-wider block">Customer Name</span>
                          <span className="text-sm font-black text-zinc-100 block mt-0.5">{riderActiveOrder.userName}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 border-t border-zinc-900 pt-3">
                        <Store className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] uppercase text-zinc-500 font-black tracking-wider block">🏪 Pickup Store / Restaurant</span>
                          <div className="mt-0.5">
                            {getOrderRestaurants(riderActiveOrder).map(restName => {
                              const restPhone = deliverySettings?.restaurantStatuses?.[restName]?.phone;
                              return (
                                <div key={restName} className="mb-1 last:mb-0">
                                  <p className="text-sm font-black text-pink-400 leading-tight">{restName}</p>
                                  {restPhone && (
                                    <a href={`tel:${restPhone}`} className="text-[11px] text-zinc-400 font-bold hover:text-white hover:underline flex items-center gap-1 mt-0.5">
                                      <PhoneCall className="w-3 h-3 text-emerald-400" /> {restPhone}
                                    </a>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 border-t border-zinc-900 pt-3">
                        <MapPin className="w-4 h-4 text-[#D70F64] shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] uppercase text-zinc-500 font-black tracking-wider block">Delivery Destination</span>
                          <p className="text-xs text-zinc-300 font-bold leading-relaxed mt-0.5">{riderActiveOrder.userAddress}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 border-t border-zinc-900 pt-3">
                        <PhoneCall className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] uppercase text-zinc-500 font-black tracking-wider block">Call Customer</span>
                          <a 
                            href={`tel:${riderActiveOrder.userPhone}`} 
                            className="text-xs text-emerald-400 hover:underline font-black mt-0.5 block"
                          >
                            {riderActiveOrder.userPhone} (Tap to Call Dial)
                          </a>
                        </div>
                      </div>
                    </div>

                     {/* Pin-point user Delivery Destination GPS tracking */}
                     {riderActiveOrder.userCoords && (
                       <div className="bg-zinc-950 border border-zinc-800 p-3 sm:p-4 rounded-2xl flex flex-col gap-3 relative overflow-hidden">
                         <span className="text-[9.5px] text-emerald-400 font-extrabold uppercase tracking-widest block flex items-center gap-1.5 pb-1 border-b border-zinc-900">
                           <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                           🎯 Customer Pinpoint Map Destination
                         </span>

                         <div className="relative w-full h-48 sm:h-56 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-inner">
                           <iframe
                             title="Customer Pinpoint Location"
                             width="100%"
                             height="100%"
                             frameBorder="0"
                             scrolling="no"
                             marginHeight={0}
                             marginWidth={0}
                             src={`https://www.openstreetmap.org/export/embed.html?bbox=${riderActiveOrder.userCoords.longitude - 0.003}%2C${riderActiveOrder.userCoords.latitude - 0.003}%2C${riderActiveOrder.userCoords.longitude + 0.003}%2C${riderActiveOrder.userCoords.latitude + 0.003}&layer=mapnik&marker=${riderActiveOrder.userCoords.latitude}%2C${riderActiveOrder.userCoords.longitude}`}
                             style={{ filter: "invert(90%) hue-rotate(180deg) brightness(95%) contrast(90%)" }}
                             className="w-full h-full rounded-xl"
                           ></iframe>
                           <div className="absolute bottom-2.5 right-2.5 bg-zinc-950/90 border border-zinc-850 py-1 px-2.5 rounded-lg text-[8px] sm:text-[9px] font-black tracking-wider text-emerald-400 shadow flex items-center gap-1.5 pointer-events-none backdrop-blur-md">
                             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                             CUSTOMER DOORSTEP
                           </div>
                         </div>

                         <a
                           href={`https://www.google.com/maps/dir/?api=1&destination=${riderActiveOrder.userCoords.latitude},${riderActiveOrder.userCoords.longitude}`}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="w-full bg-[#D70F64] hover:bg-[#b00c50] text-white font-black text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl text-center shadow-md flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
                           id="google-maps-dir-button"
                         >
                           <Compass className="w-4 h-4 shrink-0" />
                           Open in Google Maps Navigation 🗺️
                         </a>
                       </div>
                     )}

                    {/* Order contents summary */}
                    <div className="space-y-2">
                      <span className="text-[9.5px] font-black text-zinc-400 uppercase block tracking-wider">Package Items:</span>
                      <div className="max-h-36 overflow-y-auto space-y-1.5 scrollbar-none pr-1">
                        {riderActiveOrder.items.map((item, idx) => (
                          <div key={idx} className="bg-zinc-950/45 border border-zinc-850 p-2 sm:p-2.5 rounded-xl flex items-center justify-between text-xs font-semibold">
                            <span className="text-zinc-200 text-[11.5px] sm:text-xs">
                              {item.name} <span className="text-[#D70F64] font-black">×{item.quantity}</span>
                            </span>
                            <span className="text-zinc-400 font-mono">Rs. {item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Active Shipment Status Controller Options */}
                    <div className="bg-zinc-950 border border-zinc-850 p-3 sm:p-4 rounded-2xl space-y-2.5">
                      <span className="text-[9px] sm:text-[9.5px] font-black text-zinc-400 uppercase tracking-widest block border-b border-zinc-900 pb-1.5">
                        ⚙️ Update CURRENT PHASE Status
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                           onClick={() => handleMarkAsPreparing(riderActiveOrder.id)}
                           disabled={loadingActionId !== null || riderActiveOrder.status === "preparing"}
                           className={`py-2.5 px-3 rounded-xl font-black uppercase text-[10px] tracking-wider transition cursor-pointer active:scale-95 ${
                             riderActiveOrder.status === "preparing" 
                               ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 font-black cursor-default" 
                               : "bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-850"
                           }`}
                        >
                          🍳 Cook: Preparing
                        </button>
                        
                        <button
                           onClick={() => handleMarkAsOutForDelivery(riderActiveOrder.id)}
                           disabled={loadingActionId !== null || riderActiveOrder.status === "out_for_delivery"}
                           className={`py-2.5 px-3 rounded-xl font-black uppercase text-[10px] tracking-wider transition cursor-pointer active:scale-95 ${
                             riderActiveOrder.status === "out_for_delivery" 
                               ? "bg-sky-500/20 text-sky-400 border border-sky-500/30 font-black cursor-default" 
                               : "bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-850"
                           }`}
                        >
                          🛵 Out For Delivery
                        </button>
                      </div>
                    </div>

                    {/* Dynamic ETA settings */}
                    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-1.5 text-[9.5px] font-black uppercase text-[#D70F64] tracking-wider">
                         <Clock className="w-3.5 h-3.5 text-[#D70F64] animate-pulse" /> Set Delivery/Arrival Time (ETA)
                      </div>
                      <p className="text-[10px] text-zinc-400 font-semibold leading-relaxed">
                        Let the customer know when they can expect their food/repair arrival! Updates the live map dashboard instantly.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          placeholder="e.g. 15 mins, 25 mins, 9:30 PM"
                          value={etaInputs[riderActiveOrder.id] !== undefined ? etaInputs[riderActiveOrder.id] : (riderActiveOrder.eta || "")}
                          onChange={(e) => setEtaInputs({ ...etaInputs, [riderActiveOrder.id]: e.target.value })}
                          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-[#D70F64] transition"
                        />
                        <button
                          onClick={async () => {
                            const value = etaInputs[riderActiveOrder.id] !== undefined ? etaInputs[riderActiveOrder.id] : (riderActiveOrder.eta || "");
                            try {
                              await updateDoc(doc(db, "orders", riderActiveOrder.id), {
                                eta: value
                              });
                              // Also dispatch an in-app notification to buyer
                              await addDoc(collection(db, "notifications"), {
                                userId: riderActiveOrder.userId,
                                title: "🛵 Delivery ETA Time Updated!",
                                message: `Your rider ${currentUser.name} updated the order arrival ETA: ${value}`,
                                createdAt: { seconds: Date.now() / 1000 },
                                read: false,
                              }).catch(() => {});
                              alert("⏱️ Delivery ETA updated & synchronized with customer profile!");
                            } catch (err: any) {
                              alert("Failed to update ETA: " + err.message);
                            }
                          }}
                          className="bg-[#D70F64] hover:bg-[#b00c50] text-white font-black text-xs uppercase px-4 py-2.5 rounded-xl transition cursor-pointer active:scale-95"
                        >
                          Update Time
                        </button>
                      </div>
                    </div>

                    {/* Totals panel */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 border-t border-zinc-800 pt-4 text-xs font-black">
                      <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-850">
                        <span className="text-[9px] text-zinc-500 uppercase tracking-wider block">Total bill</span>
                        <span className="text-sm sm:text-base text-zinc-200">Rs. {riderActiveOrder.grandTotal}</span>
                      </div>
                      <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-850">
                        <span className="text-[9px] text-zinc-500 uppercase tracking-wider block">payment Mode</span>
                        <span className="text-sm sm:text-base text-emerald-400 uppercase">{riderActiveOrder.paymentMethod}</span>
                      </div>
                    </div>

                    {/* Completion Action Button */}
                    <div className="flex flex-col gap-2 mt-2">
                      <button
                        onClick={() => handleMarkAsDelivered(riderActiveOrder.id)}
                        disabled={loadingActionId === riderActiveOrder.id}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black py-4 rounded-2xl transition shadow-lg text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                      >
                        {loadingActionId === riderActiveOrder.id ? (
                          <>
                            <Clock className="w-5 h-5 animate-spin text-dark" />
                            Marking as delivered...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5" />
                            Mark Order as Delivered & Collect Charges
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleCancelOrder(riderActiveOrder.id)}
                        disabled={loadingActionId === riderActiveOrder.id}
                        className="w-full bg-pink-950/20 border border-pink-900/30 hover:bg-pink-950/40 text-red-500 font-black py-4 rounded-2xl transition text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                      >
                        <XCircle className="w-5 h-5" />
                        Cancel / Return Order
                      </button>
                    </div>

                  </div>
                ) : (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center space-y-3.5 shadow-sm text-zinc-400">
                    <span className="text-4xl block">📦</span>
                    <span className="text-xs font-black uppercase text-zinc-500 tracking-wider">No active shipment selected</span>
                    <p className="text-[11px] text-zinc-500 font-medium max-w-xs mx-auto leading-normal">
                      Scan the available live orders lists in the next panel, then tap "Accept Delivery" to claim your shipment.
                    </p>
                  </div>
                )}
              </section>

              {/* Right Column: Available orders waiting for drivers */}
              <section className="space-y-4 sm:space-y-5">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <h2 className="text-xs sm:text-sm font-black uppercase tracking-widest text-[#D70F64]">
                    🔔 Available Food Shipments ({availableOrders.length})
                  </h2>
                  <span className="text-[9px] bg-red-500/10 text-pink-400 py-0.5 px-2 rounded-full font-black uppercase animate-pulse">
                    On-Screen Live Check
                  </span>
                </div>

                <div className="space-y-4 max-h-[550px] overflow-y-auto scrollbar-none pr-1">
                  {availableOrders.length === 0 ? (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 sm:p-10 text-center space-y-3 shadow-sm text-zinc-500">
                      <span className="text-3xl block">⏳</span>
                      <p className="text-xs font-black uppercase text-zinc-550 tracking-widest">No available orders currently</p>
                      <p className="text-[10.5px] mt-1 text-zinc-500 font-semibold">We will alert you instantly with sound chime when buyers place orders!</p>
                    </div>
                  ) : (
                    availableOrders.map((order) => {
                      const isDisabled = riderActiveOrders.length >= 3 || loadingActionId !== null;
                      
                      // Calculate distance if coordinates exist
                      const orderCoords = order.userCoords;
                      let distanceToRider: number | null = null;
                      if (orderCoords && liveRiderCoords) {
                        distanceToRider = getDistanceKm(
                          liveRiderCoords.latitude,
                          liveRiderCoords.longitude,
                          orderCoords.latitude,
                          orderCoords.longitude
                        );
                      }

                      // Check proximity to active orders (if distance is within 3km, it means location is close!)
                      const nearbyActiveOrderMatches = riderActiveOrders.map(active => {
                        if (!orderCoords || !active.userCoords) return null;
                        const dist = getDistanceKm(
                          active.userCoords.latitude,
                          active.userCoords.longitude,
                          orderCoords.latitude,
                          orderCoords.longitude
                        );
                        return { name: active.userName, dist };
                      }).filter((m): m is {name: string, dist: number} => m !== null && m.dist <= 3.0);

                      const hasNearbyMatches = nearbyActiveOrderMatches.length > 0;

                      return (
                        <div 
                          key={order.id} 
                          className={`bg-zinc-900 border rounded-2xl p-4 sm:p-5 hover:border-[#D70F64]/40 transition space-y-4 shadow-xs relative text-zinc-100 group ${
                            hasNearbyMatches ? "border-emerald-500/30 ring-1 ring-emerald-500/10" : "border-zinc-800"
                          }`}
                        >
                          {/* Order metadata header */}
                          <div className="flex items-start justify-between gap-2 flex-wrap sm:flex-nowrap">
                            <div>
                              <div className="flex flex-wrap gap-1.5 items-center">
                                <span className="text-[9px] bg-zinc-950 border border-zinc-800 py-1 px-2 rounded text-zinc-400 font-black tracking-wider uppercase block w-max">
                                  Rs. {order.deliveryFee} Rider Fee
                                </span>
                                {distanceToRider !== null && distanceToRider <= 4.0 && (
                                  <span className="text-[8.5px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 py-0.5 px-2 rounded font-black uppercase">
                                    📍 Near You ({distanceToRider.toFixed(1)} km)
                                  </span>
                                )}
                                {hasNearbyMatches && (
                                  <span className="text-[8.5px] bg-sky-500/10 text-sky-400 border border-sky-500/20 py-0.5 px-2 rounded font-black uppercase animate-pulse">
                                    🔥 On Active Way 
                                  </span>
                                )}
                              </div>
                              <h4 className="font-extrabold text-xs sm:text-sm mt-2 text-zinc-200">
                                Dadu Order: <span className="font-mono text-xs text-[#D70F64]">dadu-{order.id.substring(0, 6)}</span>
                              </h4>
                            </div>
                            <span className="text-[10px] text-zinc-500 font-mono font-bold mt-1 sm:mt-0">
                              {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "New"}
                            </span>
                          </div>

                          {/* Order location and timing */}
                          <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-850 space-y-2 text-[11px] font-semibold text-zinc-300">
                            
                            {/* Display pickup store / restaurant! */}
                            <div className="flex flex-col gap-1.5 border-b border-zinc-900 pb-1.5">
                              <div className="flex items-start gap-1.5 justify-between">
                                <span className="text-zinc-500 font-bold">🏪 Pickup From:</span>
                                <span className="text-pink-400 font-extrabold text-right max-w-[200px]">
                                  {getOrderRestaurants(order).map(restName => {
                                    const restPhone = deliverySettings?.restaurantStatuses?.[restName]?.phone;
                                    return (
                                      <div key={restName} className="mb-0.5">
                                        <span className="block truncate leading-tight">{restName}</span>
                                        {restPhone && (
                                          <a href={`tel:${restPhone}`} className="text-[10px] text-zinc-400 hover:text-white hover:underline flex items-center justify-end gap-1 mt-0.5" onClick={(e) => e.stopPropagation()}>
                                            <PhoneCall className="w-2.5 h-2.5" /> {restPhone}
                                          </a>
                                        )}
                                      </div>
                                    )
                                  })}
                                </span>
                              </div>
                            </div>

                            {/* Item List Display */}
                            <div className="border-b border-zinc-900 pb-2 space-y-1.5">
                              <span className="text-zinc-500 font-bold block">📦 Items to Pick Up:</span>
                              <div className="space-y-1">
                                {order.items?.map((item: any, idx: number) => (
                                  <div key={idx} className="flex justify-between items-start text-[10.5px]">
                                    <div className="flex-1 pr-2">
                                      <span className="text-zinc-200 font-bold">{item.quantity}x {item.name}</span>
                                      {item.restaurantName && (
                                        <span className="block text-[9px] text-pink-400/80 font-medium mt-0.5 leading-tight">{item.restaurantName}</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 justify-between border-b border-zinc-900 pb-1.5 pt-1">
                              <span className="text-zinc-500 font-bold">Buyer Name:</span>
                              <span className="text-zinc-100 font-extrabold">{order.userName || "Customer"}</span>
                            </div>
                            
                            <div className="flex items-center gap-1.5 border-b border-zinc-900 pb-1.5">
                              <span className="text-zinc-500 font-bold">📞 Phone:</span>
                              <a href={`tel:${order.userPhone}`} className="text-emerald-400 font-mono font-bold hover:underline">
                                {order.userPhone || "N/A"}
                              </a>
                            </div>
                            
                            <div className="flex items-start gap-1.5">
                              <span className="text-[#D70F64] shrink-0 font-bold">📍 Destination:</span>
                              <span className="text-zinc-200">{order.userAddress}</span>
                            </div>

                            {/* Nearby concurrent orders path markers helper */}
                            {nearbyActiveOrderMatches.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-zinc-900 space-y-1">
                                <span className="text-[9px] text-[#D70F64] uppercase font-black tracking-wider block">🗺️ Proximity Analysis:</span>
                                {nearbyActiveOrderMatches.map((match, mIdx) => (
                                  <p key={mIdx} className="text-[10px] text-zinc-400 font-medium">
                                    • Just <span className="text-emerald-400 font-black">{match.dist.toFixed(1)} km</span> away from active order customer <span className="text-zinc-200 font-semibold">{match.name}</span>! Extremely convenient to accept both.
                                  </p>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center gap-1.5 justify-between border-t border-zinc-900 pt-1.5 mt-1.5">
                              {order.userCoords ? (
                                <span className="text-emerald-400 text-[9px] uppercase font-bold flex items-center gap-1 bg-emerald-950/20 px-1.5 py-0.5 rounded border border-emerald-900/10">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                  📍 GPS Pin Locked
                                </span>
                              ) : (
                                <span className="text-amber-500 text-[9px] uppercase font-bold bg-amber-950/20 px-1.5 py-0.5 rounded border border-amber-900/10">
                                  ⚠️ No GPS Pin
                                </span>
                              )}
                              <span className="text-amber-550 font-extrabold uppercase">COD</span>
                            </div>
                            
                            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold border-t border-zinc-900 pt-1.5 mt-1.5">
                              <span>Items: Rs. {order.totalPrice}</span>
                              <span className="text-[#D70F64] font-black">Total: Rs. {order.grandTotal}</span>
                            </div>
                          </div>

                          {/* Accept Action Button */}
                          <button
                            onClick={() => handleAcceptOrder(order.id)}
                            disabled={isDisabled}
                            className={`w-full py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer border active:scale-95 ${
                              isDisabled && riderActiveOrders.length >= 3
                                ? "bg-zinc-950 text-zinc-600 border-zinc-850 cursor-not-allowed"
                                : "bg-gradient-to-r from-[#D70F64] to-pink-600 text-white hover:from-pink-500 hover:to-pink-600 border-[#D70F64] shadow-md shadow-pink-500/10"
                            }`}
                          >
                            {loadingActionId === order.id ? (
                              "Accepting package..."
                            ) : riderActiveOrders.length >= 3 ? (
                              "Limit reached (Max 3 orders active)"
                            ) : (
                              <>
                                <span>Accept Delivery Shipment</span>
                                <ArrowRight className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-1 transition-transform" />
                              </>
                            )}
                          </button>

                        </div>
                      );
                    })
                  )}
                </div>
              </section>

            </div>

          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-6 sm:space-y-8 animate-fade-in text-zinc-100">
            
            <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 sm:p-6 space-y-6 shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-zinc-800 pb-4">
                <History className="w-5 h-5 text-[#D70F64]" />
                <div>
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-[#D70F64]">Past Delivered Catalog</h3>
                  <p className="text-[11px] text-zinc-400 font-semibold leading-relaxed">Grouped by delivery sequence complete dates. Select a date to view full catalog breakdown.</p>
                </div>
              </div>

              {sortedDates.length === 0 ? (
                <div className="text-center p-8 sm:p-12 text-zinc-500 space-y-2">
                  <span className="text-3xl block">📚</span>
                  <p className="text-xs font-black uppercase text-zinc-455 tracking-wider">No delivered package history yet</p>
                  <p className="text-[10.5px] text-zinc-600 font-semibold leading-tight">Complete your current package deliveries inside the main dashboard panel to register logs.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                  
                  {/* Left: Interactive list of Calendar Dates */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block border-b border-zinc-800 pb-1.5">Select Catalog Date</span>
                    <div className="space-y-2 max-h-[300px] md:max-h-[360px] overflow-y-auto scrollbar-none">
                      {sortedDates.map((dateKey) => {
                        const dayOrders = historyGroupedByDate[dateKey] || [];
                        const dayEarnings = dayOrders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
                        const isSelected = selectedHistoryDate === dateKey;

                        return (
                          <button
                            key={dateKey}
                            onClick={() => setSelectedHistoryDate(dateKey)}
                            className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between gap-3 text-xs cursor-pointer active:scale-95 ${
                              isSelected
                                ? "bg-[#D70F64] text-white border-[#D70F64]"
                                : "bg-zinc-950 hover:bg-zinc-850 text-zinc-300 border-zinc-800"
                            }`}
                          >
                            <div>
                              <span className={`font-black block uppercase tracking-wide ${isSelected ? "text-zinc-950" : "text-zinc-100"}`}>
                                {formatNiceDate(dateKey)}
                              </span>
                              <span className={`text-[10px] font-bold block mt-0.5 ${isSelected ? "text-zinc-900/80" : "text-zinc-500"}`}>
                                {dayOrders.length} Shipments Delivered
                              </span>
                            </div>
                            <span className={`font-mono font-black text-sm block ${isSelected ? "text-zinc-950" : "text-emerald-400"}`}>
                              Rs. {dayEarnings}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: Selected Date catalog orders breakdown */}
                  <div className="md:col-span-2 space-y-4">
                    {selectedHistoryDate ? (
                      <div className="space-y-4">
                        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-[#D70F64] font-black block">Log catalog details for</span>
                            <h4 className="font-extrabold text-xs sm:text-sm text-zinc-100 mt-1">{formatNiceDate(selectedHistoryDate)}</h4>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <span className="text-[9px] text-zinc-550 uppercase tracking-widest block leading-none">Completed</span>
                              <span className="text-xs sm:text-sm font-black text-zinc-200 block mt-1">{(historyGroupedByDate[selectedHistoryDate] || []).length} Orders</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] text-zinc-550 uppercase tracking-widest block leading-none">Rider earnings</span>
                              <span className="text-sm sm:text-base font-mono font-black text-emerald-400 block mt-1">
                                Rs. {(historyGroupedByDate[selectedHistoryDate] || []).reduce((sum, o) => sum + (o.deliveryFee || 0), 0)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Order catalogs scroll block */}
                        <div className="space-y-4 max-h-[360px] overflow-y-auto scrollbar-none pr-1">
                          {(historyGroupedByDate[selectedHistoryDate] || []).map((order) => {
                            const completedTimeStr = order.deliveryCompletedAt?.seconds
                              ? new Date(order.deliveryCompletedAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : "N/A";

                            return (
                              <div key={order.id} className="bg-zinc-950 border border-zinc-850 p-4 sm:p-5 rounded-2xl space-y-3 shadow-sm text-zinc-100">
                                {/* metadata */}
                                <div className="flex justify-between items-start border-b border-zinc-850 pb-2.5 gap-2 text-xs">
                                  <div>
                                    <span className="text-[#D70F64] font-black uppercase text-[9px] tracking-wider block">ID: dadu-{order.id.substring(0, 8)}</span>
                                    <h5 className="font-extrabold text-zinc-200 mt-1">Buyer: {order.userName}</h5>
                                  </div>
                                  <div className="text-right font-mono">
                                    <span className="text-[9px] text-zinc-550 uppercase block">Delivered At</span>
                                    <span className="font-bold text-zinc-200 block mt-0.5">{completedTimeStr}</span>
                                  </div>
                                </div>

                                {/* items */}
                                <div className="space-y-1.5">
                                  {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-[11px] font-semibold text-zinc-400">
                                      <span>
                                        {item.name} <span className="text-[#D70F64] font-bold">×{item.quantity}</span>
                                      </span>
                                      <span className="font-mono text-zinc-300">Rs. {item.price * item.quantity}</span>
                                    </div>
                                  ))}
                                </div>

                                {/* address & diagnostics info */}
                                <div className="text-[11px] text-zinc-400 font-semibold border-t border-zinc-900 pt-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                  <span className="truncate max-w-xs text-zinc-500">📍 Destination: {order.userAddress}</span>
                                  <span className="text-emerald-400 font-bold self-end sm:self-auto">Rider Fee: Rs. {order.deliveryFee}</span>
                                </div>

                              </div>
                            );
                          })}
                        </div>

                      </div>
                    ) : (
                      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-10 sm:p-16 text-center space-y-2 text-zinc-500 shadow-sm leading-normal">
                        <span className="text-3xl block">📋</span>
                        <p className="text-xs font-black uppercase text-zinc-500 tracking-widest mt-1">Please select a catalog date</p>
                        <p className="text-[10.5px] mt-0.5 font-medium text-zinc-600 max-w-xs mx-auto">Select any of the delivery dates in the left layout selector to review specific shipment items, times, and earnings.</p>
                      </div>
                    )}
                  </div>

                </div>
              )}

            </section>

          </div>
        )}

      </main>

      {/* Footer support credits */}
      <footer className="bg-zinc-900 border-t border-zinc-800 py-6 text-center text-[11px] font-black text-zinc-500 uppercase tracking-widest mt-auto">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p>© 2026 DADUFOOD Delivery Services. All Rights Reserved.</p>
          <p className="text-zinc-400">
            Support helpline:{" "}
            <a 
              href="https://wa.me/923277004471" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-emerald-400 hover:underline hover:text-emerald-300 transition"
            >
              03277004471 (WhatsApp Support)
            </a>
          </p>
        </div>
      </footer>

    </div>
  );
}
