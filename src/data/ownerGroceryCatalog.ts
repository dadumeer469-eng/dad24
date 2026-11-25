import { GroceryCategory, GroceryProduct } from "../types";

export const GROCERY_CATEGORY_VISUALS: Record<
  string,
  { emoji: string; accentBg: string; accentText: string; badge: string }
> = {
  gcat_rashan: { emoji: "🌾", accentBg: "from-amber-500/15 to-orange-500/10", accentText: "text-amber-700 dark:text-amber-300", badge: "Rashan" },
  gcat_oil_ghee: { emoji: "🫗", accentBg: "from-yellow-500/15 to-amber-500/10", accentText: "text-yellow-700 dark:text-yellow-300", badge: "Oil & Ghee" },
  gcat_spices: { emoji: "🌶️", accentBg: "from-red-500/15 to-rose-500/10", accentText: "text-red-700 dark:text-red-300", badge: "Spices" },
  gcat_bakery: { emoji: "🍞", accentBg: "from-orange-500/15 to-amber-500/10", accentText: "text-orange-700 dark:text-orange-300", badge: "Bakery" },
  gcat_dairy: { emoji: "🥛", accentBg: "from-sky-500/15 to-blue-500/10", accentText: "text-sky-700 dark:text-sky-300", badge: "Dairy" },
  gcat_tea_coffee: { emoji: "☕", accentBg: "from-stone-500/15 to-amber-500/10", accentText: "text-amber-800 dark:text-amber-300", badge: "Tea & Coffee" },
  gcat_cigarettes: { emoji: "🚬", accentBg: "from-zinc-500/15 to-slate-500/10", accentText: "text-zinc-700 dark:text-zinc-300", badge: "Cigarettes" },
  gcat_snacks_beverages: { emoji: "🥤", accentBg: "from-pink-500/15 to-rose-500/10", accentText: "text-[#D70F64] dark:text-pink-300", badge: "Snacks" },
  gcat_personal_care: { emoji: "🧼", accentBg: "from-teal-500/15 to-cyan-500/10", accentText: "text-teal-700 dark:text-teal-300", badge: "Personal Care" },
  gcat_cleaning_laundry: { emoji: "🧽", accentBg: "from-indigo-500/15 to-blue-500/10", accentText: "text-indigo-700 dark:text-indigo-300", badge: "Cleaning" },
  gcat_mother_baby: { emoji: "🍼", accentBg: "from-purple-500/15 to-pink-500/10", accentText: "text-purple-700 dark:text-purple-300", badge: "Baby Care" },
  gcat_feminine_care: { emoji: "🌸", accentBg: "from-rose-500/15 to-pink-500/10", accentText: "text-rose-700 dark:text-rose-300", badge: "Feminine Care" },
};

const CAT_IMAGES = {
  rashan: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400",
  oilGhee: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=400",
  spices: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=400",
  bakery: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400",
  // Crisp high-contrast dairy image (replaces faint washed-out milk bottle photo)
  dairy: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=400",
  teaCoffee: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=400",
  cigarettes: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=400",
  snacks: "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&q=80&w=400",
  personalCare: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=400",
  cleaning: "https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&q=80&w=400",
  motherBaby: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&q=80&w=400",
  feminineCare: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=400",
};

export const OWNER_GROCERY_CATEGORIES: GroceryCategory[] = [
  { id: "gcat_rashan", name: "Rashan", imageUrl: CAT_IMAGES.rashan, isAvailable: true, position: 1 },
  { id: "gcat_oil_ghee", name: "Oil & Ghee", imageUrl: CAT_IMAGES.oilGhee, isAvailable: true, position: 2 },
  { id: "gcat_spices", name: "Spices", imageUrl: CAT_IMAGES.spices, isAvailable: true, position: 3 },
  { id: "gcat_bakery", name: "Bakery", imageUrl: CAT_IMAGES.bakery, isAvailable: true, position: 4 },
  { id: "gcat_dairy", name: "Dairy", imageUrl: CAT_IMAGES.dairy, isAvailable: true, position: 5 },
  { id: "gcat_tea_coffee", name: "Tea & Coffee", imageUrl: CAT_IMAGES.teaCoffee, isAvailable: true, position: 6 },
  { id: "gcat_cigarettes", name: "Cigarettes", imageUrl: CAT_IMAGES.cigarettes, isAvailable: true, position: 7 },
  { id: "gcat_snacks_beverages", name: "Snacks & Beverages", imageUrl: CAT_IMAGES.snacks, isAvailable: true, position: 8 },
  { id: "gcat_personal_care", name: "Personal Care", imageUrl: CAT_IMAGES.personalCare, isAvailable: true, position: 9 },
  { id: "gcat_cleaning_laundry", name: "Cleaning & Laundry", imageUrl: CAT_IMAGES.cleaning, isAvailable: true, position: 10 },
  { id: "gcat_mother_baby", name: "Mother & Baby", imageUrl: CAT_IMAGES.motherBaby, isAvailable: true, position: 11 },
  { id: "gcat_feminine_care", name: "Feminine Care", imageUrl: CAT_IMAGES.feminineCare, isAvailable: true, position: 12 },
];

type SeedTuple = [
  id: string,
  categoryId: string,
  name: string,
  unit: string,
  price: number,
  filename: string
];

/**
 * Exactly 100 unique owner grocery items across 12 categories.
 * Every item points to `/images/grocery/<filename>` inside `public/images/grocery/`.
 * When a photo file is not yet uploaded, GroceryModule renders a clean branded Dadu Express Mart tile.
 */
const RAW_100_ITEMS: SeedTuple[] = [
  // 1. RASHAN (7)
  ["og_001", "gcat_rashan", "Sugar", "1kg", 148, "sugar-1kg.jpg"],
  ["og_002", "gcat_rashan", "BakeParlor Macroni", "—", 170, "bakeparlor-macroni.jpg"],
  ["og_003", "gcat_rashan", "Chawal (Rice) Johi", "—", 290, "chawal-rice-johi.jpg"],
  ["og_004", "gcat_rashan", "Youngs Mayonnaise Pouch", "500ml", 360, "youngs-mayonnaise-pouch-500ml.jpg"],
  ["og_005", "gcat_rashan", "Bake Parlor Spaghetti Box Hara Masala / Fajita", "250Gm", 170, "bake-parlor-spaghetti-box-250gm.jpg"],
  ["og_006", "gcat_rashan", "Rice (Sela)", "—", 320, "rice-sela.jpg"],
  ["og_007", "gcat_rashan", "Chakki Atta", "1 kg", 190, "chakki-atta-1kg.jpg"],

  // 2. OIL & GHEE (11)
  ["og_008", "gcat_oil_ghee", "Mezan Cooking Oil Pouch", "1Litre", 630, "mezan-cooking-oil-pouch-1litre.jpg"],
  ["og_009", "gcat_oil_ghee", "Eva Cooking Oil", "1l", 640, "eva-cooking-oil-1l.jpg"],
  ["og_010", "gcat_oil_ghee", "Eva Sunflower Oil", "1L", 655, "eva-sunflower-oil-1l.jpg"],
  ["og_011", "gcat_oil_ghee", "Eva Sunflower Oil Pillow Pouch", "1L", 635, "eva-sunflower-oil-pillow-pouch-1l.jpg"],
  ["og_012", "gcat_oil_ghee", "Tullo Banaspati Pouch", "1kg", 578, "tullo-banaspati-pouch-1kg.jpg"],
  ["og_013", "gcat_oil_ghee", "Tullo Cooking Oil Pouch", "1L", 578, "tullo-cooking-oil-pouch-1l.jpg"],
  ["og_014", "gcat_oil_ghee", "Eva Cooking Oil Bottle", "5l", 3225, "eva-cooking-oil-bottle-5l.jpg"],
  ["og_015", "gcat_oil_ghee", "Dalda Banaspati Ghee Pouch", "1 kg", 625, "dalda-banaspati-ghee-pouch-1kg.jpg"],
  ["og_016", "gcat_oil_ghee", "Dalda Cooking Oil Pouch", "1 Ltr", 625, "dalda-cooking-oil-pouch-1ltr.jpg"],
  ["og_017", "gcat_oil_ghee", "Soya Supreme Cooking Oil", "1Ltr", 620, "soya-supreme-cooking-oil-1ltr.jpg"],
  ["og_018", "gcat_oil_ghee", "Eva Cooking Oil Bottle", "3l", 1950, "eva-cooking-oil-bottle-3l.jpg"],

  // 3. SPICES (20)
  ["og_019", "gcat_spices", "National Iodized Salt", "800g", 70, "national-iodized-salt-800g.jpg"],
  ["og_020", "gcat_spices", "National Chilli Powder", "100g", 200, "national-chilli-powder-100g.jpg"],
  ["og_021", "gcat_spices", "National Turmeric Powder", "50g", 140, "national-turmeric-powder-50g.jpg"],
  ["og_022", "gcat_spices", "National Garam Masala Powder", "50g", 320, "national-garam-masala-powder-50g.jpg"],
  ["og_023", "gcat_spices", "Coriander Powder", "100g", 120, "coriander-powder-100g.jpg"],
  ["og_024", "gcat_spices", "National Biryani Masala", "39g", 160, "national-biryani-masala-39g.jpg"],
  ["og_025", "gcat_spices", "Shan Chicken Biryani Masala", "55g", 160, "shan-chicken-biryani-masala-55g.jpg"],
  ["og_026", "gcat_spices", "National Chicken Tikka Masala", "40g", 160, "national-chicken-tikka-masala-40g.jpg"],
  ["og_027", "gcat_spices", "National Masala Quorma", "50g", 160, "national-masala-quorma-50g.jpg"],
  ["og_028", "gcat_spices", "National Masala Karahi Gosht", "47Gm", 160, "national-masala-karahi-gosht-47gm.jpg"],
  ["og_029", "gcat_spices", "National Haleem Masala", "43g", 160, "national-haleem-masala-43g.jpg"],
  ["og_030", "gcat_spices", "Shan Special Chaat Masala", "50g", 120, "shan-special-chaat-masala-50g.jpg"],
  ["og_031", "gcat_spices", "National Pulao Masala", "70g", 160, "national-pulao-masala-70g.jpg"],
  ["og_032", "gcat_spices", "Shan Khalis Haldee Powder", "50g", 140, "shan-khalis-haldee-powder-50g.jpg"],
  ["og_033", "gcat_spices", "Shan Taaza Dhania Powder", "90g", 175, "shan-taaza-dhania-powder-90g.jpg"],
  ["og_034", "gcat_spices", "National Black Pepper Powder", "25g", 170, "national-black-pepper-powder-25g.jpg"],
  ["og_035", "gcat_spices", "National Chaat Masala", "45g", 120, "national-chaat-masala-45g.jpg"],
  ["og_036", "gcat_spices", "Shan Tez Lal Mirch Powder", "50g", 110, "shan-tez-lal-mirch-powder-50g.jpg"],
  ["og_037", "gcat_spices", "National Chilli Powder", "50g", 105, "national-chilli-powder-50g.jpg"],
  ["og_038", "gcat_spices", "Whole Garam Masala (Garam Masala Sabut)", "100g", 440, "whole-garam-masala-sabut-100g.jpg"],

  // 4. BAKERY (10)
  ["og_039", "gcat_bakery", "Egg", "1 Dozen", 300, "egg-1-dozen.jpg"],
  ["og_040", "gcat_bakery", "Dawn Fortified Bread (Regular)", "380gm", 160, "dawn-fortified-bread-regular-380gm.jpg"],
  ["og_041", "gcat_bakery", "Dawn Fortified Bread (Medium)", "600gm", 210, "dawn-fortified-bread-medium-600gm.jpg"],
  ["og_042", "gcat_bakery", "Dawn Fortified Bread (Small)", "340gm", 135, "dawn-fortified-bread-small-340gm.jpg"],
  ["og_043", "gcat_bakery", "National Jam Mango", "200Gm", 240, "national-jam-mango-200gm.jpg"],
  ["og_044", "gcat_bakery", "National Jam Apple", "200g", 240, "national-jam-apple-200g.jpg"],
  ["og_045", "gcat_bakery", "Rafhan Custard Vanilla", "275gm", 220, "rafhan-custard-vanilla-275gm.jpg"],
  ["og_046", "gcat_bakery", "Rafhan Custard Banana", "275gm", 220, "rafhan-custard-banana-275gm.jpg"],
  ["og_047", "gcat_bakery", "Quaker Quick Cook White Oats Pouch", "200g", 330, "quaker-quick-cook-white-oats-200g.jpg"],
  ["og_048", "gcat_bakery", "Meiji Cake (Small)", "100g", 150, "meiji-cake-small-100g.jpg"],

  // 5. DAIRY (12)
  ["og_049", "gcat_dairy", "Nestle Milkpak Tetra Pack", "250ml", 95, "nestle-milkpak-tetra-pack-250ml.jpg"],
  ["og_050", "gcat_dairy", "Olper Milk", "250ml", 98, "olper-milk-250ml.jpg"],
  ["og_051", "gcat_dairy", "Nestle Milkpak Cream", "200ml", 250, "nestle-milkpak-cream-200ml.jpg"],
  ["og_052", "gcat_dairy", "Everyday Milk Powder Pouch", "1200g (1.2kg)", 2600, "everyday-milk-powder-pouch-1200g.jpg"],
  ["og_053", "gcat_dairy", "NESTLE EVERYDAY Tea Whitener Powder Pouch", "230g", 480, "nestle-everyday-tea-whitener-230g.jpg"],
  ["og_054", "gcat_dairy", "NESTLE EVERYDAY Tea Whitener Powder Pouch", "350g", 775, "nestle-everyday-tea-whitener-350g.jpg"],
  ["og_055", "gcat_dairy", "Nestle Everyday Karak Powder Chai 3in1", "20g", 80, "nestle-everyday-karak-chai-3in1-20g.jpg"],
  ["og_056", "gcat_dairy", "Nestle Nido 1+ Box", "375gm", 1150, "nestle-nido-1-plus-box-375gm.jpg"],
  ["og_057", "gcat_dairy", "Nestle Lactogen 1 (0+ Months)", "200gm", 780, "nestle-lactogen-1-200gm.jpg"],
  ["og_058", "gcat_dairy", "Nestle Lactogen 2 (6month+)", "200gm", 780, "nestle-lactogen-2-200gm.jpg"],
  ["og_059", "gcat_dairy", "Nestle Bunyad Powder Pouch", "260g", 540, "nestle-bunyad-powder-pouch-260g.jpg"],
  ["og_060", "gcat_dairy", "NESTLE LACTOGROW 3 Growing-up Formula Powder Milk", "400g", 1540, "nestle-lactogrow-3-400g.jpg"],

  // 6. TEA & COFFEE (10)
  ["og_061", "gcat_tea_coffee", "Tapal Danedar Black Tea", "170g", 400, "tapal-danedar-black-tea-170g.jpg"],
  ["og_062", "gcat_tea_coffee", "Tapal Danedar Tea Pouch", "350g", 750, "tapal-danedar-tea-pouch-350g.jpg"],
  ["og_063", "gcat_tea_coffee", "Tapal Danedar Tea Pouch", "430g", 950, "tapal-danedar-tea-pouch-430g.jpg"],
  ["og_064", "gcat_tea_coffee", "Lipton Yellow Label", "85g", 200, "lipton-yellow-label-85g.jpg"],
  ["og_065", "gcat_tea_coffee", "Lipton Yellow Label Tea", "170g", 420, "lipton-yellow-label-tea-170g.jpg"],
  ["og_066", "gcat_tea_coffee", "Lipton Yellow Label", "430g", 1049, "lipton-yellow-label-430g.jpg"],
  ["og_067", "gcat_tea_coffee", "Vital Tea Box", "170Gm", 400, "vital-tea-box-170gm.jpg"],
  ["og_068", "gcat_tea_coffee", "Tapal Danedar Tea Bags 25 Pieces", "50g", 220, "tapal-danedar-tea-bags-25pcs.jpg"],
  ["og_069", "gcat_tea_coffee", "Tapal Family Mixture Tea Pouch", "430g", 1000, "tapal-family-mixture-tea-pouch-430g.jpg"],
  ["og_070", "gcat_tea_coffee", "Nescafe Classic Coffee Jar", "50gm", 1100, "nescafe-classic-coffee-jar-50gm.jpg"],

  // 7. CIGARETTES (11)
  ["og_071", "gcat_cigarettes", "Gold Leaf", "1 pack", 500, "gold-leaf.jpg"],
  ["og_072", "gcat_cigarettes", "Capstan", "1 pack", 250, "capstan.jpg"],
  ["og_073", "gcat_cigarettes", "Capstan Elite", "1 pack", 270, "capstan-elite.jpg"],
  ["og_074", "gcat_cigarettes", "Morven Gold", "1 pack", 250, "morven-gold.jpg"],
  ["og_075", "gcat_cigarettes", "Dunhill Switch", "1 pack", 650, "dunhill-switch.jpg"],
  ["og_076", "gcat_cigarettes", "Dunhill Lights", "1 pack", 600, "dunhill-lights.jpg"],
  ["og_077", "gcat_cigarettes", "Dunhill Special", "1 pack", 600, "dunhill-special.jpg"],
  ["og_078", "gcat_cigarettes", "Benson & Hedges", "1 pack", 350, "benson-and-hedges.jpg"],
  ["og_079", "gcat_cigarettes", "Gold Flake", "1 pack", 250, "gold-flake.jpg"],
  ["og_080", "gcat_cigarettes", "Embassy", "1 pack", 250, "embassy.jpg"],
  ["og_081", "gcat_cigarettes", "Marlboro", "1 pack", 550, "marlboro.jpg"],

  // 8. SNACKS & BEVERAGES (8)
  ["og_082", "gcat_snacks_beverages", "Lay's Chips Masala", "Rs. 50 pack", 50, "lays-chips-masala.jpg"],
  ["og_083", "gcat_snacks_beverages", "Lay's Chips Classic Salt", "Rs. 50 pack", 50, "lays-chips-classic-salt.jpg"],
  ["og_084", "gcat_snacks_beverages", "Kurkure Red Chilli Jhatka", "Rs. 60 pack", 60, "kurkure-red-chilli-jhatka.jpg"],
  ["og_085", "gcat_snacks_beverages", "Pepsi PET", "1.5L", 200, "pepsi-pet-1-5l.jpg"],
  ["og_086", "gcat_snacks_beverages", "7Up PET", "1.5L", 200, "7up-pet-1-5l.jpg"],
  ["og_087", "gcat_snacks_beverages", "Mirinda PET", "1.5L", 200, "mirinda-pet-1-5l.jpg"],
  ["og_088", "gcat_snacks_beverages", "Mountain Dew PET", "1.5L", 200, "mountain-dew-pet-1-5l.jpg"],
  ["og_089", "gcat_snacks_beverages", "Qarshi Jam-e-Shirin", "500ml", 350, "qarshi-jam-e-shirin-500ml.jpg"],

  // 9. PERSONAL CARE (5)
  ["og_090", "gcat_personal_care", "LUX VELVET TOUCH WHITE SOAP BAR TRIO", "130G", 450, "lux-velvet-touch-soap-trio-130g.jpg"],
  ["og_091", "gcat_personal_care", "LIFEBUOY MILD CARE SOAP BAR TRIO", "125G", 380, "lifebuoy-mild-care-soap-trio-125g.jpg"],
  ["og_092", "gcat_personal_care", "Dettol Soap Skincare Pack of 3", "90g", 370, "dettol-soap-skincare-pack-of-3-90g.jpg"],
  ["og_093", "gcat_personal_care", "SUNSILK SHAMPOO", "185ML", 500, "sunsilk-shampoo-185ml.jpg"],
  ["og_094", "gcat_personal_care", "Colgate Toothpaste Regular", "100g", 225, "colgate-toothpaste-regular-100g.jpg"],

  // 10. CLEANING & LAUNDRY (3)
  ["og_095", "gcat_cleaning_laundry", "SURF EXCEL WASHING POWDER", "500G", 310, "surf-excel-washing-powder-500g.jpg"],
  ["og_096", "gcat_cleaning_laundry", "VIM LEMON AND SALT DISHWASHING BAR", "230G", 90, "vim-lemon-salt-dishwashing-bar-230g.jpg"],
  ["og_097", "gcat_cleaning_laundry", "Harpic Toilet Cleaner Promo", "225ml", 200, "harpic-toilet-cleaner-225ml.jpg"],

  // 11. MOTHER & BABY (2)
  ["og_098", "gcat_mother_baby", "Bona Papa Super Baby Diapers Medium Size", "50 Pieces", 1300, "bona-papa-baby-diapers-medium-50pcs.jpg"],
  ["og_099", "gcat_mother_baby", "Cerelac Red Fruits Baby Food", "175g", 560, "cerelac-red-fruits-175g.jpg"],

  // 12. FEMININE CARE (1)
  ["og_100", "gcat_feminine_care", "Butterfly Breathables Maxi Thick Cottony Sanitary Pads Extra Long Value Pack", "16 Pcs", 650, "butterfly-breathables-sanitary-pads-16pcs.jpg"],
];

export const OWNER_GROCERY_PRODUCTS: GroceryProduct[] = RAW_100_ITEMS.map(
  ([id, categoryId, name, unit, price, filename]) => ({
    id,
    categoryId,
    name,
    unit,
    packSize: unit,
    price,
    imageUrl: `/images/grocery/${filename}`,
    stock: 25,
    isAvailable: true,
    description: unit && unit !== "—" ? `${name} (${unit})` : name,
  })
);
