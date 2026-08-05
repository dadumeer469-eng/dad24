import React from "react";
import { motion } from "motion/react";
import daduLogo from "../assets/images/dadu_food_logo_1782079256405.jpg";

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
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.85, 1, 0.85],
          }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className={`${imgSize} rounded-full overflow-hidden p-0.5 bg-gradient-to-tr from-[#d70f64] via-pink-400 to-amber-300 shadow-md flex items-center justify-center shrink-0`}
        >
          <img
            src={daduLogo}
            alt="Dadu Food"
            className="w-full h-full object-cover rounded-full"
          />
        </motion.div>
        {text && (
          <span className="text-xs font-black text-zinc-700 dark:text-zinc-300 animate-pulse uppercase tracking-wider">
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
        {/* Soft glowing ambient aura ring */}
        <motion.div
          animate={{
            scale: [0.95, 1.25, 0.95],
            opacity: [0.3, 0.65, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 bg-[#d70f64]/25 rounded-full blur-xl pointer-events-none"
        />

        {/* Pulsing Outer Gradient Ring */}
        <motion.div
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-[#d70f64] via-orange-400 to-pink-500 opacity-80 blur-[1px]"
        />

        {/* Main Logo Card Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: 1,
            scale: [0.98, 1.05, 0.98],
          }}
          transition={{
            opacity: { duration: 0.3 },
            scale: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
          }}
          className={`relative ${imgSize} rounded-full p-1 bg-white shadow-xl border-2 border-white flex items-center justify-center overflow-hidden z-10`}
        >
          <img
            src={daduLogo}
            alt="Dadu Food Logo"
            className="w-full h-full object-cover rounded-full"
          />
        </motion.div>
      </div>

      {/* Branded Label */}
      {text && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: [0.75, 1, 0.75], y: 0 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-1"
        >
          <span className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d70f64] animate-ping" />
            {text}
          </span>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            Dadu City Express
          </span>
        </motion.div>
      )}
    </div>
  );
}

export default DaduLogoLoader;
