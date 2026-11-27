// Shared motion system for Dadu Food — one place for every spring / easing /
// variant so the whole site moves with the same premium feel.
// Use these (not ad-hoc durations) whenever a new animation is added.

import { useReducedMotion } from "motion/react";
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

/** Hero spring — slower, heavier, more deliberate than springBouncy so the
 *  hero headline and rider image land with weight, not a flicker. */
export const springHero: Transition = {
  type: "spring",
  stiffness: 210,
  damping: 22,
};

/** Gentle spring — section reveals and large panels; soft landing, no overshoot. */
export const springGentle: Transition = {
  type: "spring",
  stiffness: 240,
  damping: 26,
};

/** Expo-out easing — matches the existing [0.22, 1, 0.36, 1] used in App.tsx. */
export const easeOutExpo = [0.22, 1, 0.36, 1] as const;

/** Softer expo-out for count-ups and long reveals. */
export const easeOutSoft = [0.16, 1, 0.3, 1] as const;

/** Instant transition — what every animation collapses to under
 *  prefers-reduced-motion. */
export const noMotion: Transition = { duration: 0 };

/**
 * prefers-reduced-motion hook. Returns true when the user asked the OS to
 * reduce motion; every entrance in HomeMotion / App checks this and collapses
 * to an instant state instead of animating.
 */
export function usePrefersReducedMotion(): boolean {
  return useReducedMotion() ?? false;
}

/**
 * Pick the animated transition, or an instant one when reduced motion is
 * preferred. Pass the result straight into a `transition` prop.
 */
export function motionTransition(
  reduced: boolean,
  transition: Transition,
): Transition {
  return reduced ? noMotion : transition;
}

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

/** Hero headline container — staggers its words (pair with `heroWord`). */
export const heroContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.12 } },
};

/** One hero headline word — rises, un-scales and fades in on a hero spring. */
export const heroWord: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.92 },
  show: { opacity: 1, y: 0, scale: 1, transition: springHero },
};

/** Hero tile (service card) — rises with a soft overshoot, staggered by its parent. */
export const heroTile: Variants = {
  hidden: { opacity: 0, y: 26, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: springHero },
};

/** Hero image (rider) — slides in from the right and settles on a hero spring. */
export const heroImage: Variants = {
  hidden: { opacity: 0, x: 64, scale: 0.96 },
  show: { opacity: 1, x: 0, scale: 1, transition: springHero },
};

/** Section container — staggers its children as the section scrolls in
 *  (pair with `staggerItem`). Wider stagger than the generic container so a
 *  whole section reads as one choreographed entrance. */
export const staggerSection: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};

/** View transition — switching modules/views (food <-> grocery, directory).
 *  Spring-based so the swap feels connected instead of a hard cut. */
export const viewTransition: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
};

/** Shimmer sweep for skeleton / image placeholders. Animate a motion overlay
 *  with this (opacity pulse) — no CSS keyframes needed, so it works without
 *  touching index.css. */
export const shimmerPulse: Transition = {
  duration: 1.4,
  repeat: Infinity,
  ease: "easeInOut",
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
