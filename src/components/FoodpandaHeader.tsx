import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { UserProfile, AppNotification, Order } from "../types";
import { Search, ShoppingBag, User, LogOut, Phone, Bell, ShieldAlert, BadgeCheck, Download, History, Heart, RotateCcw, Sun, Moon, X } from "lucide-react";
import daduLogo from "../assets/images/dadu_food_logo_new_1782333467889.jpg";

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
  onToggleFavorites,
  showFavoritesOnly,
  orders = [],
  onTrackOrder,
  onOpenGroceryCart = () => {},
  groceryCartCount = 0,
  isLocked = false,
  activeModule = "food",
  setActiveModule,
  onResetFoodHome,
  onResetGroceryHome,
  allOrders = [],
  onReorder,
  theme = "light",
  onToggleTheme,
}: FoodpandaHeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

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
    <>
      <header className="relative z-40 bg-white/90 dark:bg-zinc-950/95 backdrop-blur-md text-zinc-800 dark:text-zinc-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] border-b border-pink-100/60 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          
          {/* Logo and Brand */}
        <div 
          onClick={() => {
            if (activeModule === "grocery" && onResetGroceryHome) {
              onResetGroceryHome();
            } else if (onResetFoodHome) {
              onResetFoodHome();
            } else {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          className="flex items-center gap-2 shrink-0 cursor-pointer group select-none"
          title="Dadu Food Home"
        >
          <div className="w-11 h-11 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden flex items-center justify-center group-hover:scale-105 active:scale-95 shadow-sm transition-all relative shrink-0">
            <img 
              src={daduLogo} 
              alt="DF" 
              className="w-full h-full object-cover scale-110" 
              referrerPolicy="no-referrer"
            />
          </div>
          <motion.span 
            initial={{ opacity: 0, x: -8, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 350, damping: 20 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="text-base sm:text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center"
          >
            DADU
            <motion.span 
              animate={{ 
                color: ["#d70f64", "#ff2a85", "#d70f64"],
                scale: [1, 1.05, 1]
              }}
              transition={{ 
                duration: 2.2, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="text-[#d70f64] inline-block font-black ml-0.5"
            >
              FOOD
            </motion.span>
          </motion.span>
        </div>

        {/* Address and support info - desktop only */}
        {user && (
          <div className="hidden md:flex flex-col text-xs text-zinc-500 dark:text-zinc-400 max-w-xs truncate">
            <span className="font-bold text-zinc-400 dark:text-zinc-500 block uppercase tracking-wider text-[10px]">DELIVERING TO:</span>
            <span className="truncate text-zinc-750 dark:text-zinc-250 font-medium">{user.address}</span>
          </div>
        )}

        {/* Search bar inside header */}
        <div className="relative flex-1 max-w-md hidden sm:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d70f64] pointer-events-none" />
          <input
            id="desktop-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for food, grocery or deals..."
            className="w-full pl-10 pr-9 py-2 bg-zinc-100/90 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80 rounded-full text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-[#d70f64] focus:ring-2 focus:ring-[#d70f64]/20 transition-all shadow-2xs font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full transition cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action Widgets Grid */}
        <div className="flex items-center gap-2.5 shrink-0">
          
          {/* Install App Button */}
          <button
            onClick={() => {
              if ((window as any).triggerPWAInstall) {
                (window as any).triggerPWAInstall();
              }
            }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-pink-600 to-[#d70f64] hover:from-pink-700 hover:to-[#b00c50] text-white rounded-xl font-black text-xs shadow-sm cursor-pointer transition active:scale-95 border border-pink-400/20"
            title="Install Dadu Food App"
          >
            <Download className="w-3.5 h-3.5 animate-bounce" />
            <span>Install App</span>
          </button>
          
          {/* In-App Notifications Center Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
              }}
              className="p-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-250 dark:border-zinc-700 rounded-xl transition cursor-pointer relative"
            >
              <Bell className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
              {unreadNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#d70f64] text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce">
                  {unreadNotifications.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-2xl shadow-xl w-72 max-sm:fixed max-sm:top-16 max-sm:left-4 max-sm:right-4 max-sm:w-auto overflow-hidden z-50 animate-fade-in">
                <div className="p-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
                  <span className="font-bold text-xs tracking-wide uppercase text-zinc-500 dark:text-zinc-400">Notification Hub</span>
                  {notifications.length > 0 && (
                    <button
                      onClick={() => {
                        onClearNotifications();
                        setShowNotifications(false);
                      }}
                      className="text-[10px] text-[#d70f64] font-bold hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
                      No updates yet. Order progress notifications will sound and appear here!
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div key={notif.id} className="p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition text-xs">
                        <div className="font-bold text-zinc-800 dark:text-zinc-200">{notif.title}</div>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-1 font-medium">{notif.message}</p>
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
                ? "bg-pink-600 hover:bg-orange-700 text-white shadow-orange-500/10"
                : "bg-[#d70f64] hover:bg-[#b00c50] text-white"
            }`}
          >
            {isLocked ? <span className="text-sm">🔒</span> : <ShoppingBag className="w-4 h-4" />}
            <span className="hidden md:inline">{activeModule === "grocery" ? "Basket" : "Cart"}</span>
            <span className="bg-white/20 px-1.5 py-0.5 rounded-md text-[10px] font-bold">
              {activeModule === "grocery" ? groceryCartCount : cartCount}
            </span>
            {activeModule !== "grocery" && cartTotal > 0 && (
              <span className="hidden leading-none lg:inline ml-0.5 border-l border-white/20 pl-1.5">
                Rs. {cartTotal}
              </span>
            )}
          </button>

          {/* User Account Circle Dropdown */}
          <div className="relative hidden lg:block">
            {user ? (
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center justify-center w-9.5 h-9.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-extrabold text-sm text-[#d70f64] hover:border-pink-500/40 cursor-pointer shadow-xs transition animate-fade-in"
              >
                {user.name.charAt(0).toUpperCase()}
              </button>
            ) : (
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifications(false);
                }}
                className="p-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <User className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                <span className="hidden md:inline text-xs font-bold text-zinc-800 dark:text-zinc-200">Sign In & Settings</span>
              </button>
            )}

            {!user && showUserMenu && (
              <div className="absolute right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-2xl shadow-xl w-56 max-sm:fixed max-sm:top-16 max-sm:left-4 max-sm:right-4 max-sm:w-auto overflow-hidden z-50 animate-fade-in">
                <div className="p-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col items-start">
                  <span className="font-bold text-xs text-zinc-900 dark:text-white uppercase tracking-wider text-[10px]">Guest Options</span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium mt-1">Sign in to order food, books and services</span>
                </div>

                <div className="p-1 bg-white dark:bg-zinc-900">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenAuth();
                    }}
                    className="w-full text-left font-bold text-xs text-[#d70f64] px-3.5 py-2 hover:bg-pink-50 dark:hover:bg-zinc-800/60 rounded-xl transition flex items-center gap-2 cursor-pointer"
                  >
                    <User className="w-4 h-4 shrink-0 text-[#d70f64]" />
                    Sign In / Register
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      if ((window as any).triggerPWAInstall) {
                        (window as any).triggerPWAInstall();
                      }
                    }}
                    className="w-full text-left font-extrabold text-xs text-[#d70f64] bg-pink-50/60 dark:bg-pink-950/20 px-3.5 py-2 my-1 hover:bg-pink-100 dark:hover:bg-pink-900/40 rounded-xl transition flex items-center justify-between cursor-pointer border border-pink-200/50 dark:border-pink-800/30"
                  >
                    <span className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-[#d70f64] shrink-0 animate-bounce" />
                      <span>Install Dadu Food App</span>
                    </span>
                    <span className="text-[10px] bg-[#d70f64] text-white font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                      App
                    </span>
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
                        <BadgeCheck className="w-4 h-4 text-[#d70f64] shrink-0" />
                      )}
                    </div>
                    <div className="bg-[#d70f64]/10 border border-[#d70f64]/20 text-[#d70f64] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest rounded-md">
                      {user.ordersCount || 0} Orders
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">Phone: {user.phone}</span>
                  
                  {/* Loyalty Balance Badge */}
                  <div className="mt-2 w-full bg-gradient-to-r from-[#d70f64] to-pink-600 rounded-xl p-2 text-white flex items-center justify-between text-[10px] font-sans">
                    <span className="font-extrabold flex items-center gap-1">👑 Coin Benefit Wallet:</span>
                    <span className="font-black bg-white text-[#d70f64] px-1.5 py-0.5 rounded-md text-[9px]">Rs. {user.loyaltyCoins ?? ((user.ordersCount || 0) * 15)}</span>
                  </div>
                </div>

                {/* Active Placed Orders List inside User profile dropdown (Horizontal Scroll) */}
                {orders && orders.length > 0 && (
                  <div className="p-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
                    <span className="text-[8.5px] uppercase font-black tracking-widest text-[#d70f64] px-1.5 block mb-1">
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
                          className="shrink-0 min-w-[130px] p-1.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-[10.5px] font-bold flex items-center justify-between border border-zinc-200 dark:border-zinc-800 cursor-pointer text-zinc-700 dark:text-zinc-300"
                        >
                          <span className="truncate max-w-[70px] text-zinc-800 dark:text-zinc-200 font-mono">
                            #{o.id.substring(0, 5)}
                          </span>
                          <span className="text-[8px] font-black uppercase text-[#d70f64] bg-[#d70f64]/10 px-1.5 py-0.5 rounded leading-none shrink-0 border border-[#d70f64]/20">
                            {o.status === "out_for_delivery" ? "Transit 🛵" : o.status === "preparing" ? "Kitchen 🍳" : o.status === "accepted" ? "Cook 🍳" : "Placed"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Orders section for quick re-ordering (Horizontal Cards) */}
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
                            className="shrink-0 w-44 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-[#d70f64]/30 transition-all text-[10.5px] font-bold space-y-1 shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-700 dark:text-zinc-300 font-extrabold text-[10px]">
                                #{o.id.substring(0, 5)}
                              </span>
                              <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded leading-none shrink-0 border ${
                                o.status === "delivered" || o.status === "completed"
                                  ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                  : o.status === "cancelled"
                                  ? "text-red-600 bg-red-50 border-red-200"
                                  : "text-amber-700 bg-amber-50 border-amber-200"
                              }`}>
                                {o.status === "delivered" || o.status === "completed" ? "Done" : o.status === "cancelled" ? "Cancelled" : "Active"}
                              </span>
                            </div>
                            <div className="text-[9px] text-zinc-500 dark:text-zinc-400 truncate leading-snug font-medium">
                              {o.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800">
                              <span className="text-[#d70f64] font-black text-[9.5px]">
                                Rs. {o.grandTotal}
                              </span>
                              {onReorder && (
                                <button
                                  onClick={() => {
                                    setShowUserMenu(false);
                                    onReorder(o);
                                  }}
                                  className="text-[8.5px] text-white bg-[#d70f64] hover:bg-[#b00c50] px-2 py-0.5 rounded-md flex items-center gap-0.5 font-black cursor-pointer transition uppercase"
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

                {/* Horizontal / Grid Quick Action Buttons */}
                <div className="p-2 bg-white dark:bg-zinc-900 flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      if (onToggleFavorites) onToggleFavorites();
                    }}
                    className={`flex-1 min-w-[100px] font-bold text-xs px-2.5 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border ${showFavoritesOnly ? 'text-[#d70f64] bg-[#d70f64]/10 border-[#d70f64]/20' : 'text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/80 border-zinc-100 dark:border-zinc-750 hover:bg-zinc-100'}`}
                  >
                    <Heart className={`w-3.5 h-3.5 shrink-0 ${showFavoritesOnly ? 'fill-[#d70f64] text-[#d70f64]' : 'text-[#d70f64]'}`} />
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
                    <History className="w-3.5 h-3.5 text-[#d70f64] shrink-0" />
                    <span>History</span>
                  </button>

                  <button
                    onClick={() => {
                      if (onToggleTheme) onToggleTheme();
                    }}
                    className="flex-1 min-w-[100px] font-bold text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-100 dark:border-zinc-750 px-2.5 py-2 hover:bg-zinc-100 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {theme === "light" ? (
                      <Moon className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />
                    ) : (
                      <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    )}
                    <span>{theme === "light" ? "Dark" : "Light"}</span>
                  </button>

                  {user.role === "admin" && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenAdmin();
                      }}
                      className="w-full font-bold text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 px-2.5 py-2 hover:bg-amber-100 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Admin Console</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200/50 px-2.5 py-2 hover:bg-red-100 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
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
      
      {/* Mobile-only Search Sub Bar */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-950/95 border-b border-zinc-100 dark:border-zinc-800/80 block sm:hidden px-4 py-2 shadow-xs backdrop-blur-md">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d70f64] pointer-events-none" />
          <input
            id="mobile-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for food, grocery or deals..."
            className="w-full pl-10 pr-9 py-2.5 bg-zinc-100/90 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 rounded-full text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-[#d70f64] focus:ring-2 focus:ring-[#d70f64]/20 transition-all shadow-2xs font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full transition cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
