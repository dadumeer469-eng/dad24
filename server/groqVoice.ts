// Shared Groq voice-agent logic for Dadu Food.
// Used by the Vercel serverless functions (api/voice-chat.ts,
// api/voice-transcribe.ts) and by the local dev server (server.ts), so both
// paths behave identically. No API key is ever logged or stored here — keys
// come only from environment variables at runtime.

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const DEFAULT_MODEL = "openai/gpt-oss-120b";
const WHISPER_MODEL = "whisper-large-v3-turbo";
const FETCH_TIMEOUT_MS = 20000;
const MAX_CHAT_BODY_CHARS = 100_000;
const MAX_AUDIO_BYTES = 4 * 1024 * 1024; // Vercel request limit is 4.5 MB

export const GROQ_QUOTA_MESSAGE =
  "معاف کیجیے، لائن ابھی مصروف ہے — تھوڑی دیر بعد دوبارہ کوشش کریں۔";

export function getGroqKeys(): string[] {
  return [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
    process.env.GROQ_API_KEY_5,
  ].filter((k): k is string => typeof k === "string" && k.trim().length > 0);
}

export function getGroqModel(): string {
  return (process.env.GROQ_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
}

// Simple per-IP rate limit (best-effort on serverless: each instance keeps
// its own counters). 20 requests per minute per IP per endpoint.
const rateStore = new Map<string, { count: number; resetAt: number }>();
export function rateLimited(ip: string, key: string, limit = 20): boolean {
  const now = Date.now();
  const k = `${key}:${ip}`;
  const entry = rateStore.get(k);
  if (!entry || now > entry.resetAt) {
    rateStore.set(k, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}

export function buildSystemPrompt(opts: {
  menuText: string;
  ordersText: string;
  userName?: string;
  userPhone?: string;
}): string {
  const { menuText, ordersText, userName, userPhone } = opts;
  return `You are the Dadu Food voice order assistant — a friendly, intelligent, welcoming female restaurant receptionist for Dadu Food, food and grocery delivery in Dadu city, Sindh, Pakistan. You talk to customers on a phone call, so keep replies short (1-2 sentences) and natural, like a real human shopkeeper from Dadu. Never say you are an AI, a bot, a machine, or an assistant program.
LANGUAGE (strict): ALWAYS reply in Urdu (Urdu script) only. Never reply in English, Hindi, Sindhi, or Roman Urdu, no matter what language the customer uses. If the customer's words are unclear, politely ask them to repeat in Urdu.
SCOPE (strict): You ONLY talk about Dadu Food — the menu, prices, orders, delivery, payment (COD/Easypaisa), and opening hours. Politely decline anything else and ask what they would like to order.
KNOWLEDGE (use only this — never invent menu items, prices, discounts, delivery times or policies; if information is unavailable, say it needs confirmation):
- Delivery ONLY. There is no pickup option.
- Delivery fee Rs 50, free on orders of Rs 1000 or more. Standard delivery 20-35 minutes. Priority delivery 15-25 minutes for Rs 30 extra.
- Easypaisa payment: name Ghulam Murtaza, number 03277004471. The customer pays in their Easypaisa app and uploads a screenshot of the receipt; the admin verifies it, then the order is confirmed.
- Food shops are open 12:00 PM to 11:00 PM. Medicines can be ordered from the morning. Medicine delivery fee is Rs 30.
- Order statuses: payment_verification_pending (Easypaisa receipt is being checked by the admin — the order starts after approval), placed/pending (order received, waiting for admin approval), confirmed (admin approved, restaurant is preparing), preparing (food is being cooked), out_for_delivery (rider is on the way), delivered (delivered), cancelled (cancelled and will not arrive).
- If the customer asks why an order is late: check their orders below, tell them the current status in simple words, how long it has been, and the expected time. Be honest and empathetic — apologize for the wait and reassure them. Never invent a rider's exact location or a precise arrival minute you do not know. If an order is far beyond the normal time, apologize sincerely and say the admin has been informed and the order is being prioritized.
- Cancellation: an order can be cancelled before it is confirmed/prepared. If it is already being prepared or out for delivery, it cannot be cancelled.
- To speak to a human, give the store number 03277004471.
CUSTOMER: ${userName ? `Name: ${userName}.` : "Name not known — do not ask for it, the account is signed in."} ${userPhone ? `Phone: ${userPhone}.` : ""}
CUSTOMER'S ORDERS (most recent first):
${ordersText && ordersText.trim() ? ordersText : "The customer has no orders."}
MENU (name — price in Rs — type):
${menuText}
YOUR JOB — take the order step by step:
1. Ask what they want to order and how many of each. Use the EXACT item names from the menu. If the customer asks for something not on the menu, say it is not available and suggest the closest menu item. If no quantity is given, assume 1.
2. Ask the delivery address (area/mohalla and house/street).
3. Ask the payment method: Cash on Delivery (COD) or Easypaisa.
4. Read back the FULL order (items, quantities, total price, address, payment) and ask them to confirm it is correct.
5. Only after the customer explicitly confirms, return the order in the JSON below. Before that, order must be null.
Always respond in JSON ONLY, no other text:
{"reply": "<your reply to speak aloud>", "order": null}
When everything is collected and confirmed:
{"reply": "<short thank-you confirmation>", "order": {"items": [{"name": "<exact menu name>", "qty": <number>, "type": "food" or "grocery"}], "address": {"area": "<area/mohalla>", "street": "<house/street>"}, "payment": "COD" or "Easypaisa"}}`;
}

export interface ChatOrder {
  items: { name: string; qty: number; type: "food" | "grocery" }[];
  address: { area: string; street: string };
  payment: "COD" | "Easypaisa";
}

export interface ChatResult {
  reply: string;
  order: ChatOrder | null;
}

function validateOrder(raw: unknown): ChatOrder | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.items) || o.items.length === 0) return null;
  const items: ChatOrder["items"] = [];
  for (const it of o.items) {
    if (!it || typeof it !== "object") return null;
    const item = it as Record<string, unknown>;
    if (typeof item.name !== "string" || !item.name.trim()) return null;
    const qty = Number(item.qty);
    if (!Number.isFinite(qty) || qty < 1 || qty > 50) return null;
    if (item.type !== "food" && item.type !== "grocery") return null;
    items.push({ name: item.name.trim(), qty: Math.floor(qty), type: item.type });
  }
  const addr = o.address as Record<string, unknown> | undefined;
  if (!addr || typeof addr.area !== "string" || !addr.area.trim() || typeof addr.street !== "string" || !addr.street.trim()) return null;
  if (o.payment !== "COD" && o.payment !== "Easypaisa") return null;
  return { items, address: { area: addr.area.trim(), street: addr.street.trim() }, payment: o.payment };
}

export class GroqQuotaError extends Error {}

async function callGroqChat(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: { role: string; content: string }[],
): Promise<ChatResult> {
  const resp = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.7,
      max_tokens: 600,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!resp.ok) throw new GroqQuotaError(`Groq chat failed: ${resp.status}`);
  const data = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data?.choices?.[0]?.message?.content || "";
  let parsed: { reply?: unknown; order?: unknown } | null = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  if (!parsed || typeof parsed.reply !== "string" || !parsed.reply.trim()) {
    return { reply: raw.trim() || "معاف کیجیے، سمجھ نہیں آیا — دوبارہ بولیں۔", order: null };
  }
  return { reply: parsed.reply.trim(), order: validateOrder(parsed.order) };
}

export async function handleVoiceChat(
  body: unknown,
  ip: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const keys = getGroqKeys();
  if (keys.length === 0) {
    return { status: 503, body: { error: "quota", message: GROQ_QUOTA_MESSAGE } };
  }
  if (rateLimited(ip, "voice-chat")) {
    return { status: 429, body: { error: "rate_limited", message: GROQ_QUOTA_MESSAGE } };
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
    .slice(-12)
    .map((m) => ({ role: m.role as string, content: (m.content as string).slice(0, 2000) }));
  const systemPrompt = buildSystemPrompt({
    menuText: (b.menuText as string).slice(0, 40000),
    ordersText: typeof b.ordersText === "string" ? b.ordersText.slice(0, 8000) : "",
    userName: typeof b.userName === "string" ? b.userName.slice(0, 100) : undefined,
    userPhone: typeof b.userPhone === "string" ? b.userPhone.slice(0, 30) : undefined,
  });
  const model = getGroqModel();
  for (const key of keys) {
    try {
      const result = await callGroqChat(key, model, systemPrompt, messages);
      return { status: 200, body: { reply: result.reply, order: result.order } };
    } catch (err) {
      console.error("Groq chat error (rotating key):", err instanceof GroqQuotaError ? err.message : "network error");
      continue;
    }
  }
  return { status: 503, body: { error: "quota", message: GROQ_QUOTA_MESSAGE } };
}

export async function transcribeWithGroq(
  apiKey: string,
  audio: Buffer,
  filename: string,
  mimeType: string,
): Promise<{ text: string; language: string | null }> {
  const boundary = `----dadufood-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`,
  );
  const tail = Buffer.from(
    `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\n${WHISPER_MODEL}\r\n--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\nur\r\n--${boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\njson\r\n--${boundary}--\r\n`,
  );
  const resp = await fetch(GROQ_TRANSCRIBE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": `multipart/form-data; boundary=${boundary}` },
    body: Buffer.concat([head, audio, tail]),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!resp.ok) throw new GroqQuotaError(`Groq transcribe failed: ${resp.status}`);
  const data = (await resp.json()) as { text?: string; language?: string };
  return { text: (data.text || "").trim(), language: typeof data.language === "string" ? data.language : null };
}

export interface UploadedFile {
  fieldName: string;
  filename: string;
  mimeType: string;
  data: Buffer;
}

export function parseMultipart(body: Buffer, contentType: string | undefined): UploadedFile[] {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || "");
  if (!match) return [];
  const boundary = Buffer.from(`--${(match[1] || match[2] || "").trim()}`);
  const files: UploadedFile[] = [];
  let start = body.indexOf(boundary);
  while (start !== -1) {
    const headerEnd = body.indexOf(Buffer.from("\r\n\r\n"), start);
    if (headerEnd === -1) break;
    const headers = body.subarray(start + boundary.length, headerEnd).toString("utf8");
    const next = body.indexOf(boundary, headerEnd + 4);
    if (next === -1) break;
    let data = body.subarray(headerEnd + 4, next);
    if (data.length >= 2 && data[data.length - 2] === 13 && data[data.length - 1] === 10) {
      data = data.subarray(0, data.length - 2);
    }
    const nameMatch = /name="([^"]*)"/i.exec(headers);
    const fileMatch = /filename="([^"]*)"/i.exec(headers);
    const typeMatch = /content-type:\s*([^\r\n]+)/i.exec(headers);
    if (nameMatch && fileMatch) {
      files.push({
        fieldName: nameMatch[1],
        filename: fileMatch[1] || "voice.webm",
        mimeType: (typeMatch?.[1] || "audio/webm").trim(),
        data: Buffer.from(data),
      });
    }
    start = next;
  }
  return files;
}

export async function handleVoiceTranscribe(
  contentType: string | undefined,
  rawBody: Buffer,
  ip: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const keys = getGroqKeys();
  if (keys.length === 0) {
    return { status: 503, body: { error: "quota", message: GROQ_QUOTA_MESSAGE } };
  }
  if (rateLimited(ip, "voice-transcribe")) {
    return { status: 429, body: { error: "rate_limited", message: GROQ_QUOTA_MESSAGE } };
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
      const result = await transcribeWithGroq(key, audio.data, audio.filename, audio.mimeType);
      return { status: 200, body: { text: result.text, language: result.language } };
    } catch (err) {
      console.error("Groq transcribe error (rotating key):", err instanceof GroqQuotaError ? err.message : "network error");
      continue;
    }
  }
  return { status: 503, body: { error: "quota", message: GROQ_QUOTA_MESSAGE } };
}

export async function readRawBody(req: AsyncIterable<Buffer>): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}
