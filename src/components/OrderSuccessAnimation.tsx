import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, ShoppingBag, MapPin, Sparkles, Navigation, X, Receipt, Clock, ArrowRight } from "lucide-react";
import { Order } from "../types";

interface OrderSuccessAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  onTrackOrder?: () => void;
}

export default function OrderSuccessAnimation({
  isOpen,
  onClose,
  order,
  onTrackOrder,
}: OrderSuccessAnimationProps) {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string; size: number; delay: number; duration: number }[]>([]);
  const [progressCount, setProgressCount] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      // Smooth 0 to 100 progress counter
      setProgressCount(0);
      const startTime = performance.now();
      const duration = 2500; // 2.5s smooth count to 100%

      const animateProgress = (now: number) => {
        const elapsed = now - startTime;
        const rawProgress = Math.min(1, elapsed / duration);
        // Smooth easeOutQuad
        const eased = 1 - (1 - rawProgress) * (1 - rawProgress);
        const currentVal = Math.round(eased * 100);
        setProgressCount(currentVal);

        if (rawProgress < 1) {
          requestAnimationFrame(animateProgress);
        }
      };

      requestAnimationFrame(animateProgress);

      // Generate confetti particles on load
      const colors = ["#D70F64", "#EA580C", "#10B981", "#3B82F6", "#F59E0B", "#EC4899", "#8B5CF6", "#f43f5e", "#84cc16"];
      const generated = Array.from({ length: 60 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100, // percentage of screen width
        y: -10, // start above screen
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 6,
        delay: Math.random() * 1.5,
        duration: Math.random() * 2 + 2,
      }));
      setParticles(generated);

      // Play bubble pop sounds if possible (non-blocking)
      try {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        const playTone = (freq: number, type: OscillatorType, delay: number, duration: number) => {
          setTimeout(() => {
            const osc = context.createOscillator();
            const gain = context.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, context.currentTime);
            gain.gain.setValueAtTime(0.15, context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
            osc.connect(gain);
            gain.connect(context.destination);
            osc.start();
            osc.stop(context.currentTime + duration);
          }, delay * 1000);
        };
        playTone(523.25, "sine", 0.1, 0.4); // C5
        playTone(659.25, "sine", 0.25, 0.5); // E5
        playTone(783.99, "sine", 0.4, 0.6); // G5
        playTone(1046.50, "sine", 0.55, 0.8); // C6
      } catch (e) {
        console.log("Audio feedback omitted or context blocked by user browser permissions.");
      }
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
        />

        {/* Confetti Canvas */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ y: `${p.y}vh`, x: `${p.x}vw`, rotate: 0, opacity: 1 }}
              animate={{
                y: "110vh",
                x: `${p.x + (Math.sin(p.id) * 15)}vw`,
                rotate: 360 * (p.id % 2 === 0 ? 1 : -1),
                opacity: [1, 1, 0.7, 0],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: "easeOut",
              }}
              style={{
                position: "absolute",
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                borderRadius: p.id % 3 === 0 ? "50%" : p.id % 3 === 1 ? "4px" : "0px",
                transform: "translate(-50%, -50%)",
                boxShadow: `0 0 ${p.size / 2}px ${p.color}80`
              }}
            />
          ))}
        </div>

        {/* Success Modal Container */}
        <motion.div
          initial={{ scale: 0.85, y: 30, opacity: 0, rotateX: 20 }}
          animate={{ scale: 1, y: 0, opacity: 1, rotateX: 0 }}
          exit={{ scale: 0.95, y: -20, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-[360px] bg-white dark:bg-zinc-900 rounded-[28px] shadow-[0_20px_60px_-15px_rgba(215,15,100,0.3)] border border-pink-100 dark:border-zinc-800 overflow-hidden z-10"
          style={{ transformPerspective: 1000 }}
        >
          {/* Top colored accent line with gradient */}
          <div className="h-2.5 w-full bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-500" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer z-30"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="px-5 pt-8 pb-6 flex flex-col items-center text-center">
            {/* Animating Sparkles & Circular Badge */}
            <div className="relative mb-2">
              {/* Outer Ripple 1 */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                className="absolute inset-0 bg-emerald-400 rounded-full"
              />
              {/* Outer Ripple 2 */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                className="absolute inset-0 bg-emerald-300 rounded-full"
              />

              {/* Bouncing Circle success badge */}
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-emerald-500/30 z-10 relative"
              >
                <motion.div
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Check className="w-10 h-10 stroke-[3.5]" />
                </motion.div>
              </motion.div>

              {/* Float sparkles decorations around success badge */}
              <motion.span
                animate={{ y: [0, -8, 0], scale: [1, 1.3, 1], rotate: [0, 20, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-5 -right-5 text-amber-400"
              >
                <Sparkles className="w-7 h-7 fill-amber-400/20 drop-shadow-md" />
              </motion.span>
              <motion.span
                animate={{ y: [0, 8, 0], scale: [0.8, 1.2, 0.8], rotate: [0, -20, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                className="absolute -bottom-3 -left-5 text-[#D70F64]"
              >
                <Sparkles className="w-5 h-5 fill-pink-500/20 drop-shadow-md" />
              </motion.span>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-5 space-y-1.5"
            >
              <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight">
                Order Confirmed!
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-[280px] mx-auto font-medium">
                Your order has been sent to the kitchen. We're getting everything ready for you!
              </p>
            </motion.div>

            {/* Live Scooter / Rider Riding Animation - Smooth & Direction Correct */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="w-full bg-zinc-950 dark:bg-black rounded-2xl p-4 mt-5 overflow-hidden relative shadow-inner border border-zinc-800"
            >
              <div className="flex justify-between items-center mb-3 relative z-10">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  Express Dispatch ({progressCount}%)
                </span>
                <span className="flex items-center gap-1.5 text-zinc-400 text-xs font-bold">
                  <Clock className="w-3.5 h-3.5 text-pink-500 animate-pulse" /> ~25 min
                </span>
              </div>

              {/* Progress Bar Track */}
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mb-3">
                <div 
                  className="bg-gradient-to-r from-emerald-500 via-[#D70F64] to-pink-500 h-full transition-all duration-300 ease-out rounded-full shadow-[0_0_8px_rgba(215,15,100,0.8)]"
                  style={{ width: `${progressCount}%` }}
                />
              </div>

              {/* Road Map Visual */}
              <div className="relative h-12 flex items-center w-full px-2">
                {/* Dashed Route Line */}
                <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-zinc-800 border-t-2 border-dashed border-zinc-600 w-[calc(100%-3rem)]" />
                
                {/* Store Point */}
                <div className="absolute left-1 z-10 w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center border-2 border-zinc-700 shadow-md">
                  <span className="text-sm">🏬</span>
                </div>

                {/* Home Destination Point */}
                <div className="absolute right-1 z-10 w-8 h-8 bg-pink-500/20 rounded-full flex items-center justify-center border-2 border-pink-500 shadow-[0_0_15px_rgba(215,15,100,0.5)]">
                  <MapPin className="w-4 h-4 text-pink-400" />
                </div>

                {/* Moving Scooter - Facing Right towards destination */}
                <motion.div
                  initial={{ x: "1.5rem" }}
                  animate={{ x: "calc(100% - 4.5rem)" }}
                  transition={{
                    repeat: Infinity,
                    duration: 2.8,
                    ease: "easeInOut",
                    repeatType: "loop"
                  }}
                  className="absolute z-20 flex items-center"
                >
                  <motion.div
                    animate={{ y: [0, -3, 0], rotate: [0, 1, -1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.35, ease: "easeInOut" }}
                    className="flex items-center drop-shadow-[0_2px_10px_rgba(215,15,100,0.5)] bg-zinc-900/90 rounded-full px-1.5 py-0.5 border border-pink-500/40"
                  >
                    <span className="text-xs mr-0.5">{order.orderType === "grocery" ? "🛒" : "🍔"}</span>
                    {/* Standard rider emoji rotated so it faces FORWARD to the RIGHT */}
                    <span className="text-2xl inline-block transform -scale-x-1">🛵</span>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>

            {/* Quick Order Info Info Card - Premium Receipt Style */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="w-full relative mt-4"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white dark:bg-zinc-900 px-3 text-zinc-300 dark:text-zinc-600">
                <Receipt className="w-6 h-6" />
              </div>
              <div className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5 pt-6 text-left shadow-sm relative">
                <div className="flex justify-between items-center pb-3 border-b border-dashed border-zinc-300 dark:border-zinc-700 text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Order ID</span>
                  <span className="font-mono font-black text-zinc-900 dark:text-zinc-100 bg-zinc-200/60 dark:bg-zinc-700/60 px-2 py-0.5 rounded text-[10px]">
                    DADU-{order.id.slice(-6).toUpperCase()}
                  </span>
                </div>
                
                <div className="py-3 space-y-2 border-b border-dashed border-zinc-300 dark:border-zinc-700">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500 dark:text-zinc-400 font-bold">Deliver To</span>
                    <span className="font-black text-zinc-800 dark:text-zinc-200 text-right">{order.userName || order.name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500 dark:text-zinc-400 font-bold">Address</span>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300 max-w-[180px] truncate text-right">
                      {order.userAddress || order.address}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 text-sm">
                  <span className="font-black text-zinc-800 dark:text-zinc-200">Total Paid</span>
                  <span className="font-black text-xl text-[#D70F64] tracking-tight">
                    Rs. {order.grandTotal}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Action buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-3 w-full mt-6"
            >
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-gradient-to-r from-[#D70F64] to-pink-600 text-white hover:from-[#b00c50] hover:to-pink-700 transition-colors py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer text-center shadow-lg shadow-pink-500/20"
              >
                Close & View Orders
              </button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

