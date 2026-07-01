import React, { useState, useEffect } from "react";
import {
  UserProfile,
  Dish,
  Order,
  SystemSettings,
  AppNotification,
  FoodCategory,
  GroceryCategory,
  GroceryProduct,
  GroceryDeliveryConfig,
} from "../types";
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  addDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  getDocs,
  getFirestore,
} from "firebase/firestore";
import { db, firebaseConfig, databaseId, cleanObject, storage } from "../firebase";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Plus,
  Settings,
  LayoutDashboard,
  ShoppingCart,
  ListCollapse,
  ToggleLeft,
  ToggleRight,
  Trash2,
  HelpCircle,
  RefreshCw,
  Smartphone,
  TrendingUp,
  DollarSign,
  Package,
  CheckCheck,
  Save,
  Send,
  EyeOff,
  Wrench,
  UserPlus,
  User,
  Loader2,
  Key,
  Truck,
  Compass,
  Phone,
  ShoppingBasket,
  AlertTriangle,
  Users,
  Percent,
  Clock,
  X,
  Globe,
  Grid,
  Pencil,
  Star,
} from "lucide-react";

interface AdminPanelProps {
  dishes: Dish[];
  orders: Order[];
  onClose: () => void;
  adminUsername: string;
  deliverySettings: SystemSettings;
  foodCategories: FoodCategory[];
  groceryCategories: GroceryCategory[];
  groceryProducts: GroceryProduct[];
  groceryDeliveryConfig: GroceryDeliveryConfig;
}

interface ProductImageSelectorProps {
  imageUrl: string;
  onChange: (url: string) => void;
  accentColorClass?: "amber" | "orange" | "purple" | "blue" | "emerald";
  label: string;
  placeholder?: string;
  uploadPath?: string;
}

function ProductImageSelector({
  imageUrl,
  onChange,
  accentColorClass = "amber",
  label,
  placeholder,
  uploadPath,
}: ProductImageSelectorProps) {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [mode, setMode] = React.useState<"url" | "file">("file");
  const [urlInput, setUrlInput] = React.useState(imageUrl || "");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [uploadError, setUploadError] = React.useState("");
  const [failedFile, setFailedFile] = React.useState<File | null>(null);

  React.useEffect(() => {
    setUrlInput(imageUrl || "");
  }, [imageUrl]);

  const handleUrlChange = (val: string) => {
    setUrlInput(val);
    onChange(val);
  };

  const processFile = async (file: File) => {
    setUploadError("");
    setFailedFile(null);
    setUploadProgress(0);

    const validTypes = ["image/png", "image/jpg", "image/jpeg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Invalid format. Please select PNG, JPG, JPEG, or WEBP.");
      setFailedFile(file);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File too large. Maximum size is 5MB.");
      setFailedFile(file);
      return;
    }

    setIsProcessing(true);
    setUploadProgress(30);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setUploadProgress(60);
          const canvas = document.createElement("canvas");
          
          // Max dimensions
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
            setUploadProgress(100);
            onChange(dataUrl);
            setIsProcessing(false);
          } else {
            throw new Error("Failed to get canvas context");
          }
        };
        img.onerror = () => {
          setUploadError("Error reading image file");
          setIsProcessing(false);
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        setUploadError("Error reading file");
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setUploadError("Error processing image");
      setFailedFile(file);
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-2 mt-1">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
          {label}
        </label>
        <div className="flex rounded-lg bg-white border border-slate-200 p-0.5 border border-slate-200">
          <button
            type="button"
            onClick={() => setMode("file")}
            className={`px-2 py-0.5 text-[8px] uppercase font-black tracking-wide rounded transition cursor-pointer ${
              mode === "file"
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Local File
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`px-2 py-0.5 text-[8px] uppercase font-black tracking-wide rounded transition cursor-pointer ${
              mode === "url"
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Image Link/URL
          </button>
        </div>
      </div>

      {mode === "file" ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-3 text-center transition relative flex flex-col items-center justify-center min-h-[95px] ${
            isDragOver
              ? accentColorClass === "amber"
                ? "border-[#D70F64] bg-[#D70F64]/5"
                : "border-orange-500 bg-pink-500/5"
              : "border-slate-200 hover:border-slate-300 bg-white border border-slate-200/50"
          }`}
        >
          <input
            type="file"
            accept="image/png, image/jpeg, image/jpg, image/webp"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          {isProcessing ? (
            <div className="flex flex-col items-center space-y-2 w-full px-4 relative z-10 pointer-events-none">
              <Loader2 className="w-5 h-5 text-[#D70F64] animate-spin" />
              <span className="text-[9px] text-slate-600 font-extrabold uppercase tracking-wider">
                Uploading Image... {Math.round(uploadProgress)}%
              </span>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full bg-${accentColorClass}-500 transition-all duration-300`} 
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : uploadError ? (
            <div className="flex flex-col items-center gap-2 relative z-10 p-2">
              <AlertTriangle className="w-6 h-6 text-pink-500 mb-1" />
              <p className="text-[10px] text-pink-400 font-bold text-center leading-tight">
                {uploadError}
              </p>
              {failedFile && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    processFile(failedFile);
                  }}
                  className="bg-pink-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 text-[10px] font-black px-4 py-1.5 rounded-lg mt-1 transition-colors pointer-events-auto"
                >
                  RETRY UPLOAD
                </button>
              )}
            </div>
          ) : imageUrl ? (
            <div className="flex flex-col items-center gap-2 relative z-10 pointer-events-none w-full">
              <img
                src={imageUrl}
                alt="Upload Preview"
                className="h-16 w-auto max-w-full object-contain rounded-lg border border-slate-200 shadow-md bg-black/50"
                referrerPolicy="no-referrer"
              />
              <div className="flex gap-2 pointer-events-auto mt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const input = e.currentTarget.parentElement?.parentElement?.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
                    if (input) input.click();
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-[10px] font-bold px-3 py-1.5 rounded-md text-white transition-colors border border-slate-300"
                >
                  Change Image
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange("");
                  }}
                  className="bg-red-500/10 hover:bg-red-500/20 text-[10px] font-bold px-3 py-1.5 rounded-md text-pink-400 transition-colors border border-red-500/20"
                >
                  Remove Image
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1 relative z-10 pointer-events-none">
              <p className="text-[10px] text-slate-600 font-bold">
                Drag & drop image here or{" "}
                <span
                  className={
                    accentColorClass === "amber"
                      ? "text-[#D70F64] font-black"
                      : "text-pink-500 font-black"
                  }
                >
                  Browse
                </span>
              </p>
              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">
                Max 5MB (PNG, JPG, JPEG, WEBP)
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            value={urlInput || ""}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder={placeholder || "Paste image web address (https://...)"}
            className="w-full p-2.5 bg-white border border-slate-200 border border-slate-200 rounded-xl text-slate-900 outline-none text-slate-900 focus:border-[#D70F64]/85 transition text-xs font-mono font-medium"
          />
          {imageUrl && (
            <div className="flex items-center gap-3 p-2 bg-white border border-slate-200 border border-slate-200 rounded-xl">
              <img
                src={imageUrl}
                alt="URL Preview"
                className="h-10 w-10 object-cover rounded-lg border border-slate-200 shrink-0"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              <div className="truncate flex-1">
                <p className="text-[9px] font-bold text-slate-600">
                  Live Web Preview connected
                </p>
                <p className="text-[8.5px] text-slate-500 truncate font-mono">
                  {imageUrl}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-red-500 hover:text-pink-400 text-[10px] font-extrabold uppercase shrink-0 px-2 cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminPanel({
  dishes,
  orders,
  onClose,
  adminUsername,
  deliverySettings,
  foodCategories = [],
  groceryCategories = [],
  groceryProducts = [],
  groceryDeliveryConfig,
}: AdminPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    | "analytics"
    | "restaurants"
    | "items"
    | "orders"
    | "riders"
    | "grocery"
    | "services"
    | "users"
    | "seo"
  >("analytics");
  const [allUsersList, setAllUsersList] = useState<UserProfile[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");

  // Dynamic Restaurants list based on unique values in dishes and existing config
  const uniqueRestaurants = Array.from(
    new Set([
      ...dishes.map(
        (d) =>
          d.restaurantName ||
          (d.type === "service"
            ? "Dadu Home Services"
            : "Dadu Fast Food & Kitchen"),
      ),
      ...Object.keys(deliverySettings?.restaurantStatuses || {}),
    ]),
  );
  const [selectedScheduleRestaurant, setSelectedScheduleRestaurant] = useState(
    uniqueRestaurants[0] || "Dadu Fast Food & Kitchen",
  );

  // Delivery config state
  const [deliveryChargeInput, setDeliveryChargeInput] = useState(
    deliverySettings?.deliveryFee || 50,
  );
  const [minOrderAmountInput, setMinOrderAmountInput] = useState(
    deliverySettings?.minOrderAmount || 0,
  );

  // Restaurant Status Management
  const [restStatusUnavailable, setRestStatusUnavailable] = useState(false);
  const [restOpeningTime, setRestOpeningTime] = useState("09:00");
  const [restClosingTime, setRestClosingTime] = useState("23:00");
  const [restImageUrl, setRestImageUrl] = useState("");
  const [restPhone, setRestPhone] = useState("");
  const [restMinOrder, setRestMinOrder] = useState("");
  const [restDeliveryCharge, setRestDeliveryCharge] = useState("");
  const [newRestaurantInput, setNewRestaurantInput] = useState("");

  // Deal of the Hour states
  const [dealActive, setDealActive] = useState(true);
  const [dealTimer, setDealTimer] = useState(30);
  const [dealDiscount, setDealDiscount] = useState(25);
  const [dealItems, setDealItems] = useState<string[]>([]);
  const [dealText, setDealText] = useState("");

  // SEO States
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");

  // Sync state when props or selected restaurant change
  useEffect(() => {
    if (deliverySettings) {
      setDeliveryChargeInput(deliverySettings.deliveryFee || 50);
      setMinOrderAmountInput(deliverySettings.minOrderAmount || 0);

      // Load specific restaurant status or fallback to global/default
      const specificStatus =
        deliverySettings.restaurantStatuses?.[selectedScheduleRestaurant];
      if (specificStatus) {
        setRestStatusUnavailable(specificStatus.isTemporarilyUnavailable);
        setRestOpeningTime(specificStatus.openingTime);
        setRestClosingTime(specificStatus.closingTime);
        setRestImageUrl(specificStatus.imageUrl || "");
        setRestPhone(specificStatus.phone || "");
        setRestMinOrder(specificStatus.minOrder?.toString() || "");
        setRestDeliveryCharge(specificStatus.deliveryCharge || "");
      } else {
        setRestStatusUnavailable(false);
        setRestOpeningTime("09:00");
        setRestClosingTime("23:00");
        setRestImageUrl("");
        setRestPhone("");
        setRestMinOrder("");
        setRestDeliveryCharge("");
      }
    }
  }, [deliverySettings, selectedScheduleRestaurant]);

  // Live Deal of the Hour settings subscription
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "settings", "deal_config"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDealActive(data.isActive !== false);
          setDealTimer(data.timerMinutes || 30);
          setDealDiscount(data.discountPercentage || 25);
          setDealItems(data.selectedItemIds || []);
          setDealText(data.dealText || "");
        }
      },
      (err) => {
        console.warn(
          "Error subscribing to deal config inside AdminPanel:",
          err,
        );
      },
    );

    const unsubscribeSeo = onSnapshot(
      doc(db, "settings", "seo_config"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSeoTitle(data.title || "");
          setSeoDescription(data.description || "");
          setSeoKeywords(data.keywords || "");
        }
      },
    );

    return () => {
      unsubscribe();
      unsubscribeSeo();
    };
  }, []);

  const handleSaveDealConfig = async () => {
    try {
      await setDoc(doc(db, "settings", "deal_config"), {
        isActive: dealActive,
        timerMinutes: Number(dealTimer),
        discountPercentage: Number(dealDiscount),
        selectedItemIds: dealItems,
        dealText:
          dealText || `Save ${dealDiscount}% on our selected items! Hurry!`,
      });
      alert(`Deal of the Hour successfully saved!`);
    } catch (err) {
      console.error(err);
      alert("Error saving Deal of the Hour configuration.");
    }
  };

  const handleMigrateCategories = async () => {
    try {
      const categoryMap: Record<string, string> = {
        "Tikka Pizza": "Pizza",
        "Fajita Pizza": "Pizza",
        "Hot N Spicy Pizza": "Pizza",
        "Supreme Pizza": "Pizza",
        "Mexican Pizza": "Pizza",
        "Vaggi Lover Pizza": "Pizza",
        "Peri Peri Pizza": "Pizza",
        "Chilli Chicken Pizza": "Pizza",
        "Garlic Creamy Tikka": "Pizza",
        "Spicy Runch Pizza": "Pizza",
        "BBQ Tikka Pizza": "Pizza",
        "Afghani Feast Pizza": "Pizza",
        "Chilli Garlic Cream": "Pizza",
        "Bihari Boti Pizza": "Pizza",
        "Tastybites Special Pizza": "Pizza",
        "Creamy Pizza": "Pizza",
        "Malai Boti": "Pizza",
        "All Cheese": "Pizza",
        "Kabab Dlight": "Pizza",
        "Mughlai Beast Pizza": "Pizza",
        "Kababish Pizza": "Pizza",
        "Crown Crust Pizza": "Pizza",
        "Crown Lover Pizza": "Pizza",
        "Souce Crust Pizza": "Pizza",
        "Kofta Kabab Pizza": "Pizza",
        "Melt Malai Pizza": "Pizza",
        "Cheese Crust Pizza": "Pizza",
        "Chees Stick Pizza": "Pizza",
        "Tastys Zinger": "Burgers",
        "Zinger Burger": "Burgers",
        "Chicken Single Patty Burger": "Burgers",
        "Chicken Double Patty Burger": "Burgers",
        "Crunch Burger": "Burgers",
        "Mighty Burger": "Burgers",
        "Pizza Burger": "Burgers",
        "Tastys Signature": "Burgers",
        "Jumbo Patty Burger": "Burgers",
        "Jumbo Double Patty Burger": "Burgers",
        "MAC Burger": "Burgers",
        "Beef Single Patty Burger": "Burgers",
        "Beef Double Party Burger": "Burgers",
        "Full Fried Burger": "Burgers",
        "Cheese Beef Burger": "Burgers",
        "Lava Beef Burger": "Burgers",
        "Grilled Charcoal Burger": "Burgers",
        "Grilled Jalapeno Burger": "Burgers",
        "Broast 2Pc": "Broast",
        "Chest Broast 2Pc": "Broast",
        "Injected Broast 2Pc with Bun": "Broast",
        "Fried Chicken Per Pc": "Broast",
        "Hot Wings 8Pc": "Broast",
        "Sweet Chili Wings 8Pc": "Broast",
        "BBQ Wings 8Pc": "Broast",
        "Garlic Wings 8Pc": "Broast",
        "Peri Peri Wings 8Pc": "Broast",
        "Honey Mustard Wings 8Pc": "Broast",
        "Nuggets 10Pc": "Broast",
        "Grilled Paratha Roll": "Rolls & Wraps",
        "Grilled Cheese Paratha Roll": "Rolls & Wraps",
        "Mayo Roll": "Rolls & Wraps",
        "Vaggi Roll": "Rolls & Wraps",
        "Zingratha Roll": "Rolls & Wraps",
        "Twister Roll": "Rolls & Wraps",
        "Tortilla Wrap": "Rolls & Wraps",
        "Burrito Wrap": "Rolls & Wraps",
        "Grilled Wrap": "Rolls & Wraps",
        "Creamy Pasta": "Pasta",
        "Cheese Pasta": "Pasta",
        "Red Sauce Pasta": "Pasta",
        "Crispy Pasta": "Pasta",
        "Alfrido Pasta": "Pasta",
        "Plan Lazania": "Lazania",
        "Fajita Lazania": "Lazania",
        "Malai Boti Lazania": "Lazania",
        "Crispy Lazania": "Lazania",
        "Crispy Fries 100gr": "Fries",
        "Crispy Fries 200gr": "Fries",
        "Crispy Masala Fries": "Fries",
        "Crispy Pizza Fries": "Fries",
        "Crispy Loaded Fries": "Fries",
        "Chicken Salad": "Fries",
        "Pizza Paratha": "Paratha",
        "Chocolate Paratha": "Paratha",
        "Cheese Paratha": "Paratha",
        "Plan Paratha": "Paratha",
        "Malai Boti Pizza Paratha": "Paratha",
        "Grilled Sandwich": "Sandwich",
        "Malai Boti Sandwich": "Sandwich",
      };

      let count = 0;
      for (const dish of dishes) {
        const correctCategory = categoryMap[dish.name.trim()];
        if (correctCategory && dish.category !== correctCategory) {
          await updateDoc(doc(db, "menu", dish.id), {
            category: correctCategory,
          });
          count++;
        }
      }
      alert(`Migrated ${count} items!`);
    } catch (err) {
      console.error(err);
      alert("Error migrating");
    }
  };

  const [newFoodCategory, setNewFoodCategory] = useState({
    name: "",
    subtitle: "",
    imageUrl: "",
    emoji: "",
    color: "from-[#D70F64] to-rose-600",
    position: 0,
    isAvailable: true,
  });

  const handleAddFoodCategory = async () => {
    if (!newFoodCategory.name) {
      alert("Name is required");
      return;
    }
    try {
      const catId = `cat_${Date.now()}`;
      await setDoc(doc(db, "foodCategories", catId), {
        ...newFoodCategory,
        id: catId,
      });
      setNewFoodCategory({
        name: "",
        subtitle: "",
        imageUrl: "",
        emoji: "",
        color: "from-[#D70F64] to-rose-600",
        position: 0,
        isAvailable: true,
      });
      alert("Category added successfully!");
    } catch (err) {
      console.error(err);
      alert("Error adding category");
    }
  };

  const handleDeleteFoodCategory = async (id: string) => {
    if (confirm("Are you sure you want to delete this category?")) {
      try {
        await deleteDoc(doc(db, "foodCategories", id));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleUpdateFoodCategory = async () => {
    if (!editingFoodCategory || !editingFoodCategory.name) return;
    try {
      await updateDoc(doc(db, "foodCategories", editingFoodCategory.id), {
        ...editingFoodCategory
      });
      setEditingFoodCategory(null);
      alert("Category updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update category.");
    }
  };

  const handleSaveSeoConfig = async () => {
    try {
      await setDoc(
        doc(db, "settings", "seo_config"),
        {
          title: seoTitle,
          description: seoDescription,
          keywords: seoKeywords,
        },
        { merge: true },
      );
      alert(`SEO settings successfully saved!`);
    } catch (err) {
      console.error(err);
      alert("Error saving SEO configuration.");
    }
  };

  // Grocery settings inputs
  const [gBaseDeliveryFee, setGBaseDeliveryFee] = useState(
    groceryDeliveryConfig?.baseDeliveryFee || 40,
  );
  const [gFreeDeliveryAbove, setGFreeDeliveryAbove] = useState(
    groceryDeliveryConfig?.freeDeliveryAboveAmount || 1000,
  );
  const [gAllowMixed, setGAllowMixed] = useState(
    groceryDeliveryConfig?.allowMixedCart ?? false,
  );

  // Form states for adding grocery category
  const [newCatName, setNewCatName] = useState("");
  const [newCatImageUrl, setNewCatImageUrl] = useState("");
  const [newCatPosition, setNewCatPosition] = useState(1);

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editingCategoryImageUrl, setEditingCategoryImageUrl] = useState("");

  const [editingFoodCategory, setEditingFoodCategory] = useState<FoodCategory | null>(null);

  // Form states for adding grocery product
  const [newGProdName, setNewGProdName] = useState("");
  const [newGProdImageUrl, setNewGProdImageUrl] = useState("");
  const [newGProdPrice, setNewGProdPrice] = useState<number>(100);
  const [newGProdDiscountPrice, setNewGProdDiscountPrice] = useState<number>(0);
  const [newGProdUnit, setNewGProdUnit] = useState<
    "kg" | "litre" | "piece" | "pack"
  >("kg");
  const [newGProdStock, setNewGProdStock] = useState<number>(10);
  const [newGProdCategoryId, setNewGProdCategoryId] = useState("");
  const [newGProdCommission, setNewGProdCommission] = useState<number>(0);

  // Edit grocery states
  const [editingGProductId, setEditingGProductId] = useState<string | null>(
    null,
  );
  const [editingGProdPriceInput, setEditingGProdPriceInput] =
    useState<number>(0);
  const [editingGProdStockInput, setEditingGProdStockInput] =
    useState<number>(0);
  const [editingGProdCommissionInput, setEditingGProdCommissionInput] =
    useState<number>(0);

  // Form states for adding items
  const [newItemName, setNewItemName] = useState("");
  const [isImportingTasty, setIsImportingTasty] = useState(false);
  const [importProgressTasty, setImportProgressTasty] = useState(0);
  const [newItemCategory, setNewItemCategory] =
    useState<Dish["category"]>("Burgers");
  const [newItemPrice, setNewItemPrice] = useState<number>(300);
  const [newItemDiscountPrice, setNewItemDiscountPrice] = useState<number>(0);
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemImageUrl, setNewItemImageUrl] = useState("");
  const [newItemType, setNewItemType] = useState<"food" | "service">("food");
  const [newItemServiceDuration, setNewItemServiceDuration] = useState("");
  const [newItemRestaurantName, setNewItemRestaurantName] = useState("");
  const [newItemCommission, setNewItemCommission] = useState<number>(0);
  const [newItemSizes, setNewItemSizes] = useState<
    { name: string; price: number; imageUrl?: string }[]
  >([]);
  const [newItemFlavors, setNewItemFlavors] = useState<
    {
      name: string;
      price: number;
      imageUrl?: string;
      isPopular?: boolean;
      originalPrice?: number;
    }[]
  >([]);
  const [newItemAddOns, setNewItemAddOns] = useState<
    { name: string; price: number; imageUrl?: string; originalPrice?: number }[]
  >([]);

  // Inline editing state for prices
  const [editingPriceDishId, setEditingPriceDishId] = useState<string | null>(
    null,
  );
  const [editingImageUrl, setEditingImageUrl] = useState<string>("");
  const [editingNameInput, setEditingNameInput] = useState<string>("");
  const [editingPriceInput, setEditingPriceInput] = useState<number>(0);
  const [editingDiscountPriceInput, setEditingDiscountPriceInput] =
    useState<number>(0);
  const [editingCommissionInput, setEditingCommissionInput] =
    useState<number>(0);
  const [editingSizes, setEditingSizes] = useState<
    { name: string; price: number; imageUrl?: string }[]
  >([]);
  const [editingFlavors, setEditingFlavors] = useState<
    {
      name: string;
      price: number;
      imageUrl?: string;
      isPopular?: boolean;
      originalPrice?: number;
    }[]
  >([]);
  const [editingAddOns, setEditingAddOns] = useState<
    { name: string; price: number; imageUrl?: string; originalPrice?: number }[]
  >([]);

  // Custom confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  // User Verification Lock System States & Helpers
  const [unlockingUser, setUnlockingUser] = useState<UserProfile | null>(null);
  const [unlockArea, setUnlockArea] = useState("");
  const [unlockStreet, setUnlockStreet] = useState("");
  const [unlockLandmark, setUnlockLandmark] = useState("");
  const [unlockNotes, setUnlockNotes] = useState("");
  const [unlockCoords, setUnlockCoords] = useState<{ lat?: number; lng?: number } | null>(null);
  const [isDetectingUnlockGPS, setIsDetectingUnlockGPS] = useState(false);
  const [newUserToast, setNewUserToast] = useState<{ phone: string; show: boolean } | null>(null);
  const isFirstLoadRef = React.useRef(true);

  const playNewUserAlert = (phone: string) => {
    // 1. Play Sound (Dual tone alert beep)
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sawtooth";
        osc1.frequency.setValueAtTime(440, now); // A4
        osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
        gain1.gain.setValueAtTime(0.12, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.3);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(660, now + 0.15); // E5
        osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
        gain2.gain.setValueAtTime(0.12, now + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.15);
        osc2.stop(now + 0.45);
      }
    } catch (e) {
      console.error(e);
    }

    // 2. Vibration
    try {
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    } catch (e) {
      console.error(e);
    }

    // 3. New User Toast notification
    setNewUserToast({
      phone: phone,
      show: true,
    });
    setTimeout(() => {
      setNewUserToast((prev) => (prev?.phone === phone ? { ...prev, show: false } : prev));
    }, 6000);
  };

  const handleDetectUnlockGPS = () => {
    if (unlockingUser?.savedLocation?.lat && unlockingUser?.savedLocation?.lng) {
      const lat = unlockingUser.savedLocation.lat;
      const lng = unlockingUser.savedLocation.lng;
      setUnlockCoords({ lat, lng });
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, "_blank");
      return;
    }
    
    setIsDetectingUnlockGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUnlockCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setIsDetectingUnlockGPS(false);
        window.open(`https://www.google.com/maps/search/?api=1&query=${pos.coords.latitude},${pos.coords.longitude}`, "_blank");
      },
      (err) => {
        setIsDetectingUnlockGPS(false);
        alert("Failed to acquire GPS location. Make sure location permissions are enabled.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockingUser) return;
    if (!unlockArea.trim() || !unlockStreet.trim()) {
      alert("Area/Mohalla and Street/Gali fields are required!");
      return;
    }

    try {
      const area = unlockArea.trim();
      const street = unlockStreet.trim();
      const landmark = unlockLandmark.trim();
      const notes = unlockNotes.trim();

      const savedLoc = {
        area,
        street,
        landmark,
        notes,
        lat: unlockCoords?.lat || null,
        lng: unlockCoords?.lng || null,
      };

      let formattedAddress = `${area}, ${street}`;
      if (landmark) formattedAddress += `, Near: ${landmark}`;
      if (notes) formattedAddress += ` (${notes})`;

      await updateDoc(doc(db, "users", unlockingUser.uid), {
        status: "verified",
        address: formattedAddress,
        savedLocation: savedLoc,
        unlockedAt: new Date(),
        unlockedBy: adminUsername || "admin",
      });

      setUnlockingUser(null);
      setUnlockArea("");
      setUnlockStreet("");
      setUnlockLandmark("");
      setUnlockNotes("");
      setUnlockCoords(null);

      alert(`✅ User ${unlockingUser.phone} unlocked successfully with delivery address!`);
    } catch (err) {
      console.error(err);
      alert("Failed to unlock user. Database permissions error.");
    }
  };

  // Rider/ETA state overrides
  const [riderNames, setRiderNames] = useState<{ [orderId: string]: string }>(
    {},
  );
  const [orderEtas, setOrderEtas] = useState<{ [orderId: string]: string }>({});

  // Alert dispatcher state
  const [alertTitle, setAlertTitle] = useState("Dadu Specials Alert!");
  const [alertMessage, setAlertMessage] = useState(
    "A new professional is ready to deliver hot burgers and help!",
  );

  // Rider registration form states
  const [riderNameInput, setRiderNameInput] = useState("");
  const [riderPhoneInput, setRiderPhoneInput] = useState("");
  const [riderPasswordInput, setRiderPasswordInput] = useState("");
  const [riderRegLoading, setRiderRegLoading] = useState(false);
  const [ridersSubset, setRidersSubset] = useState<UserProfile[]>([]);

  // Real-time listen to registered riders list
  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "rider"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: UserProfile[] = [];
        snapshot.forEach((doc) => {
          list.push({ uid: doc.id, ...doc.data() } as UserProfile);
        });
        setRidersSubset(list);
      },
      (err) => {
        console.error("Failed to fetch real-time riders:", err);
      },
    );
    return () => unsubscribe();
  }, []);

  // Real-time listen to all registered users list
  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: UserProfile[] = [];
        snapshot.forEach((doc) => {
          list.push({ uid: doc.id, ...doc.data() } as UserProfile);
        });

        // Detect new added users with status === 'locked' after the initial load
        if (!isFirstLoadRef.current) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
              const uData = change.doc.data();
              if (uData.status === "locked") {
                playNewUserAlert(uData.phone || change.doc.id);
              }
            }
          });
        } else {
          isFirstLoadRef.current = false;
        }

        setAllUsersList(list);
      },
      (err) => {
        console.error("Failed to fetch real-time users list:", err);
      },
    );
    return () => unsubscribe();
  }, []);

  // Sync state with incoming props real-time
  useEffect(() => {
    if (groceryDeliveryConfig) {
      setGBaseDeliveryFee(groceryDeliveryConfig.baseDeliveryFee);
      setGFreeDeliveryAbove(groceryDeliveryConfig.freeDeliveryAboveAmount);
      setGAllowMixed(groceryDeliveryConfig.allowMixedCart);
    }
  }, [groceryDeliveryConfig]);

  // Secure Rider Creator - Simplified to Name, Phone/Username, and Password as requested by user
  const handleRegisterRiderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = riderNameInput.trim();
    const phoneOrUsername = riderPhoneInput.trim();
    const password = riderPasswordInput;

    if (!name || !phoneOrUsername || !password) {
      alert("Name, Phone Number/Username and Password are required!");
      return;
    }
    if (password.length < 6) {
      alert("Password must be at least 6 characters long!");
      return;
    }

    const sanitizePhone = (phoneStr: string) => {
      let cleaned = phoneStr.replace(/\D/g, "");
      if (cleaned.startsWith("92")) {
        cleaned = "0" + cleaned.substring(2);
      }
      return cleaned;
    };

    const isUsername =
      /[a-zA-Z]/.test(phoneOrUsername) ||
      (phoneOrUsername.length > 0 &&
        phoneOrUsername.length < 10 &&
        !/^\d+$/.test(phoneOrUsername));
    const cleanPhone = isUsername
      ? phoneOrUsername.toLowerCase()
      : sanitizePhone(phoneOrUsername);

    setRiderRegLoading(true);
    let tempApp;
    try {
      const computedEmail = `${cleanPhone}@dadu247.com`;

      // 1. Check if user already exists in standard Firestore database first
      const q = query(
        collection(db, "users"),
        where("phone", "==", cleanPhone),
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        const existingDoc = snap.docs[0];
        const existingData = existingDoc.data() as UserProfile;

        if (existingData.role === "rider") {
          alert(
            `Rider "${existingData.name}" with phone/username "${cleanPhone}" is already registered (UID: ${existingData.uid}).`,
          );
          setRiderNameInput("");
          setRiderPhoneInput("");
          setRiderPasswordInput("");
          setRiderRegLoading(false);
          return;
        }

        const confirmUpgrade = window.confirm(
          `User "${existingData.name}" already exists in the system with role: "${existingData.role}".\nDo you want to escalate this user's profile to a Rider duty?`,
        );
        if (confirmUpgrade) {
          await updateDoc(doc(db, "users", existingData.uid), {
            role: "rider",
            vehicleNumber: "Active Rider",
          });
          alert(
            `Success! "${existingData.name}" has been upgraded to Rider duty successfully.`,
          );
          setRiderNameInput("");
          setRiderPhoneInput("");
          setRiderPasswordInput("");
          setRiderRegLoading(false);
          return;
        } else {
          setRiderRegLoading(false);
          return;
        }
      }

      // 2. Launch secondary Auth registration pipeline
      const uniqueAppName = `RiderApp_${Date.now()}`;
      tempApp = initializeApp(firebaseConfig, uniqueAppName);
      const tempAuth = getAuth(tempApp);
      const tempDb = databaseId
        ? getFirestore(tempApp, databaseId)
        : getFirestore(tempApp);

      let createdUid = "";
      try {
        // Create new Auth credential
        const userCredential = await createUserWithEmailAndPassword(
          tempAuth,
          computedEmail,
          password,
        );
        createdUid = userCredential.user.uid;
      } catch (authErr: any) {
        console.warn("Rider Auth registration warning:", authErr);
        const errCode = authErr?.code || "";
        const errMsg = authErr?.message || String(authErr);
        const joinedErr = `${errCode} ${errMsg}`.toLowerCase();

        const isEmailAlreadyInUse =
          errCode === "auth/email-already-in-use" ||
          joinedErr.includes("already-in-use") ||
          joinedErr.includes("already in use") ||
          joinedErr.includes("email-already-in-use") ||
          joinedErr.includes("already");

        if (isEmailAlreadyInUse) {
          // Attempt to log in with provided username and password to claim the already created account
          try {
            const userCredential = await signInWithEmailAndPassword(
              tempAuth,
              computedEmail,
              password,
            );
            createdUid = userCredential.user.uid;
          } catch (signinErr: any) {
            console.warn("Rider claiming sign-in mismatch warning:", signinErr);
            // Authentication profile exists but matches with a different password
            throw new Error(
              `This phone/username "${cleanPhone}" is already taken! Please choose a different unique phone or username.`,
            );
          }
        } else {
          throw authErr;
        }
      }

      // Create database record with role "rider"
      const newRiderProfile: UserProfile = {
        uid: createdUid,
        name: name,
        phone: cleanPhone,
        address: "Dadu Riders HQ",
        role: "rider",
        ordersCount: 0,
        vehicleNumber: "Active Rider",
      };

      await setDoc(doc(tempDb, "users", createdUid), newRiderProfile);

      alert(
        `Success! Rider "${name}" has been successfully registered with username/phone: "${cleanPhone}" and password: "${password}"!`,
      );

      // Clear states
      setRiderNameInput("");
      setRiderPhoneInput("");
      setRiderPasswordInput("");
    } catch (err: any) {
      console.error("Secured Rider Auth Creation failure:", err);
      const errMsg = err.message || String(err);
      alert("Registration feedback: " + errMsg);
    } finally {
      if (tempApp) {
        try {
          await deleteApp(tempApp);
        } catch (e) {
          console.error("Error deleting temp secondary app instance:", e);
        }
      }
      setRiderRegLoading(false);
    }
  };

  const handleDeleteRider = (uid: string, name: string) => {
    setConfirmDialog({
      title: "Delete Rider Profile",
      message: `Are you absolutely sure you want to PERMANENTLY delete and revoke Rider "${name}" access?`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "users", uid));
        } catch (err) {
          console.error("Failed to delete rider profile:", err);
          alert(
            "Error: Database permission denied or insufficient administrative credentials.",
          );
        }
      },
    });
  };

  // --- BUSINESS LOGIC MATH FOR ANALYTICS ---
  // Calculates live numbers
  const deliveredOrders = orders.filter(
    (o) => o.status === "delivered" || o.status === "completed",
  );
  const totalRevenue = deliveredOrders.reduce(
    (sum, o) => sum + o.grandTotal,
    0,
  );
  const totalCompletedCount = deliveredOrders.length;
  const totalCancelledCount = orders.filter(
    (o) => o.status === "cancelled",
  ).length;
  const totalActiveCount = orders.filter(
    (o) =>
      o.status !== "delivered" &&
      o.status !== "completed" &&
      o.status !== "cancelled",
  ).length;

  const totalCommissionSum = deliveredOrders.reduce((sum, o) => {
    return (
      sum +
      (o.totalCommission !== undefined
        ? o.totalCommission
        : (o.items || []).reduce(
            (itemSum, item) => itemSum + (item.commission || 0) * item.quantity,
            0,
          ))
    );
  }, 0);

  // Render Category distributions
  const getCategoryChartData = () => {
    const categoryMap: { [key: string]: number } = {};
    deliveredOrders.forEach((order) => {
      order.items.forEach((item) => {
        const dish = dishes.find((d) => d.name === item.name);
        if (dish) {
          categoryMap[dish.category] =
            (categoryMap[dish.category] || 0) + item.quantity;
        } else {
          categoryMap["Others"] = (categoryMap["Others"] || 0) + item.quantity;
        }
      });
    });
    return Object.keys(categoryMap).map((catName) => ({
      name: catName,
      sales: categoryMap[catName],
    }));
  };

  // Render chronological revenues
  const getRevenueTimelineData = () => {
    const revenueMap: { [date: string]: number } = {};
    deliveredOrders.forEach((order) => {
      // Group by hours or basic dates depending on data points
      const date = order.createdAt?.seconds
        ? new Date(order.createdAt.seconds * 1000).toLocaleDateString(
            undefined,
            { month: "short", day: "numeric" },
          )
        : "Latest";
      revenueMap[date] = (revenueMap[date] || 0) + order.grandTotal;
    });

    if (Object.keys(revenueMap).length === 0) {
      return [{ date: "No data", revenue: 0 }];
    }

    return Object.keys(revenueMap).map((date) => ({
      date,
      revenue: revenueMap[date],
    }));
  };

  const handleAddNewRestaurant = async () => {
    if (!newRestaurantInput.trim()) return;
    try {
      const existingStatuses = deliverySettings?.restaurantStatuses || {};
      const newSettings = {
        deliveryFee: Number(deliveryChargeInput),
        restaurantStatus: deliverySettings?.restaurantStatus || {
          isTemporarilyUnavailable: false,
          openingTime: "09:00",
          closingTime: "23:00",
        },
        restaurantStatuses: {
          ...existingStatuses,
          [newRestaurantInput.trim()]: {
            isTemporarilyUnavailable: false,
            openingTime: "09:00",
            closingTime: "23:00",
          },
        },
      };

      await setDoc(doc(db, "settings", "delivery_config"), cleanObject(newSettings), {
        merge: true,
      });
      setSelectedScheduleRestaurant(newRestaurantInput.trim());
      setNewRestaurantInput("");
      alert(
        `Successfully registered new Restaurant / Vendor: ${newRestaurantInput.trim()}`,
      );
    } catch (err) {
      console.error(err);
      alert(
        "Permission denied or Firestore configuration missing while saving new restaurant.",
      );
    }
  };

  // Save new Delivery Setting and Restaurant Status
  const handleSaveDeliveryConfig = async () => {
    try {
      const existingStatuses = deliverySettings?.restaurantStatuses || {};

      const newSettings = {
        deliveryFee: Number(deliveryChargeInput),
        minOrderAmount: Number(minOrderAmountInput),
        // Keep legacy for safety
        restaurantStatus: deliverySettings?.restaurantStatus || {
          isTemporarilyUnavailable: false,
          openingTime: "09:00",
          closingTime: "23:00",
        },
        restaurantStatuses: {
          ...existingStatuses,
          [selectedScheduleRestaurant]: {
            isTemporarilyUnavailable: restStatusUnavailable,
            openingTime: restOpeningTime,
            closingTime: restClosingTime,
            imageUrl: restImageUrl,
            phone: restPhone,
            minOrder: restMinOrder ? String(restMinOrder) : null,
            deliveryCharge: restDeliveryCharge,
          },
        },
      };

      await setDoc(doc(db, "settings", "delivery_config"), cleanObject(newSettings));
      alert(`Settings successfully saved for ${selectedScheduleRestaurant}!`);
    } catch (err) {
      console.error(err);
      alert(
        "Permission denied or Firestore configuration missing while saving settings.",
      );
    }
  };

  // Grocery Settings update
  const handleSaveGroceryConfig = async () => {
    try {
      await setDoc(doc(db, "settings", "groceryDeliveryConfig"), {
        baseDeliveryFee: Number(gBaseDeliveryFee),
        freeDeliveryAboveAmount: Number(gFreeDeliveryAbove),
        allowMixedCart: Boolean(gAllowMixed),
      });
      alert("Grocery store settings saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Error saving grocery delivery settings.");
    }
  };

  // Clear all sales/orders history
  const handleClearAllOrderHistory = async () => {
    setConfirmDialog({
      title: "Clear All Sales & Order History",
      message:
        "WARNING: This will permanently delete all order history and sales records. This action cannot be undone. Are you sure you want to proceed?",
      onConfirm: async () => {
        try {
          const snapshot = await getDocs(collection(db, "orders"));
          const deletePromises = snapshot.docs.map((docSnap) =>
            deleteDoc(docSnap.ref),
          );
          await Promise.all(deletePromises);
          alert("All sales and order history have been cleared successfully!");
        } catch (err) {
          console.error("Error clearing order history:", err);
          alert("Failed to clear history. Check database rules.");
        }
      },
    });
  };

  // Helper: Create Grocery category
  const handleAddGroceryCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const generatedId = `gcat_${Date.now()}`;
      await setDoc(doc(db, "groceryCategories", generatedId), {
        id: generatedId,
        name: newCatName.trim(),
        imageUrl: newCatImageUrl.trim(),
        isAvailable: true,
        position: Number(newCatPosition),
      });
      setNewCatName("");
      setNewCatImageUrl("");
      setNewCatPosition((prev) => prev + 1);
      alert(`Category "${newCatName}" added successfully!`);
    } catch (err) {
      console.error(err);
      alert("Failed to add grocery category.");
    }
  };

  // Helper: Create Grocery product
  const handleAddGroceryProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGProdName.trim() || !newGProdCategoryId) {
      alert("Please provide product name and choose a valid category.");
      return;
    }
    try {
      const generatedId = `gprod_${Date.now()}`;
      const defaultImg =
        newGProdImageUrl.trim() ||
        "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400";
      await setDoc(
        doc(db, "groceryProducts", generatedId),
        cleanObject({
          id: generatedId,
          name: newGProdName.trim(),
          imageUrl: defaultImg,
          price: Number(newGProdPrice),
          discountPrice: newGProdDiscountPrice
            ? Number(newGProdDiscountPrice)
            : undefined,
          unit: newGProdUnit,
          stock: Number(newGProdStock),
          categoryId: newGProdCategoryId,
          isAvailable: true,
          commission: Number(newGProdCommission),
        }),
      );
      setNewGProdName("");
      setNewGProdImageUrl("");
      setNewGProdPrice(100);
      setNewGProdDiscountPrice(0);
      setNewGProdStock(10);
      setNewGProdCommission(0);
      alert(`Product "${newGProdName}" added successfully!`);
    } catch (err) {
      console.error(err);
      alert("Failed to add grocery product.");
    }
  };

  const handleToggleCategoryAvailable = async (
    catId: string,
    current: boolean,
  ) => {
    try {
      await updateDoc(doc(db, "groceryCategories", catId), {
        isAvailable: !current,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateCategoryImageUrl = async (id: string) => {
    try {
      await updateDoc(doc(db, "groceryCategories", id), {
        imageUrl: editingCategoryImageUrl.trim(),
      });
      setEditingCategoryId(null);
    } catch (err) {
      console.error("Failed to update category image", err);
    }
  };

  const handleDeleteCategory = (catId: string) => {
    setConfirmDialog({
      title: "Delete Category",
      message:
        "Are you sure you want to delete this grocery category? All products in it will be orphaned!",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "groceryCategories", catId));
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  const handleToggleProductAvailable = async (
    prodId: string,
    current: boolean,
  ) => {
    try {
      await updateDoc(doc(db, "groceryProducts", prodId), {
        isAvailable: !current,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProduct = (prodId: string) => {
    setConfirmDialog({
      title: "Delete Product",
      message: "Are you sure you want to delete this grocery product?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "groceryProducts", prodId));
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  const handleSaveInlineGProductEdit = async (prodId: string) => {
    try {
      await updateDoc(doc(db, "groceryProducts", prodId), {
        price: Number(editingGProdPriceInput),
        stock: Number(editingGProdStockInput),
        commission: Number(editingGProdCommissionInput),
      });
      setEditingGProductId(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Create new dish/service (Admin click handles)
  const handleAddNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    // Ensure the image URL is trimmed
    let finalImg = newItemImageUrl.trim();

    const uniqueId = `custom_${Date.now()}`;
    const dishModel: Dish = {
      id: uniqueId,
      name: newItemName,
      description: newItemDescription,
      price: Number(newItemPrice),
      discountPrice:
        newItemDiscountPrice > 0 ? Number(newItemDiscountPrice) : undefined,
      category: newItemType === "service" ? "Home Services" : newItemCategory,
      imageUrl: finalImg,
      isAvailable: true,
      type: newItemType,
      restaurantName:
        newItemRestaurantName.trim() ||
        (newItemType === "service"
          ? "Dadu Home Services"
          : "Dadu Fast Food & Kitchen"),
      commission: Number(newItemCommission),
      sizes:
        newItemType === "food" && newItemSizes.length > 0
          ? newItemSizes
          : undefined,
      flavors:
        newItemType === "food" && newItemFlavors.length > 0
          ? newItemFlavors
          : undefined,
      addOns:
        newItemType === "food" && newItemAddOns.length > 0
          ? newItemAddOns
          : undefined,
      ...(newItemType === "service" && newItemServiceDuration
        ? { serviceDuration: newItemServiceDuration }
        : {}),
    };

    try {
      await setDoc(doc(db, "menu", uniqueId), cleanObject(dishModel));
      console.log("New and fresh dish or service added successfully!");
      setNewItemName("");
      setNewItemDescription("");
      setNewItemPrice(300);
      setNewItemDiscountPrice(0);
      setNewItemImageUrl("");
      setNewItemServiceDuration("");
      setNewItemRestaurantName("");
      setNewItemCommission(0);
      setNewItemSizes([]);
      setNewItemFlavors([]);
      setNewItemAddOns([]);
    } catch (err) {
      console.error(err);
      console.log("Check database permissions. Could not add menu item.");
    }
  };

  const handleToggleFeatured = async (dish: Dish) => {
    try {
      await updateDoc(doc(db, "menu", dish.id), {
        isFeatured: !dish.isFeatured,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleImportTastyBites = async () => {
    setIsImportingTasty(true);
    setImportProgressTasty(0);
    try {
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
        },
        {
          name: "Premium Flavour Pizza",
          description: "Select from our premium flavors.",
          price: 550,
          category: "Pizza",
          sizes: [{ name: "Small", price: 550 }, { name: "Medium", price: 900 }, { name: "Large", price: 1400 }],
          flavors: [
            { name: "Peri Peri Pizza", price: 0 },
            { name: "Chilli Chicken Pizza", price: 0 },
            { name: "Garlic Creamy Tikka", price: 0 },
            { name: "Spicy Runch Pizza", price: 0 },
            { name: "BBQ Tikka Pizza", price: 0 },
            { name: "Afghani Feast Pizza", price: 0 },
            { name: "Chilli Garlic Cream", price: 0 },
            { name: "Bihari Boti Pizza", price: 0 },
          ],
          imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80",
          isAvailable: true, type: "food", restaurantName
        },
        {
          name: "Royale Flavour Pizza",
          description: "Select from our royale flavors.",
          price: 500,
          category: "Pizza",
          sizes: [{ name: "Small", price: 500 }, { name: "Medium", price: 800 }, { name: "Large", price: 1200 }],
          flavors: [
            { name: "Tastybites Special Pizza", price: 0 },
            { name: "Creamy Pizza", price: 0 },
            { name: "Malai Boti", price: 0 },
            { name: "All Cheese", price: 0 },
            { name: "Kabab Dlight", price: 0 },
            { name: "Mughlai Beast Pizza", price: 0 },
          ],
          imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80",
          isAvailable: true, type: "food", restaurantName
        },
        {
          name: "Crust Flavour Pizza",
          description: "Select from our special crust flavors.",
          price: 900,
          category: "Pizza",
          sizes: [{ name: "Medium", price: 900 }, { name: "Large", price: 1400 }],
          flavors: [
            { name: "Kababish Pizza", price: 0 },
            { name: "Crown Crust Pizza", price: 0 },
            { name: "Crown Lover Pizza", price: 0 },
            { name: "Souce Crust Pizza", price: 0 },
            { name: "Kofta Kabab Pizza", price: 0 },
            { name: "Melt Malai Pizza", price: 0 },
            { name: "Cheese Crust Pizza", price: 0 },
            { name: "Chees Stick Pizza", price: 0 },
          ],
          imageUrl: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=800&q=80",
          isAvailable: true, type: "food", restaurantName
        },
        {
          name: "Chicken Burger",
          description: "Choose your favorite chicken burger.",
          price: 250,
          category: "Burgers",
          addOns: burgerAddOns,
          flavors: [
            { name: "Crunch Burger", price: 0 },
            { name: "Chicken Single Patty Burger", price: 50 },
            { name: "Zinger Burger", price: 100 },
            { name: "Jumbo Patty Burger", price: 150 },
            { name: "Tastys Zinger", price: 200 },
            { name: "Chicken Double Patty Burger", price: 250 },
            { name: "Mighty Burger", price: 350 },
            { name: "Pizza Burger", price: 350 },
            { name: "Jumbo Double Patty Burger", price: 350 },
            { name: "MAC Burger", price: 350 },
            { name: "Tastys Signature", price: 550 },
          ],
          imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80",
          isAvailable: true, type: "food", restaurantName
        },
        {
          name: "Beef Burger",
          description: "Choose your favorite beef burger.",
          price: 300,
          category: "Burgers",
          addOns: burgerAddOns,
          flavors: [
            { name: "Beef Single Patty Burger", price: 0 },
            { name: "Beef Double Party Burger", price: 200 },
            { name: "Full Fried Burger", price: 300 },
            { name: "Cheese Beef Burger", price: 300 },
            { name: "Lava Beef Burger", price: 500 },
          ],
          imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80",
          isAvailable: true, type: "food", restaurantName
        },
        {
          name: "Grilled Burger",
          description: "Choose your favorite grilled burger.",
          price: 450,
          category: "Burgers",
          addOns: burgerAddOns,
          flavors: [
            { name: "Grilled Charcoal Burger", price: 0 },
            { name: "Grilled Jalapeno Burger", price: 50 },
          ],
          imageUrl: "https://images.unsplash.com/photo-1594212691516-436ad271c591?w=800&q=80",
          isAvailable: true, type: "food", restaurantName
        },
        {
          name: "Broast",
          description: "Crispy chicken broast.",
          price: 200,
          category: "Broast",
          flavors: [
            { name: "Fried Chicken Per Pc", price: 0 },
            { name: "Broast 2Pc", price: 250 },
            { name: "Chest Broast 2Pc", price: 300 },
            { name: "Injected Broast 2Pc with Bun", price: 350 },
            { name: "Nuggets 10Pc", price: 300 },
          ],
          imageUrl: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80",
          isAvailable: true, type: "food", restaurantName
        },
        {
          name: "Wings",
          description: "Delicious chicken wings.",
          price: 550,
          category: "Broast",
          flavors: [
            { name: "Hot Wings 8Pc", price: 0 },
            { name: "Sweet Chili Wings 8Pc", price: 100 },
            { name: "BBQ Wings 8Pc", price: 100 },
            { name: "Garlic Wings 8Pc", price: 100 },
            { name: "Peri Peri Wings 8Pc", price: 100 },
            { name: "Honey Mustard Wings 8Pc", price: 100 },
          ],
          imageUrl: "https://images.unsplash.com/photo-1524114664604-cd8133cd67ad?w=800&q=80",
          isAvailable: true, type: "food", restaurantName
        },
        {
          name: "Roll",
          description: "Fresh and hot rolls.",
          price: 200,
          category: "Rolls",
          flavors: [
            { name: "Grilled Paratha Roll", price: 0 },
            { name: "Mayo Roll", price: 0 },
            { name: "Vaggi Roll", price: 0 },
            { name: "Grilled Cheese Paratha Roll", price: 50 },
            { name: "Zingratha Roll", price: 100 },
            { name: "Twister Roll", price: 150 },
          ],
          imageUrl: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&q=80",
          isAvailable: true, type: "food", restaurantName
        },
        {
          name: "Wrap",
          description: "Tasty wraps.",
          price: 500,
          category: "Rolls",
          flavors: [
            { name: "Tortilla Wrap", price: 0 },
            { name: "Burrito Wrap", price: 0 },
            { name: "Grilled Wrap", price: 0 },
          ],
          imageUrl: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&q=80",
          isAvailable: true, type: "food", restaurantName
        },
        {
          name: "Lazania",
          description: "Delicious Lazania in multiple flavors.",
          price: 500,
          category: "Lazania",
          sizes: [
            { name: "Plan Lazania - Small", price: 500 },
            { name: "Plan Lazania - Large", price: 600 },
            { name: "Fajita Lazania - Small", price: 550 },
            { name: "Fajita Lazania - Large", price: 650 },
            { name: "Malai Boti Lazania - Small", price: 550 },
            { name: "Malai Boti Lazania - Large", price: 650 },
            { name: "Crispy Lazania - Small", price: 600 },
            { name: "Crispy Lazania - Large", price: 750 },
          ],
          imageUrl: "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=800&q=80",
          isAvailable: true, type: "food", restaurantName
        },
        {
          name: "Pasta",
          description: "Freshly made pasta.",
          price: 400,
          category: "Pasta",
          sizes: [
            { name: "Creamy Pasta - Small", price: 400 },
            { name: "Creamy Pasta - Large", price: 600 },
            { name: "Cheese Pasta - Small", price: 400 },
            { name: "Cheese Pasta - Large", price: 600 },
            { name: "Red Sauce Pasta - Small", price: 400 },
            { name: "Red Sauce Pasta - Large", price: 600 },
            { name: "Crispy Pasta - Small", price: 600 },
            { name: "Crispy Pasta - Large", price: 750 },
            { name: "Alfrido Pasta - Small", price: 600 },
            { name: "Alfrido Pasta - Large", price: 750 },
          ],
          imageUrl: "https://images.unsplash.com/photo-1621996311239-f9c3eb7b2253?w=800&q=80",
          isAvailable: true, type: "food", restaurantName
        },
        {
          name: "Fries",
          description: "Hot and crispy fries.",
          price: 150,
          category: "Fries",
          flavors: [
            { name: "Crispy Fries 100gr", price: 0 },
            { name: "Crispy Fries 200gr", price: 100 },
            { name: "Crispy Masala Fries", price: 200 },
            { name: "Chicken Salad", price: 350 },
            { name: "Crispy Pizza Fries", price: 400 },
            { name: "Crispy Loaded Fries", price: 500 },
          ],
          imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&q=80",
          isAvailable: true, type: "food", restaurantName
        },
        {
          name: "Paratha",
          description: "Stuffed and plain parathas.",
          price: 100,
          category: "Paratha",
          flavors: [
            { name: "Plan Paratha", price: 0 },
            { name: "Cheese Paratha", price: 250 },
            { name: "Pizza Paratha", price: 300 },
            { name: "Chocolate Paratha", price: 300 },
            { name: "Malai Boti Pizza Paratha", price: 400 },
          ],
          imageUrl: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&q=80",
          isAvailable: true, type: "food", restaurantName
        },
        {
          name: "Sandwich",
          description: "Freshly made sandwiches.",
          price: 400,
          category: "Sandwich",
          flavors: [
            { name: "Malai Boti Sandwich", price: 0 },
            { name: "Grilled Sandwich", price: 50 },
          ],
          imageUrl: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=80",
          isAvailable: true, type: "food", restaurantName
        }
      ];

      for (let i = 0; i < menuData.length; i++) {
        const item = menuData[i];
        const docId = `tasty_bites_${item.category.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${item.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        await setDoc(doc(db, "menu", docId), cleanObject(item));
        setImportProgressTasty(Math.round(((i + 1) / menuData.length) * 100));
      }
      
      console.log("Tasty Bites Menu imported successfully!");
      setImportProgressTasty(100);
      setTimeout(() => setIsImportingTasty(false), 1500);
    } catch (err) {
      console.error(err);
      setIsImportingTasty(false);
    }
  };

  // ON/OFF toggle switches
  const handleToggleAvailability = async (dish: Dish) => {
    try {
      await updateDoc(doc(db, "menu", dish.id), {
        isAvailable: !dish.isAvailable,
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Price inline editing
  const handleSavePriceChange = async (dish: Dish) => {
    if (editingPriceInput <= 0 || !editingNameInput.trim()) return;
    try {
      const updates: any = {
        name: editingNameInput.trim(),
        price: editingPriceInput,
        discountPrice:
          editingDiscountPriceInput > 0 ? editingDiscountPriceInput : null,
        commission: editingCommissionInput,
        sizes:
          dish.type === "food" && editingSizes.length > 0 ? editingSizes : null,
        flavors:
          dish.type === "food" && editingFlavors.length > 0
            ? editingFlavors
            : null,
        addOns:
          dish.type === "food" && editingAddOns.length > 0
            ? editingAddOns
            : null,
      };
      if (editingImageUrl) {
        updates.imageUrl = editingImageUrl;
      }
      await updateDoc(doc(db, "menu", dish.id), updates);
      setEditingPriceDishId(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Delete item from directory
  const handleDeleteItem = (dishId: string) => {
    setConfirmDialog({
      title: "Delete Catalog Item",
      message: "Are you sure you want to delete this catalog item permanently?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "menu", dishId));
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  const handleDeleteRestaurant = (restaurantName: string) => {
    setConfirmDialog({
      title: "Delete Restaurant/Vendor",
      message: `WARNING: Are you sure you want to completely delete "${restaurantName}" and all its menu items? This cannot be undone.`,
      onConfirm: async () => {
        try {
          const existingStatuses = deliverySettings?.restaurantStatuses || {};
          const newStatuses = { ...existingStatuses };
          delete newStatuses[restaurantName];

          await updateDoc(doc(db, "settings", "delivery_config"), cleanObject({
            restaurantStatuses: newStatuses,
          }));

          const dishesToDelete = dishes.filter(
            (d) =>
              (d.restaurantName ||
                (d.type === "service"
                  ? "Dadu Home Services"
                  : "Dadu Fast Food & Kitchen")) === restaurantName,
          );

          const deletePromises = dishesToDelete.map((d) =>
            deleteDoc(doc(db, "menu", d.id)),
          );
          await Promise.all(deletePromises);

          if (selectedScheduleRestaurant === restaurantName) {
            setSelectedScheduleRestaurant(
              uniqueRestaurants.find((r) => r !== restaurantName) ||
                "Dadu Fast Food & Kitchen",
            );
          }
          alert(
            `Restaurant "${restaurantName}" and its items have been deleted.`,
          );
        } catch (err) {
          console.error(err);
          alert("Failed to delete restaurant.");
        }
      },
    });
  };

  const handleRenameRestaurant = (oldName: string) => {
    const newName = prompt(`Enter new name for "${oldName}":`, oldName);
    if (!newName || newName.trim() === "" || newName.trim() === oldName) return;

    setConfirmDialog({
      title: "Rename Restaurant",
      message: `Are you sure you want to rename "${oldName}" to "${newName.trim()}"? This will update all its menu items.`,
      onConfirm: async () => {
        try {
          const finalNewName = newName.trim();

          // 1. Update delivery config statuses
          const existingStatuses = deliverySettings?.restaurantStatuses || {};
          const oldStatus = existingStatuses[oldName] || {
            isTemporarilyUnavailable: false,
            openingTime: "09:00",
            closingTime: "23:00",
          };

          const newStatuses = { ...existingStatuses };
          newStatuses[finalNewName] = oldStatus;
          delete newStatuses[oldName];

          await setDoc(doc(db, "settings", "delivery_config"), cleanObject({
            ...deliverySettings,
            restaurantStatuses: newStatuses,
          }));

          // 2. Update all menu items for this restaurant
          const dishesToUpdate = dishes.filter(
            (d) =>
              (d.restaurantName ||
                (d.type === "service"
                  ? "Dadu Home Services"
                  : "Dadu Fast Food & Kitchen")) === oldName,
          );

          const updatePromises = dishesToUpdate.map((d) =>
            updateDoc(doc(db, "menu", d.id), { restaurantName: finalNewName }),
          );
          await Promise.all(updatePromises);

          setSelectedScheduleRestaurant(finalNewName);
          alert(`Restaurant successfully renamed to "${finalNewName}".`);
        } catch (err) {
          console.error(err);
          alert("Failed to rename restaurant.");
        }
      },
    });
  };

  // Manual orders status controls
  const handleUpdateOrderStatus = async (
    orderId: string,
    nextStatus: string,
  ) => {
    try {
      let cancelReason = "";
      if (nextStatus === "cancelled") {
        const reason = prompt(
          "Please enter a reason for cancelling this order (this will be sent to the customer):",
        );
        if (reason === null) return; // User pressed cancel on the prompt
        cancelReason = reason || "Order was cancelled by administration.";
      }

      await updateDoc(doc(db, "orders", orderId), {
        status: nextStatus,
        ...(cancelReason ? { cancelReason } : {}),
      });

      // Dispatch an automatic in-app notification to the customer profile!
      // This will sound a beautiful chime!
      const targetOrder = orders.find((o) => o.id === orderId);
      if (targetOrder) {
        let statusText = nextStatus;
        if (nextStatus === "confirmed") statusText = "Accepted & Scheduled";
        if (nextStatus === "preparing") statusText = "Being cooked hot";
        if (nextStatus === "out_for_delivery")
          statusText = "With dispatch rider";
        if (nextStatus === "delivered")
          statusText = "Successfully delivered! Enjoy!";
        if (nextStatus === "completed")
          statusText = "Technician Job Completed successfully!";

        await addDoc(collection(db, "notifications"), {
          userId: targetOrder.userId,
          title: `Order Update #${orderId.substring(0, 5)}`,
          message: `Your booking status turned to: ${statusText.toUpperCase()}`,
          createdAt: { seconds: Date.now() / 1000 },
          read: false,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save customized Rider & custom ETA
  const handleSaveRiderAndEta = async (orderId: string) => {
    const riderIdValue = riderNames[orderId]?.trim() || "";
    const etaValue = orderEtas[orderId]?.trim() || "";

    if (!riderIdValue && !etaValue) return;

    try {
      const updates: any = {};
      if (riderIdValue) {
        const selectedRider = ridersSubset.find(r => r.uid === riderIdValue);
        if (selectedRider) {
          updates.riderId = selectedRider.uid;
          updates.riderName = selectedRider.name;
        } else {
          updates.riderName = riderIdValue; // fallback for string
        }
      }
      if (etaValue) {
        updates.eta = etaValue;
        const targetOrder = orders.find((o) => o.id === orderId);
        if (targetOrder && targetOrder.orderType === "service") {
          updates.serviceTiming = etaValue;
        }
      }

      await updateDoc(doc(db, "orders", orderId), updates);
      alert("Logistics (Rider/ETA) parameters successfully synchronized!");
    } catch (err) {
      console.error(err);
    }
  };

  // Broadcaster notification push button
  const handleTriggerBroadcasterNotifications = async () => {
    if (!alertTitle.trim() || !alertMessage.trim()) return;
    try {
      // Find all unique customer uids to notify
      const uniqueUids = Array.from(new Set(orders.map((o) => o.userId)));

      if (uniqueUids.length === 0) {
        // Send to meerali if no orders yet
        uniqueUids.push("admin_broadcast");
      }

      await Promise.all(
        uniqueUids.map((uid) =>
          addDoc(collection(db, "notifications"), {
            userId: uid,
            title: alertTitle,
            message: alertMessage,
            createdAt: { seconds: Date.now() / 1000 },
            read: false,
          }),
        ),
      );

      alert("Push notifications fired to all active users!");
      setAlertMessage("");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 text-slate-900 overflow-y-auto font-sans flex flex-col antialiased">
      {/* Header Admin Strip */}
      <div className="bg-white border-b border-slate-200 p-5 sticky top-0 z-20 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-r from-[#D70F64] to-[#b00c50] text-white px-3.5 py-1.5 text-[10.5px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-[#D70F64]/10">
            Console Active
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight text-slate-900 flex items-center gap-2">
              Dadu24#7 System Hub
              <span className="text-[#D70F64] font-mono text-xs select-all bg-[#D70F64]/5 px-2 py-0.5 rounded border border-[#D70F64]/20">
                @{adminUsername}
              </span>
            </h2>
            <span className="text-[11px] text-slate-600 font-medium font-sans">
              Enterprise Business Management Control & Live Logistics Telemetry
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 px-5 py-2.5 rounded-2xl transition-all hover:scale-[1.02] cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
        >
          Exit Console 🚪
        </button>
      </div>

      {/* Main Container Dashboard */}
      <div className="max-w-7xl mx-auto w-full px-4 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 pb-24">
        {/* Navigation Admin Side Rail */}
        <div className="col-span-1 lg:col-span-3 space-y-4">
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#D70F64]/30 to-transparent" />
              <span className="text-[9.5px] font-black text-slate-500 block uppercase tracking-widest pl-1 mb-1">
                Core Terminals
              </span>

              <button
                onClick={() => setActiveSubTab("analytics")}
                className={`w-full font-black text-xs px-4 py-3.5 rounded-2xl transition-all duration-300 flex items-center gap-3.5 cursor-pointer border ${
                  activeSubTab === "analytics"
                    ? "bg-[#D70F64] border-[#D70F64] text-white font-extrabold shadow-[0_0_20px_rgba(245,158,11,0.04)]"
                    : "bg-transparent border-transparent hover:bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                Realtime Analytics
              </button>

              <button
                onClick={() => setActiveSubTab("orders")}
                className={`w-full font-black text-xs px-4 py-3.5 rounded-2xl transition-all duration-300 flex items-center gap-3.5 cursor-pointer border ${
                  activeSubTab === "orders"
                    ? "bg-[#D70F64] border-[#D70F64] text-white font-extrabold shadow-[0_0_20px_rgba(245,158,11,0.04)]"
                    : "bg-transparent border-transparent hover:bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <ShoppingCart className="w-4 h-4 shrink-0" />
                Live Orders Manager
                {totalActiveCount > 0 && (
                  <span className="ml-auto bg-[#D70F64] text-white font-black px-2.5 py-0.5 text-[9.5px] rounded-full shadow-[0_2px_10px_rgba(215,15,100,0.2)]">
                    {totalActiveCount}
                  </span>
                )}
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3 shadow-xl relative overflow-hidden">
              <span className="text-[9.5px] font-black text-slate-500 block uppercase tracking-widest pl-1 mb-1">
                Vendors & Catalog
              </span>

              <button
                onClick={() => setActiveSubTab("restaurants")}
                className={`w-full font-black text-xs px-4 py-3.5 rounded-2xl transition-all duration-300 flex items-center gap-3.5 cursor-pointer border ${
                  activeSubTab === "restaurants"
                    ? "bg-[#D70F64] border-[#D70F64] text-white font-extrabold shadow-[0_0_20px_rgba(168,85,247,0.04)]"
                    : "bg-transparent border-transparent hover:bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <Clock className="w-4 h-4 shrink-0" />
                Manage Restaurants
              </button>

              <button
                onClick={() => setActiveSubTab("food_categories")}
                className={`w-full font-black text-xs px-4 py-3.5 rounded-2xl transition-all duration-300 flex items-center gap-3.5 cursor-pointer border ${
                  activeSubTab === "food_categories"
                    ? "bg-[#D70F64] border-[#D70F64] text-white font-extrabold shadow-[0_0_20px_rgba(236,72,153,0.05)] scale-[1.01]"
                    : "bg-transparent border-transparent hover:bg-slate-800 text-slate-600 hover:text-pink-400/90"
                }`}
              >
                <Grid className="w-4 h-4 shrink-0" />
                Manage Food Categories
              </button>

              <button
                onClick={() => setActiveSubTab("grocery")}
                className={`w-full font-black text-xs px-4 py-3.5 rounded-2xl transition-all duration-300 flex items-center gap-3.5 cursor-pointer border ${
                  activeSubTab === "grocery"
                    ? "bg-[#D70F64] border-[#D70F64] text-white font-extrabold shadow-[0_0_20px_rgba(249,115,22,0.05)] scale-[1.01]"
                    : "bg-transparent border-transparent hover:bg-slate-800 text-slate-600 hover:text-orange-400/90"
                }`}
              >
                <ShoppingBasket className="w-4 h-4 text-orange-500 shrink-0" />
                Manage Grocery Store
              </button>

              <button
                onClick={() => {
                  setActiveSubTab("services");
                  setNewItemType("service");
                }}
                className={`w-full font-black text-xs px-4 py-3.5 rounded-2xl transition-all duration-300 flex items-center gap-3.5 cursor-pointer border ${
                  activeSubTab === "services"
                    ? "bg-[#D70F64] border-[#D70F64] text-white font-extrabold shadow-[0_0_20px_rgba(59,130,246,0.04)]"
                    : "bg-transparent border-transparent hover:bg-slate-800 text-slate-600 hover:text-blue-400"
                }`}
              >
                <Settings className="w-4 h-4 text-blue-500 shrink-0" />
                Manage Services
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3 shadow-xl relative overflow-hidden">
              <span className="text-[9.5px] font-black text-slate-500 block uppercase tracking-widest pl-1 mb-1">
                Fleet & Users
              </span>

              <button
                onClick={() => setActiveSubTab("riders")}
                className={`w-full font-black text-xs px-4 py-3.5 rounded-2xl transition-all duration-300 flex items-center gap-3.5 cursor-pointer border ${
                  activeSubTab === "riders"
                    ? "bg-[#D70F64] border-[#D70F64] text-white font-extrabold shadow-[0_0_20px_rgba(245,158,11,0.04)]"
                    : "bg-transparent border-transparent hover:bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <User className="w-4 h-4 shrink-0" />
                Manage Riders Directory
              </button>

              <button
                onClick={() => setActiveSubTab("users")}
                className={`w-full font-black text-xs px-4 py-3.5 rounded-2xl transition-all duration-300 flex items-center gap-3.5 cursor-pointer border ${
                  activeSubTab === "users"
                    ? "bg-[#D70F64] border-[#D70F64] text-white font-extrabold shadow-[0_0_20px_rgba(16,185,129,0.04)]"
                    : "bg-transparent border-transparent hover:bg-slate-800 text-slate-600 hover:text-emerald-450"
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                Manage Users Directory
                <span className="ml-auto bg-emerald-600 text-white font-extrabold px-2 py-0.5 text-[9px] rounded-full">
                  {allUsersList.length}
                </span>
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3 shadow-xl relative overflow-hidden">
              <span className="text-[9.5px] font-black text-slate-500 block uppercase tracking-widest pl-1 mb-1">
                System
              </span>

              <button
                onClick={() => setActiveSubTab("seo")}
                className={`w-full font-black text-xs px-4 py-3.5 rounded-2xl transition-all duration-300 flex items-center gap-3.5 cursor-pointer border ${
                  activeSubTab === "seo"
                    ? "bg-[#D70F64] border-[#D70F64] text-white font-extrabold shadow-[0_0_20px_rgba(59,130,246,0.04)]"
                    : "bg-transparent border-transparent hover:bg-slate-800 text-slate-600 hover:text-blue-450"
                }`}
              >
                <Globe className="w-4 h-4 text-blue-500 shrink-0" />
                SEO & Metadata
              </button>
            </div>
          </div>

          {/* Quick Stats overview panel */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl relative overflow-hidden text-xs">
            <span className="text-[9.5px] font-black text-slate-500 block uppercase tracking-widest">
              Financial Coordinates
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl hover:border-[#D70F64]/20 transition-all group">
                <span className="text-slate-500 block text-[9.5px] font-bold uppercase tracking-wider">
                  Gross Rev
                </span>
                <span className="text-[15px] font-black text-[#D70F64] mt-1 block">
                  Rs. {totalRevenue}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl hover:border-emerald-500/20 transition-all">
                <span className="text-slate-500 block text-[9.5px] font-bold uppercase tracking-wider">
                  Your Comm
                </span>
                <span className="text-[15px] font-black text-emerald-400 mt-1 block">
                  Rs. {totalCommissionSum}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl hover:border-emerald-500/20 transition-all">
                <span className="text-slate-500 block text-[9.5px] font-bold uppercase tracking-wider">
                  Completed
                </span>
                <span className="text-[15px] font-black text-slate-800 mt-1 block">
                  {totalCompletedCount}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl hover:border-[#D70F64]/20 transition-all">
                <span className="text-slate-500 block text-[9.5px] font-bold uppercase tracking-wider">
                  Active
                </span>
                <span className="text-[15px] font-black text-[#D70F64] mt-1 block">
                  {totalActiveCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Panels Area */}
        <div className="col-span-1 lg:col-span-9 space-y-8">
          {/* TAB 1: Real-time Analytics Dashboard */}
          {activeSubTab === "analytics" && (
            <div className="space-y-8 animate-fade-in">
              {/* Graphical Recharts Visual Analytics blocks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Gross revenue timeline Recharts Area scale */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative">
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D70F64]/10 to-transparent" />
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h4 className="font-black text-sm text-slate-900 flex items-center gap-2 tracking-wide uppercase">
                        <TrendingUp className="w-4 h-4 text-[#D70F64]" />
                        Delivered Order Revenue Pipeline
                      </h4>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        Gross delivered totals mapped chronologically
                      </span>
                    </div>
                  </div>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={getRevenueTimelineData()}>
                        <defs>
                          <linearGradient
                            id="colorRevenue"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#f59e0b"
                              stopOpacity={0.25}
                            />
                            <stop
                              offset="95%"
                              stopColor="#f59e0b"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e2e8f0"
                          opacity={0.3}
                        />
                        <XAxis
                          dataKey="date"
                          stroke="#64748b"
                          fontSize={9}
                          fontStyle="bold"
                        />
                        <YAxis stroke="#64748b" fontSize={9} fontStyle="bold" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "14px",
                            fontSize: "11px",
                            color: "#0f172a",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#f59e0b"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorRevenue)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Categories demand distribution Recharts bar plot */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative">
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-pink-500/10 to-transparent" />
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h4 className="font-black text-sm text-slate-900 flex items-center gap-2 tracking-wide uppercase">
                        <Package className="w-4 h-4 text-[#D70F64]" />
                        Category Quantity Demand Analytics
                      </h4>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        Volume of products purchased from database
                      </span>
                    </div>
                  </div>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getCategoryChartData()}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e2e8f0"
                          opacity={0.3}
                        />
                        <XAxis
                          dataKey="name"
                          stroke="#64748b"
                          fontSize={9}
                          fontStyle="bold"
                        />
                        <YAxis stroke="#64748b" fontSize={9} fontStyle="bold" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "14px",
                            fontSize: "11px",
                            color: "#0f172a",
                          }}
                        />
                        <Bar
                          dataKey="sales"
                          fill="#D70F64"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Delivery Charge Setup Card & Broadcast Manager */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Delivery Fee Adjustment form */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-5 relative">
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D70F64]/10 to-transparent" />
                  <div>
                    <h4 className="font-black text-sm text-slate-900 flex items-center gap-2 uppercase tracking-wide">
                      <Settings className="w-4 h-4 text-[#D70F64]" />
                      Delivery Charges Controller
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-2.5 leading-relaxed font-medium">
                      Overwrite the default delivery charges for food deliveries
                      instantly on user screens. (Services are automatically
                      forced to Rs. 0).
                    </p>
                  </div>

                  <div className="space-y-4 pt-1">
                    <div className="flex gap-3">
                      <input
                        type="number"
                        value={deliveryChargeInput}
                        onChange={(e) =>
                          setDeliveryChargeInput(Number(e.target.value))
                        }
                        placeholder="e.g. 100"
                        className="flex-1 p-3 bg-white border border-slate-200 border border-slate-200 rounded-2xl text-xs sm:text-sm outline-none text-slate-900 focus:border-[#D70F64]/60 transition focus:ring-1 focus:ring-[#D70F64]/10"
                      />
                      <button
                        onClick={handleSaveDeliveryConfig}
                        className="bg-[#D70F64] hover:bg-[#b00c50] transition-all text-black font-black px-5 py-3 rounded-2xl text-[11px] uppercase tracking-wider cursor-pointer shadow-lg shadow-[#D70F64]/10 flex items-center gap-2 shrink-0 hover:scale-[1.02] active:scale-95"
                      >
                        <Save className="w-4 h-4" />
                        Save Rate
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block leading-relaxed">
                      💡 Stored coordinates: settings/delivery_config with
                      Firestore.
                    </span>
                  </div>
                </div>

                {/* Chime trigger in-app broadcaster */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-5 relative">
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent" />
                  <div>
                    <h4 className="font-black text-sm text-slate-900 flex items-center gap-2 uppercase tracking-wide">
                      <Smartphone className="w-4 h-4 text-emerald-400 animate-pulse" />
                      In-App Broadcast Dispatcher
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-2.5 leading-relaxed font-medium">
                      Broadcasting triggers a text alert banner accompanied by a
                      musical sound on customer screens!
                    </p>
                  </div>

                  <div className="space-y-3 pt-1 text-xs">
                    <input
                      type="text"
                      placeholder="Notification Title"
                      value={alertTitle}
                      onChange={(e) => setAlertTitle(e.target.value)}
                      className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-xl outline-none text-slate-900 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/10 transition"
                    />
                    <textarea
                      rows={2}
                      placeholder="Notification Message body text..."
                      value={alertMessage}
                      onChange={(e) => setAlertMessage(e.target.value)}
                      className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-xl outline-none text-slate-900 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/10 transition resize-none"
                    />
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={handleTriggerBroadcasterNotifications}
                        className="bg-emerald-500 hover:bg-emerald-600 text-black font-black text-[10.5px] uppercase tracking-wider py-2.5 px-5 rounded-xl shadow-lg shadow-emerald-500/10 transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-95"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Fire Broadcast Call
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deal of the Hour Full Control Manager */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative space-y-6">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D70F64]/10 to-transparent" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/50">
                  <div>
                    <h4 className="font-black text-sm text-slate-900 flex items-center gap-2 uppercase tracking-wide">
                      <Percent className="w-4 h-4 text-[#D70F64]" />
                      Deal of the Hour Controller
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed font-medium">
                      Configure the high-intensity countdown timer, set the
                      custom discount rate, and dynamically pick featured
                      dishes/services on sale.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveDealConfig}
                    className="bg-[#D70F64] hover:bg-[#b00c50] transition-all text-white font-black px-5 py-3 rounded-2xl text-[11px] uppercase tracking-wider cursor-pointer shadow-lg shadow-[#D70F64]/15 flex items-center gap-2 shrink-0 hover:scale-[1.02] active:scale-95 self-start sm:self-auto animate-pulse"
                  >
                    <Save className="w-4 h-4" />
                    Save Deal Settings
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-xs text-slate-900">
                  <div className="md:col-span-12 flex items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl border border-slate-200">
                    <div>
                      <h5 className="font-bold text-sm text-slate-900">
                        Enable Deal of the Hour
                      </h5>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Toggle this on or off to control visibility instantly.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer group">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={dealActive}
                        onChange={(e) => setDealActive(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-[#D70F64]/40 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-700 after:border-slate-700 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D70F64] group-hover:after:bg-white"></div>
                    </label>
                  </div>

                  <div className="md:col-span-4 space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-600 font-bold uppercase tracking-widest text-[9px]">
                      Timer Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={1440}
                      value={dealTimer}
                      onChange={(e) =>
                        setDealTimer(Math.max(1, Number(e.target.value)))
                      }
                      placeholder="e.g. 30"
                      className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-2xl text-xs sm:text-sm outline-none text-slate-900 focus:border-[#D70F64]/60 transition"
                    />
                  </div>

                  <div className="md:col-span-4 space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-600 font-bold uppercase tracking-widest text-[9px]">
                      Discount Rate (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={95}
                      value={dealDiscount}
                      onChange={(e) =>
                        setDealDiscount(
                          Math.max(0, Math.min(95, Number(e.target.value))),
                        )
                      }
                      placeholder="e.g. 25"
                      className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-2xl text-xs sm:text-sm outline-none text-slate-900 focus:border-[#D70F64]/60 transition"
                    />
                  </div>

                  <div className="md:col-span-4 space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-[#D70F64] font-bold uppercase tracking-widest text-[9px]">
                      Deal Banner Text (Optional)
                    </label>
                    <input
                      type="text"
                      value={dealText}
                      onChange={(e) => setDealText(e.target.value)}
                      placeholder={`e.g. Save ${dealDiscount}% on Tea & Fresh Platters!`}
                      className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-2xl text-xs sm:text-sm outline-none text-slate-900 focus:border-[#D70F64]/60 transition"
                    />
                  </div>
                </div>

                {/* Dynamic Items Select list */}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600 font-bold uppercase tracking-widest text-[9px]">
                    Select Included Products & Services
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-3 bg-white border border-slate-200 rounded-2xl scrollbar-none">
                    {dishes.map((dish) => {
                      const isSelected = dealItems.includes(dish.id);
                      return (
                        <button
                          key={dish.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setDealItems(
                                dealItems.filter((id) => id !== dish.id),
                              );
                            } else {
                              setDealItems([...dealItems, dish.id]);
                            }
                          }}
                          className={`p-3 rounded-xl border text-left flex items-center gap-3 transition text-xs cursor-pointer ${
                            isSelected
                              ? "bg-[#D70F64]/10 border-[#D70F64] text-slate-700"
                              : "bg-slate-100/40 border-slate-200 text-slate-600 hover:bg-slate-200/40 hover:text-slate-800"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // click handled on container
                            className="accent-[#D70F64] scale-105 pointer-events-none"
                          />
                          <div className="truncate flex-1">
                            <p className="font-bold truncate text-slate-800 leading-snug">
                              {dish.name}
                            </p>
                            <p className="text-[9.5px] text-slate-500 font-extrabold uppercase mt-0.5 tracking-wide">
                              {dish.category} • Rs. {dish.price}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block leading-relaxed">
                    💡 Active Deal of the Hour items will dynamically show the
                    discounted price calculated from your discount rate.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Manage Restaurants */}
          {activeSubTab === "restaurants" && (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
                <div className="flex items-center gap-3 mb-6 border-b border-slate-200/50 pb-4">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-wide uppercase">
                      Restaurants & Vendors Manager
                    </h3>
                    <p className="text-[11px] text-slate-600 font-medium">
                      Control opening/closing hours and register new partners
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Register New Restaurant */}
                  <div className="bg-white border border-slate-200 border border-slate-200 p-5 rounded-2xl space-y-4">
                    <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Plus className="w-3.5 h-3.5 text-emerald-400" /> Add New
                      Restaurant
                    </h4>
                    <div className="space-y-3">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Restaurant Name
                      </label>
                      <input
                        type="text"
                        value={newRestaurantInput}
                        onChange={(e) => setNewRestaurantInput(e.target.value)}
                        placeholder="e.g. Dadu Pizza Shop"
                        className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none text-slate-900 focus:border-purple-500/60 transition"
                      />
                      <button
                        onClick={handleAddNewRestaurant}
                        disabled={!newRestaurantInput.trim()}
                        className={`w-full py-3 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                          !newRestaurantInput.trim()
                            ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                            : "bg-emerald-500 hover:bg-emerald-600 text-black shadow-lg shadow-emerald-500/10 cursor-pointer hover:scale-[1.02] active:scale-95"
                        }`}
                      >
                        <UserPlus className="w-4 h-4 shrink-0" />
                        Register Vendor
                      </button>
                    </div>
                  </div>

                  {/* Schedule Manager */}
                  <div className="bg-white border border-slate-200 border border-slate-200 p-5 rounded-2xl space-y-4">
                    <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Settings className="w-3.5 h-3.5 text-purple-400" />{" "}
                      Manage Timings
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                          Select Vendor
                        </label>
                        <div className="relative">
                          <select
                            value={selectedScheduleRestaurant}
                            onChange={(e) =>
                              setSelectedScheduleRestaurant(e.target.value)
                            }
                            className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none appearance-none focus:border-purple-500/60 transition"
                          >
                            {uniqueRestaurants.map((rest) => (
                              <option key={rest} value={rest}>
                                {rest}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                            <svg
                              width="14"
                              height="14"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-slate-100 p-3 rounded-xl border border-slate-200">
                        <div>
                          <h5 className="font-bold text-xs text-slate-900">
                            Temporarily Unavailable
                          </h5>
                          <p className="text-[9px] text-slate-500 mt-0.5">
                            Pause orders immediately
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer group">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={restStatusUnavailable}
                            onChange={(e) =>
                              setRestStatusUnavailable(e.target.checked)
                            }
                          />
                          <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-500/40 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-700 after:border-slate-700 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                            Open Time
                          </label>
                          <input
                            type="time"
                            value={restOpeningTime}
                            onChange={(e) => setRestOpeningTime(e.target.value)}
                            className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none text-slate-900 focus:border-purple-500/60 transition"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                            Close Time
                          </label>
                          <input
                            type="time"
                            value={restClosingTime}
                            onChange={(e) => setRestClosingTime(e.target.value)}
                            className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none text-slate-900 focus:border-purple-500/60 transition"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                          Restaurant Contact Phone
                        </label>
                        <input
                          type="text"
                          value={restPhone}
                          onChange={(e) => setRestPhone(e.target.value)}
                          placeholder="e.g. 03277004471"
                          className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none text-slate-900 focus:border-purple-500/60 transition"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                            Min Order
                          </label>
                          <input
                            type="number"
                            value={restMinOrder}
                            onChange={(e) => setRestMinOrder(e.target.value)}
                            placeholder="e.g. 300"
                            className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none text-slate-900 focus:border-purple-500/60 transition"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                            Delivery Charge Text
                          </label>
                          <input
                            type="text"
                            value={restDeliveryCharge}
                            onChange={(e) => setRestDeliveryCharge(e.target.value)}
                            placeholder="e.g. Rs. 50-100"
                            className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none text-slate-900 focus:border-purple-500/60 transition"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <ProductImageSelector
                          imageUrl={restImageUrl}
                          onChange={setRestImageUrl}
                          label="Restaurant Cover Image"
                          accentColorClass="purple"
                          placeholder="Paste image web address (https://...)"
                          uploadPath={`restaurants/${selectedScheduleRestaurant}/cover`}
                        />
                      </div>

                      <div className="flex flex-col gap-2 mt-2">
                        <button
                          onClick={handleSaveDeliveryConfig}
                          className="w-full bg-purple-500 hover:bg-purple-600 transition-all text-black font-black py-3 rounded-xl text-[11px] uppercase tracking-wider cursor-pointer shadow-lg shadow-purple-500/10 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
                        >
                          <Save className="w-4 h-4 shrink-0" />
                          Save Operating Times
                        </button>

                        <button
                          onClick={() => {
                            setNewItemRestaurantName(
                              selectedScheduleRestaurant,
                            );
                            setActiveSubTab("items");
                            setNewItemType("food");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all text-slate-800 font-black py-3 rounded-xl text-[11px] uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
                        >
                          <ListCollapse className="w-4 h-4 shrink-0" />
                          Manage Menu / Items
                        </button>

                        <button
                          onClick={() =>
                            handleRenameRestaurant(selectedScheduleRestaurant)
                          }
                          className="w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/30 transition-all font-black py-3 rounded-xl text-[11px] uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Pencil className="w-4 h-4 shrink-0" />
                          Rename Vendor
                        </button>

                        <button
                          onClick={() =>
                            handleDeleteRestaurant(selectedScheduleRestaurant)
                          }
                          className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 transition-all font-black py-3 rounded-xl text-[11px] uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4 shrink-0" />
                          Delete Vendor & Items
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Existing Restaurants Directory */}
                <div className="mt-8 bg-white border border-slate-200 border border-slate-200 p-5 rounded-2xl space-y-4">
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <ListCollapse className="w-3.5 h-3.5 text-purple-400" /> Existing Vendors Directory
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {uniqueRestaurants.map((restName) => (
                      <div
                        key={restName}
                        className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center justify-between group hover:border-purple-500/30 transition-colors"
                      >
                        <span className="text-xs font-bold text-slate-800 line-clamp-1 pr-2">
                          {restName}
                        </span>
                        <button
                          onClick={() => handleDeleteRestaurant(restName)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 text-pink-400 hover:bg-red-500 hover:text-slate-900 transition-colors shrink-0 cursor-pointer"
                          title={`Delete ${restName}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {uniqueRestaurants.length === 0 && (
                      <p className="text-[10px] text-slate-500 italic col-span-full">No vendors found.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Manage Items Directory */}
          {activeSubTab === "items" && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center justify-between bg-[#0b0b0d]/80  border border-slate-200 p-4 rounded-2xl shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D70F64]/10 flex items-center justify-center">
                    <ListCollapse className="w-5 h-5 text-[#D70F64]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 tracking-wide uppercase">
                      Managing Menu
                    </h3>
                    <p className="text-[11px] text-slate-600 font-medium">
                      For:{" "}
                      <span className="text-[#D70F64] font-bold">
                        {newItemRestaurantName || "All Vendors"}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                        const btn = document.getElementById("clear-menu-btn");
                        if (btn && btn.getAttribute("data-confirm") !== "true") {
                           btn.setAttribute("data-confirm", "true");
                           btn.innerText = "🔥 ARE YOU SURE? CLICK AGAIN!";
                           setTimeout(() => {
                               if (btn) {
                                   btn.removeAttribute("data-confirm");
                                   btn.innerText = "🔥 CLEAR ENTIRE MENU";
                               }
                           }, 3000);
                           return;
                        }
                        
                        if (btn) {
                            btn.innerText = "⏳ DELETING...";
                        }
                        try {
                          const menuRef = collection(db, "menu");
                          const snapshot = await getDocs(menuRef);
                          const deletePromises = snapshot.docs.map(document => deleteDoc(doc(db, "menu", document.id)));
                          await Promise.all(deletePromises);
                          console.log("Menu database has been completely wiped.");
                          if (btn) {
                              btn.innerText = "✅ CLEARED";
                              setTimeout(() => {
                                  if (btn) {
                                      btn.removeAttribute("data-confirm");
                                      btn.innerText = "🔥 CLEAR ENTIRE MENU";
                                  }
                              }, 2000);
                          }
                        } catch (err) {
                          console.error(err);
                          console.log("Failed to delete menu. Check permissions.");
                          if (btn) {
                              btn.removeAttribute("data-confirm");
                              btn.innerText = "❌ FAILED (CHECK CONSOLE)";
                              setTimeout(() => {
                                 if (btn) btn.innerText = "🔥 CLEAR ENTIRE MENU";
                              }, 2000);
                          }
                        }
                    }}
                    id="clear-menu-btn"
                    className="bg-pink-950/40 hover:bg-pink-900/60 text-red-500 px-4 py-2 rounded-xl text-[10px] uppercase font-black tracking-wider transition-colors border border-pink-900/50 hover:border-red-500/50 flex items-center gap-2"
                  >
                    🔥 CLEAR ENTIRE MENU
                  </button>
                  <button
                    onClick={handleImportTastyBites}
                    disabled={isImportingTasty}
                    className="bg-[#D70F64] hover:bg-[#b00c50] disabled:opacity-50 text-neutral-950 px-4 py-2 rounded-xl text-[10px] uppercase font-black tracking-wider transition-colors border border-[#f22a7f] flex items-center gap-2"
                  >
                    {isImportingTasty ? `⏳ IMPORTING (${importProgressTasty}%)` : `📥 IMPORT TASTY BITES`}
                  </button>
                  <button
                    onClick={() => {
                      setActiveSubTab("restaurants");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="bg-slate-100 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] uppercase font-black tracking-wider transition-colors border border-slate-200 hover:border-slate-300 flex items-center gap-2"
                  >
                  <svg
                    width="12"
                    height="12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  Back to Restaurants
                </button>
              </div>
              </div>

              {/* Add New Dish / Home Service Product Form */}
              <form
                onSubmit={handleAddNewItem}
                className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-5 relative"
              >
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D70F64]/10 to-transparent" />
                <h4 className="font-black text-sm text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-200/50 uppercase tracking-wide">
                  <Plus className="w-4 h-4 text-[#D70F64]" />
                  Register New Dish / Home Service Product
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 text-xs">
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">
                      Title Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="e.g. Premium Beef Cheese Burger"
                      className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-xl text-slate-900 outline-none text-slate-900 focus:border-[#D70F64] transition focus:ring-1 focus:ring-[#D70F64]/10 animate-pulse-subtle"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">
                      Catalog Category
                    </label>
                    <select
                      value={newItemCategory}
                      onChange={(e) =>
                        setNewItemCategory(e.target.value as Dish["category"])
                      }
                      className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-xl text-slate-900 outline-none text-slate-900 focus:border-[#D70F64] cursor-pointer transition focus:ring-1 focus:ring-[#D70F64]/10"
                    >
                      {foodCategories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name} {cat.emoji}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">
                      Base Price (Rs.)
                    </label>
                    <input
                      type="number"
                      required
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(Number(e.target.value))}
                      placeholder="e.g. 500"
                      className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-xl text-slate-900 outline-none text-slate-900 focus:border-[#D70F64] transition focus:ring-1 focus:ring-[#D70F64]/10"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">
                      Discount Price (Rs.)
                    </label>
                    <input
                      type="number"
                      value={newItemDiscountPrice || ""}
                      onChange={(e) =>
                        setNewItemDiscountPrice(Number(e.target.value))
                      }
                      placeholder="Optional"
                      className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-xl text-slate-900 outline-none text-slate-900 focus:border-[#D70F64] transition focus:ring-1 focus:ring-[#D70F64]/10"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-emerald-500 font-bold uppercase tracking-widest text-[9px]">
                      Commission (Rs.)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newItemCommission}
                      onChange={(e) =>
                        setNewItemCommission(Number(e.target.value))
                      }
                      placeholder="Commission"
                      className="w-full p-3 bg-white border border-slate-200 border border-emerald-900 rounded-xl text-slate-900 outline-none text-slate-900 focus:border-emerald-500 transition focus:ring-1 focus:ring-emerald-500/10 font-bold"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">
                      Description Information
                    </label>
                    <input
                      type="text"
                      value={newItemDescription}
                      onChange={(e) => setNewItemDescription(e.target.value)}
                      placeholder="Brief descriptive labels shown to customers"
                      className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-xl text-slate-900 outline-none text-slate-900 focus:border-[#D70F64] transition focus:ring-1 focus:ring-[#D70F64]/10"
                    />
                  </div>

                  <div className="md:col-span-4 space-y-1.5">
                    <ProductImageSelector
                      imageUrl={newItemImageUrl}
                      onChange={setNewItemImageUrl}
                      label="Product Picture / Illustration"
                      accentColorClass="amber"
                      placeholder="Blank for auto high quality illustration, or paste URL"
                    />
                  </div>

                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-[#D70F64] font-bold uppercase tracking-widest text-[9px]">
                      Restaurant / Partner Shop Name
                    </label>
                    <div className="relative">
                      <select
                        value={newItemRestaurantName}
                        onChange={(e) =>
                          setNewItemRestaurantName(e.target.value)
                        }
                        className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-xl text-slate-900 outline-none appearance-none focus:border-[#D70F64] transition focus:ring-1 focus:ring-[#D70F64]/10"
                      >
                        <option value="">
                          Default (Auto-selects based on category)
                        </option>
                        {uniqueRestaurants.map((rest) => (
                          <option key={rest} value={rest}>
                            {rest}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                        <svg
                          width="14"
                          height="14"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {newItemType === "food" && (
                    <>
                      <div className="md:col-span-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <label className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">
                            Sizes & Prices (Optional)
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setNewItemSizes([
                                ...newItemSizes,
                                { name: "", price: 0, imageUrl: "" },
                              ])
                            }
                            className="bg-[#D70F64]/10 text-[#D70F64] px-2 py-1 rounded text-[10px] font-bold hover:bg-[#D70F64]/20"
                          >
                            + Add Size
                          </button>
                        </div>
                        {newItemSizes.map((size, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col gap-2 bg-white border border-slate-200 p-3 rounded-xl border border-slate-200 relative"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                const newSizes = [...newItemSizes];
                                newSizes.splice(idx, 1);
                                setNewItemSizes(newSizes);
                              }}
                              className="absolute top-2 right-2 text-red-500 hover:bg-red-500/10 rounded-full p-1"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <div className="grid grid-cols-2 gap-2 pr-6">
                              <input
                                type="text"
                                value={size.name}
                                onChange={(e) => {
                                  const newSizes = [...newItemSizes];
                                  newSizes[idx].name = e.target.value;
                                  setNewItemSizes(newSizes);
                                }}
                                placeholder="Size (e.g. Small)"
                                className="w-full p-2 bg-transparent text-slate-900 text-xs outline-none border border-slate-200 rounded-lg focus:border-[#D70F64]"
                              />
                              <input
                                type="number"
                                value={size.price || ""}
                                onChange={(e) => {
                                  const newSizes = [...newItemSizes];
                                  newSizes[idx].price = Number(e.target.value);
                                  setNewItemSizes(newSizes);
                                }}
                                placeholder="Price"
                                className="w-full p-2 bg-transparent text-slate-900 text-xs outline-none border border-slate-200 rounded-lg focus:border-[#D70F64]"
                              />
                            </div>
                            <ProductImageSelector
                              imageUrl={size.imageUrl || ""}
                              onChange={(url) => {
                                const newSizes = [...newItemSizes];
                                newSizes[idx].imageUrl = url;
                                setNewItemSizes(newSizes);
                              }}
                              label={`Size Image: ${size.name || "Untitled"}`}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="md:col-span-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <label className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">
                            Flavors / Variants (Optional)
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setNewItemFlavors([
                                ...newItemFlavors,
                                { name: "", price: 0, imageUrl: "" },
                              ])
                            }
                            className="bg-[#D70F64]/10 text-[#D70F64] px-2 py-1 rounded text-[10px] font-bold hover:bg-[#D70F64]/20"
                          >
                            + Add Flavor
                          </button>
                        </div>
                        {newItemFlavors.map((flavor, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col gap-2 bg-white border border-slate-200 p-3 rounded-xl border border-slate-200 relative"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                const newFlavors = [...newItemFlavors];
                                newFlavors.splice(idx, 1);
                                setNewItemFlavors(newFlavors);
                              }}
                              className="absolute top-2 right-2 text-red-500 hover:bg-red-500/10 rounded-full p-1"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pr-6">
                              <input
                                type="text"
                                value={flavor.name}
                                onChange={(e) => {
                                  const newFlavors = [...newItemFlavors];
                                  newFlavors[idx].name = e.target.value;
                                  setNewItemFlavors(newFlavors);
                                }}
                                placeholder="Flavor Name"
                                className="w-full p-2 bg-transparent text-slate-900 text-xs outline-none border border-slate-200 rounded-lg focus:border-[#D70F64]"
                              />
                              <input
                                type="number"
                                value={flavor.price || ""}
                                onChange={(e) => {
                                  const newFlavors = [...newItemFlavors];
                                  newFlavors[idx].price = Number(
                                    e.target.value,
                                  );
                                  setNewItemFlavors(newFlavors);
                                }}
                                placeholder="Extra Price (0 = Free)"
                                className="w-full p-2 bg-transparent text-slate-900 text-xs outline-none border border-slate-200 rounded-lg focus:border-[#D70F64]"
                              />
                              <input
                                type="number"
                                value={flavor.originalPrice || ""}
                                onChange={(e) => {
                                  const newFlavors = [...newItemFlavors];
                                  newFlavors[idx].originalPrice = Number(
                                    e.target.value,
                                  );
                                  setNewItemFlavors(newFlavors);
                                }}
                                placeholder="Original Price"
                                className="w-full p-2 bg-transparent text-slate-900 text-xs outline-none border border-slate-200 rounded-lg focus:border-[#D70F64]"
                              />
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <label className="text-xs text-slate-900 flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={flavor.isPopular || false}
                                  onChange={(e) => {
                                    const newFlavors = [...newItemFlavors];
                                    newFlavors[idx].isPopular =
                                      e.target.checked;
                                    setNewItemFlavors(newFlavors);
                                  }}
                                  className="w-4 h-4 rounded text-[#D70F64] bg-slate-100 border-slate-300"
                                />
                                Mark as Popular
                              </label>
                            </div>
                            <ProductImageSelector
                              imageUrl={flavor.imageUrl || ""}
                              onChange={(url) => {
                                const newFlavors = [...newItemFlavors];
                                newFlavors[idx].imageUrl = url;
                                setNewItemFlavors(newFlavors);
                              }}
                              label={`Flavor Image: ${flavor.name || "Untitled"}`}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="md:col-span-4 space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                          <label className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">
                            Add-ons (Optional)
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setNewItemAddOns([
                                ...newItemAddOns,
                                {
                                  name: "",
                                  price: 0,
                                  imageUrl: "",
                                  originalPrice: 0,
                                },
                              ])
                            }
                            className="bg-[#D70F64]/10 text-[#D70F64] px-2 py-1 rounded text-[10px] font-bold hover:bg-[#D70F64]/20"
                          >
                            + Add Add-on
                          </button>
                        </div>
                        {newItemAddOns.map((ad, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col gap-2 bg-white border border-slate-200 p-3 rounded-xl border border-slate-200 relative"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                const newAds = [...newItemAddOns];
                                newAds.splice(idx, 1);
                                setNewItemAddOns(newAds);
                              }}
                              className="absolute top-2 right-2 text-red-500 hover:bg-red-500/10 rounded-full p-1"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pr-6">
                              <input
                                type="text"
                                value={ad.name}
                                onChange={(e) => {
                                  const newAds = [...newItemAddOns];
                                  newAds[idx].name = e.target.value;
                                  setNewItemAddOns(newAds);
                                }}
                                placeholder="Add-on Name"
                                className="w-full p-2 bg-transparent text-slate-900 text-xs outline-none border border-slate-200 rounded-lg focus:border-[#D70F64]"
                              />
                              <input
                                type="number"
                                value={ad.price || ""}
                                onChange={(e) => {
                                  const newAds = [...newItemAddOns];
                                  newAds[idx].price = Number(e.target.value);
                                  setNewItemAddOns(newAds);
                                }}
                                placeholder="Extra Price"
                                className="w-full p-2 bg-transparent text-slate-900 text-xs outline-none border border-slate-200 rounded-lg focus:border-[#D70F64]"
                              />
                              <input
                                type="number"
                                value={ad.originalPrice || ""}
                                onChange={(e) => {
                                  const newAds = [...newItemAddOns];
                                  newAds[idx].originalPrice = Number(
                                    e.target.value,
                                  );
                                  setNewItemAddOns(newAds);
                                }}
                                placeholder="Orig. Price"
                                className="w-full p-2 bg-transparent text-slate-900 text-xs outline-none border border-slate-200 rounded-lg focus:border-[#D70F64]"
                              />
                            </div>
                            <ProductImageSelector
                              imageUrl={ad.imageUrl || ""}
                              onChange={(url) => {
                                const newAds = [...newItemAddOns];
                                newAds[idx].imageUrl = url;
                                setNewItemAddOns(newAds);
                              }}
                              label={`Add-on Image: ${ad.name || "Untitled"}`}
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-[#D70F64] hover:bg-[#b00c50] transition-all font-black text-xs tracking-widest text-black uppercase py-3.5 px-6 rounded-2xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#D70F64]/10 hover:scale-[1.02] active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    Dispatch Item to Database
                  </button>
                </div>
              </form>

              {/* Items Table List */}
              <div className="bg-[#0b0b0d]/80  border border-slate-200 rounded-[24px] overflow-hidden shadow-sm relative">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D70F64]/10 to-transparent" />
                <div className="p-5 border-b border-slate-200/50 bg-slate-100/15">
                  <h4 className="font-black text-sm text-slate-900 uppercase tracking-wide">
                    Operational Catalog Directory
                  </h4>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Enable availability controls and edit prices instantly
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-slate-600 font-medium">
                    <thead className="bg-white border border-slate-200/70 text-slate-500 uppercase font-black tracking-widest text-[9px] border-b border-slate-200/40">
                      <tr>
                        <th className="p-4.5">Item Name</th>
                        <th className="p-4.5">Category</th>
                        <th className="p-4.5">Type</th>
                        <th className="p-4.5">Price (Rs.)</th>
                        <th className="p-4.5 text-center">Featured</th>
                        <th className="p-4.5 text-center">ON/OFF Toggle</th>
                        <th className="p-4.5 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/40">
                      {dishes
                        .filter((dish) => {
                          if (dish.type === "service") return false;
                          if (!newItemRestaurantName) return true;
                          const dishRest =
                            dish.restaurantName || "Dadu Fast Food & Kitchen";
                          return dishRest === newItemRestaurantName;
                        })
                        .map((dish) => (
                          <tr
                            key={dish.id}
                            className="hover:bg-slate-100/20 transition-colors"
                          >
                            <td className="p-4 font-bold text-gray-200">
                              <div className="flex items-center gap-3">
                                {dish.imageUrl ? (
                                  <img
                                    src={dish.imageUrl}
                                    alt={dish.name}
                                    className="w-8 h-8 rounded-lg object-cover bg-white border border-slate-200 shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                    <span className="text-[7px] text-slate-500 font-black uppercase text-center leading-tight">No<br/>Img</span>
                                  </div>
                                )}
                                <div className="truncate max-w-xs">
                                  <div>{dish.name}</div>
                                  <div className="text-[10px] text-slate-500 font-medium font-sans mt-0.5">
                                    🏪 Shop:{" "}
                                    <span className="text-[#D70F64] font-bold">
                                      {dish.restaurantName ||
                                        (dish.type === "service"
                                          ? "Dadu Home Services"
                                          : "Dadu Fast Food & Kitchen")}
                                    </span>
                                  </div>
                                  {dish.type === "service" &&
                                    dish.serviceDuration && (
                                      <div className="text-[10px] text-slate-500 font-medium font-sans mt-0.5">
                                        ⏱️ Duration:{" "}
                                        <span className="text-[#D70F64] font-bold">
                                          {dish.serviceDuration}
                                        </span>
                                      </div>
                                    )}
                                </div>
                              </div>
                            </td>
                            <td className="p-4">{dish.category}</td>
                            <td className="p-4">
                              <span
                                className={`px-2 py-0.5 rounded-md font-bold text-[9px] uppercase ${
                                  dish.type === "service"
                                    ? "bg-amber-950 border border-amber-900 text-[#D70F64]"
                                    : "bg-slate-100 border border-slate-200 text-slate-700"
                                }`}
                              >
                                {dish.type}
                              </span>
                            </td>
                            <td className="p-4">
                              {editingPriceDishId === dish.id ? (
                                <div className="flex flex-col gap-1.5 min-w-[200px]">
                                  <div className="mb-2">
                                    <ProductImageSelector
                                      imageUrl={editingImageUrl}
                                      onChange={setEditingImageUrl}
                                      label="Update Image"
                                      accentColorClass="amber"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[8px] text-slate-500 uppercase font-bold w-12">
                                      Name:
                                    </span>
                                    <input
                                      type="text"
                                      value={editingNameInput}
                                      onChange={(e) =>
                                        setEditingNameInput(e.target.value)
                                      }
                                      className="flex-1 p-1 bg-[#1a1a1a] border border-[#D70F64] text-slate-900 rounded text-xs leading-none"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[8px] text-slate-500 uppercase font-bold w-12">
                                      Price:
                                    </span>
                                    <input
                                      type="number"
                                      value={editingPriceInput}
                                      onChange={(e) =>
                                        setEditingPriceInput(
                                          Number(e.target.value),
                                        )
                                      }
                                      className="w-20 p-1 bg-[#1a1a1a] border border-[#D70F64] text-slate-900 rounded text-xs leading-none"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[8px] text-slate-500 uppercase font-bold w-12">
                                      Discount:
                                    </span>
                                    <input
                                      type="number"
                                      value={editingDiscountPriceInput}
                                      onChange={(e) =>
                                        setEditingDiscountPriceInput(
                                          Number(e.target.value),
                                        )
                                      }
                                      className="w-20 p-1 bg-[#1a1a1a] border border-[#D70F64] text-slate-900 rounded text-xs leading-none"
                                      placeholder="0 for none"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[8px] text-emerald-400 uppercase font-bold w-12">
                                      Comm:
                                    </span>
                                    <input
                                      type="number"
                                      value={editingCommissionInput}
                                      onChange={(e) =>
                                        setEditingCommissionInput(
                                          Number(e.target.value),
                                        )
                                      }
                                      className="w-20 p-1 bg-[#1a1a1a] border border-emerald-500 text-slate-900 rounded text-xs leading-none"
                                      placeholder="Commission"
                                    />
                                  </div>
                                  {dish.type === "food" && (
                                    <div className="mt-2 space-y-3 border-t border-slate-200 pt-2">
                                      <div className="flex flex-col gap-1">
                                        <div className="flex justify-between items-center">
                                          <span className="text-[9px] text-slate-500 uppercase font-bold">
                                            Sizes
                                          </span>
                                          <button
                                            onClick={() =>
                                              setEditingSizes([
                                                ...editingSizes,
                                                {
                                                  name: "",
                                                  price: 0,
                                                  imageUrl: "",
                                                },
                                              ])
                                            }
                                            className="text-[9px] text-[#D70F64] hover:underline"
                                          >
                                            + Add
                                          </button>
                                        </div>
                                        {editingSizes.map((sz, idx) => (
                                          <div key={idx} className="flex flex-col gap-2 p-2 bg-slate-100/50 rounded border border-slate-200">
                                            <div className="flex gap-1">
                                              <input
                                                type="text"
                                                value={sz.name}
                                                onChange={(e) => {
                                                  const n = [...editingSizes];
                                                  n[idx].name = e.target.value;
                                                  setEditingSizes(n);
                                                }}
                                                placeholder="Name"
                                                className="flex-1 p-1 bg-[#1a1a1a] border border-slate-300 text-slate-900 rounded text-[10px]"
                                              />
                                              <input
                                                type="number"
                                                value={sz.price || ""}
                                                onChange={(e) => {
                                                  const n = [...editingSizes];
                                                  n[idx].price = Number(
                                                    e.target.value,
                                                  );
                                                  setEditingSizes(n);
                                                }}
                                                placeholder="Price"
                                                className="w-16 p-1 bg-[#1a1a1a] border border-slate-300 text-slate-900 rounded text-[10px]"
                                              />
                                              <button
                                                onClick={() => {
                                                  const n = [...editingSizes];
                                                  n.splice(idx, 1);
                                                  setEditingSizes(n);
                                                }}
                                                className="text-red-500 text-[10px] px-1 bg-red-500/10 rounded ml-1"
                                              >
                                                ✕
                                              </button>
                                            </div>
                                            <ProductImageSelector
                                              imageUrl={sz.imageUrl || ""}
                                              onChange={(url) => {
                                                const n = [...editingSizes];
                                                n[idx].imageUrl = url;
                                                setEditingSizes(n);
                                              }}
                                              label="Size Image"
                                            />
                                          </div>
                                        ))}
                                      </div>
                                      <div className="flex flex-col gap-1">
                                        <div className="flex justify-between items-center">
                                          <span className="text-[9px] text-slate-500 uppercase font-bold">
                                            Flavors
                                          </span>
                                          <button
                                            onClick={() =>
                                              setEditingFlavors([
                                                ...editingFlavors,
                                                {
                                                  name: "",
                                                  price: 0,
                                                  imageUrl: "",
                                                },
                                              ])
                                            }
                                            className="text-[9px] text-[#D70F64] hover:underline"
                                          >
                                            + Add
                                          </button>
                                        </div>
                                        {editingFlavors.map((fl, idx) => (
                                          <div
                                            key={idx}
                                            className="flex flex-col gap-2 p-2 bg-slate-100/50 rounded border border-slate-200"
                                          >
                                            <div className="flex gap-1 items-center flex-wrap">
                                              <input
                                                type="text"
                                                value={fl.name}
                                                onChange={(e) => {
                                                  const n = [...editingFlavors];
                                                  n[idx].name = e.target.value;
                                                  setEditingFlavors(n);
                                                }}
                                                placeholder="Name"
                                                className="w-16 p-1 bg-[#1a1a1a] border border-slate-300 text-slate-900 rounded text-[10px]"
                                              />
                                              <input
                                                type="number"
                                                value={fl.price || ""}
                                                onChange={(e) => {
                                                  const n = [...editingFlavors];
                                                  n[idx].price = Number(
                                                    e.target.value,
                                                  );
                                                  setEditingFlavors(n);
                                                }}
                                                placeholder="Ex Price"
                                                className="w-14 p-1 bg-[#1a1a1a] border border-slate-300 text-slate-900 rounded text-[10px]"
                                              />
                                              <input
                                                type="number"
                                                value={fl.originalPrice || ""}
                                                onChange={(e) => {
                                                  const n = [...editingFlavors];
                                                  n[idx].originalPrice = Number(
                                                    e.target.value,
                                                  );
                                                  setEditingFlavors(n);
                                                }}
                                                placeholder="Orig"
                                                className="w-12 p-1 bg-[#1a1a1a] border border-slate-300 text-slate-900 rounded text-[10px]"
                                              />
                                              <label className="text-[9px] text-slate-600 flex items-center gap-0.5 ml-auto">
                                                <input
                                                  type="checkbox"
                                                  checked={fl.isPopular}
                                                  onChange={(e) => {
                                                    const n = [...editingFlavors];
                                                    n[idx].isPopular =
                                                      e.target.checked;
                                                    setEditingFlavors(n);
                                                  }}
                                                />{" "}
                                                Pop
                                              </label>
                                              <button
                                                onClick={() => {
                                                  const n = [...editingFlavors];
                                                  n.splice(idx, 1);
                                                  setEditingFlavors(n);
                                                }}
                                                className="text-red-500 text-[10px] px-1 bg-red-500/10 rounded ml-1"
                                              >
                                                ✕
                                              </button>
                                            </div>
                                            <ProductImageSelector
                                              imageUrl={fl.imageUrl || ""}
                                              onChange={(url) => {
                                                const n = [...editingFlavors];
                                                n[idx].imageUrl = url;
                                                setEditingFlavors(n);
                                              }}
                                              label="Flavor Image"
                                            />
                                          </div>
                                        ))}
                                      </div>
                                      <div className="flex flex-col gap-0.5 mt-1 mb-1">
                                        <div className="flex justify-between items-center">
                                          <span className="text-[8px] text-slate-500 uppercase font-bold">
                                            Add-ons (Optional)
                                          </span>
                                          <button
                                            onClick={() =>
                                              setEditingAddOns([
                                                ...editingAddOns,
                                                { name: "", price: 0 },
                                              ])
                                            }
                                            className="text-[9px] text-[#D70F64] font-bold"
                                          >
                                            + Add
                                          </button>
                                        </div>
                                        {editingAddOns.map((ad, idx) => (
                                          <div
                                            key={idx}
                                            className="flex flex-col gap-2 p-2 bg-slate-100/50 rounded border border-slate-200 mb-1"
                                          >
                                            <div className="flex gap-1 items-center">
                                              <input
                                                type="text"
                                                value={ad.name}
                                                onChange={(e) => {
                                                  const n = [...editingAddOns];
                                                  n[idx].name = e.target.value;
                                                  setEditingAddOns(n);
                                                }}
                                                placeholder="Addon Name"
                                                className="flex-1 p-1 bg-[#1a1a1a] border border-slate-300 text-slate-900 rounded text-[10px]"
                                              />
                                              <input
                                                type="number"
                                                value={ad.price || ""}
                                                onChange={(e) => {
                                                  const n = [...editingAddOns];
                                                  n[idx].price = Number(
                                                    e.target.value,
                                                  );
                                                  setEditingAddOns(n);
                                                }}
                                                placeholder="Extra Price"
                                                className="w-16 p-1 bg-[#1a1a1a] border border-slate-300 text-slate-900 rounded text-[10px]"
                                              />
                                              <input
                                                type="number"
                                                value={ad.originalPrice || ""}
                                                onChange={(e) => {
                                                  const n = [...editingAddOns];
                                                  n[idx].originalPrice = Number(
                                                    e.target.value,
                                                  );
                                                  setEditingAddOns(n);
                                                }}
                                                placeholder="Orig Price"
                                                className="w-16 p-1 bg-[#1a1a1a] border border-slate-300 text-slate-900 rounded text-[10px]"
                                              />
                                              <button
                                                onClick={() => {
                                                  const n = [...editingAddOns];
                                                  n.splice(idx, 1);
                                                  setEditingAddOns(n);
                                                }}
                                                className="text-red-500 text-[10px] px-1 bg-red-500/10 rounded ml-1"
                                              >
                                                ✕
                                              </button>
                                            </div>
                                            <ProductImageSelector
                                              imageUrl={ad.imageUrl || ""}
                                              onChange={(url) => {
                                                const n = [...editingAddOns];
                                                n[idx].imageUrl = url;
                                                setEditingAddOns(n);
                                              }}
                                              label="Add-on Image"
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  <div className="flex gap-1 justify-end">
                                    <button
                                      onClick={() =>
                                        setEditingPriceDishId(null)
                                      }
                                      className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[9px] font-bold cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleSavePriceChange(dish)
                                      }
                                      className="px-2 py-0.5 bg-[#D70F64] text-black rounded text-[9px] font-black cursor-pointer shadow-xs animate-pulse-subtle"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-0.5">
                                  {dish.discountPrice &&
                                  dish.discountPrice < dish.price ? (
                                    <>
                                      <span className="font-extrabold text-emerald-400 text-xs">
                                        Rs. {dish.discountPrice}
                                      </span>
                                      <span className="font-bold text-slate-500 text-[10px] line-through">
                                        Rs. {dish.price}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="font-extrabold text-slate-900">
                                      Rs. {dish.price}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">
                                    Comm: Rs. {dish.commission || 0}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setEditingPriceDishId(dish.id);
                                      setEditingNameInput(dish.name);
                                      setEditingImageUrl(dish.imageUrl || "");
                                      setEditingPriceInput(dish.price);
                                      setEditingDiscountPriceInput(
                                        dish.discountPrice || 0,
                                      );
                                      setEditingCommissionInput(
                                        dish.commission || 0,
                                      );
                                      setEditingSizes(
                                        dish.sizes
                                          ? JSON.parse(
                                              JSON.stringify(dish.sizes),
                                            )
                                          : [],
                                      );
                                      setEditingFlavors(
                                        dish.flavors
                                          ? JSON.parse(
                                              JSON.stringify(dish.flavors),
                                            )
                                          : [],
                                      );
                                      setEditingAddOns(
                                        dish.addOns
                                          ? JSON.parse(
                                              JSON.stringify(dish.addOns),
                                            )
                                          : [],
                                      );
                                    }}
                                    className="text-[10px] text-[#D70F64] hover:underline cursor-pointer text-left mt-1 font-bold"
                                  >
                                    Edit Details
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => handleToggleFeatured(dish)}
                                className="inline-flex justify-center transition cursor-pointer text-[#D70F64] hover:scale-110"
                                title="Toggle Featured / Favorite Status"
                              >
                                {dish.isFeatured ? (
                                  <Star className="w-5 h-5 fill-current" />
                                ) : (
                                  <Star className="w-5 h-5 text-slate-500" />
                                )}
                              </button>
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => handleToggleAvailability(dish)}
                                className="inline-flex justify-center transition cursor-pointer"
                              >
                                {dish.isAvailable ? (
                                  <div className="flex items-center gap-1.5 text-emerald-400">
                                    <ToggleRight className="w-7 h-7 stroke-[1.5]" />
                                    <span className="text-[10px] uppercase font-bold tracking-wide">
                                      Available
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 text-slate-500">
                                    <ToggleLeft className="w-7 h-7 stroke-[1.5]" />
                                    <span className="text-[10px] uppercase font-bold tracking-wide text-slate-500">
                                      Sold Out
                                    </span>
                                  </div>
                                )}
                              </button>
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => handleDeleteItem(dish.id)}
                                className="p-2 text-slate-500 hover:text-red-500 hover:bg-pink-950/20 rounded-xl transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2.5: Manage Services Directory */}
          {activeSubTab === "services" && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center justify-between bg-[#0b0b0d]/80  border border-slate-200 p-4 rounded-2xl shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 tracking-wide uppercase">
                      Managing Services
                    </h3>
                    <p className="text-[11px] text-slate-600 font-medium">
                      Home Services & Repair directory
                    </p>
                  </div>
                </div>
              </div>

              <form
                onSubmit={handleAddNewItem}
                className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-5 relative"
              >
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500/10 to-transparent" />
                <h4 className="font-black text-sm text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-200/50 uppercase tracking-wide">
                  <Plus className="w-4 h-4 text-blue-500" />
                  Register New Home Service Product
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 text-xs">
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">
                      Title Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="e.g. AC Repair"
                      className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-xl text-slate-900 outline-none text-slate-900 focus:border-blue-500 transition focus:ring-1 focus:ring-blue-500/10"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">
                      Base Price (Rs.)
                    </label>
                    <input
                      type="number"
                      required
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(Number(e.target.value))}
                      placeholder="e.g. 500"
                      className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-xl text-slate-900 outline-none text-slate-900 focus:border-blue-500 transition focus:ring-1 focus:ring-blue-500/10"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">
                      Discount Price (Rs.)
                    </label>
                    <input
                      type="number"
                      value={newItemDiscountPrice || ""}
                      onChange={(e) =>
                        setNewItemDiscountPrice(Number(e.target.value))
                      }
                      placeholder="Optional"
                      className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-xl text-slate-900 outline-none text-slate-900 focus:border-blue-500 transition focus:ring-1 focus:ring-blue-500/10"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-emerald-500 font-bold uppercase tracking-widest text-[9px]">
                      Commission (Rs.)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newItemCommission}
                      onChange={(e) =>
                        setNewItemCommission(Number(e.target.value))
                      }
                      placeholder="Commission"
                      className="w-full p-3 bg-white border border-slate-200 border border-emerald-900 rounded-xl text-slate-900 outline-none text-slate-900 focus:border-emerald-500 transition focus:ring-1 focus:ring-emerald-500/10 font-bold"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">
                      Description Information
                    </label>
                    <input
                      type="text"
                      value={newItemDescription}
                      onChange={(e) => setNewItemDescription(e.target.value)}
                      placeholder="Brief descriptive labels shown to customers"
                      className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-xl text-slate-900 outline-none text-slate-900 focus:border-blue-500 transition focus:ring-1 focus:ring-blue-500/10"
                    />
                  </div>

                  <div className="md:col-span-4 space-y-1.5">
                    <ProductImageSelector
                      imageUrl={newItemImageUrl}
                      onChange={setNewItemImageUrl}
                      label="Product Picture / Illustration"
                      accentColorClass="blue"
                      placeholder="Blank for auto high quality illustration, or paste URL"
                    />
                  </div>

                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-blue-500 font-bold uppercase tracking-widest text-[9px]">
                      Service Provider / Partner Name
                    </label>
                    <div className="relative">
                      <select
                        value={newItemRestaurantName}
                        onChange={(e) =>
                          setNewItemRestaurantName(e.target.value)
                        }
                        className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-xl text-slate-900 outline-none appearance-none focus:border-blue-500 transition focus:ring-1 focus:ring-blue-500/10"
                      >
                        <option value="">
                          Default (Auto-selects based on category)
                        </option>
                        {uniqueRestaurants.map((rest) => (
                          <option key={rest} value={rest}>
                            {rest}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                        <svg
                          width="14"
                          height="14"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-blue-500 font-bold uppercase tracking-widest text-[9px]">
                      Service Duration / Timing
                    </label>
                    <input
                      type="text"
                      value={newItemServiceDuration}
                      onChange={(e) =>
                        setNewItemServiceDuration(e.target.value)
                      }
                      placeholder="e.g. Expected arrival within 1 hour"
                      className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-xl text-slate-900 outline-none text-slate-900 focus:border-blue-500 transition focus:ring-1 focus:ring-blue-500/10"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-600 transition-all font-black text-xs tracking-widest text-black uppercase py-3.5 px-6 rounded-2xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-500/10 hover:scale-[1.02] active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    Dispatch Service to Database
                  </button>
                </div>
              </form>

              {/* Items Table List */}
              <div className="bg-[#0b0b0d]/80  border border-slate-200 rounded-[24px] overflow-hidden shadow-sm relative">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500/10 to-transparent" />
                <div className="p-5 border-b border-slate-200/50 bg-slate-100/15">
                  <h4 className="font-black text-sm text-slate-900 uppercase tracking-wide">
                    Operational Services Directory
                  </h4>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Enable availability controls and edit prices instantly
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-slate-600 font-medium">
                    <thead className="bg-white border border-slate-200/70 text-slate-500 uppercase font-black tracking-widest text-[9px] border-b border-slate-200/40">
                      <tr>
                        <th className="p-4.5">Service Name</th>
                        <th className="p-4.5">Price (Rs.)</th>
                        <th className="p-4.5 text-center">ON/OFF Toggle</th>
                        <th className="p-4.5 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/40">
                      {dishes
                        .filter((dish) => dish.type === "service")
                        .map((dish) => (
                          <tr
                            key={dish.id}
                            className="hover:bg-slate-100/20 transition-colors"
                          >
                            <td className="p-4 font-bold text-gray-200">
                              <div className="flex items-center gap-3">
                                {dish.imageUrl ? (
                                  <img
                                    src={dish.imageUrl}
                                    alt={dish.name}
                                    className="w-8 h-8 rounded-lg object-cover bg-white border border-slate-200 shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                    <span className="text-[7px] text-slate-500 font-black uppercase text-center leading-tight">No<br/>Img</span>
                                  </div>
                                )}
                                <div className="truncate max-w-xs">
                                  <div>{dish.name}</div>
                                  <div className="text-[10px] text-slate-500 font-medium font-sans mt-0.5">
                                    🏪 Provider:{" "}
                                    <span className="text-blue-500 font-bold">
                                      {dish.restaurantName ||
                                        "Dadu Home Services"}
                                    </span>
                                  </div>
                                  {dish.serviceDuration && (
                                    <div className="text-[10px] text-slate-500 font-medium font-sans mt-0.5">
                                      ⏱️ Duration:{" "}
                                      <span className="text-blue-500 font-bold">
                                        {dish.serviceDuration}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              {editingPriceDishId === dish.id ? (
                                <div className="flex flex-col gap-1.5 min-w-[200px]">
                                  <div className="mb-2">
                                    <ProductImageSelector
                                      imageUrl={editingImageUrl}
                                      onChange={setEditingImageUrl}
                                      label="Update Image"
                                      accentColorClass="blue"
                                    />
                                  </div>
                                  <input
                                    type="text"
                                    value={editingNameInput}
                                    onChange={(e) =>
                                      setEditingNameInput(e.target.value)
                                    }
                                    className="w-full p-2 bg-white border border-slate-200 text-slate-900 text-xs border border-slate-300 focus:border-blue-500 outline-none rounded"
                                    placeholder="Service Name"
                                  />
                                  <input
                                    type="number"
                                    value={editingPriceInput}
                                    onChange={(e) =>
                                      setEditingPriceInput(
                                        Number(e.target.value),
                                      )
                                    }
                                    className="w-full p-2 bg-white border border-slate-200 text-slate-900 text-xs border border-slate-300 focus:border-blue-500 outline-none rounded"
                                    placeholder="New Price"
                                  />
                                  <input
                                    type="number"
                                    value={editingDiscountPriceInput}
                                    onChange={(e) =>
                                      setEditingDiscountPriceInput(
                                        Number(e.target.value),
                                      )
                                    }
                                    className="w-full p-2 bg-white border border-slate-200 text-slate-900 text-xs border border-slate-300 focus:border-blue-500 outline-none rounded"
                                    placeholder="Discount"
                                  />
                                  <input
                                    type="number"
                                    value={editingCommissionInput}
                                    onChange={(e) =>
                                      setEditingCommissionInput(
                                        Number(e.target.value),
                                      )
                                    }
                                    className="w-full p-2 bg-white border border-slate-200 text-slate-900 text-[10px] border border-emerald-900 focus:border-emerald-500 outline-none rounded"
                                    placeholder="Comm."
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() =>
                                        setEditingPriceDishId(null)
                                      }
                                      className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[9px] font-bold cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleSavePriceChange(dish)
                                      }
                                      className="px-2 py-0.5 bg-blue-500 text-black rounded text-[9px] font-black cursor-pointer shadow-xs animate-pulse-subtle"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-0.5">
                                  {dish.discountPrice &&
                                  dish.discountPrice < dish.price ? (
                                    <>
                                      <span className="font-extrabold text-emerald-400 text-xs">
                                        Rs. {dish.discountPrice}
                                      </span>
                                      <span className="font-bold text-slate-500 text-[10px] line-through">
                                        Rs. {dish.price}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="font-extrabold text-slate-900">
                                      Rs. {dish.price}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">
                                    Comm: Rs. {dish.commission || 0}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setEditingPriceDishId(dish.id);
                                      setEditingNameInput(dish.name);
                                      setEditingImageUrl(dish.imageUrl || "");
                                      setEditingPriceInput(dish.price);
                                      setEditingDiscountPriceInput(
                                        dish.discountPrice || 0,
                                      );
                                      setEditingCommissionInput(
                                        dish.commission || 0,
                                      );
                                    }}
                                    className="text-[10px] text-blue-500 hover:underline cursor-pointer text-left mt-1 font-bold"
                                  >
                                    Edit Name, Price & Comm
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => handleToggleAvailability(dish)}
                                className="inline-flex justify-center transition cursor-pointer"
                              >
                                {dish.isAvailable ? (
                                  <div className="flex items-center gap-1.5 text-emerald-400">
                                    <ToggleRight className="w-7 h-7 stroke-[1.5]" />
                                    <span className="text-[10px] uppercase font-bold tracking-wide">
                                      Available
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 text-slate-500">
                                    <ToggleLeft className="w-7 h-7 stroke-[1.5]" />
                                    <span className="text-[10px] uppercase font-bold tracking-wide text-slate-500">
                                      Sold Out
                                    </span>
                                  </div>
                                )}
                              </button>
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => handleDeleteItem(dish.id)}
                                className="p-2 text-slate-500 hover:text-red-500 hover:bg-pink-950/20 rounded-xl transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Live Orders Manager */}
          {activeSubTab === "orders" && (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-[#0b0b0d]/80  border border-slate-200 rounded-[24px] overflow-hidden shadow-sm relative">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D70F64]/10 to-transparent" />
                <div className="p-6 border-b border-slate-200/50 bg-slate-100/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-black text-sm text-slate-900 uppercase tracking-wide">
                      Live Operational Orders Pipeline
                    </h4>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      Monitor order transactions and assign dispatchers in
                      real-time
                    </span>
                  </div>
                  {orders.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllOrderHistory}
                      className="px-4 py-2 bg-pink-950/40 hover:bg-pink-900/30 text-pink-400 border border-pink-900/45 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition shrink-0"
                    >
                      Clear Sales History 🧹
                    </button>
                  )}
                </div>

                <div className="divide-y divide-slate-200/30">
                  {orders.length === 0 ? (
                    <div className="p-16 text-center text-xs text-slate-500 font-bold uppercase tracking-wider">
                      Logs directory is blank. Waiting for live user
                      transactions...
                    </div>
                  ) : (
                    orders.map((order) => {
                      const isSvc = order.orderType === "service";
                      const isActive =
                        order.status !== "delivered" &&
                        order.status !== "completed" &&
                        order.status !== "cancelled";

                      return (
                        <div
                          key={order.id}
                          className="p-6 hover:bg-slate-50 transition-all space-y-5"
                        >
                          {/* Top metadata strip */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-2xl border border-slate-200">
                            <div>
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono text-xs font-black text-slate-900 uppercase bg-slate-100 border border-slate-200 py-1.5 px-3 rounded-lg shadow-inner">
                                  dadu-{order.id.substring(0, 8)}
                                </span>
                                <span
                                  className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                    isSvc
                                      ? "bg-amber-950/80 border border-amber-900/40 text-[#D70F64]"
                                      : "bg-pink-950/80 border border-pink-900/40 text-[#D70F64]"
                                  }`}
                                >
                                  {order.orderType}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-3 items-center mt-3 text-xs text-slate-600">
                                <span className="font-extrabold text-slate-800">
                                  {order.userName}
                                </span>
                                <span className="text-slate-300">|</span>
                                <span className="font-medium text-slate-700 flex items-center gap-2">
                                  Phone:{" "}
                                  <span className="font-bold text-slate-900">
                                    {order.userPhone}
                                  </span>
                                  <a
                                    href={`tel:${order.userPhone}`}
                                    className="inline-flex items-center justify-center p-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-md transition-colors border border-emerald-500/30"
                                    title="Call Customer"
                                  >
                                    📞 Call
                                  </a>
                                </span>
                                <span className="text-slate-300">|</span>
                                <span className="font-medium text-slate-700">
                                  Total:{" "}
                                  <span className="font-black text-[#D70F64]">
                                    Rs. {order.grandTotal}
                                  </span>
                                </span>
                              </div>
                            </div>

                            {/* Status label banner */}
                            <div className="text-left sm:text-right">
                              <span className="text-[10px] uppercase tracking-widest font-black text-slate-500 block">
                                Current Status
                              </span>
                              <span
                                className={`text-xs font-black uppercase mt-1.5 inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-slate-100/60 ${
                                  order.status === "delivered" ||
                                  order.status === "completed"
                                    ? "text-emerald-400 border border-emerald-950/65"
                                    : order.status === "cancelled"
                                      ? "text-red-500 border border-pink-950/65"
                                      : "text-[#D70F64] border border-amber-950/65"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full animate-ping ${
                                    order.status === "delivered" ||
                                    order.status === "completed"
                                      ? "bg-emerald-400"
                                      : order.status === "cancelled"
                                        ? "bg-red-500"
                                        : "bg-[#D70F64]"
                                  }`}
                                />
                                {order.status}
                              </span>
                            </div>
                          </div>

                          {/* Items descriptions and customer address */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-medium">
                            <div className="bg-white border border-slate-200 p-4 rounded-2xl border border-slate-200 space-y-3">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                                Cart Summary
                              </span>
                              <div className="divide-y divide-slate-200/60">
                                {order.items.map((item, id) => (
                                  <div
                                    key={id}
                                    className="py-2 flex justify-between"
                                  >
                                    <span className="text-gray-300 font-medium">
                                      {item.name}{" "}
                                      <span className="text-xs text-[#D70F64] font-black font-sans">
                                        (
                                        {item.restaurantName ||
                                          (item.type === "service"
                                            ? "Dadu Home Services"
                                            : "Dadu Fast Food")}
                                        )
                                      </span>{" "}
                                      <span className="text-slate-500 font-bold">
                                        x{item.quantity}
                                      </span>
                                    </span>
                                    <span className="font-extrabold text-slate-600">
                                      Rs. {item.price * item.quantity}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-200/60 leading-normal font-bold uppercase tracking-wider">
                                {isSvc ? (
                                  <span className="text-[#D70F64]/80">
                                    🛠️ Service inspection visit - PAY ON VISIT
                                  </span>
                                ) : (
                                  <span className="text-orange-500/80">
                                    🍔 Fast food parcel dispatch - CASH ON
                                    DELIVERY
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="bg-white border border-slate-200 p-4 rounded-2xl border border-slate-200 space-y-3">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                                Destination address Coordinates
                              </span>
                              <p className="text-gray-300 leading-relaxed bg-slate-100/20 p-3 rounded-xl border border-slate-200 truncate">
                                📍 {order.userAddress}
                              </p>

                              {/* Logistics parameters inputs (Save Rider / saved ETA) */}
                              {isActive && (
                                <div className="pt-2.5 border-t border-slate-200/60 flex gap-3">
                                  <div className="flex-1 space-y-1">
                                    <span className="text-[8.5px] font-black text-slate-500 tracking-widest block uppercase">
                                      {isSvc
                                        ? "Technician Name"
                                        : "Delivery Rider"}
                                    </span>
                                    <select
                                      value={
                                        riderNames[order.id] ||
                                        order.riderId ||
                                        ""
                                      }
                                      onChange={(e) =>
                                        setRiderNames({
                                          ...riderNames,
                                          [order.id]: e.target.value,
                                        })
                                      }
                                      className="w-full text-xs p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-900 font-medium outline-none text-slate-900 focus:border-[#D70F64] appearance-none"
                                    >
                                      <option value="">-- Select --</option>
                                      {ridersSubset.map((r) => (
                                        <option key={r.uid} value={r.uid}>
                                          {r.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="flex-1 space-y-1">
                                    <span className="text-[8.5px] font-black text-slate-500 tracking-widest block uppercase">
                                      {isSvc ? "Arrival ETA" : "Duration ETA"}
                                    </span>
                                    <input
                                      type="text"
                                      placeholder={isSvc ? "1 Hour" : "25 mins"}
                                      value={
                                        orderEtas[order.id] || order.eta || ""
                                      }
                                      onChange={(e) =>
                                        setOrderEtas({
                                          ...orderEtas,
                                          [order.id]: e.target.value,
                                        })
                                      }
                                      className="w-full text-xs p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-900 font-medium outline-none text-slate-900 focus:border-[#D70F64]"
                                    />
                                  </div>

                                  <button
                                    onClick={() =>
                                      handleSaveRiderAndEta(order.id)
                                    }
                                    className="bg-[#D70F64] hover:bg-[#b00c50] text-black font-black p-2 px-3 rounded-lg self-end text-[10px] uppercase tracking-wider cursor-pointer h-9 shadow-md transition-all flex items-center justify-center shrink-0 hover:scale-[1.02] active:scale-95"
                                  >
                                    Apply
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Interactive order dispatch pipelines selectors */}
                          {isActive && (
                            <div className="pt-2 flex flex-wrap gap-2.5 items-center">
                              <span className="text-[9.5px] font-black uppercase text-[#D70F64]/90 tracking-widest mr-1">
                                Configure Next State:
                              </span>

                              {/* FOOD SPECIFIC DISPATCH BUTTONS */}
                              {!isSvc && (
                                <>
                                  <button
                                    onClick={() =>
                                      handleUpdateOrderStatus(
                                        order.id,
                                        "confirmed",
                                      )
                                    }
                                    className="bg-slate-100 border border-slate-200 hover:border-slate-300 text-gray-300 px-3.5 py-2 rounded-xl transition cursor-pointer text-[10px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95"
                                  >
                                    🤝 Confirmed
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleUpdateOrderStatus(
                                        order.id,
                                        "preparing",
                                      )
                                    }
                                    className="bg-purple-950/20 border border-purple-900/40 text-purple-400 px-3.5 py-2 rounded-xl hover:bg-purple-950/50 transition cursor-pointer text-[10px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95"
                                  >
                                    👩‍🍳 Cooking
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleUpdateOrderStatus(
                                        order.id,
                                        "out_for_delivery",
                                      )
                                    }
                                    className="bg-teal-950/20 border border-teal-900/40 text-teal-400 px-3.5 py-2 rounded-xl hover:bg-teal-950/50 transition cursor-pointer text-[10px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95"
                                  >
                                    🛵 Dispatched
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleUpdateOrderStatus(
                                        order.id,
                                        "delivered",
                                      )
                                    }
                                    className="bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 px-4 py-2 rounded-xl hover:bg-emerald-950/60 transition cursor-pointer text-[10.5px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95 shadow-md shadow-emerald-500/5"
                                  >
                                    ✅ Delivered Done
                                  </button>
                                </>
                              )}

                              {/* SERVICES SPECIFIC MONITOR BUTTONS (No Kitchen, No Cooking!) */}
                              {isSvc && (
                                <>
                                  <button
                                    onClick={() =>
                                      handleUpdateOrderStatus(
                                        order.id,
                                        "confirmed",
                                      )
                                    }
                                    className="bg-slate-100 border border-slate-200 hover:border-slate-200 text-gray-300 px-3.5 py-2 rounded-xl transition cursor-pointer text-[10px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95"
                                  >
                                    🤝 Confirm Booking
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleUpdateOrderStatus(
                                        order.id,
                                        "diagnostic_on_way",
                                      )
                                    }
                                    className="bg-sky-950/20 border border-sky-900/40 text-sky-400 px-3.5 py-2 rounded-xl hover:bg-sky-950/50 transition cursor-pointer text-[10px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95"
                                  >
                                    🛵 Mechanic Out
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleUpdateOrderStatus(
                                        order.id,
                                        "diagnostic_underway",
                                      )
                                    }
                                    className="bg-yellow-950/20 border border-yellow-900/40 text-yellow-500 px-3.5 py-2 rounded-xl hover:bg-yellow-950/50 transition cursor-pointer text-[10px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95"
                                  >
                                    🛠️ Underway
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleUpdateOrderStatus(
                                        order.id,
                                        "completed",
                                      )
                                    }
                                    className="bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 px-4 py-2 rounded-xl hover:bg-emerald-950/60 transition cursor-pointer text-[10.5px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95 shadow-md shadow-emerald-500/5"
                                  >
                                    ✅ Job Completed
                                  </button>
                                </>
                              )}

                              {/* CANCEL COMMON ACTIONS */}
                              <button
                                onClick={() =>
                                  handleUpdateOrderStatus(order.id, "cancelled")
                                }
                                className="ml-auto bg-pink-950/20 border border-pink-900/30 text-red-500 px-3.5 py-2 rounded-xl hover:bg-pink-950/40 transition cursor-pointer text-[10px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95"
                              >
                                Cancel / Return
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Manage Riders Directory */}
          {activeSubTab === "riders" && (
            <div className="space-y-8 animate-fade-in text-slate-900 col-span-1 lg:col-span-9">
              {/* Top Row: General Settings & Status Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Global Delivery Charge Config */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative space-y-4">
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D70F64]/10 to-transparent" />
                  <h4 className="font-black text-sm text-slate-900 flex items-center gap-2 pb-2.5 border-b border-slate-200 uppercase tracking-wide">
                    <Truck className="w-4 h-4 text-[#D70F64]" />
                    Set Global Delivery Charges
                  </h4>
                  <p className="text-[10.5px] text-slate-600 font-medium leading-relaxed">
                    This setting governs the base delivery rate added to
                    checkout carts across Dadu24#7 dynamically.
                  </p>

                  <div className="flex flex-col gap-3 text-xs pt-1">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-grow">
                        <span className="absolute left-3.5 top-3.5 text-slate-500 font-bold">
                          Rs.
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={deliveryChargeInput}
                          onChange={(e) =>
                            setDeliveryChargeInput(Number(e.target.value))
                          }
                          placeholder="Delivery Fee"
                          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 border border-slate-200 rounded-xl outline-none text-slate-900 font-extrabold focus:border-[#D70F64] transition"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveDeliveryConfig}
                        className="bg-[#D70F64] text-white font-black px-5 py-3 rounded-xl hover:scale-[1.02] active:scale-95 transition cursor-pointer text-xs uppercase"
                      >
                        Update Rate
                      </button>
                    </div>
                    <div className="relative flex-grow mt-2">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                        Minimum Order Amount
                      </span>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3.5 text-slate-500 font-bold">
                          Rs.
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={minOrderAmountInput}
                          onChange={(e) =>
                            setMinOrderAmountInput(Number(e.target.value))
                          }
                          placeholder="0 for no minimum"
                          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 border border-slate-200 rounded-xl outline-none text-slate-900 font-extrabold focus:border-[#D70F64] transition"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile Restaurant Schedule Manager */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative space-y-4">
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-purple-500/10 to-transparent" />
                  <h4 className="font-black text-sm text-slate-900 flex items-center gap-2 pb-2.5 border-b border-slate-200 uppercase tracking-wide">
                    <Clock className="w-4 h-4 text-purple-500" />
                    Restaurant Schedule
                  </h4>

                  <div className="space-y-4 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                        Select Restaurant / Vendor
                      </label>
                      <div className="relative">
                        <select
                          value={selectedScheduleRestaurant}
                          onChange={(e) =>
                            setSelectedScheduleRestaurant(e.target.value)
                          }
                          className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-xl text-xs text-slate-900 focus:border-purple-500/60 outline-none appearance-none"
                        >
                          {uniqueRestaurants.map((rest) => (
                            <option key={rest} value={rest}>
                              {rest}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                          <svg
                            width="14"
                            height="14"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-xl border border-slate-200">
                      <div>
                        <h5 className="font-bold text-xs text-slate-900">
                          Temporarily Unavailable
                        </h5>
                        <p className="text-[10px] text-slate-500">
                          Pause orders immediately
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer group">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={restStatusUnavailable}
                          onChange={(e) =>
                            setRestStatusUnavailable(e.target.checked)
                          }
                        />
                        <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-500/40 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-700 after:border-slate-700 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                          Open Time
                        </label>
                        <input
                          type="time"
                          value={restOpeningTime}
                          onChange={(e) => setRestOpeningTime(e.target.value)}
                          className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-xl text-xs text-slate-900 focus:border-purple-500/60 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                          Close Time
                        </label>
                        <input
                          type="time"
                          value={restClosingTime}
                          onChange={(e) => setRestClosingTime(e.target.value)}
                          className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-xl text-xs text-slate-900 focus:border-purple-500/60 outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                        Restaurant Contact Phone
                      </label>
                      <input
                        type="text"
                        value={restPhone}
                        onChange={(e) => setRestPhone(e.target.value)}
                        placeholder="e.g. 03277004471"
                        className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-xl text-xs text-slate-900 focus:border-purple-500/60 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                          Min Order
                        </label>
                        <input
                          type="number"
                          value={restMinOrder}
                          onChange={(e) => setRestMinOrder(e.target.value)}
                          placeholder="e.g. 300"
                          className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-xl text-xs text-slate-900 focus:border-purple-500/60 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                          Delivery Charge Text
                        </label>
                        <input
                          type="text"
                          value={restDeliveryCharge}
                          onChange={(e) => setRestDeliveryCharge(e.target.value)}
                          placeholder="e.g. Rs. 50-100"
                          className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-xl text-xs text-slate-900 focus:border-purple-500/60 outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <ProductImageSelector
                        imageUrl={restImageUrl}
                        onChange={setRestImageUrl}
                        label="Restaurant Cover Image"
                        accentColorClass="purple"
                        placeholder="Paste image web address (https://...)"
                        uploadPath={`restaurants/${selectedScheduleRestaurant}/cover`}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveDeliveryConfig}
                      className="w-full bg-purple-500 text-black font-black px-5 py-3 rounded-xl hover:scale-[1.02] active:scale-95 transition cursor-pointer text-xs uppercase"
                    >
                      Save Times
                    </button>
                  </div>
                </div>

                {/* Live assigned deliveries summary stats */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative space-y-4">
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-green-500/10 to-transparent" />
                  <h4 className="font-black text-sm text-slate-900 flex items-center gap-2 pb-2.5 border-b border-slate-200 uppercase tracking-wide">
                    <TrendingUp className="w-4 h-4 text-emerald-450" />
                    Delivery Fleet Statistics
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                    <div className="bg-white border border-slate-200/40 border border-slate-200 p-3.5 rounded-xl text-center">
                      <span className="text-[9px] text-[#D70F64] uppercase tracking-widest font-black block">
                        active shipments
                      </span>
                      <span className="text-xl font-black text-slate-900 block mt-1">
                        {
                          orders.filter(
                            (o) =>
                              o.riderId &&
                              o.status !== "delivered" &&
                              o.status !== "cancelled",
                          ).length
                        }
                      </span>
                    </div>
                    <div className="bg-white border border-slate-200/40 border border-slate-200 p-3.5 rounded-xl text-center">
                      <span className="text-[9px] text-slate-600 uppercase tracking-widest font-black block">
                        rider registry
                      </span>
                      <span className="text-xl font-black text-slate-900 block mt-1">
                        {ridersSubset.length} Riders
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Secure Registration form */}
              <form
                onSubmit={handleRegisterRiderSubmit}
                className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-5 relative"
              >
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D70F64]/20 to-transparent" />
                <h4 className="font-black text-sm text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-200/50 uppercase tracking-wide">
                  <UserPlus className="w-4 h-4 text-[#D70F64]" />
                  Rider Registry Form (Manual Credentials Creation)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                  <div className="space-y-1.5">
                    <label className="text-slate-600 font-black uppercase tracking-widest text-[9px] flex items-center gap-1">
                      <User className="w-3 h-3 text-[#D70F64]" /> Rider Name
                    </label>
                    <input
                      type="text"
                      required
                      value={riderNameInput}
                      onChange={(e) => setRiderNameInput(e.target.value)}
                      placeholder="e.g. Muhammad Ali"
                      className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-xl text-slate-900 outline-none text-slate-900 focus:border-[#D70F64] transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-600 font-black uppercase tracking-widest text-[9px] flex items-center gap-1">
                      <Phone className="w-3 h-3 text-[#D70F64]" /> Phone /
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      value={riderPhoneInput}
                      onChange={(e) => setRiderPhoneInput(e.target.value)}
                      placeholder="e.g. 03277004471 or ali_rider"
                      className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-xl text-slate-900 outline-none text-slate-900 focus:border-[#D70F64] transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-600 font-black uppercase tracking-widest text-[9px] flex items-center gap-1">
                      <Key className="w-3 h-3 text-[#D70F64]" /> Access Password
                    </label>
                    <input
                      type="password"
                      required
                      value={riderPasswordInput}
                      onChange={(e) => setRiderPasswordInput(e.target.value)}
                      placeholder="• • • • • • (Min 6 tokens)"
                      className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-xl text-slate-900 outline-none text-slate-900 focus:border-[#D70F64] transition"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={riderRegLoading}
                    className="bg-[#D70F64] hover:bg-[#b00c50] text-white font-black text-xs uppercase tracking-wider py-3.5 px-6 rounded-xl shadow-lg shadow-pink-500/10 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-55"
                  >
                    {riderRegLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Provisioning Auth credentials...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Execute Rider Provisioning
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Live shipments assignment status dashboard */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative space-y-5">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D70F64]/20 to-transparent" />
                <h4 className="font-black text-sm text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-200/50 uppercase tracking-wide">
                  <Compass className="w-4 h-4 text-[#D70F64] animate-spin-slow" />
                  Fleet Live Assignments Tracker
                </h4>

                <div className="space-y-4 max-h-[350px] overflow-y-auto scrollbar-none">
                  {orders.filter((o) => o.riderId).length === 0 ? (
                    <div className="text-center p-8 text-slate-500 text-xs font-semibold">
                      📦 No accepted shipments currently on active duty route.
                    </div>
                  ) : (
                    orders
                      .filter((o) => o.riderId)
                      .map((order) => (
                        <div
                          key={order.id}
                          className="bg-white border border-slate-200 p-4.5 rounded-2xl flex items-center justify-between gap-4 flex-wrap text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-[#D70F64]">
                                dadu-{order.id.substring(0, 8)}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                                  order.status === "delivered"
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-[#D70F64]/10 text-[#D70F64] animate-pulse"
                                }`}
                              >
                                {order.status}
                              </span>
                            </div>
                            <p className="text-slate-600 text-[11px] font-semibold mt-1">
                              Customer: {order.userName} ({order.userAddress})
                            </p>
                          </div>

                          <div className="bg-slate-100 border border-slate-200 p-3 rounded-xl min-w-[200px] text-right text-xs">
                            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black block">
                              assigned driver
                            </span>
                            <span className="text-slate-900 font-extrabold block text-xs mt-0.5">
                              {order.riderName}
                            </span>
                            <span className="text-emerald-450 block font-mono text-[10px]">
                              {order.riderPhone}
                            </span>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Master directory list */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative space-y-4">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-slate-500/20 to-transparent" />
                <h4 className="font-black text-sm text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-200/50 uppercase tracking-wide">
                  <User className="w-4 h-4 text-slate-500" />
                  Riders Directory Registry ({ridersSubset.length} Profiles)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ridersSubset.length === 0 ? (
                    <div className="text-center p-8 col-span-2 text-slate-500 text-xs font-semibold">
                      📋 No active riders provisioned.
                    </div>
                  ) : (
                    ridersSubset.map((rider) => {
                      // Calculate sales performance stats for each rider
                      const stats = (() => {
                        const completedRiderOrders = orders.filter(
                          (o) =>
                            o.riderId === rider.uid &&
                            (o.status === "delivered" ||
                              o.status === "completed"),
                        );

                        const now = new Date();
                        const todayStart = new Date(
                          now.getFullYear(),
                          now.getMonth(),
                          now.getDate(),
                        ).getTime();

                        // Time limitations
                        const sevenDaysAgo =
                          Date.now() - 7 * 24 * 60 * 60 * 1000;
                        const thirtyDaysAgo =
                          Date.now() - 30 * 24 * 60 * 60 * 1000;

                        let todayC = 0,
                          todayS = 0;
                        let weekC = 0,
                          weekS = 0;
                        let monthC = 0,
                          monthS = 0;

                        completedRiderOrders.forEach((o) => {
                          let t = 0;
                          if (o.createdAt?.seconds) {
                            t = o.createdAt.seconds * 1000;
                          } else if (o.createdAt instanceof Date) {
                            t = o.createdAt.getTime();
                          } else if (typeof o.createdAt === "number") {
                            t = o.createdAt;
                          } else if (typeof o.createdAt === "string") {
                            t = Date.parse(o.createdAt);
                          } else {
                            t = Date.now();
                          }

                          const amt = o.grandTotal || o.totalPrice || 0;

                          if (t >= todayStart) {
                            todayC++;
                            todayS += amt;
                          }
                          if (t >= sevenDaysAgo) {
                            weekC++;
                            weekS += amt;
                          }
                          if (t >= thirtyDaysAgo) {
                            monthC++;
                            monthS += amt;
                          }
                        });

                        const totalCommission = completedRiderOrders.reduce(
                          (sum, o) => {
                            return (
                              sum +
                              (o.totalCommission !== undefined
                                ? o.totalCommission
                                : (o.items || []).reduce(
                                    (itemSum, item) =>
                                      itemSum +
                                      (item.commission || 0) * item.quantity,
                                    0,
                                  ))
                            );
                          },
                          0,
                        );

                        return {
                          today: { count: todayC, sales: todayS },
                          week: { count: weekC, sales: weekS },
                          month: { count: monthC, sales: monthS },
                          totalCompleted: completedRiderOrders.length,
                          totalCommission,
                        };
                      })();

                      return (
                        <div
                          key={rider.uid}
                          className="bg-white border border-slate-200 p-4.5 rounded-2xl space-y-3 shadow-xs"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10.5px] font-black tracking-wider text-slate-900 block">
                                Rider Name: {rider.name}
                              </span>
                              <span className="text-[9px] text-[#D70F64] font-bold block bg-[#D70F64]/5 border border-[#D70F64]/20 px-2.5 py-0.5 rounded-full w-max mt-1 uppercase">
                                Vehicle/Owner No: {rider.vehicleNumber || "N/A"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[9px] text-slate-500">
                                {rider.uid.substring(0, 8)}
                              </span>
                              <button
                                onClick={() =>
                                  handleDeleteRider(rider.uid, rider.name)
                                }
                                className="text-pink-400 hover:text-pink-300 p-1.5 rounded-lg hover:bg-red-500/10 transition cursor-pointer shrink-0"
                                title="Delete Rider Permanent"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="border-t border-slate-200 pt-2 text-[11px] font-semibold text-slate-600 font-sans space-y-1">
                            <div>
                              📞 Contact Phone:{" "}
                              <span className="font-mono text-slate-800">
                                {rider.phone}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span>📍 Logged-in HQ Status:</span>
                              <span className="text-emerald-440 font-bold uppercase text-[9px]">
                                ONLINE DUTY
                              </span>
                            </div>

                            {/* Rider Total Deliveries & Earned Commission */}
                            <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-3 mt-2.5 flex items-center justify-between gap-3 text-xs font-semibold">
                              <div>
                                <span className="text-[9px] text-emerald-400 uppercase tracking-widest font-black block">
                                  delivered runs
                                </span>
                                <span className="text-xs font-extrabold text-slate-900 block mt-0.5">
                                  {stats.totalCompleted} Orders
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] text-emerald-400 uppercase tracking-widest font-black block font-sans">
                                  earned commission
                                </span>
                                <span className="text-xs font-black text-emerald-400 block mt-0.5">
                                  Rs. {stats.totalCommission}
                                </span>
                              </div>
                            </div>

                            {/* Rider Sales Performance Statistics Dashboard */}
                            <div className="bg-[#0b0b0d] border border-slate-200 rounded-xl p-3 mt-2 space-y-2">
                              <span className="text-[9.5px] font-black uppercase text-[#D70F64] tracking-wider flex items-center gap-1">
                                📊 Rider Earnings & Sales Stats
                              </span>

                              <div className="grid grid-cols-3 gap-2 text-center">
                                {/* Today */}
                                <div className="bg-slate-100/60 border border-slate-200 p-2 rounded-lg">
                                  <span className="text-[8px] text-slate-500 uppercase font-black block">
                                    Aaj (Today)
                                  </span>
                                  <span className="text-[10.5px] font-black text-rose-500 block mt-0.5">
                                    {stats.today.count} Orders
                                  </span>
                                  <span className="text-[9.5px] font-bold text-slate-800 block font-mono mt-0.5">
                                    Rs. {stats.today.sales}
                                  </span>
                                </div>

                                {/* Week */}
                                <div className="bg-slate-100/60 border border-slate-200 p-2 rounded-lg">
                                  <span className="text-[8px] text-slate-500 uppercase font-black block">
                                    Hafta (Week)
                                  </span>
                                  <span className="text-[10.5px] font-black text-[#D70F64] block mt-0.5">
                                    {stats.week.count} Orders
                                  </span>
                                  <span className="text-[9.5px] font-bold text-slate-800 block font-mono mt-0.5">
                                    Rs. {stats.week.sales}
                                  </span>
                                </div>

                                {/* Month */}
                                <div className="bg-slate-100/60 border border-slate-200 p-2 rounded-lg">
                                  <span className="text-[8px] text-slate-500 uppercase font-black block">
                                    Mahina (Month)
                                  </span>
                                  <span className="text-[10.5px] font-black text-emerald-500 block mt-0.5">
                                    {stats.month.count} Orders
                                  </span>
                                  <span className="text-[9.5px] font-bold text-slate-800 block font-mono mt-0.5">
                                    Rs. {stats.month.sales}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {rider.riderCoords ? (
                              <div className="bg-emerald-950/10 border border-emerald-950 p-2.5 rounded-xl mt-1.5 space-y-1.5 text-slate-700">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="text-emerald-400 font-black flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    LIVE GPS SIGNAL
                                  </span>
                                  <span className="text-[9px] text-slate-500">
                                    {rider.riderCoords.lastUpdated
                                      ? `${Math.round((Date.now() - rider.riderCoords.lastUpdated) / 1000)}s ago`
                                      : "Active"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-mono text-[9.5px] text-slate-600">
                                    {rider.riderCoords.latitude.toFixed(5)},{" "}
                                    {rider.riderCoords.longitude.toFixed(5)}
                                  </span>
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${rider.riderCoords.latitude},${rider.riderCoords.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-emerald-500 text-slate-50 font-black text-[9px] px-2.5 py-1 rounded-lg hover:bg-emerald-400 transition uppercase tracking-widest leading-none block shrink-0"
                                  >
                                    Open Map 🗺️
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <div className="text-slate-500 text-[10px] italic mt-2 bg-slate-100/30 p-2 rounded-xl border border-slate-200 text-center">
                                📡 Awaiting active GPS tracking signal...
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "food_categories" && (
            <div className="space-y-8 animate-fade-in text-slate-900 col-span-1 lg:col-span-12 lg:col-start-4 font-sans">
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative space-y-6">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-pink-500/10 to-transparent" />
                <h4 className="font-black text-sm text-slate-900 flex items-center gap-2 pb-2.5 border-b border-slate-200 uppercase tracking-widest text-[#D70F64]">
                  <Grid className="w-4 h-4 text-[#D70F64]" />
                  Add New Food Category
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                      Category Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newFoodCategory.name}
                      onChange={(e) =>
                        setNewFoodCategory({
                          ...newFoodCategory,
                          name: e.target.value,
                        })
                      }
                      placeholder="e.g. Pizza"
                      className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-xl text-slate-900 focus:border-[#D70F64] outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                      Subtitle
                    </label>
                    <input
                      type="text"
                      value={newFoodCategory.subtitle}
                      onChange={(e) =>
                        setNewFoodCategory({
                          ...newFoodCategory,
                          subtitle: e.target.value,
                        })
                      }
                      placeholder="e.g. Hot Pizzas"
                      className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-xl text-slate-900 focus:border-[#D70F64] outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                      Emoji (Fallback if no image)
                    </label>
                    <input
                      type="text"
                      value={newFoodCategory.emoji}
                      onChange={(e) =>
                        setNewFoodCategory({
                          ...newFoodCategory,
                          emoji: e.target.value,
                        })
                      }
                      placeholder="e.g. 🍕"
                      className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-xl text-slate-900 focus:border-[#D70F64] outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                      Position (Sorting)
                    </label>
                    <input
                      type="number"
                      value={newFoodCategory.position}
                      onChange={(e) =>
                        setNewFoodCategory({
                          ...newFoodCategory,
                          position: Number(e.target.value),
                        })
                      }
                      placeholder="0"
                      className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-xl text-slate-900 focus:border-[#D70F64] outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <ProductImageSelector
                      imageUrl={newFoodCategory.imageUrl}
                      onChange={(url) =>
                        setNewFoodCategory({
                          ...newFoodCategory,
                          imageUrl: url,
                        })
                      }
                      label="Category Image"
                      accentColorClass="purple"
                    />
                  </div>
                </div>

                <button
                  onClick={handleAddFoodCategory}
                  className="w-full bg-pink-600 hover:bg-[#D70F64] text-white font-black py-4 rounded-xl text-[11px] uppercase tracking-wider shadow-lg transition-all"
                >
                  Add Category
                </button>
              </div>

              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative space-y-4">
                <h4 className="font-black text-sm text-slate-900 flex items-center gap-2 pb-2.5 border-b border-slate-200 uppercase tracking-widest text-[#D70F64]">
                  <Grid className="w-4 h-4 text-[#D70F64]" />
                  Existing Food Categories
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {foodCategories.map((cat) => (
                    <div
                      key={cat.id}
                      className="bg-white border border-slate-200 border border-slate-200 rounded-xl p-3 flex flex-col relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start mb-2">
                        {cat.imageUrl ? (
                          <img
                            src={cat.imageUrl}
                            alt={cat.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <span className="text-3xl">{cat.emoji || "🍽️"}</span>
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingFoodCategory(editingFoodCategory?.id === cat.id ? null : cat)}
                            className="text-slate-500 hover:text-blue-500 transition-colors"
                          >
                            <span className="text-xs uppercase font-bold tracking-wider">Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteFoodCategory(cat.id)}
                            className="text-slate-500 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {editingFoodCategory?.id === cat.id ? (
                        <div className="mt-4 space-y-3 border-t border-slate-200 pt-3">
                          <input 
                            type="text"
                            value={editingFoodCategory.name}
                            onChange={(e) => setEditingFoodCategory({...editingFoodCategory, name: e.target.value})}
                            className="w-full p-2 bg-slate-100 border border-slate-300 rounded-lg text-xs outline-none"
                            placeholder="Name"
                          />
                          <input 
                            type="text"
                            value={editingFoodCategory.subtitle || ""}
                            onChange={(e) => setEditingFoodCategory({...editingFoodCategory, subtitle: e.target.value})}
                            className="w-full p-2 bg-slate-100 border border-slate-300 rounded-lg text-xs outline-none"
                            placeholder="Subtitle"
                          />
                          <ProductImageSelector 
                            imageUrl={editingFoodCategory.imageUrl || ""}
                            onChange={(url) => setEditingFoodCategory({...editingFoodCategory, imageUrl: url})}
                            label="Image URL"
                          />
                          <button 
                            onClick={handleUpdateFoodCategory}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase py-2 rounded-lg transition"
                          >
                            Save Changes
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-bold text-sm mt-1">{cat.name}</span>
                          <span className="text-[10px] text-slate-500">
                            {cat.subtitle}
                          </span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "grocery" && (
            <div className="space-y-8 animate-fade-in text-slate-900 col-span-1 lg:col-span-12 lg:col-start-4 font-sans">
              {/* Top Row: Grocery-specific store settings */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative space-y-4">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-orange-500/10 to-transparent" />
                <h4 className="font-black text-sm text-slate-900 flex items-center gap-2 pb-2.5 border-b border-slate-200 uppercase tracking-widest text-orange-500">
                  <ShoppingBasket className="w-4 h-4 text-orange-500" />
                  Grocery Delivery Configuration Settings
                </h4>
                <p className="text-[10.5px] text-slate-600 font-medium leading-relaxed">
                  These metrics govern shipping charges, thresholds, and
                  checkout policies for standalone retail groceries.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5 pt-1 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                      Base Shipping Fee
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3.5 text-slate-600 font-bold">
                        Rs.
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={gBaseDeliveryFee}
                        onChange={(e) =>
                          setGBaseDeliveryFee(Number(e.target.value))
                        }
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 border border-slate-200 rounded-xl outline-none text-slate-900 font-extrabold focus:border-orange-500 transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-sans">
                      Free Delivery Above
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3.5 text-slate-500 font-bold">
                        Rs.
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={gFreeDeliveryAbove}
                        onChange={(e) =>
                          setGFreeDeliveryAbove(Number(e.target.value))
                        }
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 border border-slate-200 rounded-xl outline-none text-slate-900 font-extrabold focus:border-orange-500 transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 block font-sans">
                      Mixed Basket Checkout Policy
                    </span>
                    <button
                      type="button"
                      onClick={() => setGAllowMixed(!gAllowMixed)}
                      className="w-full py-3 px-4 bg-white border border-slate-200 rounded-xl border border-slate-200 hover:border-orange-500/20 transition flex items-center justify-between cursor-pointer"
                    >
                      <span className="font-semibold text-slate-700">
                        Allow Food + Grocery
                      </span>
                      {gAllowMixed ? (
                        <ToggleRight className="w-6 h-6 text-orange-500 shrink-0" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-500 shrink-0" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveGroceryConfig}
                    className="bg-orange-600 hover:bg-orange-700 text-slate-900 font-black px-6 py-3 rounded-xl hover:scale-[1.01] active:scale-95 transition cursor-pointer text-xs uppercase tracking-wide"
                  >
                    Save Grocery Settings 💾
                  </button>
                </div>
              </div>

              {/* Middle Row: Create Category, and list of current ones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Category Form */}
                <div className="bg-[#0b0b0d]/80 border border-slate-200 p-6 rounded-[24px] space-y-4">
                  <h4 className="font-black text-xs text-slate-800 uppercase tracking-widest text-orange-500 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-orange-500" />
                    Create Grocery Division
                  </h4>
                  <form
                    onSubmit={handleAddGroceryCategory}
                    className="space-y-3.5 text-xs"
                  >
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-bold text-slate-600 block uppercase">
                        Division Category Name
                      </label>
                      <input
                        type="text"
                        required
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="E.g., Fruits & Vegetables, Dairy, Household..."
                        className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl outline-none text-slate-900 focus:border-orange-500 transition text-slate-900 font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <ProductImageSelector
                        imageUrl={newCatImageUrl}
                        onChange={setNewCatImageUrl}
                        label="Category Icon/Image (Optional)"
                        accentColorClass="orange"
                        placeholder="E.g., https://example.com/image.jpg"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-bold text-slate-600 block uppercase">
                        Display Order Position
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={newCatPosition}
                        onChange={(e) =>
                          setNewCatPosition(Number(e.target.value))
                        }
                        className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-xl outline-none text-slate-900 focus:border-orange-500 transition text-slate-900 font-mono font-bold"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 bg-orange-600 hover:bg-orange-750 text-slate-900 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                    >
                      Save New Category +
                    </button>
                  </form>
                </div>

                {/* 2. Categories List */}
                <div className="bg-[#0b0b0d]/80 border border-slate-200 p-6 rounded-[24px] space-y-4">
                  <h4 className="font-black text-xs text-slate-800 uppercase tracking-widest text-orange-500">
                    Active Categories Directory ({groceryCategories.length})
                  </h4>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {groceryCategories.map((cat) => (
                      <div
                        key={cat.id}
                        className="bg-white border border-slate-200 p-2.5 rounded-xl border border-slate-200 w-full flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between text-xs font-semibold gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            {cat.imageUrl && (
                              <img
                                src={cat.imageUrl}
                                alt=""
                                className="w-8 h-8 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-200"
                              />
                            )}
                            <div className="truncate">
                              <span className="text-slate-500 pr-1.5 font-bold font-mono">
                                #{cat.position || 0}
                              </span>
                              <span className="text-slate-500 font-bold">
                                {cat.name}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategoryId(
                                  editingCategoryId === cat.id ? null : cat.id,
                                );
                                setEditingCategoryImageUrl(cat.imageUrl || "");
                              }}
                              className="p-1 px-2 rounded text-[10px] font-black uppercase cursor-pointer bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition"
                            >
                              Image
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleCategoryAvailable(
                                  cat.id,
                                  cat.isAvailable,
                                )
                              }
                              className={`p-1 px-2 rounded text-[10px] font-black uppercase cursor-pointer ${
                                cat.isAvailable
                                  ? "bg-orange-500/10 text-orange-400"
                                  : "bg-slate-200 text-slate-500"
                              }`}
                            >
                              {cat.isAvailable ? "Available" : "Disabled"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="p-1 px-1.5 rounded bg-pink-950/20 text-pink-400 hover:text-pink-300 transition"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        {editingCategoryId === cat.id && (
                          <div className="mt-1 space-y-2 bg-slate-100 p-3 rounded-xl border border-slate-200">
                            <ProductImageSelector
                              imageUrl={editingCategoryImageUrl}
                              onChange={setEditingCategoryImageUrl}
                              label="Update Category Image"
                              accentColorClass="orange"
                              placeholder="Image URL"
                            />
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateCategoryImageUrl(cat.id)
                                }
                                className="bg-orange-600 hover:bg-orange-700 text-slate-900 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition w-full"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {groceryCategories.length === 0 && (
                      <p className="text-[10px] italic text-slate-500 text-center py-6">
                        No custom grocery categories yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Row: Create product, and product grid directory */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* 1. Product creator column */}
                <div className="bg-[#0b0b0d]/80 border border-slate-200/85 p-6 rounded-[24px] col-span-1 md:col-span-5 space-y-4">
                  <h4 className="font-black text-xs text-slate-800 uppercase tracking-widest text-orange-500 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-orange-500" />
                    Add Grocery Product
                  </h4>
                  <form
                    onSubmit={handleAddGroceryProduct}
                    className="space-y-3 text-xs"
                  >
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-600 block uppercase">
                        Product Title / Name
                      </label>
                      <input
                        type="text"
                        required
                        value={newGProdName}
                        onChange={(e) => setNewGProdName(e.target.value)}
                        placeholder="E.g., Farm Fresh Eggs, Cheddar Cheese..."
                        className="w-full p-2.5 bg-white border border-slate-200 border border-slate-200 outline-none text-slate-900 focus:border-orange-500 rounded-xl text-slate-500 text-xs font-semibold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-600 block uppercase font-sans">
                          Price (Rs.)
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={newGProdPrice}
                          onChange={(e) =>
                            setNewGProdPrice(Number(e.target.value))
                          }
                          className="w-full p-2.5 bg-white border border-slate-200 border border-slate-200 rounded-xl outline-none text-slate-900 focus:border-orange-500 text-slate-900 text-xs font-mono font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-600 block uppercase font-sans">
                          Offered Price (Rs.)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={newGProdDiscountPrice}
                          onChange={(e) =>
                            setNewGProdDiscountPrice(Number(e.target.value))
                          }
                          className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl outline-none text-slate-900 focus:border-orange-500 text-slate-900 text-xs font-mono font-semibold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-600 block uppercase font-sans">
                          Unit Metric
                        </label>
                        <select
                          value={newGProdUnit}
                          onChange={(e: any) => setNewGProdUnit(e.target.value)}
                          className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-900 outline-none text-slate-900 focus:border-orange-500 transition"
                        >
                          <option value="kg">kg (Kilo)</option>
                          <option value="litre">litre (Liter)</option>
                          <option value="piece">piece (Single)</option>
                          <option value="pack">pack (Package)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-600 block uppercase">
                          Stock Count
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={newGProdStock}
                          onChange={(e) =>
                            setNewGProdStock(Number(e.target.value))
                          }
                          className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl outline-none text-slate-900 focus:border-orange-500 text-slate-900 text-xs font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-emerald-400 block uppercase font-sans">
                        Admin Commission (Rs.)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={newGProdCommission}
                        onChange={(e) =>
                          setNewGProdCommission(Number(e.target.value))
                        }
                        className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl outline-none text-slate-900 focus:border-emerald-500 text-slate-900 text-xs font-mono font-bold"
                        placeholder="Commission in Rs."
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 block uppercase">
                        Choose Category Division
                      </label>
                      <select
                        required
                        value={newGProdCategoryId}
                        onChange={(e) => setNewGProdCategoryId(e.target.value)}
                        className="w-full p-2.5 bg-slate-100 border border-slate-200 text-slate-900 outline-none text-slate-900 focus:border-orange-500 rounded-xl text-xs font-semibold"
                      >
                        <option value="">-- Choose Segment --</option>
                        {groceryCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <ProductImageSelector
                        imageUrl={newGProdImageUrl}
                        onChange={setNewGProdImageUrl}
                        label="Illustration Image/File"
                        accentColorClass="orange"
                        placeholder="Paste image web address (https://...)"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-orange-600 hover:bg-orange-755 text-slate-900 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                    >
                      Save Grocery Product 📦
                    </button>
                  </form>
                </div>

                {/* 2. Product directory table column */}
                <div className="bg-[#0b0b0d]/80 border border-slate-200 p-6 rounded-[24px] col-span-1 md:col-span-12 lg:col-span-7 space-y-4">
                  <h4 className="font-black text-xs text-slate-800 uppercase tracking-widest text-orange-500 font-sans">
                    Product Stock & Catalog Directory ({groceryProducts.length})
                  </h4>
                  <div className="overflow-x-auto select-none">
                    <table className="w-full text-xs text-left text-slate-600 font-medium border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 uppercase text-[9px] tracking-wider text-slate-500">
                          <th className="py-2.5 px-2">Image & Product</th>
                          <th className="py-2.5 px-2">Group</th>
                          <th className="py-2.5 px-2">Pricing / Stock</th>
                          <th className="py-2.5 px-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groceryProducts.map((p) => {
                          const catName =
                            groceryCategories.find((c) => c.id === p.categoryId)
                              ?.name || "Segment";
                          const isEditing = editingGProductId === p.id;

                          return (
                            <tr
                              key={p.id}
                              className="border-b border-slate-200 hover:bg-white border border-slate-200/40 text-[11px] font-semibold"
                            >
                              <td className="py-3 px-2 flex items-center gap-2 min-w-[150px]">
                                <img
                                  src={p.imageUrl}
                                  alt={p.name}
                                  className="w-8 h-8 rounded-lg object-cover shrink-0 bg-slate-100 border border-slate-200"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="truncate">
                                  <span className="text-slate-800 font-bold block truncate leading-tight">
                                    {p.name}
                                  </span>
                                  <span className="text-[9px] text-slate-500 block font-mono font-semibold">
                                    ID: {p.id.substring(0, 6)}...
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-2 text-slate-600">
                                <span className="bg-white border border-slate-200/80 px-2 py-0.5 rounded border border-slate-200 text-[10px] uppercase font-bold">
                                  {catName}
                                </span>
                              </td>
                              <td className="py-3 px-2 relational-price-box">
                                {isEditing ? (
                                  <div className="space-y-1 w-24">
                                    <input
                                      type="number"
                                      value={editingGProdPriceInput}
                                      onChange={(e) =>
                                        setEditingGProdPriceInput(
                                          Number(e.target.value),
                                        )
                                      }
                                      placeholder="Price"
                                      className="p-1 text-xs text-white bg-black border border-orange-500 rounded font-bold w-full"
                                    />
                                    <input
                                      type="number"
                                      value={editingGProdStockInput}
                                      onChange={(e) =>
                                        setEditingGProdStockInput(
                                          Number(e.target.value),
                                        )
                                      }
                                      placeholder="Stock"
                                      className="p-1 text-xs text-white bg-black border border-orange-500 rounded font-semibold w-full"
                                    />
                                    <input
                                      type="number"
                                      value={editingGProdCommissionInput}
                                      onChange={(e) =>
                                        setEditingGProdCommissionInput(
                                          Number(e.target.value),
                                        )
                                      }
                                      placeholder="Comm"
                                      className="p-1 text-xs text-white bg-black border border-emerald-500 rounded font-semibold w-full"
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <span className="text-orange-555 font-bold block font-mono">
                                      Rs. {p.price} /{p.unit}
                                    </span>
                                    {p.stock <= 0 ? (
                                      <span className="text-red-500 text-[9px] uppercase font-black">
                                        Out of Stock
                                      </span>
                                    ) : (
                                      <span className="text-slate-500 text-[9px] font-semibold">
                                        Stock: {p.stock} units
                                      </span>
                                    )}
                                    <span className="text-emerald-400 text-[10px] block font-bold mt-0.5">
                                      Comm: Rs. {p.commission || 0}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-2 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {isEditing ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSaveInlineGProductEdit(p.id)
                                        }
                                        className="bg-emerald-600 text-white font-black px-1.5 py-0.5 rounded text-[9.5px] uppercase cursor-pointer"
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEditingGProductId(null)
                                        }
                                        className="bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded text-[9.5px] cursor-pointer"
                                      >
                                        ✕
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingGProductId(p.id);
                                          setEditingGProdPriceInput(p.price);
                                          setEditingGProdStockInput(p.stock);
                                          setEditingGProdCommissionInput(
                                            p.commission || 0,
                                          );
                                        }}
                                        className="text-orange-500 hover:underline text-[10px] font-bold cursor-pointer"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleToggleProductAvailable(
                                            p.id,
                                            p.isAvailable,
                                          )
                                        }
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase cursor-pointer ${
                                          p.isAvailable
                                            ? "bg-orange-600/10 text-orange-400"
                                            : "bg-slate-200 text-slate-500"
                                        }`}
                                      >
                                        {p.isAvailable ? "Live" : "Hold"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDeleteProduct(p.id)
                                        }
                                        className="p-1 px-1.5 bg-pink-950/20 text-pink-400 hover:text-pink-300 transition shrink-0 cursor-pointer text-xs font-black rounded"
                                      >
                                        ✕
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "users" && (
            <div className="space-y-6 animate-fade-in text-left">
              {/* Header Box */}
              <div className="bg-[#0b0b0d]/90 border border-slate-200 rounded-3xl p-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-emerald-505">
                      <Users className="w-5 h-5 text-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                        Registered Directory
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mt-1">
                      Dadu Food User Database
                    </h2>
                    <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                      View, search and manage all registered customers, riders
                      and administrators.
                    </p>
                  </div>

                  {/* Totals Badge */}
                  <div className="bg-[#121215] border border-slate-200 rounded-2xl px-5 py-3 text-center sm:text-right">
                    <span className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block">
                      Total Registered Users
                    </span>
                    <span className="text-2xl font-black text-emerald-400">
                      {allUsersList.length}
                    </span>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="mt-6 flex flex-col md:flex-row gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      placeholder="Search users by name, phone or address..."
                      className="w-full bg-[#141416]/90 border border-slate-200 text-slate-900 placeholder-slate-500 pl-4 pr-10 py-3 rounded-2xl text-xs font-semibold focus:outline-hidden focus:border-emerald-500/50 transition-all"
                    />
                    {userSearchTerm && (
                      <button
                        onClick={() => setUserSearchTerm("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-500 text-xs font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* NEW USERS SECTION */}
              {(() => {
                const lockedUsers = allUsersList.filter(u => u.status === "locked");
                if (lockedUsers.length === 0) return null;
                return (
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
                      <h3 className="font-black text-xs uppercase tracking-widest text-slate-700">
                        New Unverified Users ({lockedUsers.length})
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {lockedUsers.map(u => {
                        const formattedTime = u.createdAt 
                          ? (u.createdAt.seconds 
                              ? new Date(u.createdAt.seconds * 1000).toLocaleString() 
                              : new Date(u.createdAt).toLocaleString())
                          : "Unknown Time";
                        return (
                          <div 
                            key={u.uid} 
                            className="bg-white border-2 border-orange-500/30 hover:border-orange-500/50 rounded-3xl p-5 shadow-lg relative overflow-hidden transition-all flex flex-col justify-between gap-4"
                          >
                            <div className="absolute top-0 right-0 bg-orange-500 text-black text-[9px] font-black uppercase tracking-wider px-3.5 py-1 rounded-bl-2xl">
                              NEW
                            </div>

                            <div className="space-y-1">
                              <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">Registered At</span>
                              <span className="text-[11px] text-zinc-500 font-mono block mb-2">{formattedTime}</span>
                              <h4 className="text-xl font-black text-slate-900 select-all tracking-tight">
                                {u.phone}
                              </h4>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2">
                              <a
                                href={`tel:${u.phone}`}
                                className="col-span-2 bg-[#D70F64] hover:bg-[#b00c50] text-white py-2.5 px-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition active:scale-95 flex items-center justify-center gap-2"
                              >
                                📞 Call Karein
                              </a>

                              <button
                                onClick={() => setUnlockingUser(u)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-3 rounded-2xl font-bold text-[11px] uppercase tracking-wider transition active:scale-95 flex items-center justify-center gap-1"
                              >
                                ✅ Unlock
                              </button>

                              <button
                                onClick={async () => {
                                  const reason = window.prompt("Reason for blocking (e.g. Fake number):", "Fake number");
                                  if (reason !== null) {
                                    try {
                                      await updateDoc(doc(db, "users", u.uid), { 
                                        status: "blocked",
                                        isBlacklisted: true
                                      });
                                      await setDoc(doc(db, "blacklist", u.uid), {
                                        phone: u.phone,
                                        blockedAt: new Date(),
                                        blockedBy: adminUsername || "admin",
                                        reason: reason || "Fake number"
                                      });
                                      alert(`❌ User ${u.phone} permanently blocked and blacklisted.`);
                                    } catch (err) {
                                      alert("Failed to block user: " + err);
                                    }
                                  }
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white py-2.5 px-3 rounded-2xl font-bold text-[11px] uppercase tracking-wider transition active:scale-95 flex items-center justify-center gap-1"
                              >
                                ❌ Block
                              </button>

                              <button
                                onClick={async () => {
                                  if (confirm(`Are you sure you want to delete user ${u.phone}? This will NOT blacklist them, allowing them to register fresh.`)) {
                                    try {
                                      await deleteDoc(doc(db, "users", u.uid));
                                      alert("🗑️ User deleted successfully.");
                                    } catch (err) {
                                      alert("Failed to delete user: " + err);
                                    }
                                  }
                                }}
                                className="col-span-2 bg-zinc-700 hover:bg-zinc-650 text-zinc-200 py-2 px-3 rounded-2xl font-bold text-[10px] uppercase tracking-wider transition active:scale-95 flex items-center justify-center gap-1 border border-zinc-600"
                              >
                                🗑️ Delete Karein
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Users Table Box */}
              <div className="bg-[#0b0b0d]/90 border border-slate-200 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-5 border-b border-slate-200/60 flex items-center justify-between">
                  <h3 className="font-black text-xs uppercase tracking-widest text-slate-700">
                    User Ledger
                  </h3>
                  <span className="text-[10.5px] font-bold text-slate-500">
                    Showing{" "}
                    {
                      allUsersList.filter(
                        (u) =>
                          (u.name || "")
                            .toLowerCase()
                            .includes(userSearchTerm.toLowerCase()) ||
                          (u.phone || "")
                            .toLowerCase()
                            .includes(userSearchTerm.toLowerCase()) ||
                          (u.address || "")
                            .toLowerCase()
                            .includes(userSearchTerm.toLowerCase()),
                      ).length
                    }{" "}
                    of {allUsersList.length}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-slate-600 font-semibold border-collapse">
                    <thead>
                      <tr className="bg-white border border-slate-200/70 border-b border-slate-200 text-slate-500 text-[9.5px] uppercase tracking-wider font-black">
                        <th className="py-4 px-5">User Info</th>
                        <th className="py-4 px-5">Role</th>
                        <th className="py-4 px-5">Phone Number</th>
                        <th className="py-2 px-5">Delivery/Living Address</th>
                        <th className="py-4 px-5 text-center">Total Orders</th>
                        <th className="py-4 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {allUsersList
                        .filter((u) => {
                          const queryStr = userSearchTerm.toLowerCase();
                          return (
                            (u.name || "").toLowerCase().includes(queryStr) ||
                            (u.phone || "").toLowerCase().includes(queryStr) ||
                            (u.address || "")
                              .toLowerCase()
                              .includes(queryStr) ||
                            (u.role || "").toLowerCase().includes(queryStr)
                          );
                        })
                        .map((u) => {
                          const isSpecialAdmin =
                            u.uid === "Wf1NfRofZ9dhre1t4WIsas7b6fJ3" ||
                            u.role === "admin";
                          return (
                            <tr
                              key={u.uid}
                              className="hover:bg-slate-50 transition-all"
                            >
                              {/* User Info */}
                              <td className="py-4 px-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-slate-100/95 border border-slate-200 flex items-center justify-center font-black text-xs text-slate-700 uppercase shrink-0">
                                    {u.name ? u.name.slice(0, 2) : "DU"}
                                  </div>
                                  <div>
                                    <span className="text-slate-900 font-black text-xs block">
                                      {u.name || "Dadu User"}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-mono block select-all">
                                      {u.uid}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Role */}
                              <td className="py-4 px-5">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                    u.role === "admin"
                                      ? "bg-red-500/10 text-pink-400 border border-red-500/20"
                                      : u.role === "rider"
                                        ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  }`}
                                >
                                  {u.role || "buyer"}
                                </span>
                              </td>

                              {/* Phone Number */}
                              <td className="py-4 px-5">
                                <span className="font-mono text-xs text-slate-700 font-bold select-all">
                                  {u.phone || "Not set/Guest"}
                                </span>
                              </td>

                              {/* Delivery Address */}
                              <td className="py-2 px-5 max-w-xs">
                                <p className="text-[11px] text-slate-500 font-medium whitespace-pre-wrap break-words max-h-16 overflow-y-auto">
                                  {u.address || "No address saved"}
                                </p>
                              </td>

                              {/* Total Orders */}
                              <td className="py-4 px-5 text-center">
                                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-[10.5px] font-bold text-slate-700 border border-slate-200">
                                  {u.ordersCount || 0}
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="py-4 px-5 text-right flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const newAddress = window.prompt("Enter new address for this user:", u.address || "");
                                    if (newAddress !== null) {
                                      try {
                                        await updateDoc(doc(db, "users", u.uid), { address: newAddress });
                                      } catch (err) {
                                        alert("Failed to update address.");
                                      }
                                    }
                                  }}
                                  className="p-1 px-2.5 rounded text-[10px] font-black uppercase transition-all bg-sky-500/10 text-sky-500 hover:bg-sky-500/20 cursor-pointer"
                                >
                                  Edit Addr
                                </button>

                                {u.status === "locked" && (
                                  <button
                                    type="button"
                                    onClick={() => setUnlockingUser(u)}
                                    className="p-1 px-2.5 rounded text-[10px] font-black uppercase transition-all bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 cursor-pointer"
                                  >
                                    Unlock
                                  </button>
                                )}

                                {u.status === "verified" && !isSpecialAdmin && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const reason = window.prompt("Reason for blocking (e.g. Fake number):", "Fake number");
                                      if (reason !== null) {
                                        try {
                                          await updateDoc(doc(db, "users", u.uid), { 
                                            status: "blocked",
                                            isBlacklisted: true
                                          });
                                          await setDoc(doc(db, "blacklist", u.uid), {
                                            phone: u.phone,
                                            blockedAt: new Date(),
                                            blockedBy: adminUsername || "admin",
                                            reason: reason || "Fake number"
                                          });
                                          alert(`❌ User ${u.phone} permanently blocked and blacklisted.`);
                                        } catch (err) {
                                          alert("Failed to block user: " + err);
                                        }
                                      }
                                    }}
                                    className="p-1 px-2.5 rounded text-[10px] font-black uppercase transition-all bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 cursor-pointer"
                                  >
                                    Block
                                  </button>
                                )}

                                {u.status === "blocked" && !isSpecialAdmin && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        await updateDoc(doc(db, "users", u.uid), { 
                                          status: "verified",
                                          isBlacklisted: false
                                        });
                                        await deleteDoc(doc(db, "blacklist", u.uid));
                                        alert(`✅ User ${u.phone} unblocked and removed from blacklist.`);
                                      } catch (err) {
                                        alert("Failed to unblock user: " + err);
                                      }
                                    }}
                                    className="p-1 px-2.5 rounded text-[10px] font-black uppercase transition-all bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 cursor-pointer"
                                  >
                                    Unblock
                                  </button>
                                )}

                                <button
                                  type="button"
                                  disabled={isSpecialAdmin}
                                  onClick={() => {
                                    setConfirmDialog({
                                      title: "Revoke Access",
                                      message: `Are you sure you want to PERMANENTLY delete user "${u.name || "Dadu User"}"?`,
                                      onConfirm: async () => {
                                        try {
                                          await deleteDoc(
                                            doc(db, "users", u.uid),
                                          );
                                        } catch (err) {
                                          console.error(
                                            "Failed to delete user profile",
                                            err,
                                          );
                                          alert(
                                            "Error: Database permission denied.",
                                          );
                                        }
                                      },
                                    });
                                  }}
                                  className={`p-1 px-2.5 rounded text-[10px] font-black uppercase transition-all ${
                                    isSpecialAdmin
                                      ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                                      : "bg-pink-950/30 text-pink-400 hover:bg-pink-900/30 cursor-pointer"
                                  }`}
                                >
                                  {isSpecialAdmin ? "Locked" : "Delete"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}

                      {allUsersList.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="text-center py-10 text-slate-500 font-black"
                          >
                            No registered users found in database.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "seo" && (
            <div className="space-y-6 animate-fade-in text-left">
              <div className="bg-[#0b0b0d]/90 border border-slate-200 rounded-3xl p-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-blue-505">
                      <Globe className="w-5 h-5 text-blue-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-full">
                        Global Configuration
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mt-1">
                      SEO & Metadata
                    </h2>
                    <p className="text-xs text-slate-600 font-medium mt-1">
                      Update global SEO tags injected into the document head.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleMigrateCategories}
                      className="bg-[#b00c50] hover:bg-[#D70F64] text-slate-900 font-black text-[10px] uppercase tracking-widest py-3 px-5 rounded-xl transition cursor-pointer shrink-0"
                    >
                      Run Category Migration
                    </button>
                    <button
                      onClick={handleSaveSeoConfig}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-widest py-3 px-5 rounded-xl transition cursor-pointer shrink-0"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-[#0c0c0e] border border-slate-200 rounded-[24px] p-5 lg:p-7 shadow-sm relative">
                <div className="space-y-5">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                      Meta Title
                    </label>
                    <input
                      type="text"
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      placeholder="e.g. Dadu Food - Premium Delivery"
                      className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-2xl text-xs sm:text-sm outline-none text-slate-900 focus:border-blue-500/60 transition"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                      Meta Description
                    </label>
                    <textarea
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value)}
                      placeholder="e.g. Order fresh food and groceries..."
                      className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-2xl text-xs sm:text-sm outline-none text-slate-900 focus:border-blue-500/60 transition resize-none h-24"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                      Meta Keywords
                    </label>
                    <input
                      type="text"
                      value={seoKeywords}
                      onChange={(e) => setSeoKeywords(e.target.value)}
                      placeholder="e.g. food delivery, groceries, online ordering"
                      className="w-full p-3 bg-white border border-slate-200 border border-slate-200 rounded-2xl text-xs sm:text-sm outline-none text-slate-900 focus:border-blue-500/60 transition"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {confirmDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in text-left">
          <div className="bg-[#0c0c0e] border border-slate-200 rounded-3xl max-w-sm w-full overflow-hidden shadow-sm text-slate-900 p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-red-500">
              <AlertTriangle className="w-5 h-5 shrink-0 animate-pulse" />
              <h4 className="font-black text-xs uppercase tracking-widest">
                {confirmDialog.title}
              </h4>
            </div>
            <p className="text-[11px] text-slate-600 font-semibold leading-relaxed">
              {confirmDialog.message}
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-[10px] uppercase font-black text-slate-600 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const callback = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  await callback();
                }}
                className="px-4 py-2 bg-gradient-to-r from-pink-600 to-pink-700 text-slate-900 rounded-xl text-[10px] font-black hover:brightness-110 shadow-md cursor-pointer transition uppercase tracking-wide"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADDRESS ENTRY MODAL FOR UNLOCKING USER */}
      {unlockingUser && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in text-left">
          <div className="bg-white border border-slate-200 rounded-[32px] max-w-md w-full overflow-hidden shadow-2xl p-6 relative">
            <button
              onClick={() => {
                setUnlockingUser(null);
                setUnlockArea("");
                setUnlockStreet("");
                setUnlockLandmark("");
                setUnlockNotes("");
                setUnlockCoords(null);
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-105 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer font-black text-xs"
            >
              ✕
            </button>
            
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#D70F64] block">
                  Verify & Configure Address
                </span>
                <h3 className="text-lg font-black text-slate-905 mt-1">
                  Unlock User: {unlockingUser.phone}
                </h3>
                <p className="text-[11.5px] text-slate-500 mt-1 font-semibold leading-relaxed">
                  Call user to verify their details, then enter their delivery/mohalla address below. After saving, the user will be unlocked and can place orders immediately!
                </p>
              </div>

              <form onSubmit={handleUnlockSubmit} className="space-y-4">
                <div className="space-y-3.5">
                  <div>
                    <label className="text-[9.5px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                      Area / Mohalla <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={unlockArea}
                      onChange={(e) => setUnlockArea(e.target.value)}
                      placeholder="e.g. Model Town, Gulberg, Dadu"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none text-slate-900 focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64] transition"
                    />
                  </div>

                  <div>
                    <label className="text-[9.5px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                      Street / Gali <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={unlockStreet}
                      onChange={(e) => setUnlockStreet(e.target.value)}
                      placeholder="e.g. Gali No. 4, Street 12, Main Road"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none text-slate-900 focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64] transition"
                    />
                  </div>

                  <div>
                    <label className="text-[9.5px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                      Landmark / Mashoor Jagah
                    </label>
                    <input
                      type="text"
                      value={unlockLandmark}
                      onChange={(e) => setUnlockLandmark(e.target.value)}
                      placeholder="e.g. Near Bilal Masjid, Opp. Govt School"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none text-slate-905 focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64] transition"
                    />
                  </div>

                  <div>
                    <label className="text-[9.5px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                      Delivery Notes / Special Instructions
                    </label>
                    <textarea
                      value={unlockNotes}
                      onChange={(e) => setUnlockNotes(e.target.value)}
                      placeholder="e.g. deliver to back gate, call on arrival, orange gate house"
                      rows={2}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none text-slate-900 focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64] transition resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[9.5px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                      Precise GPS coordinates (Optional)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDetectUnlockGPS}
                        disabled={isDetectingUnlockGPS}
                        className="bg-slate-100 border border-slate-200 text-slate-700 py-2.5 px-4 rounded-xl font-bold text-[10.5px] uppercase tracking-wider transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isDetectingUnlockGPS ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          "📍 Auto Fill GPS"
                        )}
                      </button>
                      {unlockCoords ? (
                        <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100">
                          Lat: {unlockCoords.lat?.toFixed(5)}, Lng: {unlockCoords.lng?.toFixed(5)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500 font-semibold italic">
                          No GPS coordinates attached
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setUnlockingUser(null);
                      setUnlockArea("");
                      setUnlockStreet("");
                      setUnlockLandmark("");
                      setUnlockNotes("");
                      setUnlockCoords(null);
                    }}
                    className="px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-[10.5px] uppercase font-black text-slate-600 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#D70F64] text-white rounded-xl text-[10.5px] font-black hover:bg-[#b00c50] shadow-md cursor-pointer transition uppercase tracking-wider flex items-center gap-1.5"
                  >
                    Save & Unlock ✅
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* NEW USER REALTIME NOTIFICATION TOAST */}
      {newUserToast && newUserToast.show && (
        <div className="fixed bottom-6 right-6 z-[120] p-4 max-w-sm bg-zinc-950 border-2 border-orange-500 text-zinc-100 rounded-2xl shadow-2xl flex items-start gap-3 animate-slide-in">
          <div className="bg-orange-500 text-black p-2.5 rounded-xl shrink-0 animate-bounce">
            <span className="text-lg">⏳</span>
          </div>
          <div>
            <h5 className="font-extrabold text-xs text-orange-400 uppercase tracking-wider flex items-center gap-2">
              Naya user aaya!
              <span className="bg-orange-500/20 text-orange-400 text-[8px] font-black px-1.5 py-0.5 rounded-md animate-pulse">
                NEW USER
              </span>
            </h5>
            <p className="text-sm font-black text-zinc-100 mt-1 select-all">
              {newUserToast.phone}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5 font-semibold">
              Call verification is pending! Check Registered Directory.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
