// Vercel serverless function — Gemini voice chat for the Dadu Food call agent.
// POST {messages:[{role,content}], menuText, ordersText, userName, userPhone}
// Returns {reply, order}. Keys come only from env vars (GEMINI_API_KEY..._5).
// Switched from Groq 28 Nov 2026 on the user's word ("Gemini pe switch karein").
// Fallback: while no Gemini key is configured, Groq answers (so Munchi never
// goes silent during the switch); once GEMINI_API_KEY is set, Gemini takes over.
import { handleVoiceChat as handleVoiceChatGemini, getGeminiKeys } from "../server/geminiVoice.js";
import { handleVoiceChat as handleVoiceChatGroq } from "../server/groqVoice.js";
import { withCors } from "./_cors.js";

export default async function handler(req: any, res: any) {
  if (withCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const ip =
    (req.headers?.["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  const result =
    getGeminiKeys().length > 0
      ? await handleVoiceChatGemini(req.body || {}, ip)
      : await handleVoiceChatGroq(req.body || {}, ip);
  return res.status(result.status).json(result.body);
}
