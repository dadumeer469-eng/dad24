import React, { useState, useEffect } from "react";
import OrderReceiptModal from "./OrderReceiptModal";
import { 
  collection, query, where, onSnapshot, doc, updateDoc, Timestamp, addDoc
} from "firebase/firestore";
import { db, handleFirestoreError } from "../firebase";
import { Order, UserProfile } from "../types";
import { awardLoyaltyCoinsForOrder, creditRiderCoinsForOrder } from "../lib/loyalty";
import { 
  CheckCircle2, Compass, Coins, CalendarDays, TrendingUp, History, User, 
  MapPin, PhoneCall, LogOut, ArrowRight, ClipboardList, DollarSign, Clock, Check, Store, XCircle, Star,
  Ticket, Sparkles, Wallet, Banknote, ShieldCheck, Info
} from "lucide-react";
import OrderChat from "./OrderChat";
import { useRiderLocationTracker } from "../lib/riderLocationTracker";

interface RiderPanelProps {
  currentUser: UserProfile;
  onLogout: () => void;
  deliverySettings?: any;
}

export default function RiderPanel({ currentUser, onLogout, deliverySettings }: RiderPanelProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "history" | "performance">("dashboard");
  const [timeframe, setTimeframe] = useState<"1day" | "7days" | "30days" | "60days" | "all">("all");
  const [riderReceiptOrder, setRiderReceiptOrder] = useState<any | null>(null);
  const [isRiderReceiptModalOpen, setIsRiderReceiptModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (currentUser.isDutyOn !== undefined) return currentUser.isDutyOn;
    if (currentUser.isOnline !== undefined) return currentUser.isOnline;
    const saved = localStorage.getItem(`rider_online_${currentUser.uid}`);
    return saved !== "false";
  });

  // Sync duty status with Firestore on mount and whenever it changes
  useEffect(() => {
    const syncDutyToDb = async () => {
      try {
        const riderRef = doc(db, "users", currentUser.uid);
        await updateDoc(riderRef, {
          isDutyOn: isOnline,
          isOnline: isOnline,
          dutyStatus: isOnline ? "online" : "offline",
          lastDutyUpdated: new Date()
        });
      } catch (err) {
        console.warn("Could not sync rider duty status to Firestore:", err);
      }
    };
    syncDutyToDb();
  }, [isOnline, currentUser.uid]);

  const handleToggleOnline = async () => {
    const next = !isOnline;
    setIsOnline(next);
    localStorage.setItem(`rider_online_${currentUser.uid}`, String(next));
    try {
      const riderRef = doc(db, "users", currentUser.uid);
      await updateDoc(riderRef, {
        isDutyOn: next,
        isOnline: next,
        dutyStatus: next ? "online" : "offline",
        lastDutyUpdated: new Date()
      });
    } catch (err) {
      console.error("Failed to update rider duty in Firestore:", err);
    }
  };
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [etaInputs, setEtaInputs] = useState<{ [orderId: string]: string }>({});
  const [autoPinnedOrderId, setAutoPinnedOrderId] = useState<string>("");

  // Persistent AudioContext ref for mobile browsers
  const audioCtxRef = React.useRef<AudioContext | null>(null);

  // Helper to get or unlock AudioContext on mobile touch/click
  const getAudioContext = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioCtxRef.current = new AudioCtx();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
      return audioCtxRef.current;
    } catch (e) {
      return null;
    }
  };

  // Auto-unlock audio on user interaction
  useEffect(() => {
    const unlockAudio = () => {
      getAudioContext();
    };
    window.addEventListener("click", unlockAudio);
    window.addEventListener("touchstart", unlockAudio);
    return () => {
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    };
  }, []);

  // Helper to trigger mobile device physical vibration
  const triggerVibration = () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([400, 150, 400, 150, 400]);
      } catch (e) {
        // Ignored
      }
    }
  };

  // High-Volume Dual-Tone Ringtone Generator for New Orders
  const playContinuousAlarm = () => {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      
      // Dual-oscillator high-pitch dispatcher ring tone (trin-trin!)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sawtooth";
      osc2.type = "square"; // Piercing tone for mobile phone speakers

      // Rapid dual-tone pitch sweep (Ringtone effect)
      osc1.frequency.setValueAtTime(950, now);
      osc1.frequency.setValueAtTime(1350, now + 0.12);
      osc1.frequency.setValueAtTime(950, now + 0.25);
      osc1.frequency.setValueAtTime(1350, now + 0.38);

      osc2.frequency.setValueAtTime(475, now);
      osc2.frequency.setValueAtTime(675, now + 0.12);
      osc2.frequency.setValueAtTime(475, now + 0.25);
      osc2.frequency.setValueAtTime(675, now + 0.38);

      // High volume gain (0.95 - maximum loudness)
      gain.gain.setValueAtTime(0.95, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.65);
      osc2.stop(now + 0.65);
    } catch (e) {
      console.error("Audio ringtone error:", e);
    }
  };

  // Continuous loop ringtone siren effect for available pending orders
  useEffect(() => {
    if (availableOrders.length === 0 || !isOnline) return;

    playContinuousAlarm();
    triggerVibration();

    const interval = setInterval(() => {
      playContinuousAlarm();
      triggerVibration();
    }, 1400);

    return () => clearInterval(interval);
  }, [availableOrders.length, isMuted, isOnline]);

  // Get active accepted orders
  const riderActiveOrders = myOrders.filter((o) => o.status === "accepted" || o.status === "preparing" || o.status === "out_for_delivery");
  const [focusedActiveOrderId, setFocusedActiveOrderId] = useState<string | null>(null);
  const [showLiveChat, setShowLiveChat] = useState(false);
  const [riderUnreadCount, setRiderUnreadCount] = useState(0);

  // Listen to unread messages for rider's active order
  useEffect(() => {
    const activeOrderForUnread = riderActiveOrders.find(o => o.id === focusedActiveOrderId) || riderActiveOrders[0];
    if (!activeOrderForUnread?.id || !currentUser?.uid) return;
    const messagesRef = collection(db, "orders", activeOrderForUnread.id, "messages");
    const unsubscribe = onSnapshot(messagesRef, (snapshot) => {
      let unread = 0;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.senderId !== currentUser.uid && !data.isRead) {
          unread++;
        }
      });
      setRiderUnreadCount(unread);
    }, (err) => console.error("Rider unread listener error:", err));

    return () => unsubscribe();
  }, [riderActiveOrders, focusedActiveOrderId, currentUser?.uid]);

  // Focused active order reference
  const focusedActiveOrder = riderActiveOrders.find((o) => o.id === focusedActiveOrderId) || riderActiveOrders[0];

  // Smart Throttled Geolocation Watcher for Rider (Pushes to /live_orders/{orderId}/rider_location)
  const trackedRiderCoords = useRiderLocationTracker(
    focusedActiveOrder?.id,
    focusedActiveOrder?.status
  );

  // Live rider coordinates for distance calculation
  const [liveRiderCoords, setLiveRiderCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (trackedRiderCoords) {
      setLiveRiderCoords(trackedRiderCoords);
    }
  }, [trackedRiderCoords]);

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

  // 1. Subscribe to Available Orders (unaccepted status === "pending" or "placed" or "confirmed" for food deliveries)
  useEffect(() => {
    // Only food/grocery deliveries are routed to standard riders
    const q = query(
      collection(db, "orders"), 
      where("status", "in", ["pending", "placed", "confirmed"])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Order;
        if (data.orderType !== "service" && !data.riderId) {
          list.push({ ...data, id: doc.id });
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
  const deliveredOrders = myOrders.filter((o) => {
    if (o.status !== "delivered") return false;
    if (o.riderSettled) return false;
    
    // Fallback date comparison
    if (currentUser?.lastSettledAt) {
      let orderTime = 0;
      if (o.deliveryCompletedAt?.seconds) {
        orderTime = o.deliveryCompletedAt.seconds * 1000;
      } else if (o.deliveryCompletedAt instanceof Date) {
        orderTime = o.deliveryCompletedAt.getTime();
      } else if (typeof o.deliveryCompletedAt === "number") {
        orderTime = o.deliveryCompletedAt;
      } else if (o.createdAt?.seconds) {
        orderTime = o.createdAt.seconds * 1000;
      } else if (o.createdAt instanceof Date) {
        orderTime = o.createdAt.getTime();
      } else if (typeof o.createdAt === "number") {
        orderTime = o.createdAt;
      } else if (typeof o.createdAt === "string") {
        orderTime = Date.parse(o.createdAt);
      }
      
      let settledTime = 0;
      if (currentUser.lastSettledAt.seconds) {
        settledTime = currentUser.lastSettledAt.seconds * 1000;
      } else if (currentUser.lastSettledAt instanceof Date) {
        settledTime = currentUser.lastSettledAt.getTime();
      } else if (typeof currentUser.lastSettledAt === "number") {
        settledTime = currentUser.lastSettledAt;
      } else if (typeof currentUser.lastSettledAt === "string") {
        settledTime = Date.parse(currentUser.lastSettledAt);
      }
      
      if (orderTime <= settledTime) {
        return false;
      }
    }
    return true;
  });

  const todayStr = new Date().toDateString();
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Metrics calculating functions (Delivery fee + Voucher & Coin discount subsidies)
  const stats = deliveredOrders.reduce(
    (acc, order) => {
      const compDate = parseCompletedDate(order);
      if (!compDate) return acc;

      const charge = order.deliveryFee || 0;
      const voucherSubsidy = order.voucher?.discountAmount || 0;
      const coinSubsidy = order.coinsUsed || 0;
      const totalOrderSubsidy = voucherSubsidy + coinSubsidy;
      const totalOrderEarning = charge + totalOrderSubsidy;

      const isToday = compDate.toDateString() === todayStr;
      const isThisMonth = compDate.getMonth() === currentMonth && compDate.getFullYear() === currentYear;

      if (isToday) {
        acc.todayCount += 1;
        acc.todayDeliveryFees += charge;
        acc.todayDiscountSubsidies += totalOrderSubsidy;
        acc.todayEarnings += totalOrderEarning;
      }
      if (isThisMonth) {
        acc.thisMonthCount += 1;
        acc.thisMonthDeliveryFees += charge;
        acc.thisMonthDiscountSubsidies += totalOrderSubsidy;
        acc.thisMonthEarnings += totalOrderEarning;
      }
      return acc;
    },
    { 
      todayCount: 0, 
      todayDeliveryFees: 0,
      todayDiscountSubsidies: 0,
      todayEarnings: 0, 
      thisMonthCount: 0, 
      thisMonthDeliveryFees: 0,
      thisMonthDiscountSubsidies: 0,
      thisMonthEarnings: 0 
    }
  );

  // Filtered statistics for dashboard based on selected timeframe
  const filteredRiderOrders = deliveredOrders.filter((o) => {
    const compDate = parseCompletedDate(o);
    if (!compDate) return false;
    const orderTime = compDate.getTime();
    
    if (timeframe === "1day") {
      const todayStart = new Date().setHours(0, 0, 0, 0);
      return orderTime >= todayStart;
    } else if (timeframe === "7days") {
      const limit = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return orderTime >= limit;
    } else if (timeframe === "30days") {
      const limit = Date.now() - 30 * 24 * 60 * 60 * 1000;
      return orderTime >= limit;
    } else if (timeframe === "60days") {
      const limit = Date.now() - 60 * 24 * 60 * 60 * 1000;
      return orderTime >= limit;
    }
    return true; // "all"
  });

  const filteredDeliveryFees = filteredRiderOrders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
  const filteredVoucherSubsidies = filteredRiderOrders.reduce((sum, o) => sum + (o.voucher?.discountAmount || 0), 0);
  const filteredCoinsSubsidies = filteredRiderOrders.reduce((sum, o) => sum + (o.coinsUsed || 0), 0);
  const filteredTotalSubsidies = filteredVoucherSubsidies + filteredCoinsSubsidies;
  const filteredRiderEarnings = filteredDeliveryFees + filteredTotalSubsidies;
  const filteredCustomerCash = filteredRiderOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);

  // Lifetime / Unsettled Subsidies for Rider
  const unsettledDeliveryFees = deliveredOrders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
  const unsettledVoucherSubsidies = deliveredOrders.reduce((sum, o) => sum + (o.voucher?.discountAmount || 0), 0);
  const unsettledCoinsSubsidies = deliveredOrders.reduce((sum, o) => sum + (o.coinsUsed || 0), 0);
  const unsettledTotalSubsidies = unsettledVoucherSubsidies + unsettledCoinsSubsidies;
  const unsettledTotalPayoutDue = unsettledDeliveryFees + unsettledTotalSubsidies;

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
      await awardLoyaltyCoinsForOrder(db, orderId);
      await creditRiderCoinsForOrder(db, orderId);
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
      
      {/* Ultra Clean Compact Header */}
      <header className="bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800/80 sticky top-0 z-40 px-3.5 sm:px-4 py-2 flex items-center justify-between shadow-sm">
        {/* Left: Clean Duty Switch */}
        <button
          onClick={handleToggleOnline}
          className={`py-1 px-3 rounded-full text-[10.5px] font-black tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 border ${
            isOnline
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-xs shadow-emerald-500/10"
              : "bg-zinc-950 text-zinc-400 border-zinc-800"
          }`}
          title="Tap to toggle Duty Status"
        >
          <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"}`}></span>
          <span>{isOnline ? "DUTY: ONLINE" : "DUTY: OFFLINE"}</span>
        </button>

        {/* Center: Rider Badge */}
        <div className="flex items-center gap-1.5 text-xs font-black text-white">
          <span className="text-pink-400 font-bold text-[11px] truncate max-w-[120px] sm:max-w-none">
            {currentUser.name}
          </span>
        </div>

        {/* Right: Small Logout Button */}
        <button
          onClick={onLogout}
          className="bg-zinc-950 text-zinc-400 hover:text-pink-400 border border-zinc-800 px-2.5 py-1 rounded-xl transition cursor-pointer active:scale-95 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider"
          title="Sign Out"
        >
          <LogOut className="w-3.5 h-3.5 text-pink-500 shrink-0" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </header>

      {/* Main Panel views layout */}
      <main className="max-w-7xl mx-auto px-4 py-5 sm:py-8 pb-24 md:pb-8 flex-grow w-full space-y-6 sm:space-y-8">
        
        {/* Deliveries & Jobs View */}
        {activeTab === "dashboard" && (
          <div className="space-y-6 sm:space-y-8 animate-fade-in">

            {/* Compact Rider Header Bar */}
            <div className="bg-zinc-900 border border-zinc-800 p-3.5 sm:p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-xl border border-emerald-500/20">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Today's Summary</span>
                  <p className="text-xs sm:text-sm font-black text-white">
                    Completed: <span className="text-pink-400">{stats.todayCount} Runs</span> | Earned: <span className="text-emerald-400">Rs. {stats.todayEarnings}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {availableOrders.length > 0 && (
                  <button
                    onClick={() => setIsMuted(prev => !prev)}
                    className="py-1.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider bg-pink-950/60 text-pink-300 border border-pink-800/60 hover:bg-pink-900/60 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{isMuted ? "🔇 Alarm Muted" : "🚨 Alarm Active"}</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveTab("performance")}
                  className="py-1.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition cursor-pointer"
                >
                  Earnings Details →
                </button>
              </div>
            </div>

            {/* Offline Duty Banner */}
            {!isOnline && (
              <div className="bg-zinc-900/90 border border-amber-500/30 p-5 sm:p-6 rounded-2xl text-center space-y-3 shadow-xl relative overflow-hidden">
                <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
                  <Compass className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-tight">Status is currently OFF DUTY</h3>
                  <p className="text-xs text-zinc-400 font-medium">
                    New delivery requests are paused. Go online to start receiving orders in Dadu city.
                  </p>
                </div>
                <button
                  onClick={handleToggleOnline}
                  className="py-2.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition transform active:scale-95 cursor-pointer inline-flex items-center gap-2"
                >
                  <span>🟢 Go Online Now</span>
                </button>
              </div>
            )}

            {/* New Order High-Volume Alarm Ringing Alert Banner */}
            {isOnline && availableOrders.length > 0 && (
              <div className="bg-gradient-to-r from-pink-950 via-[#D70F64]/40 to-pink-950 border-2 border-pink-500/70 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl text-white">
                <div className="flex items-center gap-3 text-center sm:text-left">
                  <span className="text-3xl animate-bounce">🚨</span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-pink-200 flex items-center gap-2 justify-center sm:justify-start">
                      <span>NYA ORDER AAGAYA HAI! ({availableOrders.length} Waiting)</span>
                      <span className="bg-red-500 text-white font-black text-[9px] px-2 py-0.5 rounded-full animate-pulse">
                        RINGING
                      </span>
                    </h3>
                    <p className="text-[11px] text-zinc-300 font-semibold mt-0.5">
                      High volume dispatcher siren is active! Accept the order fast before someone else claims it.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                  <button
                    onClick={() => {
                      playContinuousAlarm();
                      triggerVibration();
                    }}
                    className="py-2 px-3 bg-zinc-900 border border-pink-500/50 rounded-xl text-[10px] font-black uppercase text-pink-300 hover:bg-zinc-800 transition active:scale-95 cursor-pointer"
                    title="Test or trigger loud sound tone"
                  >
                    🔊 Test Ring
                  </button>
                  <button
                    onClick={() => setIsMuted(prev => !prev)}
                    className="py-2 px-4 bg-[#D70F64] hover:bg-[#b00c50] text-white rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 cursor-pointer shadow-lg shadow-pink-500/30"
                  >
                    {isMuted ? "🔊 Unmute Ring" : "🔇 Stop Ringing"}
                  </button>
                </div>
              </div>
            )}
            
            {/* Active Order Pipeline & Available Orders Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              
              {/* Left Column: Active Order Assignment */}
              <section className="space-y-4 sm:space-y-5">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2 flex-wrap gap-2">
                  <h2 className="text-xs sm:text-sm font-black uppercase tracking-widest text-[#D70F64] flex items-center gap-2">
                    <span>🛵 Active Runs</span>
                    {riderActiveOrders.length > 0 && (
                      <span className="bg-[#D70F64] text-white font-black text-[10px] px-2 py-0.5 rounded-full">
                        {riderActiveOrders.length} Active
                      </span>
                    )}
                  </h2>
                  {riderActiveOrders.length > 0 && (
                    <span className="text-[9.5px] text-zinc-400 font-bold uppercase">
                      Max 3 orders concurrently
                    </span>
                  )}
                </div>

                {/* Multi-Run Selector (When 2+ Orders Accepted) */}
                {riderActiveOrders.length > 1 && (
                  <div className="bg-zinc-900 border-2 border-pink-500/40 p-3 sm:p-4 rounded-2xl space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-black uppercase tracking-wider text-pink-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        🚨 2 Active Orders Accepted — Tap to switch view:
                      </span>
                      <span className="text-[9px] font-mono text-zinc-400 font-bold">
                        {riderActiveOrders.length} Runs Total
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {riderActiveOrders.map((order, idx) => {
                        const isSelected = order.id === riderActiveOrder?.id;
                        return (
                          <button
                            key={order.id}
                            onClick={() => setFocusedActiveOrderId(order.id)}
                            className={`p-2.5 rounded-xl text-left border transition cursor-pointer active:scale-95 flex flex-col justify-between ${
                              isSelected
                                ? "bg-[#D70F64] border-[#D70F64] text-white shadow-md"
                                : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-pink-500/40"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-[10px] font-black uppercase tracking-wider">
                                RUN #{idx + 1}
                              </span>
                              <span className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                isSelected ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-400"
                              }`}>
                                {order.status === "out_for_delivery" ? "On the Way" : order.status}
                              </span>
                            </div>
                            <span className="text-xs font-black truncate block">
                              {order.userName}
                            </span>
                            <span className="text-[9.5px] font-mono opacity-80 mt-0.5 block">
                              Rs. {order.grandTotal}
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] bg-[#D70F64] text-white font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
                            {riderActiveOrders.length > 1 
                              ? `RUN #${riderActiveOrders.findIndex(o => o.id === riderActiveOrder.id) + 1} OF ${riderActiveOrders.length}` 
                              : "Active Run"}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono font-bold">
                            dadu-{riderActiveOrder.id.substring(0, 8)}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 font-semibold">
                          Accepted at: {riderActiveOrder.createdAt?.seconds ? new Date(riderActiveOrder.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                        </p>
                      </div>

                      <span className={`font-black text-[9.5px] py-1 px-3 rounded-full uppercase tracking-wider ${
                        riderActiveOrder.status === "out_for_delivery" ? "bg-sky-500/20 text-sky-400 border border-sky-500/30" :
                        riderActiveOrder.status === "preparing" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                        "bg-[#D70F64]/20 text-pink-300 border border-[#D70F64]/30"
                      }`}>
                        {riderActiveOrder.status === "out_for_delivery" ? "🛵 On the Way" :
                         riderActiveOrder.status === "preparing" ? "🍳 Preparing" : "📦 Accepted"}
                      </span>
                    </div>

                    {/* Prominent Cash Collection & Fee Callout Banner */}
                    <div className="bg-emerald-950/40 border border-emerald-500/30 p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-3 shadow-md">
                      <div>
                        <span className="text-[9px] uppercase tracking-widest font-black text-emerald-400 block">💵 Cash to Collect</span>
                        <span className="text-xl sm:text-2xl font-black text-emerald-300 font-mono">
                          Rs. {riderActiveOrder.grandTotal}
                        </span>
                        <span className="text-[9.5px] text-zinc-400 font-bold block mt-0.5 uppercase">
                          Payment: {riderActiveOrder.paymentMethod === "cod" ? "Cash on Delivery" : riderActiveOrder.paymentMethod}
                        </span>
                      </div>
                      <div className="text-right border-l border-emerald-800/50 pl-3">
                        <span className="text-[9px] uppercase tracking-widest font-black text-pink-400 block">🚲 Your Fee</span>
                        <span className="text-base sm:text-lg font-black text-pink-300 font-mono">
                          Rs. {riderActiveOrder.deliveryFee}
                        </span>
                        <span className="text-[9px] text-zinc-400 font-bold block mt-0.5">Pure Earnings</span>
                      </div>
                    </div>

                    {(() => {
                      const vDisc = riderActiveOrder.voucher?.discountAmount || 0;
                      const cDisc = riderActiveOrder.coinsUsed || 0;
                      const totalSubsidy = vDisc + cDisc;
                      if (totalSubsidy <= 0) return null;

                      return (
                        <div className="bg-gradient-to-r from-amber-950/70 via-zinc-900 to-amber-950/70 border border-amber-500/40 p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-3 shadow-md text-amber-200 animate-fadeIn">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 shrink-0">
                              {vDisc > 0 ? <Ticket className="w-5 h-5 animate-pulse" /> : <Coins className="w-5 h-5 animate-bounce" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-black uppercase tracking-wider block text-amber-300">
                                  {vDisc > 0 && cDisc > 0 
                                    ? `🎟️ Voucher (Rs. ${vDisc}) + 🪙 Coins (Rs. ${cDisc})`
                                    : vDisc > 0 
                                    ? `🎟️ Voucher Discount: Rs. ${vDisc}`
                                    : `🪙 Coin Discount: Rs. ${cDisc}`}
                                </span>
                                <span className="bg-amber-500/20 text-amber-300 text-[8.5px] px-2 py-0.5 rounded-full border border-amber-500/30 font-black uppercase">
                                  Admin Payable
                                </span>
                              </div>
                              <span className="text-[10px] text-amber-200/90 font-medium block mt-0.5 leading-snug">
                                Customer ne discount use kiya hai. Delivery hone par yeh <strong className="text-amber-300">Rs. {totalSubsidy}</strong> aapke Rider Panel mein add ho jayenge jo Admin settlement par aapko pay karega!
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="bg-amber-500 text-zinc-950 font-black text-[10px] px-2.5 py-1.5 rounded-lg uppercase block shadow-xs font-mono">
                              +Rs. {totalSubsidy} Subsidy
                            </span>
                            <span className="text-[8px] text-amber-400 font-bold block mt-1">Due to Rider</span>
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* Interactive Milestones Shipment Progress Pipeline */}
                    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3 animate-fadeIn">
                      <span className="text-[9.5px] font-black text-zinc-400 uppercase tracking-widest block pb-1 border-b border-zinc-900 flex items-center justify-between">
                        <span>⏱️ Delivery Progress</span>
                        <span className="text-[9px] text-pink-400 font-mono">Step {
                          riderActiveOrder.status === "accepted" ? "1/3" :
                          riderActiveOrder.status === "preparing" ? "2/3" : "3/3"
                        }</span>
                      </span>
                      <div className="relative flex items-center justify-between pt-3 pb-2">
                        {/* Connecting Line background */}
                        <div className="absolute left-6 right-6 h-1 bg-zinc-800 top-1/2 -translate-y-1/2 z-0"></div>
                        {/* Active connecting line fill */}
                        <div 
                          className="absolute left-6 h-1 bg-[#D70F64] top-1/2 -translate-y-1/2 z-0 transition-all duration-500"
                          style={{
                            width: 
                              riderActiveOrder.status === "accepted" ? "0%" :
                              riderActiveOrder.status === "preparing" ? "50%" : "100%"
                          }}
                        ></div>

                        {/* Step 1: Accepted */}
                        <div className="relative z-10 flex flex-col items-center">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black border ${
                              ["accepted", "preparing", "out_for_delivery", "delivered"].includes(riderActiveOrder.status)
                                ? "bg-[#D70F64] text-white border-[#D70F64] shadow-md shadow-pink-500/20"
                                : "bg-zinc-900 text-zinc-500 border-zinc-800"
                            }`}
                          >
                            📦
                          </div>
                          <span className="text-[9px] font-black text-zinc-300 mt-1.5 uppercase">Accepted</span>
                        </div>

                        {/* Step 2: Preparing */}
                        <div className="relative z-10 flex flex-col items-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (riderActiveOrder.status === "accepted") {
                                handleMarkAsPreparing(riderActiveOrder.id);
                              }
                            }}
                            disabled={loadingActionId !== null || riderActiveOrder.status !== "accepted"}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all border ${
                              ["preparing", "out_for_delivery", "delivered"].includes(riderActiveOrder.status)
                                ? "bg-[#D70F64] text-white border-[#D70F64] shadow-md shadow-pink-500/20 cursor-default"
                                : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-pink-500/40 cursor-pointer active:scale-90"
                            }`}
                            title="Tap to mark as Preparing"
                          >
                            🍳
                          </button>
                          <span className={`text-[9px] font-black mt-1.5 uppercase ${riderActiveOrder.status === 'preparing' ? 'text-amber-400 animate-pulse' : 'text-zinc-500'}`}>Preparing</span>
                        </div>

                        {/* Step 3: Out for Delivery */}
                        <div className="relative z-10 flex flex-col items-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (["accepted", "preparing"].includes(riderActiveOrder.status)) {
                                handleMarkAsOutForDelivery(riderActiveOrder.id);
                              }
                            }}
                            disabled={loadingActionId !== null || !["accepted", "preparing"].includes(riderActiveOrder.status)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all border ${
                              ["out_for_delivery", "delivered"].includes(riderActiveOrder.status)
                                ? "bg-[#D70F64] text-white border-[#D70F64] shadow-md shadow-pink-500/20 cursor-default"
                                : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-pink-500/40 cursor-pointer active:scale-90"
                            }`}
                            title="Tap to mark as Out for Delivery"
                          >
                            🛵
                          </button>
                          <span className={`text-[9px] font-black mt-1.5 uppercase ${riderActiveOrder.status === 'out_for_delivery' ? 'text-sky-400 animate-pulse' : 'text-zinc-500'}`}>On the Way</span>
                        </div>

                        {/* Step 4: Arrived / Delivered */}
                        <div className="relative z-10 flex flex-col items-center">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black border ${
                              riderActiveOrder.status === "delivered"
                                ? "bg-emerald-500 text-zinc-950 border-emerald-500 shadow-md shadow-emerald-500/20"
                                : "bg-zinc-900 text-zinc-500 border-zinc-800"
                            }`}
                          >
                            💵
                          </div>
                          <span className="text-[9px] font-black text-zinc-400 mt-1.5 uppercase">Delivered</span>
                        </div>

                      </div>
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

                      <div className="flex flex-col gap-2.5 pt-3 border-t border-zinc-900">
                        <span className="text-[10px] uppercase text-zinc-500 font-black tracking-wider block">Customer Communication</span>
                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full">
                          {riderActiveOrder.userPhone ? (
                            <a 
                              href={`tel:${riderActiveOrder.userPhone}`} 
                              className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-100 py-2 sm:py-2.5 px-2 rounded-xl transition text-center font-black text-[10.5px] sm:text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer truncate active:scale-95"
                            >
                              📞 Call
                            </a>
                          ) : (
                            <div className="bg-zinc-950/50 border border-zinc-800 text-zinc-600 py-2 sm:py-2.5 px-2 rounded-xl text-center font-black text-[10.5px] sm:text-xs flex items-center justify-center gap-1 opacity-50 cursor-not-allowed">
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
                            {riderUnreadCount > 0 && !showLiveChat && (
                              <span className="relative flex h-2.5 w-2.5 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-80"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 ring-2 ring-zinc-900"></span>
                              </span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRiderReceiptOrder(riderActiveOrder);
                              setIsRiderReceiptModalOpen(true);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 sm:py-2.5 px-2 rounded-xl transition text-center font-black text-[10.5px] sm:text-xs flex items-center justify-center gap-1 shadow-md cursor-pointer truncate active:scale-95 border border-emerald-500/30"
                          >
                            <span>🧾 Bill & WhatsApp</span>
                          </button>
                        </div>

                        {/* Quick Chat Templates for busy riders on wheels */}
                        <div className="mt-2.5 pt-2.5 border-t border-zinc-900/50 space-y-2">
                          <span className="text-[9px] uppercase text-zinc-500 font-black tracking-wider block flex items-center gap-1">
                            ⚡ One-Tap Quick Messages (Sends instantly on wheels)
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {[
                              { label: "On the way 🛵", text: "Assalam-o-Alaikum, order pick karliya hai, raste me hoon! 🛵" },
                              { label: "At Store waiting 🍳", text: "Bhai ready horaha hai order restaurant par, main counter par wait kar raha hoon. 🍳" },
                              { label: "Outside Doorstep 🏡", text: "Main aapke doorstep par pohanch gaya hoon, please receive karlein! 🏡" },
                              { label: "Delayed in traffic 🌧️", text: "Thora traffic/barish hai raste me, kindly 5-10 min wait kijiyega. JazakAllah! 🙏" }
                            ].map((tpl, tIdx) => (
                              <button
                                key={tIdx}
                                type="button"
                                onClick={async () => {
                                  try {
                                    const messagesRef = collection(db, "orders", riderActiveOrder.id, "messages");
                                    await addDoc(messagesRef, {
                                      senderId: currentUser.uid,
                                      senderName: currentUser.name || "Rider",
                                      senderRole: "rider",
                                      text: tpl.text,
                                      createdAt: Timestamp.now(),
                                      isRead: false
                                    });
                                    setShowLiveChat(true);
                                  } catch (err: any) {
                                    alert("Template sending failed: " + err.message);
                                  }
                                }}
                                className="bg-zinc-900/60 hover:bg-[#D70F64]/10 hover:text-pink-300 border border-zinc-800/80 hover:border-[#D70F64]/30 py-2 px-2.5 rounded-xl text-[10px] font-bold text-left transition cursor-pointer flex items-center justify-between gap-1 group active:scale-95"
                              >
                                <span className="text-[#D70F64] group-hover:text-pink-400 font-extrabold">{tpl.label}</span>
                                <span className="text-[9px] text-zinc-500 truncate max-w-[120px] sm:max-w-[160px]">{tpl.text}</span>
                              </button>
                            ))}
                          </div>
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
                            <div className="flex flex-col">
                              <span className="text-zinc-200 text-[11.5px] sm:text-xs">
                                {item.name} <span className="text-[#D70F64] font-black">×{item.quantity}</span>
                              </span>
                              {(item.selectedSize || item.selectedFlavor || (item.selectedAddOns && item.selectedAddOns.length > 0) || item.specialInstructions) && (
                                <div className="text-[9px] text-zinc-500 mt-1 space-y-0.5 font-medium leading-tight">
                                  {item.selectedSize && <div>Size: {item.selectedSize}</div>}
                                  {item.selectedFlavor && <div>Flavor: {item.selectedFlavor}</div>}
                                  {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                                    <div>Add-ons: {Object.entries(item.selectedAddOns.reduce((acc, curr) => { acc[curr.name] = (acc[curr.name] || 0) + 1; return acc; }, {} as Record<string, number>)).map(([name, count]) => `${Number(count) * (item.quantity || 1)}x ${name}`).join(', ')}</div>
                                  )}
                                  {item.specialInstructions && <div className="italic text-zinc-400">Note: {item.specialInstructions}</div>}
                                </div>
                              )}
                            </div>
                            <span className="text-zinc-400 font-mono">Rs. {item.price * item.quantity}</span>
                          </div>
                        ))}
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
                      {/* Quick ETA presets */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {["10 min", "15 min", "20 min", "25 min", "30 min", "45 min", "1 hour"].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setEtaInputs({ ...etaInputs, [riderActiveOrder.id]: preset })}
                            className="bg-zinc-900 hover:bg-[#D70F64]/20 border border-zinc-700 hover:border-[#D70F64] text-zinc-300 hover:text-pink-300 text-[10px] font-bold px-2.5 py-1 rounded-lg transition cursor-pointer"
                          >
                            ⏱️ {preset}
                          </button>
                        ))}
                      </div>

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

                    {/* Smart Mobile Step Action Buttons */}
                    <div className="flex flex-col gap-2 mt-2">
                      {riderActiveOrder.status === "accepted" && (
                        <button
                          onClick={() => handleMarkAsPreparing(riderActiveOrder.id)}
                          disabled={loadingActionId === riderActiveOrder.id}
                          className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black py-4 rounded-2xl transition shadow-lg text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95 shadow-amber-500/20"
                        >
                          {loadingActionId === riderActiveOrder.id ? (
                            <>
                              <Clock className="w-5 h-5 animate-spin" />
                              Updating status...
                            </>
                          ) : (
                            <>
                              <span>🍳 Mark as Preparing at Restaurant</span>
                            </>
                          )}
                        </button>
                      )}

                      {riderActiveOrder.status === "preparing" && (
                        <button
                          onClick={() => handleMarkAsOutForDelivery(riderActiveOrder.id)}
                          disabled={loadingActionId === riderActiveOrder.id}
                          className="w-full bg-[#D70F64] hover:bg-[#b00c50] text-white font-black py-4 rounded-2xl transition shadow-lg text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95 shadow-pink-500/20"
                        >
                          {loadingActionId === riderActiveOrder.id ? (
                            <>
                              <Clock className="w-5 h-5 animate-spin text-white" />
                              Updating status...
                            </>
                          ) : (
                            <>
                              <Compass className="w-5 h-5 animate-bounce" />
                              Picked Up & On the Way to Customer 🛵
                            </>
                          )}
                        </button>
                      )}

                      {riderActiveOrder.status === "out_for_delivery" && (
                        <button
                          onClick={() => handleMarkAsDelivered(riderActiveOrder.id)}
                          disabled={loadingActionId === riderActiveOrder.id}
                          className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black py-4 rounded-2xl transition shadow-lg text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95 shadow-emerald-500/20"
                        >
                          {loadingActionId === riderActiveOrder.id ? (
                            <>
                              <Clock className="w-5 h-5 animate-spin" />
                              Marking as delivered...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-5 h-5" />
                              Delivered & Collect Rs. {riderActiveOrder.grandTotal} Cash
                            </>
                          )}
                        </button>
                      )}

                      <button
                        onClick={() => handleCancelOrder(riderActiveOrder.id)}
                        disabled={loadingActionId === riderActiveOrder.id}
                        className="w-full bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-400 font-bold py-2.5 rounded-xl transition text-[11px] tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 mt-1"
                      >
                        <XCircle className="w-4 h-4" />
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
                                      {(item.selectedSize || item.selectedFlavor || (item.selectedAddOns && item.selectedAddOns.length > 0) || item.specialInstructions) && (
                                        <div className="text-[8px] text-zinc-500 mt-0.5 space-y-0.5 font-medium leading-tight">
                                          {item.selectedSize && <div>Size: {item.selectedSize}</div>}
                                          {item.selectedFlavor && <div>Flavor: {item.selectedFlavor}</div>}
                                          {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                                            <div>Add-ons: {Object.entries(item.selectedAddOns.reduce((acc: any, curr: any) => { acc[curr.name] = (acc[curr.name] || 0) + 1; return acc; }, {})).map(([name, count]: [string, any]) => `${Number(count) * (item.quantity || 1)}x ${name}`).join(', ')}</div>
                                          )}
                                          {item.specialInstructions && <div className="italic text-zinc-400">Note: {item.specialInstructions}</div>}
                                        </div>
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

                          {/* View Bill & Send WhatsApp Receipt */}
                          <button
                            type="button"
                            onClick={() => {
                              setRiderReceiptOrder(order);
                              setIsRiderReceiptModalOpen(true);
                            }}
                            className="w-full py-2 px-3 mb-2 rounded-xl text-[10.5px] font-black text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/60 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
                          >
                            <span>🧾 Order Bill & WhatsApp Customer</span>
                          </button>

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

        {/* Offline Rest Mode view for offline riders */}
        {activeTab === "dashboard" && !isOnline && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6 shadow-2xl animate-fade-in relative overflow-hidden text-zinc-100">
            <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="space-y-3">
              <span className="text-5xl block animate-pulse">🛌</span>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">Rider Duty: Offline & Resting</h2>
              <p className="text-xs text-[#D70F64] font-extrabold uppercase tracking-widest">Aap rest mode par hain, dost!</p>
              <p className="text-xs text-zinc-400 font-semibold max-w-md mx-auto leading-relaxed">
                Naye orders ki siren notification ko temporary band (muted) kar diya gaya hai. Jab aap tayyar hon, upar green button daba kar dobara online duty join karlein!
              </p>
            </div>



            <button
              onClick={handleToggleOnline}
              className="w-full bg-[#D70F64] hover:bg-[#b00c50] text-white font-black text-xs uppercase tracking-wider py-4 px-6 rounded-2xl transition shadow-lg shadow-pink-500/10 active:scale-95 cursor-pointer"
            >
              🟢 Start Online Duty Now
            </button>
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
                        const dayEarnings = dayOrders.reduce((sum, o) => {
                          const fee = o.deliveryFee || 0;
                          const subsidy = (o.voucher?.discountAmount || 0) + (o.coinsUsed || 0);
                          return sum + fee + subsidy;
                        }, 0);
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
                        {(() => {
                          const selectedDayOrders = historyGroupedByDate[selectedHistoryDate] || [];
                          const dayFees = selectedDayOrders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
                          const daySubsidies = selectedDayOrders.reduce((sum, o) => sum + ((o.voucher?.discountAmount || 0) + (o.coinsUsed || 0)), 0);
                          const dayTotalPayout = dayFees + daySubsidies;

                          return (
                            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
                              <div>
                                <span className="text-[9px] uppercase tracking-wider text-[#D70F64] font-black block">Log catalog details for</span>
                                <h4 className="font-extrabold text-xs sm:text-sm text-zinc-100 mt-1">{formatNiceDate(selectedHistoryDate)}</h4>
                              </div>
                              
                              <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                                <div className="text-right">
                                  <span className="text-[9px] text-zinc-400 uppercase tracking-widest block leading-none">Completed</span>
                                  <span className="text-xs sm:text-sm font-black text-zinc-200 block mt-1">{selectedDayOrders.length} Orders</span>
                                </div>
                                {daySubsidies > 0 && (
                                  <div className="text-right">
                                    <span className="text-[9px] text-amber-400 uppercase tracking-widest block leading-none">Subsidies</span>
                                    <span className="text-xs sm:text-sm font-mono font-black text-amber-300 block mt-1 font-sans">
                                      +Rs. {daySubsidies}
                                    </span>
                                  </div>
                                )}
                                <div className="text-right">
                                  <span className="text-[9px] text-emerald-400 uppercase tracking-widest block leading-none">Total Payout</span>
                                  <span className="text-sm sm:text-base font-mono font-black text-emerald-400 block mt-1 font-sans">
                                    Rs. {dayTotalPayout}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Order catalogs scroll block */}
                        <div className="space-y-4 max-h-[360px] overflow-y-auto scrollbar-none pr-1">
                          {(historyGroupedByDate[selectedHistoryDate] || []).map((order) => {
                            const completedTimeStr = order.deliveryCompletedAt?.seconds
                              ? new Date(order.deliveryCompletedAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : "N/A";
                            const fee = order.deliveryFee || 0;
                            const vDisc = order.voucher?.discountAmount || 0;
                            const cDisc = order.coinsUsed || 0;
                            const totalSubsidy = vDisc + cDisc;
                            const totalOrderEarning = fee + totalSubsidy;

                            return (
                              <div key={order.id} className="bg-zinc-950 border border-zinc-850 p-4 sm:p-5 rounded-2xl space-y-3 shadow-sm text-zinc-100">
                                {/* metadata */}
                                <div className="flex justify-between items-start border-b border-zinc-850 pb-2.5 gap-2 text-xs">
                                  <div>
                                    <span className="text-[#D70F64] font-black uppercase text-[9px] tracking-wider block">ID: dadu-{order.id.substring(0, 8)}</span>
                                    <h5 className="font-extrabold text-zinc-200 mt-1">Buyer: {order.userName}</h5>
                                  </div>
                                  <div className="text-right font-mono">
                                    <span className="text-[9px] text-zinc-400 uppercase block">Delivered At</span>
                                    <span className="font-bold text-zinc-200 block mt-0.5">{completedTimeStr}</span>
                                  </div>
                                </div>

                                {/* items */}
                                <div className="space-y-2">
                                  {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-start text-[11px] font-semibold text-zinc-400">
                                      <div className="flex flex-col">
                                        <span>
                                          {item.name} <span className="text-[#D70F64] font-bold">×{item.quantity}</span>
                                        </span>
                                        {(item.selectedSize || item.selectedFlavor || (item.selectedAddOns && item.selectedAddOns.length > 0) || item.specialInstructions) && (
                                          <div className="text-[9px] text-zinc-500 mt-0.5 space-y-0.5 font-medium leading-tight">
                                            {item.selectedSize && <div>Size: {item.selectedSize}</div>}
                                            {item.selectedFlavor && <div>Flavor: {item.selectedFlavor}</div>}
                                            {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                                              <div>Add-ons: {Object.entries(item.selectedAddOns.reduce((acc, curr) => { acc[curr.name] = (acc[curr.name] || 0) + 1; return acc; }, {} as Record<string, number>)).map(([name, count]) => `${Number(count) * (item.quantity || 1)}x ${name}`).join(', ')}</div>
                                            )}
                                            {item.specialInstructions && <div className="italic text-zinc-400">Note: {item.specialInstructions}</div>}
                                          </div>
                                        )}
                                      </div>
                                      <span className="font-mono text-zinc-300">Rs. {item.price * item.quantity}</span>
                                    </div>
                                  ))}
                                </div>

                                 {/* address & earnings breakdown */}
                                <div className="text-[11px] text-zinc-400 font-semibold border-t border-zinc-900 pt-2.5 space-y-2">
                                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                    <div>
                                      <span className="truncate max-w-xs text-zinc-400 block">📍 Destination: {order.userAddress}</span>
                                      <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
                                        Customer Paid (Cash): <strong className="text-zinc-200">Rs. {order.grandTotal}</strong>
                                      </span>
                                    </div>
                                    <div className="flex flex-col items-end text-right text-[10.5px] shrink-0">
                                      <div className="text-zinc-400">Delivery Fee: <span className="font-mono text-zinc-200">Rs. {fee}</span></div>
                                      {vDisc > 0 && (
                                        <div className="text-amber-400 text-[10px] font-bold mt-0.5">
                                          🎟️ Voucher Subsidy: <span className="font-mono">+Rs. {vDisc}</span>
                                        </div>
                                      )}
                                      {cDisc > 0 && (
                                        <div className="text-amber-400 text-[10px] font-bold mt-0.5">
                                          🪙 Coin Subsidy: <span className="font-mono">+Rs. {cDisc}</span>
                                        </div>
                                      )}
                                      <div className="text-emerald-400 font-black mt-1 text-xs border-t border-zinc-900 pt-1 font-mono">
                                        Total Due to Rider: Rs. {totalOrderEarning}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="pt-1 flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRiderReceiptOrder(order);
                                        setIsRiderReceiptModalOpen(true);
                                      }}
                                      className="text-[10px] font-black text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/60 py-1.5 px-3 rounded-lg flex items-center gap-1 cursor-pointer transition active:scale-95"
                                    >
                                      <span>🧾 View / Send WhatsApp Receipt</span>
                                    </button>
                                  </div>
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

        {activeTab === "performance" && (() => {
          const ratedOrders = myOrders.filter((o) => o.rating !== undefined);
          const totalRated = ratedOrders.length;
          const avgRating = totalRated > 0
            ? (ratedOrders.reduce((sum, o) => sum + (o.rating || 0), 0) / totalRated).toFixed(1)
            : "N/A";
          
          // Count different star buckets
          const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
          ratedOrders.forEach(o => {
            const r = Math.round(o.rating || 0);
            if (r >= 1 && r <= 5) {
              starCounts[r as 1|2|3|4|5] += 1;
            }
          });

          return (
            <div className="space-y-6 sm:space-y-8 animate-fade-in text-zinc-100">

              {/* Timeframe Filter Panel */}
              <div className="bg-zinc-900 border border-zinc-800 p-4 sm:p-5 rounded-3xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-800/60 pb-3">
                  <div>
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-[#D70F64] flex items-center gap-1.5">
                      📊 Dynamic Earnings Calculator
                    </h3>
                    <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">Apni pure rider fees (Rs. 50, 100, 200, etc.) filter karkay check karein.</p>
                  </div>
                  
                  {/* Timeframe selector */}
                  <div className="flex flex-wrap gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                    {[
                      { id: "1day", label: "1 Din" },
                      { id: "7days", label: "1 Week" },
                      { id: "30days", label: "1 Month" },
                      { id: "60days", label: "2 Months" },
                      { id: "all", label: "All Time" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setTimeframe(item.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition cursor-pointer ${
                          timeframe === item.id
                            ? "bg-[#D70F64] text-white"
                            : "text-zinc-350 hover:text-zinc-100"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-zinc-950/60 border border-zinc-850 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-black">Filtered Runs</span>
                      <span className="text-xl sm:text-2xl font-black text-zinc-100 block mt-1">{filteredRiderOrders.length} Runs</span>
                    </div>
                    <span className="text-2xl">📦</span>
                  </div>
                  <div className="bg-zinc-950/60 border border-zinc-850 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[9px] uppercase tracking-widest text-emerald-500 font-black">Delivery Fees</span>
                      <span className="text-xl sm:text-2xl font-mono font-black text-emerald-400 block mt-1 font-sans">Rs. {filteredDeliveryFees}</span>
                    </div>
                    <span className="text-2xl">🚲</span>
                  </div>
                  <div className="bg-zinc-950/60 border border-amber-500/20 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[9px] uppercase tracking-widest text-amber-400 font-black">Discount Subsidies</span>
                      <span className="text-xl sm:text-2xl font-mono font-black text-amber-300 block mt-1 font-sans">Rs. {filteredTotalSubsidies}</span>
                    </div>
                    <span className="text-2xl">🎟️</span>
                  </div>
                  <div className="bg-zinc-950/60 border border-pink-500/20 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[9px] uppercase tracking-widest text-pink-400 font-black">Total Payout Due</span>
                      <span className="text-xl sm:text-2xl font-mono font-black text-white block mt-1 font-sans">Rs. {filteredRiderEarnings}</span>
                    </div>
                    <span className="text-2xl">💵</span>
                  </div>
                </div>
              </div>

              {/* Customer Discounts & Subsidy Reimbursement Wallet */}
              <div className="bg-gradient-to-r from-amber-950/80 via-zinc-900 to-amber-950/80 border border-amber-500/40 p-5 rounded-3xl space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-amber-500/20 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30 shrink-0">
                      <Wallet className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-amber-300 uppercase tracking-wide flex items-center gap-2 flex-wrap">
                        <span>🎟️ & 🪙 Customer Discount Reimbursement (Admin Payable)</span>
                        <span className="bg-amber-500/20 text-amber-300 text-[9px] px-2 py-0.5 rounded-full border border-amber-500/30 font-extrabold uppercase">
                          100% Guaranteed by Admin
                        </span>
                      </h3>
                      <p className="text-xs text-amber-200/80 font-medium mt-0.5">
                        Customer ne jo bhi Voucher code ya Coins discount use kiya hai, wo amount aapke is panel mein add ho jati hai. Admin settlement ke waqt aapko iska full cash/online payout deta hai.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-zinc-950/70 border border-amber-500/20 p-4 rounded-2xl">
                    <span className="text-[9.5px] uppercase tracking-widest text-amber-300 font-extrabold block">🎟️ Voucher Subsidies</span>
                    <span className="text-2xl font-black text-amber-300 block mt-1 font-mono font-sans">
                      Rs. {unsettledVoucherSubsidies}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium block mt-0.5">Voucher Discount Reimbursement</span>
                  </div>

                  <div className="bg-zinc-950/70 border border-amber-500/20 p-4 rounded-2xl">
                    <span className="text-[9.5px] uppercase tracking-widest text-amber-400 font-extrabold block">🪙 Coin Subsidies</span>
                    <span className="text-2xl font-black text-amber-400 block mt-1 font-mono font-sans">
                      Rs. {unsettledCoinsSubsidies}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium block mt-0.5">Coins Redeemed Reimbursement</span>
                  </div>

                  <div className="bg-zinc-950/70 border border-emerald-500/20 p-4 rounded-2xl">
                    <span className="text-[9.5px] uppercase tracking-widest text-emerald-400 font-extrabold block">Total Pending Subsidy</span>
                    <span className="text-2xl font-black text-emerald-400 block mt-1 font-mono font-sans">
                      Rs. {unsettledTotalSubsidies}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium block mt-0.5">Pending from Admin</span>
                  </div>

                  <div className="bg-zinc-950/70 border border-pink-500/20 p-4 rounded-2xl">
                    <span className="text-[9.5px] uppercase tracking-widest text-pink-300 font-extrabold block">⭐ Net Payable to Rider</span>
                    <span className="text-2xl font-black text-pink-400 block mt-1 font-mono font-sans">
                      Rs. {unsettledTotalPayoutDue}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium block mt-0.5">Delivery Fees + Discount Subsidies</span>
                  </div>
                </div>
              </div>

              {/* Analytics Widgets Grid */}
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

              {/* Performance Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Avg Rating Card */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between shadow-xl">
                  <div className="absolute top-0 right-0 p-4 text-amber-500 opacity-10">
                    <Star className="w-16 h-16 fill-amber-500" />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest block">Average Rating</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <p className="text-4xl sm:text-5xl font-black text-white">{avgRating}</p>
                      <span className="text-sm font-bold text-zinc-500">/ 5.0</span>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const numVal = Number(avgRating) || 0;
                        const isFilled = i < Math.floor(numVal);
                        return (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              isFilled ? "text-amber-400 fill-amber-400" : "text-zinc-700"
                            }`}
                          />
                        );
                      })}
                      <span className="text-xs font-bold text-zinc-400 ml-1">({totalRated} ratings)</span>
                    </div>
                  </div>
                  <div className="border-t border-zinc-850 pt-3 flex items-center gap-1.5 text-xs text-amber-400 mt-4 font-bold">
                    <span>Outstanding Captain Status</span>
                  </div>
                </div>

                {/* Rating Distribution Progress */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl md:col-span-2 space-y-3">
                  <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest block">Rating Distribution</span>
                  <div className="space-y-2 pt-1">
                    {([5, 4, 3, 2, 1] as const).map((stars) => {
                      const count = starCounts[stars] || 0;
                      const percentage = totalRated > 0 ? (count / totalRated) * 100 : 0;
                      return (
                        <div key={stars} className="flex items-center gap-3 text-xs font-bold text-zinc-300 font-sans">
                          <span className="w-3 text-right">{stars}</span>
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                          <div className="flex-1 h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-850">
                            <div
                              className="h-full bg-amber-400 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-zinc-500">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Feedbacks Ledger */}
              <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 sm:p-6 space-y-6 shadow-xl">
                <div className="flex items-center gap-2.5 border-b border-zinc-800 pb-4">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <div>
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-amber-400">Customer Reviews & Remarks</h3>
                    <p className="text-[11px] text-zinc-400 font-semibold leading-relaxed">Direct in-app ratings and detailed remarks shared by your customers upon order delivery.</p>
                  </div>
                </div>

                {ratedOrders.length === 0 ? (
                  <div className="text-center p-8 sm:p-12 text-zinc-500 space-y-2">
                    <span className="text-3xl block">⭐</span>
                    <p className="text-xs font-black uppercase text-zinc-450 tracking-wider">No reviews received yet</p>
                    <p className="text-[10.5px] text-zinc-600 font-semibold leading-tight">Once buyers complete your deliveries and submit star feedback, they will display instantly here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ratedOrders.map((order) => (
                      <div key={order.id} className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl space-y-3 shadow-xs">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="text-[11px] font-black text-zinc-200 block">{order.userName || "Customer"}</span>
                            <span className="text-[9px] text-zinc-500 font-mono">ID: dadu-{order.id.substring(0, 8)}</span>
                          </div>
                          <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-amber-400 font-black text-xs">
                            ⭐ {order.rating}
                          </div>
                        </div>

                        {order.ratingComment ? (
                          <p className="text-xs text-zinc-350 italic bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-850/40">
                            "{order.ratingComment}"
                          </p>
                        ) : (
                          <p className="text-xs text-zinc-650 italic">No comment shared.</p>
                        )}

                        <div className="flex justify-between items-center text-[10px] text-zinc-500 font-semibold border-t border-zinc-900 pt-2 mt-1">
                          <span>Payment: {order.paymentMethod.toUpperCase()}</span>
                          <span>
                            {order.deliveryCompletedAt?.seconds
                              ? new Date(order.deliveryCompletedAt.seconds * 1000).toLocaleDateString()
                              : "Recently"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          );
        })()}

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

      {/* Sticky Mobile Bottom Navigation Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800 z-50 px-4 py-2 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition cursor-pointer active:scale-95 ${
            activeTab === "dashboard" ? "text-[#D70F64] font-black" : "text-zinc-400 font-semibold hover:text-zinc-200"
          }`}
        >
          <div className="relative">
            <Compass className="w-5 h-5" />
            {riderActiveOrders.length > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-[#D70F64] text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-zinc-950">
                {riderActiveOrders.length}
              </span>
            )}
          </div>
          <span className="text-[9.5px] uppercase tracking-wider">Deliveries</span>
        </button>

        <button
          onClick={() => setActiveTab("performance")}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition cursor-pointer active:scale-95 ${
            activeTab === "performance" ? "text-[#D70F64] font-black" : "text-zinc-400 font-semibold hover:text-zinc-200"
          }`}
        >
          <DollarSign className="w-5 h-5" />
          <span className="text-[9.5px] uppercase tracking-wider">Earnings</span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition cursor-pointer active:scale-95 ${
            activeTab === "history" ? "text-[#D70F64] font-black" : "text-zinc-400 font-semibold hover:text-zinc-200"
          }`}
        >
          <History className="w-5 h-5" />
          <span className="text-[9.5px] uppercase tracking-wider">History</span>
        </button>
      </nav>

      {/* RIDER ORDER RECEIPT & WHATSAPP MODAL */}
      <OrderReceiptModal
        order={riderReceiptOrder}
        isOpen={isRiderReceiptModalOpen}
        onClose={() => setIsRiderReceiptModalOpen(false)}
        senderRole="rider"
      />

      {/* RIDER LIVE CHAT MODAL OVERLAY */}
      {showLiveChat && riderActiveOrder && (
        <OrderChat
          orderId={riderActiveOrder.id}
          currentUser={{
            uid: currentUser.uid,
            name: currentUser.name || "Rider",
            role: "rider"
          }}
          recipientName={riderActiveOrder.userName || "Customer"}
          recipientRole="user"
          onClose={() => setShowLiveChat(false)}
          isOpen={showLiveChat}
        />
      )}

    </div>
  );
}
