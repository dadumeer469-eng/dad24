import { Dish, SystemSettings, Banner } from "../types";

export interface ShopProfile {
  name: string;
  rating: string;
  reviewCount: number;
  deliveryTime: string;
  minOrder: number;
  deliveryFee: number;
  oneLineDescription: string;
  servesCuisine: string[];
  openingHours: string;
  priceRange: string;
}

const SPELLING_RULES: Array<[RegExp, string]> = [
  [/\bBrost\b/gi, "Broast"],
  [/\blitter\b/gi, "litre"],
  [/\bMashroom\b/gi, "Mushroom"],
  [/\bAlfrido\b/gi, "Alfredo"],
  [/\bPlan\b(?=\s+(?:Paratha|Naan|Roti|Fries|Rice|Biryani|Tea|Chai|Burger|Pizza|Pasta))/gi, "Plain"],
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
  [/Sign in to order food,\s*books\s*and\s*services/gi, "Sign in to order food, groceries and home services"],
];

export function fixSpelling(text: string | undefined | null): string {
  if (!text) return "";
  let out = String(text);
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
    .replace(/[-–:|]\s*(?:rs\.?|pkr)?\s*\d[\d,]*(?:\s*\/\s*kg|\s*per\s*kg)?\b/gi, "")
    .replace(/\b(?:rs\.?|pkr)\s*\d[\d,]*(?:\s*\/\s*kg|\s*per\s*kg)?\b/gi, "")
    .replace(/\b\d[\d,]*\s*(?:\/\s*kg|per\s*kg)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s\-–:|,]+$/, "")
    .trim();
  return cleaned || fixSpelling(name);
}

export function isBlockedShop(name: string | undefined | null): boolean {
  if (!name) return false;
  const n = name.toLowerCase().trim();
  return n === "foodpanda" || n.includes("foodpanda") || n.includes("food panda") || /\bkfc\b/i.test(n);
}

export function isBlockedTrademarkItem(dish: Partial<Dish>): boolean {
  const combined = `${dish.name || ""} ${dish.description || ""} ${dish.restaurantName || ""}`.toLowerCase();
  if (isBlockedShop(dish.restaurantName)) return true;
  if (/\bkfc\b/i.test(combined)) return true;
  if (combined.includes("hot shots") && (combined.includes("kfc") || combined.includes("foodpanda"))) return true;
  if (combined.includes("foodpanda")) return true;
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
  "home services": "Home Services",
  "groceries": "Groceries",
};

export function normalizeCategoryName(cat: string | undefined | null): string {
  const fixed = fixSpelling(cat || "Specials");
  const key = fixed.toLowerCase().trim();
  return CATEGORY_ALIASES[key] || fixed;
}

export function recategorizeDish(dish: Dish): string {
  const nameLower = `${dish.name || ""} ${dish.description || ""}`.toLowerCase();
  const baseCat = normalizeCategoryName(dish.category);

  if (dish.type === "service" || baseCat === "Home Services") {
    return "Home Services";
  }
  if (/\b(pasta|alfredo|penne|spaghetti|macaroni|chowmein|noodles)\b/i.test(nameLower) && !/\bpizza\b/i.test(nameLower)) {
    return "Pasta";
  }
  if (/\b(lasagna|lazania|lazina)\b/i.test(nameLower)) {
    return "Lasagna";
  }
  if (/\b(sandwich|club\s+sandwich)\b/i.test(nameLower)) {
    return "Sandwich";
  }
  if (/\b(salad|russian\s+salad|fresh\s+salad|kachumber)\b/i.test(nameLower) && !/\b(burger|roll|wrap|fries)\b/i.test(nameLower)) {
    return "Salads";
  }
  if (/\b(steak|t-bone|ribeye|sirloin)\b/i.test(nameLower)) {
    return "Steaks & Grill";
  }
  if (/\b(cheesecake|cake|brownie|gulab\s+jamun|kheer|ice\s+cream|custard|halwa|pastry)\b/i.test(nameLower) && !/\b(shake|milkshake)\b/i.test(nameLower)) {
    return "Desserts";
  }
  if (/\b(chai|doodh\s+patti|green\s+tea|kehwa|kahwa|karak\s+tea|black\s+tea|masala\s+tea|tea)\b/i.test(nameLower) && !/\bsteak\b/i.test(nameLower)) {
    return "Tea & Chai";
  }
  if (/\b(biryani|karahi|handi|nihari|pulao|haleem|qorma|korma|daal|dal|palak|saag|paye|sindhi|mutton|makhni|naan|roti)\b/i.test(nameLower) && baseCat !== "BBQ & Grill") {
    return "Desi Food";
  }
  if (/\bparatha\b/i.test(nameLower) && !/\broll\b/i.test(nameLower)) {
    return "Paratha";
  }
  if (/\b(roll|shawarma|wrap|tortilla)\b/i.test(nameLower)) {
    return "Rolls & Wraps";
  }
  if (/\b(broast|brost|crispy\s+chicken|fried\s+chicken|wings|nuggets)\b/i.test(nameLower)) {
    return "Broast";
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
  homeService: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80&auto=format&fit=crop",
};

const KNOWN_BAD_PHOTO_SNIPPETS = [
  "photo-1534080564583-6be75777b70a",
  "photo-1628840042765-356cda07504e",
  "photo-1565299624946-b28f40a0ae38",
  "photo-1513104890138-7c749659a591",
  "photo-1593560708920-61dd98c46a4e",
  "photo-1544025162-d76694265947",
];

function pickFallbackPhotoByName(name: string): string {
  if (name.includes("mountain dew") || name.includes("dew")) return DISH_IMAGE_MAP.mountainDew;
  if (name.includes("7up") || name.includes("7 up") || name.includes("sprite")) return DISH_IMAGE_MAP.sevenUp;
  if (name.includes("pepsi") || name.includes("coke") || name.includes("cola")) return DISH_IMAGE_MAP.cola;
  if (name.includes("green tea") || name.includes("kehwa") || name.includes("kahwa")) return DISH_IMAGE_MAP.greenTea;
  if (name.includes("chai") || name.includes("tea")) return DISH_IMAGE_MAP.chai;
  if (name.includes("paratha")) return DISH_IMAGE_MAP.paratha;
  if (name.includes("naan") || name.includes("roti")) return DISH_IMAGE_MAP.naan;
  if (name.includes("biryani") || name.includes("pulao")) return DISH_IMAGE_MAP.biryani;
  if (name.includes("karahi") || name.includes("handi") || name.includes("nihari") || name.includes("desi")) return DISH_IMAGE_MAP.karahi;
  if (name.includes("tikka") || name.includes("kabab") || name.includes("seekh") || name.includes("bbq") || name.includes("malai boti")) return DISH_IMAGE_MAP.bbq;
  if (name.includes("steak")) return DISH_IMAGE_MAP.steak;
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
  if (name.includes("service") || name.includes("plumber") || name.includes("electrician") || name.includes("ac ")) return DISH_IMAGE_MAP.homeService;
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
    if (/\b(veg|vegetable|paneer|aloo|daal|dal|palak)\b/i.test(text) && !/\b(chicken|beef|mutton|fish)\b/i.test(text)) {
      return true;
    }
    return false;
  }
  const vegKeywords = [
    "naan", "roti", "chapati", "paratha", "chai", "tea", "kehwa", "kahwa", "lassi",
    "fries", "salad", "raita", "veg", "veggie", "vegetable", "margherita", "cheese",
    "paneer", "aloo", "daal", "dal", "chana", "shake", "milkshake", "juice", "soda",
    "pepsi", "7up", "dew", "water", "cake", "cheesecake", "brownie", "ice cream", "kheer",
    "gulab jamun", "halwa", "coffee", "cold coffee", "mint margarita",
  ];
  if (vegKeywords.some((k) => text.includes(k))) {
    return true;
  }
  return Boolean(dish.isVeg);
}

export function normalizePrice(dish: Dish, normalizedCat: string): number {
  const price = Number(dish.price) || 0;
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

export const SUPPLEMENTAL_DADU_DISHES: Dish[] = [
  {
    id: "dadu_desi_sindhi_biryani",
    name: "Sindhi Chicken Biryani",
    restaurantName: "Dadu Royal Kitchen",
    price: 380,
    category: "Desi Food",
    imageUrl: DISH_IMAGE_MAP.biryani,
    description: "Aromatic long-grain basmati rice cooked with tender spiced chicken, potatoes, and traditional Sindhi masala.",
    isVeg: false,
    isBestseller: true,
    isAvailable: true,
    type: "food",
  },
  {
    id: "dadu_desi_mutton_karahi",
    name: "Special Mutton Karahi (Half)",
    restaurantName: "S M Bilal",
    price: 1450,
    category: "Desi Food",
    imageUrl: DISH_IMAGE_MAP.karahi,
    description: "Fresh tender mutton wok-cooked with tomatoes, ginger, green chillies, and pure spices.",
    isVeg: false,
    isBestseller: true,
    isAvailable: true,
    type: "food",
  },
  {
    id: "dadu_desi_chicken_handi",
    name: "Chicken Makhni Boneless Handi",
    restaurantName: "Dadu Royal Kitchen",
    price: 1150,
    category: "Desi Food",
    imageUrl: DISH_IMAGE_MAP.karahi,
    description: "Creamy boneless chicken simmered in butter, tomato gravy, and crushed black pepper.",
    isVeg: false,
    isAvailable: true,
    type: "food",
  },
  {
    id: "dadu_desi_garlic_naan",
    name: "Tandoori Garlic Naan",
    restaurantName: "S M Bilal",
    price: 70,
    category: "Desi Food",
    imageUrl: DISH_IMAGE_MAP.naan,
    description: "Fresh clay-oven naan brushed with roasted garlic butter.",
    isVeg: true,
    isAvailable: true,
    type: "food",
  },
  {
    id: "dadu_tea_doodh_patti",
    name: "Doodh Patti Chai",
    restaurantName: "Dadu Chai & Cafe",
    price: 80,
    category: "Tea & Chai",
    imageUrl: DISH_IMAGE_MAP.chai,
    description: "Rich slow-simmered milk tea brewed with strong Assam leaves and green cardamom.",
    isVeg: true,
    isBestseller: true,
    isAvailable: true,
    type: "food",
  },
  {
    id: "dadu_tea_green_tea",
    name: "Green Tea (Peshawari Kehwa)",
    restaurantName: "Dadu Chai & Cafe",
    price: 70,
    category: "Tea & Chai",
    imageUrl: DISH_IMAGE_MAP.greenTea,
    description: "Refreshing lemon and cardamom Peshawari green tea, served piping hot.",
    isVeg: true,
    isAvailable: true,
    type: "food",
  },
  {
    id: "dadu_tea_karak_chai",
    name: "Karak Elaichi Chai",
    restaurantName: "Dadu Chai & Cafe",
    price: 90,
    category: "Tea & Chai",
    imageUrl: DISH_IMAGE_MAP.chai,
    description: "Double-strong highway-style karak chai infused with crushed cardamom.",
    isVeg: true,
    isAvailable: true,
    type: "food",
  },
  {
    id: "dadu_service_electrician",
    name: "Home Electrician Visit",
    restaurantName: "Dadu Home Care Services",
    price: 600,
    category: "Home Services",
    imageUrl: DISH_IMAGE_MAP.homeService,
    description: "Certified Dadu electrician for UPS, fan, wiring, breaker, and switchboard repair.",
    isVeg: true,
    isAvailable: true,
    type: "service",
  },
  {
    id: "dadu_service_ac_tech",
    name: "AC Service & Gas Check",
    restaurantName: "Dadu Home Care Services",
    price: 1500,
    category: "Home Services",
    imageUrl: DISH_IMAGE_MAP.homeService,
    description: "Complete split/window AC indoor & outdoor wash plus cooling pressure inspection in Dadu.",
    isVeg: true,
    isAvailable: true,
    type: "service",
  },
  {
    id: "dadu_service_plumber",
    name: "Plumber Repair & Leak Fix",
    restaurantName: "Dadu Home Care Services",
    price: 550,
    category: "Home Services",
    imageUrl: DISH_IMAGE_MAP.homeService,
    description: "Quick home plumbing visit for tap replacement, water motor, and pipe leakage repair.",
    isVeg: true,
    isAvailable: true,
    type: "service",
  },
];

export function normalizeDish(raw: Dish): Dish {
  const cleanName = stripEmbeddedPrice(raw.name || "Fresh Dish");
  const cleanDesc = fixSpelling(raw.description || "");
  const cleanRestaurant = fixSpelling(raw.restaurantName || "Dadu Kitchen");
  const recat = recategorizeDish({ ...raw, name: cleanName, description: cleanDesc });
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
    type: recat === "Home Services" ? "service" : raw.type || "food",
    sizes: normalizedSizes,
  };
}

export function normalizeCatalog(rawDishes: Dish[]): Dish[] {
  const seen = new Set<string>();
  const cleaned: Dish[] = [];

  for (const raw of rawDishes) {
    if (!raw || !raw.name) continue;
    if (isBlockedTrademarkItem(raw)) continue;

    const dish = normalizeDish(raw);
    const dedupeKey = `${(dish.restaurantName || "").toLowerCase()}::${dish.name.toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    cleaned.push(dish);
  }

  const hasDesi = cleaned.some((d) => d.category === "Desi Food");
  const hasTea = cleaned.some((d) => d.category === "Tea & Chai" && d.name.toLowerCase().includes("chai"));
  const hasServices = cleaned.some((d) => d.category === "Home Services");

  for (const sup of SUPPLEMENTAL_DADU_DISHES) {
    if (sup.category === "Desi Food" && hasDesi) continue;
    if (sup.category === "Tea & Chai" && hasTea) continue;
    if (sup.category === "Home Services" && hasServices) continue;
    const dedupeKey = `${(sup.restaurantName || "").toLowerCase()}::${sup.name.toLowerCase()}`;
    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey);
      cleaned.push(sup);
    }
  }

  return cleaned;
}

export function normalizeFoodCategories<T extends { id?: string; name: string; imageUrl?: string; bgImageUrl?: string; emoji?: string; subtitle?: string; position?: number; isAvailable?: boolean }>(
  rawCategories: T[],
  normalizedDishes: Dish[]
): Array<T & { id: string; name: string; count: number; isAvailable: boolean }> {
  const counts = new Map<string, number>();
  const firstImageByCat = new Map<string, string>();

  for (const dish of normalizedDishes) {
    if (dish.id?.startsWith("drink_")) continue;
    const cat = normalizeCategoryName(dish.category);
    counts.set(cat, (counts.get(cat) || 0) + 1);
    if (!firstImageByCat.has(cat) && dish.imageUrl) {
      firstImageByCat.set(cat, dish.imageUrl);
    }
  }

  const seen = new Set<string>();
  const result: Array<T & { id: string; name: string; count: number; isAvailable: boolean }> = [];

  for (const c of rawCategories) {
    const normName = normalizeCategoryName(c.name);
    if (normName === "All" || seen.has(normName)) continue;
    const count = counts.get(normName) || 0;
    if (count === 0) continue; // Hide empty categories with 0 items
    seen.add(normName);
    result.push({
      ...c,
      id: c.id || `cat_${normName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      name: normName,
      subtitle: fixSpelling(c.subtitle || `${count} items`),
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
        subtitle: `${count} fresh items`,
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
    return haystack.includes(token);
  });
}

const KNOWN_SHOP_PROFILES: Record<string, Partial<ShopProfile>> = {
  "dadu fast food": {
    rating: "4.6",
    reviewCount: 184,
    deliveryTime: "20-30 min",
    minOrder: 200,
    deliveryFee: 50,
    oneLineDescription: "Freshly baked pizzas, zinger burgers, broast, and family deals delivered hot across Dadu.",
    servesCuisine: ["Fast Food", "Pizza", "Burgers", "Broast"],
  },
  "s m bilal": {
    rating: "4.7",
    reviewCount: 242,
    deliveryTime: "25-35 min",
    minOrder: 250,
    deliveryFee: 50,
    oneLineDescription: "Authentic Dadu BBQ, mutton karahi, seekh kababs, and fresh tandoori naan.",
    servesCuisine: ["Desi Food", "BBQ", "Karahi"],
  },
  "tasty bites": {
    rating: "4.8",
    reviewCount: 163,
    deliveryTime: "20-30 min",
    minOrder: 200,
    deliveryFee: 50,
    oneLineDescription: "Signature creamy pastas, loaded lasagna, grilled sandwiches, and stone-baked pizzas in Dadu.",
    servesCuisine: ["Pizza", "Pasta", "Lasagna", "Sandwich"],
  },
  "dadu royal kitchen": {
    rating: "4.8",
    reviewCount: 129,
    deliveryTime: "25-40 min",
    minOrder: 250,
    deliveryFee: 60,
    oneLineDescription: "Traditional Sindhi biryani, boneless makhni handi, and homestyle desi curries in Dadu.",
    servesCuisine: ["Desi Food", "Biryani", "Handi"],
  },
  "dadu chai & cafe": {
    rating: "4.9",
    reviewCount: 97,
    deliveryTime: "15-25 min",
    minOrder: 150,
    deliveryFee: 40,
    oneLineDescription: "Hot Doodh Patti chai, karak elaichi tea, Peshawari kehwa, and crispy parathas delivered fast.",
    servesCuisine: ["Tea & Chai", "Paratha", "Cafe"],
  },
  "dadu home care services": {
    rating: "4.7",
    reviewCount: 74,
    deliveryTime: "30-45 min",
    minOrder: 300,
    deliveryFee: 50,
    oneLineDescription: "Trusted on-demand electricians, AC technicians, and plumbers serving all areas of Dadu City.",
    servesCuisine: ["Home Services"],
  },
};

export function getShopProfile(
  shopName: string,
  systemSettings?: SystemSettings,
  shopDishes?: Dish[]
): ShopProfile {
  const cleanName = fixSpelling(shopName || "Dadu Kitchen");
  const key = cleanName.toLowerCase().trim();
  const preset = KNOWN_SHOP_PROFILES[key];

  const hash = Array.from(key).reduce((acc, ch, i) => acc + ch.charCodeAt(0) * (i + 1), 0);
  const ratings = ["4.4", "4.5", "4.6", "4.7", "4.8", "4.9"];
  const times = ["15-25 min", "20-30 min", "25-35 min", "30-40 min"];
  const minOrders = [150, 200, 250, 300];
  const baseFee = systemSettings?.deliveryFee && systemSettings.deliveryFee > 0 ? systemSettings.deliveryFee : 50;

  const derivedCuisines = Array.from(
    new Set((shopDishes || []).map((d) => normalizeCategoryName(d.category)).filter(Boolean))
  ).slice(0, 4);

  const reviewCount = preset?.reviewCount ?? 48 + (hash % 190);
  const rating = preset?.rating ?? ratings[hash % ratings.length];
  const deliveryTime = preset?.deliveryTime ?? times[hash % times.length];
  const minOrder = preset?.minOrder ?? minOrders[hash % minOrders.length];
  const deliveryFee = preset?.deliveryFee ?? baseFee;
  const servesCuisine = preset?.servesCuisine ?? (derivedCuisines.length > 0 ? derivedCuisines : ["Fast Food", "Desi Food"]);
  const oneLineDescription =
    preset?.oneLineDescription ??
    `Order fresh ${servesCuisine.slice(0, 2).join(" and ").toLowerCase()} online from ${cleanName} with fast doorstep delivery across Dadu.`;

  return {
    name: cleanName,
    rating,
    reviewCount,
    deliveryTime,
    minOrder,
    deliveryFee,
    oneLineDescription,
    servesCuisine,
    openingHours: "09:00 AM – 11:59 PM",
    priceRange: "Rs. 80 – Rs. 2,500",
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
  freeThresholdInput?: number
): { fee: number; isFree: boolean; isDoubledBelow500: boolean; freeThreshold: number } {
  const configuredFree = Number(freeThresholdInput || 0);
  const freeThreshold = configuredFree >= 500 ? configuredFree : 1000;
  const baseFee = Number(baseFeeInput || 0) > 0 ? Number(baseFeeInput) : 50;

  if (itemsSubtotal >= freeThreshold) {
    return { fee: 0, isFree: true, isDoubledBelow500: false, freeThreshold };
  }

  const isDoubledBelow500 = itemsSubtotal > 0 && itemsSubtotal < 500;
  const fee = isDoubledBelow500 ? baseFee * 2 : baseFee;

  return { fee: Math.round(fee), isFree: false, isDoubledBelow500, freeThreshold };
}

export function sanitizeBanner(banner: Banner): Banner | null {
  const rawRest = fixSpelling(banner.restaurantName || "");
  const rawDetail = fixSpelling(banner.detail || "");
  const combined = `${rawRest} ${rawDetail}`;

  if (isBlockedShop(rawRest) || /\bfoodpanda\b|\bkfc\b/i.test(combined)) {
    return null;
  }

  if (/\blorem\s+ipsum\b|\bdolor\s+sit\s+amet\b|\bconsectetur\b/i.test(combined)) {
    return {
      ...banner,
      restaurantName: rawRest || "Dadu Food Specials",
      detail: "Flat 20% OFF on fresh pizza, biryani, karahi, and chai across Dadu City. Free delivery above Rs. 1,000.",
    };
  }

  // Resolve conflicting multiple percentages on the same slide (e.g. 45%, 10%, 20% off -> single true discount)
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
