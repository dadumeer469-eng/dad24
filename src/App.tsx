import LocationPermissionModal from "./components/LocationPermissionModal";
import React, { useState, useEffect, useRef, Suspense, useCallback, useMemo } from "react";
import { DashboardMenuItemCard } from "./components/DashboardMenuItemCard";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, getRedirectResult } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  getDocs,
  increment,
  arrayUnion,
  arrayRemove,
  writeBatch,
  runTransaction,
} from "firebase/firestore";
import { auth, db, handleFirestoreError, cleanObject } from "./firebase";
import {
  OWNER_GROCERY_CATEGORIES,
  OWNER_GROCERY_PRODUCTS,
  OWNER_CATALOG_SYNCED_AT,
} from "./data/ownerGroceryCatalog";
import {
  LOCAL_DISHES,
  LOCAL_DISHES_SYNCED_AT,
} from "./data/localDishes";
import {
  Dish,
  Order,
  UserProfile,
  SystemSettings,
  AppNotification,
  OrderItem,
  FoodCategory,
  GroceryCategory,
  GroceryProduct,
  GroceryOrderItem,
  GroceryDeliveryConfig,
  GroceryOrder,
  Voucher,
  calculateVoucherDiscount,
} from "./types";
import { DEFAULT_FOOD_CATEGORIES, getDefaultRestaurantImage } from "./data";
import { DEALS, dealSavings, dealDiscountPct, type Deal } from "./data/deals";
import {
  readFreshCatalogEntry,
  readCatalogForPaint,
  writeCatalogCache,
  invalidateCatalogCache,
} from "./utils/catalogCache";
import { applyCatalogDelta, getCatalogDelta } from "./utils/catalogDelta";
import {
  clearSettingsCache,
  readSettingsCache,
  writeSettingsCache,
} from "./utils/settingsCache";

// Import modules
import FoodpandaHeader from "./components/FoodpandaHeader";
import AppUpdateBanner from "./components/AppUpdateBanner";
import { checkForAppUpdate, type AppVersionInfo } from "./utils/appVersion";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { saveUserOrders, saveUserProfile } from "./utils/localUserData";
import FoodpandaHero from "./components/FoodpandaHero";
import {
  OffersMarquee,
  AnimatedCounter,
  OffersCarousel,
  ScrollReveal,
  AppLoadingState,
  MenuSkeleton,
  ShimmerImage,
} from "./components/HomeMotion";
import {
  heroContainer,
  heroImage,
  heroTile,
  heroWord,
  motionTransition,
  springGentle,
  springSnappy,
  staggerContainer,
  usePrefersReducedMotion,
  viewTransition,
} from "./utils/motion";
import VoiceOrderModal, { type VoiceOrder, type VoiceOrderResult } from "./components/VoiceOrderModal";
import ChatAgentModal from "./components/ChatAgentModal";
import { primeAudio } from "./utils/primeAudio";
import OrderTracker from "./components/OrderTracker";
import AuthModal from "./components/AuthModal";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
// Staff-only panels load on demand so the first paint stays fast for customers
const AdminPanel = React.lazy(() => import("./components/AdminPanel"));
const RiderPanel = React.lazy(() => import("./components/RiderPanel"));
// Map components load on demand (Leaflet ~148 KB): they only render after
// a user action, and each returns null while closed, so lazy-loading is
// safe — the map chunk downloads on first open, not on first paint.
const MapLocationPickerModal = React.lazy(() => import("./components/MapLocationPickerModal"));
const CartDrawer = React.lazy(() => import("./components/CartDrawer"));
const GroceryCartDrawer = React.lazy(() => import("./components/GroceryCartDrawer"));
import FoodDetailModal from "./components/FoodDetailModal";
import GroceryModule from "./components/GroceryModule";
import DirectoryView, { DIRECTORY_RESTAURANTS } from "./components/DirectoryView";
import OrderSuccessAnimation from "./components/OrderSuccessAnimation";
import OrderHistoryDrawer from "./components/OrderHistoryDrawer";
import OrderChat from "./components/OrderChat";
import BottomNavBar from "./components/BottomNavBar";
import ScrollProgress from "./components/ScrollProgress";
import MobileAccountDrawer from "./components/MobileAccountDrawer";
import { LazyImage } from "./components/LazyImage";
import DaduLogoLoader from "./components/DaduLogoLoader";
import NetworkStatusBanner from "./components/NetworkStatusBanner";
import { CustomerSettingsModal } from "./components/CustomerSettingsModal";
import { InfoPagesView } from "./components/InfoPagesView";
import useLazyBatchLoad from "./hooks/useLazyBatchLoad";
import daduLogo from "./assets/images/dadu_food_logo_new_1782333467889.jpg";
import { logMemoryUsage, useMemoryMonitor } from "./utils/memoryLogger";
import {
  normalizeCatalog,
  normalizeFoodCategories,
  matchesFoodSearch,
  getShopProfile,
  getShopOpenStatus,
  generateUniqueOrderId,
  formatOrderId,
  calculateDeliveryFee,
} from "./utils/catalogNormalizer";
import {
  syncPageSeo,
  slugifyShop,
  DADU_FOOD_BUSINESS,
  InfoPageSlug,
} from "./utils/seoManager";

// Icons & Motion
import {
  ShieldAlert,
  Clock,
  AlertTriangle,
  AlertCircle,
  MessageSquare,
  BadgeAlert,
  CheckSquare,
  Wrench,
  HeartHandshake,
  UtensilsCrossed,
  Flame,
  Zap,
  Sandwich,
  Pizza,
  ChefHat,
  Coffee,
  Compass,
  MapPin,
  Heart,
  LogOut,
  Home,
  ArrowLeft,
  ArrowRight,
  Phone,
  Plus,
  Minus,
  Star,
  ChevronRight,
  X,
  Bike,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import FoodpandaRestaurantPage from "./components/FoodpandaRestaurantPage";

export function getDeviceId(): string {
  let id = localStorage.getItem("dadu_device_id");
  if (!id) {
    id = "dev-" + Math.random().toString(36).substring(2, 10) + "-" + Date.now();
    localStorage.setItem("dadu_device_id", id);
  }
  return id;
}

const deviceId = getDeviceId();

// Haversine formula to calculate distance in KM between two coordinates
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function BannerLiveChatButton({ 
  orderId, 
  currentUserId, 
  onClick 
}: { 
  orderId: string; 
  currentUserId: string; 
  onClick: () => void; 
}) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!orderId || !currentUserId) return;
    const messagesRef = collection(db, "orders", orderId, "messages");
    const unsubscribe = onSnapshot(messagesRef, (snapshot) => {
      let unread = 0;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.senderId !== currentUserId && !data.isRead) {
          unread++;
        }
      });
      setUnreadCount(unread);
    }, (err) => console.error("Banner chat listener error:", err));

    return () => unsubscribe();
  }, [orderId, currentUserId]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-pink text-white min-h-[44px] px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider text-center transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97] active:brightness-110 cursor-pointer flex items-center gap-1.5 relative overflow-hidden after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0)_65%)] after:opacity-0 after:scale-50 after:transition-[opacity,transform] after:duration-300 after:pointer-events-none active:after:opacity-100 active:after:scale-125 active:after:duration-100"
    >
      <span>Live Chat</span>
      {unreadCount > 0 && (
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-80"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 ring-2 ring-white"></span>
        </span>
      )}
    </button>
  );
}

// Persistent client-side cache helpers to prevent constant reloading of items & UI
const getCachedData = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed) return parsed;
    }
  } catch (e) {
    console.warn(`Failed to read ${key} from storage:`, e);
  }
  return fallback;
};

const setCachedData = <T,>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Failed to save ${key} to storage:`, e);
  }
};

const preloadImages = (urls: (string | undefined)[]) => {
  urls.filter(Boolean).forEach((url) => {
    if (url) {
      const img = new Image();
      img.src = url;
    }
  });
};

// Merge the built-in owner catalogue with live/cached data so newly added
// owner items (e.g. the Medicine category) show immediately, even when
// Firestore still holds older data or the read fails (quota). Live items win
// on id conflict (admin edits preserved); owner order is kept.
function mergeOwnerFirst<T extends { id: string }>(owner: T[], live: T[]): T[] {
  const byId = new Map<string, T>();
  owner.forEach((item) => byId.set(item.id, item));
  live.forEach((item) => {
    if (item && item.id) byId.set(item.id, item);
  });
  return [...byId.values()];
}

export default function App() {
  useMemoryMonitor("App");
  // Reduced motion: every hero / view / loading animation below collapses
  // to its instant final state when the OS asks for reduced motion.
  const prefersReducedMotion = usePrefersReducedMotion();
  // App-update banner (user 28 Nov 02:55): when the admin publishes a
  // new APK version (settings/app_version), show a "Naya version aa gaya!"
  // banner with a Download button so old-app users can tap to install.
  const [appUpdate, setAppUpdate] = useState<AppVersionInfo | null>(null);

  const [showSplash, setShowSplash] = useState(() => {
    return typeof window !== "undefined" && !sessionStorage.getItem("dadu_splash_seen");
  });

  // Check once on mount whether a newer APK version was published.
  useEffect(() => {
    let cancelled = false;
    checkForAppUpdate()
      .then((info) => {
        if (!cancelled && info) setAppUpdate(info);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const [splashExiting, setSplashExiting] = useState(false);
  const [splashProgress, setSplashProgress] = useState(0);
  const initialUser = getCachedData<UserProfile | null>("dadu_cached_user", null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => initialUser);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Load saved theme on mount (Defaults to normal light mode unless user turned on dark mode)
  useEffect(() => {
    const saved = localStorage.getItem("dadu_theme");
    if (saved === "dark") {
      setTheme("dark");
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("dadu_theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
  };

  const initialDishes = readCatalogForPaint<Dish[]>("menu", "dadu_cached_dishes", LOCAL_DISHES);
  const [dishes, setDishes] = useState<Dish[]>(() => initialDishes && initialDishes.length > 0 ? initialDishes : LOCAL_DISHES);
  const [isLoadingDishes, setIsLoadingDishes] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [deliverySettings, setDeliverySettings] = useState<SystemSettings>(() => 
    getCachedData<SystemSettings>("dadu_cached_delivery_settings", {
      deliveryFee: 70,
      restaurantStatus: {
        isTemporarilyUnavailable: false,
        openingTime: "12:00",
        closingTime: "23:00",
      },
    })
  );

  // --- Delivery fee configuration (settings/delivery_config) ---
  // Fee structure decided 27 Nov 2026: food Rs 70, grocery Rs 100, medicine
  // Rs 30, site tax Rs 12 per order, night surcharge +Rs 30 from 9 PM.
  // Each value is admin-editable in delivery_config (AdminPanel Store
  // Controls); the reads below fall back to these defaults while the
  // Firestore field is absent. The fields are declared on SystemSettings
  // (src/types.ts), so they are read directly from deliverySettings.
  const foodDeliveryFee =
    typeof deliverySettings.foodDeliveryFee === "number" ? deliverySettings.foodDeliveryFee : 70;
  const groceryDeliveryFee =
    typeof deliverySettings.groceryDeliveryFee === "number" ? deliverySettings.groceryDeliveryFee : 100;
  const medicineDeliveryFee =
    typeof deliverySettings.medicineDeliveryFee === "number" ? deliverySettings.medicineDeliveryFee : 30;
  const siteTaxAmount =
    typeof deliverySettings.siteTax === "number" && deliverySettings.siteTax >= 0 ? deliverySettings.siteTax : 12;
  const nightSurchargeAmount =
    typeof deliverySettings.nightSurchargeAmount === "number" && deliverySettings.nightSurchargeAmount >= 0
      ? deliverySettings.nightSurchargeAmount
      : 30;
  const nightSurchargeStartHour =
    typeof deliverySettings.nightSurchargeStartHour === "number" ? deliverySettings.nightSurchargeStartHour : 21;
  // Night = local time at/after the configured start hour (default 21:00),
  // until close at 11 PM. Uses the device's local time.
  const isNightSurchargeTime = () => new Date().getHours() >= nightSurchargeStartHour;
  const deliveryTimeTextSetting = (deliverySettings.deliveryTimeText || "").trim();
  const voiceOrderEnabled = deliverySettings.voiceOrderEnabled !== false;
  const chatAgentEnabled = deliverySettings.chatAgentEnabled !== false;
  const DEFAULT_DELIVERY_AREAS = [
    "Shahani Paro",
    "Moro Road",
    "Station Road",
    "College Road",
    "Makhdoom Bilawal Nagar",
    "Civil Hospital Road",
    "Degree College Road",
    "New Bus Stand",
    "Kacheri Road",
    "Dadu City Center",
  ];
  const deliveryAreasList =
    Array.isArray(deliverySettings.deliveryAreas) && deliverySettings.deliveryAreas.length > 0
      ? deliverySettings.deliveryAreas
      : DEFAULT_DELIVERY_AREAS;

  // First-order FREE delivery (user decision 27 Nov 2026): a signed-in user
  // with ZERO previous orders gets Rs 0 delivery on their first order —
  // food, grocery and medicine. Guests (no account) never get it, and the
  // admin can switch it off in Admin Panel → Store Controls.
  // ordersLoaded guards the check: until the orders listener has fired once,
  // we must NOT assume a returning user is a first-timer.
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const isFirstOrderFreeDelivery =
    !!currentUser &&
    ordersLoaded &&
    !orders.some((o) => o.userId === currentUser.uid) &&
    deliverySettings?.firstOrderFreeDelivery !== false;

  // Favorites and Deal of the Hour configuration
  const [favoriteDishIds, setFavoriteDishIds] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isExitConfirmationOpen, setIsExitConfirmationOpen] = useState(false);
  const [showGoodbye, setShowGoodbye] = useState(false);
  const isExitingRef = useRef(false);
  const isProgrammaticBackRef = useRef(false);
  const lastPushedScreenRef = useRef<string>("home");
  const [heroBgUrl, setHeroBgUrl] = useState<string>("");
  const [partnerShopsBgUrl, setPartnerShopsBgUrl] = useState<string>("");
  const [dealConfig, setDealConfig] = useState<{
    isActive: boolean;
    timerMinutes: number;
    discountPercentage: number;
    selectedItemIds: string[];
    dealText?: string;
  }>({
    isActive: true,
    timerMinutes: 30,
    discountPercentage: 25,
    selectedItemIds: ["dish_6", "dish_7"],
    dealText: "Save 25% on Only Tea & Fresh Platters! Hurry!",
  });
  const [dealTimeLeft, setDealTimeLeft] = useState<{
    minutes: number;
    seconds: number;
  }>({ minutes: 0, seconds: 0 });

  // Deal of the Hour ticking clock countdown in App.tsx
  useEffect(() => {
    const timer = setInterval(() => {
      setDealTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { minutes: prev.minutes - 1, seconds: 59 };
        } else {
          return { minutes: 0, seconds: 0 }; // Keep it at 0:00 (deal is OFF)
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Automatically deactivate the deal in Firestore when the timer hits 0:00
  useEffect(() => {
    if (
      dealTimeLeft.minutes === 0 &&
      dealTimeLeft.seconds === 0 &&
      dealConfig.isActive
    ) {
      updateDoc(doc(db, "settings", "deal_config"), { isActive: false }).catch(
        (err) => {
          console.warn(
            "Failed to deactivate deal of the hour automatically:",
            err,
          );
        },
      );
    }
  }, [dealTimeLeft, dealConfig.isActive]);

  // Standalone Grocery Module states. The owner catalogue is the built-in
  // default so the grocery/pharmacy grid is correct from first paint (e.g.
  // the 11 medicines on /pharmacy) even before Firestore responds; cached /
  // live items win on id conflict, so admin price/availability edits are kept.
  const initialGroceryProducts = mergeOwnerFirst(
    OWNER_GROCERY_PRODUCTS,
    readCatalogForPaint<GroceryProduct[]>("groceryProducts", "dadu_cached_grocery_products", []).filter(
      (item) => item && !String(item.id || "").startsWith("gprod_"),
    ),
  );
  const [activeModule, setActiveModule] = useState<"food" | "grocery">(() => {
    // Direct landing on /grocery or /pharmacy opens the grocery module.
    if (typeof window === "undefined") return "food";
    const p = window.location.pathname.replace(/^\/+|\/+$/g, "");
    return p === "grocery" || p === "pharmacy" ? "grocery" : "food";
  });
  // Admin "Refresh All Users" — bumped when the admin presses Refresh; re-runs the fetch-once effects below.
  const [catalogRefreshTick, setCatalogRefreshTick] = useState(0);
  const lastRefreshSignalRef = useRef<number>(0);
  const refreshSignalInitRef = useRef(false);
  const [foodCategories, setFoodCategories] = useState<FoodCategory[]>(() =>
    readCatalogForPaint<FoodCategory[]>("foodCategories", "dadu_cached_food_categories", DEFAULT_FOOD_CATEGORIES as any),
  );
  const [groceryCategories, setGroceryCategories] = useState<GroceryCategory[]>(() =>
    // Owner categories are the built-in default (incl. gcat_medicine, available)
    // so the medicine category is active from first paint. Do NOT strip gcat_*
    // here — that left the category list empty on cold load, and GroceryModule
    // hides every product whose category is not in the active list, which is
    // why /pharmacy rendered "No items in this category yet" until Firestore
    // responded. Cached/live categories win on id conflict (admin edits kept).
    mergeOwnerFirst(
      OWNER_GROCERY_CATEGORIES,
      readCatalogForPaint<GroceryCategory[]>("groceryCategories", "dadu_cached_grocery_categories", []),
    ),
  );
  const [groceryProducts, setGroceryProducts] = useState<GroceryProduct[]>(() => initialGroceryProducts);
  const [isLoadingGrocery, setIsLoadingGrocery] = useState(false);
  const [groceryDeliveryConfig, setGroceryDeliveryConfig] =
    useState<GroceryDeliveryConfig>({
      baseDeliveryFee: 100,
      freeDeliveryAboveAmount: 1000,
      allowMixedCart: true,
    });
  const [groceryCartItems, setGroceryCartItems] = useState<GroceryOrderItem[]>(
    [],
  );
  const [isGroceryCartOpen, setIsGroceryCartOpen] = useState(false);

  // Navigation / Toggles
  const [activeCategory, setActiveCategory] = useState<string>("All");
  // Grocery sub-view (lifted from GroceryModule so the mobile back-button
  // controller can step back out of a grocery category / full catalog
  // instead of jumping straight to the homepage).
  const [groceryCategoryId, setGroceryCategoryId] = useState<string>("All");
  const [groceryShowAllCatalog, setGroceryShowAllCatalog] = useState<boolean>(false);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<string>("All Restaurants");
  const [initialRestaurantCategory, setInitialRestaurantCategory] = useState<string | undefined>(undefined);
  
  const [animatingRestaurant, setAnimatingRestaurant] = useState<{name: string, imageUrl?: string} | null>(null);
  // Timers driving the restaurant-open animation; cleared on every new tap
  // (and on unmount) so a rapid second tap can't be overridden by the first
  // tap's stale timeout firing later and opening the wrong restaurant.
  const restaurantNavTimersRef = useRef<number[]>([]);
  useEffect(() => {
    const timers = restaurantNavTimersRef.current;
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  const handleRestaurantClick = (vendor: string, category?: string) => {
    if (vendor === "All Restaurants") {
      setSelectedRestaurant("All Restaurants");
      setInitialRestaurantCategory(undefined);
      return;
    }
    
    const vendorImageUrl =
      deliverySettings?.restaurantStatuses?.[vendor]?.imageUrl ||
      deliverySettings?.restaurantStatuses?.[vendor]?.bgImageUrl ||
      dishes.find(d => (d.restaurantName || "Dadu Fast Food & Kitchen") === vendor && d.imageUrl)?.imageUrl ||
      getDefaultRestaurantImage(vendor);
    
    restaurantNavTimersRef.current.forEach((t) => window.clearTimeout(t));
    restaurantNavTimersRef.current = [];
    setAnimatingRestaurant({ name: vendor, imageUrl: vendorImageUrl });

    restaurantNavTimersRef.current.push(
      window.setTimeout(() => {
        if (category) setInitialRestaurantCategory(category);
        setSelectedRestaurant(vendor);
        window.scrollTo({ top: 0, behavior: "instant" });
        restaurantNavTimersRef.current.push(
          window.setTimeout(() => {
            setAnimatingRestaurant(null);
          }, 150),
        );
      }, 380),
    );
  };

  const [searchQuery, setSearchQuery] = useState("");
  // Debounced search: filtering 144 dishes + 297 grocery items on every
  // keystroke re-renders both lists. The input stays controlled by the raw
  // searchQuery (instant echo); only the filtering uses the debounced value.
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearchQuery(searchQuery), 250);
    return () => window.clearTimeout(t);
  }, [searchQuery]);
  // Food search used to look broken (audit 28 Nov #5): the results render
  // at #catalog-section, ~1200px below the fold, and nothing scrolled
  // there — the user typed and saw nothing change. Jump to the results
  // when a food search starts (grocery results already filter in place).
  useEffect(() => {
    if (!debouncedSearchQuery.trim() || activeModule !== "food") return;
    document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [debouncedSearchQuery, activeModule]);
  const [quickFilter, setQuickFilter] = useState<
    "all" | "top_rated" | "under_300" | "fast_food" | "desi" | "pizza" | "chai_sweets"
  >("all");
  const prevOrderStatusesRef = useRef<Record<string, string>>({});
  const prevUnreadCountRef = useRef<number>(0);
  // Food cart persists in localStorage so a full page reload keeps the cart
  const [cartItems, setCartItems] = useState<OrderItem[]>(() => {
    try {
      const raw =
        typeof window !== "undefined" ? localStorage.getItem("dadu_cart") : null;
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("dadu_cart", JSON.stringify(cartItems));
    } catch {}
  }, [cartItems]);
  const [vouchers, setVouchers] = useState<Voucher[]>(() =>
    readCatalogForPaint<Voucher[]>("vouchers", "dadu_cached_vouchers", []),
  );
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<Order | null>(
    null,
  );

  // Modal Openings
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAdminConsoleOpen, setIsAdminConsoleOpen] = useState(() =>
    // /admin opens the admin console directly (same state the in-app
    // Admin buttons set). The console itself still gates on isUserAdmin,
    // so a non-admin visitor just sees the home view with staff login.
    typeof window !== "undefined" &&
    window.location.pathname.replace(/^\/+|\/+$/g, "") === "admin",
  );
  const [activeDetailDish, setActiveDetailDish] = useState<Dish | null>(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [isDirectChatOpen, setIsDirectChatOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSignOutConfirmOpen, setIsSignOutConfirmOpen] = useState(false);
  // Crawlable /grocery and /pharmacy routes (H6): parsed from the URL on load,
  // exactly like activeInfoPage below. "home" covers / and the /shop/* + info
  // pages (handled by their own state); anything else unknown is "not-found".
  type SeoRoute = "home" | "grocery" | "pharmacy" | "restaurants" | "hotels" | "not-found";
  const parseSeoRoute = (): SeoRoute => {
    if (typeof window === "undefined") return "home";
    const p = window.location.pathname.replace(/^\/+|\/+$/g, "");
    if (p === "grocery") return "grocery";
    if (p === "pharmacy") return "pharmacy";
    if (p === "restaurants") return "restaurants";
    if (p === "hotels") return "hotels";
    // /admin is not a page — it opens the staff-login/admin console
    // (isAdminConsoleOpen, initialised from the URL above), so it must
    // never render the 404 view.
    if (p === "admin") return "home";
    if (p === "") return "home";
    if (p.startsWith("shop/")) return "home";
    const infoSlugs = ["about", "terms", "privacy-policy", "refund-policy", "contact", "partner-with-us", "become-a-rider"];
    if (infoSlugs.includes(p)) return "home";
    return "not-found";
  };
  const [activeRoute, setActiveRoute] = useState<SeoRoute>(() => parseSeoRoute());
  const [activeInfoPage, setActiveInfoPage] = useState<InfoPageSlug | null>(() => {
    if (typeof window === "undefined") return null;
    const p = window.location.pathname.replace(/^\/+|\/+$/g, "");
    const validSlugs: InfoPageSlug[] = [
      "about",
      "terms",
      "privacy-policy",
      "refund-policy",
      "contact",
      "partner-with-us",
      "become-a-rider",
    ];
    return validSlugs.includes(p as InfoPageSlug) ? (p as InfoPageSlug) : null;
  });
  const [language, setLanguage] = useState<"en" | "ur">(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("dadu_language") : null;
    return saved === "ur" ? "ur" : "en";
  });
  const [adminSeoOverride, setAdminSeoOverride] = useState<
    { siteTitle?: string; siteDescription?: string } | undefined
  >(undefined);
  // Munchi voice pace — pre-speech pause in ms, admin-configurable from
  // the Admin Panel (settings/voice_config → pauseMs). Default 150ms
  // (fast reply, user 28 Nov 11:02). Passed to VoiceOrderModal.
  const [voicePauseMs, setVoicePauseMs] = useState<number>(150);

  const handleLanguageChange = (lang: "en" | "ur") => {
    setLanguage(lang);
    localStorage.setItem("dadu_language", lang);
  };

  const navigateToInfoPage = (slug: InfoPageSlug | null) => {
    setActiveInfoPage(slug);
    setActiveRoute("home");
    setSelectedRestaurant("All Restaurants");
    if (typeof window !== "undefined") {
      const targetUrl = slug ? `/${slug}` : "/";
      if (window.location.pathname !== targetUrl) {
        window.history.pushState({ infoPage: slug }, "", targetUrl);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Navigation Home Resetters
  const handleGoToFoodHome = () => {
    setActiveInfoPage(null);
    setActiveRoute("home");
    setActiveModule("food");
    setSelectedRestaurant("All Restaurants");
    setInitialRestaurantCategory(undefined);
    setActiveCategory("All");
    setQuickFilter("all");
    setSearchQuery("");
    setShowFavoritesOnly(false);
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.history.pushState({ page: "home" }, "", "/");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGoToGroceryHome = () => {
    setActiveInfoPage(null);
    setActiveRoute("grocery");
    setActiveModule("grocery");
    setSearchQuery("");
    if (typeof window !== "undefined" && window.location.pathname !== "/grocery") {
      window.history.pushState({ page: "grocery" }, "", "/grocery");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGoToPharmacyHome = () => {
    setActiveInfoPage(null);
    setActiveRoute("pharmacy");
    setActiveModule("grocery");
    setSearchQuery("");
    // Full pharmacy-home reset (mirrors GroceryModule's route-change
    // effect): back to the Medicine & Pharmacy category with the full
    // catalog view, so tapping the header's Pharmacy segment while
    // already on /pharmacy restores the landing state.
    setGroceryCategoryId("gcat_medicine");
    setGroceryShowAllCatalog(false);
    if (typeof window !== "undefined" && window.location.pathname !== "/pharmacy") {
      window.history.pushState({ page: "pharmacy" }, "", "/pharmacy");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGoToRestaurantsHome = () => {
    setActiveInfoPage(null);
    setActiveRoute("restaurants");
    setActiveModule("food");
    setSelectedRestaurant("All Restaurants");
    setSearchQuery("");
    if (typeof window !== "undefined" && window.location.pathname !== "/restaurants") {
      window.history.pushState({ page: "restaurants" }, "", "/restaurants");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGoToHotelsHome = () => {
    setActiveInfoPage(null);
    setActiveRoute("hotels");
    setActiveModule("food");
    setSelectedRestaurant("All Restaurants");
    setSearchQuery("");
    if (typeof window !== "undefined" && window.location.pathname !== "/hotels") {
      window.history.pushState({ page: "hotels" }, "", "/hotels");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const [successAnimationOrder, setSuccessAnimationOrder] =
    useState<Order | null>(null);
  const [isSuccessAnimationOpen, setIsSuccessAnimationOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isMobileAccountOpen, setIsMobileAccountOpen] = useState(false);

  // Visual notify states
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [toastNotification, setToastNotification] = useState<{
    title: string;
    message: string;
    /** Auto-dismiss delay in ms; defaults to 3000. */
    durationMs?: number;
  } | null>(null);
  // Styled in-app confirm for the mixed food/grocery basket (audit 28 Nov
  // #8) — replaces the raw window.confirm("DISALLOW MIXED BASKET!").
  const [mixedCartConfirm, setMixedCartConfirm] = useState<null | {
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  }>(null);

  // Every bottom alert auto-dismisses after a few seconds and is tap-to-dismiss,
  // so no alert ever lingers over the cart / submit button.
  // This effect is the ONLY owner of the dismiss timer: previously several
  // call sites also armed their own setTimeout(() => setToastNotification(null)),
  // and a stale one could wipe a *newer* toast that appeared in the meantime.
  useEffect(() => {
    if (!toastNotification) return;
    const t = window.setTimeout(
      () => setToastNotification(null),
      toastNotification.durationMs ?? 3000,
    );
    return () => window.clearTimeout(t);
  }, [toastNotification]);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBubble, setShowInstallBubble] = useState(false);
  // Floating buttons (WhatsApp FAB + Install pill) hide while the user is
  // actively scrolling — otherwise they cover content mid-scroll — and
  // reappear shortly after scrolling stops.
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollIdleTimerRef = useRef<number | null>(null);
  useEffect(() => {
    const onScroll = () => {
      setIsScrolling((prev) => (prev ? prev : true));
      if (scrollIdleTimerRef.current) window.clearTimeout(scrollIdleTimerRef.current);
      scrollIdleTimerRef.current = window.setTimeout(() => setIsScrolling(false), 700);
      // The Install pill is a top-of-page promo: once the user scrolls into
      // content, dismiss it for this session so it never covers the promo
      // bar, product cards, or section text.
      if (window.scrollY > 300) setShowInstallBubble(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollIdleTimerRef.current) window.clearTimeout(scrollIdleTimerRef.current);
    };
  }, []);

  // Global Location State
  // Location persists for 2 hours so a returning visit never re-prompts:
  // if location is already on, the prompt/modal goes away instantly.
  // The location is saved ONCE when the site opens and reused for 2 hours
  // — it is NOT re-fetched on every visit, so Firebase stays within limits.
  const [globalCoords, setGlobalCoords] = useState<{ latitude: number; longitude: number } | null>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("dadu_coords") : null;
      if (!raw) return null;
      const saved = JSON.parse(raw) as { latitude: number; longitude: number; at?: number };
      if (!saved || typeof saved.latitude !== "number" || typeof saved.longitude !== "number") return null;
      if (saved.at && Date.now() - saved.at > 2 * 60 * 60 * 1000) return null;
      return { latitude: saved.latitude, longitude: saved.longitude };
    } catch {
      return null;
    }
  });
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationPromptDismissed, setLocationPromptDismissed] = useState(false);
  const [locationRequiredForOrder, setLocationRequiredForOrder] = useState(false);
  const [isUserMapPickerOpen, setIsUserMapPickerOpen] = useState(false);
  const [manualAddress, setManualAddress] = useState<{ area: string; street: string } | null>(() => {
    try {
      const saved = localStorage.getItem("dadu_manual_address");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const handleGoogleUser = async (gUser: { uid: string; displayName: string | null; email: string | null; photoURL: string | null }) => {
        const googleEmail = (gUser.email || "").trim().toLowerCase();
        let docId = `g_${gUser.uid}`;
        let existingData: any = null;

        if (googleEmail) {
          const q = query(collection(db, "users"), where("email", "==", googleEmail));
          const snap = await getDocs(q);
          if (!snap.empty) {
            docId = snap.docs[0].id;
            existingData = snap.docs[0].data();
          }
        }

        if (!existingData) {
          const directSnap = await getDoc(doc(db, "users", docId));
          if (directSnap.exists()) {
            existingData = directSnap.data();
          }
        }

        if (existingData && (existingData.status === "blocked" || existingData.isBlacklisted)) {
          throw new Error("This account has been restricted. Contact support at 03277004471.");
        }

        const profileRef = doc(db, "users", docId);
        if (existingData) {
          await setDoc(
            profileRef,
            {
              firebaseUid: gUser.uid,
              email: googleEmail || existingData.email || "",
              name: existingData.name || gUser.displayName || "Dadu Customer",
              status: existingData.status === "locked" ? "locked" : "verified",
            },
            { merge: true }
          ).catch(() => {});
        } else {
          const newProfile: any = {
            uid: docId,
            firebaseUid: gUser.uid,
            name: gUser.displayName || "Dadu Customer",
            email: googleEmail,
            phone: "",
            address: manualAddress ? `${manualAddress.area}, ${manualAddress.street}` : "",
            role: "buyer",
            status: "verified",
            ordersCount: 0,
            totalOrders: 0,
            isBlacklisted: false,
            createdAt: new Date(),
          };
          if (globalCoords) {
            newProfile.savedLocation = {
              lat: globalCoords.latitude,
              lng: globalCoords.longitude,
              area: manualAddress?.area || "",
              street: manualAddress?.street || "",
            };
          }
          await setDoc(profileRef, newProfile);
        }

        localStorage.setItem("dadu_user_phone", docId);
        window.dispatchEvent(new StorageEvent("storage", { key: "dadu_user_phone" }));
        setIsAuthOpen(false);
        setToastNotification({
          title: "Signed in with Google",
          message: `Welcome, ${gUser.displayName || "Customer"}!`,
        });
  };

  // Google redirect sign-in pickup: after "Continue with Google" redirects
  // to Google and back, complete the sign-in here (same profile logic as
  // the AuthModal callback). Runs once on mount; no-op when there is no
  // pending redirect result.
  useEffect(() => {
    let cancelled = false;
    getRedirectResult(auth)
      .then((result) => {
        if (cancelled || !result?.user) return;
        const u = result.user;
        return handleGoogleUser({
          uid: u.uid,
          displayName: u.displayName,
          email: u.email,
          photoURL: u.photoURL,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);

  // Free-delivery countdown: real deadline — offer ends at midnight tonight (local time).
  const secondsUntilMidnight = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
  };
  const [promoBannerDismissed, setPromoBannerDismissed] = useState(false);
  const [promoCountdownSec, setPromoCountdownSec] = useState(secondsUntilMidnight);

  useEffect(() => {
    if (promoBannerDismissed) return;
    const interval = setInterval(() => {
      setPromoCountdownSec(secondsUntilMidnight());
    }, 1000);
    return () => clearInterval(interval);
  }, [promoBannerDismissed]);

  useEffect(() => {
    const onQuotaExceeded = () => setGmpQuotaExceeded(true);
    window.addEventListener("gmp-quota-exceeded", onQuotaExceeded);
    return () => window.removeEventListener("gmp-quota-exceeded", onQuotaExceeded);
  }, []);


  const [showAnnouncementPopup, setShowAnnouncementPopup] = useState(false);



  const userDistanceFromBase = React.useMemo(() => {
    if (!globalCoords) return null;
    if (!deliverySettings?.baseLocationCoords?.lat || !deliverySettings?.baseLocationCoords?.lng) return null;
    return calculateDistanceKm(
      globalCoords.latitude,
      globalCoords.longitude,
      deliverySettings.baseLocationCoords.lat,
      deliverySettings.baseLocationCoords.lng
    );
  }, [globalCoords, deliverySettings]);

  const isUserOutOfRange = React.useMemo(() => {
    if (userDistanceFromBase === null) return false;
    if (!deliverySettings?.userRangeKm) return false;
    return userDistanceFromBase > deliverySettings.userRangeKm;
  }, [userDistanceFromBase, deliverySettings]);

  const isRiderRangeExceeded = React.useMemo(() => {
    if (userDistanceFromBase === null) return false;
    if (!deliverySettings?.riderRangeKm) return false;
    return userDistanceFromBase > deliverySettings.riderRangeKm;
  }, [userDistanceFromBase, deliverySettings]);

  const nativeLocationRequestedRef = useRef(false);

  // Save coords to state + localStorage (2-hour freshness) in one place
  const saveCoords = (coords: { latitude: number; longitude: number }) => {
    setGlobalCoords(coords);
    try {
      localStorage.setItem(
        "dadu_coords",
        JSON.stringify({ ...coords, at: Date.now() }),
      );
    } catch {}
  };

  // FIRST-VISIT LOCATION: Trigger browser's NATIVE geolocation dialog directly first.
  // Only if the user denies or geolocation fails/unavailable, show the Urdu "Apni Location On Karein" prompt.
  useEffect(() => {
    if (showSplash) return;
    if (globalCoords) return;
    if (nativeLocationRequestedRef.current) return;
    nativeLocationRequestedRef.current = true;

    if (!navigator.geolocation) {
      if (!manualAddress && !locationPromptDismissed) {
        setShowLocationPrompt(true);
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        saveCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setShowLocationPrompt(false);
        setLocationRequiredForOrder(false);
      },
      () => {
        // User denied or blocked browser geolocation -> show exact Urdu modal with Allow Location + manual fallback
        if (!manualAddress && !locationPromptDismissed) {
          setShowLocationPrompt(true);
        }
      },
      // Fast resolve: accept a cached fix up to 60s old, 5s max wait
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
  }, [showSplash, globalCoords, manualAddress, locationPromptDismissed]);

  const requestLocation = async () => {
    if (!navigator.geolocation) {
      setShowLocationPrompt(true);
      return;
    }
    // If the browser already blocked location, getCurrentPosition fails silently
    // without showing any prompt — check permission first so the tap does something useful.
    try {
      const perm = await (navigator as any).permissions?.query({ name: "geolocation" });
      if (perm?.state === "denied") {
        setShowLocationPrompt(true);
        setToastNotification({
          title: "Location Blocked",
          message:
            "Browser ki settings mein is site ke liye Location Allow karein, phir dobara koshish karein.",
        });
        return;
      }
    } catch {}
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        saveCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setShowLocationPrompt(false);
        setLocationRequiredForOrder(false);
        // No success toast — the modal closing is the feedback.
      },
      (err) => {
        // Keep modal open so user sees exact Urdu message and can retry or use manual Dadu address fallback
        setShowLocationPrompt(true);
        if (err && (err as GeolocationPositionError).code === 1) {
          setToastNotification({
            title: "Location Blocked",
            message:
              "Browser ki settings mein is site ke liye Location Allow karein, phir dobara koshish karein.",
          });
        }
      },
      // Fast resolve: accept a cached fix up to 60s old, 5s max wait
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
  };

  const handleManualAddressSave = async (area: string, street?: string) => {
    const cleaned = { area: area.trim(), street: (street || "").trim() };
    setManualAddress(cleaned);
    try {
      localStorage.setItem("dadu_manual_address", JSON.stringify(cleaned));
    } catch {}
    const fullAddress = cleaned.street ? `${cleaned.area}, ${cleaned.street}` : cleaned.area;
    if (currentUser) {
      const updatedUser: UserProfile = {
        ...currentUser,
        address: fullAddress,
        savedLocation: {
          ...(currentUser.savedLocation || {}),
          area: cleaned.area,
          street: cleaned.street,
        },
      };
      setCurrentUser(updatedUser);
      setCachedData("dadu_cached_user", updatedUser);
      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          address: fullAddress,
          savedLocation: updatedUser.savedLocation,
        },
        { merge: true }
      ).catch(() => {});
    }
    setShowLocationPrompt(false);
    setLocationRequiredForOrder(false);
    setToastNotification({
      title: "Delivery Address Saved",
      message: `${fullAddress}, Dadu`,
    });
  };

  // Map pick (manual location option 2): user taps a pin on the free Leaflet
  // map — save the coords AND the reverse-geocoded address, then close.
  const handleMapLocationSave = (lat: number, lng: number, formattedAddress?: string) => {
    saveCoords({ latitude: lat, longitude: lng });
    const parts = (formattedAddress || "")
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p && !/^(Pakistan|Sindh)$/i.test(p));
    const street = parts[0] || "";
    const area = parts.slice(1).join(", ") || "Dadu";
    handleManualAddressSave(area, street);
    setIsUserMapPickerOpen(false);
  };

  // NOTE: there is deliberately NO continuous watchPosition here. The
  // customer's location is saved once when the site opens and reused for
  // 2 hours (see the dadu_coords cache above). A live watch would keep
  // firing GPS updates and Firestore writes all session long and burn
  // the free Firebase quota. Only the rider is live-tracked (see
  // src/lib/riderLocationTracker.ts, once a minute while delivering).

  // Synchronize live GPS pinpoint coordinates to Firestore when they change.
  // Firebase quota guard: the saved location is written AT MOST once every
  // 2 hours. The customer's location is saved once when the site opens and
  // reused from localStorage for 2 hours — it must NOT write to Firestore
  // on every GPS change or every visit, or the free quota runs out.
  useEffect(() => {
    if (!currentUser?.uid || currentUser.role === "rider" || currentUser.role === "admin" || !globalCoords) return;

    const dbLat = currentUser.savedLocation?.lat;
    const dbLng = currentUser.savedLocation?.lng;

    const hasNoCoordinates = !dbLat || !dbLng;
    let distanceChanged = false;

    if (dbLat && dbLng) {
      const distance = calculateDistanceKm(
        globalCoords.latitude,
        globalCoords.longitude,
        dbLat,
        dbLng
      );
      if (distance > 0.015) { // 15 meters
        distanceChanged = true;
      }
    }

    if (hasNoCoordinates || distanceChanged) {
      try {
        const lastWritten = Number(localStorage.getItem("dadu_loc_written_at") || 0);
        if (lastWritten && Date.now() - lastWritten < 2 * 60 * 60 * 1000) return;
        localStorage.setItem("dadu_loc_written_at", String(Date.now()));
      } catch {}
      const userRef = doc(db, "users", currentUser.uid);
      updateDoc(userRef, {
        "savedLocation.lat": globalCoords.latitude,
        "savedLocation.lng": globalCoords.longitude,
        // Preserve other fields
        "savedLocation.area": currentUser.savedLocation?.area || "",
        "savedLocation.street": currentUser.savedLocation?.street || "",
        "savedLocation.landmark": (currentUser.savedLocation as any)?.landmark || "",
        "savedLocation.notes": (currentUser.savedLocation as any)?.notes || "",
        lastLocationUpdate: new Date()
      }).catch((err) => {
        console.warn("Error updating real-time pinpoint GPS in DB:", err);
      });
    }
  }, [currentUser?.uid, globalCoords, currentUser?.savedLocation?.lat, currentUser?.savedLocation?.lng]);

  useEffect(() => {
    // NEVER show the PWA install prompt inside the native APK (user 28 Nov
    // 03:15): the app is already installed, so an "Install" bubble inside
    // it is meaningless. Only the website (browser) may show it.
    if (Capacitor.isNativePlatform()) return;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    if (!isStandalone) {
      // First visit only (audit 28 Nov #11): the bubble used to float over
      // the product cards for 8s on EVERY visit. Remember it was shown so
      // it never covers the grid again.
      if (!localStorage.getItem("dadu_install_bubble_seen")) {
        setShowInstallBubble(true);
        localStorage.setItem("dadu_install_bubble_seen", "1");
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  // Auto-hide the install bubble after 8s so it never permanently covers content
  useEffect(() => {
    if (!showInstallBubble) return;
    const t = window.setTimeout(() => setShowInstallBubble(false), 8000);
    return () => window.clearTimeout(t);
  }, [showInstallBubble]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setShowInstallBubble(false);
      }
    } else {
      alert("To install: Tap the Share button (iOS) or Menu button (Android) and select 'Add to Home Screen'.");
    }
  };

  // Audio synthesizer chime tone
  const playChimeSound = () => {
    try {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Tone 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      // Tone 2 staggered slightly (0.1s later) on the SAME context
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, now + 0.1); // A5
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.25); // D6
      gain2.gain.setValueAtTime(0.1, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.4);

      setTimeout(() => {
        if (ctx.state !== "closed") {
          ctx.close().catch(() => {});
        }
      }, 600);
    } catch (err) {
      console.warn("AudioContext blocked or waiting for user gesture:", err);
    }
  };

  // 1. Authenticated Profile listening
  useEffect(() => {
    let unsubscribe = () => {};
    
    const initializeUser = async () => {
      const savedPhone = localStorage.getItem("dadu_user_phone");
      if (savedPhone) {
        // Read Firestore Profile details
        const profileRef = doc(db, "users", savedPhone);
        const profileSnap = await getDoc(profileRef);

        let userData: any = null;
        let userUid = savedPhone;

        if (profileSnap.exists()) {
          userData = profileSnap.data();
        } else {
          // Check if there is a user with this phone number or username (e.g., rider registered with custom UID)
          const lowerSavedPhone = savedPhone.toLowerCase();
          const q = query(collection(db, "users"), where("phone", "==", lowerSavedPhone));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            userData = qSnap.docs[0].data();
            userUid = qSnap.docs[0].id;
          }
        }

        if (userData) {
          const finalProfile = { uid: userUid, ...userData } as UserProfile;
          setCurrentUser(finalProfile);
          setCachedData("dadu_cached_user", finalProfile);
          if (finalProfile.role !== "admin" && finalProfile.role !== "staff") {
            setIsAdminConsoleOpen(false);
          }
        } else {
          // Unverified / missing Firestore profile defaults strictly to standard buyer role
          const fallback: UserProfile = {
            uid: savedPhone,
            name: "Dadu Guest",
            phone: savedPhone,
            address: "",
            role: "buyer",
            ordersCount: 0,
          };
          setCurrentUser(fallback);
          setCachedData("dadu_cached_user", fallback);
          setIsAdminConsoleOpen(false);
        }

        // Live listen to profile changes using the correct userUid
        unsubscribe = onSnapshot(doc(db, "users", userUid), (docSnap) => {
           if (docSnap.exists()) {
              const liveProfile = { uid: userUid, ...docSnap.data() } as UserProfile;
              setCurrentUser(liveProfile);
              setCachedData("dadu_cached_user", liveProfile);
              if (liveProfile.role !== "admin" && liveProfile.role !== "staff") {
                setIsAdminConsoleOpen(false);
              }
           }
        });
      } else {
        setCurrentUser(null);
        localStorage.removeItem("dadu_cached_user");
        setIsAdminConsoleOpen(false);
      }
    };
    
    initializeUser();

    // Setup an event listener for when another component logs in
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "dadu_user_phone") {
        initializeUser();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
       unsubscribe();
       window.removeEventListener("storage", handleStorageChange);
    };
  }, []);


  // 1b. Live Unblock Alert for Riders & Users
  useEffect(() => {
    if (currentUser && currentUser.needsUnblockAlert === true) {
      alert(currentUser.unblockAlertMessage || "Mubarak ho! Aapka account admin ne unblock kar diya hai.");
      updateDoc(doc(db, "users", currentUser.uid), {
        needsUnblockAlert: false,
        unblockAlertMessage: ""
      }).catch((err) => {
        console.error("Failed to clear needsUnblockAlert:", err);
      });
    }
  }, [currentUser]);

  // Real-time track user status verification notifications
  const prevUserStatusRef = React.useRef<string | undefined>(undefined);
  useEffect(() => {
    if (currentUser) {
      if (prevUserStatusRef.current === "locked" && currentUser.status === "verified") {
        alert("Aapka number verify ho gaya! Ab aap order kar sakte hain!");
      }
      prevUserStatusRef.current = currentUser.status;
    } else {
      prevUserStatusRef.current = undefined;
    }
  }, [currentUser?.status]);

  // 1.5. Ultra 60FPS Smooth Fast Loading Splash Screen Animation
  useEffect(() => {
    if (sessionStorage.getItem("dadu_splash_seen")) {
      setShowSplash(false);
      return;
    }

    setShowSplash(true);
    setSplashProgress(0);
    setSplashExiting(false);

    let animationFrameId: number;
    const startTime = performance.now();
    const duration = 2400; // ~2.4s — long enough to actually SEE the opening animation (floating food, scooter, staggered letters, shine sweep)

    const updateProgress = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(Math.floor((elapsed / duration) * 100), 100);
      setSplashProgress(progress);

      if (progress < 100) {
        animationFrameId = requestAnimationFrame(updateProgress);
      } else {
        sessionStorage.setItem("dadu_splash_seen", "1");
        // Smooth fade-out instead of an abrupt cut
        setSplashExiting(true);
        setTimeout(() => {
          setShowSplash(false);
        }, 300);
      }
    };

    animationFrameId = requestAnimationFrame(updateProgress);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // 2. Fetch-once Menu Loading (refetch on tab visible) & Auto-Seeding with persistent instant cache
  useEffect(() => {
    console.log("Trace: Initializing Menu collection listener...");
    let cancelled = false;
    const fetchMenu = async () => {
      // 24h TTL catalogue cache + granular delta: a fresh cache costs 0
      // catalogue reads, but the delta doc (1 cheap read, shared across
      // all 5 collections) patches in only the items the admin changed
      // since this cache was saved — a price change updates just that
      // item, a product add inserts just that product. Falls through to
      // the full fetch only on Refresh, a bulk op, or >20 changes; if the
      // delta read fails, the cache is used as-is.
      const freshEntry = readFreshCatalogEntry<Dish[]>("menu");
      if (freshEntry) {
        const patched = await applyCatalogDelta<Dish>(
          "menu",
          freshEntry.data,
          freshEntry.savedAt,
        );
        if (cancelled) return;
        if (patched.mode === "cache") return;
        if (patched.mode === "patched") {
          const list = [...patched.list].sort(
            (a, b) => (a.position || 0) - (b.position || 0),
          );
          setDishes(list);
          setCachedData("dadu_cached_dishes", list);
          writeCatalogCache("menu", list, patched.readAt);
          return;
        }
        // mode "full" — fall through to the full fetch below.
      }
      // No fresh cache: build from the BUNDLED local dishes (0 reads)
      // instead of a full Firestore fetch (~145 reads). The delta (1
      // memoized read) applies only admin changes made after the bundle
      // was exported (LOCAL_DISHES_SYNCED_AT); a full fetch only happens
      // when the delta says a Refresh / bulk op / >20 changes needs it.
      // Tombstones (admin-deleted dishes) are filtered out first so a
      // deleted dish never resurrects from the bundle.
      {
        const delta = await getCatalogDelta();
        const tombstones = new Set(
          Object.values(delta?.changes || {})
            .filter((e) => e && e.c === "menu" && e.a === "delete")
            .map((e) => e.id),
        );
        const base = LOCAL_DISHES.filter(
          (dish) => !tombstones.has(dish.id),
        );
        const patched = await applyCatalogDelta<Dish>(
          "menu",
          base,
          LOCAL_DISHES_SYNCED_AT,
        );
        if (cancelled) return;
        if (patched.mode === "cache" || patched.mode === "patched") {
          const list = [...(patched.mode === "patched" ? patched.list : base)].sort(
            (a, b) => (a.position || 0) - (b.position || 0),
          );
          setDishes(list);
          setCachedData("dadu_cached_dishes", list);
          writeCatalogCache(
            "menu",
            list,
            patched.mode === "patched" ? patched.readAt : Date.now(),
          );
          setIsLoadingDishes(false);
          preloadImages(list.slice(0, 20).map((d) => d.imageUrl));
          return;
        }
        // mode "full" — fall through to the full fetch below.
      }
      try {
        const snapshot = await getDocs(collection(db, "menu"));
        if (cancelled) return;
        console.log("Trace: Menu snapshot received, empty:", snapshot.empty);
        if (snapshot.empty) {
          console.log("Menu database is empty.");
          setDishes([]);
          setIsLoadingDishes(false);
        } else {
          const list: Dish[] = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() } as Dish);
          });
          list.sort((a, b) => (a.position || 0) - (b.position || 0));
          setDishes(list);
          setIsLoadingDishes(false);
          setCachedData("dadu_cached_dishes", list);
          writeCatalogCache("menu", list);
          preloadImages(list.slice(0, 20).map((d) => d.imageUrl));
          // One-time menu data corrections (owner-approved): remove implausible
          // luxury items, fix the Biryani/Sada Roti descriptions, move steaks
          // out of the Tea & Chai category. Runs once per page load; after the
          // docs are fixed the checks below become no-ops.
          if (!menuFixAttemptedRef.current) {
            menuFixAttemptedRef.current = true;
            const LUXURY_NAMES = [
              "belgian mousse dome",
              "san pellegrino",
              "wagyu",
              "classic lotus biscoff cheesecake",
              "molten lava cake",
            ];
            snapshot.forEach((d) => {
              const data = d.data() as Dish;
              const name = String(data.name || "").toLowerCase();
              const desc = String(data.description || "");
              if (LUXURY_NAMES.some((n) => name.includes(n))) {
                deleteDoc(doc(db, "menu", d.id)).catch(() => {});
                return;
              }
              const updates: Record<string, string> = {};
              if (
                name.includes("biryani") &&
                /yogurt dip/i.test(desc)
              ) {
                updates.description =
                  "Fragrant basmati rice layered with spiced chicken, saffron and crispy fried onions. Served hot with fresh salad and raita.";
              }
              if (name.includes("sada roti")) {
                updates.description =
                  "Soft whole-wheat flatbread baked fresh on the tawa. Served hot with your salan.";
              }
              if (
                String(data.category || "").toLowerCase().includes("tea") &&
                /steak/i.test(name + " " + desc)
              ) {
                updates.category = "Steaks & Grill";
              }
              if (Object.keys(updates).length > 0) {
                updateDoc(doc(db, "menu", d.id), updates).catch(() => {});
              }
            });
          }
        }
      } catch (err) {
        if (cancelled) return;
        console.warn("Menu listening notice:", handleFirestoreError(err));
        setIsLoadingDishes(false);
        // Offline/quota fallback: show the bundled dishes so the menu
        // never goes blank when Firestore can't be read.
        setDishes((prev) => (prev.length > 0 ? prev : LOCAL_DISHES));
      }
    };
    fetchMenu();
    const handleVisibility = () => {
      if (!document.hidden) fetchMenu();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [catalogRefreshTick]);

  // 3. Fetch-once Delivery Settings Loading (refetch on tab visible)
  useEffect(() => {
    console.log("Trace: Initializing Delivery Settings collection listener...");
    let cancelled = false;
    const fetchDeliverySettings = async () => {
      // Settings cache (1h TTL): skip the Firestore read when the cached
      // copy is fresh — this fetch also runs on every tab-visible event.
      const cached = readSettingsCache<SystemSettings>("delivery_config");
      if (cached) {
        if (!cancelled) setDeliverySettings(cached);
        return;
      }
      try {
        const docSnap = await getDoc(doc(db, "settings", "delivery_config"));
        if (cancelled) return;
        console.log(
          "Trace: Delivery Settings snapshot received, exists:",
          docSnap.exists(),
        );
        if (docSnap.exists()) {
          const data = docSnap.data() as SystemSettings;
          setDeliverySettings(data);
          setCachedData("dadu_cached_delivery_settings", data);
          writeSettingsCache("delivery_config", data);
        } else {
          // Seed default safely with merge: true so existing statuses/pictures are never wiped
          const defaultCfg = {
            deliveryFee: 70,
            foodDeliveryFee: 70,
            groceryDeliveryFee: 100,
            medicineDeliveryFee: 30,
            siteTax: 12,
            nightSurchargeAmount: 30,
            nightSurchargeStartHour: 21,
            restaurantStatus: {
              isTemporarilyUnavailable: false,
              openingTime: "12:00",
              closingTime: "23:00",
            },
          };
          setDoc(doc(db, "settings", "delivery_config"), defaultCfg, { merge: true }).catch(console.error);
        }
      } catch (err) {
        if (cancelled) return;
        console.warn(
          "Delivery config subscription error:",
          handleFirestoreError(err),
        );
      }
    };
    fetchDeliverySettings();
    const handleVisibility = () => {
      if (!document.hidden) fetchDeliverySettings();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [catalogRefreshTick]);

  // 3.5 Global Offer / Announcement Pop-up Logic
  useEffect(() => {
    if (deliverySettings?.announcement?.active && deliverySettings?.announcement?.imageUrl) {
      const annId = deliverySettings.announcement.id;
      const alreadySeen = localStorage.getItem(`seen_announcement_${annId}`);
      if (!alreadySeen) {
        setShowAnnouncementPopup(true);
      } else {
        setShowAnnouncementPopup(false);
      }
    } else {
      setShowAnnouncementPopup(false);
    }
  }, [deliverySettings]);

  // 3a. Fetch-once Food Categories Loading (refetch on tab visible)
  useEffect(() => {
    let cancelled = false;
    const fetchFoodCategories = async () => {
      // 24h TTL cache + granular delta (see fetchMenu): patch only the
      // categories the admin changed since this cache was saved.
      const freshEntry = readFreshCatalogEntry<FoodCategory[]>("foodCategories");
      if (freshEntry) {
        const patched = await applyCatalogDelta<FoodCategory>(
          "foodCategories",
          freshEntry.data,
          freshEntry.savedAt,
        );
        if (cancelled) return;
        if (patched.mode === "cache") return;
        if (patched.mode === "patched") {
          const list = [...patched.list].sort(
            (a, b) => (a.position || 0) - (b.position || 0),
          );
          setFoodCategories(list);
          setCachedData("dadu_cached_food_categories", list);
          writeCatalogCache("foodCategories", list, patched.readAt);
          return;
        }
        // mode "full" — fall through to the full fetch below.
      }
      try {
        const snapshot = await getDocs(collection(db, "foodCategories"));
        if (cancelled) return;
        const list: FoodCategory[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as FoodCategory);
        });

        if (list.length === 0) {
          // Seed default categories
          const defaultCats: FoodCategory[] = [
            {
              id: "cat_all",
              name: "All",
              emoji: "🍽️",
              subtitle: "Sab Kuch",
              color: "from-[#D70F64] to-[#f22c80]",
              isAvailable: true,
              position: 0,
            },
            {
              id: "cat_pizza",
              name: "Pizza",
              emoji: "🍕",
              subtitle: "Hot Pizzas",
              color: "from-pink-500 to-rose-600",
              isAvailable: true,
              position: 1,
            },
            {
              id: "cat_burgers",
              name: "Burgers",
              emoji: "🍔",
              subtitle: "Zesty Burgers",
              color: "from-amber-500 to-pink-600",
              isAvailable: true,
              position: 2,
            },
            {
              id: "cat_broast",
              name: "Broast",
              emoji: "🍗",
              subtitle: "Crispy Broast",
              color: "from-yellow-500 to-amber-600",
              isAvailable: true,
              position: 3,
            },
            {
              id: "cat_rolls",
              name: "Rolls & Wraps",
              emoji: "🌯",
              subtitle: "Tasty Rolls",
              color: "from-pink-500 to-pink-600",
              isAvailable: true,
              position: 4,
            },
            {
              id: "cat_pasta",
              name: "Pasta",
              emoji: "🍝",
              subtitle: "Creamy Pasta",
              color: "from-yellow-600 to-orange-600",
              isAvailable: true,
              position: 5,
            },
            {
              id: "cat_lazania",
              name: "Lazania",
              emoji: "🫓",
              subtitle: "Cheesy Lazania",
              color: "from-pink-600 to-rose-700",
              isAvailable: true,
              position: 6,
            },
            {
              id: "cat_fries",
              name: "Fries",
              emoji: "🍟",
              subtitle: "Loaded Fries",
              color: "from-amber-400 to-yellow-600",
              isAvailable: true,
              position: 7,
            },
            {
              id: "cat_paratha",
              name: "Paratha",
              emoji: "🫓",
              subtitle: "Hot Parathas",
              color: "from-amber-600 to-orange-700",
              isAvailable: true,
              position: 8,
            },
            {
              id: "cat_sandwich",
              name: "Sandwich",
              emoji: "🥪",
              subtitle: "Grilled Sandwiches",
              color: "from-yellow-500 to-orange-500",
              isAvailable: true,
              position: 9,
            },
            {
              id: "cat_specials",
              name: "Specials",
              emoji: "⭐️",
              subtitle: "Dadu Premium",
              color: "#D70F64",
              isAvailable: true,
              position: 10,
            },
          ];

          try {
            const seedPromises = defaultCats.map((c) =>
              setDoc(doc(db, "foodCategories", c.id), c),
            );
            await Promise.all(seedPromises);
          } catch (err) {
            console.error("Failed to seed food categories", err);
          }
        } else {
          list.sort((a, b) => (a.position || 0) - (b.position || 0));
          setFoodCategories(list);
          setCachedData("dadu_cached_food_categories", list);
          writeCatalogCache("foodCategories", list);
        }
      } catch (err) {
        if (cancelled) return;
        console.warn("Food categories notice:", handleFirestoreError(err));
      }
    };
    fetchFoodCategories();
    const handleVisibility = () => {
      if (!document.hidden) fetchFoodCategories();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [catalogRefreshTick]);

  // One-time client-side seed guards for the owner grocery catalog
  // (297 items + 13 categories with branded photos in public/images/grocery/).
  // Firestore rules allow client-side seeding; the guard makes it idempotent.
  const grocerySeedAttemptedRef = useRef(false);
  const groceryCategorySeedAttemptedRef = useRef(false);
  // One-time menu data corrections (wrong descriptions, luxury items, miscategorised steaks)
  const menuFixAttemptedRef = useRef(false);

  // 3b. Fetch-once Grocery Categories Loading (refetch on tab visible)
  useEffect(() => {
    console.log("Trace: Initializing GroceryCategories collection listener...");
    let cancelled = false;
    const fetchGroceryCategories = async () => {
      // 24h TTL cache + granular delta (see fetchMenu): patch only the
      // categories the admin changed since this cache was saved. The
      // cached list is already the owner-merged display list, so patch it
      // in place (no re-merge, no re-sort — that would break owner-first
      // ordering); a new category appends at the end until the next full
      // fetch, exactly like a fresh load would order it.
      const freshEntry =
        readFreshCatalogEntry<GroceryCategory[]>("groceryCategories");
      if (freshEntry) {
        const patched = await applyCatalogDelta<GroceryCategory>(
          "groceryCategories",
          freshEntry.data,
          freshEntry.savedAt,
        );
        if (cancelled) return;
        if (patched.mode === "cache") return;
        if (patched.mode === "patched") {
          setGroceryCategories(patched.list);
          setCachedData("dadu_cached_grocery_categories", patched.list);
          writeCatalogCache("groceryCategories", patched.list, patched.readAt);
          return;
        }
        // mode "full" — fall through to the full fetch below.
      }
      try {
        const snapshot = await getDocs(collection(db, "groceryCategories"));
        if (cancelled) return;
        console.log(
          "Trace: GroceryCategories snapshot received, size:",
          snapshot.size,
        );
        const list: GroceryCategory[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as GroceryCategory);
        });
        list.sort((a, b) => (a.position || 0) - (b.position || 0));
        // Merge owner catalogue in so new categories (e.g. Medicine) show
        // immediately even if Firestore still holds the older list.
        const displayCats = mergeOwnerFirst(OWNER_GROCERY_CATEGORIES, list);
        setGroceryCategories(displayCats);
        setCachedData("dadu_cached_grocery_categories", displayCats);
        writeCatalogCache("groceryCategories", displayCats);
        setIsLoadingGrocery(false);
        // Seed the 12 owner categories once if any are missing from Firestore.
        if (!groceryCategorySeedAttemptedRef.current) {
          groceryCategorySeedAttemptedRef.current = true;
          const existingIds = new Set(list.map((c) => c.id));
          const missing = OWNER_GROCERY_CATEGORIES.filter(
            (c) => !existingIds.has(c.id),
          );
          if (missing.length > 0) {
            const batch = writeBatch(db);
            missing.forEach((c) =>
              batch.set(doc(db, "groceryCategories", c.id), { ...c }),
            );
            batch
              .commit()
              .catch((e) =>
                console.warn("Grocery categories seed failed:", e),
              );
          }
        }
      } catch (err) {
        if (cancelled) return;
        console.warn("Grocery categories notice:", handleFirestoreError(err));
        // Offline fallback: merge the built-in catalogue in so new categories
        // (e.g. Medicine) still show when Firestore can't be read (quota).
        setGroceryCategories((prev) => {
          const fallback = mergeOwnerFirst(OWNER_GROCERY_CATEGORIES, prev);
          setCachedData("dadu_cached_grocery_categories", fallback);
          return fallback;
        });
        setIsLoadingGrocery(false);
      }
    };
    fetchGroceryCategories();
    const handleVisibility = () => {
      if (!document.hidden) fetchGroceryCategories();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [catalogRefreshTick]);

  // 3b. Fetch-once Grocery Products Loading (refetch on tab visible).
  // LAZY (user 28 Nov 04:42 — "jo user dekhe wo ho"): the grocery list is
  // only fetched when the user actually opens the Groceries module. On
  // the Food homepage it is skipped entirely — the food view never shows
  // grocery products (the Dadu Mart tile count is hardcoded, food search
  // only searches dishes). Switching to Groceries re-runs the effect.
  useEffect(() => {
    if (activeModule !== "grocery") return;
    console.log("Trace: Initializing GroceryProducts collection listener...");
    let cancelled = false;
    const fetchGroceryProducts = async () => {
      // 24h TTL cache + granular delta (see fetchMenu): patch only the
      // products the admin changed since this cache was saved — a price
      // change updates just that product, a new product is inserted only.
      // The cached list is already the owner-merged display list, so
      // patch it in place (no re-merge).
      const freshEntry =
        readFreshCatalogEntry<GroceryProduct[]>("groceryProducts");
      if (freshEntry) {
        const patched = await applyCatalogDelta<GroceryProduct>(
          "groceryProducts",
          freshEntry.data,
          freshEntry.savedAt,
        );
        if (cancelled) return;
        if (patched.mode === "cache") return;
        if (patched.mode === "patched") {
          setGroceryProducts(patched.list);
          setCachedData("dadu_cached_grocery_products", patched.list);
          writeCatalogCache("groceryProducts", patched.list, patched.readAt);
          return;
        }
        // mode "full" — fall through to the bundled-base attempt below.
      }
      // No fresh cache: build from the BUNDLED owner catalogue (0 reads)
      // instead of a full Firestore fetch (~335 reads). The delta (1
      // memoized read) applies only admin changes made after the bundle
      // was synced (OWNER_CATALOG_SYNCED_AT); a full fetch only happens
      // when the delta says a Refresh / bulk op / >20 changes needs it.
      // Tombstones (admin-deleted products) are filtered out first so a
      // deleted product never resurrects from the bundle.
      {
        const delta = await getCatalogDelta();
        const tombstones = new Set(
          Object.values(delta?.changes || {})
            .filter((e) => e && e.c === "groceryProducts" && e.a === "delete")
            .map((e) => e.id),
        );
        const base = OWNER_GROCERY_PRODUCTS.filter(
          (prod) => !tombstones.has(prod.id),
        );
        const patched = await applyCatalogDelta<GroceryProduct>(
          "groceryProducts",
          base,
          OWNER_CATALOG_SYNCED_AT,
        );
        if (cancelled) return;
        if (patched.mode === "cache" || patched.mode === "patched") {
          const list = patched.mode === "patched" ? patched.list : base;
          setGroceryProducts(list);
          setCachedData("dadu_cached_grocery_products", list);
          writeCatalogCache(
            "groceryProducts",
            list,
            patched.mode === "patched" ? patched.readAt : Date.now(),
          );
          setIsLoadingGrocery(false);
          preloadImages(list.slice(0, 20).map((prod) => prod.imageUrl));
          return;
        }
        // mode "full" — fall through to the full fetch below.
      }
      try {
        const snapshot = await getDocs(collection(db, "groceryProducts"));
        if (cancelled) return;
        console.log(
          "Trace: GroceryProducts snapshot received, size:",
          snapshot.size,
        );
        const list: GroceryProduct[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as GroceryProduct);
        });
        // Merge owner catalogue in so new products (e.g. medicines) show
        // immediately even if Firestore still holds the older list.
        // Tombstones: an owner product the admin deleted must NOT
        // resurrect here or in the seed below — filter it out first.
        const delta = await getCatalogDelta();
        const tombstones = new Set(
          Object.values(delta?.changes || {})
            .filter((e) => e && e.c === "groceryProducts" && e.a === "delete")
            .map((e) => e.id),
        );
        const liveOwnerProducts = OWNER_GROCERY_PRODUCTS.filter(
          (p) => !tombstones.has(p.id),
        );
        const displayList = mergeOwnerFirst(liveOwnerProducts, list);
        setGroceryProducts(displayList);
        setCachedData("dadu_cached_grocery_products", displayList);
        writeCatalogCache("groceryProducts", displayList);
        setIsLoadingGrocery(false);
        preloadImages(displayList.slice(0, 20).map((p) => p.imageUrl));
        // Seed the 297 owner grocery items once if any are missing from Firestore.
        if (!grocerySeedAttemptedRef.current) {
          grocerySeedAttemptedRef.current = true;
          const existingIds = new Set(list.map((p) => p.id));
          const missing = liveOwnerProducts.filter(
            (p) => !existingIds.has(p.id),
          );
          if (missing.length > 0) {
            const batch = writeBatch(db);
            missing.forEach((p) =>
              batch.set(doc(db, "groceryProducts", p.id), { ...p }),
            );
            batch
              .commit()
              .catch((e) =>
                console.warn("Grocery products seed failed:", e),
              );
          }
        }
      } catch (err) {
        if (cancelled) return;
        console.warn("Grocery products notice:", handleFirestoreError(err));
        // Offline fallback: merge the built-in catalogue in so new products
        // (e.g. medicines) still show when Firestore can't be read (quota).
        // Tombstones still apply when the delta doc is readable.
        const delta = await getCatalogDelta();
        const tombstones = new Set(
          Object.values(delta?.changes || {})
            .filter((e) => e && e.c === "groceryProducts" && e.a === "delete")
            .map((e) => e.id),
        );
        const liveOwnerProducts = OWNER_GROCERY_PRODUCTS.filter(
          (p) => !tombstones.has(p.id),
        );
        setGroceryProducts((prev) => {
          const fallback = mergeOwnerFirst(liveOwnerProducts, prev);
          setCachedData("dadu_cached_grocery_products", fallback);
          return fallback;
        });
        setIsLoadingGrocery(false);
      }
    };
    fetchGroceryProducts();
    const handleVisibility = () => {
      if (!document.hidden) fetchGroceryProducts();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [catalogRefreshTick, activeModule]);

  // 3c. Fetch-once Grocery Delivery Config Loading (refetch on tab visible)
  useEffect(() => {
    let cancelled = false;
    const fetchGroceryDeliveryConfig = async () => {
      // Settings cache (1h TTL) — see fetchDeliverySettings.
      const cached =
        readSettingsCache<GroceryDeliveryConfig>("groceryDeliveryConfig");
      if (cached) {
        if (!cancelled) setGroceryDeliveryConfig(cached);
        return;
      }
      try {
        const docSnap = await getDoc(doc(db, "settings", "groceryDeliveryConfig"));
        if (cancelled) return;
        if (docSnap.exists()) {
          const data = docSnap.data() as GroceryDeliveryConfig;
          setGroceryDeliveryConfig(data);
          writeSettingsCache("groceryDeliveryConfig", data);
        } else {
          // Seed default
          setDoc(doc(db, "settings", "groceryDeliveryConfig"), {
            baseDeliveryFee: 100,
            freeDeliveryAboveAmount: 1000,
            allowMixedCart: true,
          }).catch(console.warn);
        }
      } catch (err) {
        if (cancelled) return;
        console.warn("Grocery delivery config notice:", handleFirestoreError(err));
      }
    };
    fetchGroceryDeliveryConfig();
    const handleVisibility = () => {
      if (!document.hidden) fetchGroceryDeliveryConfig();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [catalogRefreshTick]);

  // 3d. Fetch-once Deal of the Hour Config Loading (refetch on tab visible)
  useEffect(() => {
    let cancelled = false;
    const fetchDealConfig = async () => {
      // Settings cache (1h TTL) — see fetchDeliverySettings. The cached
      // value is the raw doc data; the same transform below applies to it.
      const applyDealData = (data: Record<string, unknown>) => {
        const minutes = Number(data.timerMinutes) || 0;
        setDealConfig({
          isActive: data.isActive !== false,
          timerMinutes: minutes,
          discountPercentage: (data.discountPercentage as number) || 25,
          selectedItemIds: (data.selectedItemIds as string[]) || [],
          dealText: (data.dealText as string) || "",
        });
        setDealTimeLeft({ minutes, seconds: 0 });
      };
      const cached = readSettingsCache<Record<string, unknown>>("deal_config");
      if (cached) {
        if (!cancelled) applyDealData(cached);
        return;
      }
      try {
        const docSnap = await getDoc(doc(db, "settings", "deal_config"));
        if (cancelled) return;
        if (docSnap.exists()) {
          const data = docSnap.data();
          writeSettingsCache("deal_config", data);
          applyDealData(data);
        } else {
          // Seed default
          const defaultDeal = {
            isActive: true,
            timerMinutes: 30,
            discountPercentage: 25,
            selectedItemIds: ["dish_6", "dish_7"],
            dealText: "Save 25% on Only Tea & Fresh Platters! Hurry!",
          };
          setDoc(doc(db, "settings", "deal_config"), defaultDeal).catch(
            console.error,
          );
          setDealTimeLeft({ minutes: 30, seconds: 0 });
        }
      } catch (err) {
        if (cancelled) return;
        console.warn(
          "Deal config subscription error:",
          handleFirestoreError(err),
        );
      }
    };
    fetchDealConfig();
    const handleVisibility = () => {
      if (!document.hidden) fetchDealConfig();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [catalogRefreshTick]);

  // 3v. Fetch-once Vouchers Loading (refetch on tab visible)
  useEffect(() => {
    let cancelled = false;
    const fetchVouchers = async () => {
      // 24h TTL cache + granular delta (see fetchMenu): patch only the
      // vouchers the admin changed since this cache was saved.
      // Safe: checkout validates the chosen voucher with a live per-voucher
      // getDoc, so a stale list can never redeem an expired voucher.
      const freshEntry = readFreshCatalogEntry<Voucher[]>("vouchers");
      if (freshEntry) {
        const patched = await applyCatalogDelta<Voucher>(
          "vouchers",
          freshEntry.data,
          freshEntry.savedAt,
        );
        if (cancelled) return;
        if (patched.mode === "cache") return;
        if (patched.mode === "patched") {
          setVouchers(patched.list);
          writeCatalogCache("vouchers", patched.list, patched.readAt);
          return;
        }
        // mode "full" — fall through to the full fetch below.
      }
      try {
        const snapshot = await getDocs(collection(db, "vouchers"));
        if (cancelled) return;
        const list: Voucher[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Voucher);
        });
        setVouchers(list);
        writeCatalogCache("vouchers", list);
      } catch (err) {
        if (cancelled) return;
        console.warn("Vouchers subscription notice:", handleFirestoreError(err));
      }
    };
    fetchVouchers();
    const handleVisibility = () => {
      if (!document.hidden) fetchVouchers();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [catalogRefreshTick]);

  // 3f. Load UI config (fetch-once + refetch on tab visible)
  useEffect(() => {
    let cancelled = false;
    const fetchUiConfig = async () => {
      // Settings cache (1h TTL) — see fetchDeliverySettings.
      const applyUiData = (data: Record<string, unknown>) => {
        if (data.heroBgUrl) {
          setHeroBgUrl(data.heroBgUrl as string);
        }
        if (data.partnerShopsBgUrl !== undefined) {
          setPartnerShopsBgUrl(data.partnerShopsBgUrl as string);
        }
      };
      const cached = readSettingsCache<Record<string, unknown>>("ui_config");
      if (cached) {
        if (!cancelled) applyUiData(cached);
        return;
      }
      try {
        const docSnap = await getDoc(doc(db, "settings", "ui_config"));
        if (cancelled) return;
        if (docSnap.exists()) {
          const data = docSnap.data();
          writeSettingsCache("ui_config", data);
          applyUiData(data);
        }
      } catch (err) {
        if (cancelled) return;
        console.warn("Error loading ui_config:", err);
      }
    };
    fetchUiConfig();
    const handleVisibility = () => {
      if (!document.hidden) fetchUiConfig();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [catalogRefreshTick]);

  // 3e. Load SEO config from Admin panel and pass into unified SEO manager (fetch-once + refetch on tab visible)
  useEffect(() => {
    let cancelled = false;
    const fetchSeoConfig = async () => {
      // Settings cache (1h TTL) — see fetchDeliverySettings.
      const applySeoData = (data: Record<string, unknown>) => {
        setAdminSeoOverride({
          siteTitle: (data.title as string) || undefined,
          siteDescription: (data.description as string) || undefined,
        });
        if (data.keywords) {
          let keywordsMeta = document.querySelector('meta[name="keywords"]');
          if (!keywordsMeta) {
            keywordsMeta = document.createElement("meta");
            keywordsMeta.setAttribute("name", "keywords");
            document.head.appendChild(keywordsMeta);
          }
          keywordsMeta.setAttribute("content", data.keywords as string);
        }
      };
      const cached = readSettingsCache<Record<string, unknown>>("seo_config");
      if (cached) {
        if (!cancelled) applySeoData(cached);
        return;
      }
      try {
        const docSnap = await getDoc(doc(db, "settings", "seo_config"));
        if (cancelled) return;
        if (docSnap.exists()) {
          const data = docSnap.data();
          writeSettingsCache("seo_config", data);
          applySeoData(data);
        }
      } catch (err) {
        if (cancelled) return;
        console.warn(
          "SEO config subscription error:",
          handleFirestoreError(err),
        );
      }
    };
    fetchSeoConfig();
    const handleVisibility = () => {
      if (!document.hidden) fetchSeoConfig();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [catalogRefreshTick]);
  // 3f. Load Munchi voice config from Admin panel (settings/voice_config →
  // pauseMs). The admin changes the pace from inside the app — no code
  // change or rebuild needed (user 28 Nov 10:33: "bar bar app ya site
  // changes na kro, uske under se hi setting kro"). Cache-first (1h TTL).
  useEffect(() => {
    let cancelled = false;
    const fetchVoiceConfig = async () => {
      const applyVoiceData = (data: Record<string, unknown>) => {
        const ms = Number(data.pauseMs);
        if (Number.isFinite(ms) && ms >= 0 && ms <= 5000) {
          setVoicePauseMs(Math.round(ms));
        }
      };
      const cached = readSettingsCache<Record<string, unknown>>("voice_config");
      if (cached) {
        if (!cancelled) applyVoiceData(cached);
        return;
      }
      try {
        const docSnap = await getDoc(doc(db, "settings", "voice_config"));
        if (cancelled) return;
        if (docSnap.exists()) {
          const data = docSnap.data();
          writeSettingsCache("voice_config", data);
          applyVoiceData(data);
        }
      } catch (err) {
        if (cancelled) return;
        console.warn("Error loading voice_config:", err);
      }
    };
    fetchVoiceConfig();
    const handleVisibility = () => {
      if (!document.hidden) fetchVoiceConfig();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [catalogRefreshTick]);
  // Admin "Refresh All Users" signal — one tiny doc listener. When the admin presses
  // Refresh in the admin panel, this fires and re-runs the fetch-once effects above
  // (via catalogRefreshTick), so every open user page reloads the latest menu/prices.
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "settings", "refresh_signal"),
      (docSnap) => {
        if (!docSnap.exists()) return;
        const ts = Number(docSnap.data()?.updatedAt || 0);
        if (!refreshSignalInitRef.current) {
          refreshSignalInitRef.current = true;
          lastRefreshSignalRef.current = ts;
          return;
        }
        if (ts && ts !== lastRefreshSignalRef.current) {
          lastRefreshSignalRef.current = ts;
          // Admin pressed "Refresh All Users": drop the TTL catalogue cache
          // FIRST so the fetch effects below re-read from Firestore instead
          // of serving the still-fresh cache (otherwise the admin's price /
          // product edits would not reach users until the TTL expired).
          invalidateCatalogCache();
          // Same for the 1h settings cache — an admin edit pushed with
          // Refresh must reach users at once, not after the TTL.
          clearSettingsCache();
          setCatalogRefreshTick((t) => t + 1);
          setToastNotification({
            title: "Updated!",
            message: "Menu aur prices refresh ho gaye.",
          });
        }
      },
      (err) => {
        console.warn("Refresh signal notice:", handleFirestoreError(err));
      },
    );
    return () => unsubscribe();
  }, []);

  // 3f. Load favorites from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("dadu_favorite_dishes");
    if (saved) {
      try {
        setFavoriteDishIds(JSON.parse(saved));
      } catch (e) {
        console.warn("Failed to load favorites", e);
      }
    }

    // Initialize root history state to enable back button intercepting
    if (!window.history.state || !window.history.state.appRoot) {
      window.history.pushState({ appRoot: true }, "");
    }
  }, []);

  // 3f. Save favorites to LocalStorage whenever they change
  useEffect(() => {
    localStorage.setItem(
      "dadu_favorite_dishes",
      JSON.stringify(favoriteDishIds),
    );
  }, [favoriteDishIds]);

  const toggleFavorite = (dishId: string) => {
    setFavoriteDishIds((prev) => {
      const isFav = prev.includes(dishId);
      if (isFav) {
        return prev.filter((id) => id !== dishId);
      } else {
        return [...prev, dishId];
      }
    });
  };

  // 3d. Grocery cart LocalStorage Sync
  useEffect(() => {
    const saved = localStorage.getItem("dadu_grocery_cart");
    if (saved) {
      try {
        setGroceryCartItems(JSON.parse(saved));
      } catch (e) {
        console.warn("Parsing grocery cart failed:", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("dadu_grocery_cart", JSON.stringify(groceryCartItems));
  }, [groceryCartItems]);

  // 4. Real-time Orders & Notification Listeners
  useEffect(() => {
    if (!currentUser) {
      setOrders([]);
      setNotifications([]);
      setOrdersLoaded(false);
      return;
    }

    // Trigger orders snapshots depending on role authorizations
    let ordersQuery;
    if (currentUser.role === "admin") {
      ordersQuery = collection(db, "orders");
    } else {
      ordersQuery = query(
        collection(db, "orders"),
        where("userId", "==", currentUser.uid),
      );
    }

    console.log("Trace: Initializing Orders collection listener...");
    const unsubscribeOrders = onSnapshot(
      ordersQuery,
      (snapshot) => {
        console.log("Trace: Orders snapshot received, size:", snapshot.size);
        const list: Order[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Order);
        });
        // Sort newest order first
        list.sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
        );
        setOrders(list);
        setOrdersLoaded(true);

        // Save the user's data ON THE PHONE (localStorage) so Munchi reads
        // it from the device instead of asking the server again and again
        // (user 28 Nov 03:27). This also saves Firestore reads.
        try {
          saveUserOrders(
            list.map((o) => ({
              id: o.id,
              items: (o.items || []).map((it: { name?: string; quantity?: number; qty?: number }) => ({
                name: it.name || "",
                qty: it.quantity ?? it.qty ?? 1,
              })),
              total: o.grandTotal || o.totalPrice || 0,
              status: o.status || "",
              placedAtMs: (o.createdAt?.seconds || 0) * 1000,
              payment: (o as { paymentMethod?: string }).paymentMethod || "COD",
              speed: (o as { speed?: string }).speed || "standard",
            })),
          );
          if (currentUser) {
            const counts = new Map<string, number>();
            let spent = 0;
            for (const o of list) {
              spent += o.grandTotal || o.totalPrice || 0;
              for (const it of o.items || []) {
                const n = (it as { name?: string }).name || "";
                if (n) counts.set(n, (counts.get(n) || 0) + 1);
              }
            }
            const favs = [...counts.entries()]
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([n]) => n);
            saveUserProfile({
              name: currentUser.name,
              phone: currentUser.phone,
              totalOrders: list.length,
              totalSpent: spent,
              favourites: favs,
              isNew: list.length === 0,
            });
          }
        } catch {
          // Local cache is best-effort; Munchi falls back to props.
        }

        // Detect live status transitions for buyer orders and play status chime!
        if (currentUser.role !== "admin") {
          const prevMap = prevOrderStatusesRef.current;
          const hadInitialSnapshot = Object.keys(prevMap).length > 0;

          if (hadInitialSnapshot) {
            for (const o of list) {
              const oldStatus = prevMap[o.id];
              if (oldStatus && oldStatus !== o.status) {
                const statusToastMap: Record<string, { title: string; message: string }> = {
                  accepted: {
                    title: "Order Accept Ho Gaya!",
                    message: `Aapka order #${o.id.substring(0, 5)} confirm ho gaya hai.`,
                  },
                  confirmed: {
                    title: "Order Confirm Ho Gaya!",
                    message: `Restaurant ne aapka order #${o.id.substring(0, 5)} accept kar liya hai.`,
                  },
                  preparing: {
                    title: "Khana Tayar Ho Raha Hai!",
                    message: `Chef aapka order #${o.id.substring(0, 5)} fresh tayar kar raha hai.`,
                  },
                  out_for_delivery: {
                    title: "Rider Raste Me Hai!",
                    message: `${o.riderName ? `${o.riderName} aapka` : "Rider aapka"} order #${o.id.substring(0, 5)} le kar nikal chuka hai!`,
                  },
                  delivered: {
                    title: "Order Deliver Ho Gaya!",
                    message: `Order #${o.id.substring(0, 5)} pohanch chuka hai. Enjoy your meal!`,
                  },
                  completed: {
                    title: "Order Mukammal Ho Gaya!",
                    message: `Order #${o.id.substring(0, 5)} complete ho gaya hai. Shukriya!`,
                  },
                };

                const info = statusToastMap[o.status];
                if (info) {
                  // Longer read time for a status change; the toast effect owns the timer.
                  setToastNotification({ ...info, durationMs: 5500 });
                  playChimeSound();
                  break;
                }
              }
            }
          }

          const nextMap: Record<string, string> = {};
          for (const o of list) {
            nextMap[o.id] = o.status;
          }
          prevOrderStatusesRef.current = nextMap;
        }

        // If buyer has active orders, update our live tracker automatically!
        if (currentUser.role !== "admin" && list.length > 0) {
          // Find latest non-completed order to show
          const latestActive = list.find(
            (o) =>
              o.status !== "delivered" &&
              o.status !== "completed" &&
              o.status !== "cancelled",
          );
          if (latestActive) {
            setActiveTrackingOrder(latestActive);
          } else if (!activeTrackingOrder && list[0]) {
            // If no active, set the absolute latest to tracking list
            setActiveTrackingOrder(list[0]);
          }
        }
      },
      (err) => {
        console.warn("Orders live listening error:", handleFirestoreError(err));
      },
    );

    // Notify listeners mapping
    const notifsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", currentUser.uid),
    );

    console.log("Trace: Initializing Notifications collection listener...");
    const unsubscribeNotif = onSnapshot(
      notifsQuery,
      (snapshot) => {
        console.log(
          "Trace: Notifications snapshot received, size:",
          snapshot.size,
        );
        const list: AppNotification[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as AppNotification);
        });

        // Sort newest alert first
        list.sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
        );

        // If there's a new unread notification, trigger sliding banner & audio chime!
        const currentUnread = list.filter((n) => !n.read);
        const oldUnreadCount = prevUnreadCountRef.current;

        if (currentUnread.length > oldUnreadCount && currentUnread[0]) {
          setToastNotification({
            title: currentUnread[0].title,
            message: currentUnread[0].message,
            durationMs: 5000,
          });
          playChimeSound(); // Synthesis alarm beeper
        }

        prevUnreadCountRef.current = currentUnread.length;
        setNotifications(list);
      },
      (err) => {
        console.warn(
          "Notifications live listening error:",
          handleFirestoreError(err),
        );
      },
    );

    return () => {
      unsubscribeOrders();
      unsubscribeNotif();
    };
  }, [currentUser]);

  // Handle Log Outs (warn before wiping active cart)
  const performLogout = async (clearCart: boolean) => {
    try {
      await signOut(auth).catch(() => {});
    } catch {}
    localStorage.removeItem("dadu_user_phone");
    localStorage.removeItem("dadu_cached_user");
    window.dispatchEvent(new StorageEvent("storage", { key: "dadu_user_phone" }));
    setCurrentUser(null);
    if (clearCart) {
      setCartItems([]);
      setGroceryCartItems([]);
    }
    setActiveTrackingOrder(null);
    setIsAdminConsoleOpen(false);
    setIsSignOutConfirmOpen(false);
  };

  const handleLogout = async () => {
    if (cartItems.length > 0 || groceryCartItems.length > 0) {
      setIsSignOutConfirmOpen(true);
      return;
    }
    await performLogout(false);
  };

  // Helper to determine current screen key for routing history stack
  const getCurrentScreenKey = (): string => {
    // Priority 1: Active Modals & Drawers
    if (showGoodbye) return "goodbye";
    if (isExitConfirmationOpen) return "exit_confirm";
    if (activeDetailDish) return `item_detail:${activeDetailDish.id}`;
    if (isDirectChatOpen) return "chat_modal";
    if (isTrackingModalOpen) return "tracking_modal";
    if (isSuccessAnimationOpen) return "success_modal";
    if (isCartOpen) return "cart_drawer";
    if (isGroceryCartOpen) return "grocery_cart";
    if (isHistoryDrawerOpen) return "history_drawer";
    if (isMobileAccountOpen) return "account_drawer";
    if (isAuthOpen) return "auth_modal";
    if (isVerificationModalOpen) return "verification_modal";
    if (isAdminConsoleOpen) return "admin_console";
    if (showLocationPrompt) return "location_modal";
    if (showAnnouncementPopup) return "announcement_modal";

    // Priority 2: Pages & Sub-views
    if (selectedRestaurant !== "All Restaurants") return `restaurant_page:${selectedRestaurant}`;
    if (activeCategory !== "All") return `category_page:${activeCategory}`;
    // Grocery sub-view: a category (or the full catalog) open inside the
    // grocery tab — its own history step, so back returns to the grouped
    // grocery list instead of the homepage.
    if (activeModule === "grocery" && (groceryCategoryId !== "All" || groceryShowAllCatalog)) {
      return `grocery_category:${groceryCategoryId}`;
    }
    if (searchQuery !== "") return `search_page:${searchQuery}`;

    // Priority 3: Sub-tabs / Modules
    if (activeModule !== "food") return `tab_${activeModule}`;

    // Root / Default Home
    return "home";
  };

  // Native Android back button (Capacitor APK) — the hardware back button
  // used to close the whole app even with a product/cart/modal open, because
  // the WebView had no history entry to go back to. Route it through the
  // same history/popstate system as the browser back button: if there is
  // history, go back (the popstate handler closes the topmost modal/drawer
  // first); at the very root, show the exit confirmation instead of closing
  // straight away. The confirmation's "Exit App" button calls
  // CapacitorApp.exitApp() to actually close the app. (User 28 Nov:
  // "back button dabao app band ho jati hai" — fixed.)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let listener: { remove: () => Promise<void> } | null = null;
    CapacitorApp.addListener("backButton", () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        // No history to go back to (fresh load) — show the exit
        // confirmation and push a trap state, so the next back press
        // closes the confirmation instead of killing the app.
        setIsExitConfirmationOpen(true);
        window.history.pushState({ page: "exit_confirm" }, "");
        lastPushedScreenRef.current = "exit_confirm";
      }
    }).then((handle) => {
      listener = handle;
    });
    return () => {
      if (listener) void listener.remove();
    };
  }, []);

  // Disable pinch-zoom (two-finger zoom) — iOS Safari ignores the viewport
  // meta in some cases, so block the gesture event directly. (User 28 Nov:
  // "site me 2 finger zoom hoti hai" — fixed.)
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", prevent);
    document.addEventListener("gesturechange", prevent);
    document.addEventListener("gestureend", prevent);
    return () => {
      document.removeEventListener("gesturestart", prevent);
      document.removeEventListener("gesturechange", prevent);
      document.removeEventListener("gestureend", prevent);
    };
  }, []);

  // Mobile Back Button Navigation Controller (PWA back button handler with custom Exit Confirmation interceptor)
  useEffect(() => {
    const currentScreen = getCurrentScreenKey();

    // Push state when navigating to any inner screen/modal/sub-tab
    if (currentScreen !== "home") {
      if (currentScreen !== lastPushedScreenRef.current) {
        window.history.pushState({ page: currentScreen }, "");
        lastPushedScreenRef.current = currentScreen;
      }
    } else {
      if (lastPushedScreenRef.current !== "home") {
        lastPushedScreenRef.current = "home";
      }
    }

    const handlePopState = (event: PopStateEvent) => {
      if (isExitingRef.current) {
        return;
      }

      // Priority 1: If any active Modal or Cart Drawer is open, CLOSE the modal/drawer first
      if (showGoodbye) {
        setShowGoodbye(false);
        return;
      }
      if (isExitConfirmationOpen) {
        setIsExitConfirmationOpen(false);
        return;
      }
      if (!!activeDetailDish) {
        setActiveDetailDish(null);
        return;
      }
      if (isDirectChatOpen) {
        setIsDirectChatOpen(false);
        return;
      }
      if (isTrackingModalOpen) {
        setIsTrackingModalOpen(false);
        return;
      }
      if (isSuccessAnimationOpen) {
        setIsSuccessAnimationOpen(false);
        return;
      }
      if (isCartOpen) {
        setIsCartOpen(false);
        return;
      }
      if (isGroceryCartOpen) {
        setIsGroceryCartOpen(false);
        return;
      }
      if (isHistoryDrawerOpen) {
        setIsHistoryDrawerOpen(false);
        return;
      }
      if (isMobileAccountOpen) {
        setIsMobileAccountOpen(false);
        return;
      }
      if (isAuthOpen) {
        setIsAuthOpen(false);
        return;
      }
      if (isVerificationModalOpen) {
        setIsVerificationModalOpen(false);
        return;
      }
      if (isAdminConsoleOpen) {
        setIsAdminConsoleOpen(false);
        return;
      }
      if (showLocationPrompt) {
        setShowLocationPrompt(false);
        return;
      }
      if (showAnnouncementPopup) {
        setShowAnnouncementPopup(false);
        return;
      }

      // Priority 2: If inside an Info Page, Restaurant, Category, or Search query, navigate back to Homepage
      if (activeInfoPage) {
        setActiveInfoPage(null);
        return;
      }
      if (selectedRestaurant !== "All Restaurants") {
        setSelectedRestaurant("All Restaurants");
        return;
      }
      if (activeCategory !== "All") {
        setActiveCategory("All");
        return;
      }
      // Grocery sub-view: a category (or the full catalog) is open inside
      // the grocery tab — back returns to the grouped grocery list, not home.
      if (activeModule === "grocery" && (groceryCategoryId !== "All" || groceryShowAllCatalog)) {
        setGroceryCategoryId("All");
        setGroceryShowAllCatalog(false);
        return;
      }
      if (searchQuery !== "") {
        setSearchQuery("");
        return;
      }

      // Directory pages (/restaurants, /hotels): back goes to the homepage.
      if (activeRoute === "restaurants" || activeRoute === "hotels") {
        handleGoToFoodHome();
        return;
      }

      // Priority 3: If on a sub-tab (e.g. Grocery), return to default Home tab
      if (activeModule !== "food") {
        setActiveModule("food");
        return;
      }

      // Priority 4: Default Home root -> Trigger exit confirmation dialogue & push state to trap next back click
      setIsExitConfirmationOpen(true);
      window.history.pushState({ page: "exit_confirm" }, "");
      lastPushedScreenRef.current = "exit_confirm";
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [
    isAuthOpen,
    isVerificationModalOpen,
    isCartOpen,
    isGroceryCartOpen,
    activeDetailDish,
    isTrackingModalOpen,
    isDirectChatOpen,
    isSuccessAnimationOpen,
    isHistoryDrawerOpen,
    isAdminConsoleOpen,
    isMobileAccountOpen,
    showLocationPrompt,
    showAnnouncementPopup,
    isExitConfirmationOpen,
    selectedRestaurant,
    activeCategory,
    groceryCategoryId,
    groceryShowAllCatalog,
    searchQuery,
    activeModule,
    activeRoute,
    activeInfoPage,
  ]);

  // --- CART CONTROLLER OPERATIONS ---
  const handleAddToCart = useCallback((
    dish: Dish,
    quantityToAdd: number = 1,
    options?: {
      size?: string;
      flavor?: string;
      addOns?: { name: string; price: number }[];
      specialInstructions?: string;
    },
    // Set by the mixed-cart confirm modal so the re-run after clearing the
    // other basket does not ask again (audit 28 Nov #8).
    skipMixedCartCheck: boolean = false,
  ) => {
    if (currentUser?.status === 'locked') {
      setIsVerificationModalOpen(true);
      return;
    }

    // Check if mixed cart is allowed
    if (!skipMixedCartCheck && !groceryDeliveryConfig?.allowMixedCart && groceryCartItems.length > 0) {
      // Styled in-app confirm (audit 28 Nov #8) — the raw system popup
      // ("DISALLOW MIXED BASKET!") looked like a developer error in the APK.
      setMixedCartConfirm({
        title: "Grocery basket clear karein?",
        message:
          "Aapki basket mein grocery items hain. Food aur grocery ki alag delivery hoti hai. Grocery basket clear karke food order karein?",
        confirmLabel: "Clear karke food order karein",
        onConfirm: () => {
          setGroceryCartItems([]);
          handleAddToCart(dish, quantityToAdd, options, true);
        },
      });
      return;
    }

    // Limit cart constraint: Max 2 different restaurants per order
    let itemRestaurant = dish.restaurantName || "Dadu Fast Food & Kitchen";
    const isDrink =
      dish.id.startsWith("drink_") ||
      dish.category === "Drinks" ||
      (dish.category as string) === "Beverages";

    if (isDrink && cartItems.length > 0) {
      itemRestaurant =
        cartItems[0].restaurantName || "Dadu Fast Food & Kitchen";
    }

    const currentRestaurants = Array.from(
      new Set(cartItems.map((item) => item.restaurantName).filter(Boolean)),
    );

    // If options are provided, append them to the cart item's ID so they don't get merged with different variants of the same dish.
    const addOnsKey = options?.addOns?.map((a) => a.name).join("-") || "";
    const cartItemId =
      options?.size ||
      options?.flavor ||
      addOnsKey ||
      options?.specialInstructions
        ? `${dish.id}-${options.size || ""}-${options.flavor || ""}-${addOnsKey}-${options.specialInstructions || ""}`
        : dish.id;
    let variantName = dish.name;
    if (options?.size || options?.flavor) {
      const parts = [];
      if (options.size) parts.push(options.size);
      if (options.flavor) parts.push(options.flavor);
      variantName = `${dish.name} (${parts.join(", ")})`;
    }

    const isAlreadyInCart = cartItems.some(
      (item) => item.dishId === cartItemId,
    );

    if (
      !isAlreadyInCart &&
      !currentRestaurants.includes(itemRestaurant) &&
      currentRestaurants.length >= 2
    ) {
      // Friendly in-app toast instead of the raw system alert (audit 28 Nov #8).
      setToastNotification({
        title: "Sirf 2 restaurants",
        message: "Ek order mein zyada se zyada 2 restaurants se order kar sakte hain.",
      });
      return;
    }

    setCartItems((prev) => {
      const existing = prev.find((item) => item.dishId === cartItemId);
      if (existing) {
        // Dropping to 0 (or below) REMOVES the item — otherwise a ghost
        // 0-quantity row stays in the cart (audit 28 Nov #6).
        const newQty = existing.quantity + quantityToAdd;
        if (newQty <= 0) {
          return prev.filter((item) => item.dishId !== cartItemId);
        }
        return prev.map((item) =>
          item.dishId === cartItemId
            ? { ...item, quantity: newQty }
            : item,
        );
      }

      const basePrice =
        dish.discountPrice && dish.discountPrice < dish.price
          ? dish.discountPrice
          : dish.price;

      let finalPrice = basePrice;
      if (options?.size) {
        const sizeObj = dish.sizes?.find((s) => s.name === options.size);
        if (sizeObj) {
          finalPrice = sizeObj.price;
        }
      }

      if (options?.flavor) {
        const flavorObj = dish.flavors?.find((f) => f.name === options.flavor);
        if (flavorObj) {
          finalPrice += flavorObj.price;
        }
      }

      if (options?.addOns) {
        finalPrice += options.addOns.reduce(
          (sum, addOn) => sum + addOn.price,
          0,
        );
      }

      // Cart thumbnail (Foodpanda-style): prefer the selected variant's own
      // photo, else the dish photo — so the cart shows a dish image like the
      // grocery basket does.
      const sizeObj = options?.size
        ? dish.sizes?.find((s) => s.name === options.size)
        : undefined;
      const flavorObj = options?.flavor
        ? dish.flavors?.find((f) => f.name === options.flavor)
        : undefined;
      const itemImageUrl =
        flavorObj?.imageUrl || sizeObj?.imageUrl || dish.imageUrl;

      return [
        ...prev,
        {
          dishId: cartItemId,
          baseDishId: dish.id,
          name: variantName,
          price: finalPrice,
          quantity: quantityToAdd,
          type: dish.type,
          imageUrl: itemImageUrl,
          serviceDuration: dish.serviceDuration,
          restaurantName: itemRestaurant,
          commission: dish.commission || 0,
          selectedSize: options?.size,
          selectedFlavor: options?.flavor,
          selectedAddOns: options?.addOns,
          specialInstructions: options?.specialInstructions,
        },
      ];
    });
  }, [currentUser, groceryDeliveryConfig, groceryCartItems.length, cartItems]);

  const handleAddExclusiveDrink = (drink: any) => {
    const firstRestName =
      cartItems[0]?.restaurantName || "Dadu Fast Food & Kitchen";
    const dishObj = {
      id: drink.id,
      name: drink.name,
      price: drink.price,
      description: drink.description,
      imageUrl: drink.imageUrl,
      category: "Drinks" as const,
      isAvailable: true,
      type: "food" as const,
      restaurantName: firstRestName,
    };
    handleAddToCart(dishObj);
  };

  const handleAddToGroceryCart = (product: GroceryProduct, quantity = 1, skipMixedCartCheck: boolean = false) => {
    if (currentUser?.status === 'locked') {
      setIsVerificationModalOpen(true);
      return;
    }

    // Check if mixed cart is allowed
    if (!skipMixedCartCheck && !groceryDeliveryConfig?.allowMixedCart && cartItems.length > 0) {
      // Styled in-app confirm (audit 28 Nov #8) — the raw system popup
      // ("DISALLOW MIXED BASKET!") looked like a developer error in the APK.
      setMixedCartConfirm({
        title: "Food cart clear karein?",
        message:
          "Aapke cart mein food items hain. Food aur grocery ki alag delivery hoti hai. Food cart clear karke grocery khareedein?",
        confirmLabel: "Clear karke grocery khareedein",
        onConfirm: () => {
          setCartItems([]);
          handleAddToGroceryCart(product, quantity, true);
        },
      });
      return;
    }

    setGroceryCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.productId === product.id,
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += quantity;
        return updated;
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            imageUrl: product.imageUrl,
            price: product.price,
            discountPrice: product.discountPrice,
            unit: product.unit,
            stock: product.stock,
            quantity: quantity,
            commission: product.commission || 0,
            categoryId: product.categoryId,
          },
        ];
      }
    });

    setToastNotification({
      title: "Grocery Basket Updated!",
      message: `${product.name} successfully packed into your cart.`,
    });
  };

  const handleUpdateGroceryCartQuantity = (
    productId: string,
    quantity: number,
  ) => {
    if (quantity <= 0) {
      handleRemoveFromGroceryCart(productId);
      return;
    }
    setGroceryCartItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity } : item,
      ),
    );
  };

  const handleRemoveFromGroceryCart = (productId: string) => {
    setGroceryCartItems((prev) =>
      prev.filter((item) => item.productId !== productId),
    );
  };

  const handleReorder = (order: Order, skipMixedCartCheck: boolean = false) => {
    if (order.orderType === "grocery") {
      // It's a grocery order
      if (!skipMixedCartCheck && cartItems.length > 0 && !groceryDeliveryConfig?.allowMixedCart) {
        setMixedCartConfirm({
          title: "Food cart clear karein?",
          message:
            "Aapke cart mein food items hain. Food aur grocery ki alag delivery hoti hai. Food cart clear karke grocery order dobara karein?",
          confirmLabel: "Clear karke grocery order karein",
          onConfirm: () => {
            setCartItems([]);
            handleReorder(order, true);
          },
        });
        return;
      }

      // Add each item in order.items to groceryCartItems
      setGroceryCartItems((prev) => {
        const updated = [...prev];
        order.items.forEach((item) => {
          // Find matching groceryProduct in current products to restore properties
          const matchingProduct = groceryProducts.find(
            (p) => p.id === item.dishId,
          );
          const existingIdx = updated.findIndex(
            (gi) => gi.productId === item.dishId,
          );
          if (existingIdx > -1) {
            updated[existingIdx] = {
              ...updated[existingIdx],
              quantity: updated[existingIdx].quantity + item.quantity,
            };
          } else {
            updated.push({
              productId: item.dishId,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              unit: matchingProduct?.unit || "piece",
              imageUrl: matchingProduct?.imageUrl || "",
              category: matchingProduct?.categoryId || "",
            });
          }
        });
        return updated;
      });

      setToastNotification({
        title: "Grocery Items Restored!",
        message:
          "Items from your previous order have been added to your basket.",
        durationMs: 4000,
      });
      setIsGroceryCartOpen(true);
      setActiveModule("grocery");
    } else {
      // It's a food or service order
      if (
        !skipMixedCartCheck &&
        groceryCartItems.length > 0 &&
        !groceryDeliveryConfig?.allowMixedCart
      ) {
        setMixedCartConfirm({
          title: "Grocery basket clear karein?",
          message:
            "Aapki basket mein grocery items hain. Food aur grocery ki alag delivery hoti hai. Grocery basket clear karke food order dobara karein?",
          confirmLabel: "Clear karke food order karein",
          onConfirm: () => {
            setGroceryCartItems([]);
            handleReorder(order, true);
          },
        });
        return;
      }

      setCartItems((prev) => {
        const updated = [...prev];
        order.items.forEach((item) => {
          const existingIdx = updated.findIndex((fi) => fi.dishId === item.dishId);
          if (existingIdx > -1) {
            updated[existingIdx] = {
              ...updated[existingIdx],
              quantity: updated[existingIdx].quantity + item.quantity,
            };
          } else {
            updated.push({
              dishId: item.dishId,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              type: item.type || "food",
              serviceDuration: item.serviceDuration,
              restaurantName: item.restaurantName || "Dadu Food & Service",
            });
          }
        });
        return updated;
      });

      setToastNotification({
        title: "Food Items Restored!",
        message: "Previous dishes have been successfully added to your cart.",
        durationMs: 4000,
      });
      setIsCartOpen(true);
      setActiveModule("food");
    }
  };

  const handlePlaceGroceryOrder = async (details: {
    name: string;
    phone: string;
    location: { area: string; street: string; lat?: number; lng?: number; googleMapsLink?: string };
    items: GroceryOrderItem[];
    totalPrice: number;
    deliveryFee: number;
    grandTotal: number;
    paymentMethod?: "COD" | "Easypaisa";
    paymentReceiptUrl?: string;
    userCoords?: { latitude: number; longitude: number };
    voucher?: { code: string; discountAmount: number };
    coinsUsed?: number;
    riderTip?: number;
    isScheduled?: boolean;
    scheduledTime?: string;
    deliverySpeed?: "standard" | "priority";
    leaveAtDoor?: boolean;
    messageUponArrival?: boolean;
    cutlery?: boolean;
  }) => {
    if (currentUser?.status === 'locked' || currentUser?.status === 'blocked') {
      setToastNotification({ title: "Account Restricted", message: "Verification pending or account blocked. Cannot place order." });
      return;
    }

    // Never write an invalid order: empty cart, bad phone, or no street.
    if (!details.items || details.items.length === 0 || details.totalPrice <= 0) {
      setToastNotification({ title: "Order Failed", message: "Cart khaali hai — pehle items add karein." });
      return;
    }
    if (!/^0?3\d{9}$/.test((details.phone || "").replace(/[\s-]/g, ""))) {
      setToastNotification({ title: "Order Failed", message: "Sahi 11-digit mobile number zaroori hai." });
      return;
    }
    if (!details.location?.street || details.location.street.trim().length < 4) {
      setToastNotification({ title: "Order Failed", message: "Sahi street address zaroori hai." });
      return;
    }

    // The live voucher doc, hoisted so the writer below can recompute
    // the discount from it instead of trusting the client's amount (M21).
    let voucherDoc: Voucher | null = null;
    if (details.voucher) {
      const vRef = doc(db, "vouchers", details.voucher.code);
      const vSnap = await getDoc(vRef);
      if (vSnap.exists()) {
        const vData = vSnap.data();
        if (!vData.isActive || (vData.maxUses > 0 && vData.currentUses >= vData.maxUses)) {
          setToastNotification({ title: "Voucher Unavailable", message: "The applied voucher is no longer valid or reached its usage limit." });
          return;
        }
        voucherDoc = vData as Voucher;
      } else {
        setToastNotification({ title: "Invalid Voucher", message: "Invalid voucher code." });
        return;
      }
    }

    try {
      const generatedOrderId = generateUniqueOrderId("DG");

      // Adapt items array representation
      const adaptedItems = details.items.map((item) => ({
        dishId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        restaurantName: "Dadu Express Mart",
        commission: item.commission || 0,
      }));

      const totalCommission = adaptedItems.reduce(
        (acc, itm) => acc + (itm.commission || 0) * itm.quantity,
        0,
      );

      // Enforce exact total = items + deliveryFee + riderTip - voucher - coins.
      // The voucher discount is recomputed from the live voucher doc —
      // never trust the discount amount the client sent (M21).
      const recomputedDiscount = voucherDoc
        ? calculateVoucherDiscount(voucherDoc, details.totalPrice)
        : 0;
      // First-order FREE delivery (user decision 27 Nov 2026): override any
      // fee the caller computed — a new user's first order ships free.
      const effectiveDeliveryFee = isFirstOrderFreeDelivery ? 0 : details.deliveryFee;
      // Site tax: flat Rs 12 per order — always applies, even when delivery
      // is free. Night surcharge: the cart drawer already adds it into
      // details.deliveryFee when it applies, so it is NOT added to the
      // total again here — only recorded on the order for the admin panel.
      // It is waived with free delivery (subtotal >= free threshold or
      // first order), exactly like the delivery fee itself.
      const groceryNightSurcharge =
        !isFirstOrderFreeDelivery &&
        details.totalPrice < (deliverySettings?.freeDeliveryAboveAmount ?? 1000) &&
        isNightSurchargeTime()
          ? nightSurchargeAmount
          : 0;
      const computedGrandTotal = Math.max(
        0,
        details.totalPrice +
          effectiveDeliveryFee +
          siteTaxAmount +
          (details.riderTip || 0) -
          recomputedDiscount -
          (details.coinsUsed || 0),
      );

      const isEasypaisa = details.paymentMethod === "Easypaisa";

      const orderDoc = {
        id: generatedOrderId,
        userId: currentUser?.uid || "guest",
        name: details.name,
        userName: details.name,
        phone: details.phone,
        userPhone: details.phone,
        address: `${details.location.area}, ${details.location.street}`,
        userAddress: `${details.location.area}, ${details.location.street}`,
        location: details.location,
        items: adaptedItems,
        totalPrice: details.totalPrice,
        deliveryFee: effectiveDeliveryFee,
        siteTax: siteTaxAmount,
        nightSurcharge: groceryNightSurcharge,
        grandTotal: computedGrandTotal,
        paymentMethod: isEasypaisa ? "Easypaisa" : "COD",
        status: isEasypaisa ? "payment_verification_pending" : "pending",
        paymentReceiptUrl: isEasypaisa ? details.paymentReceiptUrl : undefined,
        paymentVerified: isEasypaisa ? false : undefined,
        paymentAccountTitle: isEasypaisa ? "Ghulam Murtaza" : undefined,
        paymentAccountNumber: isEasypaisa ? "03277004471" : undefined,
        orderType: "grocery",
        deviceId: deviceId,
        createdAt: { seconds: Math.floor(Date.now() / 1000) },
        userCoords: details.userCoords || null,
        totalCommission,
        voucher: details.voucher
          ? { code: details.voucher.code, discountAmount: recomputedDiscount }
          : undefined,
        coinsUsed: details.coinsUsed || undefined,
        riderTip: details.riderTip || undefined,
        isScheduled: details.isScheduled || undefined,
        scheduledTime: details.scheduledTime || undefined,
        deliverySpeed: details.deliverySpeed || undefined,
        leaveAtDoor: details.leaveAtDoor || undefined,
        messageUponArrival: details.messageUponArrival || undefined,
        cutlery: details.cutlery || undefined,
      };

      // Atomic order + voucher redemption (27 Nov 2026): the voucher cap
      // re-check, the order write and the voucher increment commit or fail
      // together in one transaction. A voucher that hits its cap between
      // the pre-check above and this write can no longer leave a
      // discounted order behind without the increment, and the per-user
      // limit is re-checked against the FRESH voucher doc, not the stale
      // local list. Firestore requires all reads before writes, so the
      // voucher get comes first, then the order set + voucher update.
      const orderRef = doc(db, "orders", generatedOrderId);
      if (details.voucher) {
        const matchedVoucher = vouchers.find(
          (v) => v.code.toUpperCase() === details.voucher!.code.toUpperCase() || v.id === details.voucher!.code
        );
        const targetDocId = matchedVoucher?.id || details.voucher.code;
        try {
          await runTransaction(db, async (transaction) => {
            const vRef = doc(db, "vouchers", targetDocId);
            const vSnap = await transaction.get(vRef);
            if (!vSnap.exists()) throw new Error("Voucher not found.");
            const vData = vSnap.data();
            const maxUses = vData.maxUses || 0;
            if (!vData.isActive || (maxUses > 0 && (vData.currentUses || 0) >= maxUses)) {
              throw new Error("Voucher limit reached.");
            }
            const uid = currentUser?.uid;
            const voucherUpdate: any = {
              currentUses: increment(1),
            };
            if (uid) {
              const limit = vData.perUserLimit !== undefined && vData.perUserLimit > 0 ? vData.perUserLimit : 1;
              const prevUses = vData.userUsageCount?.[uid] ?? (vData.usedUserIds?.includes(uid) ? 1 : 0);
              if (prevUses >= limit) throw new Error("Per-user voucher limit reached.");
              voucherUpdate.usedUserIds = arrayUnion(uid);
              voucherUpdate[`userUsageCount.${uid}`] = increment(1);
              if (prevUses + 1 >= limit && vData.assignedUserIds?.includes(uid)) {
                voucherUpdate.assignedUserIds = arrayRemove(uid);
              }
            }
            transaction.set(orderRef, cleanObject(orderDoc));
            transaction.update(vRef, voucherUpdate);
          });
        } catch (err) {
          // Voucher-cap failures abort the whole order (nothing was
          // written — the transaction never committed), so the user can
          // retry without the voucher. Any other error (e.g. a transient
          // Firestore failure) rethrows to the handler's outer catch,
          // which shows the generic "Order Failed" toast.
          if (
            err instanceof Error &&
            (err.message === "Voucher not found." ||
              err.message === "Voucher limit reached." ||
              err.message === "Per-user voucher limit reached.")
          ) {
            console.error("Voucher redemption failed, order not placed:", err);
            setToastNotification({ title: "Voucher Unavailable", message: "The applied voucher is no longer valid or reached its usage limit." });
            return;
          }
          throw err;
        }
      } else {
        await setDoc(orderRef, cleanObject(orderDoc));
      }

      // Update profile with new location & name & deduct coins if any
      if (currentUser) {
        let finalCoins = (currentUser.loyaltyCoins || 0);
        if (details.coinsUsed) {
          finalCoins = Math.max(0, finalCoins - details.coinsUsed);
        }

        const profileRef = doc(db, "users", currentUser.uid);
        const prevProfile = await getDoc(profileRef);
        let updatedProfile = { ...currentUser };
        if (prevProfile.exists()) {
          const data = prevProfile.data();
          updatedProfile = {
            ...currentUser,
            ...data,
            name: details.name,
            totalOrders: (data.totalOrders || 0) + 1,
            lastOrder: { seconds: Date.now() / 1000 },
            savedLocation: details.location,
            address: `${details.location.area}, ${details.location.street}`,
            ordersCount: (currentUser.ordersCount || 0) + 1,
            loyaltyCoins: finalCoins,
          };
          await setDoc(profileRef, cleanObject(updatedProfile));
          setCurrentUser(updatedProfile);
        }
      }

      // Update Device Info
      await setDoc(doc(db, "devices", deviceId), {
        lastUserName: details.name,
        lastUserPhone: details.phone,
        lastActive: { seconds: Math.floor(Date.now() / 1000) }
      }, { merge: true }).catch(() => {});

      // Clear grocery basket
      setGroceryCartItems([]);

      // Trigger success animation modal overlay
      setSuccessAnimationOrder(orderDoc as any);
      setIsSuccessAnimationOpen(true);
    } catch (err) {
      console.error(err);
      setToastNotification({
        title: "Order Failed",
        message: "Could not record your grocery order. Please try again.",
      });
    }
  };

  const handleUpdateCartQuantity = (dishId: string, qty: number) => {
    // Exact match first (plain items and cart-drawer rows carry the real id).
    const exact = cartItems.find((item) => item.dishId === dishId);
    if (exact) {
      if (qty <= 0) {
        handleRemoveCartItem(dishId);
        return;
      }
      setCartItems((prev) =>
        prev.map((item) =>
          item.dishId === dishId ? { ...item, quantity: qty } : item,
        ),
      );
      return;
    }
    // Base-id fallback (audit 28 Nov #4): a card stepper shows the SUMMED
    // quantity across a dish's variants (e.g. Small + Large pizza), so a
    // tap on +/- adjusts the biggest variant by the difference. Reaching
    // 0 drops every variant of that dish.
    const variants = cartItems.filter(
      (item) => (item.baseDishId || item.dishId) === dishId,
    );
    if (variants.length === 0) return;
    const currentSum = variants.reduce((s, v) => s + v.quantity, 0);
    if (qty <= 0) {
      setCartItems((prev) =>
        prev.filter((item) => (item.baseDishId || item.dishId) !== dishId),
      );
      return;
    }
    const delta = qty - currentSum;
    if (delta === 0) return;
    const target = [...variants].sort((a, b) => b.quantity - a.quantity)[0];
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.dishId === target.dishId
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const handleRemoveCartItem = (dishId: string) => {
    setCartItems((prev) => prev.filter((item) => item.dishId !== dishId));
  };

  // Submit order to database
  const handlePlaceOrderSubmit = useCallback(async (details: {
    name: string;
    phone: string;
    location: { area: string; street: string; lat?: number; lng?: number; googleMapsLink?: string };
    paymentMethod: "COD" | "Easypaisa" | "Pay on Appointment";
    paymentReceiptUrl?: string;
    orderType: "food" | "service";
    userCoords?: { latitude: number; longitude: number };
    voucher?: { code: string; discountAmount: number };
    coinsUsed?: number;
    riderTip?: number;
    isScheduled?: boolean;
    scheduledTime?: string;
    deliverySpeed?: "standard" | "priority";
    leaveAtDoor?: boolean;
    messageUponArrival?: boolean;
    cutlery?: boolean;
  }) => {
    if (currentUser?.status === 'locked' || currentUser?.status === 'blocked') {
      setIsVerificationModalOpen(true);
      return;
    }
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    // Never write an invalid order: empty cart, or (for food) no street
    // address or bad phone number.
    if (!cartItems || cartItems.length === 0) {
      setToastNotification({ title: "Order Failed", message: "Cart khaali hai — pehle items add karein." });
      return;
    }
    if (details.orderType === "food") {
      if (!details.location?.street || details.location.street.trim().length < 4) {
        setToastNotification({ title: "Order Failed", message: "Sahi street address zaroori hai." });
        return;
      }
      if (!/^0?3\d{9}$/.test((details.phone || "").replace(/[\s-]/g, ""))) {
        setToastNotification({ title: "Order Failed", message: "Sahi 11-digit mobile number zaroori hai." });
        return;
      }
    }

    // The matched live voucher, hoisted so the total below can recompute
    // the discount from it instead of trusting the client's amount (M21).
    let matchedVoucher: Voucher | undefined;
    if (details.voucher) {
      matchedVoucher = vouchers.find(
        (v) => v.code.toUpperCase() === details.voucher!.code.toUpperCase() || v.id === details.voucher!.code
      );
      if (matchedVoucher) {
        if (!matchedVoucher.isActive || (matchedVoucher.maxUses && matchedVoucher.currentUses >= matchedVoucher.maxUses)) {
          setToastNotification({ title: "Voucher Unavailable", message: "The applied voucher is no longer valid or reached its usage limit." });
          return;
        }
      }
    }

    const itemsTotal = cartItems.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0,
    );

    const firstCartItem = cartItems[0];
    const itemRestaurant = firstCartItem?.restaurantName || "Dadu Fast Food & Kitchen";
    const specificStatus = deliverySettings?.restaurantStatuses?.[itemRestaurant];
    const shopProfile = getShopProfile(itemRestaurant, deliverySettings);

    const effectiveMinOrder = shopProfile.minOrder;

    if (
      details.orderType === "food" &&
      effectiveMinOrder > 0 &&
      itemsTotal < effectiveMinOrder
    ) {
      setToastNotification({
        title: "Minimum Order Not Met",
        message: `Minimum order for ${itemRestaurant} is Rs. ${effectiveMinOrder}. Your items total is Rs. ${itemsTotal}.`,
      });
      return;
    }

    // Food base fee comes from delivery_config.foodDeliveryFee (default
    // Rs 70). A per-restaurant deliveryCharge override still wins when set.
    let parsedDeliveryFee = foodDeliveryFee;
    if (specificStatus && specificStatus.deliveryCharge) {
      const match = specificStatus.deliveryCharge.match(/\d+/);
      if (match) {
        parsedDeliveryFee = parseInt(match[0], 10);
      }
    }

    const feeCalc =
      details.orderType === "food"
        ? calculateDeliveryFee(
            itemsTotal,
            parsedDeliveryFee,
            deliverySettings?.freeDeliveryAboveAmount ?? 1000,
            deliverySettings?.doubleFeeBelowAmount ?? 500,
          )
        : { fee: 0, isFree: true, isSmallOrderDoubled: false, reason: "Service booking" };
    // Delivery speed adjustment (admin-controlled, matches CartDrawer display)
    const speedFeeAdjustment =
      details.orderType === "food"
        ? details.deliverySpeed === "priority"
          ? (deliverySettings?.priorityFee ?? 30)
          : 0
        : 0;
    // Night surcharge (27 Nov 2026): +Rs 30 from 9 PM, applied LAST — after
    // the below-Rs-500 doubling and after Priority. Free delivery (subtotal
    // >= Rs 1,000 or first order) waives the WHOLE delivery fee INCLUDING
    // the surcharge, so the surcharge is 0 whenever delivery is free.
    const isDeliveryFree = isFirstOrderFreeDelivery || feeCalc.isFree;
    const nightSurcharge =
      !isDeliveryFree && isNightSurchargeTime() ? nightSurchargeAmount : 0;
    // First-order FREE delivery: a new user's first order ships free,
    // overriding the standard / doubled / priority fee entirely.
    const finalFee =
      (isFirstOrderFreeDelivery
        ? 0
        : Math.max(
            0,
            (isRiderRangeExceeded ? feeCalc.fee * 2 : feeCalc.fee) + speedFeeAdjustment,
          )) + nightSurcharge;
    const riderTip = Math.max(0, Number(details.riderTip || 0));

    // Site tax: flat Rs 12 per order — always applies, even when delivery
    // is free (Subtotal + Delivery Fee + Site Tax = Total).
    let finalGrandTotal = itemsTotal + finalFee + riderTip + siteTaxAmount;
    // Recompute the voucher discount from the live voucher — never trust
    // the discount amount the client sent. If the voucher is not in the
    // local list, fall back to the drawer's live-checked amount.
    let trustedVoucher: { code: string; discountAmount: number } | undefined;
    if (details.voucher) {
      if (matchedVoucher) {
        const recomputed = calculateVoucherDiscount(matchedVoucher, itemsTotal);
        trustedVoucher = { code: details.voucher.code, discountAmount: recomputed };
        finalGrandTotal = Math.max(0, finalGrandTotal - recomputed);
      } else {
        trustedVoucher = details.voucher;
        finalGrandTotal = Math.max(0, finalGrandTotal - details.voucher.discountAmount);
      }
    }
    if (details.coinsUsed) {
      finalGrandTotal = Math.max(0, finalGrandTotal - details.coinsUsed);
    }

    const firstService = cartItems.find((itm) => itm.type === "service");
    const computedServiceTiming =
      details.orderType === "service"
        ? firstService?.serviceDuration || "Expected arrival within 1 hour"
        : undefined;

    const itemsWithCommission = cartItems.map((item) => ({
      ...item,
      commission: item.commission || 0,
    }));

    const totalCommission = itemsWithCommission.reduce(
      (acc, itm) => acc + (itm.commission || 0) * itm.quantity,
      0,
    );

    const isEasypaisa = details.paymentMethod === "Easypaisa";
    const uniqueOrderId = generateUniqueOrderId("DF");
    const orderModel: Order = {
      id: uniqueOrderId,
      userId: currentUser.uid,
      userName: details.name,
      name: details.name,
      userPhone: details.phone,
      phone: details.phone,
      userAddress: `${details.location.area}, ${details.location.street}`,
      address: `${details.location.area}, ${details.location.street}`,
      location: details.location,
      items: itemsWithCommission,
      totalPrice: itemsTotal,
      deliveryFee: finalFee,
      riderTip: riderTip > 0 ? riderTip : undefined,
      isScheduled: details.isScheduled || undefined,
      scheduledTime: details.isScheduled ? details.scheduledTime : undefined,
      deliverySpeed: details.deliverySpeed || undefined,
      leaveAtDoor: details.leaveAtDoor || undefined,
      messageUponArrival: details.messageUponArrival || undefined,
      cutlery: details.cutlery || undefined,
      grandTotal: finalGrandTotal,
      status: isEasypaisa
        ? "payment_verification_pending"
        : details.orderType === "service"
        ? "booked"
        : "placed",
      paymentMethod: details.paymentMethod || "COD",
      paymentReceiptUrl: isEasypaisa ? details.paymentReceiptUrl : undefined,
      paymentVerified: isEasypaisa ? false : undefined,
      paymentAccountTitle: isEasypaisa ? "Ghulam Murtaza" : undefined,
      paymentAccountNumber: isEasypaisa ? "03277004471" : undefined,
      orderType: details.orderType,
      deviceId: deviceId,
      serviceTiming: computedServiceTiming,
      createdAt: { seconds: Math.floor(Date.now() / 1000) },
      userCoords: details.userCoords || undefined,
      totalCommission,
      voucher: trustedVoucher,
      coinsUsed: details.coinsUsed || undefined,
    };

    try {
      // 1. Save new Order (siteTax + nightSurcharge are extra record fields
      // beyond the Order type — spread so cleanObject keeps them).
      // Atomic order + voucher redemption (27 Nov 2026): same pattern as
      // the grocery handler — the voucher cap re-check (against the FRESH
      // voucher doc, not the stale local list), the order write and the
      // voucher increment commit or fail together in one transaction, so
      // a voucher that hits its cap between the pre-check and this write
      // can never leave a discounted order behind without the increment.
      const orderRef = doc(db, "orders", uniqueOrderId);
      if (details.voucher) {
        const targetDocId = matchedVoucher?.id || details.voucher.code;
        try {
          await runTransaction(db, async (transaction) => {
            const vRef = doc(db, "vouchers", targetDocId);
            const vSnap = await transaction.get(vRef);
            if (!vSnap.exists()) throw new Error("Voucher not found.");
            const vData = vSnap.data();
            const maxUses = vData.maxUses || 0;
            if (!vData.isActive || (maxUses > 0 && (vData.currentUses || 0) >= maxUses)) {
              throw new Error("Voucher limit reached.");
            }
            const uid = currentUser?.uid;
            const voucherUpdate: any = {
              currentUses: increment(1),
            };
            if (uid) {
              const limit = vData.perUserLimit !== undefined && vData.perUserLimit > 0 ? vData.perUserLimit : 1;
              const prevUses = vData.userUsageCount?.[uid] ?? (vData.usedUserIds?.includes(uid) ? 1 : 0);
              if (prevUses >= limit) throw new Error("Per-user voucher limit reached.");
              voucherUpdate.usedUserIds = arrayUnion(uid);
              voucherUpdate[`userUsageCount.${uid}`] = increment(1);
              if (prevUses + 1 >= limit && vData.assignedUserIds?.includes(uid)) {
                voucherUpdate.assignedUserIds = arrayRemove(uid);
              }
            }
            transaction.set(orderRef, cleanObject({ ...orderModel, siteTax: siteTaxAmount, nightSurcharge }));
            transaction.update(vRef, voucherUpdate);
          });
        } catch (err) {
          // Voucher-cap failures abort the whole order (nothing was
          // written — the transaction never committed), so the user can
          // retry without the voucher. Any other error rethrows to the
          // handler's outer catch (alert with the Firestore error).
          if (
            err instanceof Error &&
            (err.message === "Voucher not found." ||
              err.message === "Voucher limit reached." ||
              err.message === "Per-user voucher limit reached.")
          ) {
            console.error("Voucher redemption failed, order not placed:", err);
            setToastNotification({ title: "Voucher Unavailable", message: "The applied voucher is no longer valid or reached its usage limit." });
            return;
          }
          throw err;
        }
      } else {
        await setDoc(
          orderRef,
          cleanObject({ ...orderModel, siteTax: siteTaxAmount, nightSurcharge }),
        );
      }

      // 1.2 Update Device Info
      await setDoc(doc(db, "devices", deviceId), {
        lastUserName: details.name,
        lastUserPhone: details.phone,
        lastActive: { seconds: Date.now() / 1000 }
      }, { merge: true }).catch(() => {});

      // 1.5 Update profile with new location & name
      const profileRef = doc(db, "users", currentUser.uid);
      const prevProfile = await getDoc(profileRef);
      if (prevProfile.exists()) {
        const data = prevProfile.data();
        await setDoc(profileRef, {
           ...data,
           name: details.name,
           totalOrders: (data.totalOrders || 0) + 1,
           lastOrder: { seconds: Date.now() / 1000 },
           savedLocation: details.location,
           address: `${details.location.area}, ${details.location.street}`
        }, { merge: true });
      }

      // 2. Clear customer cart
      setCartItems([]);
      setIsCartOpen(false);

      let finalCoins = (currentUser.loyaltyCoins || 0);
      if (details.coinsUsed) {
        finalCoins = Math.max(0, finalCoins - details.coinsUsed);
      }

      // 3. Update ordersCount loyalty parameters
      const updatedProfile = {
        ...currentUser,
        name: details.name,
        phone: details.phone,
        address: `${details.location.area}, ${details.location.street}`,
        ordersCount: (currentUser.ordersCount || 0) + 1,
        loyaltyCoins: finalCoins,
      };
      await setDoc(
        doc(db, "users", currentUser.uid),
        cleanObject(updatedProfile),
      );
      setCurrentUser(updatedProfile);

      // 4. Trigger success animation overlay
      setSuccessAnimationOrder(orderModel);
      setIsSuccessAnimationOpen(true);
    } catch (err: any) {
      console.error(err);
      alert(handleFirestoreError(err));
    }
  }, [currentUser, cartItems, deliverySettings, deviceId]);

  // ===== Voice Order Assistant (Urdu, local — no API key) =====
  const [isVoiceOrderOpen, setIsVoiceOrderOpen] = useState(false);
  // ===== Chat Agent (Munchi as text chat — user 28 Nov 13:39: call agent
  // ke badle chat agent; the home Munchi card opens this, the floating
  // phone button still opens the voice modal) =====
  const [isChatAgentOpen, setIsChatAgentOpen] = useState(false);
  const [voiceFoodDetails, setVoiceFoodDetails] = useState<Parameters<
    typeof handlePlaceOrderSubmit
  >[0] | null>(null);
  const [voiceFoodExpected, setVoiceFoodExpected] = useState<string[] | null>(null);
  const voiceOrderDeferredRef = useRef<{
    resolve: (r: VoiceOrderResult) => void;
  } | null>(null);
  // Note carried from handleVoiceOrderReady to the deferred food-order
  // resolution (unmatched items / split-order warning, spoken on success).
  const voiceOrderNoteRef = useRef<string | undefined>(undefined);

  // Structured menu for the local voice agent (no API): name, price, type.
  const voiceMenuItems = useMemo(() => {
    const food = dishes
      .filter((d) => d.isAvailable && d.type === "food")
      .map((d) => ({
        name: d.name,
        price: d.discountPrice && d.discountPrice < d.price ? d.discountPrice : d.price,
        type: "food" as const,
        image: d.imageUrl,
      }));
    const grocery = groceryProducts
      .filter((p) => p.isAvailable)
      .map((p) => ({
        name: p.name,
        price: p.discountPrice && p.discountPrice < p.price ? p.discountPrice : p.price,
        type: "grocery" as const,
        image: p.imageUrl,
      }));
    return [...food, ...grocery];
  }, [dishes, groceryProducts]);

  // Customer's recent orders for the local voice agent, so it can answer
  // "where is my order?" / "why is it late?" with real information.
  const voiceRecentOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const activeFirst = [...orders].sort((a, b) => {
      const aActive = a.status !== "delivered" && a.status !== "cancelled" && a.status !== "completed" ? 0 : 1;
      const bActive = b.status !== "delivered" && b.status !== "cancelled" && b.status !== "completed" ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      const aT = a.createdAt?.seconds || 0;
      const bT = b.createdAt?.seconds || 0;
      return bT - aT;
    });
    return activeFirst.slice(0, 5).map((o) => {
      const secs = o.createdAt?.seconds || (o.createdAt?.toDate ? Math.floor(o.createdAt.toDate().getTime() / 1000) : 0);
      return {
        id: o.id,
        items: (o.items || []).map((i: { name: string; quantity: number }) => ({ name: i.name, qty: i.quantity })),
        total: o.grandTotal || o.totalPrice || 0,
        status: o.status,
        placedAtMs: secs * 1000,
        payment: o.paymentMethod || "COD",
        speed: o.deliverySpeed || "standard",
      };
    });
  }, [orders]);

  // Customer profile for the voice agent (Munchi "high level" brain): so the
  // agent knows the caller — new or returning, how many orders, total spent,
  // favourite items, last order — and can greet and suggest like a real
  // shopkeeper who remembers the customer. Built from the site's own orders.
  const voiceUserProfile = useMemo(() => {
    if (!orders || orders.length === 0) {
      return "NEW CUSTOMER — this is their first time ordering. No previous orders. Their first order gets FREE delivery. Welcome them warmly as a new customer and mention the free first delivery.";
    }
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((s, o) => s + (o.grandTotal || o.totalPrice || 0), 0);
    const counts = new Map<string, number>();
    for (const o of orders) {
      for (const it of o.items || []) {
        const name = (it as { name?: string }).name || "";
        if (name) counts.set(name, (counts.get(name) || 0) + 1);
      }
    }
    const favs = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([n, c]) => `${n} (${c}x)`)
      .join(", ");
    const sorted = [...orders].sort((a, b) => {
      const aT = a.createdAt?.seconds || 0;
      const bT = b.createdAt?.seconds || 0;
      return bT - aT;
    });
    const last = sorted[0];
    const lastItems = (last?.items || []).map((i: { name?: string }) => i.name || "").filter(Boolean).join(", ");
    const lastMins = last ? Math.max(0, Math.floor((Date.now() - (last.createdAt?.seconds || 0) * 1000) / 60000)) : 0;
    return `RETURNING CUSTOMER — ${totalOrders} previous orders, total spent Rs ${totalSpent}. Favourite items: ${favs || "none yet"}. Last order ${lastMins} min ago: ${lastItems || "—"} (status ${last?.status || "—"}). Greet them warmly as a returning customer, and feel free to suggest their favourites.`;
  }, [orders]);

  const normalizeName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

  const findDish = useCallback(
    (name: string): Dish | null => {
      const n = normalizeName(name);
      if (!n) return null;
      return (
        dishes.find((d) => normalizeName(d.name) === n) ||
        dishes.find(
          (d) => normalizeName(d.name).startsWith(n) || n.startsWith(normalizeName(d.name)),
        ) ||
        dishes.find(
          (d) => normalizeName(d.name).includes(n) || n.includes(normalizeName(d.name)),
        ) ||
        null
      );
    },
    [dishes],
  );

  const findGrocery = useCallback(
    (name: string): GroceryProduct | null => {
      const n = normalizeName(name);
      if (!n) return null;
      return (
        groceryProducts.find((p) => normalizeName(p.name) === n) ||
        groceryProducts.find(
          (p) => normalizeName(p.name).startsWith(n) || n.startsWith(normalizeName(p.name)),
        ) ||
        groceryProducts.find(
          (p) => normalizeName(p.name).includes(n) || n.includes(normalizeName(p.name)),
        ) ||
        null
      );
    },
    [groceryProducts],
  );

  // Places a voice-collected order. Resolves only after the order is placed.
  const handleVoiceOrderReady = useCallback(
    async (order: VoiceOrder): Promise<VoiceOrderResult> => {
      if (!currentUser) {
        return { ok: false, needsSignIn: true };
      }
      if (currentUser.status === "locked" || currentUser.status === "blocked") {
        return { ok: false, message: "Account restricted aahe. Verification pending aahe." };
      }
      const name = currentUser.name || "Customer";
      const phone = order.phone || currentUser.phone || "";
      const location = {
        area: order.address.area || "Dadu",
        street: order.address.street || "",
      };
      const paymentMethod: "COD" | "Easypaisa" =
        order.payment === "Easypaisa" ? "Easypaisa" : "COD";

      // Easypaisa on a voice call cannot take a receipt screenshot, so the
      // order would sit unverifiable forever. Block it and let the agent
      // offer COD (or Easypaisa in the app with a receipt upload).
      if (paymentMethod === "Easypaisa") {
        return { ok: false, message: "ایزی پیسہ کے لیے رسید کی ضرورت ہے، اور کال پر رسید اپ لوڈ نہیں ہو سکتی۔ کیش آن ڈیلیوری پر آرڈر کر لیں، یا ایپ میں ایزی پیسہ سے پے کر کے رسید اپ لوڈ کریں۔" };
      }

      // Match spoken items to the catalogue (fall back to the other catalogue
      // when the agent's type hint does not match).
      const foodDishes: { dish: Dish; qty: number }[] = [];
      const groceryProds: { product: GroceryProduct; qty: number }[] = [];
      const unmatched: string[] = [];
      for (const it of order.items) {
        const qty = Math.max(1, Math.round(it.qty) || 1);
        if (it.type === "food") {
          const dish = findDish(it.name);
          if (dish) foodDishes.push({ dish, qty });
          else {
            const g = findGrocery(it.name);
            if (g) groceryProds.push({ product: g, qty });
            else unmatched.push(it.name);
          }
        } else {
          const g = findGrocery(it.name);
          if (g) groceryProds.push({ product: g, qty });
          else {
            const dish = findDish(it.name);
            if (dish) foodDishes.push({ dish, qty });
            else unmatched.push(it.name);
          }
        }
      }
      if (foodDishes.length === 0 && groceryProds.length === 0) {
        return { ok: false, message: "Koi item menu mein na milyo. Mehrbani kare wari koshish kayo." };
      }
      // Never silently drop items or split an order: the customer must be
      // told what was left out and that food+grocery means two orders.
      const noteParts: string[] = [];
      if (unmatched.length > 0) {
        noteParts.push(`نوٹ: ${unmatched.join("، ")} مینیو میں نہیں ملے، اس لیے آرڈر میں شامل نہیں ہوئے۔`);
      }
      if (foodDishes.length > 0 && groceryProds.length > 0) {
        noteParts.push("کھانا اور گروسری دو الگ آرڈر بنیں گے، ڈیلیوری فیس دو دفعہ لگے گی۔");
      }
      const orderNote = noteParts.length > 0 ? noteParts.join(" ") : undefined;

      // Grocery: place directly (handlePlaceGroceryOrder takes items as a param).
      if (groceryProds.length > 0) {
        const items: GroceryOrderItem[] = groceryProds.map(({ product, qty }) => ({
          productId: product.id,
          name: product.name,
          price:
            product.discountPrice && product.discountPrice < product.price
              ? product.discountPrice
              : product.price,
          discountPrice: product.discountPrice,
          quantity: qty,
          unit: product.unit,
          imageUrl: product.imageUrl,
          commission: product.commission || 0,
        }));
        const totalPrice = items.reduce((a, i) => a + i.price * i.quantity, 0);
        const hasMedicine = groceryProds.some(
          ({ product }) => product.categoryId === "gcat_medicine",
        );
        // Voice grocery order: medicine orders use the Rs 30 medicine fee,
        // everything else the grocery fee (delivery_config, default Rs 100).
        const medicineFee = medicineDeliveryFee;
        const baseFee = hasMedicine ? medicineFee : groceryDeliveryFee;
        const freeThreshold = Number(groceryDeliveryConfig?.freeDeliveryAboveAmount || 1000);
        const doubleBelow = Number(deliverySettings?.doubleFeeBelowAmount ?? 500);
        const isFree = totalPrice >= freeThreshold;
        const isDouble = doubleBelow > 0 && totalPrice > 0 && totalPrice < doubleBelow;
        // Night surcharge LAST, after doubling; waived with free delivery.
        const voiceNightSurcharge =
          !isFree && !isFirstOrderFreeDelivery && totalPrice > 0 && isNightSurchargeTime()
            ? nightSurchargeAmount
            : 0;
        // Rider-range doubling, same as the drawers: x2 on the (possibly
        // below-Rs-500 doubled) base, before the night surcharge.
        const voiceBaseFee = isDouble ? baseFee * 2 : baseFee;
        const rangeAdjustedVoiceFee = isRiderRangeExceeded ? voiceBaseFee * 2 : voiceBaseFee;
        const deliveryFee = isFirstOrderFreeDelivery
          ? 0
          : !isFree && totalPrice > 0
            ? rangeAdjustedVoiceFee + voiceNightSurcharge
            : 0;
        await handlePlaceGroceryOrder({
          name,
          phone,
          location,
          items,
          totalPrice,
          deliveryFee,
          grandTotal: totalPrice + deliveryFee,
          paymentMethod,
          userCoords: globalCoords || undefined,
        });
      }

      // Food: build the cart, then the effect below places the order once the
      // cart reflects the voice items (state updates are async).
      if (foodDishes.length > 0) {
        const cartItemsForVoice: OrderItem[] = foodDishes.map(({ dish, qty }) => ({
          dishId: dish.id,
          name: dish.name,
          price:
            dish.discountPrice && dish.discountPrice < dish.price
              ? dish.discountPrice
              : dish.price,
          quantity: qty,
          type: dish.type,
          imageUrl: dish.imageUrl,
          serviceDuration: dish.serviceDuration,
          restaurantName: dish.restaurantName || "Dadu Fast Food & Kitchen",
          commission: dish.commission || 0,
          selectedSize: undefined,
          selectedFlavor: undefined,
          selectedAddOns: undefined,
          specialInstructions: undefined,
        }));
        const details: Parameters<typeof handlePlaceOrderSubmit>[0] = {
          name,
          phone,
          location,
          paymentMethod,
          orderType: "food",
          userCoords: globalCoords || undefined,
        };
        const done = new Promise<VoiceOrderResult>((resolve) => {
          voiceOrderDeferredRef.current = { resolve };
        });
        voiceOrderNoteRef.current = orderNote;
        setGroceryCartItems([]);
        setCartItems(cartItemsForVoice);
        setVoiceFoodExpected(cartItemsForVoice.map((c) => c.dishId));
        setVoiceFoodDetails(details);
        return done;
      }
      return { ok: true, note: orderNote };
    },
    [
      currentUser,
      findDish,
      findGrocery,
      groceryDeliveryConfig,
      deliverySettings,
      globalCoords,
      handlePlaceGroceryOrder,
    ],
  );

  // Places the pending voice food order once the cart reflects the voice items.
  useEffect(() => {
    if (!voiceFoodDetails || !voiceFoodExpected) return;
    const ready = voiceFoodExpected.every((id) =>
      cartItems.some((c) => c.dishId === id),
    );
    if (!ready || cartItems.length === 0) return;
    const details = voiceFoodDetails;
    setVoiceFoodDetails(null);
    setVoiceFoodExpected(null);
    handlePlaceOrderSubmit(details)
      .then(() => {
        voiceOrderDeferredRef.current?.resolve({ ok: true, note: voiceOrderNoteRef.current ?? undefined });
        voiceOrderDeferredRef.current = null;
        voiceOrderNoteRef.current = undefined;
      })
      .catch(() => {
        voiceOrderDeferredRef.current?.resolve({
          ok: false,
          message: "Order place na thiyo. Mehrbani kare wari koshish kayo.",
        });
        voiceOrderDeferredRef.current = null;
      });
  }, [cartItems, voiceFoodDetails, voiceFoodExpected, handlePlaceOrderSubmit]);

  const handleClearNotificationsAll = async () => {
    try {
      await Promise.all(
        notifications.map((n) => deleteDoc(doc(db, "notifications", n.id))),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkNotificationAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    try {
      const unread = notifications.filter((n) => !n.read);
      await Promise.all(
        unread.map((n) => updateDoc(doc(db, "notifications", n.id), { read: true })),
      );
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  const handleDeleteNotificationDoc = async (id: string) => {
    try {
      await deleteDoc(doc(db, "notifications", id));
    } catch (err) {
      console.error(err);
    }
  };

  // --- DYNAMIC DEAL OF THE HOUR MODIFIERS ---
  const isDealActive =
    dealConfig.isActive &&
    (dealTimeLeft.minutes > 0 || dealTimeLeft.seconds > 0);
    
  // --- RESTAURANT AVAILABILITY CHECK ---
  const checkIsRestaurantClosed = React.useCallback((restaurantName?: string) => {
    const fallbackName = "Dadu Fast Food & Kitchen";
    const nameToUse = restaurantName || fallbackName;

    // Check specific restaurant status first
    if (
      deliverySettings?.restaurantStatuses &&
      deliverySettings.restaurantStatuses[nameToUse]
    ) {
      const { isTemporarilyUnavailable, openingTime, closingTime } =
        deliverySettings.restaurantStatuses[nameToUse];

      if (isTemporarilyUnavailable) return true;

      if (openingTime && closingTime) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        const [openH, openM] = openingTime.split(":").map(Number);
        const [closeH, closeM] = closingTime.split(":").map(Number);

        const currentAbsolute = currentHour * 60 + currentMinute;
        const openAbsolute = openH * 60 + openM;
        const closeAbsolute = closeH * 60 + closeM;

        if (closeAbsolute < openAbsolute) {
          // Crosses midnight
          if (currentAbsolute < openAbsolute && currentAbsolute > closeAbsolute)
            return true;
        } else {
          // Normal day hours
          if (
            currentAbsolute < openAbsolute ||
            currentAbsolute >= closeAbsolute
          )
            return true;
        }
      }
    }

    // Fallback to global store status if no specific status
    if (deliverySettings?.isStoreClosed) return true;

    if (
      deliverySettings?.storeOpeningTime &&
      deliverySettings?.storeClosingTime
    ) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      const [openH, openM] = deliverySettings.storeOpeningTime
        .split(":")
        .map(Number);
      const [closeH, closeM] = deliverySettings.storeClosingTime
        .split(":")
        .map(Number);

      const currentAbsolute = currentHour * 60 + currentMinute;
      const openAbsolute = openH * 60 + openM;
      const closeAbsolute = closeH * 60 + closeM;

      if (closeAbsolute < openAbsolute) {
        // Crosses midnight
        if (currentAbsolute < openAbsolute && currentAbsolute > closeAbsolute)
          return true;
      } else {
        // Normal day hours
        if (currentAbsolute < openAbsolute || currentAbsolute >= closeAbsolute)
          return true;
      }
    }

    return false;
  }, [deliverySettings]);
  // Clean, normalized catalog (removes blocked shops/KFC/Home Services, fixes spelling/prices/photos/categories)
  const catalogDishes = React.useMemo(() => normalizeCatalog(dishes), [dishes]);

  const normalizedFoodCategories = React.useMemo(
    () => normalizeFoodCategories(foodCategories, catalogDishes) as FoodCategory[],
    [foodCategories, catalogDishes],
  );

  const finalDishes = React.useMemo(() => {
    return catalogDishes.map((dish) => {
      let isAvailable = dish.isAvailable;
      
      const rName = dish.restaurantName?.trim() || "Dadu Fast Food & Kitchen";

      if (isAvailable !== false && checkIsRestaurantClosed(rName)) {
        isAvailable = false;
      }

      if (isAvailable !== false && dish.openingTime && dish.closingTime) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        const [openH, openM] = dish.openingTime.split(":").map(Number);
        const [closeH, closeM] = dish.closingTime.split(":").map(Number);
        
        const currentAbsolute = currentHour * 60 + currentMinute;
        const openAbsolute = openH * 60 + openM;
        const closeAbsolute = closeH * 60 + closeM;
        
        if (closeAbsolute < openAbsolute) {
          if (currentAbsolute < openAbsolute && currentAbsolute > closeAbsolute) {
            isAvailable = false;
          }
        } else {
          if (currentAbsolute < openAbsolute || currentAbsolute >= closeAbsolute) {
            isAvailable = false;
          }
        }
      }

      const overrides: Partial<Dish> = { isAvailable };

      if (isDealActive && dealConfig?.selectedItemIds?.includes(dish.id)) {
        const pct = dealConfig.discountPercentage || 0;
        if (pct > 0) {
          overrides.discountPrice = Math.round(dish.price * (1 - pct / 100));
        }
      }
      return { ...dish, ...overrides };
    });
  }, [catalogDishes, isDealActive, dealConfig, checkIsRestaurantClosed]);

  // Popular dishes for the cart "Popular with your order" upsell: real
  // bestsellers first, then any available food dish (max 6, never services).
  const popularDishesForCart = React.useMemo(() => {
    const available = finalDishes.filter(
      (d) => d.type === "food" && d.isAvailable !== false,
    );
    const bestsellers = available.filter((d) => d.isBestseller);
    const picks = [...bestsellers, ...available.filter((d) => !d.isBestseller)];
    const seen = new Set<string>();
    return picks.filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true))).slice(0, 6);
  }, [finalDishes]);

  // --- Meal Deals (src/data/deals.ts) ---
  // Deals reference dishes by exact menu name; resolve them against the
  // live catalogue here. A deal renders only when EVERY one of its dishes
  // is in the current catalogue — otherwise the "Add Deal" button could
  // not add the full bundle. (At first paint, before Firestore loads, the
  // fallback catalogue may not contain the deal names, so fewer deals show.)
  const dishByName = React.useMemo(() => {
    const map = new Map<string, Dish>();
    for (const d of finalDishes) {
      const key = (d.name || "").trim().toLowerCase();
      if (key && !map.has(key)) map.set(key, d);
    }
    return map;
  }, [finalDishes]);

  const availableDeals = React.useMemo(() => {
    return DEALS.map((deal) => {
      const resolved = deal.dishes.map((dd) => {
        const dish = dishByName.get(dd.name.trim().toLowerCase());
        return dish ? { dish, qty: dd.qty ?? 1 } : null;
      });
      if (resolved.some((r) => r === null)) return null;
      return {
        deal,
        items: resolved as { dish: Dish; qty: number }[],
      };
    }).filter(
      (x): x is { deal: Deal; items: { dish: Dish; qty: number }[] } => x !== null,
    );
  }, [dishByName]);

  // Add a whole deal in one tap. The bundle discount is honoured by
  // applying the deal's saving to the FIRST dish (its discountPrice), so
  // the cart total equals the advertised deal price exactly — the other
  // dishes go in at menu price. Deal 5's Shawarma goes in with qty 2.
  const handleAddDeal = (deal: Deal) => {
    const entry = availableDeals.find((d) => d.deal.id === deal.id);
    if (!entry) return;
    const savings = dealSavings(deal);
    entry.items.forEach(({ dish, qty }, i) => {
      const base =
        dish.discountPrice && dish.discountPrice > 0 && dish.discountPrice < dish.price
          ? dish.discountPrice
          : dish.price;
      const dealDish =
        i === 0 && savings > 0
          ? { ...dish, discountPrice: Math.max(1, base - savings) }
          : dish;
      handleAddToCart(dealDish, qty);
    });
    // Feedback (audit 28 Nov #2): the button used to stay "Add Deal" with
    // no toast, so a second tap silently added the whole bundle again.
    setToastNotification({
      title: "Deal added",
      message: `${deal.title} — Rs. ${deal.dealPrice} (save Rs. ${savings})`,
    });
  };

  // --- RESTAURANT AVAILABILITY CHECK ---
  const uniqueRestaurants = React.useMemo(() => {
    const list = Array.from(
      new Set(
        catalogDishes
          .map((d) => d.restaurantName?.trim() || "Dadu Fast Food & Kitchen")
          .filter(Boolean),
      ),
    ) as string[];

    const refCoords = globalCoords || (
      deliverySettings?.baseLocationCoords?.lat && deliverySettings?.baseLocationCoords?.lng
        ? { latitude: deliverySettings.baseLocationCoords.lat, longitude: deliverySettings.baseLocationCoords.lng }
        : { latitude: 26.7323, longitude: 67.7744 }
    );

    list.sort((a, b) => {
      const aClosed = checkIsRestaurantClosed(a) ? 1 : 0;
      const bClosed = checkIsRestaurantClosed(b) ? 1 : 0;
      if (aClosed !== bClosed) return aClosed - bClosed;

      const aCoords = deliverySettings?.restaurantStatuses?.[a]?.coords;
      const bCoords = deliverySettings?.restaurantStatuses?.[b]?.coords;
      const aDist = aCoords?.lat && aCoords?.lng ? calculateDistanceKm(refCoords.latitude, refCoords.longitude, aCoords.lat, aCoords.lng) : Infinity;
      const bDist = bCoords?.lat && bCoords?.lng ? calculateDistanceKm(refCoords.latitude, refCoords.longitude, bCoords.lat, bCoords.lng) : Infinity;

      if (aDist !== bDist) return aDist - bDist;

      return a.localeCompare(b);
    });
    return list;
  }, [catalogDishes, checkIsRestaurantClosed, globalCoords, deliverySettings]);

  // Real dish counts per restaurant for the /restaurants + /hotels directory
  // pages, grouped from finalDishes by restaurantName. Only shown when > 0.
  const directoryDishCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of finalDishes) {
      const rName = d.restaurantName?.trim() || "Dadu Fast Food & Kitchen";
      counts[rName] = (counts[rName] || 0) + 1;
    }
    return counts;
  }, [finalDishes]);

  // Resolve deep-linked /shop/:slug routes once restaurants are known
  useEffect(() => {
    if (typeof window === "undefined") return;
    const match = window.location.pathname.match(/^\/shop\/([^/]+)/);
    if (match && match[1] && uniqueRestaurants.length > 0 && selectedRestaurant === "All Restaurants") {
      const matchedShop = uniqueRestaurants.find((r) => slugifyShop(r) === match[1]);
      if (matchedShop) {
        setSelectedRestaurant(matchedShop);
      }
    }
  }, [uniqueRestaurants]);

  // Keep dynamic SEO title, meta tags, canonical URL, and JSON-LD synced on every view
  useEffect(() => {
    if (activeInfoPage) {
      syncPageSeo({
        pageType: "info",
        infoSlug: activeInfoPage,
        deliverySettings,
        adminSeoOverride,
      });
      return;
    }
    if (selectedRestaurant !== "All Restaurants") {
      const shopDishes = finalDishes.filter(
        (d) =>
          (d.restaurantName?.trim() || "Dadu Fast Food & Kitchen") ===
          selectedRestaurant,
      );
      const shopPath = `/shop/${slugifyShop(selectedRestaurant)}`;
      if (typeof window !== "undefined" && window.location.pathname !== shopPath) {
        window.history.replaceState({ shop: selectedRestaurant }, "", shopPath);
      }
      syncPageSeo({
        pageType: "shop",
        shopName: selectedRestaurant,
        shopDishes,
        deliverySettings,
        adminSeoOverride,
      });
      return;
    }
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/shop/")) {
      window.history.replaceState({ page: "home" }, "", "/");
    }
    if (activeRoute === "grocery") {
      syncPageSeo({
        pageType: "grocery",
        deliverySettings,
        adminSeoOverride,
      });
      return;
    }
    if (activeRoute === "pharmacy") {
      syncPageSeo({
        pageType: "pharmacy",
        deliverySettings,
        adminSeoOverride,
      });
      return;
    }
    if (activeRoute === "restaurants") {
      syncPageSeo({
        pageType: "restaurants",
        deliverySettings,
        adminSeoOverride,
      });
      return;
    }
    if (activeRoute === "hotels") {
      syncPageSeo({
        pageType: "hotels",
        deliverySettings,
        adminSeoOverride,
      });
      return;
    }
    if (activeRoute === "not-found") {
      // No syncPageSeo pageType exists for a 404 view; keep it out of the
      // index by title alone (Worker A serves the real 404 status).
      document.title = "Page Not Found | Dadu Food";
      return;
    }
    syncPageSeo({
      pageType: "home",
      deliverySettings,
      adminSeoOverride,
    });
  }, [activeInfoPage, selectedRestaurant, activeRoute, finalDishes, deliverySettings, adminSeoOverride]);

  const filteredDishes = React.useMemo(() => {
    const q = (debouncedSearchQuery || "").trim();
    const seenKeys = new Set<string>();

    return finalDishes.filter((dish) => {
      // Hide checkout-exclusive soft drinks from main browsing screen & panels
      const isExclusiveDrink =
        dish.id.startsWith("drink_") ||
        dish.category === "Drinks" ||
        dish.category === "Beverages";
      if (isExclusiveDrink) return false;

      // When searching, search across ALL categories so "biryani" works even when Pizza is selected
      const matchesCategory =
        q.length > 0 || activeCategory === "All" || dish.category === activeCategory;
      const rName = dish.restaurantName || "Dadu Fast Food & Kitchen";
      const matchesRestaurant =
        q.length > 0 || selectedRestaurant === "All Restaurants" || rName === selectedRestaurant;
      const matchesFavorites =
        !showFavoritesOnly || favoriteDishIds.includes(dish.id);
      const matchesSearch = !q || matchesFoodSearch(dish, q);

      const effectivePrice = dish.discountPrice && dish.discountPrice > 0 ? dish.discountPrice : dish.price;
      const textBlob = `${dish.name || ""} ${dish.category || ""} ${dish.description || ""}`.toLowerCase();
      const restProfile = getShopProfile(rName, deliverySettings, undefined, orders);

      let matchesQuickFilter = true;
      if (quickFilter === "top_rated") {
        matchesQuickFilter = Boolean(
          dish.isFeatured ||
            (restProfile.rating !== null && Number(restProfile.rating) >= 4.5),
        );
      } else if (quickFilter === "under_300") {
        matchesQuickFilter = effectivePrice <= 300;
      } else if (quickFilter === "fast_food") {
        matchesQuickFilter = /burger|zinger|broast|fries|roll|shawarma|sandwich|wrap|wings|nuggets/.test(textBlob);
      } else if (quickFilter === "desi") {
        matchesQuickFilter = /biryani|karahi|handi|tikka|bbq|kabab|kebab|pulao|nihari|haleem|paratha|naan|rice|desi/.test(textBlob);
      } else if (quickFilter === "pizza") {
        matchesQuickFilter = /pizza|pasta|lasagna|calzone/.test(textBlob);
      } else if (quickFilter === "chai_sweets") {
        matchesQuickFilter = /\b(tea|chai|coffee|shake|sweet|cake|dessert|ice cream|bakery|halwa|gulab|kheer)\b/.test(textBlob);
      }

      if (!(matchesCategory && matchesRestaurant && matchesSearch && matchesFavorites && matchesQuickFilter)) {
        return false;
      }

      const dedupeKey = `${rName.toLowerCase()}::${(dish.name || "").toLowerCase().trim()}`;
      if (seenKeys.has(dedupeKey)) return false;
      seenKeys.add(dedupeKey);
      return true;
    });
  }, [finalDishes, activeCategory, selectedRestaurant, showFavoritesOnly, favoriteDishIds, debouncedSearchQuery, quickFilter, deliverySettings, orders]);

  // Food catalogue batching (same useLazyBatchLoad pattern as GroceryModule):
  // the catalogue used to mount all ~144 dishes at once. The closed-first /
  // featured sort is memoised here instead of re-running inline on every
  // render, and the per-dish favourite / cart lookups use a Set / Map.
  const sortedFilteredDishes = React.useMemo(() => {
    return [...filteredDishes].sort((a, b) => {
      const dishRestaurantNameA = a.restaurantName || "Dadu Fast Food & Kitchen";
      const aClosed = checkIsRestaurantClosed(dishRestaurantNameA) ? 1 : 0;

      const dishRestaurantNameB = b.restaurantName || "Dadu Fast Food & Kitchen";
      const bClosed = checkIsRestaurantClosed(dishRestaurantNameB) ? 1 : 0;

      if (aClosed !== bClosed) {
        return aClosed - bClosed;
      }

      if (a.isFeatured !== b.isFeatured) {
        return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      }
      const aTime = a.id.startsWith("custom_") ? parseInt(a.id.split("_")[1]) || 0 : 0;
      const bTime = b.id.startsWith("custom_") ? parseInt(b.id.split("_")[1]) || 0 : 0;
      if (aTime !== bTime) {
        return bTime - aTime;
      }
      return String(b.id).localeCompare(String(a.id));
    });
  }, [filteredDishes, checkIsRestaurantClosed]);

  const favoriteDishIdSet = React.useMemo(() => new Set(favoriteDishIds), [favoriteDishIds]);
  // Keyed by the BASE dish id (baseDishId, falling back to dishId) and
  // summing quantities across variants: a dish added WITH a size/flavour
  // carries a composite dishId ("dishId-size-flavour"), so a plain
  // dish.id lookup missed it and the card showed "+ Add" for a dish
  // already in the cart (audit 28 Nov #4). The stored item keeps the
  // summed quantity; its dishId is the first variant's (used only for
  // display — updates go through handleUpdateCartQuantity's base-id
  // fallback).
  const cartItemByDishId = React.useMemo(() => {
    const map = new Map<string, (typeof cartItems)[number]>();
    for (const item of cartItems) {
      const baseId = item.baseDishId || item.dishId;
      const prev = map.get(baseId);
      if (prev) {
        map.set(baseId, { ...prev, quantity: prev.quantity + item.quantity });
      } else {
        map.set(baseId, item);
      }
    }
    return map;
  }, [cartItems]);

  const {
    visibleItems: visibleFoodDishes,
    hasMore: foodBatchHasMore,
    observerTargetRef: foodBatchObserverRef,
  } = useLazyBatchLoad<Dish>(sortedFilteredDishes, 24);

  const cartCountTotal = cartItems.reduce(
    (acc, item) => acc + item.quantity,
    0,
  );
  // WhatsApp List card (audit 28 Nov #7): it used to send only a greeting,
  // so the user had to type the whole list by hand. Now the message carries
  // the actual cart (food + grocery, name × qty) when the cart is non-empty.
  const whatsappOrderText = React.useMemo(() => {
    const lines = ["Assalam-o-Alaikum Dadu Food! Mera WhatsApp order list ye hai:"];
    for (const item of cartItems) {
      if (item.quantity > 0) lines.push(`- ${item.name} x${item.quantity} — Rs. ${item.price * item.quantity}`);
    }
    for (const item of groceryCartItems) {
      if (item.quantity > 0) lines.push(`- ${item.name} x${item.quantity} — Rs. ${item.price * item.quantity}`);
    }
    if (lines.length === 1) return lines[0];
    return lines.join("\n");
  }, [cartItems, groceryCartItems]);
  const cartPriceTotal = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );

  const commonModals = (
    <Suspense fallback={null}>
      {/* Cart Slider Drawer */}
      {(() => {
        const firstItem = cartItems[0];
        const itemRestaurant = firstItem?.restaurantName || "Dadu Fast Food & Kitchen";
        const specificStatus = deliverySettings?.restaurantStatuses?.[itemRestaurant];
        
        let computedDeliveryFee = foodDeliveryFee;
        if (specificStatus && specificStatus.deliveryCharge) {
           const match = specificStatus.deliveryCharge.match(/\d+/);
           if (match) {
             computedDeliveryFee = parseInt(match[0], 10);
           }
        }
        
        // Rider-range doubling is applied inside CartDrawer (via the
        // isRiderRangeExceeded prop) so the displayed fee matches the saved
        // order total — do NOT pre-double computedDeliveryFee here (the
        // drawer reads the raw settings fee, so a doubled prop would be
        // ignored for display and double-counted nowhere).
        return (
          <CartDrawer
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            cartItems={cartItems}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemoveItem={handleRemoveCartItem}
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthOpen(true)}
            deliveryFee={computedDeliveryFee}
            isRiderRangeExceeded={isRiderRangeExceeded}
            isFirstOrderFreeDelivery={isFirstOrderFreeDelivery}
            onPlaceOrder={handlePlaceOrderSubmit}
            onAddDrink={handleAddExclusiveDrink}
            popularDishes={popularDishesForCart}
            onAddPopularDish={handleAddToCart}
            userCoords={globalCoords}
            systemSettings={deliverySettings}
            allVouchers={vouchers}
            onRequireLocation={() => {
              setLocationRequiredForOrder(true);
              setShowLocationPrompt(true);
            }}
          />
        );
      })()}

      {(() => {
        let computedGroceryDeliveryConfig = { ...groceryDeliveryConfig };
        // Grocery base fee is governed by delivery_config.groceryDeliveryFee
        // (default Rs 100) — the old groceryDeliveryConfig doc value is stale.
        computedGroceryDeliveryConfig.baseDeliveryFee = groceryDeliveryFee;
        // Rider-range doubling is applied inside GroceryCartDrawer (via the
        // isRiderRangeExceeded prop) so the displayed fee — and the fee the
        // drawer passes back for the saved order — include it. Do NOT
        // pre-double baseDeliveryFee here: the drawer reads the raw
        // settings fee first, so a doubled config value was ignored and
        // the doubling was dead in both display and saved order.
        return (
          <GroceryCartDrawer
            isOpen={isGroceryCartOpen}
            onClose={() => setIsGroceryCartOpen(false)}
            cartItems={groceryCartItems}
            onUpdateQuantity={handleUpdateGroceryCartQuantity}
            onRemoveItem={handleRemoveFromGroceryCart}
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthOpen(true)}
            deliveryConfig={computedGroceryDeliveryConfig}
            isRiderRangeExceeded={isRiderRangeExceeded}
            isFirstOrderFreeDelivery={isFirstOrderFreeDelivery}
            onPlaceGroceryOrder={handlePlaceGroceryOrder}
            userCoords={globalCoords}
            systemSettings={deliverySettings}
            allVouchers={vouchers}
            onRequireLocation={() => {
              setLocationRequiredForOrder(true);
              setShowLocationPrompt(true);
            }}
          />
        );
      })()}

      <OrderHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        orders={orders}
        onReorder={handleReorder}
        onTrackOrder={(order) => {
          setActiveTrackingOrder(order);
          setIsTrackingModalOpen(true);
        }}
      />

      <MobileAccountDrawer
        isOpen={isMobileAccountOpen}
        onClose={() => setIsMobileAccountOpen(false)}
        user={currentUser}
        orders={orders}
        allOrders={orders}
        onTrackOrder={(order) => {
          setActiveTrackingOrder(order);
          setIsTrackingModalOpen(true);
        }}
        onReorder={handleReorder}
        showFavoritesOnly={showFavoritesOnly}
        onToggleFavorites={() => setShowFavoritesOnly(!showFavoritesOnly)}
        onOpenHistory={() => setIsHistoryDrawerOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenAdmin={() => {
          if (currentUser?.role === "admin" || currentUser?.role === "staff") {
            setIsAdminConsoleOpen(true);
          }
        }}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      <CustomerSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        user={currentUser}
        onUserUpdated={(updated) => {
          setCurrentUser(updated);
          setCachedData("dadu_cached_user", updated);
        }}
        language={language}
        onLanguageChange={handleLanguageChange}
      />

      {/* Sign-out Cart Protection Dialog */}
      <AnimatePresence>
        {isSignOutConfirmOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setIsSignOutConfirmOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#D70F64]/10 text-[#D70F64] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-zinc-900 dark:text-white">
                    Items in Your Cart
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    You have {cartCountTotal + groceryCartItems.reduce((a, b) => a + b.quantity, 0)} item(s) waiting in your cart.
                  </p>
                </div>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Choose whether to keep your cart items on this device or clear them before signing out.
              </p>
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => performLogout(false)}
                  className="w-full min-h-[48px] py-3.5 px-4 rounded-xl bg-[#D70F64] hover:bg-[#B80C54] text-white text-xs font-black uppercase tracking-wider cursor-pointer transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97] active:brightness-110 relative overflow-hidden after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0)_65%)] after:opacity-0 after:scale-50 after:transition-[opacity,transform] after:duration-300 after:pointer-events-none active:after:opacity-100 active:after:scale-125 active:after:duration-100"
                >
                  Keep Cart & Sign Out
                </button>
                <button
                  type="button"
                  onClick={() => performLogout(true)}
                  className="w-full min-h-[48px] py-3.5 px-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-bold uppercase tracking-wider cursor-pointer transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97] active:brightness-110"
                >
                  Clear Cart & Sign Out
                </button>
                <button
                  type="button"
                  onClick={() => setIsSignOutConfirmOpen(false)}
                  className="w-full min-h-[48px] py-3 px-4 rounded-xl text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white text-xs font-bold cursor-pointer transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97]"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BottomNavBar
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        onResetFoodHome={handleGoToFoodHome}
        onResetGroceryHome={handleGoToGroceryHome}
        cartCount={cartCountTotal}
        groceryCartCount={groceryCartItems.reduce((acc, i) => acc + i.quantity, 0)}
        cartTotal={cartPriceTotal}
        groceryCartTotal={groceryCartItems.reduce((acc, i) => acc + i.price * i.quantity, 0)}
        hideFloatingCart={selectedRestaurant !== "All Restaurants"}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenGroceryCart={() => setIsGroceryCartOpen(true)}
        user={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenAccount={() => setIsMobileAccountOpen(true)}
      />

      {/* Verification Pending Modal */}
      <AnimatePresence>
        {isVerificationModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6">
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsVerificationModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 text-center"
            >
              <div className="bg-[#D70F64] p-6 text-center">
                <div className="w-16 h-16 rounded-2xl mx-auto shadow-xl border-2 border-white/20 mb-3 bg-white flex items-center justify-center animate-pulse">
                  <Phone className="w-8 h-8 text-[#D70F64]" aria-hidden="true" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  Verification Pending
                </h2>
              </div>
              <div className="p-6 sm:p-8 space-y-6">
                <p className="text-zinc-300 font-medium leading-relaxed">
                  Aapka account review mein hai. Kisi bhi madad ke liye 03277004471 par rabta karein.
                </p>
                <button
                  onClick={() => setIsVerificationModalOpen(false)}
                  className="w-full bg-[#D70F64] hover:bg-[#B80C54] text-white font-black tracking-wide shadow-md transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97] active:brightness-110 py-3.5 rounded-2xl text-sm uppercase cursor-pointer relative overflow-hidden after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0)_65%)] after:opacity-0 after:scale-50 after:transition-[opacity,transform] after:duration-300 after:pointer-events-none active:after:opacity-100 active:after:scale-125 active:after:duration-100"
                >
                  Theek Hai
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

  // Google sign-in completion (shared by the AuthModal callback AND the
  // redirect-result pickup below). Creates/links the Firestore user profile.

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={async (phone, isStaffMode, password, verifiedFirebaseUid) => {
          const sanitizePhone = (phoneStr: string) => {
            let cleaned = phoneStr.replace(/\D/g, "");
            if (cleaned.startsWith("92")) {
              cleaned = "0" + cleaned.substring(2);
            }
            return cleaned;
          };

          if (isStaffMode) {
            if (!password || !password.trim()) {
              throw new Error("Please enter your staff password.");
            }
            const isEmail = phone.includes("@");
            const isUsername =
              !isEmail &&
              (/[a-zA-Z]/.test(phone) ||
                (phone.length > 0 && phone.length < 10 && !/^\d+$/.test(phone)));
            const cleanId = isEmail
              ? phone.trim().toLowerCase()
              : isUsername
                ? phone.trim().toLowerCase()
                : sanitizePhone(phone);

            // Look up staff / admin / rider account in Firestore
            let staffData: any = null;
            let staffDocId = "";

            if (!isEmail) {
              const directSnap = await getDoc(doc(db, "users", cleanId));
              if (directSnap.exists()) {
                staffData = directSnap.data();
                staffDocId = directSnap.id;
              } else {
                const q = query(collection(db, "users"), where("phone", "==", cleanId));
                const qSnap = await getDocs(q);
                if (!qSnap.empty) {
                  staffData = qSnap.docs[0].data();
                  staffDocId = qSnap.docs[0].id;
                }
              }
            } else {
              const q = query(collection(db, "users"), where("email", "==", cleanId));
              const qSnap = await getDocs(q);
              if (!qSnap.empty) {
                staffData = qSnap.docs[0].data();
                staffDocId = qSnap.docs[0].id;
              }
            }

            if (!staffData || !["admin", "staff", "rider"].includes(staffData.role)) {
              throw new Error("No authorized staff, admin, or rider account found with these credentials.");
            }

            // Authenticate via Firebase Auth Email/Password (or stored staff password field in Firestore)
            const authEmail = staffData.email || (isEmail ? cleanId : `${cleanId}@dadu247.com`);
            let authenticated = false;
            try {
              await signInWithEmailAndPassword(auth, authEmail, password);
              authenticated = true;
            } catch {
              if (staffData.password && typeof staffData.password === "string" && staffData.password === password) {
                authenticated = true;
              }
            }

            if (!authenticated) {
              throw new Error("Invalid staff credentials. Please check your password and try again.");
            }

            localStorage.setItem("dadu_user_phone", staffDocId);
            window.dispatchEvent(new StorageEvent("storage", { key: "dadu_user_phone" }));
            if (staffData.role === "admin" || staffData.role === "staff") {
              setIsAdminConsoleOpen(true);
            }
            setIsAuthOpen(false);
            return;
          }

          // Customer Phone OTP verification required before creating any session
          if (!verifiedFirebaseUid) {
            throw new Error("SMS OTP verification is required before signing in.");
          }

          const cleanPhone = sanitizePhone(phone);
          const blacklistRef = doc(db, "blacklist", cleanPhone);
          const blacklistSnap = await getDoc(blacklistRef);
          if (blacklistSnap.exists()) {
            throw new Error("This phone number cannot be registered.");
          }

          const profileRef = doc(db, "users", cleanPhone);
          const profileSnap = await getDoc(profileRef);

          if (profileSnap.exists()) {
            const data = profileSnap.data();
            if (data.status === "blocked" || data.isBlacklisted) {
              throw new Error("This account has been restricted. Contact support at 03277004471.");
            }
            if (data.role === "admin" || data.role === "staff" || data.role === "rider") {
              throw new Error("Staff and riders must sign in using Staff Login.");
            }

            const patch: Record<string, any> = {
              // Preserve a locked status (admin approval gate): a locked
              // user must NOT become verified just by signing in with OTP.
              // Only the admin unlock (Raza Khan, on the owner's word)
              // clears "locked".
              status: data.status === "locked" ? "locked" : "verified",
              firebaseUid: verifiedFirebaseUid,
            };
            if (globalCoords) {
              patch.savedLocation = {
                lat: globalCoords.latitude,
                lng: globalCoords.longitude,
                area: data.savedLocation?.area || "",
                street: data.savedLocation?.street || "",
              };
            }
            await setDoc(profileRef, patch, { merge: true }).catch(() => {});
          } else {
            const newProfile: any = {
              uid: cleanPhone,
              firebaseUid: verifiedFirebaseUid,
              name: "",
              phone: cleanPhone,
              address: "",
              role: "buyer",
              status: "verified",
              ordersCount: 0,
              totalOrders: 0,
              isBlacklisted: false,
              createdAt: new Date(),
            };
            if (globalCoords) {
              newProfile.savedLocation = {
                lat: globalCoords.latitude,
                lng: globalCoords.longitude,
                area: "",
                street: "",
              };
            }
            await setDoc(profileRef, newProfile);
          }

          localStorage.setItem("dadu_user_phone", cleanPhone);
          window.dispatchEvent(new StorageEvent("storage", { key: "dadu_user_phone" }));
          setIsAuthOpen(false);
        }}
        onGoogleAuthSuccess={handleGoogleUser}
      />

      <FoodDetailModal
        dish={activeDetailDish}
        onClose={() => setActiveDetailDish(null)}
        onAddToCart={handleAddToCart}
        isActiveDetailDishClosed={
          activeDetailDish
            ? checkIsRestaurantClosed(
                activeDetailDish.restaurantName || "Dadu Fast Food & Kitchen",
              )
            : false
        }
      />

      {isTrackingModalOpen && activeTrackingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 sm:p-4 overflow-y-auto backdrop-blur-md">
          <div className="w-full max-w-md bg-transparent relative overflow-hidden my-auto max-h-[95vh] overflow-y-auto scrollbar-none rounded-3xl">
            <OrderTracker
              order={activeTrackingOrder}
              onClose={() => setIsTrackingModalOpen(false)}
              currentUser={currentUser}
              deliverySettings={deliverySettings}
            />
          </div>
        </div>
      )}

      {/* Direct Live Chat Overlay Modal */}
      {isDirectChatOpen && activeTrackingOrder && (
        <Suspense fallback={null}>
          <OrderChat
            orderId={activeTrackingOrder.id}
            currentUser={{
              uid: currentUser.uid,
              name: currentUser.name || "Customer",
              role: "user"
            }}
            recipientName={activeTrackingOrder.riderName || "Delivery Partner"}
            recipientRole="rider"
            onClose={() => setIsDirectChatOpen(false)}
            isOpen={isDirectChatOpen}
          />
        </Suspense>
      )}

      <OrderSuccessAnimation
        isOpen={isSuccessAnimationOpen}
        onClose={() => setIsSuccessAnimationOpen(false)}
        order={successAnimationOrder}
        onTrackOrder={() => {
          if (successAnimationOrder) {
            setActiveTrackingOrder(successAnimationOrder);
            setIsTrackingModalOpen(true);
          }
        }}
      />

      <AnimatePresence>
      {toastNotification && (
        <motion.div
          onClick={() => setToastNotification(null)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape" || e.key === " ") {
              e.preventDefault();
              setToastNotification(null);
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Dismiss notification"
          aria-live="polite"
          initial={{ opacity: 0, x: 24, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: 24, scale: 0.97 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="fixed left-4 right-4 bottom-24 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[380px] sm:max-w-[calc(100vw-3rem)] z-50 p-4 bg-zinc-900 border-2 border-[#D70F64]/40 text-zinc-100 rounded-2xl shadow-2xl flex items-start gap-3 cursor-pointer"
        >
          <div className="bg-[#D70F64] text-white p-2.5 rounded-xl shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h5 className="font-extrabold text-xs text-zinc-100 uppercase tracking-wider">
              {toastNotification.title}
            </h5>
            <p className="text-[11px] text-zinc-300 mt-1 leading-normal font-semibold">
              {toastNotification.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setToastNotification(null)}
            aria-label="Close notification"
            className="shrink-0 w-11 h-11 -m-2 flex items-center justify-center text-zinc-300 hover:text-white rounded-full transition-transform duration-180 active:scale-[0.97]"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
      </AnimatePresence>

      {isExitConfirmationOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in"
          role="alertdialog"
          aria-modal="true"
          aria-label="Exit Dadu Food?"
          onClick={() => setIsExitConfirmationOpen(false)}
        >
          <div className="bg-zinc-900 border-2 border-[#D70F64]/30 rounded-[32px] max-w-sm w-full overflow-hidden shadow-2xl text-zinc-100 relative animate-scale-up">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#D70F64] to-transparent" />
            <div className="p-6 text-center space-y-5">
              <div className="mx-auto w-16 h-16 rounded-full bg-[#D70F64]/10 border border-[#D70F64]/20 flex items-center justify-center text-[#D70F64]">
                <LogOut className="w-8 h-8 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black uppercase tracking-wide text-zinc-100">
                  Exit Dadu Food?
                </h3>
                <p className="text-xs text-zinc-400 font-semibold leading-relaxed">
                  Are you sure you want to exit? You can stay to explore
                  delicious meals, fresh groceries, or trusted local services!
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setIsExitConfirmationOpen(false)}
                  className="w-full min-h-[48px] bg-[#D70F64] hover:bg-[#B80C54] text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97] active:brightness-110 shadow-md flex items-center justify-center gap-2 cursor-pointer relative overflow-hidden after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0)_65%)] after:opacity-0 after:scale-50 after:transition-[opacity,transform] after:duration-300 after:pointer-events-none active:after:opacity-100 active:after:scale-125 active:after:duration-100"
                >
                  <UtensilsCrossed className="w-4 h-4" />
                  Keep Ordering
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // In the native APK, actually close the app (window.close
                    // does nothing there). On the website, a normal tab cannot
                    // be force-closed, so fall through to the goodbye screen.
                    isExitingRef.current = true;
                    setIsExitConfirmationOpen(false);
                    if (Capacitor.isNativePlatform()) {
                      void CapacitorApp.exitApp();
                      return;
                    }
                    // A website cannot force-close a normal browser tab
                    // (window.close only works for script-opened windows /
                    // installed PWAs), and history.back() has nowhere to go
                    // when the user opened the site directly — so it used
                    // to do nothing. Try to close first; if the tab is
                    // still open shortly after, show the goodbye screen so
                    // the store is clearly exited.
                    try {
                      window.close();
                    } catch {
                      /* window.close is blocked for normal tabs — fall through to goodbye */
                    }
                    window.setTimeout(() => {
                      isExitingRef.current = false;
                      setShowGoodbye(true);
                    }, 400);
                  }}
                  className="w-full min-h-[48px] py-3 px-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold uppercase tracking-wider cursor-pointer transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97] active:brightness-110"
                >
                  Exit App
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goodbye screen — shown after EXIT APP. A normal browser tab cannot
          be closed by a website, so this is the visible exit: the store is
          gone and the user can come back with one tap. Back button returns
          to the store (handled in the popstate guard above). */}
      {showGoodbye && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[#f7f4ee] dark:bg-[#0B0B0F] p-6 text-center animate-fade-in">
          <div className="w-20 h-20 rounded-3xl bg-white p-2 shadow-lg flex items-center justify-center overflow-hidden mb-5">
            <img
              src={daduLogo}
              alt="Dadu Food Logo"
              className="w-full h-full object-cover rounded-2xl"
            />
          </div>
          <h2 className="text-xl font-extrabold text-[#1f1b16] dark:text-[#F5F5F8]">
            Thanks for visiting!
          </h2>
          <p className="mt-2 text-sm text-[#5e554a] dark:text-[#A3A3B5] leading-relaxed max-w-xs">
            You have exited Dadu Food. Your cart and orders are safe — come back
            anytime for hot food and fresh groceries.
          </p>
          <button
            type="button"
            onClick={() => setShowGoodbye(false)}
            className="mt-6 min-h-[48px] px-6 rounded-2xl bg-[#E21B70] hover:bg-[#C2145E] text-white text-sm font-bold shadow-md active:scale-[0.97] transition-[color,background-color,transform] duration-180 cursor-pointer"
          >
            Back to Dadu Food
          </button>
        </div>
      )}

      {/* Global Image Announcement & Offer Popup Modal */}
      <AnimatePresence>
        {showAnnouncementPopup && deliverySettings?.announcement?.imageUrl && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 select-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                const annId = deliverySettings.announcement.id;
                localStorage.setItem(`seen_announcement_${annId}`, "true");
                setShowAnnouncementPopup(false);
              }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
              className="relative w-full max-w-lg bg-zinc-950 rounded-[28px] overflow-hidden shadow-2xl border border-zinc-800 flex flex-col z-10"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  const annId = deliverySettings.announcement.id;
                  localStorage.setItem(`seen_announcement_${annId}`, "true");
                  setShowAnnouncementPopup(false);
                }}
                className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white/90 hover:text-white backdrop-blur-sm shadow border border-white/5 transition-transform duration-180 active:scale-[0.97] active:brightness-110"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Offer Banner Image */}
              <div className="w-full bg-black flex items-center justify-center min-h-[250px] max-h-[60vh] overflow-hidden relative group">
                <img
                  src={deliverySettings.announcement.imageUrl}
                  alt={deliverySettings.announcement.title || "Special Offer Announcement"}
                  referrerPolicy="no-referrer"
                  className="w-full h-auto max-h-[60vh] object-contain transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10 pointer-events-none" />
              </div>

              {/* Text Info Section (Only if Title or Description exists) */}
              {(deliverySettings.announcement.title || deliverySettings.announcement.description) && (
                <div className="p-6 bg-zinc-900 border-t border-zinc-800 space-y-2">
                  {deliverySettings.announcement.title && (
                    <h3 className="text-xl font-black text-white leading-tight">
                      {deliverySettings.announcement.title}
                    </h3>
                  )}
                  {deliverySettings.announcement.description && (
                    <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                      {deliverySettings.announcement.description}
                    </p>
                  )}
                </div>
              )}

              {/* Confirm / Continue Button */}
              <div className="p-4 sm:p-5 bg-zinc-950 border-t border-zinc-900 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const annId = deliverySettings.announcement.id;
                    localStorage.setItem(`seen_announcement_${annId}`, "true");
                    setShowAnnouncementPopup(false);
                  }}
                  className="w-full bg-[#D70F64] hover:bg-[#B80C54] text-white py-3.5 sm:py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97] active:brightness-110 shadow-lg shadow-[#D70F64]/10 hover:shadow-[#D70F64]/20 flex items-center justify-center gap-2 cursor-pointer relative overflow-hidden after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0)_65%)] after:opacity-0 after:scale-50 after:transition-[opacity,transform] after:duration-300 after:pointer-events-none active:after:opacity-100 active:after:scale-125 active:after:duration-100"
                >
                  <span>Maza Aa Gaya! (Explore Now)</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Suspense>
  );


  if (showSplash) {
    return (
      <div className={`min-h-screen bg-[#FF2B85] text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans relative overflow-hidden transition-opacity duration-300 ${splashExiting ? "opacity-0" : "opacity-100"}`}>
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-[#D70F64]/60 blur-3xl pointer-events-none" />

        <motion.div
          initial={{ scale: 0.82, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 mb-6 flex flex-col items-center"
        >
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white p-2 shadow-2xl flex items-center justify-center overflow-hidden border-4 border-white/30">
            <img
              src={daduLogo}
              alt="Dadu Food Logo"
              className="w-full h-full object-cover rounded-2xl"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.12, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 space-y-1.5"
        >
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            dadu<span className="font-extrabold text-pink-100">food</span>
          </h1>
          <p className="text-xs font-bold text-white/90 tracking-wide">
            Fresh Food &amp; 297 Groceries Delivered Fast in Dadu
          </p>
        </motion.div>
      </div>
    );
  }

  if (currentUser?.status === "blocked") {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
          <X className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-black mb-3">Number Blocked</h1>
        <p className="text-zinc-400 mb-8 max-w-sm">
          Aapka number block hai. Madad ke liye call karein:<br />
          <strong className="text-white text-lg mt-2 inline-block">03277004471</strong>
        </p>
        <button
          onClick={handleLogout}
          className="bg-zinc-800 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-xs"
        >
          Logout
        </button>
      </div>
    );
  }

  if (isUserOutOfRange && currentUser?.role !== "admin" && currentUser?.role !== "rider") {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 mb-6 rounded-3xl bg-gradient-to-br from-[#D70F64] to-red-500 flex items-center justify-center shadow-2xl shadow-[#D70F64]/20 animate-pulse">
          <MapPin className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-3xl font-black text-white mb-4 tracking-tight">Out of Service Area</h1>
        <p className="text-zinc-400 max-w-sm mx-auto font-medium leading-relaxed mb-8">
          Ye app only dadu city me hai abhi. Hum jald hi aapke area me bhi service shuru karenge!
        </p>
        {currentUser && (
          <button
            onClick={handleLogout}
            className="bg-zinc-800 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-xs"
          >
            Logout
          </button>
        )}
      </div>
    );
  }


  const lockedBanner = currentUser?.status === 'locked' ? (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-[#D70F64] text-white p-4 rounded-2xl shadow-2xl z-[999] flex items-start gap-4">
      <Clock className="w-8 h-8 animate-pulse shrink-0" />
      <div>
        <h3 className="font-black text-lg mb-1 uppercase tracking-tight">Number Under Verification</h3>
        <p className="text-xs font-medium leading-relaxed opacity-90">
          Aapka number verify ho raha hai! Hum aapko call karenge. Call ke baad aap order kar sakenge!
        </p>
      </div>
    </div>
  ) : null;

  if (currentUser && currentUser.status === "blocked" && currentUser.role !== "admin") {
    const isRider = currentUser.role === "rider";
    const contactText = isRider
      ? `Salam Admin, Mera Rider Account (${currentUser.name || "Rider"} - ${currentUser.phone}) block ho gaya hai. Wajah: ${currentUser.blockReason || "No details"}. Kindly check karke unblock kardein.`
      : `Salam Admin, Mera User Account (${currentUser.name || "User"} - ${currentUser.phone}) block ho gaya hai. Wajah: ${currentUser.blockReason || "No details"}. Kindly check karke unblock kardein.`;

    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-zinc-900 border-2 border-red-500/30 rounded-3xl p-6 text-center space-y-6 shadow-2xl animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-red-500"></div>
          
          <div className="mx-auto w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-black text-white uppercase tracking-wider">
              {isRider ? "Rider Account Blocked!" : "User Account Blocked!"}
            </h3>
            <p className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">
              Aapka Account Block Kar Diya Gaya Hai
            </p>
          </div>
          
          <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-2xl text-left space-y-2.5">
            <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-widest block">
              Reason / Wajah:
            </span>
            <p className="text-sm font-bold text-zinc-200 leading-relaxed whitespace-pre-wrap">
              {currentUser.blockReason || "Aapka account temporarily block kiya gaya hai. Contact admin for details."}
            </p>
          </div>

          <div className="space-y-3.5 pt-2">
            <div className="text-xs font-semibold text-zinc-400 leading-normal">
              Account ko unblock karwane ke liye niche diye gaye button pe click karke WhatsApp par rabta karein:
            </div>
            
            <a
              href={`https://wa.me/${deliverySettings?.whatsappNumber || "923277004471"}?text=${encodeURIComponent(contactText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-black py-4.5 px-4 rounded-2xl transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97] active:brightness-110 flex items-center justify-center gap-2.5 cursor-pointer text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/10"
            >
              <span>Contact on WhatsApp</span>
              <span className="font-mono text-[10px] bg-white/20 px-2 py-0.5 rounded-md">03277004471</span>
            </a>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black py-3.5 px-4 rounded-2xl transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97] active:brightness-110 cursor-pointer text-xs uppercase tracking-wider border border-zinc-700"
          >
            Sign Out (Logout Karein)
          </button>
        </div>
      </div>
    );
  }

  if (currentUser?.role === "rider") {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-[#f7f4ee]">
            <AppLoadingState label="Loading Rider Panel..." />
          </div>
        }
      >
        <RiderPanel
          currentUser={currentUser}
          onLogout={handleLogout}
          deliverySettings={deliverySettings}
        />
      </Suspense>
    );
  }

  if (selectedRestaurant !== "All Restaurants") {
    const restaurantDishes = finalDishes.filter((d) => {
      const rName = d.restaurantName?.trim() || "Dadu Fast Food & Kitchen";
      return rName === selectedRestaurant;
    });

    const selectedFoodCategory = foodCategories.find(c => c.name === selectedRestaurant);

    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#f7f4ee] dark:bg-[#0B0B0F]"><AppLoadingState label="Loading…" /></div>}>
        <FoodpandaRestaurantPage
          restaurantName={selectedRestaurant}
          dishes={restaurantDishes}
          deliverySettings={deliverySettings}
          orders={orders}
          initialCategory={initialRestaurantCategory}
          isRestaurantClosed={checkIsRestaurantClosed(selectedRestaurant)}
          bgImageUrl={
            deliverySettings?.restaurantStatuses?.[selectedRestaurant]?.bgImageUrl ||
            deliverySettings?.restaurantStatuses?.[selectedRestaurant]?.imageUrl ||
            restaurantDishes.find(d => d.imageUrl)?.imageUrl ||
            selectedFoodCategory?.bgImageUrl ||
            getDefaultRestaurantImage(selectedRestaurant)
          }
          onBack={() => {
            setSelectedRestaurant("All Restaurants");
            setInitialRestaurantCategory(undefined);
            setActiveRoute("home");
            setActiveModule("food");
          }}
          onOpenShop={(shopName) => {
            setSelectedRestaurant(shopName);
            setInitialRestaurantCategory(undefined);
            window.scrollTo({ top: 0, behavior: "instant" });
          }}
          onAddToCart={handleAddToCart}
          cartItems={cartItems}
          cartCountTotal={cartCountTotal}
          cartPriceTotal={cartPriceTotal}
          onViewCart={() => setIsCartOpen(true)}
          toggleFavorite={toggleFavorite}
          favoriteDishIds={favoriteDishIds}
          isRiderRangeExceeded={isRiderRangeExceeded}
          distanceDisplay={(() => {
            const coords = deliverySettings?.restaurantStatuses?.[selectedRestaurant]?.coords;
            const refCoords = globalCoords || (
              deliverySettings?.baseLocationCoords?.lat && deliverySettings?.baseLocationCoords?.lng
                ? { latitude: deliverySettings.baseLocationCoords.lat, longitude: deliverySettings.baseLocationCoords.lng }
                : { latitude: 26.7323, longitude: 67.7744 }
            );
            if (coords?.lat && coords?.lng) {
              return calculateDistanceKm(refCoords.latitude, refCoords.longitude, coords.lat, coords.lng).toFixed(1) + " km away";
            }
            return null;
          })()}
        />
        {commonModals}
        {lockedBanner}
      </Suspense>
    );
  }

  const isUserAdmin = currentUser?.role === "admin" || currentUser?.role === "staff";
  const isMaintenanceActive = deliverySettings?.isMaintenanceMode === true;



  return (
    <div className="min-h-screen bg-[#f7f4ee] dark:bg-[#0B0B0F] text-[#1f1b16] dark:text-[#F5F5F8] relative pb-28 md:pb-12 flex flex-col font-sans overflow-x-clip">
      {appUpdate && <AppUpdateBanner info={appUpdate} />}
      {/* Skip link — first focusable element (a11y fix 27 Nov 2026); CSS in
          src/index.css (.skip-link). The info-page branch main below has
          id="main-content"; the catalog branch main keeps id=
          "catalog-section" (a live scroll target) and is focused via the
          onClick fallback when "main-content" is not in the DOM. */}
      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          if (!document.getElementById("main-content")) {
            const catalog = document.getElementById("catalog-section");
            if (catalog) {
              e.preventDefault();
              (catalog as HTMLElement).focus();
              catalog.scrollIntoView();
            }
          }
        }}
      >
        Skip to content
      </a>

      {/* Scroll progress bar */}
      <ScrollProgress />

      {/* Welcome Intro Splash — Pink Ripple Opening (brand splash) */}
      <AnimatePresence mode="wait">
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{
              opacity: 0,
              scale: 1.06,
              filter: "blur(6px)",
              transition: { duration: 0.22, ease: "easeOut" },
            }}
            className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden select-none"
            style={{
              background:
                "linear-gradient(160deg, #FF2B85 0%, #E21B70 42%, #C40E5B 74%, #A80B4E 100%)",
            }}
          >
            {/* Soft light blobs for depth */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/15 rounded-full blur-3xl" />
              <div className="absolute -bottom-32 -right-20 w-[28rem] h-[28rem] bg-[#FF7AB8]/25 rounded-full blur-3xl" />
              <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-[#FFD166]/20 rounded-full blur-3xl" />
            </div>

            {/* Expanding ripple rings (the GIF's signature) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0.55, opacity: 0.6 }}
                  animate={prefersReducedMotion ? { scale: 0.55, opacity: 0 } : { scale: 2.1, opacity: 0 }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : {
                          duration: 1.7,
                          repeat: Infinity,
                          delay: i * 0.55,
                          ease: "easeOut",
                        }
                  }
                  className="absolute w-[300px] h-[300px] md:w-[380px] md:h-[380px] rounded-full border-2 border-white/70"
                />
              ))}
              {/* Static faint rings for the layered GIF look */}
              <div className="absolute w-[300px] h-[300px] md:w-[380px] md:h-[380px] rounded-full border border-white/25" />
              <div className="absolute w-[220px] h-[220px] md:w-[280px] md:h-[280px] rounded-full border border-white/30" />
              <div className="absolute w-[150px] h-[150px] md:w-[190px] md:h-[190px] rounded-full border border-white/20" />
            </div>

            {/* Floating food — drifts up around the logo (premium app-opening feel) */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
              {[
                { e: "🍔", left: "12%", size: "text-3xl", dur: 3.4, delay: 0.2 },
                { e: "🍕", left: "82%", size: "text-3xl", dur: 3.8, delay: 0.5 },
                { e: "🍟", left: "22%", size: "text-2xl", dur: 3.1, delay: 0.9 },
                { e: "🥤", left: "72%", size: "text-2xl", dur: 3.6, delay: 1.2 },
                { e: "🍦", left: "38%", size: "text-2xl", dur: 3.2, delay: 1.5 },
                { e: "🍩", left: "62%", size: "text-2xl", dur: 3.9, delay: 0.7 },
              ].map((f, i) => (
                <motion.span
                  key={i}
                  initial={{ y: 40, opacity: 0, rotate: -12 }}
                  animate={prefersReducedMotion ? { y: 0, opacity: 0.9, rotate: 0 } : { y: [40, -90, 40], opacity: [0, 0.95, 0], rotate: [-12, 10, -12] }}
                  transition={prefersReducedMotion ? { duration: 0 } : { duration: f.dur, delay: f.delay, repeat: Infinity, ease: "easeInOut" }}
                  className={`absolute bottom-[18%] ${f.size}`}
                  style={{ left: f.left }}
                >
                  {f.e}
                </motion.span>
              ))}
            </div>

            {/* Delivery scooter rides across the bottom */}
            <motion.div
              initial={{ x: "-20vw", opacity: 0 }}
              animate={prefersReducedMotion ? { x: 0, opacity: 0 } : { x: ["-20vw", "120vw"], opacity: [0, 1, 1, 0] }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 2.4, delay: 0.35, ease: "easeInOut" }}
              className="absolute bottom-6 left-0 text-4xl md:text-5xl pointer-events-none"
              aria-hidden="true"
            >
              🛵
            </motion.div>

            {/* Center content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.12, transition: { duration: 0.18 } }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="relative z-10 flex flex-col items-center justify-center text-white w-full px-4 text-center"
            >
              {/* Logo — pops in with a spring, glossy white ring */}
              <motion.div
                initial={{ scale: 0, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.08 }}
                className="relative mb-6"
              >
                <div className="absolute -inset-3 bg-white/40 blur-2xl rounded-full scale-110 pointer-events-none" />
                <motion.div
                  animate={prefersReducedMotion ? { y: 0 } : { y: [0, -6, 0] }}
                  transition={prefersReducedMotion ? { duration: 0 } : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  className="relative w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden bg-white shadow-[0_20px_60px_rgba(0,0,0,0.35),inset_0_2px_0_rgba(255,255,255,0.9)] border-4 border-white/90 p-1.5"
                >
                  <img
                    src={daduLogo}
                    alt="Dadu Food"
                    className="w-full h-full object-cover rounded-full"
                  />
                  {/* Shine sweep across the logo */}
                  <motion.div
                    animate={prefersReducedMotion ? { x: "0%" } : { x: ["-120%", "120%"] }}
                    transition={prefersReducedMotion ? { duration: 0 } : { duration: 1.6, repeat: Infinity, repeatDelay: 1.4, ease: "easeInOut" }}
                    className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none"
                  />
                </motion.div>
              </motion.div>

              {/* Brand — letters pop in one by one (staggered spring) */}
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1, delay: 0.15 }}
                className="text-4xl md:text-5xl font-black tracking-[0.18em] text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.35)] uppercase"
                aria-label="Dadu Food"
              >
                {"DADU FOOD".split("").map((ch, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 18, scale: 0.6 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 320, damping: 15, delay: 0.15 + i * 0.045 }}
                    className="inline-block"
                  >
                    {ch === " " ? "\u00A0" : ch}
                  </motion.span>
                ))}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.25 }}
                className="text-[11px] md:text-xs text-white/85 font-black uppercase tracking-[0.35em] mt-2"
              >
                Fast Delivery • Dadu City
              </motion.p>

              {/* Slim progress */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="w-full max-w-[240px] mt-8"
              >
                <div className="h-1.5 w-full bg-white/25 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full shadow-[0_0_12px_rgba(255,255,255,0.9)] transition-[width] ease-linear"
                    style={{ width: `${splashProgress}%` }}
                  />
                </div>
                <p className="text-white/80 text-[11px] font-bold tracking-[0.25em] mt-2.5">
                  {splashProgress.toString().padStart(2, "0")}%
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Google Maps Platform Quota Notice Banner */}
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{" "}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{" "}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Offline & Slow-Internet Smart Shield Banner */}
      <NetworkStatusBanner />

      {/* Dynamic Floating Voice Assistant Button (Bottom corner) — opens the AI voice order assistant.
          Hidden when the admin switches voice ordering off (delivery_config.voiceOrderEnabled).
          Raised to bottom-40 / right-5 so it clears the grocery grid's 3rd column, the
          counters, footer-link chevrons and the free-delivery banner corner. */}
      {voiceOrderEnabled && (
      <button
        onClick={() => {
          // Prime the phone's audio inside this tap (a real gesture) —
          // otherwise the ring and the voice start silent on mobile.
          primeAudio();
          setIsVoiceOrderOpen(true);
        }}
        // Moved to the LEFT side (audit 28 Nov #1): on the right it sat on
        // top of product cards' "+" buttons and ate the tap. The "+" buttons
        // live on the right of every card, so the FAB belongs on the left.
        className={`fixed bottom-40 left-5 z-40 bg-[#E21B70] hover:bg-[#C2145E] text-white p-2 rounded-full shadow-lg active:scale-[0.97] transition-[color,background-color,border-color,transform,opacity] duration-180 cursor-pointer flex items-center justify-center border border-white/20 min-h-[44px] min-w-[44px] ${isScrolling ? "opacity-0 pointer-events-none translate-y-3" : "opacity-100"}`}
        title="Voice Assistant — Urdu mein order karein"
        aria-label="Voice Assistant"
      >
        <Phone className="w-6 h-6 text-white" />
      </button>
      )}

      {/* Voice Order Assistant (Urdu, no API key — everything local) */}
      <VoiceOrderModal
        isOpen={isVoiceOrderOpen}
        onClose={() => setIsVoiceOrderOpen(false)}
        menuItems={voiceMenuItems}
        recentOrders={voiceRecentOrders}
        isSignedIn={!!currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOrderReady={handleVoiceOrderReady}
        onRequestLocation={requestLocation}
        userName={currentUser?.name}
        userPhone={currentUser?.phone}
        userProfileText={voiceUserProfile}
        voicePauseMs={voicePauseMs}
        deliveryLocation={
          currentUser?.savedLocation?.area
            ? {
                area: currentUser.savedLocation.area,
                street: currentUser.savedLocation.street || "",
              }
            : manualAddress ||
              (globalCoords ? { area: "GPS Live Location · Dadu", street: "" } : undefined)
        }
      />

      {/* Chat Agent — Munchi as text chat (user 28 Nov 13:39). Same brain
          (/api/voice-chat), same menu, same order flow as the voice agent;
          opened from the home Munchi card. */}
      <ChatAgentModal
        isOpen={isChatAgentOpen}
        onClose={() => setIsChatAgentOpen(false)}
        menuItems={voiceMenuItems}
        recentOrders={voiceRecentOrders}
        isSignedIn={!!currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOrderReady={handleVoiceOrderReady}
        onRequestLocation={requestLocation}
        userName={currentUser?.name}
        userPhone={currentUser?.phone}
        userProfileText={voiceUserProfile}
        deliveryLocation={
          currentUser?.savedLocation?.area
            ? {
                area: currentUser.savedLocation.area,
                street: currentUser.savedLocation.street || "",
              }
            : manualAddress ||
              (globalCoords ? { area: "GPS Live Location · Dadu", street: "" } : undefined)
        }
      />

      {/* Primary Navigation System */}
      {!(isMaintenanceActive && !isUserAdmin) && (
        <FoodpandaHeader
          user={currentUser}
          onOpenAuth={() => setIsAuthOpen(true)}
          onLogout={handleLogout}
          onOpenCart={() => setIsCartOpen(true)}
          cartCount={cartCountTotal}
          cartTotal={cartPriceTotal}
          onOpenAdmin={() => {
            if (isUserAdmin) {
              setIsAdminConsoleOpen(true);
            }
          }}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onOpenHistory={() => setIsHistoryDrawerOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          notifications={notifications}
          onClearNotifications={handleClearNotificationsAll}
          onMarkNotificationAsRead={handleMarkNotificationAsRead}
          onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          onToggleFavorites={() => setShowFavoritesOnly(!showFavoritesOnly)}
          showFavoritesOnly={showFavoritesOnly}
          orders={orders.filter(
            (o) =>
              o.status !== "delivered" &&
              o.status !== "completed" &&
              o.status !== "cancelled",
          )}
          onTrackOrder={(order) => {
            setActiveTrackingOrder(order);
            setIsTrackingModalOpen(true);
          }}
          // Pass open cart triggers depending on current view mode
          onOpenGroceryCart={() => setIsGroceryCartOpen(true)}
          groceryCartCount={groceryCartItems.reduce(
            (acc, i) => acc + i.quantity,
            0,
          )}
          activeModule={activeModule}
          setActiveModule={setActiveModule}
          onResetFoodHome={handleGoToFoodHome}
          onResetGroceryHome={handleGoToGroceryHome}
          onResetPharmacyHome={handleGoToPharmacyHome}
          isLocked={currentUser?.status === 'locked'}
          allOrders={orders}
          onReorder={handleReorder}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onOpenLocation={() => {
            setLocationRequiredForOrder(false);
            setShowLocationPrompt(true);
          }}
          locationLabel={
            manualAddress
              ? `${manualAddress.area}, ${manualAddress.street}`
              : currentUser?.address ||
                (globalCoords ? "GPS Live Location · Dadu" : undefined)
          }
          hasLocation={Boolean(globalCoords || manualAddress || (currentUser?.address && currentUser.address.trim().length >= 6))}
        />
      )}

      {isUserAdmin && isMaintenanceActive && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-center text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 z-50 relative border-b border-amber-600/30">
          <span>SYSTEM IS CURRENTLY IN MAINTENANCE MODE (General users are blocked from ordering)</span>
        </div>
      )}

      {!(isAdminConsoleOpen && isUserAdmin) ? (
        activeInfoPage ? (
          <main id="main-content" tabIndex={-1} className="flex-1 relative z-10">
            <InfoPagesView
              page={activeInfoPage}
              onBack={() => navigateToInfoPage(null)}
              onNavigate={(slug) => navigateToInfoPage(slug)}
            />
          </main>
        ) : isMaintenanceActive && !isUserAdmin ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10 max-w-lg mx-auto my-auto min-h-[70vh] gap-6 relative animate-fade-in">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/30 rounded-2xl flex items-center justify-center border border-rose-100 dark:border-rose-900 animate-bounce shadow-md">
              <Wrench className="w-8 h-8 text-[#D70F64]" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 uppercase">
                Under Maintenance
              </h1>
              <p className="text-[10px] font-bold tracking-widest text-[#D70F64] uppercase">
                Hum jald hi wapas aayenge!
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200/60 dark:border-zinc-800 p-6 rounded-3xl shadow-xl w-full">
              <p className="text-sm text-zinc-650 dark:text-zinc-300 font-extrabold leading-relaxed font-sans">
                {deliverySettings?.maintenanceMessage || "Hum website par maintenance kar rahe hain. Baraye meharbani thori der baad koshish karen!"}
              </p>
            </div>

            <div className="w-full h-[1px] bg-zinc-150 dark:bg-zinc-800 my-1" />

            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-bold leading-normal">
              Order support ya help ke liye hamare WhatsApp helpline par rabta karen.
            </p>

            <div className="flex flex-col gap-3.5 w-full">
              <a
                href={`https://wa.me/${deliverySettings?.whatsappNumber || "923277004471"}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-black py-3.5 px-4 rounded-2xl shadow-lg active:scale-[0.97] active:brightness-110 transition-[color,background-color,border-color,transform,opacity] duration-180 flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
              >
                WhatsApp Helpline
              </a>

              <button
                type="button"
                onClick={() => setIsAuthOpen(true)}
                className="w-full bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-black py-3.5 px-4 rounded-2xl transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97] active:brightness-110 flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider border border-zinc-200/60 dark:border-zinc-750"
              >
                Admin / Staff Login
              </button>
            </div>
          </div>
        ) : activeRoute === "not-found" ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10 max-w-lg mx-auto my-auto min-h-[70vh] gap-6 relative animate-fade-in">
            <div className="w-16 h-16 bg-[#FDF2F6] dark:bg-[#2A121D] rounded-2xl flex items-center justify-center border border-[#F9A8C9]/50 dark:border-[#D70F64]/25 shadow-md">
              <span className="text-2xl font-black text-[#D70F64] dark:text-[#FF4D94]">404</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                Page not found
              </h1>
              <p className="text-sm text-[#5A5A6B] dark:text-[#A3A3B5] leading-relaxed">
                This page doesn&apos;t exist, or it may have moved. Check the link, or head back home to order
                food, groceries and medicines in Dadu.
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full">
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  handleGoToFoodHome();
                }}
                className="w-full bg-[#D70F64] hover:bg-[#B80C54] text-white font-black py-3.5 px-4 rounded-2xl shadow-lg active:scale-[0.97] active:brightness-110 transition-[color,background-color,border-color,transform,opacity] duration-180 flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider relative overflow-hidden after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0)_65%)] after:opacity-0 after:scale-50 after:transition-[opacity,transform] after:duration-300 after:pointer-events-none active:after:opacity-100 active:after:scale-125 active:after:duration-100"
              >
                Back to Dadu Food Home
              </a>
              <div className="flex items-center justify-center gap-4 text-xs font-bold">
                <a
                  href="/grocery"
                  onClick={(e) => {
                    e.preventDefault();
                    handleGoToGroceryHome();
                  }}
                  className="text-[#D70F64] dark:text-[#FF4D94] hover:underline"
                >
                  Grocery Delivery in Dadu
                </a>
                <a
                  href="/pharmacy"
                  onClick={(e) => {
                    e.preventDefault();
                    handleGoToPharmacyHome();
                  }}
                  className="text-[#D70F64] dark:text-[#FF4D94] hover:underline"
                >
                  Medicine Delivery in Dadu
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1">
          <Suspense fallback={<AppLoadingState label="Loading…" />}>
            <AnimatePresence mode="wait">
              {(activeRoute === "restaurants" || activeRoute === "hotels") ? (
                <motion.div
                  key="directory-view"
                  initial={{ opacity: 0, y: 14, scale: 0.995 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.995 }}
                  transition={motionTransition(prefersReducedMotion, viewTransition)}
                >
                  <DirectoryView
                    kind={activeRoute === "hotels" ? "hotels" : "restaurants"}
                    restaurants={
                      activeRoute === "hotels"
                        ? DIRECTORY_RESTAURANTS.filter((r) => r.name === "S M Bilal Hotel")
                        : DIRECTORY_RESTAURANTS
                    }
                    dishCounts={directoryDishCounts}
                    onViewMenu={(restaurantName) => handleRestaurantClick(restaurantName)}
                    onGoHome={handleGoToFoodHome}
                    onGoToPartner={() => navigateToInfoPage("partner-with-us")}
                  />
                </motion.div>
              ) : activeModule === "food" ? (
                <motion.div
                  key="food-module-view"
                  initial={{ opacity: 0, y: 14, scale: 0.995 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.995 }}
                  transition={motionTransition(prefersReducedMotion, viewTransition)}
                >
              <>
                {/* Dadu Food hero banner — Foodpanda-style, richer: headline + rider + 4 service tiles */}
                <section className="max-w-7xl mx-auto px-3.5 sm:px-4 pt-2 pb-1">
                  {/* Hero banner — the user's own artwork (Dadu Food / Fast Delivery / rider on scooter).
                      Text, rider, burger, fries and pizza are all baked into the image, so no
                      headline or rider overlay is rendered on top of it. */}
                  <motion.div
                    className="rounded-[28px] overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.06)] animate-fade-in"
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={motionTransition(prefersReducedMotion, viewTransition)}
                  >
                    <img
                      src="/images/home/hero-banner.jpg"
                      alt="Dadu Food — Fast Delivery, 25–35 min, COD &amp; EasyPaisa"
                      className="w-full h-auto block"
                      loading="eager"
                      decoding="async"
                    />
                  </motion.div>
                    {/* MUNCHI — heavy, prominent chat agent card (user 28 Nov 13:39:
                        call agent ke badle chat agent). Tap to chat with Munchi
                        in Urdu and order by text. Hidden when the admin switches
                        voice ordering off. */}
                    {chatAgentEnabled && (
                      <motion.button
                        type="button"
                        onClick={() => {
                          setIsChatAgentOpen(true);
                        }}
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.15 }}
                        className="relative w-full mt-2 rounded-2xl overflow-hidden text-left cursor-pointer active:scale-[0.99] shadow-[0_6px_18px_rgba(226,27,112,0.30)] border border-[#E21B70]/30 bg-gradient-to-r from-[#E21B70] via-[#D70F64] to-[#B3084C] text-white"
                        aria-label="Munchi se chat karein — Urdu mein order karein"
                      >
                        <div className="flex items-center gap-2.5 p-2.5 sm:p-3">
                          <span className="relative shrink-0">
                            <span className="absolute inset-0 rounded-full bg-white/40 animate-ping" aria-hidden="true" />
                            <img
                              src="/images/munchi.jpg"
                              alt="Munchi — Dadu Food chat agent"
                              className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-white shadow"
                            />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[15px] sm:text-base font-black leading-tight">
                              Munchi se chat karein
                            </span>
                            <span className="block text-[11px] sm:text-xs font-medium text-white/90 leading-tight truncate">
                              Urdu mein likh kar order karein
                            </span>
                          </span>
                          <span className="shrink-0 inline-flex items-center gap-1 bg-white text-[#E21B70] text-xs font-black px-3 py-2 rounded-full shadow active:scale-95 transition">
                            <MessageSquare className="w-3.5 h-3.5" />
                            Chat karein
                          </span>
                        </div>
                      </motion.button>
                    )}
                    <motion.div
                      className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pt-2.5 sm:pt-3"
                      variants={staggerContainer}
                      initial={prefersReducedMotion ? false : "hidden"}
                      animate="show"
                    >
                    <motion.button
                      type="button"
                      variants={heroTile}
                      onClick={() => {
                        setActiveModule("food");
                        setQuickFilter("all");
                        setActiveCategory("All");
                        document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="min-h-[124px] text-left p-4 rounded-2xl bg-white dark:bg-[#14141A] border border-white dark:border-[#272733] hover:border-[#D70F64]/50 shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-[color,background-color,border-color,transform,opacity] duration-180 cursor-pointer active:scale-[0.97] active:brightness-110 flex items-center justify-between gap-2 will-change-transform"
                    >
                      <div className="min-w-0 flex flex-col items-start self-stretch justify-between py-0.5">
                        <div>
                          <span className="block text-sm sm:text-[15px] font-semibold text-[#14141A] dark:text-white leading-tight">
                            Food<br />Delivery
                          </span>
                          <span className="block text-[11px] font-medium text-[#6E6E80] dark:text-[#A1A1B2] mt-1 leading-snug">
                            Hot meals in Dadu
                          </span>
                        </div>
                        <span className="mt-2 inline-flex w-7 h-7 rounded-full bg-[#D70F64] text-white items-center justify-center shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                      <ShimmerImage
                        src="/images/home/burger-3d.jpg"
                        alt="Crispy burger"
                        className="w-[68px] h-[68px] sm:w-[96px] sm:h-[96px] rounded-2xl shrink-0"
                        imgClassName="object-contain"
                        loading="lazy"
                      />
                    </motion.button>

                    <motion.button
                      type="button"
                      variants={heroTile}
                      onClick={handleGoToGroceryHome}
                      className="min-h-[124px] text-left p-4 rounded-2xl bg-white dark:bg-[#14141A] border border-white dark:border-[#272733] hover:border-[#D70F64]/50 shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-[color,background-color,border-color,transform,opacity] duration-180 cursor-pointer active:scale-[0.97] active:brightness-110 flex items-center justify-between gap-2 will-change-transform"
                    >
                      <div className="min-w-0 flex flex-col items-start self-stretch justify-between py-0.5">
                        <div>
                          <span className="block text-sm sm:text-[15px] font-semibold text-[#14141A] dark:text-white leading-tight">
                            Dadu<br />Mart
                          </span>
                          <span className="block text-[11px] font-medium text-[#6E6E80] dark:text-[#A1A1B2] mt-1 leading-snug">
                            335 groceries
                          </span>
                        </div>
                        <span className="mt-2 inline-flex w-7 h-7 rounded-full bg-[#D70F64] text-white items-center justify-center shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                      <ShimmerImage
                        src="/images/home/grocery-cart-3d.jpg"
                        alt="Grocery cart full of fresh groceries"
                        className="w-[68px] h-[68px] sm:w-[96px] sm:h-[96px] rounded-2xl shrink-0"
                        imgClassName="object-contain"
                        loading="lazy"
                      />
                    </motion.button>

                    <motion.button
                      type="button"
                      variants={heroTile}
                      onClick={() => {
                        setActiveModule("food");
                        setQuickFilter("under_300");
                        document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="min-h-[124px] text-left p-4 rounded-2xl bg-white dark:bg-[#14141A] border border-white dark:border-[#272733] hover:border-[#D70F64]/50 shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-[color,background-color,border-color,transform,opacity] duration-180 cursor-pointer active:scale-[0.97] active:brightness-110 flex items-center justify-between gap-2 will-change-transform"
                    >
                      <div className="min-w-0 flex flex-col items-start self-stretch justify-between py-0.5">
                        <div>
                          <span className="block text-sm sm:text-[15px] font-semibold text-[#14141A] dark:text-white leading-tight">
                            Budget<br />Deals
                          </span>
                          <span className="block text-[11px] font-medium text-[#6E6E80] dark:text-[#A1A1B2] mt-1 leading-snug">
                            Under Rs. 300 picks
                          </span>
                        </div>
                        <span className="mt-2 inline-flex w-7 h-7 rounded-full bg-[#D70F64] text-white items-center justify-center shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                      <ShimmerImage
                        src="/images/home/price-tag-3d.jpg"
                        alt="Discount price tag"
                        className="w-[68px] h-[68px] sm:w-[96px] sm:h-[96px] rounded-2xl shrink-0"
                        imgClassName="object-contain"
                        loading="lazy"
                      />
                    </motion.button>

                    <motion.a
                      href={`https://wa.me/${deliverySettings?.whatsappNumber || "923277004471"}?text=${encodeURIComponent(whatsappOrderText)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      variants={heroTile}
                      className="min-h-[124px] text-left p-4 rounded-2xl bg-white dark:bg-[#14141A] border border-white dark:border-[#272733] hover:border-[#25D366]/60 shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-[color,background-color,border-color,transform,opacity] duration-180 cursor-pointer active:scale-[0.97] active:brightness-110 flex items-center justify-between gap-2 will-change-transform"
                    >
                      <div className="min-w-0 flex flex-col items-start self-stretch justify-between py-0.5">
                        <div>
                          <span className="block text-sm sm:text-[15px] font-semibold text-[#14141A] dark:text-white leading-tight">
                            WhatsApp<br />List
                          </span>
                          <span className="block text-[11px] font-medium text-[#6E6E80] dark:text-[#A1A1B2] mt-1 leading-snug">
                            Send list directly
                          </span>
                        </div>
                        <span className="mt-2 inline-flex w-7 h-7 rounded-full bg-[#D70F64] text-white items-center justify-center shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                      <ShimmerImage
                        src="/images/home/whatsapp-logo.jpg"
                        alt="WhatsApp"
                        className="w-[68px] h-[68px] sm:w-[96px] sm:h-[96px] rounded-2xl shrink-0"
                        imgClassName="object-contain"
                        loading="lazy"
                      />
                    </motion.a>
                    </motion.div>
                </section>

                {/* Thin pink route line — the delivery journey in one line */}
                <div aria-hidden="true" className="max-w-7xl mx-auto px-3.5 sm:px-4 mt-3">
                  <div className="border-t-2 border-dotted border-[#E21B70]/40" />
                </div>

                {/* Floating Promo Banner with Live Countdown */}
                {!promoBannerDismissed && (
                  <div className="max-w-7xl mx-auto px-3.5 sm:px-4 mt-3">
                    <div className="bg-[#E21B70] text-white rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-semibold leading-tight">
                            Free delivery over Rs. 1,000
                          </p>
                          <p className="text-[10.5px] text-pink-100 font-medium mt-0.5">
                            Standard Rs. {foodDeliveryFee} delivery fee · Cash on Delivery &amp; Easypaisa
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="bg-white/20 px-2.5 py-1 rounded-lg font-mono text-xs font-black tabular-nums">
                          {String(Math.floor(promoCountdownSec / 3600)).padStart(2, "0")}:
                          {String(Math.floor((promoCountdownSec % 3600) / 60)).padStart(2, "0")}:
                          {String(promoCountdownSec % 60).padStart(2, "0")}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPromoBannerDismissed(true)}
                          aria-label="Dismiss promo banner"
                          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white cursor-pointer transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97] active:brightness-110"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}


                {/* Order Again Horizontal Row (Only if user has past completed/delivered orders) */}
                {(() => {
                  if (!currentUser) return null;
                  const pastOrders = orders
                    .filter(
                      (o) =>
                        o.userId === currentUser.uid &&
                        (o.status === "delivered" || o.status === "completed") &&
                        Array.isArray(o.items) &&
                        o.items.length > 0
                    )
                    .slice(0, 6);
                  if (pastOrders.length === 0) return null;
                  return (
                    <section className="max-w-7xl mx-auto px-3.5 sm:px-4 mt-6">
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-[#14141A] dark:text-[#F5F5F8]">
                          Order Again
                        </h2>
                        <button
                          type="button"
                          onClick={() => setIsHistoryDrawerOpen(true)}
                          className="min-h-[44px] px-2 flex items-center text-xs font-extrabold text-[#D70F64] hover:underline cursor-pointer"
                        >
                          See All
                        </button>
                      </div>
                      <div className="flex items-stretch gap-3 overflow-x-auto pb-1 pr-3 scrollbar-none touch-pan-both overscroll-x-contain">
                        {pastOrders.map((past) => (
                          <div
                            key={`reorder-${past.id}`}
                            className="shrink-0 w-[230px] bg-white dark:bg-[#14141A] border border-[#E6E6EE] dark:border-[#272733] rounded-2xl p-3 flex flex-col justify-between gap-2 shadow-md hover:shadow-lg transition-[color,background-color,border-color,transform,opacity] duration-180"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-extrabold text-[#14141A] dark:text-white line-clamp-2 leading-snug">
                                  {past.items[0]?.restaurantName || "Dadu Food"}
                                </span>
                                <span className="text-[10px] font-mono font-bold text-[#6E6E80] shrink-0">
                                  {formatOrderId(past.id)}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#5A5A6B] dark:text-[#A1A1B2] line-clamp-2 mt-1">
                                {past.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                              </p>
                            </div>
                            <div className="flex items-center justify-between pt-1.5 border-t border-[#F2F2F6] dark:border-[#272733]">
                              <span className="text-xs font-mono font-black text-[#D70F64] tabular-nums">
                                Rs. {past.grandTotal}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleReorder(past)}
                                aria-label={`Reorder ${past.items[0]?.name || "previous order"}`}
                                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#D70F64] hover:bg-[#B80C54] text-white text-[11px] font-extrabold cursor-pointer transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97] active:brightness-110 relative overflow-hidden after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0)_65%)] after:opacity-0 after:scale-50 after:transition-[opacity,transform] after:duration-300 after:pointer-events-none active:after:opacity-100 active:after:scale-125 active:after:duration-100"
                              >
                                Reorder
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })()}

                {/* Scrolling offers ticker */}
                <div className="max-w-7xl mx-auto px-3.5 sm:px-4 mt-3">
                  <div className="overflow-hidden rounded-full">
                    <OffersMarquee
                      items={[
                        "Free delivery over Rs. 1,000",
                        `${deliveryTimeTextSetting || "20–35 min"} delivery`,
                        "Cash on Delivery & Easypaisa",
                        "335 groceries in Dadu",
                        "144 dishes • 3 restaurants",
                        "Station Road • College Road • Shahani Paro",
                        "Fresh, hot & fast — Dadu Food",
                      ]}
                    />
                  </div>
                </div>

                {/* Cuisines Row & Partner Restaurants Strip */}
                <FoodpandaHero
                  activeCategory={activeCategory}
                  setActiveCategory={setActiveCategory}
                  dealConfig={dealConfig}
                  dealTimeLeft={dealTimeLeft}
                  foodCategories={normalizedFoodCategories}
                  heroBgUrl={heroBgUrl}
                >
                <div className="max-w-7xl mx-auto px-3.5 sm:px-4 mt-6 mb-4">
                  <div className="bg-white dark:bg-[#14141A] p-4 sm:p-5 rounded-2xl sm:rounded-3xl space-y-4 border border-[#e8e2d6] dark:border-[#272733] shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#D70F64] flex items-center justify-center text-white shrink-0">
                          <Compass className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h2 className="text-sm font-semibold tracking-tight text-[#111118] dark:text-[#F5F5F8]">
                            Partner Restaurants in Dadu
                          </h2>
                          <p className="text-xs text-[#5A5A6B] dark:text-[#A3A3B5]">
                            Tap any kitchen to browse full menu &amp; live hours — or see all{" "}
                            <a
                              href="/restaurants"
                              onClick={(e) => {
                                e.preventDefault();
                                handleGoToRestaurantsHome();
                              }}
                              className="text-[#D70F64] dark:text-[#FF4D94] font-bold hover:underline"
                            >
                              restaurants in Dadu
                            </a>{" "}
                            and{" "}
                            <a
                              href="/hotels"
                              onClick={(e) => {
                                e.preventDefault();
                                handleGoToHotelsHome();
                              }}
                              className="text-[#D70F64] dark:text-[#FF4D94] font-bold hover:underline"
                            >
                              hotels in Dadu
                            </a>
                            .
                          </p>
                        </div>
                      </div>
                      {selectedRestaurant !== "All Restaurants" && (
                        <button
                          type="button"
                          onClick={() => setSelectedRestaurant("All Restaurants")}
                          className="min-h-[44px] px-3.5 rounded-xl text-xs font-extrabold text-[#D70F64] dark:text-[#FF5C9E] border border-[#D70F64]/30 hover:bg-[#D70F64]/10 transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97] cursor-pointer shrink-0"
                        >
                          All Shops
                        </button>
                      )}
                    </div>

                    <div className="flex items-stretch gap-2.5 overflow-x-auto pb-1 pr-3 scrollbar-none touch-pan-both overscroll-x-contain">
                      <button
                        type="button"
                        onClick={() => setSelectedRestaurant("All Restaurants")}
                        className={`w-[96px] min-h-[96px] rounded-2xl flex flex-col items-center justify-center p-2 font-semibold transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97] shrink-0 cursor-pointer border ${
                          selectedRestaurant === "All Restaurants"
                            ? "bg-[#D70F64] text-white border-[#D70F64] shadow-xs"
                            : "bg-[#F9F9FB] dark:bg-[#1D1D26] text-[#111118] dark:text-[#F5F5F8] border-[#E6E6EE] dark:border-[#272733] hover:border-[#D70F64]/50"
                        }`}
                      >
                        <UtensilsCrossed className="w-5 h-5 mb-1" aria-hidden="true" />
                        <span className="text-[11px] text-center font-extrabold leading-tight">
                          All Shops
                        </span>
                      </button>
                      {isLoadingDishes
                        ? Array.from({ length: 5 }).map((_, idx) => (
                            <div
                              key={`sk-${idx}`}
                              className="w-[104px] h-[108px] rounded-2xl skeleton-box shrink-0"
                            />
                          ))
                        : uniqueRestaurants.map((vendor) => {
                            const vendorImageUrl =
                              deliverySettings?.restaurantStatuses?.[vendor]?.imageUrl ||
                              deliverySettings?.restaurantStatuses?.[vendor]?.bgImageUrl ||
                              dishes.find(d => (d.restaurantName || "Dadu Fast Food & Kitchen") === vendor && d.imageUrl)?.imageUrl ||
                              getDefaultRestaurantImage(vendor);
                            const vendorIsClosed = checkIsRestaurantClosed(vendor);
                            const openStatus = getShopOpenStatus(vendor, deliverySettings, vendorIsClosed);

                            return (
                              <a
                                key={vendor}
                                href={`/shop/${slugifyShop(vendor)}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleRestaurantClick(vendor);
                                }}
                                className={`w-[106px] min-h-[116px] rounded-2xl flex flex-col items-center justify-between p-1.5 transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97] shrink-0 cursor-pointer border overflow-hidden ${
                                  selectedRestaurant === vendor
                                    ? "bg-[#E21B70] text-white border-[#D70F64] shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                                    : "bg-[#F9F9FB] dark:bg-[#1D1D26] text-[#111118] dark:text-[#F5F5F8] border-[#E6E6EE] dark:border-[#272733] hover:border-[#D70F64]/50"
                                }`}
                                title={`${vendor} · ${openStatus.label}`}
                              >
                                <div className="w-full h-[64px] rounded-xl overflow-hidden bg-[#1D1D26] flex items-center justify-center relative">
                                  {vendorImageUrl ? (
                                    <LazyImage
                                      src={vendorImageUrl}
                                      alt={vendor}
                                      className="w-full h-full object-cover"
                                      imgClassName={`object-cover w-full h-full ${!openStatus.isOpen ? "grayscale-[35%] opacity-80" : ""}`}
                                    />
                                  ) : (
                                    <UtensilsCrossed className="w-6 h-6 text-white/80" aria-hidden="true" />
                                  )}
                                  <span
                                    className={`absolute top-1 left-1 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold leading-none flex items-center gap-0.5 shadow-xs ${
                                      openStatus.isOpen
                                        ? "bg-[#15803D] text-white"
                                        : "bg-[#B91C1C] text-white"
                                    }`}
                                  >
                                    {openStatus.isOpen ? "Open" : "Closed"}
                                  </span>
                                </div>
                                <span className={`text-[11px] font-bold text-center line-clamp-2 leading-tight w-full px-0.5 mt-1 ${selectedRestaurant === vendor ? "text-white" : "text-[#111118] dark:text-[#F5F5F8]"}`}>
                                  {vendor}
                                </span>
                              </a>
                            );
                          })}
                    </div>
                  </div>
                </div>
              </FoodpandaHero>

              {/* Today's Deals — auto-playing carousel of real bestsellers */}
              <ScrollReveal className="max-w-7xl mx-auto px-3.5 sm:px-4 mt-6">
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-[#14141A] dark:text-[#F5F5F8]">
                      Today's Deals
                    </h2>
                    <p className="text-[11px] sm:text-xs font-medium text-[#6E6E80] dark:text-[#A1A1B2] mt-0.5">
                      Dadu's favourites, fresh and fast
                    </p>
                  </div>
                  <span className="rounded-full bg-[#E21B70]/10 px-2.5 py-1 text-[11px] font-black text-[#E21B70]">
                    Auto-play
                  </span>
                </div>
                <OffersCarousel dishes={popularDishesForCart} onAdd={handleAddToCart} cartByDishId={cartItemByDishId} onUpdateQuantity={handleUpdateCartQuantity} onSelectDetail={setActiveDetailDish} />
              </ScrollReveal>

              {/* Meal Deals — bundle deals from src/data/deals.ts (10–20% off).
                  Only deals whose dishes all resolve to the live menu render.
                  One tap adds the whole bundle; the saving is applied to the
                  first dish so the cart total equals the deal price. */}
              {availableDeals.length > 0 && (
                <ScrollReveal className="max-w-7xl mx-auto px-3.5 sm:px-4 mt-6">
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-[#14141A] dark:text-[#F5F5F8]">
                        Meal Deals — Save up to 20%
                      </h2>
                      <p className="text-[11px] sm:text-xs font-medium text-[#6E6E80] dark:text-[#A1A1B2] mt-0.5">
                        Bundle price applied in your cart — one tap adds the whole deal
                      </p>
                    </div>
                    <span className="rounded-full bg-[#E21B70]/10 px-2.5 py-1 text-[11px] font-black text-[#E21B70]">
                      Save 10–20%
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableDeals.map(({ deal, items }) => {
                      // "In Cart" state (audit 28 Nov #2): every deal dish
                      // present in the cart at >= the deal quantity (variant
                      // aware via baseDishId) means the deal is already added
                      // — the button becomes "In Cart ✓" so a second tap
                      // cannot silently add the whole bundle again.
                      const dealInCart = items.every(({ dish, qty }) =>
                        cartItems
                          .filter((item) => (item.baseDishId || item.dishId) === dish.id)
                          .reduce((s, item) => s + item.quantity, 0) >= qty
                      );
                      return (
                      <article
                        key={deal.id}
                        className="bg-white dark:bg-[#14141A] border border-[#e8e2d6] dark:border-[#272733] rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex gap-3 p-3"
                      >
                        <ShimmerImage
                          src={items[0].dish.imageUrl || "/images/dishes/pizza.jpg"}
                          alt={deal.title}
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl shrink-0"
                          imgClassName="object-cover"
                          loading="lazy"
                        />
                        <div className="min-w-0 flex-1 flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-[#E21B70]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#E21B70]">
                              {deal.tag}
                            </span>
                            <span className="rounded-full bg-[#15803D]/10 px-2 py-0.5 text-[10px] font-black text-[#15803D] dark:text-[#4ADE80]">
                              Save Rs. {dealSavings(deal)} · {dealDiscountPct(deal)}% off
                            </span>
                          </div>
                          <h3 className="text-sm font-extrabold tracking-tight text-[#14141A] dark:text-white leading-snug mt-1.5">
                            {deal.title}
                          </h3>
                          <p className="text-[11px] sm:text-xs text-[#5A5A6B] dark:text-[#A3A3B5] leading-snug mt-0.5 line-clamp-2">
                            {deal.description}
                          </p>
                          <p className="text-[11px] font-semibold text-[#14141A] dark:text-white mt-1 line-clamp-2">
                            {items.map(({ dish, qty }) => `${qty > 1 ? `${qty}× ` : ""}${dish.name}`).join(" + ")}
                          </p>
                          <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                            <p className="text-sm font-black text-[#14141A] dark:text-white tabular-nums">
                              Rs. {deal.dealPrice}{" "}
                              <span className="text-[11px] font-bold text-[#5A5A6B] dark:text-[#A3A3B5] line-through">
                                Rs. {deal.originalTotal}
                              </span>
                            </p>
                            <button
                              type="button"
                              onClick={() => handleAddDeal(deal)}
                              disabled={dealInCart}
                              aria-label={dealInCart ? `${deal.title} deal is already in your cart` : `Add ${deal.title} deal to cart for Rs. ${deal.dealPrice}`}
                              className={`min-h-[44px] px-4 rounded-xl text-white text-[11px] font-extrabold transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97] active:brightness-110 shrink-0 ${
                                dealInCart
                                  ? "bg-[#15803D] cursor-default opacity-90"
                                  : "bg-[#D70F64] hover:bg-[#B80C54] cursor-pointer"
                              }`}
                            >
                              {dealInCart ? "In Cart ✓" : "Add Deal"}
                            </button>
                          </div>
                        </div>
                      </article>
                      );
                    })}
                  </div>
                </ScrollReveal>
              )}

              {/* Active Order Banner Cards (Horizontal Scroll) */}
              {(() => {
                const activeUserOrders = orders.filter(
                  (o) =>
                    currentUser &&
                    o.userId === currentUser.uid &&
                    o.status !== "delivered" &&
                    o.status !== "completed" &&
                    o.status !== "cancelled",
                );
                if (!currentUser || activeUserOrders.length === 0) return null;

                return (
                  <div className="max-w-7xl mx-auto px-3 sm:px-4 mt-3 sm:mt-4 flex overflow-x-auto gap-3 sm:gap-4 pb-2 pr-3 scrollbar-none snap-x touch-pan-both overscroll-x-contain">
                    {activeUserOrders.map((activeOrderForBanner) => {
                      const getStepProgress = (status: string) => {
                        switch (status) {
                          case "placed":
                          case "pending":
                            return 1;
                          case "accepted":
                          case "confirmed":
                            return 2;
                          case "preparing":
                            return 3;
                          case "out_for_delivery":
                          case "diagnostic_on_way":
                          case "diagnostic_underway":
                            return 4;
                          case "delivered":
                          case "completed":
                            return 5;
                          default:
                            return 1;
                        }
                      };

                      const currentStep = getStepProgress(activeOrderForBanner.status);
                      const isService = activeOrderForBanner.orderType === "service";

                      const stepsList = isService
                        ? [
                            { label: "Booked" },
                            { label: "Accepted" },
                            { label: "Travel" },
                            { label: "Repair" },
                            { label: "Done" },
                          ]
                        : [
                            { label: "Placed" },
                            { label: "Confirmed" },
                            { label: "Preparing" },
                            { label: "Dispatch" },
                            { label: "Enjoy" },
                          ];

                      return (
                        <div
                          key={activeOrderForBanner.id}
                          className="shrink-0 w-[90vw] sm:w-[580px] max-w-full snap-center bg-white dark:bg-[#14141A] border-2 border-[#D70F64] rounded-2xl shadow-sm overflow-hidden transition-[color,background-color,border-color,transform,opacity] duration-180"
                        >
                          {/* Banner Header: Tap-to-track details */}
                          <div
                            onClick={() => {
                              setActiveTrackingOrder(activeOrderForBanner);
                              setIsTrackingModalOpen(true);
                            }}
                            className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#F9F9FB] dark:hover:bg-[#1D1D26] transition-colors duration-300 border-b border-[#E6E6EE] dark:border-[#272733]"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#D70F64]/10 border border-[#D70F64]/25 flex items-center justify-center shrink-0">
                                <Bike className="w-5 h-5 text-[#D70F64]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#D70F64] dark:text-[#FF4D94] flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D] dark:text-[#4ADE80]" />
                                  Live Order Tracking
                                </span>
                                <h4 className="text-xs sm:text-sm font-extrabold text-[#111118] dark:text-[#F5F5F8] mt-0.5 leading-normal truncate">
                                  Order{" "}
                                  <span className="font-mono text-[#5A5A6B] dark:text-[#A3A3B5] font-bold">
                                    {formatOrderId(activeOrderForBanner.id)}
                                  </span>{" "}
                                  •{" "}
                                  <span className="text-[#D70F64] dark:text-[#FF5C9E] uppercase font-bold">
                                    {activeOrderForBanner.status === "payment_verification_pending"
                                      ? "Payment Verification Pending"
                                      : activeOrderForBanner.status === "out_for_delivery"
                                      ? "On Way"
                                      : activeOrderForBanner.status === "preparing"
                                        ? "Cooking"
                                        : activeOrderForBanner.status === "diagnostic_on_way"
                                          ? "Travelling"
                                          : activeOrderForBanner.status === "diagnostic_underway"
                                            ? "Inspecting"
                                            : "Accepted"}
                                  </span>
                                </h4>
                                <span className="text-[10px] text-zinc-600 dark:text-zinc-300 font-bold block mt-0.5 truncate">
                                  {activeOrderForBanner.status === "payment_verification_pending"
                                    ? activeOrderForBanner.paymentReceiptUrl
                                      ? "Easypaisa receipt received — admin verification in progress"
                                      : "Easypaisa payment pending — receipt abhi upload nahi hui"
                                    : activeOrderForBanner.status === "out_for_delivery"
                                    ? "Rider aapka order pick kar chuka hai aur raste me hai!"
                                    : activeOrderForBanner.status === "preparing"
                                      ? "Chef aapka khana fresh tayar kar raha hai"
                                      : activeOrderForBanner.status === "accepted" || activeOrderForBanner.status === "confirmed"
                                        ? "Restaurant ne order confirm kar diya hai"
                                        : activeOrderForBanner.status === "diagnostic_on_way"
                                          ? "Technician aapke ghar ki taraf aa raha hai"
                                          : activeOrderForBanner.status === "diagnostic_underway"
                                            ? "Technician kaam kar raha hai"
                                            : "Order receive ho gaya, jald confirm hoga"}
                                </span>
                                {activeOrderForBanner.riderName ? (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-[9.5px] text-zinc-500 font-extrabold truncate">
                                      Rider:{" "}
                                      <span className="text-[#D70F64] font-black">
                                        {activeOrderForBanner.riderName}
                                      </span>
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[9.5px] text-zinc-400 font-bold block mt-0.5 truncate">
                                    Assigning rider...
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Rider ETA Box */}
                            <div className="shrink-0 bg-[#D70F64] text-white px-3 py-1.5 rounded-2xl text-center shadow-md border border-pink-400/30">
                              <span className="text-[8px] uppercase tracking-wider font-extrabold text-pink-100 block leading-none">
                                Est. Arrival
                              </span>
                              <span className="text-xs sm:text-sm font-black tracking-tight block leading-tight mt-0.5">
                                ⏱️ {activeOrderForBanner.eta || "25 - 35 min"}
                              </span>
                            </div>
                          </div>

                          {/* Live Visual Step Progress Bar */}
                          <div className="px-3.5 py-3 bg-zinc-50/50 border-b border-zinc-100">
                            <div className="relative flex items-center justify-between w-full max-w-xl mx-auto">
                              {/* Horizontal Line background */}
                              <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-1 bg-zinc-200 -z-10 rounded-full" />
                              {/* Animated active filled line */}
                              <div
                                className="absolute left-3 top-1/2 -translate-y-1/2 h-1 bg-[#D70F64] -z-10 rounded-full transition-[width] duration-300 ease-out"
                                style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
                              />

                              {stepsList.map((step, idx) => {
                                const stepNum = idx + 1;
                                const isPassed = currentStep >= stepNum;
                                const isCurrent = currentStep === stepNum;

                                return (
                                  <div key={idx} className="flex flex-col items-center relative z-10">
                                    <div
                                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-black transition-[color,background-color,border-color,transform,opacity] duration-180 shadow-sm ${
                                        isPassed
                                          ? "bg-[#D70F64] text-white ring-2 ring-pink-100"
                                          : "bg-white text-zinc-400 border border-zinc-200"
                                      } ${isCurrent ? "animate-pulse scale-110" : ""}`}
                                    >
                                      {stepNum}
                                    </div>
                                    <span
                                      className={`text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider mt-1 ${
                                        isCurrent ? "text-[#D70F64]" : isPassed ? "text-zinc-700" : "text-zinc-400"
                                      }`}
                                    >
                                      {step.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Quick Actions Footer (Contact Captain / Whatsapp) */}
                          {activeOrderForBanner.riderName && activeOrderForBanner.riderPhone && (
                            <div className="px-3.5 py-2 bg-[#F9F9FB] dark:bg-[#1D1D26] flex items-center justify-between gap-2 border-t border-[#E6E6EE] dark:border-[#272733] overflow-x-auto">
                              <span className="text-[11px] text-[#5A5A6B] dark:text-[#A3A3B5] font-bold flex items-center gap-1 shrink-0 truncate">
                                Rider: {activeOrderForBanner.riderName}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <BannerLiveChatButton
                                  orderId={activeOrderForBanner.id}
                                  currentUserId={currentUser.uid}
                                  onClick={() => {
                                    setActiveTrackingOrder(activeOrderForBanner);
                                    setIsDirectChatOpen(true);
                                  }}
                                />
                                <a
                                  href={`tel:${activeOrderForBanner.riderPhone}`}
                                  className="bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider text-center transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97] cursor-pointer min-h-[44px] inline-flex items-center"
                                >
                                  Call
                                </a>
                                <a
                                  href={`https://wa.me/${activeOrderForBanner.riderPhone.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider text-center transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97] cursor-pointer shadow-2xs min-h-[44px] inline-flex items-center"
                                >
                                  Chat
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Catalog Listing */}
              <main id="catalog-section" tabIndex={-1} className="max-w-7xl mx-auto px-3.5 sm:px-4 py-3">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Left Column: Menu Cards Catalog grid */}
                  <div className="flex-1 space-y-4 min-w-0">

                    {/* 1-Tap Quick Filter Chips Bar (44px+ touch targets) */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1 pr-4 touch-pan-both">
                      {[
                        { id: "all", label: "All Kitchens", icon: UtensilsCrossed },
                        { id: "top_rated", label: "Featured", icon: Flame },
                        { id: "under_300", label: "Under Rs. 300", icon: Zap },
                        { id: "fast_food", label: "Burgers & Fast Food", icon: Sandwich },
                        { id: "desi", label: "Biryani & Karahi", icon: ChefHat },
                        { id: "pizza", label: "Pizzas & Pasta", icon: Pizza },
                        { id: "chai_sweets", label: "Chai & Sweets", icon: Coffee },
                      ].map((chip) => {
                        const active = quickFilter === chip.id;
                        return (
                          <button
                            key={chip.id}
                            type="button"
                            onClick={() => setQuickFilter(chip.id as typeof quickFilter)}
                            className={`inline-flex items-center justify-center gap-1.5 shrink-0 min-h-[44px] px-4 rounded-full text-xs font-semibold tracking-tight transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97] cursor-pointer border ${
                              active
                                ? "bg-[#E21B70] text-white border-[#D70F64] shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                                : "bg-white dark:bg-[#14141A] text-[#111118] dark:text-[#F5F5F8] border-[#E6E6EE] dark:border-[#272733] hover:border-[#D70F64]/60 hover:text-[#D70F64] dark:hover:text-[#FF4D94]"
                            }`}
                          >
                            <chip.icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[#E6E6EE] dark:border-[#272733] pb-2.5">
                      <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#111118] dark:text-[#F5F5F8]">
                        {quickFilter !== "all"
                          ? quickFilter === "top_rated"
                            ? "Featured Picks"
                            : quickFilter === "under_300"
                              ? "Budget Deals (Under Rs. 300)"
                              : quickFilter === "fast_food"
                                ? "Burgers & Fast Food"
                                : quickFilter === "desi"
                                  ? "Biryani & Karahi"
                                  : quickFilter === "pizza"
                                    ? "Pizzas & Pasta"
                                    : "Chai & Sweets"
                          : selectedRestaurant === "All Restaurants"
                            ? activeCategory === "All"
                              ? "Restaurants in Dadu"
                              : activeCategory
                            : selectedRestaurant}{" "}
                        <span className="text-sm font-semibold text-[#5A5A6B] dark:text-[#A3A3B5] tabular-nums">
                          ({selectedRestaurant === "All Restaurants" && activeCategory === "All" && !searchQuery && quickFilter === "all" && !showFavoritesOnly ? `${uniqueRestaurants.length} kitchens` : `${filteredDishes.length} items`})
                        </span>
                      </h2>
                      <div className="flex items-center gap-2">
                        {quickFilter === "all" && selectedRestaurant === "All Restaurants" && (
                          <button
                            type="button"
                            onClick={() => {
                              setQuickFilter("all");
                              setActiveCategory("All");
                              document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" });
                            }}
                            className="min-h-[44px] px-2.5 text-xs font-extrabold text-[#D70F64] dark:text-[#FF4D94] hover:underline cursor-pointer shrink-0"
                          >
                            See All →
                          </button>
                        )}
                        {quickFilter !== "all" && (
                          <button
                            type="button"
                            onClick={() => setQuickFilter("all")}
                            className="min-h-[44px] px-2.5 text-xs font-extrabold text-[#D70F64] dark:text-[#FF4D94] hover:underline cursor-pointer"
                          >
                            Clear Filter ✕
                          </button>
                        )}
                        {searchQuery && (
                          <span className="text-xs text-[#5A5A6B] dark:text-[#A3A3B5] font-semibold">
                            Matching "{searchQuery}"
                          </span>
                        )}
                      </div>
                    </div>

                    {selectedRestaurant === "All Restaurants" && activeCategory === "All" && !searchQuery && quickFilter === "all" && !showFavoritesOnly ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                        {uniqueRestaurants.map((vendor) => {
                            const vendorAllDishes = catalogDishes.filter(
                              (d) =>
                                (d.restaurantName?.trim() || "Dadu Fast Food & Kitchen") ===
                                  vendor &&
                                d.isAvailable !== false &&
                                !d.id.startsWith("drink_") &&
                                d.category !== "Drinks" &&
                                d.category !== "Beverages",
                            );
                            const vendorDishes = [...vendorAllDishes]
                              .sort((a, b) => {
                                if (a.isFeatured !== b.isFeatured) {
                                  return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
                                }
                                const aTime = a.id.startsWith("custom_") ? parseInt(a.id.split("_")[1]) || 0 : 0;
                                const bTime = b.id.startsWith("custom_") ? parseInt(b.id.split("_")[1]) || 0 : 0;
                                if (aTime !== bTime) {
                                  return bTime - aTime;
                                }
                                return String(b.id).localeCompare(String(a.id));
                              })
                              .slice(0, 8);

                            const shopProfile = getShopProfile(vendor, deliverySettings, vendorAllDishes, orders);
                            const isClosed = checkIsRestaurantClosed(vendor);
                            const openStatus = getShopOpenStatus(vendor, deliverySettings, isClosed);

                            const vendorImageUrl =
                              deliverySettings?.restaurantStatuses?.[vendor]?.imageUrl ||
                              deliverySettings?.restaurantStatuses?.[vendor]?.bgImageUrl ||
                              vendorDishes.find((d) => d.imageUrl)?.imageUrl ||
                              getDefaultRestaurantImage(vendor);

                            const vendorCoords = deliverySettings?.restaurantStatuses?.[vendor]?.coords;
                            const refCoords = globalCoords || (
                              deliverySettings?.baseLocationCoords?.lat && deliverySettings?.baseLocationCoords?.lng
                                ? { latitude: deliverySettings.baseLocationCoords.lat, longitude: deliverySettings.baseLocationCoords.lng }
                                : { latitude: 26.7323, longitude: 67.7744 }
                            );
                            const distanceDisplay = vendorCoords?.lat && vendorCoords?.lng
                              ? calculateDistanceKm(refCoords.latitude, refCoords.longitude, vendorCoords.lat, vendorCoords.lng).toFixed(1) + " km"
                              : null;

                            const feeDisplay = isRiderRangeExceeded
                              ? `Rs. ${shopProfile.deliveryFee * 2}`
                              : `Rs. ${shopProfile.deliveryFee}`;

                            return (
                              <a
                                key={vendor}
                                href={`/shop/${slugifyShop(vendor)}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleRestaurantClick(vendor);
                                }}
                                className={`bg-white dark:bg-[#14141A] border border-[#E6E6EE] dark:border-[#272733] rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs hover:shadow-md hover:border-[#D70F64]/40 transition-[color,background-color,border-color,transform,opacity] duration-180 cursor-pointer group flex flex-col ${!openStatus.isOpen ? "opacity-85" : ""}`}
                              >
                                <div className="h-44 bg-[#1D1D26] relative overflow-hidden shrink-0">
                                  {vendorImageUrl ? (
                                    <LazyImage
                                      src={vendorImageUrl}
                                      alt={`${vendor} restaurant in Dadu`}
                                      className="w-full h-full"
                                      imgClassName={`object-cover transition-transform duration-300 ${!openStatus.isOpen ? "grayscale-[35%]" : ""}`}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-[#1D1D26]">
                                      <UtensilsCrossed className="w-8 h-8 text-white/70" aria-hidden="true" />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F]/90 via-[#0B0B0F]/35 to-transparent" />

                                  {/* Live Open / Closed Badge Top Right (Always visible with clear text + icon) */}
                                  <div
                                    className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[11px] font-extrabold shadow-sm flex items-center gap-1 ${
                                      openStatus.isOpen
                                        ? "bg-[#15803D] text-white"
                                        : "bg-[#B91C1C] text-white"
                                    }`}
                                  >
                                    {openStatus.isOpen ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                    ) : (
                                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                                    )}
                                    <span>
                                      {openStatus.label}
                                      {openStatus.detail ? ` · ${openStatus.detail}` : ""}
                                    </span>
                                  </div>

                                  {/* Distance Badge Top Left (Only if real coordinates exist) */}
                                  {distanceDisplay && (
                                    <div className="absolute top-3 left-3 bg-[#0B0B0F]/85 text-white border border-white/15 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 tabular-nums">
                                      <Compass className="w-3.5 h-3.5 text-[#FF4D94]" />
                                      <span>{distanceDisplay}</span>
                                    </div>
                                  )}

                                  <div className="absolute bottom-3 left-4 right-4 text-white">
                                    <h3 className="font-extrabold text-lg sm:text-xl tracking-tight leading-tight mb-0.5">
                                      {vendor}
                                    </h3>
                                    <p className="text-xs text-white/85 line-clamp-1 mb-1.5">
                                      {shopProfile.oneLineDescription}
                                    </p>
                                    <div className="text-[11px] font-bold text-white/95 flex flex-wrap items-center gap-x-2.5 gap-y-1 tabular-nums">
                                      {shopProfile.rating && shopProfile.reviewCount > 0 ? (
                                        <span className="inline-flex items-center bg-black/55 px-1.5 py-0.5 rounded-md">
                                          <Star className="w-3 h-3 text-amber-400 mr-1 fill-current" />
                                          {shopProfile.rating} ({shopProfile.reviewCount})
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center bg-black/55 px-1.5 py-0.5 rounded-md">
                                          {vendorAllDishes.length} dishes available
                                        </span>
                                      )}
                                      <span className="inline-flex items-center">
                                        <Clock className="w-3 h-3 mr-1 text-[#FF4D94]" /> {shopProfile.deliveryTime}
                                      </span>
                                      <span className="inline-flex items-center">
                                        <MapPin className="w-3 h-3 mr-1 text-[#FF4D94]" /> {feeDisplay}
                                        {shopProfile.minOrder !== null ? ` · Min Rs. ${shopProfile.minOrder}` : ""}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="p-3 bg-white dark:bg-[#14141A] flex items-center gap-2.5 overflow-x-auto scrollbar-none border-t border-[#E6E6EE] dark:border-[#272733] touch-pan-both overscroll-x-contain pr-3">
                                  {vendorDishes.map((d) => (
                                      <div
                                      key={d.id}
                                      role="button"
                                      tabIndex={isClosed || d.isAvailable === false ? -1 : 0}
                                      aria-label={`${d.name} at ${vendor} — view menu`}
                                      className="flex flex-col gap-1 w-20 shrink-0 cursor-pointer hover:opacity-85 transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-[#D70F64] rounded-xl"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isClosed && d.isAvailable !== false) {
                                          handleRestaurantClick(vendor, d.category);
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if ((e.key === "Enter" || e.key === " ") && !isClosed && d.isAvailable !== false) {
                                          e.preventDefault();
                                          handleRestaurantClick(vendor, d.category);
                                        }
                                      }}
                                    >
                                      <div className="w-full h-20 rounded-xl overflow-hidden bg-[#F2F2F6] dark:bg-[#1D1D26] border border-[#E6E6EE] dark:border-[#272733]">
                                        <LazyImage
                                          src={
                                            d.imageUrl ||
                                            "/images/dishes/pizza.jpg"
                                          }
                                          alt={`${d.name} at ${vendor} Dadu`}
                                          className="w-full h-full"
                                          imgClassName="object-cover"
                                        />
                                      </div>
                                      <span className="text-[11px] font-bold text-[#111118] dark:text-[#F5F5F8] line-clamp-2 leading-[1.25] min-h-[27px]">
                                        {d.name}
                                      </span>
                                      <span className="text-[11px] text-[#D70F64] dark:text-[#FF4D94] font-extrabold leading-none tabular-nums">
                                        Rs. {d.discountPrice || d.price}
                                      </span>
                                    </div>
                                  ))}
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRestaurantClick(vendor);
                                    }}
                                    className="w-16 h-20 flex flex-col items-center justify-center gap-1 shrink-0 bg-[#D70F64]/10 dark:bg-[#D70F64]/15 rounded-xl text-[#D70F64] dark:text-[#FF4D94] hover:bg-[#D70F64]/20 transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97] border border-[#D70F64]/25 cursor-pointer"
                                  >
                                    <ChevronRight className="w-5 h-5" />
                                    <span className="text-[10px] font-extrabold uppercase tabular-nums">
                                      All ({vendorAllDishes.length})
                                    </span>
                                  </div>
                                </div>
                              </a>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
                        {isLoadingDishes
                        ? <MenuSkeleton count={8} />
                        : visibleFoodDishes.map((dish, idx) => {
                            const dishRestaurantName =
                              dish.restaurantName || "Dadu Fast Food & Kitchen";
                            const isRestaurantClosed =
                              checkIsRestaurantClosed(dishRestaurantName);
                            const openingTime =
                              deliverySettings?.restaurantStatuses?.[
                                dishRestaurantName
                              ]?.openingTime ||
                              deliverySettings?.restaurantStatus?.openingTime;
                            const isFavorite = favoriteDishIdSet.has(dish.id);
                            const cartItem = cartItemByDishId.get(dish.id);
                            const quantityInCart = cartItem ? cartItem.quantity : 0;

                            return (
                              <DashboardMenuItemCard
                                key={dish.id}
                                dish={dish}
                                idx={idx}
                                isRestaurantClosed={isRestaurantClosed}
                                openingTime={openingTime}
                                isFavorite={isFavorite}
                                quantityInCart={quantityInCart}
                                onToggleFavorite={toggleFavorite}
                                onSelectDetail={setActiveDetailDish}
                                onAddToCart={handleAddToCart}
                                onUpdateCartQuantity={handleUpdateCartQuantity}
                              />
                            );
                          })}
                      {!isLoadingDishes && foodBatchHasMore && (
                        <div
                          ref={foodBatchObserverRef}
                          className="col-span-full flex items-center justify-center gap-2 py-4"
                          aria-hidden="true"
                        >
                          <span className="text-xs font-semibold text-[#5A5A6B] dark:text-[#A3A3B5]">
                            Loading more dishes…
                          </span>
                        </div>
                      )}
                      {!isLoadingDishes && !foodBatchHasMore && filteredDishes.length > 0 && (
                        <p className="col-span-full text-center text-[11px] font-semibold text-[#5A5A6B] dark:text-[#A3A3B5] py-2">
                          Showing {visibleFoodDishes.length} of {filteredDishes.length} dishes
                        </p>
                      )}
                      </div>
                    )}

                    {!isLoadingDishes && filteredDishes.length === 0 && (
                      <div className="bg-white dark:bg-[#14141A] border border-[#E6E6EE] dark:border-[#272733] p-8 sm:p-10 rounded-3xl text-center space-y-4 shadow-xs max-w-md mx-auto">
                        <div className="w-14 h-14 bg-[#D70F64]/10 rounded-2xl flex items-center justify-center mx-auto">
                          {showFavoritesOnly ? (
                            <Heart className="w-6 h-6 text-[#D70F64]" aria-hidden="true" />
                          ) : (
                            <UtensilsCrossed className="w-6 h-6 text-[#D70F64]" aria-hidden="true" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-base text-[#111118] dark:text-[#F5F5F8]">
                            {showFavoritesOnly
                              ? "No favorites yet"
                              : "No matching dishes found"}
                          </h3>
                          <p className="text-xs text-[#5A5A6B] dark:text-[#A3A3B5] leading-relaxed mt-1.5 px-2">
                            {showFavoritesOnly
                              ? "Tap the heart icon on any dish to save it to your favorites."
                              : searchQuery
                                ? `No dishes matched "${searchQuery}". Try another keyword or browse all kitchens.`
                                : "No dishes are currently available in this filter."}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setActiveCategory("All");
                            setQuickFilter("all");
                            setShowFavoritesOnly(false);
                          }}
                          className="min-h-[44px] bg-[#D70F64] hover:bg-[#B80C54] text-white font-medium py-2.5 px-6 text-xs rounded-xl cursor-pointer transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97] active:brightness-110 relative overflow-hidden after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0)_65%)] after:opacity-0 after:scale-50 after:transition-[opacity,transform] after:duration-300 after:pointer-events-none active:after:opacity-100 active:after:scale-125 active:after:duration-100"
                        >
                          Show all kitchens
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </main>

                {/* About Dadu Food — homepage copy (SEO: real local keywords, no FAQ section) */}
                <section className="max-w-7xl mx-auto px-3.5 sm:px-4 mt-6">
                  <div className="bg-white dark:bg-[#14141A] p-4 sm:p-5 rounded-2xl sm:rounded-3xl space-y-4 border border-[#e8e2d6] dark:border-[#272733] shadow-xs">
                    <h2 className="text-sm sm:text-base font-semibold tracking-tight text-[#111118] dark:text-[#F5F5F8]">
                      About Dadu Food — Dadu City&apos;s Own Delivery Service
                    </h2>
                    <p className="text-xs sm:text-sm text-[#5A5A6B] dark:text-[#A3A3B5] leading-relaxed">
                      Dadu Food is Dadu city&apos;s own food delivery in Dadu Sindh. Order biryani, zinger burgers,
                      pizza, shawarma and karahi from Dadu Fast Food &amp; Kitchen, S M Bilal Hotel and Tasty Bites
                      Dadu, and get it delivered hot to your door in {deliveryTimeTextSetting || "20–35 minutes"}. When you place an online food order Dadu residents can trust, you pay a flat Rs {foodDeliveryFee} delivery fee and choose Cash on Delivery
                      or Easypaisa — no hidden charges.
                    </p>
                    <p className="text-xs sm:text-sm text-[#5A5A6B] dark:text-[#A3A3B5] leading-relaxed">
                      It is not just food. Our grocery delivery Dadu service brings 335 everyday grocery items in
                      13 categories — atta, rice, cooking oil, tea, milk, spices and more — to your home from the
                      morning, and our medicine delivery Dadu service delivers essential medicines with a lower Rs 30
                      medicine-only delivery fee. We deliver across Dadu city, including Shahani Paro, Moro Road,
                      Station Road and College Road, and you can track every order live until it arrives. Food is
                      served from 12:00 PM to 11:00 PM every day.{" "}
                      <a
                        href="/grocery"
                        onClick={(e) => {
                          e.preventDefault();
                          handleGoToGroceryHome();
                        }}
                        className="text-[#D70F64] dark:text-[#FF4D94] font-bold hover:underline"
                      >
                        Browse groceries
                      </a>{" "}
                      or{" "}
                      <a
                        href="/pharmacy"
                        onClick={(e) => {
                          e.preventDefault();
                          handleGoToPharmacyHome();
                        }}
                        className="text-[#D70F64] dark:text-[#FF4D94] font-bold hover:underline"
                      >
                        order medicines
                      </a>
                      .
                    </p>
                  </div>
                </section>

                {/* Delivery areas in Dadu — homepage copy (SEO: real delivery areas) */}
                <ScrollReveal className="max-w-7xl mx-auto px-3.5 sm:px-4 mt-6">
                  <div className="bg-white dark:bg-[#14141A] p-4 sm:p-5 rounded-2xl sm:rounded-3xl space-y-4 border border-[#e8e2d6] dark:border-[#272733] shadow-xs">
                    <h2 className="text-sm sm:text-base font-semibold tracking-tight text-[#111118] dark:text-[#F5F5F8]">
                      We Deliver Across Dadu City
                    </h2>
                    <p className="text-xs sm:text-sm text-[#5A5A6B] dark:text-[#A3A3B5] leading-relaxed">
                      Our food delivery in Dadu reaches every part of the city — Dadu Food home delivery brings hot
                      meals, groceries and medicines to your door in {deliveryTimeTextSetting || "20–35 minutes"}. Dadu mein khana order karein —
                      choose your meal, pay by Cash on Delivery or Easypaisa, and track it live until it arrives.
                      That is why families across the city call Dadu Food the best food delivery in Dadu.
                    </p>
                    <div className="grid grid-cols-4 gap-2 rounded-2xl bg-[#FFF0F5] dark:bg-[#2A101B] border border-[#E21B70]/15 px-2 py-3">
                      <AnimatedCounter to={335} label="Groceries" />
                      <AnimatedCounter to={144} label="Dishes" />
                      <AnimatedCounter to={3} label="Restaurants" />
                      <AnimatedCounter to={35} suffix=" min" label="Max delivery" />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {deliveryAreasList.map((area) => (
                        <span
                          key={area}
                          className="rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-zinc-700 dark:text-zinc-200"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                </ScrollReveal>

            </>
          </motion.div>
        ) : (
          <motion.div
            key="grocery-module-view"
            initial={{ opacity: 0, y: 16, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.995 }}
            transition={motionTransition(prefersReducedMotion, viewTransition)}
          >
            {activeRoute === "grocery" && (
              <section className="max-w-7xl mx-auto px-3.5 sm:px-4 pt-3.5">
                <div className="bg-[#fdfbf7] dark:bg-[#14141A] p-4 sm:p-5 rounded-2xl sm:rounded-3xl space-y-2 border border-[#e8e2d6] dark:border-[#272733] shadow-xs">
                  <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-[#111118] dark:text-[#F5F5F8]">
                    Grocery Delivery in Dadu
                  </h1>
                  <p className="text-xs sm:text-sm text-[#5A5A6B] dark:text-[#A3A3B5] leading-relaxed">
                    Order from Dadu Food for grocery delivery Dadu families trust — 297 grocery items in 13 categories, including
                    atta, rice, cooking oil, tea, milk, spices, snacks, personal care, cleaning products and
                    household items. Grocery orders can be placed from the morning, delivery is a flat Rs {groceryDeliveryFee} across
                    Dadu city, and you can pay by Cash on Delivery or Easypaisa. Need medicines instead?{" "}
                    <a
                      href="/pharmacy"
                      onClick={(e) => {
                        e.preventDefault();
                        handleGoToPharmacyHome();
                      }}
                      className="text-[#D70F64] dark:text-[#FF4D94] font-bold hover:underline"
                    >
                      Order medicine delivery in Dadu
                    </a>
                    .
                  </p>
                </div>
              </section>
            )}
            {activeRoute === "pharmacy" && (
              <section className="max-w-7xl mx-auto px-3.5 sm:px-4 pt-3.5">
                <div className="bg-white dark:bg-[#14141A] p-4 sm:p-5 rounded-2xl sm:rounded-3xl space-y-2 border border-[#E6E6EE] dark:border-[#272733] shadow-xs">
                  <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-[#111118] dark:text-[#F5F5F8]">
                    Medicine Delivery in Dadu
                  </h1>
                  <p className="text-xs sm:text-sm text-[#5A5A6B] dark:text-[#A3A3B5] leading-relaxed">
                    Order from Dadu Food for medicine delivery Dadu families trust — 11 essential medicines in our Medicine &amp;
                    Pharmacy category, delivered to your home across Dadu city. Medicine-only orders have a lower
                    delivery fee of Rs 30, and you can pay by Cash on Delivery or Easypaisa. Medicine orders can be
                    placed from the morning. For everyday household shopping, see our{" "}
                    <a
                      href="/grocery"
                      onClick={(e) => {
                        e.preventDefault();
                        handleGoToGroceryHome();
                      }}
                      className="text-[#D70F64] dark:text-[#FF4D94] font-bold hover:underline"
                    >
                      grocery delivery in Dadu
                    </a>
                    .
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-[#15803D] dark:text-[#4ADE80] leading-relaxed">
                    Dawaai doctor/pharmacist ki hidayat ke mutabiq istemal karein.
                  </p>
                </div>
              </section>
            )}
            <GroceryModule
              categories={groceryCategories}
              products={groceryProducts}
              isLoading={isLoadingGrocery}
              onAddToCart={handleAddToGroceryCart}
              cartItems={groceryCartItems}
              onUpdateCartQuantity={handleUpdateGroceryCartQuantity}
              onRemoveFromCart={handleRemoveFromGroceryCart}
              searchQuery={debouncedSearchQuery}
              initialCategoryId={activeRoute === "pharmacy" ? "gcat_medicine" : undefined}
              selectedCategoryId={groceryCategoryId}
              onSelectCategory={setGroceryCategoryId}
              showAllCatalog={groceryShowAllCatalog}
              onSetShowAllCatalog={setGroceryShowAllCatalog}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Suspense>
        </div>
        )
      ) : (
        /* TAB 2: Secure Administrative Console Overlay */
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
              <AppLoadingState label="Loading Admin Panel..." />
            </div>
          }
        >
          <AdminPanel
            dishes={dishes}
            orders={orders}
            onClose={() => setIsAdminConsoleOpen(false)}
            adminUsername={currentUser?.name || currentUser?.phone || "Admin"}
            deliverySettings={deliverySettings}
            foodCategories={foodCategories}
            groceryCategories={groceryCategories}
            groceryProducts={groceryProducts}
            groceryDeliveryConfig={groceryDeliveryConfig}
          />
        </Suspense>
      )}

      {commonModals}

      {/* Floating View Cart bar lives in BottomNavBar (single source — do not add a second one here) */}

      {/* Footer with Company, Legal, Partner & Contact Links + Consistent Business Facts */}
      <footer className="max-w-7xl mx-auto w-full px-3.5 sm:px-4 mt-6 pt-8 pb-24 md:pb-10 border-t border-[#E6E6EE] dark:border-[#272733] text-xs text-[#5A5A6B] dark:text-[#A3A3B5]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left mb-6">
          <div className="space-y-2">
            <h3 className="font-extrabold text-sm text-[#111118] dark:text-[#F5F5F8] tracking-tight">
              DADU FOOD
            </h3>
            <p className="text-xs leading-relaxed text-[#5A5A6B] dark:text-[#A3A3B5]">
              {DADU_FOOD_BUSINESS.tagline}
            </p>
          </div>
          <div className="space-y-1.5">
            <h4 className="font-semibold text-[11px] tracking-wide text-[#111118] dark:text-[#F5F5F8] mb-2">
              Company & Legal
            </h4>
            <ul className="divide-y divide-[#e8e2d6] dark:divide-[#272733] text-xs font-semibold">
              <li>
                <a href="/about" onClick={(e) => { e.preventDefault(); navigateToInfoPage("about"); }} className="flex min-h-[44px] items-center justify-between gap-2 py-2 hover:text-[#D70F64] dark:hover:text-[#FF4D94] active:scale-[0.98] transition-[color,transform] cursor-pointer">
                  About Us
                  <ChevronRight className="w-4 h-4 shrink-0 opacity-50" />
                </a>
              </li>
              <li>
                <a href="/contact" onClick={(e) => { e.preventDefault(); navigateToInfoPage("contact"); }} className="flex min-h-[44px] items-center justify-between gap-2 py-2 hover:text-[#D70F64] dark:hover:text-[#FF4D94] active:scale-[0.98] transition-[color,transform] cursor-pointer">
                  Contact & Helpline
                  <ChevronRight className="w-4 h-4 shrink-0 opacity-50" />
                </a>
              </li>
              <li>
                <a href="/terms" onClick={(e) => { e.preventDefault(); navigateToInfoPage("terms"); }} className="flex min-h-[44px] items-center justify-between gap-2 py-2 hover:text-[#D70F64] dark:hover:text-[#FF4D94] active:scale-[0.98] transition-[color,transform] cursor-pointer">
                  Terms & Conditions
                  <ChevronRight className="w-4 h-4 shrink-0 opacity-50" />
                </a>
              </li>
              <li>
                <a href="/privacy-policy" onClick={(e) => { e.preventDefault(); navigateToInfoPage("privacy-policy"); }} className="flex min-h-[44px] items-center justify-between gap-2 py-2 hover:text-[#D70F64] dark:hover:text-[#FF4D94] active:scale-[0.98] transition-[color,transform] cursor-pointer">
                  Privacy Policy
                  <ChevronRight className="w-4 h-4 shrink-0 opacity-50" />
                </a>
              </li>
              <li>
                <a href="/refund-policy" onClick={(e) => { e.preventDefault(); navigateToInfoPage("refund-policy"); }} className="flex min-h-[44px] items-center justify-between gap-2 py-2 hover:text-[#D70F64] dark:hover:text-[#FF4D94] active:scale-[0.98] transition-[color,transform] cursor-pointer">
                  Refund & Cancellation Policy
                  <ChevronRight className="w-4 h-4 shrink-0 opacity-50" />
                </a>
              </li>
              <li>
                <a href="/restaurants" onClick={(e) => { e.preventDefault(); handleGoToRestaurantsHome(); }} className="flex min-h-[44px] items-center justify-between gap-2 py-2 hover:text-[#D70F64] dark:hover:text-[#FF4D94] active:scale-[0.98] transition-[color,transform] cursor-pointer">
                  Restaurants in Dadu
                  <ChevronRight className="w-4 h-4 shrink-0 opacity-50" />
                </a>
              </li>
              <li>
                <a href="/hotels" onClick={(e) => { e.preventDefault(); handleGoToHotelsHome(); }} className="flex min-h-[44px] items-center justify-between gap-2 py-2 hover:text-[#D70F64] dark:hover:text-[#FF4D94] active:scale-[0.98] transition-[color,transform] cursor-pointer">
                  Hotels in Dadu
                  <ChevronRight className="w-4 h-4 shrink-0 opacity-50" />
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-1.5">
            <h4 className="font-semibold text-[11px] tracking-wide text-[#111118] dark:text-[#F5F5F8] mb-2">
              Grow With Dadu Food
            </h4>
            <ul className="divide-y divide-[#e8e2d6] dark:divide-[#272733] text-xs font-semibold">
              <li>
                <a href="/partner-with-us" onClick={(e) => { e.preventDefault(); navigateToInfoPage("partner-with-us"); }} className="flex min-h-[44px] items-center justify-between gap-2 py-2 hover:text-[#D70F64] dark:hover:text-[#FF4D94] active:scale-[0.98] transition-[color,transform] cursor-pointer">
                  Register Your Restaurant
                  <ChevronRight className="w-4 h-4 shrink-0 opacity-50" />
                </a>
              </li>
              <li>
                <a href="/become-a-rider" onClick={(e) => { e.preventDefault(); navigateToInfoPage("become-a-rider"); }} className="flex min-h-[44px] items-center justify-between gap-2 py-2 hover:text-[#D70F64] dark:hover:text-[#FF4D94] active:scale-[0.98] transition-[color,transform] cursor-pointer">
                  Become a Delivery Rider
                  <ChevronRight className="w-4 h-4 shrink-0 opacity-50" />
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-1.5 text-xs">
            <h4 className="font-semibold text-[11px] tracking-wide text-[#111118] dark:text-[#F5F5F8] mb-2">
              Dadu City Support
            </h4>
            <p className="font-semibold text-[#111118] dark:text-[#F5F5F8]">
              {DADU_FOOD_BUSINESS.address}
            </p>
            <p>Hours: {DADU_FOOD_BUSINESS.openingHoursDisplay}</p>
            <p>
              Helpline:{" "}
              <a
                href={`https://wa.me/${deliverySettings?.whatsappNumber || "923277004471"}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#D70F64] dark:text-[#FF4D94] hover:underline font-bold min-h-[24px] inline-flex items-center"
              >
                {DADU_FOOD_BUSINESS.phoneDisplay} (Call / WhatsApp)
              </a>
            </p>
            <p className="tabular-nums">Delivery: Food Rs. {foodDeliveryFee} · Grocery Rs. {groceryDeliveryFee} · Medicine Rs. {medicineDeliveryFee} · 2x below Rs. 500 · Free Rs. 1,000+ · Site Tax Rs. {siteTaxAmount} per order</p>
          </div>
        </div>
        {/* Popular in Dadu — crawlable links to shops, grocery & pharmacy */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6 text-xs font-semibold">
          <span className="font-semibold text-[11px] tracking-wide text-[#111118] dark:text-[#F5F5F8]">
            Popular in Dadu:
          </span>
          <a href="/grocery" onClick={(e) => { e.preventDefault(); handleGoToGroceryHome(); }} className="hover:text-[#D70F64] dark:hover:text-[#FF4D94] cursor-pointer min-h-[24px] inline-flex items-center">
            Grocery Delivery in Dadu
          </a>
          <a href="/pharmacy" onClick={(e) => { e.preventDefault(); handleGoToPharmacyHome(); }} className="hover:text-[#D70F64] dark:hover:text-[#FF4D94] cursor-pointer min-h-[24px] inline-flex items-center">
            Medicine Delivery in Dadu
          </a>
          <a href="/shop/dadu-fast-food-kitchen" onClick={(e) => { e.preventDefault(); handleRestaurantClick("Dadu Fast Food & Kitchen"); }} className="hover:text-[#D70F64] dark:hover:text-[#FF4D94] cursor-pointer min-h-[24px] inline-flex items-center">
            Dadu Fast Food &amp; Kitchen
          </a>
          <a href="/shop/s-m-bilal-hotel" onClick={(e) => { e.preventDefault(); handleRestaurantClick("S M Bilal Hotel"); }} className="hover:text-[#D70F64] dark:hover:text-[#FF4D94] cursor-pointer min-h-[24px] inline-flex items-center">
            S M Bilal Hotel
          </a>
          <a href="/shop/tasty-bites-dadu" onClick={(e) => { e.preventDefault(); handleRestaurantClick("Tasty Bites Dadu"); }} className="hover:text-[#D70F64] dark:hover:text-[#FF4D94] cursor-pointer min-h-[24px] inline-flex items-center">
            Tasty Bites Dadu
          </a>
        </div>
        <div className="pt-4 border-t border-[#E6E6EE] dark:border-[#272733] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <p className="font-bold text-[#111118] dark:text-[#F5F5F8]">
            © {new Date().getFullYear()} Dadu Food Delivery Services. All Rights Reserved.
          </p>
          <p className="text-[#5A5A6B] dark:text-[#A3A3B5]">
            Serving Station Road, Makhdoom Bilawal Nagar, Civil Hospital Road & all of Dadu City
          </p>
        </div>
      </footer>

      {/* Restaurant Opening Animation 3D High-Level */}
      <AnimatePresence>
        {animatingRestaurant && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
            style={{ perspective: 1500 }}
          >
            {/* Cinematic Dark Glass Backdrop */}
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(20px)" }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)", transition: { duration: 0.15 } }}
              className="absolute inset-0 bg-black/60 z-0"
            />
            
            {/* Animated Mesh/Orb Gradients */}
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute inset-0 flex items-center justify-center z-0"
            >
              <motion.div 
                animate={{ rotate: 360, scale: [1, 1.1, 1] }} 
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] bg-gradient-to-tr from-[#E21B70] to-[#7209b7] rounded-full blur-[100px] opacity-60"
              />
              <motion.div 
                animate={{ rotate: -360, scale: [1, 1.2, 1] }} 
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                className="absolute w-[60vw] h-[60vw] max-w-[400px] max-h-[400px] bg-gradient-to-bl from-[#f72585] to-[#4cc9f0] rounded-full blur-[80px] opacity-50 mix-blend-screen"
              />
            </motion.div>

            {/* Portal Ring */}
            <motion.div
              initial={{ scale: 0, opacity: 0, rotateX: 60 }}
              animate={{ scale: 1, opacity: 1, rotateX: 0 }}
              exit={{ scale: 2, opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.3, type: "spring", bounce: 0.2 }}
              className="absolute w-[300px] h-[300px] md:w-[400px] md:h-[400px] rounded-full border border-white/20 shadow-[0_0_80px_rgba(215,15,100,0.5)] z-0"
              style={{ background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)" }}
            />

            {/* Main Content Floating */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5, rotateY: -30, z: -400 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0, z: 0 }}
              exit={{ opacity: 0, scale: 1.2, rotateY: 15, z: 200, filter: "blur(15px)", transition: { duration: 0.15 } }}
              transition={{ duration: 0.25, type: "spring", bounce: 0.3 }}
              className="relative z-10 flex flex-col items-center justify-center text-white w-full px-4"
            >
              {/* Logo Presentation */}
              <motion.div 
                animate={{ y: [-4, 4, -4], rotateZ: [-1, 1, -1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="relative mb-8 group"
              >
                {/* Glow Behind Logo */}
                <div className="absolute -inset-4 bg-white/20 blur-2xl rounded-full scale-110 opacity-70 group-hover:opacity-100 transition duration-300" />
                
                {/* 3D Glassmorphic Frame */}
                <motion.div 
                   transition={{ type: "spring", bounce: 0.5 }}
                   className="w-40 h-40 rounded-[2.5rem] overflow-hidden bg-white/10 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.4)] relative z-10 border border-white/30 p-2 transform-gpu"
                >
                  <div className="w-full h-full rounded-[2rem] overflow-hidden bg-white relative">
                    {animatingRestaurant.imageUrl ? (
                      <img src={animatingRestaurant.imageUrl} alt={animatingRestaurant.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center text-7xl font-black text-[#E21B70] shadow-inner">
                        {animatingRestaurant.name.charAt(0)}
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
              
              <motion.h2 
                initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.1, duration: 0.25, type: "spring", bounce: 0.3 }}
                className="text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 mb-6 text-center drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] leading-tight"
              >
                {animatingRestaurant.name}
              </motion.h2>
              
              {/* High-tech Loading Indicator */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.8, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: 180 }}
                transition={{ delay: 0.15, duration: 0.25, type: "spring" }}
                className="relative h-1.5 bg-black/40 rounded-full overflow-hidden backdrop-blur-sm border border-white/10 shadow-[0_0_15px_rgba(215,15,100,0.3)]"
              >
                <motion.div 
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-[#4cc9f0] to-transparent"
                />
                <motion.div 
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ duration: 0.6, delay: 0.3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-[#f72585] to-transparent"
                />
              </motion.div>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-3 text-[10px] font-bold uppercase tracking-[0.3em] text-white/60"
              >
                Preparing Experience
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PWA Install Bubble — docked just above the bottom nav (or above the
          View Cart bar when the cart has items) so it never floats over
          product cards; 44px tall with a 44×44 dismiss target. Auto-hides
          after 8s and while scrolling. */}
      <AnimatePresence>
        {showInstallBubble && !Capacitor.isNativePlatform() && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: -50 }}
            animate={{ opacity: isScrolling ? 0 : 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -50 }}
            style={{ pointerEvents: isScrolling ? "none" : "auto" }}
            className={`fixed ${cartCountTotal > 0 ? 'bottom-[140px]' : 'bottom-[76px]'} left-4 z-40 md:hidden bg-zinc-900/90 backdrop-blur-md border border-zinc-800 shadow-xl rounded-full p-1.5 min-h-[44px] flex items-center gap-1 hover:bg-zinc-800 transition-[color,background-color,border-color,transform,opacity] duration-180`}
          >
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 cursor-pointer active:scale-[0.97] min-h-[44px]"
            >
              <span className="w-5 h-5 rounded-md overflow-hidden shrink-0">
                <img src={daduLogo} alt="Logo" className="w-full h-full object-cover" />
              </span>
              <span className="text-zinc-200 font-medium text-[11px] pr-1">Install</span>
            </button>
            <button
              type="button"
              aria-label="Dismiss install prompt"
              onClick={() => setShowInstallBubble(false)}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer transition-[color,background-color] duration-180"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Mixed food/grocery basket confirm — styled in-app modal (audit 28
          Nov #8). Replaces the raw system window.confirm("DISALLOW MIXED
          BASKET!"). */}
      <AnimatePresence>
        {mixedCartConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
            onClick={() => setMixedCartConfirm(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={springSnappy}
              className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#1B1B23] p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-extrabold text-[#14141A] dark:text-white">
                {mixedCartConfirm.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5A5A6B] dark:text-[#A3A3B5]">
                {mixedCartConfirm.message}
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const action = mixedCartConfirm.onConfirm;
                    setMixedCartConfirm(null);
                    action();
                  }}
                  className="min-h-[48px] w-full rounded-2xl bg-[#D70F64] text-sm font-extrabold text-white cursor-pointer active:scale-[0.98]"
                >
                  {mixedCartConfirm.confirmLabel}
                </button>
                <button
                  type="button"
                  onClick={() => setMixedCartConfirm(null)}
                  className="min-h-[48px] w-full rounded-2xl bg-[#F1F1F4] dark:bg-[#2A2A35] text-sm font-bold text-[#14141A] dark:text-white cursor-pointer active:scale-[0.98]"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showLocationPrompt && (
          <LocationPermissionModal
            onAllow={requestLocation}
            onLater={() => {
              setShowLocationPrompt(false);
              setLocationPromptDismissed(true);
              setLocationRequiredForOrder(false);
            }}
            onManualAddressSave={handleManualAddressSave}
            onPickOnMap={() => setIsUserMapPickerOpen(true)}
            requireForOrder={locationRequiredForOrder}
          />
        )}
        <Suspense fallback={null}>
          <MapLocationPickerModal
            isOpen={isUserMapPickerOpen}
            onClose={() => setIsUserMapPickerOpen(false)}
            initialLat={globalCoords?.latitude ?? null}
            initialLng={globalCoords?.longitude ?? null}
            onSaveLocation={handleMapLocationSave}
            title="Apni Location Map Pe Chunein"
          />
        </Suspense>
      </AnimatePresence>
    </div>
  );
}
