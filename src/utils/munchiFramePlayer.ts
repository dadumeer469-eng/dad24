// Munchi frame-by-frame player — the live-call animation upgrade.
//
// The site ships only the KEYFRAMES (a handful of stills per pose, all
// AI edits of the same Munchi photo). The player blends between adjacent
// keyframes on a <canvas> every frame, so the mouth moves smoothly
// without shipping hundreds of images or a video. At 24fps the blend
// steps are invisible — the same technique the demo widgets proved.
//
// Poses (all the same man, same framing, only hand/body/expression
// change): neutral (the call-screen base), happy (thumbs-up), thinking
// (finger on chin), funny (open palm, big laugh), concerned (hand on
// chest), listening (hands down, attentive — never speaks, so it has no
// mouth frames, only a blink).
//
// Visemes: the mouth is driven by the actual WORDS of each Groq reply.
// The reply text is known before the TTS audio plays, so the schedule is
// built from the text + the audio's real duration (word timings spread
// proportional to word length, mouth rising/falling inside each word and
// closing in the gaps). Peak openness comes from the word's shape:
// m/b/p words start closed, long "aa"/"oo" words open wide.

export type MunchiPose = "neutral" | "happy" | "thinking" | "funny" | "concerned" | "listening";

export interface PoseKey {
  src: string;
  /** Mouth openness this keyframe shows, 0 (closed) .. 1 (wide open). */
  open: number;
}

export const POSE_KEYS: Record<MunchiPose, PoseKey[]> = {
  // Base pose: 7 mouth keyframes (the fine gradient from the demos).
  neutral: [
    { src: "/images/munchi.jpg", open: 0 },
    { src: "/images/munchi-frame-quarter.jpg", open: 0.17 },
    { src: "/images/munchi-frame-half.jpg", open: 0.33 },
    { src: "/images/munchi-frame-threequarter.jpg", open: 0.5 },
    { src: "/images/munchi-frame-open.jpg", open: 0.67 },
    { src: "/images/munchi-frame-almostwide.jpg", open: 0.83 },
    { src: "/images/munchi-frame-wide.jpg", open: 1 },
  ],
  happy: [
    { src: "/images/munchi-anim/happy/key-closed.jpg", open: 0 },
    { src: "/images/munchi-anim/happy/key-half.jpg", open: 0.33 },
    { src: "/images/munchi-anim/happy/key-open.jpg", open: 0.67 },
    { src: "/images/munchi-anim/happy/key-wide.jpg", open: 1 },
  ],
  thinking: [
    { src: "/images/munchi-anim/thinking/key-closed.jpg", open: 0 },
    { src: "/images/munchi-anim/thinking/key-half.jpg", open: 0.33 },
    { src: "/images/munchi-anim/thinking/key-open.jpg", open: 0.67 },
    { src: "/images/munchi-anim/thinking/key-wide.jpg", open: 1 },
  ],
  funny: [
    { src: "/images/munchi-anim/funny/key-closed.jpg", open: 0 },
    { src: "/images/munchi-anim/funny/key-half.jpg", open: 0.33 },
    { src: "/images/munchi-anim/funny/key-open.jpg", open: 0.67 },
    { src: "/images/munchi-anim/funny/key-wide.jpg", open: 1 },
  ],
  concerned: [
    { src: "/images/munchi-anim/concerned/key-closed.jpg", open: 0 },
    { src: "/images/munchi-anim/concerned/key-half.jpg", open: 0.33 },
    { src: "/images/munchi-anim/concerned/key-open.jpg", open: 0.67 },
    { src: "/images/munchi-anim/concerned/key-wide.jpg", open: 1 },
  ],
  // Listening never speaks: a single still.
  listening: [{ src: "/images/munchi-anim/listening/pose.jpg", open: 0 }],
};

export const POSE_BLINK: Record<MunchiPose, string> = {
  neutral: "/images/munchi-frame-blink.jpg",
  happy: "/images/munchi-anim/happy/key-blink.jpg",
  thinking: "/images/munchi-anim/thinking/key-blink.jpg",
  funny: "/images/munchi-anim/funny/key-blink.jpg",
  concerned: "/images/munchi-anim/concerned/key-blink.jpg",
  listening: "/images/munchi-anim/listening/blink.jpg",
};

// Smile frame (base pose only) — used at the end of a happy reply.
export const SMILE_SRC = "/images/munchi-frame-smile.jpg";

// --- image loading -------------------------------------------------------

const cache = new Map<string, HTMLImageElement>();

function loadImage(src: string): HTMLImageElement {
  let im = cache.get(src);
  if (!im) {
    im = new Image();
    im.src = src;
    cache.set(src, im);
  }
  return im;
}

/** Start loading a pose's keyframes + blink in the background. Safe to
 * call repeatedly; already-loaded images are not re-fetched. */
export function preloadPose(pose: MunchiPose): void {
  if (typeof window === "undefined") return;
  POSE_KEYS[pose].forEach((k) => loadImage(k.src));
  loadImage(POSE_BLINK[pose]);
  if (pose === "neutral") loadImage(SMILE_SRC);
}

/** Draw one pose at a given mouth openness (0..1) onto a canvas,
 * blending the two bracketing keyframes. `alpha` fades the whole pose
 * (used for the 300ms crossfade between poses). Returns false when the
 * needed image is not loaded yet — the caller keeps the previous frame. */
export function drawPoseFrame(
  ctx: CanvasRenderingContext2D,
  pose: MunchiPose,
  openness: number,
  width: number,
  height: number,
  alpha = 1,
): boolean {
  const keys = POSE_KEYS[pose];
  const o = Math.max(0, Math.min(1, openness));
  let i = 0;
  while (i < keys.length - 2 && o > keys[i + 1].open) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const imgA = loadImage(a.src);
  if (!imgA.complete || imgA.naturalWidth === 0) return false;
  const t = b ? Math.max(0, Math.min(1, (o - a.open) / (b.open - a.open || 1))) : 0;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(imgA, 0, 0, width, height);
  if (t > 0 && b) {
    const imgB = loadImage(b.src);
    if (imgB.complete && imgB.naturalWidth > 0) {
      ctx.globalAlpha = alpha * t;
      ctx.drawImage(imgB, 0, 0, width, height);
    }
  }
  ctx.restore();
  return true;
}

/** Draw a pose's blink frame (eyes closed) at full opacity. */
export function drawPoseBlink(
  ctx: CanvasRenderingContext2D,
  pose: MunchiPose,
  width: number,
  height: number,
  alpha = 1,
): boolean {
  const img = loadImage(POSE_BLINK[pose]);
  if (!img.complete || img.naturalWidth === 0) return false;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, 0, 0, width, height);
  ctx.restore();
  return true;
}

// --- viseme scheduler ----------------------------------------------------

export interface VisemeWord {
  word: string;
  start: number;
  end: number;
  peak: number;
}

export interface VisemeSchedule {
  words: VisemeWord[];
  duration: number;
  startedAt: number;
}

// Peak openness from a word's shape (Roman Urdu + Urdu script).
function wordPeak(raw: string): number {
  const w = raw.toLowerCase().replace(/[؟?!.،,؛:;()"'“”]/g, "");
  if (!w) return 0.6;
  // Urdu script: ا/آ (aa) opens wide, و (oo) mid, م/ب/پ start closed.
  if (/[اآ]/.test(w)) return 0.9;
  if (/^[مبپ]/.test(w)) return 0.45;
  if (/و/.test(w)) return 0.7;
  // Roman Urdu: m/b/p words start closed (Main, Munchi, mujhe, batao).
  if (/^[mbp]/.test(w)) return 0.45;
  // Long vowels open wide (haal, aap, khilaya, aaj, khana).
  if (/aa|aap|haal|khilaya|aaj|naam|jaan|saath|baat/.test(w)) return 0.9;
  // o/oo endings are mid (hoon, ko, jo, lo, bolo).
  if (/oo$|oon$|o$/.test(w)) return 0.68;
  return 0.6;
}

/** Spread the reply's words across the audio's real duration, timed
 * proportional to word length, with a short pause after punctuation —
 * the same scheduler the 24fps demo proved. */
export function buildVisemeSchedule(text: string, durationSec: number): VisemeSchedule {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0 || !(durationSec > 0)) {
    return { words: [], duration: durationSec, startedAt: performance.now() };
  }
  const pauses = words.map((w) => (/[؟?!۔]$/.test(w) ? 0.18 : /[،,]$/.test(w) ? 0.1 : 0));
  const totalPause = pauses.reduce((a, b) => a + b, 0);
  const totalChars = words.reduce((a, w) => a + w.length, 0);
  const perChar = Math.max(0.02, (durationSec - totalPause) / Math.max(1, totalChars));
  const out: VisemeWord[] = [];
  let t = 0;
  words.forEach((w, i) => {
    const dur = Math.max(0.08, w.length * perChar);
    out.push({ word: w, start: t, end: t + dur, peak: wordPeak(w) });
    t += dur + pauses[i];
  });
  return { words: out, duration: durationSec, startedAt: performance.now() };
}

/** Mouth openness + the word being spoken at a given elapsed time.
 * The mouth rises and falls inside each word (sine) and closes in gaps. */
export function visemeAt(
  schedule: VisemeSchedule,
  elapsedSec: number,
): { open: number; word: string } {
  for (const w of schedule.words) {
    if (elapsedSec >= w.start && elapsedSec < w.end) {
      const p = (elapsedSec - w.start) / (w.end - w.start);
      return { open: w.peak * Math.sin(p * Math.PI), word: w.word };
    }
    if (elapsedSec >= w.end && elapsedSec < w.end + 0.2) {
      return { open: 0.08, word: "" };
    }
  }
  return { open: 0, word: "" };
}
