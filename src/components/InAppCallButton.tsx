// In-app call button + call UI (reusable for rider AND customer).
// Either side can call the other FROM INSIDE the app (WebRTC, no dialer,
// no phone numbers exchanged).
// Tap "In-App Call" -> mic permission -> creates a Firestore call doc with a
// WebRTC offer -> the customer's app rings with an incoming-call screen.
// Shows Calling / Connected / Ended states, with Mute + End controls.
import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";
import {
  createPeerConnection,
  deleteCallDoc,
  endCall,
  getMicStream,
  listenCallDoc,
  listenIceCandidates,
  sendIceCandidate,
  startCall,
} from "../utils/webrtcCall";

type Phase = "idle" | "calling" | "connected" | "ended";

export default function InAppCallButton({
  myId,
  myName,
  peerId,
  peerName,
  orderId,
}: {
  myId: string;
  myName: string;
  peerId: string;
  peerName: string;
  orderId?: string;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [muted, setMuted] = useState(false);
  const [callId, setCallId] = useState<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteCandidatesRef = useRef<Set<string>>(new Set());
  const answeredRef = useRef(false);
  const callIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Watch the call doc: when the customer answers, apply their answer SDP;
  // when they decline/end, close the call.
  useEffect(() => {
    if (!callId) return;
    const unsub = listenCallDoc(callId, (updated) => {
      if (!updated) return;
      if (updated.status === "answered" && updated.answer && !answeredRef.current) {
        answeredRef.current = true;
        pcRef.current
          ?.setRemoteDescription(new RTCSessionDescription(updated.answer))
          .then(() => setPhase("connected"))
          .catch(() => {});
      }
      if (updated.status === "ended" || updated.status === "declined") {
        cleanup();
        setPhase("ended");
        setTimeout(() => {
          setPhase("idle");
          setCallId(null);
          answeredRef.current = false;
        }, 1500);
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId]);

  function cleanup() {
    try {
      pcRef.current?.close();
    } catch {
      // Ignore.
    }
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    remoteCandidatesRef.current.clear();
  }

  async function handleStartCall() {
    if (!peerId || phase === "calling" || phase === "connected") return;
    try {
      const stream = await getMicStream();
      streamRef.current = stream;
      const pc = createPeerConnection(
        (remoteStream) => {
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream;
            remoteAudioRef.current.play().catch(() => {});
          }
        },
        (candidate) => {
          if (callIdRef.current) {
            sendIceCandidate(callIdRef.current, candidate, "caller").catch(() => {});
          }
        },
      );
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const id = await startCall({
        callerId: myId,
        callerName: myName,
        calleeId: peerId,
        calleeName: peerName,
        orderId,
        offer,
      });
      callIdRef.current = id;
      setCallId(id);
      setPhase("calling");
      // Listen for the customer's ICE candidates.
      listenIceCandidates(id, (candidate) => {
        const key = JSON.stringify(candidate);
        if (remoteCandidatesRef.current.has(key)) return;
        remoteCandidatesRef.current.add(key);
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      });
    } catch (e) {
      console.error("Failed to start in-app call", e);
      cleanup();
      setPhase("idle");
      alert("Mic permission chahiye — in-app call ke liye microphone allow karein.");
    }
  }

  async function handleEndCall() {
    if (callId) {
      await endCall(callId).catch(() => {});
      await deleteCallDoc(callId).catch(() => {});
    }
    cleanup();
    setPhase("ended");
    setTimeout(() => {
      setPhase("idle");
      setCallId(null);
      callIdRef.current = null;
      answeredRef.current = false;
    }, 1200);
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    streamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
  }

  if (!peerId) {
    return (
      <div className="bg-zinc-950/50 border border-zinc-800 text-zinc-600 py-2 sm:py-2.5 px-2 rounded-xl text-center font-black text-[10.5px] sm:text-xs flex items-center justify-center gap-1 opacity-50 cursor-not-allowed">
        📱 In-App Call
      </div>
    );
  }

  if (phase === "calling" || phase === "connected") {
    return (
      <div className="bg-[#E21B70] border border-[#E21B70] text-white py-2 sm:py-2.5 px-2 rounded-xl text-center font-black text-[10.5px] sm:text-xs flex items-center justify-center gap-2">
        <audio ref={remoteAudioRef} autoPlay playsInline />
        <span className="truncate">
          {phase === "calling" ? "📱 Calling…" : "📱 Connected"}
        </span>
        <button
          onClick={toggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
          className="shrink-0 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center active:scale-95"
        >
          {muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={handleEndCall}
          aria-label="End call"
          className="shrink-0 w-7 h-7 rounded-full bg-red-500 flex items-center justify-center active:scale-95"
        >
          <PhoneOff className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  if (phase === "ended") {
    return (
      <div className="bg-zinc-950 border border-zinc-800 text-zinc-400 py-2 sm:py-2.5 px-2 rounded-xl text-center font-black text-[10.5px] sm:text-xs flex items-center justify-center gap-1">
        Call ended
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleStartCall}
      className="bg-gradient-to-r from-[#E21B70] to-pink-600 hover:from-[#C2145E] hover:to-pink-700 text-white py-2 sm:py-2.5 px-2 rounded-xl transition-transform duration-180 text-center font-black text-[10.5px] sm:text-xs flex items-center justify-center gap-1 shadow-md cursor-pointer active:scale-[0.97] active:brightness-110 truncate"
      title="Call inside the app (no dialer, no phone number)"
    >
      <Phone className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">In-App Call</span>
    </button>
  );
}
