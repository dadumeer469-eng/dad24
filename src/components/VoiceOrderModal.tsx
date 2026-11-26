import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Phone, PhoneOff, X } from "lucide-react";
import type { LocalMenuItem, LocalOrder } from "../utils/voiceAgentLocal";
import { getAudioContext, primeAudio } from "../utils/primeAudio";

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
  userName?: string;
  userPhone?: string;
}

type Status = "idle" | "calling" | "listening" | "thinking" | "speaking" | "done" | "error";

interface ChatMsg {
  role: "user" | "assistant";
  text: string;
}

const GREETING = "السلام علیکم! میں دادو فوڈ کی وائس اسسٹنٹ ہوں۔ آپ کیا آرڈر کرنا چاہیں گے؟";
const UNCLEAR_SPEECH = "معاف کیجیے، پھر سے بولیں۔";
const MIC_DENIED = "مائیکروفون کی اجازت دیں — براؤزر کی ایڈریس بار میں مائیک آئیکن پر ٹیپ کریں۔";
const NO_VOICE_INPUT = "آپ کا فون وائس ان پٹ سپورٹ نہیں کرتا۔ کروم استعمال کریں۔";
const NETWORK_PROBLEM = "انٹرنیٹ کا مسئلہ لگتا ہے — دوبارہ کوشش کریں۔";
const LINE_BUSY = "معاف کیجیے، لائن ابھی مصروف ہے — تھوڑی دیر بعد دوبارہ کوشش کریں۔";
const MAX_RECORD_MS = 15000;
const SILENCE_MS = 1200;
const SILENCE_RMS = 0.02;

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
  userName,
  userPhone,
}: VoiceOrderModalProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [placedOrder, setPlacedOrder] = useState<VoiceOrder | null>(null);
  // The agent girl stays hidden while the call connects; she walks in the
  // moment the agent answers, then talks with a nod and a waving hand.
  const [agentVisible, setAgentVisible] = useState(false);
  const [walkInDone, setWalkInDone] = useState(false);

  const messagesRef = useRef<ChatMsg[]>([]);
  const statusRef = useRef<Status>("idle");
  const openRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringStopRef = useRef(false);
  const ringTimerRef = useRef<number | null>(null);
  const walkInTimerRef = useRef<number | null>(null);
  const turnRef = useRef(0);

  // Groq flow: MediaRecorder + Whisper, no SpeechRecognition.
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analysisCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceRafRef = useRef<number | null>(null);
  const maxRecTimerRef = useRef<number | null>(null);
  const startListeningRef = useRef<() => void>(() => {});
  const transcribeAndChatRef = useRef<(blob: Blob, turn: number) => void>(() => {});

  // Menu + orders as text for the Groq system prompt (source of truth —
  // the model never invents prices; it only uses these lines).
  const menuText = useMemo(
    () => menuItems.map((i) => `${i.name} — Rs ${i.price} — ${i.type}`).join("\n"),
    [menuItems],
  );
  const ordersText = useMemo(() => {
    if (recentOrders.length === 0) return "";
    return recentOrders
      .map((o) => {
        const items = o.items.map((i) => `${i.qty} ${i.name}`).join(", ");
        const mins = Math.max(0, Math.floor((Date.now() - o.placedAtMs) / 60000));
        return `Order ${o.id}: ${items} — Rs ${o.total} — status ${o.status} — placed ${mins} min ago — payment ${o.payment} — ${o.speed}`;
      })
      .join("\n");
  }, [recentOrders]);

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

  const stopAll = useCallback(() => {
    // Invalidate any in-flight turn so late fetch/recorder callbacks stop.
    turnRef.current += 1;
    stopRinging();
    if (walkInTimerRef.current !== null) {
      clearTimeout(walkInTimerRef.current);
      walkInTimerRef.current = null;
    }
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
      // On Android, cancel() right before speak() can swallow the new
      // utterance — only cancel if something is speaking, then wait a beat.
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        await new Promise((r) => setTimeout(r, 120));
        if (!openRef.current) return;
      }
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
          // but not installed — retry once with the browser's default
          // voice and no language set, so *some* voice is heard.
          retried = true;
          const u2 = new SpeechSynthesisUtterance(text);
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
        const res = await fetch("/api/voice-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history.map((m) => ({ role: m.role, content: m.text })),
            menuText,
            ordersText,
            userName: userName || undefined,
            userPhone: userPhone || undefined,
          }),
          signal: AbortSignal.timeout(30000),
        });
        if (!openRef.current || turn !== turnRef.current) return;
        if (res.status === 503) {
          speakBusyAndEnd();
          return;
        }
        if (!res.ok) throw new Error(`voice-chat failed: ${res.status}`);
        const data = await res.json();
        const say = typeof data?.reply === "string" ? data.reply.trim() : "";
        if (!say) {
          speak(UNCLEAR_SPEECH, () => {
            if (openRef.current) startListeningRef.current();
          });
          return;
        }
        const next = [...history, { role: "assistant" as const, text: say }];
        messagesRef.current = next.slice(-12);
        // The agent answered — she walks in and starts talking.
        revealAgent();
        // A short human-like pause before answering (and it lets the
        // agent's walk-in animation play).
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
    [menuText, ordersText, userName, userPhone, speak, revealAgent, speakBusyAndEnd],
  );

  // Transcribe the recorded audio (Groq Whisper), then chat with Groq.
  const transcribeAndChat = useCallback(
    async (blob: Blob, turn: number) => {
      setStatusBoth("thinking");
      try {
        const fd = new FormData();
        fd.append("audio", blob, "voice.webm");
        const tRes = await fetch("/api/voice-transcribe", {
          method: "POST",
          body: fd,
          signal: AbortSignal.timeout(30000),
        });
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
        const next = [...messagesRef.current, { role: "user" as const, text }];
        messagesRef.current = next.slice(-12);
        await sendToGroq(messagesRef.current, turn);
      } catch {
        if (!openRef.current || turn !== turnRef.current) return;
        speak(NETWORK_PROBLEM, () => {
          if (openRef.current) setStatusBoth("idle");
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [speak, sendToGroq, speakBusyAndEnd],
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
          const source = runningCtx.createMediaStreamSource(stream);
          const analyser = runningCtx.createAnalyser();
          analyser.fftSize = 512;
          source.connect(analyser);
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
    // Fixed Urdu greeting (no API call) — then listen hands-free.
    const t = setTimeout(() => {
      messagesRef.current = [{ role: "assistant" as const, text: GREETING }];
      // The agent answered — she walks in and greets the user.
      revealAgent();
      speak(GREETING, () => {
        if (openRef.current) startListening();
      });
    }, 400);
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
