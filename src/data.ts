import { Dish } from "./types";

export const INITIAL_MENU_ITEMS: Dish[] = [
  {
    id: "dish_1",
    name: "Dadu Special Double Patty Burger",
    description: "Juicy beef or grilled chicken double patty topped with melted cheese slices, onion rings and parent secret sauce.",
    price: 380,
    category: "Burgers",
    imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=400",
    isAvailable: true,
    type: "food"
  },
  {
    id: "dish_2",
    name: "Zinger Burger Delight",
    description: "Extra crispy breast fillet coated with spicy batter, served with fresh lettuce and signature Dadu garlic mayonnaise.",
    price: 290,
    category: "Burgers",
    imageUrl: "https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&q=80&w=400",
    isAvailable: true,
    type: "food"
  },
  {
    id: "dish_3",
    name: "Fajita Sensation Pizza",
    description: "Packed with spicy fajita chicken chunks, fresh bell peppers, caramelized onions and gooey mozzarella toppings.",
    price: 650,
    category: "Pizzas",
    imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=400",
    isAvailable: true,
    type: "food"
  },
  {
    id: "dish_4",
    name: "Dadu Cheese Blast Pizza",
    description: "Thick double-cheese stuffed crust loaded with seasoned beef slices, black olives, bell pepper, and tomato slices.",
    price: 850,
    category: "Pizzas",
    imageUrl: "https://images.unsplash.com/photo-1590947132387-155cc02f3212?auto=format&fit=crop&q=80&w=400",
    isAvailable: true,
    type: "food"
  },
  {
    id: "dish_5",
    name: "Sindhi Special Chicken Biryani",
    description: "Traditional aromatic basmati rice cooked with golden spices, fried onions and tender marinated chicken.",
    price: 380,
    category: "Desi Food",
    imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=400",
    isAvailable: true,
    isVeg: false,
    restaurantName: "Dadu Royal Kitchen",
    type: "food"
  },
  {
    id: "dish_6",
    name: "Doodh Patti Chai",
    description: "Authentic strong milk tea brewed slow with fresh milk, Assam tea leaves, and green cardamom.",
    price: 80,
    category: "Tea & Chai",
    imageUrl: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&q=80&w=400",
    isAvailable: true,
    isVeg: true,
    restaurantName: "Dadu Chai & Cafe",
    type: "food"
  },
  {
    id: "dish_7",
    name: "Green Tea (Peshawari Kehwa)",
    description: "Refreshing hot Peshawari green tea infused with fresh lemon and green cardamom.",
    price: 70,
    category: "Tea & Chai",
    imageUrl: "https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?auto=format&fit=crop&q=80&w=400",
    isAvailable: true,
    isVeg: true,
    restaurantName: "Dadu Chai & Cafe",
    type: "food"
  },
  {
    id: "service_1",
    name: "Professional Home Electrician Checkup",
    description: "Aane ke charges (Visiting & diagnostic fee). Short circuit inspection, socket fixes, board/wiring diagnostics. Extra material & repair costs are estimated on-site (Baqi kharcha electrician check kr ke batayega).",
    price: 500,
    category: "Home Services",
    imageUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=400",
    isAvailable: true,
    type: "service"
  },
  {
    id: "service_2",
    name: "Inverter AC Diagnostic & Service Booking",
    description: "Aane ke charges (Visiting & diagnostic fee). Cooling inspection, indoor filter wash, wiring check, gas pressure check. Further repairs or gas re-fill charges determined on-site by tech.",
    price: 500,
    category: "Home Services",
    imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=400",
    isAvailable: true,
    type: "service"
  },
  {
    id: "service_3",
    name: "Emergency Plumber Visitation",
    description: "Aane ke charges (Visiting & diagnostic fee). Pipe wash, blockage diagnostics, leak detections. Remaining materials or custom tasks quoted on-spot once examined.",
    price: 500,
    category: "Home Services",
    imageUrl: "https://images.unsplash.com/photo-1542013936693-8848e574047e?auto=format&fit=crop&q=80&w=400",
    isAvailable: true,
    type: "service"
  },
  {
    id: "dish_8",
    name: "Lahori Seekh Kabab Platter",
    description: "Premium premium Specials item. Six skewers of spice-crusted minced beef charcoal barbecued, served with mint raita & fresh naan.",
    price: 750,
    category: "Specials",
    imageUrl: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&q=80&w=400",
    isAvailable: true,
    type: "food"
  }
];

export interface DrinkRecommendation {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  description: string;
}

export const CHECKOUT_DRINKS: DrinkRecommendation[] = [
  {
    id: "drink_pepsi",
    name: "Chilled Pepsi (345ml)",
    price: 110,
    imageUrl: "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&q=80&w=300",
    description: "Ice cold carbonated cola refresher."
  },
  {
    id: "drink_dew",
    name: "Ice Cold Mountain Dew (345ml)",
    price: 110,
    imageUrl: "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?auto=format&fit=crop&q=80&w=300",
    description: "Do the Dew! Extra carbonated, chilled citrus kick."
  },
  {
    id: "drink_7up",
    name: "Chilled 7Up (345ml)",
    price: 110,
    imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=300",
    description: "Crisp and clean lemon-lime chilled soft drink."
  },
  {
    id: "drink_coke",
    name: "Chilled Coca-Cola (345ml)",
    price: 110,
    imageUrl: "https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&q=80&w=300",
    description: "Classic delicious ice-cold cola refresher."
  }
];

export const DEFAULT_FOOD_CATEGORIES = [
  {
    id: "cat_all",
    name: "All",
    emoji: "🍽️",
    subtitle: "All Menu",
    color: "from-[#d70f64] to-[#b50c54]",
    isAvailable: true,
    position: 0,
  },
  {
    id: "cat_desi",
    name: "Desi Food",
    emoji: "🍛",
    subtitle: "Biryani & Karahi",
    color: "from-[#d70f64] to-[#b50c54]",
    isAvailable: true,
    position: 1,
  },
  {
    id: "cat_pizza",
    name: "Pizza",
    emoji: "🍕",
    subtitle: "Hot Pizzas",
    color: "from-[#d70f64] to-[#b50c54]",
    isAvailable: true,
    position: 2,
  },
  {
    id: "cat_burgers",
    name: "Burgers",
    emoji: "🍔",
    subtitle: "Zesty Burgers",
    color: "from-[#d70f64] to-[#b50c54]",
    isAvailable: true,
    position: 3,
  },
  {
    id: "cat_broast",
    name: "Broast",
    emoji: "🍗",
    subtitle: "Crispy Broast",
    color: "from-[#d70f64] to-[#b50c54]",
    isAvailable: true,
    position: 4,
  },
  {
    id: "cat_rolls",
    name: "Rolls & Wraps",
    emoji: "🌯",
    subtitle: "Tasty Rolls",
    color: "from-[#d70f64] to-[#b50c54]",
    isAvailable: true,
    position: 5,
  },
  {
    id: "cat_pasta",
    name: "Pasta",
    emoji: "🍝",
    subtitle: "Creamy Pasta",
    color: "from-[#d70f64] to-[#b50c54]",
    isAvailable: true,
    position: 6,
  },
  {
    id: "cat_lasagna",
    name: "Lasagna",
    emoji: "🧀",
    subtitle: "Cheesy Lasagna",
    color: "from-[#d70f64] to-[#b50c54]",
    isAvailable: true,
    position: 7,
  },
  {
    id: "cat_fries",
    name: "Fries",
    emoji: "🍟",
    subtitle: "Loaded Fries",
    color: "from-[#d70f64] to-[#b50c54]",
    isAvailable: true,
    position: 8,
  },
  {
    id: "cat_paratha",
    name: "Paratha",
    emoji: "🫓",
    subtitle: "Hot Parathas",
    color: "from-[#d70f64] to-[#b50c54]",
    isAvailable: true,
    position: 9,
  },
  {
    id: "cat_sandwich",
    name: "Sandwich",
    emoji: "🥪",
    subtitle: "Grilled Sandwiches",
    color: "from-[#d70f64] to-[#b50c54]",
    isAvailable: true,
    position: 10,
  },
  {
    id: "cat_tea",
    name: "Tea & Chai",
    emoji: "☕",
    subtitle: "Chai & Kehwa",
    color: "from-[#d70f64] to-[#b50c54]",
    isAvailable: true,
    position: 11,
  },
  {
    id: "cat_specials",
    name: "Specials",
    emoji: "⭐",
    subtitle: "Dadu Specials",
    color: "from-[#d70f64] to-[#b50c54]",
    isAvailable: true,
    position: 12,
  },
  {
    id: "cat_services",
    name: "Home Services",
    emoji: "🛠️",
    subtitle: "Expert Repairs",
    color: "from-[#d70f64] to-[#b50c54]",
    isAvailable: true,
    position: 13,
  },
];

export const DEFAULT_GROCERY_CATEGORIES = [
  { id: "gcat_dairy", name: "Dairy & Eggs", icon: "🥛", position: 0, isAvailable: true },
  { id: "gcat_bakery", name: "Bakery & Bread", icon: "🍞", position: 1, isAvailable: true },
  { id: "gcat_beverages", name: "Cold Drinks & Juices", icon: "🧃", position: 2, isAvailable: true },
  { id: "gcat_snacks", name: "Snacks & Chips", icon: "🍿", position: 3, isAvailable: true },
  { id: "gcat_cooking", name: "Oil, Ghee & Spices", icon: "🧂", position: 4, isAvailable: true },
  { id: "gcat_personal", name: "Personal & Home Care", icon: "🧼", position: 5, isAvailable: true },
];

export const DEFAULT_GROCERY_PRODUCTS = [
  {
    id: "gprod_milk",
    name: "Fresh Whole Milk (Olper's 1 Litre)",
    price: 340,
    unit: "1 Litre",
    imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=400",
    categoryId: "gcat_dairy",
    isAvailable: true,
    stock: 50,
  },
  {
    id: "gprod_eggs",
    name: "Farm Fresh Eggs (Dozen)",
    price: 380,
    unit: "12 Eggs",
    imageUrl: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&q=80&w=400",
    categoryId: "gcat_dairy",
    isAvailable: true,
    stock: 35,
  },
  {
    id: "gprod_bread",
    name: "Dawn Sandwich Bread (Large)",
    price: 190,
    unit: "Large Pack",
    imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400",
    categoryId: "gcat_bakery",
    isAvailable: true,
    stock: 25,
  },
  {
    id: "gprod_lays",
    name: "Lay's Masala Waves Family Pack",
    price: 120,
    unit: "65g",
    imageUrl: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&q=80&w=400",
    categoryId: "gcat_snacks",
    isAvailable: true,
    stock: 60,
  },
  {
    id: "gprod_coke_15",
    name: "Coca Cola Chilled (1.5 Litre)",
    price: 210,
    unit: "1.5L Bottle",
    imageUrl: "https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&q=80&w=400",
    categoryId: "gcat_beverages",
    isAvailable: true,
    stock: 40,
  },
  {
    id: "gprod_oil",
    name: "Dalda Premium Cooking Oil (1 Litre Pouch)",
    price: 540,
    unit: "litre",
    imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=400",
    categoryId: "gcat_cooking",
    isAvailable: true,
    stock: 30,
  },
  {
    id: "gprod_sugar",
    name: "Fine White Sugar (1 kg Pack)",
    price: 165,
    unit: "kg",
    imageUrl: "https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&q=80&w=400",
    categoryId: "gcat_cooking",
    isAvailable: true,
    stock: 45,
  },
  {
    id: "gprod_tea_tapal",
    name: "Tapal Danedar Tea (190g Pack)",
    price: 420,
    unit: "pack",
    imageUrl: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&q=80&w=400",
    categoryId: "gcat_beverages",
    isAvailable: true,
    stock: 35,
  },
  {
    id: "gprod_soap",
    name: "Safeguard Family Soap (Pack of 3)",
    price: 360,
    unit: "pack",
    imageUrl: "https://images.unsplash.com/photo-1584305574647-0cc949a2bb9f?auto=format&fit=crop&q=80&w=400",
    categoryId: "gcat_personal",
    isAvailable: true,
    stock: 40,
  }
];

export function getDefaultRestaurantImage(vendorName?: string): string {
  if (!vendorName) return "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=600";
  const name = vendorName.toLowerCase();
  if (name.includes("service") || name.includes("repair") || name.includes("home") || name.includes("electric")) {
    return "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=600";
  }
  if (name.includes("pizza")) {
    return "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=600";
  }
  if (name.includes("burger") || name.includes("fast food") || name.includes("cafe")) {
    return "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=600";
  }
  if (name.includes("tasty bites") || name.includes("tasty")) {
    return "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=600";
  }
  if (name.includes("biryani") || name.includes("karahi") || name.includes("bbq") || name.includes("tikka") || name.includes("shinwari") || name.includes("peshawari")) {
    return "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=600";
  }
  if (name.includes("tea") || name.includes("chai") || name.includes("coffee")) {
    return "https://images.unsplash.com/photo-1541658016709-82535e94bc69?auto=format&fit=crop&q=80&w=600";
  }
  if (name.includes("sweet") || name.includes("bakers") || name.includes("cake") || name.includes("bakery")) {
    return "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=600";
  }
  return "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=600";
}

