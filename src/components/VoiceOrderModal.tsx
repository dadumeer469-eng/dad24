import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Phone, PhoneOff, X } from "lucide-react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import type { LocalMenuItem, LocalOrder } from "../utils/voiceAgentLocal";
import {
  buildActiveOrderText,
  buildLocalOrdersText,
  buildLocalProfileText,
  getUserOrders,
  saveUserLocation,
  saveUserOrders,
  saveUserProfile,
} from "../utils/localUserData";
import { getAudioContext, primeAudio } from "../utils/primeAudio";
import MunchiCharacter from "./MunchiCharacter";
import { MunchiController, classifyMood } from "../utils/munchiController";
import { findProductInText, type ProductFrame } from "../utils/munchiProductFrames";
import { apiUrl } from "../utils/apiBase";

export interface VoiceOrderItem {
  name: string;
  qty: number;
  type: "food" | "grocery";
}

export interface VoiceOrder {
  items: VoiceOrderItem[];
  address: { area: string; street: string };
  payment: "COD" | "Easypaisa";
  phone?: string;
}

export interface VoiceOrderResult {
  ok: boolean;
  orderId?: string;
  message?: string;
  needsSignIn?: boolean;
  // Spoken on success: unmatched items / split-order warning (M22).
  note?: string;
}

interface VoiceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: LocalMenuItem[];
  recentOrders: LocalOrder[];
  isSignedIn: boolean;
  onOpenAuth: () => void;
  onOrderReady: (order: VoiceOrder) => Promise<VoiceOrderResult>;
  onRequestLocation: () => void;
  userName?: string;
  userPhone?: string;
  userProfileText?: string;
  deliveryLocation?: { area: string; street: string };
}

type Status = "idle" | "calling" | "listening" | "thinking" | "speaking" | "done" | "error";

interface ChatMsg {
  role: "user" | "assistant";
  text: string;
}

const GREETING_UR = "Assalam-o-Alaikum! Kya haal hain? Main Munchi hoon — aaj kya khilaya jaye aap ko?";
// Roman Sindhi greeting (Sindhi in Latin letters — Gemini TTS cannot speak
// Sindhi Arabic script, it rejects it; Roman Sindhi synthesises fine).
// "Kiyan haal aahin?" = how are you? "Main Munchi aahiyan" = I am Munchi.
const GREETING_SD = "Assalam-o-Alaikum! Kiyan haal aahin? Main Munchi aahiyan — aaj tawhan khe cha khaarayo?";
const GREETING = GREETING_UR;
const MUNCHI_LANG_KEY = "dadu_munchi_lang";
type CallLanguage = "ur" | "sd";
function readSavedLanguage(): CallLanguage {
  try {
    return localStorage.getItem(MUNCHI_LANG_KEY) === "sd" ? "sd" : "ur";
  } catch {
    return "ur";
  }
}
const UNCLEAR_SPEECH = "Maaf kijiye, phir se bolein.";
const MIC_DENIED = "Microphone ki ijazat dein — browser ki address bar mein mic icon par tap karein.";
const NO_VOICE_INPUT = "Aap ka phone voice input support nahi karta. Chrome istemal karein.";
const NETWORK_PROBLEM = "Internet ka masla lagta hai — dobara koshish karein.";
const LINE_BUSY = "Maaf kijiye, line abhi masroof hai — thodi der baad dobara koshish karein.";
const MAX_RECORD_MS = 15000;
const SILENCE_MS = 800;
const SILENCE_RMS = 0.02;

function pickVoice(): SpeechSynthesisVoice | null {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  // Urdu first, then Sindhi. There is deliberately NO English / default
  // fallback: the user said male Urdu only, no female voice anywhere —
  // a browser default (often a female English voice) must never speak
  // Urdu text. Returning null lets the utterance stay silent instead.
  return (
    voices.find((v) => v.lang?.toLowerCase() === "ur-pk") ||
    voices.find((v) => v.lang?.toLowerCase().startsWith("ur")) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith("sd")) ||
    null
  );
}

export default function VoiceOrderModal({
  isOpen,
  onClose,
  menuItems,
  recentOrders,
  isSignedIn,
  onOpenAuth,
  onOrderReady,
  onRequestLocation,
  userName,
  userPhone,
  userProfileText,
  deliveryLocation,
}: VoiceOrderModalProps) {
  const [status, setStatus] = useState<Status>("idle");
  // Call-screen language choice (user 28 Nov 09:02): the customer picks
  // Sindhi or Urdu on the call screen; saved on the phone so the next
  // call opens in the same language. Urdu is the default.
  const [callLanguage, setCallLanguageState] = useState<CallLanguage>(() => readSavedLanguage());
  const callLanguageRef = useRef<CallLanguage>(callLanguage);
  const setCallLanguage = useCallback((lang: CallLanguage) => {
    callLanguageRef.current = lang;
    setCallLanguageState(lang);
    try {
      localStorage.setItem(MUNCHI_LANG_KEY, lang);
    } catch {
      /* ignore */
    }
  }, []);
  const [placedOrder, setPlacedOrder] = useState<VoiceOrder | null>(null);
  // The product being talked about, shown in Munchi's hand.
  const [productFrame, setProductFrame] = useState<ProductFrame | null>(null);
  // Munchi stays hidden while the call connects; he walks in the
  // moment the agent answers, then talks with a nod and a waving hand.
  const [agentVisible, setAgentVisible] = useState(false);
  // Phone-number popup (shown when the agent asks for the number and none
  // is on file): the typed digits, the error line, and the open/closing
  // states that drive its spring-in / spring-out animation.
  const [enteredPhone, setEnteredPhone] = useState("");
  const [showPhonePopup, setShowPhonePopup] = useState(false);
  const [phonePopupClosing, setPhonePopupClosing] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const pendingOrderRef = useRef<VoiceOrder | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  // Location popup guard: the agent's location line fires the browser
  // popup at most once per call — it resets when a location arrives or
  // the call ends, so a denied prompt is never re-shown every turn.
  const locationPromptFiredRef = useRef(false);
  // Silence-watch audio nodes (disconnected before each new turn so no
  // node leaks across turns).
  const silenceSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const messagesRef = useRef<ChatMsg[]>([]);
  const statusRef = useRef<Status>("idle");
  const openRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringStopRef = useRef(false);
  const ringTimerRef = useRef<number | null>(null);
  const turnRef = useRef(0);

  // Groq flow: MediaRecorder + Whisper, no SpeechRecognition.
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analysisCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceRafRef = useRef<number | null>(null);
  // Neural TTS playback: a real <audio> element + an AnalyserNode so
  // Munchi's jaw follows the true voice volume.
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsUrlRef = useRef<string | null>(null);
  const ttsCtxRef = useRef<AudioContext | null>(null);
  const ttsSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const ttsAnalyserRef = useRef<AnalyserNode | null>(null);
  const ttsRafRef = useRef<number | null>(null);
  const maxRecTimerRef = useRef<number | null>(null);
  const startListeningRef = useRef<() => void>(() => {});
  const transcribeAndChatRef = useRef<(blob: Blob, turn: number) => void>(() => {});

  // Munchi — the character controller (state machine + lip-sync driver).
  const munchiRef = useRef<MunchiController | null>(null);
  if (munchiRef.current === null) munchiRef.current = new MunchiController();

  // Menu + orders as text for the Groq system prompt (source of truth —
  // the model never invents prices; it only uses these lines).
  const menuText = useMemo(
    () => menuItems.map((i) => `${i.name} — Rs ${i.price} — ${i.type}`).join("\n"),
    [menuItems],
  );
  // Munchi reads the user's data from the PHONE (localStorage), not from
  // the server again and again (user 28 Nov 03:27). The props (from App.tsx
  // / Firestore) are only a fallback when the on-device cache is empty.
  // The cache is refreshed from props whenever the modal opens.
  const ordersText = useMemo(() => {
    const local = buildLocalOrdersText();
    if (local) return local;
    if (recentOrders.length === 0) return "";
    return recentOrders
      .map((o) => {
        const items = o.items.map((i) => `${i.qty} ${i.name}`).join(", ");
        const mins = Math.max(0, Math.floor((Date.now() - o.placedAtMs) / 60000));
        return `Order ${o.id}: ${items} — Rs ${o.total} — status ${o.status} — placed ${mins} min ago — payment ${o.payment} — ${o.speed}`;
      })
      .join("\n");
  }, [recentOrders, isOpen]);
  // The user's CURRENT active order, from on-device data — so when they ask
  // "mera order abhi aya nahi", Munchi knows the live status and explains it.
  const activeOrderText = useMemo(() => buildActiveOrderText(), [isOpen, recentOrders]);
  // Profile from on-device data first, else the App.tsx prop.
  const profileText = useMemo(() => {
    const local = buildLocalProfileText();
    return local || userProfileText || undefined;
  }, [userProfileText, isOpen]);

  // Save the latest user data ON THE PHONE whenever the voice modal opens,
  // so Munchi always reads fresh on-device data (user 28 Nov 03:27).
  useEffect(() => {
    if (!isOpen) return;
    if (recentOrders.length > 0) saveUserOrders(recentOrders);
    if (deliveryLocation?.area) {
      saveUserLocation({ area: deliveryLocation.area, street: deliveryLocation.street || "" });
    }
    if (userProfileText) {
      const isNew = /NEW CUSTOMER/i.test(userProfileText);
      const m = userProfileText.match(/(\d+) previous orders, total spent Rs ([\d,]+)/);
      const favM = userProfileText.match(/Favourite items: ([^.]*)/);
      saveUserProfile({
        name: userName,
        phone: userPhone || enteredPhone || undefined,
        totalOrders: m ? parseInt(m[1], 10) : isNew ? 0 : getUserOrders().length,
        totalSpent: m ? parseInt(m[2].replace(/,/g, ""), 10) : 0,
        favourites: favM
          ? favM[1].split(",").map((s) => s.replace(/\s*\(\d+x\)\s*/, "").trim()).filter(Boolean)
          : [],
        isNew,
      });
    }
  }, [isOpen, recentOrders, deliveryLocation, userProfileText, userName, userPhone, enteredPhone]);

  // Reveal the agent: Munchi walks in once the call is answered.
  const revealAgent = useCallback(() => {
    setAgentVisible(true);
  }, []);

  const setStatusBoth = (s: Status) => {
    statusRef.current = s;
    setStatus(s);
    // Drive Munchi's expressions from the same status funnel.
    const m = munchiRef.current;
    if (!m) return;
    if (s === "listening") {
      m.setState("listening");
      m.setMood("neutral");
    } else if (s === "thinking") {
      m.setState("thinking");
      m.setMood("thinking");
    } else if (s === "speaking") m.setState("speaking");
    else if (s === "error") {
      m.setState("error");
      m.setMood("concerned");
    } else if (s === "idle") {
      m.setState("idle");
      m.setMood("neutral");
    }
    // "calling" keeps Munchi hidden; "done" is handled in finishOrder
    // (celebrate only when the order really placed).
  };

  // Phone-ring tone while the call is connecting: a classic dual-tone
  // ring (440 Hz + 480 Hz), 1s ring + 2s pause, repeating until the agent
  // answers. Built with Web Audio so no sound file is needed.
  const stopRinging = useCallback(() => {
    ringStopRef.current = true;
    if (ringTimerRef.current !== null) {
      clearTimeout(ringTimerRef.current);
      ringTimerRef.current = null;
    }
    try {
      void audioCtxRef.current?.close();
    } catch {
      /* noop */
    }
    audioCtxRef.current = null;
  }, []);

  const startRinging = useCallback(() => {
    try {
      // Reuse the context primed by the call button tap (a real gesture) —
      // a fresh context created here would start suspended and stay silent.
      let ctx = getAudioContext();
      if (!ctx) {
        primeAudio();
        ctx = getAudioContext();
      }
      if (!ctx) return;
      audioCtxRef.current = ctx;
      ringStopRef.current = false;
      if (ctx.state === "suspended") {
        void ctx.resume();
        // If the browser still blocks sound, resume on the next tap.
        const kick = () => {
          void ctx.resume();
        };
        window.addEventListener("pointerdown", kick, { once: true });
      }
      const ringCycle = () => {
        if (ringStopRef.current || !openRef.current) return;
        // One ring burst with a soft fade in/out to avoid clicks.
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.12, now + 0.05);
        gain.gain.setValueAtTime(0.12, now + 0.95);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1);
        [440, 480].forEach((freq) => {
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.value = freq;
          osc.connect(gain);
          osc.start(now);
          osc.stop(now + 1);
        });
        ringTimerRef.current = window.setTimeout(ringCycle, 3000);
      };
      ringCycle();
    } catch {
      /* noop */
    }
  }, []);

  // Stop neural-voice playback for one utterance (keeps the TTS context
  // alive for the next utterance in the same call).
  const cleanupTtsAudio = useCallback(() => {
    if (ttsRafRef.current !== null) {
      cancelAnimationFrame(ttsRafRef.current);
      ttsRafRef.current = null;
    }
    try {
      ttsSourceRef.current?.disconnect();
    } catch {
      /* noop */
    }
    ttsSourceRef.current = null;
    ttsAnalyserRef.current = null;
    const audio = ttsAudioRef.current;
    ttsAudioRef.current = null;
    if (audio) {
      try {
        audio.pause();
      } catch {
        /* noop */
      }
      audio.src = "";
    }
    if (ttsUrlRef.current) {
      try {
        URL.revokeObjectURL(ttsUrlRef.current);
      } catch {
        /* noop */
      }
      ttsUrlRef.current = null;
    }
    const hook = (window as unknown as { __voiceSpeak?: { mode: string; playing: boolean } })
      .__voiceSpeak;
    if (hook) hook.playing = false;
  }, []);

  const stopAll = useCallback(() => {
    // Invalidate any in-flight turn so late fetch/recorder callbacks stop.
    turnRef.current += 1;
    stopRinging();
    cleanupTtsAudio();
    // Reset the phone popup completely: a stale pending order or entered
    // number must never leak into the NEXT call and place the old order.
    setShowPhonePopup(false);
    setPhonePopupClosing(false);
    setEnteredPhone("");
    setPhoneInput("");
    setPhoneError("");
    pendingOrderRef.current = null;
    locationPromptFiredRef.current = false;
    try {
      if (ttsCtxRef.current && ttsCtxRef.current.state !== "closed") void ttsCtxRef.current.close();
    } catch {
      /* noop */
    }
    ttsCtxRef.current = null;
    munchiRef.current?.reset();
    setProductFrame(null);
    if (maxRecTimerRef.current !== null) {
      clearTimeout(maxRecTimerRef.current);
      maxRecTimerRef.current = null;
    }
    if (silenceRafRef.current !== null) {
      cancelAnimationFrame(silenceRafRef.current);
      silenceRafRef.current = null;
    }
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    } catch {
      /* noop */
    }
    recorderRef.current = null;
    audioChunksRef.current = [];
    mediaStreamRef.current?.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {
        /* noop */
      }
    });
    mediaStreamRef.current = null;
    try {
      void analysisCtxRef.current?.close();
    } catch {
      /* noop */
    }
    analysisCtxRef.current = null;
    analyserRef.current = null;
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* noop */
    }
  }, [stopRinging, cleanupTtsAudio]);

  const endCall = useCallback(() => {
    stopAll();
    onClose();
  }, [stopAll, onClose]);

  // Wait until the phone has loaded its TTS voices (on Android they arrive
  // asynchronously — speaking before that can stay silent). Gives up after 1s.
  const ensureVoices = useCallback(async () => {
    if (!("speechSynthesis" in window)) return;
    if (window.speechSynthesis.getVoices().length > 0) return;
    await new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (!done) {
          done = true;
          resolve();
        }
      };
      try {
        window.speechSynthesis.addEventListener("voiceschanged", finish, { once: true });
      } catch {
        /* noop */
      }
      setTimeout(finish, 1000);
    });
  }, []);

  // Fallback voice: the phone's own speechSynthesis (robotic on many
  // Android phones, but always available). Used only when the neural
  // voice endpoint fails. `finish` is the shared guarded completion.
  const speakWithPhoneVoice = useCallback(
    async (text: string, finish: () => void) => {
      if (!("speechSynthesis" in window)) {
        finish();
        return;
      }
      await ensureVoices();
      if (!openRef.current) return;
      // On Android, cancel() right before speak() can swallow the new
      // utterance — only cancel if something is speaking, then wait a beat.
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        await new Promise((r) => setTimeout(r, 120));
        if (!openRef.current) return;
      }
      const hook = ((window as unknown as { __voiceSpeak?: { mode: string; playing: boolean } })
        .__voiceSpeak ||= { mode: "phone", playing: false });
      hook.mode = "phone";
      hook.playing = true;
      const u = new SpeechSynthesisUtterance(text);
      const voice = pickVoice();
      if (voice) u.voice = voice;
      u.lang = voice?.lang || "ur-PK";
      // Natural pace (user 28 Nov 09:07: "itna bhi tez na ho or itna slow
      // bhi na ho") — 1.0 is normal human speed; 1.15 was rushed.
      u.rate = 1.0;
      u.pitch = 1;
      let retried = false;
      // Real lip-sync: Chrome fires onboundary once per spoken word — each
      // word pulses Munchi's jaw open (see munchiController.ts).
      u.onboundary = (e) => {
        if (e.name === "word") munchiRef.current?.noteWord(e.charLength ?? 4);
      };
      u.onend = finish;
      u.onerror = () => {
        if (!retried) {
          // Retry once with the same male Urdu voice. Never fall back
          // to the browser default — on many phones that is a female
          // English voice, which the user forbade.
          retried = true;
          const retryVoice = pickVoice();
          if (!retryVoice) {
            finish();
            return;
          }
          const u2 = new SpeechSynthesisUtterance(text);
          u2.voice = retryVoice;
          u2.lang = "ur-PK";
          u2.rate = 1.0;
          u2.pitch = 1;
          u2.onboundary = (e) => {
            if (e.name === "word") munchiRef.current?.noteWord(e.charLength ?? 4);
          };
          u2.onend = finish;
          u2.onerror = finish;
          setStatusBoth("speaking");
          munchiRef.current?.noteSpeechStart();
          window.speechSynthesis.speak(u2);
          return;
        }
        finish();
      };
      setStatusBoth("speaking");
      munchiRef.current?.noteSpeechStart();
      window.speechSynthesis.speak(u);
    },
    [ensureVoices],
  );

  // Speak a reply with the NEURAL voice: the text is synthesised to real
  // audio by /api/voice-speak (Gemini 2.5 Flash TTS, voice Achird — friendly
  // male, the user said "Voice bhi uski"; Edge TTS Asad is the fallback
  // while no Gemini key is configured) and played back as a file. Munchi's jaw follows the TRUE volume through
  // an AnalyserNode (driveMouth), not a guess. If the endpoint fails for
  // any reason, the phone voice above takes over so the call never goes
  // silent mid-sentence.
  const speak = useCallback(
    async (text: string, onEnd?: () => void) => {
      // The agent is answering — stop the ring tone first.
      stopRinging();
      if (!openRef.current) return;
      const turnAtStart = turnRef.current;
      let done = false;
      let watchdog: number | null = null;
      const finish = () => {
        if (done) return;
        done = true;
        if (watchdog !== null) {
          clearTimeout(watchdog);
          watchdog = null;
        }
        cleanupTtsAudio();
        munchiRef.current?.noteSpeechEnd();
        if (openRef.current) setStatusBoth("idle");
        onEnd?.();
      };
      setStatusBoth("speaking");
      munchiRef.current?.noteSpeechStart();
      // Watchdog: if the utterance never finishes (hung fetch, silent
      // audio, speechSynthesis stall), force completion after 30s so the
      // call never freezes in "speaking".
      watchdog = window.setTimeout(() => {
        if (!done) finish();
      }, 30000);
      try {
        // Retry once if TTS fails (a single blip must not silence Munchi).
        let res: Response | null = null;
        let ttsErr: unknown = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          if (!openRef.current || turnRef.current !== turnAtStart) return;
          if (attempt > 0) await new Promise((r) => setTimeout(r, 1200));
          try {
            res = await fetch(apiUrl("/api/voice-speak"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text }),
              signal: AbortSignal.timeout(30000),
            });
            if (!res.ok) throw new Error(`voice-speak failed: ${res.status}`);
            break;
          } catch (e) {
            ttsErr = e;
            res = null;
          }
        }
        if (!res) throw ttsErr ?? new Error("voice-speak failed");
        if (!openRef.current || turnRef.current !== turnAtStart) return;
        const blob = await res.blob();
        if (!blob || blob.size < 100) throw new Error("empty speech audio");
        if (!openRef.current || turnRef.current !== turnAtStart) return;
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        ttsAudioRef.current = audio;
        ttsUrlRef.current = url;
        // Frame-by-frame lip-sync: this reply's text + the audio's real
        // duration build the word-by-word viseme schedule, armed the
        // moment playback actually starts (the 'playing' event), so the
        // mouth never runs ahead of the voice. If the duration is not
        // known yet at 'playing' (blob metadata can lag), wait for
        // 'loadedmetadata' instead of arming with a wrong duration — a
        // schedule built from a bad duration is what made the mouth run
        // out of sync with the narration.
        const armViseme = () => {
          if (audio.duration && isFinite(audio.duration)) {
            munchiRef.current?.noteSpeechStart(text, audio.duration);
          }
        };
        audio.addEventListener("playing", armViseme, { once: true });
        audio.addEventListener("loadedmetadata", armViseme, { once: true });
        // Route the audio through an analyser when the context runs; if
        // the browser keeps it suspended, play plainly and let the
        // word-paced fallback pulse (noteSpeechStart) move the jaw.
        let analyserOn = false;
        try {
          const Ctx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (Ctx) {
            let ctx = ttsCtxRef.current;
            if (!ctx || ctx.state === "closed") {
              ctx = new Ctx();
              ttsCtxRef.current = ctx;
            }
            if (ctx.state === "suspended") {
              try {
                await ctx.resume();
              } catch {
                /* noop */
              }
            }
            if (ctx.state === "running") {
              const analyser = ctx.createAnalyser();
              analyser.fftSize = 2048;
              const src = ctx.createMediaElementSource(audio);
              src.connect(analyser);
              analyser.connect(ctx.destination);
              ttsSourceRef.current = src;
              ttsAnalyserRef.current = analyser;
              analyserOn = true;
            }
          }
        } catch {
          analyserOn = false;
        }
        const hook = ((window as unknown as { __voiceSpeak?: { mode: string; playing: boolean } })
          .__voiceSpeak ||= { mode: "neural", playing: false });
        hook.mode = "neural";
        hook.playing = true;
        (hook as { analyser?: boolean }).analyser = analyserOn;
        audio.onended = finish;
        audio.onerror = () => {
          if (!done) {
            cleanupTtsAudio();
            speakWithPhoneVoice(text, finish);
          }
        };
        if (analyserOn) {
          const data = new Uint8Array(2048);
          const tick = () => {
            const analyser = ttsAnalyserRef.current;
            if (!analyser || done) return;
            analyser.getByteTimeDomainData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) {
              const v = (data[i] - 128) / 128;
              sum += v * v;
            }
            const rms = Math.sqrt(sum / data.length);
            const target = rms < 0.006 ? 0 : Math.min(0.95, 0.12 + rms * 9);
            munchiRef.current?.driveMouth(target);
            ttsRafRef.current = requestAnimationFrame(tick);
          };
          ttsRafRef.current = requestAnimationFrame(tick);
        }
        try {
          await audio.play();
        } catch {
          if (!done) {
            cleanupTtsAudio();
            speakWithPhoneVoice(text, finish);
          }
        }
        return; // finish() fires when the audio ends
      } catch {
        // Neural voice unavailable — fall through to the phone voice.
      }
      if (!openRef.current || turnRef.current !== turnAtStart) return;
      speakWithPhoneVoice(text, finish);
    },
    [stopRinging, speakWithPhoneVoice, cleanupTtsAudio],
  );

  const finishOrder = useCallback(
    async (order: VoiceOrder) => {
      // No phone number on file yet — show the number popup first; the
      // order is placed once the 11-digit number is entered (submitPhone).
      // Prefer the phone passed with the order (submitPhone's validated
      // digits) — state updates are async and enteredPhone may not have
      // flushed yet when this runs.
      const phone = order.phone || userPhone || enteredPhone || "";
      if (!phone) {
        pendingOrderRef.current = order;
        setShowPhonePopup(true);
        return;
      }
      let result: VoiceOrderResult;
      try {
        result = await onOrderReady({ ...order, phone });
      } catch {
        // A failed order (e.g. Firestore/quota error) must never strand
        // the call screen on "done" — say so and let the user retry.
        speak("Maaf kijiye, order place nahi hua. Dobara koshish karein.", () => {
          if (openRef.current) setStatusBoth("idle");
        });
        return;
      }
      if (result.ok) {
        // "done" only once the order really placed.
        setStatusBoth("done");
        setPlacedOrder(order);
        // Order confirmed — Munchi celebrates (thumbs-up is baked into his photo).
        munchiRef.current?.setState("order_confirmed");
        munchiRef.current?.setMood("happy");
        // Show what was just ordered.
        const first = order.items?.[0];
        if (first) {
          const hit = findProductInText(first.name, menuItems);
          if (hit) setProductFrame(hit);
        }
        // Let the agent's spoken confirmation finish, then end the call.
        // A note (unmatched items / split order) is spoken first, with a
        // longer wait so it is not cut off.
        if (result.note) speak(result.note);
        setTimeout(() => {
          if (openRef.current) endCall();
        }, result.note ? 6000 : 2500);
      } else if (result.needsSignIn) {
        speak("آرڈر پلیس کرنے کے لیے پہلے سائن ان کریں۔ میں آپ کو سائن ان پر لے جا رہا ہوں۔", () => {
          if (openRef.current) {
            onClose();
            onOpenAuth();
          }
        });
      } else {
        // Speak the real reason when the order handler gave one (e.g. the
        // Easypaisa receipt error), not just the generic retry line.
        speak(result.message || "Maaf kijiye, order place nahi hua. Dobara koshish karein.", () => {
          if (openRef.current) setStatusBoth("idle");
        });
      }
    },
    [onOrderReady, speak, endCall, onClose, onOpenAuth, menuItems, userPhone, enteredPhone],
  );

  // Phone popup OK: a full 11-digit number (03xxxxxxxxx) dismisses the
  // popup with an animation, then the pending order is placed. An
  // incomplete number shakes the popup, shows the error, and the voice
  // asks for the complete number.
  const submitPhone = useCallback(() => {
    const digits = phoneInput.replace(/\D/g, "").slice(0, 11);
    if (digits.length !== 11 || !digits.startsWith("03")) {
      setPhoneError("Poora 11-digit number likhein, sir.");
      setShakeKey((k) => k + 1);
      speak("Poora number batayein, sir.", () => {
        if (openRef.current) startListeningRef.current();
      });
      return;
    }
    setEnteredPhone(digits);
    setPhoneError("");
    setPhonePopupClosing(true);
    window.setTimeout(() => {
      setShowPhonePopup(false);
      setPhonePopupClosing(false);
      const order = pendingOrderRef.current;
      pendingOrderRef.current = null;
      if (order) finishOrder({ ...order, phone: digits });
    }, 280);
  }, [phoneInput, speak, finishOrder]);

  // All Groq keys exhausted (or not configured): tell the customer the
  // line is busy, then end the call — there is no retry button on screen.
  const speakBusyAndEnd = useCallback(() => {
    speak(LINE_BUSY, () => {
      if (openRef.current) {
        window.setTimeout(() => {
          if (openRef.current) endCall();
        }, 1200);
      }
    });
  }, [speak, endCall]);

  // Ask GROQ (chat): the reply comes from the real menu + orders, sent
  // with every request so the model never invents prices.
  const sendToGroq = useCallback(
    async (history: ChatMsg[], turn: number) => {
      setStatusBoth("thinking");
      try {
        // Retry twice on a transient network blip (slow/flaky mobile data):
        // a single failed request must not kill the turn with "internet ka
        // masla hai" — only three consecutive failures say that.
        let res: Response | null = null;
        let lastErr: unknown = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          if (!openRef.current || turn !== turnRef.current) return;
          if (attempt > 0) await new Promise((r) => setTimeout(r, 1500));
          try {
            res = await fetch(apiUrl("/api/voice-chat"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                messages: history.map((m) => ({ role: m.role, content: m.text })),
                menuText,
                ordersText,
                // Call-screen language choice — the reply rules follow it.
                language: callLanguageRef.current,
                userName: userName || undefined,
                userPhone: userPhone || enteredPhone || undefined,
                userProfileText: profileText,
                activeOrderText: activeOrderText || undefined,
                locationText: deliveryLocation
                  ? deliveryLocation.street
                    ? `${deliveryLocation.area}, ${deliveryLocation.street}`
                    : deliveryLocation.area
                  : undefined,
              }),
              signal: AbortSignal.timeout(45000),
            });
            break;
          } catch (e) {
            lastErr = e;
            res = null;
          }
        }
        if (!res) throw lastErr ?? new Error("voice-chat failed");
        if (!openRef.current || turn !== turnRef.current) return;
        if (res.status === 503) {
          speakBusyAndEnd();
          return;
        }
        if (!res.ok) throw new Error(`voice-chat failed: ${res.status}`);
        const data = await res.json();
        // The model returned an order that failed validation — never speak
        // its thank-you reply (the order was NOT placed). Ask for the
        // details again instead.
        const say = data?.orderInvalid
          ? "Maaf kijiye, order ki tafseel poori nahi hui — dobara batayein, main note kar loon ga."
          : typeof data?.reply === "string"
            ? data.reply.trim()
            : "";
        if (!say) {
          speak(UNCLEAR_SPEECH, () => {
            if (openRef.current) startListeningRef.current();
          });
          return;
        }
        const next = [...history, { role: "assistant" as const, text: say }];
        messagesRef.current = next.slice(-12);
        // Wear the face that fits this reply — happy, funny, concerned, or neutral.
        munchiRef.current?.setMood(classifyMood(say));
        // The agent's reply named a dish — frame that one in Munchi's hand.
        const hit = findProductInText(say, menuItems);
        if (hit) setProductFrame(hit);
        // Location missing and the agent just asked for it — open the
        // browser's location popup (the native dialog appears on top of
        // the call). Matches Roman Urdu ("location on kar dein"), Roman
        // Sindhi ("location on kayo") and Urdu script. Fires at most once
        // per call, so a denied prompt is never re-shown on every turn.
        if (
          !deliveryLocation &&
          !locationPromptFiredRef.current &&
          (/location\s+on\s+(kar|kayo|karein|kare|karo|karain)/i.test(say) ||
            say.includes("لوکیشن آن"))
        ) {
          locationPromptFiredRef.current = true;
          onRequestLocation();
        }
        // Phone missing and the agent just asked for the number — show the
        // stylish number popup right here in the call.
        if (!userPhone && !enteredPhone && /نمبر|number/i.test(say)) {
          setShowPhonePopup(true);
        }
        // The agent answered — he walks in and starts talking.
        revealAgent();
        // A natural human-like pause before answering (user 28 Nov 09:07:
        // "itna bhi tez na ho or itna slow bhi na ho" — not rushed, not
        // slow). 700ms is a normal conversational beat — long enough to
        // feel human, short enough to never feel delayed. It also lets the
        // agent's walk-in animation play.
        window.setTimeout(() => {
          if (!openRef.current || turn !== turnRef.current) return;
          if (data?.order) {
            speak(say, () => finishOrder(data.order as VoiceOrder));
          } else {
            speak(say, () => {
              if (openRef.current && statusRef.current !== "done") startListeningRef.current();
            });
          }
        }, 700);
      } catch {
        if (!openRef.current || turn !== turnRef.current) return;
        speak(NETWORK_PROBLEM, () => {
          if (openRef.current) setStatusBoth("idle");
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [menuText, ordersText, userName, userPhone, enteredPhone, deliveryLocation, speak, revealAgent, speakBusyAndEnd, menuItems, onRequestLocation],
  );

  // Transcribe the recorded audio (Groq Whisper), then chat with Groq.
  const transcribeAndChat = useCallback(
    async (blob: Blob, turn: number) => {
      setStatusBoth("thinking");
      try {
        // Name the file from the actual recording format: Safari records
        // MP4, and Groq/Whisper detects the format from the extension —
        // MP4 bytes named .webm fail transcription on every iPhone.
        const ext = blob.type.includes("mp4") ? "voice.mp4" : "voice.webm";
        // Retry once on a transient network blip (slow/flaky mobile data):
        // a single failed upload must not kill the turn with "internet ka
        // masla hai" — only two consecutive failures say that.
        let tRes: Response | null = null;
        let lastErr: unknown = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          if (!openRef.current || turn !== turnRef.current) return;
          if (attempt > 0) await new Promise((r) => setTimeout(r, 1500));
          try {
            const fd = new FormData();
            fd.append("audio", blob, ext);
            tRes = await fetch(apiUrl("/api/voice-transcribe"), {
              method: "POST",
              body: fd,
              signal: AbortSignal.timeout(45000),
            });
            break;
          } catch (e) {
            lastErr = e;
            tRes = null;
          }
        }
        if (!tRes) throw lastErr ?? new Error("voice-transcribe failed");
        if (!openRef.current || turn !== turnRef.current) return;
        if (tRes.status === 503) {
          speakBusyAndEnd();
          return;
        }
        if (!tRes.ok) throw new Error(`voice-transcribe failed: ${tRes.status}`);
        const tData = await tRes.json();
        const text = typeof tData?.text === "string" ? tData.text.trim() : "";
        if (!text) {
          speak(UNCLEAR_SPEECH, () => {
            if (openRef.current) startListeningRef.current();
          });
          return;
        }
        // Spoken phone number: on a voice call the user naturally SAYS
        // the digits. Capture an 11-digit 03 number from the transcript
        // so a voice-first user is never stuck on the typing popup.
        if (!userPhone && !enteredPhone) {
          const spoken = text.replace(/[\s-]/g, "").match(/0?3\d{9}/);
          if (spoken) {
            const digits = spoken[0].startsWith("03") ? spoken[0] : `0${spoken[0]}`;
            if (digits.length === 11) {
              setEnteredPhone(digits);
              setPhoneInput(digits);
            }
          }
        }
        const next = [...messagesRef.current, { role: "user" as const, text }];
        messagesRef.current = next.slice(-12);
        // The customer named a dish — frame it in Munchi's hand right away.
        const hit = findProductInText(text, menuItems);
        if (hit) setProductFrame(hit);
        await sendToGroq(messagesRef.current, turn);
      } catch {
        if (!openRef.current || turn !== turnRef.current) return;
        speak(NETWORK_PROBLEM, () => {
          if (openRef.current) setStatusBoth("idle");
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [speak, sendToGroq, speakBusyAndEnd, menuItems, userPhone, enteredPhone],
  );

  // Silence watch (best-effort): stop the recording after ~1.2s of quiet.
  // The analyser context may stay suspended on some phones — then the
  // 15s hard cap ends the turn instead.
  const startSilenceWatch = (stream: MediaStream, onSilence: () => void): void => {
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      let ctx = analysisCtxRef.current;
      if (!ctx) {
        ctx = new AC();
        analysisCtxRef.current = ctx;
      }
      void ctx.resume().catch(() => undefined);
      window.setTimeout(() => {
        if (!openRef.current || !recorderRef.current || !analysisCtxRef.current) return;
        const runningCtx = analysisCtxRef.current;
        if (runningCtx.state !== "running") return;
        try {
          // Disconnect the previous turn's nodes first — a new source is
          // created every listening turn and the old ones never went away.
          try {
            silenceSourceRef.current?.disconnect();
          } catch {
            /* noop */
          }
          try {
            analyserRef.current?.disconnect();
          } catch {
            /* noop */
          }
          const source = runningCtx.createMediaStreamSource(stream);
          const analyser = runningCtx.createAnalyser();
          analyser.fftSize = 512;
          source.connect(analyser);
          silenceSourceRef.current = source;
          analyserRef.current = analyser;
          const data = new Uint8Array(analyser.fftSize);
          let silenceSince: number | null = null;
          const tick = () => {
            if (!openRef.current || !recorderRef.current) return;
            analyser.getByteTimeDomainData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) {
              const v = (data[i] - 128) / 128;
              sum += v * v;
            }
            const rms = Math.sqrt(sum / data.length);
            const now = performance.now();
            if (rms < SILENCE_RMS) {
              if (silenceSince === null) silenceSince = now;
              else if (now - silenceSince > SILENCE_MS) {
                onSilence();
                return;
              }
            } else {
              silenceSince = null;
            }
            silenceRafRef.current = requestAnimationFrame(tick);
          };
          silenceRafRef.current = requestAnimationFrame(tick);
        } catch {
          /* silence watch is best-effort */
        }
      }, 300);
    } catch {
      /* silence watch is best-effort */
    }
  };

  // Listen with the microphone: MediaRecorder captures audio (NOT
  // window.SpeechRecognition). Stops on ~1.2s silence or after 15s.
  const startListening = useCallback(async () => {
    if (!openRef.current) return;
    const turn = ++turnRef.current;
    if (!("MediaRecorder" in window) || !navigator.mediaDevices?.getUserMedia) {
      setStatusBoth("error");
      speak(NO_VOICE_INPUT, () => {
        if (openRef.current) setStatusBoth("idle");
      });
      return;
    }
    try {
      let stream = mediaStreamRef.current;
      if (!stream || stream.getAudioTracks().every((t) => t.readyState === "ended")) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
      }
      if (!openRef.current || turn !== turnRef.current) return;
      const mimeType =
        ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", ""].find(
          (m) => m === "" || MediaRecorder.isTypeSupported(m),
        ) ?? "";
      const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = rec;
      audioChunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        if (maxRecTimerRef.current !== null) {
          clearTimeout(maxRecTimerRef.current);
          maxRecTimerRef.current = null;
        }
        if (silenceRafRef.current !== null) {
          cancelAnimationFrame(silenceRafRef.current);
          silenceRafRef.current = null;
        }
        if (!openRef.current || turn !== turnRef.current) return;
        const blob = new Blob(audioChunksRef.current, { type: rec.mimeType || "audio/webm" });
        audioChunksRef.current = [];
        if (blob.size < 1000) {
          speak(UNCLEAR_SPEECH, () => {
            if (openRef.current) startListeningRef.current();
          });
          return;
        }
        transcribeAndChatRef.current(blob, turn);
      };
      setStatusBoth("listening");
      rec.start(250);
      startSilenceWatch(stream, () => {
        try {
          if (rec.state !== "inactive") rec.stop();
        } catch {
          /* noop */
        }
      });
      maxRecTimerRef.current = window.setTimeout(() => {
        try {
          if (rec.state !== "inactive") rec.stop();
        } catch {
          /* noop */
        }
      }, MAX_RECORD_MS);
    } catch (err) {
      if (!openRef.current || turn !== turnRef.current) return;
      const name = (err as { name?: string })?.name || "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setStatusBoth("error");
        speak(MIC_DENIED, () => {
          if (openRef.current) setStatusBoth("idle");
        });
      } else {
        speak(NETWORK_PROBLEM, () => {
          if (openRef.current) setStatusBoth("idle");
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speak]);

  transcribeAndChatRef.current = transcribeAndChat;
  startListeningRef.current = startListening;

  // A location arrived (user allowed it) — the agent may ask again on a
  // later call if it ever goes missing again.
  useEffect(() => {
    if (deliveryLocation) locationPromptFiredRef.current = false;
  }, [deliveryLocation]);

  // Start the call when the modal opens: greet, then listen (hands-free).
  useEffect(() => {
    if (!isOpen) return;
    openRef.current = true;
    // Test/debug hook: lets Playwright drive Munchi's lip-sync directly.
    (window as unknown as { __munchi?: MunchiController }).__munchi = munchiRef.current ?? undefined;
    messagesRef.current = [];
    setPlacedOrder(null);
    // Fresh call, fresh phone state — nothing from a previous call leaks in.
    setShowPhonePopup(false);
    setPhonePopupClosing(false);
    setEnteredPhone("");
    setPhoneInput("");
    setPhoneError("");
    pendingOrderRef.current = null;
    locationPromptFiredRef.current = false;
    // Munchi is absent until he answers — then he walks in.
    setAgentVisible(false);
    setStatusBoth("calling");
    // Ring like a real phone call until the agent answers.
    startRinging();
    try {
      window.speechSynthesis?.getVoices();
    } catch {
      /* noop */
    }
    // Fixed greeting in the chosen language (no API call) — then listen
    // hands-free. Ring for 2 seconds first, then the agent picks up and
    // speaks first.
    const greeting = callLanguageRef.current === "sd" ? GREETING_SD : GREETING_UR;
    const t = setTimeout(() => {
      messagesRef.current = [{ role: "assistant" as const, text: greeting }];
      // The agent answered — he walks in with a big smile and greets the user.
      revealAgent();
      munchiRef.current?.setMood("happy");
      speak(greeting, () => {
        if (openRef.current) startListening();
      });
    }, 2000);
    return () => {
      clearTimeout(t);
      openRef.current = false;
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Focus trap + ESC to end the call (a11y fix 27 Nov 2026). ESC goes
  // through endCall — not onClose directly — so ringing/TTS/listening are
  // stopped before the modal closes. Must sit above the `if (!isOpen)`
  // early return below so the hook order never changes.
  useFocusTrap(dialogRef, isOpen, endCall);

  if (!isOpen) return null;

  // Status card text (the white card from the design).
  const cardTitle =
    status === "calling"
      ? "Connecting..."
      : status === "listening"
        ? "Listening..."
        : status === "thinking"
          ? "Soch raha hoon..."
          : status === "speaking"
            ? "Bol raha hoon..."
            : status === "done"
              ? placedOrder
                ? "Order place ho gaya!"
                : "Order tayyar hai"
              : status === "error"
                ? "Connection mein masla"
                : "Connected";
  const cardSub =
    status === "calling"
      ? "Please wait, our agent will be with you shortly..."
      : status === "listening"
        ? "Munchi is listening..."
        : status === "thinking"
          ? "Munchi is thinking..."
          : status === "speaking"
            ? "Munchi is speaking..."
            : status === "done"
              ? "Shukriya! Order place ho gaya."
              : status === "error"
                ? "Dobara koshish karo — main yahin hoon"
                : "";

  return (
    <div
      ref={dialogRef}
      className="animate-call-modal-in fixed inset-0 z-[70] flex flex-col overflow-hidden text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Dadu Food voice call"
      tabIndex={-1}
      style={{
        background:
          "radial-gradient(130% 100% at 50% 0%, #ff5da2 0%, #E21B70 55%, #a80e50 100%)",
      }}
    >
      {/* Pink wave blobs */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-[#ff8fbe]/50 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 bottom-40 h-80 w-80 rounded-full bg-[#8f0a44]/60 blur-3xl" />

      {/* Top pill: Call Agent + close */}
      <div className="relative z-10 flex justify-center px-5 pt-6">
        <div className="flex w-full max-w-[420px] items-center gap-3 rounded-full bg-[#ff2e93] px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
          <Phone className="h-6 w-6 shrink-0 text-white" aria-hidden="true" />
          <span className="flex-1 text-center text-[22px] font-bold leading-none text-white">
            Call Agent
          </span>
          <button
            onClick={endCall}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/25 text-white active:scale-95"
            aria-label="Close call"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Language choice (user 28 Nov 09:02): Sindhi or Urdu — the customer
          taps whichever they want; the choice is saved on the phone. Sindhi
          is Roman Sindhi (Latin letters) so the voice can actually speak it. */}
      <div className="relative z-10 flex justify-center px-5 pt-3">
        <div className="flex w-full max-w-[420px] gap-2" role="group" aria-label="Choose language">
          <button
            type="button"
            onClick={() => setCallLanguage("ur")}
            aria-pressed={callLanguage === "ur"}
            className={`flex-1 rounded-full py-2.5 text-[16px] font-bold transition-all active:scale-95 ${
              callLanguage === "ur"
                ? "bg-white text-[#E21B70] shadow-[0_6px_18px_rgba(0,0,0,0.3)]"
                : "bg-white/20 text-white/90"
            }`}
          >
            اردو · Urdu
          </button>
          <button
            type="button"
            onClick={() => setCallLanguage("sd")}
            aria-pressed={callLanguage === "sd"}
            className={`flex-1 rounded-full py-2.5 text-[16px] font-bold transition-all active:scale-95 ${
              callLanguage === "sd"
                ? "bg-white text-[#E21B70] shadow-[0_6px_18px_rgba(0,0,0,0.3)]"
                : "bg-white/20 text-white/90"
            }`}
          >
            سنڌي · Sindhi
          </button>
        </div>
      </div>

      {/* Middle: Munchi — absent while connecting, walks in once the
          agent answers, then listens, thinks and talks with a live jaw. */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4">
        {agentVisible && munchiRef.current && (
          <MunchiCharacter controller={munchiRef.current} visible={agentVisible} product={productFrame} />
        )}

        {/* Status card */}
        <div className="relative z-10 -mt-10 w-full max-w-[400px] rounded-[28px] bg-white/95 px-6 py-5 text-center shadow-[0_12px_32px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-center gap-3">
            <Phone className="h-8 w-8 shrink-0 text-[#22c55e]" aria-hidden="true" />
            <span className="text-[26px] font-bold leading-tight text-[#1e293b]">
              {cardTitle}
            </span>
          </div>
          <p className="mt-1 text-[15px] leading-snug text-[#334155]">{cardSub}</p>
          <div className="mt-3 flex items-center justify-center gap-2" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="animate-dot-bounce h-2.5 w-2.5 rounded-full bg-[#E21B70]"
                style={{ animationDelay: `${i * 0.14}s` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: ONE option — end the call */}
      <div className="relative z-10 flex flex-col items-center gap-3 pb-10 pt-2">
        <button
          onClick={endCall}
          className="flex h-[76px] w-[76px] cursor-pointer items-center justify-center rounded-full bg-[#e11d48] shadow-[0_0_0_10px_rgba(225,29,72,0.18)] transition-transform active:scale-95"
          aria-label="End call"
        >
          <PhoneOff className="h-9 w-9 text-white" />
        </button>
      </div>

      {/* Phone-number popup: stylish spring-in card. OK with a full
          11-digit number springs out; an incomplete number shakes and
          the voice asks for the complete number. */}
      {showPhonePopup && (
        <>
          <style>{`
            @keyframes phone-popup-in { from { opacity: 0; transform: translateY(24px) scale(.92); } to { opacity: 1; transform: translateY(0) scale(1); } }
            @keyframes phone-popup-out { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(16px) scale(.94); } }
            @keyframes phone-shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-5px); } 80% { transform: translateX(5px); } }
          `}</style>
          <div
            className="absolute inset-x-0 bottom-32 z-20 flex justify-center px-5"
            style={{ animation: phonePopupClosing ? "phone-popup-out .28s ease-in both" : "phone-popup-in .35s cubic-bezier(.34,1.56,.64,1) both" }}
          >
            <div
              key={shakeKey}
              style={shakeKey > 0 ? { animation: "phone-shake .4s ease-in-out" } : undefined}
              className="w-full max-w-[400px] rounded-[28px] bg-white/95 px-6 py-5 text-center shadow-[0_16px_40px_rgba(0,0,0,0.4)] ring-2 ring-[#E21B70]/40"
            >
              <div className="flex items-center justify-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E21B70]">
                  <Phone className="h-6 w-6 text-white" aria-hidden="true" />
                </span>
                <span className="text-[20px] font-bold leading-tight text-[#1e293b]">
                  Apna mobile number likhein
                </span>
              </div>
              <p className="mt-1 text-[14px] leading-snug text-[#334155]">
                Order confirm karne ke liye 11-digit number zaroori hai.
              </p>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                autoFocus
                value={phoneInput}
                onChange={(e) => {
                  setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 11));
                  if (phoneError) setPhoneError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitPhone();
                }}
                placeholder="03xx-xxxxxxx"
                className="mt-4 w-full rounded-2xl border-2 border-[#E21B70]/30 bg-white px-4 py-3 text-center text-[24px] font-bold tracking-[0.2em] text-[#1e293b] outline-none placeholder:text-[#94a3b8] focus:border-[#E21B70]"
                aria-label="Mobile number, 11 digits"
              />
              <div className="mt-1 flex items-center justify-between px-1 text-[13px] font-semibold">
                <span className={phoneError ? "text-[#e11d48]" : "text-[#64748b]"}>
                  {phoneError || "11 digits, 03 se shuru"}
                </span>
                <span className="text-[#64748b]">{phoneInput.replace(/\D/g, "").length}/11</span>
              </div>
              <button
                onClick={submitPhone}
                className="mt-3 w-full rounded-full bg-[#E21B70] py-3 text-[18px] font-bold text-white shadow-[0_8px_20px_rgba(226,27,112,0.45)] transition-transform active:scale-95"
              >
                OK — Confirm karein
              </button>
              <button
                onClick={() => {
                  pendingOrderRef.current = null;
                  setShowPhonePopup(false);
                  setPhoneError("");
                }}
                className="mt-2 w-full min-h-[44px] py-1 text-[15px] font-semibold text-[#64748b]"
              >
                Order cancel karein
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
