import { Dish, SystemSettings, Banner, Order } from "../types";

export interface ShopProfile {
  name: string;
  rating: string | null;
  reviewCount: number;
  deliveryTime: string;
  minOrder: number | null;
  deliveryFee: number;
  oneLineDescription: string;
  servesCuisine: string[];
  openingHours: string;
  priceRange: string;
}

export interface ShopOpenStatus {
  isOpen: boolean;
  label: string;
  detail: string;
  hoursText: string;
}

const SPELLING_RULES: Array<[RegExp, string]> = [
  [/\bBrost\b/gi, "Broast"],
  [/\blitter\b/gi, "litre"],
  [/\bMashroom\b/gi, "Mushroom"],
  [/\bAlfrido\b/gi, "Alfredo"],
  [
    /\bPlan\b(?=\s+(?:Lasagna|Lazania|Lazina|Paratha|Naan|Roti|Fries|Rice|Biryani|Tea|Chai|Burger|Pizza|Pasta|Sandwich|Roll))/gi,
    "Plain",
  ],
  [/\bVaggis\b/gi, "Veggies"],
  [/\bVaggi\b/gi, "Veggie"],
  [/\bSouce\b/gi, "Sauce"],
  [/\bChees\b/gi, "Cheese"],
  [/\bCheez\b/gi, "Cheese"],
  [/\bSupreem\b/gi, "Supreme"],
  [/\bLazina\b/gi, "Lasagna"],
  [/\bLazania\b/gi, "Lasagna"],
  [/\bRunch\b/gi, "Ranch"],
  [/\bDlight\b/gi, "Delight"],
  [/\bper\s+kgh\b/gi, "per kg"],
  [/\bAfgani\b/gi, "Afghani"],
  [/\bBeef\s+Double\s+Party\s+Burger\b/gi, "Beef Double Patty Burger"],
  [/\bParty\s+Burger\b/gi, "Patty Burger"],
  [/\bTastys\b/gi, "Tasty's"],
  [/\bTodays\b/gi, "Today's"],
  [/\bChowmin\b/gi, "Chowmein"],
  [/(\d+)\s*fresh\s*items\s*available/gi, "$1 fresh items available"],
  [/(\d+)\s*fresh\s*item\s*available/gi, "$1 fresh item available"],
  [/Sign in to order food,\s*books\s*and\s*services/gi, "Sign in to order fresh food & groceries in Dadu"],
];

export function fixSpelling(text: string | undefined | null): string {
  if (!text) return "";
  let out = String(text).replace(/[\u200B-\u200D\uFEFF]/g, "");
  for (const [pattern, replacement] of SPELLING_RULES) {
    out = out.replace(pattern, replacement);
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

export function stripEmbeddedPrice(name: string): string {
  if (!name) return "";
  let cleaned = fixSpelling(name);
  cleaned = cleaned
    .replace(/\(\s*(?:rs\.?|pkr)?\s*\d[\d,]*(?:\s*\/\s*kg|\s*per\s*kg)?\s*\)/gi, "")
    .replace(/[-–:|]\s*(?:rs\.?|pkr)?\s*\d[\d,]*(?:\s*\/\s*kg|\s*per\s*kg)?(?:,)?/gi, "")
    .replace(/\b(?:rs\.?|pkr)\s*\d[\d,]*(?:\s*\/\s*kg|\s*per\s*kg)?(?:,)?/gi, "")
    .replace(/\b\d[\d,]*\s*(?:\/\s*kg|per\s*kg)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s\-–:|,]+$/, "")
    .trim();

  // Close unclosed opening parenthesis (e.g. "Chicken Biryani Single Plate (with Raita & Salad")
  const openParens = (cleaned.match(/\(/g) || []).length;
  const closeParens = (cleaned.match(/\)/g) || []).length;
  if (openParens > closeParens) {
    cleaned = `${cleaned}${")".repeat(openParens - closeParens)}`;
  }

  return cleaned || fixSpelling(name);
}

export function isBlockedShop(name: string | undefined | null): boolean {
  if (!name) return false;
  const n = name.toLowerCase().trim();
  return (
    n === "foodpanda" ||
    n.includes("foodpanda") ||
    n.includes("food panda") ||
    /\bkfc\b/i.test(n) ||
    n.includes("dadu home care") ||
    n.includes("dadu home services") ||
    n === "home services" ||
    n.includes("home care services")
  );
}

export function isBlockedTrademarkItem(dish: Partial<Dish>): boolean {
  if (dish.type === "service") return true;
  const catLower = (dish.category || "").toLowerCase().trim();
  if (catLower === "home services" || catLower.includes("home care")) return true;

  const combined = `${dish.name || ""} ${dish.description || ""} ${dish.restaurantName || ""}`.toLowerCase();
  if (isBlockedShop(dish.restaurantName)) return true;
  if (/\bkfc\b/i.test(combined)) return true;
  if (combined.includes("hot shots") && (combined.includes("kfc") || combined.includes("foodpanda"))) return true;
  if (combined.includes("foodpanda")) return true;
  if (
    /\b(home\s+electrician|ac\s+service\s*&\s*gas|inverter\s+ac\s+diagnostic|plumber\s+repair|emergency\s+plumber)\b/i.test(
      combined
    )
  ) {
    return true;
  }
  // Remove implausible luxury items and stray imported menu section headings
  const nameOnly = fixSpelling(dish.name || "").toLowerCase();
  if (
    nameOnly.includes("belgian dark chocolate mousse") ||
    nameOnly.includes("san pellegrino") ||
    /\bwagyu\b/i.test(nameOnly) ||
    nameOnly.includes("chef's signature steaks") ||
    nameOnly === "signature steaks & mains"
  ) {
    return true;
  }
  return false;
}

const CATEGORY_ALIASES: Record<string, string> = {
  "lazania": "Lasagna",
  "lazina": "Lasagna",
  "lasagna": "Lasagna",
  "sandwich": "Sandwich",
  "sandwiches": "Sandwich",
  "pasta": "Pasta",
  "pasta & chowmin": "Pasta",
  "pasta & chowmein": "Pasta",
  "pasta and chowmein": "Pasta",
  "specials": "Specials",
  "special deals": "Specials",
  "deals": "Specials",
  "deals & combos": "Specials",
  "pizzas": "Pizza",
  "pizza": "Pizza",
  "burgers": "Burgers",
  "burger": "Burgers",
  "rolls": "Rolls & Wraps",
  "rolls & wraps": "Rolls & Wraps",
  "paratha": "Paratha",
  "parathas": "Paratha",
  "brost": "Broast",
  "broast": "Broast",
  "broast & fried chicken": "Broast",
  "bbq": "BBQ & Grill",
  "b.b.q": "BBQ & Grill",
  "desi": "Desi Food",
  "desi food": "Desi Food",
  "chicken & rice": "Desi Food",
  "karahi": "Desi Food",
  "biryani": "Desi Food",
  "tea": "Tea & Chai",
  "only tea": "Tea & Chai",
  "chai": "Tea & Chai",
  "tea & chai": "Tea & Chai",
  "milkshake": "Shakes & Drinks",
  "milkshakes": "Shakes & Drinks",
  "shakes": "Shakes & Drinks",
  "drinks": "Drinks",
  "beverages": "Drinks",
  "fries": "Fries",
  "fries & sides": "Fries",
  "desserts": "Desserts",
  "dessert": "Desserts",
  "sweets": "Desserts",
  "steaks": "Steaks & Grill",
  "steaks & grill": "Steaks & Grill",
  "salads": "Salads",
  "salad": "Salads",
  "groceries": "Groceries",
};

export function normalizeCategoryName(cat: string | undefined | null): string {
  const fixed = fixSpelling(cat || "Specials");
  const key = fixed.toLowerCase().trim();
  return CATEGORY_ALIASES[key] || fixed;
}

export function recategorizeDish(dish: Dish): string {
  const nameOnly = fixSpelling(dish.name || "").toLowerCase();
  const baseCatRaw = normalizeCategoryName(dish.category);
  const baseCat = baseCatRaw.toLowerCase() === "all" ? "Specials" : baseCatRaw;

  // Check Steaks BEFORE Sandwich & Tea so "Grilled Tenderloin Steak Sandwich" and "Prime Ribeye Steak" move to Steaks & Grill
  if (/\b(steak|t-bone|ribeye|sirloin|tenderloin)\b/i.test(nameOnly)) {
    return "Steaks & Grill";
  }
  if (/\b(pasta|alfredo|penne|spaghetti|macaroni|chowmein|noodles)\b/i.test(nameOnly) && !/\bpizza\b/i.test(nameOnly)) {
    return "Pasta";
  }
  if (/\b(lasagna|lazania|lazina)\b/i.test(nameOnly)) {
    return "Lasagna";
  }
  if (/\b(sandwich|club\s+sandwich)\b/i.test(nameOnly)) {
    return "Sandwich";
  }
  if (/\b(salad|russian\s+salad|fresh\s+salad|kachumber)\b/i.test(nameOnly) && !/\b(burger|roll|wrap|fries|biryani)\b/i.test(nameOnly)) {
    return "Salads";
  }
  if (/\b(cheesecake|cake|brownie|gulab\s+jamun|kheer|ice\s+cream|custard|halwa|pastry)\b/i.test(nameOnly) && !/\b(shake|milkshake)\b/i.test(nameOnly)) {
    return "Desserts";
  }
  if (/\b(chai|doodh\s+patti|green\s+tea|kehwa|kahwa|karak\s+tea|black\s+tea|masala\s+tea|iced\s+tea|tea)\b/i.test(nameOnly)) {
    return "Tea & Chai";
  }
  if (/\b(biryani|karahi|handi|nihari|pulao|haleem|qorma|korma|daal|dal|palak|saag|paye|sindhi|mutton|makhni|naan|roti|chapati)\b/i.test(nameOnly) && baseCat !== "BBQ & Grill") {
    return "Desi Food";
  }
  if (/\bparatha\b/i.test(nameOnly) && !/\broll\b/i.test(nameOnly)) {
    return "Paratha";
  }
  if (/\b(roll|shawarma|wrap|tortilla)\b/i.test(nameOnly)) {
    return "Rolls & Wraps";
  }
  if (/\b(broast|brost|crispy\s+chicken|fried\s+chicken|wings|nuggets)\b/i.test(nameOnly)) {
    return "Broast";
  }
  if (/\b(burger|zinger)\b/i.test(nameOnly)) {
    return "Burgers";
  }
  if (/\bpizza\b/i.test(nameOnly)) {
    return "Pizza";
  }
  if (/\bfries\b/i.test(nameOnly)) {
    return "Fries";
  }

  return baseCat;
}

const DISH_IMAGE_MAP = {
  paratha: "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=600&q=80&auto=format&fit=crop",
  mountainDew: "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=600&q=80&auto=format&fit=crop",
  sevenUp: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&q=80&auto=format&fit=crop",
  cola: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&q=80&auto=format&fit=crop",
  bbq: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80&auto=format&fit=crop",
  biryani: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&q=80&auto=format&fit=crop",
  karahi: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&q=80&auto=format&fit=crop",
  pizza: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80&auto=format&fit=crop",
  burger: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80&auto=format&fit=crop",
  broast: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=600&q=80&auto=format&fit=crop",
  pasta: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&q=80&auto=format&fit=crop",
  lasagna: "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=600&q=80&auto=format&fit=crop",
  sandwich: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80&auto=format&fit=crop",
  roll: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&q=80&auto=format&fit=crop",
  fries: "https://images.unsplash.com/photo-1576107232684-1279f390859f?w=600&q=80&auto=format&fit=crop",
  salad: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80&auto=format&fit=crop",
  steak: "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600&q=80&auto=format&fit=crop",
  chai: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=600&q=80&auto=format&fit=crop",
  greenTea: "https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=600&q=80&auto=format&fit=crop",
  shake: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80&auto=format&fit=crop",
  cheesecake: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&q=80&auto=format&fit=crop",
  naan: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=80&auto=format&fit=crop",
};

const KNOWN_BAD_PHOTO_SNIPPETS = [
  "photo-1534080564583-6be75777b70a",
  "photo-1628840042765-356cda07504e",
  "photo-1565299624946-b28f40a0ae38",
  "photo-1513104890138-7c749659a591",
  "photo-1593560708920-61dd98c46a4e",
  "photo-1544025162-d76694265947",
  "photo-1594212691516-436ad271c591",
  "photo-1601050690597-df056fb4ce78",
];

function pickFallbackPhotoByName(name: string): string {
  if (name.includes("mountain dew") || name.includes("dew")) return DISH_IMAGE_MAP.mountainDew;
  if (name.includes("7up") || name.includes("7 up") || name.includes("sprite")) return DISH_IMAGE_MAP.sevenUp;
  if (name.includes("pepsi") || name.includes("coke") || name.includes("cola")) return DISH_IMAGE_MAP.cola;
  if (name.includes("steak") || name.includes("ribeye") || name.includes("tenderloin")) return DISH_IMAGE_MAP.steak;
  if (name.includes("green tea") || name.includes("kehwa") || name.includes("kahwa")) return DISH_IMAGE_MAP.greenTea;
  if (name.includes("chai") || name.includes("tea")) return DISH_IMAGE_MAP.chai;
  if (name.includes("paratha")) return DISH_IMAGE_MAP.paratha;
  if (name.includes("naan") || name.includes("roti") || name.includes("chapati")) return DISH_IMAGE_MAP.naan;
  if (name.includes("biryani") || name.includes("pulao")) return DISH_IMAGE_MAP.biryani;
  if (name.includes("karahi") || name.includes("handi") || name.includes("nihari") || name.includes("desi")) return DISH_IMAGE_MAP.karahi;
  if (name.includes("tikka") || name.includes("kabab") || name.includes("seekh") || name.includes("bbq") || name.includes("malai boti")) return DISH_IMAGE_MAP.bbq;
  if (name.includes("lasagna")) return DISH_IMAGE_MAP.lasagna;
  if (name.includes("pasta") || name.includes("alfredo") || name.includes("chowmein")) return DISH_IMAGE_MAP.pasta;
  if (name.includes("sandwich")) return DISH_IMAGE_MAP.sandwich;
  if (name.includes("roll") || name.includes("shawarma") || name.includes("wrap")) return DISH_IMAGE_MAP.roll;
  if (name.includes("broast") || name.includes("fried chicken") || name.includes("wings") || name.includes("nuggets")) return DISH_IMAGE_MAP.broast;
  if (name.includes("burger") || name.includes("zinger")) return DISH_IMAGE_MAP.burger;
  if (name.includes("fries")) return DISH_IMAGE_MAP.fries;
  if (name.includes("salad")) return DISH_IMAGE_MAP.salad;
  if (name.includes("cheesecake") || name.includes("cake") || name.includes("dessert") || name.includes("brownie")) return DISH_IMAGE_MAP.cheesecake;
  if (name.includes("shake") || name.includes("lassi")) return DISH_IMAGE_MAP.shake;
  return DISH_IMAGE_MAP.pizza;
}

export function resolveAccurateDishImage(dish: Partial<Dish>): string {
  const name = `${dish.name || ""} ${dish.category || ""}`.toLowerCase();
  const img = (dish.imageUrl || "").trim();

  if (name.includes("mountain dew") || name.includes("dew")) {
    if (!img || img.includes("photo-1534080564583") || img.includes("pizza") || img.includes("1622483767028")) {
      return DISH_IMAGE_MAP.mountainDew;
    }
  }
  if (name.includes("7up") || name.includes("7 up") || name.includes("sprite")) {
    if (!img || img.includes("1622483767028") || img.includes("coca") || img.includes("photo-1534080564583")) {
      return DISH_IMAGE_MAP.sevenUp;
    }
  }
  if (name.includes("paratha")) {
    if (!img || KNOWN_BAD_PHOTO_SNIPPETS.some((s) => img.includes(s))) {
      return DISH_IMAGE_MAP.paratha;
    }
  }
  if (img.includes("photo-1544025162-d76694265947")) {
    return DISH_IMAGE_MAP.bbq;
  }
  // Fix broken/404 Grilled Jalapeno Burger photo and chai photos wrongly assigned to Steaks
  if (
    img.includes("photo-1594212691516-436ad271c591") ||
    img.includes("photo-1601050690597-df056fb4ce78")
  ) {
    return pickFallbackPhotoByName(name);
  }
  if (
    img.includes("photo-1576092768241-dec231879fc3") &&
    dish.category !== "Tea & Chai" &&
    !name.includes("chai") &&
    !name.includes("tea")
  ) {
    return pickFallbackPhotoByName(name);
  }

  const isPizza = name.includes("pizza");
  if (!isPizza && KNOWN_BAD_PHOTO_SNIPPETS.some((s) => img.includes(s))) {
    return pickFallbackPhotoByName(name);
  }
  if (!img || img.startsWith("blob:") || img.includes("placeholder.com")) {
    return pickFallbackPhotoByName(name);
  }
  return img;
}

export function isDishVeg(dish: Partial<Dish>): boolean {
  const text = `${dish.name || ""} ${dish.category || ""} ${dish.description || ""}`.toLowerCase();
  const nonVegKeywords = [
    "chicken", "beef", "mutton", "fish", "prawn", "shrimp", "zinger", "broast", "tikka",
    "kabab", "kebab", "seekh", "malai boti", "bihari", "reshmi", "pepperoni", "sausage",
    "fajita", "shawarma", "steak", "nihari", "haleem", "qorma", "korma", "handi", "karahi",
    "biryani", "wings", "nuggets", "drumstick", "meat", "keema", "qeema", "lamb", "paya", "paye",
  ];
  if (nonVegKeywords.some((k) => text.includes(k))) {
    if (/\b(veg|vegetable|veggies|paneer|aloo|daal|dal|palak)\b/i.test(text) && !/\b(chicken|beef|mutton|fish)\b/i.test(text)) {
      return true;
    }
    return false;
  }
  const vegKeywords = [
    "naan", "roti", "chapati", "paratha", "chai", "tea", "kehwa", "kahwa", "lassi",
    "fries", "salad", "raita", "veg", "veggie", "veggies", "vegetable", "margherita", "cheese",
    "paneer", "aloo", "daal", "dal", "chana", "shake", "milkshake", "juice", "soda",
    "pepsi", "7up", "dew", "water", "cake", "cheesecake", "brownie", "ice cream", "kheer",
    "gulab jamun", "halwa", "coffee", "cold coffee", "mint margarita",
  ];
  if (vegKeywords.some((k) => text.includes(k))) {
    return true;
  }
  return Boolean(dish.isVeg);
}

export function fixDishDescription(name: string, category: string, rawDesc: string): string {
  const n = name.toLowerCase();
  const d = rawDesc.toLowerCase();

  // Fix Chicken Biryani wrongly carrying a Raita dip description
  if (n.includes("biryani") && (d.includes("yogurt dip") || d.includes("creamy yogurt") || d.includes("raita dip") || !rawDesc)) {
    return "Fragrant long-grain basmati rice layered with spiced tender chicken, saffron, and traditional spices, served hot with fresh mint raita and salad.";
  }

  // Fix Sada Roti / Chapati wrongly carrying a Roghni Naan description
  if ((n.includes("sada roti") || n.includes("chapati")) && (d.includes("sesame") || d.includes("pure butter") || d.includes("roghni") || d.includes("naan") || !rawDesc)) {
    return "Soft, freshly baked plain whole-wheat chapati (sada roti), made hot to order.";
  }

  // Fix Steaks wrongly carrying a Karak Chai description
  if (n.includes("tenderloin") && n.includes("steak") && (d.includes("karak") || d.includes("cardamom") || d.includes("tea") || d.includes("chai") || !rawDesc)) {
    return "Flame-grilled beef tenderloin steak layered in toasted artisanal bread with melted cheese, caramelized onions, and signature peppercorn sauce.";
  }
  if ((n.includes("ribeye") || n.includes("steak")) && (d.includes("karak") || d.includes("cardamom") || d.includes("tea") || d.includes("chai") || !rawDesc)) {
    return "Juicy char-grilled steak seasoned with crushed black pepper and herbs, served hot with garlic herb butter and crispy sides.";
  }

  // Fix Smoked Berry Iced Tea wrongly carrying a hot Karak Chai description
  if (n.includes("iced tea") && (d.includes("steaming") || d.includes("hot") || d.includes("karak") || d.includes("milk") || !rawDesc)) {
    return "Chilled, refreshing iced tea infused with smoky berry notes and citrus, served cold over ice.";
  }

  if (category === "Tea & Chai" && !rawDesc) {
    return "Freshly brewed hot tea prepared to order.";
  }

  return rawDesc;
}

export function normalizePrice(dish: Dish, normalizedCat: string): number {
  const nameLower = (dish.name || "").toLowerCase();
  const price = Number(dish.price) || 0;

  // Fix mispriced Sada Roti / Chapati (Rs. 250 -> Rs. 30 per piece)
  if ((nameLower.includes("sada roti") || nameLower.includes("chapati")) && price >= 100) {
    return 30;
  }

  if (price <= 0) {
    if (normalizedCat === "Tea & Chai") return 80;
    if (normalizedCat === "Pizza") return 690;
    if (normalizedCat === "Desi Food") return 450;
    return 250;
  }
  if (normalizedCat === "Pizza" && price === 350 && (!dish.sizes || dish.sizes.length === 0)) {
    const hash = Array.from(dish.name || "").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const tiers = [590, 650, 690, 750, 790];
    return tiers[hash % tiers.length];
  }
  return Math.round(price);
}

// No invented dishes or fabricated partner shops — show real catalog data only.
export const SUPPLEMENTAL_DADU_DISHES: Dish[] = [];

export function normalizeDish(raw: Dish): Dish {
  const cleanName = stripEmbeddedPrice(raw.name || "Fresh Dish");
  const rawDescClean = fixSpelling(raw.description || "");
  const cleanRestaurant = fixSpelling(raw.restaurantName || "Dadu Kitchen");
  const recat = recategorizeDish({ ...raw, name: cleanName, description: rawDescClean });
  const cleanDesc = fixDishDescription(cleanName, recat, rawDescClean);
  const price = normalizePrice({ ...raw, name: cleanName }, recat);
  const discountPrice =
    raw.discountPrice && raw.discountPrice > 0 && raw.discountPrice < price
      ? Math.round(raw.discountPrice)
      : undefined;

  const isSmBilal = cleanRestaurant.toLowerCase().includes("bilal");
  const isAvailable = isSmBilal ? true : raw.isAvailable !== false;

  const normalizedSizes = raw.sizes?.map((s) => ({
    ...s,
    name: fixSpelling(s.name),
    price: Math.max(50, Math.round(Number(s.price) || price)),
  }));

  const normalizedFlavors = raw.flavors?.map((f) =>
    typeof f === "string"
      ? fixSpelling(f)
      : { ...f, name: fixSpelling(f.name) }
  );

  const normalizedAddOns = raw.addOns?.map((a) => ({
    ...a,
    name: fixSpelling(a.name),
  }));

  return {
    ...raw,
    name: cleanName,
    description: cleanDesc,
    restaurantName: cleanRestaurant,
    category: recat,
    price,
    discountPrice,
    imageUrl: resolveAccurateDishImage({ ...raw, name: cleanName, category: recat }),
    isVeg: isDishVeg({ ...raw, name: cleanName, category: recat, description: cleanDesc }),
    isAvailable,
    type: "food",
    sizes: normalizedSizes,
    flavors: normalizedFlavors as Dish["flavors"],
    addOns: normalizedAddOns,
  };
}

export function normalizeCatalog(rawDishes: Dish[]): Dish[] {
  const seen = new Set<string>();
  const cleaned: Dish[] = [];

  for (const raw of rawDishes) {
    if (!raw || !raw.name) continue;
    if (isBlockedTrademarkItem(raw)) continue;

    const dish = normalizeDish(raw);
    if (isBlockedShop(dish.restaurantName)) continue;

    const dedupeKey = `${(dish.restaurantName || "").toLowerCase()}::${dish.name.toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    cleaned.push(dish);
  }

  return cleaned;
}

export function normalizeFoodCategories<
  T extends {
    id?: string;
    name: string;
    imageUrl?: string;
    bgImageUrl?: string;
    emoji?: string;
    subtitle?: string;
    position?: number;
    isAvailable?: boolean;
  }
>(
  rawCategories: T[],
  normalizedDishes: Dish[]
): Array<T & { id: string; name: string; count: number; isAvailable: boolean }> {
  const counts = new Map<string, number>();
  const firstImageByCat = new Map<string, string>();

  for (const dish of normalizedDishes) {
    if (
      dish.id?.startsWith("drink_") ||
      dish.category === "Drinks" ||
      dish.category === "Beverages"
    ) {
      continue;
    }
    const cat = normalizeCategoryName(dish.category);
    if (cat.toLowerCase().includes("home service")) continue;
    counts.set(cat, (counts.get(cat) || 0) + 1);
    if (!firstImageByCat.has(cat) && dish.imageUrl) {
      firstImageByCat.set(cat, dish.imageUrl);
    }
  }

  const seen = new Set<string>();
  const result: Array<T & { id: string; name: string; count: number; isAvailable: boolean }> = [];

  for (const c of rawCategories) {
    const normName = normalizeCategoryName(c.name);
    if (normName === "All" || normName.toLowerCase().includes("home service") || seen.has(normName)) continue;
    const count = counts.get(normName) || 0;
    if (count === 0) continue; // Hide empty categories with 0 items
    seen.add(normName);
    result.push({
      ...c,
      id: c.id || `cat_${normName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      name: normName,
      subtitle: `${count} ${count === 1 ? "item" : "items"}`,
      imageUrl: c.imageUrl || firstImageByCat.get(normName),
      isAvailable: true,
      count,
    });
  }

  for (const [catName, count] of counts.entries()) {
    if (count > 0 && !seen.has(catName)) {
      seen.add(catName);
      result.push({
        id: `cat_${catName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
        name: catName,
        subtitle: `${count} ${count === 1 ? "item" : "items"}`,
        imageUrl: firstImageByCat.get(catName),
        isAvailable: true,
        count,
      } as T & { id: string; name: string; count: number; isAvailable: boolean });
    }
  }

  return result;
}

export function matchesFoodSearch(dish: Dish, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;

  const haystack = `${dish.name} ${dish.category} ${dish.restaurantName || ""} ${dish.description || ""}`.toLowerCase();

  if (q === "tea" || q === "chai") {
    return /\b(tea|chai|kehwa|kahwa|doodh\s+patti)\b/i.test(haystack) && !/\bsteak\b/i.test(dish.name.toLowerCase());
  }

  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every((token) => {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (token.length <= 3) {
      return new RegExp(`\\b${escaped}`, "i").test(haystack);
    }
    if (token === "brost") return /\bbroast\b/i.test(haystack);
    if (token === "lazania" || token === "lazina") return /\blasagna\b/i.test(haystack);
    if (token === "vaggis" || token === "vaggi") return /\bveggie/i.test(haystack);
    return haystack.includes(token);
  });
}

function formatTime12h(hhmm?: string): string {
  if (!hhmm || !hhmm.includes(":")) return "";
  const [hRaw, mRaw] = hhmm.split(":").map(Number);
  if (Number.isNaN(hRaw) || Number.isNaN(mRaw)) return hhmm;
  const suffix = hRaw >= 12 ? "PM" : "AM";
  const h12 = hRaw % 12 === 0 ? 12 : hRaw % 12;
  return `${h12}:${String(mRaw).padStart(2, "0")} ${suffix}`;
}

export function getShopOpenStatus(
  shopName: string,
  systemSettings?: SystemSettings,
  isClosedOverride?: boolean
): ShopOpenStatus {
  const specific = systemSettings?.restaurantStatuses?.[shopName];
  const globalStatus = systemSettings?.restaurantStatus;

  const openStr = specific?.openingTime || globalStatus?.openingTime || "12:00";
  const closeStr = specific?.closingTime || globalStatus?.closingTime || "23:00";
  const openFormatted = formatTime12h(openStr) || "12:00 PM";
  const closeFormatted = formatTime12h(closeStr) || "11:00 PM";
  const hoursText = `${openFormatted} – ${closeFormatted}`;

  const isClosed = Boolean(isClosedOverride);

  if (isClosed) {
    return {
      isOpen: false,
      label: "Closed",
      detail: `Opens ${openFormatted}`,
      hoursText,
    };
  }

  // Real clock check: compare the current local time against open/close
  // (Dadu food shops: 12:00 PM – 11:00 PM). Previously this always returned
  // Open, so the badge could show "Open" at 3 AM.
  const toMinutes = (hhmm: string): number | null => {
    const [h, m] = hhmm.split(":").map((v) => Number(v));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  };
  const openMin = toMinutes(openStr);
  const closeMin = toMinutes(closeStr);
  if (openMin !== null && closeMin !== null) {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const withinHours =
      closeMin > openMin
        ? nowMin >= openMin && nowMin < closeMin
        : nowMin >= openMin || nowMin < closeMin; // overnight range
    if (!withinHours) {
      return {
        isOpen: false,
        label: "Closed",
        detail: `Opens ${openFormatted}`,
        hoursText,
      };
    }
  }

  return {
    isOpen: true,
    label: "Open",
    detail: `Until ${closeFormatted}`,
    hoursText,
  };
}

const SHOP_DESCRIPTIONS: Record<string, { oneLineDescription: string; servesCuisine: string[] }> = {
  "dadu fast food": {
    oneLineDescription: "Freshly baked pizzas, zinger burgers, crispy broast, and deals across Dadu.",
    servesCuisine: ["Fast Food", "Pizza", "Burgers", "Broast"],
  },
  "s m bilal": {
    oneLineDescription: "Dadu BBQ, mutton karahi, seekh kababs, and fresh tandoori naan.",
    servesCuisine: ["Desi Food", "BBQ", "Karahi"],
  },
  "tasty bites": {
    oneLineDescription: "Creamy pastas, loaded lasagna, grilled sandwiches, and pizzas in Dadu.",
    servesCuisine: ["Pizza", "Pasta", "Lasagna", "Sandwich"],
  },
};

export function getShopProfile(
  shopName: string,
  systemSettings?: SystemSettings,
  shopDishes?: Dish[],
  realOrders?: Order[]
): ShopProfile {
  const cleanName = fixSpelling(shopName || "Dadu Kitchen");
  const key = cleanName.toLowerCase().trim();
  const descPreset = SHOP_DESCRIPTIONS[key];
  const specific = systemSettings?.restaurantStatuses?.[shopName] || systemSettings?.restaurantStatuses?.[cleanName];

  const derivedCuisines = Array.from(
    new Set((shopDishes || []).map((d) => normalizeCategoryName(d.category)).filter(Boolean))
  ).slice(0, 4);

  const servesCuisine =
    derivedCuisines.length > 0
      ? derivedCuisines
      : descPreset?.servesCuisine || ["Fresh Food"];

  const oneLineDescription =
    descPreset?.oneLineDescription ||
    `Order fresh ${servesCuisine.slice(0, 2).join(" & ").toLowerCase()} from ${cleanName} in Dadu.`;

  // Honest ratings ONLY: derive from actual rated orders for this shop if available, never invent fake numbers.
  let rating: string | null = null;
  let reviewCount = 0;

  if (realOrders && realOrders.length > 0) {
    const shopRatedOrders = realOrders.filter((o) => {
      const r = Number((o as any).rating || (o as any).restaurantRating || 0);
      if (r < 1 || r > 5) return false;
      const matchesShop = o.items?.some(
        (i) => (i.restaurantName || "").toLowerCase().trim() === key
      );
      return Boolean(matchesShop);
    });
    if (shopRatedOrders.length > 0) {
      const avg =
        shopRatedOrders.reduce(
          (sum, o) => sum + Number((o as any).rating || (o as any).restaurantRating || 0),
          0
        ) / shopRatedOrders.length;
      rating = avg.toFixed(1);
      reviewCount = shopRatedOrders.length;
    }
  }

  // Parse configured delivery fee honestly
  const configuredBaseFee =
    systemSettings?.deliveryFee && systemSettings.deliveryFee > 0 ? systemSettings.deliveryFee : 50;
  let deliveryFee = configuredBaseFee;
  if (specific?.deliveryCharge) {
    const parsed = parseInt(String(specific.deliveryCharge).replace(/[^0-9]/g, ""), 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      deliveryFee = parsed;
    }
  }

  // Only show minOrder when explicitly configured (> 0)
  const configuredMin = Number(specific?.minOrder || 0);
  const minOrder = configuredMin > 0 ? configuredMin : null;

  const deliveryTime = specific?.deliveryTime?.trim() || "20–35 min";

  const openStatus = getShopOpenStatus(shopName, systemSettings, false);

  // Honest price range computed from real menu items if available
  const prices = (shopDishes || [])
    .map((d) => Number(d.discountPrice || d.price || 0))
    .filter((p) => p > 0);
  const priceRange =
    prices.length > 0
      ? `Rs. ${Math.min(...prices).toLocaleString()} – Rs. ${Math.max(...prices).toLocaleString()}`
      : "Rs. 100 – Rs. 2,500";

  return {
    name: cleanName,
    rating,
    reviewCount,
    deliveryTime,
    minOrder,
    deliveryFee,
    oneLineDescription,
    servesCuisine,
    openingHours: openStatus.hoursText,
    priceRange,
  };
}

export function generateUniqueOrderId(prefix: "DF" | "DG" = "DF"): string {
  const timePart = Date.now().toString(36).toUpperCase().slice(-4);
  const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timePart}${randPart}`;
}

export function formatOrderId(id: string | undefined | null): string {
  if (!id) return "#DF-NEW";
  const trimmed = String(id).trim();
  if (/^(DF|DG)-[A-Z0-9]{4,}$/i.test(trimmed)) {
    return `#${trimmed.toUpperCase()}`;
  }
  const suffix = trimmed.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  return `#DF-${suffix || "000001"}`;
}

export function calculateDeliveryFee(
  itemsSubtotal: number,
  baseFeeInput?: number,
  freeThresholdInput?: number,
  doubleBelowInput?: number
): { fee: number; isFree: boolean; isDoubledBelow500: boolean; freeThreshold: number } {
  const configuredFree = Number(freeThresholdInput || 0);
  const freeThreshold = configuredFree >= 500 ? configuredFree : 1000;
  const baseFee = Number(baseFeeInput || 0) > 0 ? Number(baseFeeInput) : 50;

  if (itemsSubtotal >= freeThreshold) {
    return { fee: 0, isFree: true, isDoubledBelow500: false, freeThreshold };
  }

  // Admin-controlled: fee doubles below this subtotal (0 = doubling disabled)
  const doubleBelow = Number(doubleBelowInput ?? 500);
  const isDoubledBelow500 = doubleBelow > 0 && itemsSubtotal > 0 && itemsSubtotal < doubleBelow;
  const fee = isDoubledBelow500 ? baseFee * 2 : baseFee;

  return { fee: Math.round(fee), isFree: false, isDoubledBelow500, freeThreshold };
}

export function sanitizeBanner(banner: Banner): Banner | null {
  const rawRest = fixSpelling(banner.restaurantName || "");
  const rawDetail = fixSpelling(banner.detail || "");
  const combined = `${rawRest} ${rawDetail}`;

  if (
    isBlockedShop(rawRest) ||
    /\bfoodpanda\b|\bkfc\b|\blorem\s+ipsum\b|\bdolor\s+sit\s+amet\b|\b45%\b|\bhome\s+services?\b/i.test(
      combined
    )
  ) {
    return null;
  }

  let detail = rawDetail;
  const pctMatches = detail.match(/\b\d{1,2}%\s*(?:off)?/gi);
  if (pctMatches && pctMatches.length > 1) {
    const firstPct = detail.match(/\b(\d{1,2})%/)?.[1] || "20";
    detail = detail.replace(/\b\d{1,2}%\s*(?:off)?/gi, `${firstPct}% OFF`).replace(/OFF\s+OFF/gi, "OFF");
  }

  return {
    ...banner,
    restaurantName: rawRest,
    detail,
  };
}

// ============================================================================
// PROTECTED ACCOUNTS & DEMO DATA CLEANUP HELPERS
// ============================================================================
const PROTECTED_PHONES = new Set([
  "03277004471",
  "923277004471",
  "3277004471",
  "03277004427",
  "923277004427",
  "3277004427",
]);

export function normalizePhoneDigits(phone?: string | null): string {
  return String(phone || "").replace(/\D/g, "");
}

/**
 * STRICT PROTECTION GUARD:
 * NEVER delete or modify:
 * 1) Owner account: phone 03277004471, name "meer", role admin
 * 2) Pending user: Raza Khan, phone 03277004427 (must remain pending)
 */
export function isProtectedUserAccount(user: {
  phone?: string;
  name?: string;
  role?: string;
  email?: string;
}): boolean {
  const digits = normalizePhoneDigits(user?.phone);
  if (digits && PROTECTED_PHONES.has(digits)) return true;
  if (digits.endsWith("3277004471") || digits.endsWith("3277004427")) return true;
  const nameLower = (user?.name || "").trim().toLowerCase();
  if (nameLower === "raza khan") return true;
  if (nameLower === "meer" && user?.role === "admin") return true;
  if (user?.role === "admin") return true;
  return false;
}

export function isDemoOrderRecord(order: Partial<Order> & { id?: string }): boolean {
  const idStr = String(order?.id || "").toUpperCase();
  const nameStr = String(order?.userName || order?.name || "").toLowerCase();
  const riderStr = String(order?.riderName || "").toLowerCase();
  if (idStr.includes("DADU-ORDER_17") || idStr === "ORDER" || idStr.startsWith("DEMO")) return true;
  if (riderStr.includes("create name meer") || riderStr === "hero: meer") return true;
  if (nameStr.includes("demo") || nameStr.includes("test user") || nameStr === "test") return true;
  return false;
}

export function isDemoUserRecord(user: {
  phone?: string;
  name?: string;
  role?: string;
  email?: string;
}): boolean {
  if (isProtectedUserAccount(user)) return false;
  const nameLower = (user?.name || "").trim().toLowerCase();
  const phoneDigits = normalizePhoneDigits(user?.phone);
  if (nameLower.includes("create name meer")) return true;
  if (nameLower.includes("demo") || nameLower.includes("test") || nameLower.includes("dummy")) return true;
  if (phoneDigits === "03001234567" || phoneDigits === "03000000000" || phoneDigits === "03111111111") return true;
  return false;
}

