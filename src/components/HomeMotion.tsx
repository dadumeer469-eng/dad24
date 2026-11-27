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
import { springSmooth } from "../utils/motion";

/* ------------------------------------------------------------------ */
/* OffersMarquee — infinite scrolling ticker (offers + areas).         */
/* ------------------------------------------------------------------ */
export function OffersMarquee({ items }: { items: string[] }) {
  const row = [...items, ...items];
  return (
    <div
      aria-hidden="true"
      className="relative overflow-hidden bg-[#14141A] py-2.5 select-none"
    >
      <motion.div
        className="flex w-max items-center gap-0"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
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
/* AnimatedCounter — counts 0 -> `to` when scrolled into view.         */
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
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration: 1.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, to]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-2xl sm:text-3xl font-black tracking-tight text-[#14141A] dark:text-white tabular-nums whitespace-nowrap">
        {value}
        <span className="text-[#E21B70]">{suffix}</span>
      </div>
      <div className="mt-0.5 text-[11px] sm:text-xs font-semibold text-[#6E6E80] dark:text-[#A1A1B2]">
        {label}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* OffersCarousel — auto-playing deals carousel (shadcn + embla).      */
/* Loops forever, advances every 3.5s, pauses while hovered/touched.   */
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

  useEffect(() => {
    if (!api || paused) return;
    const id = setInterval(() => api.scrollNext(), 3500);
    return () => clearInterval(id);
  }, [api, paused]);

  if (dishes.length === 0) return null;

  return (
    <div
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
                  whileHover={{ y: -4 }}
                  transition={springSmooth}
                  className="overflow-hidden rounded-2xl bg-white dark:bg-[#14141A] border border-[#e8e2d6] dark:border-[#272733] shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                >
                  <div className="relative h-36 sm:h-40 overflow-hidden">
                    <img
                      src={dish.imageUrl}
                      alt={dish.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    {dish.isBestseller && (
                      <span className="absolute left-2 top-2 rounded-full bg-[#E21B70] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white shadow">
                        Bestseller
                      </span>
                    )}
                  </div>
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
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ScrollReveal — spring entrance when a section scrolls into view.    */
/* ------------------------------------------------------------------ */
export function ScrollReveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ ...springSmooth, delay }}
    >
      {children}
    </motion.div>
  );
}
