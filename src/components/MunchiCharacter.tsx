import { useEffect, useRef, useState } from "react";
import type { MunchiController, MunchiMood, MunchiState } from "../utils/munchiController";
import type { ProductFrame } from "../utils/munchiProductFrames";
import {
  drawPoseBlink,
  drawPoseFrame,
  preloadPose,
  visemeAt,
  type MunchiPose,
} from "../utils/munchiFramePlayer";

// Munchi — the Dadu Food voice agent, alive on the call screen.
//
// Frame-by-frame animation: the site ships only the KEYFRAMES (a few
// stills per pose, all AI edits of the same Munchi photo). This component
// blends between adjacent keyframes on a <canvas> every frame, so the
// mouth moves smoothly at 24fps without shipping hundreds of images.
//   - the mouth follows the actual WORDS of each Groq reply (viseme
//     schedule on the controller, built from the reply text + the TTS
//     audio's real duration — see munchiFramePlayer.ts);
//   - without a schedule (phone voice) it falls back to the analyser /
//     word-pulse level on controller.mouth, as before;
//   - the pose follows the state + mood: listening (hands down), thinking
//     (finger on chin), happy (thumbs-up), funny (open palm), concerned
//     (hand on chest) — each pose has its OWN mouth frames, so every
//     reply feels like the same Munchi;
//   - blinking uses each pose's own blink frame, every few seconds.
// One requestAnimationFrame loop drives breathing, head tilt, the mouth
// and blinking by writing straight onto DOM/canvas nodes (no React
// re-renders). The loop pauses when the tab is hidden or the character
// is off-screen, and low-power devices skip blinking and head tilt.

// The pose Munchi wears for a state + mood. Activity (listening /
// thinking / speaking) is the state machine; mood is the expression.
function poseFor(state: MunchiState, mood: MunchiMood): MunchiPose {
  if (state === "listening") return "listening";
  if (state === "thinking") return "thinking";
  if (state === "error") return "concerned";
  if (state === "happy" || state === "order_confirmed") return "happy";
  if (state === "funny") return "funny";
  return mood;
}

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => controller.subscribe(setMstate), [controller]);
  useEffect(() => controller.subscribeMood(setMoodState), [controller]);

  // Preload the base pose + happy on mount so the call screen never
  // flashes; other poses load when they are first worn.
  useEffect(() => {
    preloadPose("neutral");
    preloadPose("happy");
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
    let open = 0;
    let pose: MunchiPose = poseFor(controller.state, controller.mood);
    let prevPose: MunchiPose | null = null;
    let poseChangedAt = 0;
    let inView = true;
    preloadPose(pose);

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

      // Pose: switch (with a 300ms crossfade) when the state or mood
      // changes, and start loading the new pose's frames.
      const want = poseFor(controller.state, controller.mood);
      if (want !== pose) {
        prevPose = pose;
        pose = want;
        poseChangedAt = now;
        preloadPose(pose);
      }

      // Mouth openness: the analyser (true voice volume) wins when it is
      // live — it is the actual sound, so the jaw matches the narration
      // exactly. The viseme schedule (words + audio duration) is the
      // fallback when no analyser is running (suspended AudioContext).
      // Before this, the schedule always won and the analyser was ignored,
      // so a schedule built from a wrong duration made the mouth run ahead
      // of / behind the voice ("narration match nahi hoti").
      const schedule = controller.speechSchedule;
      const analyserLive = now - controller.lastDriveAt < 200;
      if (controller.state === "speaking" && analyserLive) {
        const m = controller.mouth;
        m.open += (m.target - m.open) * 0.18;
        m.target *= 0.92;
        if (m.open < 0.01 && m.target < 0.01) {
          m.open = 0;
          m.target = 0;
        }
        open = m.open;
      } else if (controller.state === "speaking" && schedule) {
        const elapsed = (now - schedule.startedAt) / 1000;
        const target =
          elapsed > schedule.duration + 0.5 || schedule.words.length === 0
            ? 0
            : visemeAt(schedule, elapsed).open;
        open += (target - open) * 0.18;
      } else {
        const m = controller.mouth;
        m.open += (m.target - m.open) * 0.18;
        m.target *= 0.88;
        if (m.open < 0.01 && m.target < 0.01) {
          m.open = 0;
          m.target = 0;
        }
        open = m.open;
      }

      // Breathing + head tilt per state. Small angles only — no bouncing.
      // Speaking used to bob the WHOLE character by open * 2px and swing
      // the head at 3.1 rad/s, which read as shaking while talking
      // ("jatke se hilta hai"). Now the bob is a whisper (open * 0.5px)
      // and the sway is slower and gentler — the mouth does the talking,
      // the body stays calm.
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
          tilt = reduced ? 0 : Math.sin(t * 2.0) * 0.35;
          bob = open * 0.5;
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

      // Draw the frame: blend the pose's keyframes by mouth openness,
      // crossfade between poses for 300ms, blink with the pose's own
      // blink frame every few seconds. A hero product covers the canvas,
      // so there is nothing to draw then.
      const canvas = canvasRef.current;
      if (canvas && !product?.hero) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const W = canvas.width;
          const H = canvas.height;
          const p = prevPose ? Math.min(1, (now - poseChangedAt) / 300) : 1;
          // Blink: eyes close and open over ~150ms.
          let blinking = false;
          if (!reduced) {
            if (blinkStart < 0 && now >= nextBlink) blinkStart = now;
            if (blinkStart >= 0) {
              const bp = (now - blinkStart) / 150;
              if (bp >= 1) {
                blinkStart = -1;
                nextBlink = now + 2400 + Math.random() * 2800;
              } else {
                blinking = true;
              }
            }
          }
          ctx.clearRect(0, 0, W, H);
          if (blinking) {
            if (prevPose && p < 1) drawPoseBlink(ctx, prevPose, W, H, 1 - p);
            drawPoseBlink(ctx, pose, W, H, p);
          } else {
            if (prevPose && p < 1) {
              drawPoseFrame(ctx, prevPose, open, W, H, 1 - p);
            } else {
              prevPose = null;
            }
            drawPoseFrame(ctx, pose, open, W, H, p);
          }
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, controller, product?.hero]);

  if (!visible) return null;

  return (
    <div className="relative w-full max-w-[400px] animate-agent-walk-in">
      <div
        ref={wrapRef}
        className="relative aspect-[880/960] w-full overflow-hidden rounded-[28px] will-change-transform"
        style={{ transformOrigin: "50% 62%" }}
      >
        {/* Frame-by-frame Munchi: keyframes blended live on canvas.
            A hero product replaces the canvas with Munchi holding it. */}
        {product?.hero ? (
          <img
            src={product.image}
            alt={`Munchi holding ${product.name}`}
            draggable={false}
            style={{ position: "absolute", inset: 0, height: "100%", width: "100%", objectFit: "cover" }}
          />
        ) : (
          <canvas
            ref={canvasRef}
            width={880}
            height={960}
            aria-label="Munchi — Dadu Food AI agent"
            style={{ position: "absolute", inset: 0, height: "100%", width: "100%" }}
          />
        )}
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
