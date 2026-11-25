import React from "react";
import { Utensils, Store, Search, ShoppingBag, User } from "lucide-react";

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
      }, 260);
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
    <nav
      aria-label="Mobile Primary Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#14141A]/95 backdrop-blur-md border-t border-[#E6E6EE] dark:border-[#272733] shadow-[0_-4px_18px_rgba(0,0,0,0.06)] pb-safe lg:hidden"
    >
      <div className="grid grid-cols-5 h-[60px] max-w-2xl mx-auto px-1">
        {/* Food Tab */}
        <button
          type="button"
          onClick={() => handleTabClick("food")}
          aria-current={activeModule === "food" ? "page" : undefined}
          className="min-h-[48px] flex flex-col items-center justify-center gap-1 text-center relative select-none cursor-pointer active:scale-95 transition-transform"
        >
          {activeModule === "food" && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full bg-[#E21B70]" />
          )}
          <Utensils
            className={`w-5 h-5 stroke-[2.2] ${
              activeModule === "food"
                ? "text-[#E21B70] dark:text-[#FF4D94]"
                : "text-[#5A5A6B] dark:text-[#A1A1B2]"
            }`}
          />
          <span
            className={`text-[10px] leading-none font-bold ${
              activeModule === "food"
                ? "text-[#E21B70] dark:text-[#FF4D94]"
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
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full bg-[#E21B70]" />
          )}
          <Store
            className={`w-5 h-5 stroke-[2.2] ${
              activeModule === "grocery"
                ? "text-[#E21B70] dark:text-[#FF4D94]"
                : "text-[#5A5A6B] dark:text-[#A1A1B2]"
            }`}
          />
          <span
            className={`text-[10px] leading-none font-bold ${
              activeModule === "grocery"
                ? "text-[#E21B70] dark:text-[#FF4D94]"
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
          <span className="text-[10px] leading-none font-bold">Search</span>
        </button>

        {/* Cart Tab */}
        <button
          type="button"
          onClick={() => handleTabClick("cart")}
          className="min-h-[48px] flex flex-col items-center justify-center gap-1 text-center relative select-none cursor-pointer active:scale-95 transition-transform text-[#5A5A6B] dark:text-[#A1A1B2]"
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
            {currentCartCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-[#E21B70] text-white text-[9px] font-bold min-w-[18px] h-[18px] rounded-full px-1 flex items-center justify-center border-2 border-white dark:border-[#14141A] tabular-nums">
                {currentCartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] leading-none font-bold">Cart</span>
        </button>

        {/* Account Tab */}
        <button
          type="button"
          onClick={() => handleTabClick("account")}
          className="min-h-[48px] flex flex-col items-center justify-center gap-1 text-center relative select-none cursor-pointer active:scale-95 transition-transform text-[#5A5A6B] dark:text-[#A1A1B2]"
        >
          <User className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] leading-none font-bold">
            {user ? "Account" : "Sign In"}
          </span>
        </button>
      </div>
    </nav>
  );
}
