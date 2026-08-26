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
    { name: "All", emoji: "🍽️", subtitle: "Sab Kuch", color: "from-[#d70f64] to-[#f22c80]" },
    { name: "Pizza", emoji: "🍕", subtitle: "Hot Pizzas", color: "from-pink-500 to-rose-600" },
    { name: "Burgers", emoji: "🍔", subtitle: "Zesty Burgers", color: "from-amber-500 to-pink-600" },
    { name: "Broast", emoji: "🍗", subtitle: "Crispy Broast", color: "from-yellow-500 to-amber-600" },
    { name: "Rolls & Wraps", emoji: "🌯", subtitle: "Tasty Rolls", color: "from-pink-500 to-pink-600" },
    { name: "Pasta", emoji: "🍝", subtitle: "Creamy Pasta", color: "from-yellow-600 to-orange-600" },
    { name: "Lazania", emoji: "🫓", subtitle: "Cheesy Lazania", color: "from-pink-600 to-rose-700" },
    { name: "Fries", emoji: "🍟", subtitle: "Loaded Fries", color: "from-amber-400 to-yellow-600" },
    { name: "Paratha", emoji: "🫓", subtitle: "Hot Parathas", color: "from-amber-600 to-orange-700" },
    { name: "Sandwich", emoji: "🥪", subtitle: "Grilled Sandwiches", color: "from-yellow-500 to-orange-500" },
    { name: "Specials", emoji: "⭐️", subtitle: "Dadu Premium", color: "from-purple-500 to-indigo-600" },
    { name: "Home Services", emoji: "🛠️", subtitle: "Expert Repairs", color: "from-sky-500 to-blue-600" }
  ];

  const displayCategories =
    foodCategories && foodCategories.length > 0
      ? [...foodCategories].sort((a, b) => (a.position || 0) - (b.position || 0))
      : defaultCategories;

  return (
    <div className="bg-transparent relative">
      {/* Prime Billboard Layout removed as requested */}

      {/* Ticking Interactive Count Deal Banner */}
      {dealConfig.isActive &&
        (dealTimeLeft.minutes > 0 || dealTimeLeft.seconds > 0) && (
          <div className="max-w-7xl mx-auto px-4 py-2">
            <div className="bg-white border border-red-100 py-3 px-5 sm:px-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-xs">
              <div className="flex items-center gap-2 text-xs text-zinc-700 font-medium">
                <Clock className="w-4 h-4 text-[#d70f64]" />
                <span className="font-extrabold text-[#d70f64]">
                  Deal of the Hour:
                </span>
                <span>
                  {dealConfig.dealText ||
                    `Save ${dealConfig.discountPercentage}% on our curated choice of hot items!`}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-400">
                  Deal Closes In
                </span>
                <div className="bg-[#d70f64]/10 border border-[#d70f64]/20 text-[#d70f64] font-black text-xs px-3 py-1 rounded-lg">
                  {String(dealTimeLeft.minutes).padStart(2, "0")} :{" "}
                  {String(dealTimeLeft.seconds).padStart(2, "0")}
                </div>
              </div>
            </div>
          </div>
        )}

      {children}

      {/* Category Horizontal Filter Bar (Spacing tightly adjusted, headers removed) */}
      <div id="catalog-section" className="max-w-7xl mx-auto px-4 pt-1.5 pb-2">
        {/* Scroll wrapper */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
          {displayCategories.map((cat, idx) => {
            const isSelected = activeCategory === cat.name;
            return (
              <motion.button
                key={cat.id || cat.name}
                type="button"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.04 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveCategory(cat.name)}
                className={`flex items-center gap-3 py-2 px-4.5 rounded-2xl text-xs font-bold shrink-0 transition-colors cursor-pointer border relative overflow-hidden snap-start ${
                  isSelected
                    ? `bg-gradient-to-r ${cat.color || "from-[#d70f64] to-[#f22c80]"} text-white border-transparent shadow-lg shadow-red-500/15`
                    : "bg-white text-zinc-700 border-zinc-200/80 hover:bg-zinc-50 hover:border-zinc-300"
                }`}
              >
                <div
                  className={`w-7.5 h-7.5 rounded-xl flex items-center justify-center text-base shadow-inner shrink-0 ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-zinc-100 text-zinc-800"
                  } ${cat.imageUrl ? "overflow-hidden" : ""}`}
                >
                  {cat.imageUrl ? (
                    <LazyImage
                      src={cat.imageUrl}
                      alt={cat.name}
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
                    className={`block text-[8.5px] font-semibold mt-0.5 leading-none ${
                      isSelected ? "text-red-100" : "text-zinc-400"
                    }`}
                  >
                    {cat.subtitle}
                  </span>
                </div>
                {isSelected && (
                  <motion.div
                    layoutId="activeCategoryBorder"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-white/40"
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
