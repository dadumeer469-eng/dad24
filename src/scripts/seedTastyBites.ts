import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, addDoc, doc, setDoc } from "firebase/firestore";
import appletConfig from "../../firebase-applet-config.json";
import * as dotenv from 'dotenv';
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || appletConfig.apiKey,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId,
  appId: process.env.VITE_FIREBASE_APP_ID || appletConfig.appId,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const databaseId = process.env.VITE_FIREBASE_DATABASE_ID || appletConfig.firestoreDatabaseId;
const db = getFirestore(app, databaseId);

const tastyBitesDishes = [
  // PIZZA - NORMAL FLAVOUR
  { name: "Tikka Pizza", description: "Normal Flavour", category: "Pizza", price: 440, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Small", price:440}, {name:"Medium", price:770}, {name:"Large", price:1100}] },
  { name: "Fajita Pizza", description: "Normal Flavour", category: "Pizza", price: 440, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Small", price:440}, {name:"Medium", price:770}, {name:"Large", price:1100}] },
  { name: "Hot N Spicy Pizza", description: "Normal Flavour", category: "Pizza", price: 440, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Small", price:440}, {name:"Medium", price:770}, {name:"Large", price:1100}] },
  { name: "Supreme Pizza", description: "Normal Flavour", category: "Pizza", price: 440, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Small", price:440}, {name:"Medium", price:770}, {name:"Large", price:1100}] },
  { name: "Mexican Pizza", description: "Normal Flavour", category: "Pizza", price: 440, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Small", price:440}, {name:"Medium", price:770}, {name:"Large", price:1100}] },
  { name: "Vaggi Lover Pizza", description: "Normal Flavour", category: "Pizza", price: 440, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Small", price:440}, {name:"Medium", price:770}, {name:"Large", price:1100}] },

  // PIZZA - PREMIUM FLAVOUR
  { name: "Peri Peri Pizza", description: "Premium Flavour", category: "Pizza", price: 610, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Small", price:610}, {name:"Medium", price:990}, {name:"Large", price:1540}] },
  { name: "Chilli Chicken Pizza", description: "Premium Flavour", category: "Pizza", price: 610, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Small", price:610}, {name:"Medium", price:990}, {name:"Large", price:1540}] },
  { name: "Garlic Creamy Tikka", description: "Premium Flavour", category: "Pizza", price: 610, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Small", price:610}, {name:"Medium", price:990}, {name:"Large", price:1540}] },
  { name: "Spicy Runch Pizza", description: "Premium Flavour", category: "Pizza", price: 610, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Small", price:610}, {name:"Medium", price:990}, {name:"Large", price:1540}] },
  { name: "BBQ Tikka Pizza", description: "Premium Flavour", category: "Pizza", price: 610, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Small", price:610}, {name:"Medium", price:990}, {name:"Large", price:1540}] },
  { name: "Afghani Feast Pizza", description: "Premium Flavour", category: "Pizza", price: 610, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Small", price:610}, {name:"Medium", price:990}, {name:"Large", price:1540}] },
  { name: "Chilli Garlic Cream", description: "Premium Flavour", category: "Pizza", price: 610, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Small", price:610}, {name:"Medium", price:990}, {name:"Large", price:1540}] },
  { name: "Bihari Boti Pizza", description: "Premium Flavour", category: "Pizza", price: 610, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Small", price:610}, {name:"Medium", price:990}, {name:"Large", price:1540}] },

  // PIZZA - ROYALE FLAVOUR
  { name: "Tastybites Special Pizza", description: "Royale Flavour", category: "Pizza", price: 550, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Small", price:550}, {name:"Medium", price:880}, {name:"Large", price:1320}] },
  { name: "Creamy Pizza", description: "Royale Flavour", category: "Pizza", price: 550, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Small", price:550}, {name:"Medium", price:880}, {name:"Large", price:1320}] },
  { name: "Malai Boti", description: "Royale Flavour", category: "Pizza", price: 550, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Small", price:550}, {name:"Medium", price:880}, {name:"Large", price:1320}] },
  { name: "All Cheese", description: "Royale Flavour", category: "Pizza", price: 550, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Small", price:550}, {name:"Medium", price:880}, {name:"Large", price:1320}] },
  { name: "Kabab Dlight", description: "Royale Flavour", category: "Pizza", price: 550, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Small", price:550}, {name:"Medium", price:880}, {name:"Large", price:1320}] },
  { name: "Mughlai Beast Pizza", description: "Royale Flavour", category: "Pizza", price: 550, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Small", price:550}, {name:"Medium", price:880}, {name:"Large", price:1320}] },

  // PIZZA - CRUST FLAVOUR
  { name: "Kababish Pizza", description: "Crust Flavour", category: "Pizza", price: 990, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Medium", price:990}, {name:"Large", price:1540}] },
  { name: "Crown Crust Pizza", description: "Crust Flavour", category: "Pizza", price: 990, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Medium", price:990}, {name:"Large", price:1540}] },
  { name: "Crown Lover Pizza", description: "Crust Flavour", category: "Pizza", price: 990, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Medium", price:990}, {name:"Large", price:1540}] },
  { name: "Souce Crust Pizza", description: "Crust Flavour", category: "Pizza", price: 990, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Medium", price:990}, {name:"Large", price:1540}] },
  { name: "Kofta Kabab Pizza", description: "Crust Flavour", category: "Pizza", price: 990, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Medium", price:990}, {name:"Large", price:1540}] },
  { name: "Melt Malai Pizza", description: "Crust Flavour", category: "Pizza", price: 990, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Medium", price:990}, {name:"Large", price:1540}] },
  { name: "Cheese Crust Pizza", description: "Crust Flavour", category: "Pizza", price: 990, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Medium", price:990}, {name:"Large", price:1540}] },
  { name: "Chees Stick Pizza", description: "Crust Flavour", category: "Pizza", price: 990, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Medium", price:990}, {name:"Large", price:1540}] },

  // BURGERS
  { name: "Tastys Zinger", category: "Burgers", price: 500, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, addOns: [{name:"Extra Cheese", price:110}, {name:"Extra Sauce", price:60}] },
  { name: "Zinger Burger", category: "Burgers", price: 390, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, addOns: [{name:"Extra Cheese", price:110}, {name:"Extra Sauce", price:60}] },
  { name: "Chicken Single Patty Burger", category: "Burgers", price: 330, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, addOns: [{name:"Extra Cheese", price:110}, {name:"Extra Sauce", price:60}] },
  { name: "Chicken Double Patty Burger", category: "Burgers", price: 550, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, addOns: [{name:"Extra Cheese", price:110}, {name:"Extra Sauce", price:60}] },
  { name: "Crunch Burger", category: "Burgers", price: 280, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, addOns: [{name:"Extra Cheese", price:110}, {name:"Extra Sauce", price:60}] },
  { name: "Mighty Burger", category: "Burgers", price: 660, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, addOns: [{name:"Extra Cheese", price:110}, {name:"Extra Sauce", price:60}] },
  { name: "Pizza Burger", category: "Burgers", price: 660, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, addOns: [{name:"Extra Cheese", price:110}, {name:"Extra Sauce", price:60}] },
  { name: "Tastys Signature", category: "Burgers", price: 880, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, addOns: [{name:"Extra Cheese", price:110}, {name:"Extra Sauce", price:60}] },
  { name: "Jumbo Patty Burger", category: "Burgers", price: 440, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, addOns: [{name:"Extra Cheese", price:110}, {name:"Extra Sauce", price:60}] },
  { name: "Jumbo Double Patty Burger", category: "Burgers", price: 660, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, addOns: [{name:"Extra Cheese", price:110}, {name:"Extra Sauce", price:60}] },
  { name: "MAC Burger", category: "Burgers", price: 660, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, addOns: [{name:"Extra Cheese", price:110}, {name:"Extra Sauce", price:60}] },

  // BEEF BURGERS
  { name: "Beef Single Patty Burger", category: "Burgers", price: 330, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, addOns: [{name:"Extra Cheese", price:110}, {name:"Extra Sauce", price:60}] },
  { name: "Beef Double Party Burger", category: "Burgers", price: 550, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, addOns: [{name:"Extra Cheese", price:110}, {name:"Extra Sauce", price:60}] },
  { name: "Full Fried Burger", category: "Burgers", price: 660, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, addOns: [{name:"Extra Cheese", price:110}, {name:"Extra Sauce", price:60}] },
  { name: "Cheese Beef Burger", category: "Burgers", price: 660, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, addOns: [{name:"Extra Cheese", price:110}, {name:"Extra Sauce", price:60}] },
  { name: "Lava Beef Burger", category: "Burgers", price: 880, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, addOns: [{name:"Extra Cheese", price:110}, {name:"Extra Sauce", price:60}] },

  // GRILLED BURGERS
  { name: "Grilled Charcoal Burger", category: "Burgers", price: 500, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, addOns: [{name:"Extra Cheese", price:110}, {name:"Extra Sauce", price:60}] },
  { name: "Grilled Jalapeno Burger", category: "Burgers", price: 550, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, addOns: [{name:"Extra Cheese", price:110}, {name:"Extra Sauce", price:60}] },

  // BROAST
  { name: "Broast 2Pc", category: "Broast", price: 500, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },
  { name: "Chest Broast 2Pc", category: "Broast", price: 550, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },
  { name: "Injected Broast 2Pc with Bun", category: "Broast", price: 610, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },
  { name: "Fried Chicken Per Pc", category: "Broast", price: 220, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },
  { name: "Hot Wings 8Pc", category: "Broast", price: 610, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },
  { name: "Sweet Chili Wings 8Pc", category: "Broast", price: 720, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },
  { name: "BBQ Wings 8Pc", category: "Broast", price: 720, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },
  { name: "Garlic Wings 8Pc", category: "Broast", price: 720, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },
  { name: "Peri Peri Wings 8Pc", category: "Broast", price: 720, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },
  { name: "Honey Mustard Wings 8Pc", category: "Broast", price: 720, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },
  { name: "Nuggets 10Pc", category: "Broast", price: 550, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },

  // ROLLS
  { name: "Grilled Paratha Roll", category: "Rolls & Wraps", price: 220, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },
  { name: "Grilled Cheese Paratha Roll", category: "Rolls & Wraps", price: 280, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },
  { name: "Mayo Roll", category: "Rolls & Wraps", price: 220, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },
  { name: "Vaggi Roll", category: "Rolls & Wraps", price: 220, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },
  { name: "Zingratha Roll", category: "Rolls & Wraps", price: 330, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },
  { name: "Twister Roll", category: "Rolls & Wraps", price: 390, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },

  // WRAPS
  { name: "Tortilla Wrap", category: "Rolls & Wraps", price: 550, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },
  { name: "Burrito Wrap", category: "Rolls & Wraps", price: 550, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },
  { name: "Grilled Wrap", category: "Rolls & Wraps", price: 550, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },

  // LAZANIA
  { name: "Plan Lazania", category: "Lazania", price: 550, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Small", price:550}, {name:"Large", price:660}] },
  { name: "Fajita Lazania", category: "Lazania", price: 610, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Small", price:610}, {name:"Large", price:720}] },
  { name: "Malai Boti Lazania", category: "Lazania", price: 610, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Small", price:610}, {name:"Large", price:720}] },
  { name: "Crispy Lazania", category: "Lazania", price: 660, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Small", price:660}, {name:"Large", price:830}] },

  // PASTA
  { name: "Creamy Pasta", category: "Pasta", price: 440, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Small", price:440}, {name:"Large", price:660}] },
  { name: "Cheese Pasta", category: "Pasta", price: 440, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Small", price:440}, {name:"Large", price:660}] },
  { name: "Red Sauce Pasta", category: "Pasta", price: 440, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Small", price:440}, {name:"Large", price:660}] },
  { name: "Crispy Pasta", category: "Pasta", price: 660, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Small", price:660}, {name:"Large", price:830}] },
  { name: "Alfrido Pasta", category: "Pasta", price: 660, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true, sizes: [{name:"Small", price:660}, {name:"Large", price:830}] },

  // FRIES
  { name: "Crispy Fries 100gr", category: "Fries", price: 170, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },
  { name: "Crispy Fries 200gr", category: "Fries", price: 280, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },
  { name: "Crispy Masala Fries", category: "Fries", price: 390, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },
  { name: "Crispy Pizza Fries", category: "Fries", price: 610, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },
  { name: "Crispy Loaded Fries", category: "Fries", price: 720, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },
  { name: "Chicken Salad", category: "Fries", price: 550, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },

  // PARATHA
  { name: "Pizza Paratha", category: "Paratha", price: 440, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },
  { name: "Chocolate Paratha", category: "Paratha", price: 440, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },
  { name: "Cheese Paratha", category: "Paratha", price: 390, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },
  { name: "Plan Paratha", category: "Paratha", price: 110, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },
  { name: "Malai Boti Pizza Paratha", category: "Paratha", price: 550, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },

  // SANDWICH
  { name: "Grilled Sandwich", category: "Sandwich", price: 500, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },
  { name: "Malai Boti Sandwich", category: "Sandwich", price: 440, type: "food", restaurantName: "Tasty Bites Dadu", isAvailable: true },
];

async function seed() {
  const dishesRef = collection(db, "menu");
  
  // also add categories if they don't exist
  const categories = ["Pizza", "Burgers", "Broast", "Rolls & Wraps", "Lazania", "Pasta", "Fries", "Paratha", "Sandwich"];
  const categoriesRef = collection(db, "foodCategories");
  
  try {
    for (const cat of categories) {
      await setDoc(doc(categoriesRef, `cat_${cat.replace(/\\s+/g, '')}`), {
        name: cat,
        isAvailable: true,
        position: 1
      }, { merge: true });
      console.log("Added category", cat);
    }
  } catch(e) { console.error("Categories failed", e); }

  try {
    for (const dish of tastyBitesDishes) {
      const docRef = doc(collection(db, "menu"));
      await setDoc(docRef, {
        ...dish,
        id: docRef.id,
        imageUrl: "",
        createdAt: new Date()
      });
      console.log("Added dish", dish.name);
    }
  } catch(e) { console.error("Dishes failed", e); }

  try {
    const sysRef = doc(db, "settings", "delivery_config");
    await setDoc(sysRef, {
      restaurantStatuses: {
        "Tasty Bites Dadu": {
          isTemporarilyUnavailable: false,
          openingTime: "12:00",
          closingTime: "01:00",
          phone: "0313-6422243",
          whatsapp: "0308-6422243",
          address: "Shahani Muhalla, near Cambridge School Dadu",
          tagline: "The Taste of Trust",
          minOrder: 300,
          deliveryCharge: "Rs. 50-100",
          commission: 10,
          rating: 4.5
        }
      }
    }, { merge: true });
    console.log("Updated settings");
  } catch(e) { console.error("Settings failed", e); }
  
  process.exit();
}

seed().catch(console.error);
