import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { springSnappy } from "../utils/motion";
import { Dish } from "../types";
import { LazyImage } from "./LazyImage";
import { Clock, BadgeAlert, Plus, Minus } from "lucide-react";

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
  quantityInCart,
  onSelectDetail,
  onAddToCart,
  onUpdateCartQuantity,
}: DashboardMenuItemCardProps) {
  const dishRestaurantName = dish.restaurantName || "Dadu Fast Food & Kitchen";
  // Reduced motion: micro-interactions become instant state changes.
  const reduceMotion = useReducedMotion();
  const hasDiscount = dish.discountPrice && dish.discountPrice < dish.price;
  const discountPct = hasDiscount
    ? Math.round(((dish.price - dish.discountPrice!) / dish.price) * 100)
    : 0;
  const hasCustomization =
    (dish.sizes && dish.sizes.length > 0) ||
    (dish.flavors && dish.flavors.length > 0) ||
    (dish.addOns && dish.addOns.length > 0);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasCustomization) {
      onSelectDetail(dish);
    } else {
      onAddToCart(dish);
    }
  };

  return (
    <motion.div
      whileHover={reduceMotion ? undefined : { y: -2 }}
      transition={springSnappy}
      className={`bg-white dark:bg-[#14141A] rounded-2xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.07)] hover:shadow-md transition-shadow duration-180 flex flex-col group relative text-[#14141A] dark:text-[#F5F5F8] border border-[#f0f0f0] dark:border-[#2A2A35] ${
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

      {/* Card Image — Foodpanda-style: clean photo, white + button overlaps bottom-right */}
      <div
        className="relative h-36 sm:h-44 bg-[#f7f7f7] dark:bg-[#1D1D26] overflow-hidden shrink-0 cursor-pointer"
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

        {dish.isAvailable && !isRestaurantClosed && quantityInCart > 0 ? (
          <motion.div
            initial={reduceMotion ? false : { scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springSnappy}
            className="absolute bottom-2 right-2 z-10 flex items-center bg-white dark:bg-[#14141A] rounded-full shadow-md border border-black/5 p-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.button
              type="button"
              whileTap={reduceMotion ? undefined : { scale: 0.88 }}
              onClick={() => onUpdateCartQuantity(dish.id, quantityInCart - 1)}
              aria-label="Decrease quantity"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#E21B70] hover:bg-[#FDE7F0] dark:hover:bg-[#2A121D] cursor-pointer"
            >
              <Minus className="w-4 h-4" strokeWidth={2.5} />
            </motion.button>
            <motion.span
              key={quantityInCart}
              initial={reduceMotion ? false : { scale: 1.35 }}
              animate={{ scale: 1 }}
              transition={springSnappy}
              className="text-sm font-bold text-[#14141A] dark:text-white min-w-[20px] text-center"
            >
              {quantityInCart}
            </motion.span>
            <motion.button
              type="button"
              whileTap={reduceMotion ? undefined : { scale: 0.88 }}
              onClick={() => onUpdateCartQuantity(dish.id, quantityInCart + 1)}
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
            onClick={handleAdd}
            disabled={!dish.isAvailable || isRestaurantClosed}
            aria-label={`Add ${dish.name} to cart`}
            className={`absolute bottom-2 right-2 z-10 w-10 h-10 rounded-full bg-white dark:bg-[#14141A] text-[#14141A] dark:text-white flex items-center justify-center shadow-md border border-black/5 active:scale-95 ${
              !dish.isAvailable || isRestaurantClosed
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer"
            }`}
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} />
          </motion.button>
        )}
      </div>

      {/* Card Contents — Foodpanda order: name, price, discount */}
      <div
        className="p-2.5 sm:p-3 flex-1 flex flex-col gap-0.5 cursor-pointer"
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
          className="font-bold text-[#14141A] dark:text-[#F5F5F8] text-[13px] sm:text-sm leading-snug line-clamp-2"
        >
          {dish.name}
        </h4>
        <div className="flex items-baseline gap-1.5 flex-wrap pt-0.5">
          {hasDiscount ? (
            <>
              <span className="font-bold text-[15px] sm:text-base text-[#E21B70] dark:text-[#FF4D94]">
                Rs. {dish.discountPrice}
              </span>
              <span className="text-xs line-through text-[#9a9aad] dark:text-[#717185]">
                Rs. {dish.price}
              </span>
              <span className="text-xs font-bold text-[#D70F64] dark:text-[#FF8FBF]">
                {discountPct}% off
              </span>
            </>
          ) : (
            <span className="font-bold text-[15px] sm:text-base text-[#E21B70] dark:text-[#FF4D94]">
              Rs. {dish.price}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
});
