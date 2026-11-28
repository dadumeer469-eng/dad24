// Chat agent — Munchi as TEXT chat instead of a voice call (user 28 Nov
// 13:39: "call agent ke badle chat agent dalo wo best rahega").
//
// Same brain as the voice agent: POST /api/voice-chat with the same body
// (messages, menuText, ordersText, language, userName, userPhone,
// userProfileText, activeOrderText, locationText) and the same order path
// (onOrderReady). No new server code, no new dependencies. The voice
// modal (VoiceOrderModal.tsx) stays in the repo — the floating phone
// button still opens it; only the home Munchi card opens this chat.
//
// Rules carried over from voice:
// - Reply language follows the call-screen choice (Roman Urdu / Roman
//   Sindhi), saved in localStorage `dadu_munchi_lang`, default "ur".
// - Never invent items/prices — the API + menuText handle that; the client
//   only displays what the API returns.
// - An order is placed only when location + phone are known; if the phone
//   is missing, an inline 11-digit input appears (never ask for PIN/OTP).
// - No AI/Sparkles icon anywhere.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Send, X } from "lucide-react";
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
import { findProductInText, type ProductFrame } from "../utils/munchiProductFrames";
import { apiUrl } from "../utils/apiBase";
import type { VoiceOrder, VoiceOrderResult } from "./VoiceOrderModal";

export interface ChatAgentModalProps {
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

interface ChatAgentMsg {
  id: number;
  role: "user" | "assistant";
  text: string;
  frame?: ProductFrame | null;
  // Inline action shown under this agent message.
  action?: "location" | "phone" | "signin" | null;
}

const GREETING_UR =
  "Assalam-o-Alaikum! Kya haal hain? Main Munchi hoon — aaj kya khilaya jaye aap ko?";
// Roman Sindhi greeting (same as the voice agent — Gemini TTS cannot speak
// Sindhi Arabic script; chat stays in Roman letters too).
const GREETING_SD =
  "Assalam-o-Alaikum! Kiyan haal aahin? Main Munchi aahiyan — aaj tawhan khe cha khaarayo?";
const MUNCHI_LANG_KEY = "dadu_munchi_lang";
type ChatLanguage = "ur" | "sd";
function readSavedLanguage(): ChatLanguage {
  try {
    return localStorage.getItem(MUNCHI_LANG_KEY) === "sd" ? "sd" : "ur";
  } catch {
    return "ur";
  }
}

const NETWORK_PROBLEM =
  "Internet ka masla lag raha hai, dobara try karein.";
const LINE_BUSY =
  "Maaf kijiye, line abhi masroof hai — thodi der baad dobara koshish karein.";
const ORDER_CLARIFY =
  "Maaf kijiye, order ki tafseel poori nahi hui — dobara batayein, main note kar loon ga.";
const ORDER_PLACED =
  "Order place ho gaya! Shukriya — aapka khana 20-35 minute mein pahunchega.";
const ORDER_FAILED =
  "Maaf kijiye, order place nahi hua. Dobara koshish karein.";

let nextMsgId = 1;

export default function ChatAgentModal({
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
}: ChatAgentModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen, onClose);

  const [language, setLanguageState] = useState<ChatLanguage>(() => readSavedLanguage());
  const languageRef = useRef(language);
  const [messages, setMessages] = useState<ChatAgentMsg[]>([]);
  const messagesRef = useRef<ChatAgentMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [enteredPhone, setEnteredPhone] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [placedOrder, setPlacedOrder] = useState<VoiceOrder | null>(null);
  const pendingOrderRef = useRef<VoiceOrder | null>(null);
  const locationPromptFiredRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const setLanguage = useCallback((lang: ChatLanguage) => {
    languageRef.current = lang;
    setLanguageState(lang);
    try {
      localStorage.setItem(MUNCHI_LANG_KEY, lang);
    } catch {
      /* ignore */
    }
  }, []);

  const pushMessages = useCallback((next: ChatAgentMsg[]) => {
    messagesRef.current = next.slice(-12);
    setMessages(messagesRef.current);
  }, []);

  // Same menu/orders/profile text as the voice agent (local-first data).
  const menuText = useMemo(
    () => menuItems.map((i) => `${i.name} — Rs ${i.price} — ${i.type}`).join("\n"),
    [menuItems],
  );
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
  const activeOrderText = useMemo(
    () => buildActiveOrderText(),
    [isOpen, recentOrders],
  );
  const profileText = useMemo(() => {
    const local = buildLocalProfileText();
    return local || userProfileText || undefined;
  }, [userProfileText, isOpen]);

  // Fresh chat on open: the per-language greeting as the first agent
  // message (same words as the voice agent). The greeting is NOT sent to
  // the API — it seeds the history, like the voice call's greeting.
  useEffect(() => {
    if (!isOpen) return;
    const greeting = languageRef.current === "sd" ? GREETING_SD : GREETING_UR;
    const seed: ChatAgentMsg[] = [
      { id: nextMsgId++, role: "assistant", text: greeting, frame: null, action: null },
    ];
    messagesRef.current = seed;
    setMessages(seed);
    setSending(false);
    setPlacedOrder(null);
    pendingOrderRef.current = null;
    locationPromptFiredRef.current = false;
    setPhoneError("");
    // Save the latest user data on the phone, same as the voice modal.
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
    // Focus the input so the keyboard is one tap away.
    window.setTimeout(() => inputRef.current?.focus(), 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Auto-scroll to the latest message.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const finishOrder = useCallback(
    async (order: VoiceOrder) => {
      const phone = order.phone || userPhone || enteredPhone || "";
      // No phone on file yet — show the inline number input and hold the
      // order until the 11-digit number is entered (submitPhone).
      if (!phone) {
        pendingOrderRef.current = order;
        const ask: ChatAgentMsg = {
          id: nextMsgId++,
          role: "assistant",
          text: "Order confirm karne ke liye apna 11-digit mobile number likhein.",
          frame: null,
          action: "phone",
        };
        pushMessages([...messagesRef.current, ask]);
        return;
      }
      let result: VoiceOrderResult;
      try {
        result = await onOrderReady({ ...order, phone });
      } catch {
        const fail: ChatAgentMsg = {
          id: nextMsgId++,
          role: "assistant",
          text: ORDER_FAILED,
          frame: null,
          action: null,
        };
        pushMessages([...messagesRef.current, fail]);
        return;
      }
      if (result.ok) {
        setPlacedOrder(order);
        const done: ChatAgentMsg = {
          id: nextMsgId++,
          role: "assistant",
          text: result.note ? `${ORDER_PLACED} ${result.note}` : ORDER_PLACED,
          frame: null,
          action: null,
        };
        pushMessages([...messagesRef.current, done]);
      } else if (result.needsSignIn) {
        const signin: ChatAgentMsg = {
          id: nextMsgId++,
          role: "assistant",
          text: "Order place karne ke liye pehle sign in karein.",
          frame: null,
          action: "signin",
        };
        pushMessages([...messagesRef.current, signin]);
      } else {
        const fail: ChatAgentMsg = {
          id: nextMsgId++,
          role: "assistant",
          text: result.message || ORDER_FAILED,
          frame: null,
          action: null,
        };
        pushMessages([...messagesRef.current, fail]);
      }
    },
    [onOrderReady, userPhone, enteredPhone, pushMessages],
  );

  const sendChat = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
      const userMsg: ChatAgentMsg = {
        id: nextMsgId++,
        role: "user",
        text: trimmed,
        frame: null,
        action: null,
      };
      const history = [...messagesRef.current, userMsg].slice(-12);
      pushMessages(history);
      setInput("");
      setSending(true);
      try {
        // Retry once on a transient network blip (slow/flaky mobile data).
        let res: Response | null = null;
        let lastErr: unknown = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          if (attempt > 0) await new Promise((r) => setTimeout(r, 1500));
          try {
            res = await fetch(apiUrl("/api/voice-chat"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                messages: history.map((m) => ({ role: m.role, content: m.text })),
                menuText,
                ordersText,
                language: languageRef.current,
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
        if (res.status === 503) {
          const busy: ChatAgentMsg = {
            id: nextMsgId++,
            role: "assistant",
            text: LINE_BUSY,
            frame: null,
            action: null,
          };
          pushMessages([...messagesRef.current, busy]);
          return;
        }
        if (!res.ok) throw new Error(`voice-chat failed: ${res.status}`);
        const data = await res.json();
        // The model returned an order that failed validation — never place
        // it. Show the agent's clarification reply and keep chatting.
        const say =
          typeof data?.reply === "string" && data.reply.trim()
            ? data.reply.trim()
            : data?.orderInvalid
              ? ORDER_CLARIFY
              : "";
        if (!say) {
          const unclear: ChatAgentMsg = {
            id: nextMsgId++,
            role: "assistant",
            text: "Maaf kijiye, samajh nahi aaya — phir se batayein.",
            frame: null,
            action: null,
          };
          pushMessages([...messagesRef.current, unclear]);
          return;
        }
        // The agent's reply named a dish — show that dish's frame card.
        const frame = findProductInText(say, menuItems);
        // Location missing and the agent just asked for it — show the
        // "Apni Location On Karein" button (fires the native popup once).
        let action: ChatAgentMsg["action"] = null;
        if (
          !deliveryLocation &&
          !locationPromptFiredRef.current &&
          (/location\s+on\s+(kar|kayo|karein|kare|karo|karain)/i.test(say) ||
            say.includes("لوکیشن آن"))
        ) {
          locationPromptFiredRef.current = true;
          action = "location";
          onRequestLocation();
        } else if (!userPhone && !enteredPhone && /نمبر|number/i.test(say)) {
          // Phone missing and the agent asked for the number — inline input.
          action = "phone";
        }
        const agentMsg: ChatAgentMsg = {
          id: nextMsgId++,
          role: "assistant",
          text: say,
          frame,
          action,
        };
        const next = [...messagesRef.current, agentMsg].slice(-12);
        pushMessages(next);
        // A real order came back — hand it to the same order flow as voice.
        if (data?.order && !data?.orderInvalid) {
          await finishOrder(data.order as VoiceOrder);
        }
      } catch {
        const err: ChatAgentMsg = {
          id: nextMsgId++,
          role: "assistant",
          text: NETWORK_PROBLEM,
          frame: null,
          action: null,
        };
        pushMessages([...messagesRef.current, err]);
      } finally {
        setSending(false);
        window.setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [
      sending,
      menuText,
      ordersText,
      userName,
      userPhone,
      enteredPhone,
      profileText,
      activeOrderText,
      deliveryLocation,
      menuItems,
      onRequestLocation,
      finishOrder,
      pushMessages,
    ],
  );

  // Inline 11-digit phone input (03xxxxxxxxx). Never ask for PIN/OTP.
  const submitPhone = useCallback(() => {
    const digits = phoneInput.replace(/\D/g, "").slice(0, 11);
    if (digits.length !== 11 || !digits.startsWith("03")) {
      setPhoneError("Poora 11-digit number likhein (03 se shuru).");
      return;
    }
    setEnteredPhone(digits);
    setPhoneError("");
    const confirm: ChatAgentMsg = {
      id: nextMsgId++,
      role: "assistant",
      text: "Shukriya! Number save ho gaya.",
      frame: null,
      action: null,
    };
    pushMessages([...messagesRef.current, confirm]);
    const pending = pendingOrderRef.current;
    pendingOrderRef.current = null;
    if (pending) {
      void finishOrder({ ...pending, phone: digits });
    }
  }, [phoneInput, finishOrder, pushMessages]);

  if (!isOpen) return null;

  const showPhoneInline = !userPhone && !enteredPhone;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Munchi se chat karein"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-[85vh] sm:max-w-[480px] sm:rounded-3xl"
      >
        {/* Header: Munchi photo, name, Online dot, language pills, close */}
        <div className="flex items-center gap-2.5 bg-[#E21B70] px-3 py-2.5 text-white">
          <span className="relative shrink-0">
            <img
              src="/images/munchi.jpg"
              alt="Munchi"
              className="h-11 w-11 rounded-full border-2 border-white object-cover shadow"
            />
            <span
              className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#E21B70] bg-green-400"
              aria-label="Online"
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-black leading-tight">Munchi</span>
            <span className="block text-[11px] font-medium text-white/90 leading-tight">
              Online · Dadu Food chat agent
            </span>
          </span>
          <span className="flex shrink-0 gap-1" role="group" aria-label="Choose language">
            <button
              type="button"
              onClick={() => setLanguage("ur")}
              aria-pressed={language === "ur"}
              className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition active:scale-95 ${
                language === "ur" ? "bg-white text-[#E21B70]" : "bg-white/20 text-white/90"
              }`}
            >
              اردو
            </button>
            <button
              type="button"
              onClick={() => setLanguage("sd")}
              aria-pressed={language === "sd"}
              className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition active:scale-95 ${
                language === "sd" ? "bg-white text-[#E21B70]" : "bg-white/20 text-white/90"
              }`}
            >
              سنڌي
            </button>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-white active:scale-95"
            aria-label="Close chat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[#FFF7FA] px-3 py-3">
          <div className="flex flex-col gap-2.5">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                {/* Dish frame card attached to the agent message */}
                {m.role === "assistant" && m.frame && (
                  <div className="mb-1.5 w-[220px] overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-sm">
                    <img
                      src={m.frame.image}
                      alt={m.frame.name}
                      className="h-32 w-full object-cover"
                    />
                    <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                      <span className="min-w-0 truncate text-[13px] font-bold text-zinc-800">
                        {m.frame.name}
                      </span>
                      <span className="shrink-0 rounded-full bg-[#E21B70] px-2 py-0.5 text-[12px] font-black text-white">
                        Rs {m.frame.price}
                      </span>
                    </div>
                  </div>
                )}
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[15px] leading-snug shadow-sm ${
                    m.role === "user"
                      ? "rounded-br-md bg-[#E21B70] text-white"
                      : "rounded-bl-md bg-white text-zinc-800 ring-1 ring-zinc-100"
                  }`}
                >
                  {m.text}
                </div>
                {/* Inline actions under an agent message */}
                {m.role === "assistant" && m.action === "location" && (
                  <button
                    type="button"
                    onClick={onRequestLocation}
                    className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-[#E21B70] px-3.5 py-2 text-[13px] font-bold text-white shadow active:scale-95"
                  >
                    <MapPin className="h-4 w-4" />
                    Apni Location On Karein
                  </button>
                )}
                {m.role === "assistant" && m.action === "signin" && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAuth();
                    }}
                    className="mt-1.5 rounded-full bg-[#E21B70] px-3.5 py-2 text-[13px] font-bold text-white shadow active:scale-95"
                  >
                    Sign in karein
                  </button>
                )}
                {m.role === "assistant" && m.action === "phone" && showPhoneInline && (
                  <div className="mt-1.5 w-full max-w-[320px] rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-zinc-100">
                    <label className="block text-[12px] font-bold text-zinc-600">
                      Apna 11-digit mobile number likhein
                    </label>
                    <div className="mt-1.5 flex gap-2">
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 11))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitPhone();
                        }}
                        placeholder="03XXXXXXXXX"
                        className="min-w-0 flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-[15px] text-zinc-800 outline-none focus:border-[#E21B70]"
                        aria-label="Mobile number, 11 digits"
                      />
                      <button
                        type="button"
                        onClick={submitPhone}
                        className="shrink-0 rounded-xl bg-[#E21B70] px-3.5 py-2 text-[13px] font-bold text-white active:scale-95"
                      >
                        Save
                      </button>
                    </div>
                    {phoneError && (
                      <p className="mt-1 text-[12px] font-medium text-red-600">{phoneError}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex items-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-white px-3.5 py-3 shadow-sm ring-1 ring-zinc-100">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#E21B70]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#E21B70] [animation-delay:120ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#E21B70] [animation-delay:240ms]" />
                </div>
              </div>
            )}
            {placedOrder && (
              <div className="mt-1 rounded-2xl bg-green-50 px-3.5 py-2.5 text-[13px] font-medium text-green-800 ring-1 ring-green-100">
                Order confirm ho gaya — {placedOrder.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}.
                Aap order status app mein dekh sakte hain.
              </div>
            )}
          </div>
        </div>

        {/* Input row */}
        <form
          className="flex items-center gap-2 border-t border-zinc-100 bg-white px-3 py-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            void sendChat(input);
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              language === "sd"
                ? "Munchi khe likho…"
                : "Munchi ko likhein…"
            }
            className="min-w-0 flex-1 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-[15px] text-zinc-800 outline-none focus:border-[#E21B70] focus:bg-white"
            aria-label="Message Munchi"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E21B70] text-white shadow disabled:opacity-40 active:scale-95"
            aria-label="Send message"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
