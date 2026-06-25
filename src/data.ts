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
    name: "Lahori Authentic Chicken Biryani",
    description: "Traditional aromatic basmati rice cooked with golden spices, fried onions and extra tender marinated chicken legs.",
    price: 220,
    category: "Chicken & Rice",
    imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=400",
    isAvailable: true,
    type: "food"
  },
  {
    id: "dish_6",
    name: "Dadu Special Orange Karak Chai",
    description: "Authentic, high-grade strong Karak Chai brewed with fresh milk, cardamom, and a hint of sweet citrus, served scalding hot.",
    price: 320,
    category: "Only Tea",
    imageUrl: "https://images.unsplash.com/photo-1541658016709-82535e94bc69?auto=format&fit=crop&q=80&w=400",
    isAvailable: true,
    type: "food"
  },
  {
    id: "dish_7",
    name: "Dadu Chilled Elixir Orange Ice Tea",
    description: "Refreshing premium iced black tea infused with cold-pressed orange slices, fresh mint leaves, and light honey.",
    price: 300,
    category: "Only Tea",
    imageUrl: "https://images.unsplash.com/photo-1507133750040-4a8f57021571?auto=format&fit=crop&q=80&w=400",
    isAvailable: true,
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
    imageUrl: "https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&q=80&w=300",
    description: "Do the Dew! Extra carbonated, chilled citrus kick."
  },
  {
    id: "drink_7up",
    name: "Chilled 7Up (345ml)",
    price: 110,
    imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=300",
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
