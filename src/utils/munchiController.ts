// Munchi — central character controller for the Dadu Food voice agent.
//
// Architecture (chosen after evaluating Rive / Live2D / Three.js / GSAP):
// the supplied Munchi image is a flat photograph, so there is no rig to
// drive — Rive and Live2D would need a redrawn, rigged character, and
// Three.js is far too heavy for a phone call screen. The lightweight
// 2.5D solution below needs zero new dependencies:
//   - the portrait photo as the base layer,
//   - a feathered lower-face (mouth + moustache + beard) layer that bobs
//     as the jaw, driven by the real voice,
//   - real skin pixels from the photo as eyelid strips for blinking,
//   - CSS transforms (breathing, head tilt) applied straight to DOM nodes
//     from one requestAnimationFrame loop — no React re-renders at 60fps.
// Lip-sync honesty: browser speechSynthesis exposes NO audio stream, so
// Web Audio amplitude analysis of the phone voice is impossible. Chrome
// fires SpeechSynthesisUtterance.onboundary once per spoken word — that is
// a real sync signal from the actual voice, so each word pulses the jaw
// open and it decays shut between words. Browsers that never fire
// onboundary (Safari, some Android voices) get a word-paced fallback pulse
// (~280ms per word) so the mouth still moves while speaking.
// The neural voice is different: it plays back as a real <audio> file, so
// the modal reads its true volume through an AnalyserNode and drives the
// jaw from the actual amplitude (driveMouth) — the most honest sync there is.

import { buildVisemeSchedule, type VisemeSchedule } from "./munchiFramePlayer";

export type MunchiState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "happy"
  | "funny"
  | "order_confirmed"
  | "error";

export type MunchiQuality = "high" | "balanced" | "low";

// The face Munchi wears. Activity (listening/thinking/speaking) is the
// state machine; mood is the expression on top of it.
export type MunchiMood = "neutral" | "happy" | "thinking" | "funny" | "concerned";

// Guess the face for a reply from its words (Roman Urdu + Urdu script
// only — the agent speaks Urdu, no Hindi keywords).
export function classifyMood(text: string): MunchiMood {
  const t = text.toLowerCase();
  if (/\bhaha\b|hehe|mazak|mazaak|\bjoke\b|hansi|ہاہا|مذاق|ہنسی/.test(t)) return "funny";
  if (/\bmaaf\b|masla|\bafsos\b|pareshani|galti|kharaab|der ho|معاف|مسئلہ|افسوس|پریشانی|غلطی|خراب|دیر/.test(t))
    return "concerned";
  if (/shukriya|zaroor|bilkul|mubarak|khushi|behtareen|\bwah\b|zabardast|شکریہ|ضرور|بالکل|مبارک|خوشی|بہترین|واہ|زبردست/.test(t))
    return "happy";
  return "neutral";
}

// Default Balanced. Low-power phones (little RAM / few cores, data-saver,
// or reduced-motion) skip blinking and head tilt; powerful devices get the
// full set. The mouth always moves while speaking — that is the core feature.
function detectQuality(): MunchiQuality {
  if (typeof navigator === "undefined" || typeof window === "undefined") return "balanced";
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const dm = nav.deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  const saveData = nav.connection?.saveData === true;
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  if (reduced || saveData || dm <= 2 || cores <= 2) return "low";
  if (dm >= 6 && cores >= 6) return "high";
  return "balanced";
}

export class MunchiController {
  state: MunchiState = "idle";
  mood: MunchiMood = "neutral";
  quality: MunchiQuality = detectQuality();

  // Continuous lip-sync values. Plain mutable fields (not React state) so
  // the mouth can move at 60fps without re-rendering anything.
  mouth = { open: 0, target: 0 };

  // Frame-by-frame viseme schedule for the neural voice: the reply text
  // is known before its TTS audio plays, so the mouth follows the actual
  // words (see munchiFramePlayer.ts). Set by noteSpeechStart(text,
  // duration); the phone-voice path never sets it and keeps the
  // word-pulse / analyser fallback instead.
  speechSchedule: VisemeSchedule | null = null;

  private listeners = new Set<(s: MunchiState) => void>();
  private moodListeners = new Set<(m: MunchiMood) => void>();
  private fallbackTimer: number | null = null;
  private watchdogTimer: number | null = null;
  private boundarySeen = false;

  subscribe(fn: (s: MunchiState) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  subscribeMood(fn: (m: MunchiMood) => void): () => void {
    this.moodListeners.add(fn);
    return () => {
      this.moodListeners.delete(fn);
    };
  }

  setState(s: MunchiState) {
    if (this.state === s) return;
    this.state = s;
    this.listeners.forEach((fn) => fn(s));
  }

  setMood(m: MunchiMood) {
    if (this.mood === m) return;
    this.mood = m;
    this.moodListeners.forEach((fn) => fn(m));
  }

  // --- lip-sync driver (called from the voice agent's speak()) ---
  noteSpeechStart(text?: string, durationSec?: number) {
    this.boundarySeen = false;
    this.setState("speaking");
    this.stopFallback();
    // Neural voice with a known reply + real audio duration: build the
    // word-by-word viseme schedule. Without args (call start / phone
    // voice) the schedule stays as it was — the previous utterance's
    // finish() already cleared it.
    if (text && durationSec && durationSec > 0) {
      this.speechSchedule = buildVisemeSchedule(text, durationSec);
    }
    // If no word boundary arrives within 700ms, this voice never fires
    // onboundary — fall back to a word-paced pulse.
    this.watchdogTimer = window.setTimeout(() => {
      if (this.boundarySeen) return;
      this.fallbackTimer = window.setInterval(() => {
        this.mouth.target = 0.4 + Math.random() * 0.4;
      }, 280);
    }, 700);
  }

  noteWord(charLength = 4) {
    this.boundarySeen = true;
    this.stopFallback();
    // Longer words open the jaw wider; clamp so it never looks mechanical.
    this.mouth.target = Math.min(0.95, 0.45 + Math.min(charLength, 10) * 0.05);
  }

  // Real amplitude lip-sync (neural TTS audio): the modal's analyser reads
  // the actual playback volume each frame and drives the jaw straight
  // from it. Stops the word-pulse fallback so the two never fight.
  driveMouth(level: number) {
    this.boundarySeen = true;
    this.stopFallback();
    this.mouth.target = Math.max(0, Math.min(0.95, level));
  }

  noteSpeechEnd() {
    this.stopFallback();
    this.mouth.target = 0;
    this.mouth.open = 0;
    this.speechSchedule = null;
  }

  reset() {
    this.stopFallback();
    this.mouth.target = 0;
    this.mouth.open = 0;
    this.speechSchedule = null;
    this.setState("idle");
    this.setMood("neutral");
  }

  private stopFallback() {
    if (this.watchdogTimer !== null) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    if (this.fallbackTimer !== null) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }
}
