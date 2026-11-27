import { useEffect, useRef, useState, type ReactNode } from "react";
import { animate, motion, useInView } from "motion/react";
import { Plus, Sparkles } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import type { Dish } from "../types";
import {
  shimmerPulse,
  springGentle,
  springSmooth,
  staggerItem,
  staggerSection,
  usePrefersReducedMotion,
} from "../utils/motion";

/* ------------------------------------------------------------------ */
/* OffersMarquee — infinite scrolling ticker (offers + areas).         */
/* Reduced motion: renders the row statically, no scrolling.           */
/* ------------------------------------------------------------------ */
export function OffersMarquee({ items }: { items: string[] }) {
  const reduced = usePrefersReducedMotion();
  const row = [...items, ...items];
  return (
    <div
      aria-hidden="true"
      className="relative overflow-hidden bg-[#14141A] py-2.5 select-none"
    >
      <motion.div
        className="flex w-max items-center gap-0"
        animate={reduced ? { x: "0%" } : { x: ["0%", "-50%"] }}
        transition={
          reduced
            ? { duration: 0 }
            : { duration: 28, repeat: Infinity, ease: "linear" }
        }
      >
        {row.map((item, i) => (
          <span
            key={i}
            className="flex items-center gap-2 whitespace-nowrap text-[12px] sm:text-[13px] font-bold text-white/90"
          >
            <span className="px-3">{item}</span>
            <Sparkles className="w-3.5 h-3.5 shrink-0 text-[#E21B70]" />
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AnimatedCounter — spring count-up 0 -> `to` when scrolled into view. */
/* Spring-based (stiffness/damping) so the number eases in and settles   */
/* instead of ticking linearly; pops in gently with the label.          */
/* Reduced motion: jumps straight to the final value.                  */
/* ------------------------------------------------------------------ */
export function AnimatedCounter({
  to,
  suffix = "",
  label,
}: {
  to: number;
  suffix?: string;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setValue(to);
      return;
    }
    const controls = animate(0, to, {
      type: "spring",
      stiffness: 55,
      damping: 20,
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, to, reduced]);

  return (
    <div ref={ref} className="text-center">
      <motion.div
        initial={reduced ? false : { opacity: 0, scale: 0.92, y: 6 }}
        whileInView={reduced ? undefined : { opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ ...springGentle, delay: 0.05 }}
        className="text-2xl sm:text-3xl font-black tracking-tight text-[#14141A] dark:text-white tabular-nums whitespace-nowrap"
      >
        {value}
        <span className="text-[#E21B70]">{suffix}</span>
      </motion.div>
      <div className="mt-0.5 text-[11px] sm:text-xs font-semibold text-[#6E6E80] dark:text-[#A1A1B2]">
        {label}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ShimmerImage — image with a warm-paper shimmer placeholder while it   */
/* loads, then a soft opacity fade-in. Opacity-only animation (60fps,   */
/* composited) and inline styles only — no index.css involved.          */
/* ------------------------------------------------------------------ */
export function ShimmerImage({
  src,
  alt,
  className = "",
  imgClassName = "",
  loading = "lazy",
  children,
}: {
  src?: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  loading?: "lazy" | "eager";
  children?: ReactNode;
}) {
  const reduced = usePrefersReducedMotion();
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      className={`relative overflow-hidden bg-[#efe9df] dark:bg-[#1D1D26] ${className}`}
    >
      {!loaded && (
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 bg-white/45 dark:bg-white/10"
          animate={reduced ? { opacity: 0.3 } : { opacity: [0.25, 0.65, 0.25] }}
          transition={reduced ? { duration: 0 } : shimmerPulse}
        />
      )}
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`h-full w-full transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"} ${imgClassName}`}
      />
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* OffersCarousel — auto-playing deals carousel (shadcn + embla).      */
/* Loops forever, advances every 3.5s, pauses while hovered/touched.   */
/* Images now load behind a ShimmerImage; cards lift on hover and the   */
/* whole row staggers in on scroll. Reduced motion: no autoplay, no    */
/* hover lift, no entrance slide.                                      */
/* ------------------------------------------------------------------ */
export function OffersCarousel({
  dishes,
  onAdd,
}: {
  dishes: Dish[];
  onAdd: (dish: Dish) => void;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [paused, setPaused] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (!api || paused || reduced) return;
    const id = setInterval(() => api.scrollNext(), 3500);
    return () => clearInterval(id);
  }, [api, paused, reduced]);

  if (dishes.length === 0) return null;

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 18 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={springSmooth}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <Carousel
        setApi={setApi}
        opts={{ loop: true, align: "start" }}
        className="w-full"
      >
        <CarouselContent className="-ml-2.5">
          {dishes.map((dish) => {
            const price = dish.discountPrice && dish.discountPrice > 0
              ? dish.discountPrice
              : dish.price;
            return (
              <CarouselItem
                key={dish.id}
                className="pl-2.5 basis-[78%] sm:basis-1/2 lg:basis-1/3"
              >
                <motion.div
                  whileHover={reduced ? undefined : { y: -4 }}
                  whileTap={reduced ? undefined : { scale: 0.98 }}
                  transition={springSmooth}
                  className="overflow-hidden rounded-2xl bg-white dark:bg-[#14141A] border border-[#e8e2d6] dark:border-[#272733] shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                >
                  <ShimmerImage
                    src={dish.imageUrl}
                    alt={dish.name}
                    loading="lazy"
                    className="relative h-36 sm:h-40"
                    imgClassName="object-cover"
                  >
                    {dish.isBestseller && (
                      <span className="absolute left-2 top-2 z-10 rounded-full bg-[#E21B70] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white shadow">
                        Bestseller
                      </span>
                    )}
                  </ShimmerImage>
                  <div className="p-3">
                    <div className="truncate text-sm font-bold text-[#14141A] dark:text-white">
                      {dish.name}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] font-medium text-[#6E6E80] dark:text-[#A1A1B2]">
                      {dish.restaurantName || "Dadu Food"}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-black text-[#E21B70]">
                        Rs. {price}
                        {dish.discountPrice && dish.discountPrice > 0 && dish.discountPrice < dish.price && (
                          <span className="ml-1.5 text-[11px] font-semibold text-zinc-400 line-through">
                            Rs. {dish.price}
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => onAdd(dish)}
                        aria-label={`Add ${dish.name} to cart`}
                        className="inline-flex items-center gap-1 rounded-full bg-[#E21B70] px-3 py-1.5 min-h-[44px] min-w-[44px] text-xs font-black text-white shadow-sm cursor-pointer active:scale-95 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    </div>
                  </div>
                </motion.div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex -left-3 bg-white dark:bg-[#14141A] border-[#e8e2d6] dark:border-[#272733]" />
        <CarouselNext className="hidden sm:flex -right-3 bg-white dark:bg-[#14141A] border-[#e8e2d6] dark:border-[#272733]" />
      </Carousel>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* ScrollReveal — spring entrance when a section scrolls into view.    */
/* Stronger than before: rises further, settles from a slight scale,   */
/* on a gentle spring. Reduced motion: renders statically.             */
/* ------------------------------------------------------------------ */
export function ScrollReveal({
  children,
  delay = 0,
  className,
  y = 32,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  const reduced = usePrefersReducedMotion();
  if (reduced) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ ...springGentle, delay }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* StaggerGroup / StaggerItem — a section whose children cascade in     */
/* one after another as it scrolls into view. Wrap a grid/row in       */
/* StaggerGroup and each card in StaggerItem. Reduced motion: static.   */
/* ------------------------------------------------------------------ */
export function StaggerGroup({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = usePrefersReducedMotion();
  if (reduced) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      variants={staggerSection}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  if (reduced) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* MenuSkeleton — shimmer dish cards shown while the menu loads.        */
/* Opacity-pulse only (composited, 60fps); matches the dish-card       */
/* shape so content doesn't jump when real cards arrive.               */
/* ------------------------------------------------------------------ */
export function MenuSkeleton({ count = 8 }: { count?: number }) {
  const reduced = usePrefersReducedMotion();
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white dark:bg-[#14141A] border border-[#E6E6EE] dark:border-[#272733] rounded-2xl overflow-hidden flex flex-col h-full"
        >
          <motion.div
            aria-hidden="true"
            className="h-28 sm:h-44 shrink-0 bg-[#efe9df] dark:bg-[#1D1D26]"
            animate={reduced ? { opacity: 1 } : { opacity: [0.6, 1, 0.6] }}
            transition={reduced ? { duration: 0 } : { ...shimmerPulse, delay: idx * 0.08 }}
          />
          <div className="p-3 sm:p-4 flex-1 flex flex-col gap-3">
            <motion.div
              aria-hidden="true"
              className="h-3 w-1/3 rounded-full bg-[#efe9df] dark:bg-[#1D1D26]"
              animate={reduced ? { opacity: 1 } : { opacity: [0.6, 1, 0.6] }}
              transition={reduced ? { duration: 0 } : { ...shimmerPulse, delay: 0.1 + idx * 0.08 }}
            />
            <motion.div
              aria-hidden="true"
              className="h-4 w-3/4 rounded-full bg-[#efe9df] dark:bg-[#1D1D26]"
              animate={reduced ? { opacity: 1 } : { opacity: [0.6, 1, 0.6] }}
              transition={reduced ? { duration: 0 } : { ...shimmerPulse, delay: 0.2 + idx * 0.08 }}
            />
            <div className="mt-auto flex justify-between items-center pt-2">
              <motion.div
                aria-hidden="true"
                className="h-4 w-1/4 rounded-full bg-[#efe9df] dark:bg-[#1D1D26]"
                animate={reduced ? { opacity: 1 } : { opacity: [0.6, 1, 0.6] }}
                transition={reduced ? { duration: 0 } : { ...shimmerPulse, delay: 0.3 + idx * 0.08 }}
              />
              <motion.div
                aria-hidden="true"
                className="h-10 w-10 rounded-xl bg-[#efe9df] dark:bg-[#1D1D26]"
                animate={reduced ? { opacity: 1 } : { opacity: [0.6, 1, 0.6] }}
                transition={reduced ? { duration: 0 } : { ...shimmerPulse, delay: 0.35 + idx * 0.08 }}
              />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* AppLoadingState — polished loading state for the app / menu / lazy   */
/* panels: pulsing pink D mark, shimmer bars, label. The caller wraps  */
/* it in whatever full-screen / padded container fits the spot.        */
/* Reduced motion: static mark and bars.                               */
/* ------------------------------------------------------------------ */
export function AppLoadingState({ label = "Loading…" }: { label?: string }) {
  const reduced = usePrefersReducedMotion();
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <motion.div
        aria-hidden="true"
        className="w-12 h-12 rounded-2xl bg-[#E21B70] text-white flex items-center justify-center text-xl font-black shadow-[0_8px_24px_rgba(226,27,112,0.35)]"
        animate={reduced ? undefined : { scale: [1, 1.08, 1] }}
        transition={reduced ? undefined : { duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      >
        D
      </motion.div>
      <div className="w-44 max-w-full space-y-2" aria-hidden="true">
        {[0.7, 0.45, 0.55].map((w, i) => (
          <motion.div
            key={i}
            className="h-2.5 rounded-full bg-[#efe9df] dark:bg-[#1D1D26]"
            style={{ width: `${w * 100}%`, marginInline: "auto" }}
            animate={reduced ? { opacity: 1 } : { opacity: [0.55, 1, 0.55] }}
            transition={reduced ? { duration: 0 } : { ...shimmerPulse, delay: i * 0.15 }}
          />
        ))}
      </div>
      <p className="text-sm font-bold text-[#5A5A6B] dark:text-[#A3A3B5]">{label}</p>
    </div>
  );
}
