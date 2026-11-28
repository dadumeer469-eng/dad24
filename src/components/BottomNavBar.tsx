import React from "react";
import { motion } from "motion/react";
import { springSnappy } from "../utils/motion";
import { Utensils, ShoppingBasket, Search, ShoppingBag, User, ChevronRight } from "lucide-react";

interface BottomNavBarProps {
  activeModule: "food" | "grocery";
  setActiveModule: (mode: "food" | "grocery") => void;
  cartCount: number;
  groceryCartCount: number;
  cartTotal?: number;
  groceryCartTotal?: number;
  hideFloatingCart?: boolean;
  onOpenCart: () => void;
  onOpenGroceryCart: () => void;
  user: any;
  onOpenAuth: () => void;
  onOpenAccount: () => void;
  onResetFoodHome?: () => void;
  onResetGroceryHome?: () => void;
}

export default function BottomNavBar({
  activeModule,
  setActiveModule,
  cartCount,
  groceryCartCount,
  cartTotal = 0,
  groceryCartTotal = 0,
  hideFloatingCart = false,
  onOpenCart,
  onOpenGroceryCart,
  user,
  onOpenAuth,
  onOpenAccount,
  onResetFoodHome,
  onResetGroceryHome,
}: BottomNavBarProps) {
  const currentCartCount = activeModule === "grocery" ? groceryCartCount : cartCount;
  const currentCartTotal = activeModule === "grocery" ? groceryCartTotal : cartTotal;

  const handleTabClick = (tab: "food" | "grocery" | "search" | "account") => {
    if (tab === "food") {
      if (onResetFoodHome) {
        onResetFoodHome();
      } else {
        setActiveModule("food");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (tab === "grocery") {
      if (onResetGroceryHome) {
        onResetGroceryHome();
      } else {
        setActiveModule("grocery");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (tab === "search") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => {
        // Home header search first; on a restaurant page the header isn't
        // rendered, so fall back to that page's own search box.
        const mobileInput = document.getElementById("mobile-search-input");
        const desktopInput = document.getElementById("desktop-search-input");
        const restaurantInput = document.getElementById("restaurant-search-input");
        const target = mobileInput || desktopInput || restaurantInput;
        if (target) {
          target.focus();
          // On the restaurant page the search box sits below the hero, so
          // bring it into view after focusing.
          if (target === restaurantInput) {
            target.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      }, 260);
    } else if (tab === "account") {
      if (user) {
        onOpenAccount();
      } else {
        onOpenAuth();
      }
    }
  };

  return (
    <>
      {/* Foodpanda Sticky Floating View-Cart Bar above Mobile Bottom Nav */}
      {!hideFloatingCart && currentCartCount > 0 && (
        <div className="fixed bottom-[92px] left-3 right-3 z-40 lg:hidden animate-slide-up">
          {activeModule === "grocery" ? (
            <div className="w-full min-h-[48px] btn-pink text-white px-3 py-2 rounded-2xl shadow-lg flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onOpenGroceryCart}
                className="flex items-center gap-2 min-w-0 cursor-pointer transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97] active:brightness-110"
              >
                <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs font-black tabular-nums flex items-center gap-1 shrink-0">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  {currentCartCount}
                </span>
                <span className="text-xs font-medium tracking-tight whitespace-nowrap">View Cart</span>
                {currentCartTotal > 0 && (
                  <span className="font-mono text-xs font-black tabular-nums whitespace-nowrap">
                    • Rs. {currentCartTotal}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={onOpenGroceryCart}
                className="bg-white text-[#D70F64] text-xs font-extrabold px-3.5 py-2 rounded-full shadow-sm flex items-center gap-1 shrink-0 cursor-pointer transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97] active:brightness-110"
              >
                Checkout <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenCart}
              className="w-full min-h-[48px] btn-pink text-white px-4 py-2.5 rounded-2xl shadow-lg flex items-center justify-between gap-2 cursor-pointer transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97] active:brightness-110 relative overflow-hidden after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0)_65%)] after:opacity-0 after:scale-50 after:transition-[opacity,transform] after:duration-300 after:pointer-events-none active:after:opacity-100 active:after:scale-125 active:after:duration-100"
            >
              <div className="flex items-center gap-2.5">
                <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs font-black tabular-nums flex items-center gap-1">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  {currentCartCount}
                </span>
                <span className="text-xs font-medium tracking-tight">View Your Cart</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-xs font-black tabular-nums">
                {currentCartTotal > 0 && <span>Rs. {currentCartTotal}</span>}
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          )}
        </div>
      )}

      {/* Floating pill-dock Bottom Navigation (matches the user's mockup
          exactly: white rounded-full dock, pink filled active tab, big
          raised pink Search circle in the centre, pink splash marks on the
          sides) with motion: slide-up entrance, spring active-pill slide,
          tap bounce on every tab. (User 28 Nov: "jo niche wala baar hai wo
          bilkul aisa bnao animation motion effect bhi".) */}
      <motion.nav
        aria-label="Mobile Primary Navigation"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="fixed bottom-3 left-3 right-3 z-40 lg:hidden pb-safe"
      >
        <div className="relative mx-auto max-w-2xl">
          {/* Pink splash marks on the dock's left + right edges (three short
              radiating dashes, like the mockup) */}
          <span aria-hidden="true" className="absolute -left-2 top-1/2 -translate-y-1/2 text-[#E21B70]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <line x1="17" y1="12" x2="23" y2="12" />
              <line x1="15.5" y1="7" x2="20.5" y2="3.5" />
              <line x1="15.5" y1="17" x2="20.5" y2="20.5" />
            </svg>
          </span>
          <span aria-hidden="true" className="absolute -right-2 top-1/2 -translate-y-1/2 text-[#E21B70]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <line x1="7" y1="12" x2="1" y2="12" />
              <line x1="8.5" y1="7" x2="3.5" y2="3.5" />
              <line x1="8.5" y1="17" x2="3.5" y2="20.5" />
            </svg>
          </span>

          <div className="relative flex items-center justify-between rounded-full bg-white dark:bg-[#1B1B23] px-2 py-1.5 shadow-[0_10px_30px_rgba(215,15,100,0.28),0_4px_14px_rgba(0,0,0,0.10)] ring-1 ring-[#F6C9DD]/70 dark:ring-[#2A1A22]">
            {/* Food Tab */}
            <motion.button
              type="button"
              onClick={() => handleTabClick("food")}
              aria-label="Food delivery home"
              aria-current={activeModule === "food" ? "page" : undefined}
              whileTap={{ scale: 0.9 }}
              transition={springSnappy}
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 select-none cursor-pointer"
            >
              {activeModule === "food" && (
                <motion.span
                  layoutId="nav-active-pill"
                  aria-hidden="true"
                  transition={springSnappy}
                  className="absolute inset-x-1 inset-y-0 rounded-full bg-gradient-to-b from-[#F01E6E] via-[#E21B70] to-[#C40E5C] shadow-[0_6px_16px_rgba(215,15,100,0.45)]"
                />
              )}
              <span className="relative z-10 flex flex-col items-center gap-0.5">
                <Utensils
                  fill={activeModule === "food" ? "currentColor" : "none"}
                  className={`w-6 h-6 stroke-2 ${
                    activeModule === "food" ? "text-white" : "text-[#3A3A48] dark:text-[#C9C9D6]"
                  }`}
                />
                <span
                  className={`text-[11px] leading-none ${
                    activeModule === "food"
                      ? "font-extrabold text-white"
                      : "font-semibold text-[#3A3A48] dark:text-[#C9C9D6]"
                  }`}
                >
                  Food
                </span>
                {activeModule === "food" && (
                  <span aria-hidden="true" className="mt-0.5 h-[3px] w-6 rounded-full bg-white/70" />
                )}
              </span>
            </motion.button>

            {/* Grocery Tab */}
            <motion.button
              type="button"
              onClick={() => handleTabClick("grocery")}
              aria-label="Grocery home"
              aria-current={activeModule === "grocery" ? "page" : undefined}
              whileTap={{ scale: 0.9 }}
              transition={springSnappy}
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 select-none cursor-pointer"
            >
              {activeModule === "grocery" && (
                <motion.span
                  layoutId="nav-active-pill"
                  aria-hidden="true"
                  transition={springSnappy}
                  className="absolute inset-x-1 inset-y-0 rounded-full bg-gradient-to-b from-[#F01E6E] via-[#E21B70] to-[#C40E5C] shadow-[0_6px_16px_rgba(215,15,100,0.45)]"
                />
              )}
              <span className="relative z-10 flex flex-col items-center gap-0.5">
                <ShoppingBasket
                  fill={activeModule === "grocery" ? "currentColor" : "none"}
                  className={`w-6 h-6 stroke-2 ${
                    activeModule === "grocery" ? "text-white" : "text-[#3A3A48] dark:text-[#C9C9D6]"
                  }`}
                />
                <span
                  className={`text-[11px] leading-none ${
                    activeModule === "grocery"
                      ? "font-extrabold text-white"
                      : "font-semibold text-[#3A3A48] dark:text-[#C9C9D6]"
                  }`}
                >
                  Grocery
                </span>
                {activeModule === "grocery" && (
                  <span aria-hidden="true" className="mt-0.5 h-[3px] w-6 rounded-full bg-white/70" />
                )}
              </span>
            </motion.button>

            {/* Search Tab — big raised pink circle in the centre (no label,
                exactly like the mockup: just the circle + magnifier) */}
            <motion.button
              type="button"
              onClick={() => handleTabClick("search")}
              aria-label="Search food and groceries"
              whileTap={{ scale: 0.88 }}
              transition={springSnappy}
              className="relative flex flex-1 items-center justify-center select-none cursor-pointer"
            >
              <span className="absolute -top-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-b from-[#F01E6E] to-[#D70F64] shadow-[0_12px_24px_rgba(215,15,100,0.55)] ring-4 ring-white dark:ring-[#1B1B23]">
                <span className="absolute inset-0 rounded-full bg-[#D70F64] animate-ping opacity-20" aria-hidden="true" />
                <Search className="relative z-10 w-7 h-7 stroke-[2.5] text-white" />
              </span>
            </motion.button>

            {/* Account Tab */}
            <motion.button
              type="button"
              onClick={() => handleTabClick("account")}
              aria-label={user ? "Open my account" : "Sign in"}
              whileTap={{ scale: 0.9 }}
              transition={springSnappy}
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 select-none cursor-pointer"
            >
              <User className="w-6 h-6 stroke-2 text-[#3A3A48] dark:text-[#C9C9D6]" />
              <span className="text-[11px] leading-none font-semibold text-[#3A3A48] dark:text-[#C9C9D6]">
                {user ? (user.name?.split(" ")[0] || "Account") : "Profile"}
              </span>
            </motion.button>
          </div>
        </div>
      </motion.nav>
    </>
  );
}
