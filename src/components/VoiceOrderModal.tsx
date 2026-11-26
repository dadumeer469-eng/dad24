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

  const setStatusBoth = (s: Status) => {
    statusRef.current = s;
    setStatus(s);
  };

  const stopAll = useCallback(() => {
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
  }, []);

  const endCall = useCallback(() => {
    stopAll();
    onClose();
  }, [stopAll, onClose]);

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!("speechSynthesis" in window)) {
        onEnd?.();
        return;
      }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const voice = pickVoice();
      if (voice) u.voice = voice;
      u.lang = voice?.lang || "sd-PK";
      u.rate = 1;
      u.pitch = 1;
      u.onend = () => {
        if (openRef.current) setStatusBoth("idle");
        onEnd?.();
      };
      u.onerror = () => {
        if (openRef.current) setStatusBoth("idle");
        onEnd?.();
      };
      setStatusBoth("speaking");
      window.speechSynthesis.speak(u);
    },
    [],
  );

  const sendToAgent = useCallback(
    async (history: ChatMsg[]) => {
      setStatusBoth("thinking");
      try {
        const resp = await fetch("/api/voice-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, menu: menuText, orders: ordersText }),
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
      ? "Calling..."
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
