import React, { useState, useEffect } from "react";
import { UserProfile, AppNotification, Order } from "../types";
import { Search, ShoppingBag, User, LogOut, Phone, Bell, ShieldAlert, BadgeCheck, Download, History } from "lucide-react";
import daduLogo from "../assets/images/dadu_food_logo_1782079256405.jpg";

interface FoodpandaHeaderProps {
  user: UserProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenCart: () => void;
  cartCount: number;
  cartTotal: number;
  onOpenAdmin: () => void;
  onOpenHistory?: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  notifications: AppNotification[];
  onClearNotifications: () => void;
  activeCategory?: string;
  setActiveCategory?: (cat: string) => void;
  orders?: Order[];
  onTrackOrder?: (order: Order) => void;
  onOpenGroceryCart?: () => void;
  groceryCartCount?: number;
  activeModule?: "food" | "grocery";
  setActiveModule?: (mode: "food" | "grocery") => void;
}

export default function FoodpandaHeader({
  user,
  onOpenAuth,
  onLogout,
  onOpenCart,
  cartCount,
  cartTotal,
  onOpenAdmin,
  onOpenHistory,
  searchQuery,
  setSearchQuery,
  notifications,
  onClearNotifications,
  activeCategory,
  setActiveCategory,
  orders = [],
  onTrackOrder,
  onOpenGroceryCart = () => {},
  groceryCartCount = 0,
  activeModule = "food",
  setActiveModule,
}: FoodpandaHeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // PWA & Installation state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [activeInstallTab, setActiveInstallTab] = useState<"android" | "ios" | "desktop">("android");

  useEffect(() => {
    // 1. Detect standalone mode (already installed & running)
    const standaloneCheck = 
      window.matchMedia("(display-mode: standalone)").matches || 
      (navigator as any).standalone === true;
    setIsStandalone(standaloneCheck);

    // 2. Detect iOS devices
    const iosCheck = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIos(iosCheck);
    if (iosCheck) {
      setActiveInstallTab("ios");
    } else if (/Mobi|Android/i.test(navigator.userAgent)) {
      setActiveInstallTab("android");
    } else {
      setActiveInstallTab("desktop");
    }

    // 3. Listen to chrome/android auto installer prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 4. Listen to successful installations to reset the icons
    const handleAppInstalled = () => {
      console.log("Dadu Food application installed successfully!");
      setDeferredPrompt(null);
      setCanInstall(false);
      setIsStandalone(true);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleLogoClick = () => {
    setShowInstallModal(true);
  };

  const unreadNotifications = notifications.filter(n => !n.read);

  // Unified WhatsApp link formatter
  const whatsAppLink = "https://wa.me/923277004471";

  const categories = [
    { name: "All", emoji: "🍽️" },
    { name: "Burgers", emoji: "🍔" },
    { name: "Pizzas", emoji: "🍕" },
    { name: "Chicken & Rice", emoji: "🍗" },
    { name: "Only Tea", emoji: "🍵" },
    { name: "Specials", emoji: "⭐️" },
    { name: "Home Services", emoji: "🛠️" }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white text-zinc-800 shadow-sm border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        
        {/* Logo and Brand */}
        <div 
          onClick={handleLogoClick}
          className="flex items-center gap-2 shrink-0 cursor-pointer group select-none"
          title="Install Dadu Food App on your Home Screen!"
        >
          <div className="w-11 h-11 rounded-xl bg-white border border-zinc-200 overflow-hidden flex items-center justify-center group-hover:scale-105 active:scale-95 shadow-sm transition-all relative shrink-0">
            <img 
              src={daduLogo} 
              alt="DF" 
              className="w-full h-full object-cover scale-110" 
              referrerPolicy="no-referrer"
            />
            {/* Pulsing notification indicator for home screen installation */}
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <span className="text-base sm:text-xl font-black tracking-tight text-zinc-900">
            DADU<span className="text-[#D70F64]">FOOD</span>
          </span>

          {/* Quick inline pill indicating they can download/install */}
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 py-0.5 px-2 rounded-full text-[9px] font-black uppercase tracking-wider animate-pulse shadow-xs shrink-0 select-none">
            <Download className="w-2.5 h-2.5 text-emerald-600 animate-bounce" />
            Install App
          </span>
        </div>

        {/* Address and support info - desktop only */}
        {user && (
          <div className="hidden md:flex flex-col text-xs text-zinc-500 max-w-xs truncate">
            <span className="font-bold text-zinc-400 block uppercase tracking-wider text-[10px]">DELIVERING TO:</span>
            <span className="truncate text-zinc-750 font-medium">{user.address}</span>
          </div>
        )}

        {/* Search bar inside header */}
        <div className="relative flex-1 max-w-md hidden sm:block">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search delicious burgers, pizza or repairs..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-100 border border-zinc-250 rounded-full text-sm text-zinc-800 placeholder-zinc-400 outline-none focus:bg-white focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64] transition"
          />
        </div>

        {/* Action Widgets Grid */}
        <div className="flex items-center gap-2.5 shrink-0">
          
          {/* In-App Notifications Center Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
              }}
              className="p-2.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-250 rounded-xl transition cursor-pointer relative"
            >
              <Bell className="w-4 h-4 text-zinc-700" />
              {unreadNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#D70F64] text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce">
                  {unreadNotifications.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 bg-white border border-zinc-200 text-zinc-800 rounded-2xl shadow-xl w-72 max-sm:fixed max-sm:top-16 max-sm:left-4 max-sm:right-4 max-sm:w-auto overflow-hidden z-50 animate-fade-in">
                <div className="p-3.5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
                  <span className="font-bold text-xs tracking-wide uppercase text-zinc-500">Notification Hub</span>
                  {notifications.length > 0 && (
                    <button
                      onClick={() => {
                        onClearNotifications();
                        setShowNotifications(false);
                      }}
                      className="text-[10px] text-[#D70F64] font-bold hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-zinc-100 bg-white">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-zinc-400">
                      No updates yet. Order progress notifications will sound and appear here!
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div key={notif.id} className="p-3 hover:bg-zinc-50 transition text-xs">
                        <div className="font-bold text-zinc-800">{notif.title}</div>
                        <p className="text-zinc-500 mt-1 font-medium">{notif.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Checkout Cart Trigger */}
          <button
            onClick={activeModule === "grocery" ? onOpenGroceryCart : onOpenCart}
            className={`flex items-center gap-1.5 transition py-2 px-3.5 rounded-xl text-xs font-black shadow-md cursor-pointer shrink-0 ${
              activeModule === "grocery"
                ? "bg-orange-600 hover:bg-orange-700 text-white shadow-orange-500/10"
                : "bg-[#D70F64] hover:bg-[#b00c50] text-white"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden md:inline">{activeModule === "grocery" ? "Basket" : "Cart"}</span>
            <span className="bg-white/20 px-1.5 py-0.5 rounded-md text-[10px] font-bold">
              {activeModule === "grocery" ? groceryCartCount : cartCount}
            </span>
            {activeModule !== "grocery" && (
              <span className="hidden leading-none lg:inline ml-0.5 border-l border-white/20 pl-1.5">
                Rs. {cartTotal}
              </span>
            )}
          </button>

          {/* User Account Circle Dropdown */}
          <div className="relative">
            {user ? (
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center justify-center w-9.5 h-9.5 rounded-xl bg-zinc-100 border border-zinc-200 font-extrabold text-sm text-[#D70F64] hover:border-pink-500/40 cursor-pointer shadow-xs transition"
              >
                {user.name.charAt(0).toUpperCase()}
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="p-2.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0"
              >
                <User className="w-4 h-4 text-zinc-700" />
                <span className="hidden md:inline text-xs font-bold text-zinc-800">Sign In</span>
              </button>
            )}

            {user && showUserMenu && (
              <div className="absolute right-0 mt-2 bg-white border border-zinc-200 text-zinc-800 rounded-2xl shadow-xl w-56 max-sm:fixed max-sm:top-16 max-sm:left-4 max-sm:right-4 max-sm:w-auto overflow-hidden z-50 animate-fade-in">
                <div className="p-3.5 border-b border-zinc-200 bg-zinc-50 flex flex-col items-start">
                  <div className="flex items-center gap-1 font-bold text-sm text-zinc-900">
                    {user.name}
                    {user.role === "admin" && (
                      <BadgeCheck className="w-4 h-4 text-[#D70F64] shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-500 font-medium">Phone: {user.phone}</span>
                  <div className="bg-[#D70F64]/10 border border-[#D70F64]/20 text-[#D70F64] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest rounded-md mt-1.5">
                    Orders Placed: {user.ordersCount || 0}
                  </div>
                </div>

                {/* Active Placed Orders List inside User profile dropdown */}
                {orders && orders.length > 0 && (
                  <div className="p-2 border-b border-zinc-200 bg-zinc-50/50">
                    <span className="text-[8.5px] uppercase font-black tracking-widest text-[#D70F64] px-1.5 block mb-1">
                      Live Delivery Tracker
                    </span>
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {orders.map((o) => (
                        <button
                          key={o.id}
                          onClick={() => {
                            setShowUserMenu(false);
                            if (onTrackOrder) onTrackOrder(o);
                          }}
                          className="w-full text-left p-1.5 rounded-lg hover:bg-zinc-100 transition text-[10.5px] font-bold flex items-center justify-between border border-zinc-100 cursor-pointer text-zinc-700"
                        >
                          <span className="truncate max-w-[110px] text-zinc-800">
                            dadu-{o.id.substring(0, 5)}
                          </span>
                          <span className="text-[8px] font-black uppercase text-[#D70F64] bg-[#D70F64]/10 px-1.5 py-0.5 rounded leading-none shrink-0 border border-[#D70F64]/20">
                            {o.status === "out_for_delivery" ? "Transit 🛵" : o.status === "preparing" ? "Kitchen 🍳" : o.status === "accepted" ? "Cook 🍳" : "Placed"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-1 bg-white">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      if (onOpenHistory) onOpenHistory();
                    }}
                    className="w-full text-left font-bold text-xs text-zinc-700 px-3.5 py-2 hover:bg-zinc-50 rounded-xl transition flex items-center gap-2 cursor-pointer"
                    id="history-menu-btn"
                  >
                    <History className="w-4 h-4 text-[#D70F64] shrink-0" />
                    Order History
                  </button>

                  {user.role === "admin" && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenAdmin();
                      }}
                      className="w-full text-left font-bold text-xs text-amber-600 px-3.5 py-2 hover:bg-amber-50 rounded-xl transition flex items-center gap-2 cursor-pointer"
                    >
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                      Admin Console
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full text-left text-xs font-bold text-red-650 px-3.5 py-2 hover:bg-red-50 rounded-xl transition flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
      
      {/* Mobile-only Search Sub Bar */}
      <div className="p-2.5 bg-zinc-50 border-b border-zinc-200 block sm:hidden px-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pizza, burger, electrician..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-full text-xs text-zinc-800 placeholder-zinc-400 outline-none focus:border-[#D70F64]"
          />
        </div>
      </div>

      {/* Mobile-only Categories Horizontal Row */}
      {activeCategory && setActiveCategory && (
        <div className="p-2 pt-0 pb-3 bg-white block sm:hidden px-4 border-b border-zinc-200">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth">
            {categories.map((cat) => {
              const isSelected = activeCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => setActiveCategory(cat.name)}
                  className={`flex items-center gap-1.5 py-1.5 px-3 rounded-full text-[11px] font-black shrink-0 transition-all border outline-none select-none ${
                    isSelected 
                      ? "bg-[#D70F64] text-white border-[#D70F64]" 
                      : "bg-zinc-100 text-zinc-650 border-zinc-200 hover:bg-zinc-250/50 hover:text-zinc-800"
                  }`}
                >
                  <span className="text-xs">{cat.emoji}</span>
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Unified PWA Installation Instructions Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 z-[110] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative border border-zinc-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Close button top corner */}
            <button
              onClick={() => setShowInstallModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 transition p-2 cursor-pointer select-none text-sm font-bold bg-zinc-100 rounded-full w-8 h-8 flex items-center justify-center"
            >
              ✕
            </button>

            {/* Logo highlight */}
            <div className="flex justify-center mb-3">
              <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg border border-zinc-100 p-0.5 bg-white relative">
                <img src={daduLogo} alt="Dadu Food" className="w-full h-full object-cover rounded-xl" />
                <span className="absolute -bottom-1 -right-1 bg-[#D70F64] text-white p-1 rounded-full text-[10px]">
                  <Download className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            <h3 className="text-center font-black text-base text-zinc-950 tracking-tight">
              Add Dadu Food to Home Screen
            </h3>
            <p className="text-center text-[10px] text-zinc-500 mt-0.5 font-bold uppercase tracking-wider text-pink-600 animate-pulse">
              📲 Fast Mobile App Shortcut
            </p>
            <p className="text-center text-[11px] text-zinc-400 mt-1 px-4 leading-relaxed font-semibold">
              Bina browser open kiye directly home screen se order karein!
            </p>

            {/* Platform Selection Tabs */}
            <div className="flex bg-zinc-100 p-1 rounded-xl mt-4 gap-1.5 border border-zinc-250/50">
              <button
                type="button"
                onClick={() => setActiveInstallTab("android")}
                className={`flex-1 py-1.5 rounded-lg text-center text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                  activeInstallTab === "android"
                    ? "bg-[#D70F64] text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Android 🤖
              </button>
              <button
                type="button"
                onClick={() => setActiveInstallTab("ios")}
                className={`flex-1 py-1.5 rounded-lg text-center text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                  activeInstallTab === "ios"
                    ? "bg-[#D70F64] text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                iPhone 🍎
              </button>
              <button
                type="button"
                onClick={() => setActiveInstallTab("desktop")}
                className={`flex-1 py-1.5 rounded-lg text-center text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                  activeInstallTab === "desktop"
                    ? "bg-[#D70F64] text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Laptop 💻
              </button>
            </div>

            {/* Tab Contents */}
            <div className="mt-4 space-y-3.5 bg-zinc-50 p-4 rounded-2xl border border-zinc-150 text-[11px] text-zinc-700 leading-relaxed font-semibold">
              
              {/* Direct Install Button inside Android / Desktop if promotional prompt is active */}
              {deferredPrompt && (activeInstallTab === "android" || activeInstallTab === "desktop") && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      deferredPrompt.prompt();
                      const { outcome } = await deferredPrompt.userChoice;
                      if (outcome === "accepted") {
                        setDeferredPrompt(null);
                        setCanInstall(false);
                        setShowInstallModal(false);
                      }
                    } catch (err) {
                      console.error("Install prompting failed:", err);
                    }
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-md animate-bounce mb-2"
                >
                  <Download className="w-3.5 h-3.5 animate-pulse" />
                  Install Instantly! (Click Here)
                </button>
              )}

              {activeInstallTab === "ios" && (
                <>
                  <div className="flex items-start gap-2.5">
                    <span className="bg-white w-5 h-5 rounded-md text-[10px] flex items-center justify-center border border-zinc-200 shadow-xs shrink-0 font-bold text-zinc-800">1</span>
                    <div className="flex-1 text-left">
                      <span className="font-bold text-zinc-900 block">Share icon par click karein</span>
                      <p className="text-[10px] text-zinc-400 mt-0.5 leading-normal">Safari browser ke niche <span className="font-bold text-[#D70F64]">Share 📤</span> button par tap karein.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="bg-white w-5 h-5 rounded-md text-[10px] flex items-center justify-center border border-zinc-200 shadow-xs shrink-0 font-bold text-zinc-800">2</span>
                    <div className="flex-1 text-left">
                      <span className="font-bold text-zinc-900 block">Add to Home Screen select karein</span>
                      <p className="text-[10px] text-zinc-400 mt-0.5 leading-normal">Ghumayein (scroll karein) aur menu se <span className="font-bold text-[#D70F64]">(+) Add to Home Screen</span> dabayein.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="bg-white w-5 h-5 rounded-md text-[10px] flex items-center justify-center border border-zinc-200 shadow-xs shrink-0 font-bold text-zinc-800">3</span>
                    <div className="flex-1 text-left">
                      <span className="font-bold text-zinc-900 block">Upar right me 'Add' click karein</span>
                      <p className="text-[10px] text-zinc-400 mt-0.5 leading-normal">Ab direct logo Dadu Food aapke mobile ki Screen pe aa jayega!</p>
                    </div>
                  </div>
                </>
              )}

              {activeInstallTab === "android" && (
                <>
                  <div className="flex items-start gap-2.5">
                    <span className="bg-white w-5 h-5 rounded-md text-[10px] flex items-center justify-center border border-zinc-200 shadow-xs shrink-0 font-bold text-zinc-800">1</span>
                    <div className="flex-1 text-left">
                      <span className="font-bold text-zinc-900 block">Chrome menu open karein</span>
                      <p className="text-[10px] text-zinc-400 mt-0.5 leading-normal">Chrome browser me upar ya niche right par <span className="font-bold">3 dots (⋮)</span> icon tap karein.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="bg-white w-5 h-5 rounded-md text-[10px] flex items-center justify-center border border-zinc-200 shadow-xs shrink-0 font-bold text-zinc-800">2</span>
                    <div className="flex-1 text-left">
                      <span className="font-bold text-zinc-900 block">Select "Install App" / "Add Screen"</span>
                      <p className="text-[10px] text-zinc-400 mt-0.5 leading-normal">Wahan <span className="font-bold text-[#D70F64]">"Install App"</span> ya <span className="font-bold text-[#D70F64]">"Add to Home Screen"</span> option select karein.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="bg-white w-5 h-5 rounded-md text-[10px] flex items-center justify-center border border-zinc-200 shadow-xs shrink-0 font-bold text-zinc-800">3</span>
                    <div className="flex-1 text-left">
                      <span className="font-bold text-zinc-900 block">Confirm Add</span>
                      <p className="text-[10px] text-zinc-400 mt-0.5 leading-normal">Abb direct real mobile application ban kar aapke phone me chalegi!</p>
                    </div>
                  </div>
                </>
              )}

              {activeInstallTab === "desktop" && (
                <>
                  <div className="flex items-start gap-2.5">
                    <span className="bg-white w-5 h-5 rounded-md text-[10px] flex items-center justify-center border border-zinc-200 shadow-xs shrink-0 font-bold text-zinc-800">1</span>
                    <div className="flex-1 text-left">
                      <span className="font-bold text-zinc-900 block">Look at Address Bar</span>
                      <p className="text-[10px] text-zinc-400 mt-0.5 leading-normal">Browser ki upar wali URL bar (jahan website link hoti hai) ke right side par dekhein.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="bg-white w-5 h-5 rounded-md text-[10px] flex items-center justify-center border border-zinc-200 shadow-xs shrink-0 font-bold text-zinc-800">2</span>
                    <div className="flex-1 text-left">
                      <span className="font-bold text-zinc-900 block">Find the Install Icon</span>
                      <p className="text-[10px] text-zinc-400 mt-0.5 leading-normal">Wahan ek <span className="font-bold">PC Monitor ya (+) arrow</span> ka install sign dikhega, use tap karein.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="bg-white w-5 h-5 rounded-md text-[10px] flex items-center justify-center border border-zinc-200 shadow-xs shrink-0 font-bold text-zinc-800">3</span>
                    <div className="flex-1 text-left">
                      <span className="font-bold text-zinc-900 block">Confirm Install</span>
                      <p className="text-[10px] text-zinc-400 mt-0.5 leading-normal">Install button dabayein aur shortcut create ho jayega!</p>
                    </div>
                  </div>
                </>
              )}

            </div>

            {/* Actions for Go-Home or Scroll Top */}
            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowInstallModal(false);
                  setSearchQuery("");
                  if (setActiveCategory) {
                    setActiveCategory("All");
                  }
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-[10px] uppercase tracking-wider rounded-xl transition cursor-pointer select-none text-center"
              >
                Go to Home Screen Page 🏡
              </button>
              
              <button
                type="button"
                onClick={() => setShowInstallModal(false)}
                className="w-full py-2.5 bg-[#D70F64] hover:bg-[#b00c50] text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition cursor-pointer select-none shadow-md mt-1"
              >
                Close and Continue
              </button>
            </div>

          </div>
        </div>
      )}
    </header>
  );
}
