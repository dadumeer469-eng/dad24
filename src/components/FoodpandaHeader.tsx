import React, { useState } from "react";
import { UserProfile, AppNotification } from "../types";
import { Search, ShoppingBag, User, LogOut, Phone, Bell, ShieldAlert, BadgeCheck } from "lucide-react";

interface FoodpandaHeaderProps {
  user: UserProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenCart: () => void;
  cartCount: number;
  cartTotal: number;
  onOpenAdmin: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  notifications: AppNotification[];
  onClearNotifications: () => void;
}

export default function FoodpandaHeader({
  user,
  onOpenAuth,
  onLogout,
  onOpenCart,
  cartCount,
  cartTotal,
  onOpenAdmin,
  searchQuery,
  setSearchQuery,
  notifications,
  onClearNotifications,
}: FoodpandaHeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadNotifications = notifications.filter(n => !n.read);

  // Unified WhatsApp link formatter
  const whatsAppLink = "https://wa.me/9232770071";

  return (
    <header className="sticky top-0 z-40 bg-zinc-900 text-zinc-100 shadow-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        
        {/* Logo and Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-[#FF5C00] text-zinc-950 p-2 rounded-xl font-black text-xl tracking-tight shadow-md flex items-center justify-center">
            D24
          </div>
          <span className="text-xl font-black tracking-tight text-white hidden sm:inline">
            Dadu <span className="text-[#FF5C00]">24#7</span>
          </span>
        </div>

        {/* Address and support info - desktop only */}
        {user && (
          <div className="hidden md:flex flex-col text-xs text-zinc-400 max-w-xs truncate">
            <span className="font-bold text-zinc-500 block uppercase tracking-wider text-[10px]">DELIVERING TO:</span>
            <span className="truncate text-zinc-200 font-medium">{user.address}</span>
          </div>
        )}

        {/* Search bar inside header */}
        <div className="relative flex-1 max-w-md hidden sm:block">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search delicious burgers, pizza or repairs..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-full text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:bg-zinc-850 focus:border-[#FF5C00] focus:ring-1 focus:ring-[#FF5C00] transition"
          />
        </div>

        {/* Action Widgets Grid */}
        <div className="flex items-center gap-2.5 shrink-0">
          
          {/* Active green click-to-WhatsApp badge */}
          <a
            href={whatsAppLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 hover:bg-emerald-900/30 py-1.5 px-3.5 rounded-full text-xs font-bold shadow-xs transition-all"
          >
            <span className="animate-pulse h-2 w-2 rounded-full bg-emerald-500"></span>
            <span className="hidden leading-none lg:inline">Help:</span>
            <span className="leading-none text-[11px]">032770071</span>
          </a>

          {/* In-App Notifications Center Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
              }}
              className="p-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl transition cursor-pointer relative"
            >
              <Bell className="w-4 h-4 text-zinc-300" />
              {unreadNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#FF5C00] text-zinc-950 text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce">
                  {unreadNotifications.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-2xl shadow-xl w-72 overflow-hidden z-50">
                <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80">
                  <span className="font-bold text-xs tracking-wide uppercase text-zinc-400">Notification Hub</span>
                  {notifications.length > 0 && (
                    <button
                      onClick={() => {
                        onClearNotifications();
                        setShowNotifications(false);
                      }}
                      className="text-[10px] text-[#FF5C00] font-bold hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-zinc-850 bg-zinc-900">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-zinc-500">
                      No updates yet. Order progress notifications will sound and appear here!
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div key={notif.id} className="p-3 hover:bg-zinc-850/30 transition text-xs">
                        <div className="font-bold text-zinc-200">{notif.title}</div>
                        <p className="text-zinc-400 mt-1 font-medium">{notif.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Checkout Cart Trigger */}
          <button
            onClick={onOpenCart}
            className="flex items-center gap-1.5 bg-[#FF5C00] hover:bg-[#d44d00] transition text-zinc-950 py-2 px-3.5 rounded-xl text-xs font-black shadow-md cursor-pointer shrink-0"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden md:inline">Cart</span>
            <span className="bg-zinc-950/20 px-1.5 py-0.5 rounded-md text-[10px] font-bold">
              {cartCount}
            </span>
            <span className="hidden leading-none lg:inline ml-0.5 border-l border-zinc-950/20 pl-1.5">
              Rs. {cartTotal}
            </span>
          </button>

          {/* User Account Circle Dropdown */}
          <div className="relative">
            {user ? (
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center justify-center w-9.5 h-9.5 rounded-xl bg-zinc-850 border border-zinc-750 font-extrabold text-sm text-[#FF5C00] hover:border-orange-500/40 cursor-pointer shadow-xs transition"
              >
                {user.name.charAt(0).toUpperCase()}
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="p-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-750 rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0"
              >
                <User className="w-4 h-4 text-zinc-300" />
                <span className="hidden md:inline text-xs font-bold text-zinc-200">Sign In</span>
              </button>
            )}

            {user && showUserMenu && (
              <div className="absolute right-0 mt-2 bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-2xl shadow-xl w-56 overflow-hidden z-50">
                <div className="p-3.5 border-b border-zinc-800 bg-zinc-950/90 flex flex-col items-start">
                  <div className="flex items-center gap-1 font-bold text-sm text-white">
                    {user.name}
                    {user.role === "admin" && (
                      <BadgeCheck className="w-4 h-4 text-[#FF5C00] shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-400 font-medium">Phone: {user.phone}</span>
                  <div className="bg-[#FF5C00]/10 border border-[#FF5C00]/20 text-[#FF5C00] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest rounded-md mt-1.5">
                    Orders Placed: {user.ordersCount || 0}
                  </div>
                </div>

                <div className="p-1 bg-zinc-900">
                  {user.role === "admin" && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenAdmin();
                      }}
                      className="w-full text-left font-bold text-xs text-amber-500 px-3.5 py-2 hover:bg-amber-950/30 rounded-xl transition flex items-center gap-2 cursor-pointer"
                    >
                      <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                      Admin Console
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full text-left text-xs font-bold text-red-450 px-3.5 py-2 hover:bg-red-950/30 rounded-xl transition flex items-center gap-2 cursor-pointer"
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
      <div className="p-2.5 bg-zinc-950 border-b border-zinc-850 block sm:hidden px-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-450" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pizza, burger, electrician..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-xs text-zinc-200 placeholder-zinc-550 outline-none focus:border-[#FF5C00]"
          />
        </div>
      </div>
    </header>
  );
}
