import React, { useMemo, useState } from "react";
import { GroceryCategory, GroceryProduct, GroceryOrderItem } from "../types";
import { ShoppingBasket, Package, Plus, Minus, ChevronDown } from "lucide-react";
import { LazyImage } from "./LazyImage";
import useLazyBatchLoad from "../hooks/useLazyBatchLoad";
import WhatsAppListOrderCard from "./WhatsAppListOrderCard";
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
}

function GroceryProductImage({
  product,
  categoryName,
}: {
  product: GroceryProduct;
  categoryName: string;
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
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setImgFailed(true)}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
}: GroceryModuleProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("All");
  const [showAllInCategory, setShowAllInCategory] = useState<boolean>(false);

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

  return (
    <div className="bg-[#F7F7FA] dark:bg-[#0B0B0F] text-[#14141A] dark:text-[#F5F5F8] min-h-screen py-4 sm:py-6 transition-colors duration-200 animate-slide-screen">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-4 space-y-5 sm:space-y-6">
        {/* High-Contrast Dadu Express Mart Header */}
        <div
          className="relative overflow-hidden p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border border-[#E6E6EE] dark:border-[#272733] bg-[#14141A]"
          style={{
            backgroundImage: `url("https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B0F]/95 via-[#0B0B0F]/85 to-[#D70F64]/45 z-0" />

          <div className="relative space-y-2 z-10 max-w-xl">
            <span className="inline-flex items-center gap-1.5 bg-[#D70F64] text-white py-1 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider shadow-xs">
              DADU EXPRESS MART
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Daily Groceries Delivered Fast in Dadu
            </h2>
            <p className="text-xs sm:text-sm text-zinc-200 font-medium leading-relaxed">
              Order Rashan, cooking oil, spices, dairy, tea, bakery, snacks, and household essentials across Dadu — or send your full list on WhatsApp.
            </p>
          </div>

          <div className="relative shrink-0 hidden sm:flex items-center justify-center bg-[#14141A]/90 border border-white/20 p-4 rounded-2xl z-10">
            <ShoppingBasket className="w-10 h-10 text-[#FF4D94] stroke-[1.8]" />
          </div>
        </div>

        {/* Foodpanda-Style Separate Category Filter Strip */}
        {activeCategories.length > 0 && (
          <div className="sticky top-[56px] sm:top-0 z-30 bg-[#F7F7FA]/95 dark:bg-[#0B0B0F]/95 backdrop-blur-md py-2 border-y border-[#E6E6EE] dark:border-[#272733]">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none touch-pan-x overscroll-x-contain">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategoryId("All");
                  setShowAllInCategory(false);
                }}
                className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer border flex items-center gap-1.5 ${
                  selectedCategoryId === "All"
                    ? "bg-[#D70F64] text-white border-[#D70F64] shadow-xs"
                    : "bg-white dark:bg-[#14141A] text-[#14141A] dark:text-[#F5F5F8] border-[#E6E6EE] dark:border-[#272733] hover:border-[#D70F64]/50"
                }`}
              >
                <span>🛒</span>
                <span className="whitespace-nowrap">{`All Items (${products.length})`}</span>
              </button>

              {activeCategories.map((cat) => {
                const catCount = countByCategory[cat.id] || 0;
                const vis = GROCERY_CATEGORY_VISUALS[cat.id];
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(cat.id);
                      setShowAllInCategory(true);
                    }}
                    className={`min-h-[44px] px-3.5 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer border flex items-center gap-2 ${
                      selectedCategoryId === cat.id
                        ? "bg-[#D70F64] text-white border-[#D70F64] shadow-xs"
                        : "bg-white dark:bg-[#14141A] text-[#14141A] dark:text-[#F5F5F8] border-[#E6E6EE] dark:border-[#272733] hover:border-[#D70F64]/50"
                    }`}
                  >
                    {vis?.emoji ? (
                      <span className="text-sm leading-none">{vis.emoji}</span>
                    ) : cat.imageUrl ? (
                      <LazyImage
                        src={cat.imageUrl}
                        alt={cat.name}
                        className="w-5 h-5 rounded-full overflow-hidden shrink-0"
                      />
                    ) : (
                      <span>📦</span>
                    )}
                    <span className="whitespace-nowrap">
                      {catCount > 0 ? `${cat.name} (${catCount})` : cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Grocery Products */}
        <div>
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
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
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
                  Try another category or send your exact grocery list below on WhatsApp and our rider will deliver it across Dadu.
                </p>
              </div>

              <WhatsAppListOrderCard mode="grocery" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
                {visibleItems.map((p) => {
                  const qty = getProductQuantityInCart(p.id);
                  const isOutOfStock = !p.isAvailable || p.stock <= 0;
                  const hasDiscount = p.discountPrice && p.discountPrice < p.price;
                  const displayPrice = hasDiscount ? p.discountPrice : p.price;
                  const packLabel = p.unit && p.unit !== "—" ? p.unit : "Standard Pack";

                  return (
                    <div
                      key={p.id}
                      className="bg-white dark:bg-[#14141A] border border-[#E6E6EE] dark:border-[#272733] rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-[#D70F64]/40 transition-all duration-200 flex flex-col relative group"
                    >
                      {isOutOfStock ? (
                        <div className="absolute top-2.5 left-2.5 z-10 bg-zinc-900/90 text-white font-bold text-[10px] uppercase tracking-wider py-0.5 px-2 rounded-md border border-white/15">
                          Out of Stock
                        </div>
                      ) : hasDiscount ? (
                        <div className="absolute top-2.5 left-2.5 z-10 bg-[#D70F64] text-white font-bold text-[10px] uppercase tracking-wider py-0.5 px-2 rounded-md">
                          {`${Math.round(((p.price - p.discountPrice!) / p.price) * 100)}% OFF`}
                        </div>
                      ) : null}

                      <div className="relative h-32 sm:h-40 bg-[#FFF5F8] dark:bg-[#1B1B23] shrink-0 select-none overflow-hidden">
                        <GroceryProductImage
                          product={p}
                          categoryName={categoryNameMap[p.categoryId] || "Grocery"}
                        />
                      </div>

                      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-[#D70F64] dark:text-[#FF4D94] uppercase tracking-wider block">
                            {packLabel}
                          </span>
                          <h4 className="font-bold text-[#14141A] dark:text-[#F5F5F8] text-xs sm:text-sm leading-snug line-clamp-2">
                            {p.name}
                          </h4>
                        </div>

                        <div className="space-y-2.5 pt-2 border-t border-[#EFEFF5] dark:border-[#23232E]">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-sm font-extrabold text-[#14141A] dark:text-white font-mono tabular-nums">
                              {`Rs. ${displayPrice}`}
                            </span>
                            {hasDiscount && (
                              <span className="text-xs text-[#717185] line-through font-mono tabular-nums">
                                {`Rs. ${p.price}`}
                              </span>
                            )}
                          </div>

                          {isOutOfStock ? (
                            <button
                              type="button"
                              disabled
                              className="w-full min-h-[44px] bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center cursor-not-allowed"
                            >
                              Out of Stock
                            </button>
                          ) : qty > 0 ? (
                            <div className="flex items-center justify-between bg-[#FFF0F5] dark:bg-[#2A101B] border border-[#D70F64]/30 p-1 rounded-xl">
                              <button
                                type="button"
                                onClick={() => onUpdateCartQuantity(p.id, qty - 1)}
                                aria-label="Decrease quantity"
                                className="w-9 h-9 rounded-lg bg-white dark:bg-[#14141A] text-[#14141A] dark:text-white font-bold flex items-center justify-center cursor-pointer active:scale-95"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="text-xs font-extrabold text-[#D70F64] dark:text-[#FF4D94] font-mono tabular-nums px-2">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => onUpdateCartQuantity(p.id, qty + 1)}
                                aria-label="Increase quantity"
                                className="w-9 h-9 rounded-lg bg-[#D70F64] hover:bg-[#B80C54] text-white font-bold flex items-center justify-center cursor-pointer active:scale-95"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onAddToCart(p)}
                              className="w-full min-h-[44px] bg-[#D70F64] hover:bg-[#B80C54] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Add</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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

              <WhatsAppListOrderCard mode="grocery" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
