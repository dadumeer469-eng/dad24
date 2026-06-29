import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  projectId: "ai-studio-1ab132d4-43e2-4cce-bcc4-70c5fbc725d3",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const cleanObject = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map((v) => (v && typeof v === "object" ? cleanObject(v) : v)).filter(v => v !== undefined);
  }
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = typeof value === "object" && value !== null ? cleanObject(value) : value;
    }
    return acc;
  }, {} as any);
};

async function test() {
  const restaurantName = "Tasty Bites Dadu";
  const burgerAddOns = [
    { name: "Extra Cheese", price: 100 },
    { name: "Extra Sauce", price: 50 },
  ];
  
  const menuData: any[] = [
    {
      name: "Normal Flavour Pizza",
      description: "Select from our range of normal flavors.",
      price: 400,
      category: "Pizza",
      sizes: [{ name: "Small", price: 400 }, { name: "Medium", price: 700 }, { name: "Large", price: 1000 }],
      flavors: [
        { name: "Tikka Pizza", price: 0 },
        { name: "Fajita Pizza", price: 0 },
        { name: "Hot N Spicy Pizza", price: 0 },
        { name: "Supreme Pizza", price: 0 },
        { name: "Mexican Pizza", price: 0 },
        { name: "Vaggi Lover Pizza", price: 0 },
      ],
      imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80",
      isAvailable: true, type: "food", restaurantName
    }
  ];

  try {
    for (let i = 0; i < menuData.length; i++) {
      const item = menuData[i];
      const docId = `tasty_bites_${item.category.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${item.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      await setDoc(doc(db, "menu", docId), cleanObject(item));
    }
    console.log("Success");
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}
test();
