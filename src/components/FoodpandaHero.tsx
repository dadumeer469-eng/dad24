import React from "react";
import { Clock } from "lucide-react";
import { FoodCategory } from "../types";
import { LazyImage } from "./LazyImage";

interface FoodpandaHeroProps {
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  dealConfig: {
    isActive: boolean;
    timerMinutes: number;
    discountPercentage: number;
    selectedItemIds: string[];
    dealText?: string;
  };
  dealTimeLeft: { minutes: number; seconds: number };
  foodCategories?: FoodCategory[];
  heroBgUrl?: string;
  children?: React.ReactNode;
}

export default function FoodpandaHero({
  activeCategory,
  setActiveCategory,
  dealConfig,
  dealTimeLeft,
  foodCategories = [],
  children,
}: FoodpandaHeroProps) {
  const defaultCategories = [
    { name: "All", emoji: "🍽️", subtitle: "All Menu" },
    { name: "Desi Food", emoji: "🍛", subtitle: "Biryani & Karahi" },
    { name: "Pizza", emoji: "🍕", subtitle: "Hot Pizzas" },
    { name: "Burgers", emoji: "🍔", subtitle: "Zesty Burgers" },
    { name: "Broast", emoji: "🍗", subtitle: "Crispy Broast" },
    { name: "Rolls & Wraps", emoji: "🌯", subtitle: "Tasty Rolls" },
    { name: "Pasta", emoji: "🍝", subtitle: "Creamy Pasta" },
    { name: "Lasagna", emoji: "🧀", subtitle: "Cheesy Lasagna" },
    { name: "Fries", emoji: "🍟", subtitle: "Loaded Fries" },
    { name: "Paratha", emoji: "🫓", subtitle: "Hot Parathas" },
    { name: "Sandwich", emoji: "🥪", subtitle: "Grilled Sandwiches" },
    { name: "Tea & Chai", emoji: "☕", subtitle: "Chai & Kehwa" },
    { name: "Specials", emoji: "⭐", subtitle: "Dadu Specials" },
  ];

  const cleanCategories =
    foodCategories && foodCategories.length > 0
      ? [
          { id: "cat_all_top", name: "All", emoji: "🍽️", subtitle: "All Menu", position: -1 },
          ...[...foodCategories]
            .filter((c) => !c.name.toLowerCase().includes("home service") && c.name !== "All")
            .sort((a, b) => (a.position || 0) - (b.position || 0)),
        ]
      : defaultCategories;

  return (
    <div className="bg-transparent relative">
      {/* Flash Deal Bar (Only when active in admin settings) */}
      {dealConfig.isActive &&
        (dealTimeLeft.minutes > 0 || dealTimeLeft.seconds > 0) && (
          <div className="max-w-7xl mx-auto px-3.5 sm:px-4 py-2">
            <div className="bg-white dark:bg-[#14141A] border border-[#E6E6EE] dark:border-[#272733] py-3 px-4 sm:px-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-left shadow-xs">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-[#14141A] dark:text-[#F5F5F8] font-medium">
                <Clock className="w-4 h-4 text-[#E21B70] shrink-0" />
                <span className="font-extrabold text-[#E21B70] dark:text-[#FF4D94]">
                  Deal of the Hour:
                </span>
                <span>
                  {dealConfig.dealText ||
                    `Save ${dealConfig.discountPercentage}% on selected hot items`}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] uppercase tracking-wider font-bold text-[#5A5A6B] dark:text-[#A1A1B2]">
                  Ends in
                </span>
                <div className="bg-[#E21B70] text-white font-mono font-bold text-xs px-3 py-1.5 rounded-lg tabular-nums">
                  {String(dealTimeLeft.minutes).padStart(2, "0")}:
                  {String(dealTimeLeft.seconds).padStart(2, "0")}
                </div>
              </div>
            </div>
          </div>
        )}

      {children}

      {/* Unified Primary Crimson Category Strip (>=44px touch targets) */}
      <div id="catalog-section" className="max-w-7xl mx-auto px-3.5 sm:px-4 pt-2 pb-1">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory touch-pan-both overscroll-x-contain">
          {cleanCategories.map((cat) => {
            const isSelected = activeCategory === cat.name;
            return (
              <button
                key={(cat as FoodCategory).id || cat.name}
                type="button"
                onClick={() => setActiveCategory(cat.name)}
                className={`min-h-[48px] flex items-center gap-2.5 py-2 px-3.5 rounded-2xl text-xs font-bold shrink-0 transition-all cursor-pointer border snap-start active:scale-[0.98] ${
                  isSelected
                    ? "bg-[#E21B70] text-white border-[#E21B70] shadow-xs"
                    : "bg-white dark:bg-[#14141A] text-[#14141A] dark:text-[#F5F5F8] border-[#E6E6EE] dark:border-[#272733] hover:border-[#E21B70]/50"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 overflow-hidden ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-[#F2F2F6] dark:bg-[#1D1D26] text-[#14141A] dark:text-[#F5F5F8]"
                  }`}
                >
                  {(cat as FoodCategory).imageUrl ? (
                    <LazyImage
                      src={(cat as FoodCategory).imageUrl}
                      alt={`${cat.name} dishes in Dadu`}
                      className="w-full h-full"
                      imgClassName="object-cover"
                    />
                  ) : (
                    cat.emoji || "🍽️"
                  )}
                </div>
                <div className="text-left">
                  <span className="block font-bold text-xs leading-tight whitespace-nowrap">
                    {cat.name}
                  </span>
                  {cat.subtitle && (
                    <span
                      className={`block text-[10px] font-medium mt-0.5 leading-none whitespace-nowrap ${
                        isSelected ? "text-white/90" : "text-[#5A5A6B] dark:text-[#A1A1B2]"
                      }`}
                    >
                      {cat.subtitle}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
