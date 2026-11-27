// Vercel serverless function — Groq voice chat for the Dadu Food call agent.
// POST {messages:[{role,content}], menuText, ordersText, userName, userPhone}
// Returns {reply, order}. Keys come only from env vars (GROQ_API_KEY..._5).
import { handleVoiceChat } from "../server/groqVoice.js";
import { withCors } from "./_cors.js";

export default async function handler(req: any, res: any) {
  if (withCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const ip =
    (req.headers?.["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  const result = await handleVoiceChat(req.body || {}, ip);
  return res.status(result.status).json(result.body);
}
