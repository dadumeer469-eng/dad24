import { motion, useScroll, useSpring } from "motion/react";
import { springSmooth } from "../utils/motion";

/**
 * ScrollProgress — a thin pink progress bar pinned to the very top of the
 * page. It fills from left to right as the user scrolls down, so customers
 * always know how far through the menu / page they are.
 *
 * Uses motion's useScroll (page scroll progress 0 -> 1) with a spring
 * (shared springSmooth preset) so the bar glides instead of jumping.
 *
 * Mount once, near the top of App.tsx, outside any modal:
 *   <ScrollProgress />
 */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, springSmooth);

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 right-0 z-[90] h-[3px] origin-left bg-[#E21B70]"
      style={{ scaleX }}
    />
  );
}
