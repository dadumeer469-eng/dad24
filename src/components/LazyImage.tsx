import React, { useState } from "react";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  imgClassName?: string;
}

export function LazyImage({
  src,
  alt,
  className,
  imgClassName,
  referrerPolicy,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-zinc-200 ${className || "w-full h-full"}`}>
      {/* Placeholder / Blur skeleton */}
      <div
        className={`absolute inset-0 bg-zinc-200 animate-pulse transition-opacity duration-500 ${
          isLoaded ? "opacity-0" : "opacity-100"
        }`}
      />
      
      {/* Actual Image */}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-500 ${
          isLoaded ? "opacity-100" : "opacity-0"
        } ${imgClassName || ""}`}
        referrerPolicy={referrerPolicy}
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  );
}
