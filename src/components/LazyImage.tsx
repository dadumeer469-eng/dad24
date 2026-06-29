import React, { useState } from "react";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
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
      {!isLoaded && (
        <div className="absolute inset-0 bg-zinc-200" />
      )}
      
      {/* Actual Image */}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover ${
          isLoaded ? "opacity-100" : "opacity-0"
        } ${imgClassName || ""}`}
        referrerPolicy={referrerPolicy}
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  );
}
