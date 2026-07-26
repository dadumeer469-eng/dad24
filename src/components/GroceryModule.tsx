import React, { useState } from "react";
import { motion } from "motion/react";
import { GroceryCategory, GroceryProduct, GroceryOrderItem } from "../types";
import { ShoppingBasket, Package, Plus, Slash, Minus, Sparkles, Star, AlertCircle, ShoppingBag } from "lucide-react";
import { LazyImage } from "./LazyImage";

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
  onRemoveFromCart,
  searchQuery = "",
}: GroceryModuleProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("All");

  // Filter grocery categories and products in safe manner
  const activeCategories = categories.filter((c) => c.isAvailable);
  const activeCategoryIdList = activeCategories.map((c) => c.id);

  const filteredProducts = products.filter((p) => {
    // Basic active category matching
    const matchesCategory =
      selectedCategoryId === "All" || p.categoryId === selectedCategoryId;
    // Check if category itself is available
    const isCategoryEnabled = activeCategoryIdList.includes(p.categoryId);
    // Search query matches
    const matchesSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && isCategoryEnabled && matchesSearch;
  });

  const getProductQuantityInCart = (prodId: string) => {
    const item = cartItems.find((i) => i.productId === prodId);
    return item ? item.quantity : 0;
  };

  return (
    <div className="bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 min-h-screen py-5 sm:py-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 space-y-5 sm:space-y-8">
        
        {/* Pandamart Fresh Modern Banner */}
        <div 
          className="relative overflow-hidden p-6 sm:p-9 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-emerald-500/20"
          style={{ 
            backgroundImage: `url("https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200")`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        >
          {/* Overlay with fresh gradient gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/90 via-slate-950/80 to-[#D70F64]/40 z-0"></div>
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl z-0"></div>
          
          <div className="relative space-y-2.5 z-10 text-center md:text-left">
            <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 py-1.5 px-4 rounded-full text-[10.5px] font-black uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              Dadu Express Mart
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white uppercase drop-shadow-md">
              Fresh Groceries <span className="text-emerald-300 bg-emerald-500/25 border border-emerald-400/30 px-2.5 py-0.5 rounded-xl">15 Min Delivery</span>
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 font-medium max-w-xl">
              100% Organic dairy, farm-fresh vegetables, bakery goods, snacks and daily essentials at your doorstep!
            </p>
          </div>

          <div className="relative shrink-0 flex items-center justify-center bg-white/10 dark:bg-zinc-900/80 border border-emerald-400/30 p-5 rounded-2xl backdrop-blur-md z-10 shadow-lg">
            <ShoppingBasket className="w-12 h-12 text-emerald-300 stroke-[1.75] filter drop-shadow-md animate-bounce" />
          </div>
        </div>

        {/* Sticky horizontal categories filter list */}
        <div className="relative z-30 bg-slate-50/90 dark:bg-zinc-950/90 backdrop-blur-md py-2.5 border-y border-slate-200/80 dark:border-zinc-800">
          <div className="flex items-start gap-2.5 sm:gap-3.5 overflow-x-auto pb-2 scrollbar-none px-1">
            <button
              onClick={() => setSelectedCategoryId("All")}
              className={`p-2 sm:p-2.5 w-[78px] sm:w-[92px] rounded-2xl text-[9.5px] sm:text-[10.5px] font-black tracking-wide uppercase transition shrink-0 cursor-pointer select-none border flex flex-col items-center justify-start gap-1.5 shadow-2xs ${
                selectedCategoryId === "All"
                  ? "bg-[#D70F64] text-white border-[#D70F64] shadow-md shadow-[#D70F64]/20 scale-[1.02]"
                  : "bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-zinc-800"
              }`}
            >
              <div className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-2xl text-2xl sm:text-3xl shrink-0 transition-transform ${selectedCategoryId === "All" ? "bg-white/20 text-white" : "bg-emerald-50 dark:bg-zinc-800 text-emerald-600"}`}>
                🛒
              </div>
              <span className="text-center leading-tight line-clamp-2 mt-0.5">All Items</span>
            </button>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="p-2 w-[78px] sm:w-[92px] rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col items-center justify-start gap-1.5 shrink-0 animate-pulse">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-200 dark:bg-zinc-800 shrink-0" />
                  <div className="w-12 h-2.5 rounded-full bg-slate-200 dark:bg-zinc-800 mt-0.5" />
                </div>
              ))
            ) : (
              activeCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`p-2 sm:p-2.5 w-[78px] sm:w-[92px] rounded-2xl text-[9.5px] sm:text-[10.5px] font-black tracking-wide uppercase transition shrink-0 cursor-pointer select-none border flex flex-col items-center justify-start gap-1.5 shadow-2xs ${
                    selectedCategoryId === cat.id
                      ? "bg-[#D70F64] text-white border-[#D70F64] shadow-md shadow-[#D70F64]/20 scale-[1.02]"
                      : "bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-zinc-800"
                  }`}
                >
                  {cat.imageUrl ? (
                    <LazyImage src={cat.imageUrl} alt="" className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl shrink-0 transition-transform border overflow-hidden ${selectedCategoryId === cat.id ? "border-white" : "border-slate-100 dark:border-zinc-800"}`} />
                  ) : (
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-2xl text-xl sm:text-2xl shrink-0 transition-transform ${selectedCategoryId === cat.id ? "bg-white/20 text-white" : "bg-emerald-50 dark:bg-zinc-800 text-emerald-600"}`}>
                      📦
                    </div>
                  )}
                  <span className="text-center leading-tight line-clamp-2 mt-0.5">{cat.name}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Grid of grocery products */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
              {selectedCategoryId === "All"
                ? "All Grocery Essentials"
                : activeCategories.find((c) => c.id === selectedCategoryId)?.name || "Groceries"}{" "}
              <span className="text-xs text-slate-500 font-bold">({filteredProducts.length})</span>
            </h3>
            {searchQuery && (
              <span className="text-[10px] sm:text-xs text-[#D70F64] font-bold uppercase tracking-wider bg-pink-50 dark:bg-pink-950/40 px-2.5 py-1 rounded-full border border-pink-200 dark:border-pink-800">
                Search: "{searchQuery}"
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm animate-pulse flex flex-col h-full">
                  <div className="h-32 sm:h-48 bg-slate-100 dark:bg-zinc-800 shrink-0" />
                  <div className="p-3 sm:p-4 flex-1 flex flex-col gap-3">
                    <div className="h-2.5 w-1/3 bg-slate-200 dark:bg-zinc-800 rounded-full" />
                    <div className="h-4 w-3/4 bg-slate-200 dark:bg-zinc-800 rounded-full" />
                    <div className="mt-auto h-9 w-full bg-slate-200 dark:bg-zinc-800 rounded-xl" />
                  </div>
                </div>
              ))
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full py-16 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-zinc-800 flex flex-col items-center justify-center text-center space-y-3 p-6 shadow-2xs">
                <Package className="w-14 h-14 text-slate-300 dark:text-zinc-700" />
                <h4 className="font-black text-sm text-slate-800 dark:text-zinc-200 uppercase tracking-tight">No Groceries Found</h4>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium max-w-xs leading-relaxed">
                  Is category me koi product nahi mila. Dusri category ya search query check karein.
                </p>
              </div>
            ) : (
              filteredProducts.map((p) => {
              const qty = getProductQuantityInCart(p.id);
              const hasDiscount = p.discountPrice && p.discountPrice < p.price;
              const displayPrice = hasDiscount ? p.discountPrice : p.price;

              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs hover:shadow-md hover:border-emerald-400 dark:hover:border-emerald-500/40 transition-all duration-300 flex flex-col relative group"
                >
                  {/* Stock Out Overlay Badge */}
                  {(!p.isAvailable || p.stock <= 0) && (
                    <div className="absolute inset-0 bg-white/95 dark:bg-zinc-950/95 z-20 flex flex-col items-center justify-center text-center p-3 backdrop-blur-2xs">
                      <AlertCircle className="w-8 h-8 text-rose-500 mb-1" />
                      <span className="font-black text-xs uppercase tracking-widest text-rose-600">
                        Out Of Stock
                      </span>
                      <span className="text-[9px] text-slate-500 dark:text-zinc-400 mt-0.5 font-bold">
                        Wapas Aayega
                      </span>
                    </div>
                  )}

                  {/* Discount Percentage Badge */}
                  {hasDiscount && p.isAvailable && p.stock > 0 && (
                    <div className="absolute top-2.5 left-2.5 z-10 bg-[#D70F64] text-white font-black text-[9px] uppercase tracking-wider py-1 px-2.5 rounded-lg shadow-md">
                      {Math.round(((p.price - p.discountPrice!) / p.price) * 100)}% OFF
                    </div>
                  )}

                  {/* Item Image */}
                  <div className="relative h-32 sm:h-48 bg-slate-50 dark:bg-zinc-950 shrink-0 select-none overflow-hidden p-3 flex items-center justify-center">
                    <LazyImage
                      referrerPolicy="no-referrer"
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-full object-contain"
                      imgClassName="group-hover:scale-105 transition-transform duration-500 object-contain"
                    />
                  </div>

                  {/* Card Content details */}
                  <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">
                        Unit: {p.unit}
                      </span>
                      <h4 className="font-black text-slate-900 dark:text-zinc-100 text-xs sm:text-sm tracking-tight leading-snug group-hover:text-[#D70F64] transition line-clamp-1">
                        {p.name}
                      </h4>
                      <p className="text-[9.5px] sm:text-[10.5px] text-slate-500 dark:text-zinc-400 leading-tight font-medium line-clamp-1">
                        Fresh Quality • {p.unit === "kg" ? "1 Kilo Pack" : p.unit === "litre" ? "1 Liter Box" : "Standard Pack"}
                      </p>
                    </div>

                    {/* Bottom visual section: price discount details & button */}
                    <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-zinc-800">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white font-mono">
                          Rs. {displayPrice}
                        </span>
                        {hasDiscount && (
                          <span className="text-[9.5px] sm:text-[10.5px] text-slate-400 line-through font-bold font-mono">
                            Rs. {p.price}
                          </span>
                        )}
                      </div>

                      {qty > 0 ? (
                        <div className="flex items-center justify-between bg-emerald-50 dark:bg-zinc-800 border border-emerald-200 dark:border-zinc-700 p-1 rounded-xl">
                          <button
                            onClick={() => onUpdateCartQuantity(p.id, qty - 1)}
                            className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-900 hover:bg-slate-100 text-slate-900 dark:text-white transition font-black flex items-center justify-center cursor-pointer shadow-2xs active:scale-90"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 font-mono shrink-0 px-2">
                            {qty}
                          </span>
                          <button
                            onClick={() => onUpdateCartQuantity(p.id, qty + 1)}
                            className="w-8 h-8 rounded-lg bg-[#D70F64] hover:bg-[#b00c50] text-white transition font-black flex items-center justify-center cursor-pointer shadow-2xs active:scale-90"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onAddToCart(p)}
                          className="w-full py-2.5 px-3 rounded-xl bg-[#D70F64] hover:bg-[#b00c50] text-white font-black text-[10.5px] sm:text-xs uppercase tracking-wider transition active:scale-95 shadow-md shadow-[#D70F64]/10 flex items-center justify-center gap-1.5 cursor-pointer select-none"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add To Grocery
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
