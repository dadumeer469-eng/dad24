import React, { useState, useEffect } from "react";
import { UserProfile, AppNotification, Order } from "../types";
import { Search, ShoppingBag, User, LogOut, Phone, Bell, ShieldAlert, BadgeCheck, Download, History, Heart } from "lucide-react";
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
  onToggleFavorites,
  showFavoritesOnly,
  orders = [],
  onTrackOrder,
  onOpenGroceryCart = () => {},
  groceryCartCount = 0,
  activeModule = "food",
  setActiveModule,
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
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md text-zinc-800 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] border-b border-pink-100/60">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          
          {/* Logo and Brand */}
        <div 
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-2 shrink-0 cursor-pointer group select-none"
          title="Dadu Food"
        >
          <div className="w-11 h-11 rounded-xl bg-white border border-zinc-200 overflow-hidden flex items-center justify-center group-hover:scale-105 active:scale-95 shadow-sm transition-all relative shrink-0">
            <img 
              src={daduLogo} 
              alt="DF" 
              className="w-full h-full object-cover scale-110" 
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="text-base sm:text-xl font-black tracking-tight text-zinc-900">
            DADU<span className="text-[#d70f64]">FOOD</span>
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
            className="w-full pl-10 pr-4 py-2 bg-zinc-100 border border-zinc-250 rounded-full text-sm text-zinc-800 placeholder-zinc-400 outline-none focus:bg-white focus:border-[#d70f64] focus:ring-1 focus:ring-[#d70f64] transition"
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
                <span className="absolute -top-1 -right-1 bg-[#d70f64] text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce">
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
                      className="text-[10px] text-[#d70f64] font-bold hover:underline cursor-pointer"
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
                ? "bg-pink-600 hover:bg-orange-700 text-white shadow-orange-500/10"
                : "bg-[#d70f64] hover:bg-[#b00c50] text-white"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
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
          <div className="relative">
            {user ? (
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center justify-center w-9.5 h-9.5 rounded-xl bg-zinc-100 border border-zinc-200 font-extrabold text-sm text-[#d70f64] hover:border-pink-500/40 cursor-pointer shadow-xs transition"
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
                      <BadgeCheck className="w-4 h-4 text-[#d70f64] shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-500 font-medium">Phone: {user.phone}</span>
                  <div className="bg-[#d70f64]/10 border border-[#d70f64]/20 text-[#d70f64] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest rounded-md mt-1.5">
                    Orders Placed: {user.ordersCount || 0}
                  </div>
                </div>

                {/* Active Placed Orders List inside User profile dropdown */}
                {orders && orders.length > 0 && (
                  <div className="p-2 border-b border-zinc-200 bg-zinc-50/50">
                    <span className="text-[8.5px] uppercase font-black tracking-widest text-[#d70f64] px-1.5 block mb-1">
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
                          <span className="text-[8px] font-black uppercase text-[#d70f64] bg-[#d70f64]/10 px-1.5 py-0.5 rounded leading-none shrink-0 border border-[#d70f64]/20">
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
                      if (onToggleFavorites) onToggleFavorites();
                    }}
                    className={`w-full text-left font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer ${showFavoritesOnly ? 'text-[#d70f64] bg-[#d70f64]/10' : 'text-zinc-700 hover:bg-zinc-50'}`}
                  >
                    <Heart className={`w-4 h-4 shrink-0 ${showFavoritesOnly ? 'fill-[#d70f64] text-[#d70f64]' : 'text-[#d70f64]'}`} />
                    My Favorites
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      if (onOpenHistory) onOpenHistory();
                    }}
                    className="w-full text-left font-bold text-xs text-zinc-700 px-3.5 py-2 hover:bg-zinc-50 rounded-xl transition flex items-center gap-2 cursor-pointer"
                    id="history-menu-btn"
                  >
                    <History className="w-4 h-4 text-[#d70f64] shrink-0" />
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
                    className="w-full text-left text-xs font-bold text-red-650 px-3.5 py-2 hover:bg-pink-50 rounded-xl transition flex items-center gap-2 cursor-pointer"
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
      </header>
      
      {/* Mobile-only Search Sub Bar */}
      <div className="p-2.5 bg-zinc-50 border-b border-zinc-200 block sm:hidden px-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pizza, burger, electrician..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-full text-xs text-zinc-800 placeholder-zinc-400 outline-none focus:border-[#d70f64]"
          />
        </div>
      </div>
    </>
  );
}
