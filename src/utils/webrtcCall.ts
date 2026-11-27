// In-app voice calling (rider -> user) — WebRTC + Firestore signalling.
//
// The rider calls the user FROM INSIDE the rider app (no phone dialer).
// How it works (no paid service, no server needed for the voice itself):
// - Signalling goes through Firestore collection `calls` (offer/answer +
//   ICE candidates). The voice itself is peer-to-peer WebRTC (free Google
//   STUN server, no key needed).
// - Rider taps "In-App Call" -> creates a call doc (status "ringing") with
//   a WebRTC offer. The user's app listens for calls addressed to them and
//   shows an incoming-call screen (Answer / Decline).
// - Answer -> user writes an answer SDP, both sides exchange ICE candidates
//   via `calls/{id}/candidates`, and the audio flows directly.
// - Either side can end the call -> status "ended", peer connection closed.
//
// LIMIT (honest): both apps must be OPEN for the incoming-call screen to
// appear. Ringing a CLOSED app like WhatsApp needs FCM push notifications,
// which is a separate setup (FCM + native call UI) — not in this version.
// The rider's regular phone-call button (tel:) still exists for that case.
import { db } from "../firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

export interface CallDoc {
  id?: string;
  callerId: string;
  callerName: string;
  calleeId: string;
  calleeName: string;
  orderId?: string;
  status: "ringing" | "answered" | "ended" | "declined";
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  createdAt?: unknown;
}

const STUN_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export function createPeerConnection(
  onRemoteStream: (stream: MediaStream) => void,
  onIceCandidate: (candidate: RTCIceCandidateInit) => void,
): RTCPeerConnection {
  const pc = new RTCPeerConnection(STUN_SERVERS);
  pc.ontrack = (e) => {
    if (e.streams[0]) onRemoteStream(e.streams[0]);
  };
  pc.onicecandidate = (e) => {
    if (e.candidate) onIceCandidate(e.candidate.toJSON());
  };
  return pc;
}

export async function getMicStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
}

// Rider: start a call to the user. Returns the call id.
export async function startCall(opts: {
  callerId: string;
  callerName: string;
  calleeId: string;
  calleeName: string;
  orderId?: string;
  offer: RTCSessionDescriptionInit;
}): Promise<string> {
  const ref = await addDoc(collection(db, "calls"), {
    callerId: opts.callerId,
    callerName: opts.callerName,
    calleeId: opts.calleeId,
    calleeName: opts.calleeName,
    orderId: opts.orderId || "",
    status: "ringing",
    offer: opts.offer,
    createdAt: serverTimestamp(),
  } as CallDoc);
  return ref.id;
}

export async function answerCall(callId: string, answer: RTCSessionDescriptionInit) {
  await updateDoc(doc(db, "calls", callId), { answer, status: "answered" });
}

export async function endCall(callId: string) {
  try {
    await updateDoc(doc(db, "calls", callId), { status: "ended" });
  } catch {
    // Already deleted / no permission — ignore.
  }
}

export async function declineCall(callId: string) {
  try {
    await updateDoc(doc(db, "calls", callId), { status: "declined" });
  } catch {
    // Ignore.
  }
}

export async function sendIceCandidate(callId: string, candidate: RTCIceCandidateInit, from: string) {
  await addDoc(collection(db, "calls", callId, "candidates"), {
    ...candidate,
    from,
    createdAt: serverTimestamp(),
  });
}

// Listen for ICE candidates on a call (both sides). Returns unsubscribe.
export function listenIceCandidates(
  callId: string,
  onCandidate: (candidate: RTCIceCandidateInit) => void,
) {
  const q = query(
    collection(db, "calls", callId, "candidates"),
    orderBy("createdAt", "asc"),
  );
  return onSnapshot(q, (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type === "added") {
        const data = change.doc.data() as RTCIceCandidateInit & { from?: string };
        onCandidate(data);
      }
    });
  });
}

// Listen for a call doc's status/offer/answer changes. Returns unsubscribe.
export function listenCallDoc(callId: string, onChange: (call: CallDoc | null) => void) {
  return onSnapshot(doc(db, "calls", callId), (snap) => {
    if (!snap.exists()) return onChange(null);
    onChange({ id: snap.id, ...(snap.data() as CallDoc) });
  });
}

// Listen for incoming calls addressed to a user (status "ringing").
// Returns unsubscribe.
export function listenIncomingCalls(
  calleeId: string,
  onIncoming: (call: CallDoc) => void,
) {
  const q = query(
    collection(db, "calls"),
    where("calleeId", "==", calleeId),
    where("status", "==", "ringing"),
  );
  const seen = new Set<string>();
  return onSnapshot(q, (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type === "added" && !seen.has(change.doc.id)) {
        seen.add(change.doc.id);
        onIncoming({ id: change.doc.id, ...(change.doc.data() as CallDoc) });
      }
    });
  });
}

// Clean up a finished call doc + its candidates (best effort).
export async function deleteCallDoc(callId: string) {
  try {
    await deleteDoc(doc(db, "calls", callId));
  } catch {
    // Ignore.
  }
}
