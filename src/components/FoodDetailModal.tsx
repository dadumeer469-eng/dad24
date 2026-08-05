import React, { useState } from "react";
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
  const [sizeError, setSizeError] = useState(false);
  const [flavorError, setFlavorError] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showToast, setShowToast] = useState(false);

  React.useEffect(() => {
    if (dish) {
      setQuantity(1);
      setSelectedSizeObj(null);
      setSelectedFlavorObj(null);
      setSelectedAddOns([]);
      setSpecialInstructions("");
      setSizeError(false);
      setFlavorError(false);
      setShowConfirmation(false);
      setShowToast(false);
    }
  }, [dish]);

  if (!dish) return null;

  const isService = dish.type === "service";
  const basePrice = dish.discountPrice && dish.discountPrice < dish.price ? dish.discountPrice : dish.price;
  
  const addOnsTotal = selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0);
  const unitPrice = selectedSizeObj ? selectedSizeObj.price : basePrice;
  const flavorPrice = selectedFlavorObj ? selectedFlavorObj.price : 0;
  const totalPrice = (unitPrice + flavorPrice + addOnsTotal) * quantity;

  const handleAdd = () => {
    if (dish.isAvailable && !isActiveDetailDishClosed) {
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

        const hasCustomization = (dish.sizes && dish.sizes.length > 0) || 
                                 (dish.flavors && dish.flavors.length > 0) || 
                                 (dish.addOns && dish.addOns.length > 0);

        // Bypass the confirmation screen as requested by the user
        // if (hasCustomization) {
        //   if (!showConfirmation) {
        //     setShowConfirmation(true);
        //     return;
        //   }
        // }
      }

      onAddToCart(
        dish, 
        quantity, 
        isService ? undefined : { 
          size: selectedSizeObj ? selectedSizeObj.name : undefined, 
          flavor: selectedFlavorObj ? selectedFlavorObj.name : undefined,
          addOns: selectedAddOns.length > 0 ? selectedAddOns : undefined,
          specialInstructions: specialInstructions.trim() ? specialInstructions.trim() : undefined
        }
      );
      
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        onClose();
      }, 1500);
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6"
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl sm:rounded-[32px] max-w-lg w-full overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-9 h-9 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Conditional Content */}
          {showConfirmation ? (
             <div className="flex flex-col bg-white dark:bg-zinc-900 overflow-hidden w-full">
                 <div className="p-6 sm:p-8 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 shrink-0 text-center flex flex-col items-center justify-center relative">
                  <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                     <span className="text-2xl">📋</span>
                  </div>
                  <span className="text-[#D70F64] font-black uppercase tracking-widest text-[10px] mb-2 inline-block bg-[#D70F64]/5 px-3 py-1 rounded-full">Order Summary</span>
                  <h2 className="text-zinc-900 dark:text-zinc-100 font-black text-2xl sm:text-3xl tracking-tight leading-tight px-4">{dish.name}</h2>
                </div>

                <div className="p-5 sm:p-7 overflow-y-auto scrollbar-none flex-grow bg-zinc-50 dark:bg-zinc-950 space-y-6">
                   
                   <div>
                      <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="w-5 h-px bg-zinc-300 dark:bg-zinc-700"></span>
                        Your Selections
                      </h4>
                      <div className="space-y-2.5">
                        {selectedSizeObj && (
                           <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-md">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-lg">📏</div>
                                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Size: {selectedSizeObj.name}</span>
                              </div>
                              <span className="text-sm font-black text-[#D70F64]">Rs. {selectedSizeObj.price}</span>
                           </div>
                        )}
                        {selectedFlavorObj && (
                           <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-md">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-lg">🌶️</div>
                                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Flavor: {selectedFlavorObj.name}</span>
                              </div>
                              <span className="text-sm font-black text-[#D70F64]">{selectedFlavorObj.price > 0 ? `+ Rs. ${selectedFlavorObj.price}` : "Free"}</span>
                           </div>
                        )}
                        {selectedAddOns.map((ad, idx) => (
                           <div key={idx} className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-md">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-lg">➕</div>
                                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{ad.name}</span>
                              </div>
                              <span className="text-sm font-black text-[#D70F64]">+ Rs. {ad.price}</span>
                           </div>
                        ))}
                      </div>
                   </div>

                   <div>
                      <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="w-5 h-px bg-zinc-300 dark:bg-zinc-700"></span>
                        Price Breakdown
                      </h4>
                      <div className="bg-white dark:bg-zinc-900 p-5 rounded-[24px] border border-zinc-100 dark:border-zinc-800 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.08)] space-y-3.5">
                         <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">Base Price</span>
                            <span className="text-sm font-black text-zinc-800 dark:text-zinc-200">Rs. {basePrice.toFixed(2)}</span>
                         </div>
                         {selectedSizeObj && selectedSizeObj.price !== basePrice && (
                            <div className="flex justify-between items-center">
                               <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">Size Update</span>
                               <span className="text-sm font-black text-zinc-800 dark:text-zinc-200">Rs. {selectedSizeObj.price.toFixed(2)}</span>
                            </div>
                         )}
                         {selectedFlavorObj && selectedFlavorObj.price > 0 && (
                            <div className="flex justify-between items-center">
                               <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">Flavor Extra</span>
                               <span className="text-sm font-black text-zinc-800 dark:text-zinc-200">+ Rs. {selectedFlavorObj.price.toFixed(2)}</span>
                            </div>
                         )}
                         {selectedAddOns.length > 0 && (
                            <div className="flex justify-between items-center">
                               <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">Add-ons</span>
                               <span className="text-sm font-black text-zinc-800 dark:text-zinc-200">+ Rs. {addOnsTotal.toFixed(2)}</span>
                            </div>
                         )}
                         <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">Quantity</span>
                            <span className="text-sm font-black text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-md">x {quantity}</span>
                         </div>
                         <div className="h-px w-full bg-zinc-200/60 dark:bg-zinc-800 my-2" />
                         <div className="flex justify-between items-center pt-1">
                            <span className="text-base font-black text-zinc-900 dark:text-zinc-100">Total Amount</span>
                            <span className="text-2xl font-black text-[#D70F64]">Rs. {totalPrice.toFixed(2)}</span>
                         </div>
                      </div>
                   </div>

                   {specialInstructions.trim() && (
                      <div>
                         <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                           <span className="w-5 h-px bg-zinc-300 dark:bg-zinc-700"></span>
                           Instructions
                         </h4>
                         <div className="bg-pink-50/50 dark:bg-pink-950/30 p-4 rounded-2xl border border-orange-100/50 dark:border-pink-900/40 relative overflow-hidden">
                           <div className="absolute top-0 left-0 w-1 h-full bg-orange-400" />
                           <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300 italic pl-2">"{specialInstructions}"</p>
                         </div>
                      </div>
                   )}
                </div>

                <div className="p-4 sm:p-6 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-3 sticky bottom-0 shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.05)]">
                  <button onClick={() => setShowConfirmation(false)} className="flex-1 py-4 sm:py-4.5 rounded-2xl text-sm font-black uppercase tracking-wider border-2 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 active:scale-[0.98] transition-all">
                     Change Selection
                  </button>
                  <button onClick={handleAdd} className="flex-[2] py-4 sm:py-4.5 rounded-2xl text-sm font-black uppercase tracking-wider bg-[#D70F64] text-white hover:bg-[#b00c50] shadow-[0_8px_25px_-8px_rgba(215,15,100,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                     Confirm & Add to Cart <span className="text-lg leading-none">🛒</span>
                  </button>
                </div>
             </div>
          ) : (
            <>
              {/* Header Image */}
              <div className="h-48 sm:h-64 relative shrink-0 bg-zinc-100 dark:bg-zinc-800">
                <LazyImage src={dish.imageUrl || (isService ? "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=400" : "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=400")} alt={dish.name} className="w-full h-full" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                <div className="absolute bottom-4 left-5 flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase tracking-wider py-1 px-2.5 rounded-lg shadow-sm ${
                    isService ? "bg-amber-500 text-black" : "bg-[#D70F64] text-white"
                  }`}>
                    {isService ? "Licensed Service" : "Fresh Kitchen"}
                  </span>
                  <span className="text-[10px] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm text-zinc-800 dark:text-zinc-200 font-bold tracking-wider uppercase py-1 px-2.5 rounded-lg shadow-sm">
                    🏪 {dish.restaurantName || (isService ? "Dadu Home Services" : "Dadu Fast Food & Kitchen")}
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
                          onClick={() => {
                            setSelectedSizeObj(sizeObj);
                            setSizeError(false);
                          }}
                          className={`flex flex-col items-center p-3 rounded-xl transition-all border ${
                            selectedSizeObj === sizeObj 
                              ? "bg-[#D70F64]/10 border-[#D70F64] text-[#D70F64]" 
                              : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600"
                          }`}
                        >
                          {sizeObj.imageUrl && (
                            <LazyImage src={sizeObj.imageUrl} alt={sizeObj.name} className="w-12 h-12 rounded-full overflow-hidden mb-2" referrerPolicy="no-referrer" />
                          )}
                          <div className="text-xs font-bold whitespace-nowrap">{sizeObj.name}</div>
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
                      <span className="bg-black dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest mt-1">Required</span>
                    </div>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">Select one</p>
                    <div className={`flex flex-col ${flavorError ? "p-1 border border-red-500 rounded-2xl bg-red-50/50 dark:bg-red-950/30" : ""}`}>
                      {dish.flavors.map((flavorObj, idx) => {
                        const isSelected = selectedFlavorObj === flavorObj;
                        return (
                          <div 
                            key={`${flavorObj.name}-${idx}`}
                            onClick={() => {
                              setSelectedFlavorObj(flavorObj);
                              setFlavorError(false);
                            }}
                            className={`flex items-center justify-between py-4 cursor-pointer transition-colors ${idx !== dish.flavors!.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''} ${isSelected ? 'bg-zinc-50 dark:bg-zinc-800/60' : ''}`}
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
                                  <span className="text-[#D70F64] text-sm font-bold">+ Rs. {flavorObj.price.toFixed(2)}</span>
                                )}
                                {flavorObj.originalPrice && flavorObj.originalPrice > 0 && (
                                  <span className="text-zinc-400 dark:text-zinc-500 text-xs line-through mt-0.5">Rs. {flavorObj.originalPrice.toFixed(2)}</span>
                                )}
                              </div>
                              <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center ${isSelected ? 'border-[#D70F64] bg-white dark:bg-zinc-900' : 'border-zinc-300 dark:border-zinc-600'}`}>
                                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#D70F64]" />}
                              </div>
                            </div>
                          </div>
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
                          <div key={`${addOn.name}-${idx}`} className={`flex items-center justify-between py-4 transition-colors ${idx !== dish.addOns!.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}>
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
                                <span className="text-[#D70F64] text-sm font-bold">+ Rs. {addOn.price.toFixed(2)}</span>
                                {addOn.originalPrice && addOn.originalPrice > 0 && (
                                  <span className="text-zinc-400 dark:text-zinc-500 text-xs line-through mt-0.5">Rs. {addOn.originalPrice.toFixed(2)}</span>
                                )}
                              </div>
                              <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-full h-8">
                                <button
                                  type="button"
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
                                  className="w-8 h-8 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white rounded-l-full active:bg-zinc-200 dark:active:bg-zinc-700"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-6 text-center text-sm font-bold text-zinc-900 dark:text-zinc-100">{addOnCount}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSelectedAddOns([...selectedAddOns, addOn]);
                                  }}
                                  className="w-8 h-8 flex items-center justify-center text-[#D70F64] rounded-r-full active:bg-zinc-200 dark:active:bg-zinc-700"
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

                {/* Special Instructions */}
                <div>
                  <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-3">Special Instructions</h4>
                  <textarea
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="e.g. No mayo, extra spicy..."
                    className="w-full p-3 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl text-sm outline-none focus:border-[#D70F64] resize-none h-20 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="p-4 sm:p-5 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 shrink-0 flex items-center justify-between gap-3 sticky bottom-0 z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full p-1 shadow-sm shrink-0">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-full bg-white dark:bg-zinc-700 shadow-sm flex items-center justify-center text-zinc-600 dark:text-zinc-200 hover:text-[#D70F64] transition-colors"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="font-black text-base w-4 text-center text-zinc-900 dark:text-zinc-100">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 rounded-full bg-white dark:bg-zinc-700 shadow-sm flex items-center justify-center text-zinc-600 dark:text-zinc-200 hover:text-[#D70F64] transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            <button
              onClick={handleAdd}
              disabled={!dish.isAvailable || isActiveDetailDishClosed}
              className={`flex-1 py-4 rounded-full text-sm font-black capitalize tracking-wide flex items-center justify-between px-6 transition-all shadow-lg ${
                (!dish.isAvailable || isActiveDetailDishClosed) 
                  ? 'cursor-not-allowed opacity-60 bg-zinc-200 text-zinc-500 shadow-none' 
                  : ((dish.sizes && dish.sizes.length > 0 && !selectedSizeObj) || (dish.flavors && dish.flavors.length > 0 && !selectedFlavorObj))
                    ? 'bg-zinc-200 text-zinc-500 shadow-none hover:bg-zinc-300'
                    : isService 
                      ? 'bg-amber-500 text-neutral-950 hover:bg-amber-600 shadow-amber-500/20 active:scale-[0.98]' 
                      : 'bg-[#D70F64] text-white hover:bg-[#b00c50] shadow-[#D70F64]/20 active:scale-[0.98]'
              }`}
            >
              <span>{isService ? "Book Visitation" : "Add to cart"}</span>
              <span>Rs. {totalPrice}</span>
            </button>
          </div>
        </>
        )}
        </motion.div>
        
        {/* Toast Notification */}
        <AnimatePresence>
          {showToast && (
             <motion.div 
               initial={{ opacity: 0, y: 20 }} 
               animate={{ opacity: 1, y: 0 }} 
               exit={{ opacity: 0, y: 10 }} 
               className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-green-500 text-white px-5 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2 z-[60]"
             >
                <Check className="w-5 h-5" /> Item added to cart!
             </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
