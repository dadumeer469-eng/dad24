import React, { useState, useEffect } from "react";
import { 
  collection, query, where, onSnapshot, doc, updateDoc, Timestamp, addDoc
} from "firebase/firestore";
import { db, handleFirestoreError } from "../firebase";
import { Order, UserProfile } from "../types";
import { 
  CheckCircle2, Compass, Coins, CalendarDays, TrendingUp, History, User, 
  MapPin, PhoneCall, LogOut, ArrowRight, ClipboardList, DollarSign, Clock, Check
} from "lucide-react";

interface RiderPanelProps {
  currentUser: UserProfile;
  onLogout: () => void;
}

export default function RiderPanel({ currentUser, onLogout }: RiderPanelProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "history">("dashboard");
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [etaInputs, setEtaInputs] = useState<{ [orderId: string]: string }>({});

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

  // Real-time Driver GPS Live tracking update
  useEffect(() => {
    const riderActiveOrder = myOrders.find((o) => o.status === "accepted" || o.status === "preparing" || o.status === "out_for_delivery");
    if (!riderActiveOrder) return;
    if (!navigator.geolocation) {
      console.warn("Geolocation API offline/unsupported.");
      return;
    }

    const success = async (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      try {
        await updateDoc(doc(db, "orders", riderActiveOrder.id), {
          riderCoords: { latitude: lat, longitude: lng, lastUpdated: Date.now() }
        });
        await updateDoc(doc(db, "users", currentUser.uid), {
          riderCoords: { latitude: lat, longitude: lng, lastUpdated: Date.now() }
        });
      } catch (err) {
        console.error("Failed to commit rider coordinates:", err);
      }
    };

    const error = (err: GeolocationPositionError) => {
      console.warn("Rider background geolocation fail:", err.message);
    };

    const watchId = navigator.geolocation.watchPosition(success, error, {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 0
    });

    return () => navigator.geolocation.clearWatch(watchId);
  }, [myOrders, currentUser?.uid]);

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

  // Rider Action: Accept Order
  const handleAcceptOrder = async (orderId: string) => {
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

  // Find active accepted order for this rider if any
  const riderActiveOrder = myOrders.find((o) => o.status === "accepted" || o.status === "preparing" || o.status === "out_for_delivery");

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
        <div className="max-w-7xl mx-auto px-4 py-4.5 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-2.5">
            <div className="bg-[#FF5C00] text-zinc-950 p-2 rounded-2xl shadow-md">
              <Compass className="w-6 h-6 animate-spin-slow text-zinc-950 shrink-0" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-black tracking-tight text-white uppercase">Dadu24 Rider Gate</h1>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full uppercase">
                  Active Duty
                </span>
              </div>
              <p className="text-[11px] text-[#FF5C00] font-bold mt-0.5">Logged in as {currentUser.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                activeTab === "dashboard"
                  ? "bg-[#FF5C00] text-zinc-950"
                  : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              🚚 Dashboard
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                activeTab === "history"
                  ? "bg-[#FF5C00] text-zinc-950"
                  : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              📚 history & catalog
            </button>
            
            <span className="text-zinc-805 mx-1">|</span>

            <button
              onClick={onLogout}
              className="bg-zinc-950 text-red-400 hover:text-red-300 border border-zinc-800 p-2 rounded-xl transition cursor-pointer"
              title="Sign Out rider profile"
            >
              <LogOut className="w-4 h-4 shrink-0" />
            </button>
          </div>

        </div>
      </header>

      {/* Main Panel views layout */}
      <main className="max-w-7xl mx-auto px-4 py-8 flex-grow w-full space-y-8">
        
        {activeTab === "dashboard" && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Continuous Loud Alarm status indicator */}
            {availableOrders.length > 0 && (
              <div className="bg-red-950/40 border border-red-900/40 p-5 rounded-3.5xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl pointer-events-none -mt-8 -mr-8 bg-red-500/10"></div>
                <div className="flex items-center gap-3 text-center md:text-left relative z-10">
                  <span className="text-2xl animate-bounce shrink-0">🚨</span>
                  <div>
                    <span className="text-xs font-black uppercase tracking-widest text-[#FF5C00] block">New Dispatch Alert Siren Active</span>
                    <span className="text-xs text-zinc-300 font-semibold block mt-0.5">
                      {availableOrders.length} unassigned order{availableOrders.length !== 1 ? "s" : ""} waiting in queue! Accept before someone else does.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsMuted(prev => !prev)}
                  className={`py-2.5 px-6 rounded-xl text-xs font-black uppercase tracking-wider transition shrink-0 cursor-pointer ${
                    isMuted
                      ? "bg-zinc-805 hover:bg-zinc-750 text-zinc-400 border border-zinc-700"
                      : "bg-[#FF5C00] hover:bg-[#d44d00] text-zinc-950 font-black shadow-md shadow-[#FF5C00]/20"
                  }`}
                >
                  {isMuted ? "🔇 Unmute Alarm Siren" : "🔊 Mute Alarm Tone"}
                </button>
              </div>
            )}

            {/* 1. Analytics Widgets Grid */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3.5xl relative overflow-hidden flex flex-col justify-between shadow-sm">
                <div className="absolute top-0 right-0 p-3 text-[#FF5C00] opacity-10">
                  <ClipboardList className="w-16 h-16" />
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest block">Today's Orders</span>
                  <p className="text-3xl font-black text-white mt-1.5">{stats.todayCount}</p>
                </div>
                <div className="border-t border-zinc-850 pt-2 flex items-center gap-1.5 text-[10.5px] text-emerald-450 mt-4.5 font-bold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Completed Today</span>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3.5xl relative overflow-hidden flex flex-col justify-between shadow-sm">
                <div className="absolute top-0 right-0 p-3 text-emerald-500 opacity-10">
                  <Coins className="w-16 h-16" />
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest block">Today's Earnings</span>
                  <p className="text-3xl font-black text-white mt-1.5">Rs. {stats.todayEarnings}</p>
                </div>
                <div className="border-t border-zinc-850 pt-2 flex items-center gap-1.5 text-[10.5px] text-amber-500 mt-4.5 font-bold">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Pure Rider Fees</span>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3.5xl relative overflow-hidden flex flex-col justify-between shadow-sm">
                <div className="absolute top-0 right-0 p-3 text-purple-550 opacity-10">
                  <CalendarDays className="w-16 h-16" />
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest block">This Month's Orders</span>
                  <p className="text-3xl font-black text-white mt-1.5">{stats.thisMonthCount}</p>
                </div>
                <div className="border-t border-zinc-850 pt-2 flex items-center gap-1.5 text-[10.5px] text-[#FF5C00] mt-4.5 font-bold">
                  <Check className="w-3.5 h-3.5" />
                  <span>Monthly Total</span>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3.5xl relative overflow-hidden flex flex-col justify-between shadow-sm">
                <div className="absolute top-0 right-0 p-3 text-amber-500 opacity-10">
                  <TrendingUp className="w-16 h-16" />
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest block">This Month's Earnings</span>
                  <p className="text-3xl font-black text-white mt-1.5">Rs. {stats.thisMonthEarnings}</p>
                </div>
                <div className="border-t border-zinc-850 pt-2 flex items-center gap-1.5 text-[10.5px] text-emerald-450 mt-4.5 font-bold">
                  <Coins className="w-3.5 h-3.5" />
                  <span>Accumulated Earnings</span>
                </div>
              </div>

            </section>

            {/* 2. Active Order Pipeline & Available Orders Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left Column: Active Order Assignment */}
              <section className="space-y-5">
                <h2 className="text-sm font-black uppercase tracking-widest text-[#FF5C00] border-b border-zinc-800 pb-2">
                  🛡️ Active Order Shipment
                </h2>

                {riderActiveOrder ? (
                  <div className="bg-zinc-900 border-2 border-[#FF5C00]/40 rounded-3.5xl p-6 space-y-6 shadow-xl relative overflow-hidden animate-fade-in text-zinc-100">
                    <div className="absolute top-0 right-0 bg-[#FF5C00] text-zinc-950 font-black tracking-widest text-[9.5px] py-1 px-4 rounded-bl-2xl uppercase">
                      In-Progress
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-[#FF5C00] font-black uppercase tracking-wider block">Currently Delivering</span>
                      <h3 className="text-base font-black">
                        Delivery ID: <span className="font-mono text-zinc-400">dadu-{riderActiveOrder.id.substring(0, 8)}</span>
                      </h3>
                      <p className="text-xs text-zinc-400 font-semibold">Accepted at: {riderActiveOrder.createdAt?.seconds ? new Date(riderActiveOrder.createdAt.seconds * 1000).toLocaleString() : "Just now"}</p>
                    </div>

                    {/* Customer Logistics details */}
                    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-4 font-medium text-xs">
                      <div className="flex items-start gap-3">
                        <User className="w-4 h-4 text-[#FF5C00] shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] uppercase text-zinc-550 font-black tracking-wider block">Customer Name</span>
                          <span className="text-sm font-black text-zinc-100 block mt-0.5">{riderActiveOrder.userName}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-[#FF5C00] shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] uppercase text-zinc-550 font-black tracking-wider block">Delivery Destination</span>
                          <p className="text-xs text-zinc-305 font-bold leading-relaxed mt-0.5">{riderActiveOrder.userAddress}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 border-t border-zinc-900 pt-3">
                        <PhoneCall className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] uppercase text-zinc-550 font-black tracking-wider block">Call Customer</span>
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
                      <div className="bg-emerald-950/20 border border-emerald-900/40 p-4.5 rounded-2xl flex flex-col gap-2 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>
                        <span className="text-[9.5px] text-emerald-400 font-extrabold uppercase tracking-widest block flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                          🎯 Pinpoint Delivery GPS coordinates provided!
                        </span>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${riderActiveOrder.userCoords.latitude},${riderActiveOrder.userCoords.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl text-center shadow-md flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <Compass className="w-4 h-4 animate-spin shrink-0" style={{ animationDuration: "12s" }} />
                          Navigate Doorstep on Google Maps 🗺️
                        </a>
                      </div>
                    )}

                    {/* Order contents summary */}
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-black text-zinc-450 uppercase block tracking-wider">Package Items:</span>
                      <div className="max-h-36 overflow-y-auto space-y-1.5 scrollbar-none pr-1">
                        {riderActiveOrder.items.map((item, idx) => (
                          <div key={idx} className="bg-zinc-950/40 border border-zinc-850 p-2.5 rounded-xl flex items-center justify-between text-xs font-semibold">
                            <span className="text-zinc-200">
                              {item.name} <span className="text-[#FF5C00] font-black">×{item.quantity}</span>
                            </span>
                            <span className="text-zinc-400 font-mono">Rs. {item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Dynamic ETA settings */}
                    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4.5 space-y-3.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[#FF5C00] tracking-wider">
                        <Clock className="w-3.5 h-3.5 text-orange-500 animate-pulse" /> Set Delivery/Arrival Time (ETA)
                      </div>
                      <p className="text-[10px] text-zinc-400 font-semibold leading-relaxed">
                        Let the customer know when they can expect their food/repair arrival! Updates the live map dashboard instantly.
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="e.g. 15 mins, 25 mins, 9:30 PM"
                          value={etaInputs[riderActiveOrder.id] !== undefined ? etaInputs[riderActiveOrder.id] : (riderActiveOrder.eta || "")}
                          onChange={(e) => setEtaInputs({ ...etaInputs, [riderActiveOrder.id]: e.target.value })}
                          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[#FF5C00] transition"
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
                              });
                              alert("⏱️ Delivery ETA updated & synchronized with customer profile!");
                            } catch (err: any) {
                              alert("Failed to update ETA: " + err.message);
                            }
                          }}
                          className="bg-[#FF5C00] hover:bg-[#d44d00] text-zinc-950 font-black text-xs uppercase px-4 py-2 rounded-xl transition cursor-pointer active:scale-95"
                        >
                          Update Time
                        </button>
                      </div>
                    </div>

                    {/* Totals panel */}
                    <div className="grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4 text-xs font-black">
                      <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-850">
                        <span className="text-[9px] text-zinc-500 uppercase tracking-wider block">Total bill</span>
                        <span className="text-base text-zinc-200">Rs. {riderActiveOrder.grandTotal}</span>
                      </div>
                      <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-850">
                        <span className="text-[9px] text-zinc-500 uppercase tracking-wider block">payment Mode</span>
                        <span className="text-base text-emerald-450 uppercase">{riderActiveOrder.paymentMethod}</span>
                      </div>
                    </div>

                    {/* Completion Action Button */}
                    <button
                      onClick={() => handleMarkAsDelivered(riderActiveOrder.id)}
                      disabled={loadingActionId === riderActiveOrder.id}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-[#121212] font-black py-4.5 rounded-2xl transition shadow-lg text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
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

                  </div>
                ) : (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-3.5xl p-10 text-center space-y-3.5 shadow-sm text-zinc-400">
                    <span className="text-4xl block">📦</span>
                    <span className="text-xs font-black uppercase text-zinc-450 tracking-wider">No active shipment selected</span>
                    <p className="text-[11px] text-zinc-500 font-medium max-w-xs mx-auto leading-normal">
                      Scan the available live orders lists in the next panel, then tap "Accept Delivery" to claim your shipment.
                    </p>
                  </div>
                )}
              </section>

              {/* Right Column: Available orders waiting for drivers */}
              <section className="space-y-5">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <h2 className="text-sm font-black uppercase tracking-widest text-[#FF5C00]">
                    🔔 Available Food Shipments ({availableOrders.length})
                  </h2>
                  <span className="text-[9px] bg-red-500/10 text-red-400 py-0.5 px-2 rounded-full font-black uppercase animate-pulse">
                    On-Screen Live Check
                  </span>
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto scrollbar-none pr-1">
                  {availableOrders.length === 0 ? (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3.5xl p-10 text-center space-y-3 shadow-sm text-zinc-500">
                      <span className="text-3xl block">⏳</span>
                      <p className="text-xs font-black uppercase text-zinc-450 tracking-widest">No available orders currently</p>
                      <p className="text-[10.5px] mt-1 text-zinc-500 font-semibold">We will alert you instantly with sound chime when buyers place orders!</p>
                    </div>
                  ) : (
                    availableOrders.map((order) => {
                      const isDisabled = !!riderActiveOrder || loadingActionId !== null;
                      return (
                        <div 
                          key={order.id} 
                          className="bg-zinc-900 border border-zinc-800 rounded-2.5xl p-5 hover:border-[#FF5C00]/40 transition space-y-4 shadow-xs relative text-zinc-100 group"
                        >
                          {/* Order metadata header */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[9px] bg-zinc-950 border border-zinc-800 py-1 px-2.5 rounded text-zinc-450 font-black tracking-wider uppercase block w-max">
                                Rs. {order.deliveryFee} Rider Fee
                              </span>
                              <h4 className="font-extrabold text-sm mt-2 text-zinc-200">
                                Dadu Order: <span className="font-mono text-xs text-[#FF5C00]">dadu-{order.id.substring(0, 6)}</span>
                              </h4>
                            </div>
                            <span className="text-[10.5px] text-zinc-500 font-mono font-bold">
                              {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "New"}
                            </span>
                          </div>

                          {/* Order location and timing */}
                          <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-850 space-y-1.5 text-[11px] font-semibold text-zinc-300">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[#FF5C00]">📍 Destination:</span>
                              <span className="truncate max-w-[220px]">{order.userAddress}</span>
                            </div>
                            <div className="flex items-center gap-1.5 justify-between">
                              <span>Items total: Rs. {order.totalPrice}</span>
                              <span className="text-amber-500">Payment: COD</span>
                            </div>
                          </div>

                          {/* Accept Action Button */}
                          <button
                            onClick={() => handleAcceptOrder(order.id)}
                            disabled={isDisabled}
                            className={`w-full py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer border ${
                              isDisabled
                                ? "bg-zinc-950 text-zinc-600 border-zinc-850 cursor-not-allowed"
                                : "bg-gradient-to-r from-[#FF5C00] to-orange-600 text-zinc-950 hover:from-orange-500 hover:to-orange-600 border-[#FF5C00] shadow-md shadow-orange-500/10"
                            }`}
                          >
                            {loadingActionId === order.id ? (
                              "Accepting package..."
                            ) : riderActiveOrder ? (
                              "Deliver active package first"
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
          <div className="space-y-8 animate-fade-in text-zinc-100">
            
            <section className="bg-zinc-900 border border-zinc-800 rounded-3.5xl p-6 space-y-6 shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-zinc-800 pb-4">
                <History className="w-5 h-5 text-[#FF5C00]" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-[#FF5C00]">Past Delivered Catalog</h3>
                  <p className="text-[11px] text-zinc-400 font-semibold leading-relaxed">Grouped by delivery sequence complete dates. Select a date to view full catalog breakdown.</p>
                </div>
              </div>

              {sortedDates.length === 0 ? (
                <div className="text-center p-12 text-zinc-500 space-y-2">
                  <span className="text-3xl block">📚</span>
                  <p className="text-xs font-black uppercase text-zinc-450 tracking-wider">No delivered package history yet</p>
                  <p className="text-[10.5px] text-zinc-550 font-semibold leading-tight">Complete your current package deliveries inside the main dashboard panel to register logs.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  
                  {/* Left: Interactive list of Calendar Dates */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-zinc-450 uppercase tracking-widest block border-b border-zinc-800 pb-1.5">Select Catalog Date</span>
                    <div className="space-y-2 max-h-[360px] overflow-y-auto scrollbar-none">
                      {sortedDates.map((dateKey) => {
                        const dayOrders = historyGroupedByDate[dateKey] || [];
                        const dayEarnings = dayOrders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
                        const isSelected = selectedHistoryDate === dateKey;

                        return (
                          <button
                            key={dateKey}
                            onClick={() => setSelectedHistoryDate(dateKey)}
                            className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between gap-3 text-xs cursor-pointer ${
                              isSelected
                                ? "bg-[#FF5C00] text-zinc-950 border-[#FF5C00]"
                                : "bg-zinc-950 hover:bg-zinc-850 text-zinc-330 border-zinc-800"
                            }`}
                          >
                            <div>
                              <span className={`font-black block uppercase tracking-wide ${isSelected ? "text-zinc-950" : "text-zinc-100"}`}>
                                {formatNiceDate(dateKey)}
                              </span>
                              <span className={`text-[10px] font-bold block mt-0.5 ${isSelected ? "text-zinc-850" : "text-zinc-500"}`}>
                                {dayOrders.length} Shipments Delivered
                              </span>
                            </div>
                            <span className={`font-mono font-black text-sm block ${isSelected ? "text-zinc-950" : "text-emerald-450"}`}>
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
                        <div className="bg-zinc-950 border border-zinc-800 rounded-2.5xl p-4.5 flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-[#FF5C00] font-black block">Log catalog details for</span>
                            <h4 className="font-extrabold text-sm text-zinc-150 mt-1">{formatNiceDate(selectedHistoryDate)}</h4>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <span className="text-[9px] text-zinc-500 uppercase tracking-widest block leading-none">Completed</span>
                              <span className="text-sm font-black text-zinc-100 block mt-1">{(historyGroupedByDate[selectedHistoryDate] || []).length} Orders</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] text-zinc-500 uppercase tracking-widest block leading-none">Rider earnings</span>
                              <span className="text-base font-mono font-black text-emerald-450 block mt-1">
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
                              <div key={order.id} className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl space-y-4 shadow-sm text-zinc-105">
                                {/* metadata */}
                                <div className="flex justify-between items-start border-b border-zinc-850 pb-2.5 gap-2 text-xs">
                                  <div>
                                    <span className="text-[#FF5C00] font-black uppercase text-[9px] tracking-wider block">ID: dadu-{order.id.substring(0, 8)}</span>
                                    <h5 className="font-extrabold text-zinc-200 mt-1">Buyer: {order.userName}</h5>
                                  </div>
                                  <div className="text-right font-mono">
                                    <span className="text-[10px] text-zinc-500 uppercase block">Delivered At</span>
                                    <span className="font-bold text-zinc-200 block mt-0.5">{completedTimeStr}</span>
                                  </div>
                                </div>

                                {/* items */}
                                <div className="space-y-1.5">
                                  {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-[11px] font-semibold text-zinc-400">
                                      <span>
                                        {item.name} <span className="text-[#FF5C00] font-bold">×{item.quantity}</span>
                                      </span>
                                      <span className="font-mono">Rs. {item.price * item.quantity}</span>
                                    </div>
                                  ))}
                                </div>

                                {/* address & diagnostics info */}
                                <div className="text-[11px] text-zinc-400 font-semibold border-t border-zinc-900 pt-2.5 flex items-center justify-between gap-3">
                                  <span className="truncate max-w-[200px] text-zinc-500">📍 Destination: {order.userAddress}</span>
                                  <span className="text-emerald-450 font-bold justify-end">Rider Fee: Rs. {order.deliveryFee}</span>
                                </div>

                              </div>
                            );
                          })}
                        </div>

                      </div>
                    ) : (
                      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-16 text-center space-y-2 text-zinc-500 shadow-sm leading-normal">
                        <span className="text-3xl block">📋</span>
                        <p className="text-xs font-black uppercase text-zinc-450 tracking-widest mt-1">Please select a catalog date</p>
                        <p className="text-[10.5px] mt-0.5 font-medium text-zinc-500 max-w-xs mx-auto">Select any of the delivery dates in the left layout selector to review specific shipment items, times, and earnings.</p>
                      </div>
                    )}
                  </div>

                </div>
              )}

            </section>

          </div>
        )}

      </main>

    </div>
  );
}
