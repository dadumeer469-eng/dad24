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
        <div className="fixed bottom-[66px] left-3 right-3 z-40 lg:hidden animate-slide-up">
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

      {/* Foodpanda 4-Tab Mobile Bottom Navigation (Food / Grocery / Search / Account) */}
      <nav
        aria-label="Mobile Primary Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#14141A]/95 backdrop-blur-md border-t border-[#E6E6EE] dark:border-[#272733] shadow-[0_-4px_18px_rgba(0,0,0,0.06)] pb-safe lg:hidden"
      >
        <div className="grid grid-cols-4 h-[60px] max-w-2xl mx-auto px-1">
          {/* Food Tab */}
          <button
            type="button"
            onClick={() => handleTabClick("food")}
            aria-label="Food delivery home"
            aria-current={activeModule === "food" ? "page" : undefined}
            className="min-h-[48px] flex flex-col items-center justify-center gap-1 text-center relative select-none cursor-pointer transition-transform duration-180 active:scale-[0.97] active:brightness-110"
          >
            {activeModule === "food" && (
              <motion.span
                layoutId="nav-indicator"
                aria-hidden="true"
                className="absolute top-0 left-0 right-0 mx-auto w-10 h-[3px] rounded-b-full bg-[#D70F64]"
                transition={springSnappy}
              />
            )}
            <span
              className={`flex items-center justify-center rounded-full px-2.5 py-1 transition-[color,background-color] duration-300 ${
                activeModule === "food" ? "bg-[#FDE7F1] dark:bg-[#2A1A22]" : ""
              }`}
            >
              <Utensils
                fill={activeModule === "food" ? "currentColor" : "none"}
                className={`w-6 h-6 stroke-2 transition-[color,background-color,border-color,transform,opacity] duration-300 ${
                  activeModule === "food"
                    ? "text-[#D70F64] dark:text-[#FF5C9E]"
                    : "text-[#5A5A6B] dark:text-[#A1A1B2]"
                }`}
              />
            </span>
            <span
              className={`text-[10.5px] leading-none transition-[color,background-color,border-color,transform,opacity] duration-300 ${
                activeModule === "food"
                  ? "font-bold text-[#D70F64] dark:text-[#FF5C9E]"
                  : "font-medium text-[#5A5A6B] dark:text-[#A1A1B2]"
              }`}
            >
              Food
            </span>
          </button>

          {/* Grocery Tab */}
          <button
            type="button"
            onClick={() => handleTabClick("grocery")}
            aria-label="Grocery home"
            aria-current={activeModule === "grocery" ? "page" : undefined}
            className="min-h-[48px] flex flex-col items-center justify-center gap-1 text-center relative select-none cursor-pointer transition-transform duration-180 active:scale-[0.97] active:brightness-110"
          >
            {activeModule === "grocery" && (
              <motion.span
                layoutId="nav-indicator"
                aria-hidden="true"
                className="absolute top-0 left-0 right-0 mx-auto w-10 h-[3px] rounded-b-full bg-[#D70F64]"
                transition={springSnappy}
              />
            )}
            <span
              className={`flex items-center justify-center rounded-full px-2.5 py-1 transition-[color,background-color] duration-300 ${
                activeModule === "grocery" ? "bg-[#FDE7F1] dark:bg-[#2A1A22]" : ""
              }`}
            >
              <ShoppingBasket
                fill={activeModule === "grocery" ? "currentColor" : "none"}
                className={`w-6 h-6 stroke-2 transition-[color,background-color,border-color,transform,opacity] duration-300 ${
                  activeModule === "grocery"
                    ? "text-[#D70F64] dark:text-[#FF5C9E]"
                    : "text-[#5A5A6B] dark:text-[#A1A1B2]"
                }`}
              />
            </span>
            <span
              className={`text-[10.5px] leading-none transition-[color,background-color,border-color,transform,opacity] duration-300 ${
                activeModule === "grocery"
                  ? "font-bold text-[#D70F64] dark:text-[#FF5C9E]"
                  : "font-medium text-[#5A5A6B] dark:text-[#A1A1B2]"
              }`}
            >
              Grocery
            </span>
          </button>

          {/* Search Tab */}
          <button
            type="button"
            onClick={() => handleTabClick("search")}
            aria-label="Search food and groceries"
            className="min-h-[48px] flex flex-col items-center justify-center gap-1 text-center relative select-none cursor-pointer transition-transform duration-180 active:scale-[0.97] active:brightness-110 text-[#5A5A6B] dark:text-[#A1A1B2]"
          >
            <Search className="w-6 h-6 stroke-2" />
            <span className="text-[10.5px] leading-none font-medium">Search</span>
          </button>

          {/* Account Tab */}
          <button
            type="button"
            onClick={() => handleTabClick("account")}
            aria-label={user ? "Open my account" : "Sign in"}
            className="min-h-[48px] flex flex-col items-center justify-center gap-1 text-center relative select-none cursor-pointer transition-transform duration-180 active:scale-[0.97] active:brightness-110 text-[#5A5A6B] dark:text-[#A1A1B2]"
          >
            <User className="w-6 h-6 stroke-2" />
            <span className="text-[10.5px] leading-none font-medium">
              {user ? (user.name?.split(" ")[0] || "Account") : "Account"}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
