import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GroceryProduct } from "../types";
import { Minus, Plus, X, Check, ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFocusTrap } from "../hooks/useFocusTrap";

// Grocery product detail modal — opens when a product card is tapped.
// Shows a photo gallery (2–3 photos per product: the main photo plus
// -2 / -3 variants, e.g. ronin-r-29-handsfree-2.jpg), name, pack, price,
// quantity stepper and Add to Cart. Photos that do not exist are hidden
// (onError), so products with only 1 photo still render cleanly.

interface GroceryProductDetailModalProps {
  product: GroceryProduct | null;
  categoryName?: string;
  initialQuantity?: number;
  onClose: () => void;
  onAddToCart: (product: GroceryProduct, quantity: number) => void;
  onUpdateCartQuantity?: (productId: string, quantity: number) => void;
}

// Build the gallery URLs from the main imageUrl: insert -2 / -3 before
// the file extension. e.g. /images/grocery/ronin-r-29-handsfree.jpg ->
// /images/grocery/ronin-r-29-handsfree-2.jpg
function galleryUrls(imageUrl: string): string[] {
  if (!imageUrl) return [];
  const dot = imageUrl.lastIndexOf(".");
  if (dot < 0) return [imageUrl];
  const base = imageUrl.slice(0, dot);
  const ext = imageUrl.slice(dot);
  return [imageUrl, `${base}-2${ext}`, `${base}-3${ext}`];
}

export default function GroceryProductDetailModal({
  product,
  categoryName,
  initialQuantity = 0,
  onClose,
  onAddToCart,
  onUpdateCartQuantity,
}: GroceryProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [activePhoto, setActivePhoto] = useState(0);
  const [failedPhotos, setFailedPhotos] = useState<Set<number>>(new Set());
  const [justAdded, setJustAdded] = useState(false);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(dialogRef, !!product, onClose);

  // Reset local state whenever a different product is opened.
  React.useEffect(() => {
    if (product) {
      setQuantity(1);
      setActivePhoto(0);
      setFailedPhotos(new Set());
      setJustAdded(false);
    }
  }, [product]);

  if (!product) return null;

  const urls = galleryUrls(product.imageUrl);
  // Only photos that actually loaded (or the main one, which is assumed).
  const visibleUrls = urls.filter((_, i) => i === 0 || !failedPhotos.has(i));
  const shownIndex = Math.min(activePhoto, Math.max(visibleUrls.length - 1, 0));
  const hasDiscount = product.discountPrice && product.discountPrice < product.price;
  const displayPrice = hasDiscount ? product.discountPrice! : product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.price - product.discountPrice!) / product.price) * 100)
    : 0;
  const isOutOfStock = !product.isAvailable || product.stock <= 0;
  const packLabel = product.unit && product.unit !== "—" ? product.unit : "Standard Pack";
  const inCart = initialQuantity > 0;

  const handleAdd = () => {
    if (isOutOfStock) return;
    if (inCart && onUpdateCartQuantity) {
      onUpdateCartQuantity(product.id, initialQuantity + quantity);
    } else {
      onAddToCart(product, quantity);
    }
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1600);
  };

  const modal = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-5"
        onClick={onClose}
      >
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={product.name}
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
          className="bg-white dark:bg-zinc-900 w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Photo gallery */}
          <div className="relative bg-[#f7f7f7] dark:bg-[#23232E]">
            <div className="relative aspect-square overflow-hidden">
              {visibleUrls.length > 0 ? (
                <img
                  key={visibleUrls[shownIndex]}
                  src={visibleUrls[shownIndex]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">🛒</div>
              )}
              {hasDiscount && (
                <span className="absolute top-3 left-3 z-10 text-xs font-bold text-white px-2.5 py-1 rounded-full bg-[#E21B70] shadow">
                  {discountPct}% OFF
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/95 dark:bg-[#14141A]/95 text-[#14141A] dark:text-white flex items-center justify-center shadow-md cursor-pointer"
            >
              <X className="w-5 h-5" strokeWidth={2.5} />
            </button>
            {/* Thumbnails — only when there is more than 1 photo */}
            {visibleUrls.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-2">
                {visibleUrls.map((u, i) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setActivePhoto(i)}
                    aria-label={`Photo ${i + 1}`}
                    className={`w-12 h-12 rounded-xl overflow-hidden border-2 shadow-md cursor-pointer ${
                      i === shownIndex ? "border-[#E21B70]" : "border-white/80 opacity-80"
                    }`}
                  >
                    <img src={u} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            {/* Hidden preloaders: detect which -2 / -3 photos exist */}
            {urls.slice(1).map((u, i) => (
              <img
                key={u}
                src={u}
                alt=""
                aria-hidden
                className="hidden"
                onError={() =>
                  setFailedPhotos((prev) => {
                    if (prev.has(i + 1)) return prev;
                    const next = new Set(prev);
                    next.add(i + 1);
                    return next;
                  })
                }
              />
            ))}
          </div>

          {/* Details */}
          <div className="p-4 sm:p-5 flex flex-col gap-2">
            {categoryName && (
              <span className="text-xs font-semibold uppercase tracking-wide text-[#E21B70] dark:text-[#FF4D94]">
                {categoryName}
              </span>
            )}
            <h2 className="text-xl font-extrabold text-[#14141A] dark:text-white leading-tight">
              {product.name}
            </h2>
            <p className="text-sm text-[#717185] dark:text-zinc-400">{packLabel}</p>
            {product.description && (
              <p className="text-sm text-[#41414F] dark:text-zinc-300 leading-relaxed">
                {product.description}
              </p>
            )}
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-[#E21B70] dark:text-[#FF4D94]">
                Rs. {displayPrice}
              </span>
              {hasDiscount && (
                <span className="text-base text-[#717185] line-through">Rs. {product.price}</span>
              )}
            </div>
            {isOutOfStock ? (
              <div className="mt-2 w-full py-3 rounded-full bg-zinc-100 dark:bg-zinc-800 text-center text-sm font-bold text-[#717185]">
                Out of stock
              </div>
            ) : (
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-full p-1">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[#E21B70] hover:bg-white dark:hover:bg-zinc-700 cursor-pointer"
                  >
                    <Minus className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                  <span className="text-base font-bold text-[#14141A] dark:text-white min-w-[28px] text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    aria-label="Increase quantity"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[#E21B70] hover:bg-white dark:hover:bg-zinc-700 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAdd}
                  className="flex-1 py-3 rounded-full bg-[#E21B70] text-white font-bold text-base shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  {justAdded ? (
                    <>
                      <Check className="w-5 h-5" strokeWidth={2.5} /> Added ✓
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" strokeWidth={2.5} />
                      Add to Cart · Rs. {displayPrice * quantity}
                    </>
                  )}
                </motion.button>
              </div>
            )}
            {inCart && (
              <p className="text-xs text-[#717185] dark:text-zinc-400 text-center">
                {initialQuantity} already in your cart
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}
