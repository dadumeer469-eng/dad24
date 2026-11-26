// Local voice order agent — NO API key, NO network. Everything runs inside
// the site: the menu, the order flow and all Dadu Food knowledge live here.
// The agent speaks Urdu (Urdu script, so the phone's built-in Urdu voice
// reads it naturally) and understands Roman Urdu, Urdu script and English.

export interface LocalMenuItem {
  name: string;
  price: number;
  type: "food" | "grocery";
}

export interface LocalOrderItem {
  name: string;
  qty: number;
}

export interface LocalOrder {
  id: string;
  items: LocalOrderItem[];
  total: number;
  status: string;
  placedAtMs: number;
  payment: string;
  speed: string;
}

export interface LocalVoiceOrder {
  items: { name: string; qty: number; type: "food" | "grocery" }[];
  address: { area: string; street: string };
  payment: "COD" | "Easypaisa";
}

export interface LocalAgentReply {
  say: string;
  done: boolean;
  order?: LocalVoiceOrder;
}

// ---- Normalisation: Urdu script / Roman Urdu / English -> Latin tokens ----

const URDU_DIGITS: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};

const NUMBER_WORDS: Record<string, number> = {
  "ایک": 1, "دو": 2, "تین": 3, "چار": 4, "پانچ": 5, "چھ": 6,
  "سات": 7, "آٹھ": 8, "نو": 9, "دس": 10,
  aik: 1, ek: 1, do: 2, teen: 3, char: 4, chaar: 4, panch: 5, paanch: 5,
  chhe: 6, che: 6, saat: 7, aath: 8, nau: 9, das: 10,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10,
};

// Common food/grocery words in Urdu script -> Latin, so "زنگر برگر" matches
// the menu item "Zinger Burger" and "چکن بریانی" matches "Chicken Biryani".
const URDU_WORD_MAP: Record<string, string> = {
  "برگر": "burger", "زنگر": "zinger", "چکن": "chicken", "مرغی": "chicken",
  "بریانی": "biryani", "شوارما": "shawarma", "کڑاہی": "karahi",
  "پیزا": "pizza", "فرائز": "fries", "سینڈوچ": "sandwich", "رول": "roll",
  "ٹکا": "tikka", "تکہ": "tikka", "کباب": "kabab", "انڈا": "egg",
  "انڈے": "egg", "چائے": "chai", "دودھ": "milk", "پانی": "water",
  "گھی": "ghee", "تیل": "oil", "چینی": "sugar", "آٹا": "atta",
  "چاول": "rice", "دال": "daal", "مٹن": "mutton", "بیف": "beef",
  "مچھلی": "fish", "پنیر": "cheese", "چیز": "cheese", "سوپ": "soup",
  "سلاد": "salad", "جوس": "juice", "بسکٹ": "biscuit", "شیمپو": "shampoo",
  "صابن": "soap", "سرف": "surf", "ایکسل": "excel", "میزان": "mezan",
  "تپال": "tapal", "ڈالڈا": "dalda", "ایوا": "eva", "ملک": "milk",
  "اولپر": "olpers", "گوشت": "meat", "سبزی": "sabzi", "دہی": "dahi",
  "مکھن": "butter", "جام": "jam", "شہد": "honey", "نمک": "salt",
  "مرچ": "mirch", "آئسکریم": "icecream", "کیک": "cake", "سموسہ": "samosa",
  "پکوڑا": "pakora", "پراٹھا": "paratha", "نان": "naan", "روٹی": "roti",
  "حلیم": "haleem", "نہاری": "nihari", "بریڈ": "bread", "مصالحہ": "masala",
  "کولڈرنک": "colddrink", "کولڈ": "cold", "ڈرنک": "drink", "بوتل": "bottle",
  "پیک": "pack", "چھوٹا": "small", "بڑا": "large", "درمیانہ": "medium",
};

// Control / intent words in Urdu script -> Latin, so stage keywords work
// when the customer speaks Urdu ("بس" = bas, "ہاں" = haan, "کیش" = cash).
const URDU_CONTROL_MAP: Record<string, string> = {
  "بس": "bas", "نہیں": "nahi", "ہاں": "haan", "جی": "ji", "کیش": "cash",
  "نقد": "cash", "آرڈر": "order", "کنفرم": "confirm", "منسوخ": "cancel",
  "دوبارہ": "dobara", "شروع": "shuru", "شکریہ": "shukriya",
  "السلام": "salam", "وعلیکم": "salam", "ڈیلیوری": "delivery",
  "فیس": "fee", "چارجز": "charges", "دیر": "der", "کب": "kab",
  "کہاں": "kahan", "خبر": "status", "نمبر": "number", "رابطہ": "rabta",
  "کھلا": "khula", "بند": "band", "وقت": "time", "آن": "online",
  "لائن": "online", "گھر": "ghar", "گلی": "gali", "علاقہ": "area",
  "محلہ": "mohalla", "میرا": "mera", "میں": "main", "سے": "se",
  "ہوں": "hoon", "ایزی": "easypaisa", "پیسہ": "easypaisa",
  "پیمنٹ": "payment", "اور": "aur", "چاہیے": "chahiye",
  "کتنا": "kitna", "کتنے": "kitne", "کتنی": "kitni", "منٹ": "minute",
  "روپے": "rupees", "کیا": "kya", "مجھے": "mujhe", "بتائیں": "batayen",
  "موسم": "weather", "بارش": "barish", "کرکٹ": "cricket", "میچ": "match",
  "سیاست": "politics", "فلم": "film", "گانا": "song", "لطیفہ": "joke",
  "کہانی": "story", "ڈرامہ": "drama", "دوائی": "medicine",
  "دوا": "medicine", "دکان": "shop", "ریسٹورنٹ": "restaurant",
  "رائیڈر": "rider", "ٹریک": "track", "آفر": "offer", "ڈسکاؤنٹ": "discount",
  "واؤچر": "voucher", "پرائیورٹی": "priority", "ترجیح": "priority",
  "نام": "name", "کون": "who", "تم": "you", "آپ": "you",
  // Roman aliases, so Roman Urdu works the same as Urdu script.
  "naam": "name", "mosam": "weather", "mausam": "weather",
  "tumhara": "you", "tumhare": "you", "aapka": "you", "tera": "you",
  "dawai": "medicine", "dawa": "medicine", "khabar": "news",
};

const STOP_WORDS = new Set([
  "the", "a", "an", "with", "and", "of", "rs", "rupees", "price", "wala", "wali",
]);

function tokenize(text: string): string[] {
  let t = text.toLowerCase();
  t = t.replace(/[۰-۹]/g, (d) => URDU_DIGITS[d] ?? d);
  const raw = t.split(/[\s,؛،۔!?.؟"“”'()]+/).filter(Boolean);
  const out: string[] = [];
  for (const tok of raw) {
    const mapped =
      URDU_WORD_MAP[tok] ??
      URDU_CONTROL_MAP[tok] ??
      (NUMBER_WORDS[tok] !== undefined ? String(NUMBER_WORDS[tok]) : tok);
    const clean = mapped.replace(/[^a-z0-9]/g, "");
    if (clean) out.push(clean);
  }
  return out;
}

function hasWord(tokens: string[], word: string): boolean {
  return tokens.includes(word);
}

function hasAny(tokens: string[], words: string[]): boolean {
  return words.some((w) => tokens.includes(w));
}

// ---- Menu matching ----

interface MatchedItem {
  item: LocalMenuItem;
  qty: number;
  score: number;
}

function matchItems(text: string, menu: LocalMenuItem[]): MatchedItem[] {
  const tokens = tokenize(text);
  if (tokens.length === 0) return [];
  const joined = ` ${tokens.join(" ")} `;
  const results: MatchedItem[] = [];
  for (const m of menu) {
    // Drop size tokens (1L, 1kg, 500g...) — the customer never says them.
    const nameTokens = m.name
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((w) => w && !STOP_WORDS.has(w) && !/^\d+(l|ml|kg|g|gm|pcs|pack)$/.test(w) && !/^(l|ml|kg|g|gm)$/.test(w));
    if (nameTokens.length === 0) continue;
    const hits = nameTokens.filter((w) => joined.includes(` ${w} `));
    const lastHit = joined.includes(` ${nameTokens[nameTokens.length - 1]} `);
    const score = hits.length / nameTokens.length;
    // Match when the dish's distinctive (last) word is spoken and at least
    // half the name words hit — "shawarma" matches Chicken Shawarma,
    // "zinger burger" matches Crispy Zinger Burger.
    if (!lastHit || score < 0.5) continue;
    // Quantity: nearest number token just before (or just after) the item.
    let qty = 1;
    const firstIdx = tokens.findIndex((t) => t === nameTokens.find((w) => joined.includes(` ${w} `)));
    const lastIdx = tokens.lastIndexOf(nameTokens[nameTokens.length - 1]);
    const anchor = firstIdx >= 0 ? firstIdx : lastIdx;
    for (let i = anchor - 1; i >= Math.max(0, anchor - 3); i--) {
      const n = Number(tokens[i]);
      if (tokens[i] && /^\d+$/.test(tokens[i]) && n >= 1 && n <= 20) { qty = n; break; }
    }
    if (qty === 1) {
      for (let i = lastIdx + 1; i <= Math.min(tokens.length - 1, lastIdx + 2); i++) {
        const n = Number(tokens[i]);
        if (tokens[i] && /^\d+$/.test(tokens[i]) && n >= 1 && n <= 20) { qty = n; break; }
      }
    }
    results.push({ item: m, qty, score });
  }
  // Best match first; drop weaker matches that share a keyword with a
  // stronger one (e.g. "Chicken Burger" vs "Zinger Burger" on "burger").
  results.sort((a, b) => b.score - a.score || b.item.name.length - a.item.name.length);
  const kept: MatchedItem[] = [];
  const usedWords = new Set<string>();
  for (const r of results) {
    const words = r.item.name.toLowerCase().split(/\s+/);
    if (words.some((w) => usedWords.has(w)) && kept.length > 0) continue;
    kept.push(r);
    words.forEach((w) => usedWords.add(w));
  }
  return kept;
}

// ---- Order status in Urdu ----

const STATUS_URDU: Record<string, string> = {
  payment_verification_pending: "آپ کی ایزی پیسہ پیمنٹ کی تصدیق ہو رہی ہے",
  placed: "آرڈر مل گیا ہے، تیار ہو رہا ہے",
  pending: "آرڈر مل گیا ہے، تیار ہو رہا ہے",
  confirmed: "آرڈر کنفرم ہو گیا ہے",
  preparing: "کھانا تیار ہو رہا ہے",
  out_for_delivery: "رائیڈر نکل گیا ہے، راستے میں ہے",
  delivered: "آرڈر ڈیلیور ہو گیا ہے",
  cancelled: "آرڈر منسوخ ہو گیا ہے",
  booked: "بکنگ ہو گئی ہے",
  completed: "آرڈر مکمل ہو گیا ہے",
};

function statusReply(order: LocalOrder): string {
  const elapsedMin = Math.max(0, Math.floor((Date.now() - order.placedAtMs) / 60000));
  const base = STATUS_URDU[order.status] ?? "آرڈر پر کام ہو رہا ہے";
  const items = order.items.map((i) => `${i.qty} ${i.name}`).join("، ");
  const expected = order.speed === "priority" ? "15 سے 25 منٹ" : "20 سے 35 منٹ";
  let say = `آپ کا آرڈر — ${items} — ${order.total} روپے۔ ${base}۔ آرڈر کو ${elapsedMin} منٹ ہو گئے ہیں، عام طور پر ${expected} میں پہنچ جاتا ہے۔`;
  const active = !["delivered", "cancelled", "completed"].includes(order.status);
  if (active && elapsedMin > 40) {
    say += " معاف کیجیے، آپ کا آرڈر لیٹ ہو گیا ہے۔ میں نے ایڈمن کو بتا دیا ہے، آپ کا آرڈر ترجیح پر ہے۔";
  }
  return say;
}

// ---- The agent ----

type Stage = "greet" | "items" | "area" | "street" | "payment" | "confirm" | "done";

export interface LocalVoiceAgent {
  greet(): LocalAgentReply;
  reply(userText: string): LocalAgentReply;
}

const SCOPE_REPLIES = [
  "میں صرف دادو فوڈ کے بارے میں بات کر سکتی ہوں — کھانا، گروسری، آرڈر، ڈیلیوری یا پیمنٹ۔ بتائیں، آپ کیا آرڈر کرنا چاہیں گے؟",
  "یہ میرا کام نہیں ہے، میں صرف دادو فوڈ کی مدد کر سکتی ہوں۔ کوئی آرڈر کرنا ہے؟",
];

const OFF_TOPIC_WORDS = [
  "weather", "barish", "cricket", "match", "politics", "film", "song",
  "joke", "story", "drama", "news",
];

const ADDED_REPLIES = [
  (added: string) => `${added} شامل کر دیا۔ اور کچھ چاہیے؟ یا بس، آگے بڑھیں؟`,
  (added: string) => `جی، ${added} لکھ لیا۔ اور کچھ؟`,
  (added: string) => `${added} ہو گیا۔ کچھ اور چاہیے؟`,
];

const GREETINGS = [
  "السلام علیکم! میں دادو فوڈ کی وائس اسسٹنٹ ہوں۔ آپ کیا آرڈر کرنا چاہیں گے؟",
  "السلام علیکم! دادو فوڈ میں خوش آمدید۔ بتائیں، آج کیا کھانے کا دل کر رہا ہے؟",
];

const CLEAN_AREA_WORDS = [
  "mera", "main", "mein", "se", "hoon", "hun", "area", "mohalla", "محلہ",
  "علاقہ", "میرا", "میں", "سے", "ہوں", "رہتا", "رہتی", "rehta", "rehti",
];

function cleanAddress(text: string): string {
  const tokens = text.trim().split(/\s+/);
  const kept = tokens.filter((t) => !CLEAN_AREA_WORDS.includes(t.toLowerCase()));
  return (kept.length > 0 ? kept : tokens).join(" ").replace(/[۔.,]+$/g, "").trim();
}

export function createLocalVoiceAgent(menu: LocalMenuItem[], orders: LocalOrder[]): LocalVoiceAgent {
  let stage: Stage = "greet";
  let cart: { item: LocalMenuItem; qty: number }[] = [];
  let area = "";
  let street = "";
  let payment: "COD" | "Easypaisa" | null = null;
  let greetCount = 0;
  let addedCount = 0;
  let scopeCount = 0;

  const cartTotal = () => cart.reduce((s, c) => s + c.item.price * c.qty, 0);

  const cartSummary = () =>
    cart.map((c) => `${c.qty} ${c.item.name} — ${c.item.price * c.qty} روپے`).join("، ");

  const readBack = () =>
    `آپ کا آرڈر: ${cartSummary()}۔ کل ${cartTotal()} روپے۔ پتہ: ${area}، ${street}۔ پیمنٹ: ${payment === "Easypaisa" ? "ایزی پیسہ" : "کیش آن ڈیلیوری"}۔ کنفرم کروں؟`;

  function statusAnswer(): string | null {
    if (orders.length === 0) return "آپ کا کوئی آرڈر نہیں ہے۔ پہلے کچھ آرڈر کریں، پھر میں اس کی خبر بتا سکوں گی۔";
    const active = orders.find((o) => !["delivered", "cancelled", "completed"].includes(o.status));
    return statusReply(active ?? orders[0]);
  }

  function infoAnswer(tokens: string[]): string | null {
    if (hasAny(tokens, ["easypaisa", "ایزی", "پیسہ", "online", "payment"])) {
      return "ایزی پیسہ پر پیمنٹ کے لیے نام غلام مرتضیٰ اور نمبر 03277004471 ہے۔ پیمنٹ کر کے رسید کی تصویر اپلوڈ کر دیں، ایڈمن تصدیق کر کے آرڈر کنفرم کر دے گا۔";
    }
    if (hasAny(tokens, ["fee", "charges", "delivery", "ڈیلیوری", "فیس", "چارجز"]) && hasAny(tokens, ["fee", "charges", "فیس", "چارجز", "kitna", "کتنا", "kitne", "کتنے"])) {
      return "ڈیلیوری فیس 50 روپے ہے۔ 1000 روپے سے زیادہ کے آرڈر پر ڈیلیوری بالکل مفت ہے۔";
    }
    if (hasAny(tokens, ["priority"])) {
      return "پرائیورٹی ڈیلیوری 15 سے 25 منٹ میں پہنچتی ہے، اس کی فیس 30 روپے زیادہ ہے۔ عام ڈیلیوری 20 سے 35 منٹ میں، فیس 50 روپے۔";
    }
    if (hasAny(tokens, ["time", "der", "late", "kab", "دیر", "وقت", "کب", "kitni"])) {
      return "ڈیلیوری عام طور پر 20 سے 35 منٹ میں ہو جاتی ہے۔ پرائیورٹی ڈیلیوری 15 سے 25 منٹ میں۔";
    }
    if (hasAny(tokens, ["timing", "khula", "kholta", "band", "کھلا", "بند", "وقت", "timings", "hours", "open"])) {
      return "دادو فوڈ دوپہر 12 بجے سے رات 11 بجے تک کھلا رہتا ہے۔ دوائیں صبح سے ہی مل جاتی ہیں۔";
    }
    if (hasAny(tokens, ["medicine", "pharmacy", "medical"])) {
      return "فارمیسی سے عام دوائیں مل جاتی ہیں — پیناڈول، ڈسپرین، بروفین، فلیجل، رسک اور اور بھی۔ دوائی کی ڈیلیوری فیس الگ 30 روپے ہے، اور دوائیں صبح سے ہی آرڈر ہو سکتی ہیں۔";
    }
    if (hasAny(tokens, ["restaurant", "shop", "hotel"])) {
      return "ہمارے ساتھ دادو کے تین ریسٹورنٹ ہیں — دادو فاسٹ فوڈ، خان جی دسترخوان اور شاہی ذائقہ۔ یہ دوپہر 12 بجے سے رات 11 بجے تک کھلے رہتے ہیں۔";
    }
    if (hasAny(tokens, ["rider", "track"])) {
      return "آرڈر کنفرم ہونے کے بعد رائیڈر assign ہوتا ہے۔ آپ ایپ میں Order Tracker سے اپنے آرڈر کی لائیو لوکیشن دیکھ سکتے ہیں۔";
    }
    if (hasAny(tokens, ["offer", "discount", "voucher"])) {
      return "Special Offers سیکشن میں موجودہ آفرز دیکھ سکتے ہیں۔ کوئی بھی آفر ہو، وہ وہیں نظر آئے گی۔";
    }
    if (hasAny(tokens, ["number", "rabta", "contact", "نمبر", "رابطہ", "phone", "call"])) {
      return "آپ سیدھا 03277004471 پر کال کر سکتے ہیں۔";
    }
    return null;
  }

  function greet(): LocalAgentReply {
    stage = "items";
    const say = GREETINGS[greetCount % GREETINGS.length];
    greetCount += 1;
    return { say, done: false };
  }

  function reply(userText: string): LocalAgentReply {
    const tokens = tokenize(userText);
    const raw = userText.trim();

    // --- Cancel / restart, any time ---
    if (hasAny(tokens, ["cancel", "dobara", "shuru", "منسوخ", "دوبارہ", "شروع", "restart"])) {
      stage = "items";
      cart = [];
      area = "";
      street = "";
      payment = null;
      return { say: "ٹھیک ہے، دوبارہ شروع کرتے ہیں۔ آپ کیا آرڈر کرنا چاہیں گے؟", done: false };
    }

    // --- Order status, any time (but not while confirming) ---
    if (stage !== "confirm" && hasAny(tokens, ["order", "آرڈر"]) && hasAny(tokens, ["kahan", "kahan", "der", "late", "kab", "status", "news", "کہاں", "دیر", "کب", "خبر"])) {
      const say = statusAnswer() ?? "آپ کا کوئی آرڈر نہیں ہے۔";
      return { say: `${say} اور کچھ چاہیے؟`, done: false };
    }

    // --- Thanks / greeting ---
    if (hasAny(tokens, ["shukriya", "thanks", "شکریہ", "thank"])) {
      return { say: "آپ کا شکریہ! دادو فوڈ سے آرڈر کرنے کا شکریہ۔ اللہ حافظ!", done: false };
    }
    if (stage === "items" && hasAny(tokens, ["salam", "hello", "hi", "السلام", "adaab", "آداب"])) {
      return { say: "وعلیکم السلام! بتائیں، آج کیا آرڈر کرنا چاہیں گے؟", done: false };
    }

    // --- Who are you? ---
    if (hasAny(tokens, ["who", "name"]) && hasAny(tokens, ["you"])) {
      return { say: "میں دادو فوڈ کی وائس اسسٹنٹ ہوں، آپ کی مدد کے لیے یہیں ہوں۔ بتائیں، کیا آرڈر کرنا ہے؟", done: false };
    }

    // --- Off-topic: only Dadu Food. Politely decline anything else. ---
    if (stage !== "confirm" && hasAny(tokens, OFF_TOPIC_WORDS)) {
      const say = SCOPE_REPLIES[scopeCount % SCOPE_REPLIES.length];
      scopeCount += 1;
      return { say, done: false };
    }

    // --- Info questions, any time ---
    const info = stage === "items" ? infoAnswer(tokens) : null;
    if (info) return { say: `${info} اور کچھ چاہیے؟`, done: false };

    // --- Stage machine ---
    if (stage === "items") {
      if (hasAny(tokens, ["bas", "nahi", "بس", "نہیں", "thats", "enough", "khatam", "ختم"]) && cart.length > 0) {
        stage = "area";
        return { say: "ٹھیک ہے۔ آپ کا علاقہ یا محلہ کیا ہے؟", done: false };
      }
      if (hasAny(tokens, ["confirm", "order", "place", "کنفرم", "آرڈر"]) && cart.length > 0) {
        stage = "area";
        return { say: "ٹھیک ہے۔ آپ کا علاقہ یا محلہ کیا ہے؟", done: false };
      }
      const found = matchItems(raw, menu);
      if (found.length === 0) {
        return {
          say: "معاف کیجیے، وہ چیز مینیو میں نہیں ملی۔ دوبارہ بتائیں — مثلاً زنگر برگر، چکن بریانی یا شوارما۔",
          done: false,
        };
      }
      for (const f of found) {
        const existing = cart.find((c) => c.item.name === f.item.name);
        if (existing) existing.qty += f.qty;
        else cart.push({ item: f.item, qty: f.qty });
      }
      const added = found.map((f) => `${f.qty} ${f.item.name}`).join(" اور ");
      const say = ADDED_REPLIES[addedCount % ADDED_REPLIES.length](added);
      addedCount += 1;
      return { say, done: false };
    }

    if (stage === "area") {
      const cleaned = cleanAddress(raw);
      if (!cleaned) return { say: "علاقہ سمجھ نہیں آیا، دوبارہ بتائیں — آپ کس محلے سے ہیں؟", done: false };
      area = cleaned;
      stage = "street";
      return { say: "شکریہ۔ اب گھر کا نمبر یا گلی بتائیں؟", done: false };
    }

    if (stage === "street") {
      const cleaned = cleanAddress(raw);
      if (!cleaned) return { say: "گلی یا مکان نمبر دوبارہ بتائیں؟", done: false };
      street = cleaned;
      stage = "payment";
      return { say: "پیمنٹ کیسے کریں گے — کیش آن ڈیلیوری یا ایزی پیسہ؟", done: false };
    }

    if (stage === "payment") {
      if (hasAny(tokens, ["easypaisa", "ایزی", "پیسہ", "online"])) {
        payment = "Easypaisa";
      } else if (hasAny(tokens, ["cash", "cod", "naqad", "نقد", "کیش", "delivery"])) {
        payment = "COD";
      } else {
        return { say: "سمجھ نہیں آیا — کیش آن ڈیلیوری یا ایزی پیسہ؟", done: false };
      }
      stage = "confirm";
      return { say: readBack(), done: false };
    }

    if (stage === "confirm") {
      if (hasAny(tokens, ["haan", "han", "ji", "confirm", "kar", "theek", "ہاں", "جی", "کنفرم", "کر", "ٹھیک", "yes", "ok"])) {
        stage = "done";
        const order: LocalVoiceOrder = {
          items: cart.map((c) => ({ name: c.item.name, qty: c.qty, type: c.item.type })),
          address: { area, street },
          payment: payment ?? "COD",
        };
        return {
          say: "شکریہ! آپ کا آرڈر پلیس ہو گیا ہے۔ 20 سے 35 منٹ میں پہنچ جائے گا۔ اللہ حافظ!",
          done: true,
          order,
        };
      }
      if (hasAny(tokens, ["nahi", "no", "change", "نہیں", "بدلیں", "غلط"])) {
        stage = "items";
        cart = [];
        return { say: "ٹھیک ہے، دوبارہ بتائیں کیا چاہیے؟", done: false };
      }
      return { say: `${readBack()}`, done: false };
    }

    // stage === "done": fresh start on anything new.
    stage = "items";
    cart = [];
    area = "";
    street = "";
    payment = null;
    return reply(userText);
  }

  return { greet, reply };
}
