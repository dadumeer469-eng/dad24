import React, { useState, useEffect } from "react";
import { Sparkles, Utensils, HelpCircle, Flame, Clock } from "lucide-react";

interface FoodpandaHeroProps {
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
}

export default function FoodpandaHero({ activeCategory, setActiveCategory }: FoodpandaHeroProps) {
  const [timeLeft, setTimeLeft] = useState({ minutes: 29, seconds: 42 });

  // Promotional ticking clock countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { minutes: prev.minutes - 1, seconds: 59 };
        } else {
          // Restart to simulate infinite high-intensity countdown
          return { minutes: 29, seconds: 59 };
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const categories = [
    { name: "All", emoji: "🍽️" },
    { name: "Burgers", emoji: "🍔" },
    { name: "Pizzas", emoji: "🍕" },
    { name: "Chicken & Rice", emoji: "🍗" },
    { name: "Only Tea", emoji: "🍵" },
    { name: "Specials", emoji: "⭐️" },
    { name: "Home Services", emoji: "🛠️" }
  ];

  return (
    <div className="bg-white relative">
      
      {/* Prime Billboard Layout */}
      <div className="max-w-7xl mx-auto px-4 pt-4 pb-2">
        <div className="bg-[#D70F64] border border-[#D70F64] overflow-hidden rounded-3.5xl p-5 sm:p-8 relative flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_4px_30px_rgba(215,15,100,0.08)] min-h-[240px]">
          
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
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="bg-white border border-pink-100 py-3.5 px-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-xs">
          <div className="flex items-center gap-2 text-xs text-zinc-700 font-medium">
            <Clock className="w-4 h-4 text-[#D70F64]" />
            <span className="font-extrabold text-[#D70F64]">Deal of the Hour:</span>
            <span>Save 25% on Only Tea & Fresh Platters! Hurry!</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-400">Deal Closes In</span>
            <div className="bg-[#D70F64]/10 border border-[#D70F64]/20 text-[#D70F64] font-black text-xs px-3 py-1 rounded-lg">
              {String(timeLeft.minutes).padStart(2, "0")} : {String(timeLeft.seconds).padStart(2, "0")}
            </div>
          </div>
        </div>
      </div>

      {/* Category Horizontal Filter Bar */}
      <div id="catalog-section" className="max-w-7xl mx-auto px-4 pt-8 pb-4">
        <h2 className="text-xl font-extrabold tracking-tight text-zinc-800 mb-4 uppercase text-[15px] border-l-2 border-[#D70F64] pl-2.5">
          Browse Categories
        </h2>
        
        {/* Scroll wrapper */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => {
            const isSelected = activeCategory === cat.name;
            return (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={`flex items-center gap-2 py-2.5 px-4 rounded-2xl text-xs font-bold shrink-0 transition-all shadow-xs cursor-pointer border ${
                  isSelected 
                    ? "bg-[#D70F64] text-white border-[#D70F64] shadow-md shadow-pink-500/15 scale-[1.02]" 
                    : "bg-white text-zinc-650 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-800"
                }`}
              >
                <span className="text-sm">{cat.emoji}</span>
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
