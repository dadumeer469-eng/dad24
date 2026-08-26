import React, { useEffect, useState, useRef, useCallback } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db, analytics } from "../firebase";
import { logEvent } from "firebase/analytics";
import { Banner } from "../types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LazyImage } from "./LazyImage";

interface BannerCarouselProps {
  bannerVersion?: number;
  onBannerClick?: (link: string) => void;
}

const DEFAULT_BANNERS: Banner[] = [
  {
    id: "default_banner_1",
    imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1200",
    restaurantName: "Dadu Fast Food & Kitchen",
    detail: "🔥 Special Discount - Hot & Fresh Food Delivered!",
    isActive: true,
  },
  {
    id: "default_banner_2",
    imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=1200",
    restaurantName: "Dadu Fast Food & Kitchen",
    detail: "🍕 Cheesy Hot Pizzas & Burgers Under 25 Mins",
    isActive: true,
  },
  {
    id: "default_banner_3",
    imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1200",
    restaurantName: "Dadu Home Services",
    detail: "⚡ Instant Rider Delivery & Home Services",
    isActive: true,
  },
];

const BannerImage: React.FC<{ banner: Banner; onClick: () => void }> = ({ banner, onClick }) => {
  return (
    <div
      className="relative w-full h-full flex-shrink-0 cursor-pointer bg-zinc-900 flex items-center justify-center overflow-hidden select-none"
      onClick={onClick}
    >
      <LazyImage
        src={banner.imageUrl}
        alt={banner.restaurantName || "Dadu Food Offer"}
        className="w-full h-full"
        imgClassName="object-cover w-full h-full transform transition-transform duration-700 hover:scale-105"
        referrerPolicy="no-referrer"
      />
      
      {/* Dark subtle gradient overlay at bottom for better readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

      {/* Stylish Detail Text Overlay */}
      {banner.detail && (
        <div className="absolute bottom-4 left-4 right-16 z-10 pointer-events-none">
          <span className="inline-block bg-black/65 backdrop-blur-md text-white text-xs md:text-sm font-black px-3.5 py-1.5 md:px-4 md:py-2 rounded-full shadow-lg border border-white/15 tracking-wide">
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
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const currentXRef = useRef<number>(0);
  const autoSlideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const displayBanners = banners.length > 0 ? banners : DEFAULT_BANNERS;

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % displayBanners.length);
  }, [displayBanners.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + displayBanners.length) % displayBanners.length);
  }, [displayBanners.length]);

  // Firestore real-time listener for banners updated from admin panel
  useEffect(() => {
    const q = query(collection(db, "promotional_banners"), where("isActive", "==", true));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedBanners = snapshot.docs.map(
          (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Banner)
        );
        fetchedBanners.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setBanners(fetchedBanners);
        setIsLoading(false);
      },
      (err) => {
        console.error("Failed to fetch banners:", err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Automatic auto-scrolling interval (continuous timer)
  useEffect(() => {
    if (displayBanners.length <= 1 || isPaused || isDragging) return;

    autoSlideTimerRef.current = setInterval(() => {
      nextSlide();
    }, 3200);

    return () => {
      if (autoSlideTimerRef.current) {
        clearInterval(autoSlideTimerRef.current);
      }
    };
  }, [displayBanners.length, isPaused, isDragging, nextSlide]);

  const handleBannerClick = (banner: Banner) => {
    if (Math.abs(dragOffset) > 8) return; // Ignore click if user was dragging
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

  // --- MOUSE & TOUCH DRAG HANDLERS FOR MANUAL SCROLLING ---
  const handleDragStart = (clientX: number) => {
    setIsDragging(true);
    setIsPaused(true);
    startXRef.current = clientX;
    currentXRef.current = clientX;
    setDragOffset(0);
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging) return;
    currentXRef.current = clientX;
    const diff = clientX - startXRef.current;
    setDragOffset(diff);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const diff = currentXRef.current - startXRef.current;
    const threshold = 40; // minimum drag distance in px to trigger slide change

    if (diff < -threshold) {
      nextSlide();
    } else if (diff > threshold) {
      prevSlide();
    }
    
    setDragOffset(0);
    // Resume auto-scroll after 2 seconds
    setTimeout(() => {
      setIsPaused(false);
    }, 2000);
  };

  // Mouse drag events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX);
  };

  const handleMouseUp = () => {
    handleDragEnd();
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleDragEnd();
    }
    setIsPaused(false);
  };

  const startYRef = useRef<number>(0);
  const isTouchActiveRef = useRef<boolean>(false);
  const isTouchDraggingRef = useRef<boolean>(false);
  const isVerticalScrollRef = useRef<boolean>(false);

  // Touch drag events
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    currentXRef.current = touch.clientX;
    isTouchActiveRef.current = true;
    isTouchDraggingRef.current = false;
    isVerticalScrollRef.current = false;
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isTouchActiveRef.current || isVerticalScrollRef.current) return;

    const touch = e.touches[0];
    const diffX = touch.clientX - startXRef.current;
    const diffY = touch.clientY - startYRef.current;

    // First movement classification: vertical vs horizontal
    if (!isTouchDraggingRef.current && !isVerticalScrollRef.current) {
      if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 5) {
        // Yield completely to native page vertical scrolling
        isVerticalScrollRef.current = true;
        return;
      }
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 5) {
        // Start horizontal carousel dragging
        isTouchDraggingRef.current = true;
        setIsDragging(true);
      }
    }

    if (isTouchDraggingRef.current) {
      currentXRef.current = touch.clientX;
      setDragOffset(diffX);
    }
  };

  const handleTouchEnd = () => {
    if (!isTouchActiveRef.current) return;
    isTouchActiveRef.current = false;

    if (isTouchDraggingRef.current) {
      handleDragEnd();
    } else {
      setIsPaused(false);
      setIsDragging(false);
      setDragOffset(0);
    }
    isTouchDraggingRef.current = false;
    isVerticalScrollRef.current = false;
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 mt-4 mb-4">
        <div className="w-full h-44 sm:h-56 md:h-64 rounded-3xl shadow-lg bg-zinc-200 dark:bg-zinc-850 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#d70f64] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 mt-4 mb-4">
      <div
        ref={containerRef}
        className={`relative w-full h-44 sm:h-56 md:h-64 rounded-3xl overflow-hidden shadow-xl border border-pink-200/50 dark:border-zinc-800 group select-none touch-pan-both ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Banner Images Track */}
        <div
          className={`flex w-full h-full ${
            isDragging ? "transition-none" : "transition-transform duration-500 ease-out"
          }`}
          style={{
            transform: `translateX(calc(-${currentIndex * 100}% + ${dragOffset}px))`,
          }}
        >
          {displayBanners.map((banner) => (
            <BannerImage
              key={banner.id}
              banner={banner}
              onClick={() => handleBannerClick(banner)}
            />
          ))}
        </div>

        {/* Floating Auto-Scroll Indicator & Nav Arrows */}
        {displayBanners.length > 1 && (
          <>
            {/* Left Prev Arrow Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prevSlide();
                setIsPaused(true);
                setTimeout(() => setIsPaused(false), 3000);
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 md:w-11 md:h-11 rounded-full bg-black/40 hover:bg-[#d70f64] text-white backdrop-blur-md flex items-center justify-center opacity-80 group-hover:opacity-100 transition-all cursor-pointer shadow-lg border border-white/20 active:scale-90 z-20"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            {/* Right Next Arrow Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextSlide();
                setIsPaused(true);
                setTimeout(() => setIsPaused(false), 3000);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 md:w-11 md:h-11 rounded-full bg-black/40 hover:bg-[#d70f64] text-white backdrop-blur-md flex items-center justify-center opacity-80 group-hover:opacity-100 transition-all cursor-pointer shadow-lg border border-white/20 active:scale-90 z-20"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            {/* Bottom Dots Indicator Bar */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15 shadow-sm">
              {displayBanners.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(idx);
                    setIsPaused(true);
                    setTimeout(() => setIsPaused(false), 3000);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    currentIndex === idx
                      ? "bg-[#d70f64] w-3.5 ring-1 ring-[#d70f64]/40"
                      : "bg-white/50 hover:bg-white/80 w-1.5"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
