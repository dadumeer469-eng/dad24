import React from "react";
import { motion } from "motion/react";
import daduLogo from "../assets/images/dadu_food_logo_new_1782333467889.jpg";

interface DaduLogoLoaderProps {
  size?: "sm" | "md" | "lg" | "xl" | "full";
  text?: string;
  className?: string;
  compact?: boolean;
}

export function DaduLogoLoader({
  size = "md",
  text = "Loading Dadu Food...",
  className = "",
  compact = false,
}: DaduLogoLoaderProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-24 h-24",
    full: "w-28 h-28",
  };

  const imgSize = sizeClasses[size] || sizeClasses.md;

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div
          className={`${imgSize} rounded-full overflow-hidden p-0.5 bg-[#E21B70] shadow-xs flex items-center justify-center shrink-0`}
        >
          <img
            src={daduLogo}
            alt="Dadu Food"
            className="w-full h-full object-cover rounded-full bg-white"
          />
        </div>
        {text && (
          <span className="text-xs font-bold text-[#14141A] dark:text-[#F5F5F8] uppercase tracking-wider">
            {text}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center py-8 px-4 text-center select-none ${className}`}
    >
      <div className="relative flex items-center justify-center mb-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.22 }}
          className={`relative ${imgSize} rounded-2xl p-1 bg-white dark:bg-[#14141A] shadow-md border-2 border-[#E21B70] flex items-center justify-center overflow-hidden`}
        >
          <img
            src={daduLogo}
            alt="Dadu Food Logo"
            className="w-full h-full object-cover rounded-xl bg-white"
          />
        </motion.div>
      </div>

      {text && (
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#14141A] dark:text-[#F5F5F8]">
            {text}
          </span>
          <span className="text-[11px] font-bold text-[#E21B70] dark:text-[#FF4D94] uppercase tracking-widest">
            Dadu City Express
          </span>
        </div>
      )}
    </div>
  );
}

export default DaduLogoLoader;
