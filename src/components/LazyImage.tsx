import React, { useState } from "react";
import { Utensils, ImageOff } from "lucide-react";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  loading?: "lazy" | "eager";
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
  fallbackIcon?: React.ReactNode;
}

export function LazyImage({
  src,
  alt = "Item photo",
  className = "w-full h-full",
  imgClassName = "",
  referrerPolicy,
  loading = "lazy",
  fallbackIcon,
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-zinc-100 dark:bg-zinc-800/90 ${className}`}>
      {/* Premium Shimmer Skeleton Beam while loading */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 z-10 overflow-hidden bg-zinc-200/80 dark:bg-zinc-800/80 pointer-events-none flex items-center justify-center">
          {/* Animated Light Sweep Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent animate-shimmer-sweep" />
          {/* Subtle center icon placeholder */}
          <div className="p-2 rounded-xl bg-white/50 dark:bg-zinc-700/50 text-zinc-400 dark:text-zinc-500 animate-pulse-subtle">
            {fallbackIcon || <Utensils className="w-4 h-4 opacity-50" />}
          </div>
        </div>
      )}

      {/* Broken image error state */}
      {hasError ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
          {fallbackIcon || <ImageOff className="w-4 h-4 opacity-50" />}
          <span className="text-[9px] font-bold text-zinc-400/80 uppercase tracking-widest mt-1">Dadu Express</span>
        </div>
      ) : (
        /* Actual Image with GPU-accelerated smooth scale/fade transition */
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          className={`w-full h-full transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) transform-gpu ${
            isLoaded
              ? "opacity-100 scale-100 blur-0"
              : "opacity-0 scale-105 blur-xs"
          } ${imgClassName}`}
          referrerPolicy={referrerPolicy}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          {...props}
        />
      )}
    </div>
  );
}

