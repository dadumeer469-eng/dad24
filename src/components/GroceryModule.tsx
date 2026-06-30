import React, { useState } from "react";
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
    <div className="bg-zinc-950 text-zinc-100 min-h-screen py-6 sm:py-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 space-y-6 sm:space-y-8">
        
        {/* Glowing Orange Welcome Banner */}
        <div 
          className="relative overflow-hidden p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 border border-orange-500/20"
          style={{ 
            backgroundImage: `url("https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200")`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        >
          {/* VIP Premium overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-pink-950/40 z-0"></div>
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl z-0"></div>
          
          <div className="relative space-y-2.5 z-10 text-center md:text-left">
            <span className="inline-flex items-center gap-1.5 bg-orange-600/20 border border-orange-500/40 text-pink-300 py-1.5 px-4 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-orange-400" />
              Dadu Fresh VIP Mart
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white uppercase drop-shadow-md">
              Instant Groceries <span className="text-orange-400 bg-orange-500/15 border border-orange-500/20 px-2 rounded-xl">Fast Delivery</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 font-medium max-w-xl">
              We stock 100% fresh dairy, farm veggies, bread and sweets delivered to your door in minutes!
            </p>
          </div>

          <div className="relative shrink-0 flex items-center justify-center bg-zinc-900/80 border border-orange-500/30 p-5 rounded-2xl backdrop-blur-md z-10 shadow-lg shadow-orange-500/10">
            <ShoppingBasket className="w-14 h-14 text-orange-500 stroke-[1.5] filter drop-shadow-md animate-bounce" />
          </div>
        </div>

        {/* Sticky horizontal categories filter list */}
        <div className="sticky top-12 z-30 bg-zinc-950/90 backdrop-blur-md py-3 border-y border-zinc-850">
          <div className="flex items-start gap-3 overflow-x-auto pb-2 scrollbar-none px-1">
            <button
              onClick={() => setSelectedCategoryId("All")}
              className={`p-2 w-[76px] sm:w-[88px] rounded-2xl text-[9px] sm:text-[10px] font-extrabold tracking-wide uppercase transition shrink-0 cursor-pointer select-none border flex flex-col items-center justify-start gap-1.5 ${
                selectedCategoryId === "All"
                  ? "bg-orange-500/10 text-orange-400 border-orange-500 shadow-lg shadow-orange-500/10"
                  : "bg-zinc-900/50 text-zinc-400 border-zinc-800/50 hover:bg-zinc-800"
              }`}
            >
              <div className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full text-2xl sm:text-3xl shrink-0 transition-transform ${selectedCategoryId === "All" ? "bg-orange-500 text-white scale-105" : "bg-zinc-800 text-zinc-400"}`}>
                🛒
              </div>
              <span className="text-center leading-tight line-clamp-2 mt-0.5">All Items</span>
            </button>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="p-2 w-[76px] sm:w-[88px] rounded-2xl border border-zinc-800/50 bg-zinc-900/50 flex flex-col items-center justify-start gap-1.5 shrink-0 animate-pulse">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-zinc-800 shrink-0" />
                  <div className="w-10 h-2 sm:h-3 rounded-full bg-zinc-800 mt-0.5" />
                </div>
              ))
            ) : (
              activeCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`p-2 w-[76px] sm:w-[88px] rounded-2xl text-[9px] sm:text-[10px] font-extrabold tracking-wide uppercase transition shrink-0 cursor-pointer select-none border flex flex-col items-center justify-start gap-1.5 ${
                    selectedCategoryId === cat.id
                      ? "bg-orange-500/10 text-orange-400 border-orange-500 shadow-lg shadow-orange-500/10"
                      : "bg-zinc-900/50 text-zinc-400 border-zinc-800/50 hover:bg-zinc-800"
                  }`}
                >
                  {cat.imageUrl ? (
                    <LazyImage src={cat.imageUrl} alt="" className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full shrink-0 transition-transform border-2 overflow-hidden ${selectedCategoryId === cat.id ? "border-orange-500 scale-105" : "border-transparent"}`} />
                  ) : (
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full text-xl sm:text-2xl shrink-0 transition-transform border-2 ${selectedCategoryId === cat.id ? "bg-orange-500 text-white border-orange-500 scale-105" : "bg-zinc-800 text-zinc-400 border-transparent"}`}>
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
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-orange-500">
              {selectedCategoryId === "All"
                ? "All Grocery Essentials"
                : activeCategories.find((c) => c.id === selectedCategoryId)?.name || "Groceries"}{" "}
              ({filteredProducts.length})
            </h3>
            {searchQuery && (
              <span className="text-[10px] sm:text-xs text-zinc-500 font-bold uppercase tracking-wider">
                Matching "{searchQuery}"
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl animate-pulse flex flex-col h-full">
                  <div className="h-28 sm:h-44 bg-zinc-800 shrink-0" />
                  <div className="p-3 sm:p-4.5 flex-1 flex flex-col gap-3">
                    <div className="h-2 sm:h-3 w-1/3 bg-zinc-800 rounded-full" />
                    <div className="h-4 sm:h-5 w-3/4 bg-zinc-800 rounded-full" />
                    <div className="mt-auto h-8 sm:h-10 w-full bg-zinc-800 rounded-xl" />
                  </div>
                </div>
              ))
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full py-16 flex flex-col items-center justify-center text-center space-y-4">
                <Package className="w-16 h-16 text-zinc-800 mb-2" />
                <h4 className="font-black text-sm text-zinc-100 uppercase tracking-tight">No Products Found</h4>
                <p className="text-[11px] text-zinc-500 font-bold max-w-xs leading-relaxed">
                  We couldn't find any grocery items matching your criteria. Try adjusting your search or category filter.
                </p>
              </div>
            ) : (
              filteredProducts.map((p) => {
              const qty = getProductQuantityInCart(p.id);
              const hasDiscount = p.discountPrice && p.discountPrice < p.price;
              const displayPrice = hasDiscount ? p.discountPrice : p.price;

              return (
                <div
                  key={p.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl hover:border-orange-500/30 transition-all duration-300 flex flex-col relative group"
                >
                  {/* Stock Out Overlay Badge */}
                  {(!p.isAvailable || p.stock <= 0) && (
                    <div className="absolute inset-0 bg-zinc-950/90 z-20 flex flex-col items-center justify-center text-center p-3">
                      <AlertCircle className="w-8 h-8 text-orange-500 mb-1.5" />
                      <span className="font-extrabold text-xs sm:text-sm uppercase tracking-widest text-orange-500">
                        Stocked Out
                      </span>
                      <span className="text-[8px] sm:text-[10px] text-zinc-500 mt-1 font-bold">
                        Back Soon
                      </span>
                    </div>
                  )}

                  {/* Discount Percentage Badge */}
                  {hasDiscount && p.isAvailable && p.stock > 0 && (
                    <div className="absolute top-2.5 left-2.5 z-10 bg-orange-500 text-white font-black text-[9px] uppercase tracking-widest py-0.5 px-2 rounded-md shadow-lg border border-orange-400">
                      SAVE {Math.round(((p.price - p.discountPrice!) / p.price) * 100)}%
                    </div>
                  )}

                  {/* Item Image */}
                  <div className="relative h-28 sm:h-44 bg-zinc-950 shrink-0 select-none overflow-hidden">
                    <LazyImage
                      referrerPolicy="no-referrer"
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-full"
                      imgClassName="group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/40 via-transparent to-transparent"></div>
                  </div>

                  {/* Card Content details */}
                  <div className="p-3 sm:p-4.5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1 sm:space-y-1.5">
                      <span className="text-[8.5px] font-black text-orange-500 uppercase tracking-widest block">
                        Rs. {displayPrice} / {p.unit}
                      </span>
                      <h4 className="font-bold text-zinc-100 text-xs sm:text-sm tracking-tight leading-snug group-hover:text-orange-500 transition line-clamp-1">
                        {p.name}
                      </h4>
                      <p className="text-[9px] sm:text-[10.5px] text-zinc-450 leading-tight font-medium">
                        Standard Weight: {p.unit === "kg" ? "Local Kilo Pack" : p.unit === "litre" ? "Liter Box" : "Single Piece"} • Unit: {p.unit}
                      </p>
                    </div>

                    {/* Bottom visual section: price discount details & button */}
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs sm:text-sm font-black text-orange-500 font-mono">
                          Rs. {displayPrice}
                        </span>
                        {hasDiscount && (
                          <span className="text-[9px] sm:text-[10.5px] text-zinc-500 line-through font-bold font-mono">
                            Rs. {p.price}
                          </span>
                        )}
                      </div>

                      {qty > 0 ? (
                        <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 p-1 rounded-xl">
                          <button
                            onClick={() => onUpdateCartQuantity(p.id, qty - 1)}
                            className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 transition font-black flex items-center justify-center cursor-pointer active:scale-90"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-black text-white font-mono shrink-0">
                            {qty}
                          </span>
                          <button
                            onClick={() => onUpdateCartQuantity(p.id, qty + 1)}
                            className="w-8 h-8 rounded-lg bg-orange-600 hover:bg-orange-700 text-white transition font-black flex items-center justify-center cursor-pointer active:scale-90"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onAddToCart(p)}
                          className="w-full py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider transition active:scale-95 shadow-md flex items-center justify-center gap-1 cursor-pointer select-none"
                        >
                          <Plus className="w-3 h-3" /> Add To Grocery Cart
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
