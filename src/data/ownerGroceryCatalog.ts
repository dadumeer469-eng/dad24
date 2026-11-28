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
  gcat_medicine: { emoji: "💊", accentBg: "from-emerald-500/15 to-green-500/10", accentText: "text-emerald-700 dark:text-emerald-300", badge: "Medicine" },
  gcat_ronin: { emoji: "🎧", accentBg: "from-violet-500/15 to-purple-500/10", accentText: "text-violet-700 dark:text-violet-300", badge: "Ronin" },
};

const CAT_IMAGES = {
  rashan: "/images/grocery/chawal-rice-johi.jpg",
  oilGhee: "/images/grocery/mezan-cooking-oil-pouch-1litre.jpg",
  spices: "/images/grocery/coriander-powder-100g.jpg",
  bakery: "/images/grocery/dawn-fortified-bread-medium-600gm.jpg",
  // Crisp high-contrast dairy image (replaces faint washed-out milk bottle photo)
  dairy: "/images/grocery/nestle-milkpak-tetra-pack-250ml.jpg",
  teaCoffee: "/images/grocery/tapal-danedar-black-tea-170g.jpg",
  cigarettes: "/images/grocery/gold-leaf.jpg",
  snacks: "/images/grocery/lays-chips-classic-salt.jpg",
  personalCare: "/images/grocery/dove-shampoo-175ml.jpg",
  cleaning: "/images/grocery/surf-excel-washing-powder-1kg.jpg",
  motherBaby: "/images/grocery/bona-papa-baby-diapers-medium-50pcs.jpg",
  feminineCare: "/images/grocery/butterfly-breathables-sanitary-pads-16pcs.jpg",
  medicine: "/images/grocery/panadol-500mg-1-strip-10-tablets.jpg",
  ronin: "/images/grocery/ronin-r-29-handsfree.jpg",
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
  { id: "gcat_medicine", name: "Medicine & Pharmacy", imageUrl: CAT_IMAGES.medicine, isAvailable: true, position: 13 },
  { id: "gcat_ronin", name: "Ronin Accessories", imageUrl: CAT_IMAGES.ronin, isAvailable: true, position: 14 },
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
  ["og_001", "gcat_rashan", "Sugar", "1kg", 170, "sugar-1kg.jpg"],
  ["og_002", "gcat_rashan", "BakeParlor Macroni", "—", 155, "bakeparlor-macroni.jpg"],
  ["og_003", "gcat_rashan", "Chawal (Rice) Johi", "—", 290, "chawal-rice-johi.jpg"],
  ["og_004", "gcat_rashan", "Youngs Mayonnaise Pouch", "500ml", 440, "youngs-mayonnaise-pouch-500ml.jpg"],
  ["og_005", "gcat_rashan", "Bake Parlor Spaghetti Box Hara Masala / Fajita", "250Gm", 165, "bake-parlor-spaghetti-box-250gm.jpg"],
  ["og_006", "gcat_rashan", "Rice (Sela)", "—", 485, "rice-sela.jpg"],
  ["og_007", "gcat_rashan", "Chakki Atta", "1 kg", 215, "chakki-atta-1kg.jpg"],

  // 2. OIL & GHEE (11)
  ["og_008", "gcat_oil_ghee", "Mezan Cooking Oil Pouch", "1Litre", 660, "mezan-cooking-oil-pouch-1litre.jpg"],
  ["og_009", "gcat_oil_ghee", "Eva Cooking Oil", "1l", 670, "eva-cooking-oil-1l.jpg"],
  ["og_010", "gcat_oil_ghee", "Eva Sunflower Oil", "1L", 675, "eva-sunflower-oil-1l.jpg"],
  ["og_011", "gcat_oil_ghee", "Eva Sunflower Oil Pillow Pouch", "1L", 675, "eva-sunflower-oil-pillow-pouch-1l.jpg"],
  ["og_012", "gcat_oil_ghee", "Tullo Banaspati Pouch", "1kg", 615, "tullo-banaspati-pouch-1kg.jpg"],
  ["og_013", "gcat_oil_ghee", "Tullo Cooking Oil Pouch", "1L", 610, "tullo-cooking-oil-pouch-1l.jpg"],
  ["og_014", "gcat_oil_ghee", "Eva Cooking Oil Bottle", "5l", 3415, "eva-cooking-oil-bottle-5l.jpg"],
  ["og_015", "gcat_oil_ghee", "Dalda Banaspati Ghee Pouch", "1 kg", 665, "dalda-banaspati-ghee-pouch-1kg.jpg"],
  ["og_016", "gcat_oil_ghee", "Dalda Cooking Oil Pouch", "1 Ltr", 690, "dalda-cooking-oil-pouch-1ltr.jpg"],
  ["og_017", "gcat_oil_ghee", "Soya Supreme Cooking Oil", "1Ltr", 655, "soya-supreme-cooking-oil-1ltr.jpg"],
  ["og_018", "gcat_oil_ghee", "Eva Cooking Oil Bottle", "3l", 2055, "eva-cooking-oil-bottle-3l.jpg"],

  // 3. SPICES (20)
  ["og_019", "gcat_spices", "National Iodized Salt", "800g", 70, "national-iodized-salt-800g.jpg"],
  ["og_020", "gcat_spices", "National Chilli Powder", "100g", 210, "national-chilli-powder-100g.jpg"],
  ["og_021", "gcat_spices", "National Turmeric Powder", "50g", 150, "national-turmeric-powder-50g.jpg"],
  ["og_022", "gcat_spices", "National Garam Masala Powder", "50g", 325, "national-garam-masala-powder-50g.jpg"],
  ["og_023", "gcat_spices", "Coriander Powder", "100g", 185, "coriander-powder-100g.jpg"],
  ["og_024", "gcat_spices", "National Biryani Masala", "39g", 165, "national-biryani-masala-39g.jpg"],
  ["og_025", "gcat_spices", "Shan Chicken Biryani Masala", "55g", 165, "shan-chicken-biryani-masala-55g.jpg"],
  ["og_026", "gcat_spices", "National Chicken Tikka Masala", "40g", 160, "national-chicken-tikka-masala-40g.jpg"],
  ["og_027", "gcat_spices", "National Masala Quorma", "50g", 160, "national-masala-quorma-50g.jpg"],
  ["og_028", "gcat_spices", "National Masala Karahi Gosht", "47Gm", 155, "national-masala-karahi-gosht-47gm.jpg"],
  ["og_029", "gcat_spices", "National Haleem Masala", "43g", 165, "national-haleem-masala-43g.jpg"],
  ["og_030", "gcat_spices", "Shan Special Chaat Masala", "50g", 105, "shan-special-chaat-masala-50g.jpg"],
  ["og_031", "gcat_spices", "National Pulao Masala", "70g", 150, "national-pulao-masala-70g.jpg"],
  ["og_032", "gcat_spices", "Shan Khalis Haldee Powder", "50g", 145, "shan-khalis-haldee-powder-50g.jpg"],
  ["og_033", "gcat_spices", "Shan Taaza Dhania Powder", "90g", 175, "shan-taaza-dhania-powder-90g.jpg"],
  ["og_034", "gcat_spices", "National Black Pepper Powder", "25g", 210, "national-black-pepper-powder-25g.jpg"],
  ["og_035", "gcat_spices", "National Chaat Masala", "45g", 120, "national-chaat-masala-45g.jpg"],
  ["og_036", "gcat_spices", "Shan Tez Lal Mirch Powder", "50g", 110, "shan-tez-lal-mirch-powder-50g.jpg"],
  ["og_037", "gcat_spices", "National Chilli Powder", "50g", 105, "national-chilli-powder-50g.jpg"],
  ["og_038", "gcat_spices", "Whole Garam Masala (Garam Masala Sabut)", "100g", 365, "whole-garam-masala-sabut-100g.jpg"],

  // 4. BAKERY (10)
  ["og_039", "gcat_dairy", "Egg", "1 Dozen", 340, "egg-1-dozen.jpg"],
  ["og_040", "gcat_bakery", "Dawn Fortified Bread (Regular)", "380gm", 175, "dawn-fortified-bread-regular-380gm.jpg"],
  ["og_041", "gcat_bakery", "Dawn Fortified Bread (Medium)", "600gm", 265, "dawn-fortified-bread-medium-600gm.jpg"],
  ["og_042", "gcat_bakery", "Dawn Fortified Bread (Small)", "340gm", 125, "dawn-fortified-bread-small-340gm.jpg"],
  ["og_043", "gcat_bakery", "National Jam Mango", "200Gm", 200, "national-jam-mango-200gm.jpg"],
  ["og_044", "gcat_bakery", "National Jam Apple", "200g", 255, "national-jam-apple-200g.jpg"],
  ["og_045", "gcat_bakery", "Rafhan Custard Vanilla", "275gm", 240, "rafhan-custard-vanilla-275gm.jpg"],
  ["og_046", "gcat_bakery", "Rafhan Custard Banana", "275gm", 240, "rafhan-custard-banana-275gm.jpg"],
  ["og_047", "gcat_bakery", "Quaker Quick Cook White Oats Pouch", "200g", 305, "quaker-quick-cook-white-oats-200g.jpg"],
  ["og_048", "gcat_bakery", "Meiji Cake (Small)", "100g", 150, "meiji-cake-small-100g.jpg"],

  // 5. DAIRY (12)
  ["og_049", "gcat_dairy", "Nestle Milkpak Tetra Pack", "250ml", 110, "nestle-milkpak-tetra-pack-250ml.jpg"],
  ["og_050", "gcat_dairy", "Olper Milk", "250ml", 110, "olper-milk-250ml.jpg"],
  ["og_051", "gcat_dairy", "Nestle Milkpak Cream", "200ml", 305, "nestle-milkpak-cream-200ml.jpg"],
  ["og_052", "gcat_dairy", "Everyday Milk Powder Pouch", "1200g (1.2kg)", 3080, "everyday-milk-powder-pouch-1200g.jpg"],
  ["og_053", "gcat_dairy", "NESTLE EVERYDAY Tea Whitener Powder Pouch", "230g", 565, "nestle-everyday-tea-whitener-230g.jpg"],
  ["og_054", "gcat_dairy", "NESTLE EVERYDAY Tea Whitener Powder Pouch", "350g", 990, "nestle-everyday-tea-whitener-350g.jpg"],
  ["og_055", "gcat_dairy", "Nestle Everyday Karak Powder Chai 3in1", "20g", 90, "nestle-everyday-karak-chai-3in1-20g.jpg"],
  ["og_056", "gcat_dairy", "Nestle Nido 1+ Box", "375gm", 1320, "nestle-nido-1-plus-box-375gm.jpg"],
  ["og_057", "gcat_dairy", "Nestle Lactogen 1 (0+ Months)", "200gm", 865, "nestle-lactogen-1-200gm.jpg"],
  ["og_058", "gcat_dairy", "Nestle Lactogen 2 (6month+)", "200gm", 735, "nestle-lactogen-2-200gm.jpg"],
  ["og_059", "gcat_dairy", "Nestle Bunyad Powder Pouch", "260g", 595, "nestle-bunyad-powder-pouch-260g.jpg"],
  ["og_060", "gcat_dairy", "NESTLE LACTOGROW 3 Growing-up Formula Powder Milk", "400g", 1690, "nestle-lactogrow-3-400g.jpg"],

  // 6. TEA & COFFEE (10)
  ["og_061", "gcat_tea_coffee", "Tapal Danedar Black Tea", "170g", 425, "tapal-danedar-black-tea-170g.jpg"],
  ["og_062", "gcat_tea_coffee", "Tapal Danedar Tea Pouch", "350g", 800, "tapal-danedar-tea-pouch-350g.jpg"],
  ["og_063", "gcat_tea_coffee", "Tapal Danedar Tea Pouch", "430g", 1030, "tapal-danedar-tea-pouch-430g.jpg"],
  ["og_064", "gcat_tea_coffee", "Lipton Yellow Label", "85g", 225, "lipton-yellow-label-85g.jpg"],
  ["og_065", "gcat_tea_coffee", "Lipton Yellow Label Tea", "170g", 460, "lipton-yellow-label-tea-170g.jpg"],
  ["og_066", "gcat_tea_coffee", "Lipton Yellow Label", "430g", 1140, "lipton-yellow-label-430g.jpg"],
  ["og_067", "gcat_tea_coffee", "Vital Tea Box", "170Gm", 430, "vital-tea-box-170gm.jpg"],
  ["og_068", "gcat_tea_coffee", "Tapal Danedar Tea Bags 25 Pieces", "50g", 280, "tapal-danedar-tea-bags-25pcs.jpg"],
  ["og_069", "gcat_tea_coffee", "Tapal Family Mixture Tea Pouch", "430g", 975, "tapal-family-mixture-tea-pouch-430g.jpg"],
  ["og_070", "gcat_tea_coffee", "Nescafe Classic Coffee Jar", "50gm", 1045, "nescafe-classic-coffee-jar-50gm.jpg"],

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
  ["og_082", "gcat_snacks_beverages", "Lay's Chips Masala", "Rs. 50 pack", 55, "lays-chips-masala.jpg"],
  ["og_083", "gcat_snacks_beverages", "Lay's Chips Classic Salt", "Rs. 50 pack", 55, "lays-chips-classic-salt.jpg"],
  ["og_084", "gcat_snacks_beverages", "Kurkure Red Chilli Jhatka", "Rs. 60 pack", 65, "kurkure-red-chilli-jhatka.jpg"],
  ["og_085", "gcat_snacks_beverages", "Pepsi PET", "1.5L", 215, "pepsi-pet-1-5l.jpg"],
  ["og_086", "gcat_snacks_beverages", "7Up PET", "1.5L", 215, "7up-pet-1-5l.jpg"],
  ["og_087", "gcat_snacks_beverages", "Mirinda PET", "1.5L", 215, "mirinda-pet-1-5l.jpg"],
  ["og_088", "gcat_snacks_beverages", "Mountain Dew PET", "1.5L", 215, "mountain-dew-pet-1-5l.jpg"],
  ["og_089", "gcat_snacks_beverages", "Qarshi Jam-e-Shirin", "500ml", 350, "qarshi-jam-e-shirin-500ml.jpg"],

  // 9. PERSONAL CARE (5)
  ["og_090", "gcat_personal_care", "LUX VELVET TOUCH WHITE SOAP BAR TRIO", "130G", 480, "lux-velvet-touch-soap-trio-130g.jpg"],
  ["og_091", "gcat_personal_care", "LIFEBUOY MILD CARE SOAP BAR TRIO", "125G", 415, "lifebuoy-mild-care-soap-trio-125g.jpg"],
  ["og_092", "gcat_personal_care", "Dettol Soap Skincare Pack of 3", "90g", 405, "dettol-soap-skincare-pack-of-3-90g.jpg"],
  ["og_093", "gcat_personal_care", "SUNSILK SHAMPOO", "185ML", 545, "sunsilk-shampoo-185ml.jpg"],
  ["og_094", "gcat_personal_care", "Colgate Toothpaste Regular", "100g", 250, "colgate-toothpaste-regular-100g.jpg"],

  // 10. CLEANING & LAUNDRY (3)
  ["og_095", "gcat_cleaning_laundry", "SURF EXCEL WASHING POWDER", "500G", 365, "surf-excel-washing-powder-500g.jpg"],
  ["og_096", "gcat_cleaning_laundry", "VIM LEMON AND SALT DISHWASHING BAR", "230G", 85, "vim-lemon-salt-dishwashing-bar-230g.jpg"],
  ["og_097", "gcat_cleaning_laundry", "Harpic Toilet Cleaner Promo", "225ml", 220, "harpic-toilet-cleaner-225ml.jpg"],

  // 11. MOTHER & BABY (2)
  ["og_098", "gcat_mother_baby", "Bona Papa Super Baby Diapers Medium Size", "50 Pieces", 1210, "bona-papa-baby-diapers-medium-50pcs.jpg"],
  ["og_099", "gcat_mother_baby", "Cerelac Red Fruits Baby Food", "175g", 625, "cerelac-red-fruits-175g.jpg"],

  // 12. FEMININE CARE (1)
  ["og_100", "gcat_feminine_care", "Butterfly Breathables Maxi Thick Cottony Sanitary Pads Extra Long Value Pack", "16 Pcs", 715, "butterfly-breathables-sanitary-pads-16pcs.jpg"],
];

/**
 * 197 MORE owner grocery items (og_101 - og_302, 5 less-common medicines removed) across 10 categories,
 * added 2026-11-26. Prices: grocery items = dailymartdadu.com (25 Nov 2026);
 * medicine = Dawaai.pk / Al-Hikma Pharmacy / DVAGO (rounded to nearest Rs).
 * No vegetables/fruits. New category: Medicine & Pharmacy (gcat_medicine).
 * Photo files live in `public/images/grocery/` (created separately).
 */
const RAW_200_ITEMS: SeedTuple[] = [
  // SPICES (55)
  ["og_101", "gcat_spices", "National Garlic Powder", "50g", 170, "national-garlic-powder-50g.jpg"],
  ["og_102", "gcat_spices", "National Garam Masala", "25g", 170, "national-garam-masala-25g.jpg"],
  ["og_103", "gcat_spices", "Shan Zafrani Garam Masala Powder", "50g", 325, "shan-zafrani-garam-masala-powder-50g.jpg"],
  ["og_104", "gcat_spices", "Knorr Chicken Cube Pack of 6", "1 pack", 540, "knorr-chicken-cube-pack-of-6-1-pack.jpg"],
  ["og_105", "gcat_spices", "Shan Teekhi Kali Mirch Powder", "50g", 340, "shan-teekhi-kali-mirch-powder-50g.jpg"],
  ["og_106", "gcat_spices", "Shan Khushbudar Lehsan Powder", "50g", 150, "shan-khushbudar-lehsan-powder-50g.jpg"],
  ["og_107", "gcat_spices", "Shan Tez Lal Mirch Powder", "180g", 390, "shan-tez-lal-mirch-powder-180g.jpg"],
  ["og_108", "gcat_spices", "Shan Tez Lal Mirch Powder", "90g", 210, "shan-tez-lal-mirch-powder-90g.jpg"],
  ["og_109", "gcat_spices", "Large Cardamom (Bari Elaichi)", "50g", 605, "large-cardamom-bari-elaichi-50g.jpg"],
  ["og_110", "gcat_spices", "National Quick Haleem Masala", "300g", 350, "national-quick-haleem-masala-300g.jpg"],
  ["og_111", "gcat_spices", "Shan Taaza Dhania Powder", "200g", 370, "shan-taaza-dhania-powder-200g.jpg"],
  ["og_112", "gcat_spices", "National Turmeric Powder", "100g", 290, "national-turmeric-powder-100g.jpg"],
  ["og_113", "gcat_spices", "National Achar Gosht Masala", "50g", 155, "national-achar-gosht-masala-50g.jpg"],
  ["og_114", "gcat_spices", "National Ginger Powder", "50g", 210, "national-ginger-powder-50g.jpg"],
  ["og_115", "gcat_spices", "National Seeds Cumin", "50g", 350, "national-seeds-cumin-50g.jpg"],
  ["og_116", "gcat_spices", "National Chicken Tandoori", "40g", 160, "national-chicken-tandoori-40g.jpg"],
  ["og_117", "gcat_spices", "National Cumin Powder", "50g", 435, "national-cumin-powder-50g.jpg"],
  ["og_118", "gcat_spices", "National Mazedar Daal", "46g", 165, "national-mazedar-daal-46g.jpg"],
  ["og_119", "gcat_spices", "National Chicken Tikka Masala", "80g", 330, "national-chicken-tikka-masala-80g.jpg"],
  ["og_120", "gcat_spices", "National Sindhi Biryani Masala", "41g", 165, "national-sindhi-biryani-masala-41g.jpg"],
  ["og_121", "gcat_spices", "National All-in-One BBQ Mix Masala", "45g", 165, "national-all-in-one-bbq-mix-masala-45g.jpg"],
  ["og_122", "gcat_spices", "National White Karahi", "40g", 165, "national-white-karahi-40g.jpg"],
  ["og_123", "gcat_spices", "National Qeema Masala", "50g", 165, "national-qeema-masala-50g.jpg"],
  ["og_124", "gcat_spices", "National Shami Kabab Masala", "45g", 165, "national-shami-kabab-masala-45g.jpg"],
  ["og_125", "gcat_spices", "National Karahi Gosht Masala", "94g", 280, "national-karahi-gosht-masala-94g.jpg"],
  ["og_126", "gcat_spices", "National Tikka Boti Masala", "44g", 165, "national-tikka-boti-masala-44g.jpg"],
  ["og_127", "gcat_spices", "National Broast Masala", "97g", 155, "national-broast-masala-97g.jpg"],
  ["og_128", "gcat_spices", "National Fish Masala", "40g", 165, "national-fish-masala-40g.jpg"],
  ["og_129", "gcat_spices", "National Murghi Masala", "43g", 165, "national-murghi-masala-43g.jpg"],
  ["og_130", "gcat_spices", "National Chapli Kabab Masala", "72g", 160, "national-chapli-kabab-masala-72g.jpg"],
  ["og_131", "gcat_spices", "National Seekh Kabab Masala", "46g", 165, "national-seekh-kabab-masala-46g.jpg"],
  ["og_132", "gcat_spices", "National Murgi Masala", "86g", 330, "national-murgi-masala-86g.jpg"],
  ["og_133", "gcat_spices", "National Fish Masala", "80g", 310, "national-fish-masala-80g.jpg"],
  ["og_134", "gcat_spices", "National Masala Malai Boti", "50g", 165, "national-masala-malai-boti-50g.jpg"],
  ["og_135", "gcat_spices", "White Cumin Seeds (Zeera White)", "125g", 300, "white-cumin-seeds-zeera-white-125g.jpg"],
  ["og_136", "gcat_spices", "Sonf", "100g", 90, "sonf-100g.jpg"],
  ["og_137", "gcat_spices", "Cloves (Laung)", "25g", 140, "cloves-long-25g.jpg"],
  ["og_138", "gcat_spices", "National Spice Chili Powder", "200g", 425, "national-spice-chili-powder-200g.jpg"],
  ["og_139", "gcat_spices", "Whole Coriander (Dhaniya Sabut)", "100g", 90, "whole-coriander-dhaniya-sabut-100g.jpg"],
  ["og_140", "gcat_spices", "Turmeric Powder (Haldi Powder)", "250g", 275, "turmeric-powder-haldi-powder-250g.jpg"],
  ["og_141", "gcat_spices", "Whole Black Pepper (Kali Mirch Sabut)", "50g", 220, "whole-black-pepper-kali-mirch-sabut-50g.jpg"],
  ["og_142", "gcat_spices", "National Achar Goasht", "100g", 280, "national-achar-goasht-100g.jpg"],
  ["og_143", "gcat_spices", "Cinnamon Stick (Dalchini Stick)", "100g", 220, "cinnamon-stick-dalchini-stick-100g.jpg"],
  ["og_144", "gcat_spices", "Small Cardamom (Choti Elaichi)", "50g", 980, "small-cardamom-choti-elaichi-50g.jpg"],
  ["og_145", "gcat_spices", "Shan Special Bombay Biryani Masala", "60g", 170, "shan-special-bombay-biryani-masala-60g.jpg"],
  ["og_146", "gcat_spices", "Whole Red Chili (Lal Mirch Sabut)", "250g", 270, "whole-red-chili-lal-mirch-sabut-250g.jpg"],
  ["og_147", "gcat_spices", "Tamarind (Imli)", "250g", 150, "tamarind-imli-250g.jpg"],
  ["og_148", "gcat_spices", "Zarda Color Yellow", "100g", 50, "zarda-color-yellow-100g.jpg"],
  ["og_149", "gcat_spices", "National Tomato Ketchup", "800g", 460, "national-tomato-ketchup-800g.jpg"],
  ["og_150", "gcat_spices", "National Tomato Ketchup", "400g", 240, "national-tomato-ketchup-400g.jpg"],
  ["og_151", "gcat_spices", "National Tomato Ketchup", "210g", 140, "national-tomato-ketchup-210g.jpg"],
  ["og_152", "gcat_spices", "National Chilli Garlic Sauce", "400g", 240, "national-chilli-garlic-sauce-400g.jpg"],
  ["og_153", "gcat_spices", "National Chilli Garlic Sauce", "210g", 150, "national-chilli-garlic-sauce-210g.jpg"],
  ["og_154", "gcat_spices", "Shangrila Soya Sauce", "275ml", 160, "shangrila-soya-sauce-275ml.jpg"],
  ["og_155", "gcat_spices", "National White Vinegar Bottle", "800ml", 220, "national-white-vinegar-bottle-800ml.jpg"],
  // PERSONAL CARE (32)
  ["og_156", "gcat_personal_care", "Palmolive Refreshing Glow Naturals Bar Soap Saver Pack", "3 Pieces x 98g", 395, "palmolive-refreshing-glow-naturals-bar-soap-saver-pack-3-pieces-x-98g.jpg"],
  ["og_157", "gcat_personal_care", "Palmolive Naturals Hydrating Glow Bar Soap", "98g", 125, "palmolive-naturals-hydrating-glow-bar-soap-98g.jpg"],
  ["og_158", "gcat_personal_care", "Palmolive Naturals Flawless Glow Bar Soap", "125g", 170, "palmolive-naturals-flawless-glow-bar-soap-125g.jpg"],
  ["og_159", "gcat_personal_care", "Palmolive Saver Pack", "3 Pieces x 130g", 485, "palmolive-saver-pack-3-pieces-x-130g.jpg"],
  ["og_160", "gcat_personal_care", "Lux Lotus Purple Soap Bar", "128g", 175, "lux-lotus-purple-soap-bar-128g.jpg"],
  ["og_161", "gcat_personal_care", "Lux Velvet Touch White Soap Bar", "49g", 75, "lux-velvet-touch-white-soap-bar-49g.jpg"],
  ["og_162", "gcat_personal_care", "Palmolive Naturals Moisturizing Glow Bar Soap", "98g", 125, "palmolive-naturals-moisturizing-glow-bar-soap-98g.jpg"],
  ["og_163", "gcat_personal_care", "Palmolive Naturals Hydrating Glow Bar Soap", "130g", 165, "palmolive-naturals-hydrating-glow-bar-soap-130g.jpg"],
  ["og_164", "gcat_personal_care", "Capri Soap Purple Bundle", "120g", 420, "capri-soap-purple-bundle-120g.jpg"],
  ["og_165", "gcat_personal_care", "Capri Glow Jasmine & Aloe Vera Pink Soap (Saving Pack)", "5 x 100g", 510, "capri-glow-jasmine-and-aloe-vera-pink-soap-saving-pack-5-x-100g.jpg"],
  ["og_166", "gcat_personal_care", "Lux Tangerine Orange Soap Bar", "100g", 145, "lux-tangerine-orange-soap-bar-100g.jpg"],
  ["og_167", "gcat_personal_care", "Dettol Soap Skincare", "160g", 185, "dettol-soap-skincare-160g.jpg"],
  ["og_168", "gcat_personal_care", "Lux Velvet Touch White Soap Bar", "64g", 110, "lux-velvet-touch-white-soap-bar-64g.jpg"],
  ["og_169", "gcat_personal_care", "Capri Soap White Single", "100g", 105, "capri-soap-white-single-100g.jpg"],
  ["og_170", "gcat_personal_care", "Dettol Soap Cool", "90g Pack of 3", 405, "dettol-soap-cool-90g-pack-of-3.jpg"],
  ["og_171", "gcat_personal_care", "Dettol Soap", "80g", 155, "dettol-soap-80g.jpg"],
  ["og_172", "gcat_personal_care", "Safeguard Pure White Soap", "175g", 230, "safeguard-pure-white-soap-175g.jpg"],
  ["og_173", "gcat_personal_care", "Lux Velvet Touch White Soap Bar", "163g", 210, "lux-velvet-touch-white-soap-bar-163g.jpg"],
  ["og_174", "gcat_personal_care", "Dove Soap Sensitive Skin", "90gm", 420, "dove-soap-sensitive-skin-90gm.jpg"],
  ["og_175", "gcat_personal_care", "Lifebuoy Lemon Fresh Trio Soap Bar", "130g", 415, "lifebuoy-lemon-fresh-trio-soap-bar-130g.jpg"],
  ["og_176", "gcat_personal_care", "Lifebuoy Soap Bar", "63g", 80, "lifebuoy-soap-bar-63g.jpg"],
  ["og_177", "gcat_personal_care", "Colgate Small", "40g", 80, "colgate-small-40g.jpg"],
  ["og_178", "gcat_personal_care", "Dove Shampoo", "175ml", 570, "dove-shampoo-175ml.jpg"],
  ["og_179", "gcat_personal_care", "Dove Shampoo", "360ml", 945, "dove-shampoo-360ml.jpg"],
  ["og_180", "gcat_personal_care", "Head & Shoulders Shampoo", "75ml", 225, "head-and-shoulders-shampoo-75ml.jpg"],
  ["og_181", "gcat_personal_care", "Head & Shoulders Shampoo", "185ml", 605, "head-and-shoulders-shampoo-185ml.jpg"],
  ["og_182", "gcat_personal_care", "Head & Shoulders Shampoo", "360ml", 935, "head-and-shoulders-shampoo-360ml.jpg"],
  ["og_183", "gcat_personal_care", "Sunsilk Shampoo", "80ml", 195, "sunsilk-shampoo-80ml.jpg"],
  ["og_184", "gcat_personal_care", "Sunsilk Hairfall Solution Shampoo", "360ml", 870, "sunsilk-hairfall-solution-shampoo-360ml.jpg"],
  ["og_185", "gcat_personal_care", "Sunsilk Thick and Long Shampoo", "360ml", 870, "sunsilk-thick-and-long-shampoo-360ml.jpg"],
  ["og_186", "gcat_personal_care", "Lifebuoy Shampoo", "175ml", 350, "lifebuoy-shampoo-175ml.jpg"],
  ["og_187", "gcat_personal_care", "Lifebuoy Herbal Shampoo", "370ml", 675, "lifebuoy-herbal-shampoo-370ml.jpg"],
  // SNACKS & BEVERAGES (30)
  ["og_188", "gcat_snacks_beverages", "Lay's Wavy BBQ", "Rs. 50 pack", 55, "lay-s-wavy-bbq-rs-50-pack.jpg"],
  ["og_189", "gcat_snacks_beverages", "Lay's Chips French Cheese", "Rs. 50 pack", 55, "lay-s-chips-french-cheese-rs-50-pack.jpg"],
  ["og_190", "gcat_snacks_beverages", "Lay's Wavy BBQ", "Rs. 30 pack", 35, "lay-s-wavy-bbq-rs-30-pack.jpg"],
  ["og_191", "gcat_snacks_beverages", "Lay's Chips Yogurt & Herb", "Rs. 50 pack", 55, "lay-s-chips-yogurt-and-herb-rs-50-pack.jpg"],
  ["og_192", "gcat_snacks_beverages", "Lay's Wavy BBQ", "Rs. 70 pack", 75, "lay-s-wavy-bbq-rs-70-pack.jpg"],
  ["og_193", "gcat_snacks_beverages", "Lay's Chips Paprika", "Rs. 50 pack", 55, "lay-s-chips-paprika-rs-50-pack.jpg"],
  ["og_194", "gcat_snacks_beverages", "Lay's Wavy BBQ", "Rs. 100 pack", 110, "lay-s-wavy-bbq-rs-100-pack.jpg"],
  ["og_195", "gcat_snacks_beverages", "Lay's Wavy Yogurt & Herb", "Rs. 50 pack", 55, "lay-s-wavy-yogurt-and-herb-rs-50-pack.jpg"],
  ["og_196", "gcat_snacks_beverages", "Lay's Chips Classic", "Rs. 70 pack", 75, "lay-s-chips-classic-rs-70-pack.jpg"],
  ["og_197", "gcat_snacks_beverages", "Lay's Chips Masala", "Rs. 70 pack", 75, "lay-s-chips-masala-rs-70-pack.jpg"],
  ["og_198", "gcat_snacks_beverages", "Lay's Chips Paprika", "Rs. 70 pack", 75, "lay-s-chips-paprika-rs-70-pack.jpg"],
  ["og_199", "gcat_snacks_beverages", "Lay's Chips Yogurt & Herb", "Rs. 100 pack", 110, "lay-s-chips-yogurt-and-herb-rs-100-pack.jpg"],
  ["og_200", "gcat_snacks_beverages", "Lay's Chips Paprika", "Rs. 100 pack", 110, "lay-s-chips-paprika-rs-100-pack.jpg"],
  ["og_201", "gcat_snacks_beverages", "Kurkure Chutney Chaska", "Rs. 60 pack", 65, "kurkure-chutney-chaska-rs-60-pack.jpg"],
  ["og_202", "gcat_snacks_beverages", "Kurkure Red Chilli", "Rs. 40 pack", 45, "kurkure-red-chilli-rs-40-pack.jpg"],
  ["og_203", "gcat_snacks_beverages", "Kurkure Chutney Chaska", "Rs. 40 pack", 45, "kurkure-chutney-chaska-rs-40-pack.jpg"],
  ["og_204", "gcat_snacks_beverages", "Tuc Biscuit", "1 pack", 20, "tuc-biscuit-1-pack.jpg"],
  ["og_205", "gcat_snacks_beverages", "Zeera Biscuit Half Roll", "1 pack", 40, "zeera-biscuit-half-roll-1-pack.jpg"],
  ["og_206", "gcat_snacks_beverages", "Nestle Fruita Vitals Chaunsa Mango Nectar", "200ml", 100, "nestle-fruita-vitals-chaunsa-mango-nectar-200ml.jpg"],
  ["og_207", "gcat_snacks_beverages", "Nestle Fruita Vitals Apple Nectar", "200ml", 95, "nestle-fruita-vitals-apple-nectar-200ml.jpg"],
  ["og_208", "gcat_snacks_beverages", "Kolson Slanty Vegetable", "Rs. 50 pack", 55, "kolson-slanty-vegetable-rs-50-pack.jpg"],
  ["og_209", "gcat_snacks_beverages", "Kolson Salty Vegetable", "Rs. 50 pack", 55, "kolson-salty-vegetable-rs-50-pack.jpg"],
  ["og_210", "gcat_snacks_beverages", "Bisconni Cocomo Small", "1 pack", 10, "bisconni-cocomo-small-1-pack.jpg"],
  ["og_211", "gcat_snacks_beverages", "Peek Freans Peanut Pik Biscuits Family Pack", "1 pack", 105, "peek-freans-peanut-pik-biscuits-family-pack-1-pack.jpg"],
  ["og_212", "gcat_snacks_beverages", "Zeera Plus Biscuit Family Packet", "1 pack", 110, "zeera-plus-biscuit-family-packet-1-pack.jpg"],
  ["og_213", "gcat_snacks_beverages", "Nestle Fruita Vitals Chaunsa Mango Nectar", "1000ml", 550, "nestle-fruita-vitals-chaunsa-mango-nectar-1000ml.jpg"],
  ["og_214", "gcat_snacks_beverages", "Nestle Fruita Vitals Red Grapes Fruit Drink", "1000ml", 605, "nestle-fruita-vitals-red-grapes-fruit-drink-1000ml.jpg"],
  ["og_215", "gcat_snacks_beverages", "Slice Mango Juice", "200ml", 65, "slice-mango-juice-200ml.jpg"],
  ["og_216", "gcat_snacks_beverages", "Polly Juice", "1 pack", 50, "polly-juice-1-pack.jpg"],
  ["og_217", "gcat_snacks_beverages", "Qarshi Jam-e-Shirin", "800ml", 540, "qarshi-jam-e-shirin-800ml.jpg"],
  // TEA & COFFEE (24)
  ["og_218", "gcat_tea_coffee", "Lipton Green Tea Plain", "25 Tea Bags", 270, "lipton-green-tea-plain-25-tea-bags.jpg"],
  ["og_219", "gcat_tea_coffee", "Tapal Danedar Tea Pouch", "900gm", 1980, "tapal-danedar-tea-pouch-900gm.jpg"],
  ["og_220", "gcat_tea_coffee", "Tapal Danedar Box Elaichi", "80g", 275, "tapal-danedar-box-elaichi-80g.jpg"],
  ["og_221", "gcat_tea_coffee", "Tapal Tea Danedar Elaichi Box", "170g", 555, "tapal-tea-danedar-elaichi-box-170g.jpg"],
  ["og_222", "gcat_tea_coffee", "Tapal Danedar Tea Bags 50 Pieces", "100g", 605, "tapal-danedar-tea-bags-50-pieces-100g.jpg"],
  ["og_223", "gcat_tea_coffee", "Tapal Family Mixture Tea Value Pack", "900g", 1980, "tapal-family-mixture-tea-value-pack-900g.jpg"],
  ["og_224", "gcat_tea_coffee", "Lipton Yellow Label", "900g", 2185, "lipton-yellow-label-900g.jpg"],
  ["og_225", "gcat_tea_coffee", "Tapal Tezdum Tea", "170g", 435, "tapal-tezdum-tea-170g.jpg"],
  ["og_226", "gcat_tea_coffee", "Tapal Tezdum Tea Pouch", "430g", 1005, "tapal-tezdum-tea-pouch-430g.jpg"],
  ["og_227", "gcat_tea_coffee", "Vital Tea Pouch", "900Gm", 1980, "vital-tea-pouch-900gm.jpg"],
  ["og_228", "gcat_tea_coffee", "Lipton Black Tea Bags Enveloped", "100 Pieces", 1295, "lipton-black-tea-bags-enveloped-100-pieces.jpg"],
  ["og_229", "gcat_tea_coffee", "Tapal Ginger Honey Green Tea Bags", "30 Pieces 45g", 275, "tapal-ginger-honey-green-tea-bags-30-pieces-45g.jpg"],
  ["og_230", "gcat_tea_coffee", "Tapal Tezdum Pouch", "900g", 1890, "tapal-tezdum-pouch-900g.jpg"],
  ["og_231", "gcat_tea_coffee", "Tapal Danedar Tea Bags 100 Pieces", "100 Pieces", 1110, "tapal-danedar-tea-bags-100-pieces-100-pieces.jpg"],
  ["og_232", "gcat_tea_coffee", "Tapal Danedar Tea Enveloped 50Pcs Bags", "100Gm", 640, "tapal-danedar-tea-enveloped-50pcs-bags-100gm.jpg"],
  ["og_233", "gcat_tea_coffee", "Lipton Yellow Label Black Tea Bag (50 Pieces)", "100g", 665, "lipton-yellow-label-black-tea-bag-50-pieces-100g.jpg"],
  ["og_234", "gcat_tea_coffee", "Tapal Lemon Green Tea Bags", "30 Pieces 45g", 305, "tapal-lemon-green-tea-bags-30-pieces-45g.jpg"],
  ["og_235", "gcat_tea_coffee", "Tapal Danedar Elaichi Tea Enveloped Bags 50 Pieces", "100g", 710, "tapal-danedar-elaichi-tea-enveloped-bags-50-pieces-100g.jpg"],
  ["og_236", "gcat_tea_coffee", "Tapal Pure Green Tea Bags", "30 Pieces 45g", 280, "tapal-pure-green-tea-bags-30-pieces-45g.jpg"],
  ["og_237", "gcat_tea_coffee", "Lipton Yellow Label Black Tea Bag (100 Pieces)", "200g", 1355, "lipton-yellow-label-black-tea-bag-100-pieces-200g.jpg"],
  ["og_238", "gcat_tea_coffee", "Tapal Jasmine Green Tea Jar", "100g", 340, "tapal-jasmine-green-tea-jar-100g.jpg"],
  ["og_239", "gcat_tea_coffee", "Nescafe Classic Coffee Jar", "100gm", 2260, "nescafe-classic-coffee-jar-100gm.jpg"],
  ["og_240", "gcat_tea_coffee", "Tarang Liquid Tea Whitener", "220ml", 60, "tarang-liquid-tea-whitener-220ml.jpg"],
  ["og_241", "gcat_tea_coffee", "Tapal Elaichi Green Tea Bags", "30 Pieces 45g", 290, "tapal-elaichi-green-tea-bags-30-pieces-45g.jpg"],
  // MOTHER & BABY (14)
  ["og_242", "gcat_mother_baby", "Bona Papa Super Baby Diapers Newborn", "50 Pieces", 1100, "bona-papa-super-baby-diapers-newborn-50-pieces.jpg"],
  ["og_243", "gcat_mother_baby", "Bona Papa Super Baby Diapers Small", "50 Pieces", 1310, "bona-papa-super-baby-diapers-small-50-pieces.jpg"],
  ["og_244", "gcat_mother_baby", "Bona Papa Super Baby Diapers Large", "50 Pieces", 1320, "bona-papa-super-baby-diapers-large-50-pieces.jpg"],
  ["og_245", "gcat_mother_baby", "Nestle Cerelac Wheat Baby Food", "350g", 940, "nestle-cerelac-wheat-baby-food-350g.jpg"],
  ["og_246", "gcat_mother_baby", "Kids Feeders (Glass)", "1 pc", 600, "kids-feeders-glass-1-pc.jpg"],
  ["og_247", "gcat_mother_baby", "Feeder", "270ml", 650, "feeder-270ml.jpg"],
  ["og_248", "gcat_mother_baby", "Minitree Feeder", "150ml", 600, "minitree-feeder-150ml.jpg"],
  ["og_249", "gcat_mother_baby", "Feeder Set 4 in 1", "1 set", 600, "feeder-set-4-in-1-1-set.jpg"],
  ["og_250", "gcat_mother_baby", "Kids Cotton Buds", "1 pack", 300, "kids-cotton-buds-1-pack.jpg"],
  ["og_251", "gcat_mother_baby", "Kids Baby Pacifier", "1 pc", 300, "kids-baby-pacifier-1-pc.jpg"],
  ["og_252", "gcat_mother_baby", "Kids Bib Small", "1 pc", 100, "kids-bib-small-1-pc.jpg"],
  ["og_253", "gcat_mother_baby", "Kids Nipples Small", "1 pc", 100, "kids-nipples-small-1-pc.jpg"],
  ["og_254", "gcat_mother_baby", "Kids Nipples Large", "1 pc", 150, "kids-nipples-large-1-pc.jpg"],
  ["og_255", "gcat_mother_baby", "Baby Small Towels", "1 pc", 300, "baby-small-towels-1-pc.jpg"],
  // CLEANING & LAUNDRY (14)
  ["og_256", "gcat_cleaning_laundry", "Bonus Tristar Detergent Washing Powder", "1000g", 330, "bonus-tristar-detergent-washing-powder-1000g.jpg"],
  ["og_257", "gcat_cleaning_laundry", "Brite Maximum Power Washing Powder", "500g", 350, "brite-maximum-power-washing-powder-500g.jpg"],
  ["og_258", "gcat_cleaning_laundry", "Surf Excel Washing Powder", "1kg", 690, "surf-excel-washing-powder-1kg.jpg"],
  ["og_259", "gcat_cleaning_laundry", "Express Detergent Power", "500g", 275, "express-detergent-power-500g.jpg"],
  ["og_260", "gcat_cleaning_laundry", "Brite Maximum Power Washing Powder", "1kg", 650, "brite-maximum-power-washing-powder-1kg.jpg"],
  ["og_261", "gcat_cleaning_laundry", "Bonus Tristar Detergent Washing Powder", "2000g", 540, "bonus-tristar-detergent-washing-powder-2000g.jpg"],
  ["og_262", "gcat_cleaning_laundry", "Express Power Detergent Washing Powder", "1kg", 585, "express-power-detergent-washing-powder-1kg.jpg"],
  ["og_263", "gcat_cleaning_laundry", "Lemon Max Dishwash Long Bar", "265g", 120, "lemon-max-dishwash-long-bar-265g.jpg"],
  ["og_264", "gcat_cleaning_laundry", "Harpic Toilet Cleaner Lavender", "450ml", 660, "harpic-toilet-cleaner-lavender-450ml.jpg"],
  ["og_265", "gcat_cleaning_laundry", "Lemon Max Dishwash Liquid Bottle", "750ml", 485, "lemon-max-dishwash-liquid-bottle-750ml.jpg"],
  ["og_266", "gcat_cleaning_laundry", "Lemon Max Lemon Dishwash Liquid", "450ml", 285, "lemon-max-lemon-dishwash-liquid-450ml.jpg"],
  ["og_267", "gcat_cleaning_laundry", "Bonus Active Detergent Washing Powder", "1kg", 430, "bonus-active-detergent-washing-powder-1kg.jpg"],
  ["og_268", "gcat_cleaning_laundry", "Lemon Max Dishwash Liquid Bottle", "475ml", 305, "lemon-max-dishwash-liquid-bottle-475ml.jpg"],
  ["og_269", "gcat_cleaning_laundry", "Sweep Toilet Cleaner Rose", "1000ml", 375, "sweep-toilet-cleaner-rose-1000ml.jpg"],
  // BAKERY (4)
  ["og_270", "gcat_bakery", "National Apple Jam", "410g", 350, "national-apple-jam-410g.jpg"],
  ["og_271", "gcat_bakery", "National Mango Jam", "410g", 420, "national-mango-jam-410g.jpg"],
  ["og_272", "gcat_bakery", "Rafhan Custard Strawberry", "275gm", 240, "rafhan-custard-strawberry-275gm.jpg"],
  ["og_273", "gcat_bakery", "Rafhan Custard Mango", "275gm", 275, "rafhan-custard-mango-275gm.jpg"],
  // DAIRY (4)
  ["og_274", "gcat_dairy", "Nestle Everyday Tea Whitener Powder Pouch", "850g", 2035, "nestle-everyday-tea-whitener-powder-pouch-850g.jpg"],
  ["og_275", "gcat_dairy", "Nestle Nido 1+ Box", "800gm", 2640, "nestle-nido-1-box-800gm.jpg"],
  ["og_276", "gcat_dairy", "Nestle Lactogen 2", "400gm", 1650, "nestle-lactogen-2-400gm.jpg"],
  ["og_277", "gcat_dairy", "Nestle Lactogen 1", "400gm", 1760, "nestle-lactogen-1-400gm.jpg"],
  // FEMININE CARE (8)
  ["og_278", "gcat_feminine_care", "Butterfly Breathables Maxi Thick Fabric Soft Pads Extra Long Value Pack", "16 Pcs", 715, "butterfly-breathables-maxi-thick-fabric-soft-pads-extra-long-value-pack-16-pcs.jpg"],
  ["og_279", "gcat_feminine_care", "Hair Removal Cream (Normal Skin) EU Naturals", "100g Tube", 450, "hair-removal-cream-normal-skin-eu-naturals-100g-tube.jpg"],
  ["og_280", "gcat_feminine_care", "Hair Removal Cream (Dry Skin) EU Naturals", "100g Tube", 450, "hair-removal-cream-dry-skin-eu-naturals-100g-tube.jpg"],
  ["og_281", "gcat_feminine_care", "Hair Removal Cream (Sensitive Skin) EU Naturals", "100g Tube", 450, "hair-removal-cream-sensitive-skin-eu-naturals-100g-tube.jpg"],
  ["og_282", "gcat_feminine_care", "Hair Removal Cream (Dry Skin) EU Naturals", "75g Tube", 320, "hair-removal-cream-dry-skin-eu-naturals-75g-tube.jpg"],
  ["og_283", "gcat_feminine_care", "Hair Removal Cream (Sensitive Skin) EU Naturals", "75g Tube", 320, "hair-removal-cream-sensitive-skin-eu-naturals-75g-tube.jpg"],
  ["og_284", "gcat_feminine_care", "Hair Removal Cream (Normal Skin) EU Naturals", "75g Tube", 320, "hair-removal-cream-normal-skin-eu-naturals-75g-tube.jpg"],
  ["og_285", "gcat_feminine_care", "Butterfly Long Ultra Big Saver Sanitary Pads XXL", "16 Pcs", 495, "butterfly-long-ultra-big-saver-sanitary-pads-xxl-16-pcs.jpg"],
  // MEDICINE & PHARMACY (11) — Flagyl removed 27 Nov 2026 (antibiotic; list stays strictly OTC)
  ["og_286", "gcat_medicine", "Panadol 500mg", "1 strip (10 tablets)", 40, "panadol-500mg-1-strip-10-tablets.jpg"],
  ["og_287", "gcat_medicine", "Panadol Extra", "1 strip (10 tablets)", 70, "panadol-extra-1-strip-10-tablets.jpg"],
  ["og_288", "gcat_medicine", "Panadol CF Cold + Flu", "1 strip (10 tablets)", 120, "panadol-cf-cold-flu-1-strip-10-tablets.jpg"],
  ["og_289", "gcat_medicine", "Disprin 300mg", "1 strip (10 tablets)", 35, "disprin-300mg-1-strip-10-tablets.jpg"],
  ["og_290", "gcat_medicine", "Brufen 400mg", "1 strip (10 tablets)", 50, "brufen-400mg-1-strip-10-tablets.jpg"],
  ["og_291", "gcat_medicine", "Calpol 500mg", "1 strip (10 tablets)", 40, "calpol-500mg-1-strip-10-tablets.jpg"],
  ["og_295", "gcat_medicine", "Risek 20mg", "1 strip (7 capsules)", 240, "risek-20mg-1-strip-7-capsules.jpg"],
  ["og_296", "gcat_medicine", "Strepsils Lozenges Original", "1 pack (24 lozenges)", 700, "strepsils-lozenges-original-1-pack.jpg"],
  ["og_298", "gcat_medicine", "Peditral ORS Orange", "1 sachet", 35, "peditral-ors-orange-1-sachet.jpg"],
  ["og_299", "gcat_medicine", "Dettol Antiseptic Liquid", "100ml", 560, "dettol-antiseptic-liquid-100ml.jpg"],
  ["og_300", "gcat_medicine", "Polyfax Skin Ointment", "20g tube", 270, "polyfax-skin-ointment-20g-tube.jpg"],
];

/**
 * 39 MISSING SPICES (og_301 - og_339), added 2026-11-27 (Agent C fix program).
 * Closes the P1 gap in the 27 Nov grocery audit (45 missing spices; 39 added,
 * 6 skipped — see fix-C-catalog.md for the skip reasons).
 * Prices: VERIFIED online market price + 10%, rounded to nearest Rs 5.
 * Sources: dsmonline.pk (primary), 24mycart/Daraz/GrocerApp/Naheed/ARY/Carrefour
 * (secondary, noted per item in the fix report). Size corrections vs the
 * 25 Nov source list are noted in the fix report (e.g. Shan Tikka Masala is
 * 50g at DSM, not 45g; Shan Ginger Garlic Paste verified size is 750g).
 * Photos: real branded product photos, Dadu Food logo bottom-right (22%),
 * JPEG <200KB, in public/images/grocery/ — NEVER from dailymartdadu.com.
 */
const RAW_SPICES_2026_11_27: SeedTuple[] = [
  // SPICES — missing Shan / National / Shangrila / Knorr items (39)
  ["og_301", "gcat_spices", "National Kasuri Methi Powder", "25g", 65, "national-kasuri-methi-powder-25g.jpg"],
  ["og_302", "gcat_spices", "Shan Haldee Powder", "100g", 280, "shan-haldee-powder-100g.jpg"],
  ["og_303", "gcat_spices", "Shan Zaiqaydar Adrak Powder", "50g", 260, "shan-zaiqaydar-adrak-powder-50g.jpg"],
  ["og_304", "gcat_spices", "Shan Qasuri Methi Leaves", "25g", 85, "shan-qasuri-methi-leaves-25g.jpg"],
  ["og_305", "gcat_spices", "Cloves (Laung)", "50g", 480, "cloves-laung-50g.jpg"],
  ["og_306", "gcat_spices", "Whole Coconut (Nariyal)", "200g", 475, "whole-coconut-nariyal-200g.jpg"],
  ["og_307", "gcat_spices", "Shangrila Seasonings Trio Pack", "120ml", 260, "shangrila-seasonings-trio-pack-120ml.jpg"],
  ["og_308", "gcat_spices", "Shangrila Seasonings Trio Pack", "275ml", 505, "shangrila-seasonings-trio-pack-275ml.jpg"],
  ["og_309", "gcat_spices", "Shan Ginger Garlic Paste Bottle", "750g", 1045, "shan-ginger-garlic-paste-750g.jpg"],
  ["og_310", "gcat_spices", "Shangrila B.B.Q Sauce Pouch", "400g", 315, "shangrila-bbq-sauce-pouch-400g.jpg"],
  ["og_311", "gcat_spices", "Shangrila Buffalo Sauce", "60ml", 265, "shangrila-buffalo-sauce-60ml.jpg"],
  ["og_312", "gcat_spices", "Shangrila Chilli Sauce", "275ml", 155, "shangrila-chilli-sauce-275ml.jpg"],
  ["og_313", "gcat_spices", "National Chinese Sauce Trio Pack", "3 x 300ml", 595, "national-chinese-sauce-trio-pack-3-x-300ml.jpg"],
  ["og_314", "gcat_spices", "Shan Ginger Paste Bottle", "310g", 675, "shan-ginger-paste-bottle-310g.jpg"],
  ["og_315", "gcat_spices", "National Soya Sauce Bottle", "300ml", 230, "national-soya-sauce-bottle-300ml.jpg"],
  ["og_316", "gcat_spices", "National Chinese Chilli Sauce Bottle", "300ml", 220, "national-chinese-chilli-sauce-bottle-300ml.jpg"],
  ["og_317", "gcat_spices", "Shangrila Steak Sauce", "300ml", 535, "shangrila-steak-sauce-300ml.jpg"],
  ["og_318", "gcat_spices", "National Synthetic Vinegar", "300ml", 165, "national-synthetic-vinegar-300ml.jpg"],
  ["og_319", "gcat_spices", "Shangrila Seasonings Trio Pack", "700ml", 845, "shangrila-seasonings-trio-pack-700ml.jpg"],
  ["og_320", "gcat_spices", "Shangrila BBQ Sauce Hickory", "360g", 525, "shangrila-bbq-sauce-hickory-360g.jpg"],
  ["og_321", "gcat_spices", "Shangrila Dark Soy Sauce", "60ml", 260, "shangrila-dark-soy-sauce-60ml.jpg"],
  ["og_322", "gcat_spices", "Shangrila Ketchup Pouch", "800g", 475, "shangrila-ketchup-pouch-800g.jpg"],
  ["og_323", "gcat_spices", "Shangrila Tomato Ketchup Pouch", "400g", 250, "shangrila-tomato-ketchup-pouch-400g.jpg"],
  ["og_324", "gcat_spices", "Shangrila Garlic Chili Sauce Pouch", "800g", 460, "shangrila-garlic-chili-sauce-pouch-800g.jpg"],
  ["og_325", "gcat_spices", "Shangrila Tomato Ketchup Mini Pack", "210g", 140, "shangrila-tomato-ketchup-mini-pack-210g.jpg"],
  ["og_326", "gcat_spices", "Shangrila Garlic Chili Sauce Pouch", "400g", 230, "shangrila-garlic-chili-sauce-pouch-400g.jpg"],
  ["og_327", "gcat_spices", "Knorr Chicken Noodles", "50g", 55, "knorr-chicken-noodles-50g.jpg"],
  ["og_328", "gcat_spices", "Shan Chicken Masala", "50g", 145, "shan-chicken-masala-50g.jpg"],
  ["og_329", "gcat_spices", "Shan Chicken Tikka Masala", "50g", 145, "shan-chicken-tikka-masala-50g.jpg"],
  ["og_330", "gcat_spices", "National Mixed Pickle", "320g", 285, "national-mixed-pickle-320g.jpg"],
  ["og_331", "gcat_spices", "National Mixed Pickle Jar", "370g", 440, "national-mixed-pickle-jar-370g.jpg"],
  ["og_332", "gcat_spices", "Star Anise (Badian Phool)", "50g", 165, "star-anise-badian-phool-50g.jpg"],
  ["og_333", "gcat_spices", "Kaala Zeera Black Zeera", "50g", 285, "kaala-zeera-black-zeera-50g.jpg"],
  ["og_334", "gcat_spices", "Shan Beef Biryani Masala", "55g", 165, "shan-beef-biryani-masala-55g.jpg"],
  ["og_335", "gcat_spices", "Shan Green Chutney", "315g", 320, "shan-green-chutney-315g.jpg"],
  ["og_336", "gcat_spices", "Shan Tikka Boti Masala", "50g", 145, "shan-tikka-boti-masala-50g.jpg"],
  ["og_337", "gcat_spices", "Shan Chicken Broast Masala", "125g", 165, "shan-chicken-broast-masala-125g.jpg"],
  ["og_338", "gcat_spices", "Shan Chapli Kabab Masala", "100g", 150, "shan-chapli-kabab-masala-100g.jpg"],
  ["og_339", "gcat_spices", "Shan Chicken White Karahi Masala", "40g", 165, "shan-chicken-white-karahi-masala-40g.jpg"],
];

/**
 * Ronin accessories — 20 everyday items a Dadu mobile shop normally stocks
 * (user 28 Nov 11:38: "Kam product add karna, jaise charger, lead,
 * headphone jo normally Dadu shop pe mil jaye"; 11:40: "20 product").
 * Prices = current Google/market rate (ronin.pk + Mobile Geeks, checked
 * 28 Nov 2026) + Rs 100, rounded to nearest Rs 5.
 * Market rates: Xpress R-6050 1149, R-930 1399, Fury X Pro 2499,
 * Flexin Mini R-2055 429, Flexin Mini R-2060 559, R-340 695, Core R-2040 799,
 * R-29 799, R-9 950, R-29 Type-C 1020, R-39 Looop 1145, R-5 1355,
 * Voltedge R-6055 985, R-615 Encore 680, Flexin Mini R-2065 629,
 * Ace R-2035 895, Rush R-2050 999, R-007 Type-C 2095, R-49 Air Type-C 1445,
 * R-71 Power Bank 2750.
 * Category gcat_ronin ("Ronin Accessories") — its own separate option.
 */
const RAW_RONIN_2026_11_28: SeedTuple[] = [
  // Chargers (3)
  ["og_340", "gcat_ronin", "Ronin Xpress R-6050 Charger", "1 pc", 1250, "ronin-xpress-r-6050-charger.jpg"],
  ["og_341", "gcat_ronin", "Ronin R-930 QC 3.0 Charger", "1 pc", 1500, "ronin-r-930-charger.jpg"],
  ["og_342", "gcat_ronin", "Ronin Fury X Pro R-6060 Charger", "1 pc", 2600, "ronin-fury-x-pro-r-6060-charger.jpg"],
  // Cables / Leads (4)
  ["og_343", "gcat_ronin", "Ronin Flexin Mini R-2055 Cable", "1 pc", 530, "ronin-flexin-mini-r-2055-cable.jpg"],
  ["og_344", "gcat_ronin", "Ronin Flexin Mini R-2060 Type-C Cable", "1 pc", 660, "ronin-flexin-mini-r-2060-cable.jpg"],
  ["og_345", "gcat_ronin", "Ronin R-340 Type-C Cable 1m", "1 pc", 795, "ronin-r-340-type-c-cable.jpg"],
  ["og_346", "gcat_ronin", "Ronin Core R-2040 Type-C Cable", "1 pc", 900, "ronin-core-r-2040-cable.jpg"],
  // Handsfree / Headphones (5)
  ["og_347", "gcat_ronin", "Ronin R-29 Handsfree", "1 pc", 900, "ronin-r-29-handsfree.jpg"],
  ["og_348", "gcat_ronin", "Ronin R-9 Handsfree", "1 pc", 1050, "ronin-r-9-handsfree.jpg"],
  ["og_349", "gcat_ronin", "Ronin R-29 Type-C Handsfree", "1 pc", 1120, "ronin-r-29-type-c-handsfree.jpg"],
  ["og_350", "gcat_ronin", "Ronin R-39 Looop Handsfree", "1 pc", 1245, "ronin-r-39-looop-handsfree.jpg"],
  ["og_351", "gcat_ronin", "Ronin R-5 Handsfree", "1 pc", 1455, "ronin-r-5-handsfree.jpg"],
  // More chargers (2) — user: 20 products total
  ["og_352", "gcat_ronin", "Ronin Voltedge R-6055 Charger", "1 pc", 1085, "ronin-voltedge-r-6055-charger.jpg"],
  ["og_353", "gcat_ronin", "Ronin R-615 Encore Charger", "1 pc", 780, "ronin-r-615-encore-charger.jpg"],
  // More cables / Leads (3)
  ["og_354", "gcat_ronin", "Ronin Flexin Mini R-2065 Type-C to iPhone Cable", "1 pc", 730, "ronin-flexin-mini-r-2065-cable.jpg"],
  ["og_355", "gcat_ronin", "Ronin Ace R-2035 Type-C Cable", "1 pc", 995, "ronin-ace-r-2035-cable.jpg"],
  ["og_356", "gcat_ronin", "Ronin Rush R-2050 Type-C Cable", "1 pc", 1100, "ronin-rush-r-2050-cable.jpg"],
  // More handsfree (2)
  ["og_357", "gcat_ronin", "Ronin R-007 Type-C Handsfree", "1 pc", 2195, "ronin-r-007-type-c-handsfree.jpg"],
  ["og_358", "gcat_ronin", "Ronin R-49 Air Type-C Handsfree", "1 pc", 1545, "ronin-r-49-air-type-c-handsfree.jpg"],
  // Power bank (1) — cheapest, most common
  ["og_359", "gcat_ronin", "Ronin R-71 10000mAh Power Bank", "1 pc", 2850, "ronin-r-71-power-bank.jpg"],
];

/** Epoch ms when this bundled catalogue was last synced from Firestore
 * (27 Nov 2026 price sync + 39 spices). Used as the `savedAt` when the
 * app builds the grocery list from the bundle instead of Firestore, so
 * the catalogue delta only re-fetches admin changes made AFTER this
 * moment — anything earlier is already in the bundle. Update this
 * whenever the bundle is re-synced from Firestore. */
export const OWNER_CATALOG_SYNCED_AT = Date.UTC(2026, 10, 27, 12, 0, 0);

export const OWNER_GROCERY_PRODUCTS: GroceryProduct[] = [...RAW_100_ITEMS, ...RAW_200_ITEMS, ...RAW_SPICES_2026_11_27, ...RAW_RONIN_2026_11_28].map(
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
