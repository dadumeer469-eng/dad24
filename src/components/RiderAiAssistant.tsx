import React, { useState, useEffect } from "react";
import { 
  Bot, AlertTriangle, Send, X, CheckCircle2, Clock, 
  Store, Phone, User, ShieldAlert, Sparkles, RefreshCw, MessageSquare
} from "lucide-react";
import { collection, addDoc, Timestamp, doc, updateDoc, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db, handleFirestoreError } from "../firebase";
import { UserProfile, Order, IncidentReport } from "../types";

interface RiderAiAssistantProps {
  currentUser: UserProfile;
  activeOrder?: Order | null;
  allOrders?: Order[];
  deliverySettings?: any;
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_INCIDENTS = [
  { id: "restaurant_closed", label: "Restaurant Band Hai", icon: Store, text: "Bhai restaurant band hai / taala laga hua hai, koi order nahi bana raha.", severity: "critical" },
  { id: "restaurant_delay", label: "Kitchen Delay (Ready Nahi)", icon: Clock, text: "Restaurant ne abhi tak order prepare nahi kiya, bohat der ho rahi hai.", severity: "medium" },
  { id: "customer_unavailable", label: "Customer Phone Nahi Utha Raha", icon: Phone, text: "Customer ke address par pohnch gaya hoon lekin call attend nahi ho rahi.", severity: "high" },
  { id: "customer_refused", label: "Customer Ne Cancel / Mana Kiya", icon: X, text: "Customer ne order lene se inkaar kar diya hai aur cancel karne ko kaha hai.", severity: "high" },
  { id: "wrong_address", label: "Wrong Address / Map Masla", icon: AlertTriangle, text: "Customer ka location / address galat hai, ghar nahi mil raha.", severity: "medium" },
  { id: "payment_issue", label: "Cash / Change Problem", icon: AlertTriangle, text: "Payment cash amount ya change mein masla aa raha hai.", severity: "high" },
  { id: "accident_emergency", label: "Bike Kharab / Emergency", icon: ShieldAlert, text: "Rider bike kharab ho gayi hai ya emergency hai, delivery nahi ho sakti.", severity: "critical" },
];

export default function RiderAiAssistant({
  currentUser,
  activeOrder,
  allOrders = [],
  deliverySettings,
  isOpen,
  onClose
}: RiderAiAssistantProps) {
  const [inputText, setInputText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [latestReply, setLatestReply] = useState<string | null>(null);
  const [myIncidents, setMyIncidents] = useState<IncidentReport[]>([]);
  const [viewTab, setViewTab] = useState<"report" | "history">("report");
  const [selectedRestName, setSelectedRestName] = useState<string>(activeOrder?.restaurantName || "");

  // Realtime subscription to rider's own incidents
  useEffect(() => {
    if (!currentUser?.uid) return;
    try {
      const q = query(
        collection(db, "incidents"),
        where("riderId", "==", currentUser.uid)
      );
      const unsub = onSnapshot(q, (snapshot) => {
        const list: IncidentReport[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as IncidentReport);
        });
        // Sort descending by createdAt
        list.sort((a, b) => {
          const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
          const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
          return tB - tA;
        });
        setMyIncidents(list);
      }, (err) => {
        console.error("Incidents listen error:", err);
      });
      return () => unsub();
    } catch (e) {
      console.error("Firestore incidents error:", e);
    }
  }, [currentUser?.uid]);

  if (!isOpen) return null;

  const handleSendIncident = async (customMessage?: string, quickType?: string) => {
    const messageToSend = (customMessage || inputText).trim();
    if (!messageToSend) return;

    setIsSubmitting(true);
    setLatestReply(null);

    try {
      // 1. Extract restaurant names list from deliverySettings or allOrders
      const restaurantsList: string[] = [];
      if (deliverySettings?.restaurantStatuses) {
        Object.keys(deliverySettings.restaurantStatuses).forEach((r) => {
          if (!restaurantsList.includes(r)) restaurantsList.push(r);
        });
      }
      allOrders.forEach((o) => {
        if (o.restaurantName && !restaurantsList.includes(o.restaurantName)) {
          restaurantsList.push(o.restaurantName);
        }
      });

      // 2. Call Backend Rider AI Endpoint
      const response = await fetch("/api/ai/rider-incident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageToSend,
          rider: {
            uid: currentUser.uid,
            name: currentUser.name || "Rider",
            phone: currentUser.phone || ""
          },
          order: activeOrder || null,
          restaurants: restaurantsList
        })
      });

      const data = await response.json();
      const inc = data.incident || {};
      const aiReply = data.reply || "Aapki incident report register ho chuki hai!";
      setLatestReply(aiReply);

      const targetRestaurant = inc.restaurantName || selectedRestName || activeOrder?.restaurantName || "General";
      const finalIncidentType = quickType || inc.incidentType || "other";

      // 3. Save Incident to Firestore
      const incidentDocRef = await addDoc(collection(db, "incidents"), {
        riderId: currentUser.uid,
        riderName: currentUser.name || "Rider",
        riderPhone: currentUser.phone || "",
        restaurantName: targetRestaurant,
        orderId: activeOrder?.id || "",
        orderTotal: activeOrder?.grandTotal || activeOrder?.totalPrice || 0,
        customerName: activeOrder?.userName || activeOrder?.name || "",
        customerPhone: activeOrder?.userPhone || activeOrder?.phone || "",
        customerId: activeOrder?.userId || "",
        incidentType: finalIncidentType,
        riderMessage: messageToSend,
        status: "reported",
        severity: inc.severity || "medium",
        aiAnalysis: inc.aiAnalysis || `Rider reported ${finalIncidentType}.`,
        aiActionTaken: inc.aiActionTaken || "under_review",
        createdAt: Timestamp.now()
      });

      // 4. Save Audit Log
      await addDoc(collection(db, "ai_audit_logs"), {
        action: `Rider Report: ${finalIncidentType.toUpperCase()}`,
        reason: messageToSend,
        source: "rider_report",
        riderId: currentUser.uid,
        riderName: currentUser.name || "Rider",
        restaurantName: targetRestaurant,
        orderId: activeOrder?.id || "",
        aiDecision: inc.aiActionTaken || "Incident Logged & Queued for Admin Review",
        timestamp: Timestamp.now()
      });

      // 5. If Restaurant Closed -> Autonomous Temporary Closure in deliverySettings
      if (inc.autoTemporaryClosure && targetRestaurant && deliverySettings) {
        try {
          const currentStatuses = deliverySettings.restaurantStatuses || {};
          const restConfig = currentStatuses[targetRestaurant] || {
            openingTime: "11:00",
            closingTime: "23:59",
            isTemporarilyUnavailable: false
          };

          const reopenTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

          await updateDoc(doc(db, "settings", "delivery"), {
            [`restaurantStatuses.${targetRestaurant}`]: {
              ...restConfig,
              isTemporarilyUnavailable: true,
              temporaryClosure: {
                isTemporarilyClosed: true,
                reason: `Rider AI Incident: ${messageToSend}`,
                closedAt: Timestamp.now(),
                expectedReopenAt: Timestamp.fromDate(reopenTime),
                closedBy: "ai",
                riderIncidentId: incidentDocRef.id
              }
            }
          });
        } catch (setErr) {
          console.error("Auto temporary closure update error:", setErr);
        }
      }

      // 6. Broadcast notification to Admin
      await addDoc(collection(db, "notifications"), {
        userId: "admin",
        title: `🚨 Rider Incident [${finalIncidentType.toUpperCase()}]`,
        message: `${currentUser.name || 'Rider'}: "${messageToSend}" (${targetRestaurant})`,
        createdAt: Timestamp.now(),
        read: false
      });

      setInputText("");
    } catch (err: any) {
      console.error("Submit incident error:", err);
      setLatestReply("Report submit karte waqt masla aaya, please dubara try karein.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="font-bold text-base tracking-wide">Rider AI Assistant</h3>
                <span className="text-[10px] bg-white/25 px-2 py-0.5 rounded-full uppercase font-mono">Real-time</span>
              </div>
              <p className="text-xs text-amber-100">Delivery maslay foran AI Manager ko report karein</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-black/20 hover:bg-black/40 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-800 bg-slate-950/80 px-3 pt-2">
          <button
            onClick={() => setViewTab("report")}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center justify-center space-x-1.5 ${
              viewTab === "report" 
                ? "border-amber-500 text-amber-400 bg-slate-800/60" 
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Naya Masla Report Karein</span>
          </button>
          <button
            onClick={() => setViewTab("history")}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center justify-center space-x-1.5 ${
              viewTab === "history" 
                ? "border-amber-500 text-amber-400 bg-slate-800/60" 
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Report History ({myIncidents.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-slate-200 text-sm">
          {viewTab === "report" ? (
            <>
              {/* Active Order Context Card */}
              {activeOrder ? (
                <div className="bg-slate-800/90 border border-amber-500/30 rounded-xl p-3 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-amber-400 font-medium">
                    <span className="flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Current Active Order</span>
                    </span>
                    <span className="font-mono bg-amber-500/20 px-2 py-0.5 rounded text-amber-300">
                      #{activeOrder.id.slice(-6)}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white flex items-center space-x-1.5">
                    <Store className="w-4 h-4 text-slate-400" />
                    <span>{activeOrder.restaurantName || "Dadu Kitchen"}</span>
                  </div>
                  <div className="text-xs text-slate-300 flex items-center justify-between pt-1 border-t border-slate-700/60">
                    <span className="flex items-center space-x-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{activeOrder.userName || activeOrder.name}</span>
                    </span>
                    <span className="font-bold text-emerald-400">
                      Rs {activeOrder.grandTotal || activeOrder.totalPrice} (COD)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3 text-xs text-slate-400 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Abhi koi active order assigned nahi hai. Aap general masla ya restaurant closure report kar sakte hain.</span>
                </div>
              )}

              {/* Latest AI Action confirmation */}
              {latestReply && (
                <div className="bg-emerald-950/70 border border-emerald-500/40 rounded-xl p-3 text-xs text-emerald-200 flex items-start space-x-2.5 animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-emerald-300">AI Manager Confirmation:</p>
                    <p className="leading-relaxed">{latestReply}</p>
                  </div>
                </div>
              )}

              {/* Quick Incident Chips */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Quick 1-Tap Incident Report
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {QUICK_INCIDENTS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleSendIncident(item.text, item.id)}
                        className="flex items-center space-x-2.5 p-2.5 rounded-xl text-left bg-slate-800 hover:bg-slate-700/80 active:scale-98 border border-slate-700 hover:border-amber-500/50 transition-all text-xs font-medium text-slate-200"
                      >
                        <div className={`p-1.5 rounded-lg ${
                          item.severity === "critical" ? "bg-red-500/20 text-red-400" :
                          item.severity === "high" ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="line-clamp-2 leading-tight">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Roman Urdu message */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Ya apni zuban mein detail likhein:
                </label>
                <div className="relative">
                  <textarea
                    rows={3}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Maslan: Restaurant band hai, koi phone nahi utha raha..."
                    disabled={isSubmitting}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden resize-none"
                  />
                </div>
                <button
                  type="button"
                  disabled={isSubmitting || !inputText.trim()}
                  onClick={() => handleSendIncident()}
                  className="w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white flex items-center justify-center space-x-2 shadow-lg shadow-amber-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>AI Manager Tak Bhej Raha Hai...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Incident Report Submit Karein</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            /* History Tab */
            <div className="space-y-3">
              {myIncidents.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Aapne abhi tak koi incident report nahi kiya.
                </div>
              ) : (
                myIncidents.map((inc) => (
                  <div 
                    key={inc.id} 
                    className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                        inc.severity === "critical" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                        inc.severity === "high" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                        "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      }`}>
                        {inc.incidentType.replace("_", " ")}
                      </span>
                      <span className={`text-[11px] font-bold ${
                        inc.status === "resolved" ? "text-emerald-400" :
                        inc.status === "under_review" ? "text-blue-400" : "text-amber-400"
                      }`}>
                        ● {inc.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 font-medium italic">
                      "{inc.riderMessage}"
                    </p>

                    <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-700/50 pt-2">
                      <span>{inc.restaurantName || "General Store"}</span>
                      <span>
                        {inc.createdAt?.toDate ? inc.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                      </span>
                    </div>

                    {inc.aiActionTaken && (
                      <div className="bg-slate-900/90 rounded-lg p-2 text-[11px] text-slate-300 flex items-center space-x-1.5">
                        <Bot className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>AI Action: <strong>{inc.aiActionTaken}</strong></span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-400">
            Emergency helpline / Support ke liye Admin ko direct call karein.
          </p>
        </div>
      </div>
    </div>
  );
}
