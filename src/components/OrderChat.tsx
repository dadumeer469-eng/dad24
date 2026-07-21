import React, { useState, useEffect, useRef } from "react";
import { 
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import { Send, X, MessageSquare, User, Clock } from "lucide-react";

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
}

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

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!isOpen) return;

    // Load messages with onSnapshot for real-time updates
    const messagesRef = collection(db, "orders", orderId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          senderId: data.senderId || "",
          senderName: data.senderName || "",
          senderRole: data.senderRole || "",
          text: data.text || "",
          createdAt: data.createdAt
        });
      });
      setMessages(list);
      setLoading(false);
      // Timeout to wait for layout/render
      setTimeout(scrollToBottom, 80);
    }, (error) => {
      console.error("Error fetching order chat messages: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderId, isOpen]);

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
        createdAt: serverTimestamp()
      });
      setTimeout(scrollToBottom, 50);
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-[460px] max-h-[85vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100">
      {/* Header bar */}
      <div className="bg-[#D70F64] px-4 py-3 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              <User className="w-4 h-4 text-white" />
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#D70F64]" />
          </div>
          <div>
            <span className="text-[10px] text-pink-100 uppercase tracking-widest font-black block leading-none">
              {recipientRole === "rider" ? "Your Delivery Hero" : "Valued Customer"}
            </span>
            <span className="text-sm font-black text-white block mt-0.5">{recipientName || "Loading..."}</span>
          </div>
        </div>

        {onClose && (
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/25 flex items-center justify-center text-white/80 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-900/60 no-scrollbar">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#D70F64]"></div>
            <span className="text-[10px] font-black uppercase tracking-wider">Connecting Live Chat...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-550 gap-2.5">
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-850 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-zinc-500" />
            </div>
            <div>
              <span className="text-xs font-black text-zinc-400 block uppercase tracking-wider">No Messages Yet</span>
              <p className="text-[10px] text-zinc-500 font-semibold max-w-[200px] mt-1 mx-auto leading-relaxed">
                Send a quick greeting to coordinate order pickup or special delivery guidelines!
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
                <span className="text-[9px] font-bold text-zinc-500 mb-0.5 px-1.5">
                  {isSelf ? "You" : msg.senderName}
                </span>

                {/* Message Bubble */}
                <div 
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs font-medium leading-relaxed break-words shadow-sm ${
                    isSelf 
                      ? "bg-[#D70F64] text-white rounded-tr-xs" 
                      : "bg-zinc-800 border border-zinc-750 text-zinc-200 rounded-tl-xs"
                  }`}
                >
                  {msg.text}
                </div>

                {/* Timestamp */}
                <span className="text-[8px] text-zinc-600 mt-1 flex items-center gap-1 px-1.5">
                  <Clock className="w-2.5 h-2.5" />
                  {msg.createdAt?.seconds ? (
                    new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  ) : (
                    "Sending..."
                  )}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input section */}
      <form 
        onSubmit={handleSendMessage}
        className="p-3 bg-zinc-950 border-t border-zinc-850 flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={`Type a message to ${recipientName}...`}
          className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-[#D70F64] outline-none rounded-xl px-3.5 py-2 text-xs font-semibold text-zinc-200 placeholder-zinc-500 transition"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="h-9 w-9 rounded-xl bg-[#D70F64] disabled:bg-zinc-850 text-white disabled:text-zinc-600 flex items-center justify-center transition shadow-md shadow-[#D70F64]/10 disabled:shadow-none hover:bg-[#b00c50] cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
