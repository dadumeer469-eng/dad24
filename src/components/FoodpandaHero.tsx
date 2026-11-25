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
                <Clock className="w-4 h-4 text-[#D70F64] shrink-0" />
                <span className="font-extrabold text-[#D70F64] dark:text-[#FF5C9E]">
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
                <div className="bg-[#D70F64] text-white font-mono font-bold text-xs px-3 py-1.5 rounded-lg tabular-nums">
                  {String(dealTimeLeft.minutes).padStart(2, "0")}:
                  {String(dealTimeLeft.seconds).padStart(2, "0")}
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Foodpanda Cuisines Row (Visual Rounded Cuisine Tiles) */}
      <div className="max-w-7xl mx-auto px-3.5 sm:px-4 pt-3 pb-1">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-[#14141A] dark:text-[#F5F5F8]">
            Cuisines
          </h2>
          {activeCategory !== "All" && (
            <button
              type="button"
              onClick={() => setActiveCategory("All")}
              className="text-xs font-extrabold text-[#D70F64] hover:underline cursor-pointer"
            >
              Show All
            </button>
          )}
        </div>
        <div className="flex items-start gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory touch-pan-both overscroll-x-contain">
          {cleanCategories.map((cat) => {
            const isSelected = activeCategory === cat.name;
            return (
              <button
                key={(cat as FoodCategory).id || cat.name}
                type="button"
                onClick={() => setActiveCategory(cat.name)}
                className="group flex flex-col items-center gap-1.5 shrink-0 w-[76px] sm:w-[86px] snap-start cursor-pointer active:scale-95 transition-transform"
              >
                <div
                  className={`w-16 h-16 sm:w-[70px] sm:h-[70px] rounded-full overflow-hidden flex items-center justify-center text-2xl transition-all border-2 shadow-md ${
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
                    <span>{cat.emoji || "🍽️"}</span>
                  )}
                </div>
                <span
                  className={`text-[11px] font-bold text-center leading-tight line-clamp-1 w-full ${
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
