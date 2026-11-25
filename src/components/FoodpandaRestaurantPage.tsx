import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  Heart,
  Search,
  Star,
  MapPin,
  Clock,
  Sparkles,
  Flame,
  Plus,
  Minus,
  Share2,
  BadgeCheck,
  Info,
  ShoppingBag,
  Store,
  ChevronRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Dish, Order, OrderItem, SystemSettings } from "../types";
import { getDefaultRestaurantImage } from "../data";
import { LazyImage } from "./LazyImage";
import FoodDetailModal from "./FoodDetailModal";
import { getShopOpenStatus, getShopProfile, isDishVeg } from "../utils/catalogNormalizer";

interface FoodpandaRestaurantPageProps {
  restaurantName: string;
  dishes: Dish[];
  deliverySettings?: SystemSettings;
  orders?: Order[];
  initialCategory?: string;
  isRestaurantClosed?: boolean;
  bgImageUrl?: string;
  onBack: () => void;
  onAddToCart: (
    dish: Dish,
    quantityToAdd?: number,
    options?: {
      size?: string;
      flavor?: string;
      addOns?: { name: string; price: number }[];
      specialInstructions?: string;
    }
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
  const [visibleCount, setVisibleCount] = useState(24);
  const visibleItems = dishes.slice(0, visibleCount);
  const remaining = dishes.length - visibleItems.length;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
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

      {remaining > 0 && (
        <div className="py-5 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + 24)}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white dark:bg-[#14141A] border border-[#E21B70]/45 text-[#E21B70] dark:text-[#FF4D94] hover:bg-[#E21B70] hover:text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Show {Math.min(remaining, 24)} More Items ({remaining} remaining)
          </button>
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
  if (cat.includes("biryani") || cat.includes("rice") || cat.includes("pulao") || cat.includes("desi")) return "🍛";
  if (cat.includes("chicken") || cat.includes("karahi") || cat.includes("barbecue") || cat.includes("bbq") || cat.includes("broast")) return "🍗";
  if (cat.includes("roll") || cat.includes("shawarma") || cat.includes("wrap")) return "🌯";
  if (cat.includes("dessert") || cat.includes("sweet") || cat.includes("ice cream")) return "🍦";
  if (cat.includes("deal") || cat.includes("combo") || cat.includes("offer") || cat.includes("special")) return "⭐";
  if (cat.includes("fries") || cat.includes("side") || cat.includes("snack")) return "🍟";
  if (cat.includes("tea") || cat.includes("coffee") || cat.includes("chai")) return "☕";
  if (cat.includes("pasta") || cat.includes("lasagna")) return "🍝";
  if (cat.includes("sandwich")) return "🥪";
  if (cat.includes("paratha")) return "🫓";
  return "🍽️";
};

export default function FoodpandaRestaurantPage({
  restaurantName,
  dishes,
  deliverySettings,
  orders = [],
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
  distanceDisplay,
}: FoodpandaRestaurantPageProps) {
  const shopProfile = getShopProfile(restaurantName, deliverySettings, dishes, orders);
  const openStatus = getShopOpenStatus(restaurantName, deliverySettings, isRestaurantClosed);

  const categories = Array.from(new Set(dishes.map((d) => d.category)));
  const explicitBestsellers = dishes.filter((d) => Boolean(d.isBestseller));
  const bestsellerDishes = (() => {
    const picked = new Map<string, Dish>();
    for (const d of explicitBestsellers) picked.set(d.id, d);
    if (picked.size < 4 && dishes.length > 4) {
      for (const cat of categories) {
        if (picked.size >= 6) break;
        const candidate = dishes.find(
          (d) => d.category === cat && !picked.has(d.id) && d.isAvailable !== false
        );
        if (candidate) picked.set(candidate.id, candidate);
      }
    }
    return Array.from(picked.values()).slice(0, 6);
  })();
  const hasBestsellers = bestsellerDishes.length >= 3;
  const allNavCategories = hasBestsellers ? ["🔥 Bestsellers", ...categories] : categories;

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(
    initialCategory || allNavCategories[0] || ""
  );
  const [activeDetailDish, setActiveDetailDish] = useState<Dish | null>(null);
  const [filterType, setFilterType] = useState<"all" | "bestsellers">("all");
  const [copiedLink, setCopiedLink] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeCategory && allNavCategories.length > 0) {
      setActiveCategory(allNavCategories[0]);
    }
  }, [allNavCategories, activeCategory]);

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
      window.scrollTo({ top: y, behavior: "smooth" });
    }
    setTimeout(() => {
      isManualScrollingRef.current = false;
    }, 700);
  };

  useEffect(() => {
    if (initialCategory && allNavCategories.includes(initialCategory)) {
      setTimeout(() => {
        scrollToCategory(initialCategory);
      }, 280);
    }
  }, []);

  useEffect(() => {
    let requestRunning = false;

    const handleScroll = () => {
      if (
        requestRunning ||
        isManualScrollingRef.current ||
        searchQuery ||
        filterType !== "all" ||
        allNavCategories.length === 0
      )
        return;

      requestRunning = true;
      requestAnimationFrame(() => {
        requestRunning = false;

        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
          const lastCat = allNavCategories[allNavCategories.length - 1];
          if (lastCat && activeCategory !== lastCat) {
            setActiveCategory(lastCat);
          }
          return;
        }

        const triggerPoint = 160;
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

  useEffect(() => {
    if (activeCategory && categoryButtonRefs.current[activeCategory] && scrollRef.current) {
      const container = scrollRef.current;
      const btn = categoryButtonRefs.current[activeCategory];
      if (btn && container) {
        const targetScrollLeft =
          btn.offsetLeft - container.clientWidth / 2 + btn.clientWidth / 2;
        container.scrollTo({
          left: Math.max(0, targetScrollLeft),
          behavior: "smooth",
        });
      }
    }
  }, [activeCategory]);

  const filteredDishes = dishes.filter((d) => {
    const q = (searchQuery || "").trim().toLowerCase();
    const matchesSearch =
      !q ||
      (d.name || "").toLowerCase().includes(q) ||
      (d.description || "").toLowerCase().includes(q) ||
      (d.category || "").toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (filterType === "bestsellers") {
      return Boolean(d.isBestseller);
    }
    return true;
  });

  const restaurantImageUrl =
    deliverySettings?.restaurantStatuses?.[restaurantName]?.imageUrl ||
    deliverySettings?.restaurantStatuses?.[restaurantName]?.bgImageUrl ||
    dishes.find((d) => d.imageUrl)?.imageUrl ||
    getDefaultRestaurantImage(restaurantName);

  const restaurantCoverUrl =
    bgImageUrl ||
    deliverySettings?.restaurantStatuses?.[restaurantName]?.bgImageUrl ||
    deliverySettings?.restaurantStatuses?.[restaurantName]?.imageUrl ||
    dishes.find((d) => d.imageUrl)?.imageUrl ||
    getDefaultRestaurantImage(restaurantName);

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: restaurantName,
          text: `Order fresh food from ${restaurantName} on Dadu Food!`,
          url: window.location.href,
        })
        .catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const getDishQuantityInCart = (dishId: string) => {
    return cartItems
      .filter((item) => item.dishId === dishId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  const deliveryFeeString = (() => {
    let chargeStr = deliverySettings?.restaurantStatuses?.[restaurantName]?.deliveryCharge;
    if (!chargeStr) {
      chargeStr = `Rs. ${shopProfile.deliveryFee}`;
    }
    if (isRiderRangeExceeded) {
      const match = chargeStr.match(/\d+/);
      if (match) {
        return chargeStr.replace(match[0], String(parseInt(match[0], 10) * 2));
      }
    }
    return chargeStr;
  })();

  // Clean distance display — never render "Nearby"
  const cleanDistance =
    distanceDisplay && distanceDisplay.toLowerCase() !== "nearby" ? distanceDisplay : null;

  return (
    <div className="min-h-screen bg-[#F9F9FB] dark:bg-[#0B0B0F] text-[#14141A] dark:text-[#F5F5F8] font-sans pb-36 transition-colors duration-200 overflow-x-clip">
      {/* Hero Cover Header */}
      <div className="relative h-48 sm:h-64 w-full overflow-hidden bg-[#14141A]">
        {restaurantCoverUrl ? (
          <LazyImage
            src={restaurantCoverUrl}
            alt={restaurantName}
            className="w-full h-full"
            imgClassName="w-full h-full object-cover opacity-85"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#E21B70]">
            <Store className="w-20 h-20 text-white/25" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-[#0B0B0F]/45 to-black/30" />

        {/* Top Control Bar (>=44px touch targets) */}
        <div className="absolute top-3.5 left-3.5 right-3.5 z-20 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="w-11 h-11 bg-white/95 dark:bg-[#14141A]/95 backdrop-blur-md rounded-full text-[#14141A] dark:text-white shadow-md hover:bg-white transition flex items-center justify-center cursor-pointer active:scale-95"
            aria-label="Back to restaurants"
            title="Go back"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="w-11 h-11 bg-white/95 dark:bg-[#14141A]/95 backdrop-blur-md rounded-full text-[#14141A] dark:text-white shadow-md hover:bg-white transition flex items-center justify-center cursor-pointer active:scale-95 relative"
            aria-label="Share restaurant"
            title="Share store"
          >
            <Share2 className="w-4 h-4 stroke-[2.2]" />
            {copiedLink && (
              <span className="absolute -bottom-8 right-0 bg-[#14141A] text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-md whitespace-nowrap">
                Link Copied
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Floating Main Restaurant Profile Card */}
      <div className="max-w-4xl mx-auto px-3.5 sm:px-4 -mt-14 sm:-mt-16 relative z-20">
        <div className="bg-white dark:bg-[#14141A] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-[#E6E6EE] dark:border-[#272733]">
          <div className="flex items-start gap-3.5 sm:gap-4">
            {/* Avatar Logo */}
            <div className="w-18 h-18 sm:w-22 sm:h-22 bg-white dark:bg-[#1D1D26] rounded-2xl shadow-sm border border-[#E6E6EE] dark:border-[#272733] overflow-hidden shrink-0 relative">
              {restaurantImageUrl ? (
                <LazyImage
                  src={restaurantImageUrl}
                  alt={restaurantName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#E21B70] flex items-center justify-center text-white font-extrabold text-xl">
                  {restaurantName.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div
                className="absolute bottom-1 right-1 bg-[#E21B70] text-white rounded-full p-0.5 shadow-xs"
                title="Verified Dadu Food Partner"
              >
                <BadgeCheck className="w-3.5 h-3.5 fill-white text-[#E21B70]" />
              </div>
            </div>

            {/* Info + Live Open/Closed Status */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#14141A] dark:text-[#F5F5F8] leading-tight">
                  {restaurantName}
                </h1>
                {openStatus.isOpen ? (
                  <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border border-emerald-200 dark:border-emerald-800 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Open · {openStatus.detail}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border border-red-200 dark:border-red-800 shrink-0">
                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Closed · {openStatus.detail}</span>
                  </span>
                )}
              </div>
              <p className="speakable-summary text-xs sm:text-sm text-[#5A5A6B] dark:text-[#A1A1B2] font-medium mt-1 leading-relaxed">
                {shopProfile.oneLineDescription}
              </p>
            </div>
          </div>

          {/* Honest Quick Metrics Bar (No invented ratings or "Nearby") */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4 pt-4 border-t border-[#EFEFF5] dark:border-[#23232E]">
            {/* Honest Rating or Menu Count */}
            <div className="bg-[#F9F9FB] dark:bg-[#1B1B23] p-2.5 sm:p-3 rounded-xl flex items-center gap-2 border border-[#E6E6EE] dark:border-[#272733] min-w-0">
              <div className="p-1.5 rounded-lg bg-[#FDF2F6] dark:bg-[#2A121D] text-[#E21B70] dark:text-[#FF4D94] shrink-0">
                {shopProfile.rating ? (
                  <Star className="w-4 h-4 fill-current" />
                ) : (
                  <Store className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                {shopProfile.rating && shopProfile.reviewCount > 0 ? (
                  <>
                    <span className="block text-xs font-extrabold text-[#14141A] dark:text-white truncate tabular-nums">
                      {shopProfile.rating} / 5
                    </span>
                    <span className="block text-[10px] text-[#5A5A6B] dark:text-[#A1A1B2] font-medium truncate">
                      {shopProfile.reviewCount} verified {shopProfile.reviewCount === 1 ? "rating" : "ratings"}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="block text-xs font-extrabold text-[#14141A] dark:text-white truncate tabular-nums">
                      {dishes.length} {dishes.length === 1 ? "Item" : "Items"}
                    </span>
                    <span className="block text-[10px] text-[#5A5A6B] dark:text-[#A1A1B2] font-medium truncate">
                      Fresh Menu
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Delivery Time */}
            <div className="bg-[#F9F9FB] dark:bg-[#1B1B23] p-2.5 sm:p-3 rounded-xl flex items-center gap-2 border border-[#E6E6EE] dark:border-[#272733] min-w-0">
              <div className="p-1.5 rounded-lg bg-[#FDF2F6] dark:bg-[#2A121D] text-[#E21B70] dark:text-[#FF4D94] shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-extrabold text-[#14141A] dark:text-white truncate tabular-nums">
                  {shopProfile.deliveryTime}
                </span>
                <span className="block text-[10px] text-[#5A5A6B] dark:text-[#A1A1B2] font-medium truncate">
                  Est. Delivery
                </span>
              </div>
            </div>

            {/* Delivery Fee (Never labelled "Nearby") */}
            <div className="bg-[#F9F9FB] dark:bg-[#1B1B23] p-2.5 sm:p-3 rounded-xl flex items-center gap-2 border border-[#E6E6EE] dark:border-[#272733] min-w-0">
              <div className="p-1.5 rounded-lg bg-[#FDF2F6] dark:bg-[#2A121D] text-[#E21B70] dark:text-[#FF4D94] shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-extrabold text-[#14141A] dark:text-white truncate tabular-nums">
                  {deliveryFeeString}
                </span>
                <span className="block text-[10px] text-[#5A5A6B] dark:text-[#A1A1B2] font-medium truncate">
                  {cleanDistance ? `Fee · ${cleanDistance}` : "Delivery Fee"}
                </span>
              </div>
            </div>

            {/* Min Order (Honest: only show amount if configured) */}
            <div className="bg-[#F9F9FB] dark:bg-[#1B1B23] p-2.5 sm:p-3 rounded-xl flex items-center gap-2 border border-[#E6E6EE] dark:border-[#272733] min-w-0">
              <div className="p-1.5 rounded-lg bg-[#FDF2F6] dark:bg-[#2A121D] text-[#E21B70] dark:text-[#FF4D94] shrink-0">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-extrabold text-[#14141A] dark:text-white truncate tabular-nums">
                  {shopProfile.minOrder ? `Rs. ${shopProfile.minOrder}` : "No Minimum"}
                </span>
                <span className="block text-[10px] text-[#5A5A6B] dark:text-[#A1A1B2] font-medium truncate">
                  Min. Order
                </span>
              </div>
            </div>
          </div>

          {/* Transparent Delivery Fee Policy Notice */}
          <p className="mt-3 text-xs font-medium text-[#5A5A6B] dark:text-[#A1A1B2] bg-[#F9F9FB] dark:bg-[#1B1B23] border border-[#E6E6EE] dark:border-[#272733] rounded-xl px-3 py-2 flex items-center gap-2">
            <Info className="w-4 h-4 text-[#E21B70] shrink-0" />
            <span>
              Delivery fee Rs. {shopProfile.deliveryFee} standard · Doubled below Rs. 500 ·{" "}
              <strong className="text-[#14141A] dark:text-white">Free above Rs. 1,000</strong>
            </span>
          </p>
        </div>
      </div>

      {/* Toolbar: Search & Filter Buttons (>=44px) */}
      <div className="max-w-4xl mx-auto px-3.5 sm:px-4 mt-5">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#717185]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search in ${restaurantName}...`}
              className="w-full min-h-[44px] bg-white dark:bg-[#14141A] border border-[#E6E6EE] dark:border-[#272733] rounded-xl py-2.5 pl-10 pr-10 text-sm font-medium outline-none focus:border-[#E21B70] focus:ring-2 focus:ring-[#E21B70]/20 text-[#14141A] dark:text-white transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 text-xs text-[#5A5A6B] hover:text-[#14141A] dark:hover:text-white font-bold bg-[#F2F2F6] dark:bg-[#1D1D26] rounded-lg flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none touch-pan-both overscroll-x-contain">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer border ${
                filterType === "all"
                  ? "bg-[#E21B70] text-white border-[#E21B70]"
                  : "bg-white dark:bg-[#14141A] text-[#14141A] dark:text-[#F5F5F8] border-[#E6E6EE] dark:border-[#272733]"
              }`}
            >
              All Items ({dishes.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType(filterType === "bestsellers" ? "all" : "bestsellers")}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                filterType === "bestsellers"
                  ? "bg-[#E21B70] text-white border-[#E21B70]"
                  : "bg-white dark:bg-[#14141A] text-[#14141A] dark:text-[#F5F5F8] border-[#E6E6EE] dark:border-[#272733]"
              }`}
            >
              <Flame
                className={`w-3.5 h-3.5 ${
                  filterType === "bestsellers" ? "text-white" : "text-[#E21B70]"
                }`}
              />
              <span>Bestsellers</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Category Navigation Strip */}
      {!searchQuery && allNavCategories.length > 0 && (
        <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#14141A]/95 backdrop-blur-md border-y border-[#E6E6EE] dark:border-[#272733] mt-5">
          <div className="max-w-4xl mx-auto px-3.5 sm:px-4">
            <div
              className="flex overflow-x-auto scrollbar-none py-2 gap-2 items-center touch-pan-both overscroll-x-contain"
              ref={scrollRef}
            >
              {allNavCategories.map((cat) => {
                const isBestsellerTab = cat === "🔥 Bestsellers";
                const count = isBestsellerTab
                  ? bestsellerDishes.length
                  : dishes.filter((d) => d.category === cat).length;
                const isActive = activeCategory === cat;
                const emoji = isBestsellerTab ? "🔥" : getCategoryEmoji(cat);

                return (
                  <button
                    key={cat}
                    type="button"
                    ref={(el) => (categoryButtonRefs.current[cat] = el)}
                    onClick={() => scrollToCategory(cat)}
                    className={`min-h-[44px] whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer select-none border ${
                      isActive
                        ? "bg-[#E21B70] text-white border-[#E21B70]"
                        : "bg-[#F9F9FB] dark:bg-[#1D1D26] text-[#14141A] dark:text-[#F5F5F8] border-[#E6E6EE] dark:border-[#272733]"
                    }`}
                  >
                    <span className="text-sm">{emoji}</span>
                    <span>{isBestsellerTab ? "Bestsellers" : cat}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold tabular-nums ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-[#E6E6EE] dark:bg-[#272733] text-[#5A5A6B] dark:text-[#A1A1B2]"
                      }`}
                    >
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
      <div className="max-w-4xl mx-auto px-3.5 sm:px-4 mt-5">
        {searchQuery || filterType !== "all" ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-extrabold text-[#14141A] dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#E21B70]" />
                <span>Filtered Items ({filteredDishes.length})</span>
              </h2>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setFilterType("all");
                }}
                className="min-h-[40px] px-3 text-xs text-[#E21B70] dark:text-[#FF4D94] font-bold hover:underline cursor-pointer"
              >
                Clear Filters
              </button>
            </div>

            {filteredDishes.length === 0 ? (
              <div className="py-12 text-center bg-white dark:bg-[#14141A] rounded-2xl border border-[#E6E6EE] dark:border-[#272733] p-6">
                <p className="text-sm font-bold text-[#14141A] dark:text-white">
                  No dishes match your search
                </p>
                <p className="text-xs text-[#5A5A6B] dark:text-[#A1A1B2] mt-1">
                  Try clearing keywords or switching back to all items.
                </p>
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
            {hasBestsellers && (
              <div
                ref={(el) => (categoryRefs.current["🔥 Bestsellers"] = el)}
                className="mb-8 scroll-mt-28"
              >
                <div className="flex items-center gap-2.5 mb-3.5 pb-2 border-b border-[#E6E6EE] dark:border-[#272733]">
                  <span className="text-xl w-10 h-10 flex items-center justify-center bg-[#FDF2F6] dark:bg-[#2A121D] rounded-xl">
                    🔥
                  </span>
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-[#14141A] dark:text-white tracking-tight">
                      Popular Bestsellers
                    </h2>
                    <p className="text-xs text-[#5A5A6B] dark:text-[#A1A1B2] font-medium">
                      {bestsellerDishes.length} popular{" "}
                      {bestsellerDishes.length === 1 ? "dish" : "dishes"}
                    </p>
                  </div>
                </div>

                <div className="flex overflow-x-auto gap-3.5 pb-2 -mx-3.5 px-3.5 scrollbar-none snap-x touch-pan-both overscroll-x-contain">
                  {bestsellerDishes.map((dish) => (
                    <div
                      key={`bestseller-${dish.id}`}
                      className="w-[290px] sm:w-[320px] shrink-0 snap-start"
                    >
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

            {categories.map((cat) => {
              const catDishes = dishes.filter((d) => d.category === cat);
              if (catDishes.length === 0) return null;
              const emoji = getCategoryEmoji(cat);

              return (
                <div
                  key={cat}
                  ref={(el) => (categoryRefs.current[cat] = el)}
                  className="mb-8 scroll-mt-28"
                >
                  <div className="flex items-center gap-2.5 mb-3.5 pb-2 border-b border-[#E6E6EE] dark:border-[#272733]">
                    <span className="text-xl w-10 h-10 flex items-center justify-center bg-[#FDF2F6] dark:bg-[#2A121D] rounded-xl">
                      {emoji}
                    </span>
                    <div>
                      <h2 className="text-base sm:text-lg font-extrabold text-[#14141A] dark:text-white tracking-tight">
                        {cat}
                      </h2>
                      <p className="text-xs text-[#5A5A6B] dark:text-[#A1A1B2] font-medium tabular-nums">
                        {`${catDishes.length} fresh ${catDishes.length === 1 ? "item" : "items"} available`}
                      </p>
                    </div>
                  </div>

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

      {/* Floating Sticky Cart Bar (Compact <=15% mobile sticky cap, >=48px touch target) */}
      {cartCountTotal > 0 && (
        <div className="fixed bottom-[68px] lg:bottom-5 left-3.5 right-3.5 z-40 max-w-4xl mx-auto">
          <button
            type="button"
            onClick={onViewCart}
            className="w-full min-h-[52px] bg-[#E21B70] hover:bg-[#C2145E] text-white px-4 py-3 rounded-2xl font-bold text-sm shadow-lg transition flex items-center justify-between cursor-pointer active:scale-[0.99] group"
          >
            <div className="flex items-center gap-2.5">
              <span className="bg-white/20 px-2.5 py-1 rounded-lg text-xs font-bold tabular-nums">
                {cartCountTotal} {cartCountTotal === 1 ? "Item" : "Items"}
              </span>
              <span className="font-mono text-sm sm:text-base font-extrabold tabular-nums">
                Rs. {cartPriceTotal}
              </span>
            </div>

            <div className="flex items-center gap-1 font-bold text-xs sm:text-sm">
              <span>View Cart</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>
      )}

      {activeDetailDish && (
        <FoodDetailModal
          dish={activeDetailDish}
          onClose={() => setActiveDetailDish(null)}
          isActiveDetailDishClosed={Boolean(isRestaurantClosed)}
          onAddToCart={(item, qty, opts) => {
            onAddToCart(item, qty, opts);
            setActiveDetailDish(null);
          }}
        />
      )}
    </div>
  );
}

const DishCard = React.memo(function DishCard({
  dish,
  onAdd,
  isClosed,
  quantityInCart,
  isFavorite,
  onToggleFavorite,
  onQuickAdd,
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
  const hasOptions =
    (dish.sizes && dish.sizes.length > 0) ||
    (dish.flavors && dish.flavors.length > 0) ||
    (dish.addOns && dish.addOns.length > 0);
  const isAvailable = dish.isAvailable !== false && !isClosed;
  const veg = isDishVeg(dish);

  return (
    <div
      className={`group relative flex gap-3 p-3.5 bg-white dark:bg-[#14141A] border border-[#E6E6EE] dark:border-[#272733] rounded-2xl shadow-2xs hover:shadow-sm transition-all duration-200 ${
        !isAvailable ? "opacity-65 grayscale-[15%]" : "hover:border-[#E21B70]/45"
      }`}
    >
      {/* Left Info Column */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span
              className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
                veg
                  ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
                  : "border-rose-600 bg-rose-50 dark:bg-rose-950/40"
              }`}
              title={veg ? "Vegetarian" : "Non-Vegetarian"}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  veg ? "bg-emerald-600" : "bg-rose-600"
                }`}
              />
            </span>
            {dish.isBestseller && (
              <span className="text-[10px] font-bold text-[#E21B70] dark:text-[#FF4D94] uppercase tracking-wide">
                Bestseller
              </span>
            )}
            {!dish.isAvailable && (
              <span className="text-[10px] font-bold text-[#DC2626] uppercase tracking-wide">
                Sold Out
              </span>
            )}
          </div>

          <h3
            onClick={onAdd}
            className="font-bold text-[#14141A] dark:text-white text-sm sm:text-[15px] leading-snug group-hover:text-[#E21B70] transition-colors cursor-pointer line-clamp-2"
          >
            {dish.name}
          </h3>

          {dish.description && (
            <p className="text-xs text-[#5A5A6B] dark:text-[#A1A1B2] mt-1 line-clamp-2 leading-relaxed">
              {dish.description}
            </p>
          )}
        </div>

        <div className="mt-2.5 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono font-extrabold text-[#E21B70] dark:text-[#FF4D94] text-sm tabular-nums">
              Rs.{" "}
              {dish.discountPrice && dish.discountPrice < dish.price
                ? dish.discountPrice
                : dish.price}
            </span>
            {dish.discountPrice && dish.discountPrice < dish.price && (
              <span className="font-mono text-xs text-[#717185] line-through tabular-nums">
                Rs. {dish.price}
              </span>
            )}
          </div>

          {quantityInCart && quantityInCart > 0 ? (
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
              {quantityInCart} in cart
            </span>
          ) : null}
        </div>
      </div>

      {/* Right Image & Action Box */}
      <div className="relative w-26 h-26 sm:w-30 sm:h-30 shrink-0 flex flex-col items-center">
        <div
          onClick={onAdd}
          className="w-full h-full rounded-xl overflow-hidden bg-[#F2F2F6] dark:bg-[#1D1D26] border border-[#E6E6EE] dark:border-[#272733] relative cursor-pointer"
        >
          {dish.imageUrl ? (
            <LazyImage
              src={dish.imageUrl}
              alt={`${dish.name} from ${dish.restaurantName || "Dadu Food"}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#1D1D26] text-white text-xs font-bold">
              DADU FOOD
            </div>
          )}

          {onToggleFavorite && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              className="absolute top-1 right-1 w-9 h-9 rounded-full bg-white/90 dark:bg-[#14141A]/90 text-[#5A5A6B] hover:text-[#E21B70] transition flex items-center justify-center cursor-pointer"
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  isFavorite ? "fill-[#E21B70] text-[#E21B70]" : ""
                }`}
              />
            </button>
          )}
        </div>

        {/* ADD Button or Quantity Stepper (>=40px interactive control) */}
        <div className="absolute -bottom-2 inset-x-0.5 flex justify-center z-10">
          {isAvailable ? (
            quantityInCart && quantityInCart > 0 ? (
              <div className="bg-[#E21B70] text-white px-1.5 py-1 rounded-xl font-bold text-xs shadow-md flex items-center justify-between gap-1.5 min-w-[96px]">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onQuickAdd) onQuickAdd(-1);
                  }}
                  aria-label="Remove one"
                  className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer active:scale-90"
                >
                  <Minus className="w-3.5 h-3.5 stroke-[2.8]" />
                </button>
                <span className="font-mono text-xs font-bold tabular-nums px-1">
                  {quantityInCart}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasOptions) {
                      onAdd();
                    } else if (onQuickAdd) {
                      onQuickAdd(1);
                    }
                  }}
                  aria-label="Add one more"
                  className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer active:scale-90"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.8]" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasOptions) {
                    onAdd();
                  } else if (onQuickAdd) {
                    onQuickAdd(1);
                  } else {
                    onAdd();
                  }
                }}
                className={`min-h-[38px] px-4 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center gap-1 active:scale-95 cursor-pointer ${
                  hasOptions
                    ? "bg-white dark:bg-[#14141A] border-2 border-[#E21B70] text-[#E21B70] dark:text-[#FF4D94] hover:bg-[#E21B70] hover:text-white"
                    : "bg-[#E21B70] hover:bg-[#C2145E] text-white"
                }`}
              >
                <span>Add</span>
                <Plus className="w-3.5 h-3.5 stroke-[2.8]" />
              </button>
            )
          ) : (
            <span className="bg-[#E6E6EE] dark:bg-[#272733] text-[#5A5A6B] dark:text-[#A1A1B2] text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg">
              Unavailable
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
