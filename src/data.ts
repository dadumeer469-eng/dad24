import { Dish } from "./types";

export const INITIAL_MENU_ITEMS: Dish[] = [
  {
    id: "dish_1",
    name: "Dadu Special Double Patty Burger",
    description: "Juicy beef or grilled chicken double patty topped with melted cheese slices, onion rings and signature house sauce.",
    price: 380,
    category: "Burgers",
    imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=400",
    isAvailable: true,
    type: "food",
  },
  {
    id: "dish_2",
    name: "Zinger Burger Delight",
    description: "Extra crispy chicken fillet coated with spiced batter, served with fresh lettuce and signature garlic mayonnaise.",
    price: 290,
    category: "Burgers",
    imageUrl: "https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&q=80&w=400",
    isAvailable: true,
    type: "food",
  },
  {
    id: "dish_3",
    name: "Fajita Sensation Pizza",
    description: "Packed with spiced fajita chicken chunks, fresh bell peppers, caramelized onions and melted mozzarella.",
    price: 650,
    category: "Pizza",
    imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=400",
    isAvailable: true,
    type: "food",
  },
  {
    id: "dish_4",
    name: "Dadu Cheese Blast Pizza",
    description: "Thick double-cheese stuffed crust loaded with seasoned beef slices, black olives, bell pepper, and tomato slices.",
    price: 850,
    category: "Pizza",
    imageUrl: "https://images.unsplash.com/photo-1590947132387-155cc02f3212?auto=format&fit=crop&q=80&w=400",
    isAvailable: true,
    type: "food",
  },
  {
    id: "dish_8",
    name: "Lahori Seekh Kabab Platter",
    description: "Six skewers of spice-crusted minced beef charcoal barbecued, served with mint raita and fresh naan.",
    price: 750,
    category: "Specials",
    imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=400",
    isAvailable: true,
    type: "food",
  },
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
    description: "Ice cold carbonated cola refresher.",
  },
  {
    id: "drink_dew",
    name: "Ice Cold Mountain Dew (345ml)",
    price: 110,
    imageUrl: "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?auto=format&fit=crop&q=80&w=300",
    description: "Extra carbonated, chilled citrus soft drink.",
  },
  {
    id: "drink_7up",
    name: "Chilled 7Up (345ml)",
    price: 110,
    imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=300",
    description: "Crisp and clean lemon-lime chilled soft drink.",
  },
  {
    id: "drink_coke",
    name: "Chilled Coca-Cola (345ml)",
    price: 110,
    imageUrl: "https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&q=80&w=300",
    description: "Classic ice-cold cola refresher.",
  },
];

export const DEFAULT_FOOD_CATEGORIES = [
  {
    id: "cat_all",
    name: "All",
    emoji: "🍽️",
    subtitle: "All Menu",
    color: "from-[#E21B70] to-[#C2145E]",
    isAvailable: true,
    position: 0,
  },
  {
    id: "cat_desi",
    name: "Desi Food",
    emoji: "🍛",
    subtitle: "Biryani & Karahi",
    color: "from-[#E21B70] to-[#C2145E]",
    isAvailable: true,
    position: 1,
  },
  {
    id: "cat_pizza",
    name: "Pizza",
    emoji: "🍕",
    subtitle: "Hot Pizzas",
    color: "from-[#E21B70] to-[#C2145E]",
    isAvailable: true,
    position: 2,
  },
  {
    id: "cat_burgers",
    name: "Burgers",
    emoji: "🍔",
    subtitle: "Zesty Burgers",
    color: "from-[#E21B70] to-[#C2145E]",
    isAvailable: true,
    position: 3,
  },
  {
    id: "cat_broast",
    name: "Broast",
    emoji: "🍗",
    subtitle: "Crispy Broast",
    color: "from-[#E21B70] to-[#C2145E]",
    isAvailable: true,
    position: 4,
  },
  {
    id: "cat_rolls",
    name: "Rolls & Wraps",
    emoji: "🌯",
    subtitle: "Tasty Rolls",
    color: "from-[#E21B70] to-[#C2145E]",
    isAvailable: true,
    position: 5,
  },
  {
    id: "cat_pasta",
    name: "Pasta",
    emoji: "🍝",
    subtitle: "Creamy Pasta",
    color: "from-[#E21B70] to-[#C2145E]",
    isAvailable: true,
    position: 6,
  },
  {
    id: "cat_lasagna",
    name: "Lasagna",
    emoji: "🧀",
    subtitle: "Cheesy Lasagna",
    color: "from-[#E21B70] to-[#C2145E]",
    isAvailable: true,
    position: 7,
  },
  {
    id: "cat_fries",
    name: "Fries",
    emoji: "🍟",
    subtitle: "Loaded Fries",
    color: "from-[#E21B70] to-[#C2145E]",
    isAvailable: true,
    position: 8,
  },
  {
    id: "cat_paratha",
    name: "Paratha",
    emoji: "🫓",
    subtitle: "Hot Parathas",
    color: "from-[#E21B70] to-[#C2145E]",
    isAvailable: true,
    position: 9,
  },
  {
    id: "cat_sandwich",
    name: "Sandwich",
    emoji: "🥪",
    subtitle: "Grilled Sandwiches",
    color: "from-[#E21B70] to-[#C2145E]",
    isAvailable: true,
    position: 10,
  },
  {
    id: "cat_tea",
    name: "Tea & Chai",
    emoji: "☕",
    subtitle: "Chai & Kehwa",
    color: "from-[#E21B70] to-[#C2145E]",
    isAvailable: true,
    position: 11,
  },
  {
    id: "cat_specials",
    name: "Specials",
    emoji: "⭐",
    subtitle: "Dadu Specials",
    color: "from-[#E21B70] to-[#C2145E]",
    isAvailable: true,
    position: 12,
  },
];

// Honest empty defaults: never fabricate fake grocery inventory when Firestore has none.
export const DEFAULT_GROCERY_CATEGORIES: Array<{
  id: string;
  name: string;
  icon: string;
  position: number;
  isAvailable: boolean;
}> = [];

export const DEFAULT_GROCERY_PRODUCTS: Array<{
  id: string;
  name: string;
  price: number;
  unit: string;
  imageUrl: string;
  categoryId: string;
  isAvailable: boolean;
  stock: number;
}> = [];

export function getDefaultRestaurantImage(vendorName?: string): string {
  if (!vendorName) return "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=600";
  const name = vendorName.toLowerCase();
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
