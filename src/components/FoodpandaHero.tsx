import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Utensils,
  HelpCircle,
  Flame,
  Clock,
  Percent,
} from "lucide-react";
import { motion } from "motion/react";

import { FoodCategory } from "../types";
import daduLogo from "../assets/images/dadu_food_logo_new_1782333467889.jpg";
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
  heroBgUrl,
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
    { name: "Home Services", emoji: "🛠️", subtitle: "Expert Repairs" }
  ];

  const displayCategories =
    foodCategories && foodCategories.length > 0
      ? [...foodCategories].sort((a, b) => (a.position || 0) - (b.position || 0))
      : defaultCategories;

  return (
    <div className="bg-transparent relative">
      {/* Ticking Interactive Count Deal Banner */}
      {dealConfig.isActive &&
        (dealTimeLeft.minutes > 0 || dealTimeLeft.seconds > 0) && (
          <div className="max-w-7xl mx-auto px-4 py-2">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-3 px-5 sm:px-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-xs">
              <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-200 font-medium">
                <Clock className="w-4 h-4 text-[#d70f64] shrink-0" />
                <span className="font-extrabold text-[#d70f64]">
                  Deal of the Hour:
                </span>
                <span>
                  {dealConfig.dealText ||
                    `Save ${dealConfig.discountPercentage}% on our curated choice of hot items!`}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500 dark:text-zinc-400">
                  Deal Closes In
                </span>
                <div className="bg-[#d70f64] text-white font-black text-xs px-3 py-1 rounded-lg">
                  {String(dealTimeLeft.minutes).padStart(2, "0")} :{" "}
                  {String(dealTimeLeft.seconds).padStart(2, "0")}
                </div>
              </div>
            </div>
          </div>
        )}

      {children}

      {/* Unified Primary Magenta Category Horizontal Filter Bar */}
      <div id="catalog-section" className="max-w-7xl mx-auto px-4 pt-1.5 pb-2">
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory touch-pan-both overscroll-x-contain">
          {displayCategories.map((cat, idx) => {
            const isSelected = activeCategory === cat.name;
            return (
              <motion.button
                key={cat.id || cat.name}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.3) }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveCategory(cat.name)}
                className={`flex items-center gap-2.5 py-2 px-4 rounded-2xl text-xs font-bold shrink-0 transition-colors cursor-pointer border relative overflow-hidden snap-start ${
                  isSelected
                    ? "bg-[#d70f64] text-white border-[#d70f64] shadow-md shadow-[#d70f64]/20"
                    : "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 border-zinc-200 dark:border-zinc-800 hover:border-[#d70f64]/50 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                <div
                  className={`w-7.5 h-7.5 rounded-xl flex items-center justify-center text-base shrink-0 ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100"
                  } ${cat.imageUrl ? "overflow-hidden" : ""}`}
                >
                  {cat.imageUrl ? (
                    <LazyImage
                      src={cat.imageUrl}
                      alt={`${cat.name} dishes in Dadu`}
                      className="w-full h-full"
                      imgClassName="object-cover"
                    />
                  ) : (
                    cat.emoji || "🍽️"
                  )}
                </div>
                <div className="text-left">
                  <span className="block font-black uppercase text-[10.5px] tracking-wide">
                    {cat.name}
                  </span>
                  <span
                    className={`block text-[9px] font-semibold mt-0.5 leading-none ${
                      isSelected ? "text-white/90" : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    {cat.subtitle}
                  </span>
                </div>
                {isSelected && (
                  <motion.div
                    layoutId="activeCategoryBorder"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-white/50"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
