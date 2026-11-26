import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Dish } from "../types";
import { AlertTriangle, Clock, Plus, Minus, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LazyImage } from "./LazyImage";

interface FoodDetailModalProps {
  dish: Dish | null;
  onClose: () => void;
  onAddToCart: (dish: Dish, quantity: number, options?: { size?: string, flavor?: string, addOns?: {name: string, price: number}[], specialInstructions?: string }) => void;
  isActiveDetailDishClosed: boolean;
}

export default function FoodDetailModal({
  dish,
  onClose,
  onAddToCart,
  isActiveDetailDishClosed,
}: FoodDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedSizeObj, setSelectedSizeObj] = useState<{name: string, price: number, imageUrl?: string} | null>(null);
  const [selectedFlavorObj, setSelectedFlavorObj] = useState<{name: string, price: number, imageUrl?: string} | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<{name: string, price: number}[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [notAvailable, setNotAvailable] = useState<"refund" | "replace" | "call">("refund");
  const [sizeError, setSizeError] = useState(false);
  const [flavorError, setFlavorError] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the toast timer if the modal unmounts mid-toast so onClose()
  // is never fired on an already-closed modal.
  React.useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const resetSelections = () => {
    setQuantity(1);
    setSelectedSizeObj(null);
    setSelectedFlavorObj(null);
    setSelectedAddOns([]);
    setSpecialInstructions("");
    setSizeError(false);
    setFlavorError(false);
    setShowToast(false);
  };

  // Reset local state on every close, not just when the dish object
  // changes: reopening the SAME dish passes the same object reference,
  // so the [dish] effect below would not fire and the previous
  // quantity/size/flavor would silently carry over.
  const handleClose = () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    resetSelections();
    onClose();
  };

  React.useEffect(() => {
    if (dish) {
      resetSelections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dish]);

  if (!dish) return null;

  const isService = dish.type === "service";
  const basePrice = dish.discountPrice && dish.discountPrice < dish.price ? dish.discountPrice : dish.price;
  
  const addOnsTotal = selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0);
  const unitPrice = selectedSizeObj ? selectedSizeObj.price : basePrice;
  const flavorPrice = selectedFlavorObj ? selectedFlavorObj.price : 0;
  const totalPrice = (unitPrice + flavorPrice + addOnsTotal) * quantity;

  // Prices elsewhere show whole rupees ("Rs. 50") — keep option prices
  // consistent instead of "Rs. 50.00".
  const fmtRs = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(2));

  const handleAdd = () => {
    // Treat a missing flag as available (matches the cart's `!== false`
    // checks) so legacy dishes without isAvailable set are not blocked.
    if (dish.isAvailable !== false && !isActiveDetailDishClosed) {
      if (!isService) {
        let hasError = false;
        if (dish.sizes && dish.sizes.length > 0 && !selectedSizeObj) {
          setSizeError(true);
          hasError = true;
        }
        if (dish.flavors && dish.flavors.length > 0 && !selectedFlavorObj) {
          setFlavorError(true);
          hasError = true;
        }
        if (hasError) return;

      }

      onAddToCart(
        dish, 
        quantity, 
        isService ? undefined : { 
          size: selectedSizeObj ? selectedSizeObj.name : undefined, 
          flavor: selectedFlavorObj ? selectedFlavorObj.name : undefined,
          addOns: selectedAddOns.length > 0 ? selectedAddOns : undefined,
          specialInstructions: [
            specialInstructions.trim() || "",
            `If item not available: ${notAvailable === "refund" ? "Refund" : notAvailable === "replace" ? "Replace with similar" : "Call me"}`,
          ].filter(Boolean).join(" | ") || undefined
        }
      );
      
      setShowToast(true);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setShowToast(false);
        handleClose();
      }, 1500);
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 pb-[76px] sm:p-6"
      >
        <motion.div
          initial={{ y: "100%", opacity: 0.8 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0.8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="bg-white dark:bg-zinc-900 border-t sm:border border-zinc-100 dark:border-zinc-800 rounded-t-3xl sm:rounded-[32px] max-w-lg w-full overflow-hidden shadow-2xl relative max-h-[calc(92dvh-76px)] sm:max-h-[90dvh] flex flex-col"
        >
          {/* Mobile Bottom-Sheet Drag Handle */}
          <div className="sm:hidden absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600 z-20 pointer-events-none shadow-xs" />

          {/* Close Button */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close dish details"
            className="absolute top-4 right-4 z-10 w-11 h-11 bg-black/45 hover:bg-black/65 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-all duration-180 active:scale-[0.97] active:brightness-110 cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
          >
            <X className="w-5 h-5" />
          </button>

            <>
              {/* Header Image */}
              <div className="h-48 sm:h-64 relative shrink-0 bg-zinc-100 dark:bg-zinc-800">
                <LazyImage src={dish.imageUrl || (isService ? "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=400" : "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=400")} alt={dish.name} className="w-full h-full" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                <div className="absolute bottom-4 left-5 flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider py-1 px-2.5 rounded-lg shadow-sm bg-[#D70F64] text-white">
                    Fresh Kitchen
                  </span>
                  <span className="text-[10px] bg-white/95 dark:bg-[#14141A]/95 backdrop-blur-sm text-[#111118] dark:text-[#F5F5F8] font-bold tracking-wider uppercase py-1 px-2.5 rounded-lg shadow-sm">
                    🏪 {dish.restaurantName || "Dadu Fast Food & Kitchen"}
                  </span>
                </div>
              </div>

              {/* Content Body */}
              <div className="p-5 sm:p-7 overflow-y-auto scrollbar-none flex-grow">
                <h3 className="font-black text-zinc-900 dark:text-zinc-100 text-2xl tracking-tight">{dish.name}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed mt-2">{dish.description}</p>

                {isService && (
                  <div className="mt-4 bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/40 text-amber-700 dark:text-amber-300 text-xs p-3.5 rounded-xl flex items-start gap-2 leading-relaxed font-semibold">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      <strong>Visitation Note:</strong> This charge is strictly the visitation and diagnostic fee. General repairs and materials are evaluated and quoted on-site.
                    </span>
                  </div>
                )}

                {isActiveDetailDishClosed && (
                   <div className="mt-4 bg-pink-50 dark:bg-pink-950/30 border border-pink-100 dark:border-pink-900/40 text-pink-600 dark:text-pink-400 text-xs p-3.5 rounded-xl flex items-center gap-2 font-bold">
                     <Clock className="w-4 h-4 shrink-0" />
                     <span>This vendor is currently unavailable or closed.</span>
                   </div>
                )}

            {!isService && ((dish.sizes && dish.sizes.length > 0) || (dish.flavors && dish.flavors.length > 0) || (dish.addOns && dish.addOns.length > 0)) && (
              <div className="space-y-5 mt-6 border-t border-zinc-100 dark:border-zinc-800 pt-5">
                {/* Size Selection */}
                {dish.sizes && dish.sizes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-3 flex items-center justify-between">
                      Select Size
                      {sizeError && <span className="text-xs font-bold text-pink-500">Please select a size first</span>}
                    </h4>
                    <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 ${sizeError ? "p-3 border border-red-500 rounded-2xl bg-pink-50/50 dark:bg-pink-950/30" : ""}`}>
                      {dish.sizes.map((sizeObj, idx) => (
                        <button
                          key={`${sizeObj.name}-${idx}`}
                          type="button"
                          onClick={() => {
                            setSelectedSizeObj(sizeObj);
                            setSizeError(false);
                          }}
                          aria-pressed={selectedSizeObj?.name === sizeObj.name}
                          className={`min-w-0 min-h-[48px] flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 border focus-visible:outline-2 focus-visible:outline-[#D70F64] ${
                            selectedSizeObj?.name === sizeObj.name
                              ? "bg-[#D70F64]/10 border-[#D70F64] text-[#D70F64]" 
                              : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600"
                          }`}
                        >
                          {sizeObj.imageUrl && (
                            <LazyImage src={sizeObj.imageUrl} alt={sizeObj.name} className="w-12 h-12 rounded-full overflow-hidden mb-2" referrerPolicy="no-referrer" />
                          )}
                          <div className="text-xs font-bold truncate max-w-full">{sizeObj.name}</div>
                          <div className="text-[10px] mt-0.5 opacity-80">Rs. {sizeObj.price}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Flavor Selection */}
                {dish.flavors && dish.flavors.length > 0 && (
                  <div className="mt-6 border-t border-zinc-100 dark:border-zinc-800 pt-5">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-lg font-black text-zinc-900 dark:text-zinc-100">Choose Your {dish.name} Flavor</h4>
                      {selectedFlavorObj ? (
                        <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest mt-1">Completed</span>
                      ) : (
                        <span className="bg-[#D70F64] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest mt-1">Required</span>
                      )}
                    </div>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">Select one</p>
                    <div className={`flex flex-col ${flavorError ? "p-1 border border-red-500 rounded-2xl bg-red-50/50 dark:bg-red-950/30" : ""}`}>
                      {dish.flavors.map((flavorObj, idx) => {
                        const isSelected = selectedFlavorObj?.name === flavorObj.name;
                        return (
                          <button
                            type="button"
                            key={`${flavorObj.name}-${idx}`}
                            onClick={() => {
                              setSelectedFlavorObj(flavorObj);
                              setFlavorError(false);
                            }}
                            aria-pressed={isSelected}
                            className={`w-full text-left flex items-center justify-between py-4 cursor-pointer transition-all duration-300 ${idx !== dish.flavors!.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''} ${isSelected ? 'bg-zinc-50 dark:bg-zinc-800/60' : ''}`}
                          >
                            <div className="flex flex-col px-2">
                              <span className="text-base font-black text-zinc-900 dark:text-zinc-100">{flavorObj.name}</span>
                              {flavorObj.isPopular && (
                                <span className="text-[#f04f23] text-xs font-bold flex items-center gap-1 mt-0.5">
                                  🔥 Popular
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 px-2">
                              <div className="flex flex-col items-end">
                                {flavorObj.price === 0 ? (
                                  <span className="text-zinc-500 dark:text-zinc-400 text-sm font-bold">Free</span>
                                ) : (
                                  <span className="text-[#D70F64] text-sm font-bold">+ Rs. {fmtRs(flavorObj.price)}</span>
                                )}
                                {flavorObj.originalPrice && flavorObj.originalPrice > 0 && (
                                  <span className="text-zinc-400 dark:text-zinc-500 text-xs line-through mt-0.5">Rs. {fmtRs(flavorObj.originalPrice)}</span>
                                )}
                              </div>
                              <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center ${isSelected ? 'border-[#D70F64] bg-white dark:bg-zinc-900' : 'border-zinc-300 dark:border-zinc-600'}`}>
                                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#D70F64]" />}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {flavorError && <span className="text-xs font-bold text-red-500 block mt-2 text-right px-2">Please select a flavor first</span>}
                  </div>
                )}

                {/* Add-ons Selection */}
                {dish.addOns && dish.addOns.length > 0 && (
                  <div className="mt-6 border-t border-zinc-100 dark:border-zinc-800 pt-5">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-lg font-black text-zinc-900 dark:text-zinc-100">Frequently bought together</h4>
                      <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest mt-1">Optional</span>
                    </div>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">Other customers also ordered these</p>
                    <div className="flex flex-col">
                      {dish.addOns.map((addOn, idx) => {
                        const addOnCount = selectedAddOns.filter(a => a.name === addOn.name).length;
                        return (
                          <div key={`${addOn.name}-${idx}`} className={`flex items-center justify-between py-4 transition-all duration-300 ${idx !== dish.addOns!.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}>
                            <div className="flex items-center gap-3 px-2">
                              {addOn.imageUrl ? (
                                <LazyImage src={addOn.imageUrl} alt={addOn.name} className="w-14 h-14 rounded-xl overflow-hidden" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-14 h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                  <span className="text-zinc-400 dark:text-zinc-500 text-[10px] font-bold text-center px-1 uppercase">{addOn.name.slice(0, 3)}</span>
                                </div>
                              )}
                              <span className="text-base font-black text-zinc-900 dark:text-zinc-100">{addOn.name}</span>
                            </div>
                            <div className="flex items-center gap-4 px-2">
                              <div className="flex flex-col items-end">
                                <span className="text-[#D70F64] text-sm font-bold">+ Rs. {fmtRs(addOn.price)}</span>
                                {addOn.originalPrice && addOn.originalPrice > 0 && (
                                  <span className="text-zinc-400 dark:text-zinc-500 text-xs line-through mt-0.5">Rs. {fmtRs(addOn.originalPrice)}</span>
                                )}
                              </div>
                              {/* Stepper buttons are 44px tall, so the pill must
                                  be 44px too — it was h-8, clipping the buttons. */}
                              <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-full h-11">
                                <button
                                  type="button"
                                  aria-label={`Remove one ${addOn.name}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (addOnCount > 0) {
                                      const index = selectedAddOns.findIndex(a => a.name === addOn.name);
                                      if (index !== -1) {
                                        const newAddOns = [...selectedAddOns];
                                        newAddOns.splice(index, 1);
                                        setSelectedAddOns(newAddOns);
                                      }
                                    }
                                  }}
                                  className="w-11 h-11 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white rounded-l-full transition-transform duration-180 active:scale-[0.97] active:brightness-110 active:bg-zinc-200 dark:active:bg-zinc-700"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-6 text-center text-sm font-bold text-zinc-900 dark:text-zinc-100 transition-all duration-200">{addOnCount}</span>
                                <button
                                  type="button"
                                  aria-label={`Add one ${addOn.name}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSelectedAddOns([...selectedAddOns, addOn]);
                                  }}
                                  className="w-11 h-11 flex items-center justify-center text-[#D70F64] rounded-r-full transition-transform duration-180 active:scale-[0.97] active:brightness-110 active:bg-zinc-200 dark:active:bg-zinc-700"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Special Instructions + fallback choice: available for EVERY
                food dish, not only ones with sizes/flavors/add-ons — they
                were previously trapped inside that conditional above. */}
            {!isService && (
              <div className="space-y-5 mt-6 border-t border-zinc-100 dark:border-zinc-800 pt-5">
                {/* Special Instructions */}
                <div>
                  <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-3">Special Instructions</h4>
                  <textarea
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="e.g. No mayo, extra spicy..."
                    aria-label="Special instructions for this dish"
                    className="w-full p-3 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl text-sm outline-none focus:border-[#D70F64] transition-all duration-300 resize-none h-20 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                  />
                </div>

                {/* If item not available */}
                <div className="mt-4">
                  <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-3">If item not available</h4>
                  <select
                    value={notAvailable}
                    onChange={(e) => setNotAvailable(e.target.value as "refund" | "replace" | "call")}
                    aria-label="What to do if this item is not available"
                    className="w-full min-h-[48px] p-3 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl text-sm outline-none focus:border-[#D70F64] transition-all duration-300"
                  >
                    <option value="refund">Refund my money</option>
                    <option value="replace">Replace with a similar item</option>
                    <option value="call">Call me to decide</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="p-4 sm:p-5 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 shrink-0 flex items-center justify-between gap-3 sticky bottom-0 z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full p-1 shadow-sm shrink-0">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                aria-label="Decrease quantity"
                className="w-12 h-12 rounded-full bg-white dark:bg-zinc-700 shadow-sm flex items-center justify-center text-zinc-600 dark:text-zinc-200 hover:text-[#D70F64] transition-all duration-180 active:scale-[0.97] active:brightness-110 focus-visible:outline-2 focus-visible:outline-[#D70F64]"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="font-black text-base min-w-6 text-center text-zinc-900 dark:text-zinc-100 transition-all duration-200">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                aria-label="Increase quantity"
                className="w-12 h-12 rounded-full bg-white dark:bg-zinc-700 shadow-sm flex items-center justify-center text-zinc-600 dark:text-zinc-200 hover:text-[#D70F64] transition-all duration-180 active:scale-[0.97] active:brightness-110 focus-visible:outline-2 focus-visible:outline-[#D70F64]"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            <button
              onClick={handleAdd}
              disabled={dish.isAvailable === false || isActiveDetailDishClosed}
              className={`flex-1 min-h-[52px] py-4 rounded-full text-sm font-black capitalize tracking-wide flex items-center justify-between px-6 transition-all duration-180 active:scale-[0.97] active:brightness-110 shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D70F64] ${
                (dish.isAvailable === false || isActiveDetailDishClosed) 
                  ? 'cursor-not-allowed opacity-60 bg-zinc-200 text-zinc-500 shadow-none' 
                  : ((dish.sizes && dish.sizes.length > 0 && !selectedSizeObj) || (dish.flavors && dish.flavors.length > 0 && !selectedFlavorObj))
                    ? 'bg-zinc-200 text-zinc-500 shadow-none hover:bg-zinc-300'
                    : isService 
                      ? 'bg-amber-500 text-neutral-950 hover:bg-amber-600 shadow-amber-500/20' 
                      : "btn-pink text-white shadow-[#D70F64]/20 relative overflow-hidden after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0)_65%)] after:opacity-0 after:scale-50 after:transition-all after:duration-300 after:pointer-events-none active:after:opacity-100 active:after:scale-125 active:after:duration-100"
              }`}
            >
              <span>{isService ? "Book Visitation" : "Add to cart"}</span>
              <span>Rs. {totalPrice}</span>
            </button>
          </div>
        </>
        </motion.div>
        
        {/* Toast Notification */}
        <AnimatePresence>
          {showToast && (
             <motion.div 
               initial={{ opacity: 0, y: 20 }} 
               animate={{ opacity: 1, y: 0 }} 
               exit={{ opacity: 0, y: 10 }} 
               className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-green-500 text-white px-5 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2 z-[60]"
               role="status"
             >
                <Check className="w-5 h-5" /> Item added to cart!
             </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
