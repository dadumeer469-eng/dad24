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
  const result = useGemini
    ? await handleVoiceSpeakGemini(req.body || {}, ip)
    : await handleVoiceSpeakEdge(req.body || {}, ip);
  if (result.status === 200 && Buffer.isBuffer(result.body)) {
    res.setHeader("Content-Type", useGemini ? "audio/wav" : "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(result.body);
  }
  return res.status(result.status).json(result.body);
}
