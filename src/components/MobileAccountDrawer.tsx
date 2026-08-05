import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, User, History, Heart, Sun, Moon, ShieldAlert, LogOut, BadgeCheck, RotateCcw, Download } from "lucide-react";
import { UserProfile, Order } from "../types";

interface MobileAccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  orders: Order[];
  allOrders: Order[];
  onTrackOrder: (order: Order) => void;
  onReorder?: (order: Order) => void;
  showFavoritesOnly?: boolean;
  onToggleFavorites?: () => void;
  onOpenHistory?: () => void;
  onOpenAdmin: () => void;
  onLogout: () => void;
  theme: "light" | "dark";
  onToggleTheme?: () => void;
}

export default function MobileAccountDrawer({
  isOpen,
  onClose,
  user,
  orders,
  allOrders,
  onTrackOrder,
  onReorder,
  showFavoritesOnly,
  onToggleFavorites,
  onOpenHistory,
  onOpenAdmin,
  onLogout,
  theme,
  onToggleTheme,
}: MobileAccountDrawerProps) {
  if (!user) return null;

  const activeOrders = orders.filter(
    (o) => o.status !== "delivered" && o.status !== "completed" && o.status !== "cancelled"
  );

  const recentUserOrders = allOrders
    .filter((o) => o.userId === user.uid)
    .slice(0, 3);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs lg:hidden"
          />

          {/* Drawer Body */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] bg-white dark:bg-zinc-900 rounded-t-3xl shadow-[0_-8px_30px_rgb(0,0,0,0.12)] flex flex-col overflow-hidden pb-safe border-t border-zinc-150 dark:border-zinc-800 lg:hidden"
          >
            {/* Handle Bar */}
            <div className="flex justify-center py-2.5 shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </div>

            {/* Header */}
            <div className="px-5 pb-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-pink-50 dark:bg-zinc-850 flex items-center justify-center text-xl font-black text-[#D70F64] shadow-2xs border border-[#D70F64]/10">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1 font-black text-base text-zinc-900 dark:text-white">
                    {user.name}
                    {user.role === "admin" && (
                      <BadgeCheck className="w-4 h-4 text-[#D70F64] shrink-0" />
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                    Phone: {user.phone}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-full transition cursor-pointer"
              >
                <X className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              </button>
            </div>

            {/* Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-none">
              
              {/* Dadu Loyalty Wallet Card */}
              <div className="bg-gradient-to-br from-[#D70F64] to-pink-600 rounded-3xl p-4 sm:p-5 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-15">
                  <span className="text-5xl">👑</span>
                </div>
                <span className="text-[9.5px] uppercase font-black tracking-widest text-pink-100 block">
                  Dadu Coin Benefit Wallet
                </span>
                <div className="mt-2.5 flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black">Rs. {user.loyaltyCoins ?? ((user.ordersCount || 0) * 15)}</span>
                  <span className="text-[11px] font-bold text-pink-100">Coin Benefit</span>
                </div>
                <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10.5px]">
                  <span className="font-bold text-pink-100">
                    🔥 Earned Rs. 15 per completed delivery
                  </span>
                  <span className="bg-white text-[#D70F64] px-2 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wide">
                    Level {(user.ordersCount || 0) > 10 ? "Gold" : "Silver"}
                  </span>
                </div>
              </div>

              {/* Active Placed Orders Tracker */}
              {activeOrders.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-black tracking-widest text-[#D70F64] block">
                    Live Deliveries
                  </span>
                  <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
                    {activeOrders.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => {
                          onClose();
                          onTrackOrder(o);
                        }}
                        className="shrink-0 w-44 p-3 rounded-2xl bg-pink-50/50 dark:bg-pink-950/10 border border-pink-100 dark:border-pink-900/30 text-left transition hover:scale-102 active:scale-98 cursor-pointer shadow-3xs"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-mono text-xs font-black text-zinc-800 dark:text-zinc-200">
                            #{o.id.substring(0, 5)}
                          </span>
                          <span className="text-[8px] font-black uppercase text-[#D70F64] bg-[#D70F64]/10 px-2 py-0.5 rounded border border-[#D70F64]/20">
                            Track 🛵
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400 capitalize font-bold">
                          Status: {o.status.replace(/_/g, " ")}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Orders section for quick re-ordering */}
              {recentUserOrders.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500 dark:text-zinc-400 block">
                    Recent Orders
                  </span>
                  <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
                    {recentUserOrders.map((o) => (
                      <div
                        key={o.id}
                        className="shrink-0 w-48 p-3 rounded-2xl border border-zinc-150 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-[#D70F64]/20 transition-all text-left shadow-3xs flex flex-col justify-between h-[105px]"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-zinc-800 dark:text-zinc-200 font-extrabold text-[11px]">
                              #{o.id.substring(0, 5)}
                            </span>
                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded leading-none border ${
                              o.status === "delivered" || o.status === "completed"
                                ? "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40"
                                : o.status === "cancelled"
                                ? "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/40"
                                : "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40"
                            }`}>
                              {o.status === "delivered" || o.status === "completed" ? "Done" : o.status === "cancelled" ? "Cancelled" : "Active"}
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate font-medium">
                            {o.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                          <span className="text-[#D70F64] font-black text-xs">
                            Rs. {o.grandTotal}
                          </span>
                          {onReorder && (
                            <button
                              onClick={() => {
                                onClose();
                                onReorder(o);
                              }}
                              className="text-[9px] text-white bg-[#D70F64] hover:bg-[#b00c50] px-2.5 py-1 rounded-lg flex items-center gap-1 font-black cursor-pointer transition uppercase tracking-wider"
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
              )}

              {/* Utility Menu Options */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                
                {/* Favorites button */}
                <button
                  onClick={() => {
                    onClose();
                    if (onToggleFavorites) onToggleFavorites();
                  }}
                  className={`p-3.5 rounded-2xl transition flex flex-col items-center justify-center gap-2 cursor-pointer border ${
                    showFavoritesOnly 
                      ? "text-[#D70F64] bg-pink-50/50 border-[#D70F64]/30 dark:bg-pink-950/10 dark:border-pink-900/30 font-black" 
                      : "text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/80 border-zinc-100 dark:border-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <Heart className={`w-5 h-5 ${showFavoritesOnly ? "fill-[#D70F64] text-[#D70F64]" : "text-[#D70F64]"}`} />
                  <span className="text-xs font-extrabold">Favorites Only</span>
                </button>

                {/* History button */}
                <button
                  onClick={() => {
                    onClose();
                    if (onOpenHistory) onOpenHistory();
                  }}
                  className="p-3.5 rounded-2xl text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-100 dark:border-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition flex flex-col items-center justify-center gap-2 cursor-pointer"
                >
                  <History className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                  <span className="text-xs font-extrabold">Order History</span>
                </button>

                {/* Install App Button */}
                <button
                  onClick={() => {
                    onClose();
                    if ((window as any).triggerPWAInstall) {
                      (window as any).triggerPWAInstall();
                    }
                  }}
                  className="p-3.5 rounded-2xl text-[#D70F64] bg-pink-50/70 dark:bg-pink-950/20 border border-pink-200/60 dark:border-pink-900/40 hover:bg-pink-100 transition flex flex-col items-center justify-center gap-2 cursor-pointer col-span-2 shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <Download className="w-5 h-5 text-[#D70F64] animate-bounce" />
                    <span className="text-xs font-black uppercase tracking-wider">Install Dadu Food App 📱</span>
                  </div>
                </button>

                {/* Light/Dark Mode toggle */}
                <button
                  onClick={() => {
                    if (onToggleTheme) onToggleTheme();
                  }}
                  className="p-3.5 rounded-2xl text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-100 dark:border-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition flex flex-col items-center justify-center gap-2 cursor-pointer col-span-2"
                >
                  <div className="flex items-center gap-2.5">
                    {theme === "light" ? (
                      <Moon className="w-5 h-5 text-zinc-700 shrink-0" />
                    ) : (
                      <Sun className="w-5 h-5 text-amber-500 shrink-0" />
                    )}
                    <span className="text-xs font-extrabold capitalize">
                      {theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
                    </span>
                  </div>
                </button>

                {/* Admin Console (if role === "admin") */}
                {user.role === "admin" && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenAdmin();
                    }}
                    className="w-full font-bold text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3.5 py-3 hover:bg-amber-100 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer col-span-2 shadow-2xs dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-400"
                  >
                    <ShieldAlert className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                    <span>Open Admin Console</span>
                  </button>
                )}

                {/* Sign Out button */}
                <button
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="w-full text-xs font-extrabold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/35 border border-red-200/50 dark:border-red-900/30 px-3.5 py-3 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer col-span-2"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Sign Out</span>
                </button>

              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
