import React, { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Star, Store, ShieldCheck, Clock, Flame } from "lucide-react";
import { LazyImage } from "./LazyImage";

interface RestaurantTheme {
  primaryHex: string;
  glowColor1: string; // background blur flare 1
  glowColor2: string; // background blur flare 2
  ringGradient: string; // outer ring & aura gradient
  progressBarGradient: string;
  pillBg: string;
  pillBorder: string;
  pillTextColor: string;
  badgeTagline: string;
  emojis: string[];
  animationVibe: "bounce-glow" | "pulse-scale" | "rotate-shine" | "float-flip";
}

// Helper to determine brand color palette & animation style per restaurant logo & name
function getRestaurantTheme(name: string, logoUrl?: string): RestaurantTheme {
  const lower = (name || "").toLowerCase();

  // 1. KFC / Fried Chicken / Crispy
  if (
    lower.includes("kfc") ||
    lower.includes("chicken") ||
    lower.includes("crispy") ||
    lower.includes("broast") ||
    lower.includes("fried")
  ) {
    return {
      primaryHex: "#DC2626",
      glowColor1: "rgba(220, 38, 38, 0.4)",
      glowColor2: "rgba(245, 158, 11, 0.25)",
      ringGradient: "from-red-600 via-rose-500 to-amber-400",
      progressBarGradient: "from-red-600 via-rose-500 to-amber-400",
      pillBg: "from-red-950/90 via-red-900/50 to-red-950/90",
      pillBorder: "border-red-500/50",
      pillTextColor: "text-red-300",
      badgeTagline: "CRISPY & FINGER LICKIN' GOOD",
      emojis: ["🍗", "🍟", "🥤", "⚡"],
      animationVibe: "pulse-scale",
    };
  }

  // 2. Pizza / Italian
  if (
    lower.includes("pizza") ||
    lower.includes("slice") ||
    lower.includes("crust") ||
    lower.includes("domino") ||
    lower.includes("pisa")
  ) {
    return {
      primaryHex: "#EA580C",
      glowColor1: "rgba(234, 88, 12, 0.4)",
      glowColor2: "rgba(234, 179, 8, 0.25)",
      ringGradient: "from-orange-500 via-amber-400 to-red-600",
      progressBarGradient: "from-orange-500 via-amber-500 to-rose-500",
      pillBg: "from-orange-950/90 via-amber-900/50 to-orange-950/90",
      pillBorder: "border-orange-500/50",
      pillTextColor: "text-orange-300",
      badgeTagline: "HOT & FRESH OVEN BAKED PIZZA",
      emojis: ["🍕", "🧀", "🔥", "🧄"],
      animationVibe: "rotate-shine",
    };
  }

  // 3. Biryani / Karahi / Desi / Kitchen / Bbq / Tikka / Grill
  if (
    lower.includes("biryani") ||
    lower.includes("karahi") ||
    lower.includes("tikka") ||
    lower.includes("bbq") ||
    lower.includes("desi") ||
    lower.includes("handi") ||
    lower.includes("dadu fast food") ||
    lower.includes("kitchen")
  ) {
    return {
      primaryHex: "#D97706",
      glowColor1: "rgba(217, 119, 6, 0.4)",
      glowColor2: "rgba(220, 38, 38, 0.3)",
      ringGradient: "from-amber-500 via-yellow-400 to-red-600",
      progressBarGradient: "from-amber-500 via-orange-500 to-red-600",
      pillBg: "from-amber-950/90 via-yellow-900/50 to-amber-950/90",
      pillBorder: "border-amber-500/50",
      pillTextColor: "text-amber-300",
      badgeTagline: "AUTHENTIC ROYAL DESI FLAVORS",
      emojis: ["🍲", "🍚", "🍢", "🫓"],
      animationVibe: "bounce-glow",
    };
  }

  // 4. Burgers / Sandwiches
  if (
    lower.includes("burger") ||
    lower.includes("smash") ||
    lower.includes("patty") ||
    lower.includes("grill") ||
    lower.includes("bun")
  ) {
    return {
      primaryHex: "#F59E0B",
      glowColor1: "rgba(245, 158, 11, 0.4)",
      glowColor2: "rgba(217, 119, 6, 0.3)",
      ringGradient: "from-yellow-400 via-orange-500 to-red-500",
      progressBarGradient: "from-yellow-400 via-amber-500 to-orange-600",
      pillBg: "from-amber-950/90 via-orange-950/50 to-amber-950/90",
      pillBorder: "border-amber-400/50",
      pillTextColor: "text-yellow-300",
      badgeTagline: "JUICY SMASHED BURGERS & SIDES",
      emojis: ["🍔", "🍟", "🧅", "🥤"],
      animationVibe: "float-flip",
    };
  }

  // 5. Cakes / Bakery / Sweets / Ice Cream / Desserts
  if (
    lower.includes("cake") ||
    lower.includes("bakery") ||
    lower.includes("sweet") ||
    lower.includes("ice cream") ||
    lower.includes("dessert") ||
    lower.includes("donut") ||
    lower.includes("cream")
  ) {
    return {
      primaryHex: "#EC4899",
      glowColor1: "rgba(236, 72, 153, 0.4)",
      glowColor2: "rgba(168, 85, 247, 0.3)",
      ringGradient: "from-pink-500 via-fuchsia-400 to-purple-500",
      progressBarGradient: "from-pink-500 via-purple-500 to-rose-400",
      pillBg: "from-pink-950/90 via-fuchsia-950/50 to-pink-950/90",
      pillBorder: "border-pink-500/50",
      pillTextColor: "text-pink-300",
      badgeTagline: "FRESHLY BAKED DELIGHTS & DESSERTS",
      emojis: ["🎂", "🧁", "🍩", "🍨"],
      animationVibe: "bounce-glow",
    };
  }

  // 6. Chai / Cafe / Coffee / Tea
  if (
    lower.includes("chai") ||
    lower.includes("cafe") ||
    lower.includes("coffee") ||
    lower.includes("tea") ||
    lower.includes("booth")
  ) {
    return {
      primaryHex: "#B45309",
      glowColor1: "rgba(180, 83, 9, 0.4)",
      glowColor2: "rgba(245, 158, 11, 0.25)",
      ringGradient: "from-amber-600 via-yellow-500 to-amber-700",
      progressBarGradient: "from-amber-600 via-amber-500 to-yellow-500",
      pillBg: "from-amber-950/90 via-amber-900/50 to-amber-950/90",
      pillBorder: "border-amber-600/50",
      pillTextColor: "text-amber-200",
      badgeTagline: "KARAK CHAI & CAFE SNACKS",
      emojis: ["☕", "🫖", "🥐", "🍰"],
      animationVibe: "rotate-shine",
    };
  }

  // 7. Juice / Shakes / Beverages
  if (
    lower.includes("juice") ||
    lower.includes("shake") ||
    lower.includes("drink") ||
    lower.includes("corner") ||
    lower.includes("bar")
  ) {
    return {
      primaryHex: "#06B6D4",
      glowColor1: "rgba(6, 182, 212, 0.4)",
      glowColor2: "rgba(236, 72, 153, 0.25)",
      ringGradient: "from-cyan-400 via-teal-400 to-pink-500",
      progressBarGradient: "from-cyan-400 via-sky-500 to-pink-500",
      pillBg: "from-cyan-950/90 via-teal-950/50 to-cyan-950/90",
      pillBorder: "border-cyan-400/50",
      pillTextColor: "text-cyan-300",
      badgeTagline: "CHILLED FRESH JUICES & SHAKES",
      emojis: ["🧃", "🥤", "🍓", "🥭"],
      animationVibe: "pulse-scale",
    };
  }

  // 8. Chinese / Asian / Noodles
  if (
    lower.includes("chinese") ||
    lower.includes("noodle") ||
    lower.includes("asian") ||
    lower.includes("soup") ||
    lower.includes("chow")
  ) {
    return {
      primaryHex: "#EF4444",
      glowColor1: "rgba(239, 68, 68, 0.4)",
      glowColor2: "rgba(245, 158, 11, 0.3)",
      ringGradient: "from-red-600 via-amber-400 to-yellow-500",
      progressBarGradient: "from-red-600 via-amber-500 to-orange-500",
      pillBg: "from-red-950/90 via-rose-950/50 to-red-950/90",
      pillBorder: "border-red-500/50",
      pillTextColor: "text-red-300",
      badgeTagline: "AUTHENTIC ASIAN & CHINESE WOK",
      emojis: ["🥢", "🍜", "🥟", "🥠"],
      animationVibe: "float-flip",
    };
  }

  // 9. Dynamic Hash Fallback for any other custom restaurant
  let hash = 0;
  for (let i = 0; i < lower.length; i++) {
    hash = lower.charCodeAt(i) + ((hash << 5) - hash);
  }

  const palettes = [
    {
      primaryHex: "#D70F64",
      glow1: "rgba(215, 15, 100, 0.4)",
      glow2: "rgba(244, 114, 182, 0.3)",
      ring: "from-[#D70F64] via-rose-500 to-pink-400",
      bar: "from-[#D70F64] via-pink-500 to-rose-400",
      pillBg: "from-pink-950/90 via-rose-950/50 to-pink-950/90",
      pillBorder: "border-pink-500/50",
      pillText: "text-pink-300",
      emojis: ["🍱", "⚡", "🍕", "🍗"],
      vibe: "bounce-glow" as const,
    },
    {
      primaryHex: "#8B5CF6",
      glow1: "rgba(139, 92, 246, 0.4)",
      glow2: "rgba(236, 72, 153, 0.3)",
      ring: "from-purple-500 via-fuchsia-500 to-indigo-500",
      bar: "from-purple-500 via-fuchsia-400 to-pink-500",
      pillBg: "from-purple-950/90 via-indigo-950/50 to-purple-950/90",
      pillBorder: "border-purple-500/50",
      pillText: "text-purple-300",
      emojis: ["✨", "🍔", "🍟", "🧃"],
      vibe: "rotate-shine" as const,
    },
    {
      primaryHex: "#10B981",
      glow1: "rgba(16, 185, 129, 0.4)",
      glow2: "rgba(52, 211, 153, 0.3)",
      ring: "from-emerald-500 via-teal-400 to-green-500",
      bar: "from-emerald-500 via-teal-400 to-cyan-500",
      pillBg: "from-emerald-950/90 via-teal-950/50 to-emerald-950/90",
      pillBorder: "border-emerald-500/50",
      pillText: "text-emerald-300",
      emojis: ["🥗", "🍲", "🧃", "🥑"],
      vibe: "pulse-scale" as const,
    },
    {
      primaryHex: "#F43F5E",
      glow1: "rgba(244, 63, 94, 0.4)",
      glow2: "rgba(251, 146, 60, 0.3)",
      ring: "from-rose-500 via-orange-400 to-amber-500",
      bar: "from-rose-500 via-pink-500 to-amber-400",
      pillBg: "from-rose-950/90 via-orange-950/50 to-rose-950/90",
      pillBorder: "border-rose-500/50",
      pillText: "text-rose-300",
      emojis: ["🔥", "🍗", "🍟", "🥤"],
      vibe: "float-flip" as const,
    },
  ];

  const selectedIndex = Math.abs(hash) % palettes.length;
  const p = palettes[selectedIndex];

  return {
    primaryHex: p.primaryHex,
    glowColor1: p.glow1,
    glowColor2: p.glow2,
    ringGradient: p.ring,
    progressBarGradient: p.bar,
    pillBg: p.pillBg,
    pillBorder: p.pillBorder,
    pillTextColor: p.pillText,
    badgeTagline: `${(name || "DADU").toUpperCase()} SPECIALTY`,
    emojis: p.emojis,
    animationVibe: p.vibe,
  };
}

interface RestaurantLogoLoaderProps {
  restaurantName: string;
  logoUrl?: string;
  isOpen: boolean;
  onFinish?: () => void;
  durationMs?: number; // default 1200ms (1.2 seconds)
}

export default function RestaurantLogoLoader({
  restaurantName,
  logoUrl,
  isOpen,
  onFinish,
  durationMs = 1200,
}: RestaurantLogoLoaderProps) {
  const [progress, setProgress] = useState(0);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  // Compute theme dynamically based on restaurant name & logo
  const theme = useMemo(() => {
    return getRestaurantTheme(restaurantName, logoUrl);
  }, [restaurantName, logoUrl]);

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

  // Animation variants according to restaurant theme vibe
  const logoVariants = {
    "bounce-glow": {
      scale: [0.6, 1.12, 1],
      rotate: [-6, 6, 0],
      y: [15, -5, 0],
    },
    "pulse-scale": {
      scale: [0.5, 1.15, 0.98, 1],
      rotate: [0, 0, 0],
      y: [20, 0],
    },
    "rotate-shine": {
      scale: [0.6, 1.05, 1],
      rotate: [-180, 10, 0],
      y: [0, 0],
    },
    "float-flip": {
      scale: [0.6, 1.08, 1],
      rotateX: [90, 0],
      y: [30, -8, 0],
    },
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.06 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-zinc-950/95 text-white select-none overflow-hidden backdrop-blur-2xl px-4"
      >
        {/* Dynamic Background Radial Glow Flares tailored to Logo colors */}
        <div
          className="absolute w-[520px] h-[520px] rounded-full blur-[140px] animate-pulse pointer-events-none transition-colors duration-500"
          style={{ backgroundColor: theme.glowColor1 }}
        />
        <div
          className="absolute w-[320px] h-[320px] rounded-full blur-[110px] pointer-events-none transition-colors duration-500"
          style={{ backgroundColor: theme.glowColor2 }}
        />

        {/* Floating Particles Customized with Restaurant Food Emojis */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={{ y: [-12, 12, -12], rotate: [-10, 15, -10] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 left-8 sm:left-14 text-3xl opacity-40 drop-shadow-lg"
          >
            {theme.emojis[0]}
          </motion.div>
          <motion.div
            animate={{ y: [12, -12, 12], rotate: [10, -15, 10] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/3 right-8 sm:right-16 text-3xl opacity-40 drop-shadow-lg"
          >
            {theme.emojis[1]}
          </motion.div>
          <motion.div
            animate={{ y: [-10, 10, -10] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-1/3 left-12 text-3xl opacity-30 drop-shadow-lg"
          >
            {theme.emojis[2]}
          </motion.div>
          <motion.div
            animate={{ y: [10, -10, 10] }}
            transition={{ duration: 3.0, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-1/4 right-14 text-3xl opacity-30 drop-shadow-lg"
          >
            {theme.emojis[3]}
          </motion.div>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full space-y-6">
          {/* Top Pill Header customized with restaurant brand */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className={`inline-flex items-center gap-2 bg-gradient-to-r ${theme.pillBg} border ${theme.pillBorder} px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest ${theme.pillTextColor} shadow-xl backdrop-blur-md`}
          >
            <Store className="w-3.5 h-3.5 animate-pulse" style={{ color: theme.primaryHex }} />
            <span>{theme.badgeTagline}</span>
          </motion.div>

          {/* Animated Restaurant Logo Badge Frame with Brand Colors */}
          <div className="relative flex items-center justify-center">
            {/* Glowing Pulsing Aura Rings matching Logo palette */}
            <motion.div
              animate={{ scale: [1, 1.22, 1], opacity: [0.35, 0.75, 0.35] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className={`absolute -inset-4 rounded-3xl bg-gradient-to-r ${theme.ringGradient} blur-xl opacity-60`}
            />

            {/* Rotating Outer Gradient Ring matching Logo brand */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              className={`absolute -inset-1.5 rounded-[28px] bg-gradient-to-tr ${theme.ringGradient} opacity-95 p-0.5`}
            />

            {/* Main Logo Container with Vibe-based Entrance Animation */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={logoVariants[theme.animationVibe]}
              transition={{ duration: 0.55, ease: "easeOut" }}
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
                <div
                  className={`w-full h-full bg-gradient-to-br ${theme.ringGradient} rounded-[20px] flex items-center justify-center text-white font-black text-3xl shadow-inner`}
                >
                  {restaurantName ? restaurantName.substring(0, 2).toUpperCase() : "DF"}
                </div>
              )}

              {/* Verified Badge Icon with Logo accent color */}
              <div
                className="absolute bottom-1 right-1 text-white p-1 rounded-full shadow-md border border-white/30"
                style={{ backgroundColor: theme.primaryHex }}
              >
                <ShieldCheck className="w-3.5 h-3.5 fill-white" />
              </div>
            </motion.div>
          </div>

          {/* Restaurant Title & Rating / Time */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="space-y-2 w-full px-2"
          >
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight line-clamp-2 drop-shadow-md">
              {restaurantName}
            </h2>

            <div className="flex items-center justify-center gap-3 text-xs font-bold text-zinc-300 pt-0.5">
              <span className="flex items-center gap-1 text-amber-400">
                <Star className="w-3.5 h-3.5 fill-amber-400" /> 4.8 Rating
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" style={{ color: theme.primaryHex }} /> 20-30 min
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <Flame className="w-3.5 h-3.5 fill-emerald-400" /> Express Delivery
              </span>
            </div>
          </motion.div>

          {/* Smooth Progress Bar with Brand Colors */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, delay: 0.18 }}
            className="w-full space-y-2 pt-1"
          >
            <div className="w-full h-2.5 bg-zinc-800/90 rounded-full overflow-hidden p-0.5 border border-zinc-700/60 shadow-inner">
              <motion.div
                className={`h-full bg-gradient-to-r ${theme.progressBarGradient} rounded-full shadow-md`}
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-zinc-400 font-mono">
              <span className="animate-pulse flex items-center gap-1" style={{ color: theme.primaryHex }}>
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
