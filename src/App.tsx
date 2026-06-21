import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { 
  collection, doc, onSnapshot, getDoc, setDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, getDocs 
} from "firebase/firestore";
import { auth, db, handleFirestoreError, cleanObject } from "./firebase";
import { Dish, Order, UserProfile, SystemSettings, AppNotification, OrderItem } from "./types";
import { INITIAL_MENU_ITEMS } from "./data";

// Import modules
import FoodpandaHeader from "./components/FoodpandaHeader";
import FoodpandaHero from "./components/FoodpandaHero";
import CartDrawer from "./components/CartDrawer";
import OrderTracker from "./components/OrderTracker";
import AdminPanel from "./components/AdminPanel";
import AuthModal from "./components/AuthModal";
import RiderPanel from "./components/RiderPanel";

// Icons
import { 
  ShieldAlert, Clock, AlertTriangle, MessageSquare, BadgeAlert, Sparkles, CheckSquare, Wrench 
} from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [deliverySettings, setDeliverySettings] = useState<SystemSettings>({ deliveryFee: 50 });

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

      // Tone 2 staggered slightly
      setTimeout(() => {
        const ctx2 = new AudioCtx();
        const now2 = ctx2.currentTime;
        const osc2 = ctx2.createOscillator();
        const gain2 = ctx2.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(880, now2); // A5
        osc2.frequency.exponentialRampToValueAtTime(1174.66, now2 + 0.15); // D6
        gain2.gain.setValueAtTime(0.10, now2);
        gain2.gain.exponentialRampToValueAtTime(0.01, now2 + 0.3);

        osc2.connect(gain2);
        gain2.connect(ctx2.destination);
        osc2.start(now2);
        osc2.stop(now2 + 0.3);
      }, 100);

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
          setCurrentUser({ uid: authUser.uid, ...profileSnap.data() } as UserProfile);
        } else {
          // Fallback
          const isMeerali = authUser.email === "03277004471@dadu247.com";
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
    });

    return () => unsubscribe();
  }, []);

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

  // --- CART CONTROLLER OPERATIONS ---
  const handleAddToCart = (dish: Dish) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.dishId === dish.id);
      if (existing) {
        return prev.map((item) =>
          item.dishId === dish.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { 
        dishId: dish.id, 
        name: dish.name, 
        price: dish.price, 
        quantity: 1, 
        type: dish.type, 
        serviceDuration: dish.serviceDuration,
        restaurantName: dish.restaurantName || (dish.type === "service" ? "Dadu Home Services" : "Dadu Fast Food & Kitchen")
      }];
    });
    // Open cart drawer for rapid visibility
    setIsCartOpen(true);
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
    const finalFee = details.orderType === "food" ? deliverySettings.deliveryFee : 0;
    const finalGrandTotal = itemsTotal + finalFee;

    const firstService = cartItems.find((itm) => itm.type === "service");
    const computedServiceTiming = details.orderType === "service"
      ? (firstService?.serviceDuration || "Expected arrival within 1 hour")
      : undefined;

    const uniqueOrderId = `order_${Date.now()}`;
    const orderModel: Order = {
      id: uniqueOrderId,
      userId: currentUser.uid,
      userName: details.name,
      userPhone: details.phone,
      userAddress: details.address,
      items: cartItems,
      totalPrice: itemsTotal,
      deliveryFee: finalFee,
      grandTotal: finalGrandTotal,
      status: details.orderType === "service" ? "booked" : "pending",
      paymentMethod: details.paymentMethod as any,
      orderType: details.orderType,
      serviceTiming: computedServiceTiming,
      createdAt: { seconds: Date.now() / 1000 },
      userCoords: details.userCoords || undefined,
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

      // 4. Alert success
      alert("Success! Your DADUFOOD order or service appointment was successfully placed!");
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

  // --- CATALOG RENDER FILTERS ---
  const filteredDishes = dishes.filter((dish) => {
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative pb-28 md:pb-12 flex flex-col font-sans">
      
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
      />

      {currentUser?.role === "rider" ? (
        <RiderPanel currentUser={currentUser} onLogout={() => signOut(auth)} />
      ) : !isAdminConsoleOpen ? (
        <div className="flex-1">
          {/* Billboard / category selectors */}
          <FoodpandaHero activeCategory={activeCategory} setActiveCategory={setActiveCategory} />

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
                  className="bg-zinc-950 border-2 border-[#FF5C00] p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 cursor-pointer hover:bg-zinc-900/80 transition-all shadow-xl shadow-orange-500/5 group"
                >
                  <div className="flex items-center gap-4.5 w-full sm:w-auto">
                    <div className="w-12 h-12 rounded-full bg-[#FF5C00]/10 border border-[#FF5C00]/30 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition duration-300">
                      🛵
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#FF5C00] block">Active Placed Order Tracking Live</span>
                      <h4 className="text-xs sm:text-sm font-black text-white mt-1 leading-normal truncate">
                        Your Order <span className="font-mono text-zinc-400">dadu-{activeOrderForBanner.id.substring(0, 5)}...</span> is currently <span className="text-[#FF5C00] uppercase font-bold">{activeOrderForBanner.status === "out_for_delivery" ? "With Foodpanda Rider" : activeOrderForBanner.status === "preparing" ? "Cooking in Kitchen" : "Confirmed & Accepted"}</span>
                      </h4>
                      {activeOrderForBanner.riderName ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span className="text-[10px] text-zinc-400 font-extrabold truncate">
                            Rider assigned: <span className="text-green-400">{activeOrderForBanner.riderName}</span> ({activeOrderForBanner.riderPhone})
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-500 font-bold block mt-1">
                          ⏳ Assigning driver to your neighborhood...
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <button className="w-full sm:w-auto bg-[#FF5C00] text-zinc-950 text-xs font-black uppercase tracking-widest px-5 py-3 rounded-xl group-hover:bg-[#d44d00] transition active:scale-95 shrink-0 shadow-md">
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
                    <div className="bg-zinc-900 border border-zinc-850 p-4.5 rounded-3.5xl space-y-3.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🏪</span>
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-100">Browse Restaurants & Repair Shops</h4>
                            <p className="text-[10px] text-zinc-500 font-semibold leading-tight">Filter menu items or choose a specific partner store on Dadu</p>
                          </div>
                        </div>
                        {selectedRestaurant !== "All Restaurants" && (
                          <button
                            onClick={() => setSelectedRestaurant("All Restaurants")}
                            className="text-[10px] text-[#FF5C00] font-black uppercase tracking-wider hover:underline cursor-pointer"
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
                              ? "bg-amber-500 text-black border-amber-500 font-black shadow-xs"
                              : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 border-zinc-800"
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
                                ? "bg-[#FF5C00] text-zinc-950 border-[#FF5C00] font-black shadow-xs"
                                : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 border-zinc-800"
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
                  <h3 className="text-sm font-extrabold tracking-wider text-zinc-200 uppercase border-b border-zinc-800 pb-2">
                    {selectedRestaurant === "All Restaurants" ? activeCategory : selectedRestaurant} Delicacies ({filteredDishes.length})
                  </h3>
                  {searchQuery && (
                    <span className="text-xs text-zinc-400 font-bold">Matching "{searchQuery}"</span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                  {filteredDishes.map((dish) => {
                    const isSvc = dish.type === "service";
                    return (
                      <div
                        key={dish.id}
                        className="bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs hover:border-zinc-700/80 hover:shadow-md hover:shadow-orange-500/5 transition-all flex flex-col group relative text-zinc-100"
                      >
                        {/* Sold Out Overlay */}
                        {!dish.isAvailable && (
                          <div className="absolute inset-0 bg-zinc-950/95 z-20 flex flex-col items-center justify-center text-center p-2 sm:p-4">
                            <BadgeAlert className="w-5 h-5 sm:w-8 sm:h-8 text-zinc-500 mb-1" />
                            <span className="font-extrabold text-[10px] sm:text-sm uppercase tracking-widest text-[#FF5C00]">SOLD OUT</span>
                            <span className="text-[8px] sm:text-[10px] text-zinc-400 mt-0.5 font-bold">Soon</span>
                          </div>
                        )}

                        {/* Card Image */}
                        <div className="relative h-28 sm:h-44 bg-zinc-800 overflow-hidden shrink-0 cursor-pointer" onClick={() => setActiveDetailDish(dish)}>
                          <img
                            referrerPolicy="no-referrer"
                            src={dish.imageUrl}
                            alt={dish.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                          
                          {/* Top Tag */}
                          <div className="absolute top-2 left-2 flex gap-1">
                            <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-wider py-0.5 sm:py-1 px-1.5 sm:px-2.5 rounded-md sm:rounded-lg shadow-md ${
                              isSvc ? "bg-amber-500 text-neutral-950 font-extrabold" : "bg-[#FF5C00] text-zinc-950"
                            }`}>
                              {isSvc ? "🛠️ Service" : "🍔 Food"}
                            </span>
                          </div>
                        </div>

                        {/* Card Contents */}
                        <div className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between space-y-2 sm:space-y-3.5 bg-zinc-900">
                          <div className="space-y-1 sm:space-y-1.5 flex-1 cursor-pointer" onClick={() => setActiveDetailDish(dish)}>
                            <div className="text-[8.5px] sm:text-[10.5px] text-zinc-500 font-extrabold tracking-wider uppercase flex items-center gap-1 truncate max-w-full">
                              <span>🏪</span> {dish.restaurantName || (dish.type === "service" ? "Dadu Home Services" : "Dadu Fast Food & Kitchen")}
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-1.5">
                              <h4 className="font-bold text-zinc-100 text-xs sm:text-sm tracking-tight leading-snug group-hover:text-[#FF5C00] transition truncate max-w-full">
                                {dish.name}
                              </h4>
                              <span className={`font-black text-xs sm:text-sm shrink-0 whitespace-nowrap ${isSvc ? "text-amber-500" : "text-[#FF5C00]"}`}>
                                Rs. {dish.price}
                              </span>
                            </div>
                            <p className="text-[10px] sm:text-[11.5px] text-zinc-400 line-clamp-1 sm:line-clamp-3 leading-relaxed font-semibold">
                              {dish.description}
                            </p>
                          </div>

                          {/* Detail Badging - CUSTOMIZED FOR SERVICES (Hidden on mobile grid for cleanliness) */}
                          <div className="hidden sm:flex items-center gap-2 border-t border-zinc-850 pt-3 text-[10.5px] font-semibold text-zinc-400">
                            {isSvc ? (
                              <>
                                <Wrench className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span className="text-amber-500 truncate font-bold">Visiting Fee - Repairs onsite</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                <span>Prep: 20-30m</span>
                                <span className="text-zinc-700">•</span>
                                <span className="text-emerald-500 font-bold">Fast Delivery</span>
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
                                  : "bg-[#FF5C00] hover:bg-[#d44d00] text-zinc-950"
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
                  <div className="bg-zinc-900 border border-zinc-800 p-12 rounded-3xl text-center space-y-3 shadow-xs text-zinc-100">
                    <span className="text-4xl block">🔍</span>
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">
                      We couldn't find any dishes or services matching "{searchQuery}"!
                    </p>
                    <button
                      onClick={() => { setSearchQuery(""); setActiveCategory("All"); }}
                      className="bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-100 font-bold py-2 px-5 text-xs rounded-xl cursor-pointer transition-colors"
                    >
                      Reset Filter Search
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
                        className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded-xl outline-none text-zinc-200 font-mono text-xs focus:border-[#FF5C00] transition"
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
        </div>
      ) : (
        /* TAB 2: Secure Administrative Console Overlay */
        <AdminPanel
          dishes={dishes}
          orders={orders}
          onClose={() => setIsAdminConsoleOpen(false)}
          adminUsername="meerali120"
          deliverySettings={deliverySettings}
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
              <img src={activeDetailDish.imageUrl} alt={activeDetailDish.name} className="w-full h-full object-cover"/>
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
                    activeDetailDish.type === "service" ? "bg-amber-530/20 text-amber-500 font-extrabold" : "bg-[#FF5C00]/10 text-[#FF5C00] font-black"
                  }`}>
                    {activeDetailDish.type === "service" ? "Licensed electrician visit" : "Kitchen direct"}
                  </span>
                  <span className="text-[9.5px] text-amber-550 font-black tracking-wider uppercase bg-zinc-950 border border-zinc-800 py-0.5 px-2 rounded-sm">
                    🏪 {activeDetailDish.restaurantName || (activeDetailDish.type === "service" ? "Dadu Home Services" : "Dadu Fast Food & Kitchen")}
                  </span>
                </div>
                <h3 className="font-extrabold text-zinc-100 text-base mt-2">{activeDetailDish.name}</h3>
                <span className={`text-sm font-black mt-1 block ${activeDetailDish.type === "service" ? "text-amber-500" : "text-[#FF5C00]"}`}>Rs. {activeDetailDish.price}</span>
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
                  activeDetailDish.type === "service" ? "bg-amber-500 text-neutral-950 hover:bg-amber-600" : "bg-[#FF5C00] text-zinc-950 hover:bg-[#d44d00]"
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

      {/* sliding push alerts toast widget */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-50 p-4 max-w-sm bg-zinc-900 border-2 border-[#FF5C00]/40 text-zinc-100 rounded-2xl shadow-2xl flex items-start gap-3 animate-slide-in">
          <div className="bg-[#FF5C00] text-zinc-950 p-2.5 rounded-xl shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h5 className="font-extrabold text-xs text-zinc-100 uppercase tracking-wider">{toastNotification.title}</h5>
            <p className="text-[11px] text-zinc-400 mt-1 leading-normal font-semibold">{toastNotification.message}</p>
          </div>
        </div>
      )}

      {/* Floating Bottom Cart for mobile screens */}
      {cartCountTotal > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden bg-zinc-900/95 border border-zinc-805 p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="bg-[#FF5C00] text-zinc-950 px-2 rounded-lg font-black text-xs h-7 flex items-center justify-center min-w-[28px]">
              {cartCountTotal}
            </div>
            <div className="text-left">
              <span className="text-[10px] text-zinc-400 font-bold block leading-none">TOTAL PRICE</span>
              <span className="text-zinc-100 font-extrabold text-xs sm:text-sm font-mono mt-1 block leading-none">Rs. {cartPriceTotal}</span>
            </div>
          </div>
          <button
            onClick={() => setIsCartOpen(true)}
            className="bg-[#FF5C00] text-zinc-950 font-black text-xs uppercase tracking-wider py-2 px-3.5 rounded-xl hover:bg-[#d44d00] transition active:scale-95 shadow-md flex items-center gap-1 shrink-0"
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
