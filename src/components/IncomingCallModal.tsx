// Incoming in-app call screen (for the customer).
// When a rider starts an in-app call, the customer's app shows this
// full-screen modal (like WhatsApp): caller name, Answer / Decline.
// On Answer it completes the WebRTC handshake and shows the active call UI.
// On Decline / End it marks the call declined/ended in Firestore.
import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Mic, MicOff, Volume2 } from "lucide-react";
import type { CallDoc } from "../utils/webrtcCall";
import {
  answerCall,
  createPeerConnection,
  declineCall,
  endCall,
  getMicStream,
  listenCallDoc,
  listenIceCandidates,
  sendIceCandidate,
} from "../utils/webrtcCall";

export default function IncomingCallModal({
  call,
  myId,
  onClose,
}: {
  call: CallDoc;
  myId: string;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<"ringing" | "connected" | "ended">("ringing");
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callId = call.id || "";
  const remoteCandidatesRef = useRef<Set<string>>(new Set());

  // If the caller ends / the call is gone, close.
  useEffect(() => {
    if (!callId) return;
    const unsub = listenCallDoc(callId, (updated) => {
      if (!updated || updated.status === "ended" || updated.status === "declined") {
        cleanup();
        setPhase("ended");
        setTimeout(onClose, 1200);
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId]);

  useEffect(() => {
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cleanup() {
    try {
      pcRef.current?.close();
    } catch {
      // Ignore.
    }
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
  }

  async function handleAnswer() {
    if (!call.offer || !callId) return;
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
          sendIceCandidate(callId, candidate, "callee").catch(() => {});
        },
      );
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(call.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await answerCall(callId, answer);
      setPhase("connected");
      // Listen for the rider's ICE candidates (skip ones we already added).
      listenIceCandidates(callId, (candidate) => {
        const key = JSON.stringify(candidate);
        if (remoteCandidatesRef.current.has(key)) return;
        remoteCandidatesRef.current.add(key);
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      });
    } catch (e) {
      console.error("Failed to answer in-app call", e);
      handleDecline();
    }
  }

  function handleDecline() {
    if (callId) declineCall(callId).catch(() => {});
    cleanup();
    setPhase("ended");
    onClose();
  }

  function handleEnd() {
    if (callId) endCall(callId).catch(() => {});
    cleanup();
    setPhase("ended");
    onClose();
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    streamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
  }

  if (phase === "ended") {
    return (
      <div className="fixed inset-0 z-[100000] bg-black/90 flex items-center justify-center text-white">
        <p className="font-black">Call ended</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100000] bg-gradient-to-b from-[#1a0a12] via-[#2a0e1c] to-black text-white flex flex-col items-center justify-between py-16 px-6 select-none">
      <audio ref={remoteAudioRef} autoPlay playsInline />
      <div className="flex flex-col items-center gap-3 mt-8">
        <div className="w-24 h-24 rounded-full bg-[#E21B70] flex items-center justify-center text-4xl font-black shadow-2xl ring-4 ring-white/20">
          {(call.callerName || "R").charAt(0).toUpperCase()}
        </div>
        <h2 className="text-2xl font-black">{call.callerName || "Dadu Food Rider"}</h2>
        <p className="text-white/70 text-sm font-bold">
          {phase === "ringing" ? "In-app call • Dadu Food Rider" : "Connected • In-app call"}
        </p>
        {phase === "ringing" && (
          <span className="mt-2 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/80">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            Ringing…
          </span>
        )}
      </div>

      {phase === "ringing" ? (
        <div className="flex items-center gap-10">
          <button
            onClick={handleDecline}
            aria-label="Decline call"
            className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-2xl active:scale-95 transition"
          >
            <PhoneOff className="w-7 h-7" />
          </button>
          <button
            onClick={handleAnswer}
            aria-label="Answer call"
            className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center shadow-2xl active:scale-95 transition animate-pulse"
          >
            <Phone className="w-9 h-9" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-6">
          <button
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl active:scale-95 transition ${muted ? "bg-white text-black" : "bg-white/15"}`}
          >
            {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          <button
            onClick={() => setSpeaker(!speaker)}
            aria-label="Speaker"
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl active:scale-95 transition ${speaker ? "bg-white text-black" : "bg-white/15"}`}
          >
            <Volume2 className="w-6 h-6" />
          </button>
          <button
            onClick={handleEnd}
            aria-label="End call"
            className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-2xl active:scale-95 transition"
          >
            <PhoneOff className="w-7 h-7" />
          </button>
        </div>
      )}
    </div>
  );
}
