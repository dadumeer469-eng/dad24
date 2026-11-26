import { Dish } from "./types";

export const INITIAL_MENU_ITEMS: Dish[] = [
  {
    id: "dish_1",
    name: "Dadu Special Double Patty Burger",
    description: "Juicy beef or grilled chicken double patty topped with melted cheese slices, onion rings and signature house sauce.",
    price: 380,
    category: "Burgers",
    imageUrl: "/images/dishes/burger.jpg",
    isAvailable: true,
    type: "food",
  },
  {
    id: "dish_2",
    name: "Zinger Burger Delight",
    description: "Extra crispy chicken fillet coated with spiced batter, served with fresh lettuce and signature garlic mayonnaise.",
    price: 290,
    category: "Burgers",
    imageUrl: "/images/dishes/zinger.jpg",
    isAvailable: true,
    type: "food",
  },
  {
    id: "dish_3",
    name: "Fajita Sensation Pizza",
    description: "Packed with spiced fajita chicken chunks, fresh bell peppers, caramelized onions and melted mozzarella.",
    price: 650,
    category: "Pizza",
    imageUrl: "/images/dishes/pizza.jpg",
    isAvailable: true,
    type: "food",
  },
  {
    id: "dish_4",
    name: "Dadu Cheese Blast Pizza",
    description: "Thick double-cheese stuffed crust loaded with seasoned beef slices, black olives, bell pepper, and tomato slices.",
    price: 850,
    category: "Pizza",
    imageUrl: "/images/dishes/pizza.jpg",
    isAvailable: true,
    type: "food",
  },
  {
    id: "dish_8",
    name: "Lahori Seekh Kabab Platter",
    description: "Six skewers of spice-crusted minced beef charcoal barbecued, served with mint raita and fresh naan.",
    price: 750,
    category: "Specials",
    imageUrl: "/images/dishes/seekh-kabab.jpg",
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
    imageUrl: "/images/dishes/cola.jpg",
    description: "Ice cold carbonated cola refresher.",
  },
  {
    id: "drink_dew",
    name: "Ice Cold Mountain Dew (345ml)",
    price: 110,
    imageUrl: "/images/dishes/mountain-dew.jpg",
    description: "Extra carbonated, chilled citrus soft drink.",
  },
  {
    id: "drink_7up",
    name: "Chilled 7Up (345ml)",
    price: 110,
    imageUrl: "/images/dishes/seven-up.jpg",
    description: "Crisp and clean lemon-lime chilled soft drink.",
  },
  {
    id: "drink_coke",
    name: "Chilled Coca-Cola (345ml)",
    price: 110,
    imageUrl: "/images/dishes/cola.jpg",
    description: "Classic ice-cold cola refresher.",
  },
];

export const DEFAULT_FOOD_CATEGORIES = [
  {
    id: "cat_all",
    name: "All",
    emoji: "🍽️",
    subtitle: "All Menu",
    color: "from-[#D70F64] to-[#B80C54]",
    isAvailable: true,
    position: 0,
  },
  {
    id: "cat_desi",
    name: "Desi Food",
    emoji: "🍛",
    subtitle: "Biryani & Karahi",
    color: "from-[#D70F64] to-[#B80C54]",
    isAvailable: true,
    position: 1,
  },
  {
    id: "cat_pizza",
    name: "Pizza",
    emoji: "🍕",
    subtitle: "Hot Pizzas",
    color: "from-[#D70F64] to-[#B80C54]",
    isAvailable: true,
    position: 2,
  },
  {
    id: "cat_burgers",
    name: "Burgers",
    emoji: "🍔",
    subtitle: "Zesty Burgers",
    color: "from-[#D70F64] to-[#B80C54]",
    isAvailable: true,
    position: 3,
  },
  {
    id: "cat_broast",
    name: "Broast",
    emoji: "🍗",
    subtitle: "Crispy Broast",
    color: "from-[#D70F64] to-[#B80C54]",
    isAvailable: true,
    position: 4,
  },
  {
    id: "cat_rolls",
    name: "Rolls & Wraps",
    emoji: "🌯",
    subtitle: "Tasty Rolls",
    color: "from-[#D70F64] to-[#B80C54]",
    isAvailable: true,
    position: 5,
  },
  {
    id: "cat_pasta",
    name: "Pasta",
    emoji: "🍝",
    subtitle: "Creamy Pasta",
    color: "from-[#D70F64] to-[#B80C54]",
    isAvailable: true,
    position: 6,
  },
  {
    id: "cat_lasagna",
    name: "Lasagna",
    emoji: "🧀",
    subtitle: "Cheesy Lasagna",
    color: "from-[#D70F64] to-[#B80C54]",
    isAvailable: true,
    position: 7,
  },
  {
    id: "cat_fries",
    name: "Fries",
    emoji: "🍟",
    subtitle: "Loaded Fries",
    color: "from-[#D70F64] to-[#B80C54]",
    isAvailable: true,
    position: 8,
  },
  {
    id: "cat_paratha",
    name: "Paratha",
    emoji: "🫓",
    subtitle: "Hot Parathas",
    color: "from-[#D70F64] to-[#B80C54]",
    isAvailable: true,
    position: 9,
  },
  {
    id: "cat_sandwich",
    name: "Sandwich",
    emoji: "🥪",
    subtitle: "Grilled Sandwiches",
    color: "from-[#D70F64] to-[#B80C54]",
    isAvailable: true,
    position: 10,
  },
  {
    id: "cat_tea",
    name: "Tea & Chai",
    emoji: "☕",
    subtitle: "Chai & Kehwa",
    color: "from-[#D70F64] to-[#B80C54]",
    isAvailable: true,
    position: 11,
  },
  {
    id: "cat_specials",
    name: "Specials",
    emoji: "⭐",
    subtitle: "Dadu Specials",
    color: "from-[#D70F64] to-[#B80C54]",
    isAvailable: true,
    position: 12,
  },
];

export {
  OWNER_GROCERY_CATEGORIES,
  OWNER_GROCERY_PRODUCTS,
  OWNER_GROCERY_CATEGORIES as DEFAULT_GROCERY_CATEGORIES,
  OWNER_GROCERY_PRODUCTS as DEFAULT_GROCERY_PRODUCTS,
} from "./data/ownerGroceryCatalog";

export function getDefaultRestaurantImage(vendorName?: string): string {
  if (!vendorName) return "/images/dishes/pizza.jpg";
  const name = vendorName.toLowerCase();
  if (name.includes("pizza")) {
    return "/images/dishes/pizza.jpg";
  }
  if (name.includes("burger") || name.includes("fast food") || name.includes("cafe")) {
    return "/images/dishes/burger.jpg";
  }
  if (name.includes("tasty bites") || name.includes("tasty")) {
    return "/images/dishes/pizza.jpg";
  }
  if (name.includes("biryani") || name.includes("karahi") || name.includes("bbq") || name.includes("tikka") || name.includes("shinwari") || name.includes("peshawari")) {
    return "/images/dishes/biryani.jpg";
  }
  if (name.includes("tea") || name.includes("chai") || name.includes("coffee")) {
    return "/images/dishes/chai.jpg";
  }
  if (name.includes("sweet") || name.includes("bakers") || name.includes("cake") || name.includes("bakery")) {
    return "/images/dishes/cheesecake.jpg";
  }
  return "/images/dishes/pizza.jpg";
}
