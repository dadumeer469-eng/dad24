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
} from "./types";
import { INITIAL_MENU_ITEMS } from "./data";

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
import useLazyBatchLoad from "./hooks/useLazyBatchLoad";
import daduLogo from "./assets/images/dadu_food_logo_new_1782333467889.jpg";
import { logMemoryUsage, useMemoryMonitor } from "./utils/memoryLogger";

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
      className="bg-[#D70F64] hover:bg-[#b00c50] text-white px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider text-center transition cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1.5 relative"
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

export default function App() {
  useMemoryMonitor("App");
  const [showSplash, setShowSplash] = useState(true);
  const [splashProgress, setSplashProgress] = useState(0);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Load saved theme on mount (Defaults to dark mode for all users)
  useEffect(() => {
    const saved = localStorage.getItem("dadu_theme");
    if (saved === "light") {
      setTheme("light");
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    } else {
      setTheme("dark");
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
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

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [isLoadingDishes, setIsLoadingDishes] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [deliverySettings, setDeliverySettings] = useState<SystemSettings>({
    deliveryFee: 50,
    restaurantStatus: {
      isTemporarilyUnavailable: false,
      openingTime: "09:00",
      closingTime: "23:00",
    },
  });

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

  // Standalone Grocery Module states
  const [activeModule, setActiveModule] = useState<"food" | "grocery">("food");
  const [foodCategories, setFoodCategories] = useState<FoodCategory[]>([]);
  const [groceryCategories, setGroceryCategories] = useState<GroceryCategory[]>(
    [],
  );
  const [groceryProducts, setGroceryProducts] = useState<GroceryProduct[]>([]);
  const [isLoadingGrocery, setIsLoadingGrocery] = useState(true);
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
    
    const vendorImageUrl = deliverySettings?.restaurantStatuses?.[vendor]?.imageUrl || deliverySettings?.restaurantStatuses?.[vendor]?.bgImageUrl;
    
    setAnimatingRestaurant({ name: vendor, imageUrl: vendorImageUrl });
    
    setTimeout(() => {
      if (category) setInitialRestaurantCategory(category);
      setSelectedRestaurant(vendor);
      window.scrollTo({ top: 0, behavior: "instant" });
      setTimeout(() => {
        setAnimatingRestaurant(null);
      }, 500);
    }, 2000);
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
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

  // Navigation Home Resetters
  const handleGoToFoodHome = () => {
    setActiveModule("food");
    setSelectedRestaurant("All Restaurants");
    setInitialRestaurantCategory(undefined);
    setActiveCategory("All");
    setSearchQuery("");
    setShowFavoritesOnly(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGoToGroceryHome = () => {
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
          const isAdmin = userData.role === "admin" || savedPhone === "03277004471";
          if (isAdmin && userData.role !== "admin") {
            const updated = { ...userData, role: "admin" };
            await setDoc(doc(db, "users", userUid), updated, { merge: true });
            setCurrentUser({ uid: userUid, ...updated } as UserProfile);
          } else {
            setCurrentUser({ uid: userUid, ...userData } as UserProfile);
          }
        } else {
          // Fallback guest with saved phone
          const isAdmin = savedPhone === "03277004471";
          const fallback: UserProfile = {
            uid: savedPhone,
            name: isAdmin ? "meerali120" : "Dadu Guest",
            phone: savedPhone,
            address: "",
            role: isAdmin ? "admin" : "buyer",
            ordersCount: 0,
          };
          setCurrentUser(fallback);
        }

        // Live listen to profile changes using the correct userUid
        unsubscribe = onSnapshot(doc(db, "users", userUid), (docSnap) => {
           if (docSnap.exists()) {
              setCurrentUser({ uid: userUid, ...docSnap.data() } as UserProfile);
           }
        });
      } else {
        setCurrentUser(null);
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

  // 1.5. Ultra 60FPS Smooth Fast Loading Splash Screen Animation using requestAnimationFrame
  useEffect(() => {
    setShowSplash(true);
    setSplashProgress(0);

    let animationFrameId: number;
    const startTime = performance.now();
    const duration = 400; // Fast 0.4 seconds total duration

    const updateProgress = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(Math.floor((elapsed / duration) * 100), 100);
      setSplashProgress(progress);

      if (progress < 100) {
        animationFrameId = requestAnimationFrame(updateProgress);
      } else {
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

  // 2. Real-time Menu Listening & Auto-Seeding
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
          setDeliverySettings(docSnap.data() as SystemSettings);
        } else {
          // Seed default
          setDoc(doc(db, "settings", "delivery_config"), {
            deliveryFee: 50,
            restaurantStatus: {
              isTemporarilyUnavailable: false,
              openingTime: "09:00",
              closingTime: "23:00",
            },
          }).catch(console.error);
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
              color: "from-[#d70f64] to-[#f22c80]",
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
              color: "from-purple-500 to-indigo-600",
              isAvailable: true,
              position: 10,
            },
            {
              id: "cat_services",
              name: "Home Services",
              emoji: "🛠️",
              subtitle: "Expert Repairs",
              color: "from-sky-500 to-blue-600",
              isAvailable: true,
              position: 11,
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
      },
      (err) => {
        console.warn("Grocery products notice:", handleFirestoreError(err));
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

  // 3e. Load SEO config and update document head
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "settings", "seo_config"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();

          if (data.title) {
            document.title = data.title;
          }

          if (data.description) {
            let descMeta = document.querySelector('meta[name="description"]');
            if (!descMeta) {
              descMeta = document.createElement("meta");
              descMeta.setAttribute("name", "description");
              document.head.appendChild(descMeta);
            }
            descMeta.setAttribute("content", data.description);
          }

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
        const oldUnreadCount = notifications.filter((n) => !n.read).length;

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

  // Handle Log Outs
  const handleLogout = async () => {
    localStorage.removeItem("dadu_user_phone");
    // Trigger custom event so initializeUser updates
    window.dispatchEvent(new StorageEvent("storage", { key: "dadu_user_phone" }));
    setCurrentUser(null);
    setCartItems([]);
    setActiveTrackingOrder(null);
    setIsAdminConsoleOpen(false);
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

      // Priority 2: If inside a Restaurant or Category page or Search query, navigate back to main Restaurant List / Homepage
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
    let itemRestaurant =
      dish.restaurantName ||
      (dish.type === "service"
        ? "Dadu Home Services"
        : "Dadu Fast Food & Kitchen");
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
    userCoords?: { latitude: number; longitude: number };
    coinsUsed?: number;
  }) => {
    if (currentUser?.status === 'locked' || currentUser?.status === 'blocked') {
      alert("Verification pending or blocked. Cannot place order.");
      return;
    }
    try {
      const generatedOrderId = `gorder_${Date.now()}`;

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
        grandTotal: details.grandTotal,
        paymentMethod: "cod",
        status: "pending",
        orderType: "grocery",
        deviceId: deviceId,
        createdAt: { seconds: Math.floor(Date.now() / 1000) },
        userCoords: details.userCoords || null,
        totalCommission,
        coinsUsed: details.coinsUsed || undefined,
      };

      await setDoc(doc(db, "orders", generatedOrderId), orderDoc);

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
  }) => {
    if (currentUser?.status === 'locked' || currentUser?.status === 'blocked') {
      setIsVerificationModalOpen(true);
      return;
    }
    if (!currentUser) {
      alert("Please Sign In or Register to submit your order!");
      setIsAuthOpen(true);
      return;
    }

    if (details.voucher) {
      const vRef = doc(db, "vouchers", details.voucher.code);
      const vSnap = await getDoc(vRef);
      if (vSnap.exists()) {
        const vData = vSnap.data();
        if (!vData.isActive || vData.currentUses >= vData.maxUses) {
          alert("Sorry, the applied voucher is no longer valid or has reached its usage limit.");
          return;
        }
      } else {
        alert("Invalid voucher code.");
        return;
      }
    }

    const itemsTotal = cartItems.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0,
    );

    const firstCartItem = cartItems[0];
    const itemRestaurant = firstCartItem?.restaurantName || "Dadu Fast Food & Kitchen";
    const specificStatus = deliverySettings?.restaurantStatuses?.[itemRestaurant];
    
    let effectiveMinOrder = deliverySettings.minOrderAmount || 0;
    if (specificStatus && specificStatus.minOrder !== undefined) {
      effectiveMinOrder = specificStatus.minOrder;
    }

    if (
      details.orderType === "food" &&
      effectiveMinOrder > 0 &&
      itemsTotal < effectiveMinOrder
    ) {
      alert(
        `Minimum order amount for ${itemRestaurant} is Rs. ${effectiveMinOrder}. Your current total is Rs. ${itemsTotal}. Please add more items.`,
      );
      return;
    }

    let parsedDeliveryFee = deliverySettings.deliveryFee;
    if (specificStatus && specificStatus.deliveryCharge) {
       const match = specificStatus.deliveryCharge.match(/\d+/);
       if (match) {
         parsedDeliveryFee = parseInt(match[0], 10);
       }
    }

    const baseFee =
      details.orderType === "food" ? parsedDeliveryFee : 0;
    
    // We only apply the 2x multiplier rule if there is no specific restaurant delivery fee set, or depending on business rules.
    // Assuming we want to
    const finalFee =
      details.orderType === "food" && itemsTotal < 500 && (!specificStatus || !specificStatus.deliveryCharge) ? baseFee * 2 : baseFee;
    
    let finalGrandTotal = itemsTotal + finalFee;
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

    const uniqueOrderId = `order_${Date.now()}`;
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
      grandTotal: finalGrandTotal,
      status: details.orderType === "service" ? "booked" : "placed",
      paymentMethod: details.paymentMethod as any,
      orderType: details.orderType,
      deviceId: deviceId,
      serviceTiming: computedServiceTiming,
      createdAt: { seconds: Date.now() / 1000 },
      userCoords: details.userCoords || undefined,
      totalCommission,
      voucher: details.voucher,
      coinsUsed: details.coinsUsed || undefined,
    };

    try {
      // 1. Save new Order
      await setDoc(doc(db, "orders", uniqueOrderId), cleanObject(orderModel));

      if (details.voucher) {
        await updateDoc(doc(db, "vouchers", details.voucher.code), {
          currentUses: increment(1)
        }).catch((err) => console.error("Failed to update voucher uses:", err));
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
  const finalDishes = React.useMemo(() => {
    return dishes.map((dish) => {
      let isAvailable = dish.isAvailable;
      
      const rName =
        dish.restaurantName?.trim() ||
        (dish.type === "service"
          ? "Dadu Home Services"
          : "Dadu Fast Food & Kitchen");

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
  }, [dishes, isDealActive, dealConfig, checkIsRestaurantClosed]);

  // --- RESTAURANT AVAILABILITY CHECK ---
  const uniqueRestaurants = React.useMemo(() => {
    const list = Array.from(
      new Set(
        dishes
          .map(
            (d) =>
              d.restaurantName?.trim() ||
              (d.type === "service"
                ? "Dadu Home Services"
                : "Dadu Fast Food & Kitchen"),
          )
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
  }, [dishes, checkIsRestaurantClosed, globalCoords, deliverySettings]);

  const filteredDishes = React.useMemo(() => {
    return finalDishes.filter((dish) => {
      // Hide checkout-exclusive soft drinks from main browsing screen & panels
      const isExclusiveDrink =
        dish.id.startsWith("drink_") ||
        dish.category === "Drinks" ||
        dish.category === "Beverages";
      if (isExclusiveDrink) return false;

      const matchesCategory =
        activeCategory === "All" || dish.category === activeCategory;
      const rName =
        dish.restaurantName ||
        (dish.type === "service"
          ? "Dadu Home Services"
          : "Dadu Fast Food & Kitchen");
      const matchesRestaurant =
        selectedRestaurant === "All Restaurants" || rName === selectedRestaurant;
      const matchesFavorites =
        !showFavoritesOnly || favoriteDishIds.includes(dish.id);
      const q = (searchQuery || "").trim().toLowerCase();
      const matchesSearch =
        !q ||
        (dish.name || "").toLowerCase().includes(q) ||
        (dish.description || "").toLowerCase().includes(q) ||
        (rName || "").toLowerCase().includes(q) ||
        (dish.category || "").toLowerCase().includes(q);

      return (
        matchesCategory && matchesRestaurant && matchesSearch && matchesFavorites
      );
    });
  }, [finalDishes, activeCategory, selectedRestaurant, showFavoritesOnly, favoriteDishIds, searchQuery]);

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
        onOpenAdmin={() => setIsAdminConsoleOpen(true)}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

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
              <div className="bg-[#D70F64] p-6 text-center">
                <div className="w-16 h-16 rounded-2xl mx-auto shadow-xl border-2 border-white/20 mb-3 bg-white flex items-center justify-center text-3xl animate-pulse">
                  📞
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  Verification Pending
                </h2>
              </div>
              <div className="p-6 sm:p-8 space-y-6">
                <p className="text-zinc-300 font-medium leading-relaxed">
                  Aapka number verify ho raha hai! Hum aapko jald hi call karenge. Verification ke baad aap order kar sakenge!
                </p>
                <button
                  onClick={() => setIsVerificationModalOpen(false)}
                  className="w-full bg-[#D70F64] hover:bg-[#b00c50] text-white font-black tracking-wide shadow-md transition-all py-3.5 rounded-2xl text-sm uppercase cursor-pointer"
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
        onAuthSuccess={async (phone, isStaffMode, password) => {
          if (isStaffMode) {
            // Admin Logic
            if (phone === "03277004471" && password === "meerali120") {
               const profileRef = doc(db, "users", phone);

;
;






               const profileSnap = await getDoc(profileRef);
               if (!profileSnap.exists()) {
                  await setDoc(profileRef, {
                     uid: phone,
                     name: "meerali120",
                     phone: phone,
                     address: "",
                     role: "admin",
                     status: "verified",
                     ordersCount: 0,
                     totalOrders: 0,
                     isBlacklisted: false,
                     createdAt: new Date(),
                  });
               } else {
                  if (profileSnap.data().role !== "admin") {
                     await setDoc(profileRef, { role: "admin" }, { merge: true });
                  }
               }
               localStorage.setItem("dadu_user_phone", phone);
               window.dispatchEvent(new StorageEvent("storage", { key: "dadu_user_phone" }));
               setIsAdminConsoleOpen(true);
               setIsAuthOpen(false);
               return;
            }

            // Rider Logic
            const sanitizePhone = (phoneStr: string) => {
              let cleaned = phoneStr.replace(/\D/g, "");
              if (cleaned.startsWith("92")) {
                cleaned = "0" + cleaned.substring(2);
              }
              return cleaned;
            };

            const isUsername =
              /[a-zA-Z]/.test(phone) ||
              (phone.length > 0 &&
                phone.length < 10 &&
                !/^\d+$/.test(phone));
            const cleanPhone = isUsername
              ? phone.toLowerCase()
              : sanitizePhone(phone);

            // Find the rider in database
            let riderData: any = null;
            let riderUid: string = "";

            const directRef = doc(db, "users", cleanPhone);
            const directSnap = await getDoc(directRef);
            if (directSnap.exists() && directSnap.data().role === "rider") {
              riderData = directSnap.data();
              riderUid = cleanPhone;
            } else {
              const q = query(
                collection(db, "users"),
                where("phone", "==", cleanPhone),
                where("role", "==", "rider")
              );
              const qSnap = await getDocs(q);
              if (!qSnap.empty) {
                riderData = qSnap.docs[0].data();
                riderUid = qSnap.docs[0].id;
              }
            }

            if (riderData) {
              // Try passcode validation first (general/fallback or database field password)
              if (password === "1234" || password === "786786" || (riderData.password && password === riderData.password)) {
                localStorage.setItem("dadu_user_phone", cleanPhone);
                window.dispatchEvent(new StorageEvent("storage", { key: "dadu_user_phone" }));
                setIsAuthOpen(false);
                return;
              }

              // Otherwise try Firebase Auth with email and password
              try {
                const computedEmail = `${cleanPhone}@dadu247.com`;
                await signInWithEmailAndPassword(auth, computedEmail, password);
                localStorage.setItem("dadu_user_phone", cleanPhone);
                window.dispatchEvent(new StorageEvent("storage", { key: "dadu_user_phone" }));
                setIsAuthOpen(false);
                return;
              } catch (authErr: any) {
                console.error("Rider Auth Login Error:", authErr);
                throw new Error("Aapka password ya passcode durust nahi hai.");
              }
            }
            throw new Error("Is number ya username se koi Rider registered nahi hai.");
          }

          const blacklistRef = doc(db, "blacklist", phone);
          const blacklistSnap = await getDoc(blacklistRef);
          if (blacklistSnap.exists()) {
            throw new Error("Yeh number register nahi ho sakta.");
          }

          const profileRef = doc(db, "users", phone);
          const profileSnap = await getDoc(profileRef);

          if (profileSnap.exists()) {
            const data = profileSnap.data();
            if (data.status === 'blocked' || data.isBlacklisted) {
              throw new Error("Yeh number register nahi ho sakta.");
            }
            if (data.role === 'admin' || data.role === 'rider') {
              throw new Error("Staff members must login via Staff Mode with a passcode.");
            }
            
            if (globalCoords) {
              try {
                await setDoc(profileRef, {
                  savedLocation: {
                    lat: globalCoords.latitude,
                    lng: globalCoords.longitude,
                    area: data.savedLocation?.area || "",
                    street: data.savedLocation?.street || ""
                  }
                }, { merge: true });
              } catch (e) {
                console.warn("Could not update GPS location", e);
              }
            }
          } else if (phone === "03277004471") {
            throw new Error("Staff members must login via Staff Mode with a passcode.");
          }

          localStorage.setItem("dadu_user_phone", phone);
          window.dispatchEvent(new StorageEvent("storage", { key: "dadu_user_phone" }));
          
          if (!profileSnap.exists()) {
            const newProfile: any = {
              uid: phone,
              name: "",
              phone: phone,
              address: "",
              role: "buyer",
              status: "locked",
              ordersCount: 0,
              totalOrders: 0,
              isBlacklisted: false,
              createdAt: new Date(),
            };
            if (globalCoords) {
              newProfile.savedLocation = { lat: globalCoords.latitude, lng: globalCoords.longitude, area: "", street: "" };
            }
            await setDoc(profileRef, newProfile);
            setIsAuthOpen(false);
            
            // Show verification popup for new users
            setTimeout(() => {
              setIsVerificationModalOpen(true);
            }, 300);
            return;
          }
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
                activeDetailDish.restaurantName ||
                  (activeDetailDish.type === "service"
                    ? "Dadu Home Services"
                    : "Dadu Fast Food & Kitchen"),
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
        <div className="fixed bottom-6 right-6 z-50 p-4 max-w-sm bg-zinc-900 border-2 border-[#d70f64]/40 text-zinc-100 rounded-2xl shadow-2xl flex items-start gap-3 animate-slide-in">
          <div className="bg-[#d70f64] text-white p-2.5 rounded-xl shrink-0">
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
          <div className="bg-zinc-900 border-2 border-[#d70f64]/30 rounded-[32px] max-w-sm w-full overflow-hidden shadow-2xl text-zinc-100 relative">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#d70f64] to-transparent" />
            <div className="p-6 text-center space-y-5">
              <div className="mx-auto w-16 h-16 rounded-full bg-[#d70f64]/10 border border-[#d70f64]/20 flex items-center justify-center text-[#d70f64]">
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
                  className="w-full bg-[#d70f64] hover:bg-[#b00c50] text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition active:scale-95 shadow-md flex items-center justify-center gap-2 cursor-pointer"
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
                  className="w-full bg-[#D70F64] hover:bg-[#b00c50] text-white py-3.5 sm:py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition active:scale-95 shadow-lg shadow-[#D70F64]/10 hover:shadow-[#D70F64]/20 flex items-center justify-center gap-2 cursor-pointer"
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
        <div className="absolute w-80 h-80 sm:w-96 sm:h-96 bg-[#D70F64]/20 rounded-full blur-[100px] pointer-events-none animate-pulse" />

        {/* Central Neon Emblem with Glowing Rings */}
        <div className="relative z-10 mb-8 flex items-center justify-center">
          {/* Outer Ring with Glow */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-44 h-44 sm:w-52 sm:h-52 rounded-full border-[3px] border-[#D70F64] shadow-[0_0_40px_rgba(215,15,100,0.8),inset_0_0_20px_rgba(215,15,100,0.6)] p-2.5 flex items-center justify-center relative bg-black/90"
          >
            {/* Inner Ring with Logo */}
            <div className="w-full h-full rounded-full border-2 border-[#D70F64]/80 shadow-[0_0_25px_rgba(215,15,100,0.7)] bg-black flex flex-col items-center justify-center p-3 relative overflow-hidden">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full p-0.5 bg-white shadow-lg overflow-hidden flex items-center justify-center mb-1.5 border border-pink-500/30">
                <img src={daduLogo} alt="Dadu Food Logo" className="w-full h-full object-cover rounded-full bg-white" />
              </div>
              
              <span className="text-[11px] sm:text-xs font-black tracking-[0.25em] text-white uppercase drop-shadow-[0_0_10px_#D70F64]">
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
            DADU <span className="text-[#D70F64] drop-shadow-[0_0_20px_#D70F64]">FOOD</span>
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
        <div className="w-24 h-24 mb-6 rounded-3xl bg-gradient-to-br from-[#d70f64] to-red-500 flex items-center justify-center shadow-2xl shadow-[#d70f64]/20 animate-pulse">
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
      const rName =
        d.restaurantName?.trim() ||
        (d.type === "service"
          ? "Dadu Home Services"
          : "Dadu Fast Food & Kitchen");
      return rName === selectedRestaurant;
    });

    const selectedFoodCategory = foodCategories.find(c => c.name === selectedRestaurant);

    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-zinc-50"><div className="w-10 h-10 border-4 border-[#d70f64] border-t-transparent rounded-full animate-spin" /></div>}>
        <FoodpandaRestaurantPage
          restaurantName={selectedRestaurant}
          dishes={restaurantDishes}
          deliverySettings={deliverySettings}
          initialCategory={initialRestaurantCategory}
          isRestaurantClosed={checkIsRestaurantClosed(selectedRestaurant)}
          bgImageUrl={deliverySettings?.restaurantStatuses?.[selectedRestaurant]?.bgImageUrl || selectedFoodCategory?.bgImageUrl}
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
            return "Nearby";
          })()}
        />
        {commonModals}
        {lockedBanner}
      </Suspense>
    );
  }

  const isUserAdmin = currentUser?.role === "admin";
  const isMaintenanceActive = deliverySettings?.isMaintenanceMode === true;



  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFFDFE] via-[#FDF5F8] to-[#FFFDFE] dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 text-zinc-800 dark:text-zinc-100 relative pb-28 md:pb-12 flex flex-col font-sans overflow-x-clip">
      {/* Decorative Premium Food Watermark/Pattern Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
        {/* Subtle grid pattern of culinary shapes */}
        <div
          className="absolute inset-0 w-full h-full opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cpath d='M15 15h10v10H15zm40 20h10v10H55zm40-20h10v10H95zM35 75h10v10H35zm40 10h10v10H75zM25 105h10v10H25zm50 5h10v10H75zm40-20h10v10h-10z' fill='%23D70F64'/%3E%3C/svg%3E")`,
            backgroundSize: "120px 120px",
          }}
        />

        {/* Floating Glowing Culinary Accents (Sunset & Pink gradients) */}
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-pink-400/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -right-48 w-96 h-96 bg-pink-300/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-rose-300/8 rounded-full blur-[100px]" />

        {/* Ambient floating elements behind content (visible on tablet and desktop) */}
        <div className="absolute top-[400px] left-[10%] opacity-[0.06] text-6xl animate-pulse">
          🍔
        </div>
        <div
          className="absolute top-[650px] right-[8%] opacity-[0.05] text-5xl animate-bounce"
          style={{ animationDuration: "6s" }}
        >
          🍕
        </div>
        <div
          className="absolute top-[1100px] left-[5%] opacity-[0.04] text-7xl animate-pulse"
          style={{ animationDuration: "8s" }}
        >
          🍵
        </div>
        <div
          className="absolute top-[1400px] right-[12%] opacity-[0.05] text-6xl animate-bounce"
          style={{ animationDuration: "7s" }}
        >
          🍗
        </div>
        <div className="absolute top-[1900px] left-[12%] opacity-[0.04] text-5xl animate-pulse">
          🔧
        </div>
        <div
          className="absolute top-[2200px] right-[6%] opacity-[0.06] text-7xl animate-bounce"
          style={{ animationDuration: "5s" }}
        >
          🍏
        </div>
        <div
          className="absolute top-[2700px] left-[8%] opacity-[0.05] text-6xl animate-pulse"
          style={{ animationDuration: "9s" }}
        >
          🍩
        </div>
      </div>

      {/* Decorative Food Side Panels (Visible only on wide desktop screens to fill the margins) */}
      <div className="hidden xl:flex fixed left-4 top-1/4 bottom-1/4 w-44 flex-col justify-around pointer-events-none select-none z-10">
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="bg-white/90 backdrop-blur-md p-3.5 rounded-2xl border border-pink-150/60 shadow-[0_12px_40px_rgba(0,0,0,0.06)] flex flex-col items-center text-center gap-1.5"
        >
          <LazyImage
            src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=120"
            alt="Hot Burger"
            className="w-14 h-14 rounded-full overflow-hidden border-2 border-pink-200 shadow-sm"
            referrerPolicy="no-referrer"
          />
          <span className="text-[10px] font-black uppercase text-[#d70f64] tracking-wider mt-1">
            Hot Burgers
          </span>
          <span className="text-[9px] text-zinc-400 font-semibold leading-none">
            Fresh & Sizzling
          </span>
        </motion.div>

        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
          className="bg-white/90 backdrop-blur-md p-3.5 rounded-2xl border border-pink-150/60 shadow-[0_12px_40px_rgba(0,0,0,0.06)] flex flex-col items-center text-center gap-1.5"
        >
          <LazyImage
            src="https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=120"
            alt="Special Tea"
            className="w-14 h-14 rounded-full overflow-hidden border-2 border-pink-200 shadow-sm"
            referrerPolicy="no-referrer"
          />
          <span className="text-[10px] font-black uppercase text-[#d70f64] tracking-wider mt-1">
            Dadu Special Tea
          </span>
          <span className="text-[9px] text-zinc-400 font-semibold leading-none">
            Brewed with love
          </span>
        </motion.div>

        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
          className="bg-white/90 backdrop-blur-md p-3.5 rounded-2xl border border-pink-150/60 shadow-[0_12px_40px_rgba(0,0,0,0.06)] flex flex-col items-center text-center gap-1.5"
        >
          <LazyImage
            src="https://images.unsplash.com/photo-1610348725511-27aae371f0d9?auto=format&fit=crop&q=80&w=120"
            alt="Grocery"
            className="w-14 h-14 rounded-full overflow-hidden border-2 border-orange-200 shadow-sm"
            referrerPolicy="no-referrer"
          />
          <span className="text-[10px] font-black uppercase text-pink-600 tracking-wider mt-1">
            Groceries
          </span>
          <span className="text-[9px] text-zinc-400 font-semibold leading-none">
            Delivered under 20m
          </span>
        </motion.div>
      </div>

      <div className="hidden xl:flex fixed right-4 top-1/4 bottom-1/4 w-44 flex-col justify-around pointer-events-none select-none z-10">
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 4.2, ease: "easeInOut" }}
          className="bg-white/90 backdrop-blur-md p-3.5 rounded-2xl border border-pink-150/60 shadow-[0_12px_40px_rgba(0,0,0,0.06)] flex flex-col items-center text-center gap-1.5"
        >
          <LazyImage
            src="https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=120"
            alt="Cheesy Pizza"
            className="w-14 h-14 rounded-full overflow-hidden border-2 border-pink-200 shadow-sm"
            referrerPolicy="no-referrer"
          />
          <span className="text-[10px] font-black uppercase text-[#d70f64] tracking-wider mt-1">
            Cheesy Pizza
          </span>
          <span className="text-[9px] text-zinc-400 font-semibold leading-none">
            Thick Crust Hot
          </span>
        </motion.div>

        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 3.8, ease: "easeInOut" }}
          className="bg-white/90 backdrop-blur-md p-3.5 rounded-2xl border border-pink-150/60 shadow-[0_12px_40px_rgba(0,0,0,0.06)] flex flex-col items-center text-center gap-1.5"
        >
          <LazyImage
            src="https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&q=80&w=120"
            alt="Dadu Biryani"
            className="w-14 h-14 rounded-full overflow-hidden border-2 border-pink-200 shadow-sm"
            referrerPolicy="no-referrer"
          />
          <span className="text-[10px] font-black uppercase text-[#d70f64] tracking-wider mt-1">
            Dadu Biryani
          </span>
          <span className="text-[9px] text-zinc-400 font-semibold leading-none">
            Spiced to perfection
          </span>
        </motion.div>

        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 4.8, ease: "easeInOut" }}
          className="bg-white/90 backdrop-blur-md p-3.5 rounded-2xl border border-pink-150/60 shadow-[0_12px_40px_rgba(0,0,0,0.06)] flex flex-col items-center text-center gap-1.5"
        >
          <LazyImage
            src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=120"
            alt="Home Services"
            className="w-14 h-14 rounded-full overflow-hidden border-2 border-zinc-200 shadow-sm"
            referrerPolicy="no-referrer"
          />
          <span className="text-[10px] font-black uppercase text-zinc-700 tracking-wider mt-1">
            Home Services
          </span>
          <span className="text-[9px] text-zinc-400 font-semibold leading-none">
            Certified Mechanics
          </span>
        </motion.div>
      </div>

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
                className="absolute w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] bg-gradient-to-tr from-[#d70f64] to-[#7209b7] rounded-full blur-[100px] opacity-60"
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
          onOpenAdmin={() => setIsAdminConsoleOpen(true)}
          onOpenHistory={() => setIsHistoryDrawerOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          notifications={notifications}
          onClearNotifications={handleClearNotificationsAll}
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

      {!isAdminConsoleOpen ? (
        isMaintenanceActive && !isUserAdmin ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10 max-w-lg mx-auto my-auto min-h-[70vh] gap-6 relative animate-fade-in">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/30 rounded-2xl flex items-center justify-center border border-rose-100 dark:border-rose-900 animate-bounce shadow-md">
              <Wrench className="w-8 h-8 text-[#d70f64]" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 uppercase">
                Under Maintenance
              </h1>
              <p className="text-[10px] font-bold tracking-widest text-[#d70f64] uppercase">
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
          {/* Module Switcher Tabs - Smooth Framer Motion Switcher */}
          {!isAuthOpen && (
            <div className="max-w-7xl mx-auto px-4 mt-6">
              <div className="bg-zinc-200/80 dark:bg-zinc-850 p-1 rounded-2xl flex gap-1.5 border border-zinc-200/80 dark:border-zinc-800 shadow-inner relative overflow-hidden max-w-sm sm:max-w-md mx-auto backdrop-blur-md select-none">
                <button
                  type="button"
                  onClick={handleGoToFoodHome}
                  className={`relative flex-1 py-2.5 sm:py-3 text-[10.5px] font-black uppercase tracking-wider rounded-xl transition-colors duration-200 flex items-center justify-center gap-1.5 cursor-pointer z-10 ${
                    activeModule === "food"
                      ? "text-white"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  {activeModule === "food" && (
                    <motion.div
                      layoutId="activeModulePill"
                      className="absolute inset-0 bg-[#d70f64] rounded-xl shadow-md"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10 text-sm">🍔</span>
                  <span className="relative z-10">Dadu Kitchen</span>
                </button>

                <button
                  type="button"
                  onClick={handleGoToGroceryHome}
                  className={`relative flex-1 py-2.5 sm:py-3 text-[10.5px] font-black uppercase tracking-wider rounded-xl transition-colors duration-200 flex items-center justify-center gap-1.5 cursor-pointer z-10 ${
                    activeModule === "grocery"
                      ? "text-white"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  {activeModule === "grocery" && (
                    <motion.div
                      layoutId="activeModulePill"
                      className="absolute inset-0 bg-[#d70f64] rounded-xl shadow-md"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10 text-xs">🍏</span>
                  <span className="relative z-10">Groceries</span>
                  {groceryCartItems.length > 0 && (
                    <span className="relative z-10 bg-white text-[#d70f64] font-mono text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-xs leading-none shrink-0">
                      {groceryCartItems.reduce((acc, i) => acc + i.quantity, 0)}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          <Suspense fallback={<div className="p-10 text-center animate-pulse">Loading modules...</div>}>
            <AnimatePresence mode="wait">
              {activeModule === "food" ? (
                <motion.div
                  key="food-module-view"
                  initial={{ opacity: 0, y: 14, scale: 0.995 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -14, scale: 0.995 }}
                  transition={{ duration: 0.24, ease: [0.25, 0.1, 0.25, 1.0] }}
                >
              <>
                <BannerCarousel 
                  bannerVersion={deliverySettings.bannerVersion} 
                  onBannerClick={(actionLink) => {
                    if (actionLink.startsWith("http")) {
                      window.open(actionLink, "_blank");
                    } else {
                      setActiveCategory("All");
                      handleRestaurantClick(actionLink);
                    }
                  }}
                />
                {/* Billboard / category selectors */}
                <FoodpandaHero
                  activeCategory={activeCategory}
                  setActiveCategory={setActiveCategory}
                  dealConfig={dealConfig}
                  dealTimeLeft={dealTimeLeft}
                  foodCategories={foodCategories}
                  heroBgUrl={heroBgUrl}
                >
                <div className="max-w-7xl mx-auto px-4 mt-6 mb-2">
                  <motion.div
                    initial={{ opacity: 0, y: 28, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className="relative p-5 rounded-3xl space-y-4 shadow-md border border-pink-200/50 dark:border-zinc-800 overflow-hidden"
                  >
                    {/* Premium Partner Shops Background Image Overlay - HD Crystal Clear */}
                    <div className="absolute inset-0 z-0 overflow-hidden">
                      <img
                        src={partnerShopsBgUrl || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1200"}
                        alt="Partner Shops Background"
                        className="w-full h-full object-cover transition-all duration-500 scale-100 contrast-[1.02] brightness-[0.95]"
                        referrerPolicy="no-referrer"
                      />
                      {/* Subtle gradient vignette to ensure crisp readability while maintaining 100% HD image clarity */}
                      <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-black/65" />
                    </div>

                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#d70f64] to-pink-500 flex items-center justify-center shadow-lg shadow-pink-500/30 text-white shrink-0">
                          <Compass className="w-5 h-5 animate-pulse-subtle" />
                        </div>
                        <div>
                          <h4 className="text-[13px] font-black uppercase tracking-widest text-white drop-shadow-xs">
                            Partner Shops
                          </h4>
                          <p className="text-[10px] text-pink-200 font-bold leading-tight mt-0.5 tracking-wide">
                            Filter by specific vendor
                          </p>
                        </div>
                      </div>
                      {selectedRestaurant !== "All Restaurants" && (
                        <button
                          onClick={() =>
                            setSelectedRestaurant("All Restaurants")
                          }
                          className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer shadow-sm active:scale-95"
                        >
                          Reset
                        </button>
                      )}
                    </div>

                    <div className="flex items-start gap-3 overflow-x-auto pb-2 scrollbar-none scroll-smooth px-1 relative z-10">
                      <motion.button
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() =>
                          setSelectedRestaurant("All Restaurants")
                        }
                        className={`w-[90px] h-[95px] rounded-2xl flex flex-col items-center justify-center p-2 font-black transition shrink-0 cursor-pointer border ${
                          selectedRestaurant === "All Restaurants"
                            ? "bg-[#d70f64] text-white border-white/80 shadow-md shadow-pink-500/30 ring-2 ring-pink-400/50"
                            : "bg-white/95 backdrop-blur-md text-zinc-700 hover:text-zinc-900 hover:bg-white border-white/80 shadow-xs"
                        }`}
                      >
                        <span className="text-2xl mb-1">🎪</span>
                        <span className="text-[10px] text-center uppercase tracking-wider leading-tight font-black">
                          All Shops
                        </span>
                      </motion.button>
                      {isLoadingDishes
                        ? Array.from({ length: 5 }).map((_, idx) => (
                            <div
                              key={`sk-${idx}`}
                              className="w-[90px] h-[95px] rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center p-1 shrink-0 animate-pulse"
                            >
                              <div className="w-full h-full rounded-xl bg-white/30" />
                            </div>
                          ))
                        : uniqueRestaurants.map((vendor, idx) => {
                            const vendorImageUrl =
                              deliverySettings?.restaurantStatuses?.[
                                vendor
                              ]?.imageUrl;
                            const vendorCoords = deliverySettings?.restaurantStatuses?.[vendor]?.coords;
                            const refCoords = globalCoords || (
                              deliverySettings?.baseLocationCoords?.lat && deliverySettings?.baseLocationCoords?.lng
                                ? { latitude: deliverySettings.baseLocationCoords.lat, longitude: deliverySettings.baseLocationCoords.lng }
                                : { latitude: 26.7323, longitude: 67.7744 }
                            );
                            const distKm = vendorCoords?.lat && vendorCoords?.lng
                              ? calculateDistanceKm(refCoords.latitude, refCoords.longitude, vendorCoords.lat, vendorCoords.lng).toFixed(1) + " km"
                              : null;

                            return (
                              <motion.button
                                key={vendor}
                                initial={{ opacity: 0, y: 20, scale: 0.94 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.35, delay: idx * 0.045 }}
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                onClick={() =>
                                  handleRestaurantClick(vendor)
                                }
                                className={`w-[90px] h-[95px] rounded-2xl flex flex-col items-center justify-between p-1.5 font-black transition shrink-0 cursor-pointer border overflow-hidden shadow-xs hover:shadow-md ${
                                  selectedRestaurant === vendor
                                    ? "bg-[#d70f64] text-white border-white/80 ring-2 ring-pink-400/50 shadow-md shadow-pink-500/30"
                                    : "bg-white/95 backdrop-blur-md text-zinc-800 hover:text-zinc-950 hover:bg-white border-white/80"
                                }`}
                                title={`${vendor}${distKm ? ` (${distKm})` : ""}`}
                              >
                                <div className="w-full h-[62px] rounded-xl overflow-hidden bg-zinc-100 flex items-center justify-center relative">
                                  {vendorImageUrl ? (
                                    <LazyImage
                                      src={vendorImageUrl}
                                      alt={vendor}
                                      className="w-full h-full object-cover"
                                      imgClassName="object-cover w-full h-full"
                                    />
                                  ) : (
                                    <span className="opacity-90 text-2xl">
                                      {vendor.includes("Services") ||
                                      vendor.includes("Pr") ||
                                      vendor.includes("Re")
                                        ? "🛠️"
                                        : "🍔"}
                                    </span>
                                  )}
                                  {distKm && (
                                    <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[8px] font-extrabold px-1 py-0.5 rounded-md backdrop-blur-xs">
                                      {distKm}
                                    </span>
                                  )}
                                </div>
                                <span className={`text-[9.5px] font-black text-center truncate w-full px-0.5 tracking-tight ${selectedRestaurant === vendor ? "text-white" : "text-zinc-800"}`}>
                                  {vendor}
                                </span>
                              </motion.button>
                            );
                          })}
                    </div>
                  </motion.div>
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
                  <div className="max-w-7xl mx-auto px-3 sm:px-4 mt-4 sm:mt-6 flex overflow-x-auto gap-3 sm:gap-4 pb-2 scrollbar-none snap-x">
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
                          className="shrink-0 w-[90vw] sm:w-[580px] max-w-full snap-center bg-white border-2 border-[#d70f64] rounded-2xl shadow-xl shadow-red-500/5 overflow-hidden transition-all duration-300 hover:shadow-2xl"
                        >
                          {/* Banner Header: Tap-to-track details */}
                          <div
                            onClick={() => {
                              setActiveTrackingOrder(activeOrderForBanner);
                              setIsTrackingModalOpen(true);
                            }}
                            className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-zinc-50 transition border-b border-zinc-100"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#d70f64]/10 border border-[#d70f64]/20 flex items-center justify-center text-xl shrink-0 animate-pulse">
                                {isService ? "🛠️" : "🛵"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-[9.5px] font-black uppercase tracking-widest text-[#d70f64] flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                                  Live Order Tracking Active
                                </span>
                                <h4 className="text-xs sm:text-sm font-black text-zinc-800 mt-0.5 leading-normal truncate">
                                  {isService ? "Service" : "Order"}{" "}
                                  <span className="font-mono text-zinc-500 font-bold">
                                    #{activeOrderForBanner.id.substring(0, 5)}
                                  </span>{" "}
                                  •{" "}
                                  <span className="text-[#d70f64] uppercase font-bold">
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
                                {activeOrderForBanner.riderName ? (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-[9.5px] text-zinc-500 font-extrabold truncate">
                                      Hero:{" "}
                                      <span className="text-[#d70f64] font-black">
                                        {activeOrderForBanner.riderName}
                                      </span>
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[9.5px] text-zinc-400 font-bold block mt-0.5 truncate">
                                    ⏳ Assigning driver...
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Rider ETA Box */}
                            <div className="shrink-0 bg-gradient-to-r from-[#d70f64] to-pink-600 text-white px-3 py-1.5 rounded-2xl text-center shadow-md border border-pink-400/30">
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
                                className="absolute left-3 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-pink-500 to-[#d70f64] -z-10 rounded-full transition-all duration-500"
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
                                          ? "bg-[#d70f64] text-white ring-2 ring-pink-100"
                                          : "bg-white text-zinc-400 border border-zinc-200"
                                      } ${isCurrent ? "animate-pulse scale-110" : ""}`}
                                    >
                                      {step.emoji}
                                    </div>
                                    <span
                                      className={`text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider mt-1 ${
                                        isCurrent ? "text-[#d70f64]" : isPassed ? "text-zinc-700" : "text-zinc-400"
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
                            <div className="px-3.5 py-2 bg-zinc-50 flex items-center justify-between gap-2 border-t border-zinc-100 overflow-x-auto">
                              <span className="text-[9.5px] text-zinc-500 font-extrabold flex items-center gap-1 shrink-0 truncate">
                                <span className="w-1.5 h-1.5 bg-emerald-500 animate-pulse rounded-full"></span>
                                {activeOrderForBanner.riderName}:
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
              <main className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Left Column: Menu Cards Catalog grid */}
                  <div className="flex-1 space-y-6">

                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-extrabold tracking-wider text-zinc-750 uppercase border-b border-red-100 pb-2">
                        {selectedRestaurant === "All Restaurants"
                          ? activeCategory
                          : selectedRestaurant}{" "}
                        Delicacies ({filteredDishes.length})
                      </h3>
                      {searchQuery && (
                        <span className="text-xs text-zinc-500 font-bold">
                          Matching "{searchQuery}"
                        </span>
                      )}
                    </div>

                    {selectedRestaurant === "All Restaurants" && activeCategory === "All" && !searchQuery ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {(() => {
                          const uniqueRestaurantsList = Array.from(
                            new Set(
                              dishes
                                .map(
                                  (d) =>
                                    d.restaurantName?.trim() ||
                                    (d.type === "service"
                                      ? "Dadu Home Services"
                                      : "Dadu Fast Food & Kitchen"),
                                )
                                .filter(Boolean),
                            ),
                          ) as string[];
                          
                          uniqueRestaurantsList.sort((a, b) => {
                            const aClosed = checkIsRestaurantClosed(a) ? 1 : 0;
                            const bClosed = checkIsRestaurantClosed(b) ? 1 : 0;
                            if (aClosed !== bClosed) return aClosed - bClosed;
                            
                            const refCoords = globalCoords || (
                              deliverySettings?.baseLocationCoords?.lat && deliverySettings?.baseLocationCoords?.lng
                                ? { latitude: deliverySettings.baseLocationCoords.lat, longitude: deliverySettings.baseLocationCoords.lng }
                                : { latitude: 26.7323, longitude: 67.7744 }
                            );

                            const aCoords = deliverySettings?.restaurantStatuses?.[a]?.coords;
                            const bCoords = deliverySettings?.restaurantStatuses?.[b]?.coords;
                            const aDist = aCoords?.lat && aCoords?.lng ? calculateDistanceKm(refCoords.latitude, refCoords.longitude, aCoords.lat, aCoords.lng) : Infinity;
                            const bDist = bCoords?.lat && bCoords?.lng ? calculateDistanceKm(refCoords.latitude, refCoords.longitude, bCoords.lat, bCoords.lng) : Infinity;
                            if (aDist !== bDist) return aDist - bDist;

                            return a.localeCompare(b);
                          });

                          return uniqueRestaurantsList.map((vendor) => {
                            const vendorImageUrl =
                              deliverySettings?.restaurantStatuses?.[vendor]
                                ?.imageUrl;
                            const vendorDishes = dishes
                              .filter(
                                (d) =>
                                  (d.restaurantName?.trim() ||
                                    (d.type === "service"
                                      ? "Dadu Home Services"
                                      : "Dadu Fast Food & Kitchen")) ===
                                    vendor && d.isAvailable !== false,
                              )
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

                            const isClosed = checkIsRestaurantClosed(vendor);

                            const vendorCoords = deliverySettings?.restaurantStatuses?.[vendor]?.coords;
                            const refCoords = globalCoords || (
                              deliverySettings?.baseLocationCoords?.lat && deliverySettings?.baseLocationCoords?.lng
                                ? { latitude: deliverySettings.baseLocationCoords.lat, longitude: deliverySettings.baseLocationCoords.lng }
                                : { latitude: 26.7323, longitude: 67.7744 }
                            );
                            const distanceDisplay = vendorCoords?.lat && vendorCoords?.lng
                              ? calculateDistanceKm(refCoords.latitude, refCoords.longitude, vendorCoords.lat, vendorCoords.lng).toFixed(1) + " km away"
                              : "Nearby";

                            return (
                              <div
                                key={vendor}
                                onClick={() => handleRestaurantClick(vendor)}
                                className={`bg-white border border-zinc-200/80 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col ${isClosed ? "opacity-70 grayscale-[20%]" : ""}`}
                              >
                                <div className="h-40 bg-zinc-100 relative overflow-hidden shrink-0">
                                  {vendorImageUrl ? (
                                    <LazyImage
                                      src={vendorImageUrl}
                                      alt={vendor}
                                      className="w-full h-full"
                                      imgClassName="object-cover group-hover:scale-105 transition duration-500"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-red-50 text-5xl">
                                      {vendor.includes("Services")
                                        ? "🛠️"
                                        : "🍔"}
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                                  
                                  {/* Distance Badge Top Left */}
                                  <div className="absolute top-3 left-3 bg-zinc-950/80 text-white border border-white/20 px-2.5 py-1 rounded-xl text-[11px] font-black shadow-lg backdrop-blur-md flex items-center gap-1">
                                    <Compass className="w-3.5 h-3.5 text-pink-400" />
                                    <span>{distanceDisplay}</span>
                                  </div>

                                  <div className="absolute bottom-3 left-4 text-white">
                                    <h3 className="font-black text-xl tracking-tight shadow-sm leading-none mb-1.5">
                                      {vendor}
                                    </h3>
                                    <p className="text-[11px] font-bold text-white/90 flex items-center gap-2">
                                      <span className="flex items-center bg-white/20 px-1.5 py-0.5 rounded-md backdrop-blur-md">
                                        <Star className="w-3 h-3 text-amber-400 mr-1 fill-current" />{" "}
                                        {deliverySettings?.restaurantStatuses?.[
                                          vendor
                                        ]?.rating || "4.5"}
                                      </span>
                                      <span>•</span>
                                      <span className="flex items-center">
                                        <Clock className="w-3 h-3 mr-1" /> 20-30
                                        min
                                      </span>
                                      <span>•</span>
                                      <span className="flex items-center">
                                        <MapPin className="w-3 h-3 mr-1" />{" "}
                                        {(() => {
                                          let chargeStr = deliverySettings?.restaurantStatuses?.[vendor]?.deliveryCharge;
                                          if (!chargeStr) {
                                            const fee = deliverySettings?.deliveryFee || 50;
                                            chargeStr = `Rs. ${fee}`;
                                          }
                                          if (isRiderRangeExceeded) {
                                            const match = chargeStr.match(/\d+/);
                                            if (match) {
                                              return chargeStr.replace(match[0], String(parseInt(match[0], 10) * 2));
                                            }
                                          }
                                          return chargeStr;
                                        })()}
                                      </span>
                                    </p>
                                  </div>
                                  {isClosed && (
                                    <div className="absolute top-3 right-3 bg-white/90 text-pink-600 px-2 py-1 rounded-lg text-xs font-black shadow-sm flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5" />
                                      Closed
                                    </div>
                                  )}
                                </div>
                                <div className="p-3 bg-white flex items-center gap-3 overflow-x-auto scrollbar-none border-t border-zinc-100">
                                  {vendorDishes.map((d) => (
                                    <div
                                      key={d.id}
                                      className="flex flex-col gap-1 w-20 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isClosed && d.isAvailable !== false) {
                                          handleRestaurantClick(vendor, d.category);
                                        }
                                      }}
                                    >
                                      <div className="w-full h-20 rounded-xl overflow-hidden bg-zinc-100 border border-zinc-100">
                                        <LazyImage
                                          src={
                                            d.imageUrl ||
                                            "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=400"
                                          }
                                          className="w-full h-full"
                                          imgClassName="object-cover"
                                        />
                                      </div>
                                      <span className="text-[10px] font-bold text-zinc-700 line-clamp-1">
                                        {d.name}
                                      </span>
                                      <span className="text-[10px] text-[#d70f64] font-black leading-none">
                                        Rs. {d.price}
                                      </span>
                                    </div>
                                  ))}
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRestaurantClick(vendor);
                                    }}
                                    className="w-16 h-20 flex flex-col items-center justify-center gap-1 shrink-0 bg-red-50/50 rounded-xl text-[#d70f64] hover:bg-red-100 transition border border-red-100/50 cursor-pointer"
                                  >
                                    <ChevronRight className="w-5 h-5" />
                                    <span className="text-[9px] font-black uppercase">
                                      Menu
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                        {isLoadingDishes
                        ? Array.from({ length: 8 }).map((_, idx) => (
                            <div
                              key={idx}
                              className="bg-white border border-zinc-200/80 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs animate-pulse flex flex-col h-full"
                            >
                              <div className="h-28 sm:h-44 bg-zinc-200 shrink-0" />
                              <div className="p-3 sm:p-4 flex-1 flex flex-col gap-3">
                                <div className="h-2 sm:h-3 w-1/3 bg-zinc-200 rounded-full" />
                                <div className="h-4 sm:h-5 w-3/4 bg-zinc-200 rounded-full" />
                                <div className="mt-auto flex justify-between items-center pt-2">
                                  <div className="h-4 sm:h-5 w-1/4 bg-zinc-200 rounded-full" />
                                  <div className="h-8 sm:h-10 w-8 sm:w-10 bg-zinc-200 rounded-full" />
                                </div>
                              </div>
                            </div>
                          ))
                        : [...filteredDishes]
                            .sort((a, b) => {
                              const isSvcA = a.type === "service";
                              const dishRestaurantNameA = a.restaurantName || (isSvcA ? "Dadu Home Services" : "Dadu Fast Food & Kitchen");
                              const aClosed = checkIsRestaurantClosed(dishRestaurantNameA) ? 1 : 0;
                              
                              const isSvcB = b.type === "service";
                              const dishRestaurantNameB = b.restaurantName || (isSvcB ? "Dadu Home Services" : "Dadu Fast Food & Kitchen");
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
                            const isSvc = dish.type === "service";
                            const dishRestaurantName =
                              dish.restaurantName ||
                              (isSvc
                                ? "Dadu Home Services"
                                : "Dadu Fast Food & Kitchen");
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
                      <div className="bg-white/80 backdrop-blur-md border border-red-100 p-12 rounded-3.5xl text-center space-y-4 shadow-sm max-w-md mx-auto">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner animate-bounce">
                          {showFavoritesOnly ? "💔" : "🍛"}
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-zinc-800 uppercase tracking-tight">
                            {showFavoritesOnly
                              ? "No Favorites Yet"
                              : "No Delicious Dishes Found"}
                          </h4>
                          <p className="text-[11px] text-zinc-400 font-semibold leading-relaxed mt-1.5 px-4">
                            {showFavoritesOnly
                              ? "Aapne abhi tak kisi dish ko favorite nahi kiya. Favorite button dabayein!"
                              : `Hamein aapki search query "${searchQuery}" se milti-julti koi dish nahi mili. Kuch naya try karein!`}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setSearchQuery("");
                            setActiveCategory("All");
                            setShowFavoritesOnly(false);
                          }}
                          className="bg-[#d70f64] hover:bg-[#b00c50] text-white font-black py-2.5 px-6 text-[10px] uppercase tracking-widest rounded-xl cursor-pointer transition-all shadow-md active:scale-95"
                        >
                          Show All Food Menu 🍽️
                        </button>
                      </div>
                    )}
                  </div>


                </div>
              </main>
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
            adminUsername="meerali120"
            deliverySettings={deliverySettings}
            foodCategories={foodCategories}
            groceryCategories={groceryCategories}
            groceryProducts={groceryProducts}
            groceryDeliveryConfig={groceryDeliveryConfig}
          />
        </Suspense>
      )}

      {commonModals}

      {/* Floating Bottom Cart for mobile screens */}
      {cartCountTotal > 0 && selectedRestaurant === "All Restaurants" && (
        <div className={`fixed bottom-[72px] left-4 right-4 z-40 md:hidden bg-zinc-900/95 border border-zinc-800 p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 backdrop-blur-md transition-all duration-300`}>
          <div className="flex items-center gap-2">
            <div className="bg-[#d70f64] text-white px-2 rounded-lg font-black text-xs h-7 flex items-center justify-center min-w-[28px]">
              {cartCountTotal}
            </div>
            <div className="text-left">
              <span className="text-[10px] text-zinc-400 font-bold block leading-none">
                TOTAL PRICE
              </span>
              <span className="text-zinc-100 font-extrabold text-xs sm:text-sm font-mono mt-1 block leading-none">
                Rs. {cartPriceTotal}
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsCartOpen(true)}
            className="bg-[#d70f64] text-white font-black text-xs uppercase tracking-wider py-2 px-3.5 rounded-xl hover:bg-[#b00c50] transition active:scale-95 shadow-md flex items-center gap-1 shrink-0 cursor-pointer"
          >
            Review & Order 🛍
          </button>
        </div>
      )}

      {/* Footer support details */}
      <footer className="max-w-7xl mx-auto px-4 mt-8 pt-4 pb-20 md:pb-6 border-t border-zinc-200 dark:border-zinc-800 text-center text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1">
        <p className="font-extrabold text-zinc-600 dark:text-zinc-300">© {new Date().getFullYear()} DADUFOOD Delivery Services. All Rights Reserved.</p>
        <p className="font-medium">
          Support Helpline:{" "}
          <a
            href="https://wa.me/923277004471"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-500 dark:text-emerald-400 hover:underline font-bold"
          >
            03277004471 (WhatsApp Support)
          </a>
        </p>
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
              exit={{ opacity: 0, backdropFilter: "blur(0px)", transition: { duration: 0.6, delay: 0.1 } }}
              className="absolute inset-0 bg-black/60 z-0"
            />
            
            {/* Animated Mesh/Orb Gradients */}
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0, transition: { duration: 0.5 } }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="absolute inset-0 flex items-center justify-center z-0"
            >
              <motion.div 
                animate={{ rotate: 360, scale: [1, 1.1, 1] }} 
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] bg-gradient-to-tr from-[#d70f64] to-[#7209b7] rounded-full blur-[100px] opacity-60"
              />
              <motion.div 
                animate={{ rotate: -360, scale: [1, 1.2, 1] }} 
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute w-[60vw] h-[60vw] max-w-[400px] max-h-[400px] bg-gradient-to-bl from-[#f72585] to-[#4cc9f0] rounded-full blur-[80px] opacity-50 mix-blend-screen"
              />
            </motion.div>

            {/* Portal Ring */}
            <motion.div
              initial={{ scale: 0, opacity: 0, rotateX: 60 }}
              animate={{ scale: 1, opacity: 1, rotateX: 0 }}
              exit={{ scale: 2, opacity: 0, transition: { duration: 0.5 } }}
              transition={{ duration: 1.2, type: "spring", bounce: 0.4 }}
              className="absolute w-[300px] h-[300px] md:w-[400px] md:h-[400px] rounded-full border border-white/20 shadow-[0_0_80px_rgba(215,15,100,0.5)] z-0"
              style={{ background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)" }}
            />

            {/* Main Content Floating */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5, rotateY: -30, z: -400 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0, z: 0 }}
              exit={{ opacity: 0, scale: 1.2, rotateY: 15, z: 200, filter: "blur(15px)", transition: { duration: 0.5 } }}
              transition={{ duration: 0.9, type: "spring", bounce: 0.5, delay: 0.1 }}
              className="relative z-10 flex flex-col items-center justify-center text-white w-full px-4"
            >
              {/* Logo Presentation */}
              <motion.div 
                animate={{ y: [-8, 8, -8], rotateZ: [-2, 2, -2] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative mb-8 group"
              >
                {/* Glow Behind Logo */}
                <div className="absolute -inset-4 bg-white/20 blur-2xl rounded-full scale-110 opacity-70 group-hover:opacity-100 transition duration-700" />
                
                {/* 3D Glassmorphic Frame */}
                <motion.div 
                   whileHover={{ scale: 1.1, rotateY: 10, rotateX: 5 }}
                   transition={{ type: "spring", bounce: 0.5 }}
                   className="w-40 h-40 rounded-[2.5rem] overflow-hidden bg-white/10 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.4)] relative z-10 border border-white/30 p-2 transform-gpu"
                >
                  <div className="w-full h-full rounded-[2rem] overflow-hidden bg-white relative">
                    {animatingRestaurant.imageUrl ? (
                      <img src={animatingRestaurant.imageUrl} alt={animatingRestaurant.name} className="w-full h-full object-cover transform scale-105 transition-transform duration-700 group-hover:scale-100" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center text-7xl font-black text-[#d70f64] shadow-inner">
                        {animatingRestaurant.name.charAt(0)}
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
              
              <motion.h2 
                initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.3, duration: 0.7, type: "spring", bounce: 0.4 }}
                className="text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 mb-6 text-center drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] leading-tight"
              >
                {animatingRestaurant.name}
              </motion.h2>
              
              {/* High-tech Loading Indicator */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.8, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: 180 }}
                transition={{ delay: 0.5, duration: 0.8, type: "spring" }}
                className="relative h-1.5 bg-black/40 rounded-full overflow-hidden backdrop-blur-sm border border-white/10 shadow-[0_0_15px_rgba(215,15,100,0.3)]"
              >
                <motion.div 
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-[#4cc9f0] to-transparent"
                />
                <motion.div 
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ duration: 1.2, delay: 0.6, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-[#f72585] to-transparent"
                />
              </motion.div>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
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
