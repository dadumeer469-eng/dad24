// Shared motion system for Dadu Food — one place for every spring / easing /
// variant so the whole site moves with the same premium feel.
// Use these (not ad-hoc durations) whenever a new animation is added.

import type { Transition, Variants } from "motion/react";

/** Snappy spring — buttons, pills, badges, small taps. */
export const springSnappy: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 32,
};

/** Smooth spring — modals, sheets, cards. The default for most entrances. */
export const springSmooth: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 28,
};

/** Bouncy spring — playful moments (hero, success, cart pop). */
export const springBouncy: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 16,
};

/** Expo-out easing — matches the existing [0.22, 1, 0.36, 1] used in App.tsx. */
export const easeOutExpo = [0.22, 1, 0.36, 1] as const;

/** Fade + rise. Use with `initial="hidden" animate="show"`. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: springSmooth },
};

/** Pop in. Use for modals, toasts, badges. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: springSnappy },
};

/** Container that staggers its children (pair with `staggerItem`). */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

/** One staggered child (cards, list rows, grid items). */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: springSmooth },
};

/** Bottom sheet / drawer slide-up. */
export const sheetUp: Variants = {
  hidden: { y: "100%", opacity: 0.9 },
  show: { y: 0, opacity: 1, transition: springSmooth },
};

/** Backdrop fade. */
export const backdropFade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
};
