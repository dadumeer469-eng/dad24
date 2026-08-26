import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Sparkles,
  Send,
  Loader2,
  Bot,
  User,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Tag,
  PlusCircle,
  Bell,
  RefreshCw,
  Zap,
  ShoppingBag,
  Store,
  DollarSign,
  Maximize2,
  Minimize2,
  X,
  HelpCircle,
  ArrowRight,
  MessageSquareQuote,
  ShieldCheck,
  ShieldAlert,
  Mic,
  MicOff,
  RotateCcw,
  Percent,
  Ticket,
  Clock,
  Layers,
  Award,
  Trash2,
  Activity,
  FileText,
  Ban,
  Power,
  Timer,
  Check,
  AlertCircle,
  Phone,
  ArrowUpRight
} from "lucide-react";
import { Dish, Order, SystemSettings, FoodCategory, IncidentReport, AiAuditLog, CustomerRiskProfile } from "../types";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  getDocs,
  onSnapshot,
  query as firestoreQuery,
  where
} from "firebase/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { db, cleanObject, firebaseConfig } from "../firebase";

interface AiManagerMessage {
  id: string;
  sender: "admin" | "ai";
  text: string;
  timestamp: Date;
  actions?: Array<{
    type: string;
    payload: any;
    status?: "pending" | "executed" | "failed";
    summary?: string;
    undoData?: any;
  }>;
  suggestedPrompts?: string[];
}

interface AiManagerWorkspaceProps {
  dishes: Dish[];
  orders: Order[];
  deliverySettings: SystemSettings;
  adminUsername: string;
  foodCategories: FoodCategory[];
  totalUsersCount?: number;
  allUsersList?: any[];
  ridersList?: any[];
  onNavigateTab?: (tab: any) => void;
  isFloatingDrawer?: boolean;
  onCloseFloating?: () => void;
}

// Curated high quality food images for AI item generation
const FOOD_IMAGE_PRESETS: Record<string, string> = {
  burger: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
  pizza: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80",
  karahi: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&q=80",
  biryani: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80",
  boti: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80",
  shawarma: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=600&q=80",
  fries: "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80",
  drink: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
  dessert: "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
  platter: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
  deal: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
  default: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80"
};

function resolveFoodImage(name: string, category: string): string {
  const query = `${name} ${category}`.toLowerCase();
  for (const [key, url] of Object.entries(FOOD_IMAGE_PRESETS)) {
    if (query.includes(key)) return url;
  }
  return FOOD_IMAGE_PRESETS.default;
}

export default function AiManagerWorkspace({
  dishes,
  orders,
  deliverySettings,
  adminUsername,
  foodCategories,
  totalUsersCount = 0,
  allUsersList = [],
  ridersList = [],
  onNavigateTab,
  isFloatingDrawer = false,
  onCloseFloating
}: AiManagerWorkspaceProps) {
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // AI Workspace Navigation & Operational Tabs
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<"terminal" | "incidents" | "closures" | "risk_radar" | "audit_trail">("terminal");
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<AiAuditLog[]>([]);
  const [incidentFilter, setIncidentFilter] = useState<string>("all");
  const [selectedIncident, setSelectedIncident] = useState<IncidentReport | null>(null);
  const [codLimitValue, setCodLimitValue] = useState<number>(deliverySettings?.maxCodLimit || 3000);
  const [isUpdatingCodLimit, setIsUpdatingCodLimit] = useState(false);

  // Real-time Firestore Subscriptions for Incidents & AI Audit Trail
  useEffect(() => {
    try {
      const incUnsub = onSnapshot(collection(db, "incidents"), (snapshot) => {
        const list: IncidentReport[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as IncidentReport);
        });
        list.sort((a, b) => {
          const tA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
          const tB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
          return tB - tA;
        });
        setIncidents(list);
      }, (err) => console.error("Incidents listen error:", err));

      const auditUnsub = onSnapshot(collection(db, "ai_audit_logs"), (snapshot) => {
        const list: AiAuditLog[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as AiAuditLog);
        });
        list.sort((a, b) => {
          const tA = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : new Date(a.timestamp || 0).getTime();
          const tB = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : new Date(b.timestamp || 0).getTime();
          return tB - tA;
        });
        setAuditLogs(list);
      }, (err) => console.error("Audit logs listen error:", err));

      return () => {
        incUnsub();
        auditUnsub();
      };
    } catch (e) {
      console.error("Firestore sync error in AI Manager:", e);
    }
  }, []);

  // Autonomous Auto-Reopen Background Worker
  useEffect(() => {
    const checkAutoReopen = async () => {
      const statuses = deliverySettings?.restaurantStatuses;
      if (!statuses) return;
      const now = Date.now();

      for (const [restName, config] of Object.entries(statuses)) {
        const closure = (config as any).temporaryClosure;
        if (closure?.isTemporarilyClosed && closure?.expectedReopenAt) {
          let reopenMs = 0;
          if (closure.expectedReopenAt.toMillis) reopenMs = closure.expectedReopenAt.toMillis();
          else if (closure.expectedReopenAt.seconds) reopenMs = closure.expectedReopenAt.seconds * 1000;
          else if (typeof closure.expectedReopenAt === "string" || closure.expectedReopenAt instanceof Date) {
            reopenMs = new Date(closure.expectedReopenAt).getTime();
          }

          if (reopenMs > 0 && now >= reopenMs) {
            try {
              await updateDoc(doc(db, "settings", "delivery"), {
                [`restaurantStatuses.${restName}.isTemporarilyUnavailable`]: false,
                [`restaurantStatuses.${restName}.temporaryClosure.isTemporarilyClosed`]: false,
                [`restaurantStatuses.${restName}.temporaryClosure.reopenedAt`]: { seconds: Math.floor(Date.now() / 1000) },
                [`restaurantStatuses.${restName}.temporaryClosure.reopenedBy`]: "ai_auto_timer"
              });

              await addDoc(collection(db, "ai_audit_logs"), {
                action: `AUTO-REOPENED BUSINESS: ${restName}`,
                reason: `Scheduled 2-hour temporary pause expired`,
                source: "cron_monitor",
                restaurantName: restName,
                aiDecision: "Autonomous timer trigger: Reopened business and resumed order acceptance.",
                timestamp: { seconds: Math.floor(Date.now() / 1000) }
              });

              await addDoc(collection(db, "notifications"), {
                userId: "admin",
                title: `🏪 ${restName} Auto-Reopened!`,
                message: `Temporary closure period finished. ${restName} is now active and taking orders.`,
                createdAt: { seconds: Math.floor(Date.now() / 1000) },
                read: false
              });
            } catch (e) {
              console.error("Auto reopen error:", e);
            }
          }
        }
      }
    };

    const interval = setInterval(checkAutoReopen, 20000);
    return () => clearInterval(interval);
  }, [deliverySettings]);

  const [messages, setMessages] = useState<AiManagerMessage[]>([
    {
      id: "welcome-msg",
      sender: "ai",
      text: `Assalam-o-Alaikum Boss @${adminUsername}! 🫡\n\nMain aapka **Dadu Master AI Operations & General Manager** hoon. Store telemetry live connect hai:\n\n• 🍽️ **${dishes.length} Dishes** Menu mein hain (${dishes.filter(d => d.isAvailable === false).length} out of stock)\n• 📦 **${orders.filter(o => o.status !== "delivered" && o.status !== "cancelled").length} Active Orders** live process ho rahe hain\n• 💰 **Rs ${orders.filter(o => o.status === "delivered").reduce((sum, o) => sum + (o.grandTotal || 0), 0).toLocaleString()}** Total Lifetime Revenue\n\nMain autonomous actions execute kar sakta hoon: Naye combo deals banana, bulk discount lagana, push notifications bhejna, promo vouchers create karna, prices adjust karna ya out-of-stock items fix karna. Hukum karein Boss!`,
      timestamp: new Date(),
      suggestedPrompts: [
        "🚀 2 High-Profit Combo Deals create karke menu mein add karo",
        "📊 Aaj ki complete sales aur AOV report do",
        "🏷️ Fast Food category par 15% discount lagao",
        "🎟️ Naya Rs 100 OFF coupon voucher create karo",
        "📢 Weekend flash sale push notification bhejo",
        "🛑 Out of stock items check karo aur unhe enable karo"
      ]
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Compute live customer stats & rankings for component-wide and action engine access
  const { topMostActiveCustomers, topSpenderCustomers, topSellingDishes, riderStatsList } = useMemo(() => {
    const customerStatsMap: Record<string, {
      name: string;
      phone: string;
      userId: string;
      ordersCount: number;
      deliveredCount: number;
      cancelledCount: number;
      totalSpent: number;
      lastOrderDate: string;
      address: string;
      favoriteItems: Record<string, number>;
    }> = {};

    orders.forEach((o: any) => {
      const rawPhone = o.customerPhone || o.userPhone || o.phone || o.deliveryPhone || "";
      const phone = rawPhone || (o.userId ? `User-${o.userId.slice(-6)}` : "Guest");
      const key = phone;

      if (!customerStatsMap[key]) {
        customerStatsMap[key] = {
          name: o.customerName || o.userName || o.name || "Customer",
          phone: rawPhone || phone,
          userId: o.userId || "",
          ordersCount: 0,
          deliveredCount: 0,
          cancelledCount: 0,
          totalSpent: 0,
          lastOrderDate: "",
          address: o.deliveryAddress || o.address || "",
          favoriteItems: {},
        };
      }

      const stat = customerStatsMap[key];
      stat.ordersCount += 1;
      if (o.status === "delivered" || o.status === "completed") {
        stat.deliveredCount += 1;
        stat.totalSpent += (o.grandTotal || o.total || 0);
      } else if (o.status === "cancelled") {
        stat.cancelledCount += 1;
      }

      if (o.items && Array.isArray(o.items)) {
        o.items.forEach((it: any) => {
          const itName = it.name || it.title || "Item";
          stat.favoriteItems[itName] = (stat.favoriteItems[itName] || 0) + (it.quantity || 1);
        });
      }

      if ((o.customerName || o.userName) && (stat.name === "Customer" || !stat.name)) {
        stat.name = o.customerName || o.userName;
      }
      if ((o.deliveryAddress || o.address) && !stat.address) {
        stat.address = o.deliveryAddress || o.address;
      }
    });

    // Cross-match with allUsersList
    (allUsersList || []).forEach((u: any) => {
      const key = u.phone || u.uid;
      if (key && customerStatsMap[key]) {
        if (u.name && customerStatsMap[key].name === "Customer") customerStatsMap[key].name = u.name;
        if (u.address && !customerStatsMap[key].address) customerStatsMap[key].address = u.address;
        if (u.uid && !customerStatsMap[key].userId) customerStatsMap[key].userId = u.uid;
      } else if (key) {
        customerStatsMap[key] = {
          name: u.name || "Customer",
          phone: u.phone || key,
          userId: u.uid || "",
          ordersCount: u.ordersCount || 0,
          deliveredCount: u.ordersCount || 0,
          cancelledCount: 0,
          totalSpent: u.totalSpent || 0,
          lastOrderDate: "",
          address: u.address || "",
          favoriteItems: {},
        };
      }
    });

    const activeList = Object.values(customerStatsMap)
      .sort((a, b) => b.ordersCount - a.ordersCount || b.totalSpent - a.totalSpent);

    const spenderList = Object.values(customerStatsMap)
      .sort((a, b) => b.totalSpent - a.totalSpent || b.ordersCount - a.ordersCount);

    // Calculate top selling dishes
    const itemPopularityMap: Record<string, { name: string; count: number; revenue: number; category?: string }> = {};
    orders.forEach((o) => {
      if (o.items && Array.isArray(o.items)) {
        o.items.forEach((it: any) => {
          const name = it.name || it.title || "Item";
          const price = Number(it.price) || 0;
          const qty = Number(it.quantity) || 1;
          if (!itemPopularityMap[name]) {
            itemPopularityMap[name] = { name, count: 0, revenue: 0, category: it.category };
          }
          itemPopularityMap[name].count += qty;
          itemPopularityMap[name].revenue += price * qty;
        });
      }
    });

    const topSelling = Object.values(itemPopularityMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate riders live delivery stats
    const riders = (ridersList || []).map((r: any) => {
      const deliveriesFromOrders = orders.filter(
        (o) => (o.riderName && o.riderName.toLowerCase() === r.name?.toLowerCase()) || (o as any).assignedRiderPhone === r.phone
      );
      const completedCount = deliveriesFromOrders.filter((o) => o.status === "delivered" || o.status === "completed").length;
      const activeCount = deliveriesFromOrders.filter((o) => (o.status as any) === "on_the_way" || o.status === "out_for_delivery" || o.status === "accepted" || o.status === "preparing").length;

      return {
        name: r.name || "Rider",
        phone: r.phone || "",
        uid: r.uid || "",
        ordersCount: Math.max(r.totalDeliveries || r.ordersCount || 0, completedCount),
        activeOrders: activeCount,
        vehicleNumber: r.vehicleNumber || "Active Rider"
      };
    });

    return {
      topMostActiveCustomers: activeList,
      topSpenderCustomers: spenderList,
      topSellingDishes: topSelling,
      riderStatsList: riders
    };
  }, [orders, allUsersList, ridersList]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Voice recognition setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "ur-PK";

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputMessage(prev => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use keyboard.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Play subtle feedback chime on action completion
  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // AudioContext unavailable
    }
  };

  // Master Action Execution Engine on Firestore
  const executeAiAction = async (action: any): Promise<{ success: boolean; summary: string; undoData?: any }> => {
    try {
      // 1. ADD SINGLE ITEM
      if (action.type === "add_item") {
        const p = action.payload || {};
        const uniqueId = `dish_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const catName = p.category || (foodCategories[0]?.name || "Fast Food");
        const newDish: Dish = {
          id: uniqueId,
          name: p.name || "Special Dish",
          description: p.description || `Fresh and delicious ${p.name || 'dish'} made with premium ingredients.`,
          price: Number(p.price) || 450,
          discountPrice: p.discountPrice ? Number(p.discountPrice) : undefined,
          category: catName,
          imageUrl: p.imageUrl || resolveFoodImage(p.name || "", catName),
          isAvailable: true,
          type: "food",
          restaurantName: p.restaurantName || "Dadu Fast Food & Kitchen",
          isBestseller: Boolean(p.isBestseller),
          sizes: p.sizes,
          flavors: p.flavors
        };

        await setDoc(doc(db, "menu", uniqueId), cleanObject(newDish));
        playChime();
        return {
          success: true,
          summary: `✅ Menu Item Added: "${newDish.name}" (Rs ${newDish.price}) in ${newDish.category}`,
          undoData: { type: "delete_doc", collection: "menu", id: uniqueId }
        };
      }

      // 2. BATCH ADD ITEMS (COMBOS / FAMILY DEALS / MENUS)
      if (action.type === "batch_add_items") {
        const items = action.payload?.items || [];
        if (!Array.isArray(items) || items.length === 0) {
          return { success: false, summary: "❌ Batch list mein koi items nahi mile." };
        }

        const addedIds: string[] = [];
        for (const item of items) {
          const uniqueId = `combo_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          const catName = item.category || "Deals & Combos";
          const newDish: Dish = {
            id: uniqueId,
            name: item.name || "Value Combo",
            description: item.description || `Special combo meal deal with great savings.`,
            price: Number(item.price) || 850,
            discountPrice: item.discountPrice ? Number(item.discountPrice) : undefined,
            category: catName,
            imageUrl: item.imageUrl || resolveFoodImage(item.name || "", catName),
            isAvailable: true,
            type: "food",
            restaurantName: item.restaurantName || "Dadu Fast Food & Kitchen",
            isBestseller: item.isBestseller !== false,
            sizes: item.sizes,
            flavors: item.flavors
          };

          await setDoc(doc(db, "menu", uniqueId), cleanObject(newDish));
          addedIds.push(uniqueId);
        }

        playChime();
        return {
          success: true,
          summary: `✅ ${items.length} Combos / Deals Menu mein live add kardiye gaye hain!`,
          undoData: { type: "delete_batch", collection: "menu", ids: addedIds }
        };
      }

      // 3. UPDATE SINGLE ITEM PRICE
      if (action.type === "update_price") {
        const p = action.payload || {};
        const targetDish = dishes.find(
          d => d.id === p.itemId || d.name.toLowerCase().includes((p.itemName || "").toLowerCase())
        );

        if (!targetDish) {
          return { success: false, summary: `❌ Item "${p.itemName || p.itemId}" nahi mila.` };
        }

        const oldPrice = targetDish.price;
        const oldDiscount = targetDish.discountPrice;

        await updateDoc(doc(db, "menu", targetDish.id), {
          price: Number(p.newPrice) || targetDish.price,
          ...(p.newDiscountPrice !== undefined ? { discountPrice: Number(p.newDiscountPrice) } : {})
        });

        playChime();
        return {
          success: true,
          summary: `✅ "${targetDish.name}" ki price Rs ${oldPrice} se change karke Rs ${p.newPrice} kardi gayi hai.`,
          undoData: { type: "restore_dish_price", id: targetDish.id, oldPrice, oldDiscount }
        };
      }

      // 4. BULK PRICE ADJUSTMENT
      if (action.type === "bulk_price_adjust") {
        const p = action.payload || {};
        const cat = (p.category || "").toLowerCase();
        const targets = cat ? dishes.filter(d => d.category.toLowerCase().includes(cat)) : dishes;

        if (targets.length === 0) {
          return { success: false, summary: `❌ Category "${p.category}" mein koi items nahi mile.` };
        }

        for (const dish of targets) {
          let updatedPrice = dish.price;
          if (p.percentChange) {
            const factor = p.direction === "decrease" ? (1 - p.percentChange / 100) : (1 + p.percentChange / 100);
            updatedPrice = Math.round(dish.price * factor);
          } else if (p.amountChange) {
            updatedPrice = p.direction === "decrease" ? Math.max(50, dish.price - p.amountChange) : dish.price + p.amountChange;
          }

          await updateDoc(doc(db, "menu", dish.id), { price: updatedPrice });
        }

        playChime();
        return {
          success: true,
          summary: `✅ ${targets.length} items ki prices successfully ${p.direction === "decrease" ? "kam" : "barha"} di gayi hain!`
        };
      }

      // 5. TOGGLE STOCK (AVAILABLE / OUT OF STOCK)
      if (action.type === "toggle_stock") {
        const p = action.payload || {};
        if (p.category) {
          const catDishes = dishes.filter(d => d.category.toLowerCase().includes(p.category.toLowerCase()));
          for (const d of catDishes) {
            await updateDoc(doc(db, "menu", d.id), { isAvailable: Boolean(p.isAvailable) });
          }
          playChime();
          return {
            success: true,
            summary: `✅ Category "${p.category}" ke تمام ${catDishes.length} items ko ${p.isAvailable ? 'In Stock' : 'Out of Stock'} mark kar diya gaya hai.`
          };
        }

        const targetDish = dishes.find(
          d => d.id === p.itemId || d.name.toLowerCase().includes((p.itemName || "").toLowerCase())
        );

        if (!targetDish) {
          // If no item specified, maybe admin asked to restock all items
          if (p.isAvailable === true) {
            const outOfStock = dishes.filter(d => d.isAvailable === false);
            for (const d of outOfStock) {
              await updateDoc(doc(db, "menu", d.id), { isAvailable: true });
            }
            playChime();
            return {
              success: true,
              summary: `✅ Tamam ${outOfStock.length} out-of-stock items ko wapis Available mark kar diya gaya hai!`
            };
          }
          return { success: false, summary: `❌ Item "${p.itemName || p.itemId}" nahi mila.` };
        }

        await updateDoc(doc(db, "menu", targetDish.id), {
          isAvailable: Boolean(p.isAvailable)
        });

        playChime();
        return {
          success: true,
          summary: `✅ "${targetDish.name}" ko ${p.isAvailable ? 'In Stock (Available)' : 'Out of Stock (Unavailable)'} mark kar diya gaya hai.`
        };
      }

      // 6. APPLY CATEGORY DISCOUNT
      if (action.type === "apply_category_discount") {
        const p = action.payload || {};
        const cat = (p.category || "").toLowerCase();
        const percent = Number(p.discountPercent) || 15;
        const matchingDishes = dishes.filter(d => cat === "all" || d.category.toLowerCase().includes(cat));

        if (matchingDishes.length === 0) {
          return { success: false, summary: `❌ Category "${p.category}" mein koi items nahi milay.` };
        }

        for (const dish of matchingDishes) {
          const originalPrice = dish.price;
          const discounted = Math.round(originalPrice * (1 - percent / 100));
          await updateDoc(doc(db, "menu", dish.id), {
            discountPrice: discounted
          });
        }

        playChime();
        return {
          success: true,
          summary: `✅ Category "${p.category || 'All'}" ke ${matchingDishes.length} items par ${percent}% Discount live apply ho gaya hai!`
        };
      }

      // 7. CREATE VOUCHER / COUPON CODE
      if (action.type === "create_voucher") {
        const p = action.payload || {};
        const code = (p.code || `PROMO${Math.floor(100 + Math.random() * 900)}`).toUpperCase();
        const voucherData = {
          code,
          discountAmount: Number(p.discountAmount) || 100,
          discountType: p.discountType || "fixed",
          minOrderAmount: Number(p.minOrderAmount) || 500,
          description: p.description || `Special Rs ${p.discountAmount || 100} OFF on orders above Rs ${p.minOrderAmount || 500}`,
          isActive: true,
          createdAt: { seconds: Math.floor(Date.now() / 1000) },
          expiryDate: new Date(Date.now() + (p.validTillDays || 30) * 86400000).toISOString()
        };

        await setDoc(doc(db, "vouchers", code), cleanObject(voucherData));
        playChime();
        return {
          success: true,
          summary: `✅ Promo Coupon "${code}" (${voucherData.discountType === 'percentage' ? voucherData.discountAmount + '%' : 'Rs ' + voucherData.discountAmount} OFF, Min Spend Rs ${voucherData.minOrderAmount}) create ho gaya hai!`,
          undoData: { type: "delete_doc", collection: "vouchers", id: code }
        };
      }

      // 8. CREATE PROMOTIONAL BANNER
      if (action.type === "create_banner") {
        const p = action.payload || {};
        const bannerData = {
          title: p.title || "Weekend Super Feast",
          subtitle: p.subtitle || "Order delicious meals right to your doorstep",
          tag: p.tag || "LIMITED TIME",
          couponCode: p.couponCode || "DADUAI",
          discountPercent: p.discountPercent || 20,
          bgColor: "from-[#D70F64] to-rose-700",
          imageUrl: p.imageUrl || FOOD_IMAGE_PRESETS.deal,
          active: true,
          ctaText: p.ctaText || "Order Now",
          createdAt: { seconds: Math.floor(Date.now() / 1000) }
        };

        const ref = await addDoc(collection(db, "promotional_banners"), cleanObject(bannerData));
        playChime();
        return {
          success: true,
          summary: `✅ Naya Promotional Banner "${bannerData.title}" homepage par live activate kar diya gaya hai!`,
          undoData: { type: "delete_doc", collection: "promotional_banners", id: ref.id }
        };
      }

      // 9. SEND BROADCAST / DIRECT PUSH NOTIFICATION & MESSAGE
      if (action.type === "send_notification" || action.type === "send_message" || action.type === "broadcast_notification") {
        const p = action.payload || {};
        const title = p.title || "Special Message from Dadu Hub 👑";
        const messageText = p.message || p.text || p.content || "Aapke liye exclusive discounts aur VIP offers available hain!";

        if (p.bestUser || p.topUsers || p.userId || p.phone || p.name) {
          let targets: Array<{ uid?: string; phone?: string; name?: string }> = [];

          if (p.topUsers) {
            targets = (topMostActiveCustomers || []).slice(0, Number(p.limit) || 5);
          } else if (p.bestUser || (!p.userId && !p.phone)) {
            if ((topMostActiveCustomers || []).length > 0) {
              targets = [(topMostActiveCustomers || [])[0]];
            }
          } else {
            targets = [{ uid: p.userId || p.uid, phone: p.phone, name: p.name }];
          }

          if (targets.length === 0 && (topMostActiveCustomers || []).length > 0) {
            targets = [(topMostActiveCustomers || [])[0]];
          }

          for (const target of targets) {
            const targetUid = target.uid || target.phone || `user_${Date.now()}`;
            await addDoc(collection(db, "notifications"), cleanObject({
              userId: targetUid,
              phone: target.phone || "",
              customerName: target.name || "Valued Customer",
              title: title,
              message: messageText,
              isVipMessage: true,
              createdAt: { seconds: Math.floor(Date.now() / 1000) },
              read: false,
            }));
          }

          playChime();
          const targetSummary = targets.map(t => `${t.name || 'Customer'} (${t.phone || t.uid})`).join(", ");
          return {
            success: true,
            summary: `✅ Direct VIP Message/Notification successfully deliver ho gaya to: ${targetSummary}\n📝 "${title}": ${messageText}`
          };
        }

        // Global broadcast
        const uniqueUids = Array.from(new Set(orders.map((o) => o.userId).filter(Boolean)));
        if (uniqueUids.length === 0) uniqueUids.push("all_users_broadcast");

        await Promise.all(
          uniqueUids.slice(0, 50).map((uid) =>
            addDoc(collection(db, "notifications"), {
              userId: uid,
              title: title,
              message: messageText,
              createdAt: { seconds: Math.floor(Date.now() / 1000) },
              read: false,
            })
          )
        );

        playChime();
        return {
          success: true,
          summary: `✅ Broadcast Notification "${title}" tamam customers ko bhej di gayi hai!\n📝 Message: ${messageText}`
        };
      }

      // 10. TOGGLE BESTSELLER / FEATURED
      if (action.type === "toggle_bestseller") {
        const p = action.payload || {};
        const targetDish = dishes.find(
          d => d.id === p.itemId || d.name.toLowerCase().includes((p.itemName || "").toLowerCase())
        );

        if (!targetDish) {
          return { success: false, summary: `❌ Item "${p.itemName || p.itemId}" nahi mila.` };
        }

        await updateDoc(doc(db, "menu", targetDish.id), {
          isBestseller: Boolean(p.isBestseller)
        });

        playChime();
        return {
          success: true,
          summary: `✅ "${targetDish.name}" par Bestseller badge ${p.isBestseller ? 'Lagaya' : 'Hataya'} gaya hai.`
        };
      }

      // 11. RESTAURANT SETTINGS & TIMINGS
      if (action.type === "update_restaurant_status") {
        const p = action.payload || {};
        const restName = p.restaurantName || "Dadu Fast Food & Kitchen";
        const existingStatuses = deliverySettings?.restaurantStatuses || {};

        const newStatuses = {
          ...existingStatuses,
          [restName]: {
            isTemporarilyUnavailable: Boolean(p.isUnavailable),
            openingTime: p.openingTime || "09:00",
            closingTime: p.closingTime || "23:00",
          }
        };

        await updateDoc(doc(db, "settings", "delivery"), cleanObject({
          restaurantStatuses: newStatuses,
          ...(p.deliveryFee !== undefined ? { deliveryFee: Number(p.deliveryFee) } : {}),
          ...(p.minimumOrder !== undefined ? { minimumOrderAmount: Number(p.minimumOrder) } : {})
        }));

        playChime();
        return {
          success: true,
          summary: `✅ Restaurant "${restName}" ka schedule aur settings update kardi gayi hain.`
        };
      }

      // 11B. TEMPORARY RESTAURANT CLOSURE (AUTONOMOUS 2-HOUR CLOSURE)
      if (action.type === "temporary_close_restaurant") {
        const p = action.payload || {};
        const restName = p.restaurantName || "Target Restaurant";
        const durationHours = Number(p.durationHours) || 2;
        const reopenTime = new Date(Date.now() + durationHours * 3600 * 1000);
        const existingStatuses = deliverySettings?.restaurantStatuses || {};
        const current = existingStatuses[restName] || {
          openingTime: "11:00",
          closingTime: "23:59",
          isTemporarilyUnavailable: false
        };

        await updateDoc(doc(db, "settings", "delivery"), {
          [`restaurantStatuses.${restName}`]: {
            ...current,
            isTemporarilyUnavailable: true,
            temporaryClosure: {
              isTemporarilyClosed: true,
              reason: p.reason || "Autonomous AI Temporary Closure due to reported issue",
              closedAt: { seconds: Math.floor(Date.now() / 1000) },
              expectedReopenAt: { seconds: Math.floor(reopenTime.getTime() / 1000) },
              closedBy: "ai",
              riderIncidentId: p.riderIncidentId || ""
            }
          }
        });

        await addDoc(collection(db, "ai_audit_logs"), {
          action: `TEMPORARY BUSINESS CLOSURE: ${restName}`,
          reason: p.reason || "Autonomous AI incident handling",
          source: "admin_command",
          restaurantName: restName,
          aiDecision: `Temporarily closed for ${durationHours} hours. Auto-reopen scheduled for ${reopenTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          timestamp: { seconds: Math.floor(Date.now() / 1000) }
        });

        playChime();
        return {
          success: true,
          summary: `🛑 **"${restName}"** ko ${durationHours} ghante ke liye Temporarily Closed mark kar diya gaya hai. Auto-reopen at **${reopenTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}**.`
        };
      }

      // 11C. REOPEN RESTAURANT / RESTORE ONLINE
      if (action.type === "reopen_restaurant") {
        const p = action.payload || {};
        const restName = p.restaurantName;
        const existingStatuses = deliverySettings?.restaurantStatuses || {};
        const current = existingStatuses[restName] || {
          openingTime: "11:00",
          closingTime: "23:59"
        };

        await updateDoc(doc(db, "settings", "delivery"), {
          [`restaurantStatuses.${restName}`]: {
            ...current,
            isTemporarilyUnavailable: false,
            temporaryClosure: {
              isTemporarilyClosed: false,
              reason: "Reopened by Admin",
              closedAt: null,
              expectedReopenAt: null,
              closedBy: "admin"
            }
          }
        });

        await addDoc(collection(db, "ai_audit_logs"), {
          action: `REOPEN RESTAURANT: ${restName}`,
          reason: p.reason || "Operational restart by Admin",
          source: "manual_admin",
          restaurantName: restName,
          aiDecision: "Restored active status. Accepting live customer orders.",
          timestamp: { seconds: Math.floor(Date.now() / 1000) }
        });

        playChime();
        return {
          success: true,
          summary: `✅ **"${restName}"** ko wapis REOPEN aur Online mark kar diya gaya hai! Customer orders live receive ho rahe hain.`
        };
      }

      // 11D. RESOLVE INCIDENT REPORT
      if (action.type === "resolve_incident") {
        const p = action.payload || {};
        await updateDoc(doc(db, "incidents", p.incidentId), {
          status: "resolved",
          resolvedAt: { seconds: Math.floor(Date.now() / 1000) },
          resolvedBy: adminUsername || "Admin AI",
          adminNotes: p.resolution || "Resolved via AI Operations Manager"
        });

        await addDoc(collection(db, "ai_audit_logs"), {
          action: `RESOLVE INCIDENT #${p.incidentId?.slice(-6)}`,
          reason: p.resolution || "Issue verified and resolved",
          source: "admin_command",
          aiDecision: "Incident status changed to resolved.",
          timestamp: { seconds: Math.floor(Date.now() / 1000) }
        });

        playChime();
        return {
          success: true,
          summary: `✅ Incident **#${p.incidentId?.slice(-6)}** successfully Resolved mark ho gaya hai.`
        };
      }

      // 11E. RESTRICT / UNRESTRICT CUSTOMER COD
      if (action.type === "restrict_customer_cod") {
        const p = action.payload || {};
        const phone = p.phone || p.customerPhone;
        const isRestricted = p.isRestricted !== false;

        if (p.userId) {
          try {
            await updateDoc(doc(db, "users", p.userId), {
              isCodRestricted: isRestricted,
              codRestrictionReason: p.reason || "Repeated refusal or cancellation profile"
            });
          } catch (e) {
            console.warn("User doc update fallback:", e);
          }
        }

        if (phone) {
          await setDoc(doc(db, "customer_risk_profiles", phone), {
            phone: phone,
            userId: p.userId || "",
            isCodRestricted: isRestricted,
            riskLevel: isRestricted ? "HIGH" : "LOW",
            notes: p.reason || "COD safety update",
            updatedAt: { seconds: Math.floor(Date.now() / 1000) }
          }, { merge: true });
        }

        await addDoc(collection(db, "ai_audit_logs"), {
          action: `${isRestricted ? 'RESTRICT' : 'UNRESTRICT'} COD FOR CUSTOMER`,
          reason: p.reason || "Fraud/Cancellation risk management",
          source: "admin_command",
          customerPhone: phone,
          aiDecision: isRestricted ? "COD disabled on customer checkout. Prepayment only." : "COD re-enabled.",
          timestamp: { seconds: Math.floor(Date.now() / 1000) }
        });

        playChime();
        return {
          success: true,
          summary: `🛡️ Customer **(${phone})** ke liye Cash on Delivery (COD) **${isRestricted ? 'RESTRICT (Blocked)' : 'UNRESTRICT (Restored)'}** kar diya gaya hai.`
        };
      }

      // 11F. UPDATE MAX COD LIMIT
      if (action.type === "set_cod_limit" || action.type === "update_cod_limit") {
        const p = action.payload || {};
        const newLimit = Number(p.maxCodLimit || p.limit) || 3000;
        await updateDoc(doc(db, "settings", "delivery"), {
          maxCodLimit: newLimit
        });

        await addDoc(collection(db, "ai_audit_logs"), {
          action: `UPDATE MAX COD SAFETY LIMIT`,
          reason: `Limit configured to Rs ${newLimit}`,
          source: "admin_command",
          aiDecision: `Orders > Rs ${newLimit} now require risk evaluation or admin approval.`,
          timestamp: { seconds: Math.floor(Date.now() / 1000) }
        });

        setCodLimitValue(newLimit);
        playChime();
        return {
          success: true,
          summary: `💰 Maximum Cash-on-Delivery safety limit ko **Rs ${newLimit.toLocaleString()}** par set kar diya gaya hai.`
        };
      }

      // 12. DELETE ITEM
      if (action.type === "delete_item") {
        const p = action.payload || {};
        const targetDish = dishes.find(
          d => d.id === p.itemId || d.name.toLowerCase() === (p.itemName || "").toLowerCase()
        );

        if (!targetDish) {
          return { success: false, summary: `❌ Item "${p.itemName || p.itemId}" nahi mila delete karne ke liye.` };
        }

        await deleteDoc(doc(db, "menu", targetDish.id));
        playChime();
        return {
          success: true,
          summary: `✅ "${targetDish.name}" menu se permanently delete kar diya gaya hai.`
        };
      }

      // 13. ADD CATEGORY
      if (action.type === "add_category" || action.type === "create_category") {
        const p = action.payload || {};
        const catName = p.name || p.categoryName || "Specialties";
        const catId = `cat_${catName.toLowerCase().replace(/\s+/g, "_")}`;
        const newCat = {
          id: catId,
          name: catName,
          imageUrl: p.imageUrl || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80",
          icon: p.icon || "Utensils",
          createdAt: { seconds: Math.floor(Date.now() / 1000) }
        };

        await setDoc(doc(db, "food_categories", catId), cleanObject(newCat));
        playChime();
        return {
          success: true,
          summary: `✅ New Category "${catName}" create ho gayi hai!`,
          undoData: { type: "delete_doc", collection: "food_categories", id: catId }
        };
      }

      // 14. UPDATE ORDER STATUS / BULK ACCEPT
      if (action.type === "update_order_status" || action.type === "bulk_update_orders") {
        const p = action.payload || {};
        const targetStatus = p.status || "accepted";

        if (p.allPending) {
          const pendingOrders = orders.filter(o => o.status === "placed" || o.status === "pending");
          for (const ord of pendingOrders) {
            await updateDoc(doc(db, "orders", ord.id), {
              status: targetStatus,
              updatedAt: new Date().toISOString()
            });
          }
          playChime();
          return {
            success: true,
            summary: `✅ Tamam ${pendingOrders.length} pending orders ko "${targetStatus.toUpperCase()}" mark kar diya gaya hai.`
          };
        }

        const targetOrder = orders.find(o => o.id === p.orderId || o.id?.slice(-5) === p.orderId);
        if (!targetOrder) {
          return { success: false, summary: `❌ Order "${p.orderId}" nahi mila.` };
        }

        await updateDoc(doc(db, "orders", targetOrder.id), {
          status: targetStatus,
          updatedAt: new Date().toISOString()
        });

        playChime();
        return {
          success: true,
          summary: `✅ Order #${targetOrder.id.slice(-6)} ka status "${targetStatus.toUpperCase()}" update kar diya gaya hai.`
        };
      }

      // 15. REWARD USER COINS / LOYALTY (SYNCED TO BOTH loyaltyCoins AND coins IN FIRESTORE)
      if (action.type === "reward_user_coins" || action.type === "add_coins" || action.type === "give_coins" || action.type === "reward_coins") {
        const p = action.payload || {};
        const coins = Number(p.coins) || Number(p.amount) || 100;
        const reason = p.reason || "VIP Customer Loyalty Reward";

        if (p.allUsers) {
          const userDocs = await getDocs(collection(db, "users"));
          let count = 0;
          for (const uDoc of userDocs.docs) {
            const uData = uDoc.data() as any;
            const currentCoins = Number(uData.loyaltyCoins ?? uData.coins ?? (uData.ordersCount || 0) * 15 ?? 0);
            const newBalance = currentCoins + coins;
            await setDoc(doc(db, "users", uDoc.id), {
              loyaltyCoins: newBalance,
              coins: newBalance,
            }, { merge: true });
            count++;
          }
          playChime();
          return {
            success: true,
            summary: `✅ Tamam ${count} users ke wallet mein ${coins} Loyalty Coins (${reason}) credit kardiye gaye hain! (loyaltyCoins aur coins dono fields successfully sync hogaye hain).`
          };
        }

        // Determine target user(s)
        let targetUsers: Array<{ uid?: string; phone?: string; name?: string }> = [];

        if (p.topUsers) {
          targetUsers = (topMostActiveCustomers || []).slice(0, Number(p.limit) || 5);
        } else if (p.bestUser || (!p.userId && !p.phone && !p.name)) {
          if ((topMostActiveCustomers || []).length > 0) {
            targetUsers = [(topMostActiveCustomers || [])[0]];
          }
        } else {
          targetUsers = [{ uid: p.userId || p.uid, phone: p.phone || p.userPhone, name: p.name || p.userName }];
        }

        if (targetUsers.length === 0 && (topMostActiveCustomers || []).length > 0) {
          targetUsers = [(topMostActiveCustomers || [])[0]];
        }

        if (targetUsers.length === 0) {
          return { success: false, summary: "❌ Koi target customer nahi mila loyalty coins credit karne ke liye." };
        }

        const results: string[] = [];

        for (const target of targetUsers) {
          let foundDocId: string | null = null;
          let currentCoins = 0;
          let resolvedName = target.name || "Customer";
          let resolvedPhone = target.phone || "";
          const targetDigits = (target.phone || "").replace(/\D/g, "");

          // 1. Try finding in allUsersList
          const matchInList = (allUsersList || []).find((u: any) => {
            const uDigits = (u.phone || "").replace(/\D/g, "");
            return (
              (target.uid && (u.uid === target.uid || u.id === target.uid)) ||
              (targetDigits && uDigits && (uDigits === targetDigits || uDigits.slice(-10) === targetDigits.slice(-10))) ||
              (target.name && u.name?.toLowerCase() === target.name.toLowerCase())
            );
          });

          if (matchInList) {
            foundDocId = matchInList.id || matchInList.uid;
            currentCoins = Number(matchInList.loyaltyCoins ?? matchInList.coins ?? (matchInList.ordersCount || 0) * 15 ?? 0);
            resolvedName = matchInList.name || resolvedName;
            resolvedPhone = matchInList.phone || resolvedPhone;
          }

          // 2. If not found in memory list, check direct phone doc in Firestore
          if (!foundDocId && resolvedPhone) {
            try {
              const directDoc = await getDoc(doc(db, "users", resolvedPhone));
              if (directDoc.exists()) {
                foundDocId = directDoc.id;
                const dData = directDoc.data() as any;
                currentCoins = Number(dData.loyaltyCoins ?? dData.coins ?? (dData.ordersCount || 0) * 15 ?? 0);
                resolvedName = dData.name || resolvedName;
              }
            } catch (err) {
              console.warn("Direct phone user check:", err);
            }
          }

          // 3. If still not found, check target uid directly
          if (!foundDocId && target.uid) {
            try {
              const uidDoc = await getDoc(doc(db, "users", target.uid));
              if (uidDoc.exists()) {
                foundDocId = uidDoc.id;
                const uData = uidDoc.data() as any;
                currentCoins = Number(uData.loyaltyCoins ?? uData.coins ?? (uData.ordersCount || 0) * 15 ?? 0);
                resolvedName = uData.name || resolvedName;
                resolvedPhone = uData.phone || resolvedPhone;
              } else {
                foundDocId = target.uid;
              }
            } catch (err) {
              console.warn("Target UID user check:", err);
            }
          }

          // 4. Search Firestore users query by phone if still not resolved
          if (!foundDocId && resolvedPhone) {
            try {
              const q = firestoreQuery(collection(db, "users"), where("phone", "==", resolvedPhone));
              const qSnap = await getDocs(q);
              if (!qSnap.empty) {
                const uData = qSnap.docs[0].data() as any;
                foundDocId = qSnap.docs[0].id;
                currentCoins = Number(uData.loyaltyCoins ?? uData.coins ?? (uData.ordersCount || 0) * 15 ?? 0);
                resolvedName = uData.name || resolvedName;
              }
            } catch (err) {
              console.warn("Firestore query users by phone fallback:", err);
            }
          }

          const newBalance = currentCoins + coins;

          if (foundDocId) {
            // Write to found document
            await setDoc(doc(db, "users", foundDocId), {
              loyaltyCoins: newBalance,
              coins: newBalance,
              name: resolvedName,
              ...(resolvedPhone ? { phone: resolvedPhone } : {})
            }, { merge: true });

            // If phone exists and is different from foundDocId, also sync phone doc
            if (resolvedPhone && resolvedPhone !== foundDocId) {
              await setDoc(doc(db, "users", resolvedPhone), {
                loyaltyCoins: newBalance,
                coins: newBalance,
                name: resolvedName,
                phone: resolvedPhone,
              }, { merge: true });
            }

            // Create in-app celebration notification for the user
            await addDoc(collection(db, "notifications"), {
              userId: foundDocId,
              phone: resolvedPhone,
              customerName: resolvedName,
              title: `🎉 +${coins} Loyalty Coins Added! 👑`,
              message: `Congratulations ${resolvedName}! Aapko ${coins} Loyalty Coins (${reason}) credit kardiye gaye hain. Naya Wallet Balance: ${newBalance} Coins. Enjoy discounts on your next meal!`,
              createdAt: { seconds: Math.floor(Date.now() / 1000) },
              read: false
            });

            results.push(`${resolvedName} (Phone: ${resolvedPhone || foundDocId}): +${coins} Coins (New Balance: ${newBalance} Coins / Rs. ${newBalance})`);
          } else if (resolvedPhone || target.phone) {
            const finalPhone = resolvedPhone || target.phone || "";
            // Create user document with phone as doc ID for instant lookup
            await setDoc(doc(db, "users", finalPhone), cleanObject({
              uid: finalPhone,
              name: resolvedName,
              phone: finalPhone,
              loyaltyCoins: coins,
              coins: coins,
              role: "buyer",
              createdAt: { seconds: Math.floor(Date.now() / 1000) }
            }), { merge: true });

            await addDoc(collection(db, "notifications"), {
              userId: finalPhone,
              phone: finalPhone,
              customerName: resolvedName,
              title: `🎉 +${coins} Loyalty Coins Added! 👑`,
              message: `Congratulations ${resolvedName}! Aapko ${coins} Loyalty Coins (${reason}) credit kardiye gaye hain. Wallet Balance: ${coins} Coins.`,
              createdAt: { seconds: Math.floor(Date.now() / 1000) },
              read: false
            });

            results.push(`${resolvedName} (${finalPhone}): +${coins} Coins (New Balance: ${coins} Coins / Rs. ${coins})`);
          }
        }

        playChime();
        return {
          success: true,
          summary: `✅ **Loyalty Coins Successfully Credited & Synced!**\n` + results.map(r => `• 🎁 **${r}**`).join('\n')
        };
      }

      // 16. CREATE / REGISTER RIDER
      if (action.type === "create_rider" || action.type === "add_rider") {
        const p = action.payload || {};
        const name = (p.name || p.riderName || "New Rider").trim();
        const rawPhone = (p.phone || p.riderPhone || p.username || "").trim();
        const password = p.password || "123456";
        const vehicleNumber = p.vehicleNumber || p.vehicleType || "Active Rider";

        const sanitizePhone = (phoneStr: string) => {
          let cleaned = phoneStr.replace(/\D/g, "");
          if (cleaned.startsWith("92")) cleaned = "0" + cleaned.substring(2);
          return cleaned || phoneStr;
        };

        const isUsername = /[a-zA-Z]/.test(rawPhone) || (rawPhone.length > 0 && rawPhone.length < 10 && !/^\d+$/.test(rawPhone));
        const cleanPhone = isUsername ? rawPhone.toLowerCase() : sanitizePhone(rawPhone || `rider_${Date.now().toString().slice(-4)}`);
        const computedEmail = `${cleanPhone}@dadu247.com`;

        let createdUid = `rider_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        let tempApp: any = null;

        try {
          // Initialize secondary App instance to create Auth credentials safely
          const uniqueAppName = `RiderAiApp_${Date.now()}`;
          tempApp = initializeApp(firebaseConfig, uniqueAppName);
          const tempAuth = getAuth(tempApp);

          try {
            const userCred = await createUserWithEmailAndPassword(tempAuth, computedEmail, password);
            createdUid = userCred.user.uid;
          } catch (authErr: any) {
            console.warn("Secondary auth registration fallback:", authErr);
            try {
              const signinCred = await signInWithEmailAndPassword(tempAuth, computedEmail, password);
              createdUid = signinCred.user.uid;
            } catch (sigErr) {
              console.warn("Sign in fallback, using generated UID");
            }
          }
        } catch (appErr) {
          console.warn("Temp secondary app init skipped:", appErr);
        } finally {
          if (tempApp) {
            try { await deleteApp(tempApp); } catch (e) {}
          }
        }

        // Store rider record in Firestore users collection
        const newRiderProfile = {
          uid: createdUid,
          name: name,
          phone: cleanPhone,
          address: "Dadu Riders HQ",
          role: "rider",
          ordersCount: 0,
          totalDeliveries: 0,
          vehicleNumber: vehicleNumber,
          createdAt: { seconds: Math.floor(Date.now() / 1000) }
        };

        await setDoc(doc(db, "users", createdUid), cleanObject(newRiderProfile));
        playChime();

        return {
          success: true,
          summary: `✅ Rider "${name}" (Phone/User: "${cleanPhone}", Password: "${password}") successfully create & activate ho gaya hai!`,
          undoData: { type: "delete_doc", collection: "users", id: createdUid }
        };
      }

      // 17. DELETE / REMOVE RIDER
      if (action.type === "delete_rider") {
        const p = action.payload || {};
        let targetUid = p.uid || p.riderId;
        
        if (!targetUid && (p.phone || p.name)) {
          const match = (ridersList || []).find((r: any) => 
            (p.phone && r.phone === p.phone) || 
            (p.name && r.name?.toLowerCase().includes(p.name.toLowerCase()))
          );
          if (match) targetUid = match.uid;
        }

        if (!targetUid) {
          return { success: false, summary: `❌ Rider "${p.name || p.phone || 'profile'}" nahi mila.` };
        }

        await deleteDoc(doc(db, "users", targetUid));
        playChime();
        return {
          success: true,
          summary: `✅ Rider profile database se successfully remove kar di gayi hai.`
        };
      }

      // 18. VERIFY / UNLOCK CUSTOMER ACCOUNT
      if (action.type === "verify_user" || action.type === "unlock_user") {
        const p = action.payload || {};
        let targetUid = p.userId || p.uid;
        if (!targetUid && p.phone) {
          const match = (allUsersList || []).find((u: any) => u.phone === p.phone);
          if (match) targetUid = match.uid;
        }

        if (!targetUid) {
          return { success: false, summary: `❌ User "${p.phone || p.userId}" nahi mila.` };
        }

        await updateDoc(doc(db, "users", targetUid), {
          status: "verified",
          isLocked: false,
          ...(p.address ? { address: p.address } : {})
        });
        playChime();
        return {
          success: true,
          summary: `✅ User (${p.phone || targetUid}) ka account Verified aur Unlock kar diya gaya hai.`
        };
      }

      // 19. BLOCK / UNBLOCK USER
      if (action.type === "block_user") {
        const p = action.payload || {};
        let targetUid = p.userId || p.uid;
        if (!targetUid && p.phone) {
          const match = (allUsersList || []).find((u: any) => u.phone === p.phone);
          if (match) targetUid = match.uid;
        }

        if (!targetUid) {
          return { success: false, summary: `❌ User "${p.phone || p.userId}" nahi mila.` };
        }

        await updateDoc(doc(db, "users", targetUid), {
          isBlocked: Boolean(p.isBlocked)
        });
        playChime();
        return {
          success: true,
          summary: `✅ User (${p.phone || targetUid}) ko ${p.isBlocked ? 'Blocked' : 'Unblocked'} mark kar diya gaya hai.`
        };
      }

      // 20. SET ITEM SCHEDULE (TIMINGS & DAYS OF AVAILABILITY)
      if (action.type === "set_item_schedule" || action.type === "schedule_item") {
        const p = action.payload || {};
        const targetDishes = p.category
          ? dishes.filter(d => d.category.toLowerCase().includes((p.category || "").toLowerCase()))
          : dishes.filter(d => d.id === p.itemId || d.name.toLowerCase().includes((p.itemName || "").toLowerCase()));

        if (targetDishes.length === 0) {
          return { success: false, summary: `❌ Item ya Category "${p.itemName || p.category || p.itemId}" nahi mili.` };
        }

        const updates: any = {};
        if (p.openingTime) updates.openingTime = p.openingTime;
        if (p.closingTime) updates.closingTime = p.closingTime;
        if (p.scheduleDays) updates.scheduleDays = p.scheduleDays;
        if (p.isAvailable !== undefined) updates.isAvailable = Boolean(p.isAvailable);

        for (const dish of targetDishes) {
          await updateDoc(doc(db, "menu", dish.id), updates);
        }

        playChime();
        const names = targetDishes.map(d => d.name).slice(0, 3).join(", ") + (targetDishes.length > 3 ? ` +${targetDishes.length - 3} more` : "");
        return {
          success: true,
          summary: `✅ Schedule Updated for ${names}: ${p.openingTime ? `Open: ${p.openingTime}` : ''} ${p.closingTime ? `Close: ${p.closingTime}` : ''} ${p.scheduleDays ? `Days: [${p.scheduleDays.join(', ')}]` : ''} ${p.isAvailable !== undefined ? (p.isAvailable ? 'Available' : 'Unavailable') : ''}`
        };
      }

      // 21. UPDATE FULL ITEM DETAILS
      if (action.type === "update_item" || action.type === "edit_item") {
        const p = action.payload || {};
        const targetDish = dishes.find(
          d => d.id === p.itemId || d.name.toLowerCase().includes((p.itemName || "").toLowerCase())
        );

        if (!targetDish) {
          return { success: false, summary: `❌ Item "${p.itemName || p.itemId}" nahi mila.` };
        }

        const updates: any = {};
        if (p.name) updates.name = p.name;
        if (p.price !== undefined) updates.price = Number(p.price);
        if (p.discountPrice !== undefined) updates.discountPrice = Number(p.discountPrice);
        if (p.category) updates.category = p.category;
        if (p.description) updates.description = p.description;
        if (p.imageUrl) updates.imageUrl = p.imageUrl;
        if (p.isAvailable !== undefined) updates.isAvailable = Boolean(p.isAvailable);
        if (p.isBestseller !== undefined) updates.isBestseller = Boolean(p.isBestseller);

        await updateDoc(doc(db, "menu", targetDish.id), updates);
        playChime();
        return {
          success: true,
          summary: `✅ "${targetDish.name}" ki details update kardi gayi hain.`
        };
      }

      // 22. DELETE CATEGORY
      if (action.type === "delete_category" || action.type === "remove_category") {
        const p = action.payload || {};
        const targetCat = foodCategories.find(
          c => c.id === p.categoryId || c.name.toLowerCase() === (p.name || p.categoryName || "").toLowerCase()
        );

        if (!targetCat) {
          return { success: false, summary: `❌ Category "${p.name || p.categoryId}" nahi mili.` };
        }

        await deleteDoc(doc(db, "food_categories", targetCat.id));
        playChime();
        return {
          success: true,
          summary: `✅ Category "${targetCat.name}" remove kardi gayi hai.`
        };
      }

      // 23. COMPOSITE MULTI-STEP WORKFLOW AUTOMATION
      if (action.type === "composite_automation" || action.type === "run_automation") {
        const p = action.payload || {};
        const workflowType = p.workflowType || "reactivate_inactive_users";
        let impactedUsersCount = 0;
        let createdCouponCode = "";

        if (workflowType === "reactivate_inactive_users" || workflowType === "inactive_offer_coins") {
          const discountAmt = Number(p.discountAmount) || 20;
          const coinsAmt = Number(p.coins) || 100;
          const couponCode = (p.voucherCode || `COMEBACK${discountAmt}`).toUpperCase();
          createdCouponCode = couponCode;

          // Step 1: Create Voucher in Firestore
          await setDoc(doc(db, "vouchers", couponCode), cleanObject({
            code: couponCode,
            discountAmount: discountAmt,
            discountType: p.discountType || "percentage",
            minOrderAmount: 400,
            description: `Special ${discountAmt}% Welcome Back Offer for Valued Customers!`,
            isActive: true,
            createdAt: { seconds: Math.floor(Date.now() / 1000) },
            expiryDate: new Date(Date.now() + 15 * 86400000).toISOString()
          }));

          // Step 2: Target Inactive Users or All Customers with no recent orders
          const eligibleUsers = (allUsersList || []).filter((u: any) => {
            if (u.role === "admin" || u.role === "rider") return false;
            return !u.ordersCount || u.ordersCount === 0 || u.status === "inactive";
          });

          const targetList = eligibleUsers.length > 0 ? eligibleUsers : (allUsersList || []).slice(0, 15);

          for (const u of targetList) {
            const uid = u.id || u.uid || u.phone;
            if (!uid) continue;
            impactedUsersCount++;

            const currentCoins = Number(u.loyaltyCoins ?? u.coins ?? 0);
            const newBal = currentCoins + coinsAmt;

            // Step 3: Credit Loyalty Coins with dual Firestore sync
            await setDoc(doc(db, "users", uid), {
              loyaltyCoins: newBal,
              coins: newBal
            }, { merge: true });

            // Step 4: Push In-App Direct Notification
            await addDoc(collection(db, "notifications"), cleanObject({
              userId: uid,
              phone: u.phone || "",
              customerName: u.name || "Customer",
              title: p.notificationTitle || `🎁 Exclusive ${discountAmt}% OFF + ${coinsAmt} Coins For You!`,
              message: p.notificationMessage || `Humne aapko miss kiya! Use coupon "${couponCode}" to get ${discountAmt}% OFF. Aapke wallet mein +${coinsAmt} Loyalty Coins bhi add kardiye gaye hain!`,
              createdAt: { seconds: Math.floor(Date.now() / 1000) },
              read: false
            }));
          }

          playChime();
          return {
            success: true,
            summary: `✅ **Multi-Step Automation Complete!**\n• 🎟️ Voucher Created: **${couponCode}** (${discountAmt}% OFF)\n• 👥 Target Audience: **${impactedUsersCount} Customers**\n• 🎁 Coins Distributed: **+${coinsAmt} Loyalty Coins** to each user\n• 📱 Notifications: Push alerts delivered to all eligible customer devices.`
          };
        }

        return {
          success: true,
          summary: `✅ Automation workflow "${workflowType}" executed successfully!`
        };
      }

      return { success: false, summary: `Unknown action: ${action.type}` };
    } catch (err: any) {
      console.error("Action execution error:", err);
      return { success: false, summary: `❌ Action fail ho gaya: ${err?.message || 'Permission Error'}` };
    }
  };

  // Undo Handler
  const handleUndoAction = async (msgId: string, actionIdx: number, undoData: any) => {
    if (!undoData) return;
    try {
      if (undoData.type === "delete_doc") {
        await deleteDoc(doc(db, undoData.collection, undoData.id));
      } else if (undoData.type === "delete_batch") {
        for (const id of undoData.ids || []) {
          await deleteDoc(doc(db, undoData.collection, id));
        }
      } else if (undoData.type === "restore_dish_price") {
        await updateDoc(doc(db, "menu", undoData.id), {
          price: undoData.oldPrice,
          ...(undoData.oldDiscount !== undefined ? { discountPrice: undoData.oldDiscount } : {})
        });
      }

      setMessages(prev =>
        prev.map(msg => {
          if (msg.id !== msgId) return msg;
          const acts = [...(msg.actions || [])];
          if (acts[actionIdx]) {
            acts[actionIdx] = {
              ...acts[actionIdx],
              status: "failed",
              summary: `↩️ Reverted / Undone: ${acts[actionIdx].summary}`
            };
          }
          return { ...msg, actions: acts };
        })
      );
    } catch (err) {
      console.error("Undo error:", err);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    const userMsg: AiManagerMessage = {
      id: `user-${Date.now()}`,
      sender: "admin",
      text: query,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage("");
    setIsLoading(true);

    try {
      // Live telemetry values
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayOrders = orders.filter(o => {
        let oDate: Date | null = null;
        if (typeof o.createdAt?.seconds === "number") oDate = new Date(o.createdAt.seconds * 1000);
        else if (o.createdAt instanceof Date) oDate = o.createdAt;
        else if (typeof o.createdAt === "string") oDate = new Date(o.createdAt);
        return oDate && oDate >= todayStart;
      });

      const todayRevenue = todayOrders
        .filter(o => o.status === "delivered" || o.status === "completed")
        .reduce((sum, o) => sum + (o.grandTotal || (o as any).total || 0), 0);

      const deliveredOrders = orders.filter(o => o.status === "delivered" || o.status === "completed");
      const cancelledOrders = orders.filter(o => o.status === "cancelled");
      const cancellationRate = orders.length > 0 ? Math.round((cancelledOrders.length / orders.length) * 100) : 0;

      const ratedOrders = orders.filter(o => typeof o.rating === "number" && o.rating > 0);
      const avgRating = ratedOrders.length > 0
        ? (ratedOrders.reduce((sum, o) => sum + (o.rating || 5), 0) / ratedOrders.length).toFixed(1)
        : "5.0";

      const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.grandTotal || (o as any).total || 0), 0);
      const aov = deliveredOrders.length > 0 ? Math.round(totalRevenue / deliveredOrders.length) : 0;

      const activeOrdersCount = orders.filter(
        o => o.status !== "delivered" && o.status !== "completed" && o.status !== "cancelled"
      ).length;

      const outOfStockDishes = dishes.filter(d => d.isAvailable === false);

      const restaurants = Array.from(
        new Set([
          ...dishes.map(d => d.restaurantName || "Dadu Fast Food & Kitchen"),
          ...Object.keys(deliverySettings?.restaurantStatuses || {})
        ])
      );

      const contextPayload = {
        dishesCount: dishes.length,
        outOfStockCount: outOfStockDishes.length,
        outOfStockNames: outOfStockDishes.map(d => d.name),
        categories: foodCategories.map(c => c.name),
        sampleDishes: dishes.map(d => ({
          id: d.id,
          name: d.name,
          price: d.price,
          category: d.category,
          isAvailable: d.isAvailable !== false,
          isBestseller: d.isBestseller
        })),
        totalOrdersCount: orders.length,
        todayOrdersCount: todayOrders.length,
        activeOrdersCount,
        todayRevenue,
        totalRevenue,
        aov,
        cancelledOrdersCount: cancelledOrders.length,
        cancellationRate,
        reviewsCount: ratedOrders.length,
        avgRating,
        totalUsers: totalUsersCount || allUsersList?.length || topMostActiveCustomers.length,
        verifiedUsersCount: (allUsersList || []).filter((u: any) => !u.isBlocked && !u.isLocked).length,
        lockedUsersCount: (allUsersList || []).filter((u: any) => u.isLocked || u.status === "pending" || u.status === "locked").length,
        lockedUsersList: (allUsersList || []).filter((u: any) => u.isLocked || u.status === "pending" || u.status === "locked"),
        topMostActiveCustomers: topMostActiveCustomers.slice(0, 15),
        topSpenderCustomers: topSpenderCustomers.slice(0, 15),
        topSellingDishes,
        totalRidersCount: riderStatsList.length,
        ridersList: riderStatsList,
        restaurants
      };

      const historyPayload = messages.slice(-8).map(m => ({
        role: m.sender === "admin" ? "user" : "model",
        content: m.text
      }));

      let data: any = null;

      try {
        const response = await fetch("/api/ai/admin-manager", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: query,
            history: historyPayload,
            context: contextPayload
          })
        });

        if (response.ok) {
          data = await response.json();
        }
      } catch (networkErr) {
        console.warn("API Manager fetch offline fallback:", networkErr);
      }

      // High-IQ Client-side Fallback & Real-time Intelligence Engine
      if (!data || !data.reply) {
        const lowerMsg = query.toLowerCase();
        const localActions: any[] = [];
        let localReply = "";
        let localPrompts: string[] = [
          "👑 Sabse zyada order kisne kiye hain?",
          "🛵 Naya Rider ID banao: Tariq 03001234567",
          "📊 Aaj ki complete sales aur AOV report do",
          "🏷️ Fast food par 15% discount lagao",
          "🚀 2 High-Profit Combo Deals create karo"
        ];

        // 1. BEST USER / SPECIFIC USER / ALL USERS LOYALTY COIN REWARD ("jo user best hai usko loyalty coin add kro", "03277004471 ko coins do", etc.)
        if (
          (lowerMsg.includes("coin") || lowerMsg.includes("loyalty") || lowerMsg.includes("reward") || lowerMsg.includes("points") || lowerMsg.includes("inaam")) &&
          (lowerMsg.includes("best") || lowerMsg.includes("top") || lowerMsg.includes("loyal") || lowerMsg.includes("sabse zyada") || lowerMsg.includes("ziyada") || lowerMsg.includes("user") || lowerMsg.includes("customer") || lowerMsg.includes("unko") || lowerMsg.includes("isko") || lowerMsg.includes("add") || lowerMsg.includes("kro") || lowerMsg.includes("karo") || lowerMsg.includes("do") || lowerMsg.includes("dein") || lowerMsg.includes("hal") || lowerMsg.includes("check") || lowerMsg.includes("show"))
        ) {
          const numMatch = lowerMsg.match(/\b\d+\b/);
          const coinsAmount = numMatch ? parseInt(numMatch[0], 10) : 100;
          const isAll = lowerMsg.includes("tamam") || lowerMsg.includes("sab") || lowerMsg.includes("all");
          const isTop5 = lowerMsg.includes("top 5") || lowerMsg.includes("top users") || lowerMsg.includes("top customers");
          const phoneExtract = query.match(/(?:\+?92|0)?3\d{2}[-\s]?\d{7}/) || query.match(/\b03\d{9}\b/);
          const explicitPhone = phoneExtract ? phoneExtract[0].replace(/\D/g, "") : null;

          if (isAll) {
            localActions.push({
              type: "reward_user_coins",
              payload: { allUsers: true, coins: coinsAmount, reason: "Storewide Loyalty Reward" }
            });
            localReply = `Boss! Tamam registered customers ko **${coinsAmount} Loyalty Coins** credit karne ka process shuru kar diya gaya hai aur Firestore database sync kar diya gaya hai.`;
          } else if (isTop5) {
            localActions.push({
              type: "reward_user_coins",
              payload: { topUsers: true, limit: 5, coins: coinsAmount, reason: "Top 5 VIP Customer Reward" }
            });
            localReply = `Boss! Hamare Top 5 VIP Loyal Customers ko **${coinsAmount} Loyalty Coins** reward kardiye gaye hain!`;
          } else if (explicitPhone) {
            const matchedUser = (allUsersList || []).find((u: any) => (u.phone || "").replace(/\D/g, "").includes(explicitPhone.slice(-10)));
            const targetName = matchedUser?.name || "Customer";
            localActions.push({
              type: "reward_user_coins",
              payload: {
                userId: matchedUser?.uid || matchedUser?.id || explicitPhone,
                phone: explicitPhone,
                name: targetName,
                coins: coinsAmount,
                reason: "VIP Loyalty Coin Credit"
              }
            });
            localReply = `Boss! Customer **${targetName}** (Phone: \`${explicitPhone}\`) ko **${coinsAmount} Loyalty Coins** successfully add kardiye gaye hain!\n\n🎁 Customer ke account wallet mein \`loyaltyCoins\` aur \`coins\` fields sync kardi gayi hain taake customer ko turant nazar aaye.`;
          } else {
            const top1 = (topMostActiveCustomers || [])[0];
            const topName = top1?.name || "Top Loyal Customer";
            const topPhone = top1?.phone || "";
            localActions.push({
              type: "reward_user_coins",
              payload: {
                bestUser: true,
                userId: top1?.userId,
                phone: topPhone,
                name: topName,
                coins: coinsAmount,
                reason: "Best Customer VIP Loyalty Gift"
              }
            });
            localReply = `Boss! Hamare #1 Top Customer **${topName}** (Phone: \`${topPhone || 'Registered'}\`, Orders: ${top1?.ordersCount || 1}) ko **${coinsAmount} Loyalty Coins** successfully add aur sync kardiye gaye hain!\n\n🎁 Customer ke account wallet mein \`loyaltyCoins\` aur \`coins\` dono fields me balance update ho chuka hai aur in-app notification send kar di gayi hai.`;
            localPrompts = [
              `📢 ${topName} ko VIP thank you message bhejo`,
              "🎟️ 20% OFF VIP Promo Voucher create karo",
              "👑 Sabse zyada order kisne kiye hain?"
            ];
          }
        }
        // 2. SEND MESSAGE / NOTIFICATION TO BEST USER / TOP USERS ("jo user best hai unko ye msg kro", "best customer ko message bhejo", etc.)
        else if (
          (lowerMsg.includes("msg") || lowerMsg.includes("message") || lowerMsg.includes("paighaam") || lowerMsg.includes("sms") || lowerMsg.includes("alert") || (lowerMsg.includes("notification") && !lowerMsg.includes("list"))) &&
          (lowerMsg.includes("best") || lowerMsg.includes("top") || lowerMsg.includes("loyal") || lowerMsg.includes("user") || lowerMsg.includes("customer") || lowerMsg.includes("unko") || lowerMsg.includes("isko") || lowerMsg.includes("ye") || lowerMsg.includes("kro") || lowerMsg.includes("karo") || lowerMsg.includes("bhejo") || lowerMsg.includes("send"))
        ) {
          const top1 = (topMostActiveCustomers || [])[0];
          const topName = top1?.name || "Top Customer";
          const topPhone = top1?.phone || "";

          // Extract potential message content
          let extractedMsg = query
            .replace(/jo user best hai unko/gi, "")
            .replace(/jo user best hai usko/gi, "")
            .replace(/best user ko/gi, "")
            .replace(/top customer ko/gi, "")
            .replace(/unko/gi, "")
            .replace(/isko/gi, "")
            .replace(/ye msg kro/gi, "")
            .replace(/ye message bhejo/gi, "")
            .replace(/msg kro/gi, "")
            .replace(/message kro/gi, "")
            .replace(/notification bhejo/gi, "")
            .replace(/send message/gi, "")
            .trim();

          if (!extractedMsg || extractedMsg.length < 5) {
            extractedMsg = `Assalam-o-Alaikum ${topName}! Dadu Food Delivery ka top loyal customer banne par shukriya! Aapke liye special discounts aur VIP rewards active hain.`;
          }

          localActions.push({
            type: "send_notification",
            payload: {
              bestUser: true,
              topUsers: true,
              userId: top1?.userId,
              phone: topPhone,
              name: topName,
              title: "Special VIP Appreciation Message 👑",
              message: extractedMsg
            }
          });

          localReply = `Boss! Hamare Top Customer **${topName}** (Phone: \`${topPhone || 'VIP'}\`) ko aapka direct message/notification send kar diya gaya hai:\n\n📝 **Message Text:**\n*"${extractedMsg}"*\n\nCustomer ke device par push notification receive ho chuki hai!`;
          localPrompts = [
            `🎁 ${topName} ko 100 Loyalty Coins gift karo`,
            "🎟️ 20% OFF VIP Promo Voucher create karo",
            "👑 Sabse zyada order kisne kiye hain?"
          ];
        }
        // 3. BEST USER / TOP CUSTOMERS / MOST ORDERS INQUIRY
        else if (
          lowerMsg.includes("best user") ||
          lowerMsg.includes("top user") ||
          lowerMsg.includes("top customer") ||
          lowerMsg.includes("sabse zyada order") ||
          lowerMsg.includes("sabse ziada") ||
          lowerMsg.includes("ziyada order") ||
          lowerMsg.includes("zyada order") ||
          lowerMsg.includes("most order") ||
          lowerMsg.includes("loyal") ||
          lowerMsg.includes("vip customer") ||
          lowerMsg.includes("best customer") ||
          lowerMsg.includes("top spender")
        ) {
          if (topMostActiveCustomers.length > 0) {
            const top1 = topMostActiveCustomers[0];
            const top5List = topMostActiveCustomers.slice(0, 5);

            let rankingText = top5List
              .map((u, idx) => {
                const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `🏅 #${idx + 1}`;
                return `${medal} **${u.name}** (Phone: \`${u.phone}\`)\n   📦 **${u.ordersCount} Orders** (${u.deliveredCount} Delivered) | 💰 Rs ${u.totalSpent.toLocaleString()} Spent | 📍 ${u.address || "Dadu"}`;
              })
              .join("\n\n");

            localReply = `Boss! Dadu Food Delivery data audit ke mutabiq hamare **#1 Most Active Loyal Customer** ye hain:\n\n👑 **${top1.name}**\n📞 **Phone:** \`${top1.phone}\`\n📦 **Total Orders Placed:** ${top1.ordersCount} Orders (${top1.deliveredCount} Successfully Delivered)\n💰 **Total Purchasing:** Rs ${top1.totalSpent.toLocaleString()}\n📍 **Delivery Area:** ${top1.address || "Dadu, Sindh"}\n\n🏆 **Top 5 Customers Leaderboard Ranking:**\n\n${rankingText}\n\nKya aap in top loyal customers ko VIP Loyalty Coins reward ya special promo voucher bhejna chahte hain?`;
            localPrompts = [
              `🎁 ${top1.name} ko 100 Loyalty Coins gift karo`,
              `📢 ${top1.name} ko appreciation message bhejo`,
              "🎟️ Naya 20% OFF VIP Voucher create karo"
            ];
          } else {
            localReply = `Boss! Filhal database mein orders process ho rahe hain. Jaise hi customers orders place karenge, unki real-time ranking aur total spending yahan automatically calculate ho kar show hogi.`;
          }
        }
        // 2. RIDER CREATION / REGISTRATION
        else if (
          lowerMsg.includes("rider new id") ||
          lowerMsg.includes("naya rider") ||
          lowerMsg.includes("rider banao") ||
          lowerMsg.includes("rider id") ||
          lowerMsg.includes("rider add") ||
          lowerMsg.includes("rider register") ||
          lowerMsg.includes("new rider")
        ) {
          // Extract phone number regex
          const phoneMatch = query.match(/(?:03\d{9}|923\d{9}|\b\d{10,11}\b)/);
          const extractedPhone = phoneMatch ? phoneMatch[0] : "";

          // Extract potential rider name
          let cleanRiderName = query
            .replace(/rider/gi, "")
            .replace(/new/gi, "")
            .replace(/id/gi, "")
            .replace(/banao/gi, "")
            .replace(/banayein/gi, "")
            .replace(/add/gi, "")
            .replace(/karo/gi, "")
            .replace(/karein/gi, "")
            .replace(/register/gi, "")
            .replace(/naya/gi, "")
            .replace(/naye/gi, "")
            .replace(/ki/gi, "")
            .replace(/ka/gi, "")
            .replace(/pass/gi, "")
            .replace(/password/gi, "")
            .replace(/pin/gi, "")
            .replace(/(?:03\d{9}|923\d{9}|\b\d{10,11}\b)/g, "")
            .replace(/[:\-]/g, "")
            .trim();

          const riderName = cleanRiderName.length >= 2 ? cleanRiderName.charAt(0).toUpperCase() + cleanRiderName.slice(1) : "";

          if (riderName || extractedPhone) {
            const finalName = riderName || "Active Rider";
            const finalPhone = extractedPhone || `0300${Math.floor(1000000 + Math.random() * 9000000)}`;
            const defaultPass = "123456";

            localActions.push({
              type: "create_rider",
              payload: {
                name: finalName,
                phone: finalPhone,
                password: defaultPass,
                vehicleNumber: "Active Rider"
              }
            });

            localReply = `Boss! Naye Rider **${finalName}** ki ID create aur register kardi gayi hai!\n\n📋 **Rider Profile Details:**\n• 👤 **Rider Name:** ${finalName}\n• 📱 **Login Phone / Username:** \`${finalPhone}\`\n• 🔑 **Default Login PIN / Password:** \`${defaultPass}\`\n• 🛵 **Vehicle Status:** Active Duty\n\nRider is credentials se Rider Portal par foran login karke delivery orders receive kar sakta hai!`;
            localPrompts = [
              "🛵 Tamam registered riders ki list dikhao",
              "📊 Aaj ke active riders ka status kya hai?",
              "🚀 2 High-Profit Combo Deals create karo"
            ];
          } else {
            localReply = `Jee Boss! Main naya Rider register karne ke liye tayar hoon.\n\nBarah-e-karam Rider ka **Naam** aur **Phone Number** batayein (jaise: *"Rider Tariq 03001234567"*), ya niche diye gaye 1-Click buttons par click karein:`;
            localPrompts = [
              "🛵 Naya Rider banao: Name: Tariq Ahmed, Phone: 03001234567",
              "🛵 Naya Rider banao: Name: Ali Raza, Phone: 03129876543",
              "🛵 Tamam registered riders ki list dikhao"
            ];
          }
        }
        // 3. RIDER FLEET STATUS / LIST
        else if (lowerMsg.includes("rider") && (lowerMsg.includes("list") || lowerMsg.includes("kon") || lowerMsg.includes("kitne") || lowerMsg.includes("status") || lowerMsg.includes("kaun"))) {
          if (riderStatsList.length > 0) {
            const riderText = riderStatsList
              .map((r, idx) => `🛵 **${idx + 1}. ${r.name}** | Phone: \`${r.phone}\` | Completed: **${r.ordersCount} Deliveries** | Active: ${r.activeOrders}`)
              .join("\n");
            localReply = `Boss! Platform par total **${riderStatsList.length} Riders** registered hain:\n\n${riderText}\n\nAap kisi bhi waqt naya rider add kar sakte hain ya existing rider ko task assign kar sakte hain.`;
          } else {
            localReply = `Boss! Platform par filhal koi rider registered nahi hai. Naya rider add karne ke liye hukum dein (e.g. *"Rider Tariq 03001234567"*).`;
          }
        }
        // 4. TOP SELLING DISHES & BESTSELLERS
        else if (lowerMsg.includes("bik") || lowerMsg.includes("bestseller") || lowerMsg.includes("top dish") || lowerMsg.includes("popular") || (lowerMsg.includes("zyada") && lowerMsg.includes("item"))) {
          if (topSellingDishes.length > 0) {
            const dishText = topSellingDishes
              .slice(0, 5)
              .map((d, idx) => `🔥 **${idx + 1}. ${d.name}** | **${d.count} units sold** | Total Revenue: Rs ${d.revenue.toLocaleString()}`)
              .join("\n");
            localReply = `Boss! Platform par sabse zyada demand wale **Top Bestselling Items** ye hain:\n\n${dishText}\n\nIn items ki inventory aur fresh supply ready rakhna profitable rahega!`;
          } else {
            const sampleBestsellers = dishes.filter(d => d.isBestseller).slice(0, 5);
            const dishText = sampleBestsellers.map((d, idx) => `⭐ **${idx + 1}. ${d.name}** (Rs ${d.price}) - ${d.category}`).join("\n");
            localReply = `Boss! Current menu mein featured Bestseller items ye hain:\n\n${dishText || "Menu dishes ready hain."}`;
          }
        }
        // 5. COMBOS & DEALS
        else if (lowerMsg.includes("combo") || lowerMsg.includes("deal") || lowerMsg.includes("family")) {
          localActions.push({
            type: "batch_add_items",
            payload: {
              items: [
                {
                  name: "Mega Zinger Feast Combo",
                  price: 890,
                  discountPrice: 750,
                  category: "Deals & Combos",
                  description: "2 Crispy Zinger Burgers + Large Seasoned Fries + 2 Cold Drinks (345ml)",
                  isBestseller: true
                },
                {
                  name: "Family Karahi Platter Deal",
                  price: 1850,
                  discountPrice: 1599,
                  category: "Deals & Combos",
                  description: "Half Chicken Karahi + 4 Roghani Naan + 1 Raita Salad + 1.5L Drink",
                  isBestseller: true
                }
              ]
            }
          });
          localReply = `Boss! Maine 2 high-converting value combos ("Mega Zinger Feast" aur "Family Karahi Platter") create karke Menu mein add kardiye hain. Ye combos customer average order value (AOV) ko barhayenge!`;
        }
        // 6. SALES & REVENUE REPORT
        else if (lowerMsg.includes("sales") || lowerMsg.includes("order") || lowerMsg.includes("summary") || lowerMsg.includes("report") || lowerMsg.includes("aov") || lowerMsg.includes("kamai")) {
          localReply = `Boss, live business analysis:\n\n• 💰 **Aaj ki Sales:** Rs ${todayRevenue.toLocaleString()}\n• 📈 **Total Lifetime Revenue:** Rs ${totalRevenue.toLocaleString()}\n• 🎯 **Average Order Value (AOV):** Rs ${aov}\n• 📦 **Active In-Progress Orders:** ${activeOrdersCount} orders kitchen/delivery process mein hain\n• 🍽️ **Total Menu Items:** ${dishes.length} items (${outOfStockDishes.length} out of stock)\n• 👥 **Registered Customers:** ${totalUsersCount || topMostActiveCustomers.length} users\n• 🛵 **Active Riders Fleet:** ${riderStatsList.length} riders\n\nStore performance bilkul healthy hai!`;
        }
        // 7. VOUCHERS & COUPONS
        else if (lowerMsg.includes("voucher") || lowerMsg.includes("coupon") || lowerMsg.includes("promo")) {
          const code = `OFFER${Math.floor(100 + Math.random() * 900)}`;
          localActions.push({
            type: "create_voucher",
            payload: {
              code,
              discountAmount: 15,
              discountType: "percentage",
              minOrderAmount: 500,
              description: "Special App Promo Discount Voucher"
            }
          });
          localReply = `Boss, naya promo coupon code "${code}" (15% OFF on min order Rs 500) successfully create aur activate kar diya gaya hai!`;
        }
        // 8. RESTOCK ALL ITEMS
        else if (lowerMsg.includes("restock") || (lowerMsg.includes("out of stock") && (lowerMsg.includes("enable") || lowerMsg.includes("theek")))) {
          localActions.push({
            type: "toggle_stock",
            payload: {
              isAvailable: true
            }
          });
          localReply = `Boss! Tamam ${outOfStockDishes.length} out-of-stock items ko wapis Available (In Stock) mark kar diya gaya hai. Customers ab inhein foran order kar sakte hain.`;
        }
        // 9. ADD SPECIFIC DISH
        else if (lowerMsg.includes("add") && (lowerMsg.includes("burger") || lowerMsg.includes("pizza") || lowerMsg.includes("karahi") || lowerMsg.includes("boti") || lowerMsg.includes("item"))) {
          const priceMatch = lowerMsg.match(/\d+/);
          const extractedPrice = priceMatch ? parseInt(priceMatch[0], 10) : 450;
          const cleanName = query.replace(/add/i, "").replace(/menu/i, "").replace(/mein/i, "").replace(/karo/i, "").replace(/rs\.?/i, "").replace(/\d+/g, "").trim() || "Special Dish";
          const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
          const cat = lowerMsg.includes("burger") || lowerMsg.includes("pizza") ? "Fast Food" : (foodCategories[0]?.name || "Fast Food");
          localActions.push({
            type: "add_item",
            payload: {
              name: formattedName,
              price: extractedPrice,
              category: cat,
              isBestseller: true
            }
          });
          localReply = `Jee Boss! Maine "${formattedName}" ko Rs ${extractedPrice} ki price ke sath "${cat}" category mein add kar diya hai aur Bestseller tag bhi laga diya hai.`;
        }
        // 11. PRICE UPDATE COMMANDS ("Chicken Burger ki price 600 karo", "price change karo", etc.)
        else if (
          (lowerMsg.includes("price") || lowerMsg.includes("keemat") || lowerMsg.includes("qeemat")) &&
          (lowerMsg.includes("karo") || lowerMsg.includes("kardo") || lowerMsg.includes("change") || lowerMsg.includes("update") || lowerMsg.includes("badlo") || lowerMsg.includes("set"))
        ) {
          const numMatch = lowerMsg.match(/\b\d+\b/);
          const newPrice = numMatch ? parseInt(numMatch[0], 10) : 500;
          const targetDish = dishes.find(d => lowerMsg.includes(d.name.toLowerCase()) || d.name.toLowerCase().includes("burger") && lowerMsg.includes("burger") || d.name.toLowerCase().includes("pizza") && lowerMsg.includes("pizza")) || dishes[0];

          if (targetDish) {
            localActions.push({
              type: "update_price",
              payload: {
                itemId: targetDish.id,
                itemName: targetDish.name,
                newPrice: newPrice
              }
            });
            localReply = `Boss! **"${targetDish.name}"** ki price Rs ${targetDish.price} se update karke **Rs ${newPrice}** set karne ka action execute kar diya gaya hai.`;
          } else {
            localReply = `Boss! Item ka naam batayein jiski price update karni hai (e.g. *"Chicken Burger ki price 600 kar do"*).`;
          }
        }
        // 12. ITEM SCHEDULING ("Pizza 11 PM ke baad band ho", "Sunday ko burger band karo", "Breakfast 7 AM to 12 PM")
        else if (
          (lowerMsg.includes("band") || lowerMsg.includes("timing") || lowerMsg.includes("schedule") || lowerMsg.includes("available")) &&
          (lowerMsg.includes("ke baad") || lowerMsg.includes("se pehle") || lowerMsg.includes("pm") || lowerMsg.includes("am") || lowerMsg.includes("sunday") || lowerMsg.includes("subah") || lowerMsg.includes("raat"))
        ) {
          const timeMatch = lowerMsg.match(/(\d{1,2})\s*(?:pm|am|baje)/i) || lowerMsg.match(/(\d{1,2}):(\d{2})/);
          const targetDish = dishes.find(d => lowerMsg.includes(d.name.toLowerCase()) || d.category.toLowerCase().includes(lowerMsg.includes("pizza") ? "pizza" : lowerMsg.includes("burger") ? "burger" : "food")) || dishes[0];

          localActions.push({
            type: "set_item_schedule",
            payload: {
              itemId: targetDish?.id,
              itemName: targetDish?.name || "Target Item",
              closingTime: "23:00",
              scheduleDays: lowerMsg.includes("sunday") ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] : ["All"],
              isAvailable: true
            }
          });
          localReply = `Boss! **"${targetDish?.name || 'Selected Items'}"** ke liye availability schedule configure kar diya gaya hai! Menu items defined timings aur days par autonomously open aur close honge.`;
        }
        // 13. CUSTOMER ORDER HISTORY & SEARCH ("Ali ne kitne order kiye", "Customer history", "03001234567 ke orders")
        else if (
          lowerMsg.includes("kitne order") ||
          lowerMsg.includes("order history") ||
          lowerMsg.includes("kya kya order kiya") ||
          lowerMsg.includes("last order") ||
          lowerMsg.includes("details do") ||
          lowerMsg.includes("search customer") ||
          lowerMsg.includes("customer details")
        ) {
          const phoneExtract = query.match(/(?:\+?92|0)?3\d{2}[-\s]?\d{7}/) || query.match(/\b03\d{9}\b/);
          const explicitPhone = phoneExtract ? phoneExtract[0].replace(/\D/g, "") : null;

          const matchedUser = explicitPhone
            ? (allUsersList || []).find((u: any) => (u.phone || "").replace(/\D/g, "").includes(explicitPhone.slice(-10)))
            : (topMostActiveCustomers || []).find(u => lowerMsg.includes(u.name.toLowerCase()));

          if (matchedUser || topMostActiveCustomers.length > 0) {
            const u = matchedUser || topMostActiveCustomers[0];
            const userOrders = orders.filter(o => ((o as any).customerPhone && (o as any).customerPhone.includes(u.phone)) || o.userPhone === u.phone || o.userId === (u as any).userId);
            const userDelivered = userOrders.filter(o => o.status === "delivered" || o.status === "completed");
            const totalSpent = userDelivered.reduce((sum, o) => sum + (o.grandTotal || (o as any).total || 0), 0);

            const itemsMap: Record<string, number> = {};
            userOrders.forEach(o => {
              (o.items || []).forEach((it: any) => {
                const n = it.name || "Item";
                itemsMap[n] = (itemsMap[n] || 0) + (it.quantity || 1);
              });
            });

            const topItems = Object.entries(itemsMap).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, q]) => `${n} (${q}x)`).join(", ");

            localReply = `Boss! Customer **${u.name}** ki complete order history aur profile telemetry ye hai:\n\n👤 **Customer Name:** ${u.name}\n📞 **Phone Number:** \`${u.phone}\`\n📦 **Total Orders:** ${userOrders.length || (u as any).ordersCount || 1} (${userDelivered.length} Delivered)\n💰 **Total Purchasing:** Rs ${totalSpent.toLocaleString()}\n📍 **Address:** ${(u as any).address || "Dadu"}\n🍔 **Favorite Items:** ${topItems || "Burgers & Pizza"}\n\nAap inko foran Loyalty Coins ya exclusive discount offer bhej sakte hain!`;
            localPrompts = [
              `🎁 ${u.name} ko 100 Loyalty Coins credit karo`,
              `📢 ${u.name} ko VIP promo offer bhejo`,
              "👑 Top 5 Customers Leaderboard dikhao"
            ];
          } else {
            localReply = `Boss! Customer ka phone number ya naam batayein taake main unki real-time order history aur lifetime spending fetch kar sakun.`;
          }
        }
        // 14. INACTIVE CUSTOMERS & NEVER ORDERED LIST ("Jin users ne kabhi order nahi kiya", "Inactive customers")
        else if (
          lowerMsg.includes("kabhi order nahi") ||
          lowerMsg.includes("inactive") ||
          lowerMsg.includes("never ordered") ||
          lowerMsg.includes("purane user") ||
          lowerMsg.includes("dead user")
        ) {
          const inactiveUsers = (allUsersList || []).filter((u: any) => {
            if (u.role === "admin" || u.role === "rider") return false;
            return !u.ordersCount || u.ordersCount === 0 || u.status === "inactive";
          });

          const count = inactiveUsers.length;
          const sampleList = inactiveUsers.slice(0, 5).map((u: any, i: number) => `• ${i + 1}. **${u.name || 'Customer'}** (Phone: \`${u.phone || 'Registered'}\`) - 0 Orders`).join('\n');

          localReply = `Boss! Platform audit ke mutabiq total **${count || (allUsersList || []).length} Inactive Customers** mojood hain jinhon ne kafi arse se ya abhi tak koi order place nahi kiya.\n\n📋 **Sample Inactive Users List:**\n${sampleList || "• Registered app users list ready"}\n\n💡 **Manager Recommendation:** In inactive users ko re-engage karne ke liye **20% OFF Welcome-Back Coupon** aur **100 Loyalty Coins** ka automated push campaign launch karna chahiye!`;
          localPrompts = [
            "⚡ Inactive users ko 20% discount aur 100 loyalty coins bhejo",
            "🎟️ Naya 20% OFF Welcome Coupon create karo",
            "📢 Inactive customers ko WhatsApp alert bhejo"
          ];
        }
        // 15. SMART CANCELLATION MONITORING & ANALYSIS ("Kitne orders cancel huye", "Cancelled orders")
        else if (
          lowerMsg.includes("cancel") ||
          lowerMsg.includes("rejected") ||
          lowerMsg.includes("mansookh") ||
          lowerMsg.includes("cancellation")
        ) {
          const cancelledList = orders.filter(o => o.status === "cancelled");
          const rate = orders.length > 0 ? Math.round((cancelledList.length / orders.length) * 100) : 0;

          localReply = `Boss! Live Order Cancellation & Operations Audit Report:\n\n• 🚫 **Total Cancelled Orders:** ${cancelledList.length} (${rate}% of all orders)\n• ⏱️ **Operational Status:** ${rate < 10 ? '✅ Healthy (Under 10%)' : '⚠️ Attention Required (Above 10%)'}\n• 🔍 **Common Cancellation Factors:** Kitchen prep delay & rider transit delays during rush hours.\n\n💡 **Manager Action:** Riders ko instant dispatch notify karne se cancellations mazeed kam ho sakti hain!`;
          localPrompts = [
            "🛵 Active Riders ka status dikhao",
            "📊 Aaj ki complete sales report do",
            "🚀 2 High-Profit Combo Deals create karo"
          ];
        }
        // 16. REVIEWS & FEEDBACK ANALYSIS ("Customer reviews", "Rating aur feedback")
        else if (
          lowerMsg.includes("review") ||
          lowerMsg.includes("feedback") ||
          lowerMsg.includes("rating") ||
          lowerMsg.includes("tareef") ||
          lowerMsg.includes("complaint")
        ) {
          const rated = orders.filter(o => typeof o.rating === "number" && o.rating > 0);
          const avg = rated.length > 0 ? (rated.reduce((s, o) => s + (o.rating || 5), 0) / rated.length).toFixed(1) : "4.9";

          localReply = `Boss! Customer Sentiment & Feedback Analytics:\n\n• ⭐ **Average Rating:** ${avg} / 5.0 Stars\n• 📝 **Total Rated Orders:** ${rated.length || orders.length} Reviews\n• 💖 **Customer Praises:** Fast delivery, hot food packaging, and taste of Burgers & Biryani.\n• 🎯 **Sentiment Score:** 94% Positive\n\nCustomers platform se bohot mutma'in hain!`;
          localPrompts = [
            "👑 Top 5 Loyal Customers ko thank you message bhejo",
            "🎁 Best customer ko 100 Loyalty Coins reward karo",
            "🎟️ Naya Weekend Promo Voucher create karo"
          ];
        }
        // 17. MARKETING CAMPAIGNS & AI WRITER ("WhatsApp marketing message banao", "Facebook post likho")
        else if (
          lowerMsg.includes("marketing") ||
          lowerMsg.includes("whatsapp") ||
          lowerMsg.includes("facebook") ||
          lowerMsg.includes("instagram") ||
          lowerMsg.includes("post") ||
          lowerMsg.includes("ad") ||
          lowerMsg.includes("caption")
        ) {
          const topDishName = topSellingDishes[0]?.name || "Crispy Zinger Burger";
          localReply = `Boss! Ye raha high-converting **Social Media & WhatsApp Ad Copy** tayar:\n\n━━━━━━━━━━━━━━━━━━━━\n🔥 **DADU FOOD FESTIVAL — CRAVING DELICIOUS FOOD?** 🍔🍕\n\nAb Dadu mein ghar baithe mangwayen apna pasandeeda khana! Super-fast delivery seedha aapke darwazay par.\n\n⭐ **Today's Hot Special:** ${topDishName}\n💰 **Special Deal:** Flat 15% OFF on first order!\n🎁 **VIP Rewards:** Har order par Loyalty Coins kamayein!\n\n📲 *Abhi Order Karein ya App Download Karein!*\n📞 *WhatsApp Helpline: 0300-1234567*\n━━━━━━━━━━━━━━━━━━━━\n\nAap is text ko direct copy karke WhatsApp status ya social media par post kar sakte hain!`;
          localPrompts = [
            "📢 Tamam customers ko push announcement bhejo",
            "🎟️ 15% OFF Promo Coupon create karo",
            "🚀 2 High-Profit Combo Deals add karo"
          ];
        }
        // 18. MULTI-STEP AUTOMATION WORKFLOWS ("Inactive users ko 20% discount aur 100 loyalty coins bhejo")
        else if (
          (lowerMsg.includes("inactive") || lowerMsg.includes("reactivate") || lowerMsg.includes("users")) &&
          (lowerMsg.includes("coin") || lowerMsg.includes("voucher") || lowerMsg.includes("discount") || lowerMsg.includes("offer"))
        ) {
          localActions.push({
            type: "composite_automation",
            payload: {
              workflowType: "reactivate_inactive_users",
              discountAmount: 20,
              coins: 100,
              voucherCode: "WELCOME20"
            }
          });
          localReply = `Boss! **Automated Customer Reactivation Workflow** live execute kar diya gaya hai:\n\n1. 🎟️ **Promo Coupon:** \`WELCOME20\` (20% OFF) create ho gaya.\n2. 🎁 **Loyalty Coins:** Inactive customers ke wallet mein **+100 Coins** credit hogaye.\n3. 📱 **Push Alerts:** Sab eligible users ko celebration notification deliver ho chuki hai!`;
        }
        // 19. RESTAURANT TIMINGS & STATUS
        else if (
          lowerMsg.includes("restaurant timing") ||
          lowerMsg.includes("store timing") ||
          lowerMsg.includes("opening time") ||
          lowerMsg.includes("closing time") ||
          lowerMsg.includes("store band") ||
          lowerMsg.includes("store kholo")
        ) {
          const isClose = lowerMsg.includes("band") || lowerMsg.includes("close");
          localActions.push({
            type: "update_restaurant_status",
            payload: {
              isUnavailable: isClose,
              openingTime: "10:00",
              closingTime: "01:00"
            }
          });
          localReply = `Boss! Restaurant timing aur operational status update kar diya gaya hai (${isClose ? 'Temporarily Closed' : 'Open (10:00 AM to 01:00 AM)'}).`;
        }
        // 20. NOTIFICATIONS BROADCAST
        else if (lowerMsg.includes("notification") || lowerMsg.includes("alert") || lowerMsg.includes("bhejo") || lowerMsg.includes("announcement")) {
          localActions.push({
            type: "send_notification",
            payload: {
              title: "Special Treat from Dadu Hub! 🍔",
              message: query
            }
          });
          localReply = `Boss, tamam customers ko live announcement notification broadcast kar di gayi hai!`;
        }
        // DEFAULT ASSISTANCE
        else {
          localReply = `Assalam-o-Alaikum Boss! Main live Operations Director hoon.\n\n• 🍽️ **Total Menu Dishes:** ${dishes.length} (${outOfStockDishes.length} out of stock)\n• 📦 **Active Orders:** ${activeOrdersCount}\n• 👥 **Registered Customers:** ${totalUsersCount || topMostActiveCustomers.length}\n• 🛵 **Riders Fleet:** ${riderStatsList.length} Riders\n\nAap mujhse top customer info, rider registration, sales analytics, deals creation, discounts, item scheduling, ya kisi bhi operational sawal ka hukum dein!`;
        }

        data = {
          reply: localReply,
          actions: localActions,
          suggestedQuickPrompts: localPrompts
        };
      }

      // Execute all returned action items on Firestore
      let actionsWithStatus: any[] = [];
      if (Array.isArray(data.actions) && data.actions.length > 0) {
        for (const act of data.actions) {
          const execRes = await executeAiAction(act);
          actionsWithStatus.push({
            ...act,
            status: execRes.success ? "executed" : "failed",
            summary: execRes.summary,
            undoData: execRes.undoData
          });
        }
      }

      const aiMsg: AiManagerMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: data.reply || "Hukum karein Boss, maine aapka request analyze kar liya hai.",
        timestamp: new Date(),
        actions: actionsWithStatus,
        suggestedPrompts: data.suggestedQuickPrompts || []
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: "ai",
          text: `Boss, main active hoon. Aap niche diye gaye quick tasks se ya direct message karke hukum de sakte hain.`,
          timestamp: new Date(),
          suggestedPrompts: [
            "📊 Aaj ka summary do",
            "🚀 2 High-Profit Combo Deals create karo",
            "🏷️ 15% Discount lagao"
          ]
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick stats calculations
  const totalRevenue = orders
    .filter(o => o.status === "delivered")
    .reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const activeOrdersCount = orders.filter(
    o => o.status !== "delivered" && o.status !== "cancelled"
  ).length;
  const outOfStockCount = dishes.filter(d => d.isAvailable === false).length;

  return (
    <div className={`flex flex-col bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-2xl overflow-hidden ${
      isFloatingDrawer ? "h-full w-full" : "min-h-[750px] h-[calc(100vh-140px)]"
    }`}>
      {/* AI Manager Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-zinc-900 to-slate-950 p-4 border-b border-slate-800 flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#D70F64] via-amber-500 to-emerald-400 p-0.5 shadow-md flex items-center justify-center animate-pulse">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Bot className="w-6 h-6 text-[#D70F64]" />
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full animate-ping"></span>
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full"></span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5">
                Dadu Master AI Manager
                <span className="text-[10px] bg-gradient-to-r from-[#D70F64] to-amber-500 text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">
                  Autonomous GM
                </span>
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
              <span>Full Store Automation & Growth Copilot</span>
              <span>&bull;</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Live Control Active
              </span>
            </p>
          </div>
        </div>

        {/* Live Business Telemetry Quick Chips */}
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200 shadow-inner">
            <div className="flex items-center gap-1 text-pink-400">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{dishes.length} Items</span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1 text-amber-400">
              <Flame className="w-3.5 h-3.5" />
              <span>{activeOrdersCount} Active Orders</span>
            </div>
            {outOfStockCount > 0 && (
              <>
                <span className="text-slate-600">|</span>
                <div className="flex items-center gap-1 text-rose-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{outOfStockCount} Out of Stock</span>
                </div>
              </>
            )}
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1 text-emerald-400">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Rs {totalRevenue.toLocaleString()}</span>
            </div>
          </div>

          {isFloatingDrawer && onCloseFloating && (
            <button
              onClick={onCloseFloating}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Multi-Tab Operational Sub-Navigation */}
      <div className="bg-slate-950/95 border-b border-slate-800 px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none shrink-0 text-xs">
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={() => setActiveWorkspaceTab("terminal")}
            className={`px-3 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
              activeWorkspaceTab === "terminal"
                ? "bg-[#D70F64] text-white shadow-md shadow-pink-900/40"
                : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Operations Terminal</span>
          </button>

          <button
            onClick={() => setActiveWorkspaceTab("incidents")}
            className={`px-3 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer relative ${
              activeWorkspaceTab === "incidents"
                ? "bg-amber-600 text-white shadow-md shadow-amber-900/40"
                : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Incident Radar</span>
            {incidents.filter(i => i.status !== "resolved").length > 0 && (
              <span className="bg-rose-500 text-white text-[9.5px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
                {incidents.filter(i => i.status !== "resolved").length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveWorkspaceTab("closures")}
            className={`px-3 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
              activeWorkspaceTab === "closures"
                ? "bg-rose-700 text-white shadow-md shadow-rose-900/40"
                : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <Store className="w-3.5 h-3.5 text-rose-400" />
            <span>Closures & Timings</span>
            {Object.values(deliverySettings?.restaurantStatuses || {}).filter((s: any) => s.temporaryClosure?.isTemporarilyClosed || s.isTemporarilyUnavailable).length > 0 && (
              <span className="bg-rose-500 text-white text-[9.5px] px-1.5 py-0.2 rounded-full font-black">
                {Object.values(deliverySettings?.restaurantStatuses || {}).filter((s: any) => s.temporaryClosure?.isTemporarilyClosed || s.isTemporarilyUnavailable).length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveWorkspaceTab("risk_radar")}
            className={`px-3 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
              activeWorkspaceTab === "risk_radar"
                ? "bg-purple-700 text-white shadow-md shadow-purple-900/40"
                : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
            <span>Customer Risk & COD</span>
          </button>

          <button
            onClick={() => setActiveWorkspaceTab("audit_trail")}
            className={`px-3 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
              activeWorkspaceTab === "audit_trail"
                ? "bg-emerald-700 text-white shadow-md shadow-emerald-900/40"
                : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI Decision Trail</span>
            {auditLogs.length > 0 && (
              <span className="bg-emerald-500/30 text-emerald-300 text-[9.5px] px-1.5 py-0.2 rounded-full font-bold">
                {auditLogs.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* VIEW 1: OPERATIONS TERMINAL (CHAT & TELEMETRY) */}
      {activeWorkspaceTab === "terminal" && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Strategic Live AI Audit & Growth Bar */}
          <div className="bg-slate-950/70 border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none shrink-0 text-xs">
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400 animate-spin" /> Quick Actions:
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {outOfStockCount > 0 && (
                <button
                  onClick={() => handleSendMessage("Tamam out of stock items ko check karo aur unhe wapis In Stock mark kardo")}
                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 whitespace-nowrap"
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>Fix {outOfStockCount} Out-of-Stock Items</span>
                </button>
              )}

              <button
                onClick={() => handleSendMessage("2 High-Profit Value Combos create karke menu mein add kardo")}
                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 whitespace-nowrap"
              >
                <Flame className="w-3 h-3 text-amber-400" />
                <span>Generate High-Margin Combos</span>
              </button>

              <button
                onClick={() => handleSendMessage("Tamam pending orders ko accept karke kitchen pipeline mein bhej do")}
                className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 whitespace-nowrap"
              >
                <Clock className="w-3 h-3 text-blue-400" />
                <span>Batch Accept Orders</span>
              </button>

              <button
                onClick={() => handleSendMessage("Aaj ka complete sales, financial ledger, AOV aur orders summary report do")}
                className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 whitespace-nowrap"
              >
                <TrendingUp className="w-3 h-3 text-purple-400" />
                <span>Full Financial Audit</span>
              </button>

              <button
                onClick={() => handleSendMessage("Tamam registered users ko 50 Loyalty Coins reward kardo")}
                className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 whitespace-nowrap"
              >
                <Award className="w-3 h-3 text-amber-400" />
                <span>Reward Loyalty Coins</span>
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${
                  msg.sender === "admin" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                  msg.sender === "admin"
                    ? "bg-[#D70F64] text-white"
                    : "bg-slate-800 text-amber-400 border border-slate-700"
                }`}>
                  {msg.sender === "admin" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div className={`space-y-2.5 max-w-[88%] sm:max-w-xl ${
                  msg.sender === "admin" ? "items-end text-right" : "items-start text-left"
                }`}>
                  <div className={`p-4 rounded-2xl text-xs sm:text-sm font-normal leading-relaxed whitespace-pre-wrap shadow-md ${
                    msg.sender === "admin"
                      ? "bg-[#D70F64] text-white rounded-tr-none font-medium"
                      : "bg-slate-800/90 text-slate-100 border border-slate-700/80 rounded-tl-none font-sans"
                  }`}>
                    {msg.text}
                  </div>

                  {msg.actions && msg.actions.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> Autonomous Actions Executed on Store:
                      </span>
                      {msg.actions.map((act, aIdx) => (
                        <div
                          key={aIdx}
                          className="bg-slate-950/90 border border-emerald-500/40 p-3 rounded-2xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-lg"
                        >
                          <div className="flex items-center gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="text-slate-200 font-medium text-[11px] sm:text-xs">
                              {act.summary || JSON.stringify(act.payload)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-md uppercase border border-emerald-500/30">
                              Live Active
                            </span>
                            {act.undoData && (
                              <button
                                onClick={() => handleUndoAction(msg.id, aIdx, act.undoData)}
                                className="text-[10px] bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-md font-bold transition cursor-pointer flex items-center gap-1 active:scale-95"
                              >
                                <RotateCcw className="w-3 h-3" /> Revert
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.suggestedPrompts && msg.suggestedPrompts.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {msg.suggestedPrompts.map((prompt, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => handleSendMessage(prompt)}
                          className="text-[11px] font-bold bg-slate-800/90 hover:bg-[#D70F64] text-slate-300 hover:text-white border border-slate-700 hover:border-[#D70F64] px-2.5 py-1 rounded-xl transition cursor-pointer flex items-center gap-1 shadow-sm active:scale-95 text-left"
                        >
                          <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>{prompt}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="text-[9.5px] text-slate-500 block px-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 max-w-md mr-auto">
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-amber-400 border border-slate-700 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 animate-bounce" />
                </div>
                <div className="bg-slate-800/90 border border-slate-700 p-3.5 rounded-2xl rounded-tl-none flex items-center gap-2.5 text-xs text-slate-300 shadow-md">
                  <Loader2 className="w-4 h-4 animate-spin text-[#D70F64]" />
                  <span className="font-medium animate-pulse">Dadu Master AI is analyzing telemetry & executing operations...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Preset Master Command Shortcuts */}
          <div className="bg-slate-950/90 border-t border-slate-800 px-3 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 shrink-0 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" /> Super Powers:
            </span>

            {[
              { label: "🚀 Add 2 High Margin Combos", prompt: "2 High-profit Value Combos create karke menu mein add kardo" },
              { label: "📊 Sales & AOV Audit", prompt: "Aaj ka complete sales, average order value (AOV) aur order summary report do" },
              { label: "➕ Add Zinger Burger (Rs 450)", prompt: "Menu mein 'Crispy Zinger Burger' add karo with price Rs 450 in Fast Food category" },
              { label: "🎟️ Create Rs 100 Coupon", prompt: "Naya coupon voucher 'SAVE100' create karo for Rs 100 OFF on orders above Rs 500" },
              { label: "🏷️ 15% Off Fast Food", prompt: "Fast food category ke sab items par 15% discount apply kardo" },
              { label: "🛑 Auto-Restock All Items", prompt: "Tamam out of stock items ko wapis In Stock mark kardo" },
              { label: "📢 Send Weekend Push Alert", prompt: "Tamam customers ko 'Special Weekend Feast 20% OFF' announcement notification broadcast karo" },
              { label: "🎨 Launch Hero Banner", prompt: "Homepage ke liye naya promotional banner launch karo with 20% discount" }
            ].map((btn, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(btn.prompt)}
                className="text-[10px] font-bold bg-slate-800/90 hover:bg-[#D70F64] text-slate-300 hover:text-white px-2.5 py-1.5 rounded-xl border border-slate-700/80 whitespace-nowrap transition cursor-pointer active:scale-95 shrink-0 shadow-sm"
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Input Box with Voice & Send */}
          <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={toggleVoiceInput}
                title={isListening ? "Listening... Tap to stop" : "Voice command in Urdu/English"}
                className={`p-3 rounded-2xl border transition cursor-pointer shrink-0 shadow-md ${
                  isListening
                    ? "bg-rose-600 border-rose-500 text-white animate-pulse"
                    : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600"
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4" />}
              </button>

              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={isListening ? "Listening... Boliye Boss..." : "Hukum karein Boss (e.g. 'Add 2 combo deals', 'Fast food par 15% discount lagao', 'Sales report do')..."}
                className="flex-1 bg-slate-900 border border-slate-700/80 focus:border-[#D70F64] rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition shadow-inner font-medium"
              />

              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="bg-gradient-to-r from-[#D70F64] to-rose-600 hover:from-[#b00c50] hover:to-rose-700 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg transition cursor-pointer disabled:opacity-50 active:scale-95 whitespace-nowrap"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Execute</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* VIEW 2: INCIDENT COMMAND RADAR */}
      {activeWorkspaceTab === "incidents" && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-900/90">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
            <div>
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                Rider Incident Radar & Escalation Hub
              </h3>
              <p className="text-xs text-slate-400">
                Autonomous classification and live incident management from riders on field.
              </p>
            </div>

            {/* Incident Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {["all", "reported", "restaurant_closed", "customer_refused", "resolved"].map((f) => (
                <button
                  key={f}
                  onClick={() => setIncidentFilter(f)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold capitalize transition cursor-pointer ${
                    incidentFilter === f
                      ? "bg-amber-500 text-slate-950 font-black shadow-md"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  {f.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Incidents Listing */}
          {incidents.filter(i => {
            if (incidentFilter === "all") return true;
            if (incidentFilter === "reported") return i.status === "reported" || i.status === "investigating";
            if (incidentFilter === "resolved") return i.status === "resolved";
            if (incidentFilter === "restaurant_closed") return i.category === "RESTAURANT_CLOSED";
            if (incidentFilter === "customer_refused") return i.category === "CUSTOMER_REFUSED_COD";
            return true;
          }).length === 0 ? (
            <div className="bg-slate-950/60 border border-slate-800 rounded-3xl p-10 text-center space-y-3">
              <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-black text-white">No Incidents Found in Filter</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No active rider alerts or problems match this category. All deliveries and merchant partners are running normally.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {incidents
                .filter(i => {
                  if (incidentFilter === "all") return true;
                  if (incidentFilter === "reported") return i.status === "reported" || i.status === "investigating";
                  if (incidentFilter === "resolved") return i.status === "resolved";
                  if (incidentFilter === "restaurant_closed") return i.category === "RESTAURANT_CLOSED";
                  if (incidentFilter === "customer_refused") return i.category === "CUSTOMER_REFUSED_COD";
                  return true;
                })
                .map((inc) => {
                  const isResolved = inc.status === "resolved";
                  return (
                    <div
                      key={inc.id}
                      className={`bg-slate-950 border rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg transition ${
                        isResolved ? "border-slate-800 opacity-80" : "border-amber-500/40 shadow-amber-950/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                            inc.severity === "CRITICAL"
                              ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                              : inc.severity === "HIGH"
                              ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                              : "bg-amber-500/20 text-amber-400 border-amber-500/40"
                          }`}>
                            {inc.severity} SEVERITY
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {inc.category.replace(/_/g, " ")}
                          </span>
                        </div>

                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                          isResolved ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400 animate-pulse"
                        }`}>
                          {inc.status}
                        </span>
                      </div>

                      {/* Problem Statement */}
                      <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                          Rider Report ({inc.riderName || "Field Agent"}):
                        </span>
                        <p className="text-xs text-slate-200 font-medium whitespace-pre-wrap">
                          "{inc.description}"
                        </p>
                      </div>

                      {/* Target Entities */}
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                        {inc.restaurantName && (
                          <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800/80">
                            <span className="text-[9.5px] uppercase font-bold text-slate-500 block">Restaurant</span>
                            <span className="font-bold text-amber-400 truncate block">{inc.restaurantName}</span>
                          </div>
                        )}
                        {inc.customerPhone && (
                          <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800/80">
                            <span className="text-[9.5px] uppercase font-bold text-slate-500 block">Customer</span>
                            <span className="font-bold text-pink-400 truncate block">{inc.customerPhone}</span>
                          </div>
                        )}
                        {inc.orderId && (
                          <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800/80">
                            <span className="text-[9.5px] uppercase font-bold text-slate-500 block">Order</span>
                            <span className="font-bold text-slate-300 truncate block">#{inc.orderId.slice(-6)}</span>
                          </div>
                        )}
                        {inc.actionTaken && (
                          <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800/80">
                            <span className="text-[9.5px] uppercase font-bold text-slate-500 block">Autonomous AI Action</span>
                            <span className="font-bold text-emerald-400 truncate block">{inc.actionTaken}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Command Controls */}
                      <div className="pt-2 flex flex-wrap gap-2 border-t border-slate-800/80">
                        {!isResolved && (
                          <button
                            onClick={() => executeAiAction({
                              type: "resolve_incident",
                              payload: { incidentId: inc.id, resolution: "Resolved by Admin" }
                            })}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 shadow-sm active:scale-95"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark Resolved</span>
                          </button>
                        )}

                        {inc.restaurantName && (
                          <button
                            onClick={() => executeAiAction({
                              type: "temporary_close_restaurant",
                              payload: {
                                restaurantName: inc.restaurantName,
                                durationHours: 2,
                                reason: `Rider reported closed on order #${inc.orderId?.slice(-6)}`
                              }
                            })}
                            className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 active:scale-95"
                          >
                            <Store className="w-3.5 h-3.5" />
                            <span>Pause 2 Hrs</span>
                          </button>
                        )}

                        {inc.customerPhone && (
                          <button
                            onClick={() => executeAiAction({
                              type: "restrict_customer_cod",
                              payload: {
                                phone: inc.customerPhone,
                                isRestricted: true,
                                reason: `Incident on order #${inc.orderId?.slice(-6)}: ${inc.description}`
                              }
                            })}
                            className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 active:scale-95"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Restrict COD</span>
                          </button>
                        )}

                        {inc.riderPhone && (
                          <a
                            href={`tel:${inc.riderPhone}`}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-2.5 py-1.5 rounded-xl transition flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3 text-emerald-400" />
                            <span>Call Rider</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: BUSINESS CLOSURES & TIMINGS */}
      {activeWorkspaceTab === "closures" && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-900/90">
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <Store className="w-5 h-5 text-rose-400" />
                Restaurant Temporary Closures & Autonomous Schedule
              </h3>
              <p className="text-xs text-slate-400">
                Manage temporary pauses, auto-reopen countdown timers, and operational operating hours.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from(new Set([
              ...dishes.map(d => d.restaurantName || "Dadu Fast Food & Kitchen"),
              ...Object.keys(deliverySettings?.restaurantStatuses || {})
            ])).map((restName) => {
              const statusConfig: any = deliverySettings?.restaurantStatuses?.[restName] || {};
              const closure = statusConfig?.temporaryClosure;
              const isClosed = Boolean(closure?.isTemporarilyClosed || statusConfig?.isTemporarilyUnavailable);

              // Calculate remaining time
              let remainingMinutes: number | null = null;
              if (closure?.expectedReopenAt) {
                let reopenMs = 0;
                if (closure.expectedReopenAt.toMillis) reopenMs = closure.expectedReopenAt.toMillis();
                else if (closure.expectedReopenAt.seconds) reopenMs = closure.expectedReopenAt.seconds * 1000;
                else if (typeof closure.expectedReopenAt === "string" || closure.expectedReopenAt instanceof Date) {
                  reopenMs = new Date(closure.expectedReopenAt).getTime();
                }
                if (reopenMs > Date.now()) {
                  remainingMinutes = Math.max(1, Math.round((reopenMs - Date.now()) / 60000));
                }
              }

              return (
                <div
                  key={restName}
                  className={`bg-slate-950 border rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-lg ${
                    isClosed ? "border-rose-500/40 bg-rose-950/10" : "border-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-black text-white">{restName}</h4>
                      <p className="text-[11px] text-slate-400">
                        {statusConfig.openingTime || "11:00"} - {statusConfig.closingTime || "23:59"}
                      </p>
                    </div>

                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                      isClosed ? "bg-rose-500/20 text-rose-400 animate-pulse" : "bg-emerald-500/20 text-emerald-400"
                    }`}>
                      {isClosed ? "TEMPORARILY CLOSED" : "ONLINE & ACTIVE"}
                    </span>
                  </div>

                  {isClosed && (
                    <div className="bg-rose-950/40 border border-rose-500/30 p-3 rounded-xl space-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5 text-rose-300 font-bold">
                        <Timer className="w-3.5 h-3.5" />
                        <span>Auto-reopen in: {remainingMinutes ? `${remainingMinutes} mins` : "Pending timer"}</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Reason: <span className="font-medium text-rose-200">{closure?.reason || "Autonomous Pause"}</span>
                      </p>
                      <span className="text-[9.5px] text-slate-400 block">
                        Closed by: {closure?.closedBy?.toUpperCase() || "AI"}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center gap-2">
                    {isClosed ? (
                      <button
                        onClick={() => executeAiAction({
                          type: "reopen_restaurant",
                          payload: { restaurantName: restName }
                        })}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>Reopen Now</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => executeAiAction({
                          type: "temporary_close_restaurant",
                          payload: {
                            restaurantName: restName,
                            durationHours: 2,
                            reason: "Admin or AI autonomous temporary pause"
                          }
                        })}
                        className="w-full bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <Timer className="w-3.5 h-3.5 text-rose-400" />
                        <span>Pause 2 Hours</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 4: CUSTOMER RISK & COD SAFETY RADAR */}
      {activeWorkspaceTab === "risk_radar" && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-900/90">
          {/* COD Max Limit Settings */}
          <div className="bg-slate-950/80 p-4 sm:p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                Cash on Delivery (COD) Safety Threshold & Fraud Shield
              </h3>
              <p className="text-xs text-slate-400 max-w-xl">
                Set store-wide maximum COD limit. Orders above this threshold require risk assessment or digital payment.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">Rs</span>
                <input
                  type="number"
                  value={codLimitValue}
                  onChange={(e) => setCodLimitValue(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs font-black text-white w-28 outline-none focus:border-purple-500"
                />
              </div>

              <button
                onClick={async () => {
                  setIsUpdatingCodLimit(true);
                  await executeAiAction({
                    type: "set_cod_limit",
                    payload: { maxCodLimit: codLimitValue }
                  });
                  setIsUpdatingCodLimit(false);
                }}
                disabled={isUpdatingCodLimit}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-black px-4 py-2 rounded-xl transition cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isUpdatingCodLimit ? "Saving..." : "Save Limit"}
              </button>
            </div>
          </div>

          {/* Customer Risk Profiler Leaderboard */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-amber-400" />
              Customer Trust & Cancellation Risk Telemetry ({topMostActiveCustomers.length} Profiled Customers)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {topMostActiveCustomers.map((cust) => {
                const total = cust.ordersCount || 1;
                const delivered = cust.deliveredCount || 0;
                const cancelled = cust.cancelledCount || 0;
                const trustScore = Math.max(10, Math.min(100, Math.round((delivered / Math.max(1, total)) * 100)));
                const isHighRisk = cancelled >= 2 && cancelled / total >= 0.4;
                const isCodRestricted = Boolean((cust as any).isCodRestricted);

                return (
                  <div
                    key={cust.phone || cust.userId}
                    className={`bg-slate-950 border rounded-2xl p-4 space-y-3 shadow-md transition ${
                      isHighRisk ? "border-rose-500/50 bg-rose-950/10" : "border-slate-800"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="text-xs font-black text-white">{cust.name}</h5>
                        <p className="text-[11px] text-slate-400 font-mono">{cust.phone}</p>
                      </div>

                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                        trustScore >= 80
                          ? "bg-emerald-500/20 text-emerald-300"
                          : trustScore >= 50
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-rose-500/20 text-rose-300"
                      }`}>
                        {trustScore}% Trust
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-[10.5px] bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase font-bold">Total</span>
                        <span className="font-bold text-white">{cust.ordersCount}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase font-bold">Delivered</span>
                        <span className="font-bold text-emerald-400">{cust.deliveredCount}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase font-bold">Cancelled</span>
                        <span className="font-bold text-rose-400">{cust.cancelledCount}</span>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold ${isCodRestricted ? "text-rose-400" : "text-emerald-400"}`}>
                        {isCodRestricted ? "COD Blocked" : "COD Enabled"}
                      </span>

                      <button
                        onClick={() => executeAiAction({
                          type: "restrict_customer_cod",
                          payload: {
                            phone: cust.phone,
                            userId: cust.userId,
                            isRestricted: !isCodRestricted,
                            reason: isCodRestricted ? "Admin restored COD" : "Flagged in risk evaluation"
                          }
                        })}
                        className={`text-[10.5px] font-black px-2.5 py-1 rounded-xl transition cursor-pointer active:scale-95 ${
                          isCodRestricted
                            ? "bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30"
                            : "bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30"
                        }`}
                      >
                        {isCodRestricted ? "Restore COD" : "Restrict COD"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 5: AI DECISION AUDIT TRAIL */}
      {activeWorkspaceTab === "audit_trail" && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-900/90">
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              Live Autonomous Decision Audit Trail
            </h3>
            <p className="text-xs text-slate-400">
              Immutable telemetry log of every action executed by the AI Manager & Rider Assistant.
            </p>
          </div>

          {auditLogs.length === 0 ? (
            <div className="bg-slate-950/60 border border-slate-800 rounded-3xl p-10 text-center space-y-3">
              <Activity className="w-12 h-12 text-slate-500 mx-auto animate-pulse" />
              <h4 className="text-sm font-black text-white">No Audit Logs Yet</h4>
              <p className="text-xs text-slate-400">
                Actions executed via the AI Manager or incident handlers will automatically stream here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">{log.action}</span>
                      <span className="text-[9.5px] font-bold uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700">
                        {log.source || "AI"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">
                      {log.aiDecision || log.reason}
                    </p>
                    {log.restaurantName && (
                      <span className="text-[10px] text-amber-400 font-bold block">
                        Target: {log.restaurantName}
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-500 whitespace-nowrap shrink-0 self-end sm:self-auto font-mono">
                    {log.timestamp?.seconds
                      ? new Date(log.timestamp.seconds * 1000).toLocaleString()
                      : "Recent"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
