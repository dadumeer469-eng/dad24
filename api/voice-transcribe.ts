// Vercel serverless function — Gemini transcription for the call agent.
// POST multipart/form-data with an "audio" file (MediaRecorder webm).
// Returns {text, language}. No audio is stored.
// Switched from Groq Whisper 28 Nov 2026 on the user's word ("Gemini pe switch karein").
// Fallback: while no Gemini key is configured, Groq Whisper transcribes.
import { handleVoiceTranscribe as handleVoiceTranscribeGemini, getGeminiKeys, readRawBody } from "../server/geminiVoice.js";
import { handleVoiceTranscribe as handleVoiceTranscribeGroq } from "../server/groqVoice.js";
import { withCors } from "./_cors.js";

export const config = { api: { bodyParser: false } };

export default async function handler(req: any, res: any) {
  if (withCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const ip =
    (req.headers?.["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  const raw = await readRawBody(req as unknown as AsyncIterable<Buffer>);
  const result =
    getGeminiKeys().length > 0
      ? await handleVoiceTranscribeGemini(req.headers?.["content-type"], raw, ip)
      : await handleVoiceTranscribeGroq(req.headers?.["content-type"], raw, ip);
  return res.status(result.status).json(result.body);
}
