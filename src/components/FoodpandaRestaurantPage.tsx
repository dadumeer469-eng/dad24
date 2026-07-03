import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, Heart, Search, Star, MapPin, Clock } from "lucide-react";
import { Dish, OrderItem, SystemSettings } from "../types";
import { LazyImage } from "./LazyImage";
import FoodDetailModal from "./FoodDetailModal";

interface FoodpandaRestaurantPageProps {
  restaurantName: string;
  dishes: Dish[];
  deliverySettings?: SystemSettings;
  initialCategory?: string;
  isRestaurantClosed?: boolean;
  bgImageUrl?: string;
  onBack: () => void;
  onAddToCart: (dish: Dish, quantityToAdd?: number, options?: { size?: string; flavor?: string; addOns?: { name: string; price: number; }[]; specialInstructions?: string; }) => void;
  cartItems: OrderItem[];
  cartCountTotal: number;
  cartPriceTotal: number;
  onViewCart: () => void;
  toggleFavorite: (dishId: string) => void;
  favoriteDishIds: string[];
  isRiderRangeExceeded?: boolean;
  distanceDisplay?: string | null;
}

export default function FoodpandaRestaurantPage({
  restaurantName,
  dishes,
  deliverySettings,
  initialCategory,
  isRestaurantClosed,
  bgImageUrl,
  onBack,
  onAddToCart,
  cartItems,
  cartCountTotal,
  cartPriceTotal,
  onViewCart,
  toggleFavorite,
  favoriteDishIds,
  isRiderRangeExceeded,
  distanceDisplay
}: FoodpandaRestaurantPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory || "");
  const [activeDetailDish, setActiveDetailDish] = useState<Dish | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Group dishes by category
  const categories = Array.from(new Set(dishes.map(d => d.category)));
  if (categories.length > 0 && !activeCategory) {
    setActiveCategory(categories[0]);
  }

  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const scrollToCategory = (category: string) => {
    setActiveCategory(category);
    const element = categoryRefs.current[category];
    if (element) {
      const yOffset = -140; 
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (initialCategory && categories.includes(initialCategory)) {
      setTimeout(() => {
        scrollToCategory(initialCategory);
      }, 300);
    }
  }, []);

  const filteredDishes = dishes.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const restaurantImageUrl = deliverySettings?.restaurantStatuses?.[restaurantName]?.imageUrl;

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans pb-24">
      {/* Top Banner */}
      <div className="relative h-48 md:h-64 bg-amber-400 w-full overflow-hidden">
        {(bgImageUrl || restaurantImageUrl) && (
          <img 
            src={bgImageUrl || restaurantImageUrl} 
            alt={restaurantName}
            className="w-full h-full object-cover opacity-90 mix-blend-overlay"
          />
        )}
        <div className="absolute inset-0 bg-black/10" />
        <button 
          onClick={onBack}
          className="absolute top-4 left-4 p-2 bg-white/90 backdrop-blur-sm rounded-full text-zinc-800 shadow-sm z-10"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm rounded-full text-[#D70F64] shadow-sm z-10">
          <Heart className="w-6 h-6" />
        </button>
      </div>

      {/* Restaurant Info */}
      <div className="px-4 py-4 md:px-8 max-w-4xl mx-auto">
        <div className="flex items-start gap-4 -mt-10 relative z-10 mb-4">
          <div className="w-20 h-20 bg-white rounded-2xl shadow-md border-2 border-white overflow-hidden shrink-0">
             {restaurantImageUrl ? (
               <img src={restaurantImageUrl} alt={restaurantName} className="w-full h-full object-cover" />
             ) : (
               <div className="w-full h-full bg-zinc-100 flex items-center justify-center text-zinc-400 font-bold text-xl">TB</div>
             )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-black text-zinc-900 uppercase tracking-tight">{restaurantName}</h1>
          {isRestaurantClosed && (
            <span className="bg-pink-100 text-pink-600 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shrink-0">
              Closed
            </span>
          )}
        </div>
        <p className="text-zinc-500 font-medium text-sm mt-0.5">The Taste of Trust</p>
        
        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs font-semibold text-zinc-600">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-[#D70F64] fill-current" />
            <span className="text-zinc-800">4.5</span>
          </div>
          {distanceDisplay && (
            <>
              <span>•</span>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-[#D70F64]" />
                <span className="text-zinc-800 font-bold">{distanceDisplay}</span>
              </div>
            </>
          )}
          <span>•</span>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-zinc-400" />
            <span>20-30 min</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs font-medium">
          {isRestaurantClosed ? (
            <span className="text-pink-600 font-bold bg-pink-50 px-2 py-1 rounded-md">🔴 Closed</span>
          ) : (
            <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded-md">🟢 Open Now</span>
          )}
          <span className="bg-zinc-100 text-zinc-600 px-2 py-1 rounded-md">Min order: Rs. {deliverySettings?.restaurantStatuses?.[restaurantName]?.minOrder || deliverySettings?.minOrderAmount || 0}</span>
          <span className="bg-zinc-100 text-zinc-600 px-2 py-1 rounded-md">Delivery: {(() => {
            let chargeStr = deliverySettings?.restaurantStatuses?.[restaurantName]?.deliveryCharge;
            if (!chargeStr) {
              const fee = deliverySettings?.deliveryFee || 50;
              chargeStr = `Rs. ${fee}`;
            }
            if (isRiderRangeExceeded) {
              const match = chargeStr.match(/\d+/);
              if (match) {
                return chargeStr.replace(match[0], String(parseInt(match[0], 10) * 2));
              }
            }
            return chargeStr;
          })()}</span>
        </div>

        {/* Search */}
        <div className="mt-5 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input 
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={`Search in ${restaurantName}...`}
            className="w-full bg-zinc-100 border-none rounded-xl py-3 pl-10 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#D70F64]/20 transition-all"
          />
        </div>
      </div>

      {/* Sticky Category Nav */}
      {!searchQuery && (
        <div className="sticky top-0 bg-white/95 backdrop-blur-md z-40 border-b border-zinc-200 shadow-sm">
          <div className="max-w-4xl mx-auto px-2">
            <div className="flex overflow-x-auto scrollbar-none py-3 gap-2" ref={scrollRef}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => scrollToCategory(cat)}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activeCategory === cat ? "bg-[#D70F64] text-white shadow-md" : "bg-transparent text-zinc-600 hover:bg-zinc-100"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Menu Sections */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        {searchQuery ? (
           <div>
             <h2 className="text-lg font-black text-zinc-800 mb-4">Search Results</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDishes.map(dish => (
                  <DishCard key={dish.id} dish={dish} onAdd={() => setActiveDetailDish(dish)} isClosed={isRestaurantClosed} />
                ))}
                {filteredDishes.length === 0 && (
                  <p className="text-zinc-500 text-sm py-8 text-center col-span-full">No items found.</p>
                )}
             </div>
           </div>
        ) : (
          categories.map(cat => {
            const catDishes = dishes.filter(d => d.category === cat);
            if (catDishes.length === 0) return null;
            return (
              <div 
                key={cat} 
                ref={el => categoryRefs.current[cat] = el}
                className="mb-8 scroll-mt-36"
              >
                <h2 className="text-xl md:text-2xl font-black text-zinc-900 mb-4 tracking-tight">{cat}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {catDishes.map(dish => (
                    <DishCard key={dish.id} dish={dish} onAdd={() => setActiveDetailDish(dish)} isClosed={isRestaurantClosed} />
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Cart Bottom Bar */}
      {cartCountTotal > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-zinc-100 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] z-40">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <button 
              onClick={onViewCart}
              className="flex-1 bg-[#D70F64] hover:bg-[#b00c50] text-white p-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-pink-500/30 transition-all flex items-center justify-between"
            >
              <div className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center text-xs">
                {cartCountTotal}
              </div>
              <span>View Cart</span>
              <span>Rs. {cartPriceTotal}</span>
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {activeDetailDish && (
        <FoodDetailModal 
          dish={activeDetailDish} 
          onClose={() => setActiveDetailDish(null)}
          isActiveDetailDishClosed={false}
          onAddToCart={(item, qty, opts) => {
            onAddToCart(item, qty, opts);
            setActiveDetailDish(null);
          }}
        />
      )}
    </div>
  );
}

function DishCard({ dish, onAdd, isClosed }: { dish: Dish, onAdd: () => void, key?: React.Key, isClosed?: boolean }) {
  const hasOptions = (dish.sizes && dish.sizes.length > 0) || (dish.flavors && dish.flavors.length > 0) || (dish.addOns && dish.addOns.length > 0);
  
  return (
    <div 
      className={`flex gap-4 p-4 bg-white border border-zinc-100 rounded-2xl shadow-sm transition ${!dish.isAvailable || isClosed ? "opacity-60 grayscale-[20%] cursor-not-allowed" : "hover:shadow-md cursor-pointer active:scale-[0.98]"}`}
      onClick={() => { if (!isClosed && dish.isAvailable !== false) onAdd(); }}
    >
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-zinc-900 text-sm md:text-base leading-tight">{dish.name}</h3>
          {!dish.isAvailable && !isClosed && (
            <span className="inline-block mt-1 bg-pink-100 text-pink-600 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">Out of stock</span>
          )}
          {dish.description && (
            <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-relaxed">{dish.description}</p>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-black text-[#D70F64] text-sm">
            {hasOptions && <span className="text-xs text-zinc-400 font-medium mr-1">From</span>}
            Rs. {dish.price}
          </span>
        </div>
      </div>
      
      <div className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-zinc-50 border border-zinc-100">
        {dish.imageUrl ? (
          <LazyImage src={dish.imageUrl} alt={dish.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-100 text-zinc-300">
            <span className="text-[10px] font-bold uppercase">No Image</span>
          </div>
        )}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (!isClosed && dish.isAvailable !== false) onAdd();
          }}
          disabled={isClosed || dish.isAvailable === false}
          className={`absolute bottom-[-1px] right-[-1px] bg-white border shadow-sm w-8 h-8 rounded-tl-xl flex items-center justify-center font-bold text-lg transition ${isClosed || dish.isAvailable === false ? "text-zinc-300 border-zinc-100 cursor-not-allowed" : "text-[#D70F64] border-[#D70F64]/20 hover:bg-[#D70F64] hover:text-white"}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
