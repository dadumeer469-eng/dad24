import type { LocalMenuItem } from "./voiceAgentLocal";

// A product shown with Munchi on the call screen. Hero dishes get a full
// frame (Munchi actually holding the dish); every other item gets its own
// catalogue photo composited at his hand, plus a name + price pill.
export interface ProductFrame {
  name: string;
  price: number;
  image: string;
  hero: boolean;
}

// The four most-ordered dishes, each with its own holding frame.
const HERO_FRAMES: Record<string, string> = {
  "crispy zinger burger": "/images/munchi-burger.jpg",
  "chicken biryani": "/images/munchi-biryani.jpg",
  "chicken shawarma": "/images/munchi-shawarma.jpg",
  "chicken karahi": "/images/munchi-karahi.jpg",
};

// Munchi shows a product frame for ONLY 10 special dishes (user 28 Nov
// 11:14: "Munchi ke jo frame hai wo bs kuch khas rakho ziyada nhi, 10
// frame naration ke hisab se"). The 4 heroes above + the bestsellers
// (isBestseller, set in the Admin Panel) fill the remaining 6 slots, in
// menu order. Every other dish gets NO frame — Munchi just shows normally.
// This stops the frame changing on every dish mentioned in the narration.
const SPECIAL_FRAME_LIMIT = 10;

function specialFrames(items: LocalMenuItem[]): LocalMenuItem[] {
  const heroes = items.filter((i) => HERO_FRAMES[norm(i.name)]);
  const seen = new Set(heroes.map((i) => norm(i.name)));
  const bestsellers = items.filter(
    (i) => i.type === "food" && i.isBestseller && !seen.has(norm(i.name)),
  );
  const picked = [...heroes, ...bestsellers].slice(0, SPECIAL_FRAME_LIMIT);
  return picked;
}

// Urdu-script words -> Latin, so "زنگر برگر" and "پیزا" match the menu
// just like Roman Urdu does (Whisper returns Urdu script for Urdu speech).
const URDU_WORD_MAP: Record<string, string> = {
  "برگر": "burger", "زنگر": "zinger", "چکن": "chicken", "مرغی": "chicken",
  "بریانی": "biryani", "شوارما": "shawarma", "کڑاہی": "karahi",
  "پیزا": "pizza", "فرائز": "fries", "سینڈوچ": "sandwich", "رول": "roll",
  "ٹکا": "tikka", "تکہ": "tikka", "کباب": "kabab", "انڈا": "egg",
  "چائے": "chai", "دودھ": "milk", "پانی": "water", "گھی": "ghee",
  "تیل": "oil", "چینی": "sugar", "آٹا": "atta", "چاول": "rice",
  "دال": "daal", "مٹن": "mutton", "بیف": "beef", "مچھلی": "fish",
  "پنیر": "cheese", "چیز": "cheese", "سوپ": "soup", "سلاد": "salad",
  "جوس": "juice", "سموسہ": "samosa", "پکوڑا": "pakora", "پراٹھا": "paratha",
  "نان": "naan", "روٹی": "roti", "حلیم": "haleem", "نہاری": "nihari",
  "بریڈ": "bread", "کیک": "cake", "آئسکریم": "icecream",
};

// Words too generic to identify a dish on their own.
const GENERIC = new Set([
  "chicken",
  "crispy",
  "special",
  "fresh",
  "plate",
  "with",
  "and",
  "desi",
  "spicy",
  "masala",
  "fried",
  "grilled",
  "sauce",
  "cheese",
  "regular",
  "large",
  "small",
  "medium",
  "family",
  "single",
  "double",
]);

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Transliterate Urdu-script words to Latin, then normalise to plain words,
// so "زنگر برگر", "پیزا" and Roman "zinger burger" all match the same way.
function toLatinWords(text: string): string[] {
  const raw = text.split(/[\s,؛،۔!?.؟"“”'()]+/).filter(Boolean);
  const out: string[] = [];
  for (const tok of raw) {
    const mapped = URDU_WORD_MAP[tok] ?? tok;
    const clean = mapped
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    if (clean) out.push(clean);
  }
  return out;
}

// Find the catalogue item the customer (or the agent) is talking about.
// Scores by HOW MANY distinctive words of the name were spoken, so
// "zinger burger" picks Crispy Zinger Burger (2 words) over Chicken Burger
// (1 word), and "pizza" picks a pizza instead of whatever matched first.
// Full-name match wins outright. Returns null when nothing recognisable
// is named — the caller keeps the previous frame in that case.
// NOTE: only the 10 special dishes (4 heroes + bestsellers) can ever
// produce a frame — see specialFrames above. Any other dish returns null,
// so Munchi shows no product frame for it.
export function findProductInText(text: string, items: LocalMenuItem[]): ProductFrame | null {
  if (!text) return null;
  const words = toLatinWords(text);
  if (words.length === 0) return null;
  const t = ` ${words.join(" ")} `;
  // Only the 10 special dishes are frame-eligible.
  const special = specialFrames(items);
  // Hero shortcut: a bare hero word ("burger" alone) means the house burger.
  if (words.length === 1) {
    const solo = words[0];
    if (solo === "burger" || solo === "zinger") {
      const item = special.find((i) => norm(i.name) === "crispy zinger burger");
      if (item) return { name: item.name, price: item.price, image: HERO_FRAMES["crispy zinger burger"], hero: true };
    }
    if (solo === "biryani") {
      const item = special.find((i) => norm(i.name) === "chicken biryani");
      if (item) return { name: item.name, price: item.price, image: HERO_FRAMES["chicken biryani"], hero: true };
    }
    if (solo === "shawarma") {
      const item = special.find((i) => norm(i.name) === "chicken shawarma");
      if (item) return { name: item.name, price: item.price, image: HERO_FRAMES["chicken shawarma"], hero: true };
    }
    if (solo === "karahi") {
      const item = special.find((i) => norm(i.name) === "chicken karahi");
      if (item) return { name: item.name, price: item.price, image: HERO_FRAMES["chicken karahi"], hero: true };
    }
  }
  let best: { item: LocalMenuItem; hits: number; chars: number } | null = null;
  for (const item of special) {
    const name = norm(item.name);
    if (!name) continue;
    // Full-name match wins outright.
    if (t.includes(` ${name} `)) {
      const key = norm(item.name);
      const hero = HERO_FRAMES[key];
      if (hero) return { name: item.name, price: item.price, image: hero, hero: true };
      if (!item.image) continue;
      return { name: item.name, price: item.price, image: item.image, hero: false };
    }
    const nameWords = name.split(" ").filter((w) => w.length >= 4 && !GENERIC.has(w));
    if (nameWords.length === 0) continue;
    const hits = nameWords.filter((w) => t.includes(` ${w} `));
    if (hits.length === 0) continue;
    // Require at least half the distinctive words, so a lone "chicken"
    // never picks a random chicken dish.
    if (hits.length < Math.ceil(nameWords.length / 2)) continue;
    const chars = hits.reduce((s, w) => s + w.length, 0);
    if (!best || hits.length > best.hits || (hits.length === best.hits && chars > best.chars)) {
      best = { item, hits: hits.length, chars };
    }
  }
  if (!best) return null;
  const key = norm(best.item.name);
  const hero = HERO_FRAMES[key];
  if (hero) return { name: best.item.name, price: best.item.price, image: hero, hero: true };
  if (!best.item.image) return null;
  return { name: best.item.name, price: best.item.price, image: best.item.image, hero: false };
}
