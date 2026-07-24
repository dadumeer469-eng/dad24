import React from "react";
import { Utensils, Store, Search, ShoppingBag, User } from "lucide-react";
import { motion } from "motion/react";

interface BottomNavBarProps {
  activeModule: "food" | "grocery";
  setActiveModule: (mode: "food" | "grocery") => void;
  cartCount: number;
  groceryCartCount: number;
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
  onOpenCart,
  onOpenGroceryCart,
  user,
  onOpenAuth,
  onOpenAccount,
  onResetFoodHome,
  onResetGroceryHome,
}: BottomNavBarProps) {
  const currentCartCount = activeModule === "grocery" ? groceryCartCount : cartCount;

  const handleTabClick = (tab: "food" | "grocery" | "search" | "cart" | "account") => {
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
        const mobileInput = document.getElementById("mobile-search-input");
        const desktopInput = document.getElementById("desktop-search-input");
        if (mobileInput) {
          mobileInput.focus();
        } else if (desktopInput) {
          desktopInput.focus();
        }
      }, 300);
    } else if (tab === "cart") {
      if (activeModule === "grocery") {
        onOpenGroceryCart();
      } else {
        onOpenCart();
      }
    } else if (tab === "account") {
      if (user) {
        onOpenAccount();
      } else {
        onOpenAuth();
      }
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 border-t border-zinc-100 dark:border-zinc-800 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] backdrop-blur-md pb-safe lg:hidden">
      <div className="grid grid-cols-5 h-13.5 max-w-2xl mx-auto px-1">
        
        {/* Food Tab */}
        <button
          onClick={() => handleTabClick("food")}
          className="flex flex-col items-center justify-center gap-0.5 h-full text-center relative select-none cursor-pointer active:scale-95 transition-all"
        >
          <motion.div
            whileTap={{ scale: 0.85 }}
            className={`p-0.5 rounded-full ${activeModule === "food" ? "text-[#D70F64]" : "text-zinc-400 dark:text-zinc-500"}`}
          >
            <Utensils className="w-5 h-5 stroke-[2.2]" />
          </motion.div>
          <span
            className={`text-[9.5px] leading-none tracking-wide font-bold ${
              activeModule === "food"
                ? "text-[#D70F64] font-black"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            Food
          </span>
          {activeModule === "food" && (
            <motion.div
              layoutId="bottom-nav-active-dot"
              className="absolute bottom-1 w-1 h-1 rounded-full bg-[#D70F64]"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </button>

        {/* Grocery Tab */}
        <button
          onClick={() => handleTabClick("grocery")}
          className="flex flex-col items-center justify-center gap-0.5 h-full text-center relative select-none cursor-pointer active:scale-95 transition-all"
        >
          <motion.div
            whileTap={{ scale: 0.85 }}
            className={`p-0.5 rounded-full ${activeModule === "grocery" ? "text-[#D70F64]" : "text-zinc-400 dark:text-zinc-500"}`}
          >
            <Store className="w-5 h-5 stroke-[2.2]" />
          </motion.div>
          <span
            className={`text-[9.5px] leading-none tracking-wide font-bold ${
              activeModule === "grocery"
                ? "text-[#D70F64] font-black"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            Grocery
          </span>
          {activeModule === "grocery" && (
            <motion.div
              layoutId="bottom-nav-active-dot"
              className="absolute bottom-1 w-1 h-1 rounded-full bg-[#D70F64]"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </button>

        {/* Search Tab */}
        <button
          onClick={() => handleTabClick("search")}
          className="flex flex-col items-center justify-center gap-0.5 h-full text-center relative select-none cursor-pointer active:scale-95 transition-all text-zinc-400 dark:text-zinc-500"
        >
          <motion.div whileTap={{ scale: 0.85 }} className="p-0.5">
            <Search className="w-5 h-5 stroke-[2.2]" />
          </motion.div>
          <span className="text-[9.5px] leading-none tracking-wide font-bold text-zinc-500 dark:text-zinc-400">
            Search
          </span>
        </button>

        {/* Carts Tab */}
        <button
          onClick={() => handleTabClick("cart")}
          className="flex flex-col items-center justify-center gap-0.5 h-full text-center relative select-none cursor-pointer active:scale-95 transition-all text-zinc-400 dark:text-zinc-500"
        >
          <motion.div whileTap={{ scale: 0.85 }} className="p-0.5 relative">
            <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
            {currentCartCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1.5 -right-2 bg-[#D70F64] text-white text-[8px] font-black min-w-4 h-4 rounded-full px-0.5 flex items-center justify-center border border-white dark:border-zinc-900 shadow-sm"
              >
                {currentCartCount}
              </motion.span>
            )}
          </motion.div>
          <span className="text-[9.5px] leading-none tracking-wide font-bold text-zinc-500 dark:text-zinc-400">
            Carts
          </span>
        </button>

        {/* Account Tab */}
        <button
          onClick={() => handleTabClick("account")}
          className="flex flex-col items-center justify-center gap-0.5 h-full text-center relative select-none cursor-pointer active:scale-95 transition-all text-zinc-400 dark:text-zinc-500"
        >
          <motion.div whileTap={{ scale: 0.85 }} className="p-0.5">
            <User className="w-5 h-5 stroke-[2.2]" />
          </motion.div>
          <span className="text-[9.5px] leading-none tracking-wide font-bold text-zinc-500 dark:text-zinc-400">
            Account
          </span>
        </button>

      </div>
    </div>
  );
}
