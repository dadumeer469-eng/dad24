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
          className={`${imgSize} rounded-full overflow-hidden p-0.5 bg-gradient-to-tr from-[#D70F64] to-pink-500 shadow-md flex items-center justify-center shrink-0 border border-white/20`}
        >
          <img
            src={daduLogo}
            alt="Dadu Food"
            className="w-full h-full object-cover rounded-full bg-white"
          />
        </motion.div>
        {text && (
          <span className="text-xs font-black text-zinc-800 dark:text-zinc-200 animate-pulse uppercase tracking-wider">
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
            scale: [0.95, 1.2, 0.95],
            opacity: [0.25, 0.5, 0.25],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 bg-[#D70F64]/30 rounded-full blur-xl pointer-events-none"
        />

        {/* Pulsing Outer Ring */}
        <motion.div
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute -inset-1 rounded-full bg-gradient-to-tr from-[#D70F64] via-pink-500 to-[#D70F64] opacity-90 blur-[1px]"
        />

        {/* Main Logo Card Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{
            opacity: 1,
            scale: [0.98, 1.04, 0.98],
          }}
          transition={{
            opacity: { duration: 0.3 },
            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
          }}
          className={`relative ${imgSize} rounded-full p-1 bg-white dark:bg-zinc-900 shadow-xl border-2 border-[#D70F64]/30 flex items-center justify-center overflow-hidden z-10`}
        >
          <img
            src={daduLogo}
            alt="Dadu Food Logo"
            className="w-full h-full object-cover rounded-full bg-white"
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
