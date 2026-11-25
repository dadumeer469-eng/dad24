import React, { useState } from "react";
import { UserProfile, AppNotification, Order } from "../types";
import { Search, ShoppingBag, User, LogOut, Bell, ShieldAlert, BadgeCheck, History, Heart, RotateCcw, Sun, Moon, X, Settings, MapPin, ChevronDown, Mic } from "lucide-react";
import daduLogo from "../assets/images/dadu_food_logo_new_1782333467889.jpg";
import { formatOrderId } from "../utils/catalogNormalizer";

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
  onMarkNotificationAsRead?: (id: string) => void;
  onMarkAllNotificationsAsRead?: () => void;
  activeCategory?: string;
  setActiveCategory?: (cat: string) => void;
  onToggleFavorites?: () => void;
  showFavoritesOnly?: boolean;
  orders?: Order[];
  onTrackOrder?: (order: Order) => void;
  onOpenGroceryCart?: () => void;
  groceryCartCount?: number;
  isLocked?: boolean;
  activeModule?: "food" | "grocery";
  setActiveModule?: (mode: "food" | "grocery") => void;
  onResetFoodHome?: () => void;
  onResetGroceryHome?: () => void;
  allOrders?: Order[];
  onReorder?: (order: Order) => void;
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
  onOpenSettings?: () => void;
  onOpenLocation?: () => void;
  locationLabel?: string;
  hasLocation?: boolean;
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
  onMarkNotificationAsRead,
  onMarkAllNotificationsAsRead,
  onToggleFavorites,
  showFavoritesOnly,
  orders = [],
  onTrackOrder,
  onOpenGroceryCart = () => {},
  groceryCartCount = 0,
  isLocked = false,
  activeModule = "food",
  onResetFoodHome,
  onResetGroceryHome,
  allOrders = [],
  onReorder,
  theme = "light",
  onToggleTheme,
  onOpenSettings,
  onOpenLocation,
  locationLabel,
  hasLocation = false,
}: FoodpandaHeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);
  const [isListening, setIsListening] = useState(false);

  // Voice search (Web Speech API) — speaks the dish/shop name into the search box
  const voiceSupported =
    typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const startVoiceSearch = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    try {
      const rec = new SR();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      setIsListening(true);
      rec.onresult = (e: any) => {
        const text = e.results?.[0]?.[0]?.transcript;
        if (text) setSearchQuery(text);
      };
      rec.onend = () => setIsListening(false);
      rec.onerror = () => setIsListening(false);
      rec.start();
    } catch {
      setIsListening(false);
    }
  };
  const switchModule = (mode: "food" | "grocery") => {
    if (setActiveModule) setActiveModule(mode);
    if (mode === "food" && onResetFoodHome) onResetFoodHome();
    if (mode === "grocery" && onResetGroceryHome) onResetGroceryHome();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Food / Groceries segmented switch (Foodpanda-style, with grocery basket badge)
  const moduleSwitch = (
    <div className="bg-white rounded-full p-1 flex shadow-lg shadow-[#D70F64]/20">
      <button
        type="button"
        onClick={() => switchModule("food")}
        className={`flex-1 min-h-[40px] rounded-full text-[13px] sm:text-sm font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${activeModule === "food" ? "bg-gradient-to-r from-[#FF2B85] via-[#E21B70] to-[#D70F64] text-white shadow-md shadow-[#D70F64]/40" : "text-[#14141A]"}`}
      >
        🍔 FOOD DELIVERY
      </button>
      <button
        type="button"
        onClick={() => switchModule("grocery")}
        className={`flex-1 min-h-[40px] rounded-full text-[13px] sm:text-sm font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${activeModule === "grocery" ? "bg-gradient-to-r from-[#FF2B85] via-[#E21B70] to-[#D70F64] text-white shadow-md shadow-[#D70F64]/40" : "text-[#14141A]"}`}
      >
        🛒 GROCERIES
        {groceryCartCount > 0 && (
          <span className={`text-[10px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center tabular-nums ${activeModule === "grocery" ? "bg-white text-[#D70F64]" : "bg-[#D70F64] text-white"}`}>
            {groceryCartCount}
          </span>
        )}
      </button>
    </div>
  );

  const unreadNotifications = notifications.filter(n => !n.read);
  const resolvedLocationText =
    (locationLabel && locationLabel.trim()) ||
    (user?.address && user.address.trim()) ||
    "Set Delivery Location in Dadu";

  return (
    <>
      {/* Foodpanda Signature Pink Header */}
      <header className="relative z-40 bg-[#D70F64] text-white shadow-sm">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-4 h-[60px] flex items-center justify-between gap-2 sm:gap-3.5">
          {/* Logo + Mobile Location Trigger */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
            <button
              type="button"
              onClick={() => {
                if (activeModule === "grocery" && onResetGroceryHome) {
                  onResetGroceryHome();
                } else if (onResetFoodHome) {
                  onResetFoodHome();
                } else {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              className="min-h-[44px] flex items-center gap-2 shrink-0 cursor-pointer group select-none text-left"
              title="Dadu Food Home"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border-2 border-white/30 overflow-hidden flex items-center justify-center group-hover:scale-105 active:scale-95 shadow-xs transition-transform relative shrink-0">
                <img
                  src={daduLogo}
                  alt="Dadu Food Logo"
                  className="w-full h-full object-cover scale-110"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="hidden sm:inline text-lg sm:text-xl font-black tracking-tight text-white">
                DADU<span className="text-pink-100">FOOD</span>
              </span>
            </button>

            {/* Tappable Delivery Location Pill (Mobile & Desktop) */}
            <button
              type="button"
              onClick={() => onOpenLocation?.()}
              className="min-h-[44px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/12 hover:bg-white/20 active:scale-[0.98] transition-all text-left min-w-0 max-w-[210px] sm:max-w-[230px] cursor-pointer"
              title="Change delivery location"
            >
              <MapPin className="w-4 h-4 text-white shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="block text-[9.5px] font-bold uppercase tracking-wider text-pink-100 leading-none">
                  {hasLocation ? "Delivering to" : "Location required"}
                </span>
                <span className="flex items-center gap-1 text-xs font-extrabold text-white truncate mt-0.5">
                  <span className="truncate">{resolvedLocationText}</span>
                  <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-85" />
                </span>
              </div>
            </button>
          </div>

          {/* Desktop White Pill Search Bar inside Pink Header */}
          <div className="relative flex-1 max-w-md hidden sm:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D70F64] pointer-events-none" />
            <input
              id="desktop-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeModule === "grocery"
                  ? "Search 100 Dadu Mart groceries..."
                  : "Search biryani, pizza, burgers or shops..."
              }
              className="w-full min-h-[42px] pl-10 pr-10 py-2 bg-white text-[#14141A] placeholder-[#6E6E80] rounded-full text-sm outline-none shadow-xs focus:ring-2 focus:ring-white/60 transition-all font-medium"
            />
            {voiceSupported && (
              <button
                type="button"
                onClick={startVoiceSearch}
                aria-label="Voice search"
                title="Voice search"
                className={`absolute ${searchQuery ? "right-10" : "right-2"} top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full transition cursor-pointer ${isListening ? "bg-[#D70F64] text-white animate-pulse" : "text-[#D70F64] hover:bg-pink-50"}`}
              >
                <Mic className="w-4 h-4" />
              </button>
            )}
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#5A5A6B] hover:text-[#14141A] rounded-full transition cursor-pointer"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Action Widgets */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Dark / Light Mode Toggle */}
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                aria-label={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
                title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center gap-1.5 px-2.5 bg-white/15 hover:bg-white/25 text-white rounded-full transition cursor-pointer text-xs font-bold shrink-0"
              >
                {theme === "light" ? (
                  <>
                    <Moon className="w-4 h-4 text-white shrink-0" />
                    <span className="hidden xl:inline">Dark</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-4 h-4 text-amber-200 shrink-0" />
                    <span className="hidden xl:inline text-white">Light</span>
                  </>
                )}
              </button>
            )}

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                type="button"
                aria-label="Notifications"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowUserMenu(false);
                }}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-white/15 hover:bg-white/25 text-white rounded-full transition cursor-pointer relative"
              >
                <Bell className="w-4 h-4 text-white" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-white text-[#D70F64] text-[10px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center tabular-nums shadow-xs">
                    {unreadNotifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-2xl shadow-xl w-80 max-sm:fixed max-sm:top-16 max-sm:left-4 max-sm:right-4 max-sm:w-auto overflow-hidden z-50 animate-fade-in">
                  <div className="p-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs tracking-wide uppercase text-zinc-600 dark:text-zinc-300">Notifications</span>
                      {unreadNotifications.length > 0 && (
                        <span className="bg-[#D70F64] text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                          {unreadNotifications.length} unread
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadNotifications.length > 0 && onMarkAllNotificationsAsRead && (
                        <button
                          onClick={() => onMarkAllNotificationsAsRead()}
                          className="text-[10px] text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-semibold cursor-pointer"
                          title="Mark all as read"
                        >
                          Mark all read
                        </button>
                      )}
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
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
                        No updates yet. Order progress notifications will appear here.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            if (!notif.read && onMarkNotificationAsRead) {
                              onMarkNotificationAsRead(notif.id);
                            }
                            setSelectedNotification(notif);
                          }}
                          className={`p-3.5 transition text-xs cursor-pointer group flex items-start gap-2.5 ${
                            !notif.read
                              ? "bg-pink-50/70 dark:bg-pink-950/20 hover:bg-pink-100/70 dark:hover:bg-pink-950/40 border-l-4 border-l-[#D70F64]"
                              : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {!notif.read ? (
                              <span className="w-2.5 h-2.5 rounded-full bg-[#D70F64] block animate-pulse" />
                            ) : (
                              <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700 block" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className={`font-bold truncate ${!notif.read ? "text-zinc-900 dark:text-white" : "text-zinc-700 dark:text-zinc-300"}`}>
                                {notif.title}
                              </span>
                              {!notif.read && (
                                <span className="text-[9px] font-black uppercase text-[#D70F64] bg-pink-100 dark:bg-pink-900/40 px-1.5 py-0.2 rounded shrink-0">
                                  NEW
                                </span>
                              )}
                            </div>
                            <p className="text-zinc-500 dark:text-zinc-400 mt-1 font-medium line-clamp-2 leading-relaxed">
                              {notif.message}
                            </p>
                            <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500 mt-1.5 block font-semibold group-hover:text-[#D70F64] transition-colors">
                              Click to read full message →
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Cart Button */}
            <button
              type="button"
              onClick={activeModule === "grocery" ? onOpenGroceryCart : onOpenCart}
              aria-label="Open Cart"
              className="min-h-[44px] flex items-center gap-1.5 transition py-2 px-3 sm:px-3.5 rounded-full text-xs font-extrabold shadow-xs cursor-pointer shrink-0 bg-white text-[#D70F64] hover:bg-pink-50 active:scale-[0.98]"
            >
              {isLocked ? <span className="text-sm">🔒</span> : <ShoppingBag className="w-4 h-4" />}
              <span className="hidden md:inline">{activeModule === "grocery" ? "Basket" : "Cart"}</span>
              <span className="bg-[#D70F64] text-white px-1.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums min-w-[20px] text-center">
                {activeModule === "grocery" ? groceryCartCount : cartCount}
              </span>
              {activeModule !== "grocery" && cartTotal > 0 && (
                <span className="hidden leading-none lg:inline ml-0.5 border-l border-[#D70F64]/25 pl-1.5 font-mono tabular-nums">
                  Rs. {cartTotal}
                </span>
              )}
            </button>

            {/* Desktop User Account Dropdown */}
            <div className="relative hidden lg:block">
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(!showUserMenu);
                    setShowNotifications(false);
                  }}
                  className="flex items-center justify-center w-11 h-11 rounded-full bg-white text-[#D70F64] font-black text-sm shadow-xs hover:bg-pink-50 cursor-pointer transition"
                >
                  {user.name.charAt(0).toUpperCase()}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(!showUserMenu);
                    setShowNotifications(false);
                  }}
                  className="min-h-[44px] px-3.5 bg-white/15 hover:bg-white/25 text-white rounded-full transition cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <User className="w-4 h-4 text-white" />
                  <span className="hidden md:inline text-xs font-bold text-white">Sign In</span>
                </button>
              )}

              {!user && showUserMenu && (
                <div className="absolute right-0 mt-2 bg-white dark:bg-[#14141A] border border-[#E6E6EE] dark:border-[#272733] text-[#14141A] dark:text-[#F5F5F8] rounded-2xl shadow-xl w-56 max-sm:fixed max-sm:top-16 max-sm:left-4 max-sm:right-4 max-sm:w-auto overflow-hidden z-50 animate-fade-in">
                  <div className="p-3.5 border-b border-[#E6E6EE] dark:border-[#272733] bg-[#F9F9FB] dark:bg-[#0B0B0F] flex flex-col items-start">
                    <span className="font-bold text-[10px] text-[#14141A] dark:text-white uppercase tracking-wider">Guest Options</span>
                    <span className="text-[11px] text-[#5A5A6B] dark:text-[#A1A1B2] font-medium mt-1">Sign in to order fresh food &amp; groceries in Dadu</span>
                  </div>

                  <div className="p-1 bg-white dark:bg-zinc-900">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenAuth();
                      }}
                      className="w-full text-left font-bold text-xs text-[#D70F64] px-3.5 py-2 hover:bg-pink-50 dark:hover:bg-zinc-800/60 rounded-xl transition flex items-center gap-2 cursor-pointer"
                    >
                      <User className="w-4 h-4 shrink-0 text-[#D70F64]" />
                      Sign In / Register
                    </button>

                    <button
                      onClick={() => {
                        if (onToggleTheme) onToggleTheme();
                      }}
                      className="w-full text-left font-bold text-xs text-zinc-700 dark:text-zinc-300 px-3.5 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        {theme === "light" ? (
                          <Moon className="w-4 h-4 text-zinc-700 dark:text-zinc-300 shrink-0" />
                        ) : (
                          <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                        )}
                        <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
                      </span>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium capitalize">
                        {theme}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {user && showUserMenu && (
                <div className="absolute right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-2xl shadow-xl w-72 sm:w-80 max-sm:fixed max-sm:top-16 max-sm:left-4 max-sm:right-4 max-sm:w-auto overflow-hidden z-50 animate-fade-in">
                  <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col items-start">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1 font-bold text-sm text-zinc-900 dark:text-white">
                        {user.name}
                        {user.role === "admin" && (
                          <BadgeCheck className="w-4 h-4 text-[#D70F64] shrink-0" />
                        )}
                      </div>
                      <div className="bg-[#D70F64]/10 border border-[#D70F64]/20 text-[#D70F64] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest rounded-md">
                        {user.ordersCount || 0} Orders
                      </div>
                    </div>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
                      {user.phone ? `Phone: ${user.phone}` : user.email || "Verified Customer"}
                    </span>

                    <div className="mt-2 w-full bg-gradient-to-r from-[#D70F64] to-[#FF2B85] rounded-xl p-2 text-white flex items-center justify-between text-[10px] font-sans">
                      <span className="font-extrabold flex items-center gap-1">👑 Coin Benefit Wallet:</span>
                      <span className="font-black bg-white text-[#D70F64] px-1.5 py-0.5 rounded-md text-[9px]">
                        Rs. {user.loyaltyCoins ?? (user.ordersCount || 0) * 15}
                      </span>
                    </div>
                  </div>

                  {/* Active Placed Orders */}
                  {orders && orders.length > 0 && (
                    <div className="p-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
                      <span className="text-[8.5px] uppercase font-black tracking-widest text-[#D70F64] px-1.5 block mb-1">
                        Live Delivery Tracker
                      </span>
                      <div className="flex overflow-x-auto gap-1.5 pb-1 scrollbar-none">
                        {orders.map((o) => (
                          <button
                            key={o.id}
                            onClick={() => {
                              setShowUserMenu(false);
                              if (onTrackOrder) onTrackOrder(o);
                            }}
                            className="shrink-0 min-w-[140px] p-1.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-[10.5px] font-bold flex items-center justify-between gap-1.5 border border-zinc-200 dark:border-zinc-800 cursor-pointer text-zinc-700 dark:text-zinc-300"
                          >
                            <span className="truncate max-w-[85px] text-zinc-800 dark:text-zinc-200 font-mono">
                              {formatOrderId(o.id)}
                            </span>
                            <span className="text-[8px] font-black uppercase text-[#D70F64] bg-[#D70F64]/10 px-1.5 py-0.5 rounded leading-none shrink-0 border border-[#D70F64]/20">
                              {o.status === "payment_verification_pending"
                                ? "Verify Pay"
                                : o.status === "out_for_delivery"
                                ? "Transit"
                                : o.status === "preparing"
                                ? "Kitchen"
                                : o.status === "accepted" || o.status === "confirmed"
                                ? "Confirmed"
                                : "Placed"}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Orders */}
                  {(() => {
                    const recentUserOrders = allOrders
                      .filter((o) => o.userId === user.uid)
                      .slice(0, 4);
                    if (recentUserOrders.length === 0) return null;
                    return (
                      <div className="p-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/30">
                        <span className="text-[8.5px] uppercase font-black tracking-widest text-zinc-500 dark:text-zinc-400 px-1.5 block mb-1.5">
                          Recent Orders
                        </span>
                        <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none">
                          {recentUserOrders.map((o) => (
                            <div
                              key={o.id}
                              className="shrink-0 w-44 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-[#D70F64]/30 transition-all text-[10.5px] font-bold space-y-1 shadow-2xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-zinc-700 dark:text-zinc-300 font-extrabold text-[10px]">
                                  {formatOrderId(o.id)}
                                </span>
                                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded leading-none shrink-0 border ${
                                  o.status === "delivered" || o.status === "completed"
                                    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                    : o.status === "cancelled"
                                    ? "text-red-600 bg-red-50 border-red-200"
                                    : "text-amber-700 bg-amber-50 border-amber-200"
                                }`}>
                                  {o.status === "delivered" || o.status === "completed"
                                    ? "Done"
                                    : o.status === "cancelled"
                                    ? "Cancelled"
                                    : o.status === "payment_verification_pending"
                                    ? "Verify Pay"
                                    : "Active"}
                                </span>
                              </div>
                              <div className="text-[9px] text-zinc-500 dark:text-zinc-400 truncate leading-snug font-medium">
                                {o.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                              </div>
                              <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800">
                                <span className="text-[#D70F64] font-black text-[9.5px]">
                                  Rs. {o.grandTotal}
                                </span>
                                {onReorder && (
                                  <button
                                    onClick={() => {
                                      setShowUserMenu(false);
                                      onReorder(o);
                                    }}
                                    className="text-[8.5px] text-white bg-[#D70F64] hover:bg-[#B80C54] px-2 py-0.5 rounded-md flex items-center gap-0.5 font-black cursor-pointer transition uppercase"
                                  >
                                    <RotateCcw className="w-2.5 h-2.5 stroke-[3]" />
                                    Reorder
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Quick Actions */}
                  <div className="p-2 bg-white dark:bg-zinc-900 flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        if (onToggleFavorites) onToggleFavorites();
                      }}
                      className={`flex-1 min-w-[100px] font-bold text-xs px-2.5 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border ${showFavoritesOnly ? 'text-[#D70F64] bg-[#D70F64]/10 border-[#D70F64]/20' : 'text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/80 border-zinc-100 dark:border-zinc-750 hover:bg-zinc-100'}`}
                    >
                      <Heart className={`w-3.5 h-3.5 shrink-0 ${showFavoritesOnly ? 'fill-[#D70F64] text-[#D70F64]' : 'text-[#D70F64]'}`} />
                      <span>Favorites</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        if (onOpenHistory) onOpenHistory();
                      }}
                      className="flex-1 min-w-[100px] font-bold text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-100 dark:border-zinc-750 px-2.5 py-2 hover:bg-zinc-100 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                      id="history-menu-btn"
                    >
                      <History className="w-3.5 h-3.5 text-[#D70F64] shrink-0" />
                      <span>History</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        if (onOpenSettings) onOpenSettings();
                      }}
                      className="flex-1 min-w-[100px] font-bold text-xs text-zinc-800 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2.5 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5 text-[#D70F64] shrink-0" />
                      <span>My Settings</span>
                    </button>

                    <button
                      onClick={() => {
                        if (onToggleTheme) onToggleTheme();
                      }}
                      className="flex-1 min-w-[100px] font-bold text-xs text-zinc-800 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2.5 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {theme === "light" ? (
                        <Moon className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
                      ) : (
                        <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                      <span>{theme === "light" ? "Dark" : "Light"}</span>
                    </button>

                    {(user.role === "admin" || user.role === "staff") && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenAdmin();
                        }}
                        className="w-full font-bold text-xs text-[#D70F64] bg-[#D70F64]/10 border border-[#D70F64]/30 px-2.5 py-2 hover:bg-[#D70F64]/20 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-[#D70F64] shrink-0" />
                        <span>Admin Console</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      className="w-full text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 px-2.5 py-2 hover:bg-red-100 dark:hover:bg-red-950/60 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 shrink-0" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Foodpanda Pink Sticky Pill Search Bar */}
      <div className="sticky top-0 z-30 bg-[#D70F64] block sm:hidden px-3.5 pb-3 pt-0.5 shadow-sm">
        <div className="relative flex items-center">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D70F64] pointer-events-none" />
          <input
            id="mobile-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeModule === "grocery"
                ? "Search 100 Dadu Mart groceries..."
                : "Search shops, dishes & groceries"
            }
            className="w-full min-h-[44px] pl-10 pr-10 py-2.5 bg-white text-[#14141A] placeholder-[#6E6E80] rounded-full text-sm outline-none shadow-xs focus:ring-2 focus:ring-white/60 transition-all font-medium"
          />
          {voiceSupported && (
            <button
              type="button"
              onClick={startVoiceSearch}
              aria-label="Voice search"
              title="Voice search"
              className={`absolute ${searchQuery ? "right-11" : "right-1.5"} top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full transition cursor-pointer ${isListening ? "bg-[#D70F64] text-white animate-pulse" : "text-[#D70F64] hover:bg-pink-50"}`}
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-[#5A5A6B] hover:text-[#14141A] rounded-full transition cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {/* Food / Groceries segmented switch */}
        <div className="mt-2.5">{moduleSwitch}</div>
      </div>

      {/* Desktop Food / Groceries segmented switch */}
      <div className="hidden sm:block bg-[#D70F64] px-4 pb-3">
        <div className="max-w-7xl mx-auto">
          <div className="mx-auto max-w-lg">{moduleSwitch}</div>
        </div>
      </div>

      {/* Notification Detail View Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-pink-100 dark:bg-pink-950/50 flex items-center justify-center text-[#D70F64] shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Message Detail</span>
                  <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                    {selectedNotification.createdAt?.seconds
                      ? new Date(selectedNotification.createdAt.seconds * 1000).toLocaleString([], {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "Recently received"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedNotification(null)}
                className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-full bg-zinc-100 dark:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4">
              <h3 className="text-base font-black text-zinc-900 dark:text-white leading-snug">
                {selectedNotification.title}
              </h3>
              <div className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-200 mt-3 font-normal leading-relaxed whitespace-pre-line bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-750 max-h-60 overflow-y-auto">
                {selectedNotification.message}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                ✓ Marked as Read
              </span>
              <button
                onClick={() => setSelectedNotification(null)}
                className="px-5 py-2.5 bg-[#D70F64] text-white text-xs font-bold rounded-xl hover:bg-[#B80C54] transition cursor-pointer shadow-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
