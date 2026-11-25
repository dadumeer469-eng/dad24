import React, { useEffect } from "react";
import { ArrowRight, Clock, MessageCircle, Truck } from "lucide-react";
import heroFeastImg from "../assets/images/dadu_food_hero_feast_1795614443664.jpg";

interface BannerCarouselProps {
  bannerVersion?: number;
  onBannerClick?: (link: string) => void;
  deliveryFee?: number;
}

export default function BannerCarousel({
  deliveryFee = 50,
}: BannerCarouselProps) {
  // Purge any legacy cached Firestore banners (which previously contained 45% off / Lorem Ipsum graphics)
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

  return (
    <section className="max-w-7xl mx-auto px-3.5 sm:px-4 pt-3 sm:pt-4 pb-2">
      <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-[#14141A] border border-[#E6E6EE] dark:border-[#272733] shadow-sm min-h-[250px] sm:min-h-[310px] md:min-h-[340px] flex items-center">
        {/* Generated Editorial Hero Photography */}
        <img
          src={heroFeastImg}
          alt="Fresh Pakistani biryani, wood-fired pizza, seekh kababs, and crispy burger delivered fast in Dadu"
          className="absolute inset-0 w-full h-full object-cover object-right sm:object-center"
          loading="eager"
          decoding="async"
        />

        {/* High-Contrast Dark Scrim for >10:1 Text Readability */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#0B0B0F]/95 via-[#0B0B0F]/82 to-[#0B0B0F]/35 sm:via-[#0B0B0F]/75 sm:to-transparent"
          aria-hidden="true"
        />

        {/* Editorial Hero Content */}
        <div className="relative z-10 w-full max-w-2xl px-5 py-6 sm:px-8 sm:py-9 md:px-10 space-y-3.5 sm:space-y-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-white/90">
            <span className="inline-flex items-center gap-1.5 text-[#FF4D94] font-bold uppercase tracking-wider text-[11px]">
              Dadu City Delivery
            </span>
            <span className="text-white/40" aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Clock className="w-3.5 h-3.5 text-[#FF4D94]" />
              20–35 min
            </span>
            <span className="text-white/40" aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Truck className="w-3.5 h-3.5 text-[#FF4D94]" />
              <span>{`Rs. ${deliveryFee} fee · Free Rs. 1,000+`}</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-[42px] font-extrabold text-white tracking-tight leading-[1.12]">
            Fresh, Hot Food Delivered Fast in Dadu
          </h1>

          <p className="speakable-summary text-xs sm:text-sm md:text-base text-zinc-200 max-w-lg leading-relaxed">
            Order pizza, Sindhi biryani, karahi, burgers, broast, and fresh chai from trusted local Dadu kitchens. Pay with Cash on Delivery, JazzCash, or Easypaisa.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleBrowseMenu}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#E21B70] hover:bg-[#C2145E] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-[0.98] cursor-pointer"
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
          </div>
        </div>
      </div>
    </section>
  );
}
