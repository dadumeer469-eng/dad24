// Shared Gemini voice-agent logic for Dadu Food (Munchi).
// Switched from Groq 28 Nov 2026 on the user's word ("Gemini pe switch
// karein") — Groq kept replying in Urdu script and the v10 fix never
// deployed to Vercel, so Munchi did not talk properly. Gemini 3.5 Flash
// is fast, understands Urdu/Roman Urdu well, and does audio transcription
// too, so one provider covers chat + transcribe. Edge TTS (Asad male
// voice) is unchanged — api/voice-speak.ts still serves it.
// Used by the Vercel serverless functions (api/voice-chat.ts,
// api/voice-transcribe.ts) and by the local dev server (server.ts).
// The system prompt, order validation, rate limiting and multipart parsing
// are shared with server/groqVoice.ts so Munchi's personality, rules and
// Roman-Urdu instruction stay byte-identical. No API key is ever logged
// or stored here — keys come only from environment variables at runtime.

import { GoogleGenAI } from "@google/genai";
import {
  buildSystemPrompt,
  validateOrder,
  rateLimited,
  parseMultipart,
  readRawBody,
  type ChatResult,
} from "./groqVoice.js";

export { parseMultipart, readRawBody };

const DEFAULT_MODEL = "gemini-3.5-flash";
const FETCH_TIMEOUT_MS = 20000;
const MAX_CHAT_BODY_CHARS = 100_000;
const MAX_AUDIO_BYTES = 4 * 1024 * 1024; // Vercel request limit is 4.5 MB

export const GEMINI_QUOTA_MESSAGE =
  "Maaf kijiye, line abhi masroof hai — thodi der baad dobara koshish karein.";

export function getGeminiKeys(): string[] {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
  ].filter((k): k is string => typeof k === "string" && k.trim().length > 0);
}

export function getGeminiModel(): string {
  return (process.env.GEMINI_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
}

export class GeminiQuotaError extends Error {}

// A request Gemini rejected for a reason retrying cannot fix (bad model,
// malformed body, bad audio) — rotating keys only burns quota.
export class GeminiBadRequestError extends Error {}

// Only these statuses are worth rotating keys for: auth/quota problems
// and server errors. Anything else (400, 403, 404) fails fast.
function isRetryableGeminiStatus(status: number): boolean {
  return status === 401 || status === 429 || status >= 500;
}

function geminiStatusOf(err: unknown): number | null {
  const e = err as { status?: unknown; code?: unknown; message?: string };
  if (typeof e?.status === "number") return e.status;
  if (typeof e?.code === "number") return e.code;
  const m = /(\b4\d\d\b|\b5\d\d\b)/.exec(e?.message || "");
  return m ? Number(m[1]) : null;
}

// Gemini sometimes wraps its JSON in markdown fences or double-encodes it
// ({"reply": "{\"reply\": ...}"}) — extract the real object robustly.
function extractGeminiJson(raw: string): { reply?: unknown; order?: unknown } | null {
  let text = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(text);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as { reply?: unknown; order?: unknown };
  } catch {
    return null;
  }
}

// Extra instruction appended to the shared system prompt for Gemini only.
// User 28 Nov 09:02: the CALL SCREEN shows TWO language options — Sindhi
// and Urdu — and the customer picks whichever they want. Sindhi is ROMAN
// Sindhi (Latin letters): Gemini TTS rejects Sindhi (Arabic) script with
// HTTP 400, so the voice could not speak at all (verified 28 Nov 08:57 —
// Urdu script and Roman Urdu both synthesise fine; Roman Sindhi also
// synthesises fine, verified 08:59). Urdu is Roman Urdu, as before.
// "Natural insan jaise bole, ziyada na soche, na ruke" — speak like a real
// human: warm, relaxed, immediate, no hesitation, no thinking out loud,
// no pauses. "High level fast" still applies — replies VERY short, order
// flow fast. The language comes from the client's `language` field
// ("ur" | "sd", default "ur").
function geminiReplyRules(language: string): string {
  const isSindhi = language === "sd";
  const langName = isSindhi ? "Roman Sindhi (Sindhi written in Latin letters)" : "Roman Urdu (Urdu written in Latin letters)";
  const example = isSindhi
    ? "'Assalam-o-Alaikum, kiyan haal aahin?'"
    : "'Assalam-o-Alaikum, kya haal hain?'";
  const never = isSindhi
    ? "NEVER use Sindhi (Arabic) script, Urdu script, Roman Urdu, or English."
    : "NEVER use Sindhi, Urdu script, or English.";
  const ignore = isSindhi
    ? "Ignore any earlier instruction to use Roman Urdu, Urdu script, or Sindhi script — the customer chose Roman Sindhi."
    : "Ignore any earlier instruction to use Sindhi or Urdu script — the customer chose Roman Urdu.";
  return (
    "\n\nVERY IMPORTANT — READ CAREFULLY:\n" +
    `1. Reply ONLY in ${langName}, like ${example}. ${ignore} ${never} Your whole reply must be in ${langName}.\n` +
    "2. Talk like a smart, friendly LOCAL guy from Dadu — warm, casual, quick — NOT a formal corporate robot. Jump straight to the point in the very first sentence. Never use a robotic greeting (the greeting is already done — never greet again). Match the customer's vibe: if they are casual, be casual; if they are in a hurry, be quick.\n" +
    "3. Speak NATURALLY, like a real friendly human on the phone — warm, relaxed, conversational. Answer IMMEDIATELY. Do NOT think out loud, do NOT hesitate, do NOT pause, do NOT say 'soch raha hoon' or anything like it. Just say the reply, straight away, like a person would.\n" +
    "4. Keep every reply VERY short — ONE short sentence only, maximum 15 words. Be FAST. Never explain. The ONE exception is the final order read-back (items, total, address, payment) — that may be longer, as a clear list.\n" +
    "5. Take the order FAST: ask only what is missing (item, quantity) — one quick question at a time. Do NOT suggest extras, do NOT linger on any single item. Confirm briefly and place the order quickly.\n" +
    "6. NEVER invent a menu item, price, or delivery time. Only use the menu below. If an item is not in the menu or you are unsure, say so honestly and give the helpline 03277004471.\n" +
    "7. Your ENTIRE output must be ONE single JSON object: {\"reply\": \"...\", \"order\": ...}. Do NOT wrap that object inside another JSON string, do NOT put it in a code block, do NOT add any text before or after it."
  );
}

async function callGeminiChat(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: { role: string; content: string }[],
  language: string,
): Promise<ChatResult> {
  const ai = new GoogleGenAI({ apiKey });
  // Gemini uses "model" for the assistant role (Groq/OpenAI use
  // "assistant") — convert, and drop any empty turns.
  const contents = messages
    .filter((m) => m.content.trim().length > 0)
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  const resp = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: systemPrompt + geminiReplyRules(language),
      temperature: 0.7,
      maxOutputTokens: 1000,
      // Do not think: the user wants an immediate, natural, human-like
      // reply with no hesitation — a one-sentence order reply needs no
      // deliberation, and thinking tokens were eating the output budget.
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: "application/json",
    },
  });
  const raw = (resp.text || "").trim();
  let parsed = extractGeminiJson(raw);
  // Double-encoded reply: {"reply": "{\"reply\": \"...\"}"} — unwrap it.
  let depth = 0;
  while (parsed && typeof parsed.reply === "string" && parsed.reply.trim().startsWith("{") && depth < 2) {
    const inner = extractGeminiJson(parsed.reply);
    if (!inner) break;
    parsed = inner;
    depth++;
  }
  if (!parsed || typeof parsed.reply !== "string" || !parsed.reply.trim()) {
    return { reply: raw || "Maaf kijiye, samajh nahi aaya — dobara bolein.", order: null };
  }
  const order = validateOrder(parsed.order);
  const orderGiven = parsed.order !== null && parsed.order !== undefined;
  return { reply: parsed.reply.trim(), order, orderInvalid: orderGiven && !order };
}

export async function handleVoiceChat(
  body: unknown,
  ip: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const keys = getGeminiKeys();
  if (keys.length === 0) {
    return { status: 503, body: { error: "quota", message: GEMINI_QUOTA_MESSAGE } };
  }
  if (rateLimited(ip, "voice-chat")) {
    return { status: 429, body: { error: "rate_limited", message: GEMINI_QUOTA_MESSAGE } };
  }
  const b = (body || {}) as Record<string, unknown>;
  if (!Array.isArray(b.messages) || typeof b.menuText !== "string") {
    return { status: 400, body: { error: "messages and menuText are required" } };
  }
  if (JSON.stringify(body).length > MAX_CHAT_BODY_CHARS) {
    return { status: 413, body: { error: "request too large" } };
  }
  const messages = (b.messages as { role?: unknown; content?: unknown }[])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-8)
    .map((m) => ({ role: m.role as string, content: (m.content as string).slice(0, 2000) }));
  const systemPrompt = buildSystemPrompt({
    activeOrderText: typeof b.activeOrderText === "string" ? b.activeOrderText.slice(0, 1500) : undefined,
    // Menu trimmed 40000 -> 25000 chars (28 Nov 2026 speed fix): the full
    // menu (~630 items, ~30k chars) was sent on EVERY message. Food dishes
    // come first in menuText, so they all survive the cut; the long tail of
    // niche grocery items is dropped. Saves ~4k tokens per request.
    menuText: (b.menuText as string).slice(0, 25000),
    ordersText: typeof b.ordersText === "string" ? b.ordersText.slice(0, 8000) : "",
    userName: typeof b.userName === "string" ? b.userName.slice(0, 100) : undefined,
    userPhone: typeof b.userPhone === "string" ? b.userPhone.slice(0, 30) : undefined,
    userProfileText: typeof b.userProfileText === "string" ? b.userProfileText.slice(0, 1000) : undefined,
    locationText: typeof b.locationText === "string" ? b.locationText.slice(0, 200) : undefined,
  });
  const model = getGeminiModel();
  // Call-screen language choice ("ur" | "sd", default "ur") — the customer
  // picks Sindhi or Urdu on the call screen; the reply rules follow it.
  const language = typeof b.language === "string" && b.language === "sd" ? "sd" : "ur";
  for (const key of keys) {
    try {
      const result = await Promise.race([
        callGeminiChat(key, model, systemPrompt, messages, language),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new GeminiQuotaError("Gemini chat timed out")), FETCH_TIMEOUT_MS),
        ),
      ]);
      return { status: 200, body: { reply: result.reply, order: result.order, orderInvalid: result.orderInvalid || false } };
    } catch (err) {
      const status = geminiStatusOf(err);
      if (status !== null && !isRetryableGeminiStatus(status)) {
        // Rotating keys cannot fix a bad request — fail fast with 400.
        return { status: 400, body: { error: "bad_request", message: "Gemini rejected the request." } };
      }
      console.error("Gemini chat error (rotating key):", err instanceof Error ? err.message.slice(0, 200) : "network error");
      continue;
    }
  }
  return { status: 503, body: { error: "quota", message: GEMINI_QUOTA_MESSAGE } };
}

export async function transcribeWithGemini(
  apiKey: string,
  audio: Buffer,
  mimeType: string,
): Promise<{ text: string; language: string | null }> {
  const ai = new GoogleGenAI({ apiKey });
  const model = getGeminiModel();
  const resp = await Promise.race([
    ai.models.generateContent({
      model,
      contents: [
        {
          parts: [
            { inlineData: { mimeType, data: audio.toString("base64") } },
            {
              text: "Transcribe this audio exactly as spoken, word for word. The speaker is speaking Urdu (most likely Roman Urdu / Urdu written in Latin letters, or Urdu script) or Sindhi (most likely Roman Sindhi / Sindhi written in Latin letters), or English. Reply with ONLY the transcription text, nothing else.",
            },
          ],
        },
      ],
      config: { temperature: 0 },
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new GeminiQuotaError("Gemini transcribe timed out")), FETCH_TIMEOUT_MS),
    ),
  ]);
  const text = (resp.text || "").trim();
  return { text, language: text ? "ur" : null };
}

export async function handleVoiceTranscribe(
  contentType: string | undefined,
  rawBody: Buffer,
  ip: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const keys = getGeminiKeys();
  if (keys.length === 0) {
    return { status: 503, body: { error: "quota", message: GEMINI_QUOTA_MESSAGE } };
  }
  if (rateLimited(ip, "voice-transcribe")) {
    return { status: 429, body: { error: "rate_limited", message: GEMINI_QUOTA_MESSAGE } };
  }
  if (rawBody.length > MAX_AUDIO_BYTES) {
    return { status: 413, body: { error: "audio too large" } };
  }
  const files = parseMultipart(rawBody, contentType);
  const audio = files.find((f) => f.fieldName === "audio");
  if (!audio || audio.data.length === 0) {
    return { status: 400, body: { error: "audio file is required" } };
  }
  for (const key of keys) {
    try {
      const result = await transcribeWithGemini(key, audio.data, audio.mimeType);
      return { status: 200, body: { text: result.text, language: result.language } };
    } catch (err) {
      const status = geminiStatusOf(err);
      if (status !== null && !isRetryableGeminiStatus(status)) {
        // A bad audio file fails identically on every key — fail fast.
        return { status: 400, body: { error: "bad_request", message: "Gemini rejected the audio." } };
      }
      console.error("Gemini transcribe error (rotating key):", err instanceof Error ? err.message.slice(0, 200) : "network error");
      continue;
    }
  }
  return { status: 503, body: { error: "quota", message: GEMINI_QUOTA_MESSAGE } };
}
