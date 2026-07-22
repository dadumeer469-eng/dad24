import React, { useEffect, useState, useRef, useCallback } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db, analytics } from "../firebase";
import { logEvent } from "firebase/analytics";
import { Banner } from "../types";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BannerCarouselProps {
  bannerVersion?: number;
  onBannerClick?: (link: string) => void;
}

const BannerImage: React.FC<{ banner: Banner; onClick: () => void }> = ({ banner, onClick }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div
      className="relative w-full h-full flex-shrink-0 cursor-pointer bg-slate-100 flex items-center justify-center overflow-hidden"
      onClick={onClick}
    >
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-200 animate-pulse">
          <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <img
        src={error ? "https://placehold.co/800x400/f8fafc/94a3b8?text=Dadu+Food" : banner.imageUrl}
        alt={banner.restaurantName || "Dadu Food Offer"}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded || error ? "opacity-100" : "opacity-0"}`}
        loading="lazy"
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => {
          setLoaded(true);
          setError(true);
        }}
      />
      
      {/* Stylish Detail Text Overlay */}
      {banner.detail && (
        <div className="absolute top-4 left-4 right-16 z-10 pointer-events-none">
          <span className="inline-block bg-black/60 backdrop-blur-md text-white text-xs md:text-sm font-bold px-3 py-1.5 md:px-4 md:py-2 rounded-full shadow-lg border border-white/10">
            {banner.detail}
          </span>
        </div>
      )}
    </div>
  );
};

export default function BannerCarousel({ onBannerClick }: BannerCarouselProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  useEffect(() => {
    // Real-time listener for active banners without caching to ensure instant updates
    const q = query(collection(db, "promotional_banners"), where("isActive", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedBanners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner));
      // Sort by createdAt descending locally to avoid requiring a composite index
      fetchedBanners.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setBanners(fetchedBanners);
      setIsLoading(false);
    }, (err) => {
      console.error("Failed to fetch banners:", err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;

    const autoSlideTimer = setInterval(() => {
      nextSlide();
    }, 3000);

    return () => clearInterval(autoSlideTimer);
  }, [banners.length, isPaused, nextSlide]);

  const handleBannerClick = (banner: Banner) => {
    if (analytics) {
      try {
        logEvent(analytics, "banner_clicked", {
          restaurant_name: banner.restaurantName || "general_offer",
          banner_id: banner.id,
        });
      } catch (e) {
        console.warn("Analytics event logging failed:", e);
      }
    }
    if (banner.restaurantName && onBannerClick) {
      onBannerClick(banner.restaurantName);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
    
    // Reset values
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="w-full h-48 md:h-64 rounded-2xl shadow-lg bg-slate-200 animate-pulse flex items-center justify-center mb-6">
          <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (banners.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 mt-6">
      <div 
        className="relative w-full h-48 md:h-64 rounded-2xl overflow-hidden shadow-lg mb-6 group"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="flex w-full h-full transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {banners.map((banner) => (
            <BannerImage
              key={banner.id}
              banner={banner}
              onClick={() => handleBannerClick(banner)}
            />
          ))}
        </div>

        {/* Dark Gradient Overlay for Nav Dots */}
        {banners.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        )}

        {banners.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevSlide();
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/30 backdrop-blur-sm hover:bg-white/90 text-white hover:text-pink-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-sm"
            >
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextSlide();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/30 backdrop-blur-sm hover:bg-white/90 text-white hover:text-pink-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-sm"
            >
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(idx);
                  }}
                  className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full transition-all cursor-pointer shadow-sm ${
                    currentIndex === idx ? "bg-white w-4 md:w-6" : "bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
