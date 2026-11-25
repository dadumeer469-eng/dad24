import React from "react";
import { Utensils, Store, Search, ShoppingBag, User, ChevronRight } from "lucide-react";

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
        const mobileInput = document.getElementById("mobile-search-input");
        const desktopInput = document.getElementById("desktop-search-input");
        if (mobileInput) {
          mobileInput.focus();
        } else if (desktopInput) {
          desktopInput.focus();
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
          <button
            type="button"
            onClick={activeModule === "grocery" ? onOpenGroceryCart : onOpenCart}
            className="w-full min-h-[48px] btn-pink text-white px-4 py-2.5 rounded-2xl shadow-lg flex items-center justify-between gap-2 cursor-pointer active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-2.5">
              <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs font-black tabular-nums flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5" />
                {currentCartCount}
              </span>
              <span className="text-xs font-extrabold tracking-tight">
                {activeModule === "grocery" ? "View Mart Basket" : "View Your Cart"}
              </span>
            </div>
            <div className="flex items-center gap-1 font-mono text-xs font-black tabular-nums">
              {currentCartTotal > 0 && <span>Rs. {currentCartTotal}</span>}
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
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
            aria-current={activeModule === "food" ? "page" : undefined}
            className="min-h-[48px] flex flex-col items-center justify-center gap-1 text-center relative select-none cursor-pointer active:scale-95 transition-transform"
          >
            {activeModule === "food" && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[3px] rounded-b-full bg-[#D70F64]" />
            )}
            <Utensils
              className={`w-5 h-5 stroke-[2.2] ${
                activeModule === "food"
                  ? "text-[#D70F64] dark:text-[#FF5C9E]"
                  : "text-[#5A5A6B] dark:text-[#A1A1B2]"
              }`}
            />
            <span
              className={`text-[10.5px] leading-none font-bold ${
                activeModule === "food"
                  ? "text-[#D70F64] dark:text-[#FF5C9E]"
                  : "text-[#5A5A6B] dark:text-[#A1A1B2]"
              }`}
            >
              Food
            </span>
          </button>

          {/* Grocery Tab */}
          <button
            type="button"
            onClick={() => handleTabClick("grocery")}
            aria-current={activeModule === "grocery" ? "page" : undefined}
            className="min-h-[48px] flex flex-col items-center justify-center gap-1 text-center relative select-none cursor-pointer active:scale-95 transition-transform"
          >
            {activeModule === "grocery" && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[3px] rounded-b-full bg-[#D70F64]" />
            )}
            <Store
              className={`w-5 h-5 stroke-[2.2] ${
                activeModule === "grocery"
                  ? "text-[#D70F64] dark:text-[#FF5C9E]"
                  : "text-[#5A5A6B] dark:text-[#A1A1B2]"
              }`}
            />
            <span
              className={`text-[10.5px] leading-none font-bold ${
                activeModule === "grocery"
                  ? "text-[#D70F64] dark:text-[#FF5C9E]"
                  : "text-[#5A5A6B] dark:text-[#A1A1B2]"
              }`}
            >
              Grocery
            </span>
          </button>

          {/* Search Tab */}
          <button
            type="button"
            onClick={() => handleTabClick("search")}
            className="min-h-[48px] flex flex-col items-center justify-center gap-1 text-center relative select-none cursor-pointer active:scale-95 transition-transform text-[#5A5A6B] dark:text-[#A1A1B2]"
          >
            <Search className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[10.5px] leading-none font-bold">Search</span>
          </button>

          {/* Account Tab */}
          <button
            type="button"
            onClick={() => handleTabClick("account")}
            className="min-h-[48px] flex flex-col items-center justify-center gap-1 text-center relative select-none cursor-pointer active:scale-95 transition-transform text-[#5A5A6B] dark:text-[#A1A1B2]"
          >
            <User className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[10.5px] leading-none font-bold">
              {user ? (user.name?.split(" ")[0] || "Account") : "Account"}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
