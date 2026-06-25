import React, { useState, useEffect, useRef } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { 
  collection, doc, onSnapshot, getDoc, setDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, getDocs 
} from "firebase/firestore";
import { auth, db, handleFirestoreError, cleanObject } from "./firebase";
import { Dish, Order, UserProfile, SystemSettings, AppNotification, OrderItem, GroceryCategory, GroceryProduct, GroceryOrderItem, GroceryDeliveryConfig, GroceryOrder } from "./types";
import { INITIAL_MENU_ITEMS } from "./data";

// Import modules
import FoodpandaHeader from "./components/FoodpandaHeader";
import FoodpandaHero from "./components/FoodpandaHero";
import CartDrawer from "./components/CartDrawer";
import OrderTracker from "./components/OrderTracker";
import AdminPanel from "./components/AdminPanel";
import AuthModal from "./components/AuthModal";
import RiderPanel from "./components/RiderPanel";
import GroceryModule from "./components/GroceryModule";
import GroceryCartDrawer from "./components/GroceryCartDrawer";
import OrderSuccessAnimation from "./components/OrderSuccessAnimation";
import OrderHistoryDrawer from "./components/OrderHistoryDrawer";
import daduLogo from "./assets/images/dadu_food_logo_new_1782333467889.jpg";

// Icons & Motion
import { 
  ShieldAlert, Clock, AlertTriangle, MessageSquare, BadgeAlert, Sparkles, CheckSquare, Wrench, HeartHandshake, UtensilsCrossed, Compass, MapPin, Heart, LogOut, Home, ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [splashProgress, setSplashProgress] = useState(0);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [deliverySettings, setDeliverySettings] = useState<SystemSettings>({ deliveryFee: 50 });

  // Favorites and Deal of the Hour configuration
  const [favoriteDishIds, setFavoriteDishIds] = useState<string[]>([]);
  const [isExitConfirmationOpen, setIsExitConfirmationOpen] = useState(false);
  const isExitingRef = useRef(false);
  const isProgrammaticBackRef = useRef(false);
  const [dealConfig, setDealConfig] = useState<{
    timerMinutes: number;
    discountPercentage: number;
    selectedItemIds: string[];
    dealText?: string;
  }>({
    timerMinutes: 30,
    discountPercentage: 25,
    selectedItemIds: ["dish_6", "dish_7"],
    dealText: "Save 25% on Only Tea & Fresh Platters! Hurry!"
  });

  // Standalone Grocery Module states
  const [activeModule, setActiveModule] = useState<"food" | "grocery">("food");
  const [groceryCategories, setGroceryCategories] = useState<GroceryCategory[]>([]);
  const [groceryProducts, setGroceryProducts] = useState<GroceryProduct[]>([]);
  const [groceryDeliveryConfig, setGroceryDeliveryConfig] = useState<GroceryDeliveryConfig>({
    baseDeliveryFee: 40,
    freeDeliveryAboveAmount: 1000,
    allowMixedCart: true,
  });
  const [groceryCartItems, setGroceryCartItems] = useState<GroceryOrderItem[]>([]);
  const [isGroceryCartOpen, setIsGroceryCartOpen] = useState(false);

  // Navigation / Toggles
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("All Restaurants");
  const [searchQuery, setSearchQuery] = useState("");
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<Order | null>(null);

  // Modal Openings
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAdminConsoleOpen, setIsAdminConsoleOpen] = useState(false);
  const [activeDetailDish, setActiveDetailDish] = useState<Dish | null>(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [successAnimationOrder, setSuccessAnimationOrder] = useState<Order | null>(null);
  const [isSuccessAnimationOpen, setIsSuccessAnimationOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  // Visual notify states
  const [toastNotification, setToastNotification] = useState<{ title: string; message: string } | null>(null);

  // Audio synthesizer chime tone
  const playChimeSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
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
      gain2.gain.setValueAtTime(0.10, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.4);

    } catch (err) {
      console.warn("AudioContext blocked or waiting for user gesture:", err);
    }
  };

  // 1. Authenticated Profile listening
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        // Read Firestore Profile details
        const profileRef = doc(db, "users", authUser.uid);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          const data = profileSnap.data();
          const isAdminEmail = authUser.email === "dadumeer469@gmail.com" || authUser.email === "03277004471@dadu247.com";
          if (isAdminEmail && data.role !== "admin") {
            const updated = { ...data, role: "admin" };
            await setDoc(profileRef, updated, { merge: true });
            setCurrentUser({ uid: authUser.uid, ...updated } as UserProfile);
          } else {
            setCurrentUser({ uid: authUser.uid, ...data } as UserProfile);
          }
        } else {
          // Fallback
          const isMeerali = authUser.email === "03277004471@dadu247.com" || authUser.email === "dadumeer469@gmail.com";
          const fallback: UserProfile = {
            uid: authUser.uid,
            name: isMeerali ? "meerali120" : "Dadu Guest",
            phone: authUser.email?.split("@")[0] || "",
            address: "Not saved",
            role: isMeerali ? "admin" : "buyer",
            ordersCount: 0,
          };
          setCurrentUser(fallback);
        }
      } else {
        setCurrentUser(null);
        setIsAdminConsoleOpen(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 1.5. Premium Foodpanda Splash Screen timer (approx 2.4s)
  useEffect(() => {
    const startTime = Date.now();
    const duration = 2400; // 2.4 seconds total duration
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, Math.floor((elapsed / duration) * 100));
      setSplashProgress(progress);
      if (elapsed >= duration) {
        clearInterval(interval);
        setTimeout(() => {
          setShowSplash(false);
          playChimeSound(); // Trigger the melodic twin-tone synthesizer chime on entrance!
        }, 350);
      }
    }, 35);
    return () => clearInterval(interval);
  }, []);

  // 2. Real-time Menu Listening & Auto-Seeding
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "menu"), async (snapshot) => {
      if (snapshot.empty) {
        // Run automatic Firestore database seeding
        console.log("Empty menu database. Seeding initial items directory...");
        try {
          await Promise.all(
            INITIAL_MENU_ITEMS.map((item) => setDoc(doc(db, "menu", item.id), item))
          );
        } catch (err) {
          console.error("Auto seeding failed:", err);
        }
      } else {
        const list: Dish[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as Dish);
        });
        setDishes(list);
      }
    }, (err) => {
      console.error(handleFirestoreError(err));
    });

    return () => unsubscribe();
  }, []);

  // 3. Real-time Delivery Settings Listening
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "settings", "delivery_config"), (docSnap) => {
      if (docSnap.exists()) {
        setDeliverySettings(docSnap.data() as SystemSettings);
      } else {
        // Seed default
        setDoc(doc(db, "settings", "delivery_config"), { deliveryFee: 50 }).catch(console.error);
      }
    }, (err) => {
      console.warn("Delivery config subscription error:", handleFirestoreError(err));
    });

    return () => unsubscribe();
  }, []);

  // 3a. Real-time Grocery Categories Listening
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "groceryCategories"), (snapshot) => {
      const list: GroceryCategory[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as GroceryCategory);
      });
      list.sort((a, b) => (a.position || 0) - (b.position || 0));
      setGroceryCategories(list);
    }, (err) => {
      console.error(handleFirestoreError(err));
    });
    return () => unsubscribe();
  }, []);

  // 3b. Real-time Grocery Products Listening
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "groceryProducts"), (snapshot) => {
      const list: GroceryProduct[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as GroceryProduct);
      });
      setGroceryProducts(list);
    }, (err) => {
      console.error(handleFirestoreError(err));
    });
    return () => unsubscribe();
  }, []);

  // 3c. Real-time Grocery Delivery Config Listening
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "settings", "groceryDeliveryConfig"), (docSnap) => {
      if (docSnap.exists()) {
        setGroceryDeliveryConfig(docSnap.data() as GroceryDeliveryConfig);
      } else {
        // Seed default
        setDoc(doc(db, "settings", "groceryDeliveryConfig"), {
          baseDeliveryFee: 40,
          freeDeliveryAboveAmount: 1000,
          allowMixedCart: true
        }).catch(console.error);
      }
    }, (err) => {
      console.error(handleFirestoreError(err));
    });
    return () => unsubscribe();
  }, []);

  // 3d. Real-time Deal of the Hour Config Listening
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "settings", "deal_config"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDealConfig({
          timerMinutes: data.timerMinutes || 30,
          discountPercentage: data.discountPercentage || 25,
          selectedItemIds: data.selectedItemIds || [],
          dealText: data.dealText || ""
        });
      } else {
        // Seed default
        const defaultDeal = {
          timerMinutes: 30,
          discountPercentage: 25,
          selectedItemIds: ["dish_6", "dish_7"],
          dealText: "Save 25% on Only Tea & Fresh Platters! Hurry!"
        };
        setDoc(doc(db, "settings", "deal_config"), defaultDeal).catch(console.error);
      }
    }, (err) => {
      console.warn("Deal config subscription error:", handleFirestoreError(err));
    });
    return () => unsubscribe();
  }, []);

  // 3e. Load favorites from LocalStorage on mount
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
    localStorage.setItem("dadu_favorite_dishes", JSON.stringify(favoriteDishIds));
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
      ordersQuery = query(collection(db, "orders"), where("userId", "==", currentUser.uid));
    }

    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Order);
      });
      // Sort newest order first
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setOrders(list);

      // If buyer has active orders, update our live tracker automatically!
      if (currentUser.role !== "admin" && list.length > 0) {
        // Find latest non-completed order to show
        const latestActive = list.find(o => o.status !== "delivered" && o.status !== "completed" && o.status !== "cancelled");
        if (latestActive) {
          setActiveTrackingOrder(latestActive);
        } else if (!activeTrackingOrder && list[0]) {
          // If no active, set the absolute latest to tracking list
          setActiveTrackingOrder(list[0]);
        }
      }
    }, (err) => {
      console.warn("Orders live listening error:", handleFirestoreError(err));
    });

    // Notify listeners mapping
    const notifsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", currentUser.uid)
    );

    const unsubscribeNotif = onSnapshot(notifsQuery, (snapshot) => {
      const list: AppNotification[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as AppNotification);
      });
      
      // Sort newest alert first
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      
      // If there's a new unread notification, trigger sliding banner & audio chime!
      const currentUnread = list.filter(n => !n.read);
      const oldUnreadCount = notifications.filter(n => !n.read).length;

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
    }, (err) => {
      console.warn("Notifications live listening error:", handleFirestoreError(err));
    });

    return () => {
      unsubscribeOrders();
      unsubscribeNotif();
    };
  }, [currentUser]);

  // Handle Log Outs
  const handleLogout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setCartItems([]);
    setActiveTrackingOrder(null);
    setIsAdminConsoleOpen(false);
  };

  // Mobile Back Button Navigation Controller (PWA back button handler with custom Exit Confirmation interceptor)
  useEffect(() => {
    const isAnyModalOpen = 
      isAuthOpen || 
      isCartOpen || 
      isGroceryCartOpen || 
      !!activeDetailDish || 
      isTrackingModalOpen || 
      isSuccessAnimationOpen || 
      isHistoryDrawerOpen ||
      isAdminConsoleOpen ||
      isExitConfirmationOpen;

    if (isAnyModalOpen) {
      if (window.history.state?.modalOpen !== true) {
        window.history.pushState({ modalOpen: true }, "");
      }
    } else {
      if (window.history.state?.modalOpen === true) {
        isProgrammaticBackRef.current = true;
        window.history.back();
      }
    }

    const handlePopState = (event: PopStateEvent) => {
      if (isExitingRef.current) {
        return;
      }

      if (isProgrammaticBackRef.current) {
        isProgrammaticBackRef.current = false;
        return;
      }

      // Close open modals
      if (isAuthOpen || isCartOpen || isGroceryCartOpen || !!activeDetailDish || isTrackingModalOpen || isSuccessAnimationOpen || isHistoryDrawerOpen || isAdminConsoleOpen) {
        setIsAuthOpen(false);
        setIsCartOpen(false);
        setIsGroceryCartOpen(false);
        setActiveDetailDish(null);
        setIsTrackingModalOpen(false);
        setIsSuccessAnimationOpen(false);
        setIsHistoryDrawerOpen(false);
        setIsAdminConsoleOpen(false);
        return;
      }

      // Close exit confirmation if open
      if (isExitConfirmationOpen) {
        setIsExitConfirmationOpen(false);
        return;
      }

      // No modal open: trigger exit confirmation dialogue and push state back to trap next back click
      setIsExitConfirmationOpen(true);
      window.history.pushState({ appRoot: true }, "");
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [
    isAuthOpen, 
    isCartOpen, 
    isGroceryCartOpen, 
    activeDetailDish, 
    isTrackingModalOpen, 
    isSuccessAnimationOpen, 
    isHistoryDrawerOpen,
    isAdminConsoleOpen,
    isExitConfirmationOpen
  ]);

  // --- CART CONTROLLER OPERATIONS ---
  const handleAddToCart = (dish: Dish) => {
    // Check if mixed cart is allowed
    if (!groceryDeliveryConfig?.allowMixedCart && groceryCartItems.length > 0) {
      const clearGrocery = window.confirm(
        "🛒 DISALLOW MIXED BASKET!\n\nYour basket currently contains Grocery products. Dadu Food requires separate delivery runs for hot kitchen meals and retail groceries.\n\nWould you like to auto-clear your Grocery Basket to start your Food order?"
      );
      if (clearGrocery) {
        setGroceryCartItems([]);
      } else {
        return;
      }
    }

    // Limit cart constraint: Max 2 different restaurants per order
    let itemRestaurant = dish.restaurantName || (dish.type === "service" ? "Dadu Home Services" : "Dadu Fast Food & Kitchen");
    const isDrink = dish.id.startsWith("drink_") || dish.category === "Drinks" || (dish.category as string) === "Beverages";
    
    if (isDrink && cartItems.length > 0) {
      itemRestaurant = cartItems[0].restaurantName || "Dadu Fast Food & Kitchen";
    }

    const currentRestaurants = Array.from(
      new Set(cartItems.map((item) => item.restaurantName).filter(Boolean))
    );

    const isAlreadyInCart = cartItems.some((item) => item.dishId === dish.id);

    if (!isAlreadyInCart && !currentRestaurants.includes(itemRestaurant) && currentRestaurants.length >= 2) {
      alert("You can only order from a maximum of 2 restaurants in a single order.");
      return;
    }

    setCartItems((prev) => {
      const existing = prev.find((item) => item.dishId === dish.id);
      if (existing) {
        return prev.map((item) =>
          item.dishId === dish.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      const finalPrice = dish.discountPrice && dish.discountPrice < dish.price ? dish.discountPrice : dish.price;
      return [...prev, { 
        dishId: dish.id, 
        name: dish.name, 
        price: finalPrice, 
        quantity: 1, 
        type: dish.type, 
        serviceDuration: dish.serviceDuration,
        restaurantName: itemRestaurant,
        commission: dish.commission || 0
      }];
    });
    // Open cart drawer for rapid visibility
    setIsCartOpen(true);
  };

  const handleAddExclusiveDrink = (drink: any) => {
    const firstRestName = cartItems[0]?.restaurantName || "Dadu Fast Food & Kitchen";
    const dishObj = {
      id: drink.id,
      name: drink.name,
      price: drink.price,
      description: drink.description,
      imageUrl: drink.imageUrl,
      category: "Drinks" as const,
      isAvailable: true,
      type: "food" as const,
      restaurantName: firstRestName
    };
    handleAddToCart(dishObj);
  };

  const handleAddToGroceryCart = (product: GroceryProduct, quantity = 1) => {
    // Check if mixed cart is allowed
    if (!groceryDeliveryConfig?.allowMixedCart && cartItems.length > 0) {
      const clearFood = window.confirm(
        "🛒 DISALLOW MIXED BASKET!\n\nYour basket currently contains Food items. Dadu Food requires separate delivery runs for hot kitchen meals and retail groceries.\n\nWould you like to auto-clear your Food Cart to start your Grocery purchase?"
      );
      if (clearFood) {
        setCartItems([]);
      } else {
        return;
      }
    }

    setGroceryCartItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.productId === product.id);
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

  const handleUpdateGroceryCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromGroceryCart(productId);
      return;
    }
    setGroceryCartItems((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, quantity } : item))
    );
  };

  const handleRemoveFromGroceryCart = (productId: string) => {
    setGroceryCartItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleReorder = (order: Order) => {
    if (order.orderType === "grocery") {
      // It's a grocery order
      if (cartItems.length > 0 && !groceryDeliveryConfig?.allowMixedCart) {
        const clearFood = window.confirm(
          "🛒 DISALLOW MIXED BASKET!\n\nYour basket currently contains Food items. Dadu Food requires separate delivery runs for hot kitchen meals and retail groceries.\n\nWould you like to auto-clear your Food Cart to start your Grocery purchase?"
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
          const matchingProduct = groceryProducts.find(p => p.id === item.dishId);
          const existingIdx = updated.findIndex((gi) => gi.productId === item.dishId);
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
              category: matchingProduct?.categoryId || ""
            });
          }
        });
        return updated;
      });

      setToastNotification({
        title: "Grocery Items Restored! 🍏",
        message: "Items from your previous order have been added to your basket.",
      });
      setTimeout(() => setToastNotification(null), 4000);
      setIsGroceryCartOpen(true);
      setActiveModule("grocery");
    } else {
      // It's a food or service order
      if (groceryCartItems.length > 0 && !groceryDeliveryConfig?.allowMixedCart) {
        const clearGrocery = window.confirm(
          "🛒 DISALLOW MIXED BASKET!\n\nYour basket currently contains Grocery products. Dadu Food requires separate delivery runs for hot kitchen meals and retail groceries.\n\nWould you like to auto-clear your Grocery Basket to start your Food order?"
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
              restaurantName: item.restaurantName || "Dadu Food & Service"
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
    address: string;
    items: GroceryOrderItem[];
    totalPrice: number;
    deliveryFee: number;
    grandTotal: number;
    userCoords?: { latitude: number; longitude: number };
  }) => {
    try {
      const generatedOrderId = `gorder_${Date.now()}`;
      
      // Adapt items array representation
      const adaptedItems = details.items.map(item => ({
        dishId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        restaurantName: "Dadu Grocery Store",
        commission: item.commission || 0
      }));

      const totalCommission = adaptedItems.reduce((acc, itm) => acc + (itm.commission || 0) * itm.quantity, 0);

      const orderDoc = {
        id: generatedOrderId,
        userId: currentUser?.uid || "guest",
        name: details.name,
        userName: details.name,
        phone: details.phone,
        userPhone: details.phone,
        address: details.address,
        userAddress: details.address,
        items: adaptedItems,
        totalPrice: details.totalPrice,
        deliveryFee: details.deliveryFee,
        grandTotal: details.grandTotal,
        paymentMethod: "cod",
        status: "pending",
        orderType: "grocery",
        createdAt: { seconds: Math.floor(Date.now() / 1000) },
        userCoords: details.userCoords || null,
        totalCommission,
      };

      await setDoc(doc(db, "orders", generatedOrderId), orderDoc);
      
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
      prev.map((item) => (item.dishId === dishId ? { ...item, quantity: qty } : item))
    );
  };

  const handleRemoveCartItem = (dishId: string) => {
    setCartItems((prev) => prev.filter((item) => item.dishId !== dishId));
  };

  // Submit order to database
  const handlePlaceOrderSubmit = async (details: {
    name: string;
    phone: string;
    address: string;
    paymentMethod: string;
    orderType: "food" | "service";
    userCoords?: { latitude: number; longitude: number };
  }) => {
    if (!currentUser) {
      alert("Please Sign In or Register to submit your order!");
      setIsAuthOpen(true);
      return;
    }

    const itemsTotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const baseFee = details.orderType === "food" ? deliverySettings.deliveryFee : 0;
    const finalFee = (details.orderType === "food" && itemsTotal < 500) ? baseFee * 2 : baseFee;
    const finalGrandTotal = itemsTotal + finalFee;

    const firstService = cartItems.find((itm) => itm.type === "service");
    const computedServiceTiming = details.orderType === "service"
      ? (firstService?.serviceDuration || "Expected arrival within 1 hour")
      : undefined;

    const itemsWithCommission = cartItems.map((item) => ({
      ...item,
      commission: item.commission || 0
    }));
    const totalCommission = itemsWithCommission.reduce((acc, itm) => acc + (itm.commission || 0) * itm.quantity, 0);

    const uniqueOrderId = `order_${Date.now()}`;
    const orderModel: Order = {
      id: uniqueOrderId,
      userId: currentUser.uid,
      userName: details.name,
      name: details.name,
      userPhone: details.phone,
      phone: details.phone,
      userAddress: details.address,
      address: details.address,
      items: itemsWithCommission,
      totalPrice: itemsTotal,
      deliveryFee: finalFee,
      grandTotal: finalGrandTotal,
      status: details.orderType === "service" ? "booked" : "pending",
      paymentMethod: details.paymentMethod as any,
      orderType: details.orderType,
      serviceTiming: computedServiceTiming,
      createdAt: { seconds: Date.now() / 1000 },
      userCoords: details.userCoords || undefined,
      totalCommission,
    };

    try {
      // 1. Save new Order
      await setDoc(doc(db, "orders", uniqueOrderId), cleanObject(orderModel));

      // 2. Clear customer cart
      setCartItems([]);
      setIsCartOpen(false);

      // 3. Update ordersCount loyalty parameters
      const updatedProfile = {
        ...currentUser,
        name: details.name,
        phone: details.phone,
        address: details.address,
        ordersCount: (currentUser.ordersCount || 0) + 1,
      };
      await setDoc(doc(db, "users", currentUser.uid), cleanObject(updatedProfile));
      setCurrentUser(updatedProfile);

      // 4. Trigger success animation overlay
      setSuccessAnimationOrder(orderModel);
      setIsSuccessAnimationOpen(true);
    } catch (err: any) {
      console.error(err);
      alert(handleFirestoreError(err));
    }
  };

  const handleClearNotificationsAll = async () => {
    try {
      await Promise.all(
        notifications.map((n) => deleteDoc(doc(db, "notifications", n.id)))
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
  const finalDishes = dishes.map((dish) => {
    if (dealConfig?.selectedItemIds?.includes(dish.id)) {
      const pct = dealConfig.discountPercentage || 0;
      if (pct > 0) {
        const discountPrice = Math.round(dish.price * (1 - pct / 100));
        return { ...dish, discountPrice };
      }
    }
    return dish;
  });

  // --- CATALOG RENDER FILTERS ---
  const filteredDishes = finalDishes.filter((dish) => {
    // Hide checkout-exclusive soft drinks from main browsing screen & panels
    const isExclusiveDrink = dish.id.startsWith("drink_") || dish.category === "Drinks" || dish.category === "Beverages";
    if (isExclusiveDrink) return false;

    const matchesCategory = activeCategory === "All" || dish.category === activeCategory;
    const rName = dish.restaurantName || (dish.type === "service" ? "Dadu Home Services" : "Dadu Fast Food & Kitchen");
    const matchesRestaurant = selectedRestaurant === "All Restaurants" || rName === selectedRestaurant;
    const matchesSearch = dish.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          dish.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          rName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesRestaurant && matchesSearch;
  });

  const cartCountTotal = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartPriceTotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  if (currentUser?.role === "rider") {
    return (
      <RiderPanel currentUser={currentUser} onLogout={handleLogout} />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFFDFE] via-[#FDF5F8] to-[#FFFDFE] text-zinc-800 relative pb-28 md:pb-12 flex flex-col font-sans overflow-x-hidden">
      
      {/* Decorative Premium Food Watermark/Pattern Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
        {/* Subtle grid pattern of culinary shapes */}
        <div 
          className="absolute inset-0 w-full h-full opacity-[0.025]" 
          style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cpath d='M15 15h10v10H15zm40 20h10v10H55zm40-20h10v10H95zM35 75h10v10H35zm40 10h10v10H75zM25 105h10v10H25zm50 5h10v10H75zm40-20h10v10h-10z' fill='%23D70F64'/%3E%3C/svg%3E")`,
            backgroundSize: "120px 120px"
          }}
        />

        {/* Floating Glowing Culinary Accents (Sunset & Pink gradients) */}
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-pink-400/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -right-48 w-96 h-96 bg-orange-300/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-rose-300/8 rounded-full blur-[100px]" />

        {/* Ambient floating elements behind content (visible on tablet and desktop) */}
        <div className="absolute top-[400px] left-[10%] opacity-[0.06] text-6xl animate-pulse">🍔</div>
        <div className="absolute top-[650px] right-[8%] opacity-[0.05] text-5xl animate-bounce" style={{ animationDuration: "6s" }}>🍕</div>
        <div className="absolute top-[1100px] left-[5%] opacity-[0.04] text-7xl animate-pulse" style={{ animationDuration: "8s" }}>🍵</div>
        <div className="absolute top-[1400px] right-[12%] opacity-[0.05] text-6xl animate-bounce" style={{ animationDuration: "7s" }}>🍗</div>
        <div className="absolute top-[1900px] left-[12%] opacity-[0.04] text-5xl animate-pulse">🔧</div>
        <div className="absolute top-[2200px] right-[6%] opacity-[0.06] text-7xl animate-bounce" style={{ animationDuration: "5s" }}>🍏</div>
        <div className="absolute top-[2700px] left-[8%] opacity-[0.05] text-6xl animate-pulse" style={{ animationDuration: "9s" }}>🍩</div>
      </div>

      {/* Decorative Food Side Panels (Visible only on wide desktop screens to fill the margins) */}
      <div className="hidden xl:flex fixed left-4 top-1/4 bottom-1/4 w-44 flex-col justify-around pointer-events-none select-none z-10">
        <motion.div 
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="bg-white/90 backdrop-blur-md p-3.5 rounded-2xl border border-pink-150/60 shadow-[0_12px_40px_rgba(0,0,0,0.06)] flex flex-col items-center text-center gap-1.5"
        >
          <img 
            src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=120" 
            alt="Hot Burger" 
            className="w-14 h-14 rounded-full object-cover border-2 border-pink-200 shadow-sm"
            referrerPolicy="no-referrer"
          />
          <span className="text-[10px] font-black uppercase text-[#D70F64] tracking-wider mt-1">Hot Burgers</span>
          <span className="text-[9px] text-zinc-400 font-semibold leading-none">Fresh & Sizzling</span>
        </motion.div>

        <motion.div 
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
          className="bg-white/90 backdrop-blur-md p-3.5 rounded-2xl border border-pink-150/60 shadow-[0_12px_40px_rgba(0,0,0,0.06)] flex flex-col items-center text-center gap-1.5"
        >
          <img 
            src="https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=120" 
            alt="Special Tea" 
            className="w-14 h-14 rounded-full object-cover border-2 border-pink-200 shadow-sm"
            referrerPolicy="no-referrer"
          />
          <span className="text-[10px] font-black uppercase text-[#D70F64] tracking-wider mt-1">Dadu Special Tea</span>
          <span className="text-[9px] text-zinc-400 font-semibold leading-none">Brewed with love</span>
        </motion.div>

        <motion.div 
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
          className="bg-white/90 backdrop-blur-md p-3.5 rounded-2xl border border-pink-150/60 shadow-[0_12px_40px_rgba(0,0,0,0.06)] flex flex-col items-center text-center gap-1.5"
        >
          <img 
            src="https://images.unsplash.com/photo-1610348725511-27aae371f0d9?auto=format&fit=crop&q=80&w=120" 
            alt="Grocery" 
            className="w-14 h-14 rounded-full object-cover border-2 border-orange-200 shadow-sm"
            referrerPolicy="no-referrer"
          />
          <span className="text-[10px] font-black uppercase text-orange-600 tracking-wider mt-1">Fresh Grocery</span>
          <span className="text-[9px] text-zinc-400 font-semibold leading-none">Delivered under 20m</span>
        </motion.div>
      </div>

      <div className="hidden xl:flex fixed right-4 top-1/4 bottom-1/4 w-44 flex-col justify-around pointer-events-none select-none z-10">
        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 4.2, ease: "easeInOut" }}
          className="bg-white/90 backdrop-blur-md p-3.5 rounded-2xl border border-pink-150/60 shadow-[0_12px_40px_rgba(0,0,0,0.06)] flex flex-col items-center text-center gap-1.5"
        >
          <img 
            src="https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=120" 
            alt="Cheesy Pizza" 
            className="w-14 h-14 rounded-full object-cover border-2 border-pink-200 shadow-sm"
            referrerPolicy="no-referrer"
          />
          <span className="text-[10px] font-black uppercase text-[#D70F64] tracking-wider mt-1">Cheesy Pizza</span>
          <span className="text-[9px] text-zinc-400 font-semibold leading-none">Thick Crust Hot</span>
        </motion.div>

        <motion.div 
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 3.8, ease: "easeInOut" }}
          className="bg-white/90 backdrop-blur-md p-3.5 rounded-2xl border border-pink-150/60 shadow-[0_12px_40px_rgba(0,0,0,0.06)] flex flex-col items-center text-center gap-1.5"
        >
          <img 
            src="https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&q=80&w=120" 
            alt="Dadu Biryani" 
            className="w-14 h-14 rounded-full object-cover border-2 border-pink-200 shadow-sm"
            referrerPolicy="no-referrer"
          />
          <span className="text-[10px] font-black uppercase text-[#D70F64] tracking-wider mt-1">Dadu Biryani</span>
          <span className="text-[9px] text-zinc-400 font-semibold leading-none">Spiced to perfection</span>
        </motion.div>

        <motion.div 
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 4.8, ease: "easeInOut" }}
          className="bg-white/90 backdrop-blur-md p-3.5 rounded-2xl border border-pink-150/60 shadow-[0_12px_40px_rgba(0,0,0,0.06)] flex flex-col items-center text-center gap-1.5"
        >
          <img 
            src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=120" 
            alt="Home Services" 
            className="w-14 h-14 rounded-full object-cover border-2 border-zinc-200 shadow-sm"
            referrerPolicy="no-referrer"
          />
          <span className="text-[10px] font-black uppercase text-zinc-700 tracking-wider mt-1">Home Services</span>
          <span className="text-[9px] text-zinc-400 font-semibold leading-none">Certified Mechanics</span>
        </motion.div>
      </div>
      
      {/* Welcome Foodpanda-style Intro Splash Animation Screen */}
      <AnimatePresence mode="wait">
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ 
              opacity: 0,
              y: -80,
              scale: 1.05,
              transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
            }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#D70F64] text-white select-none overflow-hidden"
          >
            {/* Background floating abstract food & toolkit shapes */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-10 left-10 text-6xl animate-bounce" style={{ animationDuration: "5s" }}>🍔</div>
              <div className="absolute top-24 right-1/4 text-5xl animate-pulse" style={{ animationDuration: "3.5s" }}>🔧</div>
              <div className="absolute bottom-20 left-1/5 text-5xl animate-bounce" style={{ animationDuration: "4s" }}>🛵</div>
              <div className="absolute bottom-16 right-16 text-6xl animate-pulse" style={{ animationDuration: "6s" }}>🍕</div>
              <div className="absolute top-1/2 left-10 text-4xl animate-bounce" style={{ animationDuration: "5.5s" }}>🍩</div>
              <div className="absolute top-1/3 right-10 text-5xl animate-pulse" style={{ animationDuration: "4.5s" }}>🛠️</div>
            </div>

            {/* Glowing ambient pink background flash */}
            <div className="absolute w-[450px] h-[450px] bg-pink-400/20 rounded-full blur-3xl animate-pulse"></div>

            <div className="flex flex-col items-center max-w-md px-6 text-center z-10 space-y-8">
              {/* Modern bouncing logo container */}
              <motion.div
                initial={{ scale: 0.5, rotate: -10, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 120, damping: 15 }}
                className="w-64 h-36 bg-white rounded-3xl flex items-center justify-center shadow-2xl relative p-4 overflow-hidden border border-white/20"
              >
                {/* Visual badge highlight */}
                <div className="absolute -top-1 -right-1 bg-[#D70F64] text-white font-black text-[8px] uppercase tracking-widest py-0.5 px-2 rounded-full shadow-lg border border-white flex items-center gap-0.5 animate-pulse z-10">
                  <span className="w-1 h-1 bg-white rounded-full"></span>
                  DADU CITY
                </div>

                {/* Main branding image inside logo box */}
                <img 
                  src={daduLogo} 
                  alt="DaduFood Logo" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </motion.div>

              {/* Title & Tagline with staggered animations */}
              <div className="space-y-4">
                <motion.h1
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.5 }}
                  className="font-sans font-black text-3xl sm:text-4xl tracking-tight text-white uppercase drop-shadow-md flex flex-col sm:block"
                >
                  <span className="text-white">DADU</span>{" "}
                  <span className="text-zinc-100 bg-white/10 px-3 py-0.5 rounded-xl border border-white/20">FOOD</span>
                </motion.h1>

                <motion.div
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="inline-block bg-black/20 text-xs text-white/90 font-extrabold px-4 py-2 rounded-full border border-white/10 tracking-widest uppercase shadow-sm"
                >
                  &amp; HOME SERVICES 🛵🛠️
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.85 }}
                  transition={{ delay: 0.45, duration: 0.5 }}
                  className="text-xs text-pink-100/90 font-bold max-w-xs mx-auto leading-relaxed h-8"
                >
                  {splashProgress < 30 && "Gathering hot kitchens..."}
                  {splashProgress >= 30 && splashProgress < 65 && "Assigning fastest delivery riders..."}
                  {splashProgress >= 65 && splashProgress < 90 && "Checking technical repair tools..."}
                  {splashProgress >= 90 && "Starting delicious experience!"}
                </motion.p>
              </div>

              {/* Infinite foodpanda-themed loading line status indicator */}
              <div className="w-56 space-y-2">
                <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden relative border border-white/5">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-75"
                    style={{ width: `${splashProgress}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-pink-100 font-extrabold tracking-widest uppercase font-mono">
                  <span>LOADING applet</span>
                  <span className="bg-white/15 px-1.5 py-0.5 rounded-md text-white">{splashProgress}%</span>
                </div>
              </div>
            </div>

            {/* Bottom branding identifier credits */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.65 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="absolute bottom-8 flex flex-col items-center gap-1 text-[9px] font-black uppercase text-pink-200 tracking-widest text-center leading-tight"
            >
              <span>SUPPORTED BY MEERALI</span>
              <span className="text-xs text-white">❤️</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Floating WhatsApp Helpline Button (Bottom corner) */}
      <a
        href="https://wa.me/923277004471"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 left-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform cursor-pointer flex items-center justify-center border-2 border-white/20 animate-bounce"
        title="WhatsApp live support helpline"
      >
        <MessageSquare className="w-6 h-6 shrink-0 fill-white text-emerald-500" />
      </a>

      {/* Primary Navigation System */}
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
        orders={orders.filter(o => o.status !== "delivered" && o.status !== "completed" && o.status !== "cancelled")}
        onTrackOrder={(order) => {
          setActiveTrackingOrder(order);
          setIsTrackingModalOpen(true);
        }}
        // Pass open cart triggers depending on current view mode
        onOpenGroceryCart={() => setIsGroceryCartOpen(true)}
        groceryCartCount={groceryCartItems.reduce((acc, i) => acc + i.quantity, 0)}
        activeModule={activeModule}
        setActiveModule={setActiveModule}
      />

      {!isAdminConsoleOpen ? (
        <div className="flex-1">
          
          {/* Module Switcher Tabs - Direct & Tactile selection */}
          {!isAuthOpen && (
            <div className="max-w-7xl mx-auto px-4 mt-6">
              <div className="bg-zinc-150 p-1 rounded-2xl flex gap-1.5 border border-zinc-200/60 shadow-xs relative overflow-hidden max-w-sm sm:max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => {
                    setActiveModule("food");
                    setActiveCategory("All");
                  }}
                  className={`flex-1 py-2 sm:py-3 text-[10.5px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeModule === "food"
                      ? "bg-[#D70F64] text-white shadow-md scale-[1.01]"
                      : "text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-805"
                  }`}
                >
                  <span className="text-sm">🍔</span>
                  <span>Dadu Kitchen</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveModule("grocery");
                  }}
                  className={`flex-1 py-2 sm:py-3 text-[10.5px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeModule === "grocery"
                      ? "bg-orange-600 text-white shadow-md scale-[1.01]"
                      : "text-zinc-650 hover:bg-zinc-200/50 hover:text-orange-600"
                  }`}
                >
                  <span className="text-xs">🍏</span>
                  <span>Fresh Groceries</span>
                  {groceryCartItems.length > 0 && (
                    <span className="bg-orange-500 text-white font-mono text-[9px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center animate-pulse leading-none shrink-0 font-black">
                      {groceryCartItems.reduce((acc, i) => acc + i.quantity, 0)}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeModule === "food" ? (
            <>
              {/* Billboard / category selectors */}
              <FoodpandaHero activeCategory={activeCategory} setActiveCategory={setActiveCategory} dealConfig={dealConfig} />

              {/* Active Order Banner Card */}
              {(() => {
                const activeOrderForBanner = orders.find(
                  (o) => o.status !== "delivered" && o.status !== "completed" && o.status !== "cancelled"
                );
                if (!currentUser || !activeOrderForBanner) return null;

                return (
                  <div className="max-w-7xl mx-auto px-4 mt-6">
                    <div 
                      onClick={() => {
                        setActiveTrackingOrder(activeOrderForBanner);
                        setIsTrackingModalOpen(true);
                      }}
                      className="bg-white border-2 border-[#D70F64] p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 cursor-pointer hover:bg-zinc-50 transition-all shadow-xl shadow-pink-500/5 group"
                    >
                      <div className="flex items-center gap-4.5 w-full sm:w-auto">
                        <div className="w-12 h-12 rounded-full bg-[#D70F64]/10 border border-[#D70F64]/30 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition duration-300">
                          🛵
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] font-black uppercase tracking-widest text-[#D70F64] block">Active Placed Order Tracking Live</span>
                          <h4 className="text-xs sm:text-sm font-black text-zinc-800 mt-1 leading-normal truncate">
                            Your Order <span className="font-mono text-zinc-500 font-bold">dadu-{activeOrderForBanner.id.substring(0, 5)}...</span> is currently <span className="text-[#D70F64] uppercase font-bold">{activeOrderForBanner.status === "out_for_delivery" ? "With Foodpanda Rider" : activeOrderForBanner.status === "preparing" ? "Cooking in Kitchen" : "Confirmed & Accepted"}</span>
                          </h4>
                          {activeOrderForBanner.riderName ? (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span className="text-[10px] text-zinc-500 font-extrabold truncate">
                                Rider assigned: <span className="text-[#D70F64] font-black">{activeOrderForBanner.riderName}</span> ({activeOrderForBanner.riderPhone})
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-zinc-400 font-bold block mt-1">
                              ⏳ Assigning driver to your neighborhood...
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <button className="w-full sm:w-auto bg-[#D70F64] text-white text-xs font-black uppercase tracking-widest px-5 py-3 rounded-xl hover:bg-[#b00c50] transition active:scale-95 shrink-0 shadow-md">
                        Track Live Map 🧭
                      </button>
                    </div>
                  </div>
                );
              })()}


          {/* Catalog Listing */}
          <main className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row gap-6">
              
              {/* Left Column: Menu Cards Catalog grid */}
              <div className="flex-1 space-y-6">
                
                {/* Dynamic Restaurants & Shop List selector */}
                {(() => {
                  const uniqueRestaurants = Array.from(
                    new Set(
                      dishes
                        .map((d) => d.restaurantName?.trim() || (d.type === "service" ? "Dadu Home Services" : "Dadu Fast Food & Kitchen"))
                        .filter(Boolean)
                    )
                  ) as string[];
                  return (
                    <div className="bg-white border border-pink-100 p-4.5 rounded-3.5xl space-y-3.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🏪</span>
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-800">Browse Restaurants & Repair Shops</h4>
                            <p className="text-[10px] text-zinc-400 font-bold leading-tight">Filter menu items or choose a specific partner store on Dadu</p>
                          </div>
                        </div>
                        {selectedRestaurant !== "All Restaurants" && (
                          <button
                            onClick={() => setSelectedRestaurant("All Restaurants")}
                            className="text-[10px] text-[#D70F64] font-black uppercase tracking-wider hover:underline cursor-pointer"
                          >
                            Reset filter
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none scroll-smooth">
                        <button
                          onClick={() => setSelectedRestaurant("All Restaurants")}
                          className={`py-2 px-3.5 rounded-xl text-xs font-black transition shrink-0 cursor-pointer border ${
                            selectedRestaurant === "All Restaurants"
                              ? "bg-[#D70F64] text-white border-[#D70F64] font-black shadow-xs shadow-pink-500/10 scale-[1.02]"
                              : "bg-white text-zinc-505 hover:text-zinc-800 hover:bg-zinc-50 border-zinc-200"
                          }`}
                        >
                          🎪 All Kitchens & Shops
                        </button>
                        {uniqueRestaurants.map((vendor) => (
                          <button
                            key={vendor}
                            onClick={() => setSelectedRestaurant(vendor)}
                            className={`py-2 px-3.5 rounded-xl text-xs font-black transition shrink-0 cursor-pointer border flex items-center gap-2 ${
                              selectedRestaurant === vendor
                                ? "bg-[#D70F64] text-white border-[#D70F64] font-black shadow-xs shadow-pink-500/10 scale-[1.02]"
                                : "bg-white text-zinc-505 hover:text-zinc-800 hover:bg-zinc-50 border-zinc-200"
                            }`}
                          >
                            <span className="opacity-90">{vendor.includes("Services") || vendor.includes("Pr") || vendor.includes("Re") ? "🛠️" : "🍔"}</span>
                            <span>{vendor}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold tracking-wider text-zinc-750 uppercase border-b border-pink-100 pb-2">
                    {selectedRestaurant === "All Restaurants" ? activeCategory : selectedRestaurant} Delicacies ({filteredDishes.length})
                  </h3>
                  {searchQuery && (
                    <span className="text-xs text-zinc-500 font-bold">Matching "{searchQuery}"</span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                  {filteredDishes.map((dish) => {
                    const isSvc = dish.type === "service";
                    return (
                      <div
                        key={dish.id}
                        className="bg-white border border-zinc-200/80 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs hover:border-[#D70F64]/30 hover:shadow-md hover:shadow-pink-500/5 transition-all flex flex-col group relative text-zinc-800"
                      >
                        {/* Sold Out Overlay */}
                        {!dish.isAvailable && (
                          <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center text-center p-2 sm:p-4">
                            <BadgeAlert className="w-5 h-5 sm:w-8 sm:h-8 text-zinc-400 mb-1" />
                            <span className="font-extrabold text-[10px] sm:text-sm uppercase tracking-widest text-[#D70F64]">SOLD OUT</span>
                            <span className="text-[8px] sm:text-[10px] text-zinc-500 mt-0.5 font-bold">Soon</span>
                          </div>
                        )}

                        {/* Card Image */}
                        <div className="relative h-28 sm:h-44 bg-zinc-100 overflow-hidden shrink-0 cursor-pointer" onClick={() => setActiveDetailDish(dish)}>
                          <img
                            referrerPolicy="no-referrer"
                            src={dish.imageUrl}
                            alt={dish.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
                          
                          {/* Add to Favorite (Heart Icon Button) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(dish.id);
                            }}
                            className="absolute top-2 right-2 z-30 p-1.5 sm:p-2 rounded-full bg-white/90 hover:bg-white text-[#D70F64] hover:scale-110 active:scale-95 shadow-md transition duration-200 cursor-pointer"
                            title={favoriteDishIds.includes(dish.id) ? "Remove from Favorites" : "Add to Favorites"}
                          >
                            <Heart 
                              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition duration-200 ${
                                favoriteDishIds.includes(dish.id) ? "fill-[#D70F64] text-[#D70F64]" : "text-zinc-650 hover:text-[#D70F64]"
                              }`} 
                            />
                          </button>
                          
                          {/* Top Tag */}
                          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                            <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-wider py-0.5 sm:py-1 px-1.5 sm:px-2.5 rounded-md sm:rounded-lg shadow-md ${
                              isSvc ? "bg-amber-500 text-neutral-950 font-extrabold" : "bg-[#D70F64] text-white"
                            }`}>
                              {isSvc ? "🛠️ Service" : "🍔 Food"}
                            </span>
                            {dish.discountPrice && dish.discountPrice < dish.price && (
                              <span className="text-[7.5px] sm:text-[9px] font-black uppercase tracking-wider py-0.5 sm:py-0.8 px-1.5 sm:px-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-md sm:rounded-lg shadow-md animate-pulse">
                                🔥 {Math.round(((dish.price - dish.discountPrice) / dish.price) * 100)}% OFF
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Contents */}
                        <div className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between space-y-2 sm:space-y-3.5 bg-white">
                          <div className="space-y-1 sm:space-y-1.5 flex-1 cursor-pointer" onClick={() => setActiveDetailDish(dish)}>
                            <div className="text-[8.5px] sm:text-[10.5px] text-zinc-500 font-extrabold tracking-wider uppercase flex items-center gap-1 truncate max-w-full">
                              <span>🏪</span> {dish.restaurantName || (dish.type === "service" ? "Dadu Home Services" : "Dadu Fast Food & Kitchen")}
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-1.5">
                              <h4 className="font-bold text-zinc-800 text-xs sm:text-sm tracking-tight leading-snug group-hover:text-[#D70F64] transition truncate max-w-full">
                                {dish.name}
                              </h4>
                              {dish.discountPrice && dish.discountPrice < dish.price ? (
                                <div className="flex flex-col items-end shrink-0 leading-none">
                                  <span className={`font-black text-xs sm:text-sm whitespace-nowrap text-emerald-600`}>
                                    Rs. {dish.discountPrice}
                                  </span>
                                  <span className="text-[9px] sm:text-[10.5px] line-through text-zinc-400 font-bold mt-0.5">
                                    Rs. {dish.price}
                                  </span>
                                </div>
                              ) : (
                                <span className={`font-black text-xs sm:text-sm shrink-0 whitespace-nowrap ${isSvc ? "text-amber-600" : "text-[#D70F64]"}`}>
                                  Rs. {dish.price}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] sm:text-[11.5px] text-zinc-505 line-clamp-1 sm:line-clamp-3 leading-relaxed font-semibold">
                              {dish.description}
                            </p>
                          </div>

                          {/* Detail Badging - CUSTOMIZED FOR SERVICES (Hidden on mobile grid for cleanliness) */}
                          <div className="hidden sm:flex items-center gap-2 border-t border-zinc-100 pt-3 text-[10.5px] font-semibold text-zinc-500">
                            {isSvc ? (
                              <>
                                <Wrench className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span className="text-amber-500 truncate font-bold">Visiting Fee - Repairs onsite</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                <span>Prep: 20-30m</span>
                                <span className="text-zinc-350">•</span>
                                <span className="text-emerald-600 font-bold">Fast Delivery</span>
                              </>
                            )}
                          </div>

                          {/* Add to checkout CTAs */}
                          <div className="pt-1 shrink-0">
                            <button
                              onClick={() => handleAddToCart(dish)}
                              disabled={!dish.isAvailable}
                              className={`w-full py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl text-[9px] sm:text-xs font-black uppercase tracking-wider transition shadow-xs flex items-center justify-center gap-1 cursor-pointer ${
                                isSvc 
                                  ? "bg-amber-500 hover:bg-amber-600 text-[#121212] font-semibold" 
                                  : "bg-[#D70F64] hover:bg-[#b00c50] text-white"
                              }`}
                            >
                              {isSvc ? (
                                <>
                                  <span className="sm:hidden">+ Book</span>
                                  <span className="hidden sm:inline">Book Diagnosis (Rs. 500)</span>
                                </>
                              ) : (
                                <>
                                  <span className="sm:hidden">+ Add</span>
                                  <span className="hidden sm:inline">Add To Dadu Cart</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>

                {filteredDishes.length === 0 && (
                  <div className="bg-white/80 backdrop-blur-md border border-pink-100 p-12 rounded-3.5xl text-center space-y-4 shadow-sm max-w-md mx-auto">
                    <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner animate-bounce">
                      🍛
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-zinc-800 uppercase tracking-tight">No Delicious Dishes Found</h4>
                      <p className="text-[11px] text-zinc-400 font-semibold leading-relaxed mt-1.5 px-4">
                        Hamein aapki search query <span className="text-[#D70F64] font-bold">"{searchQuery}"</span> se milti-julti koi dish nahi mili. Kuch naya try karein!
                      </p>
                    </div>
                    <button
                      onClick={() => { setSearchQuery(""); setActiveCategory("All"); }}
                      className="bg-[#D70F64] hover:bg-[#b00c50] text-white font-black py-2.5 px-6 text-[10px] uppercase tracking-widest rounded-xl cursor-pointer transition-all shadow-md active:scale-95"
                    >
                      Show All Food Menu 🍽️
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Tracking Panel or order widgets */}
              {currentUser && activeTrackingOrder && (
                <div className="w-full md:w-80 shrink-0 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-450">Live Tracker Dock</h3>
                    {orders.length > 1 && (
                      <span className="text-[10px] text-zinc-500 font-bold">Total: {orders.length} orders</span>
                    )}
                  </div>

                  <OrderTracker order={activeTrackingOrder} />
                  
                  {/* Select other past orders dropdown */}
                  {orders.length > 1 && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 space-y-2 text-xs shadow-xs text-zinc-200">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-450 block">Select Past Order to View</label>
                      <select
                        onChange={(e) => {
                          const id = e.target.value;
                          const ord = orders.find((o) => o.id === id);
                          if (ord) setActiveTrackingOrder(ord);
                        }}
                        value={activeTrackingOrder.id}
                        className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded-xl outline-none text-zinc-200 font-mono text-xs focus:border-[#D70F64] transition"
                      >
                        {orders.map((o) => (
                          <option key={o.id} value={o.id} className="bg-zinc-900 text-zinc-200">
                            dadu-{o.id.substring(0, 5)}... ({o.status.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

            </div>
          </main>
          </>
        ) : (
          <GroceryModule
            categories={groceryCategories}
            products={groceryProducts}
            onAddToCart={handleAddToGroceryCart}
            cartItems={groceryCartItems}
            onUpdateCartQuantity={handleUpdateGroceryCartQuantity}
            onRemoveFromCart={handleRemoveFromGroceryCart}
            searchQuery={searchQuery}
          />
        )}
      </div>
      ) : (
        /* TAB 2: Secure Administrative Console Overlay */
        <AdminPanel
          dishes={dishes}
          orders={orders}
          onClose={() => setIsAdminConsoleOpen(false)}
          adminUsername="meerali120"
          deliverySettings={deliverySettings}
          groceryCategories={groceryCategories}
          groceryProducts={groceryProducts}
          groceryDeliveryConfig={groceryDeliveryConfig}
        />
      )}

      {/* Cart Slider Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        deliveryFee={deliverySettings.deliveryFee}
        onPlaceOrder={handlePlaceOrderSubmit}
        onAddDrink={handleAddExclusiveDrink}
      />

      {/* Standalone Grocery Basket Drawer */}
      <GroceryCartDrawer
        isOpen={isGroceryCartOpen}
        onClose={() => setIsGroceryCartOpen(false)}
        cartItems={groceryCartItems}
        onUpdateQuantity={handleUpdateGroceryCartQuantity}
        onRemoveItem={handleRemoveFromGroceryCart}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        deliveryConfig={groceryDeliveryConfig}
        onPlaceGroceryOrder={handlePlaceGroceryOrder}
      />

      {/* Slide-over User Order History & Reorder Drawer */}
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


      {/* Secure AuthModal logins */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(profile) => {
          setCurrentUser(profile);
          setIsAuthOpen(false);
        }}
      />

      {/* Menu Item Detailed Popup Warning Modal */}
      {activeDetailDish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3.5xl max-w-sm w-full overflow-hidden shadow-2xl text-zinc-100">
            <div className="h-44 relative bg-zinc-950">
              <img src={activeDetailDish.imageUrl} alt={activeDetailDish.name} className="w-full h-full object-cover" referrerPolicy="no-referrer"/>
              <button
                onClick={() => setActiveDetailDish(null)}
                className="absolute top-4 right-4 bg-black/70 hover:bg-black/95 text-white p-2 rounded-full cursor-pointer transition text-xs font-bold"
              >
                Close ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[9px] font-black uppercase tracking-wider py-0.5 px-2 rounded ${
                    activeDetailDish.type === "service" ? "bg-amber-530/20 text-amber-500 font-extrabold" : "bg-[#D70F64]/10 text-[#D70F64] font-black"
                  }`}>
                    {activeDetailDish.type === "service" ? "Licensed electrician visit" : "Kitchen direct"}
                  </span>
                  <span className="text-[9.5px] text-amber-550 font-black tracking-wider uppercase bg-zinc-950 border border-zinc-800 py-0.5 px-2 rounded-sm">
                    🏪 {activeDetailDish.restaurantName || (activeDetailDish.type === "service" ? "Dadu Home Services" : "Dadu Fast Food & Kitchen")}
                  </span>
                </div>
                <h3 className="font-extrabold text-zinc-100 text-base mt-2">{activeDetailDish.name}</h3>
                {activeDetailDish.discountPrice && activeDetailDish.discountPrice < activeDetailDish.price ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-sm font-black text-emerald-400`}>
                      Rs. {activeDetailDish.discountPrice}
                    </span>
                    <span className="text-xs line-through text-zinc-500 font-bold">
                      Rs. {activeDetailDish.price}
                    </span>
                  </div>
                ) : (
                  <span className={`text-sm font-black mt-1 block ${activeDetailDish.type === "service" ? "text-amber-500" : "text-[#D70F64]"}`}>
                    Rs. {activeDetailDish.price}
                  </span>
                )}
              </div>

              <p className="text-xs text-zinc-400 leading-normal font-medium">{activeDetailDish.description}</p>

              {/* Warnings and information customized for services to avoid food cook metrics entirely */}
              {activeDetailDish.type === "service" && (
                <div className="bg-amber-950/20 shadow-xs border border-amber-900/40 text-amber-500 text-[10.5px] p-3 rounded-xl flex items-start gap-1.5 leading-relaxed font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-550 shrink-0 mt-0.5" />
                  <span>
                    ⚠️ **Aane ke charges Note:** This charge is strictly the visitation and diagnostic fee. General repairs and materials are evaluated and quoted on-site.
                  </span>
                </div>
              )}

              <button
                onClick={() => {
                  handleAddToCart(activeDetailDish);
                  setActiveDetailDish(null);
                }}
                className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer ${
                  activeDetailDish.type === "service" ? "bg-amber-500 text-neutral-950 hover:bg-amber-600" : "bg-[#D70F64] text-white hover:bg-[#b00c50]"
                }`}
              >
                {activeDetailDish.type === "service" ? "Book visitation (Rs. 500)" : "Add to Checkout Cart"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Pop-up Full-Screen Tracking Modal */}
      {isTrackingModalOpen && activeTrackingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 p-4 overflow-y-auto backdrop-blur-md">
          <div className="w-full max-w-2xl bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl relative overflow-hidden my-8">
            {/* Top close button */}
            <button
              onClick={() => setIsTrackingModalOpen(false)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-zinc-950/80 hover:bg-zinc-950 text-zinc-400 hover:text-white flex items-center justify-center border border-zinc-800 transition cursor-pointer"
            >
              ✕
            </button>
            
            <div className="p-2 sm:p-4 max-h-[90vh] overflow-y-auto scrollbar-none">
              <OrderTracker 
                order={activeTrackingOrder} 
                onClose={() => setIsTrackingModalOpen(false)} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Visual Success Confetti & Rider Animation Overlay */}
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

      {/* sliding push alerts toast widget */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-50 p-4 max-w-sm bg-zinc-900 border-2 border-[#D70F64]/40 text-zinc-100 rounded-2xl shadow-2xl flex items-start gap-3 animate-slide-in">
          <div className="bg-[#D70F64] text-white p-2.5 rounded-xl shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h5 className="font-extrabold text-xs text-zinc-100 uppercase tracking-wider">{toastNotification.title}</h5>
            <p className="text-[11px] text-zinc-400 mt-1 leading-normal font-semibold">{toastNotification.message}</p>
          </div>
        </div>
      )}

      {/* Custom Exit/Back Confirmation Dialog */}
      {isExitConfirmationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-zinc-900 border-2 border-[#D70F64]/30 rounded-[32px] max-w-sm w-full overflow-hidden shadow-2xl text-zinc-100 relative">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#D70F64] to-transparent" />
            
            <div className="p-6 text-center space-y-5">
              {/* Animated Icon Container */}
              <div className="mx-auto w-16 h-16 rounded-full bg-[#D70F64]/10 border border-[#D70F64]/20 flex items-center justify-center text-[#D70F64]">
                <LogOut className="w-8 h-8 animate-pulse" />
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h3 className="text-lg font-black uppercase tracking-wide text-zinc-100">Exit Dadu Food?</h3>
                <p className="text-xs text-zinc-400 font-semibold leading-relaxed">
                  Are you sure you want to exit? You can stay to explore delicious meals, fresh groceries, or trusted local services!
                </p>
              </div>

              {/* Interaction Buttons */}
              <div className="flex flex-col gap-2 pt-2">
                {/* Stay & order */}
                <button
                  type="button"
                  onClick={() => setIsExitConfirmationOpen(false)}
                  className="w-full bg-[#D70F64] hover:bg-[#b00c50] text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition active:scale-95 shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UtensilsCrossed className="w-4 h-4" />
                  Keep Ordering
                </button>

                {/* Exit Website */}
                <button
                  type="button"
                  onClick={() => {
                    isExitingRef.current = true;
                    setIsExitConfirmationOpen(false);
                    window.history.back();
                    setTimeout(() => {
                      window.location.href = "about:blank";
                    }, 150);
                  }}
                  className="w-full bg-zinc-800 hover:bg-zinc-750 text-zinc-200 py-3 rounded-2xl font-extrabold text-xs uppercase tracking-wider transition active:scale-95 border border-zinc-700/80 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-red-500" />
                  Exit App
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Cart for mobile screens */}
      {cartCountTotal > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden bg-zinc-900/95 border border-zinc-805 p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="bg-[#D70F64] text-white px-2 rounded-lg font-black text-xs h-7 flex items-center justify-center min-w-[28px]">
              {cartCountTotal}
            </div>
            <div className="text-left">
              <span className="text-[10px] text-zinc-400 font-bold block leading-none">TOTAL PRICE</span>
              <span className="text-zinc-100 font-extrabold text-xs sm:text-sm font-mono mt-1 block leading-none">Rs. {cartPriceTotal}</span>
            </div>
          </div>
          <button
            onClick={() => setIsCartOpen(true)}
            className="bg-[#D70F64] text-white font-black text-xs uppercase tracking-wider py-2 px-3.5 rounded-xl hover:bg-[#b00c50] transition active:scale-95 shadow-md flex items-center gap-1 shrink-0"
          >
            Review & Order 🛍
          </button>
        </div>
      )}

      {/* Footer support details */}
      <footer className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-zinc-800 text-center space-y-4">
        <p className="text-xs text-zinc-500 font-semibold">
          © {new Date().getFullYear()} DADUFOOD Delivery Services. All Rights Reserved. Support helpline:{" "}
          <a href="https://wa.me/923277004471" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 transition hover:underline">
            03277004471 (WhatsApp Support)
          </a>
        </p>
      </footer>

    </div>
  );
}
