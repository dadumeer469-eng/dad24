import React, { useState, useEffect } from "react";
import OrderReceiptModal from "./OrderReceiptModal";
import AdminOrderInspectorModal from "./AdminOrderInspectorModal";
import { getDisplayOrderId, searchMatchesOrder } from "../lib/orderUtils";
import MapLocationPickerModal from "./MapLocationPickerModal";
import AiMenuGeneratorModal from "./AiMenuGeneratorModal";
import AdminVoucherManager from "./AdminVoucherManager";
import UserVoucherInspectorModal from "./UserVoucherInspectorModal";
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
  Banner,
  Voucher,
  getUserCoins,
} from "../types";
import { awardLoyaltyCoinsForOrder, creditRiderCoinsForOrder } from "../lib/loyalty";
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
  orderBy,
  increment,
} from "firebase/firestore";
import { db, firebaseConfig, databaseId, cleanObject, storage, handleFirestoreError, app } from "../firebase";
import { compressImageToLowRes, compressImageFile } from "../utils/imageCompressor";
import { getDatabase, ref, set as setRtdb, onValue, off } from "firebase/database";
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
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Plus,
  Search,
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
  Calendar,
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
  Flame,
  MapPin,
  ShieldAlert,
  Image as ImageIcon,
  Ticket,
  Coins,
  ClipboardList,
  Navigation,
  Sparkles,
  Wand2,
  Upload,
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
  const [mode, setMode] = React.useState<"url" | "file" | "ai">("file");
  const [urlInput, setUrlInput] = React.useState(imageUrl || "");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [uploadError, setUploadError] = React.useState("");
  const [failedFile, setFailedFile] = React.useState<File | null>(null);

  // Google AI Web Search State
  const [aiPromptInput, setAiPromptInput] = React.useState("");
  const [isGeneratingAi, setIsGeneratingAi] = React.useState(false);
  const [aiError, setAiError] = React.useState("");

  React.useEffect(() => {
    setUrlInput(imageUrl || "");
  }, [imageUrl]);

  const handleUrlChange = (val: string) => {
    setUrlInput(val);
    onChange(val);
  };

  const handleSearchGoogleImage = async () => {
    if (!aiPromptInput.trim()) {
      setAiError("Please type a dish or item name to search Google");
      return;
    }

    setIsGeneratingAi(true);
    setAiError("");

    try {
      const res = await fetch("/api/ai/search-food-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName: aiPromptInput.trim(),
          query: aiPromptInput.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.imageUrl) {
        throw new Error(data.error || "Failed to find image on Google");
      }

      // Compress to low resolution (<30KB) to prevent Firebase load
      const lowResUrl = await compressImageToLowRes(data.imageUrl, 380, 380, 0.72);
      onChange(lowResUrl);
      setUrlInput(lowResUrl);
    } catch (err: any) {
      console.error(err);
      setAiError(err?.message || "Google image search failed");
    } finally {
      setIsGeneratingAi(false);
    }
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
        <div className="flex rounded-lg bg-white border border-slate-200 p-0.5">
          <button
            type="button"
            onClick={() => setMode("file")}
            className={`px-2 py-0.5 text-[8px] uppercase font-black tracking-wide rounded transition cursor-pointer ${
              mode === "file"
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            File
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
            URL
          </button>
          <button
            type="button"
            onClick={() => setMode("ai")}
            className={`px-2 py-0.5 text-[8px] uppercase font-black tracking-wide rounded transition cursor-pointer flex items-center gap-0.5 ${
              mode === "ai"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-blue-700 hover:text-blue-900 bg-blue-50"
            }`}
          >
            <span>üîç</span>
            <span>Google Search</span>
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
      ) : mode === "url" ? (
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
      ) : (
        <div className="space-y-2 p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-blue-900 uppercase tracking-wide flex items-center gap-1">
              <span>üîç</span> Google Food Image Search (Web Photo)
            </span>
            <span className="text-[8.5px] font-bold text-blue-700 bg-blue-200 px-1.5 py-0.5 rounded">
              Google Web
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={aiPromptInput}
              onChange={(e) => setAiPromptInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearchGoogleImage();
                }
              }}
              placeholder="e.g. Special Peshawari Karahi, Karak Chai, Zinger..."
              className="flex-1 p-2 bg-white border border-blue-300 rounded-lg text-xs outline-none text-slate-900 font-medium focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleSearchGoogleImage}
              disabled={isGeneratingAi}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {isGeneratingAi ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <span>üîç</span>
                  <span>Search</span>
                </>
              )}
            </button>
          </div>

          {aiError && (
            <p className="text-[9px] font-bold text-red-600">{aiError}</p>
          )}

          {imageUrl && (
            <div className="flex items-center gap-3 p-2 bg-white border border-blue-200 rounded-lg mt-2">
              <img
                src={imageUrl}
                alt="Search Preview"
                className="h-12 w-12 object-cover rounded-lg border border-blue-300 shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="truncate flex-1">
                <p className="text-[9.5px] font-black text-blue-900">
                  üîç Found via Google Search
                </p>
                <p className="text-[8.5px] text-slate-500">
                  Real web photography &bull; Optimized payload
                </p>
              </div>
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-red-500 hover:text-red-700 text-[10px] font-bold uppercase shrink-0 px-2 cursor-pointer"
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

const parseDateToMillis = (val: any): number => {
  if (!val) return 0;
  if (typeof val.toDate === "function") return val.toDate().getTime();
  if (val.seconds !== undefined) return val.seconds * 1000;
  if (val instanceof Date) return val.getTime();
  if (typeof val === "number") return val;
  if (typeof val === "string") return Date.parse(val) || 0;
  return 0;
};

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
    | "banners"
    | "food_categories"
    | "loyalty"
    | "vouchers"
  >("analytics");
  const [editingRiderPasswordId, setEditingRiderPasswordId] = useState<string | null>(null);
  const [newPasswordInputValue, setNewPasswordInputValue] = useState<string>("");
  const [showPasswordId, setShowPasswordId] = useState<string | null>(null);
  const [selectedRiderStatsId, setSelectedRiderStatsId] = useState<string | null>(null);
  const [statsTimeframe, setStatsTimeframe] = useState<"1day" | "7days" | "30days" | "60days" | "all">("all");
  const [showSettledHistory, setShowSettledHistory] = useState<boolean>(false);

  const [selectedRestLedgerName, setSelectedRestLedgerName] = useState<string | null>(null);
  const [restStatsTimeframe, setRestStatsTimeframe] = useState<"1day" | "7days" | "30days" | "60days" | "all">("all");
  const [showRestSettledHistory, setShowRestSettledHistory] = useState<boolean>(false);

  const [allUsersList, setAllUsersList] = useState<UserProfile[]>([]);
  const [bannersList, setBannersList] = useState<Banner[]>([]);
  const [vouchersList, setVouchersList] = useState<Voucher[]>([]);
  const [inspectingVoucherUser, setInspectingVoucherUser] = useState<UserProfile | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userFilterTab, setUserFilterTab] = useState<"new" | "active" | "blocked">("new");
  const [receiptModalOrder, setReceiptModalOrder] = useState<Order | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isAiMenuGeneratorOpen, setIsAiMenuGeneratorOpen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "promotional_banners"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setBannersList(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Banner)));
    });
    return () => unsub();
  }, []);

  // Realtime subscription to vouchers
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "vouchers"),
      (snap) => {
        setVouchersList(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Voucher)));
      },
      (err) => {
        console.warn("Error subscribing to vouchers:", err);
      }
    );
    return () => unsub();
  }, []);

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
  const [riderRangeKmInput, setRiderRangeKmInput] = useState(
    deliverySettings?.riderRangeKm || 5,
  );
  const [userRangeKmInput, setUserRangeKmInput] = useState(
    deliverySettings?.userRangeKm || 10,
  );
  const [baseLatInput, setBaseLatInput] = useState(
    deliverySettings?.baseLocationCoords?.lat || 26.7323, // Dadu city center approx
  );
  const [baseLngInput, setBaseLngInput] = useState(
    deliverySettings?.baseLocationCoords?.lng || 67.7744, // Dadu city center approx
  );

  // Maintenance Mode States
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(
    deliverySettings?.isMaintenanceMode || false,
  );
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    deliverySettings?.maintenanceMessage || "We are currently carrying out system maintenance. We'll be back online shortly!",
  );

  // Live Rider GPS Tracking Quota Control State
  const [isLiveTrackingEnabled, setIsLiveTrackingEnabled] = useState<boolean>(true);

  // Sync Live Tracking toggle state from Firebase Realtime Database
  useEffect(() => {
    let trackingSettingRef: any = null;
    try {
      const rtdb = getDatabase(app);
      trackingSettingRef = ref(rtdb, "settings/live_tracking_enabled");
      const unsubscribe = onValue(trackingSettingRef, (snapshot) => {
        const val = snapshot.val();
        setIsLiveTrackingEnabled(val === null ? true : Boolean(val));
      });
      return () => {
        off(trackingSettingRef);
      };
    } catch (e) {
      console.warn("RTDB live_tracking_enabled listener error:", e);
    }
  }, []);

  const handleToggleLiveTracking = async (newVal: boolean) => {
    try {
      setIsLiveTrackingEnabled(newVal);
      const rtdb = getDatabase(app);
      await setRtdb(ref(rtdb, "settings/live_tracking_enabled"), newVal);
      await setDoc(
        doc(db, "settings", "delivery_config"),
        cleanObject({
          ...deliverySettings,
          liveTrackingEnabled: newVal,
        })
      );
    } catch (e) {
      console.error("Error toggling live tracking in RTDB:", e);
      alert("Failed to update live tracking setting.");
    }
  };

  // Restaurant Status Management
  const [restStatusUnavailable, setRestStatusUnavailable] = useState(false);
  const [restOpeningTime, setRestOpeningTime] = useState("09:00");
  const [restClosingTime, setRestClosingTime] = useState("23:00");
  const [restImageUrl, setRestImageUrl] = useState("");
  const [restBgImageUrl, setRestBgImageUrl] = useState("");
  const [restPhone, setRestPhone] = useState("");
  const [restMinOrder, setRestMinOrder] = useState("");
  const [restDeliveryCharge, setRestDeliveryCharge] = useState("");
  const [restLat, setRestLat] = useState("");
  const [restLng, setRestLng] = useState("");
  const [isRestaurantMapPickerOpen, setIsRestaurantMapPickerOpen] = useState(false);
  const [isBaseMapPickerOpen, setIsBaseMapPickerOpen] = useState(false);
  const [isUserMapPickerOpen, setIsUserMapPickerOpen] = useState(false);
  const [showUserManualCoords, setShowUserManualCoords] = useState(false);
  const [showRestManualCoords, setShowRestManualCoords] = useState(false);
  const [restCommissionEnabled, setRestCommissionEnabled] = useState(false);
  const [restCommissionType, setRestCommissionType] = useState<"percentage" | "fixed">("percentage");
  const [restCommissionValue, setRestCommissionValue] = useState("");
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
  const [heroBgUrl, setHeroBgUrl] = useState("");
  const [partnerShopsBgUrl, setPartnerShopsBgUrl] = useState("");

  // Loyalty Wallet States
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(true);
  const [loyaltyMinOrderForEarn, setLoyaltyMinOrderForEarn] = useState(100);
  const [loyaltyEarnCoins, setLoyaltyEarnCoins] = useState(15);
  const [loyaltyEarnType, setLoyaltyEarnType] = useState<"fixed" | "percentage">("fixed");
  const [loyaltyMaxSpendCoins, setLoyaltyMaxSpendCoins] = useState(50);
  const [loyaltyAllowOnFood, setLoyaltyAllowOnFood] = useState(true);
  const [loyaltyAllowOnGrocery, setLoyaltyAllowOnGrocery] = useState(false);

  // Global Popup Announcement / Offer States
  const [announcementActive, setAnnouncementActive] = useState(false);
  const [announcementImageUrl, setAnnouncementImageUrl] = useState("");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementDescription, setAnnouncementDescription] = useState("");
  const [announcementId, setAnnouncementId] = useState("");

  // Sync state when props or selected restaurant change
  useEffect(() => {
    if (deliverySettings) {
      setDeliveryChargeInput(deliverySettings.deliveryFee || 50);
      setMinOrderAmountInput(deliverySettings.minOrderAmount || 0);
      setRiderRangeKmInput(deliverySettings.riderRangeKm || 5);
      setUserRangeKmInput(deliverySettings.userRangeKm || 10);
      setIsMaintenanceMode(deliverySettings.isMaintenanceMode || false);
      setMaintenanceMessage(
        deliverySettings.maintenanceMessage ||
          "We are currently carrying out system maintenance. We'll be back online shortly!"
      );
      if (deliverySettings.baseLocationCoords) {
        setBaseLatInput(deliverySettings.baseLocationCoords.lat);
        setBaseLngInput(deliverySettings.baseLocationCoords.lng);
      }

      // Initialize loyalty parameters
      setLoyaltyEnabled(deliverySettings.loyaltyEnabled !== false);
      setLoyaltyMinOrderForEarn(deliverySettings.loyaltyMinOrderForEarn ?? 100);
      setLoyaltyEarnCoins(deliverySettings.loyaltyEarnCoins ?? 15);
      setLoyaltyEarnType(deliverySettings.loyaltyEarnType ?? "fixed");
      setLoyaltyMaxSpendCoins(deliverySettings.loyaltyMaxSpendCoins ?? 50);
      setLoyaltyAllowOnFood(deliverySettings.loyaltyAllowOnFood !== false);
      setLoyaltyAllowOnGrocery(deliverySettings.loyaltyAllowOnGrocery || false);

      // Sync global announcement/offer popup
      setAnnouncementActive(deliverySettings.announcement?.active || false);
      setAnnouncementImageUrl(deliverySettings.announcement?.imageUrl || "");
      setAnnouncementTitle(deliverySettings.announcement?.title || "");
      setAnnouncementDescription(deliverySettings.announcement?.description || "");
      setAnnouncementId(deliverySettings.announcement?.id || "");

      // Load specific restaurant status or fallback to global/default
      const specificStatus =
        deliverySettings.restaurantStatuses?.[selectedScheduleRestaurant];
      if (specificStatus) {
        setRestStatusUnavailable(specificStatus.isTemporarilyUnavailable);
        setRestOpeningTime(specificStatus.openingTime);
        setRestClosingTime(specificStatus.closingTime);
        setRestImageUrl(specificStatus.imageUrl || "");
        setRestBgImageUrl(specificStatus.bgImageUrl || "");
        setRestPhone(specificStatus.phone || "");
        setRestMinOrder(specificStatus.minOrder?.toString() || "");
        setRestDeliveryCharge(specificStatus.deliveryCharge || "");
        setRestLat(specificStatus.coords?.lat?.toString() || "");
        setRestLng(specificStatus.coords?.lng?.toString() || "");
        setRestCommissionEnabled(specificStatus.commissionEnabled || false);
        setRestCommissionType(specificStatus.commissionType || "percentage");
        setRestCommissionValue(specificStatus.commissionValue?.toString() || "");
      } else {
        setRestStatusUnavailable(false);
        setRestOpeningTime("09:00");
        setRestClosingTime("23:00");
        setRestImageUrl("");
        setRestBgImageUrl("");
        setRestPhone("");
        setRestMinOrder("");
        setRestDeliveryCharge("");
        setRestLat("");
        setRestLng("");
        setRestCommissionEnabled(false);
        setRestCommissionType("percentage");
        setRestCommissionValue("");
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

    const unsubscribeUi = onSnapshot(
      doc(db, "settings", "ui_config"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setHeroBgUrl(data.heroBgUrl || "");
          setPartnerShopsBgUrl(data.partnerShopsBgUrl || "");
        }
      }
    );

    return () => {
      unsubscribe();
      unsubscribeSeo();
      unsubscribeUi();
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
    bgImageUrl: "",
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
        bgImageUrl: "",
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

  const handleSaveUiConfig = async () => {
    try {
      await setDoc(
        doc(db, "settings", "ui_config"),
        {
          heroBgUrl: heroBgUrl,
          partnerShopsBgUrl: partnerShopsBgUrl,
        },
        { merge: true },
      );
      alert(`UI settings successfully saved!`);
    } catch (err) {
      alert(`Failed to save UI settings: ${handleFirestoreError(err)}`);
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
  const [newItemOpeningTime, setNewItemOpeningTime] = useState("");
  const [newItemClosingTime, setNewItemClosingTime] = useState("");
  const [newItemServiceDuration, setNewItemServiceDuration] = useState("");
  const [newItemRestaurantName, setNewItemRestaurantName] = useState("");
  const [newItemCommission, setNewItemCommission] = useState<number>(0);
  const [newItemIsBestseller, setNewItemIsBestseller] = useState<boolean>(false);
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
  const [editingOpeningTime, setEditingOpeningTime] = useState<string>("");
  const [editingClosingTime, setEditingClosingTime] = useState<string>("");
  const [editingNameInput, setEditingNameInput] = useState<string>("");
  const [editingPriceInput, setEditingPriceInput] = useState<number>(0);
  const [editingDiscountPriceInput, setEditingDiscountPriceInput] =
    useState<number>(0);
  const [editingCommissionInput, setEditingCommissionInput] =
    useState<number>(0);
  const [editingIsBestseller, setEditingIsBestseller] = useState<boolean>(false);
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

  // High-volume ringtone and mute control state for Admin Panel
  const [isAdminMuted, setIsAdminMuted] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dadu_admin_alarm_muted") === "true";
    }
    return false;
  });

  const toggleAdminMute = () => {
    setIsAdminMuted((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("dadu_admin_alarm_muted", String(next));
      }
      return next;
    });
  };

  const adminAudioCtxRef = React.useRef<AudioContext | null>(null);

  const getAdminAudioContext = () => {
    try {
      if (!adminAudioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          adminAudioCtxRef.current = new AudioCtx();
        }
      }
      if (adminAudioCtxRef.current && adminAudioCtxRef.current.state === "suspended") {
        adminAudioCtxRef.current.resume().catch(() => {});
      }
      return adminAudioCtxRef.current;
    } catch (e) {
      return null;
    }
  };

  // Auto unlock AudioContext on any admin interaction
  React.useEffect(() => {
    const unlockAudio = () => {
      getAdminAudioContext();
    };
    window.addEventListener("click", unlockAudio);
    window.addEventListener("touchstart", unlockAudio);
    return () => {
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    };
  }, []);

  const triggerAdminVibration = () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([400, 150, 400, 150, 400]);
      } catch (e) {
        // Ignored
      }
    }
  };

  const playAdminHighVolumeRing = () => {
    if (isAdminMuted) return;
    try {
      const ctx = getAdminAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sawtooth";
      osc2.type = "square";

      // Loud dual-tone dispatcher ring effect
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.setValueAtTime(1250, now + 0.12);
      osc1.frequency.setValueAtTime(880, now + 0.25);
      osc1.frequency.setValueAtTime(1250, now + 0.38);

      osc2.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(625, now + 0.12);
      osc2.frequency.setValueAtTime(440, now + 0.25);
      osc2.frequency.setValueAtTime(625, now + 0.38);

      gain.gain.setValueAtTime(0.95, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.65);
      osc2.stop(now + 0.65);
    } catch (e) {
      console.error("Admin audio ring error:", e);
    }
  };

  // Count unapproved pending orders and locked new users
  const unapprovedOrdersCount = orders.filter((o) => o.status === "pending").length;
  const lockedUsersCount = allUsersList.filter((u) => u.status === "locked").length;

  // Loop alarm sound when unapproved new orders or locked new users exist
  React.useEffect(() => {
    if (unapprovedOrdersCount === 0 && lockedUsersCount === 0) return;
    if (isAdminMuted) return;

    playAdminHighVolumeRing();
    triggerAdminVibration();

    const interval = setInterval(() => {
      playAdminHighVolumeRing();
      triggerAdminVibration();
    }, 1500);

    return () => clearInterval(interval);
  }, [unapprovedOrdersCount, lockedUsersCount, isAdminMuted]);

  // User coin management states
  const [coinManagingUser, setCoinManagingUser] = useState<UserProfile | null>(null);
  const [coinAmountInput, setCoinAmountInput] = useState<number>(50);
  const [coinNoteInput, setCoinNoteInput] = useState<string>("");
  const [isCoinProcessing, setIsCoinProcessing] = useState<boolean>(false);
  const isFirstLoadRef = React.useRef(true);

  // Automatically populate address fields when configuring/editing a user
  React.useEffect(() => {
    if (unlockingUser) {
      setUnlockArea(unlockingUser.savedLocation?.area || "");
      setUnlockStreet(unlockingUser.savedLocation?.street || "");
      setUnlockLandmark((unlockingUser.savedLocation as any)?.landmark || "");
      setUnlockNotes((unlockingUser.savedLocation as any)?.notes || "");
      if (unlockingUser.savedLocation?.lat && unlockingUser.savedLocation?.lng) {
        setUnlockCoords({
          lat: unlockingUser.savedLocation.lat,
          lng: unlockingUser.savedLocation.lng
        });
      } else {
        setUnlockCoords(null);
      }
    }
  }, [unlockingUser]);

  const playNewUserAlert = (phone: string) => {
    playAdminHighVolumeRing();
    triggerAdminVibration();

    // New User Toast notification
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

      if (unlockingUser.status === "locked") {
        alert(`‚úÖ User ${unlockingUser.phone} unlocked successfully with delivery address!`);
      } else {
        alert(`‚úÖ User ${unlockingUser.phone} address updated successfully!`);
      }
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
  const [adminOrderFilterTab, setAdminOrderFilterTab] = useState<"new" | "delivered" | "cancelled">("new");
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>("");
  const [inspectedOrder, setInspectedOrder] = useState<Order | null>(null);

  // Date range filter state for Live Operational Orders & History
  const [orderDateRange, setOrderDateRange] = useState<"all" | "1day" | "7days" | "30days" | "custom">("all");
  const [orderCustomStartDate, setOrderCustomStartDate] = useState<string>("");
  const [orderCustomEndDate, setOrderCustomEndDate] = useState<string>("");

  // Clear sales history modal state
  const [showClearSalesModal, setShowClearSalesModal] = useState<boolean>(false);
  const [clearSalesRange, setClearSalesRange] = useState<"all" | "1day" | "7days" | "30days" | "custom">("all");
  const [clearSalesStatus, setClearSalesStatus] = useState<"all" | "delivered" | "cancelled">("delivered");
  const [clearSalesCustomStart, setClearSalesCustomStart] = useState<string>("");
  const [clearSalesCustomEnd, setClearSalesCustomEnd] = useState<string>("");
  const [isDeletingSales, setIsDeletingSales] = useState<boolean>(false);

  // Helper to check if an order falls into a date range
  const checkOrderInDateRange = (
    order: any,
    range: "all" | "1day" | "7days" | "30days" | "custom",
    customStart?: string,
    customEnd?: string
  ): boolean => {
    if (range === "all") return true;
    if (!order?.createdAt) return false;

    let orderTime = 0;
    if (typeof order.createdAt.seconds === "number") {
      orderTime = order.createdAt.seconds * 1000;
    } else if (order.createdAt instanceof Date) {
      orderTime = order.createdAt.getTime();
    } else if (typeof order.createdAt === "number") {
      orderTime = order.createdAt;
    } else if (typeof order.createdAt === "string") {
      const parsed = new Date(order.createdAt).getTime();
      if (!isNaN(parsed)) orderTime = parsed;
    }

    if (!orderTime || isNaN(orderTime)) return false;

    const now = new Date();

    if (range === "1day") {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      return orderTime >= startOfToday;
    }

    if (range === "7days") {
      const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      return orderTime >= sevenDaysAgo;
    }

    if (range === "30days") {
      const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
      return orderTime >= thirtyDaysAgo;
    }

    if (range === "custom") {
      if (customStart) {
        const sTime = new Date(`${customStart}T00:00:00`).getTime();
        if (!isNaN(sTime) && orderTime < sTime) return false;
      }
      if (customEnd) {
        const eTime = new Date(`${customEnd}T23:59:59`).getTime();
        if (!isNaN(eTime) && orderTime > eTime) return false;
      }
      return true;
    }

    return true;
  };

  const handleExecuteClearSalesHistory = async () => {
    setIsDeletingSales(true);
    try {
      const matchingOrders = orders.filter((order) => {
        const isDelivered = order.status === "delivered" || order.status === "completed";
        const isCancelled = order.status === "cancelled";

        if (clearSalesStatus === "delivered" && !isDelivered) return false;
        if (clearSalesStatus === "cancelled" && !isCancelled) return false;

        return checkOrderInDateRange(order, clearSalesRange, clearSalesCustomStart, clearSalesCustomEnd);
      });

      if (matchingOrders.length === 0) {
        alert("No orders match the selected filters to delete.");
        setIsDeletingSales(false);
        return;
      }

      const deletePromises = matchingOrders.map((ord) => deleteDoc(doc(db, "orders", ord.id)));
      await Promise.all(deletePromises);

      alert(`Successfully deleted ${matchingOrders.length} order(s) from history!`);
      setShowClearSalesModal(false);
    } catch (err) {
      console.error("Error clearing sales history:", err);
      alert("Failed to clear sales history. Please check database permissions.");
    } finally {
      setIsDeletingSales(false);
    }
  };

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

  const handleSaveRiderPassword = async (riderUid: string) => {
    const newPass = newPasswordInputValue.trim();
    if (!newPass || newPass.length < 6) {
      alert("Password must be at least 6 characters long!");
      return;
    }
    try {
      await updateDoc(doc(db, "users", riderUid), {
        password: newPass
      });
      setEditingRiderPasswordId(null);
      setNewPasswordInputValue("");
      alert("Rider password updated successfully!");
    } catch (err) {
      console.error("Failed to update rider password:", err);
      alert("Error: Database permission denied or insufficient administrative credentials.");
    }
  };

  const handleSettleRider = async (riderUid: string, name: string) => {
    const isConfirmed = window.confirm(
      `Kya aap Rider "${name}" ki active statistics aur earned commission ko settle aur clear karna chahte hain? Settle karne ke baad active counters reset ho jayenge.`
    );
    if (!isConfirmed) return;

    try {
      // 1. Update rider user profile with lastSettledAt
      await updateDoc(doc(db, "users", riderUid), {
        lastSettledAt: new Date()
      });

      // 2. Query all completed/delivered orders of this rider that aren't settled yet
      const riderOrdersToSettle = orders.filter((o) => {
        if (o.riderId !== riderUid) return false;
        if (o.status !== "delivered" && o.status !== "completed") return false;
        if (o.riderSettled) return false;
        return true;
      });

      // 3. Mark them as settled in Firestore
      await Promise.all(
        riderOrdersToSettle.map((o) =>
          updateDoc(doc(db, "orders", o.id), {
            riderSettled: true,
            riderSettledAt: new Date()
          })
        )
      );

      alert(`Rider "${name}" ki active stats successfully settled aur clear ho gayi hain!`);
    } catch (err) {
      console.error("Failed to settle rider stats:", err);
      alert("Error: Database permission denied or insufficient administrative credentials.");
    }
  };

  const handleSettleRestaurant = async (restaurantName: string) => {
    const isConfirmed = window.confirm(
      `Kya aap Restaurant "${restaurantName}" ki active statistics aur earned commission ko settle aur clear karna chahte hain? Settle karne ke baad active counters reset ho jayenge.`
    );
    if (!isConfirmed) return;

    try {
      await updateDoc(doc(db, "settings", "delivery_config"), {
        [`restaurantStatuses.${restaurantName}.lastSettledAt`]: new Date()
      });
      alert(`Restaurant "${restaurantName}" ki active stats successfully settle aur clear ho gayi hain!`);
    } catch (err) {
      console.error("Failed to settle restaurant stats:", err);
      alert("Error: Database permission denied or insufficient administrative credentials.");
    }
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

  // Render last 7 days of order volume and total revenue
  const getLast7DaysSalesSummary = () => {
    const daysData: Array<{
      date: string;
      fullDate: Date;
      revenue: number;
      volume: number;
    }> = [];
    const today = new Date();
    
    // Generate dates for the last 7 days (including today)
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      daysData.push({
        date: dateStr,
        fullDate: d,
        revenue: 0,
        volume: 0,
      });
    }

    // Populate order volume and revenue for each day
    orders.forEach((order) => {
      if (!order.createdAt) return;
      
      const orderDate = order.createdAt.seconds
        ? new Date(order.createdAt.seconds * 1000)
        : (order.createdAt instanceof Date ? order.createdAt : null);
        
      if (!orderDate) return;
      
      daysData.forEach((day) => {
        const dDate = day.fullDate;
        if (
          orderDate.getDate() === dDate.getDate() &&
          orderDate.getMonth() === dDate.getMonth() &&
          orderDate.getFullYear() === dDate.getFullYear()
        ) {
          // Both volume and revenue from delivered / completed orders
          if (order.status === "delivered" || order.status === "completed") {
            day.revenue += order.grandTotal || 0;
            day.volume += 1;
          }
        }
      });
    });

    return daysData.map((day) => ({
      date: day.date,
      revenue: Math.round(day.revenue),
      volume: day.volume,
    }));
  };

  const getSalesSummaryForRange = () => {
    const range = orderDateRange;
    const now = new Date();

    if (range === "1day") {
      const hoursData = Array.from({ length: 24 }, (_, h) => {
        const hourLabel = `${h.toString().padStart(2, "0")}:00`;
        return { date: hourLabel, hour: h, revenue: 0, volume: 0 };
      });

      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      orders.forEach((order) => {
        if (!order.createdAt) return;
        const isDelivered = order.status === "delivered" || order.status === "completed";
        if (!isDelivered) return;

        let orderDate: Date | null = null;
        if (typeof order.createdAt.seconds === "number") {
          orderDate = new Date(order.createdAt.seconds * 1000);
        } else if (order.createdAt instanceof Date) {
          orderDate = order.createdAt;
        } else if (typeof order.createdAt === "string" || typeof order.createdAt === "number") {
          orderDate = new Date(order.createdAt);
        }

        if (orderDate && orderDate.getTime() >= todayStart) {
          const h = orderDate.getHours();
          if (hoursData[h]) {
            hoursData[h].revenue += order.grandTotal || 0;
            hoursData[h].volume += 1;
          }
        }
      });

      return hoursData.map(item => ({
        date: item.date,
        revenue: Math.round(item.revenue),
        volume: item.volume
      }));
    }

    let numDays = 7;
    if (range === "30days") numDays = 30;
    if (range === "all") numDays = 30;

    if (range === "custom" && orderCustomStartDate && orderCustomEndDate) {
      const s = new Date(`${orderCustomStartDate}T00:00:00`);
      const e = new Date(`${orderCustomEndDate}T23:59:59`);
      const diffTime = Math.abs(e.getTime() - s.getTime());
      numDays = Math.min(Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 1), 60);
    }

    const daysData: Array<{
      date: string;
      fullDate: Date;
      revenue: number;
      volume: number;
    }> = [];

    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date();
      if (range === "custom" && orderCustomEndDate) {
        d.setTime(new Date(`${orderCustomEndDate}T23:59:59`).getTime());
      }
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      daysData.push({
        date: dateStr,
        fullDate: d,
        revenue: 0,
        volume: 0,
      });
    }

    orders.forEach((order) => {
      if (!order.createdAt) return;
      const isDelivered = order.status === "delivered" || order.status === "completed";
      if (!isDelivered) return;

      if (!checkOrderInDateRange(order, range, orderCustomStartDate, orderCustomEndDate)) return;

      let orderDate: Date | null = null;
      if (typeof order.createdAt.seconds === "number") {
        orderDate = new Date(order.createdAt.seconds * 1000);
      } else if (order.createdAt instanceof Date) {
        orderDate = order.createdAt;
      } else if (typeof order.createdAt === "string" || typeof order.createdAt === "number") {
        orderDate = new Date(order.createdAt);
      }

      if (!orderDate || isNaN(orderDate.getTime())) return;

      daysData.forEach((day) => {
        const dDate = day.fullDate;
        if (
          orderDate!.getDate() === dDate.getDate() &&
          orderDate!.getMonth() === dDate.getMonth() &&
          orderDate!.getFullYear() === dDate.getFullYear()
        ) {
          day.revenue += order.grandTotal || 0;
          day.volume += 1;
        }
      });
    });

    return daysData.map((day) => ({
      date: day.date,
      revenue: Math.round(day.revenue),
      volume: day.volume,
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
        ...deliverySettings,
        deliveryFee: Number(deliveryChargeInput),
        minOrderAmount: Number(minOrderAmountInput),
        riderRangeKm: Number(riderRangeKmInput),
        userRangeKm: Number(userRangeKmInput),
        baseLocationCoords: {
          lat: Number(baseLatInput),
          lng: Number(baseLngInput),
        },
        // Keep legacy for safety
        restaurantStatus: deliverySettings?.restaurantStatus || {
          isTemporarilyUnavailable: false,
          openingTime: "09:00",
          closingTime: "23:00",
        },
        restaurantStatuses: {
          ...existingStatuses,
          [selectedScheduleRestaurant]: {
            ...(existingStatuses[selectedScheduleRestaurant] || {}),
            isTemporarilyUnavailable: restStatusUnavailable,
            openingTime: restOpeningTime,
            closingTime: restClosingTime,
            imageUrl: restImageUrl,
            bgImageUrl: restBgImageUrl,
            phone: restPhone,
            minOrder: restMinOrder ? String(restMinOrder) : null,
            deliveryCharge: restDeliveryCharge,
            coords: restLat && restLng ? { lat: parseFloat(restLat), lng: parseFloat(restLng) } : null,
            commissionEnabled: restCommissionEnabled,
            commissionType: restCommissionType,
            commissionValue: restCommissionValue ? Number(restCommissionValue) : 0,
          },
        },
        isMaintenanceMode: isMaintenanceMode,
        maintenanceMessage: maintenanceMessage,
        announcement: {
          active: announcementActive,
          imageUrl: announcementImageUrl.trim(),
          title: announcementTitle.trim(),
          description: announcementDescription.trim(),
          id: announcementId.trim() || String(Date.now()),
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

  // Save Maintenance Mode Config
  const handleSaveMaintenanceConfig = async () => {
    try {
      const newSettings = {
        ...deliverySettings,
        isMaintenanceMode: isMaintenanceMode,
        maintenanceMessage: maintenanceMessage.trim(),
      };
      await setDoc(doc(db, "settings", "delivery_config"), cleanObject(newSettings));
      alert("Maintenance mode configuration saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Permission denied or Firestore configuration missing while saving maintenance config.");
    }
  };

  // Save Loyalty Wallet Config
  const handleSaveLoyaltyConfig = async () => {
    try {
      const newSettings = {
        ...deliverySettings,
        loyaltyEnabled: Boolean(loyaltyEnabled),
        loyaltyMinOrderForEarn: Number(loyaltyMinOrderForEarn),
        loyaltyEarnCoins: Number(loyaltyEarnCoins),
        loyaltyEarnType,
        loyaltyMaxSpendCoins: Number(loyaltyMaxSpendCoins),
        loyaltyAllowOnFood: Boolean(loyaltyAllowOnFood),
        loyaltyAllowOnGrocery: Boolean(loyaltyAllowOnGrocery),
      };
      await setDoc(doc(db, "settings", "delivery_config"), cleanObject(newSettings));
      alert("Loyalty Coin Wallet configuration saved successfully! ü™ô");
    } catch (err) {
      console.error(err);
      alert("Permission denied or Firestore configuration missing while saving loyalty config.");
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
      openingTime: newItemOpeningTime || undefined,
      closingTime: newItemClosingTime || undefined,
      type: newItemType,
      restaurantName:
        newItemRestaurantName.trim() ||
        (newItemType === "service"
          ? "Dadu Home Services"
          : "Dadu Fast Food & Kitchen"),
      commission: Number(newItemCommission),
      isBestseller: newItemIsBestseller,
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
      setNewItemIsBestseller(false);
      setNewItemSizes([]);
      setNewItemFlavors([]);
      setNewItemAddOns([]);
      setNewItemOpeningTime("");
      setNewItemClosingTime("");
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

  const handleToggleBestseller = async (dish: Dish) => {
    try {
      await updateDoc(doc(db, "menu", dish.id), {
        isBestseller: !dish.isBestseller,
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
        openingTime: editingOpeningTime || null,
        closingTime: editingClosingTime || null,
        discountPrice:
          editingDiscountPriceInput > 0 ? editingDiscountPriceInput : null,
        commission: editingCommissionInput,
        isBestseller: editingIsBestseller,
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

      if (nextStatus === "delivered") {
        await awardLoyaltyCoinsForOrder(db, orderId);
        await creditRiderCoinsForOrder(db, orderId);
      }

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

  const handleExportCSV = () => {
    if (orders.length === 0) {
      alert("No orders to export.");
      return;
    }
    const headers = ["Order ID", "Date", "Customer Name", "Phone", "Address", "Total", "Status", "Items"];
    const rows = orders.map(order => [
      order.id,
      new Date(order.createdAt).toLocaleString(),
      `"${order.userName}"`,
      order.userPhone,
      `"${order.userAddress}"`,
      order.grandTotal,
      order.status,
      `"${order.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}"`
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `dadu_food_orders_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReceipt = (order: Order) => {
    setReceiptModalOrder(order);
    setIsReceiptModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 overflow-y-auto font-sans flex flex-col antialiased">
      {/* Header Admin Strip */}
      <div className="bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 px-3 py-2.5 sm:px-6 sm:py-3.5 sticky top-0 z-20 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="bg-gradient-to-r from-[#D70F64] to-[#b00c50] text-white px-2.5 py-1 text-[9.5px] sm:text-[10.5px] font-black uppercase tracking-widest rounded-lg shadow-sm">
            Console Active
          </div>
          <div>
            <h2 className="text-xs sm:text-base font-black tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
              Dadu Hub
              <span className="text-[#D70F64] font-mono text-[10px] sm:text-xs select-all bg-[#D70F64]/5 dark:bg-[#D70F64]/20 px-1.5 py-0.5 rounded border border-[#D70F64]/20">
                @{adminUsername}
              </span>
            </h2>
            <span className="hidden sm:block text-[11px] text-slate-500 dark:text-zinc-400 font-medium font-sans">
              Enterprise Business Management Control & Live Logistics Telemetry
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Prominent Live Orders Quick Action Pill */}
          <button
            onClick={() => setActiveSubTab("orders")}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 ${
              activeSubTab === "orders"
                ? "bg-[#D70F64] text-white shadow-md ring-2 ring-[#D70F64]/30"
                : "bg-pink-50 dark:bg-pink-950/40 text-[#D70F64] hover:bg-pink-100 dark:hover:bg-pink-900/60 border border-pink-200 dark:border-pink-800"
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D70F64]"></span>
            </span>
            <ShoppingCart className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Live Orders</span>
            {totalActiveCount > 0 && (
              <span className="bg-[#D70F64] text-white text-[10px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                {totalActiveCount}
              </span>
            )}
          </button>

          <button
            onClick={toggleAdminMute}
            className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer border active:scale-95 ${
              isAdminMuted
                ? "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-700"
                : (unapprovedOrdersCount > 0 || lockedUsersCount > 0)
                ? "bg-red-500 text-white border-red-600 animate-pulse shadow-md"
                : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
            }`}
            title="Toggle Admin Ringtone Sound"
          >
            {isAdminMuted ? "üîá Muted" : "üîä Ringing"}
          </button>

          <button
            onClick={handleExportCSV}
            className="hidden md:flex bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer items-center gap-1.5 border border-slate-200 dark:border-zinc-700"
          >
            <ClipboardList className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-300" /> Export CSV
          </button>

          <button
            onClick={onClose}
            className="bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-[11px] sm:text-xs font-bold text-slate-700 dark:text-zinc-200 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-xs active:scale-95"
          >
            Exit üö™
          </button>
        </div>
      </div>

      {/* Main Container Dashboard */}
      <div className="max-w-7xl mx-auto w-full px-2.5 py-3 sm:px-6 sm:py-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-6 pb-20">
        {/* Prominent New Order / New User Ring Alert Banner */}
        {(unapprovedOrdersCount > 0 || lockedUsersCount > 0) && (
          <div className="col-span-1 lg:col-span-12 bg-gradient-to-r from-red-600 via-[#D70F64] to-red-600 text-white p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl border-2 border-red-400/50">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <span className="text-3xl animate-bounce">üö®</span>
              <div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2 justify-center sm:justify-start">
                  <span>HIGH ALERT: ACTION REQUIRED!</span>
                  <span className="bg-white text-red-600 font-black text-[9.5px] px-2 py-0.5 rounded-full uppercase animate-pulse">
                    RINGING ACTIVE
                  </span>
                </h3>
                <p className="text-[11px] text-pink-100 font-medium mt-0.5">
                  {unapprovedOrdersCount > 0 && `üì¶ ${unapprovedOrdersCount} New Pending Order(s) waiting for dispatch! `}
                  {lockedUsersCount > 0 && `üë§ ${lockedUsersCount} New User(s) awaiting verification & unlock!`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 flex-wrap">
              <button
                onClick={() => {
                  playAdminHighVolumeRing();
                  triggerAdminVibration();
                }}
                className="py-1.5 px-3 bg-white/20 hover:bg-white/30 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition active:scale-95 cursor-pointer border border-white/30"
              >
                üîä Test Ring
              </button>
              {unapprovedOrdersCount > 0 && (
                <button
                  onClick={() => setActiveSubTab("orders")}
                  className="py-1.5 px-3 bg-white text-red-600 hover:bg-slate-100 rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 cursor-pointer shadow-sm"
                >
                  View Orders ({unapprovedOrdersCount})
                </button>
              )}
              {lockedUsersCount > 0 && (
                <button
                  onClick={() => {
                    setActiveSubTab("users");
                    setUserFilterTab("new");
                  }}
                  className="py-1.5 px-3 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 cursor-pointer shadow-sm"
                >
                  Verify Users ({lockedUsersCount})
                </button>
              )}
              <button
                onClick={toggleAdminMute}
                className="py-1.5 px-3 bg-red-950/60 hover:bg-red-950 text-white rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 cursor-pointer border border-red-400/30"
              >
                {isAdminMuted ? "üîä Unmute Ring" : "üîá Mute Ring"}
              </button>
            </div>
          </div>
        )}
        {/* Mobile Horizontal Navigation Tab Bar (Shown only on small/medium screens) */}
        <div className="lg:hidden col-span-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-2 rounded-2xl shadow-xs space-y-1.5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-nowrap scrollbar-none">
            {/* Prominent High-Priority Live Orders Pill First */}
            <button
              onClick={() => setActiveSubTab("orders")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border transition cursor-pointer shadow-xs ${
                activeSubTab === "orders"
                  ? "bg-[#D70F64] border-[#D70F64] text-white shadow-md"
                  : "bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-800 text-[#D70F64] dark:text-pink-400"
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5 animate-pulse" /> Live Orders {totalActiveCount > 0 && `(${totalActiveCount})`}
            </button>
            <button
              onClick={() => setActiveSubTab("analytics")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                activeSubTab === "analytics" ? "bg-[#D70F64] border-[#D70F64] text-white" : "bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" /> Analytics
            </button>
            <button
              onClick={() => setActiveSubTab("restaurants")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                activeSubTab === "restaurants" ? "bg-[#D70F64] border-[#D70F64] text-white" : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Vendors
            </button>
            <button
              onClick={() => { setActiveSubTab("items"); setNewItemType("food"); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                activeSubTab === "items" ? "bg-[#D70F64] border-[#D70F64] text-white" : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <ListCollapse className="w-3.5 h-3.5" /> Food Items
            </button>
            <button
              onClick={() => setActiveSubTab("food_categories")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                activeSubTab === "food_categories" ? "bg-[#D70F64] border-[#D70F64] text-white" : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <Grid className="w-3.5 h-3.5" /> Categories
            </button>
            <button
              onClick={() => setActiveSubTab("grocery")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                activeSubTab === "grocery" ? "bg-[#D70F64] border-[#D70F64] text-white" : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <ShoppingBasket className="w-3.5 h-3.5" /> Grocery
            </button>
            <button
              onClick={() => { setActiveSubTab("services"); setNewItemType("service"); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                activeSubTab === "services" ? "bg-[#D70F64] border-[#D70F64] text-white" : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <Wrench className="w-3.5 h-3.5" /> Services
            </button>
            <button
              onClick={() => setActiveSubTab("riders")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                activeSubTab === "riders" ? "bg-[#D70F64] border-[#D70F64] text-white" : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <Truck className="w-3.5 h-3.5" /> Riders
            </button>
            <button
              onClick={() => setActiveSubTab("users")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                activeSubTab === "users" ? "bg-[#D70F64] border-[#D70F64] text-white" : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Users ({allUsersList.length})
            </button>

            <button
              onClick={() => setActiveSubTab("banners")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                activeSubTab === "banners" ? "bg-[#D70F64] border-[#D70F64] text-white" : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" /> Banners
            </button>
            <button
              onClick={() => setActiveSubTab("vouchers")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                activeSubTab === "vouchers" ? "bg-[#D70F64] border-[#D70F64] text-white" : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <Ticket className="w-3.5 h-3.5" /> Vouchers ({vouchersList.length})
            </button>
            <button
              onClick={() => setActiveSubTab("loyalty")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                activeSubTab === "loyalty" ? "bg-[#D70F64] border-[#D70F64] text-white" : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <Coins className="w-3.5 h-3.5" /> Coins
            </button>
            <button
              onClick={() => setActiveSubTab("seo")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                activeSubTab === "seo" ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-100 border-slate-200 text-slate-800"
              }`}
            >
              <Settings className="w-3.5 h-3.5" /> System Settings
            </button>
          </div>
        </div>

        {/* Navigation Admin Side Rail (Desktop) */}
        <div className="hidden lg:block lg:col-span-3 space-y-4">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-5 sticky top-20">
            {/* Branding & High Priority Live Operations Callout Card */}
            <div className="bg-gradient-to-br from-slate-900 via-zinc-900 to-slate-950 text-white p-4 rounded-2xl border border-slate-800 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                    Live Operations
                  </span>
                </div>
                <span className="text-[9.5px] font-mono font-bold text-slate-400 uppercase">
                  @{adminUsername}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-2xl font-black text-white tracking-tight flex items-baseline gap-1.5">
                    {totalActiveCount}
                    <span className="text-xs font-extrabold text-pink-400">Active</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium leading-tight">
                    Fulfillment queue
                  </p>
                </div>
                <button
                  onClick={() => setActiveSubTab("orders")}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95 ${
                    activeSubTab === "orders"
                      ? "bg-[#D70F64] text-white ring-2 ring-pink-400/50"
                      : "bg-[#D70F64] hover:bg-[#b80c54] text-white"
                  }`}
                >
                  <ShoppingCart className="w-3.5 h-3.5" /> Jump To
                </button>
              </div>
            </div>

            {/* Grouped Tabs */}
            <div className="space-y-4 pt-1">
              {/* Group 1: High-Priority Operations */}
              <div>
                <span className="text-[9px] font-black text-[#D70F64] block uppercase tracking-widest pl-1 mb-1.5 flex items-center gap-1">
                  ‚ö° Operational Control
                </span>
                <div className="space-y-1">
                  <button
                    onClick={() => setActiveSubTab("orders")}
                    className={`w-full font-extrabold text-xs px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer border ${
                      activeSubTab === "orders"
                        ? "bg-[#D70F64] border-[#D70F64] text-white shadow-md"
                        : "bg-pink-50/60 border-pink-100 text-[#D70F64] hover:bg-pink-100/80"
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4 shrink-0 animate-pulse" />
                    <span>Live Orders Manager</span>
                    {totalActiveCount > 0 && (
                      <span className={`ml-auto font-black px-2 py-0.5 text-[9.5px] rounded-full leading-none shadow-xs ${
                        activeSubTab === "orders" 
                          ? "bg-white text-[#D70F64]" 
                          : "bg-[#D70F64] text-white"
                      }`}>
                        {totalActiveCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveSubTab("analytics")}
                    className={`w-full font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer border ${
                      activeSubTab === "analytics"
                        ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                        : "bg-transparent border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                    Realtime Analytics
                  </button>
                </div>
              </div>

              {/* Group 2: Catalog & Merchants */}
              <div>
                <span className="text-[9px] font-black text-slate-400 block uppercase tracking-widest pl-1 mb-1.5">
                  üçΩÔ∏è Food & Merchants
                </span>
                <div className="space-y-0.5">
                  <button
                    onClick={() => setActiveSubTab("restaurants")}
                    className={`w-full font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer border ${
                      activeSubTab === "restaurants"
                        ? "bg-[#D70F64] border-[#D70F64] text-white shadow-sm"
                        : "bg-transparent border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    Manage Restaurants
                  </button>

                  <button
                    onClick={() => {
                      setActiveSubTab("items");
                      setNewItemType("food");
                    }}
                    className={`w-full font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer border ${
                      activeSubTab === "items"
                        ? "bg-[#D70F64] border-[#D70F64] text-white shadow-sm"
                        : "bg-transparent border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <ListCollapse className="w-3.5 h-3.5 shrink-0" />
                    Manage Food Items
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAiMenuGeneratorOpen(true)}
                    className="w-full font-black text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer border border-pink-200 bg-gradient-to-r from-pink-50 to-purple-50 text-[#D70F64] hover:from-pink-100 hover:to-purple-100 shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#D70F64] animate-pulse" />
                    <span>‚ú® AI Bulk Menu Gen</span>
                  </button>

                  <button
                    onClick={() => setActiveSubTab("food_categories")}
                    className={`w-full font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer border ${
                      activeSubTab === "food_categories"
                        ? "bg-[#D70F64] border-[#D70F64] text-white shadow-sm"
                        : "bg-transparent border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Grid className="w-3.5 h-3.5 shrink-0" />
                    Food Categories
                  </button>

                  <button
                    onClick={() => setActiveSubTab("grocery")}
                    className={`w-full font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer border ${
                      activeSubTab === "grocery"
                        ? "bg-[#D70F64] border-[#D70F64] text-white shadow-sm"
                        : "bg-transparent border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <ShoppingBasket className="w-3.5 h-3.5 shrink-0" />
                    Grocery Store
                  </button>

                  <button
                    onClick={() => {
                      setActiveSubTab("services");
                      setNewItemType("service");
                    }}
                    className={`w-full font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer border ${
                      activeSubTab === "services"
                        ? "bg-[#D70F64] border-[#D70F64] text-white shadow-sm"
                        : "bg-transparent border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5 shrink-0" />
                    Home Services
                  </button>
                </div>
              </div>

              {/* Group 3: Users & Logistics */}
              <div>
                <span className="text-[9px] font-black text-slate-400 block uppercase tracking-widest pl-1 mb-1.5">
                  üöö People & Logistics
                </span>
                <div className="space-y-0.5">
                  <button
                    onClick={() => setActiveSubTab("riders")}
                    className={`w-full font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer border ${
                      activeSubTab === "riders"
                        ? "bg-[#D70F64] border-[#D70F64] text-white shadow-sm"
                        : "bg-transparent border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5 shrink-0" />
                    Riders Directory
                  </button>

                  <button
                    onClick={() => setActiveSubTab("users")}
                    className={`w-full font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer border ${
                      activeSubTab === "users"
                        ? "bg-[#D70F64] border-[#D70F64] text-white shadow-sm"
                        : "bg-transparent border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    Users Directory
                    <span className={`ml-auto font-bold px-1.5 py-0.5 text-[9px] rounded-full leading-none ${
                      activeSubTab === "users" 
                        ? "bg-white text-[#D70F64]" 
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      {allUsersList.length}
                    </span>
                  </button>


                </div>
              </div>

              {/* Group 4: Global Settings & Marketing */}
              <div>
                <span className="text-[9px] font-black text-slate-400 block uppercase tracking-widest pl-1 mb-1.5">
                  ‚öôÔ∏è System & Marketing
                </span>
                <div className="space-y-0.5">
                  <button
                    onClick={() => setActiveSubTab("banners")}
                    className={`w-full font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer border ${
                      activeSubTab === "banners"
                        ? "bg-[#D70F64] border-[#D70F64] text-white shadow-sm"
                        : "bg-transparent border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                    Promotional Banners
                  </button>

                  <button
                    onClick={() => setActiveSubTab("vouchers")}
                    className={`w-full font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer border ${
                      activeSubTab === "vouchers"
                        ? "bg-[#D70F64] border-[#D70F64] text-white shadow-sm"
                        : "bg-transparent border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Ticket className="w-3.5 h-3.5 shrink-0" />
                    <span>Vouchers & Discounts</span>
                    {vouchersList.length > 0 && (
                      <span className={`ml-auto text-[10px] font-black px-1.5 py-0.2 rounded-md ${
                        activeSubTab === "vouchers" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                      }`}>
                        {vouchersList.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveSubTab("loyalty")}
                    className={`w-full font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer border ${
                      activeSubTab === "loyalty"
                        ? "bg-[#D70F64] border-[#D70F64] text-white shadow-sm"
                        : "bg-transparent border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5 shrink-0" />
                    Coins Loyalty Wallet
                  </button>

                  {/* Distinct styling for Global System Settings */}
                  <button
                    onClick={() => setActiveSubTab("seo")}
                    className={`w-full font-black text-xs px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer border mt-1 ${
                      activeSubTab === "seo"
                        ? "bg-slate-900 border-slate-900 text-white shadow-md ring-1 ring-slate-700"
                        : "bg-slate-100/80 border-slate-200 text-slate-800 hover:bg-slate-200"
                    }`}
                  >
                    <Settings className="w-4 h-4 shrink-0 text-slate-500" />
                    <span>Global System & Settings</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Stats overview panel */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <span className="text-[9px] font-black text-slate-400 block uppercase tracking-widest pl-1">
                Financial Coordinates
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50/50 border border-slate-100 p-2.5 rounded-xl transition-all">
                  <span className="text-slate-400 block text-[8.5px] font-bold uppercase tracking-wider">
                    Gross Rev
                  </span>
                  <span className="text-[12.5px] font-black text-[#D70F64] mt-0.5 block leading-tight">
                    Rs. {totalRevenue}
                  </span>
                </div>
                <div className="bg-slate-50/50 border border-slate-100 p-2.5 rounded-xl transition-all">
                  <span className="text-slate-400 block text-[8.5px] font-bold uppercase tracking-wider">
                    Comm
                  </span>
                  <span className="text-[12.5px] font-black text-emerald-600 mt-0.5 block leading-tight">
                    Rs. {totalCommissionSum}
                  </span>
                </div>
                <div className="bg-slate-50/50 border border-slate-100 p-2.5 rounded-xl transition-all">
                  <span className="text-slate-400 block text-[8.5px] font-bold uppercase tracking-wider">
                    Completed
                  </span>
                  <span className="text-[12.5px] font-black text-slate-800 mt-0.5 block leading-tight">
                    {totalCompletedCount}
                  </span>
                </div>
                <div className="bg-slate-50/50 border border-slate-100 p-2.5 rounded-xl transition-all">
                  <span className="text-slate-400 block text-[8.5px] font-bold uppercase tracking-wider">
                    Active
                  </span>
                  <span className="text-[12.5px] font-black text-[#D70F64] mt-0.5 block leading-tight">
                    {totalActiveCount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Panels Area */}
        <div className="col-span-1 lg:col-span-9 space-y-8">
          {/* TAB 1: Real-time Analytics Dashboard */}
          {activeSubTab === "analytics" && (
            <div className="space-y-8 animate-fade-in">
              {/* Sales Summary last 7 days of order volume and total revenue */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D70F64]/20 to-transparent" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h4 className="font-black text-sm text-slate-900 flex items-center gap-2 tracking-wide uppercase">
                      <TrendingUp className="w-4 h-4 text-[#D70F64]" />
                      Sales Summary (Last 7 Days)
                    </h4>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mt-0.5">
                      Completed orders volume & total gross revenue mapped daily
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-[11px] font-bold">
                    <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 text-[#D70F64] px-2.5 py-1 rounded-lg">
                      <span className="w-2 h-2 rounded-full bg-[#D70F64]"></span>
                      Revenue (Left Axis)
                    </div>
                    <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-600 px-2.5 py-1 rounded-lg">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Order Volume (Right Axis)
                    </div>
                  </div>
                </div>
                
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getSalesSummaryForRange()} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e2e8f0"
                        opacity={0.3}
                      />
                      <XAxis
                        dataKey="date"
                        stroke="#64748b"
                        fontSize={10}
                        fontWeight="bold"
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="left"
                        orientation="left"
                        stroke="#D70F64"
                        fontSize={10}
                        fontWeight="bold"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `Rs.${v}`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#10b981"
                        fontSize={10}
                        fontWeight="bold"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v} ord`}
                      />
                      <Tooltip
                        cursor={{ fill: '#f8fafc', opacity: 0.5 }}
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "14px",
                          fontSize: "11px",
                          color: "#0f172a",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                        }}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Bar
                        yAxisId="left"
                        dataKey="revenue"
                        fill="#D70F64"
                        name="Total Revenue (Rs.)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={45}
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="volume"
                        fill="#10b981"
                        name="Order Volume"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={45}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

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
                      üí° Stored coordinates: settings/delivery_config with
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
                              {dish.category} ‚Ä¢ Rs. {dish.price}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block leading-relaxed">
                    üí° Active Deal of the Hour items will dynamically show the
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
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#D70F64]" />
                            Restaurant Location on Map
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowRestManualCoords(!showRestManualCoords)}
                            className="text-[9.5px] font-bold text-[#D70F64] hover:underline cursor-pointer"
                          >
                            {showRestManualCoords ? "Hide Manual Inputs" : "‚úçÔ∏è Manual Fill (Lat / Lng)"}
                          </button>
                        </div>
                        <div className="p-3 bg-slate-100 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl shrink-0 ${restLat && restLng ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-slate-200 text-slate-500"}`}>
                              <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="block text-xs font-black text-slate-900">
                                {restLat && restLng ? "üìç Pinpoint Location Set" : "No Location Set"}
                              </span>
                              <span className="block text-[10.5px] text-slate-500 font-semibold font-mono mt-0.5">
                                {restLat && restLng ? `${restLat}, ${restLng}` : "Click map button to choose exact restaurant location"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {restLat && restLng && (
                              <button
                                type="button"
                                onClick={() => { setRestLat(""); setRestLng(""); }}
                                className="px-2.5 py-2 rounded-xl border border-slate-200 text-[10px] font-extrabold text-slate-500 hover:text-rose-600 hover:bg-white transition cursor-pointer"
                              >
                                Clear
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setIsRestaurantMapPickerOpen(true)}
                              className="px-4 py-2 rounded-xl bg-[#D70F64] hover:bg-[#b00c50] text-white text-xs font-black shadow-md shadow-pink-500/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{restLat && restLng ? "Change on Map" : "Set Location on Map"}</span>
                            </button>
                          </div>
                        </div>

                        {showRestManualCoords && (
                          <div className="grid grid-cols-2 gap-2.5 mt-2.5 p-3 bg-slate-100/90 border border-slate-200 rounded-2xl animate-fadeIn">
                            <div>
                              <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                                Latitude (e.g. 26.7323)
                              </label>
                              <input
                                type="text"
                                placeholder="26.7323"
                                value={restLat}
                                onChange={(e) => setRestLat(e.target.value)}
                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-[#D70F64] transition"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                                Longitude (e.g. 67.7744)
                              </label>
                              <input
                                type="text"
                                placeholder="67.7744"
                                value={restLng}
                                onChange={(e) => setRestLng(e.target.value)}
                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-[#D70F64] transition"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Restaurant Commission Configuration (Admin Only) */}
                      <div className="bg-purple-500/5 p-4 rounded-2xl border border-purple-500/15 space-y-3.5 mt-2">
                        <div className="flex items-center justify-between">
                          <div className="text-left">
                            <h5 className="font-extrabold text-xs text-slate-900 uppercase tracking-wide">
                              Restaurant Commission (Admin Share)
                            </h5>
                            <p className="text-[9.5px] text-slate-500 font-semibold leading-normal mt-0.5">
                              Chaye commission rakhna hai ya nahi? Ye customer ki price nahi barhayega, balkay malik se settlement ke waqt deduct hoga.
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer group shrink-0">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={restCommissionEnabled}
                              onChange={(e) =>
                                setRestCommissionEnabled(e.target.checked)
                              }
                            />
                            <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-500/40 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-700 after:border-slate-700 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
                          </label>
                        </div>

                        {restCommissionEnabled && (
                          <div className="grid grid-cols-2 gap-3 pt-1 text-left">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                Commission Type
                              </label>
                              <select
                                value={restCommissionType}
                                onChange={(e) => setRestCommissionType(e.target.value as "percentage" | "fixed")}
                                className="w-full p-2.5 bg-white border border-slate-250 rounded-xl text-xs text-slate-900 outline-none focus:border-purple-500/60 transition appearance-none cursor-pointer"
                              >
                                <option value="percentage">Percentage (%)</option>
                                <option value="fixed">Fixed Amount (Rs.)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                {restCommissionType === "percentage" ? "Commission % Rate" : "Commission Flat (Rs.)"}
                              </label>
                              <input
                                type="number"
                                value={restCommissionValue}
                                onChange={(e) => setRestCommissionValue(e.target.value)}
                                placeholder={restCommissionType === "percentage" ? "e.g. 10" : "e.g. 50"}
                                className="w-full p-2.5 bg-white border border-slate-250 rounded-xl text-xs text-slate-900 outline-none focus:border-purple-500/60 transition"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="pt-2">
                        <ProductImageSelector
                          imageUrl={restImageUrl}
                          onChange={setRestImageUrl}
                          label="Restaurant Icon / Logo (Avatar Image)"
                          accentColorClass="purple"
                          placeholder="Paste icon/logo image URL (https://...)"
                          uploadPath={`restaurants/${selectedScheduleRestaurant}/icon`}
                        />
                      </div>
                      <div className="pt-2">
                        <ProductImageSelector
                          imageUrl={restBgImageUrl}
                          onChange={setRestBgImageUrl}
                          label="Restaurant Poster / Banner (Cover Image)"
                          accentColorClass="purple"
                          placeholder="Paste poster/banner image URL (https://...)"
                          uploadPath={`restaurants/${selectedScheduleRestaurant}/poster`}
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
                        className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center justify-between group hover:border-purple-500/30 transition-colors animate-fade-in"
                      >
                        <span className="text-xs font-bold text-slate-800 line-clamp-1 pr-2">
                          {restName}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              setSelectedRestLedgerName(restName);
                              setRestStatsTimeframe("all");
                              setShowRestSettledHistory(false);
                            }}
                            className="h-7 px-2.5 flex items-center justify-center gap-1 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all font-black text-[9.5px] uppercase tracking-wider cursor-pointer shadow-sm"
                            title={`View Report Ledger for ${restName}`}
                          >
                            <ClipboardList className="w-3.5 h-3.5" />
                            Ledger
                          </button>
                          <button
                            onClick={() => handleDeleteRestaurant(restName)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 text-pink-400 hover:bg-red-500 hover:text-slate-900 transition-colors shrink-0 cursor-pointer"
                            title={`Delete ${restName}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
              <div className="flex items-center justify-between bg-white/80  border border-slate-200 p-4 rounded-2xl shadow-xl">
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
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAiMenuGeneratorOpen(true)}
                    className="bg-gradient-to-r from-[#D70F64] via-pink-600 to-purple-600 hover:from-[#b00c50] hover:to-purple-700 text-white px-4 py-2 rounded-xl text-[10px] uppercase font-black tracking-wider transition-all shadow-md shadow-pink-600/30 hover:scale-[1.02] flex items-center gap-2 cursor-pointer border border-white/20"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                    ‚ú® AI Menu &amp; Photo Generator
                  </button>
                  <button
                    onClick={async () => {
                        const btn = document.getElementById("clear-menu-btn");
                        if (btn && btn.getAttribute("data-confirm") !== "true") {
                           btn.setAttribute("data-confirm", "true");
                           btn.innerText = "üî• ARE YOU SURE? CLICK AGAIN!";
                           setTimeout(() => {
                               if (btn) {
                                   btn.removeAttribute("data-confirm");
                                   btn.innerText = "üî• CLEAR ENTIRE MENU";
                               }
                           }, 3000);
                           return;
                        }
                        
                        if (btn) {
                            btn.innerText = "‚è≥ DELETING...";
                        }
                        try {
                          const menuRef = collection(db, "menu");
                          const snapshot = await getDocs(menuRef);
                          const deletePromises = snapshot.docs.map(document => deleteDoc(doc(db, "menu", document.id)));
                          await Promise.all(deletePromises);
                          console.log("Menu database has been completely wiped.");
                          if (btn) {
                              btn.innerText = "‚úÖ CLEARED";
                              setTimeout(() => {
                                  if (btn) {
                                      btn.removeAttribute("data-confirm");
                                      btn.innerText = "üî• CLEAR ENTIRE MENU";
                                  }
                              }, 2000);
                          }
                        } catch (err) {
                          console.error(err);
                          console.log("Failed to delete menu. Check permissions.");
                          if (btn) {
                              btn.removeAttribute("data-confirm");
                              btn.innerText = "‚ùå FAILED (CHECK CONSOLE)";
                              setTimeout(() => {
                                 if (btn) btn.innerText = "üî• CLEAR ENTIRE MENU";
                              }, 2000);
                          }
                        }
                    }}
                    id="clear-menu-btn"
                    className="bg-pink-950/40 hover:bg-pink-900/60 text-red-500 px-4 py-2 rounded-xl text-[10px] uppercase font-black tracking-wider transition-colors border border-pink-900/50 hover:border-red-500/50 flex items-center gap-2"
                  >
                    üî• CLEAR ENTIRE MENU
                  </button>
                  <button
                    onClick={handleImportTastyBites}
                    disabled={isImportingTasty}
                    className="bg-[#D70F64] hover:bg-[#b00c50] disabled:opacity-50 text-neutral-950 px-4 py-2 rounded-xl text-[10px] uppercase font-black tracking-wider transition-colors border border-[#f22a7f] flex items-center gap-2"
                  >
                    {isImportingTasty ? `‚è≥ IMPORTING (${importProgressTasty}%)` : `üì• IMPORT TASTY BITES`}
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
                  <div className="space-y-1.5">
                    <label className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">
                      Open Time
                    </label>
                    <input
                      type="time"
                      value={newItemOpeningTime}
                      onChange={(e) => setNewItemOpeningTime(e.target.value)}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-900 outline-none text-slate-900 focus:border-[#D70F64] transition"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">
                      Close Time
                    </label>
                    <input
                      type="time"
                      value={newItemClosingTime}
                      onChange={(e) => setNewItemClosingTime(e.target.value)}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-900 outline-none text-slate-900 focus:border-[#D70F64] transition"
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

                  <div className="md:col-span-4 space-y-1.5 flex items-center pt-2">
                    <label className="flex items-center gap-2 cursor-pointer bg-amber-500/10 border border-amber-500/30 px-3.5 py-3 rounded-xl text-amber-700 font-extrabold text-xs transition hover:bg-amber-500/20 w-full">
                      <input
                        type="checkbox"
                        checked={newItemIsBestseller}
                        onChange={(e) => setNewItemIsBestseller(e.target.checked)}
                        className="w-4 h-4 accent-[#D70F64] rounded cursor-pointer"
                      />
                      <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
                      <span>Mark as Bestseller Option üî•</span>
                    </label>
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
              <div className="bg-white/80  border border-slate-200 rounded-[24px] overflow-hidden shadow-sm relative">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D70F64]/10 to-transparent" />
                <div className="p-5 border-b border-slate-200/50 bg-slate-100/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-black text-sm text-slate-900 uppercase tracking-wide">
                      Operational Catalog Directory
                    </h4>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      Enable availability controls and edit prices instantly
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 whitespace-nowrap">Filter by Restaurant:</span>
                    <select
                      value={newItemRestaurantName}
                      onChange={(e) => setNewItemRestaurantName(e.target.value)}
                      className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#D70F64] min-w-[200px]"
                    >
                      <option value="">All Restaurants / Vendors</option>
                      {uniqueRestaurants.map((rest) => (
                        <option key={rest} value={rest}>{rest}</option>
                      ))}
                    </select>
                  </div>
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
                        <th className="p-4.5 text-center">Bestseller</th>
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
                                    üè™ Shop:{" "}
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
                                        ‚è±Ô∏è Duration:{" "}
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
                                      className="flex-1 p-1 bg-slate-50 border border-[#D70F64] text-slate-900 rounded text-xs leading-none"
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
                                      className="w-20 p-1 bg-slate-50 border border-[#D70F64] text-slate-900 rounded text-xs leading-none"
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
                                      className="w-20 p-1 bg-slate-50 border border-[#D70F64] text-slate-900 rounded text-xs leading-none"
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
                                      className="w-20 p-1 bg-slate-50 border border-emerald-500 text-slate-900 rounded text-xs leading-none"
                                      placeholder="Commission"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[8px] text-slate-500 uppercase font-bold w-12">
                                      Open:
                                    </span>
                                    <input
                                      type="time"
                                      value={editingOpeningTime}
                                      onChange={(e) =>
                                        setEditingOpeningTime(e.target.value)
                                      }
                                      className="w-20 p-1 bg-slate-50 border border-[#D70F64] text-slate-900 rounded text-xs leading-none"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[8px] text-slate-500 uppercase font-bold w-12">
                                      Close:
                                    </span>
                                    <input
                                      type="time"
                                      value={editingClosingTime}
                                      onChange={(e) =>
                                        setEditingClosingTime(e.target.value)
                                      }
                                      className="w-20 p-1 bg-slate-50 border border-[#D70F64] text-slate-900 rounded text-xs leading-none"
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
                                                className="flex-1 p-1 bg-slate-50 border border-slate-300 text-slate-900 rounded text-[10px]"
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
                                                className="w-16 p-1 bg-slate-50 border border-slate-300 text-slate-900 rounded text-[10px]"
                                              />
                                              <button
                                                onClick={() => {
                                                  const n = [...editingSizes];
                                                  n.splice(idx, 1);
                                                  setEditingSizes(n);
                                                }}
                                                className="text-red-500 text-[10px] px-1 bg-red-500/10 rounded ml-1"
                                              >
                                                ‚úï
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
                                                className="w-16 p-1 bg-slate-50 border border-slate-300 text-slate-900 rounded text-[10px]"
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
                                                className="w-14 p-1 bg-slate-50 border border-slate-300 text-slate-900 rounded text-[10px]"
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
                                                className="w-12 p-1 bg-slate-50 border border-slate-300 text-slate-900 rounded text-[10px]"
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
                                                ‚úï
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
                                                className="flex-1 p-1 bg-slate-50 border border-slate-300 text-slate-900 rounded text-[10px]"
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
                                                className="w-16 p-1 bg-slate-50 border border-slate-300 text-slate-900 rounded text-[10px]"
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
                                                className="w-16 p-1 bg-slate-50 border border-slate-300 text-slate-900 rounded text-[10px]"
                                              />
                                              <button
                                                onClick={() => {
                                                  const n = [...editingAddOns];
                                                  n.splice(idx, 1);
                                                  setEditingAddOns(n);
                                                }}
                                                className="text-red-500 text-[10px] px-1 bg-red-500/10 rounded ml-1"
                                              >
                                                ‚úï
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
                                  <label className="flex items-center gap-1.5 cursor-pointer bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg text-amber-700 font-extrabold text-[10px] my-1">
                                    <input
                                      type="checkbox"
                                      checked={editingIsBestseller}
                                      onChange={(e) => setEditingIsBestseller(e.target.checked)}
                                      className="w-3.5 h-3.5 accent-[#D70F64] rounded cursor-pointer"
                                    />
                                    <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                    <span>Bestseller üî•</span>
                                  </label>
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
                                  {(dish.openingTime || dish.closingTime) && (
                                    <span className="text-[10px] text-[#D70F64] font-bold block mt-0.5">
                                      Time: {dish.openingTime || "Open"} - {dish.closingTime || "Close"}
                                    </span>
                                  )}
                                  <span className="hidden">
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
                                      setEditingOpeningTime(dish.openingTime || "");
                                      setEditingClosingTime(dish.closingTime || "");
                                      setEditingIsBestseller(dish.isBestseller || false);
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
                                onClick={() => handleToggleBestseller(dish)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-black text-[10px] uppercase tracking-wider transition cursor-pointer ${
                                  dish.isBestseller
                                    ? "bg-amber-100 text-amber-700 border border-amber-300 shadow-xs"
                                    : "bg-slate-100 text-slate-400 hover:text-slate-600 border border-slate-200"
                                }`}
                                title="Toggle Bestseller Badge"
                              >
                                <Flame className={`w-3.5 h-3.5 ${dish.isBestseller ? "fill-amber-500 text-amber-500" : ""}`} />
                                <span>{dish.isBestseller ? "Bestseller" : "Normal"}</span>
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
              <div className="flex items-center justify-between bg-white/80  border border-slate-200 p-4 rounded-2xl shadow-xl">
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
                  <div className="space-y-1.5">
                    <label className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">
                      Open Time
                    </label>
                    <input
                      type="time"
                      value={newItemOpeningTime}
                      onChange={(e) => setNewItemOpeningTime(e.target.value)}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-900 outline-none text-slate-900 focus:border-blue-500 transition"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">
                      Close Time
                    </label>
                    <input
                      type="time"
                      value={newItemClosingTime}
                      onChange={(e) => setNewItemClosingTime(e.target.value)}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-900 outline-none text-slate-900 focus:border-blue-500 transition"
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
              <div className="bg-white/80  border border-slate-200 rounded-[24px] overflow-hidden shadow-sm relative">
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
                                    üè™ Provider:{" "}
                                    <span className="text-blue-500 font-bold">
                                      {dish.restaurantName ||
                                        "Dadu Home Services"}
                                    </span>
                                  </div>
                                  {dish.serviceDuration && (
                                    <div className="text-[10px] text-slate-500 font-medium font-sans mt-0.5">
                                      ‚è±Ô∏è Duration:{" "}
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
                                    <input
                                      type="time"
                                      value={editingOpeningTime}
                                      onChange={(e) =>
                                        setEditingOpeningTime(e.target.value)
                                      }
                                      className="w-full p-2 bg-white border border-slate-200 text-slate-900 text-[10px] border border-slate-300 focus:border-blue-500 outline-none rounded"
                                    />
                                    <input
                                      type="time"
                                      value={editingClosingTime}
                                      onChange={(e) =>
                                        setEditingClosingTime(e.target.value)
                                      }
                                      className="w-full p-2 bg-white border border-slate-200 text-slate-900 text-[10px] border border-slate-300 focus:border-blue-500 outline-none rounded"
                                    />
                                  </div>
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
                                  {(dish.openingTime || dish.closingTime) && (
                                    <span className="text-[10px] text-[#D70F64] font-bold block mt-0.5">
                                      Time: {dish.openingTime || "Open"} - {dish.closingTime || "Close"}
                                    </span>
                                  )}
                                  <span className="hidden">
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
                                      setEditingOpeningTime(dish.openingTime || "");
                                      setEditingClosingTime(dish.closingTime || "");
                                      setEditingIsBestseller(dish.isBestseller || false);
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
              <div className="bg-white/80  border border-slate-200 rounded-[24px] overflow-hidden shadow-sm relative">
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
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleExportCSV}
                        className="px-4 py-2 bg-emerald-950/40 hover:bg-emerald-900/30 text-emerald-400 border border-emerald-900/45 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition shrink-0"
                      >
                        Export CSV üìä
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAllOrderHistory}
                        className="px-4 py-2 bg-pink-950/40 hover:bg-pink-900/30 text-pink-400 border border-pink-900/45 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition shrink-0"
                      >
                        Clear Sales History üßπ
                      </button>
                    </div>
                  )}
                </div>

                {/* Universal Order Search Bar */}
                <div className="bg-white border-b border-slate-200 p-3 sm:p-4">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                    <input
                      type="text"
                      value={orderSearchQuery}
                      onChange={(e) => setOrderSearchQuery(e.target.value)}
                      placeholder="üîç Search Order by ID (#DF-...), Phone, Customer Name, Rider, Status, Price, Dish, Voucher..."
                      className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D70F64] focus:bg-white transition"
                    />
                    {orderSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setOrderSearchQuery("")}
                        className="absolute right-3 px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
                      >
                        Clear ‚úï
                      </button>
                    )}
                  </div>

                  {orderSearchQuery.trim() && (
                    <div className="mt-2.5 flex items-center justify-between text-xs font-bold text-slate-600 px-1">
                      <span className="flex items-center gap-1.5">
                        <span className="text-[#D70F64] font-black">Search Active:</span>
                        <span>Showing results matching "{orderSearchQuery}" across all order pipelines</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setOrderSearchQuery("")}
                        className="text-[#D70F64] hover:underline font-black text-xs cursor-pointer"
                      >
                        Reset Search
                      </button>
                    </div>
                  )}
                </div>

                {/* Modern Filter Sub-Tabs for Orders */}
                <div className="bg-slate-50 border-b border-slate-200 p-3 flex flex-wrap gap-2 items-center justify-between">
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setAdminOrderFilterTab("new")}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer relative ${
                        adminOrderFilterTab === "new"
                          ? "bg-[#D70F64] text-white shadow-md shadow-[#D70F64]/20 scale-[1.02]"
                          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span>üÜï New Orders</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                        adminOrderFilterTab === "new" ? "bg-white text-[#D70F64]" : "bg-slate-100 text-slate-600"
                      }`}>
                        {orders.filter(o => o.status !== "delivered" && o.status !== "completed" && o.status !== "cancelled").length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAdminOrderFilterTab("delivered")}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer relative ${
                        adminOrderFilterTab === "delivered"
                          ? "bg-[#D70F64] text-white shadow-md shadow-[#D70F64]/20 scale-[1.02]"
                          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span>‚úÖ Delivered Orders</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                        adminOrderFilterTab === "delivered" ? "bg-white text-[#D70F64]" : "bg-slate-100 text-slate-600"
                      }`}>
                        {orders.filter(o => o.status === "delivered" || o.status === "completed").length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAdminOrderFilterTab("cancelled")}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer relative ${
                        adminOrderFilterTab === "cancelled"
                          ? "bg-[#D70F64] text-white shadow-md shadow-[#D70F64]/20 scale-[1.02]"
                          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span>‚ùå Cancelled Orders</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                        adminOrderFilterTab === "cancelled" ? "bg-white text-[#D70F64]" : "bg-slate-100 text-slate-600"
                      }`}>
                        {orders.filter(o => o.status === "cancelled").length}
                      </span>
                    </button>
                  </div>

                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest hidden md:inline-block pr-2">
                    Viewing {adminOrderFilterTab} pipeline ‚Ä¢ {orders.length} total
                  </span>
                </div>

                {/* Date Filter Bar for Operational & History Orders */}
                <div className="bg-slate-100/90 border-b border-slate-200 p-3 flex flex-wrap gap-3 items-center justify-between">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-500 mr-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#D70F64]" /> Date Filter:
                    </span>
                    <button
                      type="button"
                      onClick={() => setOrderDateRange("all")}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        orderDateRange === "all"
                          ? "bg-[#D70F64] text-white shadow-xs"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      All Time
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderDateRange("1day")}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        orderDateRange === "1day"
                          ? "bg-[#D70F64] text-white shadow-xs"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      1 Day (Today)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderDateRange("7days")}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        orderDateRange === "7days"
                          ? "bg-[#D70F64] text-white shadow-xs"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      7 Days (1 Wk)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderDateRange("30days")}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        orderDateRange === "30days"
                          ? "bg-[#D70F64] text-white shadow-xs"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      30 Days (1 Mo)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderDateRange("custom")}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                        orderDateRange === "custom"
                          ? "bg-[#D70F64] text-white shadow-xs"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span>Manual</span>
                      <Calendar className="w-3 h-3" />
                    </button>

                    {orderDateRange === "custom" && (
                      <div className="flex items-center gap-1.5 ml-2 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
                        <input
                          type="date"
                          value={orderCustomStartDate}
                          onChange={(e) => setOrderCustomStartDate(e.target.value)}
                          className="px-2 py-1 text-xs font-bold border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#D70F64]"
                        />
                        <span className="text-[10px] text-slate-400 font-bold">to</span>
                        <input
                          type="date"
                          value={orderCustomEndDate}
                          onChange={(e) => setOrderCustomEndDate(e.target.value)}
                          className="px-2 py-1 text-xs font-bold border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#D70F64]"
                        />
                      </div>
                    )}
                  </div>

                  {/* Filtered Sales Revenue Summary Badge */}
                  {(() => {
                    const deliveredInFilter = orders.filter((o) => {
                      const isDelivered = o.status === "delivered" || o.status === "completed";
                      return isDelivered && checkOrderInDateRange(o, orderDateRange, orderCustomStartDate, orderCustomEndDate);
                    });
                    const totalSales = deliveredInFilter.reduce((acc, o) => acc + (o.grandTotal || 0), 0);

                    return (
                      <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-emerald-800 text-xs font-black">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Filtered Revenue:</span>
                          <span className="text-emerald-700 font-extrabold">Rs. {Math.round(totalSales).toLocaleString()}</span>
                        </div>
                        <span className="text-emerald-300">|</span>
                        <div className="flex items-center gap-1">
                          <span>Delivered:</span>
                          <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-md text-[10px] font-black">
                            {deliveredInFilter.length}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="divide-y divide-slate-200/30">
                  {orders.length === 0 ? (
                    <div className="p-16 text-center text-xs text-slate-500 font-bold uppercase tracking-wider">
                      Logs directory is blank. Waiting for live user
                      transactions...
                    </div>
                  ) : (() => {
                    const filtered = orders.filter((order) => {
                      if (orderSearchQuery.trim()) {
                        return searchMatchesOrder(order, orderSearchQuery);
                      }

                      const isDelivered = order.status === "delivered" || order.status === "completed";
                      const isCancelled = order.status === "cancelled";
                      if (adminOrderFilterTab === "new" && (isDelivered || isCancelled)) return false;
                      if (adminOrderFilterTab === "delivered" && !isDelivered) return false;
                      if (adminOrderFilterTab === "cancelled" && !isCancelled) return false;

                      return checkOrderInDateRange(order, orderDateRange, orderCustomStartDate, orderCustomEndDate);
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="p-16 text-center text-xs text-slate-400 font-bold uppercase tracking-wider">
                          No {adminOrderFilterTab} orders found in this pipeline.
                        </div>
                      );
                    }

                    return filtered.map((order) => {
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
                                <button
                                  type="button"
                                  onClick={() => setInspectedOrder(order)}
                                  className="font-mono text-xs font-black text-[#D70F64] hover:text-white uppercase bg-pink-500/10 hover:bg-[#D70F64] border border-pink-500/25 py-1.5 px-3 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                                  title="Click to Inspect Order Data"
                                >
                                  <span>{getDisplayOrderId(order)}</span>
                                  <span className="text-[10px] bg-white/30 px-1 rounded">üîç Inspect</span>
                                </button>
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
                                    üìû Call
                                  </a>
                                  <a
                                    href={`https://wa.me/${order.userPhone.replace(/\D/g, '')}?text=Hello ${order.userName}, we are contacting you regarding your Dadu Food order.`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center p-1.5 bg-green-500/20 text-green-600 hover:bg-green-600 hover:text-white rounded-md transition-colors border border-green-500/30"
                                    title="WhatsApp Customer"
                                  >
                                    üí¨ WhatsApp
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
                              <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 dark:text-slate-500 block mb-1">
                                Current Status
                              </span>
                              {(() => {
                                const isCompleted = order.status === "delivered" || order.status === "completed";
                                const isCancelled = order.status === "cancelled";
                                
                                let badgeStyles = "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40";
                                let dotStyles = "bg-blue-500";
                                
                                if (isCompleted) {
                                  badgeStyles = "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40";
                                  dotStyles = "bg-emerald-500";
                                } else if (isCancelled) {
                                  badgeStyles = "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40";
                                  dotStyles = "bg-rose-500";
                                }

                                return (
                                  <span className={`text-[11px] font-black uppercase inline-flex items-center gap-1.5 py-1 px-3 rounded-full shadow-sm transition-all ${badgeStyles}`}>
                                    <span className="relative flex h-2 w-2">
                                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotStyles}`}></span>
                                      <span className={`relative inline-flex rounded-full h-2 w-2 ${dotStyles}`}></span>
                                    </span>
                                    {order.status}
                                  </span>
                                );
                              })()}
                              <div className="mt-2 flex items-center justify-end gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => setInspectedOrder(order)}
                                  className="inline-flex items-center justify-center gap-1 p-1.5 px-3 text-[10px] bg-[#D70F64] hover:bg-[#b00c50] text-white rounded-lg transition-colors font-black border border-[#D70F64] shadow-xs cursor-pointer"
                                >
                                  üîç View All Data
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePrintReceipt(order)}
                                  className="inline-flex items-center justify-center p-1.5 text-[10px] bg-slate-200/50 text-slate-700 hover:bg-slate-300 rounded-md transition-colors font-bold border border-slate-300 cursor-pointer"
                                >
                                  üñ®Ô∏è Receipt
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Cancellation Banner if Cancelled */}
                          {order.status === "cancelled" && (
                            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs">
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                <div className="font-black text-rose-700 uppercase tracking-wide">
                                  Cancellation Record
                                </div>
                                <div className="font-bold text-rose-900">
                                  Reason: {order.cancelledReason || order.cancelledNotes || "Cancelled by User/Admin"}
                                </div>
                                {order.cancelledBy && (
                                  <div className="text-[11px] text-rose-600 font-medium">
                                    Cancelled by: <span className="font-bold">{order.cancelledBy}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Financial & Discount Quick Pill Badges */}
                          {((order.voucher?.discountAmount || 0) > 0 || (order.coinsUsed || 0) > 0) && (
                            <div className="flex flex-wrap gap-2 text-xs font-bold">
                              {(order.voucher?.discountAmount || 0) > 0 && (
                                <span className="bg-rose-500/10 text-rose-700 border border-rose-500/25 px-2.5 py-1 rounded-xl flex items-center gap-1">
                                  üéüÔ∏è Voucher Discount: <span className="font-mono font-black">-Rs. {order.voucher?.discountAmount}</span> ({order.voucher?.code})
                                </span>
                              )}
                              {(order.coinsUsed || 0) > 0 && (
                                <span className="bg-amber-500/10 text-amber-800 border border-amber-500/25 px-2.5 py-1 rounded-xl flex items-center gap-1">
                                  ü™ô Coins Discount: <span className="font-mono font-black">-Rs. {order.coinsUsed}</span> ({order.coinsUsed} coins)
                                </span>
                              )}
                              {order.riderName && (
                                <span className="bg-blue-500/10 text-blue-800 border border-blue-500/25 px-2.5 py-1 rounded-xl flex items-center gap-1">
                                  üõµ Rider Payout: <span className="font-mono font-black">Rs. {(order.deliveryFee || 0) + (order.voucher?.discountAmount || 0) + (order.coinsUsed || 0)}</span> (Fee + Platform Subsidy)
                                </span>
                              )}
                            </div>
                          )}

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
                                    <div className="flex flex-col">
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
                                      {(item.selectedSize || item.selectedFlavor || (item.selectedAddOns && item.selectedAddOns.length > 0) || item.specialInstructions) && (
                                        <div className="text-[10px] text-gray-500 font-medium mt-0.5 space-y-0.5">
                                          {item.selectedSize && <div>Size: {item.selectedSize}</div>}
                                          {item.selectedFlavor && <div>Flavor: {item.selectedFlavor}</div>}
                                          {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                                            <div>
                                              Add-ons: {Object.entries(item.selectedAddOns.reduce((acc, curr) => {
                                                acc[curr.name] = (acc[curr.name] || 0) + 1;
                                                return acc;
                                              }, {} as Record<string, number>)).map(([name, count]) => `${Number(count) * (item.quantity || 1)}x ${name}`).join(', ')}
                                            </div>
                                          )}
                                          {item.specialInstructions && <div className="italic">Note: {item.specialInstructions}</div>}
                                        </div>
                                      )}
                                    </div>
                                    <span className="font-extrabold text-slate-600">
                                      Rs. {item.price * item.quantity}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-200/60 leading-normal font-bold uppercase tracking-wider">
                                {isSvc ? (
                                  <span className="text-[#D70F64]/80">
                                    üõ†Ô∏è Service inspection visit - PAY ON VISIT
                                  </span>
                                ) : (
                                  <span className="text-orange-500/80">
                                    üçî Fast food parcel dispatch - CASH ON
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
                                üìç {order.userAddress}
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
                                    ü§ù Confirmed
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
                                    üë©‚Äçüç≥ Cooking
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
                                    üõµ Dispatched
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
                                    ‚úÖ Delivered Done
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
                                    ü§ù Confirm Booking
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
                                    üõµ Mechanic Out
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
                                    üõ†Ô∏è Underway
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
                                    ‚úÖ Job Completed
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
                    });
                  })()}
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
                    
                    <div className="pt-2 mt-2 border-t border-slate-100 grid grid-cols-2 gap-3">
                      <div className="relative flex-grow">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><MapPin className="w-3 h-3"/> Rider Double Charge Range (KM)</span>
                        <input
                          type="number"
                          min="0"
                          value={riderRangeKmInput}
                          onChange={(e) =>
                            setRiderRangeKmInput(Number(e.target.value))
                          }
                          placeholder="e.g. 5"
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-slate-900 font-extrabold focus:border-[#D70F64] transition text-xs"
                        />
                      </div>
                      <div className="relative flex-grow">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><MapPin className="w-3 h-3"/> User Service Range (KM)</span>
                        <input
                          type="number"
                          min="0"
                          value={userRangeKmInput}
                          onChange={(e) =>
                            setUserRangeKmInput(Number(e.target.value))
                          }
                          placeholder="e.g. 10"
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-slate-900 font-extrabold focus:border-[#D70F64] transition text-xs"
                        />
                      </div>
                    </div>
                    <div className="pt-2">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#D70F64]" />
                        Base Store/Delivery Pinpoint on Map
                      </span>
                      <div className="p-3 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0">
                            <MapPin className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="block text-xs font-black text-slate-900">
                              üìç Base Delivery Location
                            </span>
                            <span className="block text-[10.5px] text-slate-500 font-semibold font-mono mt-0.5">
                              {baseLatInput}, {baseLngInput}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsBaseMapPickerOpen(true)}
                          className="px-4 py-2 rounded-xl bg-[#D70F64] hover:bg-[#b00c50] text-white text-xs font-black shadow-md shadow-pink-500/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Change Location on Map</span>
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Enable Live Rider Tracking (GPS) Quota Control Card */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative space-y-4">
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D70F64]/10 to-transparent" />
                  <h4 className="font-black text-sm text-slate-900 flex items-center gap-2 pb-2.5 border-b border-slate-200 uppercase tracking-wide">
                    <Navigation className="w-4 h-4 text-[#D70F64]" />
                    Enable Live Rider Tracking
                  </h4>
                  <p className="text-[10.5px] text-slate-600 font-medium leading-relaxed">
                    Toggle live rider GPS tracking on or off. Turning this OFF disables live location writes from riders to stay strictly within free plan limits.
                  </p>

                  <div className="flex items-center justify-between p-3.5 bg-pink-50/40 rounded-2xl border border-pink-100">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-900">Live Rider Tracking Status</span>
                      <span className="text-[10px] font-bold text-slate-500">
                        {isLiveTrackingEnabled ? "üü¢ ENABLED - Live GPS Active" : "üî¥ PAUSED - Quota Saver Active"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleLiveTracking(!isLiveTrackingEnabled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isLiveTrackingEnabled ? "bg-[#D70F64]" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          isLiveTrackingEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* System Maintenance Mode Config Card */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative space-y-4">
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D70F64]/10 to-transparent" />
                  <h4 className="font-black text-sm text-slate-900 flex items-center gap-2 pb-2.5 border-b border-slate-200 uppercase tracking-wide">
                    <Wrench className="w-4 h-4 text-[#D70F64]" />
                    System Maintenance Mode
                  </h4>
                  <p className="text-[10.5px] text-slate-600 font-medium leading-relaxed">
                    Toggle maintenance mode. While enabled, general users will be blocked from using the platform and will see only your custom message. Admins bypass this block.
                  </p>

                  <div className="space-y-4 pt-1">
                    <div className="flex items-center justify-between p-3.5 bg-rose-50/40 rounded-2xl border border-rose-100">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900">Maintenance Status</span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {isMaintenanceMode ? "üî¥ ACTIVE - Users Blocked" : "üü¢ INACTIVE - Public Access"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsMaintenanceMode(!isMaintenanceMode)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isMaintenanceMode ? "bg-[#D70F64]" : "bg-slate-200"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            isMaintenanceMode ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Maintenance Message for Users
                      </label>
                      <textarea
                        value={maintenanceMessage}
                        onChange={(e) => setMaintenanceMessage(e.target.value)}
                        rows={3}
                        placeholder="Provide a clear explanation..."
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-slate-900 font-extrabold focus:border-[#D70F64] transition text-xs resize-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveMaintenanceConfig}
                      className="w-full bg-[#D70F64] text-white font-black py-3 rounded-xl hover:scale-[1.01] active:scale-95 transition cursor-pointer text-xs uppercase"
                    >
                      Update Maintenance Mode
                    </button>
                  </div>
                </div>

                {/* Global Image Announcement & Offer Popup */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative space-y-4">
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D70F64]/10 to-transparent" />
                  <h4 className="font-black text-sm text-slate-900 flex items-center gap-2 pb-2.5 border-b border-slate-200 uppercase tracking-wide">
                    <ImageIcon className="w-4 h-4 text-[#D70F64]" />
                    Global Promo Offer / Pop-up Announcement
                  </h4>
                  <p className="text-[10.5px] text-slate-600 font-medium leading-relaxed">
                    Yahan se aap kisi bhi product ya special offer ki image lagayein. Ye image har user ko app open karte hi aik dafa popup modal me dikhayi degi.
                  </p>

                  <div className="space-y-4 pt-1">
                    {/* Active Status Switch */}
                    <div className="flex items-center justify-between p-3.5 bg-emerald-50/40 rounded-2xl border border-emerald-100">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900">Announcement Popup Status</span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {announcementActive ? "üî¥ ACTIVE - Users Will See Popup" : "‚ö™ INACTIVE - Hidden"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAnnouncementActive(!announcementActive)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          announcementActive ? "bg-emerald-500" : "bg-slate-200"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            announcementActive ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Announcement Image URL */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
                        <span>Offer Image URL (Pehli Fursat Me Image Link Dalein)</span>
                        {announcementImageUrl && (
                          <span className="text-[9px] text-[#D70F64] lowercase select-all font-mono">
                            {announcementImageUrl.length > 30 ? announcementImageUrl.substring(0, 30) + "..." : announcementImageUrl}
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={announcementImageUrl}
                        onChange={(e) => setAnnouncementImageUrl(e.target.value)}
                        placeholder="https://example.com/offer-image.jpg"
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-slate-900 font-extrabold focus:border-[#D70F64] transition text-xs"
                      />
                    </div>

                    {/* Optional Title */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Popup Title (Optional)
                        </label>
                        <input
                          type="text"
                          value={announcementTitle}
                          onChange={(e) => setAnnouncementTitle(e.target.value)}
                          placeholder="e.g. 50% Flat Discount Offer!"
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-slate-900 font-extrabold focus:border-[#D70F64] transition text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Announcement ID (Unique string to force popup again)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={announcementId}
                            onChange={(e) => setAnnouncementId(e.target.value)}
                            placeholder="Auto-generated timestamp"
                            className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-600 font-bold text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newId = "promo_" + Date.now();
                              setAnnouncementId(newId);
                              alert("Naya ID set ho gaya! Ab sab users ko ye popup aik bar phir dikhayi dega.");
                            }}
                            className="bg-zinc-100 hover:bg-zinc-200 text-slate-700 text-[10px] font-black uppercase px-3.5 rounded-xl transition shrink-0"
                          >
                            üîÑ Reset
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Optional Description */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Popup Detail Description (Optional)
                      </label>
                      <textarea
                        value={announcementDescription}
                        onChange={(e) => setAnnouncementDescription(e.target.value)}
                        rows={2}
                        placeholder="Describe details of your flash sale or instruction..."
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-slate-900 font-extrabold focus:border-[#D70F64] transition text-xs resize-none"
                      />
                    </div>

                    {/* Live Preview of the Image Announcement */}
                    {announcementImageUrl && (
                      <div className="space-y-2 border border-slate-100 bg-slate-50/50 p-4 rounded-2xl">
                        <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Live Promo Image Preview:</span>
                        <div className="max-h-48 overflow-hidden rounded-xl border border-slate-200 bg-white flex items-center justify-center relative group">
                          <img
                            src={announcementImageUrl}
                            alt="Announcement Offer Preview"
                            referrerPolicy="no-referrer"
                            className="max-h-48 w-auto object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Save Config Button */}
                    <button
                      type="button"
                      onClick={async () => {
                        if (announcementActive && !announcementImageUrl.trim()) {
                          alert("Aapne Announcement active rakhi hai magar Image URL khali hai! Pehle image ka link dalein.");
                          return;
                        }
                        // If no ID is generated, make one on the fly
                        let targetId = announcementId.trim();
                        if (!targetId) {
                          targetId = "promo_" + Date.now();
                          setAnnouncementId(targetId);
                        }
                        try {
                          const existingStatuses = deliverySettings?.restaurantStatuses || {};
                          const newSettings = {
                            ...deliverySettings,
                            deliveryFee: Number(deliveryChargeInput),
                            minOrderAmount: Number(minOrderAmountInput),
                            riderRangeKm: Number(riderRangeKmInput),
                            userRangeKm: Number(userRangeKmInput),
                            baseLocationCoords: {
                              lat: Number(baseLatInput),
                              lng: Number(baseLngInput),
                            },
                            restaurantStatus: deliverySettings?.restaurantStatus || {
                              isTemporarilyUnavailable: false,
                              openingTime: "09:00",
                              closingTime: "23:00",
                            },
                            restaurantStatuses: existingStatuses,
                            isMaintenanceMode: isMaintenanceMode,
                            maintenanceMessage: maintenanceMessage,
                            announcement: {
                              active: announcementActive,
                              imageUrl: announcementImageUrl.trim(),
                              title: announcementTitle.trim(),
                              description: announcementDescription.trim(),
                              id: targetId,
                            },
                          };

                          await setDoc(doc(db, "settings", "delivery_config"), cleanObject(newSettings));
                          alert("üéâ Mubarak Ho! Global Offer/Announcement successfully publish ho gayi hai!");
                        } catch (err) {
                          console.error(err);
                          alert("Firestore error while publishing announcement: " + err);
                        }
                      }}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-xl hover:scale-[1.01] active:scale-95 transition cursor-pointer text-xs uppercase shadow-md shadow-emerald-500/15 flex items-center justify-center gap-2"
                    >
                      <span>üì¢ Save & Publish Offer Announcement</span>
                    </button>
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
                        label="Restaurant Icon / Logo (Avatar Image)"
                        accentColorClass="purple"
                        placeholder="Paste icon/logo image URL (https://...)"
                        uploadPath={`restaurants/${selectedScheduleRestaurant}/icon`}
                      />
                    </div>
                    <div className="pt-2">
                      <ProductImageSelector
                        imageUrl={restBgImageUrl}
                        onChange={setRestBgImageUrl}
                        label="Restaurant Poster / Banner (Cover Image)"
                        accentColorClass="purple"
                        placeholder="Paste poster/banner image URL (https://...)"
                        uploadPath={`restaurants/${selectedScheduleRestaurant}/poster`}
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
                      placeholder="‚Ä¢ ‚Ä¢ ‚Ä¢ ‚Ä¢ ‚Ä¢ ‚Ä¢ (Min 6 tokens)"
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
                      üì¶ No accepted shipments currently on active duty route.
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
                                {getDisplayOrderId(order)}
                              </span>
                              {(() => {
                                const isCompleted = order.status === "delivered" || order.status === "completed";
                                const isCancelled = order.status === "cancelled";
                                
                                let badgeStyles = "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40";
                                let dotStyles = "bg-blue-500";
                                
                                if (isCompleted) {
                                  badgeStyles = "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40";
                                  dotStyles = "bg-emerald-500";
                                } else if (isCancelled) {
                                  badgeStyles = "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40";
                                  dotStyles = "bg-rose-500";
                                }

                                return (
                                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1 border ${badgeStyles}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${dotStyles} ${!isCompleted && !isCancelled ? "animate-pulse" : ""}`} />
                                    {order.status}
                                  </span>
                                );
                              })()}
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
                      üìã No active riders provisioned.
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

                        const ratedOrders = completedRiderOrders.filter((o) => o.rating !== undefined);
                        const totalRated = ratedOrders.length;
                        const avgRating = totalRated > 0
                          ? (ratedOrders.reduce((sum, o) => sum + (o.rating || 0), 0) / totalRated).toFixed(1)
                          : "N/A";

                        return {
                          today: { count: todayC, sales: todayS },
                          week: { count: weekC, sales: weekS },
                          month: { count: monthC, sales: monthS },
                          totalCompleted: completedRiderOrders.length,
                          totalCommission,
                          avgRating,
                          totalRated
                        };
                      })();

                      return (
                        <div
                          key={rider.uid}
                          className="bg-white border border-slate-200 p-4.5 rounded-2xl space-y-3 shadow-xs font-sans"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10.5px] font-black tracking-wider text-slate-900 flex items-center gap-1.5 flex-wrap">
                                Rider Name: {rider.name}
                                {rider.status === "blocked" && (
                                  <span className="text-[8.5px] bg-red-600 text-white font-extrabold px-1.5 py-0.5 rounded uppercase shrink-0">
                                    Blocked üö´
                                  </span>
                                )}
                              </span>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                <span className="text-[9px] text-[#D70F64] font-bold block bg-[#D70F64]/5 border border-[#D70F64]/20 px-2.5 py-0.5 rounded-full uppercase">
                                  Vehicle/Owner No: {rider.vehicleNumber || "N/A"}
                                </span>
                                <span className="text-[9px] font-bold block bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full uppercase text-amber-600 flex items-center gap-1 shrink-0">
                                  ‚≠ê {stats.avgRating !== "N/A" ? `${stats.avgRating} / 5` : "No Ratings"} ({stats.totalRated})
                                </span>
                              </div>
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
                              üìû Contact Phone:{" "}
                              <span className="font-mono text-slate-800">
                                {rider.phone}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span>üìç Logged-in HQ Status:</span>
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
                            <div className="bg-white border border-slate-200 rounded-xl p-3 mt-2 space-y-2">
                              <span className="text-[9.5px] font-black uppercase text-[#D70F64] tracking-wider flex items-center gap-1">
                                üìä Rider Earnings & Sales Stats
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
                                    Open Map üó∫Ô∏è
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <div className="text-slate-500 text-[10px] italic mt-2 bg-slate-100/30 p-2 rounded-xl border border-slate-200 text-center">
                                üì° Awaiting active GPS tracking signal...
                              </div>
                            )}

                            {/* Password Management */}
                            <div className="flex items-center gap-2 mt-3 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                              <Key className="w-3.5 h-3.5 text-[#D70F64] shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold">Rider Password</span>
                                {editingRiderPasswordId === rider.uid ? (
                                  <div className="flex items-center gap-2 mt-1">
                                    <input
                                      type="text"
                                      value={newPasswordInputValue}
                                      onChange={(e) => setNewPasswordInputValue(e.target.value)}
                                      placeholder="Naya Password (min 6 chars)"
                                      className="bg-white border border-slate-300 rounded-lg p-1.5 px-2.5 text-xs font-mono outline-none flex-grow text-slate-900"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSaveRiderPassword(rider.uid)}
                                      className="bg-emerald-500 text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg uppercase shrink-0 hover:bg-emerald-600 transition"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingRiderPasswordId(null)}
                                      className="bg-slate-200 text-slate-700 text-[10px] font-black px-2.5 py-1.5 rounded-lg uppercase shrink-0 hover:bg-slate-300 transition"
                                    >
                                      X
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between mt-0.5">
                                    <span className="font-mono text-xs font-black text-slate-800 truncate">
                                      {showPasswordId === rider.uid ? (rider.password || "No Custom Password (use fallback)") : "‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢"}
                                    </span>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => setShowPasswordId(showPasswordId === rider.uid ? null : rider.uid)}
                                        className="text-[9.5px] font-black text-slate-500 hover:text-slate-700 uppercase"
                                      >
                                        {showPasswordId === rider.uid ? "Hide" : "Show"}
                                      </button>
                                      <span className="text-slate-300 text-[10px]">|</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingRiderPasswordId(rider.uid);
                                          setNewPasswordInputValue(rider.password || "");
                                        }}
                                        className="text-[9.5px] font-black text-[#D70F64] hover:text-[#b00c50] uppercase"
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Block / Unblock Controls */}
                            <div className="mt-2.5 space-y-1.5">
                              {rider.status === "blocked" ? (
                                <div className="space-y-1.5">
                                  <div className="text-[10px] text-red-600 font-semibold bg-red-50 border border-red-200/50 p-2.5 rounded-xl text-left">
                                    <span className="block text-[8.5px] uppercase tracking-wider text-red-500 font-black">Blocked Reason / Wajah:</span>
                                    <span className="block font-bold mt-0.5 whitespace-pre-wrap">{rider.blockReason || "No reason provided."}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const isConfirmed = window.confirm(`Kya aap Rider "${rider.name}" ko unblock karna chahte hain?`);
                                      if (isConfirmed) {
                                        try {
                                          await updateDoc(doc(db, "users", rider.uid), {
                                            status: "verified",
                                            needsUnblockAlert: true,
                                            unblockAlertMessage: "Aapka account admin ne unblock kar diya hai! Ab aap duty shuru kar sakte hain."
                                          });
                                          alert(`‚úÖ Rider "${rider.name}" successfully unblock ho gaya hai!`);
                                        } catch (err) {
                                          console.error("Failed to unblock rider:", err);
                                          alert("Error: Database permission denied.");
                                        }
                                      }
                                    }}
                                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-2.5 rounded-xl transition text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10"
                                  >
                                    üîì Unblock Rider (Kholain)
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const reason = window.prompt(
                                      `Rider "${rider.name}" ko block karne ki wajah (Reason) aur unblock hone ka tareeqa likhein (yeh msg use show hoga):`,
                                      "Aapki duty timing par non-seriousness ki wajah se block kiya gaya hai. Unblock karwane ke liye niche diye gaye WhatsApp par rabta karein."
                                    );
                                    if (reason !== null) {
                                      try {
                                        await updateDoc(doc(db, "users", rider.uid), {
                                          status: "blocked",
                                          blockReason: reason || "Temporarily blocked by admin. Contact admin to unblock.",
                                          needsUnblockAlert: false,
                                          unblockAlertMessage: ""
                                        });
                                        alert(`‚ùå Rider "${rider.name}" block ho gaya hai.`);
                                      } catch (err) {
                                        console.error("Failed to block rider:", err);
                                        alert("Error: Database permission denied.");
                                      }
                                    }
                                  }}
                                  className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-2.5 rounded-xl transition text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-red-500/10"
                                >
                                  üö´ Block Rider (Band Karein)
                                </button>
                              )}
                            </div>

                            {/* Detailed Statistics Ledger */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRiderStatsId(rider.uid);
                                setStatsTimeframe("all");
                                setShowSettledHistory(false);
                              }}
                              className="w-full bg-[#D70F64]/10 text-[#D70F64] font-black border border-[#D70F64]/20 py-2.5 rounded-xl hover:bg-[#D70F64]/20 transition text-xs uppercase flex items-center justify-center gap-1.5 mt-2.5"
                            >
                              <ClipboardList className="w-4 h-4" /> Reports & Ledger (All Data / Settle)
                            </button>
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
                      placeholder="e.g. üçï"
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
                      label="Restaurant Icon / Logo Image"
                      accentColorClass="purple"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <ProductImageSelector
                      imageUrl={newFoodCategory.bgImageUrl || ""}
                      onChange={(url) =>
                        setNewFoodCategory({
                          ...newFoodCategory,
                          bgImageUrl: url,
                        })
                      }
                      label="Restaurant Poster / Banner (Cover Image)"
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
                          <span className="text-3xl">{cat.emoji || "üçΩÔ∏è"}</span>
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
                            label="Restaurant Icon / Logo Image"
                          />
                          <ProductImageSelector 
                            imageUrl={editingFoodCategory.bgImageUrl || ""}
                            onChange={(url) => setEditingFoodCategory({...editingFoodCategory, bgImageUrl: url})}
                            label="Restaurant Poster / Banner (Cover Image)"
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
                    Save Grocery Settings üíæ
                  </button>
                </div>
              </div>

              {/* Middle Row: Create Category, and list of current ones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Category Form */}
                <div className="bg-white/80 border border-slate-200 p-6 rounded-[24px] space-y-4">
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
                <div className="bg-white/80 border border-slate-200 p-6 rounded-[24px] space-y-4">
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
                              ‚úï
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
                <div className="bg-white/80 border border-slate-200/85 p-6 rounded-[24px] col-span-1 md:col-span-5 space-y-4">
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
                      Save Grocery Product üì¶
                    </button>
                  </form>
                </div>

                {/* 2. Product directory table column */}
                <div className="bg-white/80 border border-slate-200 p-6 rounded-[24px] col-span-1 md:col-span-12 lg:col-span-7 space-y-4">
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
                                        ‚úï
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
                                        ‚úï
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
              <div className="bg-white/90 border border-slate-200 rounded-3xl p-6 relative overflow-hidden">
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
                  <div className="bg-slate-200 border border-slate-200 rounded-2xl px-5 py-3 text-center sm:text-right">
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
                      className="w-full bg-slate-100/90 border border-slate-200 text-slate-900 placeholder-slate-500 pl-4 pr-10 py-3 rounded-2xl text-xs font-semibold focus:outline-hidden focus:border-emerald-500/50 transition-all"
                    />
                    {userSearchTerm && (
                      <button
                        onClick={() => setUserSearchTerm("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-500 text-xs font-bold"
                      >
                        ‚úï
                      </button>
                    )}
                  </div>
                </div>

                {/* 3 Status filter options: New Users, Active Users, Blocked Users */}
                <div className="mt-5 flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 max-w-xl">
                  <button
                    onClick={() => setUserFilterTab("new")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 select-none cursor-pointer ${
                      userFilterTab === "new"
                        ? "bg-[#D70F64] text-white shadow-md shadow-[#D70F64]/10"
                        : "text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <span>New Users</span>
                    {allUsersList.some(u => u.status === "locked") && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setUserFilterTab("active")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 select-none cursor-pointer ${
                      userFilterTab === "active"
                        ? "bg-[#D70F64] text-white shadow-md shadow-[#D70F64]/10"
                        : "text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Active Users
                  </button>

                  <button
                    onClick={() => setUserFilterTab("blocked")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 select-none cursor-pointer ${
                      userFilterTab === "blocked"
                        ? "bg-[#D70F64] text-white shadow-md shadow-[#D70F64]/10"
                        : "text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Blocked Users
                  </button>
                </div>
              </div>

              {/* NEW USERS SECTION */}
              {userFilterTab === "new" && (() => {
                const queryStr = userSearchTerm.toLowerCase();
                const lockedUsers = allUsersList.filter(u => 
                  u.status === "locked" && (
                    (u.name || "").toLowerCase().includes(queryStr) ||
                    (u.phone || "").toLowerCase().includes(queryStr) ||
                    (u.address || "").toLowerCase().includes(queryStr)
                  )
                );

                if (lockedUsers.length === 0) {
                  return (
                    <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-3 mb-6">
                      <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto">
                        <CheckCheck className="w-6 h-6 text-emerald-500" />
                      </div>
                      <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">
                        All Caught Up!
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold max-w-sm mx-auto leading-relaxed">
                        No new unverified users found. Every customer is verified and ready to order.
                      </p>
                    </div>
                  );
                }

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

                            <div className="space-y-3">
                              <div className="space-y-1">
                                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">Registered At</span>
                                <span className="text-[11px] text-zinc-500 font-mono block mb-2">{formattedTime}</span>
                                <h4 className="text-xl font-black text-slate-900 select-all tracking-tight">
                                  {u.phone}
                                </h4>
                              </div>

                              {u.savedLocation?.lat && u.savedLocation?.lng ? (
                                <div className="bg-emerald-50 border border-emerald-205/60 rounded-2xl p-3 text-[11px] font-semibold text-emerald-800 space-y-1.5 shadow-xs">
                                  <div className="flex items-center gap-1.5 font-black text-[10px] text-emerald-700 uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    üìç GPS Pinpoint Active
                                  </div>
                                  <p className="text-[9.5px] text-emerald-600 font-mono">
                                    Lat: {u.savedLocation.lat.toFixed(5)}, Lng: {u.savedLocation.lng.toFixed(5)}
                                  </p>
                                  <a
                                    href={`https://www.google.com/maps?q=${u.savedLocation.lat},${u.savedLocation.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[#D70F64] hover:underline font-black text-[10px] uppercase tracking-wider mt-0.5"
                                  >
                                    üó∫Ô∏è View on Map ‚ûî
                                  </a>
                                </div>
                              ) : (
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-[10px] text-slate-500 font-bold italic">
                                  ‚ö†Ô∏è GPS pinpoint data not synced yet
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2">
                              <a
                                href={`tel:${u.phone}`}
                                className="col-span-2 bg-[#D70F64] hover:bg-[#b00c50] text-white py-2.5 px-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition active:scale-95 flex items-center justify-center gap-2"
                              >
                                üìû Call Karein
                              </a>

                              <button
                                onClick={() => setUnlockingUser(u)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-3 rounded-2xl font-bold text-[11px] uppercase tracking-wider transition active:scale-95 flex items-center justify-center gap-1"
                              >
                                ‚úÖ Unlock
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
                                        alert(`‚ùå User ${u.phone} permanently blocked and blacklisted.`);
                                      } catch (err) {
                                        alert("Failed to block user: " + err);
                                      }
                                    }
                                  }}
                                  className="bg-red-600 hover:bg-red-700 text-white py-2.5 px-3 rounded-2xl font-bold text-[11px] uppercase tracking-wider transition active:scale-95 flex items-center justify-center gap-1"
                                >
                                  ‚ùå Block
                                </button>

                                <button
                                  onClick={async () => {
                                    if (confirm(`Are you sure you want to delete user ${u.phone}? This will NOT blacklist them, allowing them to register fresh.`)) {
                                      try {
                                        await deleteDoc(doc(db, "users", u.uid));
                                        alert("üóëÔ∏è User deleted successfully.");
                                      } catch (err) {
                                        alert("Failed to delete user: " + err);
                                      }
                                    }
                                  }}
                                  className="col-span-2 bg-zinc-700 hover:bg-zinc-650 text-zinc-200 py-2 px-3 rounded-2xl font-bold text-[10px] uppercase tracking-wider transition active:scale-95 flex items-center justify-center gap-1 border border-zinc-600"
                                >
                                  üóëÔ∏è Delete Karein
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

              {userFilterTab !== "new" && (() => {
                const filteredUsers = allUsersList.filter((u) => {
                  // Filter by selected tab
                  if (userFilterTab === "blocked") {
                    if (u.status !== "blocked") return false;
                  } else {
                    // "active" tab
                    if (u.status === "locked" || u.status === "blocked") return false;
                  }

                  const queryStr = userSearchTerm.toLowerCase();
                  return (
                    (u.name || "").toLowerCase().includes(queryStr) ||
                    (u.phone || "").toLowerCase().includes(queryStr) ||
                    (u.address || "").toLowerCase().includes(queryStr) ||
                    (u.role || "").toLowerCase().includes(queryStr)
                  );
                });

                const totalInTab = allUsersList.filter(u => 
                  userFilterTab === "blocked" 
                    ? u.status === "blocked" 
                    : (u.status !== "locked" && u.status !== "blocked")
                ).length;

                return (
                  <div className="bg-white/90 border border-slate-200 rounded-3xl overflow-hidden shadow-xl">
                    <div className="p-4 sm:p-5 border-b border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <h3 className="font-black text-xs uppercase tracking-widest text-slate-700">
                        {userFilterTab === "blocked" ? "Blocked Users Ledger" : "Active Users Ledger"}
                      </h3>
                      <span className="text-[10.5px] font-bold text-slate-500">
                        Showing {filteredUsers.length} of {totalInTab}
                      </span>
                    </div>

                    {/* Mobile View */}
                    <div className="block md:hidden divide-y divide-slate-100">
                      {filteredUsers.map((u) => {
                        const isSpecialAdmin = u.uid === "Wf1NfRofZ9dhre1t4WIsas7b6fJ3" || u.role === "admin";
                        return (
                          <div key={u.uid} className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
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
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Phone</span>
                                <span className="font-mono text-slate-700 font-bold select-all">{u.phone || "Not set/Guest"}</span>
                              </div>
                              <div>
                                <span className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Orders</span>
                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-[10px] font-bold text-slate-700">
                                  {u.ordersCount || 0}
                                </span>
                              </div>
                            </div>

                            <div>
                              <span className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Address & GPS Pinpoint</span>
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-1.5">
                                <p className="text-[11px] text-slate-700 font-bold whitespace-pre-wrap break-words max-h-16 overflow-y-auto">
                                  {u.address || "No address saved"}
                                </p>
                                {u.savedLocation?.lat && u.savedLocation?.lng ? (
                                  <div className="pt-1.5 border-t border-slate-205/50 flex flex-col gap-0.5 text-[9.5px]">
                                    <span className="text-emerald-600 font-black flex items-center gap-1 uppercase tracking-wider">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                      üìç Live Pinpoint Location
                                    </span>
                                    <a
                                      href={`https://www.google.com/maps?q=${u.savedLocation.lat},${u.savedLocation.lng}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[#D70F64] hover:underline font-bold text-[10px] block"
                                    >
                                      üó∫Ô∏è Open Google Maps ‚ûî ({u.savedLocation.lat.toFixed(5)}, {u.savedLocation.lng.toFixed(5)})
                                    </a>
                                  </div>
                                ) : (
                                  <span className="text-[9px] text-slate-400 font-medium italic block pt-1 border-t border-slate-200/40">
                                    No GPS coordinates synced yet.
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="pt-2 flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setInspectingVoucherUser(u)}
                                className="flex-1 min-w-[70px] py-1.5 rounded-lg text-[10px] font-black uppercase transition-all bg-pink-500/10 text-[#D70F64] hover:bg-pink-500/20 cursor-pointer text-center"
                              >
                                üéüÔ∏è Vouchers ({vouchersList.filter(v => v.assignedUserIds?.includes(u.uid)).length})
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCoinManagingUser(u);
                                  setCoinAmountInput(50);
                                  setCoinNoteInput("");
                                }}
                                className="flex-1 min-w-[70px] py-1.5 rounded-lg text-[10px] font-black uppercase transition-all bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 cursor-pointer text-center"
                              >
                                ü™ô Coins
                              </button>
                              <button
                                type="button"
                                onClick={() => setUnlockingUser(u)}
                                className="flex-1 min-w-[70px] py-1.5 rounded-lg text-[10px] font-black uppercase transition-all bg-sky-500/10 text-sky-500 hover:bg-sky-500/20 cursor-pointer text-center"
                              >
                                Edit Addr
                              </button>
                              
                              {u.status === "locked" && (
                                <button
                                  type="button"
                                  onClick={() => setUnlockingUser(u)}
                                  className="flex-1 min-w-[70px] py-1.5 rounded-lg text-[10px] font-black uppercase transition-all bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 cursor-pointer text-center"
                                >
                                  Unlock
                                </button>
                              )}
                              
                              {u.status !== "blocked" && u.status !== "locked" && !isSpecialAdmin && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const reason = window.prompt("Reason for blocking (e.g. Orders canceled repeatedly):", "Duty parameters rules violation. Unblock karwane ke liye niche diye gaye WhatsApp par rabta karein.");
                                    if (reason !== null) {
                                      try {
                                        await updateDoc(doc(db, "users", u.uid), {
                                          status: "blocked",
                                          isBlacklisted: true,
                                          blockReason: reason || "Temporarily blocked by admin. Contact admin to unblock.",
                                          needsUnblockAlert: false,
                                          unblockAlertMessage: ""
                                        });
                                        await setDoc(doc(db, "blacklist", u.uid), {
                                          phone: u.phone,
                                          blockedAt: new Date(),
                                          blockedBy: adminUsername || "admin",
                                          reason: reason || "Fake number"
                                        });
                                        alert(`‚ùå User ${u.phone} permanently blocked and blacklisted.`);
                                      } catch (err) {
                                        alert("Failed to block user: " + err);
                                      }
                                    }
                                  }}
                                  className="flex-1 min-w-[70px] py-1.5 rounded-lg text-[10px] font-black uppercase transition-all bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 cursor-pointer text-center"
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
                                        isBlacklisted: false,
                                        needsUnblockAlert: true,
                                        unblockAlertMessage: "Aapka account admin ne unblock kar diya hai! Ab aap orders place kar sakte hain. üéâ"
                                      });
                                      await deleteDoc(doc(db, "blacklist", u.uid));
                                      alert(`‚úÖ User ${u.phone} unblocked and removed from blacklist.`);
                                    } catch (err) {
                                      alert("Failed to unblock user: " + err);
                                    }
                                  }}
                                  className="flex-1 min-w-[70px] py-1.5 rounded-lg text-[10px] font-black uppercase transition-all bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 cursor-pointer text-center"
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
                                        await deleteDoc(doc(db, "users", u.uid));
                                      } catch (err) {
                                        console.error("Failed to delete user profile", err);
                                        alert("Error: Database permission denied.");
                                      }
                                    },
                                  });
                                }}
                                className={`flex-1 min-w-[70px] py-1.5 rounded-lg text-[10px] font-black uppercase transition-all text-center ${
                                  isSpecialAdmin
                                    ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                                    : "bg-pink-950/30 text-pink-400 hover:bg-pink-900/30 cursor-pointer"
                                }`}
                              >
                                {isSpecialAdmin ? "Locked" : "Delete"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {filteredUsers.length === 0 && (
                        <div className="p-8 text-center text-slate-500 font-black text-xs uppercase tracking-widest">
                          No registered users found.
                        </div>
                      )}
                    </div>

                    {/* Desktop View */}
                    <div className="hidden md:block overflow-x-auto">
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
                          {filteredUsers.map((u) => {
                              const isSpecialAdmin = u.uid === "Wf1NfRofZ9dhre1t4WIsas7b6fJ3" || u.role === "admin";
                              return (
                                <tr key={u.uid} className="hover:bg-slate-50 transition-all">
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
                                    <div className="space-y-1.5">
                                      <p className="text-[11px] text-slate-700 font-bold whitespace-pre-wrap break-words max-h-16 overflow-y-auto leading-relaxed">
                                        {u.address || "No address saved"}
                                      </p>
                                      {u.savedLocation?.lat && u.savedLocation?.lng ? (
                                        <div className="flex flex-col gap-0.5 text-[9.5px]">
                                          <span className="text-emerald-600 font-black flex items-center gap-1 uppercase tracking-wider">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                            üìç Pinpoint Live Location
                                          </span>
                                          <a
                                            href={`https://www.google.com/maps?q=${u.savedLocation.lat},${u.savedLocation.lng}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[#D70F64] hover:underline font-black text-[10px] block"
                                          >
                                            üó∫Ô∏è Open Google Maps ‚ûî ({u.savedLocation.lat.toFixed(5)}, {u.savedLocation.lng.toFixed(5)})
                                          </a>
                                        </div>
                                      ) : (
                                        <span className="text-[9px] text-slate-400 font-medium italic block">No GPS coordinates synced</span>
                                      )}
                                    </div>
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
                                      onClick={() => setInspectingVoucherUser(u)}
                                      className="p-1 px-2.5 rounded text-[10px] font-black uppercase transition-all bg-pink-500/10 text-[#D70F64] hover:bg-pink-500/20 cursor-pointer flex items-center gap-1"
                                    >
                                      üéüÔ∏è Vouchers ({vouchersList.filter(v => v.assignedUserIds?.includes(u.uid)).length})
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCoinManagingUser(u);
                                        setCoinAmountInput(50);
                                        setCoinNoteInput("");
                                      }}
                                      className="p-1 px-2.5 rounded text-[10px] font-black uppercase transition-all bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 cursor-pointer flex items-center gap-1"
                                    >
                                      ü™ô Manage Coins
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setUnlockingUser(u)}
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
                                    {u.status !== "blocked" && u.status !== "locked" && !isSpecialAdmin && (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const reason = window.prompt("Reason for blocking (e.g. Orders canceled repeatedly):", "Duty parameters rules violation. Unblock karwane ke liye niche diye gaye WhatsApp par rabta karein.");
                                          if (reason !== null) {
                                            try {
                                              await updateDoc(doc(db, "users", u.uid), {
                                                status: "blocked",
                                                isBlacklisted: true,
                                                blockReason: reason || "Temporarily blocked by admin. Contact admin to unblock.",
                                                needsUnblockAlert: false,
                                                unblockAlertMessage: ""
                                              });
                                              await setDoc(doc(db, "blacklist", u.uid), {
                                                phone: u.phone,
                                                blockedAt: new Date(),
                                                blockedBy: adminUsername || "admin",
                                                reason: reason || "Fake number"
                                              });
                                              alert(`‚ùå User ${u.phone} permanently blocked and blacklisted.`);
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
                                              isBlacklisted: false,
                                              needsUnblockAlert: true,
                                              unblockAlertMessage: "Aapka account admin ne unblock kar diya hai! Ab aap orders place kar sakte hain. üéâ"
                                            });
                                            await deleteDoc(doc(db, "blacklist", u.uid));
                                            alert(`‚úÖ User ${u.phone} unblocked and removed from blacklist.`);
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
                                              await deleteDoc(doc(db, "users", u.uid));
                                            } catch (err) {
                                              console.error("Failed to delete user profile", err);
                                              alert("Error: Database permission denied.");
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

                          {filteredUsers.length === 0 && (
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
                );
              })()}

            </div>
          )}


          {activeSubTab === "seo" && (
            <div className="space-y-6 animate-fade-in text-left">
              <div className="bg-white/90 border border-slate-200 rounded-3xl p-6 relative overflow-hidden">
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

              <div className="bg-white border border-slate-200 rounded-[24px] p-5 lg:p-7 shadow-sm relative">
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

              <div className="bg-white/90 border border-slate-200 rounded-3xl p-6 relative overflow-hidden mt-6">
                <div className="absolute right-0 top-0 w-80 h-80 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-purple-500">
                      <Grid className="w-5 h-5 text-purple-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest bg-purple-500/10 px-2 py-0.5 rounded-full">
                        UI Configuration
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mt-1">
                      Theme Settings
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Configure the main hero background image.
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={handleSaveUiConfig}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-black text-[10px] uppercase tracking-widest py-3 px-5 rounded-xl transition cursor-pointer shrink-0"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-[24px] p-5 lg:p-7 shadow-sm relative">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                      Hero Background Image URL
                    </label>
                    <input
                      type="text"
                      value={heroBgUrl}
                      onChange={(e) => setHeroBgUrl(e.target.value)}
                      placeholder="e.g. https://images.unsplash.com/..."
                      className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm outline-none text-slate-900 focus:border-purple-500/60 transition"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                      Partner Shops Section Background Image URL üè™
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={partnerShopsBgUrl}
                        onChange={(e) => setPartnerShopsBgUrl(e.target.value)}
                        placeholder="e.g. https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1200"
                        className="flex-1 p-3 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm outline-none text-slate-900 focus:border-purple-500/60 transition"
                      />
                      {partnerShopsBgUrl && (
                        <button
                          type="button"
                          onClick={() => setPartnerShopsBgUrl("")}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-2xl transition cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mt-1.5">
                      Enter any image URL to customize the backdrop of the "Partner Shops" card. Leave empty to use the default high-definition culinary theme.
                    </p>

                    {partnerShopsBgUrl && (
                      <div className="mt-3 relative h-28 rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
                        <img
                          src={partnerShopsBgUrl}
                          alt="Partner Shops Preview"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-black/60 flex items-center justify-center">
                          <span className="text-white text-xs font-black uppercase tracking-wider bg-black/70 px-3 py-1 rounded-full border border-white/30 shadow-md backdrop-blur-xs">
                            Live Preview: Partner Shops Header
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeSubTab === "loyalty" && (
            <div className="space-y-6 animate-fade-in text-left font-sans">
              {/* Header card */}
              <div className="bg-white/90 border border-slate-200 rounded-3xl p-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-80 h-80 bg-[#D70F64]/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-[#D70F64]">
                      <Coins className="w-5 h-5 text-[#D70F64]" />
                      <span className="text-[10px] font-black uppercase tracking-widest bg-[#D70F64]/10 px-2.5 py-0.5 rounded-full">
                        Loyalty Wallet Controller
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mt-1">
                      Dadu Loyalty Coins Wallet
                    </h2>
                    <p className="text-xs text-slate-600 font-medium mt-1">
                      Manage how many loyalty coins users earn per order, spend limits, and toggles to show or hide the system.
                    </p>
                  </div>
                  <button
                    onClick={handleSaveLoyaltyConfig}
                    className="bg-[#D70F64] hover:bg-[#b00c50] text-white font-black text-[11px] uppercase tracking-wider py-3 px-6 rounded-2xl transition cursor-pointer shrink-0 shadow-md flex items-center gap-2 self-start sm:self-auto hover:scale-[1.02] active:scale-95"
                  >
                    <Save className="w-4 h-4 text-white" />
                    Save Wallet Config
                  </button>
                </div>
              </div>

              {/* Settings Configuration Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Earn Rules Card */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                  <div>
                    <h3 className="font-black text-sm text-slate-900 uppercase tracking-wide flex items-center gap-2">
                      üí∞ Coin Earning Rules
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Set how much cashback/coins users earn when their order is completed.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Enable/Disable System */}
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                      <div>
                        <span className="text-xs font-black text-slate-800 block">
                          Loyalty Coins System Status
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium block">
                          Dadu Coins system ko completely enable ya disable karein.
                        </span>
                      </div>
                      <button
                        onClick={() => setLoyaltyEnabled(!loyaltyEnabled)}
                        className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer outline-none shrink-0 ${
                          loyaltyEnabled ? "bg-[#D70F64]" : "bg-slate-200"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                            loyaltyEnabled ? "transform translate-x-6" : ""
                          }`}
                        />
                      </button>
                    </div>

                    {/* Reward Calculation Type */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                        Reward Calculation Type
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setLoyaltyEarnType("fixed")}
                          className={`p-3 rounded-2xl text-xs font-bold border transition cursor-pointer text-center ${
                            loyaltyEarnType === "fixed"
                              ? "border-[#D70F64] bg-[#D70F64]/5 text-[#D70F64]"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          Flat Coins Per Order
                        </button>
                        <button
                          type="button"
                          onClick={() => setLoyaltyEarnType("percentage")}
                          className={`p-3 rounded-2xl text-xs font-bold border transition cursor-pointer text-center ${
                            loyaltyEarnType === "percentage"
                              ? "border-[#D70F64] bg-[#D70F64]/5 text-[#D70F64]"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          % of Order Total (Cashback)
                        </button>
                      </div>
                    </div>

                    {/* Reward Value */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                        {loyaltyEarnType === "fixed" ? "Flat Coin Reward Value" : "Cashback Percentage (%)"}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={loyaltyEarnCoins}
                          onChange={(e) => setLoyaltyEarnCoins(Math.max(0, Number(e.target.value)))}
                          placeholder={loyaltyEarnType === "fixed" ? "e.g. 15" : "e.g. 5"}
                          className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm outline-none text-slate-900 focus:border-[#D70F64]/60 transition"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10.5px] font-black text-slate-400">
                          {loyaltyEarnType === "fixed" ? "Coins" : "% of Subtotal"}
                        </span>
                      </div>
                    </div>

                    {/* Minimum Order Value */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                        Minimum Order Amount to Earn
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={loyaltyMinOrderForEarn}
                          onChange={(e) => setLoyaltyMinOrderForEarn(Math.max(0, Number(e.target.value)))}
                          placeholder="e.g. 100"
                          className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm outline-none text-slate-900 focus:border-[#D70F64]/60 transition"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10.5px] font-black text-slate-400">
                          Rs. Minimum
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spending Rules & Applicability Card */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                  <div>
                    <h3 className="font-black text-sm text-slate-900 uppercase tracking-wide flex items-center gap-2">
                      üõçÔ∏è Spend Limits & Applicability
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Configure maximum spend limits and allow coins usage on Food vs Grocery store.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Max Spend Coins */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                        Max Coins Usable Per Order
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={loyaltyMaxSpendCoins}
                          onChange={(e) => setLoyaltyMaxSpendCoins(Math.max(1, Number(e.target.value)))}
                          placeholder="e.g. 50"
                          className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm outline-none text-slate-900 focus:border-[#D70F64]/60 transition"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10.5px] font-black text-slate-400">
                          Coins Max
                        </span>
                      </div>
                      <span className="text-[9.5px] text-slate-400 font-bold block mt-1">
                        üí° User ek single checkout mein isse zyada coins use nahi kar payega.
                      </span>
                    </div>

                    {/* Applicability Section */}
                    <div className="pt-2 border-t border-slate-100 space-y-3">
                      <span className="text-[10px] font-black text-slate-400 block uppercase tracking-widest">
                        Category Applicability (Kahan use honge)
                      </span>

                      {/* Quick Scope Selector */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => {
                            setLoyaltyAllowOnFood(true);
                            setLoyaltyAllowOnGrocery(true);
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-black transition text-center ${
                            loyaltyAllowOnFood && loyaltyAllowOnGrocery
                              ? "bg-[#D70F64]/10 border-[#D70F64] text-[#D70F64]"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          üçïüõí Both Categories
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setLoyaltyAllowOnFood(true);
                            setLoyaltyAllowOnGrocery(false);
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-black transition text-center ${
                            loyaltyAllowOnFood && !loyaltyAllowOnGrocery
                              ? "bg-[#D70F64]/10 border-[#D70F64] text-[#D70F64]"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          üçï Food Only
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setLoyaltyAllowOnFood(false);
                            setLoyaltyAllowOnGrocery(true);
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-black transition text-center ${
                            !loyaltyAllowOnFood && loyaltyAllowOnGrocery
                              ? "bg-[#D70F64]/10 border-[#D70F64] text-[#D70F64]"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          üõí Grocery Only
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setLoyaltyAllowOnFood(false);
                            setLoyaltyAllowOnGrocery(false);
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-black transition text-center ${
                            !loyaltyAllowOnFood && !loyaltyAllowOnGrocery
                              ? "bg-[#D70F64]/10 border-[#D70F64] text-[#D70F64]"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          üö´ Disabled All
                        </button>
                      </div>

                      {/* Allow on Food */}
                      <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                        <div>
                          <span className="text-xs font-black text-slate-800 block">
                            Allow on Food items
                          </span>
                          <span className="text-[9.5px] text-slate-500 font-medium block">
                            Food delivery orders pe coins earn/redeem allow karein.
                          </span>
                        </div>
                        <button
                          onClick={() => setLoyaltyAllowOnFood(!loyaltyAllowOnFood)}
                          className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer outline-none shrink-0 ${
                            loyaltyAllowOnFood ? "bg-[#D70F64]" : "bg-slate-200"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform ${
                              loyaltyAllowOnFood ? "transform translate-x-4.5" : ""
                            }`}
                          />
                        </button>
                      </div>

                      {/* Allow on Grocery */}
                      <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                        <div>
                          <span className="text-xs font-black text-slate-800 block">
                            Allow on Grocery store
                          </span>
                          <span className="text-[9.5px] text-slate-500 font-medium block">
                            Grocery checkout orders pe coins earn/redeem allow karein.
                          </span>
                        </div>
                        <button
                          onClick={() => setLoyaltyAllowOnGrocery(!loyaltyAllowOnGrocery)}
                          className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer outline-none shrink-0 ${
                            loyaltyAllowOnGrocery ? "bg-[#D70F64]" : "bg-slate-200"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform ${
                              loyaltyAllowOnGrocery ? "transform translate-x-4.5" : ""
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "banners" && (
            <div className="space-y-6 lg:space-y-8 animate-fade-in text-left">
              <div className="bg-white/90 border border-slate-200 rounded-3xl p-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-80 h-80 bg-pink-500/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-pink-500">
                      <ImageIcon className="w-5 h-5" />
                      <span className="text-[10px] font-black uppercase tracking-widest bg-pink-500/10 px-2 py-0.5 rounded-full">
                        Smart Carousel
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mt-1">
                      High-Performance Banners
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Manage banners and break the 12-hour local cache globally.
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={async () => {
                        try {
                          const existingStatuses = deliverySettings?.restaurantStatuses || {};
                          const newSettings = {
                            ...deliverySettings,
                            bannerVersion: Date.now(),
                            restaurantStatus: deliverySettings?.restaurantStatus || {
                              isTemporarilyUnavailable: false,
                              openingTime: "09:00",
                              closingTime: "23:00"
                            },
                            restaurantStatuses: existingStatuses,
                          };
                          await setDoc(doc(db, "settings", "delivery_config"), cleanObject(newSettings));
                          alert("Global Banner Cache broken successfully!");
                        } catch (err: any) {
                          alert(handleFirestoreError(err));
                        }
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white font-black text-[10px] uppercase tracking-widest py-3 px-5 rounded-xl transition cursor-pointer shrink-0"
                    >
                      Force Update Banners (Break Cache)
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-[24px] p-5 lg:p-7 shadow-sm relative">
                <h3 className="text-sm font-black text-slate-900 mb-4">Add New Banner</h3>
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
                    const originalText = submitBtn.innerText;
                    
                    const imageUrlInput = form.elements.namedItem("imageUrl") as HTMLInputElement;
                    const imageUrl = imageUrlInput.value.trim();
                    const restaurantName = (form.elements.namedItem("restaurantName") as HTMLSelectElement).value;
                    const detail = (form.elements.namedItem("detail") as HTMLInputElement).value;
                    const isActive = (form.elements.namedItem("isActive") as HTMLInputElement).checked;
                    
                    if (!imageUrl) {
                      alert("Please select an image file or enter an Image URL.");
                      return;
                    }

                    // Flexible validation for http/https or data:image
                    const isValidUrl = imageUrl.startsWith("data:image/") || 
                                       imageUrl.startsWith("http://") || 
                                       imageUrl.startsWith("https://");
                    
                    if (!isValidUrl) {
                      alert("Please enter a valid Image URL (e.g. starting with https:// or data:image/).");
                      return;
                    }

                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>';

                    try {
                      // Compress image if needed to stay well under Firestore's 1MB document limit
                      const finalImageUrl = await compressImageToLowRes(imageUrl, 1200, 600, 0.75);

                      await addDoc(collection(db, "promotional_banners"), {
                        imageUrl: finalImageUrl,
                        restaurantName: restaurantName || null,
                        detail: detail || null,
                        isActive,
                        createdAt: Date.now()
                      });
                      form.reset();
                      alert("Banner added successfully!");
                    } catch (err: any) {
                      alert(handleFirestoreError(err));
                    } finally {
                      submitBtn.disabled = false;
                      submitBtn.innerText = originalText;
                    }
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                      Banner Image (Upload File OR Paste URL)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        id="bannerImageUrlInput"
                        name="imageUrl"
                        type="text"
                        required
                        placeholder="https://... or select photo below"
                        className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs outline-none text-slate-900 focus:border-pink-500/60 transition"
                      />
                      <label className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-3 px-4 rounded-2xl border border-slate-300 flex items-center justify-center gap-2 cursor-pointer shrink-0 transition">
                        <Upload className="w-4 h-4 text-pink-500" />
                        <span>Choose Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 10 * 1024 * 1024) {
                              alert("File size too large. Please select an image under 10MB.");
                              return;
                            }
                            const inputEl = document.getElementById("bannerImageUrlInput") as HTMLInputElement;
                            if (inputEl) {
                              inputEl.placeholder = "Compressing photo...";
                            }
                            try {
                              const compressed = await compressImageFile(file, 1200, 600, 0.75);
                              if (inputEl) {
                                inputEl.value = compressed;
                                inputEl.placeholder = "https://... or select photo below";
                              }
                            } catch (err) {
                              console.error("Error compressing image", err);
                              alert("Failed to process image file.");
              xúÏ}[s‹»íﬁ˚˛äRÔÏLsÜ›l^%qD)(^$zDR¡¶féC°∞–4#4–Q=<|√ypƒÆ◊·ız√cÀ·óç∞˝‚ıÉÃ¸Î'8≥™ 
U†IJî<∫tÖBUVVfVVÊWÑàüÀø ⁄œ•˛Ê“CÕ≠Kû5p<ıÌK∂˚VuKCsÓ–˜ê°gE—ë5q∂Z±Û.Óº\ÓMﬂΩ"£¿è;œæ!Ùr‰Y±”YÔıH2ù:·–äáp€ıœ:ÁÆÌD1xü:À›ıñÆªn4ı¨9ÖZ…ŸubÀıH˚xªÅoyö~õà‚˙”$÷ºŒß=≥È[Zö2Òl {Ø+-:„¿≥ùp´Âtœ∫dΩ˜W‰xüú>=Ëìüˆˆ~ÿ;⁄’=-ê¯º3J<èL;´d tª±CAıÚˇ8°WÄ–aê¯∂cwVﬁylﬁE$Hbœıùé¯é80˜°¸(&—&ØfÍ˙op∏ñ6z8N~‰"}’-TÚ‚Á√Q'éÌÜŒ0&œ†œ¿RßVxÊƒp9ä≠∫_çª"«É çÏfØ¬nÆl†ïH•yky	¥Ωı( í∫˝£Îúìcﬂõ-<XbÖtu\$æ˚«ƒ…«$ÍN¨i;$[I[+$”7øqf[·%o|{´^π∞†ñæñÿà6fzq GûÛé¿®M¢Œ–Òc∑3Gs:Î¨hïâ)bîA√±3|3ﬁµt≈øπ—ˆ0vﬂ:⁄bÆù:rŒ[æÔÑ⁄“∂3≤/ﬁ¡ó;vÓ]#c¯K/Â∞"„ÆÊåÀ2ƒiùn á2±2é'ﬁ~*;&ãò"L‹Ä»Á«]xµé_˙ 3¨à∞∫â;ôÄXÅgºYSô°g¢A«¿Œl¨£d0q„B€9Ö»8xÎÑõÈï∏bªë5{3òZC7ûAoXﬂò¸êÂ+ªz·
º
˚Æ≥ëâî0ôê √$å!ÅK|‚˙ùs®u´’P±oÈÿ†(	√P~ˆ¡“('ÚuNH˘™4k–ó+kHêigùxgõ”Œ]ç-;8ÔD:P«©>Ú‡‚ÿµm«WÙÛ¡xµƒoPÉZΩ°@ıµ÷z»˘ä'"Ìã˚ˆÃç‚ÆÁ¯gÒ¯ƒËxUÒF©«g°k¸ß3º®≥L¢…f˛s{óˇ\•íiM9`Ö6†<føıBô∂ÑJcV≤Î⁄óBÀ.^Û1¯*ªœÁ*yDæUåÀ“zè‰ø¥⁄˚ÜlfÖÚ—É"©•@2∆_ˇÊ≤†QÙfCxw¶#w,œ{}©’nå'µ:(w<w¯fÎ¢ΩÄtπ0ò˚ëÔ˛»'ªÆÂgmSa˘nÏ9õ§µÍ(N9£µh|f‚DëuÜOmáô	â˛Â-ù8 0›'ñJ…õÅdßU«c7"lDUº ∫À∫∞	¬pÊIu∑i_¬YeB¨sÀçy£vÉa€∆øÉE“öÜ¡$`&⁄ø‚<ŸZ$è-,|_Q7p°«§ÌÑ!¥‹ü-‘iéÁÑq{l˘∂ÁÏªhƒ°≥ÜAà’‘x©Òæqah®€∞hdÄ5à/Å±Ìƒ¡Ê|'tœ∆1|Å˘¬¨(®ºÄÑÀªâ-ÍçsÑc¯õŒ'jôñÌõüì(vG≥Ùß†'~È,˜$e°3Å9”oI<Ø)≠õ≤0iˇP¥GVªÎ–¯∑eZXÎ¥ø/IYn£[—åEPÀK˜_âöƒ˙™¨.riµåäáK$≠…ÅF·‰Lgñ·'
áπ¨ù¿Ãzó¶DaÃ{0fˇÉü±#Cl≤(ÈWTø µÔ»b˚ÎØ…7g°5ãÜ0Yæπ|m|w‡”…¢“©!4⁄N7f+5∞∫ûû>;¿˛ÌyŒ8l°='[§5é„i¥π¥î≠¿ª√`È^Ø˜n4»Ëﬁ»óÓØY´É{èêß∑h%ﬂ=,˚;⁄òñiœÁü—ÆÀ<TΩ˛≈iáâ‚À°]≥§åP\nÇj}˝·˝¯á\ÈÔ_æFΩ
k6\£Î±±[i≈ÃçÇLaX≥Uí ≥…3[W$Än˘§jâ~¯å›—,Î¨ÚR)8p‚sÊ˚îä\f≥ƒE”sŸ∞÷@∑¬‘ÚÀt∫Ø ´nÕXP∆áµ¯.î‰F\w:ÀﬁÜπœú¿xª„J¨≠•] C€MØ∞òõ©æ	Q«Ä`ÊC2µ≠ÜÊ√bc yõDÇUV@Öù0áir5√dNètQw¿∫êz3ñA≥¶Jœ;#Å¶YdÜÚRP;∞8	`§Z)‡íÓ,ÑÈEµhf≈∞K∏&†≠`?qEÚ≠ï)ﬁÒë‹Qπ-–dZB‘ë?bk?ºˇﬂHÍêÅ¶¸ˆèˇÉ<e´G”$´∞FÙL{KÂÒRV\,]Ç∫Ñ_Ì_?úZ≤µö˘mê«8” ˙‡¡∂=q˝YÅCÀï,˚“ß∑.“o∏ï€+∑ø“D¯%ó,Í<®∂‰p,>±$˜5˚Y†D—qçÉÛœ±¬>L—Ë0∞-Iñ4à˚Œ±âÎ√“∞”K¶NÔUµu¨K'X: ∆ÜoÏå¸ÅóÑËŸÇ’<à∞ÅóGñÌt\ü±∑Áå‚Çéò€U≤äˆ≠ıÆsésûõë≤©Àô[:wxL;T»–ÈÃ:≤€æπäÂçî¥+ô~çzû⁄k¥’a1â†pªúÜV4^)Æ	pù±}—vÈ)ó∫í„µB√d{p¢£EkÏ  òÑr&˘ö”~Í¢ÓòëÔˇÈüïπÒö≤©SÖ	∑åB_⁄∫…LMõˆ]IöLÂó`\:C¯ëhq∫› îçù™<áı‰õﬁlaﬁXv≥ºï‹?0è˚e–Y^‰(§o…Oòör\EIÅiA›¬ƒí2Ωy°≠ –¨‡[µBRπ`/ñæ%˝a0u“—]ﬁ$˝ÿäìà|ªtiúÌ©TPmÁiwóı∆F¡≥/MG.w˘¥‡Õ•Ωÿ,BÈŸØp¬27´jÒ¢7óÕúß‚ΩúÔX⁄-òI†óC«n)-˙ÇI7Éµ
µÎDø∏]ﬂCã.<∏Ç–Ô|•∂aáRô©ê7RcÌ0õÔÂ_ÓﬁÌÌo¨Ω›S\Íg˜tUà6‡zØ¨⁄§©VûY™äUf¢J–˝ˆÎü…n⁄I∫#™T⁄Õèeê°Âœª›í7ÚKeêˇ¸◊d'Ì‰Ìb∞™o3k`ÛæP¶¯˛ØˇŸ”öı◊âjÛÑ~g÷‘+õ‘EDN,ˇÃπÌ⁄z•K˙4RÉú∫á<wB7∞ØG[Ø∑L◊©ÚV«›Ã‰£–pÓ≠îÊûHÌÎúå=ÍMø|ŸWû~˘äÂ6N?úy»Yü\sfX∂≠Ÿ-Á⁄ƒ/îñA4~z≠Ãy·.:∫ÂÃ¿⁄¯Ör√]‰Ü˙
˘ÜŸaµ˜o‰ À‰h7æ-1L¢8ò‹ré‡ç¸B9‚–ÚÀkj≥KW/LÑSÔ¥W⁄∂‘E∑¶ï^Ÿ´K€“Ö¯˝÷√}Ù·‚cs˛î6;pìW7Ï<<'›•,£¬“∆P˙Å95Fg—)ÖY%Tê≈•tÈk¥Âäp~aœ¥Ü¨⁄s¬§q^
ë“À‚èäeÏ«Ãﬂ0ˇi…œ∑Ø2Ù¯ó= ÀRu>Ñg∏”ΩÕç…Û–yãY≤Ô‡¢≠éÚ~ì	F@@á®˜="[lÁ'Íé®[¢›¶?5Q"¨7 ˝´¸Òn§t1ì?˝IqL¶∏Ád+¬“7‰:’rÂ˜≤'ƒëvïÔ•˘°$t‚$Ù	›=*7K_gﬁ^g÷rπŒR•¸6M4°£q‡„åeVÌÙ¢¨À≈Çú,_Ü9T
M)G«9‚ƒyÎ¯	®=âG∫@†dË¥€÷p∏H ï|G⁄A˜¨˚4à-ª∑∞K}Â=≠÷ü ãª¿ôëNUzuÖÓÀ≠¬Õ3«òVø6€‚. å|Kò6@ø·Kc»Út7>µ‚Ä∞ÿ⁄MSW)˙,•¡F—C√dà∂^!Hâv!ç"Ol‡Û]›m;Øêç•§p¡9ô)2⁄o}b#ÚvCL≤I ±?¢í®¶Ú√ì®K.≠x‹•ÙkKúüGÁeëyç)¢ñÌ≈âwπ–.ÜÙ4!£„€iÇ[≥Ä«OºÈ¸ªFsÚä€Í∫iπ OGò°◊∞!œduiq†Y4ÃEø4SlÎÇ™'æ¢Ñ++#5ã6‹{Áìÿ…IÕH™®ºÆ¢≤ SÚT>€Lôk@gm$Lû¬¿øq—›[Zëá¢ú0∑^ZÔïáG&.S”\»vª]Ë˜\àh·	l√∑¯ò8∆∏õR†1‘B{°3ü C1ÂËèFã&—hP¿å&Gã5çcy5e!∑çÒ∫ß°÷íÁò‚≈2JMê]™(såò~fD±By£Kso Ã(áÄ©6ÎƒÉe"3r&.’Ø Ell &¬ ÁïZ(µè'∑…kíi”Aìµ5abÖµv]⁄©òıÁV™•UfV≠3Ü™fBÓªìr{ı…%•@≥ªeGÿJØß˜¯›
çV;£Ä≠.¿úÚPR¡≤¢»bYz£*Ñ^=í™í,!}K[QFhØ≤KçkáYú€âÉNH£ Ûúo∏Døﬂ-Z'˜ı<!peöË√‹Í,/ã9Ä⁄ÿ|ùå©ÊÆ≈x£™oÈ[≤Ωª{≤◊ÔìΩ£”ìIèw∑üë˝„Ú‚ËŸÒŒGO»ã˛ﬁâ‡Æ∏H|Å>a,yS}π‹L_ÆK˙‘”G–ó/WWêò ÑÅÆ‡F%©…VTœ◊ ¨h Ÿë–∫πîï€´›jôä¿…q‚äBœ¿éùX·õäbGAÏDevåKV∑º4øUππòöªFXfÓ√=0ÓmÒøÆÀRºuÉº\i~ómâ‚|ñgÛoø˛Ω4IUS◊®öuvóŒ	≠Iä´õnÇü=êEÑQ¸ 5ÙAA}x]k`¯ˇËÑ@[Ú5°z·SÌ∑m;YJ /h*Z˘9ÀÓ©“p‘KzòÑwfìPŸ1ı;ƒõ`ëM⁄Ö=o7ºÆ^ UM«Å_2©·®¬™PZä›uEÓ v•°¡XØ£Jgt~Ù5IPÍ«yÀÜ6;.¨i:i¥à?}¬gø√∆viå·qãXúVDiólè∞ldΩÖˆ–«ŸŒ]ú€√gm∫£nTŒCÈìﬂD$ä√d'ËÈN_Ü˘CîFÆÖ≥óü"ÆCZ&{eD1wBLû"£+J{·:QW…ú•ƒ
Ù
M¸>ÖÆI}\8”kóı¶ø^T¨jÄæöÔZ›gLW'KQ2ôs‘1≠üµY"áú)‘Ç+[/~kÙ^qØÃÑ[:L‹PãÈƒ∑“íL7ŸA‘vÕç≥2äﬁa úINÉsë<IºÅ¬$⁄µÏ§1ÜöPF-˜◊TÀuKÂû›ïp˜nˇ`÷LÇ'ñÁ~3Äı®˘‡vÈ‹≥Ä(Ëíµ≈î™À+ã‰–Ç•¡I`iì"~ü™ä>…dHW®¨h™ö¸ÎÃ*áã±^›ø:mUsñŒVQs3ı&£>v=ÀCä¸Ï⁄ã‰x:fﬁ∆§?iÀ?>_ØˇŒ◊Í°»ñ6tΩ‹›ü:C∆Ù¿gf*Ù[∑≠kbrlâ¶C.¶ØnŒ¬lÖ?7ˇrìó
‘ìxT[§.?x'±¬–ÖI“®=ºÀw∞Ωµä(8è∂.V}≤q‹_Xı7Õˇç7˝+pÉohBPzûá0y†ñ'œ˚ÖÂ‹¡ §ßÆ©¶…dä4fü™xcˆQÔ∫„"õE∫rwÿùHq’ 'd¶oÜësÛÇ!Sá»∫5°ÂÙTøP5˝Oay/»3–∫Ã´Û€ØÛˇ◊ﬂ¶7ˆqY›~f°•˚Ã?[–b∫ò]ÙØ·l¸ßsZS≈Ü§û•Øóÿ˙~◊âù!™¿π˙ë.Ü‡CË§©~ÆË„Æﬁì6≥x‰ﬂT+DU9lπ«8O?ùsπ∆n6)Ó]Á˛zµ„ïg÷àAP∏yÁ`jâÅ©ı¿l¿ãÁÑ¢IÜùòmKDS◊7 )≤ ”ƒÙ¢÷á˜˜7d;›Iß4Mœmz4∂lB}d±w1i1}◊ùxÍ¯m0vÙ÷ÉÃ¬ î‰[Õ¶|/Håpz˘óÉ^o∏ﬁ”ÊNÎ˘„•ùØ·3#k±ò9n˘1Q˝®”7Í§ã˛uÍRÛm2x)ïﬂﬁˇ√ˇFŒìá˘CT}o≥öD√nïj•6¢:ﬁáËÔLú–Ú–"ÑaJplE	ô>aF¨≥Õ2	¸ÄqcZÁ›`?JR·‡=Í∆¡>Ó•∂◊.Â˚˛Y·æ©·»Ñ’"?ıƒ~ ¢°º1h.9ƒx¥öñQâ+XÔ0Àµ°uiﬂº.ÉÇLL”SÊ¡î∑ãü*;C/~¥G4Ëç%µ5gòvı“•`^Mb6ÀƒuL••˚ZKoâÀ/q_ˇ@Ö/∂…»∆∫•â"cOóç#kç´}ˆ[◊ç0ç€t!º≤—Ωª∫≤™>:Ö7◊º<°ELn-ˆ©vn±Oa≠Œ[g~¢‡Nï ù≠-Ç√7ÇuÜ⁄Ñá`ÀÚÌùñÃ?%GD»'ãTÇ¶ë-RÙR–fµpøvjÖë≥ÔV…ª- ^ÖS.À≠j0TËÛ&qÅıé⁄ÿ@+"~2`äŒ#Å^õÿz3ú<≠Ã?€,ÎÓ™Á*aUkﬁÃü≤¬kΩ ŸõBU¢2])7ã∆ØRÂ)dìmd•∑]®˛ô(U6ÓvÔﬁ][ª•RÖ∑n©Vi-©‚ü˝ˇ)UJB∏¶ πiÙªT)}ÃÄˆ˙õJ€Õú†Tæﬁ<ñª"	≠8ıa7¶•Aıí†Ê10u√•“˙‡G©†)R*jÑî
¬!•í¶†Hˆ—Ã!MZ÷ºÒÔ≤è‰#F¿„G='îë¯1≠ì™ìVÉ¨ÎYï^(-%Àq„ÇË*Q„°¬)ï¬≠’&lΩËFz¸ÿ◊Ñ9˛ˆÎü©?à^MC?ºˇ˜ˇG©sMáì)!ÜÀ'ñ]!å}Á¯‡ànm?Ÿ;‹;:ÂÅÏB‘˙ËMë‘?N‡˙ßIÙ∫%ÅÎ;≠±ÎXt{Ç»t©Ωﬁ”óCÀJ)‰Ïƒì´Ö‹ÔÒ‰ç„…-46+6xqÄ…c«c4&?YûÁƒÑù|Ä«)d 5∆Ék¨˝[©íÖæbÃû⁄fdOcxqI$uÒpRd(›†‰xßÖ?ï»ü&ñ|€ö≤xÌ7HÙ'z≥‚PFhx∂-€^ É±KﬁXÏ˝É=0:œJ0B‹NÜ1iáŒ¶õ™ÿEÎF\◊ûLèP’∞ìÑ!∞ylyhèî∞ZTÉêHá^”Ï2É¡wÆƒxR¨ÍmîaÂpëÅM`T˝¬q2Ï,:h=Li√ô®TÜ0M≤MaW8–!£*=ÆB	¶¡§∂Ç‚´Ü]úX≤„P”ŸÿñÁ€bñµ–wb‹ é.˘ƒmS4ä∆OÎŒÕæ‰âÊ˚5Ûÿ”ëNÖ–ıÃ1‚ÏE˜#N7ƒ “0zOLœû÷C9—)ˇ2ÀÉ≈ÆhgπÚÖ?ñêû£îY„Æ9n:ÉYÔdK*ÊAR/©&Æø’ZVﬂK—«ävüz≈´ƒìF
o{yëìHˆ…ÈŒ1/8,˜®÷«Vã1ı≤ñ/ÿÁ£≥£è˘Ø23Cmòó0{∏TòÊE™¢·¨´Õn˚‹9û≤√Ì“f√Ó»eÉiÆy~ËÊ¬»V4Õ¯?_’äŒ-«Ê¶A»^0≥ºx\Í'õîŸp0@…ı>—õ
∂Ω˝ÏøÕ"∂kôÑ çÚ*(Ωˇ_Bmd‡‡]f4?¶+@ekÆÍ∞ÉëÈûá¡f
–VÀ¨ıœ¨Dhæ;íHW>‚•[§g:ÓëÙÿzkêlÈf·smQòﬂ—˚eSú;›}›~s+“Ö≈∏È*2–…a7òqùÆ;∂HSCSﬂKˆﬂ9œ+œTgoQ~sG	CÕ˙¡—7ä+F<`¥dÚ%ïgçrâE	≤)tG˚»eÿP& $:£8'Ç`Ì∆°;ñ|˝€?˛WåÜ£G2¬âeMﬂ8‰úπ(ÄÎæ*3‹Bc€%∂Æ%o‹[Õv…ë5≥»ÄØù‡˘ºó¥Q˜µû‹å™∞†FíÇ`Òò†fîı≈µ*hâ√p`o*á¡¥Hc§hú‡ˇOº´L9vÀÙá'⁄DÇõ eÔ“fgÚ.òÄÚ–
g701íé¥b@á¬Äbv8¢4’‘ÅsyáA+˛µaÜ5p©ÚŒ692óÀ–}ÀE‰÷8H2C6«Z‰;’§‡RÜwé\ü˙ÙØR	MÜBÿL¸÷ﬂ!£V	_ÕΩçÉœ£ùyÕõ8™»‚:ò{¯Q€πø˝óˇòöt^∑i4&∆∂mcö∫Ì~∑.æÎ‚Ê5±ÎÉ‘FO}[6nP3xˇoˇ9LVh·lΩS‘—Å^3C[∂ΩÃv™ñÔê=ˇÁ`FfAÇG™û[°›!ä˝π)„gËÄYhﬂ˘ÃµÒØ÷´‚(‚º¿µÁ˜bT\sh‰[§vÈN…ó£tÖ8*ÿ_@BtÓØBQTöóU≤ˆyËﬁøgZsâ™–j˝[æ3ÁIÛı£$Nv˜NHˇt˚¥OûÌÌ>Å•@âà#û Â4?:∞i∞Ñ¨sôà.?¸Ú:ƒØQ? ÁuÅ?ÌvõùM@Ö:QΩD`G™¿Âö3h~úÉÇ¯XZ¬sâü¿b÷aòMŸâ5ùÓ∂∆ıD[&uÄ^ÀŒ–∞P28∞çAó>∫£Îîˆåˆ<ƒπS>È†x/?~¡pBP‚`DééO	Êx ﬁ2å ®{âû4 34ÍE¬˙Ö∂¥Lbûç‘‘g%8îµ,‘BÇ¶É∞¥<≤]!1v;.M6P¥}Ÿ@—#-∑X(.Í§”‡–ı<7Ç¶§^ëùîf€‘˙∫ô*”ú©¿)°≠∫¢›%ïF)SnıÉ-ÒM*a:◊¢(Ö≈_‚w^⁄åy≠Ã≤“Mœ5Ã¿êò8£–és‰.£‡àÅtË¬W™ï›œûcU—√?Ts 0ïÑÒΩÍ∞JÏãS(:M[(ú¡(Sù˜%Ä{ÙphCnÌta∏ûÇY°ßåˇëXà”;Ô√√-°6±Ï%q`Tµ≠„*õÁπó∂Ü§CÓío… ¸≥—KˇYÓız’Ì¢’4hRzx^ç6≠ˆ>V£6Í7j„•ôb8õ@ıhg⁄*((0|¶8—†›T#Ÿ`˘Õ‡Q,Õ(zÉKåyh“Éà¶@ó∏öÎ«`i≤õﬂfÃõ<Ã_º!$øÍ(òâ∆a‡´Ó2›∞…P˘_æD C Û≈•–€í<ËBg˜¨·¯„Õ¸îå±√íl&g/Z¯æT√Q≠j£<o•ègßãÏ2j£ı‹r¸Œã~K^–Õ@«ÇÈ‘sBw(-æ&x¯!‹}∆“=‡·9ë›T˝≤&»⁄Ú!>4æ>áËÇßWÓ!1}2•Áæìïµæ¿Ç/Ñy%O8}IdIwe[()/&9Ûˆ‰ÎúwK◊E÷-›L9˜Â´¢ﬁ,ŒÍ¬¨“u®KFæ€"Àﬂ◊{Ä∂Ä1´˘Hﬁ|’|ê¨”$√D”(˝íÄŸCG[8L∂çµÖ†¸Äa€mkëJ”óã@j–â€t˘/Ä‡Æ[ŸuΩ9By9¬®kƒï—Ÿ#îÕ3eêŸÎe±√éN*ô+Ö«Ÿ	%™ß”„≥¢díü_U«gïfﬁB—<PΩw'Âö/Wê=kè<üEKG{)ı™é}_πh;¨ŸÎ«æ_WÙ;ÿº0Óººﬂ{;Ê˝†ÿ@√†vd<èåµ¸H
Q∏πÛök…c"›7x§˚ë"˝J	=48uEu:S!ÃÚ
g\<¯É"dZuÄãn¢ˆ«j Érd≈tPIYÃ¸YZÓÒE!pEÓπ”A`Öˆ3u≠ÿ◊ËÎÜÑ“•◊≈1Í"©¡Ó}.◊}}"≤&n*C/<q¶†»3«>(b√UÒÁ∫tE¸y4
ùõ∫Ñz/ÌxÎ·EiπéŒ‡4äî¥À˜ôOXµc°à77;Ï§´Ë|{ÿ3≈^öäØ;Àπdöu,ƒÅöŒ@Ñ¶a‚Î$Üû2‰¿r„J∞	L¡‘ã^™Õµ¥°?⁄qµ~ª©MoÁ0#ç¢õç©*E,∫åµë„ﬁˇ›üSd§›$d!ÑÌ√Ãõ¶Aﬁï‰`^ÈJ˝áÖrØ∫>Ê˝•vã‡Ç∏ˆ&˜å,Ùà?….®Èˆ)∫1Z`JT=œ|ywY?9ŒõZœsGC^¡jè’@OéØU≈Ü\≈ØbÖ?’™ñÚB€†˘¿îµOæÍN¨iªç¸K5∏¬™`Èç3€∫¿ö∫ÆˆDf¸‘ÖaRJõøqpœ ÙŒúW/^†Z§aØ¡ï€tﬁKª;_ôQû!ﬁ„cÙ4MÜØ≥Ç9!Ié:˘—ÀzåB¸\æ÷S›Ñﬂ¡¯Ñ2™æÇ*å)]Äº>	E/ÖJÜ9ƒyÃµZ◊ÃFkõ•™h]új§
?◊dˇï ˛®–◊È[^πOÖMYzvÙ xßgZÉc ª/˙aVEã˜KœÁ!„¸%ı@œAÕèsU_>åΩdà’=É›Ä≠°’È•∆ÏËƒÅßô•ãŒ∏o‹ôE∆âïnñ—ÑDXN\#FW2\„àÂ›≤)ZÿY2¢≥©iD1âLâÀ(ΩÂT∫â≠J3Pl€z3›îp(á7…EÊm5»-su#g¯∂=˝<™®%≠Ñ{˚çumV‘•}xAÂ6 ≤Í9‰:‡`P¸≤5˘¡ôÒ|®πíV2téïÕ)Â~Ãë™˙Úû2}YüÄ.#,M(Mk6 Ò›Ωg?ÓùÏÌíìG˝ÊvΩ≤Ì∆<tû√SÑ“ZmºPyBuöºi[_ﬁì®\ÃÕ[´m^± ≤”ùbh‡µ__è's'Œ∫ƒñí{Á≥‚Ã”„”Ìg‰¯y∂è_ùﬁwJÁ ™∏3OÊ’∂òfL+‹Ó∑àUìI¬ΩyÁ|ÃZè5sh‚^â9≈{ü{Ómü°‘§Åf˚{{§˝√ˆ·ˆﬁﬁæë∫\öl√$EÂ§sÙÂ7·ÿ|√Êˆ∞≠ù8,“ÜåáL≠Y†Yz\k‚¸.[xÓÑtˇì≈0Ñ°ñçë˘ÈbNm[œo=∆ÕùxÜM´P	©´Ø‹›«°cΩ±Ésü¥OÇ_,ﬂ‚ﬁÒha&`˛Iâº‡\eõ8∂õLZ€Ú∆-ﬂ„º‰0ˆH`j;™^µl◊TL*=Ì©Ú¯
≤	‰÷=CB∞mEcy©ŒéœàR»NAj¥s„ ÇÈ¡Ω≥X”Æ`ê‰ßyﬂÇ≈Õ kÊ—ü‡`8ò3›âÑı2éz…≈vñ´˚∫£»3ºPÂÅƒR'#-ùnÃ_J: ËsFÄ3q¨¶¬Ê:π˜´‰$»}}†hÉP/ÇUî¨ˆ˜˛LGÒ*Áhñ°.õÌ˜*é	†„T§±˘ıïË¸bDﬁπ‘néô†tÍ¨˚}£Q1ó$˜,\ßd›≠t}BÒŸJ•∏∑∆Qê{^¢r}C…¢Æ∫o
¬ﬂZc«&{Yjì¿≠á,.Ö“ò¸à·<F¨√K§É,ƒcœÚMVáD«õ;Uú¬_e∆·ûõæE≥˙&âLΩD„mˆ¨–wÏk¢±h 
≥U∞XzÁëb◊CÙÍ˘ÑÊﬂ1ì∞≥SÏ‡obáò,iËãl≈—“xˇ≥Wjt%)ûW^ß+ù*{qM∂¡äÂ¯ÑªπÅÄ—µFWﬂÆıWÓ)µæ(¿+ñöñ@68å+x µË˜Z®ÁY¨„§π/Ö®2ëΩ\bìHÒ‘˙ó–5S[¯∆ÍÁQk∫On›∞6∫v¡∞ëpjñÓñvÍ·í—#<BdT◊Vc•©h{=îøà&)òC"jæ@y~R&˛˙]ªjùpS∫ì
≤—Ùv›hÍY3*\lŒ∏µƒö±¬l_]cÌO◊Yc^»‚9¡tßëA?Cb¢ÔëàTwË™u¶P∏÷8#ﬂF„–ıﬂt
Í≠1ﬂVQ*Ûl§+Y:ŒõÃœ¬®"Ö‘“kyXÌ’9°ôi\ﬁk@	¬ôy˜rag∂w≠ø)Œ®VÒ˘áÜ¨eÆ¶Áuª˘ä75,-0†-gå»g]ì]húŸ‘KÕª,˙ı[˚y:‰9u≤-‘4˜¥ÔìÃ>â•Sdò˚ãõ~;5iCm©Y∞‚åÌØZﬁ’≥FÁ∫›8†EQ^'¨çÓd¿p2O$ﬁdÎÍÄO#≥ØU˚0y‹s˝¢
q÷ùUë]-2]y∫¬Í|GV¿ΩÍ∞ä∫¡X´PqÃé@3⁄èAkëhPHyá√ µsm¢6ÏŸπ√,zÅéS[ïõæXz¿iÂ‹VÇ?Ë∑÷¡E∑ö∫AqñÜ0t<_√;KøM—ö·[g2ﬁ~˝S4T#˛·˝?˝3aÁB~ùFºPBí6˚ÔƒÅŸQÉ‰ÎeâRÖêç–ÂB[ x»FV≤,
«∆Ä›BAZD¿.(<õsB5»B<∂0≈–è)Æ{åkYLÌÑÖ,u#¡ /∞A9ÎoÃ√p›0
;áuªYü"Eß(úÆ[i«∆VtÄÖ∑∞°îˇ–ƒ}˘
3Î&é4¨ d∆õ'˘0—pœ¸]G›ÜÖ¢Ë`…—∞ƒxf3=”e◊≤ÚﬁLKØ≤C⁄ÈÂ}Ï(*X˙7é_∆≤‚T*∂ﬁëÚN!è≤,M$Âùøa–
ÇY/6ûTú”ÊõàËB∏2`Ïë‹"ÁÕù¿πG%Én>§OyÕÅk/SΩ*“ﬂùW˜ËsÅæ»õ¸EÅ^„«%â4‚Èòô0Rà®
…ÑOÙËò`∞PloIn‹PVº;FD“…ﬂUŒ«v≠>¬ü]"m®,‡)¨¨ï¡7tùÁ º˜Y˝§ºjS)JÜ¢éªuÎ»`-ï¨ˆÍ÷≤a®e£PK-Ó\ÌOL·§ºI&N∫√<tAg©cÑÒﬂ€dìxµî˚ú=uíã*û˙‹3ñ*$*˜Jô‰◊$πÆã∏|·ù¢¨Ãw<ˆ|
‘Eá†H–Í‡î™CMÙ&û-Åf'XÉ÷ô”RUÚ#uRÛÉ‘U—M∂4Ô:´BRùŒ?≈àwQç £ëìMãÏ}∑€∫¿ô•5-t⁄H∑h”¶4ı˛[ˆ„è	4›çg≤
H¸›V^á≤òDk(œh Ä3–Ò6ø≥†¶
WN≈Ô∂Ñ6 ‚ß<7î0\y™†M±L>5p,ˆWÈdΩ4(¥Ë–NgÀF€óègch>ﬂ¿Îl`®^S›â‚x´dIΩ&@˙Ä¿ód›åsÏ«≥]ƒvëA|J–=L	Œ2X*•«˜lè¨'‚I€Q_ ]£π!WZÅ¡£(?√ƒÖy–wŒÁ“QAÏ‘áﬂ)ﬁì0}§-Ø)ƒQ…˙RÃQï¡°ÀyÇ]\†ksÏõ"⁄çåcc~M	#FZÙZﬁ„†2AS\ä1ùÇ+‡–$‘ÂíÅ)Fxà»»≤vf∞-cÜ¯ª~À∏¢Å~+Î®∫ÌfîVKE∑Vw)õ;º~V„=◊£«Ív®±6+°Bï °ƒW_Nè“Õ|Ò˜åD	1®oCNÂXbH∑ë≠ÖJù‘´ﬁëc1H°µR¡u“èç"¿ê‹&’˛∆rzrlDTó.˝ƒßßée◊⁄`™#—ÑÕÆ!sÆ	ê¶à Ï48í’åæ#Œ*fº2M`¶ik%$7”ƒJÏøI.R1ÆŒ€º<.aJa'‰2Î LÉLÅR!‚´ÒEÇ{U‘ß∫ƒ<q‹√ê£#g}U√◊á¿1moˆ;µv?ÌŒı∂ç‰Sõ’ÍÔ±πû;ùπqÍú⁄µ∂öãëo2vèÊß(≠¢…&˝Á¯Ω@>¯≠⁄†ÆÉºeÜø)¬‹®ÂÍ:“„í;öd·MÍ’⁄/S»õ∫&«†…°d®∑ˆ¬£PEπ¿Ç+„ë!œ¬åÚB√„ë.B¢<GNJŒG|ΩÓy	§eïB¥—L∫“Ëo”)ÊÄçÀ4iüHqYD9-l!g„jÇR—·≥‘Åb—¡∞ËS∞GÇKO¡ípâêﬁaåÖ∑ñ	!â˜8Ø±õûHºªëﬂ]…ÔR4"$®&¬ˆ¢äã—ÖÑ’ÜI∆jîRyv¶ • éRﬁ¡´îf_˘|]Äî"8
Ê<—SÄE<Üà"Ê)¨ÙJX*5è©‘‰ﬂ—»„4ê<F »Üàir≤•tz3ëó¡Rl+∂ H)sdDﬁ/Â)K·£i¸°óÄÕ(mÛ›‚9r^ïáΩÍu2ã˙xÇ9E’ö∑îzj2ˇπ¶E€êÎAï›,Å\±æ¨_5ç9≠B‰vIÛ*`∞¯û*›æ2ïä¡±#˙ıÑÄGp!Ôì]Í≠ÍÚbfõßAßi◊ÿÜDûc&~§ÎòVÊ™{öÑP©r¨Ö[u®˘{ı#Õ»!¨û®óÂ¶F:Oÿó6Unrƒ˜ﬁQ˘ëÄEΩu|;£oòäº¶°w}€=îC/‹˙®Cœﬂ´zv[ÓÄ∫ÜAﬁY1ÍN√˝„4‹häÅ¡]√ Ó6˘öË5o‹Ö†NÂ∞ˇêx‰kba¨<õ˝òIO%æêB‰+¶=ÈË7˝ní/ÿÀÅ˝ìHò ƒwbœQ¡u8Übp–l`AÜNëßiT"9áâI$}ZÇa…(p⁄T3c“æ%$√ÁH—ú!8GÓ…(£†∏CƒU®ÇQûΩirQã_ôW∏Æ æêÛ—e˛sÅΩ›°∆¥?àÚC ¨`∑ã^B0f¡pváLxWÌTNÜé˚÷2(åu-Ü¶oÖ™	zQÚÇÀ›F∞∂á!˘H{É¡ÈÃÙû|=!ØÏè[©úyy•Õ¡2¯ÛºœÒ¨!Ω?u¸Í˝˚ÎdK’Î®ÅNQ+sMN5”°^˙Óï†JπöTß}°7@Æ\Ìﬂ(&ƒ«@Ç®∏mkEÖF≤≠à1á∫Óü®â˛Pç˝∞rÉÿWB~¿∏p,E˝‡v!µ¢Õ0ºŸY›¸È˙Ëê¢vx∞º&hG_˘'‰Q}ö§∆®>∆C∞≈ﬁ¢ß
t.ûïëïü• Z(ü`Y˛d°Y;Ï‡∏JÄèz¡>∫'´Ätœ5

R}ƒ>6âR}¥QBU/÷Ñ)ﬂQY¶™DÌVä-l¿xıœj1·e’©çÛ˘"√‹0.Ã¢¬|jLòÎFÑπ-x0M0?>6Ãµ!¡\u¨?"ÊÍ∂≈!ˆ≈ s≠h˛¬y‘(y∏óäÕŒÂ‚fg
ªX‰eN)ñy√Ø*¨$Á€ö5;ÛÖ3¯ÎZõ ™œEQ◊fgK1M{`ø´i<ß¥‰\‹èCPÊØëKø∫®ß®/_◊1Kÿg~∞X«ï≠∫¨2}øï¶qŸÓ√3>ˆ1äπΩºpI⁄_]€óµ–Ä0mCuÛ[˚¿É‹Å¢"nÙ˛⁄eÎólÄÃó~r;å3Ûe•m#Løç“ﬁã).X€Üíé ,õã"Îø„gl˘Õ!€4Ø*™ŸÃΩ≥.¢øãQÃ—ÄF∏q5Äù“O¿”Ô7˚∏Sûp|õõ/¯ç“04D9UøFŸË9ˇvn 0ÓÂÀVa7áx› aµäU0õô≈Æ‰§4<¨”Ì{ï∂[ªB@ˇÔa70$5 ¬2Oj;ÀM¸ÏÛCànz8‘¡Qˇ˘ﬁŒÈÒ	àö›„~ˇ ÆÔn?$Œ´≈<,>ÊÛ∆AxÿñóΩÖN9∞‘ÿ]ûMû≥ÅOÎ‚Œ]	dFòÇ|8(îîÂ∏å∂–e‘OÑX€s0û‚gË∏”xÎÇq±x--ªÙ∞LíìΩùΩÉÁß0t?=›>Ìo?^¶mØKIäP∏ß°Üâ‡5#=J•€I J¶¥*`íY8d-e/≠)¡ty:+ûÉ ˆ¶ïä˘P*-ƒ ª)v"+Zß/ áJ]r}òºñ˜Ãä∑h&|!è¿æXL¡Eå,A)?ÈüÒ'˝3≈ì˛Y˘I0Ë=Lä·«wg§¬∏Ø2¯º˛pÏÿâ(≈¥ê¿Ô[oùÙQË:®ãE‚·Î$YÀÛv†X÷êÈÈêŸöñÇPâ∫‘eô©Îè"∆*6øRq„»ar'|9¿Ñı—˛ôTÇçDãƒHbX|wé∫õvØ5ÌM√Ç2’C“_Ω_DpØ>ΩK≈çÙN|t0Ì ã"ƒéÉ9Û»0=§‚8Q‰‚∫9Pú∞©¡Í∂ƒ÷>ÍN«∏GçËI¯ª5˜Ùx!4Ø}A“¢∞’Xlªáéü<q|X:ó4V>R±Í±P<Pçƒwˇò≤!B*KóÚ“£ ∞w¿û<0bÎ¢¯[≠´^ÙAU˝x¸bÁÈﬁI_P„`pÏÌ*¥x™ùa|~L≈a)¸ /ÒªU}ã]_¨M¥¸¥*Ω¯HŸ‚∑<èﬂRºÂﬂ0ƒ"/îÂ9Mö£Ωü]Nˆ∂üùÓ!`‰¡˛¡ŒˆÈ¡Ò9=ﬁÓüäÒùsl¬iÄ;˚@ÒwÛ∆$Í(1ÿjìŒ°˛¯¡V¿ˆúÚ¯Eöb
VÈ/Æ?Ï‹œ∂sﬂvbŒYû∆H.KÁú	8Çuöo‰≠f°lëÁR\É¬Në„+øñor–M¡œQi˝∏7î7˜tÁ0∂˛ˆ∑ˇ≥Ïè(õ≠•ÖÛÉÒzUp1¨Ëˇº'Fü{]§Ä#kfQ'|ª#õ‡ä›£úéò¶'7H8≈±∏ï¥\>YkbÀÒà•µA ‚••AŸ„Û`iº.])„
 k K‡å˝Q M”ƒ‰fπ5Ö˘√ƒ˝•‘Çieƒ≥Èõ◊ÿõë.f‹˛∆Ë±ëÀµë∆uácÛû8g 8h.ŸÆRq6Îö⁄(1f·'óRŸ5–?óÒˇ   ˇˇ ÑÏ«L