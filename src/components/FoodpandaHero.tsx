import React, { useState, useEffect } from "react";
import { Sparkles, Utensils, HelpCircle, Flame, Clock, Percent } from "lucide-react";
import { motion } from "motion/react";

interface FoodpandaHeroProps {
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  dealConfig: {
    timerMinutes: number;
    discountPercentage: number;
    selectedItemIds: string[];
    dealText?: string;
  };
  dealTimeLeft: { minutes: number; seconds: number };
}

export default function FoodpandaHero({ activeCategory, setActiveCategory, dealConfig, dealTimeLeft }: FoodpandaHeroProps) {
  const categories = [
    { name: "All", emoji: "🍽️", subtitle: "Sab Kuch", color: "from-[#D70F64] to-[#f22c80]" },
    { name: "Burgers", emoji: "🍔", subtitle: "Zesty Burgers", color: "from-amber-500 to-orange-600" },
    { name: "Pizzas", emoji: "🍕", subtitle: "Hot & Cheesy", color: "from-red-500 to-rose-600" },
    { name: "Chicken & Rice", emoji: "🍗", subtitle: "Desi Flavors", color: "from-yellow-500 to-amber-600" },
    { name: "Only Tea", emoji: "🍵", subtitle: "Karak Chai", color: "from-teal-500 to-emerald-600" },
    { name: "Specials", emoji: "⭐️", subtitle: "Dadu Premium", color: "from-purple-500 to-indigo-600" },
    { name: "Home Services", emoji: "🛠️", subtitle: "Expert Repairs", color: "from-sky-500 to-blue-600" }
  ];

  return (
    <div className="bg-transparent relative">
      
      {/* Prime Billboard Layout */}
      <div className="max-w-7xl mx-auto px-4 pt-4 pb-1">
        <div className="bg-gradient-to-br from-[#D70F64] via-[#b80b54] to-[#8c043c] border border-pink-500/15 overflow-hidden rounded-[28px] sm:rounded-[36px] p-6 sm:p-10 relative flex flex-col md:flex-row items-center justify-between gap-8 shadow-[0_20px_50px_rgba(215,15,100,0.15)] min-h-[250px] transition-all">
          
          {/* Professional Dark Culinary & Service Background Image */}
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1200" 
              alt="Gourmet food background backdrop" 
              className="w-full h-full object-cover opacity-20 select-none"
              referrerPolicy="no-referrer"
            />
            {/* Dark gradient mapping to make text highly legible and aesthetic */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-[#D70F64]/40 to-[#D70F64]/15" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
            {/* Ambient back glows */}
            <div className="absolute right-1/3 top-1/4 w-80 h-80 bg-white/5 rounded-full blur-[110px] pointer-events-none" />
            <div className="absolute left-10 bottom-5 w-64 h-64 bg-amber-500/10 rounded-full blur-[90px] pointer-events-none" />
          </div>

          {/* Subtle branding absolute label in background */}
          <div className="absolute right-12 bottom-[-10px] text-[90px] select-none font-black text-white/[0.03] tracking-widest pointer-events-none hidden md:block uppercase font-mono">
            DADU
          </div>
          
          {/* Left Column: Promos and Call to Action */}
          <div className="flex-1 max-w-xl text-center md:text-left z-10 space-y-3.5">
            <div className="inline-flex items-center gap-1.5 bg-white/10 text-white py-1.5 px-3.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10 shadow-lg">
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              Limited Time VIP Promo
            </div>
            
            <h1 className="text-3xl sm:text-4.5xl font-black tracking-tight text-white leading-tight">
              Fresh & Hot Food, <br className="hidden sm:inline"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-pink-200 to-white font-black">
                with Expert Repairs!
              </span>
            </h1>
            
            <p className="text-pink-100 text-xs sm:text-[13.5px] leading-relaxed font-semibold max-w-lg">
              Savor beautiful fast hot meals right from Dadu’s leading kitchens, delivered within 25 minutes flat. Cash on delivery accepted and highly secure. Or book top-tier certified Home Services like electricians or AC servicing packages with flat diagnostic fees.
            </p>

            <div className="pt-2.5 flex flex-wrap gap-3 items-center justify-center md:justify-start">
              <button
                onClick={() => {
                  const el = document.getElementById("catalog-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-white hover:bg-neutral-50 active:scale-95 transition-all duration-300 text-[#D70F64] px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-pink-950/20 cursor-pointer flex items-center gap-1.5 hover:scale-[1.03]"
              >
                Order Now
              </button>
              
              <div className="inline-flex items-center gap-1.5 bg-black/25 border border-white/10 text-[10px] text-pink-100 py-2.5 px-4 rounded-2xl font-black uppercase tracking-wider shadow-inner">
                🛡️ 100% Certified Booking
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Floating Collage Illustration */}
          <div className="hidden md:flex items-center justify-center relative w-full md:w-1/3 h-52 z-10 shrink-0">
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Radial background flare */}
              <div className="absolute w-52 h-52 bg-[#D70F64]/30 rounded-full blur-3xl animate-pulse"></div>
              
              {/* Floating Burger Card */}
              <motion.img
                animate={{ y: [0, -12, 0], rotate: [0, 2, 0] }}
                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=250"
                alt="Burger Promo Highlight"
                className="w-36 h-36 rounded-[24px] object-cover shadow-[0_20px_50px_rgba(0,0,0,0.4)] border-4 border-white/15 z-10 absolute left-2"
                referrerPolicy="no-referrer"
              />
              
              {/* Floating Pizza Card */}
              <motion.img
                animate={{ y: [0, 12, 0], rotate: [0, -3, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                src="https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=250"
                alt="Pizza Promo Highlight"
                className="w-28 h-28 rounded-[20px] object-cover shadow-[0_15px_35px_rgba(0,0,0,0.35)] border-4 border-white/15 z-20 absolute right-4 top-4"
                referrerPolicy="no-referrer"
              />

              {/* Home service overlapping badge */}
              <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
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
      {(dealTimeLeft.minutes > 0 || dealTimeLeft.seconds > 0) && (
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="bg-white border border-pink-100 py-3 px-5 sm:px-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-xs">
            <div className="flex items-center gap-2 text-xs text-zinc-700 font-medium">
              <Clock className="w-4 h-4 text-[#D70F64]" />
              <span className="font-extrabold text-[#D70F64]">Deal of the Hour:</span>
              <span>
                {dealConfig.dealText || `Save ${dealConfig.discountPercentage}% on our curated choice of hot items!`}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-400">Deal Closes In</span>
              <div className="bg-[#D70F64]/10 border border-[#D70F64]/20 text-[#D70F64] font-black text-xs px-3 py-1 rounded-lg">
                {String(dealTimeLeft.minutes).padStart(2, "0")} : {String(dealTimeLeft.seconds).padStart(2, "0")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Horizontal Filter Bar (Spacing tightly adjusted, headers removed) */}
      <div id="catalog-section" className="max-w-7xl mx-auto px-4 pt-1.5 pb-2">
        {/* Scroll wrapper */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
          {categories.map((cat) => {
            const isSelected = activeCategory === cat.name;
            return (
              <motion.button
                key={cat.name}
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveCategory(cat.name)}
                className={`flex items-center gap-3 py-2 px-4.5 rounded-2xl text-xs font-bold shrink-0 transition-all cursor-pointer border relative overflow-hidden snap-start ${
                  isSelected 
                    ? `bg-gradient-to-r ${cat.color} text-white border-transparent shadow-lg shadow-pink-500/15` 
                    : "bg-white text-zinc-700 border-zinc-200/80 hover:bg-zinc-50 hover:border-zinc-300"
                }`}
              >
                <div className={`w-7.5 h-7.5 rounded-xl flex items-center justify-center text-base shadow-inner shrink-0 ${
                  isSelected ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-800"
                }`}>
                  {cat.emoji}
                </div>
                <div className="text-left">
                  <span className="block font-black uppercase text-[10.5px] tracking-wide">{cat.name}</span>
                  <span className={`block text-[8.5px] font-semibold mt-0.5 leading-none ${
                    isSelected ? "text-pink-100" : "text-zinc-400"
                  }`}>{cat.subtitle}</span>
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
