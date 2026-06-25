import React, { useState } from "react";
import { GroceryCategory, GroceryProduct, GroceryOrderItem } from "../types";
import { ShoppingBasket, Package, Plus, Slash, Minus, Sparkles, Star, AlertCircle, ShoppingBag } from "lucide-react";

interface GroceryModuleProps {
  categories: GroceryCategory[];
  products: GroceryProduct[];
  onAddToCart: (product: GroceryProduct) => void;
  cartItems: GroceryOrderItem[];
  onUpdateCartQuantity: (productId: string, quantity: number) => void;
  onRemoveFromCart: (productId: string) => void;
  searchQuery: string;
  favorites: string[];
  toggleFavorite: (itemId: string) => void;
}

export default function GroceryModule({
  categories = [],
  products = [],
  onAddToCart,
  cartItems = [],
  onUpdateCartQuantity,
  onRemoveFromCart,
  searchQuery = "",
  favorites = [],
  toggleFavorite,
}: GroceryModuleProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("All");

  // Filter grocery categories and products in safe manner
  const activeCategories = categories.filter((c) => c.isAvailable);
  const activeCategoryIdList = activeCategories.map((c) => c.id);

  const filteredProducts = products.filter((p) => {
    // Basic active category matching including favorites
    const matchesCategory =
      selectedCategoryId === "Bookmarks"
        ? favorites.includes(p.id)
        : (selectedCategoryId === "All" || p.categoryId === selectedCategoryId);
    // Check if category itself is available or selected as favorites
    const isCategoryEnabled = selectedCategoryId === "Bookmarks" || activeCategoryIdList.includes(p.categoryId);
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
        <div className="relative overflow-hidden bg-gradient-to-r from-orange-600 to-amber-700 p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-yellow-400/20 rounded-full blur-2xl"></div>
          
          <div className="relative space-y-2 z-10 text-center md:text-left">
            <span className="inline-flex items-center gap-1.5 bg-black/25 text-amber-300 py-1 px-3.5 rounded-full text-[10px] font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-300" />
              Dadu Fresh Mart
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white uppercase">
              Instant Groceries <span className="text-yellow-300">Fast Delivery</span>
            </h2>
            <p className="text-xs sm:text-sm text-orange-50 font-medium">
              We stock 100% fresh dairy, farm veggies, bread and sweets delivered to your door in minutes!
            </p>
          </div>

          <div className="relative shrink-0 flex items-center justify-center bg-white/10 border border-white/20 p-5 rounded-2xl backdrop-blur-md z-10">
            <ShoppingBasket className="w-14 h-14 text-white stroke-[1.5] filter drop-shadow-md animate-bounce" />
          </div>
        </div>

        {/* Sticky horizontal categories filter list */}
        <div className="sticky top-12 z-30 bg-zinc-950/90 backdrop-blur-md py-3 border-y border-zinc-850">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategoryId("All")}
              className={`py-2 px-4 sm:py-2.5 sm:px-5 rounded-xl text-xs font-extrabold tracking-wide uppercase transition shrink-0 cursor-pointer select-none border ${
                selectedCategoryId === "All"
                  ? "bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/25"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"
              }`}
            >
              🛒 All Items
            </button>
            <button
              onClick={() => setSelectedCategoryId("Bookmarks")}
              className={`py-2 px-4 sm:py-2.5 sm:px-5 rounded-xl text-xs font-extrabold tracking-wide uppercase transition shrink-0 cursor-pointer select-none border ${
                selectedCategoryId === "Bookmarks"
                  ? "bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/25 animate-pulse"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"
              }`}
            >
              ❤️ Favorites
            </button>
            {activeCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`py-2 px-4 sm:py-2.5 sm:px-5 rounded-xl text-xs font-extrabold tracking-wide uppercase transition shrink-0 cursor-pointer select-none border ${
                  selectedCategoryId === cat.id
                    ? "bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/25"
                    : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Items Display Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold tracking-wider text-zinc-400 uppercase border-b border-zinc-850 pb-2.5">
              {selectedCategoryId === "All" ? "Full Catalog" : selectedCategoryId === "Bookmarks" ? "Favorites List" : categories.find((c) => c.id === selectedCategoryId)?.name} Directory ({filteredProducts.length})
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {filteredProducts.map((p) => {
              const qty = getProductQuantityInCart(p.id);
              const hasDiscount = p.discountPrice && p.discountPrice < p.price;
              const displayPrice = hasDiscount ? p.discountPrice : p.price;
              const isBookmarked = favorites.includes(p.id);

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

                  {/* Favorite Bookmark Heart Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(p.id);
                    }}
                    className="absolute top-2.5 right-2.5 z-10 w-7 h-7 sm:w-9 sm:h-9 bg-zinc-950/90 hover:bg-zinc-900 text-zinc-400 hover:text-orange-500 rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition cursor-pointer border border-zinc-800/50"
                    title={isBookmarked ? "Remove from Favorites" : "Add to Favorites"}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill={isBookmarked ? "#ea580c" : "none"}
                      stroke={isBookmarked ? "#ea580c" : "currentColor"}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4 sm:w-5 h-5 transition-colors duration-300"
                    >
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                    </svg>
                  </button>

                  {/* Discount Percentage Badge */}
                  {hasDiscount && p.isAvailable && p.stock > 0 && (
                    <div className="absolute top-2.5 left-2.5 z-10 bg-orange-500 text-white font-black text-[9px] uppercase tracking-widest py-0.5 px-2 rounded-md shadow-lg border border-orange-400">
                      SAVE {Math.round(((p.price - p.discountPrice!) / p.price) * 100)}%
                    </div>
                  )}

                  {/* Item Image */}
                  <div className="relative h-28 sm:h-44 bg-zinc-950 shrink-0 select-none overflow-hidden">
                    <img
                      referrerPolicy="no-referrer"
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
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
                          <span className="text-[9px] sm:text-[10.5px] text-zinc-505 line-through font-bold font-mono">
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
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="bg-zinc-900 border border-zinc-850 p-12 rounded-3xl text-center space-y-3 max-w-md mx-auto mt-6">
              <ShoppingBag className="w-10 h-10 text-zinc-505 mx-auto" />
              <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">
                We couldn't find any grocery products matching "{searchQuery}"!
              </p>
              <button
                onClick={() => setSelectedCategoryId("All")}
                className="bg-zinc-800 hover:bg-zinc-750 text-zinc-200 font-bold py-2 px-5 text-xs rounded-xl cursor-pointer transition-colors"
              >
                Reset Category
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
