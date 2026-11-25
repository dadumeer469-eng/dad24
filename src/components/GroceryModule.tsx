import React, { useState } from "react";
import { GroceryCategory, GroceryProduct, GroceryOrderItem } from "../types";
import { ShoppingBasket, Package, Plus, Minus, AlertCircle } from "lucide-react";
import { LazyImage } from "./LazyImage";
import DaduLogoLoader from "./DaduLogoLoader";
import useLazyBatchLoad from "../hooks/useLazyBatchLoad";
import WhatsAppListOrderCard from "./WhatsAppListOrderCard";

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

  const activeCategories = categories.filter((c) => c.isAvailable);
  const activeCategoryIdList = activeCategories.map((c) => c.id);

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategoryId === "All" || p.categoryId === selectedCategoryId;
    const isCategoryEnabled =
      activeCategoryIdList.length === 0 || activeCategoryIdList.includes(p.categoryId);
    const q = (searchQuery || "").trim().toLowerCase();
    const matchesSearch =
      !q ||
      (p.name || "").toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q);

    return matchesCategory && isCategoryEnabled && matchesSearch;
  });

  const { visibleItems, hasMore, observerTargetRef } = useLazyBatchLoad(filteredProducts, 12);

  const getProductQuantityInCart = (prodId: string) => {
    const item = cartItems.find((i) => i.productId === prodId);
    return item ? item.quantity : 0;
  };

  return (
    <div className="bg-[#F9F9FB] dark:bg-[#0B0B0F] text-[#14141A] dark:text-[#F5F5F8] min-h-screen py-4 sm:py-6 transition-colors duration-200">
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
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B0F]/95 via-[#0B0B0F]/85 to-[#0B0B0F]/60 z-0" />

          <div className="relative space-y-2 z-10 max-w-xl">
            <span className="inline-flex items-center gap-1.5 bg-[#E21B70] text-white py-1 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider shadow-xs">
              DADU EXPRESS MART
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Daily Groceries Delivered Fast in Dadu
            </h2>
            <p className="text-xs sm:text-sm text-zinc-200 font-medium leading-relaxed">
              Order fresh milk, bread, eggs, cooking oil, tea, and household essentials — or send your full shopping list on WhatsApp.
            </p>
          </div>

          <div className="relative shrink-0 hidden sm:flex items-center justify-center bg-[#14141A]/90 border border-white/20 p-4 rounded-2xl z-10">
            <ShoppingBasket className="w-10 h-10 text-[#FF4D94] stroke-[1.8]" />
          </div>
        </div>

        {/* Category Filter Strip (Only shown when real grocery categories exist) */}
        {activeCategories.length > 0 && (
          <div className="relative z-30 bg-[#F9F9FB]/95 dark:bg-[#0B0B0F]/95 backdrop-blur-md py-2 border-y border-[#E6E6EE] dark:border-[#272733]">
            <div className="flex items-start gap-2.5 overflow-x-auto pb-1 scrollbar-none touch-pan-both overscroll-x-contain">
              <button
                type="button"
                onClick={() => setSelectedCategoryId("All")}
                className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer border flex items-center gap-2 ${
                  selectedCategoryId === "All"
                    ? "bg-[#E21B70] text-white border-[#E21B70] shadow-xs"
                    : "bg-white dark:bg-[#14141A] text-[#14141A] dark:text-[#F5F5F8] border-[#E6E6EE] dark:border-[#272733] hover:border-[#E21B70]/50"
                }`}
              >
                <span>🛒</span>
                <span>All Items</span>
              </button>
              {activeCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer border flex items-center gap-2 ${
                    selectedCategoryId === cat.id
                      ? "bg-[#E21B70] text-white border-[#E21B70] shadow-xs"
                      : "bg-white dark:bg-[#14141A] text-[#14141A] dark:text-[#F5F5F8] border-[#E6E6EE] dark:border-[#272733] hover:border-[#E21B70]/50"
                  }`}
                >
                  {cat.imageUrl ? (
                    <LazyImage
                      src={cat.imageUrl}
                      alt={cat.name}
                      className="w-6 h-6 rounded-md overflow-hidden shrink-0"
                    />
                  ) : (
                    <span>📦</span>
                  )}
                  <span className="whitespace-nowrap">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Grocery Products or Honest Empty State + WhatsApp List Ordering */}
        <div>
          {filteredProducts.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm sm:text-base font-extrabold text-[#14141A] dark:text-[#F5F5F8]">
                {selectedCategoryId === "All"
                  ? "Grocery Essentials"
                  : activeCategories.find((c) => c.id === selectedCategoryId)?.name || "Groceries"}{" "}
                <span className="text-xs text-[#5A5A6B] dark:text-[#A1A1B2] font-semibold tabular-nums">
                  ({filteredProducts.length})
                </span>
              </h3>
              {searchQuery && (
                <span className="text-xs text-[#E21B70] dark:text-[#FF4D94] font-bold">
                  Search: &ldquo;{searchQuery}&rdquo;
                </span>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="py-12 flex justify-center">
              <DaduLogoLoader text="Loading grocery items..." />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="space-y-5">
              <div className="py-10 px-5 bg-white dark:bg-[#14141A] rounded-2xl sm:rounded-3xl border border-[#E6E6EE] dark:border-[#272733] flex flex-col items-center justify-center text-center space-y-2.5">
                <div className="w-14 h-14 rounded-2xl bg-[#FDF2F6] dark:bg-[#2A121D] text-[#E21B70] dark:text-[#FF4D94] flex items-center justify-center">
                  <Package className="w-7 h-7" />
                </div>
                <h3 className="font-extrabold text-base text-[#14141A] dark:text-[#F5F5F8]">
                  {searchQuery
                    ? `No grocery items match "${searchQuery}"`
                    : "Online Grocery Catalog Coming Soon"}
                </h3>
                <p className="text-xs sm:text-sm text-[#5A5A6B] dark:text-[#A1A1B2] max-w-md leading-relaxed">
                  {searchQuery
                    ? "Try a different keyword, or send your exact grocery list below on WhatsApp and our rider will shop and deliver it across Dadu."
                    : "We haven't published packaged grocery items in the online shelf yet — use our instant WhatsApp List Order below and our rider will pick up fresh groceries for you in Dadu City."}
                </p>
              </div>

              <WhatsAppListOrderCard mode="grocery" />
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
                {visibleItems.map((p) => {
                  const qty = getProductQuantityInCart(p.id);
                  const hasDiscount = p.discountPrice && p.discountPrice < p.price;
                  const displayPrice = hasDiscount ? p.discountPrice : p.price;

                  return (
                    <div
                      key={p.id}
                      className="bg-white dark:bg-[#14141A] border border-[#E6E6EE] dark:border-[#272733] rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-[#E21B70]/40 transition-all duration-200 flex flex-col relative group"
                    >
                      {(!p.isAvailable || p.stock <= 0) && (
                        <div className="absolute inset-0 bg-white/95 dark:bg-[#0B0B0F]/95 z-20 flex flex-col items-center justify-center text-center p-3">
                          <AlertCircle className="w-7 h-7 text-[#DC2626] mb-1" />
                          <span className="font-bold text-xs uppercase tracking-wider text-[#DC2626]">
                            Out of Stock
                          </span>
                        </div>
                      )}

                      {hasDiscount && p.isAvailable && p.stock > 0 && (
                        <div className="absolute top-2.5 left-2.5 z-10 bg-[#E21B70] text-white font-bold text-[10px] uppercase tracking-wider py-0.5 px-2 rounded-md">
                          {Math.round(((p.price - p.discountPrice!) / p.price) * 100)}% OFF
                        </div>
                      )}

                      <div className="relative h-32 sm:h-44 bg-[#F9F9FB] dark:bg-[#1B1B23] shrink-0 select-none overflow-hidden p-3 flex items-center justify-center">
                        <LazyImage
                          referrerPolicy="no-referrer"
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-full h-full object-contain"
                          imgClassName="group-hover:scale-105 transition-transform duration-300 object-contain"
                        />
                      </div>

                      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-[#E21B70] dark:text-[#FF4D94] uppercase tracking-wider block">
                            {p.unit}
                          </span>
                          <h4 className="font-bold text-[#14141A] dark:text-[#F5F5F8] text-xs sm:text-sm leading-snug line-clamp-2">
                            {p.name}
                          </h4>
                        </div>

                        <div className="space-y-2.5 pt-2 border-t border-[#EFEFF5] dark:border-[#23232E]">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-sm font-extrabold text-[#14141A] dark:text-white font-mono tabular-nums">
                              Rs. {displayPrice}
                            </span>
                            {hasDiscount && (
                              <span className="text-xs text-[#717185] line-through font-mono tabular-nums">
                                Rs. {p.price}
                              </span>
                            )}
                          </div>

                          {qty > 0 ? (
                            <div className="flex items-center justify-between bg-[#FDF2F6] dark:bg-[#2A121D] border border-[#E21B70]/30 p-1 rounded-xl">
                              <button
                                type="button"
                                onClick={() => onUpdateCartQuantity(p.id, qty - 1)}
                                aria-label="Decrease quantity"
                                className="w-9 h-9 rounded-lg bg-white dark:bg-[#14141A] text-[#14141A] dark:text-white font-bold flex items-center justify-center cursor-pointer active:scale-95"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="text-xs font-extrabold text-[#E21B70] dark:text-[#FF4D94] font-mono tabular-nums px-2">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => onUpdateCartQuantity(p.id, qty + 1)}
                                aria-label="Increase quantity"
                                className="w-9 h-9 rounded-lg bg-[#E21B70] hover:bg-[#C2145E] text-white font-bold flex items-center justify-center cursor-pointer active:scale-95"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onAddToCart(p)}
                              disabled={!p.isAvailable || p.stock <= 0}
                              className="w-full min-h-[44px] bg-[#E21B70] hover:bg-[#C2145E] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
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

              {hasMore && <div ref={observerTargetRef} className="h-4" />}

              <WhatsAppListOrderCard mode="grocery" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
