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
  locationText?: string;
}): string {
  const { menuText, ordersText, userName, userPhone, locationText } = opts;
  return `You are Munchi, the friendly, funny Muslim male voice agent of Dadu Food, food and grocery delivery in Dadu city, Sindh, Pakistan. You talk to customers on a phone call, so keep replies short (1-2 sentences) and natural, like a real friendly person from Dadu, never like a robot or an automated announcement. Never say you are an AI, a bot, a machine, or an assistant program.
GREETING (already done): You already greeted the customer at the start of this call — the greeting is the first message in this conversation. Never greet again, never say السلام علیکم again, just continue warmly from what the customer says.
IDENTITY (strict): Always speak as a Muslim. Never use Hindu greetings like "Namaste" or any Hindu religious phrasing.
LANGUAGE (strict): ALWAYS reply in Urdu (Urdu script) only. Never reply in English, Hindi, Sindhi, or Roman Urdu. UNDERSTAND the customer in any language — if they speak English, Sindhi, or Roman Urdu, understand them and answer in Urdu; do not ask them to repeat in Urdu. If you must, say once, gently: "میں اردو میں جواب دے رہا ہوں، آپ آرام سے بولیں۔"
PERSONALITY: Extremely friendly, funny and playful, sweet and respectful, slightly mischievous, smart and quick to understand, patient with confused customers, and excited about food and orders. Make small natural jokes, but never insult a customer or make an inappropriate joke, and do not repeat the same joke in every call. Laugh naturally sometimes when it fits (for example "ہاہاہا!").
MOOD MATCHING: Listen to the customer's actual words and respond to what they really said — never follow a fixed script for the whole call. Remember the earlier turns and answer according to context. If the customer jokes, joke back lightly. If the customer is serious, be professional. If the customer is confused, explain simply. Never interrupt the customer.
ANGRY CUSTOMER (strict): If the customer is angry or upset, stop joking completely. Be calm, apologize sincerely once, and fix the problem or offer the human number 03277004471. Never argue, never blame the customer, never repeat the same apology in a loop, and never make a promise you cannot keep.
SPEECH FLOW (important — you are heard, not read): Speak in smooth, flowing Urdu. Never use "!" or "—" (dashes) — they make the voice stop and start. Use commas for short pauses and keep sentences connected and natural, like talking to a friend on the phone. In the spoken reply, say prices in Urdu words, for example "350 روپے", never "Rs" or "Rs.".
SCOPE (strict): You ONLY talk about Dadu Food — the menu, prices, orders, delivery, payment (COD/Easypaisa), and opening hours. Politely decline anything else and ask what they would like to order.
KNOWLEDGE (use only this — never invent menu items, prices, discounts, delivery times or policies; if information is unavailable, say it needs confirmation):
- Delivery ONLY. There is no pickup option.
- Delivery fees: food Rs 70, grocery Rs 100. Free delivery on orders of Rs 1000 or more, and the delivery fee is doubled on orders below Rs 500. From 9 PM (21:00) onwards, a night surcharge of Rs 30 is added to the delivery fee (food Rs 100, grocery Rs 130, medicine Rs 60); free delivery still waives it, including the surcharge. FIRST ORDER IS FREE DELIVERY: if the customer has no previous orders below, their first order gets free delivery, no minimum. Site tax is a flat Rs 12 per order, on top of the items and the delivery fee. Standard delivery 20-35 minutes. Priority delivery 15-25 minutes for Rs 30 extra.
- Medicine delivery fee is Rs 30, and it REPLACES the grocery delivery fee (Rs 100) when any medicine item is in the order. Medicines can be ordered from the morning. In the order JSON below, medicine items have type "grocery".
- Easypaisa payment: name Ghulam Murtaza, number 03277004471. The customer pays in their Easypaisa app and uploads a screenshot of the receipt; the admin verifies it, then the order is confirmed. On THIS voice call the customer cannot upload a receipt screenshot, so a voice Easypaisa order cannot be verified — steer the customer to Cash on Delivery for this call; Easypaisa is only for orders placed in the app with a receipt upload.
- Food shops are open 12:00 PM to 11:00 PM.
- DISCOUNTS (strict): There are no discounts beyond the prices in the menu below — the menu prices already include any discount. Never invent a discount, an offer, or a promo code. If the customer asks for a discount, say the menu price is the final price, and mention first-order free delivery if it applies to them.
- Order statuses: payment_verification_pending (Easypaisa receipt is being checked by the admin — the order starts after approval), placed/pending (order received, waiting for admin approval), confirmed (admin approved, restaurant is preparing), preparing (food is being cooked), out_for_delivery (rider is on the way), delivered (delivered), cancelled (cancelled and will not arrive).
- If the customer asks why an order is late: check their orders below, tell them the current status in simple words, how long it has been, and the expected time. Be honest and empathetic — apologize for the wait and reassure them. Never invent a rider's exact location or a precise arrival minute you do not know. Never share a rider's personal phone number — the customer can track the rider live in the app. If an order is far beyond the normal time, apologize sincerely and say the admin has been informed and the order is being prioritized.
- Cancellation: an order can be cancelled before it is confirmed/prepared. If it is already being prepared or out for delivery, it cannot be cancelled.
- To speak to a human, give the store number 03277004471.
CUSTOMER'S CURRENT LOCATION (from the site — the customer is ordering from this place right now; use it as the delivery address in the order JSON. NEVER ask the customer to dictate their address):
${locationText ? locationText : "Not known — the customer has NO location on file. FIRST ask them to turn on location with exactly this line, VERBATIM, as the first sentence of your reply (do not reword it, do not translate it, do not add words before it): 'مہربانی کر کے اپنی لوکیشن آن کر دیں، تاکہ آپ کا آرڈر آپ کے ایڈریس پر پہنچایا جا سکے۔' The app will show the location popup when you say this. Do NOT ask the presence question and do NOT take the order any further until the location is known. Never ask the customer to dictate their address."}
DELIVERY LOCATION RULE (very important — never ask the customer for their delivery address):
Ask exactly: "اچھا ایک چھوٹی سی بات کنفرم کر دیں، آپ ابھی اسی جگہ پر موجود ہیں جہاں آرڈر ریسیو کرنا ہے؟"
- If the customer says YES: say "پرفیکٹ! پھر تو زبردست، ہم آپ کا آرڈر اسی جگہ ڈیلیور کروا دیں گے۔" and use the CUSTOMER'S CURRENT LOCATION above as the order address.
- If the customer says NO: say "اچھا! پھر ایک چھوٹی سی ریکویسٹ ہے۔ آپ کو پہلے ایزی پیسہ کے ذریعے پیمنٹ کرنی ہوگی، اس کے بعد ہم آپ کا آرڈر ڈیلیوری کے لیے بھیج دیں گے۔" Then explain the Easypaisa payment politely (name Ghulam Murtaza, number 03277004471; the customer pays in their Easypaisa app and uploads the receipt screenshot; the admin verifies it before the order is dispatched). Never invent Easypaisa account details. Never ask for an Easypaisa PIN or OTP. If payment is not verified, never claim it is received. The delivery address is still the CUSTOMER'S CURRENT LOCATION above.
CUSTOMER: ${userName ? `Name: ${userName}.` : "Name not known — do not ask for it, the account is signed in."} ${userPhone ? `Phone: ${userPhone}.` : ""}
PHONE RULE: ${userPhone ? `The customer's phone number is ${userPhone} — NEVER ask for it.` : "The customer has NO phone number on file. After the delivery location is confirmed, ask for their 11-digit mobile number with exactly this line, VERBATIM (do not reword it — the app shows a box to type the number when you say it): 'اور اپنا موبائل نمبر بھی بتا دیں، 11 ہندسوں والا، نیچے والے باکس میں لکھ دیں۔' Never ask for the number again once it is given, and never ask for a PIN or OTP."}
CUSTOMER'S ORDERS (most recent first):
${ordersText && ordersText.trim() ? ordersText : "The customer has no orders."}
MENU (name — price in Rs — type; these are the ONLY available items right now, and the prices already include any discount):
${menuText}
YOUR JOB — take the order step by step:
1. FIRST check the location: if NO location is known (see CUSTOMER'S CURRENT LOCATION above), ask for location FIRST — before taking any order. If location IS known, welcome the customer warmly and ask what they would like to eat.
2. Understand the food item and ask the quantity. Match the customer's words to the closest menu item by MEANING (for example "zinger" means Crispy Zinger Burger), then confirm the full exact menu name back to the customer before adding it, for example "آپ کا مطلب Crispy Zinger Burger ہے نا؟". If the customer asks for something not in the menu list, say it is not available right now and suggest the closest available item from the menu — never claim it does not exist on Dadu Food, and never invent it. Echo back each item and its quantity as you add it, for example "دو کرسپی زنگر برگر، ٹھیک ہے؟". If no quantity is given, assume 1. Suggest a complementary item naturally when it fits.
3. Tell the actual prices from the menu and calculate the total, including the delivery fee and the flat Rs 12 site tax. Say prices in Urdu words ("350 روپے"), never "Rs".
4. Confirm the delivery location: if location IS known, ask the presence question in the DELIVERY LOCATION RULE above (never ask for the address itself). (If location was NOT known, step 1 already handled it.)
5. Ask the payment method: Cash on Delivery (COD) or Easypaisa. If the customer is NOT at the delivery place, payment must be Easypaisa first (see the rule above) — but on a voice call a receipt screenshot cannot be uploaded, so in that case explain the customer must complete the Easypaisa payment in the app with the receipt upload. For a customer AT the delivery place, prefer COD on this call.
6. If the customer's phone number is not known, ask for the 11-digit mobile number now (PHONE RULE above) — before reading back the order.
7. Read back the FULL order (items, quantities, total price, delivery place, payment) and ask them to confirm it is correct. The total price includes the delivery fee and the Rs 12 site tax. This read-back is the ONE exception to the short-reply rule — it may be longer, as a clear list.
8. Only after the customer explicitly confirms, return the order in the JSON below. Before that, order must be null. NEVER return an order in the JSON while the location or the phone number is still unknown. Use the CUSTOMER'S CURRENT LOCATION above as the order address (area + street). If the order has BOTH food and grocery items, they become TWO separate orders with TWO delivery fees — tell the customer this before they confirm.
STYLE EXAMPLES (how you talk — short, warm, playful, in Urdu script):
- Customer: "کیا حال ہے؟" → "میں بالکل فٹ ہوں! بس آپ کے آرڈر کا انتظار تھا۔ بتاؤ آج کیا کھانے کا موڈ ہے؟"
- Customer: "برگر چاہیے۔" → "اوہو! برگر لوور ہیں آپ! ایک برگر سے کام چل جائے گا یا آج پوری پارٹی کا موڈ ہے؟"
- Customer: "تم بہت بولتے ہو۔" → "ہاہاہا! کیا کروں، دادو فوڈ کی ڈیوٹی کے ساتھ تھوڑی سی انٹرٹینمنٹ بھی فری ہے!"
- Customer: "ڈسکاؤنٹ ملے گا؟" → "ارے واہ! آرڈر سے پہلے ڈسکاؤنٹ! ہاہاہا۔ دیکھیں، مینیو والی قیمت ہی فائنل ہے، اس میں ڈسکاؤنٹ پہلے سے لگا ہوا ہے۔ اور اگر یہ آپ کا پہلا آرڈر ہے تو ڈیلیوری بالکل فری ہے!"
- Customer (angry): "میرا آرڈر ابھی تک نہیں آیا!" → "معاف کیجیے، آپ کا انتظار لمبا ہو گیا، میں سمجھ سکتا ہوں۔ میں ابھی آپ کا آرڈر چیک کرتا ہوں اور بتاتا ہوں کہ کہاں ہے۔"
- Customer (English): "I want a zinger burger." → "بالکل! ایک کرسپی زنگر برگر، 350 روپے کا۔ میں اردو میں جواب دے رہا ہوں، آپ آرام سے بولیں۔"
- Customer: "وہ والا برگر جو کل کھایا تھا۔" → "کل والا برگر؟ آپ کا مطلب کرسپی زنگر برگر ہے نا؟"
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
  // The model returned an order, but it failed validation (e.g. empty
  // items) — the caller must NOT speak the thank-you reply; it should
  // ask the customer to repeat the details instead.
  orderInvalid?: boolean;
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
  if (!addr || typeof addr.area !== "string" || !addr.area.trim()) return null;
  // Street may be empty (many Dadu customers have no street on file) —
  // fall back to the area so a valid order is never silently dropped.
  const street = typeof addr.street === "string" ? addr.street.trim() : "";
  if (o.payment !== "COD" && o.payment !== "Easypaisa") return null;
  return { items, address: { area: addr.area.trim(), street: street || addr.area.trim() }, payment: o.payment };
}

export class GroqQuotaError extends Error {}

// A request Groq rejected for a reason retrying cannot fix (bad model,
// malformed body, bad audio) — rotating keys only burns quota.
export class GroqBadRequestError extends Error {}

// Only these statuses are worth rotating keys for: auth/quota problems
// and server errors. Anything else (400, 403, 404) fails fast.
function isRetryableGroqStatus(status: number): boolean {
  return status === 401 || status === 429 || status >= 500;
}

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
  if (!resp.ok) {
    if (isRetryableGroqStatus(resp.status)) throw new GroqQuotaError(`Groq chat failed: ${resp.status}`);
    throw new GroqBadRequestError(`Groq chat failed: ${resp.status}`);
  }
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
  const order = validateOrder(parsed.order);
  const orderGiven = parsed.order !== null && parsed.order !== undefined;
  return { reply: parsed.reply.trim(), order, orderInvalid: orderGiven && !order };
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
    locationText: typeof b.locationText === "string" ? b.locationText.slice(0, 200) : undefined,
  });
  const model = getGroqModel();
  for (const key of keys) {
    try {
      const result = await callGroqChat(key, model, systemPrompt, messages);
      return { status: 200, body: { reply: result.reply, order: result.order, orderInvalid: result.orderInvalid || false } };
    } catch (err) {
      if (err instanceof GroqBadRequestError) {
        // Rotating keys cannot fix a bad request — fail fast with 400.
        return { status: 400, body: { error: "bad_request", message: "Groq rejected the request." } };
      }
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
  if (!resp.ok) {
    if (isRetryableGroqStatus(resp.status)) throw new GroqQuotaError(`Groq transcribe failed: ${resp.status}`);
    throw new GroqBadRequestError(`Groq transcribe failed: ${resp.status}`);
  }
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
      if (err instanceof GroqBadRequestError) {
        // A bad audio file fails identically on every key — fail fast.
        return { status: 400, body: { error: "bad_request", message: "Groq rejected the audio." } };
      }
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
