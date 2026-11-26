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

// Urdu-script names for the hero dishes (Whisper often returns Urdu script).
// "برگر" maps to the Zinger — it is the house burger, the default when the
// customer just says "burger".
const URDU_ALIASES: Record<string, string> = {
  "زنگر": "crispy zinger burger",
  "برگر": "crispy zinger burger",
  "بریانی": "chicken biryani",
  "شوارما": "chicken shawarma",
  "کڑاہی": "chicken karahi",
};

// Hindi (Devanagari) aliases — the agent now speaks Hindi, so its replies
// and the Hindi transcriptions name dishes in Devanagari.
const HINDI_ALIASES: Record<string, string> = {
  "ज़िंगर": "crispy zinger burger",
  "जिंगर": "crispy zinger burger",
  "बर्गर": "crispy zinger burger",
  "बिरयानी": "chicken biryani",
  "शवारमा": "chicken shawarma",
  "कड़ाही": "chicken karahi",
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

// Find the catalogue item the customer (or the agent) is talking about.
// Full-name match wins; otherwise a distinctive word of the name. The
// longest match wins. Returns null when nothing recognisable is named.
export function findProductInText(text: string, items: LocalMenuItem[]): ProductFrame | null {
  if (!text) return null;
  // Urdu-script alias first (hero dishes only).
  for (const [alias, key] of Object.entries(URDU_ALIASES)) {
    if (text.includes(alias)) {
      const item = items.find((i) => norm(i.name) === key);
      if (item) return { name: item.name, price: item.price, image: HERO_FRAMES[key], hero: true };
    }
  }
  for (const [alias, key] of Object.entries(HINDI_ALIASES)) {
    if (text.includes(alias)) {
      const item = items.find((i) => norm(i.name) === key);
      if (item) return { name: item.name, price: item.price, image: HERO_FRAMES[key], hero: true };
    }
  }
  const t = ` ${norm(text)} `;
  let best: { item: LocalMenuItem; score: number } | null = null;
  for (const item of items) {
    const name = norm(item.name);
    if (!name) continue;
    let score = 0;
    if (t.includes(` ${name} `)) {
      score = name.length + 100;
    } else {
      const words = name.split(" ").filter((w) => w.length >= 4 && !GENERIC.has(w));
      const hit = words.find((w) => t.includes(` ${w} `));
      if (!hit) continue;
      score = hit.length;
    }
    if (!best || score > best.score) best = { item, score };
  }
  if (!best) return null;
  const key = norm(best.item.name);
  const hero = HERO_FRAMES[key];
  if (hero) return { name: best.item.name, price: best.item.price, image: hero, hero: true };
  if (!best.item.image) return null;
  return { name: best.item.name, price: best.item.price, image: best.item.image, hero: false };
}
