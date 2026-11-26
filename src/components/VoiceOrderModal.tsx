import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, PhoneOff } from "lucide-react";

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
  menuText: string;
  ordersText: string;
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
  return (
    voices.find((v) => v.lang?.toLowerCase().startsWith("sd")) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith("ur")) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith("en")) ||
    voices[0] ||
    null
  );
}

function formatCallTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function VoiceOrderModal({
  isOpen,
  onClose,
  menuText,
  ordersText,
  isSignedIn,
  onOpenAuth,
  onOrderReady,
}: VoiceOrderModalProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [recogLang, setRecogLang] = useState("sd-PK");
  const [callSeconds, setCallSeconds] = useState(0);
  const [placedOrder, setPlacedOrder] = useState<VoiceOrder | null>(null);

  const recogRef = useRef<Recog | null>(null);
  const messagesRef = useRef<ChatMsg[]>([]);
  const statusRef = useRef<Status>("idle");
  const openRef = useRef(false);
  const callStartRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringStopRef = useRef(false);
  const ringTimerRef = useRef<number | null>(null);

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
      u.lang = voice?.lang || "sd-PK";
      u.rate = 1;
      u.pitch = 1;
      let retried = false;
      u.onend = finish;
      u.onerror = () => {
        if (!retried) {
          // Some phones stay silent when a Sindhi/Urdu voice is requested
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

  const sendToAgent = useCallback(
    async (history: ChatMsg[]) => {
      setStatusBoth("thinking");
      try {
        const resp = await fetch("/api/voice-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, menu: menuText, orders: ordersText }),
          // Fail fast instead of hanging silently while the model is slow.
          signal: AbortSignal.timeout(45000),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const say: string = data?.say || "";
        const next = [...history, { role: "assistant" as const, text: say }];
        messagesRef.current = next;
        if (data?.done && data?.order) {
          speak(say, () => finishOrder(data.order as VoiceOrder));
        } else {
          speak(say, () => {
            if (openRef.current && statusRef.current !== "done") startListening();
          });
        }
      } catch {
        // No message bubbles — say it out loud like a human would, then stay
        // on the call so the user can try speaking again.
        setStatusBoth("error");
        speak("Maaf kajo, connection mein masla aahe. Mehrbani kare wari galhayo.", () => {
          if (openRef.current) startListening();
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [menuText, ordersText, speak],
  );

  const startListening = useCallback(() => {
    const SR =
      (window as unknown as { SpeechRecognition?: new () => Recog; webkitSpeechRecognition?: new () => Recog })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => Recog }).webkitSpeechRecognition;
    if (!SR) {
      setStatusBoth("error");
      speak("Tawhan jo phone voice input support na tho kare. Chrome use kayo.", () => {
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
        speak("Microphone ji permission diyo — browser ji address bar mein mic icon te tap kayo.", () => {
          if (openRef.current) setStatusBoth("idle");
        });
      } else if (e.error === "language-not-supported" && recogLang === "sd-PK") {
        setRecogLang("ur-PK");
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
        speak("Order place karan lai pehriyan sign in kayo. Main tawhan khe sign in te wathi tho.", () => {
          if (openRef.current) {
            onClose();
            onOpenAuth();
          }
        });
      } else {
        speak("Maaf kajo, order place na thiyo. Mehrbani kare wari koshish kayo.", () => {
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
    setCallSeconds(0);
    callStartRef.current = Date.now();
    setStatusBoth("calling");
    // Ring like a real phone call until the agent answers.
    startRinging();
    try {
      window.speechSynthesis?.getVoices();
    } catch {
      /* noop */
    }
    const timer = setInterval(() => {
      setCallSeconds(Math.floor((Date.now() - callStartRef.current) / 1000));
    }, 1000);
    const greet = async () => {
      try {
        const resp = await fetch("/api/voice-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              {
                role: "user",
                text: "(The customer just opened the voice assistant. Greet them warmly in Sindhi, introduce yourself as Dadu Food's voice assistant, and ask what they would like to order.)",
              },
            ],
            menu: menuText,
            orders: ordersText,
          }),
          // Fail fast instead of hanging silently while the model is slow.
          signal: AbortSignal.timeout(45000),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const say: string = data?.say || "Assalam-o-Alaikum! Main Dadu Food jo voice assistant aahiyan.";
        const next = [{ role: "assistant" as const, text: say }];
        messagesRef.current = next;
        speak(say, () => {
          if (openRef.current) startListening();
        });
      } catch {
        setStatusBoth("error");
        speak("Maaf kajo, connection mein masla aahe. Mehrbani kare wari koshish kayo.", () => {
          if (openRef.current) setStatusBoth("idle");
        });
      }
    };
    const t = setTimeout(greet, 400);
    return () => {
      clearTimeout(t);
      clearInterval(timer);
      openRef.current = false;
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const statusLine =
    status === "calling"
      ? "Ringing..."
      : status === "listening"
        ? "Sunn raha hoon..."
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

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-[#1a0b12] text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Dadu Food voice call"
      style={{
        background:
          "radial-gradient(120% 90% at 50% 0%, #E21B70 0%, #7a0e3e 55%, #1a0b12 100%)",
      }}
    >
      {/* Top: who you are calling */}
      <div className="flex flex-col items-center pt-14 px-6">
        <div className="relative">
          <div className="w-28 h-28 rounded-full bg-white/15 border border-white/30 flex items-center justify-center">
            <Bot className="w-14 h-14 text-white" />
          </div>
          {(status === "speaking" || status === "listening") && (
            <span
              className="absolute inset-0 rounded-full border-2 border-white/50 animate-ping"
              aria-hidden="true"
            />
          )}
        </div>
        <p className="font-bold text-[24px] leading-tight mt-5">Dadu Food</p>
        <p className="text-white/80 text-[15px] mt-1">Voice Assistant • Sindhi</p>
        <p className="text-white/90 text-[15px] font-medium mt-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#4ade80] inline-block" aria-hidden="true" />
          {statusLine}
        </p>
        <p className="text-white/60 text-[14px] mt-1 tabular-nums">
          {formatCallTime(callSeconds)}
        </p>
      </div>

      {/* Middle: voice waveform (no messages, no transcript) */}
      <div className="flex-1 flex items-center justify-center px-8" aria-hidden="true">
        <div className="flex items-center gap-1.5 h-14">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <span
              key={i}
              className={`w-1.5 rounded-full bg-white ${
                status === "speaking" || status === "listening" ? "animate-voice-wave" : "opacity-30"
              }`}
              style={{
                height: status === "speaking" || status === "listening" ? undefined : "10px",
                animationDelay: `${i * 0.11}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Bottom: ONE option — end the call */}
      <div className="pb-12 pt-4 flex flex-col items-center gap-4">
        <button
          onClick={endCall}
          className="w-[76px] h-[76px] rounded-full bg-[#e11d48] hover:bg-[#c81e42] shadow-[0_0_0_10px_rgba(225,29,72,0.18)] flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
          aria-label="End call"
        >
          <PhoneOff className="w-9 h-9 text-white" />
        </button>
        <p className="text-white/70 text-[13.5px]">Call cut karan lai dabayo</p>
      </div>
    </div>
  );
}
