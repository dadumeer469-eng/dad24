import React, { useState, useEffect, useRef } from "react";
import { 
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { Send, X, MessageSquare, User, Clock, Bell, Check, CheckCheck } from "lucide-react";

interface OrderChatProps {
  orderId: string;
  currentUser: {
    uid: string;
    name: string;
    role: string;
  };
  recipientName: string;
  recipientRole: "user" | "rider";
  onClose?: () => void;
  isOpen?: boolean;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  createdAt: any;
  isRead?: boolean;
}

// Web Audio API Synthesizer for message arrival notification sound
const playNotificationAlarm = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // First tone (880 Hz - A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Second higher tone (1174.66 Hz - D6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1174.66, now + 0.14);
    gain2.gain.setValueAtTime(0.25, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.4);
  } catch (err) {
    console.error("Audio notification play error:", err);
  }
};

export default function OrderChat({ 
  orderId, 
  currentUser, 
  recipientName, 
  recipientRole,
  onClose,
  isOpen = true
}: OrderChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Track previous message count and initial load status for sound alarm
  const prevMsgCountRef = useRef<number>(0);
  const initialLoadedRef = useRef<boolean>(false);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!isOpen) return;

    // Reset refs on order change or chat opening
    initialLoadedRef.current = false;
    prevMsgCountRef.current = 0;

    // Load messages with onSnapshot for real-time updates
    const messagesRef = collection(db, "orders", orderId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: ChatMessage[] = [];
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        list.push({
          id: docSnapshot.id,
          senderId: data.senderId || "",
          senderName: data.senderName || "",
          senderRole: data.senderRole || "",
          text: data.text || "",
          createdAt: data.createdAt,
          isRead: data.isRead === true
        });

        // Auto-mark incoming unread messages as read when recipient has chat open
        if (data.senderId !== currentUser.uid && !data.isRead) {
          updateDoc(doc(db, "orders", orderId, "messages", docSnapshot.id), { isRead: true }).catch(() => {});
        }
      });

      // Sound Alarm Check on New Incoming Message
      if (initialLoadedRef.current && list.length > prevMsgCountRef.current) {
        const latestMsg = list[list.length - 1];
        if (latestMsg && latestMsg.senderId !== currentUser.uid) {
          playNotificationAlarm();
        }
      }

      setMessages(list);
      setLoading(false);
      prevMsgCountRef.current = list.length;
      initialLoadedRef.current = true;

      // Timeout to wait for layout/render
      setTimeout(scrollToBottom, 80);
    }, (error) => {
      console.error("Error fetching order chat messages: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderId, isOpen, currentUser.uid]);

  // Handle message sending
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const textToSend = newMessage.trim();
    setNewMessage("");

    try {
      const messagesRef = collection(db, "orders", orderId, "messages");
      await addDoc(messagesRef, {
        senderId: currentUser.uid,
        senderName: currentUser.name || "User",
        senderRole: currentUser.role === "rider" ? "rider" : "user",
        text: textToSend,
        createdAt: serverTimestamp(),
        isRead: false
      });
      setTimeout(scrollToBottom, 50);
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };

  // Quick suggestion chips based on sender role
  const quickChips = currentUser.role === "rider"
    ? ["🛵 On my way!", "📍 Reached your location!", "📞 Please answer phone", "🚪 Outside your door", "👍 Ok got it!"]
    : ["📍 Please call when near", "🚪 Leave at door", "💵 Cash is ready", "🛵 Kitni der lagegi?", "👍 Thank you!"];

  const sendQuickChip = async (text: string) => {
    try {
      const messagesRef = collection(db, "orders", orderId, "messages");
      await addDoc(messagesRef, {
        senderId: currentUser.uid,
        senderName: currentUser.name || "User",
        senderRole: currentUser.role === "rider" ? "rider" : "user",
        text,
        createdAt: serverTimestamp(),
        isRead: false
      });
      setTimeout(scrollToBottom, 50);
    } catch (error) {
      console.error("Error sending quick chip message: ", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      {/* Backdrop overlay - click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Chat Modal Container */}
      <div className="relative w-full h-[90vh] sm:h-[580px] max-w-lg bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-100 z-10">
        
        {/* Header bar */}
        <div className="bg-gradient-to-r from-[#D70F64] to-pink-600 px-4 py-3 flex items-center justify-between shadow-lg shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center border border-white/30 text-white font-black">
                <User className="w-5 h-5 text-white" />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#D70F64] animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-pink-100 uppercase tracking-widest font-black block leading-none truncate">
                  {recipientRole === "rider" ? "🛵 Delivery Hero (Live Chat)" : "👤 Customer (Live Chat)"}
                </span>
                <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0">
                  <Bell className="w-2.5 h-2.5 text-amber-300" /> Sound Alarm
                </span>
              </div>
              <span className="text-sm font-black text-white block mt-0.5 truncate">{recipientName || "Delivery Partner"}</span>
            </div>
          </div>

          {onClose && (
            <button 
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white transition cursor-pointer shrink-0 ml-2 active:scale-95"
              title="Close Chat"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 bg-zinc-950/90 scrollbar-thin">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#D70F64]"></div>
              <span className="text-[10px] font-black uppercase tracking-wider">Connecting Live Chat...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-zinc-500 gap-2">
              <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-[#D70F64]" />
              </div>
              <div>
                <span className="text-xs font-black text-zinc-300 block uppercase tracking-wider">No Messages Yet</span>
                <p className="text-[11px] text-zinc-400 font-semibold max-w-[240px] mt-1 mx-auto leading-relaxed">
                  Tap a quick reply below or type a message to communicate in real-time!
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isSelf = msg.senderId === currentUser.uid;
              return (
                <div 
                  key={msg.id} 
                  className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}
                >
                  {/* Sender Tag */}
                  <span className="text-[9px] font-extrabold text-zinc-400 mb-0.5 px-1.5">
                    {isSelf ? "You" : msg.senderName}
                  </span>

                  {/* Message Bubble */}
                  <div 
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-medium leading-relaxed break-words shadow-md ${
                      isSelf 
                        ? "bg-[#D70F64] text-white rounded-tr-xs" 
                        : "bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-tl-xs"
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Timestamp & Read/Unread Status */}
                  <div className="text-[8.5px] text-zinc-500 mt-1 flex items-center gap-2 px-1.5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {msg.createdAt?.seconds ? (
                        new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      ) : (
                        "Sending..."
                      )}
                    </span>

                    {/* Read / Unread Status for sent messages */}
                    {isSelf && (
                      <span className={`inline-flex items-center gap-0.5 font-bold px-1.5 py-0.2 rounded-full border text-[8px] ${
                        msg.isRead 
                          ? "bg-sky-500/10 border-sky-500/30 text-sky-400" 
                          : "bg-zinc-800/80 border-zinc-700/60 text-zinc-400"
                      }`}>
                        {msg.isRead ? (
                          <>
                            <CheckCheck className="w-3 h-3 text-sky-400" />
                            <span>Read</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-2.5 h-2.5 text-zinc-400" />
                            <span>Unread</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Reply Chips */}
        <div className="px-3 py-2 bg-zinc-900/90 border-t border-zinc-850 flex overflow-x-auto gap-2 scrollbar-none shrink-0">
          {quickChips.map((chip, i) => (
            <button
              key={i}
              type="button"
              onClick={() => sendQuickChip(chip)}
              className="shrink-0 bg-zinc-800 hover:bg-[#D70F64] border border-zinc-700 text-zinc-200 hover:text-white text-[11px] font-bold py-1.5 px-3 rounded-full transition cursor-pointer active:scale-95 shadow-xs"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input section - Pinned at bottom, close and easy to send */}
        <form 
          onSubmit={handleSendMessage}
          className="p-3 bg-zinc-950 border-t border-zinc-800 flex items-center gap-2 shrink-0 pb-5 sm:pb-3"
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Type message to ${recipientName}...`}
            className="flex-1 bg-zinc-900 border border-zinc-750 focus:border-[#D70F64] outline-none rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-zinc-100 placeholder-zinc-500 transition"
            autoFocus
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="h-10 px-4 rounded-xl bg-[#D70F64] disabled:bg-zinc-800 text-white disabled:text-zinc-600 font-black text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-[#D70F64]/20 disabled:shadow-none hover:bg-[#b00c50] cursor-pointer shrink-0 active:scale-95"
          >
            <span>Send</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

