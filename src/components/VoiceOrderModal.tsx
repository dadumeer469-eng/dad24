import { useCallback, useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, X } from "lucide-react";
import {
  createLocalVoiceAgent,
  type LocalMenuItem,
  type LocalOrder,
  type LocalVoiceAgent,
} from "../utils/voiceAgentLocal";

export interface VoiceOrderItem {
  name: string;
  qty: number;
  type: "food" | "grocery";
}

export interface VoiceOrder {
  items: VoiceOrderItem[];
  address: { area: string; street: string };
  payment: "COD" | "Easypaisa";
}

export interface VoiceOrderResult {
  ok: boolean;
  orderId?: string;
  message?: string;
  needsSignIn?: boolean;
}

interface VoiceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: LocalMenuItem[];
  recentOrders: LocalOrder[];
  isSignedIn: boolean;
  onOpenAuth: () => void;
  onOrderReady: (order: VoiceOrder) => Promise<VoiceOrderResult>;
}

type Status = "idle" | "calling" | "listening" | "thinking" | "speaking" | "done" | "error";

interface ChatMsg {
  role: "user" | "assistant";
  text: string;
}

// Minimal SpeechRecognition typings (not in the standard TS lib).
type Recog = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function pickVoice(): SpeechSynthesisVoice | null {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  // Urdu first (natural Urdu voice), then Sindhi, then English, then default.
  return (
    voices.find((v) => v.lang?.toLowerCase() === "ur-pk") ||
    voices.find((v) => v.lang?.toLowerCase().startsWith("ur")) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith("sd")) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith("en")) ||
    voices[0] ||
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
}: VoiceOrderModalProps) {
  const [status, setStatus] = useState<Status>("idle");
  // Urdu speech recognition — the phone's built-in Urdu voice, no API key.
  const [recogLang, setRecogLang] = useState("ur-PK");
  const [placedOrder, setPlacedOrder] = useState<VoiceOrder | null>(null);
  // The local voice agent (no API): all site knowledge lives in the code.
  const agentRef = useRef<LocalVoiceAgent | null>(null);
  // The agent girl stays hidden while the call connects; she walks in the
  // moment the agent answers, then talks with a nod and a waving hand.
  const [agentVisible, setAgentVisible] = useState(false);
  const [walkInDone, setWalkInDone] = useState(false);

  const recogRef = useRef<Recog | null>(null);
  const messagesRef = useRef<ChatMsg[]>([]);
  const statusRef = useRef<Status>("idle");
  const openRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringStopRef = useRef(false);
  const ringTimerRef = useRef<number | null>(null);
  const walkInTimerRef = useRef<number | null>(null);

  // Reveal the agent: she walks in, then settles into her idle/talking loop.
  const revealAgent = useCallback(() => {
    setAgentVisible(true);
    if (walkInTimerRef.current !== null) clearTimeout(walkInTimerRef.current);
    walkInTimerRef.current = window.setTimeout(() => setWalkInDone(true), 1400);
  }, []);

  const setStatusBoth = (s: Status) => {
    statusRef.current = s;
    setStatus(s);
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
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      ringStopRef.current = false;
      if (ctx.state === "suspended") void ctx.resume();
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

  const stopAll = useCallback(() => {
    stopRinging();
    if (walkInTimerRef.current !== null) {
      clearTimeout(walkInTimerRef.current);
      walkInTimerRef.current = null;
    }
    try {
      recogRef.current?.abort();
    } catch {
      /* noop */
    }
    recogRef.current = null;
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* noop */
    }
  }, [stopRinging]);

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

  const speak = useCallback(
    async (text: string, onEnd?: () => void) => {
      // The agent is answering — stop the ring tone first.
      stopRinging();
      if (!("speechSynthesis" in window)) {
        onEnd?.();
        return;
      }
      await ensureVoices();
      if (!openRef.current) return;
      window.speechSynthesis.cancel();
      const finish = () => {
        if (openRef.current) setStatusBoth("idle");
        onEnd?.();
      };
      const u = new SpeechSynthesisUtterance(text);
      const voice = pickVoice();
      if (voice) u.voice = voice;
      u.lang = voice?.lang || "ur-PK";
      u.rate = 1;
      u.pitch = 1;
      let retried = false;
      u.onend = finish;
      u.onerror = () => {
        if (!retried) {
          // Some phones stay silent when an Urdu voice is requested
          // but not installed — retry once with the default voice.
          retried = true;
          const u2 = new SpeechSynthesisUtterance(text);
          u2.lang = "ur-PK";
          u2.rate = 1;
          u2.pitch = 1;
          u2.onend = finish;
          u2.onerror = finish;
          setStatusBoth("speaking");
          window.speechSynthesis.speak(u2);
          return;
        }
        finish();
      };
      setStatusBoth("speaking");
      window.speechSynthesis.speak(u);
    },
    [ensureVoices, stopRinging],
  );

  // Ask the LOCAL agent (no API key, no network): the answer comes from
  // the site's own menu, orders and knowledge, built into the code.
  const sendToAgent = useCallback(
    (history: ChatMsg[]) => {
      setStatusBoth("thinking");
      const lastUser = [...history].reverse().find((m) => m.role === "user");
      const text = lastUser?.text ?? "";
      // A short human-like pause before answering (and it lets the
      // agent's walk-in animation play).
      window.setTimeout(() => {
        if (!openRef.current) return;
        const agent = agentRef.current;
        if (!agent) return;
        const data = agent.reply(text);
        const say: string = data.say || "";
        const next = [...history, { role: "assistant" as const, text: say }];
        messagesRef.current = next;
        // The agent answered — she walks in and starts talking.
        revealAgent();
        if (data.done && data.order) {
          speak(say, () => finishOrder(data.order as VoiceOrder));
        } else {
          speak(say, () => {
            if (openRef.current && statusRef.current !== "done") startListening();
          });
        }
      }, 700);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [speak],
  );

  const startListening = useCallback(() => {
    const SR =
      (window as unknown as { SpeechRecognition?: new () => Recog; webkitSpeechRecognition?: new () => Recog })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => Recog }).webkitSpeechRecognition;
    if (!SR) {
      setStatusBoth("error");
      speak("آپ کا فون وائس ان پٹ سپورٹ نہیں کرتا۔ کروم استعمال کریں۔", () => {
        if (openRef.current) setStatusBoth("idle");
      });
      return;
    }
    try {
      recogRef.current?.abort();
    } catch {
      /* noop */
    }
    const rec = new SR() as Recog;
    recogRef.current = rec;
    rec.lang = recogLang;
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const text = e.results?.[0]?.[0]?.transcript || "";
      recogRef.current = null;
      if (text.trim()) {
        const next = [...messagesRef.current, { role: "user" as const, text: text.trim() }];
        messagesRef.current = next;
        sendToAgent(next);
      } else {
        startListening();
      }
    };
    rec.onerror = (e) => {
      recogRef.current = null;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setStatusBoth("error");
        speak("مائیکروفون کی اجازت دیں — براؤزر کی ایڈریس بار میں مائیک آئیکن پر ٹیپ کریں۔", () => {
          if (openRef.current) setStatusBoth("idle");
        });
      } else if (e.error === "language-not-supported" && recogLang === "ur-PK") {
        // Urdu recognition is not on this phone — fall back to the
        // browser's default speech language and try again.
        setRecogLang("");
        setTimeout(() => startListening(), 300);
      } else if (e.error === "no-speech" || e.error === "aborted") {
        if (openRef.current) setStatusBoth("idle");
      } else {
        if (openRef.current) setStatusBoth("idle");
      }
    };
    rec.onend = () => {
      recogRef.current = null;
    };
    setStatusBoth("listening");
    try {
      rec.start();
    } catch {
      setStatusBoth("idle");
    }
  }, [recogLang, sendToAgent, speak]);

  const finishOrder = useCallback(
    async (order: VoiceOrder) => {
      setStatusBoth("done");
      const result = await onOrderReady(order);
      if (result.ok) {
        setPlacedOrder(order);
        // Let the agent's spoken confirmation finish, then end the call.
        setTimeout(() => {
          if (openRef.current) endCall();
        }, 2500);
      } else if (result.needsSignIn) {
        speak("آرڈر پلیس کرنے کے لیے پہلے سائن ان کریں۔ میں آپ کو سائن ان پر لے جا رہا ہوں۔", () => {
          if (openRef.current) {
            onClose();
            onOpenAuth();
          }
        });
      } else {
        speak("معاف کیجیے، آرڈر پلیس نہیں ہوا۔ دوبارہ کوشش کریں۔", () => {
          if (openRef.current) setStatusBoth("idle");
        });
      }
    },
    [onOrderReady, speak, endCall, onClose, onOpenAuth],
  );

  // Start the call when the modal opens: greet, then listen (hands-free).
  useEffect(() => {
    if (!isOpen) return;
    openRef.current = true;
    messagesRef.current = [];
    setPlacedOrder(null);
    // The agent is absent until she answers — then she walks in.
    setAgentVisible(false);
    setWalkInDone(false);
    setStatusBoth("calling");
    // Ring like a real phone call until the agent answers.
    startRinging();
    try {
      window.speechSynthesis?.getVoices();
    } catch {
      /* noop */
    }
    // No API, no waiting on a server: the local agent greets at once.
    const greet = () => {
      const agent = createLocalVoiceAgent(menuItems, recentOrders);
      agentRef.current = agent;
      const data = agent.greet();
      const next = [{ role: "assistant" as const, text: data.say }];
      messagesRef.current = next;
      // The agent answered — she walks in and greets the user.
      revealAgent();
      speak(data.say, () => {
        if (openRef.current) startListening();
      });
    };
    const t = setTimeout(greet, 400);
    return () => {
      clearTimeout(t);
      openRef.current = false;
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
        ? "Bolo — main sunn raha hoon"
        : status === "thinking"
          ? "Agent jawab soch raha hai..."
          : status === "speaking"
            ? "Agent bol raha hai — suno"
            : status === "done"
              ? "Shukriya! Order place ho gaya."
              : status === "error"
                ? "Dobara koshish karo — main yahin hoon"
                : "";

  // Agent motion: walks in once the API answers, then nods while talking
  // and breathes gently while listening.
  const agentMotionClass = !walkInDone
    ? "animate-agent-walk-in"
    : status === "speaking"
      ? "animate-agent-talk"
      : "animate-agent-breathe";

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col overflow-hidden text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Dadu Food voice call"
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
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/25 text-white active:scale-95"
            aria-label="Close call"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Middle: the agent girl — absent while connecting, walks in once
          the API answers, then talks with a nod and a waving hand. */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4">
        {agentVisible && (
          <div className={`relative w-full max-w-[400px] ${agentMotionClass}`}>
            <div className="relative aspect-[710/637] w-full overflow-hidden rounded-[28px]">
              <img
                src="/images/voice-agent.jpg"
                alt="Dadu Food voice agent"
                className="h-full w-full object-cover"
                draggable={false}
              />
              {/* Waving hand layer, aligned exactly over the hand in the photo. */}
              <img
                src="/images/voice-agent-hand.png"
                alt=""
                aria-hidden="true"
                draggable={false}
                className={status === "speaking" && walkInDone ? "animate-hand-wave" : undefined}
                style={{
                  position: "absolute",
                  left: "78.2%",
                  top: "46.6%",
                  width: "21.8%",
                  height: "42.4%",
                  transformOrigin: "35% 76%",
                }}
              />
            </div>
          </div>
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
    </div>
  );
}
