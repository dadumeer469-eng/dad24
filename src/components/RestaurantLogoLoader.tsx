import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Star, Store, ShieldCheck, Clock } from "lucide-react";
import { LazyImage } from "./LazyImage";

interface RestaurantLogoLoaderProps {
  restaurantName: string;
  logoUrl?: string;
  isOpen: boolean;
  onFinish?: () => void;
  durationMs?: number; // default 2000ms (2 seconds)
}

export default function RestaurantLogoLoader({
  restaurantName,
  logoUrl,
  isOpen,
  onFinish,
  durationMs = 2000,
}: RestaurantLogoLoaderProps) {
  const [progress, setProgress] = useState(0);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      return;
    }

    setProgress(0);
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          if (onFinishRef.current) {
            onFinishRef.current();
          }
        }, 100);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [isOpen, durationMs]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-zinc-950/95 text-white select-none overflow-hidden backdrop-blur-2xl px-4"
      >
        {/* Background Radial Glow Flares */}
        <div className="absolute w-[500px] h-[500px] bg-[#D70F64]/20 rounded-full blur-[130px] animate-pulse pointer-events-none" />
        <div className="absolute w-[300px] h-[300px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Floating Sparkle Particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={{ y: [-10, 10, -10], rotate: [0, 10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 left-10 text-3xl opacity-30"
          >
            ✨
          </motion.div>
          <motion.div
            animate={{ y: [10, -10, 10], rotate: [0, -12, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/3 right-12 text-3xl opacity-30"
          >
            🍗
          </motion.div>
          <motion.div
            animate={{ y: [-8, 8, -8] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-1/3 left-16 text-3xl opacity-25"
          >
            🍔
          </motion.div>
          <motion.div
            animate={{ y: [8, -8, 8] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-1/4 right-20 text-3xl opacity-25"
          >
            🍕
          </motion.div>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full space-y-6">
          {/* Top Pill Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#D70F64]/20 via-pink-500/10 to-[#D70F64]/20 border border-[#D70F64]/40 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest text-pink-300 shadow-lg backdrop-blur-md"
          >
            <Store className="w-3.5 h-3.5 text-[#D70F64] animate-pulse" />
            <span>DADU FOOD PARTNER SHOP</span>
          </motion.div>

          {/* Animated Restaurant Logo Badge Frame */}
          <div className="relative flex items-center justify-center">
            {/* Glowing Pulsing Aura Rings */}
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-[#D70F64] via-rose-500 to-pink-500 blur-xl opacity-50"
            />
            
            {/* Rotating Outer Gradient Border */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-1.5 rounded-[28px] bg-gradient-to-tr from-[#D70F64] via-amber-400 to-pink-500 opacity-90 p-0.5"
            />

            {/* Main Logo Container */}
            <motion.div
              initial={{ scale: 0.6, rotate: -8 }}
              animate={{ scale: [0.6, 1.08, 1], rotate: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative w-28 h-28 sm:w-32 sm:h-32 bg-zinc-900 rounded-[26px] p-2 overflow-hidden shadow-2xl border-2 border-white/20 flex items-center justify-center z-10"
            >
              {logoUrl ? (
                <LazyImage
                  src={logoUrl}
                  alt={restaurantName}
                  className="w-full h-full object-cover rounded-[20px]"
                  imgClassName="w-full h-full object-cover rounded-[20px]"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#D70F64] to-rose-700 rounded-[20px] flex items-center justify-center text-white font-black text-3xl shadow-inner">
                  {restaurantName ? restaurantName.substring(0, 2).toUpperCase() : "DF"}
                </div>
              )}

              {/* Verified Badge Icon */}
              <div className="absolute bottom-1 right-1 bg-[#D70F64] text-white p-1 rounded-full shadow-md border border-white/30">
                <ShieldCheck className="w-3.5 h-3.5 fill-white text-[#D70F64]" />
              </div>
            </motion.div>
          </div>

          {/* Restaurant Title & Description */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="space-y-2 w-full px-2"
          >
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight line-clamp-2 drop-shadow-md">
              {restaurantName}
            </h2>
            
            <div className="flex items-center justify-center gap-3 text-xs font-bold text-zinc-400 pt-0.5">
              <span className="flex items-center gap-1 text-amber-400">
                <Star className="w-3.5 h-3.5 fill-amber-400" /> 4.8 Rating
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-zinc-300">
                <Clock className="w-3.5 h-3.5 text-[#D70F64]" /> 20-30 min
              </span>
            </div>
          </motion.div>

          {/* Smooth Progress Bar & Status Text */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="w-full space-y-2 pt-2"
          >
            <div className="w-full h-2 bg-zinc-800/80 rounded-full overflow-hidden p-0.5 border border-zinc-700/50 shadow-inner">
              <motion.div
                className="h-full bg-gradient-to-r from-pink-500 via-[#D70F64] to-rose-400 rounded-full shadow-md"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-zinc-400 font-mono">
              <span className="text-[#D70F64] animate-pulse flex items-center gap-1">
                <Sparkles className="w-3 h-3 inline" /> Opening Menu...
              </span>
              <span className="text-zinc-200">{Math.round(progress)}%</span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
