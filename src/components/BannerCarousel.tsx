import React, { useEffect, useState } from "react";
import { ArrowRight, Clock, MessageCircle, Truck, ShoppingBasket, ShoppingCart, Sparkles } from "lucide-react";
import heroFeastImg from "../assets/images/dadu_food_hero_feast_1795614443664.jpg";

interface BannerCarouselProps {
  bannerVersion?: number;
  onBannerClick?: (link: string) => void;
  deliveryFee?: number;
  onOpenGrocery?: () => void;
  cartTotal?: number;
  cartCount?: number;
  onOpenCart?: () => void;
  freeDeliveryAbove?: number;
}

export default function BannerCarousel({
  deliveryFee = 50,
  onOpenGrocery,
  cartTotal = 0,
  cartCount = 0,
  onOpenCart,
  freeDeliveryAbove = 1000,
}: BannerCarouselProps) {
  const [activeSlide, setActiveSlide] = useState(0);

  // Purge any legacy cached Firestore banners
  useEffect(() => {
    try {
      localStorage.removeItem("dadu_cached_banners");
    } catch {
      // Ignore storage restrictions
    }
  }, []);

  const handleBrowseMenu = () => {
    const el = document.getElementById("catalog-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const promoCards = [
    {
      id: "free-delivery",
      badge: "FREE DELIVERY",
      title: "Orders Rs. 1,000+",
      subtitle: `Standard fee Rs. ${deliveryFee} · COD & Easypaisa`,
      bg: "from-[#D70F64] to-[#9E0B49]",
      actionLabel: "Order Now",
      onClick: handleBrowseMenu,
    },
    {
      id: "express-mart",
      badge: "DADU EXPRESS MART",
      title: "100 Daily Groceries",
      subtitle: "Rashan, Oil, Spices, Dairy & Tea at market rates",
      bg: "from-[#1A1A26] to-[#2B1222]",
      actionLabel: "Shop Mart",
      onClick: () => {
        if (onOpenGrocery) onOpenGrocery();
      },
    },
    {
      id: "whatsapp-list",
      badge: "WHATSAPP ORDER",
      title: "Send Your List",
      subtitle: "Message 03277004471 for quick food or mart delivery",
      bg: "from-emerald-700 to-emerald-900",
      actionLabel: "Chat Now",
      href: "https://wa.me/923277004471?text=Assalam-o-Alaikum%20Dadu%20Food!%20I%20would%20like%20to%20order%3A%20",
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-3.5 sm:px-4 pt-3 sm:pt-4 pb-2 space-y-3">
      {/* Primary Editorial Hero Banner */}
      <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-[#14141A] border border-[#E6E6EE] dark:border-[#272733] shadow-sm min-h-[220px] sm:min-h-[290px] md:min-h-[320px] flex items-center animate-fade-in">
        <img
          src={heroFeastImg}
          alt="Fresh Pakistani biryani, wood-fired pizza, seekh kababs, and crispy burger delivered fast in Dadu"
          className="absolute inset-0 w-full h-full object-cover object-right sm:object-center"
          loading="eager"
          decoding="async"
        />

        <div
          className="absolute inset-0 bg-gradient-to-r from-[#0B0B0F]/95 via-[#0B0B0F]/82 to-[#0B0B0F]/35 sm:via-[#0B0B0F]/72 sm:to-transparent"
          aria-hidden="true"
        />

        <div className="relative z-10 w-full max-w-2xl px-5 py-5 sm:px-8 sm:py-8 md:px-10 space-y-3 sm:space-y-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-white/90">
            <span className="inline-flex items-center gap-1.5 bg-[#D70F64] text-white font-black uppercase tracking-wider text-[11px] px-2.5 py-1 rounded-full shadow-sm">
              Dadu City Delivery
            </span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Clock className="w-3.5 h-3.5 text-[#FF4D94]" />
              20–35 min
            </span>
            <span className="text-white/40" aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Truck className="w-3.5 h-3.5 text-[#FF4D94]" />
              <span>{`Rs. ${deliveryFee} delivery fee · Free Rs. ${freeDeliveryAbove.toLocaleString()}+`}</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-[40px] font-extrabold text-white tracking-tight leading-[1.12]">
            Fresh, Hot Food Delivered{" "}
            <span className="relative inline-block text-[#FFD500]">
              Fast
              <span className="absolute left-0 -bottom-0.5 h-[4px] w-full bg-[#FFD500] rounded-full -rotate-1" />
            </span>{" "}
            in Dadu
          </h1>

          <p className="speakable-summary text-xs sm:text-sm md:text-base text-zinc-200 max-w-lg leading-relaxed">
            Order pizza, Sindhi biryani, karahi, burgers, broast, and fresh chai from trusted local Dadu kitchens. Pay with Cash on Delivery or Easypaisa.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
            {cartCount > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => onOpenCart?.()}
                  className="min-h-[48px] px-5 py-2.5 rounded-full bg-[#D70F64] hover:bg-[#B80C54] text-white text-sm font-black flex items-center justify-center gap-2.5 shadow-md transition-transform active:scale-[0.98] cursor-pointer"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span className="text-left leading-tight">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-white/80">Cart Total</span>
                    <span className="block font-mono tabular-nums">Rs. {cartTotal.toLocaleString()}</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenCart?.()}
                  className="min-h-[48px] px-6 py-2.5 rounded-full bg-[#D70F64] hover:bg-[#B80C54] text-white text-sm font-black flex items-center justify-center gap-2 shadow-md transition-transform active:scale-[0.98] cursor-pointer"
                >
                  <span>VIEW CART</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleBrowseMenu}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#D70F64] hover:bg-[#B80C54] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-[0.98] cursor-pointer"
                >
                  <span>Order Food Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href="https://wa.me/923277004471?text=Assalam-o-Alaikum%20Dadu%20Food!%20I%20would%20like%20to%20order%3A%20"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white/12 hover:bg-white/20 text-white border border-white/25 backdrop-blur-sm text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-[#4ADE80]" />
                  <span>WhatsApp Order</span>
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Foodpanda-Style Horizontal Promo Carousel */}
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none snap-x touch-pan-both overscroll-x-contain">
        {promoCards.map((card, idx) => {
          const inner = (
            <div
              className={`bg-gradient-to-r ${card.bg} text-white rounded-2xl p-4 min-w-[260px] sm:min-w-[290px] flex-1 snap-start border border-white/10 shadow-xs flex items-center justify-between gap-3 transition-transform active:scale-[0.98]`}
            >
              <div className="min-w-0 space-y-1">
                <span className="inline-flex items-center gap-1 text-[9.5px] font-black uppercase tracking-wider bg-white/18 px-2 py-0.5 rounded-md">
                  {idx === 0 ? <Sparkles className="w-3 h-3" /> : idx === 1 ? <ShoppingBasket className="w-3 h-3" /> : <MessageCircle className="w-3 h-3" />}
                  {card.badge}
                </span>
                <p className="text-sm sm:text-base font-extrabold leading-tight truncate">
                  {card.title}
                </p>
                <p className="text-[11px] text-white/85 font-medium line-clamp-1">
                  {card.subtitle}
                </p>
              </div>
              <span className="shrink-0 bg-white text-[#14141A] text-[11px] font-extrabold px-3 py-2 rounded-xl shadow-xs">
                {card.actionLabel}
              </span>
            </div>
          );

          if (card.href) {
            return (
              <a
                key={card.id}
                href={card.href}
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={() => setActiveSlide(idx)}
                className="block shrink-0 sm:flex-1"
              >
                {inner}
              </a>
            );
          }

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => {
                setActiveSlide(idx);
                card.onClick?.();
              }}
              className="text-left block shrink-0 sm:flex-1 cursor-pointer"
            >
              {inner}
            </button>
          );
        })}
      </div>

      {/* Carousel Dots (mobile indicator) */}
      <div className="flex sm:hidden items-center justify-center gap-1.5">
        {promoCards.map((c, idx) => (
          <span
            key={c.id}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              activeSlide === idx ? "w-5 bg-[#D70F64]" : "w-1.5 bg-zinc-300 dark:bg-zinc-700"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
