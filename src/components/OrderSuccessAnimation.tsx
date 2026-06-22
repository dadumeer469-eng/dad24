import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, ShoppingBag, MapPin, Sparkles, Navigation, X } from "lucide-react";
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

  useEffect(() => {
    if (isOpen) {
      // Generate confetti particles on load
      const colors = ["#D70F64", "#EA580C", "#10B981", "#3B82F6", "#F59E0B", "#EC4899", "#8B5CF6"];
      const generated = Array.from({ length: 45 }).map((_, i) => ({
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
        // Sweet double ascending bell sound for success!
        playTone(523.25, "sine", 0.1, 0.4); // C5
        playTone(659.25, "sine", 0.25, 0.5); // E5
        playTone(783.99, "sine", 0.4, 0.6); // G5
      } catch (e) {
        console.log("Audio feedback omitted or context blocked by user browser permissions.");
      }
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
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
              }}
            />
          ))}
        </div>

        {/* Success Modal Container */}
        <motion.div
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 15, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden z-10"
        >
          {/* Top colored accent line */}
          <div className="h-2 w-full bg-gradient-to-r from-[#D70F64] via-pink-500 to-orange-500" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200/80 hover:text-zinc-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-6 md:p-8 flex flex-col items-center text-center">
            {/* Animating Sparkles & Circular Badge */}
            <div className="relative">
              {/* Spinning decorative background ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
                className="absolute inset-0 -m-3 border-2 border-dashed border-emerald-300 rounded-full opacity-60"
              />

              {/* Bouncing Circle success badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.15, 1] }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 z-10 relative"
              >
                <motion.div
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                >
                  <Check className="w-10 h-10 stroke-[3]" />
                </motion.div>
              </motion.div>

              {/* Float sparkles decorations around success badge */}
              <motion.span
                animate={{ y: [0, -5, 0], scale: [1, 1.25, 1], rotate: [0, 15, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-4 -right-4 text-emerald-500"
              >
                <Sparkles className="w-6 h-6 fill-emerald-500/10" />
              </motion.span>
              <motion.span
                animate={{ y: [0, 6, 0], scale: [0.8, 1.1, 0.8], rotate: [0, -15, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                className="absolute -bottom-2 -left-5 text-[#D70F64]"
              >
                <Sparkles className="w-5 h-5 fill-pink-500/10" />
              </motion.span>
            </div>

            <h3 className="text-2xl font-black text-zinc-900 mt-6 tracking-tight">
              Order Placed successfully!
            </h3>
            <p className="text-zinc-650 text-sm mt-2 max-w-sm">
              Alhamdulillah! Your order details have been broadcasted. Our delivery team is preparing your package.
            </p>

            {/* Live Scooter / Rider Riding Animation */}
            <div className="w-full bg-zinc-50 border border-zinc-150/60 rounded-2xl p-4 mt-6 overflow-hidden relative">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-3 text-left">
                Express Route Broadcasted
              </span>

              {/* Road Lane Line */}
              <div className="absolute left-4 right-4 bottom-5 h-0.5 bg-zinc-200 border-dashed" />

              {/* Moving Scooter with spinning wheels and bounce animation */}
              <motion.div
                initial={{ x: "-10%" }}
                animate={{ x: "105%" }}
                transition={{
                  repeat: Infinity,
                  duration: 6,
                  ease: "linear",
                }}
                className="relative flex flex-col items-center w-max z-10"
              >
                {/* Rider + Scooter Body bouncing */}
                <motion.div
                  animate={{ y: [0, -2, 0] }}
                  transition={{ repeat: Infinity, duration: 0.35, ease: "easeInOut" }}
                  className="flex items-center"
                >
                  <span className="text-3xl filter drop-shadow">
                    {order.orderType === "grocery" ? "🍏" : "🍔"}
                  </span>
                  <span className="text-4xl filter drop-shadow -ml-2">🛵</span>
                </motion.div>
              </motion.div>

              <div className="flex items-center justify-between text-zinc-500 text-[10px] uppercase font-extrabold tracking-wider mt-4">
                <span className="flex items-center gap-1 text-[#D70F64]">
                  <ShoppingBag className="w-3.5 h-3.5" /> Dadu Kitchen
                </span>
                <span className="flex items-center gap-1 text-[#D70F64]">
                  <Navigation className="w-3.5 h-3.5 animate-pulse" /> Live Dispatch
                </span>
              </div>
            </div>

            {/* Quick Order Info Info Card */}
            <div className="w-full bg-zinc-50 border border-zinc-150/60 rounded-2xl p-4.5 mt-4 text-left divide-y divide-zinc-200/50">
              <div className="flex justify-between pb-3 text-xs">
                <span className="text-zinc-400 font-bold">Order ID:</span>
                <span className="font-mono font-black text-zinc-800 uppercase tracking-wide">
                  dadu-{order.id.slice(-8)}
                </span>
              </div>
              <div className="flex justify-between py-3 text-xs">
                <span className="text-zinc-400 font-bold">Recipient:</span>
                <span className="font-black text-zinc-800">{order.userName || order.name}</span>
              </div>
              <div className="flex justify-between py-3 text-xs">
                <span className="text-zinc-400 font-bold">Delivery Location:</span>
                <span className="font-extrabold text-zinc-705 max-w-[200px] truncate text-right">
                  {order.userAddress || order.address}
                </span>
              </div>
              <div className="flex justify-between pt-3 text-xs">
                <span className="font-bold text-zinc-800">Total Charged:</span>
                <span className="font-black text-[#D70F64] text-sm">
                  Rs. {order.grandTotal}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-6">
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-zinc-105 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer text-center"
              >
                Close & Continue
              </button>
              {onTrackOrder && (
                <button
                  type="button"
                  onClick={() => {
                    onTrackOrder();
                    onClose();
                  }}
                  className="w-full bg-[#D70F64] text-white hover:bg-[#b00c50] transition py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-pink-500/10 text-center"
                >
                  <MapPin className="w-4 h-4 animate-bounce" />
                  Track Live Map 🧭
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
