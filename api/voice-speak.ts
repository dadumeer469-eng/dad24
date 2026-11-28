// Vercel serverless function — neural TTS for the Dadu Food call agent.
// POST {text} -> audio/wav (Gemini 2.5 Flash TTS, voice Achird — friendly
// male) when a Gemini key is configured, else audio/mpeg (Edge neural TTS,
// ur-PK-AsadNeural (male)). No key needed for the Edge fallback.
// If this fails, the modal falls back to the phone's speechSynthesis voice.
// Switched to Gemini 28 Nov 2026 on the user's word ("Voice bhi uski").
// NOTE: the import MUST carry the .js extension — Vercel compiles api/*.ts
// to ESM, and Node ESM cannot resolve extension-less imports (1b752cb).
import { handleVoiceSpeakGemini } from "../server/geminiTts.js";
import { getGeminiKeys } from "../server/geminiVoice.js";
import { handleVoiceSpeak as handleVoiceSpeakEdge } from "../server/neuralTts.js";
import { withCors } from "./_cors.js";

export default async function handler(req: any, res: any) {
  if (withCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const ip =
    (req.headers?.["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  const useGemini = getGeminiKeys().length > 0;
  let result = useGemini
    ? await handleVoiceSpeakGemini(req.body || {}, ip)
    : await handleVoiceSpeakEdge(req.body || {}, ip);
  let contentType = useGemini ? "audio/wav" : "audio/mpeg";
  // Fallback (28 Nov 2026): Gemini TTS was returning 502 "Speech service
  // unavailable" (rate limit / quota), leaving Munchi silent. When Gemini
  // fails, fall back to Edge TTS (male ur-PK-AsadNeural) so Munchi still
  // speaks. Gemini stays the primary voice — Edge only covers its outages.
  if (result.status !== 200 && useGemini) {
    const edge = await handleVoiceSpeakEdge(req.body || {}, ip);
    if (edge.status === 200 && Buffer.isBuffer(edge.body)) {
      result = edge;
      contentType = "audio/mpeg";
    }
  }
  if (result.status === 200 && Buffer.isBuffer(result.body)) {
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(result.body);
  }
  return res.status(result.status).json(result.body);
}
