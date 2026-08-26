import React, { useState, useEffect, useRef } from "react";
import { 
  ChevronLeft, 
  Heart, 
  Search, 
  Star, 
  MapPin, 
  Clock, 
  Tag, 
  Sparkles, 
  Flame, 
  Check, 
  Plus, 
  Minus, 
  Share2, 
  BadgeCheck, 
  SlidersHorizontal,
  Info,
  ShoppingBag,
  Store,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Dish, OrderItem, SystemSettings } from "../types";
import { LazyImage } from "./LazyImage";
import FoodDetailModal from "./FoodDetailModal";
import DaduLogoLoader from "./DaduLogoLoader";
import useLazyBatchLoad from "../hooks/useLazyBatchLoad";

interface FoodpandaRestaurantPageProps {
  restaurantName: string;
  dishes: Dish[];
  deliverySettings?: SystemSettings;
  initialCategory?: string;
  isRestaurantClosed?: boolean;
  bgImageUrl?: string;
  onBack: () => void;
  onAddToCart: (
    dish: Dish, 
    quantityToAdd?: number, 
    options?: { size?: string; flavor?: string; addOns?: { name: string; price: number; }[]; specialInstructions?: string; }
  ) => void;
  cartItems: OrderItem[];
  cartCountTotal: number;
  cartPriceTotal: number;
  onViewCart: () => void;
  toggleFavorite: (dishId: string) => void;
  favoriteDishIds: string[];
  isRiderRangeExceeded?: boolean;
  distanceDisplay?: string | null;
}

// Subcomponent for lazy batch rendering category dishes with infinite scroll
function CategoryDishGridBatch({
  dishes,
  isClosed,
  getDishQuantityInCart,
  favoriteDishIds,
  toggleFavorite,
  onAddToCart,
  setActiveDetailDish,
}: {
  dishes: Dish[];
  isClosed?: boolean;
  getDishQuantityInCart: (id: string) => number;
  favoriteDishIds: string[];
  toggleFavorite: (id: string) => void;
  onAddToCart: (dish: Dish, qty?: number) => void;
  setActiveDetailDish: (dish: Dish) => void;
}) {
  const { visibleItems, hasMore, observerTargetRef } = useLazyBatchLoad(dishes, 12);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleItems.map((dish) => (
          <DishCard
            key={dish.id}
            dish={dish}
            onAdd={() => setActiveDetailDish(dish)}
            isClosed={isClosed}
            quantityInCart={getDishQuantityInCart(dish.id)}
            isFavorite={favoriteDishIds.includes(dish.id)}
            onToggleFavorite={() => toggleFavorite(dish.id)}
            onQuickAdd={(qty) => onAddToCart(dish, qty)}
          />
        ))}
      </div>

      {hasMore && (
        <div ref={observerTargetRef} className="py-6 flex justify-center">
          <DaduLogoLoader compact size="sm" text="Loading more delicacies..." />
        </div>
      )}
    </div>
  );
}
const getCategoryEmoji = (category: string) => {
  const cat = (category || "").toLowerCase();
  if (cat.includes("burger") || cat.includes("fast food")) return "🍔";
  if (cat.includes("pizza")) return "🍕";
  if (cat.includes("drink") || cat.includes("beverage") || cat.includes("shake")) return "🥤";
  if (cat.includes("biryani") || cat.includes("rice") || cat.includes("pulao")) return "🍛";
  if (cat.includes("chicken") || cat.includes("karahi") || cat.includes("barbecue") || cat.includes("bbq")) return "🍗";
  if (cat.includes("roll") || cat.includes("shawarma") || cat.includes("wrap")) return "🌯";
  if (cat.includes("dessert") || cat.includes("sweet") || cat.includes("ice cream")) return "🍦";
  if (cat.includes("deal") || cat.includes("combo") || cat.includes("offer")) return "🔥";
  if (cat.includes("service") || cat.includes("repair")) return "🛠️";
  if (cat.includes("fries") || cat.includes("side") || cat.includes("snack")) return "🍟";
  if (cat.includes("tea") || cat.includes("coffee") || cat.includes("chai")) return "☕";
  return "🍽️";
};

export default function FoodpandaRestaurantPage({
  restaurantName,
  dishes,
  deliverySettings,
  initialCategory,
  isRestaurantClosed,
  bgImageUrl,
  onBack,
  onAddToCart,
  cartItems,
  cartCountTotal,
  cartPriceTotal,
  onViewCart,
  toggleFavorite,
  favoriteDishIds,
  isRiderRangeExceeded,
  distanceDisplay
}: FoodpandaRestaurantPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory || "");
  const [activeDetailDish, setActiveDetailDish] = useState<Dish | null>(null);
  const [filterType, setFilterType] = useState<"all" | "bestsellers" | "veg">("all");
  const [copiedLink, setCopiedLink] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Group dishes by category & bestsellers
  const categories = Array.from(new Set(dishes.map(d => d.category)));
  const bestsellerDishes = dishes.filter(d => Boolean(d.isBestseller));
  const hasBestsellers = bestsellerDishes.length > 0;
  const allNavCategories = hasBestsellers ? ["🔥 Bestsellers", ...categories] : categories;

  if (allNavCategories.length > 0 && !activeCategory) {
    setActiveCategory(allNavCategories[0]);
  }

  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const categoryButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const isManualScrollingRef = useRef(false);

  const scrollToCategory = (category: string) => {
    setActiveCategory(category);
    isManualScrollingRef.current = true;
    const element = categoryRefs.current[category];
    if (element) {
      const yOffset = -110; 
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
    setTimeout(() => {
      isManualScrollingRef.current = false;
    }, 800);
  };

  useEffect(() => {
    if (initialCategory && allNavCategories.includes(initialCategory)) {
      setTimeout(() => {
        scrollToCategory(initialCategory);
      }, 300);
    }
  }, []);

  // Scroll spy: update active category smoothly as user scrolls down menu
  useEffect(() => {
    let requestRunning = false;

    const handleScroll = () => {
      if (requestRunning || isManualScrollingRef.current || searchQuery || filterType !== "all" || allNavCategories.length === 0) return;

      requestRunning = true;
      requestAnimationFrame(() => {
        requestRunning = false;

        // Check if scrolled near bottom of page
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
          const lastCat = allNavCategories[allNavCategories.length - 1];
          if (lastCat && activeCategory !== lastCat) {
            setActiveCategory(lastCat);
          }
          return;
        }

        const triggerPoint = 160; // Offset relative to viewport top (sticky nav bar height)
        let currentCategory = allNavCategories[0];

        for (const cat of allNavCategories) {
          const element = categoryRefs.current[cat];
          if (element) {
            const rect = element.getBoundingClientRect();
            if (rect.top <= triggerPoint) {
              currentCategory = cat;
            }
          }
        }

        if (currentCategory && currentCategory !== activeCategory) {
          setActiveCategory(currentCategory);
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [allNavCategories, activeCategory, searchQuery, filterType]);

  // Keep active category button centered in horizontal scrollbar smoothly
  useEffect(() => {
    if (activeCategory && categoryButtonRefs.current[activeCategory]) {
      const btn = categoryButtonRefs.current[activeCategory];
      btn?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center"
      });
    }
  }, [activeCategory]);

  // Filtered dishes according to search & chips
  const filteredDishes = dishes.filter(d => {
    const q = (searchQuery || "").trim().toLowerCase();
    const matchesSearch = !q ||
                          (d.name || "").toLowerCase().includes(q) || 
                          (d.description || "").toLowerCase().includes(q) ||
                          (d.category || "").toLowerCase().includes(q);
    
    if (!matchesSearch) return false;

    if (filterType === "bestsellers") {
      return Boolean(d.isBestseller);
    }
    if (filterType === "veg") {
      return d.isVeg || (d.category || "").toLowerCase().includes("veg") || (d.description || "").toLowerCase().includes("veg");
    }
    return true;
  });

  const restaurantImageUrl = deliverySettings?.restaurantStatuses?.[restaurantName]?.imageUrl;
  const isMerchantVerified = true;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: restaurantName,
        text: `Order delicious items from ${restaurantName} on Dadu Express!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Helper to count quantity of dish in cart
  const getDishQuantityInCart = (dishId: string) => {
    return cartItems
      .filter(item => item.dishId === dishId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans pb-32 transition-colors duration-200">
      
      {/* Hero Cover Header */}
      <div className="relative h-56 sm:h-72 w-full overflow-hidden bg-gradient-to-r from-zinc-900 via-rose-950 to-pink-900">
        {(bgImageUrl || restaurantImageUrl) ? (
          <img 
            src={bgImageUrl || restaurantImageUrl} 
            alt={restaurantName}
            className="w-full h-full object-cover opacity-85 scale-105 filter saturate-110 transform transition-transform duration-700 hover:scale-100"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#D70F64] to-rose-700 opacity-90">
            <Store className="w-24 h-24 text-white/20" />
          </div>
        )}
        
        {/* Soft Glass Dark Gradient Overlay for Contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-black/30" />

        {/* Top Control Bar */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
          <button 
            onClick={onBack}
            className="p-2.5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-full text-zinc-800 dark:text-zinc-100 shadow-lg hover:bg-white transition-all cursor-pointer active:scale-95"
            title="Go back"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleShare}
              className="p-2.5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-full text-zinc-800 dark:text-zinc-100 shadow-lg hover:bg-white transition-all cursor-pointer active:scale-95 relative"
              title="Share store"
            >
              <Share2 className="w-5 h-5 stroke-[2]" />
              {copiedLink && (
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] px-2 py-0.5 rounded shadow-md whitespace-nowrap">
                  Link Copied!
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Floating Main Restaurant Profile Card */}
      <div className="max-w-4xl mx-auto px-4 -mt-16 sm:-mt-20 relative z-20">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-7 shadow-xl shadow-zinc-200/50 dark:shadow-none border border-zinc-100 dark:border-zinc-800/80 backdrop-blur-xl relative overflow-hidden">
          
          {/* Top Decorative Pink Glow */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#D70F64]/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar Logo */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white dark:bg-zinc-800 rounded-2xl shadow-lg border-2 border-white dark:border-zinc-700 overflow-hidden shrink-0 relative group">
                {restaurantImageUrl ? (
                  <LazyImage src={restaurantImageUrl} alt={restaurantName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#D70F64] to-rose-600 flex items-center justify-center text-white font-black text-2xl">
                    {restaurantName.substring(0, 2).toUpperCase()}
                  </div>
                )}
                {isMerchantVerified && (
                  <div className="absolute bottom-1 right-1 bg-[#D70F64] text-white rounded-full p-0.5 shadow-sm" title="Verified Merchant">
                    <BadgeCheck className="w-4 h-4 fill-white text-[#D70F64]" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
                    {restaurantName}
                  </h1>
                  {isRestaurantClosed ? (
                    <span className="bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 border border-rose-200 dark:border-rose-900">
                      Closed Now
                    </span>
                  ) : (
                    <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 border border-emerald-200 dark:border-emerald-900 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Open Now
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-1 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-[#D70F64]" /> Premium Partner Shop • High Quality Standards
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-3 mt-4 sm:mt-5 pt-3.5 sm:pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
            
            {/* Rating */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2 sm:p-3 rounded-2xl flex items-center gap-1.5 sm:gap-2.5 border border-zinc-100 dark:border-zinc-800 min-w-0">
              <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-500 text-amber-500" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[10.5px] sm:text-xs font-black text-zinc-900 dark:text-zinc-100 truncate">4.8 / 5</span>
                <span className="block text-[8.5px] sm:text-[10px] text-zinc-400 font-medium truncate leading-tight">350+ reviews</span>
              </div>
            </div>

            {/* Delivery Time */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2 sm:p-3 rounded-2xl flex items-center gap-1.5 sm:gap-2.5 border border-zinc-100 dark:border-zinc-800 min-w-0">
              <div className="p-1.5 rounded-xl bg-pink-500/10 text-[#D70F64] shrink-0">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[10.5px] sm:text-xs font-black text-zinc-900 dark:text-zinc-100 truncate">20-30 min</span>
                <span className="block text-[8.5px] sm:text-[10px] text-zinc-400 font-medium truncate leading-tight">Est. Delivery</span>
              </div>
            </div>

            {/* Distance / Fee */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2 sm:p-3 rounded-2xl flex items-center gap-1.5 sm:gap-2.5 border border-zinc-100 dark:border-zinc-800 min-w-0">
              <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[10.5px] sm:text-xs font-black text-zinc-900 dark:text-zinc-100 truncate">
                  {distanceDisplay || "Nearby"}
                </span>
                <span className="block text-[8.5px] sm:text-[10px] text-zinc-400 font-medium truncate leading-tight">
                  {(() => {
                    let chargeStr = deliverySettings?.restaurantStatuses?.[restaurantName]?.deliveryCharge;
                    if (!chargeStr) {
                      const fee = deliverySettings?.deliveryFee || 50;
                      chargeStr = `Rs. ${fee}`;
                    }
                    if (isRiderRangeExceeded) {
                      const match = chargeStr.match(/\d+/);
                      if (match) {
                        return chargeStr.replace(match[0], String(parseInt(match[0], 10) * 2));
                      }
                    }
                    return chargeStr;
                  })()}
                </span>
              </div>
            </div>

            {/* Min Order */}
            <div className="hidden sm:flex bg-zinc-50 dark:bg-zinc-800/50 p-2 sm:p-3 rounded-2xl items-center gap-1.5 sm:gap-2.5 border border-zinc-100 dark:border-zinc-800 min-w-0">
              <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
                <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[10.5px] sm:text-xs font-black text-zinc-900 dark:text-zinc-100 truncate">
                  Rs. {deliverySettings?.restaurantStatuses?.[restaurantName]?.minOrder || deliverySettings?.minOrderAmount || 0}
                </span>
                <span className="block text-[8.5px] sm:text-[10px] text-zinc-400 font-medium truncate leading-tight">Min. Order</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Toolbar: Search & Quick Filter Pills */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        <div className="flex flex-col sm:flex-row gap-3">
          
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={`Search in ${restaurantName}...`}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-3 pl-10 pr-10 text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-[#D70F64]/30 dark:text-white transition-all shadow-xs"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-bold bg-zinc-100 dark:bg-zinc-800 rounded-full w-5 h-5 flex items-center justify-center"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 touch-pan-both overscroll-x-contain">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                filterType === "all"
                  ? "bg-[#D70F64] text-white shadow-md shadow-pink-500/20"
                  : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              All Items ({dishes.length})
            </button>
            <button
              onClick={() => setFilterType(filterType === "bestsellers" ? "all" : "bestsellers")}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                filterType === "bestsellers"
                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                  : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-500" /> Bestsellers
            </button>
          </div>

        </div>
      </div>

      {/* Sticky Category Navigation Strip */}
      {!searchQuery && allNavCategories.length > 0 && (
        <div className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-y border-zinc-200/80 dark:border-zinc-800 shadow-xs mt-6">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex overflow-x-auto scrollbar-none py-2.5 gap-2 items-center touch-pan-both overscroll-x-contain" ref={scrollRef}>
              {allNavCategories.map(cat => {
                const isBestsellerTab = cat === "🔥 Bestsellers";
                const count = isBestsellerTab ? bestsellerDishes.length : dishes.filter(d => d.category === cat).length;
                const isActive = activeCategory === cat;
                const emoji = isBestsellerTab ? "🔥" : getCategoryEmoji(cat);

                return (
                  <button
                    key={cat}
                    ref={el => categoryButtonRefs.current[cat] = el}
                    onClick={() => scrollToCategory(cat)}
                    className={`relative whitespace-nowrap px-4 py-2 rounded-2xl text-xs font-black transition-colors flex items-center gap-2 cursor-pointer select-none ${
                      isActive 
                        ? "text-white" 
                        : (isBestsellerTab 
                            ? "bg-amber-500/15 dark:bg-amber-500/25 text-amber-700 dark:text-amber-400 border border-amber-500/40 hover:bg-amber-500/30" 
                            : "bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800")
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeCategoryTab"
                        className={`absolute inset-0 rounded-2xl shadow-md ${
                          isBestsellerTab 
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/30" 
                            : "bg-[#D70F64] shadow-pink-500/25"
                        }`}
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10 text-sm">{emoji}</span>
                    <span className="relative z-10">{isBestsellerTab ? "Bestsellers" : cat}</span>
                    <span className={`relative z-10 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      isActive 
                        ? "bg-white/20 text-white" 
                        : (isBestsellerTab ? "bg-amber-500/20 text-amber-800 dark:text-amber-300" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300")
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Menu Categories & Items Grid */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        {searchQuery || filterType !== "all" ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#D70F64]" />
                Filtered Menu Items ({filteredDishes.length})
              </h2>
              {(searchQuery || filterType !== "all") && (
                <button 
                  onClick={() => { setSearchQuery(""); setFilterType("all"); }}
                  className="text-xs text-[#D70F64] font-black hover:underline cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {filteredDishes.length === 0 ? (
              <div className="py-12 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8">
                <div className="text-4xl mb-2">🔍</div>
                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No dishes match your criteria</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Try clearing search keywords or changing category filters.</p>
              </div>
            ) : (
              <CategoryDishGridBatch
                dishes={filteredDishes}
                isClosed={isRestaurantClosed}
                getDishQuantityInCart={getDishQuantityInCart}
                favoriteDishIds={favoriteDishIds}
                toggleFavorite={toggleFavorite}
                onAddToCart={onAddToCart}
                setActiveDetailDish={setActiveDetailDish}
              />
            )}
          </div>
        ) : (
          <>
            {/* Dedicated Bestsellers Section at the top */}
            {hasBestsellers && (
              <div 
                ref={el => categoryRefs.current["🔥 Bestsellers"] = el}
                className="mb-10 scroll-mt-32"
              >
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-amber-500/30">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl p-2 bg-amber-100 dark:bg-amber-950/60 rounded-2xl border border-amber-300 dark:border-amber-800 shadow-xs">
                      🔥
                    </span>
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 tracking-tight flex items-center gap-2">
                        Popular Bestsellers
                        <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9.5px] uppercase font-black px-2 py-0.5 rounded-full shadow-xs">
                          🔥 Must Try
                        </span>
                      </h2>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                        {bestsellerDishes.length} top rated & most ordered item{bestsellerDishes.length > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex overflow-x-auto gap-4 pb-3 pt-1 -mx-4 px-4 scrollbar-none snap-x touch-pan-both overscroll-x-contain">
                  {bestsellerDishes.map(dish => (
                    <div key={`bestseller-${dish.id}`} className="w-[280px] sm:w-[320px] shrink-0 snap-start">
                      <DishCard 
                        dish={dish} 
                        onAdd={() => setActiveDetailDish(dish)} 
                        isClosed={isRestaurantClosed} 
                        quantityInCart={getDishQuantityInCart(dish.id)}
                        isFavorite={favoriteDishIds.includes(dish.id)}
                        onToggleFavorite={() => toggleFavorite(dish.id)}
                        onQuickAdd={(qty) => onAddToCart(dish, qty)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {categories.map(cat => {
            const catDishes = dishes.filter(d => d.category === cat);
            if (catDishes.length === 0) return null;
            const emoji = getCategoryEmoji(cat);

            return (
              <div 
                key={cat} 
                ref={el => categoryRefs.current[cat] = el}
                className="mb-10 scroll-mt-32"
              >
                {/* Category Header */}
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl p-2 bg-pink-50 dark:bg-pink-950/40 rounded-2xl border border-pink-100 dark:border-pink-900/40">
                      {emoji}
                    </span>
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                        {cat}
                      </h2>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                        {catDishes.length} fresh item{catDishes.length > 1 ? "s" : ""} available
                      </p>
                    </div>
                  </div>
                </div>

                {/* Items Grid with Lazy Batch Loading */}
                <CategoryDishGridBatch
                  dishes={catDishes}
                  isClosed={isRestaurantClosed}
                  getDishQuantityInCart={getDishQuantityInCart}
                  favoriteDishIds={favoriteDishIds}
                  toggleFavorite={toggleFavorite}
                  onAddToCart={onAddToCart}
                  setActiveDetailDish={setActiveDetailDish}
                />
              </div>
            );
          })}
        </>
        )}
      </div>

      {/* Floating Bottom Cart Bar */}
      {cartCountTotal > 0 && (
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-[72px] lg:bottom-6 left-4 right-4 z-40 max-w-4xl mx-auto"
        >
          <button 
            onClick={onViewCart}
            className="w-full bg-[#D70F64] hover:bg-[#c00c58] text-white p-4 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-2xl shadow-pink-500/40 transition-all flex items-center justify-between border border-pink-400/40 backdrop-blur-md cursor-pointer active:scale-98 group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 px-3 py-1.5 rounded-xl flex items-center justify-center text-xs font-black">
                {cartCountTotal} {cartCountTotal === 1 ? 'Item' : 'Items'}
              </div>
              <span className="font-mono text-sm sm:text-base font-black">Rs. {cartPriceTotal}</span>
            </div>

            <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm tracking-wider">
              <span>View Cart & Checkout</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </motion.div>
      )}

      {/* Food Item Detail Modal */}
      {activeDetailDish && (
        <FoodDetailModal 
          dish={activeDetailDish} 
          onClose={() => setActiveDetailDish(null)}
          isActiveDetailDishClosed={false}
          onAddToCart={(item, qty, opts) => {
            onAddToCart(item, qty, opts);
            setActiveDetailDish(null);
          }}
        />
      )}
    </div>
  );
}

// Professional Dish Card Component
const DishCard = React.memo(function DishCard({ 
  dish, 
  onAdd, 
  isClosed,
  quantityInCart,
  isFavorite,
  onToggleFavorite,
  onQuickAdd
}: { 
  key?: React.Key;
  dish: Dish;
  onAdd: () => void; 
  isClosed?: boolean;
  quantityInCart?: number;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onQuickAdd?: (qty: number) => void;
}) {
  const hasOptions = (dish.sizes && dish.sizes.length > 0) || (dish.flavors && dish.flavors.length > 0) || (dish.addOns && dish.addOns.length > 0);
  const isAvailable = dish.isAvailable !== false && !isClosed;
  const isBestseller = Boolean(dish.isBestseller);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`group relative flex gap-3 sm:gap-4 p-3.5 sm:p-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/90 rounded-3xl shadow-xs hover:shadow-md transition-all duration-200 ${
        !isAvailable ? "opacity-60 grayscale-[15%]" : "hover:border-pink-200 dark:hover:border-pink-900/60"
      }`}
    >
      {/* Left Info Column */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          {/* Badges */}
          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
            {/* Veg / Non-Veg Indicator Dot */}
            <span 
              className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center shrink-0 ${
                dish.isVeg 
                  ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" 
                  : "border-rose-600 bg-rose-50 dark:bg-rose-950/40"
              }`}
              title={dish.isVeg ? "Vegetarian" : "Non-Vegetarian"}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${dish.isVeg ? "bg-emerald-600" : "bg-rose-600"}`} />
            </span>

            {isBestseller && (
              <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1 border border-amber-200 dark:border-amber-800">
                <Flame className="w-3 h-3 fill-amber-500 text-amber-500" /> Bestseller
              </span>
            )}

            {!dish.isAvailable && (
              <span className="bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider">
                Sold Out
              </span>
            )}
          </div>

          {/* Dish Name */}
          <h3 
            onClick={onAdd}
            className="font-black text-zinc-900 dark:text-white text-sm sm:text-base leading-snug group-hover:text-[#D70F64] transition-colors cursor-pointer line-clamp-2"
          >
            {dish.name}
          </h3>

          {/* Description */}
          {dish.description && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed font-medium">
              {dish.description}
            </p>
          )}
        </div>

        {/* Price & Options Tag */}
        <div className="mt-3 flex items-center justify-between flex-wrap gap-2 pt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="font-black text-[#D70F64] text-sm sm:text-base">
              Rs. {dish.price}
            </span>
            {dish.discountPrice && dish.discountPrice < dish.price && (
              <span className="text-xs text-zinc-400 line-through font-semibold">
                Rs. {dish.price}
              </span>
            )}
            {hasOptions && (
              <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                • Custom
              </span>
            )}
          </div>

          {quantityInCart && quantityInCart > 0 ? (
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              {quantityInCart} in cart
            </span>
          ) : null}
        </div>
      </div>

      {/* Right Image & Action Box */}
      <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 flex flex-col items-center">
        {/* Image Box */}
        <div 
          onClick={onAdd}
          className="w-full h-full rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 shadow-xs relative cursor-pointer group-hover:scale-[1.02] transition-transform duration-300"
        >
          {dish.imageUrl ? (
            <LazyImage src={dish.imageUrl} alt={dish.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
              <span className="text-xl mb-1">🍔</span>
              <span className="text-[9px] font-bold uppercase tracking-wider">Dadu Express</span>
            </div>
          )}

          {/* Wishlist Heart Button */}
          {onToggleFavorite && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm text-zinc-600 dark:text-zinc-300 hover:text-[#D70F64] transition-colors shadow-xs"
              title="Add to favorites"
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? "fill-[#D70F64] text-[#D70F64]" : ""}`} />
            </button>
          )}
        </div>

        {/* ADD Button or Quantity Stepper */}
        <div className="absolute -bottom-2 sm:-bottom-3 inset-x-1 flex justify-center z-10">
          {isAvailable ? (
            quantityInCart && quantityInCart > 0 ? (
              <div className="bg-[#D70F64] text-white px-2 py-1 rounded-2xl font-black text-xs shadow-lg shadow-pink-500/30 flex items-center justify-between gap-2 border border-pink-400/40 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200 min-w-[90px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onQuickAdd) onQuickAdd(-1);
                  }}
                  className="w-6 h-6 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-black transition-colors cursor-pointer active:scale-90"
                  title="Remove one"
                >
                  <Minus className="w-3.5 h-3.5 stroke-[3]" />
                </button>
                <span className="font-mono text-xs font-black px-1">{quantityInCart}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasOptions) {
                      onAdd();
                    } else if (onQuickAdd) {
                      onQuickAdd(1);
                    }
                  }}
                  className="w-6 h-6 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-black transition-colors cursor-pointer active:scale-90"
                  title="Add another"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              </div>
            ) : hasOptions ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd();
                }}
                className="bg-white dark:bg-zinc-800 border-2 border-[#D70F64] text-[#D70F64] dark:text-pink-400 hover:bg-[#D70F64] hover:text-white px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-pink-500/10 transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer group/btn"
              >
                <span>ADD</span>
                <Plus className="w-3.5 h-3.5 stroke-[3] group-hover/btn:rotate-90 transition-transform duration-200" />
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onQuickAdd) {
                    onQuickAdd(1);
                  } else {
                    onAdd();
                  }
                }}
                className="bg-[#D70F64] hover:bg-[#b00c50] text-white px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-pink-500/25 transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer group/btn"
              >
                <span>ADD</span>
                <Plus className="w-3.5 h-3.5 stroke-[3] group-hover/btn:rotate-90 transition-transform duration-200" />
              </button>
            )
          ) : (
            <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-500 text-[10px] font-black uppercase px-2.5 py-1 rounded-xl border border-zinc-300 dark:border-zinc-700">
              Unavailable
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
});
