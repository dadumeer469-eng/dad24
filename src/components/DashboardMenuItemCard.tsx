import React from "react";
import { motion } from "motion/react";
import { Dish } from "../types";
import { LazyImage } from "./LazyImage";
import { Heart, Clock, Wrench, BadgeAlert, Plus, Minus } from "lucide-react";

interface DashboardMenuItemCardProps {
  dish: Dish;
  idx: number;
  isRestaurantClosed: boolean;
  openingTime?: string;
  isFavorite: boolean;
  quantityInCart: number;
  onToggleFavorite: (id: string) => void;
  onSelectDetail: (dish: Dish) => void;
  onAddToCart: (dish: Dish) => void;
  onUpdateCartQuantity: (dishId: string, qty: number) => void;
}

export const DashboardMenuItemCard = React.memo(function DashboardMenuItemCard({
  dish,
  idx,
  isRestaurantClosed,
  openingTime,
  isFavorite,
  quantityInCart,
  onToggleFavorite,
  onSelectDetail,
  onAddToCart,
  onUpdateCartQuantity,
}: DashboardMenuItemCardProps) {
  const isSvc = dish.type === "service";
  const dishRestaurantName =
    dish.restaurantName ||
    (isSvc ? "Dadu Home Services" : "Dadu Fast Food & Kitchen");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 0.2,
        ease: "easeOut",
      }}
      className={`bg-white border border-zinc-200/80 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs hover:border-[#d70f64]/30 hover:shadow-md hover:shadow-red-500/5 transition-all flex flex-col group relative text-zinc-800 ${
        isRestaurantClosed ? "opacity-70 grayscale-[20%]" : ""
      }`}
    >
      {/* Sold Out Overlay */}
      {!dish.isAvailable && !isRestaurantClosed && (
        <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center text-center p-2 sm:p-4">
          <BadgeAlert className="w-5 h-5 sm:w-8 sm:h-8 text-zinc-400 mb-1" />
          <span className="font-extrabold text-[10px] sm:text-sm uppercase tracking-widest text-[#d70f64]">
            SOLD OUT
          </span>
          <span className="text-[8px] sm:text-[10px] text-zinc-500 mt-0.5 font-bold">
            Soon
          </span>
        </div>
      )}

      {isRestaurantClosed && (
        <div className="absolute inset-0 bg-white/70 z-20 flex flex-col items-center justify-center text-center p-2 sm:p-4 cursor-not-allowed">
          <Clock className="w-5 h-5 sm:w-8 sm:h-8 text-red-500 mb-1" />
          <span className="font-extrabold text-[10px] sm:text-sm uppercase tracking-widest text-pink-600">
            UNAVAILABLE
          </span>
          <span className="text-[9px] sm:text-xs font-bold text-zinc-800 mt-1 bg-white px-2 py-0.5 rounded shadow-sm border border-red-100">
            Opens at {openingTime || "soon"}
          </span>
        </div>
      )}

      {/* Card Image */}
      <div
        className="relative h-28 sm:h-44 bg-zinc-100 overflow-hidden shrink-0 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          if (!dish.isAvailable || isRestaurantClosed) return;
          onSelectDetail(dish);
        }}
      >
        <LazyImage
          referrerPolicy="no-referrer"
          src={
            dish.imageUrl ||
            (dish.type === "service"
              ? "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=400"
              : "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=400")
          }
          alt={dish.name}
          className="w-full h-full"
          imgClassName="group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>

        {/* Add to Favorite (Heart Icon Button) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(dish.id);
          }}
          className="absolute top-2 right-2 z-30 p-1.5 sm:p-2 rounded-full bg-white/90 hover:bg-white text-[#d70f64] hover:scale-110 active:scale-95 shadow-md transition duration-200 cursor-pointer"
          title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        >
          <Heart
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition duration-200 ${
              isFavorite
                ? "fill-[#d70f64] text-[#d70f64]"
                : "text-zinc-650 hover:text-[#d70f64]"
            }`}
          />
        </button>

        {/* Top Tag */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
          <span
            className={`text-[8px] sm:text-[10px] font-black uppercase tracking-wider py-0.5 sm:py-1 px-1.5 sm:px-2.5 rounded-md sm:rounded-lg shadow-md ${
              isSvc
                ? "bg-amber-500 text-neutral-950 font-extrabold"
                : "bg-[#d70f64] text-white"
            }`}
          >
            {isSvc ? "🛠️ Service" : "🍔 Food"}
          </span>
          {dish.discountPrice && dish.discountPrice < dish.price && (
            <span className="text-[7.5px] sm:text-[9px] font-black uppercase tracking-wider py-0.5 sm:py-0.8 px-1.5 sm:px-2 bg-gradient-to-r from-pink-500 to-pink-400 text-white rounded-md sm:rounded-lg shadow-md animate-pulse">
              🔥{" "}
              {Math.round(
                ((dish.price - dish.discountPrice) / dish.price) * 100,
              )}
              % OFF
            </span>
          )}
        </div>
      </div>

      {/* Card Contents */}
      <div className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between space-y-2 sm:space-y-3.5 bg-white">
        <div
          className="space-y-1 sm:space-y-1.5 flex-1 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (!dish.isAvailable || isRestaurantClosed) return;
            onSelectDetail(dish);
          }}
        >
          <div className="text-[8.5px] sm:text-[10.5px] text-zinc-500 font-extrabold tracking-wider uppercase flex items-center gap-1 break-words">
            <span>🏪</span> {dishRestaurantName}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-1.5">
            <h4 className="font-bold text-zinc-800 text-xs sm:text-sm tracking-tight leading-snug group-hover:text-[#d70f64] transition break-words">
              {dish.name}
            </h4>
            {dish.discountPrice && dish.discountPrice < dish.price ? (
              <div className="flex flex-col items-end shrink-0 leading-none">
                <span className="font-black text-xs sm:text-sm whitespace-nowrap text-emerald-600">
                  Rs. {dish.discountPrice}
                </span>
                <span className="text-[9px] sm:text-[10.5px] line-through text-zinc-400 font-bold mt-0.5">
                  Rs. {dish.price}
                </span>
              </div>
            ) : (
              <span
                className={`font-black text-xs sm:text-sm shrink-0 whitespace-nowrap ${
                  isSvc ? "text-amber-600" : "text-[#d70f64]"
                }`}
              >
                Rs. {dish.price}
              </span>
            )}
          </div>
        </div>

        {/* Detail Badging */}
        <div className="hidden sm:flex items-center gap-2 border-t border-zinc-100 pt-3 text-[10.5px] font-semibold text-zinc-500">
          {isSvc ? (
            <>
              <Wrench className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-amber-500 truncate font-bold">
                Visiting Fee - Repairs onsite
              </span>
            </>
          ) : (
            <>
              <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>Prep: 20-30m</span>
              <span className="text-zinc-350">•</span>
              <span className="text-emerald-600 font-bold">Fast Delivery</span>
            </>
          )}
        </div>

        {/* Add to checkout CTAs */}
        <div className="pt-1 shrink-0">
          {quantityInCart > 0 ? (
            <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 p-1.5 rounded-xl">
              <button
                onClick={() => onUpdateCartQuantity(dish.id, quantityInCart - 1)}
                className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 transition font-black flex items-center justify-center cursor-pointer active:scale-90"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-black text-white font-mono shrink-0">
                {quantityInCart}
              </span>
              <button
                onClick={() => onUpdateCartQuantity(dish.id, quantityInCart + 1)}
                className={`w-8 h-8 rounded-lg transition font-black flex items-center justify-center cursor-pointer active:scale-90 ${
                  isSvc
                    ? "bg-amber-500 hover:bg-amber-600 text-[#121212]"
                    : "bg-[#d70f64] hover:bg-[#b00c50] text-white"
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const hasCustomization =
                  (dish.sizes && dish.sizes.length > 0) ||
                  (dish.flavors && dish.flavors.length > 0) ||
                  (dish.addOns && dish.addOns.length > 0);
                if (hasCustomization) {
                  onSelectDetail(dish);
                } else {
                  onAddToCart(dish);
                }
              }}
              disabled={!dish.isAvailable || isRestaurantClosed}
              className={`w-full py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl text-[9px] sm:text-xs font-black uppercase tracking-wider transition shadow-xs flex items-center justify-center gap-1 ${
                !dish.isAvailable || isRestaurantClosed
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer"
              } ${
                isSvc
                  ? "bg-amber-500 hover:bg-amber-600 text-[#121212] font-semibold"
                  : "bg-[#d70f64] hover:bg-[#b00c50] text-white"
              }`}
            >
              {isSvc ? (
                <>
                  <span className="sm:hidden">+ Book</span>
                  <span className="hidden sm:inline">
                    Book Diagnosis (Rs. 500)
                  </span>
                </>
              ) : (
                <>
                  <span className="sm:hidden">+ Add</span>
                  <span className="hidden sm:inline">Add To Dadu Cart</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
});
