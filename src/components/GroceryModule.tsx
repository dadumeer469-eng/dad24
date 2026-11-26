import React, { useMemo, useState } from "react";
import { GroceryCategory, GroceryProduct, GroceryOrderItem } from "../types";
import { Package, Plus, Minus, ChevronDown, ChevronRight, Heart } from "lucide-react";
import { LazyImage } from "./LazyImage";
import useLazyBatchLoad from "../hooks/useLazyBatchLoad";
import { GROCERY_CATEGORY_VISUALS } from "../data/ownerGroceryCatalog";

interface GroceryModuleProps {
  categories: GroceryCategory[];
  products: GroceryProduct[];
  isLoading?: boolean;
  onAddToCart: (product: GroceryProduct) => void;
  cartItems: GroceryOrderItem[];
  onUpdateCartQuantity: (productId: string, quantity: number) => void;
  onRemoveFromCart: (productId: string) => void;
  searchQuery: string;
  // Deep-link / route support: e.g. /pharmacy opens with the Medicine &
  // Pharmacy category (gcat_medicine) pre-selected.
  initialCategoryId?: string;
}

function GroceryProductImage({
  product,
  categoryName,
  eager = false,
}: {
  product: GroceryProduct;
  categoryName: string;
  eager?: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const visual = GROCERY_CATEGORY_VISUALS[product.categoryId] || {
    emoji: "🛒",
    accentBg: "from-[#D70F64]/15 to-pink-500/10",
    accentText: "text-[#D70F64] dark:text-pink-300",
    badge: categoryName || "Mart",
  };

  const initials = (product.name || "DF")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

  const packLabel = product.unit && product.unit !== "—" ? product.unit : "Pack";

  if (!product.imageUrl || imgFailed) {
  
  return (
      <div
        className={`w-full h-full bg-gradient-to-br ${visual.accentBg} bg-[#FFF5F8] dark:bg-[#191922] flex flex-col items-center justify-center p-3 text-center relative overflow-hidden select-none`}
      >
        <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-[#D70F64]/10 blur-xl pointer-events-none" />
        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#14141A] border border-[#E6E6EE] dark:border-[#272733] shadow-xs flex items-center justify-center mb-1.5 relative">
          <span className="text-2xl leading-none" role="img" aria-label={categoryName}>
            {visual.emoji}
          </span>
          <span className="absolute -bottom-1 -right-1 bg-[#D70F64] text-white text-[8px] font-black px-1 py-0.5 rounded leading-none">
            {initials || "DF"}
          </span>
        </div>
        <span className={`text-[9.5px] font-extrabold uppercase tracking-wider line-clamp-1 ${visual.accentText}`}>
          {visual.badge}
        </span>
        <span className="text-[9px] font-bold text-[#5A5A6B] dark:text-[#A1A1B2] mt-0.5">
          Dadu Mart · {packLabel}
        </span>
      </div>
    );
  }

  return (
    <img
      src={product.imageUrl}
      alt={product.name}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setImgFailed(true)}
      className="relative w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
    />
  );
}

// Genuine most-bought staples — shown with the green "Best Seller" badge (design).
const GROCERY_BESTSELLER_IDS = new Set(["og_001", "og_007", "og_008", "og_016", "og_049", "og_061"]);

function CategoryTileThumb({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="text-2xl leading-none">🛒</span>;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="w-full h-full object-cover"
    />
  );
}

export default function GroceryModule({
  categories = [],
  products = [],
  isLoading = false,
  onAddToCart,
  cartItems = [],
  onUpdateCartQuantity,
  searchQuery = "",
  initialCategoryId,
}: GroceryModuleProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(initialCategoryId || "All");
  const [showAllInCategory, setShowAllInCategory] = useState<boolean>(Boolean(initialCategoryId));
  const [showAllCatalog, setShowAllCatalog] = useState<boolean>(false);
  const [favIds, setFavIds] = useState<string[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("dadu_grocery_favs") || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const toggleFav = (id: string) => {
    setFavIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem("dadu_grocery_favs", JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  };

  // Follow route changes (e.g. /grocery -> /pharmacy) while the module stays mounted.
  React.useEffect(() => {
    setSelectedCategoryId(initialCategoryId || "All");
    setShowAllInCategory(Boolean(initialCategoryId));
    setShowAllCatalog(false);
  }, [initialCategoryId]);

  const activeCategories = useMemo(
    () =>
      categories
        .filter((c) => c.isAvailable !== false)
        .sort((a, b) => (a.position ?? 99) - (b.position ?? 99)),
    [categories]
  );

  const categoryNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of activeCategories) map[c.id] = c.name;
    return map;
  }, [activeCategories]);

  const activeCategoryIdList = useMemo(
    () => activeCategories.map((c) => c.id),
    [activeCategories]
  );

  const countByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      counts[p.categoryId] = (counts[p.categoryId] || 0) + 1;
    }
    return counts;
  }, [products]);

  const categoryThumb = useMemo(() => {
    const map: Record<string, string> = {};
    for (const cat of activeCategories) {
      const first = products.find((p) => p.categoryId === cat.id && p.imageUrl);
      if (first?.imageUrl) map[cat.id] = first.imageUrl;
    }
    return map;
  }, [activeCategories, products]);

  const filteredProducts = useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory =
        q.length > 0 || selectedCategoryId === "All" || p.categoryId === selectedCategoryId;
      const isCategoryEnabled =
        activeCategoryIdList.length === 0 || activeCategoryIdList.includes(p.categoryId);
      const matchesSearch =
        !q ||
        (p.name || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (p.unit || "").toLowerCase().includes(q);

      return matchesCategory && isCategoryEnabled && matchesSearch;
    });
  }, [products, selectedCategoryId, activeCategoryIdList, searchQuery]);

  const { visibleItems, hasMore, observerTargetRef } = useLazyBatchLoad<GroceryProduct>(
    filteredProducts,
    showAllInCategory ? Math.max(filteredProducts.length, 100) : 24
  );

  const getProductQuantityInCart = (prodId: string) => {
    const item = cartItems.find((i) => i.productId === prodId);
    return item ? item.quantity : 0;
  };

  // Grouped category view for "All": each category gets its own section (no mixed list).
  const isGroupedView = selectedCategoryId === "All" && !(searchQuery || "").trim() && !showAllCatalog;
  const groupedSections = useMemo(() => {
    if (!isGroupedView) return [] as { id: string; name: string; emoji?: string; count: number; items: GroceryProduct[] }[];
    return activeCategories
      .map((cat) => {
        const items = products.filter((p) => p.categoryId === cat.id);
        return {
          id: cat.id,
          name: cat.name,
          emoji: GROCERY_CATEGORY_VISUALS[cat.id]?.emoji,
          count: items.length,
          items: items.slice(0, 8),
        };
      })
      .filter((s) => s.count > 0);
  }, [isGroupedView, activeCategories, products]);

  const renderProductCard = (p: GroceryProduct, eager = false) => {
    const qty = getProductQuantityInCart(p.id);
    const isOutOfStock = !p.isAvailable || p.stock <= 0;
    const hasDiscount = p.discountPrice && p.discountPrice < p.price;
    const displayPrice = hasDiscount ? p.discountPrice : p.price;
    const packLabel = p.unit && p.unit !== "—" ? p.unit : "Standard Pack";
    const isFav = favIds.includes(p.id);
    const isBestSeller = GROCERY_BESTSELLER_IDS.has(p.id);

    return (
      <div
        key={p.id}
        className="bg-[#FFF0F5] dark:bg-[#2A101B] border border-[#F9A8C9]/40 dark:border-[#D70F64]/25 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-[#D70F64]/50 transition-all duration-200 flex flex-col relative group"
      >
        <div className="relative h-[104px] sm:h-32 md:h-36 bg-[#FFF0F5] dark:bg-[#2A101B] shrink-0 select-none overflow-hidden">
          {/* Loading shimmer so the tile never looks blank pink while the photo loads */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent animate-shimmer-sweep" />
          </div>
          <GroceryProductImage product={p} categoryName={categoryNameMap[p.categoryId] || "Grocery"} eager={eager} />
          {isOutOfStock ? (
            <div className="absolute bottom-2 left-2 z-10 bg-zinc-900/90 text-white font-bold text-[10px] uppercase tracking-wider py-0.5 px-2 rounded-full border border-white/15">
              Out of Stock
            </div>
          ) : hasDiscount ? (
            <div className="absolute bottom-2 left-2 z-10 bg-[#D70F64] text-white font-bold text-[10px] uppercase tracking-wider py-0.5 px-2 rounded-full shadow-sm">
              {`${Math.round(((p.price - p.discountPrice!) / p.price) * 100)}% OFF`}
            </div>
          ) : isBestSeller ? (
            <div className="absolute bottom-2 left-2 z-10 bg-[#16A34A] text-white font-bold text-[10px] py-0.5 px-2 rounded-full shadow-sm">
              Best Seller
            </div>
          ) : (
            <div className="absolute bottom-2 left-2 z-10 bg-[#16A34A] text-white font-bold text-[10px] py-0.5 px-2 rounded-full shadow-sm">
              Fresh
            </div>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFav(p.id);
            }}
            aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
            className="absolute top-2 right-2 z-10 w-9 h-9 flex items-center justify-center cursor-pointer active:scale-90 transition rounded-full focus-visible:outline-2 focus-visible:outline-white"
          >
            <Heart
              className={`w-5 h-5 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)] ${
                isFav ? "fill-[#D70F64] text-[#D70F64]" : "text-[#D70F64]"
              }`}
            />
          </button>
        </div>

        <div className="p-2 sm:p-3 flex-1 flex flex-col justify-between gap-2">
          <div>
            <h4 className="font-bold text-[#14141A] dark:text-[#F5F5F8] text-[13px] sm:text-sm leading-snug line-clamp-2">
              {p.name}
            </h4>
            <span className="block text-[11px] font-medium text-[#5A5A6B] dark:text-[#A1A1B2] mt-0.5 line-clamp-1">
              {packLabel}
            </span>
          </div>

          {qty > 0 && !isOutOfStock ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline gap-1 min-w-0 overflow-hidden">
                <span className="text-[13px] font-extrabold text-[#D70F64] dark:text-[#FF4D94] whitespace-nowrap">
                  {`Rs. ${displayPrice}`}
                </span>
                {hasDiscount && (
                  <span className="hidden sm:inline text-[11px] text-[#717185] line-through whitespace-nowrap">
                    {`Rs. ${p.price}`}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between bg-[#D70F64] text-white p-0.5 rounded-full shadow-sm">
                <button
                  type="button"
                  onClick={() => onUpdateCartQuantity(p.id, qty - 1)}
                  aria-label="Decrease quantity"
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center cursor-pointer active:scale-90 focus-visible:outline-2 focus-visible:outline-white"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-extrabold px-1 min-w-[18px] text-center">{qty}</span>
                <button
                  type="button"
                  onClick={() => onUpdateCartQuantity(p.id, qty + 1)}
                  aria-label="Increase quantity"
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center cursor-pointer active:scale-90 focus-visible:outline-2 focus-visible:outline-white"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-baseline gap-1 min-w-0 overflow-hidden">
                <span className="text-xs sm:text-sm font-extrabold text-[#D70F64] dark:text-[#FF4D94] whitespace-nowrap">
                  {`Rs. ${displayPrice}`}
                </span>
                {hasDiscount && (
                  <span className="hidden sm:inline text-[11px] text-[#717185] line-through whitespace-nowrap">
                    {`Rs. ${p.price}`}
                  </span>
                )}
              </div>

              {isOutOfStock ? (
                <span className="text-[9px] font-bold uppercase text-[#717185] px-1.5 py-1 rounded-full bg-white/70 dark:bg-white/10 shrink-0">
                  Out of Stock
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onAddToCart(p)}
                  aria-label={`Add ${p.name} to cart`}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full btn-pink text-white flex items-center justify-center cursor-pointer active:scale-90 shrink-0 shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E21B70]"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-[#0B0B0F] text-[#14141A] dark:text-[#F5F5F8] min-h-screen py-3 sm:py-4 transition-colors duration-200 animate-slide-screen">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-4 space-y-4 sm:space-y-5">
        {/* Dadu Express Mart Hero (design: dark banner, basket photo, yellow headline) */}
        <div className="relative overflow-hidden rounded-[28px] shadow-[0_12px_28px_rgba(215,15,100,0.25)] min-h-[210px] sm:min-h-[230px]">
          <img
            src="/images/home/grocery-basket.jpg"
            alt="Fresh groceries in a Dadu Food basket"
            className="absolute inset-0 w-full h-full object-cover object-center"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-[#1A0A12]/95 via-[#1A0A12]/60 to-transparent"
            aria-hidden="true"
          />
          <div className="relative z-10 p-5 sm:p-7 max-w-[56%] sm:max-w-[58%]">
            <span className="inline-flex items-center gap-1.5 bg-[#D70F64] text-white py-1 px-3 rounded-full text-[11px] font-black uppercase tracking-wider shadow-md">
              DADU EXPRESS MART
            </span>
            <h2 className="text-[24px] sm:text-4xl font-black tracking-tight text-white leading-[1.08] mt-2.5">
              Daily Groceries Delivered{" "}
              <span className="text-[#FFD500] italic">Fast in Dadu</span>
            </h2>
            <p className="flex items-center gap-3 text-xs sm:text-sm text-white font-bold mt-2.5 flex-wrap">
              <span>✓ Fresh</span>
              <span>✓ Quality</span>
              <span>✓ Affordable</span>
            </p>
            <button
              type="button"
              onClick={() =>
                document.getElementById("grocery-products")?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className="mt-3.5 inline-flex items-center gap-1.5 bg-white text-[#14141A] font-extrabold text-xs sm:text-sm px-4 py-2.5 min-h-[44px] rounded-full shadow-md hover:bg-pink-50 active:scale-95 transition cursor-pointer"
            >
              Shop Now <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Tiles (design: photo tiles row, light pink) */}
        {activeCategories.length > 0 && (
          <div className="flex items-stretch gap-2.5 overflow-x-auto pb-1 scrollbar-none touch-pan-both overscroll-x-contain -mx-3.5 pl-3.5 pr-5 sm:mx-0 sm:pl-0 sm:pr-3">
            <button
              type="button"
              aria-pressed={selectedCategoryId === "All" && !showAllCatalog}
              onClick={() => {
                setSelectedCategoryId("All");
                setShowAllInCategory(false);
                setShowAllCatalog(false);
              }}
              className={`w-[110px] shrink-0 rounded-2xl border p-2 text-left transition-all cursor-pointer ${
                selectedCategoryId === "All" && !showAllCatalog
                  ? "bg-[#FFE4EF] border-[#D70F64] ring-2 ring-[#D70F64]/40 shadow-md"
                  : "bg-[#FFF0F5] dark:bg-[#2A101B] border-[#F9A8C9]/40 dark:border-[#D70F64]/25 hover:border-[#D70F64]/60"
              }`}
            >
              <div className="h-[60px] rounded-xl overflow-hidden bg-[#FFE4EF] dark:bg-[#1B1B23] mb-1.5">
                <img
                  src="/images/home/grocery-basket.jpg"
                  alt="All grocery items"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <span className="block text-xs font-extrabold text-[#14141A] dark:text-white leading-tight">All Items</span>
              <span className="block text-[11px] font-bold text-[#5A5A6B] dark:text-[#A1A1B2]">({products.length})</span>
            </button>

            {activeCategories.map((cat) => {
              const catCount = countByCategory[cat.id] || 0;
              const thumb = categoryThumb[cat.id];
              const isActive = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => {
                    setSelectedCategoryId(cat.id);
                    setShowAllInCategory(true);
                    setShowAllCatalog(false);
                  }}
                  className={`w-[110px] shrink-0 rounded-2xl border p-2 text-left transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#FFE4EF] border-[#D70F64] ring-2 ring-[#D70F64]/40 shadow-md"
                      : "bg-[#FFF0F5] dark:bg-[#2A101B] border-[#F9A8C9]/40 dark:border-[#D70F64]/25 hover:border-[#D70F64]/60"
                  }`}
                >
                  <div className="h-[60px] rounded-xl overflow-hidden bg-[#FFE4EF] dark:bg-[#1B1B23] mb-1.5 flex items-center justify-center">
                    {thumb ? (
                      <CategoryTileThumb src={thumb} alt={cat.name} />
                    ) : (
                      <span className="text-2xl leading-none">{GROCERY_CATEGORY_VISUALS[cat.id]?.emoji || "📦"}</span>
                    )}
                  </div>
                  <span className="block text-xs font-extrabold text-[#14141A] dark:text-white leading-tight line-clamp-1">
                    {cat.name}
                  </span>
                  <span className="block text-[11px] font-bold text-[#5A5A6B] dark:text-[#A1A1B2]">({catCount})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Grocery Products */}
        <div id="grocery-products" className="scroll-mt-28">
          {filteredProducts.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h3 className="text-sm sm:text-base font-extrabold text-[#14141A] dark:text-[#F5F5F8]">
                {selectedCategoryId === "All"
                  ? "All Grocery Essentials"
                  : categoryNameMap[selectedCategoryId] || "Groceries"}{" "}
                <span className="text-xs text-[#5A5A6B] dark:text-[#A1A1B2] font-semibold tabular-nums">
                  {`(${filteredProducts.length} ${filteredProducts.length === 1 ? "item" : "items"})`}
                </span>
              </h3>
              {searchQuery && (
                <span className="text-xs text-[#D70F64] dark:text-[#FF4D94] font-bold">
                  {`Search: "${searchQuery}"`}
                </span>
              )}
              {isGroupedView && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAllCatalog(true);
                    setShowAllInCategory(true);
                  }}
                  className="text-xs font-bold text-[#D70F64] dark:text-[#FF4D94] hover:underline shrink-0 cursor-pointer min-h-[44px] px-2"
                >
                  See All →
                </button>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#14141A] border border-[#E6E6EE] dark:border-[#272733] rounded-2xl overflow-hidden p-3 space-y-3"
                >
                  <div className="h-32 sm:h-36 rounded-xl skeleton-box" />
                  <div className="h-3 w-1/3 rounded skeleton-box" />
                  <div className="h-4 w-4/5 rounded skeleton-box" />
                  <div className="h-10 w-full rounded-xl skeleton-box" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="space-y-5">
              <div className="py-10 px-5 bg-white dark:bg-[#14141A] rounded-2xl sm:rounded-3xl border border-[#E6E6EE] dark:border-[#272733] flex flex-col items-center justify-center text-center space-y-2.5">
                <div className="w-14 h-14 rounded-2xl bg-[#FFF0F5] dark:bg-[#2A101B] text-[#D70F64] dark:text-[#FF4D94] flex items-center justify-center">
                  <Package className="w-7 h-7" />
                </div>
                <h3 className="font-extrabold text-base text-[#14141A] dark:text-[#F5F5F8]">
                  {searchQuery
                    ? `No grocery items match "${searchQuery}"`
                    : "No items in this category yet"}
                </h3>
                <p className="text-xs sm:text-sm text-[#5A5A6B] dark:text-[#A1A1B2] max-w-md leading-relaxed">
                  Try another category or search for the item you need.
                </p>
              </div>
            </div>
          ) : isGroupedView ? (
              <div className="space-y-7">
                {groupedSections.map((section) => (
                  <section key={section.id}>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h4 className="text-sm sm:text-base font-extrabold text-[#14141A] dark:text-[#F5F5F8] flex items-center gap-2">
                        {section.emoji ? <span className="text-base leading-none">{section.emoji}</span> : null}
                        <span>{section.name}</span>
                        <span className="text-xs text-[#5A5A6B] dark:text-[#A1A1B2] font-semibold tabular-nums">
                          {`(${section.count} ${section.count === 1 ? "item" : "items"})`}
                        </span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategoryId(section.id);
                          setShowAllInCategory(true);
                        }}
                        className="text-xs font-bold text-[#D70F64] dark:text-[#FF4D94] hover:underline shrink-0 cursor-pointer min-h-[44px] px-2"
                      >
                        See all →
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                      {section.items.map((p, i) => renderProductCard(p, i < 6))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-2.5 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                  {visibleItems.map((p, i) => renderProductCard(p, i < 9))}
                </div>

                {hasMore && (
                  <div className="flex flex-col items-center gap-2">
                    <div ref={observerTargetRef} className="h-2 w-full" />
                    <button
                      type="button"
                      onClick={() => setShowAllInCategory(true)}
                      className="min-h-[44px] px-6 py-2.5 rounded-xl bg-white dark:bg-[#14141A] border border-[#E6E6EE] dark:border-[#272733] hover:border-[#D70F64] text-xs font-bold text-[#14141A] dark:text-white flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <span>{`Show All ${filteredProducts.length} Items`}</span>
                      <ChevronDown className="w-4 h-4 text-[#D70F64]" />
                    </button>
                  </div>
                )}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
