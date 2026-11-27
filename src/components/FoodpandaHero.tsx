import React from "react";
import { CakeSlice, ChefHat, Clock, Coffee, Croissant, Drumstick, Pizza, Popcorn, Sandwich, Soup, UtensilsCrossed, Wheat } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FoodCategory } from "../types";
import { LazyImage } from "./LazyImage";

// Category name → Lucide icon. The stored `emoji` field (defaults above and
// Firestore-driven categories) is data only and is never rendered.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  All: UtensilsCrossed,
  "Desi Food": Soup,
  Pizza: Pizza,
  Burgers: Sandwich,
  Broast: Drumstick,
  "Rolls & Wraps": Croissant,
  Pasta: Wheat,
  Lasagna: CakeSlice,
  Fries: Popcorn,
  Paratha: Croissant,
  Sandwich: Sandwich,
  "Tea & Chai": Coffee,
  Specials: ChefHat,
};

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
    { name: "All", emoji: "🍽️", subtitle: "All menu" },
    { name: "Desi Food", emoji: "🍛", subtitle: "Biryani & karahi" },
    { name: "Pizza", emoji: "🍕", subtitle: "Hot pizzas" },
    { name: "Burgers", emoji: "🍔", subtitle: "Zesty burgers" },
    { name: "Broast", emoji: "🍗", subtitle: "Crispy broast" },
    { name: "Rolls & Wraps", emoji: "🌯", subtitle: "Tasty rolls" },
    { name: "Pasta", emoji: "🍝", subtitle: "Creamy pasta" },
    { name: "Lasagna", emoji: "🧀", subtitle: "Cheesy lasagna" },
    { name: "Fries", emoji: "🍟", subtitle: "Loaded fries" },
    { name: "Paratha", emoji: "🫓", subtitle: "Hot parathas" },
    { name: "Sandwich", emoji: "🥪", subtitle: "Grilled sandwiches" },
    { name: "Tea & Chai", emoji: "☕", subtitle: "Chai & kehwa" },
    { name: "Specials", emoji: "⭐", subtitle: "Dadu specials" },
  ];

  const cleanCategories =
    foodCategories && foodCategories.length > 0
      ? [
          { id: "cat_all_top", name: "All", emoji: "🍽️", subtitle: "All menu", position: -1 },
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
                <Clock className="w-4 h-4 text-[#D70F64] shrink-0" />
                <span className="font-semibold text-[#D70F64] dark:text-[#FF5C9E]">
                  Deal of the hour:
                </span>
                <span>
                  {dealConfig.dealText ||
                    `Save ${dealConfig.discountPercentage}% on selected hot items`}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] tracking-wider font-semibold text-[#5A5A6B] dark:text-[#A1A1B2]">
                  Ends in
                </span>
                <div className="bg-[#D70F64] text-white font-mono font-semibold text-xs px-3 py-1.5 rounded-lg tabular-nums">
                  {String(dealTimeLeft.minutes).padStart(2, "0")}:
                  {String(dealTimeLeft.seconds).padStart(2, "0")}
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Foodpanda Cuisines Row (Visual Rounded Cuisine Tiles) */}
      <div className="max-w-7xl mx-auto px-3.5 sm:px-4 pt-2 pb-1">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm sm:text-base font-semibold tracking-tight text-[#14141A] dark:text-[#F5F5F8]">
            Cuisines
          </h2>
          {activeCategory !== "All" && (
            <button
              type="button"
              onClick={() => setActiveCategory("All")}
              className="min-h-[44px] px-2 text-xs font-semibold text-[#D70F64] hover:underline cursor-pointer transition-transform duration-180 active:scale-[0.97] active:brightness-110"
            >
              Show all
            </button>
          )}
        </div>
        <div
          className="flex items-start gap-3 overflow-x-auto pb-2 pr-3.5 scrollbar-none snap-x snap-mandatory touch-pan-both overscroll-x-contain"
          role="group"
          aria-label="Cuisine categories"
        >
          {cleanCategories.map((cat) => {
            const isSelected = activeCategory === cat.name;
            const CategoryIcon = CATEGORY_ICONS[cat.name] ?? UtensilsCrossed;
            return (
              <button
                key={(cat as FoodCategory).id || cat.name}
                type="button"
                onClick={() => setActiveCategory(cat.name)}
                aria-pressed={isSelected}
                aria-label={`${cat.name} cuisine${isSelected ? ", selected" : ""}`}
                className="group flex flex-col items-center gap-1.5 shrink-0 w-[76px] sm:w-[86px] snap-start cursor-pointer transition-transform duration-180 active:scale-[0.97] active:brightness-110"
              >
                <div
                  className={`w-16 h-16 sm:w-[70px] sm:h-[70px] rounded-full overflow-hidden flex items-center justify-center transition-[color,background-color,border-color,transform,opacity] duration-180 border-2 shadow-md ${
                    isSelected
                      ? "border-[#D70F64] ring-2 ring-[#D70F64]/25 bg-[#FFF0F5] dark:bg-[#2A101C]"
                      : "border-[#E6E6EE] dark:border-[#272733] bg-white dark:bg-[#14141A] group-hover:border-[#D70F64]/50"
                  }`}
                >
                  {(cat as FoodCategory).imageUrl ? (
                    <LazyImage
                      src={(cat as FoodCategory).imageUrl}
                      alt={`${cat.name} dishes in Dadu`}
                      className="w-full h-full"
                      imgClassName="object-cover w-full h-full"
                    />
                  ) : (
                    <CategoryIcon
                      className="w-[18px] h-[18px] text-[#14141A] dark:text-[#F5F5F8]"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <span
                  className={`text-[11px] font-semibold text-center leading-tight line-clamp-1 w-full transition-colors duration-180 ${
                    isSelected
                      ? "text-[#D70F64] dark:text-[#FF5C9E]"
                      : "text-[#14141A] dark:text-[#F5F5F8]"
                  }`}
                >
                  {cat.name}
                </span>
                {cat.subtitle && (
                  <span className="text-[9.5px] font-medium text-[#6E6E80] dark:text-[#A1A1B2] leading-none line-clamp-1">
                    {cat.subtitle}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {children}
    </div>
  );
}
