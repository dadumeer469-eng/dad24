import { useEffect, useRef, useState } from "react";
import type { MunchiController, MunchiMood, MunchiState } from "../utils/munchiController";
import type { ProductFrame } from "../utils/munchiProductFrames";

// Layer positions measured from the supplied Munchi reference image.
// public/images/munchi.jpg is the 880x960 crop of it, so percentages map
// exactly onto the displayed portrait.
const JAW = { left: 43.18, top: 43.75, width: 20.45, height: 23.96 }; // mouth + moustache + beard + chin
const EYE_L = { left: 53.98, top: 30.52 }; // viewer's left eye
const EYE_R = { left: 66.7, top: 30.83 }; // viewer's right eye

// One face per mood, all from the same reference photo, same framing —
// the face cross-fades between them in 300ms. Each mood has its own jaw
// layer (cut from its own face) so the lip-sync still lines up.
const MOODS: MunchiMood[] = ["neutral", "happy", "thinking", "funny", "concerned"];
const faceUrl = (m: MunchiMood) => (m === "neutral" ? "/images/munchi.jpg" : `/images/munchi-${m}.jpg`);
const jawUrl = (m: MunchiMood) => (m === "neutral" ? "/images/munchi-jaw.png" : `/images/munchi-jaw-${m}.png`);

// Munchi — the Dadu Food voice agent, alive on the call screen.
// One requestAnimationFrame loop drives breathing, head tilt, the jaw and
// blinking by writing transforms straight onto DOM nodes (no React
// re-renders). The loop pauses when the tab is hidden or the character is
// off-screen, and low-power devices skip blinking and head tilt.
export default function MunchiCharacter({
  controller,
  visible,
  product,
}: {
  controller: MunchiController;
  visible: boolean;
  // The product being talked about: a hero frame (Munchi holding it) or a
  // catalogue photo composited at his hand, with a name + price pill.
  product?: ProductFrame | null;
}) {
  const [, setMstate] = useState<MunchiState>(controller.state);
  const [mood, setMoodState] = useState<MunchiMood>(controller.mood);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const jawRef = useRef<HTMLImageElement | null>(null);
  const blinkLRef = useRef<HTMLDivElement | null>(null);
  const blinkRRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => controller.subscribe(setMstate), [controller]);
  useEffect(() => controller.subscribeMood(setMoodState), [controller]);

  // Preload every mood face + jaw on mount so switching never flashes.
  useEffect(() => {
    MOODS.forEach((m) => {
      [faceUrl(m), jawUrl(m)].forEach((src) => {
        const im = new Image();
        im.src = src;
      });
    });
  }, []);

  useEffect(() => {
    if (!visible) return;
    const reduced = controller.quality === "low";
    let raf = 0;
    let last = performance.now();
    let nextBlink = last + 1800 + Math.random() * 2500;
    let blinkStart = -1;
    let celebrateStart = -1;
    let lastState: MunchiState = controller.state;
    let inView = true;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      last = now;
      // Pause the work when the tab is hidden or the character is off-screen.
      if (document.hidden || !inView) return;
      const wrap = wrapRef.current;
      if (!wrap) return;

      if (controller.state !== lastState) {
        if (controller.state === "order_confirmed") celebrateStart = now;
        lastState = controller.state;
      }

      // Mouth: ease toward the word pulse, then decay shut between words.
      const m = controller.mouth;
      m.open += (m.target - m.open) * 0.3;
      m.target *= 0.88;
      if (m.open < 0.01 && m.target < 0.01) {
        m.open = 0;
        m.target = 0;
      }

      // Breathing + head tilt per state. Small angles only — no bouncing.
      const t = now / 1000;
      const breath = reduced ? 0 : Math.sin(t * 1.6) * 0.006;
      let tilt = 0;
      let bob = 0;
      switch (controller.state) {
        case "listening":
          tilt = -2;
          break;
        case "thinking":
          tilt = 2.5;
          bob = reduced ? 0 : Math.sin(t * 2.2) * 1.2;
          break;
        case "speaking":
          tilt = reduced ? 0 : Math.sin(t * 3.1) * 0.7;
          bob = m.open * 2;
          break;
        case "happy":
          tilt = 1;
          bob = reduced ? 0 : Math.sin(t * 2.6) * 1.5;
          break;
        case "funny":
          tilt = -3;
          break;
        case "error":
          tilt = -1;
          bob = 1;
          break;
        default:
          break;
      }
      let scale = 1 + breath;
      if (celebrateStart > 0) {
        const p = (now - celebrateStart) / 600;
        if (p < 1) scale *= 1 + Math.sin(p * Math.PI) * 0.04;
        else celebrateStart = -1;
      }
      wrap.style.transform = `rotate(${tilt.toFixed(2)}deg) translateY(${bob.toFixed(2)}px) scale(${scale.toFixed(4)})`;

      // Jaw (lip-sync): drops and widens with each spoken word.
      const jaw = jawRef.current;
      if (jaw) {
        jaw.style.transform = `translateY(${(m.open * 3.5).toFixed(2)}px) scaleY(${(1 + m.open * 0.1).toFixed(3)})`;
      }

      // Blink: eyelid strips (real skin pixels from the photo) close and
      // open over ~150ms, every few seconds, at random intervals.
      if (!reduced) {
        if (blinkStart < 0 && now >= nextBlink) blinkStart = now;
        let phase = 0;
        if (blinkStart >= 0) {
          const bp = (now - blinkStart) / 150;
          if (bp >= 1) {
            blinkStart = -1;
            nextBlink = now + 2400 + Math.random() * 2800;
          } else {
            phase = bp < 0.5 ? bp * 2 : 2 - bp * 2;
          }
        }
        const s = `translate(-50%,-50%) scaleY(${phase.toFixed(2)})`;
        if (blinkLRef.current) blinkLRef.current.style.transform = s;
        if (blinkRRef.current) blinkRRef.current.style.transform = s;
      }
    };
    raf = requestAnimationFrame(tick);

    const host = wrapRef.current?.parentElement;
    const io = host
      ? new IntersectionObserver((entries) => {
          inView = entries[0]?.isIntersecting ?? true;
        })
      : null;
    if (host && io) io.observe(host);
    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
    };
  }, [visible, controller]);

  if (!visible) return null;

  return (
    <div className="relative w-full max-w-[400px] animate-agent-walk-in">
      <div
        ref={wrapRef}
        className="relative aspect-[880/960] w-full overflow-hidden rounded-[28px] will-change-transform"
        style={{ transformOrigin: "50% 62%" }}
      >
        {/* One face per mood, cross-faded — same man, same framing.
            A hero product replaces the face with Munchi holding that dish. */}
        {product?.hero ? (
          <img
            src={product.image}
            alt={`Munchi holding ${product.name}`}
            draggable={false}
            style={{ position: "absolute", inset: 0, height: "100%", width: "100%", objectFit: "cover" }}
          />
        ) : (
          MOODS.map((m) => (
            <img
              key={m}
              src={faceUrl(m)}
              alt={m === "neutral" ? "Munchi — Dadu Food AI agent" : ""}
              aria-hidden={m !== "neutral"}
              draggable={false}
              style={{
                position: "absolute",
                inset: 0,
                height: "100%",
                width: "100%",
                objectFit: "cover",
                opacity: mood === m ? 1 : 0,
                transition: "opacity 300ms ease",
              }}
            />
          ))
        )}
        {/* Jaw layer of the current face: mouth + moustache + beard, driven
            by the voice. Hero frames wear the neutral face, so they use the
            neutral jaw. */}
        <img
          ref={jawRef}
          src={product?.hero ? "/images/munchi-jaw.png" : jawUrl(mood)}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            position: "absolute",
            left: `${JAW.left}%`,
            top: `${JAW.top}%`,
            width: `${JAW.width}%`,
            height: `${JAW.height}%`,
            transformOrigin: "50% 0%",
          }}
        />
        {/* Eyelid strips (real skin pixels from the photo) for blinking. */}
        <div
          ref={blinkLRef}
          data-munchi-blink-l
          aria-hidden="true"
          style={{
            position: "absolute",
            left: `${EYE_L.left}%`,
            top: `${EYE_L.top}%`,
            width: "5.6%",
            height: "3.4%",
            backgroundImage: "url(/images/munchi-skin.png)",
            backgroundSize: "100% 100%",
            borderRadius: "50%",
            transform: "translate(-50%,-50%) scaleY(0)",
          }}
        />
        <div
          ref={blinkRRef}
          data-munchi-blink-r
          aria-hidden="true"
          style={{
            position: "absolute",
            left: `${EYE_R.left}%`,
            top: `${EYE_R.top}%`,
            width: "5.6%",
            height: "3.4%",
            backgroundImage: "url(/images/munchi-skin.png)",
            backgroundSize: "100% 100%",
            borderRadius: "50%",
            transform: "translate(-50%,-50%) scaleY(0)",
          }}
        />
        {/* Non-hero product: its catalogue photo at Munchi's hand, like a
            card he is presenting, plus a name + price pill. */}
        {product && !product.hero && product.image && (
          <img
            src={product.image}
            alt={product.name}
            draggable={false}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
            style={{
              position: "absolute",
              left: "8%",
              bottom: "12%",
              width: "32%",
              aspectRatio: "1 / 1",
              objectFit: "cover",
              transform: "rotate(-4deg)",
              borderRadius: 16,
              border: "3px solid rgba(255,255,255,0.92)",
              boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
            }}
          />
        )}
        {product && (
          <div
            style={{
              position: "absolute",
              right: "4%",
              // Above the status card: it overlaps the portrait's bottom
              // 40px (-mt-10), so the pill must sit higher to stay readable.
              bottom: "16%",
              background: "rgba(255,255,255,0.96)",
              color: "#C2145E",
              borderRadius: 999,
              padding: "6px 12px",
              fontSize: 11,
              fontWeight: 700,
              boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
              whiteSpace: "nowrap",
              maxWidth: "72%",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {product.name} · Rs {product.price}
          </div>
        )}
      </div>
    </div>
  );
}
