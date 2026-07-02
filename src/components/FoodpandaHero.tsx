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
      {/* Prime Billboard Layout */}
      <div className="max-w-7xl mx-auto px-4 pt-4 pb-1">
        <div className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-black border border-zinc-700/50 overflow-hidden rounded-[28px] sm:rounded-[36px] p-6 sm:p-10 relative flex flex-col md:flex-row items-center justify-between gap-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] min-h-[250px] transition-all">
          {/* Professional Dark Culinary & Service Background Image */}
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=1200"
              alt="Gourmet food background backdrop"
              className="w-full h-full object-cover opacity-30 select-none"
              referrerPolicy="no-referrer"
            />
            {/* Dark gradient mapping to make text highly legible and aesthetic */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
            {/* Ambient back glows */}
            <div className="absolute right-1/3 top-1/4 w-80 h-80 bg-pink-500/10 rounded-full blur-[110px] pointer-events-none" />
            <div className="absolute left-10 bottom-5 w-64 h-64 bg-amber-500/10 rounded-full blur-[90px] pointer-events-none" />
          </div>

          {/* Subtle branding absolute label in background */}
          <div className="absolute right-12 top-[-20px] text-[110px] select-none font-black text-white/[0.03] tracking-tighter pointer-events-none hidden md:block uppercase font-sans">
            DADU FOOD
          </div>

          {/* Left Column: Promos and Call to Action */}
          <div className="flex-1 max-w-xl text-center md:text-left z-10 space-y-3.5">
            <div className="inline-flex items-center gap-1.5 bg-red-500/20 text-pink-200 py-1.5 px-3.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-red-500/30 shadow-lg">
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              Welcome to Dadu Food
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
              Restaurants bahut saare, <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 font-black drop-shadow-md">
                par app sirf ek.
              </span>
              <span className="block mt-3 text-base sm:text-lg md:text-xl font-medium text-zinc-300 tracking-normal leading-snug max-w-md">
                Order karo abhi, aur delivery paao sabse tez.
              </span>
            </h1>

            <div className="pt-2.5 flex flex-wrap gap-3 items-center justify-center md:justify-start">
              <button
                onClick={() => {
                  const el = document.getElementById("catalog-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-white hover:bg-neutral-50 active:scale-95 transition-all duration-300 text-pink-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-pink-950/20 cursor-pointer flex items-center gap-1.5 hover:scale-[1.03]"
              >
                Order Now
              </button>

              <div className="inline-flex items-center gap-1.5 bg-black/40 border border-white/10 text-[10px] text-pink-100 py-2.5 px-4 rounded-2xl font-black uppercase tracking-wider shadow-inner">
                🛡️ 100% Quality Assured
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Floating Collage Illustration */}
          <div className="hidden md:flex items-center justify-center relative w-full md:w-1/3 h-52 z-10 shrink-0">
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Radial background flare */}
              <div className="absolute w-52 h-52 bg-pink-600/30 rounded-full blur-3xl animate-pulse"></div>

              {/* Floating Burger Card */}
              <motion.img
                animate={{ y: [0, -12, 0], rotate: [0, 2, 0] }}
                transition={{
                  repeat: Infinity,
                  duration: 6,
                  ease: "easeInOut",
                }}
                src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=250"
                alt="Burger Promo Highlight"
                className="w-36 h-36 rounded-[24px] object-cover shadow-[0_20px_50px_rgba(0,0,0,0.4)] border-4 border-white/15 z-10 absolute left-2"
                referrerPolicy="no-referrer"
              />

              {/* Floating Pizza Card */}
              <motion.img
                animate={{ y: [0, 12, 0], rotate: [0, -3, 0] }}
                transition={{
                  repeat: Infinity,
                  duration: 5,
                  ease: "easeInOut",
                }}
                src="https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=250"
                alt="Pizza Promo Highlight"
                className="w-28 h-28 rounded-[20px] object-cover shadow-[0_15px_35px_rgba(0,0,0,0.35)] border-4 border-white/15 z-20 absolute right-4 top-4"
                referrerPolicy="no-referrer"
              />

              {/* Home service overlapping badge */}
              <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{
                  repeat: Infinity,
                  duration: 4,
                  ease: "easeInOut",
                }}
                className="absolute right-0 bottom-6 bg-gradient-to-r from-amber-400 to-amber-500 text-neutral-950 px-3.5 py-2 rounded-xl font-black text-[9px] uppercase tracking-wider shadow-lg border border-white/25 z-30 flex items-center gap-1.5"
              >
                <Utensils className="w-3 h-3 text-neutral-950" />
                Dadu Premium Live
              </motion.div>
            </div>
          </div>
        </div>
      </div>

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
          {displayCategories.map((cat) => {
            const isSelected = activeCategory === cat.name;
            return (
              <motion.button
                key={cat.id || cat.name}
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveCategory(cat.name)}
                className={`flex items-center gap-3 py-2 px-4.5 rounded-2xl text-xs font-bold shrink-0 transition-all cursor-pointer border relative overflow-hidden snap-start ${
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
                    <img
                      src={cat.imageUrl}
                      alt={cat.name}
                      className="w-full h-full object-cover"
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
