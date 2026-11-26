import React, { useState, useEffect, useRef } from "react";
import { Utensils } from "lucide-react";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  loading?: "lazy" | "eager";
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
  fallbackIcon?: React.ReactNode;
}

const loadedImageCache = new Set<string>();

export function LazyImage({
  src,
  alt = "Dadu Food dish photo",
  className = "w-full h-full",
  imgClassName = "",
  referrerPolicy = "no-referrer",
  loading = "lazy",
  fallbackIcon,
  ...props
}: LazyImageProps) {
  const isAlreadyLoaded = src ? loadedImageCache.has(src) : false;
  const [isLoaded, setIsLoaded] = useState<boolean>(isAlreadyLoaded);
  const [hasError, setHasError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setHasError(false);
    setRetryCount(0);
    if (!src) {
      setIsLoaded(false);
      return;
    }
    if (loadedImageCache.has(src)) {
      setIsLoaded(true);
      return;
    }
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      loadedImageCache.add(src);
      setIsLoaded(true);
    }
  }, [src]);

  const handleImageError = () => {
    if (retryCount < 1 && src && !src.startsWith("data:")) {
      setRetryCount((prev) => prev + 1);
      setTimeout(() => {
        if (imgRef.current) {
          const sep = src.includes("?") ? "&" : "?";
          imgRef.current.src = `${src}${sep}retry=${Date.now()}`;
        }
      }, 700);
    } else {
      setHasError(true);
    }
  };

  return (
    <div className={`relative overflow-hidden bg-[#efe9df] dark:bg-[#1D1D26] ${className}`}>
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 z-10 overflow-hidden bg-[#f7f4ee] dark:bg-[#1D1D26] pointer-events-none flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 dark:via-white/8 to-transparent animate-shimmer-sweep" />
          <div className="p-2 rounded-xl bg-white/80 dark:bg-[#252530] text-[#E21B70]">
            {fallbackIcon || <Utensils className="w-4 h-4 opacity-70" />}
          </div>
        </div>
      )}

      {hasError ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-2 bg-[#1D1D26] text-white">
          <div className="w-8 h-8 rounded-xl bg-[#E21B70] text-white flex items-center justify-center mb-1 shadow-xs">
            {fallbackIcon || <Utensils className="w-4 h-4" />}
          </div>
          <span className="text-[10px] font-extrabold text-white tracking-wider uppercase">
            DADU EXPRESS
          </span>
        </div>
      ) : (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          className={`w-full h-full transition-opacity duration-200 gpu-layer ${
            isLoaded ? "opacity-100" : "opacity-0"
          } ${imgClassName}`}
          referrerPolicy={referrerPolicy}
          onLoad={() => {
            if (src) loadedImageCache.add(src);
            setIsLoaded(true);
            setHasError(false);
          }}
          onError={handleImageError}
          {...props}
        />
      )}
    </div>
  );
}
