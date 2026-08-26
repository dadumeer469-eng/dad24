import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Store,
  RefreshCw,
  Image as ImageIcon,
  ChefHat,
  Zap,
  Tag,
  AlertCircle,
  Copy,
  Layers,
  Wand2,
  FileText,
  Search,
  Check,
  ExternalLink,
  Sliders,
  Cpu,
  Loader2,
  Bot
} from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db, cleanObject } from "../firebase";
import { Dish, FoodCategory } from "../types";
import { compressImageToLowRes } from "../utils/imageCompressor";

interface AiMenuGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  uniqueRestaurants: string[];
  foodCategories: FoodCategory[];
  onItemsGenerated?: () => void;
}

interface ParsedItem {
  id: string;
  name: string;
  price: number;
  discountPrice?: number;
  category: string;
  description: string;
  imageUrl: string;
  type: "food" | "service";
  isBestseller: boolean;
  selected: boolean;
  imageSource?: "matched" | "google_search" | "custom";
  isGeneratingImage?: boolean;
}

// 🎯 COMPREHENSIVE & ACCURATE FOOD & BEVERAGE PHOTO REPOSITORY
export const COMPREHENSIVE_FOOD_BANK: Record<string, { label: string; urls: string[] }> = {
  raita: {
    label: "Raita & Yogurt Dips",
    urls: [
      "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800&q=80", // Fresh mint green raita bowl
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&q=80", // Herb yogurt sauce
      "https://images.unsplash.com/photo-1628294895950-9805252327bc?w=800&q=80", // Desi green chutney & dahi
      "https://images.unsplash.com/photo-1546833998-877b37c2e5c4?w=800&q=80", // Fresh bowl dip
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80"  // Mint yogurt dip
    ]
  },
  chai: {
    label: "Karak Chai & Teas",
    urls: [
      "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&q=80", // Steaming hot milk chai in glass
      "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&q=80", // Spiced hot milk tea
      "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=800&q=80", // Traditional hot tea cup
      "https://images.unsplash.com/photo-1571934811356-5cc597b830d6?w=800&q=80", // Matka cup chai with cardamom
      "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&q=80"  // Karak tea glass
    ]
  },
  greentea: {
    label: "Kahwa & Green Tea",
    urls: [
      "https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=800&q=80", // Green tea with lemon
      "https://images.unsplash.com/photo-1556881286-fc6915169721?w=800&q=80", // Herbal kehwa
      "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800&q=80"  // Lemon mint tea
    ]
  },
  lassi: {
    label: "Chilled Lassi",
    urls: [
      "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=800&q=80", // Creamy mango & sweet lassi
      "https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=800&q=80", // Fresh tall glass of lassi
      "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&q=80"
    ]
  },
  naan: {
    label: "Naan, Roti & Paratha",
    urls: [
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80", // Tandoori Roghni Naan
      "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&q=80", // Layered crispy paratha / flatbread
      "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&q=80", // Garlic butter naan
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80"  // Freshly baked bread
    ]
  },
  biryani: {
    label: "Biryani & Pulao",
    urls: [
      "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80", // Special chicken biryani
      "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&q=80", // Hyderabadi basmati biryani
      "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=800&q=80", // Saffron mutton biryani
      "https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=800&q=80"  // Royal pulao rice
    ]
  },
  karahi: {
    label: "Karahi & Handi",
    urls: [
      "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&q=80", // Desi Chicken Karahi with ginger
      "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80", // Rich tomato butter gravy
      "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80", // Boneless chicken handi
      "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800&q=80"  // Mutton spicy wok
    ]
  },
  bbq: {
    label: "BBQ & Seekh Kababs",
    urls: [
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80", // Grilled seekh kababs & skewers
      "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800&q=80", // Chicken tikka boti
      "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80", // Malai boti on charcoal grill
      "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=800&q=80"  // Shami / Chapli kababs
    ]
  },
  broast: {
    label: "Crispy Broast & Fried Chicken",
    urls: [
      "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80", // Crispy golden fried chicken broast
      "https://images.unsplash.com/photo-1562967914-608f82629710?w=800&q=80", // Chicken nuggets & tenders
      "https://images.unsplash.com/photo-1524114664604-cd8133cd67ad?w=800&q=80", // Hot crispy wings
      "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=800&q=80"
    ]
  },
  burger: {
    label: "Zinger & Beef Burgers",
    urls: [
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80", // Juicy double patty burger
      "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80", // Crispy zinger burger with cheese
      "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=800&q=80", // Gourmet beef cheeseburger
      "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=800&q=80", // Mighty double decker burger
      "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=800&q=80"
    ]
  },
  pizza: {
    label: "Pizza & Garlic Bread",
    urls: [
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80", // Hot cheesy mozzarella pizza
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80", // Chicken fajita pizza with bell peppers
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80", // Crown crust pizza
      "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=800&q=80", // Cheesy garlic bread
      "https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=800&q=80"
    ]
  },
  rolls: {
    label: "Shawarma & Paratha Rolls",
    urls: [
      "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&q=80", // Chicken mayo paratha roll
      "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&q=80", // Shawarma wrap pita
      "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&q=80"
    ]
  },
  fries: {
    label: "Fries & Loaded Chips",
    urls: [
      "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&q=80", // Crispy golden salted fries
      "https://images.unsplash.com/photo-1585109649139-366815a0d713?w=800&q=80", // Cheesy loaded fries with toppings
      "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=800&q=80"  // Spicy masala fries
    ]
  },
  pasta: {
    label: "Pasta & Chinese Chowmein",
    urls: [
      "https://images.unsplash.com/photo-1621996311239-f9c3eb7b2253?w=800&q=80", // Creamy alfredo chicken pasta
      "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&q=80", // Spicy red sauce pasta
      "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&q=80"  // Chicken chowmein & noodles
    ]
  },
  drinks: {
    label: "Chilled Sodas & Pepsi/Coke",
    urls: [
      "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&q=80", // Chilled soda bottle / cola
      "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=80", // Cold drink with ice cubes & citrus
      "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&q=80", // Sparkling soda splash
      "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80", // Cold beverage glass
      "https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=800&q=80"  // Fresh juice & lemonade
    ]
  },
  shakes: {
    label: "Milkshakes & Smoothies",
    urls: [
      "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&q=80", // Oreo chocolate thickshake
      "https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=800&q=80", // Strawberry vanilla shake
      "https://images.unsplash.com/photo-1553787499-6f9133860278?w=800&q=80"
    ]
  },
  desserts: {
    label: "Desserts, Kulfi & Sweets",
    urls: [
      "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&q=80", // Kulfi & ice cream bowl
      "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800&q=80", // Gulab Jamun & traditional sweets
      "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=800&q=80", // Falooda sundae dessert
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80"  // Chocolate cake pastry
    ]
  },
  sandwich: {
    label: "Club Sandwiches",
    urls: [
      "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=80", // Triple decker club sandwich
      "https://images.unsplash.com/photo-1554433607-66b5efe9d304?w=800&q=80", // Grilled chicken sandwich
      "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=800&q=80"
    ]
  },
  service: {
    label: "Home Services (AC/Electrician/Plumber)",
    urls: [
      "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80", // Electrician tools & repair
      "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&q=80", // Air Conditioner servicing
      "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=800&q=80", // Plumbing repair wrench
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80"  // Home maintenance
    ]
  },
  default: {
    label: "Delicious Food",
    urls: [
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80",
      "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80"
    ]
  }
};

const SAMPLE_TEMPLATES = [
  {
    title: "🍔 Fast Food & Burgers",
    text: `Special Zinger Burger - Rs 290
Dadu Double Patty Cheese Burger - Rs 420
Crispy Chicken Broast (Quarter) - Rs 380
Jumbo Pizza Burger - Rs 350
Crispy Masala Loaded Fries - Rs 220
Club Sandwich with Fries - Rs 280
Chilled Pepsi 345ml - Rs 110`
  },
  {
    title: "🍕 Pizza Specials",
    text: `Chicken Fajita Pizza (Small) - Rs 450
Chicken Fajita Pizza (Medium) - Rs 850
Chicken Fajita Pizza (Large) - Rs 1300
Crown Crust Special Pizza - Rs 950
Creamy Tikka Melt Pizza - Rs 900
Cheesy Garlic Bread (4 Pcs) - Rs 250`
  },
  {
    title: "🍗 Biryani & Desi Karahi",
    text: `Lahori Special Chicken Biryani (Single) - Rs 220
Chicken Biryani Double Plate - Rs 380
Special Chicken Karahi (Half KG) - Rs 850
Chicken Handi Boneless - Rs 950
Mutton Karahi Special - Rs 1600
Roghni Naan - Rs 60
Fresh Mint Raita - Rs 50`
  },
  {
    title: "☕ Chai, Drinks & Sweets",
    text: `Dadu Special Orange Karak Chai - Rs 120
Matka Doodh Patti - Rs 100
Elixir Orange Ice Tea - Rs 200
Oreo Chocolate Thick Shake - Rs 280
Kulfi Falooda Special - Rs 250
Fresh Lime Soda - Rs 150`
  },
  {
    title: "🛠️ Home Services",
    text: `AC General Service & Wash - Rs 1200
AC Gas Leakage Checkup & Refill - Rs 2500
Electrician Home Inspection - Rs 500
Plumbing Leakage Repair - Rs 600
Ceiling Fan Installation - Rs 400`
  }
];

export default function AiMenuGeneratorModal({
  isOpen,
  onClose,
  uniqueRestaurants,
  foodCategories,
  onItemsGenerated
}: AiMenuGeneratorModalProps) {
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>(
    uniqueRestaurants[0] || "Dadu Fast Food & Kitchen"
  );
  const [isCustomRestaurant, setIsCustomRestaurant] = useState(false);
  const [customRestaurantName, setCustomRestaurantName] = useState("");
  const [itemType, setItemType] = useState<"food" | "service">("food");
  const [menuText, setMenuText] = useState("");
  const [brandWatermark, setBrandWatermark] = useState(true);
  const [autoGoogleImageSearch, setAutoGoogleImageSearch] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBatchSearchingGoogle, setIsBatchSearchingGoogle] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Photo Picker Modal State
  const [pickingImageForItem, setPickingImageForItem] = useState<string | null>(null);
  const [galleryCategory, setGalleryCategory] = useState<string>("all");
  const [customImageUrlInput, setCustomImageUrlInput] = useState<string>("");
  const [searchImageTerm, setSearchImageTerm] = useState<string>("");
  const [googleSearchResults, setGoogleSearchResults] = useState<string[]>([]);
  const [isSearchingGoogleModal, setIsSearchingGoogleModal] = useState<boolean>(false);

  const activeRestaurantName = isCustomRestaurant
    ? customRestaurantName.trim() || "My New Restaurant"
    : selectedRestaurant;

  // 🎯 CHECK IF FOOD/BEVERAGE TITLE EXACTLY MATCHES A CURATED PHOTO BANK
  const isExactMatchForTitle = (title: string, category: string): boolean => {
    const t = title.toLowerCase();
    return (
      t.includes("raita") || t.includes("rayta") || t.includes("raeta") || t.includes("dahi") || t.includes("chutney") || t.includes("chatni") || t.includes("mint sauce") || t.includes("dip") ||
      t.includes("chai") || t.includes("tea") || t.includes("doodh patti") || t.includes("doodhpatti") || t.includes("karak") || t.includes("matka chai") || t.includes("elaichi") || t.includes("adrak") || t.includes("chaiye") ||
      t.includes("kahwa") || t.includes("kehwa") || t.includes("green tea") || t.includes("herbal") ||
      t.includes("lassi") ||
      t.includes("naan") || t.includes("nan") || t.includes("roghni") || t.includes("garlic naan") || t.includes("roti") || t.includes("chapati") || t.includes("paratha") || t.includes("puri") || t.includes("taftan") || t.includes("sheermal") ||
      t.includes("biryani") || t.includes("pulao") || t.includes("rice") || t.includes("chawal") ||
      t.includes("karahi") || t.includes("handi") || t.includes("qorma") || t.includes("korma") || t.includes("salan") || t.includes("nihari") || t.includes("haleem") || t.includes("daal") || t.includes("chana") || t.includes("curry") || t.includes("gravy") ||
      t.includes("bbq") || t.includes("tikka") || t.includes("kabab") || t.includes("kebab") || t.includes("boti") || t.includes("malai boti") || t.includes("seekh") || t.includes("chapli") || t.includes("shami") || t.includes("chargha") || t.includes("sajji") ||
      t.includes("broast") || t.includes("crispy chicken") || t.includes("wings") || t.includes("nuggets") || t.includes("tenders") || t.includes("fried chicken") || t.includes("broasted") ||
      t.includes("burger") || t.includes("patty") || t.includes("zinger") || t.includes("bun kabab") || t.includes("mighty") ||
      t.includes("pizza") || t.includes("fajita") || t.includes("crust") || t.includes("calzone") || t.includes("garlic bread") ||
      t.includes("roll") || t.includes("wrap") || t.includes("shawarma") || t.includes("shwarma") ||
      t.includes("fries") || t.includes("chips") ||
      t.includes("pasta") || t.includes("macaroni") || t.includes("spaghetti") || t.includes("chowmein") || t.includes("noodles") || t.includes("manchurian") || t.includes("lazania") || t.includes("lasagna") ||
      t.includes("shake") || t.includes("smoothie") ||
      t.includes("pepsi") || t.includes("coke") || t.includes("7up") || t.includes("dew") || t.includes("drink") || t.includes("soda") || t.includes("juice") || t.includes("water") || t.includes("sting") || t.includes("sprite") || t.includes("fanta") ||
      t.includes("ice cream") || t.includes("kulfi") || t.includes("falooda") || t.includes("dessert") || t.includes("cake") || t.includes("sweet") || t.includes("gulab") || t.includes("jalebi") || t.includes("kheer") ||
      t.includes("sandwich") || t.includes("club") ||
      category === "Home Services" || t.includes("service") || t.includes("repair") || t.includes("ac ") || t.includes("electrician") || t.includes("plumber")
    );
  };

  // 🔍 GOOGLE & WEB FOOD IMAGE SEARCH HELPER
  const searchGoogleFoodImage = async (
    itemName: string,
    category: string,
    restName: string,
    queryOverride?: string
  ): Promise<{ primaryUrl: string; allUrls: string[] }> => {
    try {
      const res = await fetch("/api/ai/search-food-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName,
          category,
          restaurantName: restName,
          query: queryOverride || `${itemName} ${category}`
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.imageUrl) {
        throw new Error(data.error || "Could not find image on Google");
      }

      const rawUrl = data.imageUrl;
      const images: string[] = Array.isArray(data.images) && data.images.length > 0
        ? data.images
        : [rawUrl];

      // ⚡ Compress immediately to low resolution (<30KB) to protect Firebase database!
      const compressedLowResUrl = await compressImageToLowRes(rawUrl, 380, 380, 0.72);
      return { primaryUrl: compressedLowResUrl, allUrls: images };
    } catch (err: any) {
      console.warn("Google image search fallback:", err?.message || err);
      // Return safe fallback food photo
      const fallbackUrl = getFoodImageForTitle(itemName, category, 0);
      return { primaryUrl: fallbackUrl, allUrls: [fallbackUrl] };
    }
  };

  // 🧠 SMART KEYWORD & CATEGORY DETECTOR (Handles Urdu, Roman Urdu & English)
  const detectCategory = (title: string, defaultType: "food" | "service"): string => {
    const t = title.toLowerCase();

    // Home Services
    if (
      defaultType === "service" ||
      t.includes("service") ||
      t.includes("repair") ||
      t.includes("electrician") ||
      t.includes("plumb") ||
      t.includes("install") ||
      t.includes("ac ") ||
      t.includes("carpenter") ||
      t.includes("cleaning")
    ) {
      return "Home Services";
    }

    // Raita / Dips / Chutney
    if (t.includes("raita") || t.includes("rayta") || t.includes("raeta") || t.includes("dahi") || t.includes("chutney") || t.includes("chatni") || t.includes("dip") || t.includes("podina") || t.includes("zeera raita") || t.includes("mint sauce")) {
      return "Specials";
    }

    // Chai & Teas (handles chaiye, chai, doodh patti, kahwa, etc.)
    if (
      t.includes("chai") ||
      t.includes("tea") ||
      t.includes("doodh patti") ||
      t.includes("doodhpatti") ||
      t.includes("karak") ||
      t.includes("matka") ||
      t.includes("kahwa") ||
      t.includes("kehwa") ||
      t.includes("green tea") ||
      t.includes("kashmiri") ||
      t.includes("chaiye")
    ) {
      return "Only Tea";
    }

    // Naan & Breads
    if (t.includes("naan") || t.includes("nan") || t.includes("roti") || t.includes("chapati") || t.includes("paratha") || t.includes("puri") || t.includes("taftan") || t.includes("sheermal")) {
      return "Paratha";
    }

    // Biryani & Rice
    if (t.includes("biryani") || t.includes("pulao") || t.includes("rice") || t.includes("chawal")) {
      return "Chicken & Rice";
    }

    // Karahi, Handi, Korma, Salan
    if (t.includes("karahi") || t.includes("handi") || t.includes("qorma") || t.includes("korma") || t.includes("mutton") || t.includes("salan") || t.includes("nihari") || t.includes("haleem") || t.includes("daal") || t.includes("chana") || t.includes("curry")) {
      return "Specials";
    }

    // BBQ & Kababs
    if (t.includes("bbq") || t.includes("tikka") || t.includes("kabab") || t.includes("kebab") || t.includes("boti") || t.includes("chapli") || t.includes("shami") || t.includes("chargha") || t.includes("sajji")) {
      return "Specials";
    }

    // Broast & Fried Chicken
    if (t.includes("broast") || t.includes("crispy chicken") || t.includes("wings") || t.includes("nuggets") || t.includes("tenders") || t.includes("fried chicken")) {
      return "Broast";
    }

    // Burgers
    if (t.includes("burger") || t.includes("patty") || t.includes("zinger") || t.includes("bun kabab") || t.includes("mighty")) {
      return "Burgers";
    }

    // Pizza
    if (t.includes("pizza") || t.includes("fajita") || t.includes("crust") || t.includes("calzone") || t.includes("garlic bread")) {
      return "Pizza";
    }

    // Rolls & Shawarma
    if (t.includes("roll") || t.includes("wrap") || t.includes("shawarma") || t.includes("shwarma")) {
      return "Rolls";
    }

    // Fries
    if (t.includes("fries") || t.includes("chips")) {
      return "Fries";
    }

    // Pasta & Chowmein
    if (t.includes("pasta") || t.includes("macaroni") || t.includes("spaghetti") || t.includes("chowmein") || t.includes("noodles") || t.includes("manchurian")) {
      return "Pasta";
    }

    // Lazania
    if (t.includes("lazania") || t.includes("lasagna")) {
      return "Lazania";
    }

    // Sandwiches
    if (t.includes("sandwich") || t.includes("club sandwich")) {
      return "Sandwich";
    }

    // Milkshakes & Smoothies
    if (t.includes("shake") || t.includes("smoothie") || t.includes("lassi")) {
      return "Milkshake";
    }

    // Cold Drinks & Sodas
    if (t.includes("pepsi") || t.includes("coke") || t.includes("7up") || t.includes("dew") || t.includes("drink") || t.includes("soda") || t.includes("juice") || t.includes("water") || t.includes("limca") || t.includes("sting") || t.includes("sprite") || t.includes("fanta")) {
      return "Drinks";
    }

    // Ice Cream & Sweets
    if (t.includes("ice cream") || t.includes("icecream") || t.includes("kulfi") || t.includes("falooda") || t.includes("cone") || t.includes("dessert") || t.includes("sweet") || t.includes("gulab jamun") || t.includes("jalebi") || t.includes("kheer") || t.includes("cake") || t.includes("pastry")) {
      return "Ice Cream";
    }

    const match = foodCategories.find(c => t.includes(c.name.toLowerCase()));
    if (match) return match.name;

    return "Specials";
  };

  // 🎯 ULTRA SMART ACCURATE FOOD IMAGE MATCHER
  const getFoodImageForTitle = (title: string, category: string, index: number): string => {
    const t = title.toLowerCase();

    // 1. Exact Raita & Chutney matching
    if (
      t.includes("raita") ||
      t.includes("rayta") ||
      t.includes("raeta") ||
      t.includes("dahi") ||
      t.includes("podina") ||
      t.includes("zeera raita") ||
      t.includes("chutney") ||
      t.includes("chatni") ||
      t.includes("mint sauce") ||
      t.includes("dip")
    ) {
      const list = COMPREHENSIVE_FOOD_BANK.raita.urls;
      return list[index % list.length];
    }

    // 2. Exact Chai & Teas (handles "chaiye", "chai", "doodh patti", "karak", "tea")
    if (
      t.includes("chai") ||
      t.includes("tea") ||
      t.includes("doodh patti") ||
      t.includes("doodhpatti") ||
      t.includes("karak") ||
      t.includes("matka chai") ||
      t.includes("elaichi") ||
      t.includes("adrak") ||
      t.includes("chaiye")
    ) {
      const list = COMPREHENSIVE_FOOD_BANK.chai.urls;
      return list[index % list.length];
    }

    // 3. Kahwa & Green tea
    if (t.includes("kahwa") || t.includes("kehwa") || t.includes("green tea") || t.includes("herbal")) {
      const list = COMPREHENSIVE_FOOD_BANK.greentea.urls;
      return list[index % list.length];
    }

    // 4. Lassi
    if (t.includes("lassi")) {
      const list = COMPREHENSIVE_FOOD_BANK.lassi.urls;
      return list[index % list.length];
    }

    // 5. Naan, Roti & Paratha
    if (t.includes("naan") || t.includes("nan") || t.includes("roghni") || t.includes("garlic naan") || t.includes("roti") || t.includes("chapati") || t.includes("paratha") || t.includes("puri") || t.includes("taftan") || t.includes("sheermal")) {
      const list = COMPREHENSIVE_FOOD_BANK.naan.urls;
      return list[index % list.length];
    }

    // 6. Biryani & Pulao
    if (t.includes("biryani") || t.includes("pulao") || t.includes("rice") || t.includes("chawal")) {
      const list = COMPREHENSIVE_FOOD_BANK.biryani.urls;
      return list[index % list.length];
    }

    // 7. Karahi & Handi & Salan
    if (t.includes("karahi") || t.includes("handi") || t.includes("qorma") || t.includes("korma") || t.includes("salan") || t.includes("nihari") || t.includes("haleem") || t.includes("daal") || t.includes("chana") || t.includes("curry") || t.includes("gravy")) {
      const list = COMPREHENSIVE_FOOD_BANK.karahi.urls;
      return list[index % list.length];
    }

    // 8. BBQ & Seekh Kababs
    if (t.includes("bbq") || t.includes("tikka") || t.includes("kabab") || t.includes("kebab") || t.includes("boti") || t.includes("malai boti") || t.includes("seekh") || t.includes("chapli") || t.includes("shami") || t.includes("chargha") || t.includes("sajji")) {
      const list = COMPREHENSIVE_FOOD_BANK.bbq.urls;
      return list[index % list.length];
    }

    // 9. Broast & Fried Chicken
    if (t.includes("broast") || t.includes("crispy chicken") || t.includes("wings") || t.includes("nuggets") || t.includes("tenders") || t.includes("fried chicken") || t.includes("broasted")) {
      const list = COMPREHENSIVE_FOOD_BANK.broast.urls;
      return list[index % list.length];
    }

    // 10. Burgers
    if (t.includes("burger") || t.includes("patty") || t.includes("zinger") || t.includes("bun kabab") || t.includes("mighty")) {
      const list = COMPREHENSIVE_FOOD_BANK.burger.urls;
      return list[index % list.length];
    }

    // 11. Pizza
    if (t.includes("pizza") || t.includes("fajita") || t.includes("crust") || t.includes("calzone") || t.includes("garlic bread")) {
      const list = COMPREHENSIVE_FOOD_BANK.pizza.urls;
      return list[index % list.length];
    }

    // 12. Rolls & Shawarma
    if (t.includes("roll") || t.includes("wrap") || t.includes("shawarma") || t.includes("shwarma")) {
      const list = COMPREHENSIVE_FOOD_BANK.rolls.urls;
      return list[index % list.length];
    }

    // 13. Fries
    if (t.includes("fries") || t.includes("chips")) {
      const list = COMPREHENSIVE_FOOD_BANK.fries.urls;
      return list[index % list.length];
    }

    // 14. Pasta & Chowmein
    if (t.includes("pasta") || t.includes("macaroni") || t.includes("spaghetti") || t.includes("chowmein") || t.includes("noodles") || t.includes("manchurian") || t.includes("lazania") || t.includes("lasagna")) {
      const list = COMPREHENSIVE_FOOD_BANK.pasta.urls;
      return list[index % list.length];
    }

    // 15. Shakes
    if (t.includes("shake") || t.includes("smoothie")) {
      const list = COMPREHENSIVE_FOOD_BANK.shakes.urls;
      return list[index % list.length];
    }

    // 16. Cold Drinks & Sodas
    if (t.includes("pepsi") || t.includes("coke") || t.includes("7up") || t.includes("dew") || t.includes("drink") || t.includes("soda") || t.includes("juice") || t.includes("water") || t.includes("sting") || t.includes("sprite") || t.includes("fanta")) {
      const list = COMPREHENSIVE_FOOD_BANK.drinks.urls;
      return list[index % list.length];
    }

    // 17. Desserts & Sweets
    if (t.includes("ice cream") || t.includes("kulfi") || t.includes("falooda") || t.includes("dessert") || t.includes("cake") || t.includes("sweet") || t.includes("gulab") || t.includes("jalebi") || t.includes("kheer")) {
      const list = COMPREHENSIVE_FOOD_BANK.desserts.urls;
      return list[index % list.length];
    }

    // 18. Sandwiches
    if (t.includes("sandwich") || t.includes("club")) {
      const list = COMPREHENSIVE_FOOD_BANK.sandwich.urls;
      return list[index % list.length];
    }

    // 19. Services
    if (category === "Home Services" || t.includes("service") || t.includes("repair") || t.includes("ac ") || t.includes("electrician") || t.includes("plumber")) {
      const list = COMPREHENSIVE_FOOD_BANK.service.urls;
      return list[index % list.length];
    }

    const defaultList = COMPREHENSIVE_FOOD_BANK.default.urls;
    return defaultList[index % defaultList.length];
  };

  // Generate appetizing descriptive text for item
  const generateDescription = (name: string, category: string, restName: string): string => {
    const t = name.toLowerCase();
    if (t.includes("raita") || t.includes("dahi") || t.includes("chutney")) {
      return `Chilled creamy yogurt dip with fresh mint, roasted zeera & herbs. Best paired with biryani and BBQ at ${restName}.`;
    }
    if (t.includes("chai") || t.includes("tea") || t.includes("doodh patti") || t.includes("chaiye")) {
      return `Steaming hot authentic karak blend brewed with pure fresh milk, crushed cardamom & saffron at ${restName}.`;
    }
    if (t.includes("naan") || t.includes("roti") || t.includes("paratha")) {
      return `Freshly baked in traditional tandoor, brushed with pure butter & sesame seeds at ${restName}.`;
    }
    if (t.includes("biryani") || t.includes("pulao")) {
      return `Aromatic long-grain basmati rice cooked with succulent meat, saffron & traditional spices at ${restName}.`;
    }
    if (t.includes("karahi") || t.includes("handi")) {
      return `Rich tomato & ginger gravy cooked in a wok with organic butter & freshly ground spices at ${restName}.`;
    }
    if (t.includes("bbq") || t.includes("tikka") || t.includes("kabab")) {
      return `Charcoal-grilled tender meat marinated in royal spices & lime juice. Served sizzling fresh by ${restName}.`;
    }
    if (t.includes("burger") || t.includes("zinger")) {
      return `Crispy golden prepared with secret spices, melted cheese & signature sauce. Freshly made at ${restName}.`;
    }
    if (t.includes("pizza")) {
      return `Stone-baked crust loaded with premium toppings, rich herb sauce & gooey melted mozzarella cheese by ${restName}.`;
    }
    if (category === "Home Services") {
      return `Professional on-demand service certified by ${restName}. Fast doorstep arrival with complete equipment.`;
    }
    return `Prepared fresh to order using finest ingredients & authentic hygiene standards by ${restName}.`;
  };

  // AI Text Parsing Engine
  const handleParseMenu = () => {
    if (!menuText.trim()) {
      setErrorMessage("Please paste or type menu text or select an example template!");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsProcessing(true);

    try {
      const lines = menuText.split(/\r?\n/).filter(line => line.trim().length > 0);
      const results: ParsedItem[] = [];

      lines.forEach((line, idx) => {
        let clean = line.trim();
        // Remove leading numbering like 1., 1), -, *, •
        clean = clean.replace(/^[\d\.\)\-\*\•\s]+/, "").trim();
        if (!clean) return;

        // Extract price patterns: Rs 500, Rs. 500, 500/-, PKR 500, Rs:500, or trailing numbers like - 500 or : 500
        let price = 0;
        let title = clean;
        let discountPrice: number | undefined = undefined;

        // Match patterns like: "Rs 450", "450/-", "PKR 450", "Rs.450", "= 450", ": 450", "- 450"
        const priceRegex = /(?:rs\.?|pkr|price|mrp|\:|\-|\=|\/)\s*(\d{2,6})(?:\s*\/\-)?/i;
        const trailingNumberRegex = /(\d{2,6})\s*(?:\/\-|rs|pkr)?\s*$/i;

        const match = clean.match(priceRegex);
        if (match && match[1]) {
          price = parseInt(match[1], 10);
          title = clean.replace(match[0], "").trim();
        } else {
          const trailMatch = clean.match(trailingNumberRegex);
          if (trailMatch && trailMatch[1]) {
            price = parseInt(trailMatch[1], 10);
            title = clean.substring(0, clean.lastIndexOf(trailMatch[0])).trim();
          }
        }

        // Clean up title separators
        title = title.replace(/[\:\-\=\–\—\(\)\/]+$/, "").trim();
        title = title.replace(/^[\:\-\=\–\—\(\)\/]+/, "").trim();

        if (!title) {
          title = `Item ${idx + 1}`;
        }
        if (price === 0) {
          price = 250;
        }

        // Check if there is discount mentioned
        if (title.toLowerCase().includes("off") || title.toLowerCase().includes("deal")) {
          discountPrice = price;
          price = Math.round(price * 1.25);
        }

        const cat = detectCategory(title, itemType);
        const isMatched = isExactMatchForTitle(title, cat);
        const img = getFoodImageForTitle(title, cat, idx);
        const desc = generateDescription(title, cat, activeRestaurantName);

        results.push({
          id: `gen_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          name: title,
          price: price,
          discountPrice: discountPrice,
          category: cat,
          description: desc,
          imageUrl: img,
          type: itemType,
          isBestseller: idx === 0 || title.toLowerCase().includes("special") || title.toLowerCase().includes("zinger"),
          selected: true,
          imageSource: isMatched ? "matched" : "google_search",
          isGeneratingImage: false
        });
      });

      if (results.length === 0) {
        setErrorMessage("Could not parse any items. Please check the text format.");
      } else {
        setParsedItems(results);
        const unmatchedCount = results.filter(i => i.imageSource === "google_search").length;
        if (unmatchedCount > 0 && autoGoogleImageSearch) {
          setSuccessMessage(`✨ Identified ${results.length} items (${results.length - unmatchedCount} exact matches, ${unmatchedCount} custom dishes auto-searching Google)...`);
          // Asynchronously trigger Google image search for unmatched items
          setTimeout(() => {
            triggerBackgroundGoogleSearch(results);
          }, 200);
        } else {
          setSuccessMessage(`✨ Successfully identified ${results.length} items with exact matching photos & descriptions!`);
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Error parsing menu: " + (err?.message || "Unknown error"));
    } finally {
      setIsProcessing(false);
    }
  };

  // Background Google search for unmatched items
  const triggerBackgroundGoogleSearch = async (items: ParsedItem[]) => {
    const unmatched = items.filter(i => i.imageSource === "google_search");
    for (const item of unmatched) {
      setParsedItems(prev =>
        prev.map(i => (i.id === item.id ? { ...i, isGeneratingImage: true } : i))
      );
      try {
        const { primaryUrl } = await searchGoogleFoodImage(
          item.name,
          item.category,
          activeRestaurantName
        );
        setParsedItems(prev =>
          prev.map(i =>
            i.id === item.id
              ? { ...i, imageUrl: primaryUrl, imageSource: "google_search", isGeneratingImage: false }
              : i
          )
        );
      } catch (err) {
        console.warn("Google image search background skipped/failed for:", item.name, err);
        setParsedItems(prev =>
          prev.map(i => (i.id === item.id ? { ...i, isGeneratingImage: false } : i))
        );
      }
    }
  };

  // Search Google for a single item on demand
  const handleSearchGoogleForItem = async (itemId: string, queryOverride?: string) => {
    const item = parsedItems.find(i => i.id === itemId);
    if (!item) return;

    setParsedItems(prev =>
      prev.map(i => (i.id === itemId ? { ...i, isGeneratingImage: true } : i))
    );
    setErrorMessage("");

    try {
      const { primaryUrl } = await searchGoogleFoodImage(
        item.name,
        item.category,
        activeRestaurantName,
        queryOverride
      );
      setParsedItems(prev =>
        prev.map(i =>
          i.id === itemId
            ? { ...i, imageUrl: primaryUrl, imageSource: "google_search", isGeneratingImage: false }
            : i
        )
      );
      setSuccessMessage(`🔍 Real Google photo found & applied for "${item.name}"!`);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Google image search failed for "${item.name}": ${err?.message || "Error"}`);
      setParsedItems(prev =>
        prev.map(i => (i.id === itemId ? { ...i, isGeneratingImage: false } : i))
      );
    }
  };

  // Batch search Google for all unmatched items
  const handleSearchAllUnmatchedGoogle = async () => {
    const targetItems = parsedItems.filter(
      i => i.imageSource !== "matched" || !isExactMatchForTitle(i.name, i.category)
    );

    if (targetItems.length === 0) {
      setSuccessMessage("All items already have matching curated photos!");
      return;
    }

    setIsBatchSearchingGoogle(true);
    setErrorMessage("");

    try {
      for (const item of targetItems) {
        setParsedItems(prev =>
          prev.map(i => (i.id === item.id ? { ...i, isGeneratingImage: true } : i))
        );

        try {
          const { primaryUrl } = await searchGoogleFoodImage(
            item.name,
            item.category,
            activeRestaurantName
          );
          setParsedItems(prev =>
            prev.map(i =>
              i.id === item.id
                ? { ...i, imageUrl: primaryUrl, imageSource: "google_search", isGeneratingImage: false }
                : i
            )
          );
        } catch (e) {
          console.warn(`Google image search failed for ${item.name}`, e);
          setParsedItems(prev =>
            prev.map(i => (i.id === item.id ? { ...i, isGeneratingImage: false } : i))
          );
        }
      }
      setSuccessMessage("🔍 Google web photos matched for all custom items!");
    } finally {
      setIsBatchSearchingGoogle(false);
    }
  };

  // Cycle image for a parsed item
  const handleCycleImage = (itemId: string) => {
    setParsedItems(prev =>
      prev.map(item => {
        if (item.id !== itemId) return item;
        const currentImg = item.imageUrl;
        
        // Find which bank contains current image or match by name
        let targetKey = "default";
        for (const [key, bank] of Object.entries(COMPREHENSIVE_FOOD_BANK)) {
          if (bank.urls.includes(currentImg)) {
            targetKey = key;
            break;
          }
        }

        if (targetKey === "default") {
          // Detect by name
          const detected = detectCategory(item.name, item.type);
          if (item.name.toLowerCase().includes("raita") || item.name.toLowerCase().includes("dahi")) targetKey = "raita";
          else if (item.name.toLowerCase().includes("chai") || item.name.toLowerCase().includes("tea")) targetKey = "chai";
          else if (item.name.toLowerCase().includes("naan") || item.name.toLowerCase().includes("roti")) targetKey = "naan";
          else if (item.name.toLowerCase().includes("biryani")) targetKey = "biryani";
          else if (item.name.toLowerCase().includes("karahi")) targetKey = "karahi";
          else if (item.name.toLowerCase().includes("bbq")) targetKey = "bbq";
          else if (item.name.toLowerCase().includes("broast")) targetKey = "broast";
          else if (item.name.toLowerCase().includes("burger")) targetKey = "burger";
          else if (item.name.toLowerCase().includes("pizza")) targetKey = "pizza";
          else if (item.name.toLowerCase().includes("fries")) targetKey = "fries";
        }

        const bank = COMPREHENSIVE_FOOD_BANK[targetKey]?.urls || COMPREHENSIVE_FOOD_BANK.default.urls;
        const currentIdx = bank.indexOf(currentImg);
        const nextIdx = (currentIdx + 1) % bank.length;
        return { ...item, imageUrl: bank[nextIdx], imageSource: "matched" };
      })
    );
  };

  // Open photo picker for specific item
  const handleOpenPhotoPicker = (itemId: string) => {
    const item = parsedItems.find(i => i.id === itemId);
    if (!item) return;
    setPickingImageForItem(itemId);
    setCustomImageUrlInput(item.imageUrl || "");
    setSearchImageTerm(item.name);
    setGoogleSearchResults([]);
    
    // Auto set relevant gallery category
    const t = item.name.toLowerCase();
    if (t.includes("raita") || t.includes("dahi") || t.includes("chutney")) setGalleryCategory("raita");
    else if (t.includes("chai") || t.includes("tea") || t.includes("karak") || t.includes("doodh")) setGalleryCategory("chai");
    else if (t.includes("naan") || t.includes("roti") || t.includes("paratha")) setGalleryCategory("naan");
    else if (t.includes("biryani") || t.includes("pulao")) setGalleryCategory("biryani");
    else if (t.includes("karahi") || t.includes("handi") || t.includes("korma")) setGalleryCategory("karahi");
    else if (t.includes("bbq") || t.includes("tikka") || t.includes("kabab")) setGalleryCategory("bbq");
    else if (t.includes("broast") || t.includes("wings")) setGalleryCategory("broast");
    else if (t.includes("burger") || t.includes("zinger")) setGalleryCategory("burger");
    else if (t.includes("pizza")) setGalleryCategory("pizza");
    else if (t.includes("fries")) setGalleryCategory("fries");
    else if (t.includes("drink") || t.includes("pepsi") || t.includes("coke")) setGalleryCategory("drinks");
    else setGalleryCategory("all");
  };

  // Apply chosen photo
  const handleApplyChosenPhoto = (url: string, source: "matched" | "google_search" | "custom" = "custom") => {
    if (!pickingImageForItem) return;
    setParsedItems(prev =>
      prev.map(i => (i.id === pickingImageForItem ? { ...i, imageUrl: url, imageSource: source } : i))
    );
    setPickingImageForItem(null);
  };

  // Live search Google & Web from inside photo picker modal
  const handleSearchGoogleInModal = async (searchQueryText?: string) => {
    if (!pickingImageForItem) return;
    const item = parsedItems.find(i => i.id === pickingImageForItem);
    if (!item) return;

    const query = (searchQueryText || searchImageTerm || item.name).trim();
    if (!query) return;

    setIsSearchingGoogleModal(true);
    try {
      const { primaryUrl, allUrls } = await searchGoogleFoodImage(
        item.name,
        item.category,
        activeRestaurantName,
        query
      );
      setGoogleSearchResults(allUrls);
      setSuccessMessage(`🔍 Found ${allUrls.length} real Google web photos for "${query}"!`);
    } catch (err: any) {
      alert("Google image search failed: " + (err?.message || "Please try again"));
    } finally {
      setIsSearchingGoogleModal(false);
    }
  };

  // Update item field
  const handleUpdateItem = (itemId: string, field: keyof ParsedItem, value: any) => {
    setParsedItems(prev =>
      prev.map(item => (item.id === itemId ? { ...item, [field]: value } : item))
    );
  };

  // Remove single item
  const handleRemoveItem = (itemId: string) => {
    setParsedItems(prev => prev.filter(item => item.id !== itemId));
  };

  // Add a blank item
  const handleAddBlankItem = () => {
    const newId = `gen_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const cat = foodCategories[0]?.name || "Burgers";
    const img = getFoodImageForTitle("Delicious Item", cat, parsedItems.length);
    setParsedItems(prev => [
      ...prev,
      {
        id: newId,
        name: "New Item",
        price: 350,
        category: cat,
        description: `Freshly prepared at ${activeRestaurantName}`,
        imageUrl: img,
        type: itemType,
        isBestseller: false,
        selected: true,
        imageSource: "matched"
      }
    ]);
  };

  // Publish all selected items to Firestore with low-resolution compression
  const handlePublishToFirestore = async () => {
    const selectedItems = parsedItems.filter(i => i.selected);
    if (selectedItems.length === 0) {
      setErrorMessage("Please select at least 1 item to publish!");
      return;
    }

    setIsPublishing(true);
    setPublishProgress(0);
    setErrorMessage("");

    try {
      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        const uniqueId = `dish_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`;

        // ⚡ Compress image to low resolution (<30KB) before saving to Firestore to prevent any Firebase overload
        const optimizedImageUrl = await compressImageToLowRes(item.imageUrl, 380, 380, 0.72);

        const dishModel: Dish = {
          id: uniqueId,
          name: item.name.trim(),
          description: item.description.trim(),
          price: Number(item.price) || 100,
          ...(item.discountPrice && Number(item.discountPrice) > 0 ? { discountPrice: Number(item.discountPrice) } : {}),
          category: item.category as any,
          imageUrl: optimizedImageUrl,
          isAvailable: true,
          isBestseller: item.isBestseller,
          type: item.type,
          restaurantName: activeRestaurantName,
          openingTime: "09:00",
          closingTime: "23:59",
          commission: 0
        };

        await setDoc(doc(db, "menu", uniqueId), cleanObject(dishModel));
        setPublishProgress(Math.round(((i + 1) / selectedItems.length) * 100));
      }

      setSuccessMessage(
        `🎉 Successfully published ${selectedItems.length} items to ${activeRestaurantName} with optimized low-payload images!`
      );
      setParsedItems([]);
      setMenuText("");
      if (onItemsGenerated) {
        onItemsGenerated();
      }

      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Failed to publish items to Firestore: " + (err?.message || "Check permissions"));
    } finally {
      setIsPublishing(false);
    }
  };

  // Filter gallery photos for Photo Picker
  const getFilteredGalleryPhotos = () => {
    let list: { key: string; label: string; url: string }[] = [];

    Object.entries(COMPREHENSIVE_FOOD_BANK).forEach(([key, bank]) => {
      if (galleryCategory === "all" || galleryCategory === key) {
        bank.urls.forEach(url => {
          list.push({ key, label: bank.label, url });
        });
      }
    });

    if (searchImageTerm.trim()) {
      const q = searchImageTerm.toLowerCase();
      list = list.filter(item => item.label.toLowerCase().includes(q) || item.key.toLowerCase().includes(q));
    }

    return list;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Top Banner Header */}
          <div className="relative bg-gradient-to-r from-[#D70F64] via-[#b00c50] to-[#7209b7] p-6 text-white shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/30 text-white">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                    AI Magic Menu & Photo Generator
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Ultra-Smart Matcher
                    </span>
                  </h3>
                  <p className="text-xs text-pink-100 font-medium mt-0.5">
                    Paste raw items &rarr; AI accurately matches authentic Chai, Raita, Biryani, Karahi &amp; Fast Food photos with restaurant branding!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition border border-white/20 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6 text-slate-800">
            {/* Step 1: Restaurant Selection & Settings */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#D70F64]">
                  <Store className="w-4 h-4" />
                  <span>Target Restaurant &amp; Branding</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Item Type:</span>
                  <div className="flex bg-white rounded-lg p-0.5 border border-slate-200 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setItemType("food")}
                      className={`px-3 py-1 rounded-md transition ${
                        itemType === "food"
                          ? "bg-[#D70F64] text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      🍔 Food
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemType("service")}
                      className={`px-3 py-1 rounded-md transition ${
                        itemType === "service"
                          ? "bg-[#D70F64] text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      🛠️ Service
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Select Restaurant */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center justify-between">
                    <span>Select Restaurant</span>
                    <button
                      type="button"
                      onClick={() => setIsCustomRestaurant(!isCustomRestaurant)}
                      className="text-[#D70F64] hover:underline font-bold"
                    >
                      {isCustomRestaurant ? "Choose from existing" : "+ Add New Restaurant"}
                    </button>
                  </label>

                  {isCustomRestaurant ? (
                    <input
                      type="text"
                      value={customRestaurantName}
                      onChange={e => setCustomRestaurantName(e.target.value)}
                      placeholder="e.g. Royal Spice Grill House"
                      className="w-full p-3 bg-white border border-[#D70F64] rounded-xl text-slate-900 font-bold outline-none ring-2 ring-[#D70F64]/10"
                    />
                  ) : (
                    <select
                      value={selectedRestaurant}
                      onChange={e => setSelectedRestaurant(e.target.value)}
                      className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold outline-none cursor-pointer focus:border-[#D70F64]"
                    >
                      {uniqueRestaurants.map(r => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Branding Badge Info */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#D70F64] to-pink-500 text-white flex items-center justify-center font-black text-sm shadow-md">
                      {activeRestaurantName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-xs truncate max-w-[180px]">
                        {activeRestaurantName}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                        <Tag className="w-3 h-3 text-[#D70F64]" />
                        Items will be assigned here
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg text-blue-900 font-bold text-[10px] hover:bg-blue-100 transition">
                      <input
                        type="checkbox"
                        checked={autoGoogleImageSearch}
                        onChange={e => setAutoGoogleImageSearch(e.target.checked)}
                        className="w-3.5 h-3.5 accent-blue-600 rounded"
                      />
                      <span className="flex items-center gap-1">
                        <span>🔍</span> Auto Google Image Search
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer bg-pink-50 border border-pink-200 px-3 py-1.5 rounded-lg text-[#D70F64] font-bold text-[10px] hover:bg-pink-100 transition">
                      <input
                        type="checkbox"
                        checked={brandWatermark}
                        onChange={e => setBrandWatermark(e.target.checked)}
                        className="w-3.5 h-3.5 accent-[#D70F64] rounded"
                      />
                      <span>Brand Badge</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Raw Text Input Box */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#D70F64]" />
                  Paste Menu Text / Item List With Prices
                </label>

                {/* Templates Bar */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">
                    Quick Templates:
                  </span>
                  {SAMPLE_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMenuText(tmpl.text)}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      {tmpl.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <textarea
                  rows={5}
                  value={menuText}
                  onChange={e => setMenuText(e.target.value)}
                  placeholder={`Paste your menu text or WhatsApp list here...\n\nExample:\nZinger Burger - Rs 290\nSpecial Beef Double Patty Burger - Rs 420\nChicken Fajita Pizza (Medium) - Rs 850\nLahori Chicken Biryani - Rs 220\nFresh Mint Raita - Rs 50\nDadu Special Orange Karak Chai - Rs 120`}
                  className="w-full p-4 bg-white border-2 border-slate-200 focus:border-[#D70F64] rounded-2xl text-slate-900 text-xs font-mono font-medium outline-none transition placeholder:text-slate-400 shadow-inner"
                />

                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  {menuText && (
                    <button
                      type="button"
                      onClick={() => setMenuText("")}
                      className="px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-red-500 bg-white/90 border border-slate-200 rounded-lg shadow-sm"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleParseMenu}
                    disabled={isProcessing || !menuText.trim()}
                    className="bg-gradient-to-r from-[#D70F64] to-[#b00c50] hover:from-[#b00c50] hover:to-[#910a42] text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3.5 h-3.5" />
                        ✨ Generate Items &amp; Photos
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Notification Messages */}
            {errorMessage && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Step 3: Generated Items Preview & Customizer */}
            {parsedItems.length > 0 && (
              <div className="space-y-4 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <ChefHat className="w-4 h-4 text-[#D70F64]" />
                      Generated Items Preview ({parsedItems.length} items)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Click any photo to change/search image, or cycle variations before publishing!
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleSearchAllUnmatchedGoogle}
                      disabled={isBatchSearchingGoogle}
                      className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
                      title="Search Google web photos for any unmatched items"
                    >
                      {isBatchSearchingGoogle ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Searching Google...</span>
                        </>
                      ) : (
                        <>
                          <span>🔍</span>
                          <span>Search Google for All Unmatched</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleAddBlankItem}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#D70F64]" />
                      Add Item
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const allSelected = parsedItems.every(i => i.selected);
                        setParsedItems(prev => prev.map(i => ({ ...i, selected: !allSelected })));
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 transition cursor-pointer"
                    >
                      {parsedItems.every(i => i.selected) ? "Unselect All" : "Select All"}
                    </button>
                  </div>
                </div>

                {/* Grid of Parsed Items */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {parsedItems.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className={`p-4 rounded-2xl border-2 transition relative flex gap-4 ${
                        item.selected
                          ? "bg-white border-[#D70F64]/30 shadow-sm"
                          : "bg-slate-50/70 border-slate-200 opacity-60"
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={e => handleUpdateItem(item.id, "selected", e.target.checked)}
                        className="absolute top-3 left-3 w-4 h-4 accent-[#D70F64] rounded cursor-pointer z-10"
                      />

                      {/* Food Photo Container with Restaurant Logo Badge */}
                      <div className="w-28 h-28 shrink-0 rounded-xl overflow-hidden relative border border-slate-200 bg-slate-100 group shadow-inner">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                          onClick={() => handleOpenPhotoPicker(item.id)}
                        />

                        {/* Google Search Spinner Overlay */}
                        {item.isGeneratingImage && (
                          <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-2 text-center text-white z-20">
                            <Loader2 className="w-5 h-5 animate-spin text-blue-400 mb-1" />
                            <span className="text-[8px] font-black uppercase tracking-wider text-blue-200">
                              Searching Google...
                            </span>
                          </div>
                        )}

                        {/* Restaurant Watermark Badge Overlay */}
                        {brandWatermark && (
                          <div className="absolute top-1.5 right-1.5 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-black text-white flex items-center gap-1 shadow-md border border-white/20 pointer-events-none z-10">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D70F64] inline-block" />
                            <span className="truncate max-w-[65px]">{activeRestaurantName}</span>
                          </div>
                        )}

                        {/* Google Search Badge if searched from web */}
                        {item.imageSource === "google_search" && !item.isGeneratingImage && (
                          <div className="absolute top-1.5 left-1.5 bg-blue-600/95 text-white px-1.5 py-0.5 rounded text-[7.5px] font-black shadow-md flex items-center gap-0.5 z-10">
                            <span>🔍</span>
                            <span>Google</span>
                          </div>
                        )}

                        {/* Photo Action Buttons */}
                        <div className="absolute bottom-1.5 inset-x-1.5 flex items-center justify-between gap-1 z-10">
                          <button
                            type="button"
                            onClick={() => handleOpenPhotoPicker(item.id)}
                            title="Select / Search photo on Google"
                            className="bg-black/75 hover:bg-black text-white px-1.5 py-1 rounded-lg text-[8.5px] font-bold shadow-md transition flex items-center gap-0.5 cursor-pointer"
                          >
                            <ImageIcon className="w-2.5 h-2.5" />
                            <span>Pick</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSearchGoogleForItem(item.id)}
                            disabled={item.isGeneratingImage}
                            title="Search photo on Google"
                            className="bg-blue-600/90 hover:bg-blue-700 text-white px-1.5 py-1 rounded-lg text-[8.5px] font-bold shadow-md transition flex items-center gap-0.5 cursor-pointer disabled:opacity-50"
                          >
                            <span>🔍</span>
                            <span>Search</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCycleImage(item.id)}
                            title="Cycle next photo"
                            className="bg-white/90 hover:bg-white text-slate-800 p-1 rounded-lg shadow-md transition border border-slate-200 hover:text-[#D70F64] cursor-pointer"
                          >
                            <RefreshCw className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>

                      {/* Item Details Form */}
                      <div className="flex-1 space-y-2 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={e => handleUpdateItem(item.id, "name", e.target.value)}
                            placeholder="Item Name"
                            className="font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#D70F64] outline-none w-full"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-slate-400 hover:text-red-500 p-1 rounded transition cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Category & Price Row */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">
                              Category
                            </label>
                            <select
                              value={item.category}
                              onChange={e => handleUpdateItem(item.id, "category", e.target.value)}
                              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-[11px] font-bold outline-none"
                            >
                              {foodCategories.map(cat => (
                                <option key={cat.id} value={cat.name}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">
                              Price (Rs.)
                            </label>
                            <input
                              type="number"
                              value={item.price}
                              onChange={e => handleUpdateItem(item.id, "price", Number(e.target.value))}
                              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-extrabold text-[11px] outline-none"
                            />
                          </div>
                        </div>

                        {/* Description field */}
                        <div>
                          <input
                            type="text"
                            value={item.description}
                            onChange={e => handleUpdateItem(item.id, "description", e.target.value)}
                            placeholder="Description..."
                            className="w-full p-1.5 bg-transparent border-b border-slate-200 text-[10.5px] text-slate-600 outline-none focus:border-[#D70F64]"
                          />
                        </div>

                        {/* Bestseller Toggle & Status Pill */}
                        <div className="flex items-center justify-between pt-1">
                          <label className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.isBestseller}
                              onChange={e => handleUpdateItem(item.id, "isBestseller", e.target.checked)}
                              className="accent-amber-500 rounded"
                            />
                            <span>🔥 Bestseller</span>
                          </label>

                          <div className="flex items-center gap-1">
                            {item.imageSource === "banana2" ? (
                              <span className="text-[8.5px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded font-black uppercase">
                                🍌 Banana 2
                              </span>
                            ) : (
                              <span className="text-[8.5px] bg-emerald-100 text-emerald-900 border border-emerald-300 px-1.5 py-0.5 rounded font-black uppercase">
                                ✓ Exact Match
                              </span>
                            )}
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">
                              {item.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            <div className="text-xs text-slate-600 font-medium">
              {parsedItems.length > 0 ? (
                <span>
                  <strong className="text-slate-900">{parsedItems.filter(i => i.selected).length}</strong> of {parsedItems.length} items ready to publish to{" "}
                  <strong className="text-[#D70F64]">{activeRestaurantName}</strong>
                </span>
              ) : (
                <span>Paste menu above and click &quot;Generate Items &amp; Photos&quot;</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handlePublishToFirestore}
                disabled={isPublishing || parsedItems.filter(i => i.selected).length === 0}
                className="bg-[#D70F64] hover:bg-[#b00c50] text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-pink-600/30 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {isPublishing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Publishing ({publishProgress}%)...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Publish All to Restaurant Menu
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* 📸 SUB-MODAL: INTERACTIVE PHOTO SELECTOR & SEARCH */}
        {pickingImageForItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl p-6 max-w-3xl w-full border border-slate-200 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-[#D70F64]" />
                  <h4 className="font-black text-slate-900 text-base">
                    Select Exact Photo for:{" "}
                    <span className="text-[#D70F64]">
                      {parsedItems.find(i => i.id === pickingImageForItem)?.name}
                    </span>
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setPickingImageForItem(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 🍌 Banana 2 AI Image Generator Section */}
              {/* Google & Web Image Search Box */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-blue-950 flex items-center gap-1.5 uppercase tracking-wide">
                    <span>🔍</span> Real Google Food Photo Search (Web & High Quality)
                  </span>
                  <span className="text-[10px] bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full font-bold">
                    Direct Web Photos
                  </span>
                </div>

                {/* Quick Culinary Search Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9.5px] font-bold text-blue-800">Quick Searches:</span>
                  {[
                    "Chicken Biryani",
                    "Chicken Karahi",
                    "Seekh Kabab",
                    "Zinger Burger",
                    "Fajita Pizza",
                    "Doodh Patti Karak Chai",
                    "Mint Raita",
                    "Roghni Naan",
                    "Gulab Jamun",
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSearchImageTerm(preset);
                        handleSearchGoogleInModal(preset);
                      }}
                      className="text-[9px] font-bold bg-white hover:bg-blue-100 text-blue-900 border border-blue-300 px-2 py-0.5 rounded-lg transition cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchImageTerm}
                    onChange={e => setSearchImageTerm(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSearchGoogleInModal();
                      }
                    }}
                    placeholder="Search Google for any dish photo (e.g. Peshawari Karahi, Chicken Biryani, Karak Chai)..."
                    className="flex-1 p-2.5 bg-white border border-blue-300 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-blue-500 shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => handleSearchGoogleInModal()}
                    disabled={isSearchingGoogleModal}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-md flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap"
                  >
                    {isSearchingGoogleModal ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Searching Google...</span>
                      </>
                    ) : (
                      <>
                        <span>🔍</span>
                        <span>Search Google</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Google Search Live Results */}
                {googleSearchResults.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-blue-900">
                      Google Search Results ({googleSearchResults.length} photos found):
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {googleSearchResults.map((url, sIdx) => (
                        <div
                          key={sIdx}
                          onClick={() => handleApplyChosenPhoto(url, "google_search")}
                          className="group relative rounded-xl overflow-hidden aspect-video border-2 border-blue-300 hover:border-blue-600 cursor-pointer shadow-sm transition-all hover:scale-105"
                        >
                          <img
                            src={url}
                            alt="Search result"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <span className="text-[10px] font-black text-white bg-blue-600 px-2 py-1 rounded-md shadow">
                              Select Photo
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Image URL Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customImageUrlInput}
                  onChange={e => setCustomImageUrlInput(e.target.value)}
                  placeholder="Paste custom Image URL here..."
                  className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono outline-none focus:border-[#D70F64]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customImageUrlInput.trim()) {
                      handleApplyChosenPhoto(customImageUrlInput.trim(), "custom");
                    }
                  }}
                  className="bg-[#D70F64] hover:bg-[#b00c50] text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
                >
                  Apply URL
                </button>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                <button
                  type="button"
                  onClick={() => setGalleryCategory("all")}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                    galleryCategory === "all"
                      ? "bg-[#D70F64] text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  🌟 All
                </button>
                {Object.entries(COMPREHENSIVE_FOOD_BANK).map(([key, item]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setGalleryCategory(key)}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                      galleryCategory === key
                        ? "bg-[#D70F64] text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Photo Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 overflow-y-auto flex-1 p-1">
                {getFilteredGalleryPhotos().map((photo, i) => (
                  <div
                    key={i}
                    onClick={() => handleApplyChosenPhoto(photo.url)}
                    className="group relative rounded-xl overflow-hidden aspect-video border-2 border-slate-200 hover:border-[#D70F64] cursor-pointer shadow-sm transition-all hover:scale-105"
                  >
                    <img
                      src={photo.url}
                      alt={photo.label}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-black uppercase tracking-wider">
                      <span>Select Photo</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}
