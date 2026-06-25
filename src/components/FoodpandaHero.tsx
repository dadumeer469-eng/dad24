import React, { useState, useEffect } from "react";
import { Sparkles, Utensils, HelpCircle, Flame, Clock } from "lucide-react";
import { motion } from "motion/react";

interface FoodpandaHeroProps {
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  dealOfTheHour?: any;
}

export default function FoodpandaHero({ activeCategory, setActiveCategory, dealOfTheHour }: FoodpandaHeroProps) {
  const [timeLeft, setTimeLeft] = useState({ minutes: 0, seconds: 0 });
  const [isDealActive, setIsDealActive] = useState(false);

  // Synchronized promotional timer countdown
  useEffect(() => {
    if (!dealOfTheHour || !dealOfTheHour.active || !dealOfTheHour.startTime || !dealOfTheHour.durationMinutes) {
      setIsDealActive(false);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const elapsedMs = now - dealOfTheHour.startTime;
      const durationMs = dealOfTheHour.durationMinutes * 60 * 1000;
      const remainingMs = durationMs - elapsedMs;

      if (remainingMs > 0) {
        const totalSecs = Math.floor(remainingMs / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        setTimeLeft({ minutes: mins, seconds: secs });
        setIsDealActive(true);
      } else {
        setIsDealActive(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [dealOfTheHour]);

  const categories = [
    { name: "All", emoji: "🍽️", subtitle: "Sab Kuch", color: "from-[#D70F64] to-[#f22c80]" },
    { name: "Bookmarks", emoji: "❤️", subtitle: "Favorites", color: "from-rose-500 to-red-600" },
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
        <div className="bg-[#D70F64] border border-[#D70F64] overflow-hidden rounded-3.5xl p-5 sm:p-8 relative flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_4px_30px_rgba(215,15,100,0.08)] min-h-[220px]">
          
          {/* Professional Dark Culinary & Service Background Image */}
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1200" 
              alt="Gourmet food background backdrop" 
              className="w-full h-full object-cover opacity-45 select-none"
              referrerPolicy="no-referrer"
            />
            {/* Dark gradient mapping to make text highly legible and aesthetic */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/75 to-[#D70F64]/35" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/35" />
            {/* Ambient back glow */}
            <div className="absolute right-1/4 top-1/4 w-72 h-72 bg-white/5 rounded-full blur-[100px] pointer-events-none" />
          </div>

          {/* Subtle branding absolute label in background */}
          <div className="absolute right-10 bottom-[-15px] text-[80px] select-none font-black text-white/[0.02] tracking-widest pointer-events-none hidden md:block uppercase font-mono">
            DADU
          </div>
          
          <div className="flex-1 max-w-2xl text-center md:text-left z-10">
            <div className="inline-flex items-center gap-1.5 bg-white/15 text-white py-1 px-3 rounded-full text-[9px] font-black uppercase tracking-widest mb-2.5 border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
              <Flame className="w-3 h-3 text-white animate-pulse" />
              Limited Time VIP Promo
            </div>
            
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              Fresh & Hot Food, <br className="hidden sm:inline"/>
              <span className="text-white bg-white/10 px-3 py-0.5 rounded-xl font-black text-xl sm:text-3xl border border-white/25 mt-1.5 inline-block">with Expert Repairs!</span>
            </h1>
            
            <p className="text-pink-50 mt-2.5 text-xs sm:text-[13px] leading-relaxed font-semibold">
              Savor beautiful fast hot meals right from Dadu’s leading kitchens, delivered within 25 minutes flat. Cash on delivery accepted and highly secure. Or book top-tier certified Home Services like electricians or AC servicing packages with flat diagnostic fees.
            </p>

            <div className="mt-4 flex flex-wrap gap-2.5 items-center justify-center md:justify-start">
              <button
                onClick={() => {
                  const el = document.getElementById("catalog-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-white hover:bg-neutral-50 transition-all duration-300 text-[#D70F64] px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-pink-900/10 cursor-pointer flex items-center gap-1.5 hover:scale-[1.02]"
              >
                Order Now
              </button>
              
              <div className="inline-flex items-center gap-1 bg-white/5 border border-white/20 text-[10px] text-pink-100 py-2 px-3 rounded-xl font-bold uppercase tracking-wider">
                🛡️ 100% Certified Booking
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Ticking Interactive Count Deal Banner */}
      {isDealActive && (
        <div className="max-w-7xl mx-auto px-4 py-1 animate-fade-in">
          <div className="bg-gradient-to-r from-rose-50 to-pink-50/50 border border-rose-100 py-2.5 px-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-xs">
            <div className="flex items-center gap-2 text-xs text-zinc-700 font-medium">
              <Clock className="w-4 h-4 text-[#D70F64] animate-pulse" />
              <span className="font-extrabold text-[#D70F64]">Deal of the Hour:</span>
              <span className="font-semibold text-zinc-800">{dealOfTheHour.title}</span>
              <span className="bg-rose-500 text-white font-black text-[9px] uppercase px-1.5 py-0.5 rounded ml-1 animate-pulse">
                -{dealOfTheHour.discountPercentage}%
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-rose-500">Deal Closes In</span>
              <div className="bg-[#D70F64] text-white font-mono font-black text-xs px-3 py-1.5 rounded-xl shadow-md tracking-wider">
                {String(timeLeft.minutes).padStart(2, "0")}m : {String(timeLeft.seconds).padStart(2, "0")}s
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Horizontal Filter Bar - Reduced top-padding and bottom-padding for tighter layout */}
      <div id="catalog-section" className="max-w-7xl mx-auto px-4 pt-3.5 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-zinc-900 uppercase flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-md bg-[#D70F64] inline-block shadow-sm shadow-pink-500/30"></span>
              Browse Categories
            </h2>
            <p className="text-[10.5px] text-zinc-500 font-semibold mt-0.5">Dadu premium menu items and verified residential services catalog</p>
          </div>
          <div className="bg-pink-50/50 border border-pink-100/60 rounded-xl py-1 px-3 text-[10px] text-[#D70F64] font-extrabold uppercase w-max self-start sm:self-auto">
            📍 Fast Delivery Active
          </div>
        </div>
        
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
                className={`flex items-center gap-3.5 py-3 px-5 rounded-2xl text-xs font-bold shrink-0 transition-all cursor-pointer border relative overflow-hidden snap-start ${
                  isSelected 
                    ? `bg-gradient-to-r ${cat.color} text-white border-transparent shadow-lg shadow-pink-500/15` 
                    : "bg-white text-zinc-700 border-zinc-200/80 hover:bg-zinc-50 hover:border-zinc-300"
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg shadow-inner shrink-0 ${
                  isSelected ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-800"
                }`}>
                  {cat.emoji}
                </div>
                <div className="text-left">
                  <span className="block font-black uppercase text-[11px] tracking-wide">{cat.name}</span>
                  <span className={`block text-[9px] font-semibold mt-0.5 ${
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
