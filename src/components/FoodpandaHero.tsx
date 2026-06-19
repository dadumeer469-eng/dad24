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
    <div className="bg-zinc-950 relative">
      
      {/* Prime Billboard Layout */}
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-4">
        <div className="bg-zinc-900 border border-zinc-800 overflow-hidden rounded-3.5xl p-6 sm:p-10 relative flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
          
          {/* Subtle branding absolute label in background */}
          <div className="absolute right-6 bottom-[-20px] text-[110px] select-none font-black text-white/5 tracking-widest pointer-events-none hidden md:block">
            DADU
          </div>
          
          <div className="flex-1 max-w-xl text-center md:text-left z-10">
            <div className="inline-flex items-center gap-1.5 bg-[#FF5C00]/15 text-[#FF5C00] py-1.5 px-3.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-[#FF5C00]/20">
              <Flame className="w-3.5 h-3.5" />
              Limited Time Promo
            </div>
            
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Fresh & Hot Food, <br/>
              <span className="text-[#FF5C00] font-extrabold text-2xl sm:text-4xl">with Expert Repairs!</span>
            </h1>
            
            <p className="text-zinc-350 mt-4 text-sm sm:text-base leading-relaxed font-medium">
              Savor beautiful fast hot meals right from Dadu’s leading kitchens, delivered within 25 minutes flat. Cash on delivery accepted and highly secure. Or book top-tier certified Home Services like electricians or AC servicing packages with flat diagnostic fees.
            </p>

            <div className="mt-6 flex flex-wrap gap-3 items-center justify-center md:justify-start">
              <button
                onClick={() => {
                  const el = document.getElementById("catalog-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-[#FF5C00] hover:bg-[#d44d00] transition text-zinc-950 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wide shadow-md cursor-pointer flex items-center gap-2"
              >
                Order Now
              </button>
              
              <div className="inline-flex items-center gap-1 text-xs text-orange-200 border border-[#FF5C00]/20 bg-[#FF5C00]/10 py-2.5 px-4 rounded-2xl font-semibold">
                🛡️ 100% Secure & Clean Booking
              </div>
            </div>
          </div>

          {/* Dadu Mascot Illustration */}
          <div className="w-full max-w-sm shrink-0 flex justify-center z-10 md:-mr-4">
            <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3.5xl flex items-center gap-4 max-w-xs justify-center shadow-xs">
              <div className="w-14 h-14 bg-[#FF5C00] text-zinc-950 rounded-full flex items-center justify-center text-3xl shadow-md shrink-0 select-none">
                🐼
              </div>
              <div>
                <span className="font-extrabold text-sm text-white block">Meet Dadu 24#7 Panda!</span>
                <p className="text-[11px] text-zinc-400 mt-1 leading-snug font-medium">
                  Hello friend! I am cooking the fastest local food track just for you in Dadu. Tap below to order!
                </p>
                <div className="flex items-center gap-1 text-amber-300 font-bold text-xs mt-1.5 animate-pulse">
                  {"★".repeat(5)} <span className="text-[10px] text-orange-400">4.9/5 Drivers Rated</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Ticking Interactive Count Deal Banner */}
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="bg-zinc-900 border border-zinc-800 py-3.5 px-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-xs">
          <div className="flex items-center gap-2 text-xs text-zinc-300 font-medium">
            <Clock className="w-4 h-4 text-[#FF5C00]" />
            <span className="font-extrabold text-[#FF5C00]">Deal of the Hour:</span>
            <span>Save 25% on Only Tea & Fresh Platters! Hurry!</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500">Deal Closes In</span>
            <div className="bg-[#FF5C00]/10 border border-[#FF5C00]/20 text-[#FF5C00] font-black text-xs px-3 py-1 rounded-lg">
              {String(timeLeft.minutes).padStart(2, "0")} : {String(timeLeft.seconds).padStart(2, "0")}
            </div>
          </div>
        </div>
      </div>

      {/* Category Horizontal Filter Bar */}
      <div id="catalog-section" className="max-w-7xl mx-auto px-4 pt-8 pb-4">
        <h2 className="text-xl font-extrabold tracking-tight text-zinc-100 mb-4 uppercase text-[15px] border-l-2 border-[#FF5C00] pl-2.5">
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
                    ? "bg-[#FF5C00] text-zinc-950 border-[#FF5C00]" 
                    : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-850 hover:text-zinc-100 shadow-xs"
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
