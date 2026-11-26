import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Loader2,
  LogIn,
  Mic,
  MicOff,
  Phone,
  User,
  Volume2,
  X,
} from "lucide-react";

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

type Status = "idle" | "listening" | "thinking" | "speaking" | "done" | "error";

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
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [recogLang, setRecogLang] = useState("sd-PK");
  const [placedOrder, setPlacedOrder] = useState<VoiceOrder | null>(null);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState<VoiceOrder | null>(null);
  const [placing, setPlacing] = useState(false);

  const recogRef = useRef<Recog | null>(null);
  const messagesRef = useRef<ChatMsg[]>([]);
  const statusRef = useRef<Status>("idle");
  const openRef = useRef(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

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
      setError(null);
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
        setMessages(next);
        if (data?.done && data?.order) {
          speak(say, () => finishOrder(data.order as VoiceOrder));
        } else {
          speak(say, () => {
            if (openRef.current && statusRef.current !== "done") startListening();
          });
        }
      } catch {
        setError("Connection mein masla aahe. Mehrbani kare wari koshish kayo.");
        setStatusBoth("error");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [menuText, speak],
  );

  const startListening = useCallback(() => {
    const SR =
      (window as unknown as { SpeechRecognition?: new () => Recog; webkitSpeechRecognition?: new () => Recog })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => Recog }).webkitSpeechRecognition;
    if (!SR) {
      setError("Tawhan jo browser voice input support na tho kare. Chrome use kayo.");
      setStatusBoth("error");
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
        setMessages(next);
        sendToAgent(next);
      } else {
        startListening();
      }
    };
    rec.onerror = (e) => {
      recogRef.current = null;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("Microphone ji permission diyo — browser ji address bar mein mic icon te tap kayo.");
        setStatusBoth("error");
      } else if (e.error === "language-not-supported" && recogLang === "sd-PK") {
        setRecogLang("ur-PK");
        setTimeout(() => startListening(), 300);
      } else if (e.error === "no-speech" || e.error === "aborted") {
        // Stay ready; user can tap the mic again.
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
  }, [recogLang, sendToAgent]);

  const finishOrder = useCallback(
    async (order: VoiceOrder) => {
      setStatusBoth("done");
      setPlacing(true);
      setPendingOrder(order);
      const result = await onOrderReady(order);
      setPlacing(false);
      if (result.ok) {
        setPlacedOrder(order);
        setPlacedOrderId(result.orderId || null);
        setPendingOrder(null);
      } else if (result.needsSignIn) {
        setPendingOrder(order);
        setError("Order place karan lai pehriyan sign in kayo.");
      } else {
        setPendingOrder(order);
        setError(result.message || "Order place na thiyo. Mehrbani kare wari koshish kayo.");
      }
    },
    [onOrderReady],
  );

  const retryPlaceOrder = useCallback(async () => {
    if (!pendingOrder) return;
    setError(null);
    setPlacing(true);
    const result = await onOrderReady(pendingOrder);
    setPlacing(false);
    if (result.ok) {
      setPlacedOrder(pendingOrder);
      setPlacedOrderId(result.orderId || null);
      setPendingOrder(null);
    } else if (result.needsSignIn) {
      setError("Order place karan lai pehriyan sign in kayo.");
    } else {
      setError(result.message || "Order place na thiyo. Mehrbani kare wari koshish kayo.");
    }
  }, [pendingOrder, onOrderReady]);

  // Start the conversation when the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    openRef.current = true;
    messagesRef.current = [];
    setMessages([]);
    setError(null);
    setPlacedOrder(null);
    setPlacedOrderId(null);
    setPendingOrder(null);
    setPlacing(false);
    setStatusBoth("idle");
    // Warm up voices (some browsers load them async).
    try {
      window.speechSynthesis?.getVoices();
    } catch {
      /* noop */
    }
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
        setMessages(next);
        speak(say, () => {
          if (openRef.current) startListening();
        });
      } catch {
        setError("Connection mein masla aahe. Mehrbani kare wari koshish kayo.");
        setStatusBoth("error");
      }
    };
    const t = setTimeout(greet, 350);
    return () => {
      clearTimeout(t);
      openRef.current = false;
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Auto-scroll the transcript.
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  // Retry a pending order automatically once the user signs in.
  useEffect(() => {
    if (isSignedIn && pendingOrder && !placedOrder && status === "done") {
      retryPlaceOrder();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  if (!isOpen) return null;

  const statusText =
    status === "listening"
      ? "Bolo... main sunhan tho"
      : status === "thinking"
        ? "Sochhan tho..."
        : status === "speaking"
          ? "Bolhan tho..."
          : status === "done"
            ? placedOrder
              ? "Order place thi wayo!"
              : "Order tayyar aahe"
            : "Mic dabayo ta galhayo";

  const micActive = status === "listening" || status === "speaking";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Dadu Food voice assistant"
    >
      <div
        className="w-full sm:max-w-md bg-[#fdfbf7] sm:rounded-[28px] rounded-t-[28px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — brand pink gradient */}
        <div className="bg-[#E21B70] px-5 pt-5 pb-6 text-white relative shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-[17px] leading-tight">Dadu Food Voice Assistant</p>
              <p className="text-white/85 text-[13px] leading-tight mt-0.5">
                Sindhi mein galhayo — order AI khud place kando
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          {/* Speaking waveform */}
          <div className="flex items-center gap-1 h-8 mt-4 justify-center" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <span
                key={i}
                className={`w-1.5 rounded-full bg-white ${status === "speaking" ? "animate-voice-wave" : "opacity-40"}`}
                style={{
                  height: status === "speaking" ? undefined : "8px",
                  animationDelay: `${i * 0.12}s`,
                }}
              />
            ))}
          </div>
          <p className="text-center text-white/90 text-[13px] font-medium mt-1">{statusText}</p>
        </div>

        {/* Transcript */}
        <div ref={transcriptRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[180px]">
          {messages.length === 0 && status !== "error" && (
            <p className="text-center text-[#8a8378] text-sm py-6">
              Assistant tawhan saan Sindhi mein galhayo tho...
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-[#E21B70]/10 border border-[#E21B70]/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-[#E21B70]" />
                </div>
              )}
              <div
                className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-[14.5px] leading-relaxed ${
                  m.role === "user"
                    ? "bg-[#E21B70] text-white rounded-br-md"
                    : "bg-white text-[#2b2723] border border-[#e8e2d6] rounded-bl-md shadow-sm"
                }`}
              >
                {m.text}
              </div>
              {m.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-[#2b2723]/8 border border-[#e8e2d6] flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-[#6b655c]" />
                </div>
              )}
            </div>
          ))}
          {status === "thinking" && (
            <div className="flex gap-2 justify-start">
              <div className="w-7 h-7 rounded-full bg-[#E21B70]/10 border border-[#E21B70]/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-[#E21B70]" />
              </div>
              <div className="bg-white border border-[#e8e2d6] rounded-2xl rounded-bl-md shadow-sm px-3.5 py-3">
                <Loader2 className="w-4 h-4 text-[#E21B70] animate-spin" />
              </div>
            </div>
          )}
        </div>

        {/* Error / sign-in notice */}
        {error && (
          <div className="mx-4 mb-3 px-3.5 py-2.5 rounded-xl bg-[#fff3f3] border border-[#f5c6c6] text-[#a33] text-[13.5px] leading-snug shrink-0">
            {error}
          </div>
        )}
        {!isSignedIn && status !== "done" && (
          <div className="mx-4 mb-3 px-3.5 py-2.5 rounded-xl bg-[#fff8e6] border border-[#f0d9a0] text-[#7a5b00] text-[13.5px] leading-snug flex items-center gap-2 shrink-0">
            <LogIn className="w-4 h-4 shrink-0" />
            <span className="flex-1">Order place karan lai sign in zaroori aahe.</span>
            <button
              onClick={onOpenAuth}
              className="shrink-0 px-3 py-1.5 rounded-full bg-[#E21B70] text-white text-[13px] font-semibold cursor-pointer"
            >
              Sign In
            </button>
          </div>
        )}

        {/* Placed order summary */}
        {placedOrder && (
          <div className="mx-4 mb-3 rounded-2xl border border-[#cdebc9] bg-[#f2fbf0] p-4 shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#2e7d32]" />
              <p className="font-bold text-[15px] text-[#2e7d32]">Order place thi wayo!</p>
            </div>
            {placedOrderId && (
              <p className="text-[13px] text-[#4a5a48] mt-1">Order ID: {placedOrderId}</p>
            )}
            <div className="mt-2 space-y-1">
              {placedOrder.items.map((it, i) => (
                <p key={i} className="text-[14px] text-[#2b2723]">
                  {it.qty} × {it.name}
                </p>
              ))}
            </div>
            <p className="text-[13.5px] text-[#6b655c] mt-2">
              {placedOrder.address.area}, {placedOrder.address.street} •{" "}
              {placedOrder.payment === "COD" ? "Cash on Delivery" : "Easypaisa"}
            </p>
          </div>
        )}

        {/* Pending order — retry */}
        {pendingOrder && !placedOrder && status === "done" && (
          <div className="mx-4 mb-3 shrink-0">
            <button
              onClick={retryPlaceOrder}
              disabled={placing}
              className="w-full py-3 rounded-full bg-[#E21B70] text-white font-bold text-[15px] active:scale-[0.98] cursor-pointer disabled:opacity-60"
            >
              {placing ? "Placing order..." : "Order Place Kayo"}
            </button>
          </div>
        )}

        {/* Mic controls */}
        <div className="px-5 pb-5 pt-1 shrink-0">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => {
                if (status === "listening") {
                  try {
                    recogRef.current?.stop();
                  } catch {
                    /* noop */
                  }
                  setStatusBoth("idle");
                } else if (status === "speaking") {
                  try {
                    window.speechSynthesis?.cancel();
                  } catch {
                    /* noop */
                  }
                  setStatusBoth("idle");
                } else if (status !== "thinking" && status !== "done") {
                  startListening();
                }
              }}
              disabled={status === "thinking" || status === "done"}
              className={`relative w-[72px] h-[72px] rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-transform disabled:opacity-50 ${
                micActive ? "bg-[#E21B70] shadow-[0_0_0_8px_rgba(226,27,112,0.15)]" : "bg-[#E21B70] shadow-lg"
              }`}
              aria-label={status === "listening" ? "Stop listening" : "Tap to speak"}
            >
              {status === "listening" && (
                <span className="absolute inset-0 rounded-full bg-[#E21B70] animate-ping opacity-25" aria-hidden="true" />
              )}
              {status === "listening" ? (
                <MicOff className="w-8 h-8 text-white relative" />
              ) : status === "speaking" ? (
                <Volume2 className="w-8 h-8 text-white relative" />
              ) : (
                <Mic className="w-8 h-8 text-white relative" />
              )}
            </button>
          </div>
          <p className="text-center text-[12.5px] text-[#8a8378] mt-3 flex items-center justify-center gap-1.5">
            <Phone className="w-3.5 h-3.5" />
            Mic dabayo, Sindhi mein order chao — baaki AI kando
          </p>
        </div>
      </div>
    </div>
  );
}
