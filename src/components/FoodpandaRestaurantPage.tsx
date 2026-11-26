import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ChevronLeft,
  Heart,
  Search,
  Star,
  MapPin,
  Clock,
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
  ChefHat,
  ClipboardCheck,
  Timer,
  LayoutGrid,
} from "lucide-react";
import { Dish, Order, OrderItem, SystemSettings } from "../types";
import { getDefaultRestaurantImage } from "../data";
import { LazyImage } from "./LazyImage";
import FoodDetailModal from "./FoodDetailModal";
import { getShopOpenStatus, getShopProfile, isDishVeg } from "../utils/catalogNormalizer";
import { slugifyShop } from "../utils/seoManager";

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
  onOpenShop?: (restaurantName: string) => void;
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
  // Reset the "Show more" pagination when a different dish set is shown
  // (category / search / filter change) instead of carrying the old count over.
  const dishSignature = dishes.map((d) => d.id).join("|");
  const firstSignatureRef = useRef(dishSignature);
  useEffect(() => {
    if (firstSignatureRef.current !== dishSignature) {
      firstSignatureRef.current = dishSignature;
      setVisibleCount(24);
    }
  }, [dishSignature]);
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
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white dark:bg-[#14141A] border border-[#D70F64]/45 text-[#D70F64] dark:text-[#FF4D94] hover:bg-[#D70F64] hover:text-white font-bold text-xs transition-all duration-300 transition-transform duration-180 active:scale-[0.97] active:brightness-110 cursor-pointer"
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
  onOpenShop,
  toggleFavorite,
  favoriteDishIds,
  isRiderRangeExceeded,
  distanceDisplay,
}: FoodpandaRestaurantPageProps) {
  const shopProfile = getShopProfile(restaurantName, deliverySettings, dishes, orders);
  const openStatus = getShopOpenStatus(restaurantName, deliverySettings, isRestaurantClosed);

  // SEO intro per shop — dish keywords only, using each shop's real menu
  // (see SHOP_DESCRIPTIONS in catalogNormalizer.ts).
  const shopIntro = (() => {
    const n = restaurantName.toLowerCase();
    if (n.includes("bilal"))
      return "S M Bilal Hotel is the place for chicken karahi Dadu and BBQ Dadu — mutton karahi, seekh kababs and fresh tandoori naan, delivered hot across Dadu city in 20–35 minutes. Delivery is Rs 50 and you can pay by Cash on Delivery or Easypaisa.";
    if (n.includes("tasty"))
      return "Tasty Bites Dadu serves pizza in Dadu — creamy pastas, loaded lasagna, grilled sandwiches and fresh pizzas — along with chicken shawarma Dadu orders. Everything is delivered hot in 20–35 minutes for Rs 50, with Cash on Delivery or Easypaisa.";
    if (n.includes("dadu fast food"))
      return "Looking for chicken biryani Dadu or a crispy zinger burger Dadu? Dadu Fast Food & Kitchen serves freshly baked pizzas, zinger burgers and crispy broast across Dadu city, delivered hot in 20–35 minutes for Rs 50. Pay by Cash on Delivery or Easypaisa.";
    return `Order fresh food from ${restaurantName} in Dadu — delivered hot across Dadu city in 20–35 minutes for Rs 50. Pay by Cash on Delivery or Easypaisa.`;
  })();

  // The other Dadu Food partner restaurants, for crawlable cross-links.
  const otherShops = [
    { name: "Dadu Fast Food & Kitchen", label: "Dadu Fast Food & Kitchen — zinger burgers & biryani in Dadu" },
    { name: "S M Bilal Hotel", label: "S M Bilal Hotel — BBQ & karahi in Dadu" },
    { name: "Tasty Bites Dadu", label: "Tasty Bites Dadu — fast food in Dadu" },
  ].filter((s) => s.name !== restaurantName);

  // Memoized so the scroll-spy / centering effects below don't re-subscribe
  // on every render (these arrays previously got a new identity each render).
  const categories = useMemo(
    () => Array.from(new Set(dishes.map((d) => d.category))),
    [dishes]
  );
  const bestsellerDishes = useMemo(() => {
    const picked = new Map<string, Dish>();
    for (const d of dishes) {
      if (d.isBestseller) picked.set(d.id, d);
    }
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
  }, [dishes, categories]);
  const hasBestsellers = bestsellerDishes.length >= 3;
  const allNavCategories = useMemo(
    () => (hasBestsellers ? ["🔥 Bestsellers", ...categories] : categories),
    [hasBestsellers, categories]
  );

  const [searchQuery, setSearchQuery] = useState("");
  // Ignore an initial category this shop doesn't serve (e.g. a cuisine the
  // shop has no dishes for) instead of leaving no tab active.
  const [activeCategory, setActiveCategory] = useState<string>(
    initialCategory && allNavCategories.includes(initialCategory)
      ? initialCategory
      : allNavCategories[0] || ""
  );
  const [activeDetailDish, setActiveDetailDish] = useState<Dish | null>(null);
  const [filterType, setFilterType] = useState<"all" | "bestsellers" | "top_rated">("all");
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

  const initialScrollDoneRef = useRef(false);
  useEffect(() => {
    if (initialScrollDoneRef.current) return;
    if (initialCategory && allNavCategories.includes(initialCategory)) {
      initialScrollDoneRef.current = true;
      const timer = setTimeout(() => {
        scrollToCategory(initialCategory);
      }, 280);
      return () => clearTimeout(timer);
    }
  }, [initialCategory, allNavCategories]);

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

  const bestsellerDishIds = useMemo(
    () => new Set(bestsellerDishes.map((d) => d.id)),
    [bestsellerDishes]
  );

  const filteredDishes = dishes.filter((d) => {
    const q = (searchQuery || "").trim().toLowerCase();
    const matchesSearch =
      !q ||
      (d.name || "").toLowerCase().includes(q) ||
      (d.description || "").toLowerCase().includes(q) ||
      (d.category || "").toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (filterType === "bestsellers") {
      // Match the Bestsellers section (explicit bestsellers + one popular
      // pick per category), not just the explicit flag — otherwise the
      // filter could return 0 items while the section shows dishes.
      return bestsellerDishIds.has(d.id);
    }
    if (filterType === "top_rated") {
      return Boolean(d.isFeatured);
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
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => {
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 2000);
        })
        .catch(() => {});
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
    <div className="min-h-screen bg-[#F9F9FB] dark:bg-[#0B0B0F] text-[#14141A] dark:text-[#F5F5F8] font-sans pb-36 transition-colors duration-200 overflow-x-clip animate-slide-screen">
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
          <div className="w-full h-full flex items-center justify-center bg-[#D70F64]">
            <Store className="w-20 h-20 text-white/25" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-[#0B0B0F]/45 to-black/30" />

        {/* Top Control Bar (>=44px touch targets) */}
        <div className="absolute top-3.5 left-3.5 right-3.5 z-20 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="w-11 h-11 bg-white/95 dark:bg-[#14141A]/95 backdrop-blur-md rounded-full text-[#14141A] dark:text-white shadow-md hover:bg-white transition-transform duration-180 active:scale-[0.97] active:brightness-110 flex items-center justify-center cursor-pointer"
            aria-label="Back to restaurants"
            title="Go back"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="w-11 h-11 bg-white/95 dark:bg-[#14141A]/95 backdrop-blur-md rounded-full text-[#14141A] dark:text-white shadow-md hover:bg-white transition-transform duration-180 active:scale-[0.97] active:brightness-110 flex items-center justify-center cursor-pointer relative"
            aria-label="Share restaurant"
            title="Share store"
          >
            <Share2 className="w-4 h-4 stroke-[2.2]" />
            {copiedLink && (
              <span className="micro-toast-in absolute -bottom-8 right-0 bg-[#14141A] text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-md whitespace-nowrap">
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
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white dark:bg-[#1D1D26] rounded-full shadow-md border-2 border-white dark:border-[#272733] overflow-hidden shrink-0 relative">
              {restaurantImageUrl ? (
                <LazyImage
                  src={restaurantImageUrl}
                  alt={restaurantName}
                  className="w-full h-full"
                  imgClassName="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#D70F64] flex items-center justify-center text-white font-extrabold text-xl">
                  {restaurantName.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div
                className="absolute bottom-0 right-0 bg-[#D70F64] text-white rounded-full p-1.5 shadow-md border-2 border-white dark:border-[#14141A]"
                title="Verified Dadu Food Partner"
              >
                <ChefHat className="w-4 h-4" />
              </div>
            </div>

            {/* Info + Live Open/Closed Status */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#14141A] dark:text-[#F5F5F8] leading-tight">
                  {restaurantName.includes("Dadu") ? restaurantName : `${restaurantName} — Dadu`}
                </h1>
                <BadgeCheck className="w-5 h-5 fill-[#D70F64] text-white shrink-0 mt-0.5" />
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
                {shopProfile.rating && shopProfile.reviewCount > 0 && (
                  <span className="inline-flex flex-col items-center bg-[#FDF2F6] dark:bg-[#2A121D] border border-[#D70F64]/25 rounded-xl px-2.5 py-1 leading-none shrink-0 ml-auto">
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                      <span className="text-sm font-extrabold text-[#14141A] dark:text-white tabular-nums">{shopProfile.rating}</span>
                    </span>
                    <span className="text-[10px] font-bold text-[#D70F64] dark:text-[#FF4D94]">({shopProfile.reviewCount})</span>
                  </span>
                )}
              </div>
              <p className="speakable-summary text-xs sm:text-sm text-[#5A5A6B] dark:text-[#A1A1B2] font-medium mt-1 leading-relaxed">
                {shopProfile.oneLineDescription}
              </p>
              <p className="text-xs sm:text-sm text-[#5A5A6B] dark:text-[#A1A1B2] leading-relaxed mt-2">
                {shopIntro}
              </p>
            </div>
          </div>

          {/* Quick Info Tiles (design: 2x2 pink tiles with chevrons) */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-4 pt-4 border-t border-[#EFEFF5] dark:border-[#23232E]">
            {/* Items */}
            <div className="bg-[#FDF2F6] dark:bg-[#2A121D] p-2 rounded-2xl flex items-center gap-2 border border-[#F9A8C9]/50 dark:border-[#D70F64]/25 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#D70F64] text-white flex items-center justify-center shrink-0 shadow-sm">
                <ChefHat className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[13px] font-extrabold text-[#14141A] dark:text-white truncate tabular-nums">
                  {dishes.length} {dishes.length === 1 ? "Item" : "Items"}
                </span>
                <span className="block text-[11px] text-[#5A5A6B] dark:text-[#A1A1B2] font-medium truncate">
                  Fresh Menu
                </span>
              </div>
            </div>
            {/* Delivery Time */}
            <div className="bg-[#FDF2F6] dark:bg-[#2A121D] p-2 rounded-2xl flex items-center gap-2 border border-[#F9A8C9]/50 dark:border-[#D70F64]/25 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#D70F64] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[13px] font-extrabold text-[#14141A] dark:text-white truncate tabular-nums">
                  {shopProfile.deliveryTime}
                </span>
                <span className="block text-[11px] text-[#5A5A6B] dark:text-[#A1A1B2] font-medium truncate">
                  Est. Delivery
                </span>
              </div>
            </div>
            {/* Delivery Fee */}
            <div className="bg-[#FDF2F6] dark:bg-[#2A121D] p-2 rounded-2xl flex items-center gap-2 border border-[#F9A8C9]/50 dark:border-[#D70F64]/25 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#D70F64] text-white flex items-center justify-center shrink-0 shadow-sm">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[13px] font-extrabold text-[#14141A] dark:text-white truncate tabular-nums">
                  {deliveryFeeString}
                </span>
                <span className="block text-[11px] text-[#5A5A6B] dark:text-[#A1A1B2] font-medium truncate">
                  {cleanDistance ? `Fee · ${cleanDistance}` : "Delivery Fee"}
                </span>
              </div>
            </div>
            {/* Min Order */}
            <div className="bg-[#FDF2F6] dark:bg-[#2A121D] p-2 rounded-2xl flex items-center gap-2 border border-[#F9A8C9]/50 dark:border-[#D70F64]/25 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#D70F64] text-white flex items-center justify-center shrink-0 shadow-sm">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[13px] font-extrabold text-[#14141A] dark:text-white truncate tabular-nums">
                  {shopProfile.minOrder ? `Rs. ${shopProfile.minOrder}` : "No Minimum"}
                </span>
                <span className="block text-[11px] text-[#5A5A6B] dark:text-[#A1A1B2] font-medium truncate">
                  Min. Order
                </span>
              </div>
            </div>
          </div>

          {/* Transparent Delivery Fee Policy Notice */}
          <p className="mt-3 text-xs font-medium text-[#5A5A6B] dark:text-[#A1A1B2] bg-[#F9F9FB] dark:bg-[#1B1B23] border border-[#E6E6EE] dark:border-[#272733] rounded-xl px-3 py-2 flex items-center gap-2">
            <Info className="w-4 h-4 text-[#D70F64] shrink-0" />
            <span>
              Delivery fee Rs. {shopProfile.deliveryFee} standard · Doubled below Rs. 500 ·{" "}
              <strong className="text-[#14141A] dark:text-white">Free above Rs. 1,000</strong>
            </span>
          </p>
        </div>
      </div>

      {/* Free Delivery Banner (design: rider + stopwatch) */}
      <div className="max-w-4xl mx-auto px-3.5 sm:px-4 mt-4">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#D70F64] via-[#E21B70] to-[#FF2B85] text-white shadow-[0_12px_28px_rgba(215,15,100,0.35)]">
          <img
            src="/images/home/rider-scooter.jpg"
            alt="Dadu Food rider on a pink scooter"
            className="absolute left-0 top-0 h-full w-[42%] sm:w-[32%] object-cover object-center"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              // Keep the pink gradient banner intact if the photo is missing.
              e.currentTarget.style.display = "none";
            }}
          />
          <div className="absolute inset-y-0 left-0 w-[42%] sm:w-[32%] bg-gradient-to-l from-[#E21B70] via-[#E21B70]/30 to-transparent pointer-events-none" aria-hidden="true" />
          <div className="relative z-10 pl-[44%] sm:pl-[34%] pr-4 py-4 flex items-center justify-between gap-3 min-h-[96px]">
            <p className="text-lg sm:text-2xl font-black italic leading-tight tracking-tight">
              Free Delivery <span className="text-[#FFD500]">on Orders</span> Above Rs. 1,000
            </p>
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
              <Timer className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar: Search & Filter Buttons (>=44px) */}
      <div className="max-w-4xl mx-auto px-3.5 sm:px-4 mt-5">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#717185]" />
            <input
              id="restaurant-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search in ${restaurantName}...`}
              aria-label={`Search in ${restaurantName}`}
              className="w-full min-h-[44px] bg-white dark:bg-[#14141A] border border-[#E6E6EE] dark:border-[#272733] rounded-xl py-2.5 pl-10 pr-10 text-sm font-medium outline-none focus:border-[#D70F64] focus:ring-2 focus:ring-[#D70F64]/20 focus:shadow-[0_8px_24px_rgba(215,15,100,0.12)] text-[#14141A] dark:text-white transition-all duration-300"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 text-xs text-[#5A5A6B] hover:text-[#14141A] dark:hover:text-white font-bold bg-[#F2F2F6] dark:bg-[#1D1D26] rounded-lg transition-transform duration-180 active:scale-[0.97] active:brightness-110 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none touch-pan-both overscroll-x-contain pr-3.5">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              aria-pressed={filterType === "all"}
              className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 transition-transform duration-180 active:scale-[0.97] active:brightness-110 flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                filterType === "all"
                  ? "bg-gradient-to-r from-[#FF2B85] to-[#D70F64] text-white border-[#D70F64] shadow-md shadow-[#D70F64]/30"
                  : "bg-white dark:bg-[#14141A] text-[#14141A] dark:text-[#F5F5F8] border-[#E6E6EE] dark:border-[#272733]"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>All Items ({dishes.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType(filterType === "bestsellers" ? "all" : "bestsellers")}
              aria-pressed={filterType === "bestsellers"}
              className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 transition-transform duration-180 active:scale-[0.97] active:brightness-110 flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                filterType === "bestsellers"
                  ? "bg-gradient-to-r from-[#FF2B85] to-[#D70F64] text-white border-[#D70F64] shadow-md shadow-[#D70F64]/30"
                  : "bg-white dark:bg-[#14141A] text-[#14141A] dark:text-[#F5F5F8] border-[#E6E6EE] dark:border-[#272733]"
              }`}
            >
              <Flame
                className={`w-3.5 h-3.5 ${
                  filterType === "bestsellers" ? "text-white" : "text-[#D70F64]"
                }`}
              />
              <span>Bestsellers</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType(filterType === "top_rated" ? "all" : "top_rated")}
              aria-pressed={filterType === "top_rated"}
              className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 transition-transform duration-180 active:scale-[0.97] active:brightness-110 flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                filterType === "top_rated"
                  ? "bg-gradient-to-r from-[#FF2B85] to-[#D70F64] text-white border-[#D70F64] shadow-md shadow-[#D70F64]/30"
                  : "bg-white dark:bg-[#14141A] text-[#14141A] dark:text-[#F5F5F8] border-[#E6E6EE] dark:border-[#272733]"
              }`}
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  filterType === "top_rated" ? "text-white fill-current" : "text-amber-400 fill-current"
                }`}
              />
              <span>Top Rated</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Category Navigation Strip */}
      {!searchQuery && allNavCategories.length > 0 && (
        <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#14141A]/95 backdrop-blur-md border-y border-[#E6E6EE] dark:border-[#272733] mt-5">
          <div className="max-w-4xl mx-auto px-3.5 sm:px-4">
            <div
              className="flex overflow-x-auto scrollbar-none py-2 gap-2 items-center touch-pan-both overscroll-x-contain pr-3.5"
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
                    aria-current={isActive ? "true" : undefined}
                    className={`min-h-[44px] whitespace-nowrap px-3.5 py-2 rounded-full text-xs font-bold transition-all duration-300 transition-transform duration-180 active:scale-[0.97] active:brightness-110 flex items-center gap-2 cursor-pointer select-none border ${
                      isActive
                        ? "bg-gradient-to-r from-[#FF2B85] to-[#D70F64] text-white border-[#D70F64] shadow-md shadow-[#D70F64]/30"
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
        {dishes.length === 0 ? (
          <div className="py-12 text-center bg-white dark:bg-[#14141A] rounded-2xl border border-[#E6E6EE] dark:border-[#272733] p-6">
            <p className="text-sm font-bold text-[#14141A] dark:text-white">
              No items on the menu yet
            </p>
            <p className="text-xs text-[#5A5A6B] dark:text-[#A1A1B2] mt-1">
              {restaurantName} hasn&apos;t added any dishes yet — please check back soon or browse another restaurant.
            </p>
            <button
              type="button"
              onClick={onBack}
              className="mt-4 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#D70F64] hover:bg-[#B80C54] text-white font-bold text-xs transition-transform duration-180 active:scale-[0.97] active:brightness-110 cursor-pointer relative overflow-hidden after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0)_65%)] after:opacity-0 after:scale-50 after:transition-all after:duration-300 after:pointer-events-none active:after:opacity-100 active:after:scale-125 active:after:duration-100"
            >
              Browse other restaurants
            </button>
          </div>
        ) : searchQuery || filterType !== "all" ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-extrabold text-[#14141A] dark:text-white flex items-center gap-2">
                <Star className="w-4 h-4 text-[#D70F64]" />
                <span>Filtered Items ({filteredDishes.length})</span>
              </h2>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setFilterType("all");
                }}
                className="min-h-[40px] px-3 text-xs text-[#D70F64] dark:text-[#FF4D94] font-bold hover:underline cursor-pointer transition-transform duration-180 active:scale-[0.97] active:brightness-110"
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

      {/* More restaurants in Dadu — crawlable cross-links */}
      <nav aria-label="More restaurants in Dadu" className="max-w-4xl mx-auto px-3.5 sm:px-4 mt-6">
        <div className="bg-white dark:bg-[#14141A] border border-[#E6E6EE] dark:border-[#272733] rounded-2xl p-4 shadow-xs">
          <h2 className="text-sm font-extrabold text-[#14141A] dark:text-white tracking-tight">
            More restaurants in Dadu
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {otherShops.map((shop) => (
              <li key={shop.name}>
                <a
                  href={`/shop/${slugifyShop(shop.name)}`}
                  onClick={(e) => {
                    if (onOpenShop) {
                      e.preventDefault();
                      onOpenShop(shop.name);
                    }
                  }}
                  className="text-[#D70F64] dark:text-[#FF4D94] font-bold hover:underline"
                >
                  {shop.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  onBack();
                }}
                className="text-[#D70F64] dark:text-[#FF4D94] font-bold hover:underline"
              >
                Back to all restaurants in Dadu
              </a>
            </li>
          </ul>
        </div>
      </nav>

      {/* Floating Sticky Cart Bar (Compact <=15% mobile sticky cap, >=48px touch target) */}
      {cartCountTotal > 0 && (
        <div className="fixed bottom-[68px] lg:bottom-5 left-3.5 right-3.5 z-40 max-w-4xl mx-auto">
          <button
            type="button"
            onClick={onViewCart}
            className="w-full min-h-[52px] bg-[#D70F64] hover:bg-[#B80C54] text-white px-4 py-3 rounded-2xl font-bold text-sm shadow-lg transition-transform duration-180 active:scale-[0.97] active:brightness-110 flex items-center justify-between cursor-pointer group relative overflow-hidden after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0)_65%)] after:opacity-0 after:scale-50 after:transition-all after:duration-300 after:pointer-events-none active:after:opacity-100 active:after:scale-125 active:after:duration-100"
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
      className={`group relative flex gap-3 p-3.5 bg-white dark:bg-[#14141A] border border-[#E6E6EE] dark:border-[#272733] rounded-2xl shadow-2xs hover:shadow-sm transition-all duration-300 md:hover:-translate-y-0.5 ${
        !isAvailable ? "opacity-65 grayscale-[15%]" : "hover:border-[#D70F64]/45"
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
              role="img"
              aria-label={veg ? "Vegetarian" : "Non-Vegetarian"}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  veg ? "bg-emerald-600" : "bg-rose-600"
                }`}
              />
            </span>
            {!dish.isAvailable && (
              <span className="text-[10px] font-bold text-[#DC2626] uppercase tracking-wide">
                Sold Out
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onAdd}
            className="font-bold text-[#14141A] dark:text-white text-sm sm:text-[15px] leading-snug group-hover:text-[#D70F64] transition-colors cursor-pointer line-clamp-2 text-left"
          >
            {dish.name}
          </button>

          {dish.description && (
            <p className="text-xs text-[#5A5A6B] dark:text-[#A1A1B2] mt-1 line-clamp-2 leading-relaxed">
              {dish.description}
            </p>
          )}
        </div>

        <div className="mt-2.5 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono font-extrabold text-[#D70F64] dark:text-[#FF4D94] text-sm tabular-nums">
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
              className="w-full h-full"
              imgClassName="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#1D1D26] text-white text-xs font-bold">
              DADU FOOD
            </div>
          )}

          {(dish.isBestseller || dish.isFeatured) && (
            <span className="absolute top-2 left-2 bg-[#D70F64] text-white text-[10px] font-extrabold px-2 py-1 rounded-full shadow-md z-10">
              {dish.isBestseller ? "Best Seller" : "Popular"}
            </span>
          )}

          {onToggleFavorite && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              className={`absolute top-1 right-1 w-9 h-9 rounded-full transition-transform duration-180 active:scale-[0.97] active:brightness-110 flex items-center justify-center cursor-pointer shadow-sm ${
                isFavorite
                  ? "bg-[#D70F64] text-white"
                  : "bg-white/90 dark:bg-[#14141A]/90 text-[#5A5A6B] hover:text-[#D70F64]"
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  isFavorite ? "fill-white text-white" : ""
                }`}
              />
            </button>
          )}
        </div>

        {/* ADD Button or Quantity Stepper (>=40px interactive control) */}
        <div className="absolute -bottom-2 inset-x-0.5 flex justify-center z-10">
          {isAvailable ? (
            quantityInCart && quantityInCart > 0 ? (
              <div className="bg-[#D70F64] text-white px-1.5 py-1 rounded-xl font-bold text-xs shadow-md flex items-center justify-between gap-1.5 min-w-[96px]">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onQuickAdd) onQuickAdd(-1);
                  }}
                  aria-label="Remove one"
                  className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition-transform duration-180 active:scale-[0.97] active:brightness-110"
                >
                  <Minus className="w-3.5 h-3.5 stroke-[2.8]" />
                </button>
                <span className="font-mono text-xs font-bold tabular-nums px-1 transition-all duration-200">
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
                  className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition-transform duration-180 active:scale-[0.97] active:brightness-110"
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
                className={`min-h-[38px] px-4 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md transition-transform duration-180 active:scale-[0.97] active:brightness-110 flex items-center justify-center gap-1 cursor-pointer ${
                  hasOptions
                    ? "bg-white dark:bg-[#14141A] border-2 border-[#D70F64] text-[#D70F64] dark:text-[#FF4D94] hover:bg-[#D70F64] hover:text-white"
                    : "bg-[#D70F64] hover:bg-[#B80C54] text-white"
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
