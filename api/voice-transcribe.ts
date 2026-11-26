// Vercel serverless function — Groq Whisper transcription for the call agent.
// POST multipart/form-data with an "audio" file (MediaRecorder webm).
// Returns {text, language}. No audio is stored.
import { handleVoiceTranscribe, readRawBody } from "../server/groqVoice";

export const config = { api: { bodyParser: false } };

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const ip =
    (req.headers?.["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  const raw = await readRawBody(req as unknown as AsyncIterable<Buffer>);
  const result = await handleVoiceTranscribe(req.headers?.["content-type"], raw, ip);
  return res.status(result.status).json(result.body);
}
