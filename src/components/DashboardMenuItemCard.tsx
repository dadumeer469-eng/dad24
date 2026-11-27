import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { springBouncy, springSnappy } from "../utils/motion";
import { Dish } from "../types";
import { LazyImage } from "./LazyImage";
import { Heart, Clock, BadgeAlert, Plus, Minus } from "lucide-react";

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
  isRestaurantClosed,
  openingTime,
  isFavorite,
  quantityInCart,
  onToggleFavorite,
  onSelectDetail,
  onAddToCart,
  onUpdateCartQuantity,
}: DashboardMenuItemCardProps) {
  const dishRestaurantName = dish.restaurantName || "Dadu Fast Food & Kitchen";
  // Reduced motion: micro-interactions become instant state changes.
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      whileHover={reduceMotion ? undefined : { y: -3 }}
      transition={springSnappy}
      className={`bg-white dark:bg-[#14141A] border border-[#E6E6EE] dark:border-[#272733] rounded-2xl overflow-hidden shadow-sm hover:border-[#E21B70]/45 hover:shadow-lg transition-[border-color,box-shadow] duration-300 flex flex-col group relative text-[#14141A] dark:text-[#F5F5F8] ${
        isRestaurantClosed ? "opacity-75 grayscale-[15%]" : ""
      }`}
    >
      {/* Sold Out Overlay */}
      {!dish.isAvailable && !isRestaurantClosed && (
        <div className="absolute inset-0 bg-white/92 dark:bg-[#0B0B0F]/92 z-20 flex flex-col items-center justify-center text-center p-3">
          <BadgeAlert className="w-6 h-6 text-[#717185] mb-1" />
          <span className="font-bold text-xs uppercase tracking-wider text-[#E21B70]">
            Sold Out
          </span>
        </div>
      )}

      {isRestaurantClosed && (
        <div className="absolute inset-0 bg-white/80 dark:bg-[#0B0B0F]/80 z-20 flex flex-col items-center justify-center text-center p-3 cursor-not-allowed">
          <Clock className="w-6 h-6 text-[#DC2626] mb-1" />
          <span className="font-bold text-xs uppercase tracking-wider text-[#DC2626]">
            Closed
          </span>
          <span className="text-[11px] font-semibold text-[#14141A] dark:text-[#F5F5F8] mt-1 bg-white dark:bg-[#14141A] px-2.5 py-0.5 rounded-lg border border-[#E6E6EE] dark:border-[#272733]">
            Opens {openingTime || "soon"}
          </span>
        </div>
      )}

      {/* Card Image */}
      <div
        className="relative h-32 sm:h-44 bg-[#F2F2F6] dark:bg-[#1D1D26] overflow-hidden shrink-0 cursor-pointer"
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
            "/images/dishes/pizza.jpg"
          }
          alt={`${dish.name} from ${dishRestaurantName}`}
          className="w-full h-full"
          imgClassName="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />

        {/* Favorite Heart Button (44px touch hitbox) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(dish.id);
          }}
          className="absolute top-1.5 right-1.5 z-30 w-11 h-11 rounded-full bg-white/92 dark:bg-[#14141A]/90 hover:bg-white text-[#E21B70] shadow-xs transition-transform duration-180 active:scale-[0.97] active:brightness-110 flex items-center justify-center cursor-pointer"
          aria-label={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
          title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        >
          {/* Heart pops with a spring whenever the favourite state flips */}
          <motion.span
            key={isFavorite ? "fav" : "not-fav"}
            initial={reduceMotion ? false : { scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={springBouncy}
            className="flex"
          >
            <Heart
              className={`w-4 h-4 ${
                isFavorite
                  ? "fill-[#E21B70] text-[#E21B70]"
                  : "text-[#5A5A6B] dark:text-[#A1A1B2]"
              }`}
            />
          </motion.span>
        </button>

        {/* Discount Tag */}
        {dish.discountPrice && dish.discountPrice < dish.price && (
          <div className="absolute top-2 left-2">
            <span className="text-[10px] font-bold uppercase tracking-wider py-0.5 px-2 bg-[#E21B70] text-white rounded-md shadow-xs">
              {Math.round(((dish.price - dish.discountPrice) / dish.price) * 100)}% OFF
            </span>
          </div>
        )}
      </div>

      {/* Card Contents */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-2.5 bg-white dark:bg-[#14141A]">
        <div
          className="space-y-1 flex-1 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (!dish.isAvailable || isRestaurantClosed) return;
            onSelectDetail(dish);
          }}
        >
          <p className="text-[10px] sm:text-[11px] text-[#5A5A6B] dark:text-[#A1A1B2] font-semibold uppercase tracking-wide truncate">
            {dishRestaurantName}
          </p>
          <h4
            title={dish.name}
            className="font-black text-[#14141A] dark:text-[#F5F5F8] text-sm sm:text-base leading-snug group-hover:text-[#E21B70] transition-colors line-clamp-2"
          >
            {dish.name}
          </h4>
          <div className="flex items-baseline gap-1.5 pt-0.5">
            {dish.discountPrice && dish.discountPrice < dish.price ? (
              <>
                <span className="font-mono font-black text-base text-[#14141A] dark:text-white tabular-nums">
                  Rs. {dish.discountPrice}
                </span>
                <span className="font-mono text-xs font-bold line-through text-[#9A9AAB] dark:text-[#6E6E80] tabular-nums">
                  Rs. {dish.price}
                </span>
              </>
            ) : (
              <span className="font-mono font-black text-base text-[#14141A] dark:text-white tabular-nums">
                Rs. {dish.price}
              </span>
            )}
          </div>
        </div>

        {/* Add / Stepper CTA (>=44px touch target) */}
        <div className="pt-1 shrink-0">
          {quantityInCart > 0 ? (
            <motion.div
              initial={reduceMotion ? false : { scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={springSnappy}
              className="flex items-center justify-between bg-[#FDF2F6] dark:bg-[#2A121D] border border-[#E21B70]/30 p-1 rounded-xl"
            >
              <motion.button
                type="button"
                whileTap={reduceMotion ? undefined : { scale: 0.88 }}
                onClick={() => onUpdateCartQuantity(dish.id, quantityInCart - 1)}
                aria-label="Decrease quantity"
                className="w-11 h-11 rounded-lg bg-white dark:bg-[#14141A] text-[#14141A] dark:text-white active:brightness-110 font-bold flex items-center justify-center cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </motion.button>
              {/* Qty pops briefly on every change */}
              <motion.span
                key={quantityInCart}
                initial={reduceMotion ? false : { scale: 1.35 }}
                animate={{ scale: 1 }}
                transition={springSnappy}
                className="text-xs font-extrabold text-[#E21B70] dark:text-[#FF4D94] font-mono tabular-nums px-2"
              >
                {quantityInCart}
              </motion.span>
              <motion.button
                type="button"
                whileTap={reduceMotion ? undefined : { scale: 0.88 }}
                onClick={() => onUpdateCartQuantity(dish.id, quantityInCart + 1)}
                aria-label="Increase quantity"
                className="w-11 h-11 rounded-lg btn-pink text-white active:brightness-110 font-bold flex items-center justify-center cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </motion.button>
            </motion.div>
          ) : (
            <motion.button
              type="button"
              whileTap={reduceMotion ? undefined : { scale: 0.94 }}
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
              className={`w-full min-h-[44px] py-2 rounded-xl text-xs font-bold uppercase tracking-wider active:brightness-110 flex items-center justify-center gap-1.5 btn-pink text-white relative overflow-hidden after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0)_65%)] after:opacity-0 after:scale-50 after:transition-all after:duration-300 after:pointer-events-none active:after:opacity-100 active:after:scale-125 active:after:duration-100 ${
                !dish.isAvailable || isRestaurantClosed
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer"
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
});
