import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp } from "lucide-react";
import { springSmooth } from "../utils/motion";

/**
 * BackToTop — a circular pink button that pops in (spring fade + scale)
 * once the user has scrolled more than 600px down, and smoothly scrolls
 * the page back to the top when tapped.
 *
 * Placed bottom-LEFT on purpose: the voice-call floating button lives at
 * the bottom-right, so the two never overlap. It floats above the bottom
 * nav (bottom-20) and hides again when the user is back at the top.
 *
 * Mount once, near the top of App.tsx, outside any modal:
 *   <BackToTop />
 */
export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.6, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 16 }}
          transition={springSmooth}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          title="Back to top"
          className="fixed left-4 bottom-20 z-[90] flex h-11 w-11 items-center justify-center rounded-full bg-[#E21B70] text-white shadow-lg shadow-[#E21B70]/30 cursor-pointer active:scale-90"
        >
          <ArrowUp className="h-5 w-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
