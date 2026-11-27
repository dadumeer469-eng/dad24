import React, { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { springBouncy, springSnappy } from "../utils/motion";
import { GroceryCategory, GroceryProduct, GroceryOrderItem } from "../types";
import { Check, Package, Plus, Minus, ChevronDown, ChevronRight } from "lucide-react";
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
  // Controlled category / catalog state (lifted to App so the mobile
  // back-button controller can step back out of a grocery category
  // instead of jumping straight to the homepage).
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  showAllCatalog: boolean;
  onSetShowAllCatalog: (v: boolean) => void;
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
    accentBg: "",
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
        className="w-full h-full bg-[#efe9df] dark:bg-[#191922] flex flex-col items-center justify-center p-3 text-center relative overflow-hidden select-none"
      >
        <div className="w-12 h-12 rounded-2xl bg-[#fdfbf7] dark:bg-[#14141A] border border-[#e8e2d6] dark:border-[#272733] shadow-xs flex items-center justify-center mb-1.5 relative">
          <Package className="w-6 h-6 text-[#5e554a] dark:text-[#A1A1B2]" strokeWidth={1.5} aria-hidden="true" />
          <span className="absolute -bottom-1 -right-1 bg-[#D70F64] text-white text-[8px] font-semibold px-1 py-0.5 rounded leading-none">
            {initials || "DF"}
          </span>
        </div>
        <span className={`text-[9.5px] font-semibold tracking-wider line-clamp-1 ${visual.accentText}`}>
          {visual.badge}
        </span>
        <span className="text-[9px] font-medium text-[#5A5A6B] dark:text-[#A1A1B2] mt-0.5">
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
      className="relative w-full h-full object-cover transition-transform duration-180 group-hover:scale-105"
    />
  );
}

// Genuine most-bought staples — shown with the green "Best Seller" badge (design).

function CategoryTileThumb({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Package className="w-6 h-6 text-[#5e554a] dark:text-[#A1A1B2]" strokeWidth={1.5} aria-hidden="true" />;
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
  selectedCategoryId,
  onSelectCategory,
  showAllCatalog,
  onSetShowAllCatalog,
}: GroceryModuleProps) {
  // Batch limit for the product grid (24 vs all). Kept internal: it is a
  // display concern (e.g. "Show all N items" while searching), not a
  // navigation sub-view, so the back-button controller does not need it.
  const [showAllInCategory, setShowAllInCategory] = useState<boolean>(Boolean(initialCategoryId));
  // Reduced motion: micro-interactions become instant state changes.
  const reduceMotion = useReducedMotion();

  // Pharmacy route (mobile-UX finding F2, fix 27 Nov 2026): App passes
  // initialCategoryId="gcat_medicine" only on /pharmacy, so this is the
  // route signal — the grocery banner must not render there.
  const isPharmacy = initialCategoryId === "gcat_medicine";

  // Follow route changes (e.g. /grocery -> /pharmacy) while the module stays mounted.
  React.useEffect(() => {
    onSelectCategory(initialCategoryId || "All");
    setShowAllInCategory(Boolean(initialCategoryId));
    onSetShowAllCatalog(false);
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
    if (!isGroupedView) return [] as { id: string; name: string; count: number; items: GroceryProduct[] }[];
    return activeCategories
      .map((cat) => {
        const items = products.filter((p) => p.categoryId === cat.id);
        return {
          id: cat.id,
          name: cat.name,
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
    const discountPct = hasDiscount
      ? Math.round(((p.price - p.discountPrice!) / p.price) * 100)
      : 0;

    return (
      <motion.div
        key={p.id}
        whileHover={reduceMotion ? undefined : { y: -2 }}
        transition={springSnappy}
        className="bg-white dark:bg-[#1B1B24] rounded-2xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.07)] hover:shadow-md transition-shadow duration-180 flex flex-col relative group border border-[#f0f0f0] dark:border-[#2A2A35]"
      >
        {/* Photo — light backdrop, product fills it; white + button (Foodpanda-style)
            overlaps the bottom-right corner. No badges on the photo — clean. */}
        <div className="relative h-36 sm:h-44 bg-[#f7f7f7] dark:bg-[#23232E] shrink-0 select-none overflow-hidden">
          <GroceryProductImage product={p} categoryName={categoryNameMap[p.categoryId] || "Grocery"} eager={eager} />
          {isOutOfStock ? (
            <span className="absolute bottom-2 right-2 z-10 text-[10px] font-semibold text-[#717185] px-2.5 py-1.5 rounded-full bg-white/95 dark:bg-[#14141A]/95 shadow-md">
              Out of stock
            </span>
          ) : qty > 0 ? (
            <motion.div
              initial={reduceMotion ? false : { scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={springSnappy}
              className="absolute bottom-2 right-2 z-10 flex items-center bg-white dark:bg-[#14141A] rounded-full shadow-md border border-black/5 p-0.5"
            >
              <motion.button
                type="button"
                whileTap={reduceMotion ? undefined : { scale: 0.88 }}
                onClick={() => onUpdateCartQuantity(p.id, qty - 1)}
                aria-label="Decrease quantity"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#E21B70] hover:bg-[#FDE7F0] dark:hover:bg-[#2A121D] cursor-pointer"
              >
                <Minus className="w-4 h-4" strokeWidth={2.5} />
              </motion.button>
              <motion.span
                key={qty}
                initial={reduceMotion ? false : { scale: 1.35 }}
                animate={{ scale: 1 }}
                transition={springSnappy}
                className="text-sm font-bold text-[#14141A] dark:text-white min-w-[20px] text-center"
              >
                {qty}
              </motion.span>
              <motion.button
                type="button"
                whileTap={reduceMotion ? undefined : { scale: 0.88 }}
                onClick={() => onUpdateCartQuantity(p.id, qty + 1)}
                aria-label="Increase quantity"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#E21B70] hover:bg-[#FDE7F0] dark:hover:bg-[#2A121D] cursor-pointer"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
              </motion.button>
            </motion.div>
          ) : (
            <motion.button
              type="button"
              whileTap={reduceMotion ? undefined : { scale: 0.88 }}
              onClick={() => onAddToCart(p)}
              aria-label={`Add ${p.name} to cart`}
              className="absolute bottom-2 right-2 z-10 w-10 h-10 rounded-full bg-white dark:bg-[#14141A] text-[#14141A] dark:text-white flex items-center justify-center cursor-pointer shadow-md border border-black/5 active:scale-95"
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
            </motion.button>
          )}
        </div>

        {/* Details — price, discount, name, pack (Foodpanda order: price first). */}
        <div className="p-2.5 sm:p-3 flex-1 flex flex-col gap-0.5">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-[15px] sm:text-base font-bold text-[#E21B70] dark:text-[#FF4D94]">
              {`Rs. ${displayPrice}`}
            </span>
            {hasDiscount && (
              <span className="text-xs text-[#9a9aad] dark:text-[#717185] line-through">
                {`Rs. ${p.price}`}
              </span>
            )}
          </div>
          {hasDiscount && (
            <span className="self-start text-[11px] font-bold text-[#D70F64] dark:text-[#FF8FBF] bg-[#FDE7F0] dark:bg-[#3A1526] rounded-full px-2 py-0.5 mt-0.5">
              {`${discountPct}% off`}
            </span>
          )}
          <h4
            title={p.name}
            className="font-semibold text-[#14141A] dark:text-[#F5F5F8] text-[13px] sm:text-sm leading-snug line-clamp-2 mt-0.5"
          >
            {p.name}
          </h4>
          <span className="block text-[11px] sm:text-xs text-[#717185] dark:text-[#A1A1B2] line-clamp-1">
            {packLabel}
          </span>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="bg-transparent dark:bg-[#0B0B0F] text-[#14141A] dark:text-[#F5F5F8] min-h-screen py-3 sm:py-4 transition-colors duration-200 animate-slide-screen">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-4 space-y-4 sm:space-y-5">
        {/* Hero banner: medicine on /pharmacy, grocery everywhere else.
            (F2 — the grocery banner used to render on /pharmacy too.) */}
        {isPharmacy ? (
          <div className="relative overflow-hidden rounded-[28px] shadow-[0_12px_28px_rgba(0,0,0,0.10)] min-h-[210px] sm:min-h-[230px]">
            <img
              src="/images/grocery/dettol-antiseptic-liquid-100ml.jpg"
              alt="Medicines available for delivery from Dadu Food"
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
              <h2 className="text-[24px] sm:text-4xl font-medium tracking-tight text-white leading-[1.08] mt-2.5">
                Medicine Delivered{" "}
                <span className="text-white">Fast in Dadu</span>
              </h2>
              <p className="flex items-center gap-3 text-xs sm:text-sm text-white font-semibold mt-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <Check className="w-4 h-4 text-white" strokeWidth={1.5} aria-hidden="true" /> Genuine
                </span>
                <span className="inline-flex items-center gap-1">
                  <Check className="w-4 h-4 text-white" strokeWidth={1.5} aria-hidden="true" /> Quality
                </span>
                <span className="inline-flex items-center gap-1">
                  <Check className="w-4 h-4 text-white" strokeWidth={1.5} aria-hidden="true" /> Affordable
                </span>
              </p>
              <button
                type="button"
                onClick={() =>
                  document.getElementById("grocery-products")?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="mt-3.5 inline-flex items-center gap-1.5 bg-white text-[#14141A] font-semibold text-xs sm:text-sm px-4 py-2.5 min-h-[44px] rounded-full shadow-md hover:bg-pink-50 transition-transform duration-180 active:scale-[0.97] active:brightness-110 cursor-pointer"
              >
                Shop now <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-[28px] shadow-[0_12px_28px_rgba(0,0,0,0.10)] min-h-[210px] sm:min-h-[230px]">
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
              <h2 className="text-[24px] sm:text-4xl font-medium tracking-tight text-white leading-[1.08] mt-2.5">
                Daily Groceries Delivered{" "}
                <span className="text-white">Fast in Dadu</span>
              </h2>
              <p className="flex items-center gap-3 text-xs sm:text-sm text-white font-semibold mt-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <Check className="w-4 h-4 text-white" strokeWidth={1.5} aria-hidden="true" /> Fresh
                </span>
                <span className="inline-flex items-center gap-1">
                  <Check className="w-4 h-4 text-white" strokeWidth={1.5} aria-hidden="true" /> Quality
                </span>
                <span className="inline-flex items-center gap-1">
                  <Check className="w-4 h-4 text-white" strokeWidth={1.5} aria-hidden="true" /> Affordable
                </span>
              </p>
              <button
                type="button"
                onClick={() =>
                  document.getElementById("grocery-products")?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="mt-3.5 inline-flex items-center gap-1.5 bg-white text-[#14141A] font-semibold text-xs sm:text-sm px-4 py-2.5 min-h-[44px] rounded-full shadow-md hover:bg-pink-50 transition-transform duration-180 active:scale-[0.97] active:brightness-110 cursor-pointer"
              >
                Shop now <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Category Tiles (design: photo tiles row, light pink) */}
        {activeCategories.length > 0 && (
          <div className="flex items-stretch gap-2.5 overflow-x-auto pb-1 scrollbar-none touch-pan-both overscroll-x-contain -mx-3.5 pl-3.5 pr-5 sm:mx-0 sm:pl-0 sm:pr-3">
            <button
              type="button"
              aria-pressed={selectedCategoryId === "All" && !showAllCatalog}
              onClick={() => {
                onSelectCategory("All");
                setShowAllInCategory(false);
                onSetShowAllCatalog(false);
              }}
              className={`w-[110px] shrink-0 rounded-2xl border p-2 text-left transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97] active:brightness-110 cursor-pointer ${
                selectedCategoryId === "All" && !showAllCatalog
                  ? "bg-[#fdfbf7] border-[#D70F64] ring-2 ring-[#D70F64]/40 shadow-md"
                  : "bg-[#fdfbf7] dark:bg-[#2A101B] border-[#e8e2d6] dark:border-[#D70F64]/25 hover:border-[#D70F64]/60"
              }`}
            >
              <div className="h-[60px] rounded-xl overflow-hidden bg-[#efe9df] dark:bg-[#1B1B23] mb-1.5">
                <img
                  src="/images/home/grocery-basket.jpg"
                  alt="All grocery items"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <span className="block text-xs font-semibold text-[#14141A] dark:text-white leading-tight">All items</span>
              <span className="block text-[11px] font-medium text-[#5A5A6B] dark:text-[#A1A1B2]">({products.length})</span>
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
                    onSelectCategory(cat.id);
                    setShowAllInCategory(true);
                    onSetShowAllCatalog(false);
                  }}
                  className={`w-[110px] shrink-0 rounded-2xl border p-2 text-left transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97] active:brightness-110 cursor-pointer ${
                    isActive
                      ? "bg-[#fdfbf7] border-[#D70F64] ring-2 ring-[#D70F64]/40 shadow-md"
                      : "bg-[#fdfbf7] dark:bg-[#2A101B] border-[#e8e2d6] dark:border-[#D70F64]/25 hover:border-[#D70F64]/60"
                  }`}
                >
                  <div className="h-[60px] rounded-xl overflow-hidden bg-[#efe9df] dark:bg-[#1B1B23] mb-1.5 flex items-center justify-center">
                    {thumb ? (
                      <CategoryTileThumb src={thumb} alt={cat.name} />
                    ) : (
                      <Package className="w-6 h-6 text-[#5e554a] dark:text-[#A1A1B2]" strokeWidth={1.5} aria-hidden="true" />
                    )}
                  </div>
                  <span className="block text-xs font-semibold text-[#14141A] dark:text-white leading-tight line-clamp-1">
                    {cat.name}
                  </span>
                  <span className="block text-[11px] font-medium text-[#5A5A6B] dark:text-[#A1A1B2]">({catCount})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Grocery Products */}
        <div id="grocery-products" className="scroll-mt-28">
          {filteredProducts.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h3 className="text-sm sm:text-base font-semibold text-[#14141A] dark:text-[#F5F5F8]">
                {selectedCategoryId === "All"
                  ? "All grocery essentials"
                  : categoryNameMap[selectedCategoryId] || "Groceries"}{" "}
                <span className="text-xs text-[#5A5A6B] dark:text-[#A1A1B2] font-semibold tabular-nums">
                  {`(${filteredProducts.length} ${filteredProducts.length === 1 ? "item" : "items"})`}
                </span>
              </h3>
              {searchQuery && (
                <span className="text-xs text-[#D70F64] dark:text-[#FF4D94] font-semibold">
                  {`Search: "${searchQuery}"`}
                </span>
              )}
              {isGroupedView && (
                <button
                  type="button"
                  onClick={() => {
                    onSetShowAllCatalog(true);
                    setShowAllInCategory(true);
                  }}
                  className="text-xs font-semibold text-[#D70F64] dark:text-[#FF4D94] hover:underline shrink-0 cursor-pointer min-h-[44px] px-2 transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97] active:brightness-110"
                >
                  See all →
                </button>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-[#fdfbf7] dark:bg-[#14141A] border border-[#e8e2d6] dark:border-[#272733] rounded-2xl overflow-hidden p-3 space-y-3"
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
              <div className="py-10 px-5 bg-[#fdfbf7] dark:bg-[#14141A] rounded-2xl sm:rounded-3xl border border-[#e8e2d6] dark:border-[#272733] flex flex-col items-center justify-center text-center space-y-2.5">
                <div className="w-14 h-14 rounded-2xl bg-[#efe9df] dark:bg-[#2A101B] text-[#D70F64] dark:text-[#FF4D94] flex items-center justify-center">
                  <Package className="w-7 h-7" />
                </div>
                <h3 className="font-semibold text-base text-[#14141A] dark:text-[#F5F5F8]">
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
                      <h4 className="text-sm sm:text-base font-semibold text-[#14141A] dark:text-[#F5F5F8] flex items-center gap-2">
                        <span>{section.name}</span>
                        <span className="text-xs text-[#5A5A6B] dark:text-[#A1A1B2] font-semibold tabular-nums">
                          {`(${section.count} ${section.count === 1 ? "item" : "items"})`}
                        </span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCategory(section.id);
                          setShowAllInCategory(true);
                        }}
                        className="text-xs font-semibold text-[#D70F64] dark:text-[#FF4D94] hover:underline shrink-0 cursor-pointer min-h-[44px] px-2 transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97] active:brightness-110"
                      >
                        See all →
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                      {section.items.map((p, i) => renderProductCard(p, i < 6))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                  {visibleItems.map((p, i) => renderProductCard(p, i < 9))}
                </div>

                {hasMore && (
                  <div className="flex flex-col items-center gap-2">
                    <div ref={observerTargetRef} className="h-2 w-full" />
                    <button
                      type="button"
                      onClick={() => setShowAllInCategory(true)}
                      className="min-h-[44px] px-6 py-2.5 rounded-xl bg-white dark:bg-[#14141A] border border-[#E6E6EE] dark:border-[#272733] hover:border-[#D70F64] text-xs font-semibold text-[#14141A] dark:text-white flex items-center gap-1.5 cursor-pointer transition-[color,background-color,border-color,transform,opacity] duration-180 active:scale-[0.97] active:brightness-110"
                    >
                      <span>{`Show all ${filteredProducts.length} items`}</span>
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
