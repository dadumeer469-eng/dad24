// Vercel serverless function — neural Urdu TTS for the Dadu Food call agent.
// POST {text} -> audio/mpeg (Edge neural TTS, ur-PK-AsadNeural (male)). No key needed.
// If this fails, the modal falls back to the phone's speechSynthesis voice.
// NOTE: the import MUST carry the .js extension — Vercel compiles api/*.ts
// to ESM, and Node ESM cannot resolve extension-less imports (1b752cb).
import { handleVoiceSpeak } from "../server/neuralTts.js";
import { withCors } from "./_cors.js";

export default async function handler(req: any, res: any) {
  if (withCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const ip =
    (req.headers?.["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  const result = await handleVoiceSpeak(req.body || {}, ip);
  if (result.status === 200 && Buffer.isBuffer(result.body)) {
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(result.body);
  }
  return res.status(result.status).json(result.body);
}
