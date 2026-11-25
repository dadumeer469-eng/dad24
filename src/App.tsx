import LocationPermissionModal from "./components/LocationPermissionModal";
import React, { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { DashboardMenuItemCard } from "./components/DashboardMenuItemCard";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from "firebase/auth";
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
} from "firebase/firestore";
import { auth, db, handleFirestoreError, cleanObject } from "./firebase";
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
} from "./types";
import { INITIAL_MENU_ITEMS, DEFAULT_FOOD_CATEGORIES, getDefaultRestaurantImage } from "./data";

// Import modules
import FoodpandaHeader from "./components/FoodpandaHeader";
import FoodpandaHero from "./components/FoodpandaHero";
import BannerCarousel from "./components/BannerCarousel";
import CartDrawer from "./components/CartDrawer";
import OrderTracker from "./components/OrderTracker";
import AdminPanel from "./components/AdminPanel";
import AuthModal from "./components/AuthModal";
import RiderPanel from "./components/RiderPanel";
import FoodDetailModal from "./components/FoodDetailModal";
import GroceryModule from "./components/GroceryModule";
import GroceryCartDrawer from "./components/GroceryCartDrawer";
import OrderSuccessAnimation from "./components/OrderSuccessAnimation";
import OrderHistoryDrawer from "./components/OrderHistoryDrawer";
import OrderChat from "./components/OrderChat";
import BottomNavBar from "./components/BottomNavBar";
import MobileAccountDrawer from "./components/MobileAccountDrawer";
import { LazyImage } from "./components/LazyImage";
import DaduLogoLoader from "./components/DaduLogoLoader";
import NetworkStatusBanner from "./components/NetworkStatusBanner";
import { CustomerSettingsModal } from "./components/CustomerSettingsModal";
import { InfoPagesView } from "./components/InfoPagesView";
import { HomeFaqAeoSection } from "./components/HomeFaqAeoSection";
import WhatsAppListOrderCard from "./components/WhatsAppListOrderCard";
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
  Sparkles,
  CheckSquare,
  Wrench,
  HeartHandshake,
  UtensilsCrossed,
  Compass,
  MapPin,
  Heart,
  LogOut,
  Home,
  ArrowLeft,
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
      className="bg-[#E21B70] hover:bg-[#C2145E] text-white px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider text-center transition cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1.5 relative"
    >
      <span>💬 Live Chat</span>
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

export default function App() {
  useMemoryMonitor("App");
  const [showSplash, setShowSplash] = useState(() => {
    return typeof window !== "undefined" && !sessionStorage.getItem("dadu_splash_seen");
  });
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

  const initialDishes = getCachedData<Dish[]>("dadu_cached_dishes", INITIAL_MENU_ITEMS);
  const [dishes, setDishes] = useState<Dish[]>(() => initialDishes && initialDishes.length > 0 ? initialDishes : INITIAL_MENU_ITEMS);
  const [isLoadingDishes, setIsLoadingDishes] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [deliverySettings, setDeliverySettings] = useState<SystemSettings>(() => 
    getCachedData<SystemSettings>("dadu_cached_delivery_settings", {
      deliveryFee: 50,
      restaurantStatus: {
        isTemporarilyUnavailable: false,
        openingTime: "09:00",
        closingTime: "23:00",
      },
    })
  );

  // Favorites and Deal of the Hour configuration
  const [favoriteDishIds, setFavoriteDishIds] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isExitConfirmationOpen, setIsExitConfirmationOpen] = useState(false);
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

  // Standalone Grocery Module states (honest empty defaults — never inject invented fallback products)
  const initialGroceryProducts = getCachedData<GroceryProduct[]>("dadu_cached_grocery_products", []).filter(
    (item) => item && !String(item.id || "").startsWith("gprod_"),
  );
  const [activeModule, setActiveModule] = useState<"food" | "grocery">("food");
  const [foodCategories, setFoodCategories] = useState<FoodCategory[]>(() =>
    getCachedData<FoodCategory[]>("dadu_cached_food_categories", DEFAULT_FOOD_CATEGORIES as any),
  );
  const [groceryCategories, setGroceryCategories] = useState<GroceryCategory[]>(() =>
    getCachedData<GroceryCategory[]>("dadu_cached_grocery_categories", []).filter(
      (cat) => cat && !String(cat.id || "").startsWith("gcat_"),
    ),
  );
  const [groceryProducts, setGroceryProducts] = useState<GroceryProduct[]>(() => initialGroceryProducts);
  const [isLoadingGrocery, setIsLoadingGrocery] = useState(false);
  const [groceryDeliveryConfig, setGroceryDeliveryConfig] =
    useState<GroceryDeliveryConfig>({
      baseDeliveryFee: 40,
      freeDeliveryAboveAmount: 1000,
      allowMixedCart: true,
    });
  const [groceryCartItems, setGroceryCartItems] = useState<GroceryOrderItem[]>(
    [],
  );
  const [isGroceryCartOpen, setIsGroceryCartOpen] = useState(false);

  // Navigation / Toggles
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<string>("All Restaurants");
  const [initialRestaurantCategory, setInitialRestaurantCategory] = useState<string | undefined>(undefined);
  
  const [animatingRestaurant, setAnimatingRestaurant] = useState<{name: string, imageUrl?: string} | null>(null);

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
    
    setAnimatingRestaurant({ name: vendor, imageUrl: vendorImageUrl });
    
    setTimeout(() => {
      if (category) setInitialRestaurantCategory(category);
      setSelectedRestaurant(vendor);
      window.scrollTo({ top: 0, behavior: "instant" });
      setTimeout(() => {
        setAnimatingRestaurant(null);
      }, 150);
    }, 380);
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<
    "all" | "top_rated" | "under_300" | "fast_food" | "desi" | "pizza" | "chai_sweets"
  >("all");
  const prevOrderStatusesRef = useRef<Record<string, string>>({});
  const prevUnreadCountRef = useRef<number>(0);
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<Order | null>(
    null,
  );

  // Modal Openings
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAdminConsoleOpen, setIsAdminConsoleOpen] = useState(false);
  const [activeDetailDish, setActiveDetailDish] = useState<Dish | null>(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [isDirectChatOpen, setIsDirectChatOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSignOutConfirmOpen, setIsSignOutConfirmOpen] = useState(false);
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

  const handleLanguageChange = (lang: "en" | "ur") => {
    setLanguage(lang);
    localStorage.setItem("dadu_language", lang);
  };

  const navigateToInfoPage = (slug: InfoPageSlug | null) => {
    setActiveInfoPage(slug);
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
    setActiveModule("grocery");
    setSearchQuery("");
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
  } | null>(null);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBubble, setShowInstallBubble] = useState(false);

  // Global Location State
  const [globalCoords, setGlobalCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationPromptDismissed, setLocationPromptDismissed] = useState(false);
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);

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

  useEffect(() => {
    // Wait for splash screen to finish
    if (showSplash) return;
    if (locationPromptDismissed) return;
    if (globalCoords) return;

    // Check if permission already granted or prompt needed
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      if (result.state === 'granted') {
        navigator.geolocation.getCurrentPosition(
          (pos) => setGlobalCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          () => {},
          { enableHighAccuracy: true }
        );
      } else if (result.state === 'prompt') {
        // Show our custom modal before requesting
        setShowLocationPrompt(true);
      }
    }).catch(() => {
      // Fallback if permissions API not supported
      setShowLocationPrompt(true);
    });
  }, [showSplash, locationPromptDismissed, globalCoords]);

  const requestLocation = () => {
    setShowLocationPrompt(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => setGlobalCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => console.log("Location denied or error:", err),
      { enableHighAccuracy: true }
    );
  };

  // Continuous real-time geolocation watch to keep globalCoords updated
  useEffect(() => {
    if (showSplash) return;
    
    let watchId: number | null = null;
    
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newLat = pos.coords.latitude;
          const newLng = pos.coords.longitude;
          
          setGlobalCoords((prev) => {
            if (!prev) return { latitude: newLat, longitude: newLng };
            const distKm = calculateDistanceKm(prev.latitude, prev.longitude, newLat, newLng);
            // Only update state if position moved at least 10 meters (0.01 km) to avoid unnecessary re-renders
            if (distKm >= 0.01) {
              return { latitude: newLat, longitude: newLng };
            }
            return prev;
          });
        },
        (err) => console.log("Real-time watch location error:", err),
        { enableHighAccuracy: false, timeout: 20000, maximumAge: 10000 }
      );
    }
    
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [showSplash]);

  // Synchronize live GPS pinpoint coordinates to Firestore when they change
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
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    if (!isStandalone) {
      setShowInstallBubble(true);
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
        alert("Aapka number verify ho gaya! Ab aap order kar sakte hain! 🎉");
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

    let animationFrameId: number;
    const startTime = performance.now();
    const duration = 350; // Ultra fast 0.35s

    const updateProgress = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(Math.floor((elapsed / duration) * 100), 100);
      setSplashProgress(progress);

      if (progress < 100) {
        animationFrameId = requestAnimationFrame(updateProgress);
      } else {
        sessionStorage.setItem("dadu_splash_seen", "1");
        setTimeout(() => {
          setShowSplash(false);
        }, 50);
      }
    };

    animationFrameId = requestAnimationFrame(updateProgress);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // 2. Real-time Menu Listening & Auto-Seeding with persistent instant cache
  useEffect(() => {
    console.log("Trace: Initializing Menu collection listener...");
    const unsubscribe = onSnapshot(
      collection(db, "menu"),
      async (snapshot) => {
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
          preloadImages(list.slice(0, 20).map((d) => d.imageUrl));
        }
      },
      (err) => {
        console.warn("Menu listening notice:", handleFirestoreError(err));
        setIsLoadingDishes(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // 3. Real-time Delivery Settings Listening
  useEffect(() => {
    console.log("Trace: Initializing Delivery Settings collection listener...");
    const unsubscribe = onSnapshot(
      doc(db, "settings", "delivery_config"),
      (docSnap) => {
        console.log(
          "Trace: Delivery Settings snapshot received, exists:",
          docSnap.exists(),
        );
        if (docSnap.exists()) {
          const data = docSnap.data() as SystemSettings;
          setDeliverySettings(data);
          setCachedData("dadu_cached_delivery_settings", data);
        } else {
          // Seed default safely with merge: true so existing statuses/pictures are never wiped
          const defaultCfg = {
            deliveryFee: 50,
            restaurantStatus: {
              isTemporarilyUnavailable: false,
              openingTime: "09:00",
              closingTime: "23:00",
            },
          };
          setDoc(doc(db, "settings", "delivery_config"), defaultCfg, { merge: true }).catch(console.error);
        }
      },
      (err) => {
        console.warn(
          "Delivery config subscription error:",
          handleFirestoreError(err),
        );
      },
    );

    return () => unsubscribe();
  }, []);

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

  // 3a. Real-time Food Categories Listening
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "foodCategories"),
      async (snapshot) => {
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
              color: "from-[#E21B70] to-[#f22c80]",
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
              color: "#E21B70",
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
        }
      },
      (err) => {
        console.warn("Food categories notice:", handleFirestoreError(err));
      },
    );
    return () => unsubscribe();
  }, []);

  // 3b. Real-time Grocery Categories Listening
  useEffect(() => {
    console.log("Trace: Initializing GroceryCategories collection listener...");
    const unsubscribe = onSnapshot(
      collection(db, "groceryCategories"),
      (snapshot) => {
        console.log(
          "Trace: GroceryCategories snapshot received, size:",
          snapshot.size,
        );
        const list: GroceryCategory[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as GroceryCategory);
        });
        list.sort((a, b) => (a.position || 0) - (b.position || 0));
        setGroceryCategories(list);
        setCachedData("dadu_cached_grocery_categories", list);
        setIsLoadingGrocery(false);
      },
      (err) => {
        console.warn("Grocery categories notice:", handleFirestoreError(err));
        setIsLoadingGrocery(false);
      },
    );
    return () => unsubscribe();
  }, []);

  // 3b. Real-time Grocery Products Listening
  useEffect(() => {
    console.log("Trace: Initializing GroceryProducts collection listener...");
    const unsubscribe = onSnapshot(
      collection(db, "groceryProducts"),
      (snapshot) => {
        console.log(
          "Trace: GroceryProducts snapshot received, size:",
          snapshot.size,
        );
        const list: GroceryProduct[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as GroceryProduct);
        });
        setGroceryProducts(list);
        setCachedData("dadu_cached_grocery_products", list);
        setIsLoadingGrocery(false);
        preloadImages(list.slice(0, 20).map((p) => p.imageUrl));
      },
      (err) => {
        console.warn("Grocery products notice:", handleFirestoreError(err));
        setIsLoadingGrocery(false);
      },
    );
    return () => unsubscribe();
  }, []);

  // 3c. Real-time Grocery Delivery Config Listening
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "settings", "groceryDeliveryConfig"),
      (docSnap) => {
        if (docSnap.exists()) {
          setGroceryDeliveryConfig(docSnap.data() as GroceryDeliveryConfig);
        } else {
          // Seed default
          setDoc(doc(db, "settings", "groceryDeliveryConfig"), {
            baseDeliveryFee: 40,
            freeDeliveryAboveAmount: 1000,
            allowMixedCart: true,
          }).catch(console.warn);
        }
      },
      (err) => {
        console.warn("Grocery delivery config notice:", handleFirestoreError(err));
      },
    );
    return () => unsubscribe();
  }, []);

  // 3d. Real-time Deal of the Hour Config Listening
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "settings", "deal_config"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const minutes = Number(data.timerMinutes) || 0;
          setDealConfig({
            isActive: data.isActive !== false,
            timerMinutes: minutes,
            discountPercentage: data.discountPercentage || 25,
            selectedItemIds: data.selectedItemIds || [],
            dealText: data.dealText || "",
          });
          setDealTimeLeft({ minutes, seconds: 0 });
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
      },
      (err) => {
        console.warn(
          "Deal config subscription error:",
          handleFirestoreError(err),
        );
      },
    );
    return () => unsubscribe();
  }, []);

  // 3v. Real-time Vouchers Listening
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "vouchers"),
      (snapshot) => {
        const list: Voucher[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Voucher);
        });
        setVouchers(list);
      },
      (err) => {
        console.warn("Vouchers subscription notice:", handleFirestoreError(err));
      },
    );
    return () => unsubscribe();
  }, []);

  // 3f. Load UI config
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "settings", "ui_config"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.heroBgUrl) {
            setHeroBgUrl(data.heroBgUrl);
          }
          if (data.partnerShopsBgUrl !== undefined) {
            setPartnerShopsBgUrl(data.partnerShopsBgUrl);
          }
        }
      },
      (err) => {
        console.warn("Error loading ui_config:", err);
      }
    );
    return () => unsubscribe();
  }, []);

  // 3e. Load SEO config from Admin panel and pass into unified SEO manager
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "settings", "seo_config"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setAdminSeoOverride({
            siteTitle: data.title || undefined,
            siteDescription: data.description || undefined,
          });
          if (data.keywords) {
            let keywordsMeta = document.querySelector('meta[name="keywords"]');
            if (!keywordsMeta) {
              keywordsMeta = document.createElement("meta");
              keywordsMeta.setAttribute("name", "keywords");
              document.head.appendChild(keywordsMeta);
            }
            keywordsMeta.setAttribute("content", data.keywords);
          }
        }
      },
      (err) => {
        console.warn(
          "SEO config subscription error:",
          handleFirestoreError(err),
        );
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
                    title: "✅ Order Accept Ho Gaya!",
                    message: `Aapka order #${o.id.substring(0, 5)} confirm ho gaya hai.`,
                  },
                  confirmed: {
                    title: "✅ Order Confirm Ho Gaya!",
                    message: `Restaurant ne aapka order #${o.id.substring(0, 5)} accept kar liya hai.`,
                  },
                  preparing: {
                    title: "🍳 Khana Tayar Ho Raha Hai!",
                    message: `Chef aapka order #${o.id.substring(0, 5)} fresh tayar kar raha hai.`,
                  },
                  out_for_delivery: {
                    title: "🛵 Rider Raste Me Hai!",
                    message: `${o.riderName ? `${o.riderName} aapka` : "Rider aapka"} order #${o.id.substring(0, 5)} le kar nikal chuka hai!`,
                  },
                  delivered: {
                    title: "🎉 Order Deliver Ho Gaya!",
                    message: `Order #${o.id.substring(0, 5)} pohanch chuka hai. Enjoy your meal!`,
                  },
                  completed: {
                    title: "🎉 Order Mukammal Ho Gaya!",
                    message: `Order #${o.id.substring(0, 5)} complete ho gaya hai. Shukriya!`,
                  },
                };

                const info = statusToastMap[o.status];
                if (info) {
                  setToastNotification(info);
                  playChimeSound();
                  setTimeout(() => {
                    setToastNotification(null);
                  }, 5500);
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
          });
          playChimeSound(); // Synthesis alarm beeper

          // Hide toast window in 5 seconds
          setTimeout(() => {
            setToastNotification(null);
          }, 5000);
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
    if (searchQuery !== "") return `search_page:${searchQuery}`;

    // Priority 3: Sub-tabs / Modules
    if (activeModule !== "food") return `tab_${activeModule}`;

    // Root / Default Home
    return "home";
  };

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
      if (searchQuery !== "") {
        setSearchQuery("");
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
    searchQuery,
    activeModule,
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
  ) => {
    if (currentUser?.status === 'locked') {
      setIsVerificationModalOpen(true);
      return;
    }

    // Check if mixed cart is allowed
    if (!groceryDeliveryConfig?.allowMixedCart && groceryCartItems.length > 0) {
      const clearGrocery = window.confirm(
        "🛒 DISALLOW MIXED BASKET!\n\nYour basket currently contains Grocery products. Dadu Food requires separate delivery runs for hot kitchen meals and retail groceries.\n\nWould you like to auto-clear your Grocery Basket to start your Food order?",
      );
      if (clearGrocery) {
        setGroceryCartItems([]);
      } else {
        return;
      }
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
      alert(
        "You can only order from a maximum of 2 restaurants in a single order.",
      );
      return;
    }

    setCartItems((prev) => {
      const existing = prev.find((item) => item.dishId === cartItemId);
      if (existing) {
        return prev.map((item) =>
          item.dishId === cartItemId
            ? { ...item, quantity: item.quantity + quantityToAdd }
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

      return [
        ...prev,
        {
          dishId: cartItemId,
          name: variantName,
          price: finalPrice,
          quantity: quantityToAdd,
          type: dish.type,
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

  const handleAddToGroceryCart = (product: GroceryProduct, quantity = 1) => {
    if (currentUser?.status === 'locked') {
      setIsVerificationModalOpen(true);
      return;
    }

    // Check if mixed cart is allowed
    if (!groceryDeliveryConfig?.allowMixedCart && cartItems.length > 0) {
      const clearFood = window.confirm(
        "🛒 DISALLOW MIXED BASKET!\n\nYour basket currently contains Food items. Dadu Food requires separate delivery runs for hot kitchen meals and retail groceries.\n\nWould you like to auto-clear your Food Cart to start your Grocery purchase?",
      );
      if (clearFood) {
        setCartItems([]);
      } else {
        return;
      }
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
          },
        ];
      }
    });

    setToastNotification({
      title: "Grocery Basket Updated! 🍏",
      message: `${product.name} successfully packed into your cart.`,
    });
    setTimeout(() => setToastNotification(null), 3000);
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

  const handleReorder = (order: Order) => {
    if (order.orderType === "grocery") {
      // It's a grocery order
      if (cartItems.length > 0 && !groceryDeliveryConfig?.allowMixedCart) {
        const clearFood = window.confirm(
          "🛒 DISALLOW MIXED BASKET!\n\nYour basket currently contains Food items. Dadu Food requires separate delivery runs for hot kitchen meals and retail groceries.\n\nWould you like to auto-clear your Food Cart to start your Grocery purchase?",
        );
        if (clearFood) {
          setCartItems([]);
        } else {
          return;
        }
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
            updated[existingIdx].quantity += item.quantity;
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
        title: "Grocery Items Restored! 🍏",
        message:
          "Items from your previous order have been added to your basket.",
      });
      setTimeout(() => setToastNotification(null), 4000);
      setIsGroceryCartOpen(true);
      setActiveModule("grocery");
    } else {
      // It's a food or service order
      if (
        groceryCartItems.length > 0 &&
        !groceryDeliveryConfig?.allowMixedCart
      ) {
        const clearGrocery = window.confirm(
          "🛒 DISALLOW MIXED BASKET!\n\nYour basket currently contains Grocery products. Dadu Food requires separate delivery runs for hot kitchen meals and retail groceries.\n\nWould you like to auto-clear your Grocery Basket to start your Food order?",
        );
        if (clearGrocery) {
          setGroceryCartItems([]);
        } else {
          return;
        }
      }

      setCartItems((prev) => {
        const updated = [...prev];
        order.items.forEach((item) => {
          const existing = updated.find((fi) => fi.dishId === item.dishId);
          if (existing) {
            existing.quantity += item.quantity;
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
        title: "Food Items Restored! 🍔",
        message: "Previous dishes have been successfully added to your cart.",
      });
      setTimeout(() => setToastNotification(null), 4000);
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
    paymentMethod?: "COD" | "JazzCash" | "Easypaisa" | "Card";
    userCoords?: { latitude: number; longitude: number };
    voucher?: { code: string; discountAmount: number };
    coinsUsed?: number;
  }) => {
    if (currentUser?.status === 'locked' || currentUser?.status === 'blocked') {
      setToastNotification({ title: "Account Restricted", message: "Verification pending or account blocked. Cannot place order." });
      return;
    }

    if (details.voucher) {
      const vRef = doc(db, "vouchers", details.voucher.code);
      const vSnap = await getDoc(vRef);
      if (vSnap.exists()) {
        const vData = vSnap.data();
        if (!vData.isActive || vData.currentUses >= vData.maxUses) {
          setToastNotification({ title: "Voucher Unavailable", message: "The applied voucher is no longer valid or reached its usage limit." });
          return;
        }
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
        restaurantName: "Dadu Grocery Store",
        commission: item.commission || 0,
      }));

      const totalCommission = adaptedItems.reduce(
        (acc, itm) => acc + (itm.commission || 0) * itm.quantity,
        0,
      );

      // Enforce exact total = items + deliveryFee - voucher - coins
      const computedGrandTotal = Math.max(
        0,
        details.totalPrice +
          details.deliveryFee -
          (details.voucher?.discountAmount || 0) -
          (details.coinsUsed || 0),
      );

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
        deliveryFee: details.deliveryFee,
        grandTotal: computedGrandTotal,
        paymentMethod: details.paymentMethod || "COD",
        status: "pending",
        orderType: "grocery",
        deviceId: deviceId,
        createdAt: { seconds: Math.floor(Date.now() / 1000) },
        userCoords: details.userCoords || null,
        totalCommission,
        voucher: details.voucher || undefined,
        coinsUsed: details.coinsUsed || undefined,
      };

      await setDoc(doc(db, "orders", generatedOrderId), cleanObject(orderDoc));

      if (details.voucher) {
        const matchedVoucher = vouchers.find(
          (v) => v.code.toUpperCase() === details.voucher.code.toUpperCase() || v.id === details.voucher.code
        );
        const targetDocId = matchedVoucher?.id || details.voucher.code;
        const uid = currentUser?.uid;

        const voucherUpdate: any = {
          currentUses: increment(1),
        };
        if (uid) {
          voucherUpdate.usedUserIds = arrayUnion(uid);
          voucherUpdate[`userUsageCount.${uid}`] = increment(1);

          if (matchedVoucher) {
            const limit = matchedVoucher.perUserLimit !== undefined && matchedVoucher.perUserLimit > 0 ? matchedVoucher.perUserLimit : 1;
            const prevUses = matchedVoucher.userUsageCount?.[uid] ?? (matchedVoucher.usedUserIds?.includes(uid) ? 1 : 0);
            if (prevUses + 1 >= limit && matchedVoucher.assignedUserIds?.includes(uid)) {
              voucherUpdate.assignedUserIds = arrayRemove(uid);
            }
          }
        }

        await updateDoc(doc(db, "vouchers", targetDocId), voucherUpdate).catch((err) =>
          console.error("Failed to update grocery voucher uses:", err)
        );
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
      alert("Failed to record grocery order details: " + err);
    }
  };

  const handleUpdateCartQuantity = (dishId: string, qty: number) => {
    if (qty <= 0) {
      handleRemoveCartItem(dishId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.dishId === dishId ? { ...item, quantity: qty } : item,
      ),
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
    paymentMethod: string;
    orderType: "food" | "service";
    userCoords?: { latitude: number; longitude: number };
    voucher?: { code: string; discountAmount: number };
    coinsUsed?: number;
    riderTip?: number;
    isScheduled?: boolean;
    scheduledTime?: string;
  }) => {
    if (currentUser?.status === 'locked' || currentUser?.status === 'blocked') {
      setIsVerificationModalOpen(true);
      return;
    }
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    if (details.voucher) {
      const matchedVoucher = vouchers.find(
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

    let parsedDeliveryFee = deliverySettings.deliveryFee || 50;
    if (specificStatus && specificStatus.deliveryCharge) {
      const match = specificStatus.deliveryCharge.match(/\d+/);
      if (match) {
        parsedDeliveryFee = parseInt(match[0], 10);
      }
    }

    const feeCalc =
      details.orderType === "food"
        ? calculateDeliveryFee(itemsTotal, parsedDeliveryFee, deliverySettings)
        : { fee: 0, isFree: true, isSmallOrderDoubled: false, reason: "Service booking" };
    const finalFee = isRiderRangeExceeded ? feeCalc.fee * 2 : feeCalc.fee;
    const riderTip = Math.max(0, Number(details.riderTip || 0));

    let finalGrandTotal = itemsTotal + finalFee + riderTip;
    if (details.voucher) {
      finalGrandTotal = Math.max(0, finalGrandTotal - details.voucher.discountAmount);
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
      grandTotal: finalGrandTotal,
      status: details.orderType === "service" ? "booked" : "placed",
      paymentMethod: (details.paymentMethod || "COD") as any,
      orderType: details.orderType,
      deviceId: deviceId,
      serviceTiming: computedServiceTiming,
      createdAt: { seconds: Math.floor(Date.now() / 1000) },
      userCoords: details.userCoords || undefined,
      totalCommission,
      voucher: details.voucher,
      coinsUsed: details.coinsUsed || undefined,
    };

    try {
      // 1. Save new Order
      await setDoc(doc(db, "orders", uniqueOrderId), cleanObject(orderModel));

      if (details.voucher) {
        const matchedVoucher = vouchers.find(
          (v) => v.code.toUpperCase() === details.voucher.code.toUpperCase() || v.id === details.voucher.code
        );
        const targetDocId = matchedVoucher?.id || details.voucher.code;
        const uid = currentUser?.uid;

        const voucherUpdate: any = {
          currentUses: increment(1),
        };
        if (uid) {
          voucherUpdate.usedUserIds = arrayUnion(uid);
          voucherUpdate[`userUsageCount.${uid}`] = increment(1);

          if (matchedVoucher) {
            const limit = matchedVoucher.perUserLimit !== undefined && matchedVoucher.perUserLimit > 0 ? matchedVoucher.perUserLimit : 1;
            const prevUses = matchedVoucher.userUsageCount?.[uid] ?? (matchedVoucher.usedUserIds?.includes(uid) ? 1 : 0);
            if (prevUses + 1 >= limit && matchedVoucher.assignedUserIds?.includes(uid)) {
              voucherUpdate.assignedUserIds = arrayRemove(uid);
            }
          }
        }

        await updateDoc(doc(db, "vouchers", targetDocId), voucherUpdate).catch((err) =>
          console.error("Failed to update food voucher uses:", err)
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
    syncPageSeo({
      pageType: "home",
      deliverySettings,
      adminSeoOverride,
    });
  }, [activeInfoPage, selectedRestaurant, finalDishes, deliverySettings, adminSeoOverride]);

  const filteredDishes = React.useMemo(() => {
    const q = (searchQuery || "").trim();
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
  }, [finalDishes, activeCategory, selectedRestaurant, showFavoritesOnly, favoriteDishIds, searchQuery, quickFilter, deliverySettings, orders]);

  const cartCountTotal = cartItems.reduce(
    (acc, item) => acc + item.quantity,
    0,
  );
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
        
        let computedDeliveryFee = deliverySettings.deliveryFee;
        if (specificStatus && specificStatus.deliveryCharge) {
           const match = specificStatus.deliveryCharge.match(/\d+/);
           if (match) {
             computedDeliveryFee = parseInt(match[0], 10);
           }
        }
        
        if (isRiderRangeExceeded) {
          computedDeliveryFee *= 2;
        }
        
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
            onPlaceOrder={handlePlaceOrderSubmit}
            onAddDrink={handleAddExclusiveDrink}
            userCoords={globalCoords}
            systemSettings={deliverySettings}
            allVouchers={vouchers}
          />
        );
      })()}

      {(() => {
        let computedGroceryDeliveryConfig = { ...groceryDeliveryConfig };
        if (isRiderRangeExceeded) {
          computedGroceryDeliveryConfig.baseDeliveryFee *= 2;
        }
        
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
            onPlaceGroceryOrder={handlePlaceGroceryOrder}
            userCoords={globalCoords}
            systemSettings={deliverySettings}
            allVouchers={vouchers}
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
                <div className="w-11 h-11 rounded-2xl bg-[#E21B70]/10 text-[#E21B70] flex items-center justify-center shrink-0">
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
                  className="w-full py-2.5 px-4 rounded-xl bg-[#E21B70] hover:bg-[#C2145E] text-white text-xs font-black uppercase tracking-wider cursor-pointer transition"
                >
                  Keep Cart & Sign Out
                </button>
                <button
                  type="button"
                  onClick={() => performLogout(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-bold uppercase tracking-wider cursor-pointer transition"
                >
                  Clear Cart & Sign Out
                </button>
                <button
                  type="button"
                  onClick={() => setIsSignOutConfirmOpen(false)}
                  className="w-full py-2 px-4 rounded-xl text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white text-xs font-bold cursor-pointer transition"
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
              <div className="bg-[#E21B70] p-6 text-center">
                <div className="w-16 h-16 rounded-2xl mx-auto shadow-xl border-2 border-white/20 mb-3 bg-white flex items-center justify-center text-3xl animate-pulse">
                  📞
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
                  className="w-full bg-[#E21B70] hover:bg-[#C2145E] text-white font-black tracking-wide shadow-md transition-all py-3.5 rounded-2xl text-sm uppercase cursor-pointer"
                >
                  Theek Hai
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              status: "verified",
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

      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-50 p-4 max-w-sm bg-zinc-900 border-2 border-[#E21B70]/40 text-zinc-100 rounded-2xl shadow-2xl flex items-start gap-3 animate-slide-in">
          <div className="bg-[#E21B70] text-white p-2.5 rounded-xl shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h5 className="font-extrabold text-xs text-zinc-100 uppercase tracking-wider">
              {toastNotification.title}
            </h5>
            <p className="text-[11px] text-zinc-400 mt-1 leading-normal font-semibold">
              {toastNotification.message}
            </p>
          </div>
        </div>
      )}

      {isExitConfirmationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-zinc-900 border-2 border-[#E21B70]/30 rounded-[32px] max-w-sm w-full overflow-hidden shadow-2xl text-zinc-100 relative">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#E21B70] to-transparent" />
            <div className="p-6 text-center space-y-5">
              <div className="mx-auto w-16 h-16 rounded-full bg-[#E21B70]/10 border border-[#E21B70]/20 flex items-center justify-center text-[#E21B70]">
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
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExitConfirmationOpen(false)}
                  className="w-full bg-[#E21B70] hover:bg-[#C2145E] text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition active:scale-95 shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UtensilsCrossed className="w-4 h-4" />
                  Keep Ordering
                </button>
              </div>
            </div>
          </div>
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
                className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white/90 hover:text-white backdrop-blur-sm shadow border border-white/5 transition active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Offer Banner Image */}
              <div className="w-full bg-black flex items-center justify-center min-h-[250px] max-h-[60vh] overflow-hidden relative group">
                <img
                  src={deliverySettings.announcement.imageUrl}
                  alt={deliverySettings.announcement.title || "Special Offer Announcement"}
                  referrerPolicy="no-referrer"
                  className="w-full h-auto max-h-[60vh] object-contain transition-transform duration-700 group-hover:scale-105"
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
                  className="w-full bg-[#E21B70] hover:bg-[#C2145E] text-white py-3.5 sm:py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition active:scale-95 shadow-lg shadow-[#E21B70]/10 hover:shadow-[#E21B70]/20 flex items-center justify-center gap-2 cursor-pointer"
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
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans relative overflow-hidden">
        {/* Soft Ambient Radial Pink Neon Glow */}
        <div className="absolute w-80 h-80 sm:w-96 sm:h-96 bg-[#E21B70]/20 rounded-full blur-[100px] pointer-events-none animate-pulse" />

        {/* Central Neon Emblem with Glowing Rings */}
        <div className="relative z-10 mb-8 flex items-center justify-center">
          {/* Outer Ring with Glow */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-44 h-44 sm:w-52 sm:h-52 rounded-full border-[3px] border-[#E21B70] shadow-[0_0_40px_rgba(215,15,100,0.8),inset_0_0_20px_rgba(215,15,100,0.6)] p-2.5 flex items-center justify-center relative bg-black/90"
          >
            {/* Inner Ring with Logo */}
            <div className="w-full h-full rounded-full border-2 border-[#E21B70]/80 shadow-[0_0_25px_rgba(215,15,100,0.7)] bg-black flex flex-col items-center justify-center p-3 relative overflow-hidden">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full p-0.5 bg-white shadow-lg overflow-hidden flex items-center justify-center mb-1.5 border border-pink-500/30">
                <img src={daduLogo} alt="Dadu Food Logo" className="w-full h-full object-cover rounded-full bg-white" />
              </div>
              
              <span className="text-[11px] sm:text-xs font-black tracking-[0.25em] text-white uppercase drop-shadow-[0_0_10px_#E21B70]">
                DELIVERY
              </span>
            </div>
          </motion.div>
        </div>

        {/* Title & Tagline */}
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="relative z-10 space-y-1.5"
        >
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase">
            DADU <span className="text-[#E21B70] drop-shadow-[0_0_20px_#E21B70]">FOOD</span>
          </h1>
          <p className="text-[10px] sm:text-[11px] font-extrabold text-zinc-400 uppercase tracking-[0.25em]">
            FASTEST DELIVERY IN DADU CITY
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
        <div className="w-24 h-24 mb-6 rounded-3xl bg-gradient-to-br from-[#E21B70] to-red-500 flex items-center justify-center shadow-2xl shadow-[#E21B70]/20 animate-pulse">
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
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-[#E21B70] text-white p-4 rounded-2xl shadow-2xl z-[999] flex items-start gap-4">
      <div className="text-3xl animate-pulse">⏳</div>
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
          
          <div className="mx-auto w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-3xl">
            🚫
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
              href={`https://wa.me/923277004471?text=${encodeURIComponent(contactText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-black py-4.5 px-4 rounded-2xl transition-all flex items-center justify-center gap-2.5 cursor-pointer text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/10"
            >
              <span>💬 Contact on WhatsApp</span>
              <span className="font-mono text-[10px] bg-white/20 px-2 py-0.5 rounded-md">03277004471</span>
            </a>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black py-3.5 px-4 rounded-2xl transition-all cursor-pointer text-xs uppercase tracking-wider border border-zinc-700"
          >
            Sign Out (Logout Karein)
          </button>
        </div>
      </div>
    );
  }

  if (currentUser?.role === "rider") {
    return (
      <RiderPanel
        currentUser={currentUser}
        onLogout={handleLogout}
        deliverySettings={deliverySettings}
      />
    );
  }

  if (selectedRestaurant !== "All Restaurants") {
    const restaurantDishes = finalDishes.filter((d) => {
      const rName = d.restaurantName?.trim() || "Dadu Fast Food & Kitchen";
      return rName === selectedRestaurant;
    });

    const selectedFoodCategory = foodCategories.find(c => c.name === selectedRestaurant);

    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F9F9FB] dark:bg-[#0B0B0F]"><div className="w-10 h-10 border-4 border-[#E21B70] border-t-transparent rounded-full animate-spin" /></div>}>
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
    <div className="min-h-screen bg-[#F9F9FB] dark:bg-[#0B0B0F] text-[#111118] dark:text-[#F5F5F8] relative pb-28 md:pb-12 flex flex-col font-sans overflow-x-clip">

      {/* Welcome Intro Splash Animation Screen with Site Logo */}
      <AnimatePresence mode="wait">
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{
              opacity: 0,
              scale: 1.02,
              filter: "blur(4px)",
              transition: { duration: 0.18, ease: "easeOut" },
            }}
            className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden bg-black/90 text-white select-none"
            style={{ perspective: 1500 }}
          >
            {/* Cinematic Dark Glass Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              className="absolute inset-0 bg-black/70 z-0"
            />

            {/* Animated Mesh/Orb Gradients */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute inset-0 flex items-center justify-center z-0"
            >
              <motion.div
                animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] bg-gradient-to-tr from-[#E21B70] to-[#7209b7] rounded-full blur-[100px] opacity-60"
              />
              <motion.div
                animate={{ rotate: -360, scale: [1, 1.2, 1] }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute w-[60vw] h-[60vw] max-w-[400px] max-h-[400px] bg-gradient-to-bl from-[#f72585] to-[#4cc9f0] rounded-full blur-[80px] opacity-50 mix-blend-screen"
              />
            </motion.div>

            {/* Portal Ring */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute w-[300px] h-[300px] md:w-[400px] md:h-[400px] rounded-full border border-white/20 shadow-[0_0_80px_rgba(215,15,100,0.5)] z-0"
              style={{ background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)" }}
            />

            {/* Main Content Floating */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1, transition: { duration: 0.15 } }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative z-10 flex flex-col items-center justify-center text-white w-full px-4 text-center"
            >
              {/* Site Logo Presentation Frame */}
              <motion.div
                animate={{ y: [-8, 8, -8], rotateZ: [-2, 2, -2] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative mb-6 group"
              >
                {/* Glow Behind Logo */}
                <div className="absolute -inset-4 bg-white/25 blur-2xl rounded-full scale-110 opacity-70 group-hover:opacity-100 transition duration-700 pointer-events-none" />

                {/* 3D Glassmorphic App Icon Frame */}
                <motion.div
                  whileHover={{ scale: 1.05, rotateY: 10, rotateX: 5 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="w-40 h-40 md:w-48 md:h-48 rounded-[2.5rem] overflow-hidden bg-white/10 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.4)] relative z-10 border border-white/30 p-2 transform-gpu"
                >
                  <div className="w-full h-full rounded-[2rem] overflow-hidden bg-white relative flex items-center justify-center p-0.5">
                    <img
                      src={daduLogo}
                      alt="Site Logo"
                      className="w-full h-full object-cover rounded-[1.8rem] transform scale-105 transition-transform duration-700 group-hover:scale-100"
                    />
                  </div>
                </motion.div>
              </motion.div>

              {/* Brand Title Text matching DADUFOOD branding */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="text-3xl md:text-5xl font-black tracking-widest text-white mb-1 text-center drop-shadow-[0_4px_12px_rgba(215,15,100,0.6)] uppercase font-sans"
              >
                DADUFOOD
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="text-[11px] md:text-xs text-pink-300 font-black uppercase tracking-[0.3em] mb-7 flex items-center justify-center gap-1.5"
              >
                <span>⚡</span>
                <span>FAST RIDER DELIVERY</span>
                <span>⚡</span>
              </motion.p>

              {/* High-tech Smooth 60FPS Animated Rider Loading Screen */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center space-y-4 w-full max-w-[320px]"
              >
                {/* Track Container with 60FPS Smooth Rider (Facing Right) */}
                <div className="relative w-full pt-12 pb-1">
                  {/* Smooth 60FPS Moving Rider (No CSS transition fight, native frame update) */}
                  <div
                    className="absolute top-0 z-20 transform -translate-x-1/2 pointer-events-none will-change-transform"
                    style={{ left: `${Math.max(6, Math.min(splashProgress, 94))}%` }}
                  >
                    <motion.div
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 0.22, repeat: Infinity, ease: "easeInOut" }}
                      className="relative flex items-center justify-center"
                    >
                      {/* Speed Smoke & Fire Exhaust behind rider */}
                      <motion.div
                        animate={{ opacity: [0.3, 1, 0.3], x: [-8, -2, -8], scale: [0.7, 1.2, 0.7] }}
                        transition={{ duration: 0.2, repeat: Infinity }}
                        className="absolute -left-6 top-3 text-xs font-bold text-pink-400 drop-shadow-[0_0_8px_rgba(226,27,109,1)]"
                      >
                        💨🔥
                      </motion.div>

                      {/* Premium High-Quality Delivery Bike Rider SVG (Facing Right) */}
                      <div className="relative filter drop-shadow-[0_6px_16px_rgba(226,27,109,0.9)]">
                        <svg width="56" height="56" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                          {/* Headlight Beam Glowing to the Right */}
                          <polygon points="85,50 120,42 120,68 85,56" fill="url(#lightBeam)" opacity="0.85" />
                          <defs>
                            <linearGradient id="lightBeam" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#FFDF00" stopOpacity="0.9" />
                              <stop offset="100%" stopColor="#FFDF00" stopOpacity="0" />
                            </linearGradient>
                          </defs>

                          {/* REAR WHEEL with Spinning Spokes */}
                          <g>
                            <circle cx="28" cy="82" r="16" fill="#09090b" stroke="#FFFFFF" strokeWidth="4" />
                            <circle cx="28" cy="82" r="7" fill="#FFDF00" />
                            {/* Animated Wheel Spokes */}
                            <motion.line
                              x1="28" y1="68" x2="28" y2="96"
                              stroke="#FFDF00" strokeWidth="2"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.4, repeat: Infinity, ease: "linear" }}
                              style={{ transformOrigin: "28px 82px" }}
                            />
                          </g>

                          {/* FRONT WHEEL with Spinning Spokes */}
                          <g>
                            <circle cx="88" cy="82" r="16" fill="#09090b" stroke="#FFFFFF" strokeWidth="4" />
                            <circle cx="88" cy="82" r="7" fill="#FFDF00" />
                            <motion.line
                              x1="88" y1="68" x2="88" y2="96"
                              stroke="#FFDF00" strokeWidth="2"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.4, repeat: Infinity, ease: "linear" }}
                              style={{ transformOrigin: "88px 82px" }}
                            />
                          </g>

                          {/* Sports Scooter Body Structure */}
                          <path d="M28 82 L48 82 L56 58 L78 58 L88 82 Z" fill="#FFFFFF" />
                          <path d="M48 80 L70 80 L76 48 L62 48 Z" fill="#E21B6D" />

                          {/* Front Windshield & Bright Gold Headlight Lamp */}
                          <path d="M76 48 L86 34 L78 32 Z" fill="#FFFFFF" />
                          <circle cx="85" cy="34" r="5" fill="#FFDF00" stroke="#FFFFFF" strokeWidth="1" />

                          {/* Hot Food Delivery Box on Rear Rack */}
                          <rect x="10" y="38" width="28" height="28" rx="5" fill="#FFDF00" stroke="#FFFFFF" strokeWidth="2.5" />
                          {/* Box Logo & Steam Lines */}
                          <path d="M16 52 L32 52" stroke="#9C0843" strokeWidth="4" strokeLinecap="round" />
                          <path d="M20 44 C20 40, 24 40, 24 36" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" fill="none" />
                          <path d="M28 44 C28 40, 32 40, 32 36" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" fill="none" />

                          {/* Rider Cushion Seat */}
                          <rect x="42" y="56" width="24" height="6" rx="3" fill="#09090b" />

                          {/* Rider Legs & Leather Pants */}
                          <path d="M44 58 L54 78 L68 78 L58 58 Z" fill="#09090b" />

                          {/* Rider Racing Jacket (Hot Pink & White) */}
                          <path d="M48 36 L62 36 L72 52 L54 54 Z" fill="#E21B6D" />
                          <path d="M52 36 L68 46 L70 54" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />

                          {/* Rider Arms Steering Handlebars */}
                          <path d="M54 40 L72 44 L82 42" stroke="#FFFFFF" strokeWidth="5.5" strokeLinecap="round" />

                          {/* Rider Helmet facing RIGHT with Dark Visor */}
                          <circle cx="56" cy="22" r="12" fill="#FFFFFF" stroke="#E21B6D" strokeWidth="2" />
                          <path d="M60 16 C67 16, 68 25, 60 28 Z" fill="#09090b" />
                          <circle cx="63" cy="20" r="2" fill="#FFDF00" />
                        </svg>
                      </div>
                    </motion.div>
                  </div>

                  {/* High-Tech Glowing Progress Bar Track */}
                  <div className="relative h-4 w-full bg-black/80 rounded-full p-1 backdrop-blur-md border border-white/20 shadow-[0_0_30px_rgba(226,27,109,0.7)]">
                    <div
                      className="h-full bg-gradient-to-r from-[#E21B6D] via-pink-400 to-[#FFDF00] rounded-full shadow-[0_0_18px_#FFDF00] transition-all ease-linear"
                      style={{ width: `${splashProgress}%` }}
                    />
                    <motion.div
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ duration: 1.0, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none rounded-full"
                    />
                  </div>
                </div>

                {/* World-Class Digital Speedometer Counter Badge (0 to 100%) */}
                <div className="flex flex-col items-center justify-center w-full space-y-2 pt-1">
                  {/* Glowing Digital Gauge Badge */}
                  <div className="flex items-center gap-2.5 bg-black/80 border border-pink-500/40 px-5 py-2 rounded-2xl backdrop-blur-xl shadow-[0_4px_25px_rgba(226,27,109,0.5)]">
                    <span className="text-base animate-pulse">⚡</span>
                    <span className="text-2xl font-black font-mono tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#FFDF00] via-pink-200 to-white drop-shadow-[0_2px_10px_rgba(255,223,0,0.9)]">
                      {splashProgress.toString().padStart(2, '0')}
                    </span>
                    <span className="text-xs font-black text-pink-300 font-mono">%</span>
                  </div>

                  {/* Dynamic Status Badges with Fast City Messaging */}
                  <motion.div
                    key={splashProgress < 30 ? "s1" : splashProgress < 70 ? "s2" : "s3"}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-[11px] font-black uppercase tracking-[0.25em] text-pink-200 text-center flex items-center gap-1.5"
                  >
                    {splashProgress < 30 && (
                      <>
                        <span className="animate-bounce">🏍️</span>
                        <span>Rider Starting Engine...</span>
                      </>
                    )}
                    {splashProgress >= 30 && splashProgress < 70 && (
                      <>
                        <span className="animate-pulse">⚡</span>
                        <span>Speeding Across Dadu City...</span>
                      </>
                    )}
                    {splashProgress >= 70 && (
                      <>
                        <span>🚀</span>
                        <span className="text-yellow-300">Delivering Fresh & Fast!</span>
                      </>
                    )}
                  </motion.div>
                </div>
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

      {/* Dynamic Floating WhatsApp Helpline Button (Bottom corner) */}
      <a
        href="https://wa.me/923277004471"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-32 left-4 z-40 bg-[#25D366] text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer flex items-center justify-center border border-white/20"
        title="WhatsApp live support helpline"
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
        </svg>
      </a>

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
          isLocked={currentUser?.status === 'locked'}
          allOrders={orders}
          onReorder={handleReorder}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
      )}

      {isUserAdmin && isMaintenanceActive && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-center text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 z-50 relative border-b border-amber-600/30">
          <span>⚠️ SYSTEM IS CURRENTLY IN MAINTENANCE MODE (General users are blocked from ordering)</span>
        </div>
      )}

      {!(isAdminConsoleOpen && isUserAdmin) ? (
        activeInfoPage ? (
          <main className="flex-1 relative z-10">
            <InfoPagesView
              page={activeInfoPage}
              onBack={() => navigateToInfoPage(null)}
              onNavigate={(slug) => navigateToInfoPage(slug)}
            />
          </main>
        ) : isMaintenanceActive && !isUserAdmin ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10 max-w-lg mx-auto my-auto min-h-[70vh] gap-6 relative animate-fade-in">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/30 rounded-2xl flex items-center justify-center border border-rose-100 dark:border-rose-900 animate-bounce shadow-md">
              <Wrench className="w-8 h-8 text-[#E21B70]" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 uppercase">
                Under Maintenance
              </h1>
              <p className="text-[10px] font-bold tracking-widest text-[#E21B70] uppercase">
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
                href="https://wa.me/923277004471"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-black py-3.5 px-4 rounded-2xl shadow-lg hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
              >
                💬 WhatsApp Helpline
              </a>

              <button
                type="button"
                onClick={() => setIsAuthOpen(true)}
                className="w-full bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-black py-3.5 px-4 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider border border-zinc-200/60 dark:border-zinc-750"
              >
                🔑 Admin / Staff Login
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1">
          {/* Module Switcher Tabs - Unified Crimson Rose */}
          {!isAuthOpen && (
            <div className="max-w-7xl mx-auto px-3.5 sm:px-4 mt-4">
              <div className="bg-[#EFEFF5] dark:bg-[#14141A] p-1 rounded-2xl flex gap-1.5 border border-[#E6E6EE] dark:border-[#272733] relative overflow-hidden max-w-sm sm:max-w-md mx-auto select-none">
                <button
                  type="button"
                  onClick={handleGoToFoodHome}
                  className={`relative flex-1 min-h-[44px] py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-colors duration-200 flex items-center justify-center gap-1.5 cursor-pointer z-10 ${
                    activeModule === "food"
                      ? "text-white"
                      : "text-[#5A5A6B] dark:text-[#A3A3B5] hover:text-[#111118] dark:hover:text-[#F5F5F8]"
                  }`}
                >
                  {activeModule === "food" && (
                    <motion.div
                      layoutId="activeModulePill"
                      className="absolute inset-0 bg-[#E21B70] rounded-xl shadow-xs"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10 text-sm" aria-hidden="true">🍔</span>
                  <span className="relative z-10">Food Delivery</span>
                </button>

                <button
                  type="button"
                  onClick={handleGoToGroceryHome}
                  className={`relative flex-1 min-h-[44px] py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-colors duration-200 flex items-center justify-center gap-1.5 cursor-pointer z-10 ${
                    activeModule === "grocery"
                      ? "text-white"
                      : "text-[#5A5A6B] dark:text-[#A3A3B5] hover:text-[#111118] dark:hover:text-[#F5F5F8]"
                  }`}
                >
                  {activeModule === "grocery" && (
                    <motion.div
                      layoutId="activeModulePill"
                      className="absolute inset-0 bg-[#E21B70] rounded-xl shadow-xs"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10 text-sm" aria-hidden="true">🛒</span>
                  <span className="relative z-10">Groceries</span>
                  {groceryCartItems.length > 0 && (
                    <span className="relative z-10 bg-white text-[#E21B70] font-mono text-[10px] font-extrabold min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center leading-none shrink-0 tabular-nums">
                      {groceryCartItems.reduce((acc, i) => acc + i.quantity, 0)}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          <Suspense fallback={<div className="p-10 text-center text-sm text-[#5A5A6B] dark:text-[#A3A3B5]">Loading…</div>}>
            <AnimatePresence mode="wait">
              {activeModule === "food" ? (
                <motion.div
                  key="food-module-view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
              <>
                <BannerCarousel
                  bannerVersion={deliverySettings.bannerVersion}
                  deliveryFee={deliverySettings?.deliveryFee || 50}
                />
                {/* Billboard / category selectors */}
                <FoodpandaHero
                  activeCategory={activeCategory}
                  setActiveCategory={setActiveCategory}
                  dealConfig={dealConfig}
                  dealTimeLeft={dealTimeLeft}
                  foodCategories={normalizedFoodCategories}
                  heroBgUrl={heroBgUrl}
                >
                <div className="max-w-7xl mx-auto px-3.5 sm:px-4 mt-4 mb-2">
                  <div className="bg-white dark:bg-[#14141A] p-4 sm:p-5 rounded-2xl sm:rounded-3xl space-y-3.5 border border-[#E6E6EE] dark:border-[#272733] shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#E21B70] flex items-center justify-center text-white shrink-0">
                          <Compass className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h2 className="text-sm font-extrabold tracking-tight text-[#111118] dark:text-[#F5F5F8]">
                            Partner Restaurants in Dadu
                          </h2>
                          <p className="text-xs text-[#5A5A6B] dark:text-[#A3A3B5]">
                            Tap any kitchen to browse full menu & live hours
                          </p>
                        </div>
                      </div>
                      {selectedRestaurant !== "All Restaurants" && (
                        <button
                          type="button"
                          onClick={() => setSelectedRestaurant("All Restaurants")}
                          className="min-h-[44px] px-3.5 rounded-xl text-xs font-extrabold text-[#E21B70] dark:text-[#FF4D94] border border-[#E21B70]/30 hover:bg-[#E21B70]/10 transition-colors cursor-pointer shrink-0"
                        >
                          All Shops
                        </button>
                      )}
                    </div>

                    <div className="flex items-stretch gap-2.5 overflow-x-auto pb-1 scrollbar-none touch-pan-x overscroll-x-contain">
                      <button
                        type="button"
                        onClick={() => setSelectedRestaurant("All Restaurants")}
                        className={`w-[96px] min-h-[108px] rounded-2xl flex flex-col items-center justify-center p-2 font-bold transition-colors shrink-0 cursor-pointer border ${
                          selectedRestaurant === "All Restaurants"
                            ? "bg-[#E21B70] text-white border-[#E21B70] shadow-xs"
                            : "bg-[#F9F9FB] dark:bg-[#1D1D26] text-[#111118] dark:text-[#F5F5F8] border-[#E6E6EE] dark:border-[#272733] hover:border-[#E21B70]/50"
                        }`}
                      >
                        <span className="text-2xl mb-1" aria-hidden="true">🍽️</span>
                        <span className="text-[11px] text-center font-extrabold leading-tight">
                          All Shops
                        </span>
                      </button>
                      {isLoadingDishes
                        ? Array.from({ length: 5 }).map((_, idx) => (
                            <div
                              key={`sk-${idx}`}
                              className="w-[104px] h-[108px] rounded-2xl bg-[#EFEFF5] dark:bg-[#1D1D26] shrink-0"
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
                              <button
                                key={vendor}
                                type="button"
                                onClick={() => handleRestaurantClick(vendor)}
                                className={`w-[106px] min-h-[108px] rounded-2xl flex flex-col items-center justify-between p-1.5 transition-colors shrink-0 cursor-pointer border overflow-hidden ${
                                  selectedRestaurant === vendor
                                    ? "bg-[#E21B70] text-white border-[#E21B70] shadow-xs"
                                    : "bg-[#F9F9FB] dark:bg-[#1D1D26] text-[#111118] dark:text-[#F5F5F8] border-[#E6E6EE] dark:border-[#272733] hover:border-[#E21B70]/50"
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
                                    <span className="text-2xl" aria-hidden="true">🍔</span>
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
                                <span className={`text-[11px] font-bold text-center truncate w-full px-0.5 mt-1 ${selectedRestaurant === vendor ? "text-white" : "text-[#111118] dark:text-[#F5F5F8]"}`}>
                                  {vendor}
                                </span>
                              </button>
                            );
                          })}
                    </div>
                  </div>
                </div>
              </FoodpandaHero>

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
                  <div className="max-w-7xl mx-auto px-3 sm:px-4 mt-4 sm:mt-6 flex overflow-x-auto gap-3 sm:gap-4 pb-2 scrollbar-none snap-x touch-pan-both overscroll-x-contain">
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
                            { label: "Booked", emoji: "📅" },
                            { label: "Accepted", emoji: "✅" },
                            { label: "Travel", emoji: "🏍️" },
                            { label: "Repair", emoji: "🛠️" },
                            { label: "Done", emoji: "🎉" },
                          ]
                        : [
                            { label: "Placed", emoji: "📝" },
                            { label: "Confirmed", emoji: "👍" },
                            { label: "Preparing", emoji: "🍳" },
                            { label: "Dispatch", emoji: "🛵" },
                            { label: "Enjoy", emoji: "🍔" },
                          ];

                      return (
                        <div
                          key={activeOrderForBanner.id}
                          className="shrink-0 w-[90vw] sm:w-[580px] max-w-full snap-center bg-white dark:bg-[#14141A] border-2 border-[#E21B70] rounded-2xl shadow-sm overflow-hidden transition-colors"
                        >
                          {/* Banner Header: Tap-to-track details */}
                          <div
                            onClick={() => {
                              setActiveTrackingOrder(activeOrderForBanner);
                              setIsTrackingModalOpen(true);
                            }}
                            className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#F9F9FB] dark:hover:bg-[#1D1D26] transition border-b border-[#E6E6EE] dark:border-[#272733]"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#E21B70]/10 border border-[#E21B70]/25 flex items-center justify-center text-xl shrink-0">
                                🛵
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#E21B70] dark:text-[#FF4D94] flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D] dark:text-[#4ADE80]" />
                                  Live Order Tracking
                                </span>
                                <h4 className="text-xs sm:text-sm font-extrabold text-[#111118] dark:text-[#F5F5F8] mt-0.5 leading-normal truncate">
                                  Order{" "}
                                  <span className="font-mono text-[#5A5A6B] dark:text-[#A3A3B5] font-bold">
                                    {formatOrderId(activeOrderForBanner.id)}
                                  </span>{" "}
                                  •{" "}
                                  <span className="text-[#E21B70] dark:text-[#FF4D94] uppercase font-bold">
                                    {activeOrderForBanner.status === "out_for_delivery"
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
                                <span className="text-[10px] text-zinc-600 font-bold block mt-0.5 truncate">
                                  {activeOrderForBanner.status === "out_for_delivery"
                                    ? "🛵 Rider aapka order pick kar chuka hai aur raste me hai!"
                                    : activeOrderForBanner.status === "preparing"
                                      ? "🍳 Chef aapka khana fresh tayar kar raha hai"
                                      : activeOrderForBanner.status === "accepted" || activeOrderForBanner.status === "confirmed"
                                        ? "✅ Restaurant ne order confirm kar diya hai"
                                        : activeOrderForBanner.status === "diagnostic_on_way"
                                          ? "🏍️ Technician aapke ghar ki taraf aa raha hai"
                                          : activeOrderForBanner.status === "diagnostic_underway"
                                            ? "🛠️ Technician kaam kar raha hai"
                                            : "⏳ Order receive ho gaya, jald confirm hoga"}
                                </span>
                                {activeOrderForBanner.riderName ? (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-[9.5px] text-zinc-500 font-extrabold truncate">
                                      Rider:{" "}
                                      <span className="text-[#E21B70] font-black">
                                        {activeOrderForBanner.riderName}
                                      </span>
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[9.5px] text-zinc-400 font-bold block mt-0.5 truncate">
                                    ⏳ Assigning rider...
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Rider ETA Box */}
                            <div className="shrink-0 bg-gradient-to-r from-[#E21B70] to-pink-600 text-white px-3 py-1.5 rounded-2xl text-center shadow-md border border-pink-400/30">
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
                                className="absolute left-3 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-pink-500 to-[#E21B70] -z-10 rounded-full transition-all duration-500"
                                style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
                              />

                              {stepsList.map((step, idx) => {
                                const stepNum = idx + 1;
                                const isPassed = currentStep >= stepNum;
                                const isCurrent = currentStep === stepNum;

                                return (
                                  <div key={idx} className="flex flex-col items-center relative z-10">
                                    <div
                                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-black transition-all duration-300 shadow-sm ${
                                        isPassed
                                          ? "bg-[#E21B70] text-white ring-2 ring-pink-100"
                                          : "bg-white text-zinc-400 border border-zinc-200"
                                      } ${isCurrent ? "animate-pulse scale-110" : ""}`}
                                    >
                                      {step.emoji}
                                    </div>
                                    <span
                                      className={`text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider mt-1 ${
                                        isCurrent ? "text-[#E21B70]" : isPassed ? "text-zinc-700" : "text-zinc-400"
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
                                  className="bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider text-center transition cursor-pointer"
                                >
                                  📞 Call
                                </a>
                                <a
                                  href={`https://wa.me/${activeOrderForBanner.riderPhone.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider text-center transition cursor-pointer shadow-2xs"
                                >
                                  💬 Chat
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
              <main id="catalog-section" className="max-w-7xl mx-auto px-3.5 sm:px-4 py-5">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Left Column: Menu Cards Catalog grid */}
                  <div className="flex-1 space-y-5 min-w-0">

                    {/* 1-Tap Quick Filter Chips Bar (44px+ touch targets) */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1 touch-pan-x">
                      {[
                        { id: "all", label: "🍽️ All Kitchens" },
                        { id: "top_rated", label: "🔥 Featured" },
                        { id: "under_300", label: "⚡ Under Rs. 300" },
                        { id: "fast_food", label: "🍔 Burgers & Fast Food" },
                        { id: "desi", label: "🍛 Biryani & Karahi" },
                        { id: "pizza", label: "🍕 Pizzas & Pasta" },
                        { id: "chai_sweets", label: "🥤 Chai & Sweets" },
                      ].map((chip) => {
                        const active = quickFilter === chip.id;
                        return (
                          <button
                            key={chip.id}
                            type="button"
                            onClick={() => setQuickFilter(chip.id as typeof quickFilter)}
                            className={`shrink-0 min-h-[44px] px-4 rounded-xl text-xs font-extrabold tracking-tight transition-colors cursor-pointer border ${
                              active
                                ? "bg-[#E21B70] text-white border-[#E21B70] shadow-xs"
                                : "bg-white dark:bg-[#14141A] text-[#111118] dark:text-[#F5F5F8] border-[#E6E6EE] dark:border-[#272733] hover:border-[#E21B70]/60 hover:text-[#E21B70] dark:hover:text-[#FF4D94]"
                            }`}
                          >
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[#E6E6EE] dark:border-[#272733] pb-2.5">
                      <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-[#111118] dark:text-[#F5F5F8]">
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
                        {quickFilter !== "all" && (
                          <button
                            type="button"
                            onClick={() => setQuickFilter("all")}
                            className="min-h-[36px] px-2.5 text-xs font-extrabold text-[#E21B70] dark:text-[#FF4D94] hover:underline cursor-pointer"
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
                                  vendor && d.isAvailable !== false,
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
                              <article
                                key={vendor}
                                onClick={() => handleRestaurantClick(vendor)}
                                className={`bg-white dark:bg-[#14141A] border border-[#E6E6EE] dark:border-[#272733] rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs hover:shadow-md hover:border-[#E21B70]/40 transition-all cursor-pointer group flex flex-col ${!openStatus.isOpen ? "opacity-85" : ""}`}
                              >
                                <div className="h-44 bg-[#1D1D26] relative overflow-hidden shrink-0">
                                  {vendorImageUrl ? (
                                    <LazyImage
                                      src={vendorImageUrl}
                                      alt={`${vendor} restaurant in Dadu`}
                                      className="w-full h-full"
                                      imgClassName={`object-cover group-hover:scale-105 transition-transform duration-300 ${!openStatus.isOpen ? "grayscale-[35%]" : ""}`}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-[#1D1D26] text-4xl">
                                      🍔
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
                                          {vendorAllDishes.length} menu items
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
                                <div className="p-3 bg-white dark:bg-[#14141A] flex items-center gap-2.5 overflow-x-auto scrollbar-none border-t border-[#E6E6EE] dark:border-[#272733] touch-pan-x overscroll-x-contain">
                                  {vendorDishes.map((d) => (
                                    <div
                                      key={d.id}
                                      className="flex flex-col gap-1 w-20 shrink-0 cursor-pointer hover:opacity-85 transition-opacity"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isClosed && d.isAvailable !== false) {
                                          handleRestaurantClick(vendor, d.category);
                                        }
                                      }}
                                    >
                                      <div className="w-full h-20 rounded-xl overflow-hidden bg-[#F2F2F6] dark:bg-[#1D1D26] border border-[#E6E6EE] dark:border-[#272733]">
                                        <LazyImage
                                          src={
                                            d.imageUrl ||
                                            "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=400"
                                          }
                                          alt={`${d.name} at ${vendor} Dadu`}
                                          className="w-full h-full"
                                          imgClassName="object-cover"
                                        />
                                      </div>
                                      <span className="text-[11px] font-bold text-[#111118] dark:text-[#F5F5F8] line-clamp-1">
                                        {d.name}
                                      </span>
                                      <span className="text-[11px] text-[#E21B70] dark:text-[#FF4D94] font-extrabold leading-none tabular-nums">
                                        Rs. {d.discountPrice || d.price}
                                      </span>
                                    </div>
                                  ))}
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRestaurantClick(vendor);
                                    }}
                                    className="w-16 h-20 flex flex-col items-center justify-center gap-1 shrink-0 bg-[#E21B70]/10 dark:bg-[#E21B70]/15 rounded-xl text-[#E21B70] dark:text-[#FF4D94] hover:bg-[#E21B70]/20 transition-colors border border-[#E21B70]/25 cursor-pointer"
                                  >
                                    <ChevronRight className="w-5 h-5" />
                                    <span className="text-[10px] font-extrabold uppercase tabular-nums">
                                      All ({vendorAllDishes.length})
                                    </span>
                                  </div>
                                </div>
                              </article>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
                        {isLoadingDishes
                        ? Array.from({ length: 8 }).map((_, idx) => (
                            <div
                              key={idx}
                              className="bg-white dark:bg-[#14141A] border border-[#E6E6EE] dark:border-[#272733] rounded-2xl overflow-hidden flex flex-col h-full"
                            >
                              <div className="h-28 sm:h-44 bg-[#EFEFF5] dark:bg-[#1D1D26] shrink-0" />
                              <div className="p-3 sm:p-4 flex-1 flex flex-col gap-3">
                                <div className="h-3 w-1/3 bg-[#EFEFF5] dark:bg-[#1D1D26] rounded-full" />
                                <div className="h-4 w-3/4 bg-[#EFEFF5] dark:bg-[#1D1D26] rounded-full" />
                                <div className="mt-auto flex justify-between items-center pt-2">
                                  <div className="h-4 w-1/4 bg-[#EFEFF5] dark:bg-[#1D1D26] rounded-full" />
                                  <div className="h-10 w-10 bg-[#EFEFF5] dark:bg-[#1D1D26] rounded-xl" />
                                </div>
                              </div>
                            </div>
                          ))
                        : [...filteredDishes]
                            .sort((a, b) => {
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
                            })
                            .map((dish, idx) => {
                            const dishRestaurantName =
                              dish.restaurantName || "Dadu Fast Food & Kitchen";
                            const isRestaurantClosed =
                              checkIsRestaurantClosed(dishRestaurantName);
                            const openingTime =
                              deliverySettings?.restaurantStatuses?.[
                                dishRestaurantName
                              ]?.openingTime ||
                              deliverySettings?.restaurantStatus?.openingTime;
                            const isFavorite = favoriteDishIds.includes(dish.id);
                            const cartItem = cartItems.find((item) => item.dishId === dish.id);
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
                      </div>
                    )}

                    {!isLoadingDishes && filteredDishes.length === 0 && (
                      <div className="bg-white dark:bg-[#14141A] border border-[#E6E6EE] dark:border-[#272733] p-8 sm:p-10 rounded-3xl text-center space-y-4 shadow-xs max-w-md mx-auto">
                        <div className="w-14 h-14 bg-[#E21B70]/10 rounded-2xl flex items-center justify-center mx-auto text-2xl">
                          {showFavoritesOnly ? "💔" : "🍛"}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-base text-[#111118] dark:text-[#F5F5F8]">
                            {showFavoritesOnly
                              ? "No Favorites Yet"
                              : "No Matching Dishes Found"}
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
                          className="min-h-[44px] bg-[#E21B70] hover:bg-[#C2145E] text-white font-extrabold py-2.5 px-6 text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
                        >
                          Show All Kitchens
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </main>

              {/* WhatsApp List Ordering Card (Order by typed list on WhatsApp) */}
              <div className="max-w-7xl mx-auto px-3.5 sm:px-4 pb-2">
                <WhatsAppListOrderCard
                  mode="food"
                  defaultAddress={currentUser?.address || ""}
                />
              </div>

              <HomeFaqAeoSection language={language} />
            </>
          </motion.div>
        ) : (
          <motion.div
            key="grocery-module-view"
            initial={{ opacity: 0, y: 14, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.995 }}
            transition={{ duration: 0.24, ease: [0.25, 0.1, 0.25, 1.0] }}
          >
            <GroceryModule
              categories={groceryCategories}
              products={groceryProducts}
              isLoading={isLoadingGrocery}
              onAddToCart={handleAddToGroceryCart}
              cartItems={groceryCartItems}
              onUpdateCartQuantity={handleUpdateGroceryCartQuantity}
              onRemoveFromCart={handleRemoveFromGroceryCart}
              searchQuery={searchQuery}
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
            <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-zinc-400 font-bold tracking-widest text-sm uppercase">
              Loading Admin Panel...
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

      {/* Floating Bottom Cart for mobile screens (compact <=56px, positioned cleanly above BottomNavBar) */}
      {cartCountTotal > 0 && selectedRestaurant === "All Restaurants" && (
        <div className="fixed bottom-[68px] left-3.5 right-3.5 z-40 md:hidden bg-[#14141A]/95 border border-[#272733] px-3.5 py-2 rounded-2xl shadow-xl flex items-center justify-between gap-3 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#E21B70] text-white px-2.5 rounded-lg font-extrabold text-xs h-8 flex items-center justify-center min-w-[30px] tabular-nums">
              {cartCountTotal}
            </div>
            <div className="text-left">
              <span className="text-[10px] text-[#A3A3B5] font-bold uppercase tracking-wider block leading-none">
                Cart Total
              </span>
              <span className="text-white font-extrabold text-sm font-mono mt-1 block leading-none tabular-nums">
                Rs. {cartPriceTotal}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="min-h-[44px] bg-[#E21B70] hover:bg-[#C2145E] text-white font-extrabold text-xs uppercase tracking-wider px-4 rounded-xl transition-colors active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            View Cart
          </button>
        </div>
      )}

      {/* Footer with Company, Legal, Partner & Contact Links + Consistent Business Facts */}
      <footer className="max-w-7xl mx-auto w-full px-3.5 sm:px-4 mt-10 pt-8 pb-24 md:pb-10 border-t border-[#E6E6EE] dark:border-[#272733] text-xs text-[#5A5A6B] dark:text-[#A3A3B5]">
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
            <h4 className="font-extrabold text-[11px] uppercase tracking-wider text-[#111118] dark:text-[#F5F5F8] mb-2">
              Company & Legal
            </h4>
            <ul className="space-y-1 text-xs font-semibold">
              <li>
                <button type="button" onClick={() => navigateToInfoPage("about")} className="min-h-[36px] py-1 hover:text-[#E21B70] dark:hover:text-[#FF4D94] transition-colors cursor-pointer">
                  About Us
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigateToInfoPage("contact")} className="min-h-[36px] py-1 hover:text-[#E21B70] dark:hover:text-[#FF4D94] transition-colors cursor-pointer">
                  Contact & Helpline
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigateToInfoPage("terms")} className="min-h-[36px] py-1 hover:text-[#E21B70] dark:hover:text-[#FF4D94] transition-colors cursor-pointer">
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigateToInfoPage("privacy-policy")} className="min-h-[36px] py-1 hover:text-[#E21B70] dark:hover:text-[#FF4D94] transition-colors cursor-pointer">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigateToInfoPage("refund-policy")} className="min-h-[36px] py-1 hover:text-[#E21B70] dark:hover:text-[#FF4D94] transition-colors cursor-pointer">
                  Refund & Cancellation Policy
                </button>
              </li>
            </ul>
          </div>
          <div className="space-y-1.5">
            <h4 className="font-extrabold text-[11px] uppercase tracking-wider text-[#111118] dark:text-[#F5F5F8] mb-2">
              Grow With Dadu Food
            </h4>
            <ul className="space-y-1 text-xs font-semibold">
              <li>
                <button type="button" onClick={() => navigateToInfoPage("partner-with-us")} className="min-h-[36px] py-1 hover:text-[#E21B70] dark:hover:text-[#FF4D94] transition-colors cursor-pointer">
                  Register Your Restaurant
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigateToInfoPage("become-a-rider")} className="min-h-[36px] py-1 hover:text-[#E21B70] dark:hover:text-[#FF4D94] transition-colors cursor-pointer">
                  Become a Delivery Rider
                </button>
              </li>
            </ul>
          </div>
          <div className="space-y-1.5 text-xs">
            <h4 className="font-extrabold text-[11px] uppercase tracking-wider text-[#111118] dark:text-[#F5F5F8] mb-2">
              Dadu City Support
            </h4>
            <p className="font-semibold text-[#111118] dark:text-[#F5F5F8]">
              {DADU_FOOD_BUSINESS.address}
            </p>
            <p>Hours: {DADU_FOOD_BUSINESS.openingHoursDisplay}</p>
            <p>
              Helpline:{" "}
              <a
                href="https://wa.me/923277004471"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#E21B70] dark:text-[#FF4D94] hover:underline font-bold"
              >
                {DADU_FOOD_BUSINESS.phoneDisplay} (Call / WhatsApp)
              </a>
            </p>
            <p className="tabular-nums">Delivery: Rs. 50 · 2x below Rs. 500 · Free Rs. 1,000+</p>
          </div>
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
                   whileHover={{ scale: 1.1, rotateY: 10, rotateX: 5 }}
                   transition={{ type: "spring", bounce: 0.5 }}
                   className="w-40 h-40 rounded-[2.5rem] overflow-hidden bg-white/10 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.4)] relative z-10 border border-white/30 p-2 transform-gpu"
                >
                  <div className="w-full h-full rounded-[2rem] overflow-hidden bg-white relative">
                    {animatingRestaurant.imageUrl ? (
                      <img src={animatingRestaurant.imageUrl} alt={animatingRestaurant.name} className="w-full h-full object-cover transform scale-105 transition-transform duration-300 group-hover:scale-100" />
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

      {/* PWA Install Bubble (Very Small) */}
      <AnimatePresence>
        {showInstallBubble && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, x: -50 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -50 }}
            onClick={handleInstallClick}
            className={`fixed ${cartCountTotal > 0 ? 'bottom-[136px]' : 'bottom-[72px]'} left-4 z-40 md:hidden bg-zinc-900/90 backdrop-blur-md border border-zinc-800 shadow-xl rounded-full p-1.5 flex items-center gap-1.5 hover:bg-zinc-800 transition active:scale-95 group`}
          >
            <div className="w-5 h-5 rounded-md overflow-hidden shrink-0">
              <img src={daduLogo} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-zinc-200 font-bold text-[9px] uppercase tracking-wider pr-1">Install</span>
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showLocationPrompt && (
          <LocationPermissionModal 
            onAllow={requestLocation} 
            onLater={() => {
              setShowLocationPrompt(false);
              setLocationPromptDismissed(true);
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
