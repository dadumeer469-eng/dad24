import React, { useState, useEffect } from "react";
import OrderReceiptModal, { formatWhatsAppPhone } from "./OrderReceiptModal";
import MapLocationPickerModal from "./MapLocationPickerModal";
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
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  increment,
} from "firebase/firestore";
import { db, firebaseConfig, databaseId, cleanObject, storage, handleFirestoreError, app } from "../firebase";
import { recordCatalogChange, recordCatalogFull, clearCatalogDelta } from "../utils/catalogDelta";
import { formatOrderId } from "../utils/catalogNormalizer";
import { DADU_FOOD_BUSINESS } from "../utils/seoManager";
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
  ArrowUpRight,
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
          
          // Max dimensions for restaurant & dish thumbnails (under 25KB lightweight)
          const MAX_WIDTH = 450;
          const MAX_HEIGHT = 450;
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
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
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

  // Static Tailwind classes only — a dynamic `bg-${...}-500` template is never
  // generated by Tailwind, so the upload progress fill would be invisible.
  const accentProgressBarClass: Record<string, string> = {
    amber: "bg-amber-500",
    orange: "bg-orange-500",
    purple: "bg-purple-500",
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
  };

  return (
    <div className="space-y-2 mt-1">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black uppercase tracking-widest text-white/60 block">
          {label}
        </label>
        <div className="flex rounded-lg glass-dark border border-white/10 p-0.5">
          <button
            type="button"
            onClick={() => setMode("file")}
            className={`px-2 py-0.5 text-[8px] uppercase font-black tracking-wide rounded transition cursor-pointer ${
              mode === "file"
                ? "bg-slate-900 text-white"
                : "text-white/60 hover:text-white/80"
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
                : "text-white/60 hover:text-white/80"
            }`}
          >
            URL
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
                ? "border-[#E21B70] bg-[#E21B70]/5"
                : "border-orange-500 bg-pink-500/5"
              : "border-white/10 hover:border-white/15 glass-dark border border-white/10"
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
              <Loader2 className="w-5 h-5 text-[#E21B70] animate-spin" />
              <span className="text-[9px] text-white/70 font-extrabold uppercase tracking-wider">
                Uploading Image... {Math.round(uploadProgress)}%
              </span>
              <div className="w-full bg-white/15 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full micro-progress ${accentProgressBarClass[accentColorClass] || "bg-amber-500"} transition-all duration-300`}
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
                className="h-16 w-auto max-w-full object-contain rounded-lg border border-white/10 shadow-md bg-black/50"
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
                  className="bg-slate-900 hover:bg-slate-800 text-[10px] font-bold px-3 py-1.5 rounded-md text-white transition-colors border border-white/15"
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
              <p className="text-[10px] text-white/70 font-bold">
                Drag & drop image here or{" "}
                <span
                  className={
                    accentColorClass === "amber"
                      ? "text-[#E21B70] font-black"
                      : "text-pink-500 font-black"
                  }
                >
                  Browse
                </span>
              </p>
              <p className="text-[8px] text-white/60 font-bold uppercase tracking-wider">
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
            className="w-full p-2.5 glass-input border border-white/10 border border-white/10 rounded-xl text-white outline-none text-white focus:border-[#E21B70]/85 transition text-xs font-mono font-medium"
          />
          {imageUrl && (
            <div className="flex items-center gap-3 p-2 glass-dark border border-white/10 border border-white/10 rounded-xl">
              <img
                src={imageUrl}
                alt="URL Preview"
                className="h-10 w-10 object-cover rounded-lg border border-white/10 shrink-0"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              <div className="truncate flex-1">
                <p className="text-[9px] font-bold text-white/70">
                  Live Web Preview connected
                </p>
                <p className="text-[8.5px] text-white/60 truncate font-mono">
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

const parseDateToMillis = (val: any): number => {
  if (!val) return 0;
  if (typeof val.toDate === "function") return val.toDate().getTime();
  if (val.seconds !== undefined) return val.seconds * 1000;
  if (val instanceof Date) return val.getTime();
  if (typeof val === "number") return val;
  if (typeof val === "string") return Date.parse(val) || 0;
  return 0;
};

/* Smooth count-up for stat values — counts from the previous value to the
   real value once on mount (~850ms, ease-out cubic) and animates smoothly
   between values on live updates instead of jumping. Respects
   prefers-reduced-motion (shows the final value immediately). */
function CountUp({ value, prefix = "" }: { value: number; prefix?: string }) {
  const [display, setDisplay] = React.useState(0);
  const displayRef = React.useRef(0);
  const rafRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    const target = Number(value) || 0;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      displayRef.current = target;
      setDisplay(target);
      return;
    }
    const from = displayRef.current;
    if (from === target) return;
    const start = performance.now();
    const duration = 850;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = Math.round(from + (target - from) * eased);
      displayRef.current = v;
      setDisplay(v);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);
  return (
    <>
      {prefix}
      {display}
    </>
  );
}

const DEFAULT_DELIVERY_AREAS = [
  "Shahani Paro",
  "Moro Road",
  "Station Road",
  "College Road",
  "Makhdoom Bilawal Nagar",
  "Civil Hospital Road",
  "Degree College Road",
  "New Bus Stand",
  "Kacheri Road",
  "Dadu City Center",
];

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
    | "users"
    | "seo"
    | "food_categories"
    | "loyalty"
    | "vouchers"
    | "settings"
  >("analytics");
  const [selectedRiderStatsId, setSelectedRiderStatsId] = useState<string | null>(null);
  // Easypaisa verification in flight (order id) — disables the Verify /
  // Reject buttons while a verification is running so a double-click
  // cannot double-verify or double-reject the same order.
  const [verifyingOrderId, setVerifyingOrderId] = useState<string | null>(null);
  const [statsTimeframe, setStatsTimeframe] = useState<"1day" | "7days" | "30days" | "60days" | "all">("all");
  const [showSettledHistory, setShowSettledHistory] = useState<boolean>(false);

  const [selectedRestLedgerName, setSelectedRestLedgerName] = useState<string | null>(null);
  const [restStatsTimeframe, setRestStatsTimeframe] = useState<"1day" | "7days" | "30days" | "60days" | "all">("all");
  const [showRestSettledHistory, setShowRestSettledHistory] = useState<boolean>(false);

  const [allUsersList, setAllUsersList] = useState<UserProfile[]>([]);
  const [vouchersList, setVouchersList] = useState<Voucher[]>([]);
  const [inspectingVoucherUser, setInspectingVoucherUser] = useState<UserProfile | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [itemSearchTerm, setItemSearchTerm] = useState("");
  const [grocerySearchTerm, setGrocerySearchTerm] = useState("");
  const [userFilterTab, setUserFilterTab] = useState<"new" | "active" | "blocked">("new");
  const [receiptModalOrder, setReceiptModalOrder] = useState<Order | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

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
    deliverySettings?.foodDeliveryFee ?? deliverySettings?.deliveryFee ?? 70,
  );
  const [riderRangeKmInput, setRiderRangeKmInput] = useState(
    deliverySettings?.riderRangeKm || 5,
  );
  const [userRangeKmInput, setUserRangeKmInput] = useState(
    deliverySettings?.userRangeKm || 10,
  );

  // New fee structure (27 Nov 2026) — settings/delivery_config.
  // Food 70 / grocery 100 / medicine 30 / site tax 12 / night +30 from 21:00.
  const [groceryDeliveryFeeInput, setGroceryDeliveryFeeInput] = useState(
    deliverySettings?.groceryDeliveryFee ?? groceryDeliveryConfig?.baseDeliveryFee ?? 100,
  );
  const [medicineDeliveryFeeInput, setMedicineDeliveryFeeInput] = useState(
    deliverySettings?.medicineDeliveryFee ?? groceryDeliveryConfig?.medicineDeliveryFee ?? 30,
  );
  const [siteTaxInput, setSiteTaxInput] = useState(
    deliverySettings?.siteTax ?? 12,
  );
  const [nightSurchargeAmountInput, setNightSurchargeAmountInput] = useState(
    deliverySettings?.nightSurchargeAmount ?? 30,
  );
  const [nightSurchargeStartHourInput, setNightSurchargeStartHourInput] = useState(
    deliverySettings?.nightSurchargeStartHour ?? 21,
  );
  // App version (28 Nov 2026) — settings/app_version. When a new APK launches,
  // the admin sets the new version + APK link here; every OLD app then shows
  // an update banner the user taps to install the new version.
  const [appVersionInput, setAppVersionInput] = useState(3);
  const [appApkUrlInput, setAppApkUrlInput] = useState(
    "https://github.com/dadumeer469-eng/dad24/releases/download/v1.0.0-apk/DaduFood-v1.0.0.apk",
  );
  const [appVersionMsgInput, setAppVersionMsgInput] = useState(
    "Naya version aa gaya — naye features aur behtareen speed!",
  );
  // Homepage / voice controls — App.tsx reads these exact field names.
  const [voiceOrderEnabledInput, setVoiceOrderEnabledInput] = useState(
    deliverySettings?.voiceOrderEnabled !== false,
  );
  const [chatAgentEnabledInput, setChatAgentEnabledInput] = useState(
    deliverySettings?.chatAgentEnabled !== false,
  );
  // Munchi voice pace — pre-speech pause in ms, admin-configurable from
  // inside the app (settings/voice_config → pauseMs). Default 150ms (fast
  // reply, user 28 Nov 11:02: "answer sunke jaldi jawab de na"). Loaded from Firestore below.
  const [voicePauseMsInput, setVoicePauseMsInput] = useState<number>(150);
  const [voicePauseSaved, setVoicePauseSaved] = useState(false);
  const [deliveryTimeTextInput, setDeliveryTimeTextInput] = useState(
    deliverySettings?.deliveryTimeText || "25–35 min",
  );
  const [deliveryAreasInput, setDeliveryAreasInput] = useState(
    (deliverySettings?.deliveryAreas || DEFAULT_DELIVERY_AREAS).join("\n"),
  );
  const [baseLatInput, setBaseLatInput] = useState(
    deliverySettings?.baseLocationCoords?.lat || 26.7323, // Dadu city center approx
  );
  const [baseLngInput, setBaseLngInput] = useState(
    deliverySettings?.baseLocationCoords?.lng || 67.7744, // Dadu city center approx
  );

  // Store Controls — every user-panel option mirrored here (Admin Panel → Store Controls)
  const [easypaisaTitleInput, setEasypaisaTitleInput] = useState(
    deliverySettings?.easypaisaTitle || "Ghulam Murtaza",
  );
  const [easypaisaNumberInput, setEasypaisaNumberInput] = useState(
    deliverySettings?.easypaisaNumber || "03277004471",
  );
  const [whatsappNumberInput, setWhatsappNumberInput] = useState(
    deliverySettings?.whatsappNumber || "923277004471",
  );
  const [tipOptionsInput, setTipOptionsInput] = useState(
    (deliverySettings?.tipOptions || [0, 50, 100, 200, 300]).join(","),
  );
  const [priorityFeeInput, setPriorityFeeInput] = useState(
    deliverySettings?.priorityFee ?? 30,
  );
  const [freeDeliveryAboveInput, setFreeDeliveryAboveInput] = useState(
    deliverySettings?.freeDeliveryAboveAmount ?? 1000,
  );
  const [doubleFeeBelowInput, setDoubleFeeBelowInput] = useState(
    deliverySettings?.doubleFeeBelowAmount ?? 500,
  );
  const [priorityEnabledInput, setPriorityEnabledInput] = useState(
    deliverySettings?.priorityEnabled !== false,
  );
  const [cutleryEnabledInput, setCutleryEnabledInput] = useState(
    deliverySettings?.cutleryEnabled !== false,
  );
  const [leaveAtDoorEnabledInput, setLeaveAtDoorEnabledInput] = useState(
    deliverySettings?.leaveAtDoorEnabled !== false,
  );
  const [messageOnArrivalEnabledInput, setMessageOnArrivalEnabledInput] = useState(
    deliverySettings?.messageOnArrivalEnabled !== false,
  );
  const [firstOrderFreeDeliveryInput, setFirstOrderFreeDeliveryInput] = useState(
    deliverySettings?.firstOrderFreeDelivery !== false,
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
        { liveTrackingEnabled: newVal },
        { merge: true },
      );
    } catch (e) {
      console.error("Error toggling live tracking in RTDB:", e);
      alert("Failed to update live tracking setting.");
    }
  };

  // Restaurant Status Management
  const [restStatusUnavailable, setRestStatusUnavailable] = useState(false);
  const [restOpeningTime, setRestOpeningTime] = useState("12:00");
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
  const [restDeliveryTime, setRestDeliveryTime] = useState("");
  const [restTagline, setRestTagline] = useState("");
  const [newRestaurantInput, setNewRestaurantInput] = useState("");

  // Deal of the Hour states
  const [dealActive, setDealActive] = useState(true);
  const [dealTimer, setDealTimer] = useState(30);
  const [dealDiscount, setDealDiscount] = useState(25);
  const [dealItems, setDealItems] = useState<string[]>([]);
  const [dealText, setDealText] = useState("");

  // SEO States (real Dadu Food defaults)
  const [seoTitle, setSeoTitle] = useState("Best Online Food Delivery in Dadu | Dadu Food");
  const [seoDescription, setSeoDescription] = useState(DADU_FOOD_BUSINESS.tagline);
  const [seoKeywords, setSeoKeywords] = useState("Dadu Food, online food delivery Dadu, Dadu restaurants, pizza Dadu, biryani Dadu, fast food Dadu, grocery delivery Dadu, Tasty Bites Dadu, S M Bilal Dadu");
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
      setDeliveryChargeInput(deliverySettings.foodDeliveryFee ?? deliverySettings.deliveryFee ?? 70);
      setRiderRangeKmInput(deliverySettings.riderRangeKm || 5);
      setGroceryDeliveryFeeInput(deliverySettings.groceryDeliveryFee ?? groceryDeliveryConfig?.baseDeliveryFee ?? 100);
      setMedicineDeliveryFeeInput(deliverySettings.medicineDeliveryFee ?? groceryDeliveryConfig?.medicineDeliveryFee ?? 30);
      setSiteTaxInput(deliverySettings.siteTax ?? 12);
      setNightSurchargeAmountInput(deliverySettings.nightSurchargeAmount ?? 30);
      setNightSurchargeStartHourInput(deliverySettings.nightSurchargeStartHour ?? 21);
      setVoiceOrderEnabledInput(deliverySettings.voiceOrderEnabled !== false);
      setChatAgentEnabledInput(deliverySettings.chatAgentEnabled !== false);
      setDeliveryTimeTextInput(deliverySettings.deliveryTimeText || "25–35 min");
      setDeliveryAreasInput((deliverySettings.deliveryAreas || DEFAULT_DELIVERY_AREAS).join("\n"));
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

      // Sync Store Controls
      setEasypaisaTitleInput(deliverySettings.easypaisaTitle || "Ghulam Murtaza");
      setEasypaisaNumberInput(deliverySettings.easypaisaNumber || "03277004471");
      setWhatsappNumberInput(deliverySettings.whatsappNumber || "923277004471");
      setTipOptionsInput((deliverySettings.tipOptions || [0, 50, 100, 200, 300]).join(","));
      setPriorityFeeInput(deliverySettings.priorityFee ?? 30);
      setFreeDeliveryAboveInput(deliverySettings.freeDeliveryAboveAmount ?? 1000);
      setDoubleFeeBelowInput(deliverySettings.doubleFeeBelowAmount ?? 500);
      setPriorityEnabledInput(deliverySettings.priorityEnabled !== false);
      setCutleryEnabledInput(deliverySettings.cutleryEnabled !== false);
      setLeaveAtDoorEnabledInput(deliverySettings.leaveAtDoorEnabled !== false);
      setMessageOnArrivalEnabledInput(deliverySettings.messageOnArrivalEnabled !== false);
      setFirstOrderFreeDeliveryInput(deliverySettings.firstOrderFreeDelivery !== false);

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
        setRestStatusUnavailable(specificStatus.isTemporarilyUnavailable ?? false);
        setRestOpeningTime(specificStatus.openingTime || "12:00");
        setRestClosingTime(specificStatus.closingTime || "23:00");
        // Always reset the images — otherwise switching vendors keeps the
        // previous vendor's logo/poster and saving would overwrite this
        // vendor's pictures with the old ones.
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
        setRestDeliveryTime(specificStatus.deliveryTime || "");
        setRestTagline(specificStatus.tagline || "");
      } else {
        setRestStatusUnavailable(false);
        setRestOpeningTime("12:00");
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
        setRestDeliveryTime("");
        setRestTagline("");
      }
    }
  }, [deliverySettings, selectedScheduleRestaurant]);

  // Munchi voice pace — load the saved pause from settings/voice_config
  // (admin-configurable, no code change needed). Default 300ms.
  useEffect(() => {
    let cancelled = false;
    getDoc(doc(db, "settings", "voice_config"))
      .then((snap) => {
        if (cancelled || !snap.exists()) return;
        const ms = Number(snap.data()?.pauseMs);
        if (Number.isFinite(ms) && ms >= 0 && ms <= 5000) {
          setVoicePauseMsInput(Math.round(ms));
        }
      })
      .catch(() => {
        /* Firestore unavailable — keep the 300ms default */
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
          setSeoTitle(data.title || "Best Online Food Delivery in Dadu | Dadu Food");
          setSeoDescription(data.description || DADU_FOOD_BUSINESS.tagline);
          setSeoKeywords(data.keywords || "Dadu Food, online food delivery Dadu, Dadu restaurants, pizza Dadu, biryani Dadu, fast food Dadu, grocery delivery Dadu");
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
        "Alfredo Pasta": "Pasta",
        "Plain Lasagna": "Lasagna",
        "Fajita Lasagna": "Lasagna",
        "Malai Boti Lasagna": "Lasagna",
        "Crispy Lasagna": "Lasagna",
        "Crispy Fries 100g": "Fries",
        "Crispy Fries 200g": "Fries",
        "Crispy Masala Fries": "Fries",
        "Crispy Pizza Fries": "Fries",
        "Crispy Loaded Fries": "Fries",
        "Chicken Salad": "Salads",
        "Pizza Paratha": "Paratha",
        "Chocolate Paratha": "Paratha",
        "Cheese Paratha": "Paratha",
        "Plain Paratha": "Paratha",
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
      // Bulk migration — tell user pages to re-fetch the whole menu.
      if (count > 0) recordCatalogFull("menu");
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
    color: "from-[#E21B70] to-rose-600",
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
      recordCatalogChange("foodCategories", catId, "upsert");
      setNewFoodCategory({
        name: "",
        subtitle: "",
        imageUrl: "",
        bgImageUrl: "",
        emoji: "",
        color: "from-[#E21B70] to-rose-600",
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
        recordCatalogChange("foodCategories", id, "delete");
      } catch (err) {
        console.error(err);
        alert("Category delete nahi hui — dobara try karein.");
      }
    }
  };

  const handleUpdateFoodCategory = async () => {
    if (!editingFoodCategory || !editingFoodCategory.name) return;
    try {
      await updateDoc(doc(db, "foodCategories", editingFoodCategory.id), {
        ...editingFoodCategory
      });
      recordCatalogChange("foodCategories", editingFoodCategory.id, "upsert");
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
    groceryDeliveryConfig?.baseDeliveryFee ?? 100,
  );
  const [gMedicineDeliveryFee, setGMedicineDeliveryFee] = useState(
    groceryDeliveryConfig?.medicineDeliveryFee ?? 30,
  );
  const [gFreeDeliveryAbove, setGFreeDeliveryAbove] = useState(
    groceryDeliveryConfig?.freeDeliveryAboveAmount || 1000,
  );
  const [gAllowMixed, setGAllowMixed] = useState(
    groceryDeliveryConfig?.allowMixedCart ?? false,
  );

  // Keep the grocery-tab fee inputs in step with the live config doc.
  useEffect(() => {
    if (groceryDeliveryConfig) {
      setGBaseDeliveryFee(groceryDeliveryConfig.baseDeliveryFee ?? 100);
      setGMedicineDeliveryFee(groceryDeliveryConfig.medicineDeliveryFee ?? 30);
    }
  }, [groceryDeliveryConfig]);

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
  const [newGProdCostPrice, setNewGProdCostPrice] = useState<number>(0);

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
  const [editingGProdCostPriceInput, setEditingGProdCostPriceInput] =
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
  const [newItemType, setNewItemType] = useState<"food">("food");
  const [newItemOpeningTime, setNewItemOpeningTime] = useState("");
  const [newItemClosingTime, setNewItemClosingTime] = useState("");
  const [newItemRestaurantName, setNewItemRestaurantName] = useState("");
  const [newItemCommission, setNewItemCommission] = useState<number>(0);
  const [newItemCostPrice, setNewItemCostPrice] = useState<number>(0);
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
  const [editingCostPriceInput, setEditingCostPriceInput] =
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
    confirmLabel?: string;
    onCancel?: () => void;
  } | null>(null);

  // User Verification Lock System States & Helpers
  const [unlockingUser, setUnlockingUser] = useState<UserProfile | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
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
  // Orders waiting for admin approval: grocery COD ("pending"), food COD ("placed") and
  // Easypaisa orders awaiting receipt verification ("payment_verification_pending").
  const unapprovedOrdersCount = orders.filter((o) =>
    ["pending", "placed", "payment_verification_pending"].includes(o.status)
  ).length;
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
    if (!unlockingUser || isUnlocking) return;
    setIsUnlocking(true);
    // Owner/admin accounts must NEVER be unlocked/approved from here.
    if (unlockingUser.phone === "03277004471" || unlockingUser.role === "admin") {
      alert("Owner/admin accounts cannot be unlocked here.");
      return;
    }
    // Owner's rule: only Raza Khan (03277004427) may be unlocked/approved,
    // and only on the owner's word. Any other locked user stays locked.
    // (Address updates for already-verified users are unaffected.)
    if (unlockingUser.status === "locked" && unlockingUser.phone !== "03277004427") {
      alert("Sirf Raza Khan (03277004427) ko unlock kiya ja sakta hai — owner ki ijazat se.");
      return;
    }
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
        alert(`✅ User ${unlockingUser.phone} unlocked successfully with delivery address!`);
      } else {
        alert(`✅ User ${unlockingUser.phone} address updated successfully!`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to unlock user. Database permissions error.");
    } finally {
      setIsUnlocking(false);
    }
  };

  // Rider/ETA state overrides
  const [riderNames, setRiderNames] = useState<{ [orderId: string]: string }>(
    {},
  );
  const [orderEtas, setOrderEtas] = useState<{ [orderId: string]: string }>({});
  const [adminOrderFilterTab, setAdminOrderFilterTab] = useState<"new" | "delivered" | "cancelled">("new");

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
      // Medicine fee was never synced: when the config arrived after first
      // render the input kept its stale initial value (30) and saving would
      // overwrite the real fee. Sync it like the other three fields.
      setGMedicineDeliveryFee(groceryDeliveryConfig.medicineDeliveryFee ?? 30);
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

        setConfirmDialog({
          title: "Rider banaein",
          message: `User "${existingData.name}" already exists in the system with role: "${existingData.role}". Do you want to escalate this user's profile to a Rider duty?`,
          confirmLabel: "Rider banaein",
          onCancel: () => setRiderRegLoading(false),
          onConfirm: async () => {
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
          },
        });
        return;
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
        `Success! Rider "${name}" has been successfully registered with username/phone: "${cleanPhone}".`,
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

  const handleDeleteRider = (uid: string, name: string, phone?: string) => {
    setConfirmDialog({
      title: "Block Rider",
      message: `Are you sure you want to BLOCK Rider "${name}"? They will be blacklisted and cannot sign in or re-register. (A plain delete would let them sign in again and reappear.)`,
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, "users", uid), {
            status: "blocked",
            isBlacklisted: true,
            blockReason: "Rider access revoked by admin.",
            needsUnblockAlert: false,
            unblockAlertMessage: "",
          });
          await setDoc(doc(db, "blacklist", uid), {
            phone: phone || "",
            blockedAt: new Date(),
            blockedBy: adminUsername || "admin",
            reason: "Rider access revoked by admin",
          });
          alert(`❌ Rider ${name} blocked and blacklisted.`);
        } catch (err) {
          console.error("Failed to block rider profile:", err);
          alert(
            "Error: Database permission denied or insufficient administrative credentials.",
          );
        }
      },
    });
  };

  const handleSettleRider = async (riderUid: string, name: string) => {
    setConfirmDialog({
      title: "Settle Rider Stats",
      message: `Kya aap Rider "${name}" ki active statistics aur earned commission ko settle aur clear karna chahte hain? Settle karne ke baad active counters reset ho jayenge.`,
      confirmLabel: "Settle karein",
      onConfirm: async () => {
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
      },
    });
  };

  const handleSettleRestaurant = async (restaurantName: string) => {
    setConfirmDialog({
      title: "Settle Restaurant Stats",
      message: `Kya aap Restaurant "${restaurantName}" ki active statistics aur earned commission ko settle aur clear karna chahte hain? Settle karne ke baad active counters reset ho jayenge.`,
      confirmLabel: "Settle karein",
      onConfirm: async () => {
    try {
      await updateDoc(doc(db, "settings", "delivery_config"), {
        [`restaurantStatuses.${restaurantName}.lastSettledAt`]: new Date()
      });
      alert(`Restaurant "${restaurantName}" ki active stats successfully settle aur clear ho gayi hain!`);
    } catch (err) {
      console.error("Failed to settle restaurant stats:", err);
      alert("Error: Database permission denied or insufficient administrative credentials.");
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
    (sum, o) => sum + (o.grandTotal || 0),
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
      (order.items || []).forEach((item) => {
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
      const trimmedName = newRestaurantInput.trim();
      const existingForRestaurant: any = existingStatuses[trimmedName] || {};

      const newSettings = {
        restaurantStatus: deliverySettings?.restaurantStatus || {
          isTemporarilyUnavailable: false,
          openingTime: "12:00",
          closingTime: "23:00",
        },
        restaurantStatuses: {
          ...existingStatuses,
          [trimmedName]: {
            ...existingForRestaurant,
            isTemporarilyUnavailable: false,
            openingTime: existingForRestaurant.openingTime || "12:00",
            closingTime: existingForRestaurant.closingTime || "23:00",
          },
        },
      };

      await setDoc(doc(db, "settings", "delivery_config"), cleanObject(newSettings), {
        merge: true,
      });
      setSelectedScheduleRestaurant(trimmedName);
      setNewRestaurantInput("");
      alert(
        `Successfully registered new Restaurant / Vendor: ${trimmedName}`,
      );
    } catch (err) {
      console.error(err);
      alert(
        "Permission denied or Firestore configuration missing while saving new restaurant.",
      );
    }
  };

  // ---- Per-field / per-section saves (settings/delivery_config) ----
  // Each save writes ONLY its own fields with setDoc(..., { merge: true }),
  // so one card can never clobber another card's newer values with stale
  // form state (the old handleSaveDeliveryConfig wrote the whole doc from
  // form state synced only on load). merge:true also creates the doc if
  // it is ever missing, instead of throwing like updateDoc would.
  const saveDeliveryConfigFields = async (fields: Record<string, unknown>) => {
    await setDoc(doc(db, "settings", "delivery_config"), fields, { merge: true });
  };

  // Delivery fees + site tax + night surcharge (Settings tab).
  // foodDeliveryFee is also written to the legacy `deliveryFee` field so
  // user code that still reads deliveryFee keeps working until it
  // migrates to foodDeliveryFee. Grocery/medicine fees are mirrored into
  // settings/groceryDeliveryConfig for the same reason.
  const handleSaveDeliveryCharges = async () => {
    try {
      const foodFee = Number(deliveryChargeInput) || 70;
      const groceryFee = Number(groceryDeliveryFeeInput) || 100;
      const medicineFee = Number(medicineDeliveryFeeInput) || 30;
      await saveDeliveryConfigFields({
        deliveryFee: foodFee,
        foodDeliveryFee: foodFee,
        groceryDeliveryFee: groceryFee,
        medicineDeliveryFee: medicineFee,
        siteTax: Number(siteTaxInput) || 0,
        nightSurchargeAmount: Number(nightSurchargeAmountInput) || 0,
        nightSurchargeStartHour: Math.max(0, Math.min(23, Number(nightSurchargeStartHourInput) || 21)),
      });
      await setDoc(
        doc(db, "settings", "groceryDeliveryConfig"),
        { baseDeliveryFee: groceryFee, medicineDeliveryFee: medicineFee },
        { merge: true },
      );
      setGBaseDeliveryFee(groceryFee);
      setGMedicineDeliveryFee(medicineFee);
      alert("Delivery fees, site tax & night surcharge saved!");
    } catch (err) {
      console.error(err);
      alert("Permission denied or Firestore configuration missing while saving delivery charges.");
    }
  };

  // App version — settings/app_version. APK band hai (PWA only, 28 Nov 2026):
  // yahan naya version + message set karo; purani PWA mein turant update
  // banner aa jayega. APK link ki zaroorat nahi — khaali bhi chalega.
  const handleSaveAppVersion = async () => {
    try {
      const version = Number(appVersionInput) || 3;
      const apkUrl = appApkUrlInput.trim();
      await setDoc(doc(db, "settings", "app_version"), {
        version,
        apkUrl,
        message: appVersionMsgInput.trim() || "Naya version aa gaya — naye features aur behtareen speed!",
        updatedAt: new Date().toISOString(),
      });
      alert(`App version ${version} set! Purani apps mein update notification aa jayega.`);
    } catch (err) {
      console.error(err);
      alert("Permission denied or Firestore configuration missing while saving app version.");
    }
  };

  // Store Controls — checkout & payment options (Settings tab).
  const handleSaveStoreControls = async () => {
    try {
      await saveDeliveryConfigFields({
        easypaisaTitle: easypaisaTitleInput.trim() || "Ghulam Murtaza",
        easypaisaNumber: easypaisaNumberInput.trim() || "03277004471",
        whatsappNumber: whatsappNumberInput.trim().replace(/[^0-9]/g, "") || "923277004471",
        tipOptions: tipOptionsInput.split(",").map((v) => Number(v.trim())).filter((n) => !isNaN(n) && n >= 0),
        priorityFee: Number(priorityFeeInput) || 0,
        freeDeliveryAboveAmount: Number(freeDeliveryAboveInput) || 1000,
        doubleFeeBelowAmount: Number(doubleFeeBelowInput) || 0,
        priorityEnabled: priorityEnabledInput,
        cutleryEnabled: cutleryEnabledInput,
        leaveAtDoorEnabled: leaveAtDoorEnabledInput,
        messageOnArrivalEnabled: messageOnArrivalEnabledInput,
        firstOrderFreeDelivery: firstOrderFreeDeliveryInput,
      });
      alert("Store Controls successfully saved!");
    } catch (err) {
      console.error(err);
      alert("Permission denied or Firestore configuration missing while saving store controls.");
    }
  };

  // Restaurant profile / operating times for the selected vendor.
  // Reads the doc fresh so a concurrent admin's restaurantStatuses are
  // not overwritten, then updates ONLY the restaurantStatuses map.
  const handleSaveRestaurantStatus = async () => {
    try {
      const snap = await getDoc(doc(db, "settings", "delivery_config"));
      const existingStatuses = (snap.exists() ? (snap.data().restaurantStatuses as Record<string, any>) : {}) || {};
      const currentRestaurantConfig: any = existingStatuses[selectedScheduleRestaurant] || {};
      await saveDeliveryConfigFields({
        restaurantStatuses: {
          ...existingStatuses,
          [selectedScheduleRestaurant]: {
            ...currentRestaurantConfig,
            isTemporarilyUnavailable: restStatusUnavailable,
            openingTime: restOpeningTime,
            closingTime: restClosingTime,
            imageUrl: restImageUrl || currentRestaurantConfig.imageUrl || "",
            bgImageUrl: restBgImageUrl || currentRestaurantConfig.bgImageUrl || "",
            phone: restPhone || currentRestaurantConfig.phone || "",
            minOrder: restMinOrder ? String(restMinOrder) : (currentRestaurantConfig.minOrder || null),
            deliveryCharge: restDeliveryCharge || currentRestaurantConfig.deliveryCharge || "",
            deliveryTime: restDeliveryTime || currentRestaurantConfig.deliveryTime || "",
            tagline: restTagline || currentRestaurantConfig.tagline || "",
            coords: (restLat && restLng ? { lat: parseFloat(restLat), lng: parseFloat(restLng) } : null) || currentRestaurantConfig.coords || null,
            commissionEnabled: restCommissionEnabled,
            commissionType: restCommissionType,
            commissionValue: restCommissionValue ? Number(restCommissionValue) : (currentRestaurantConfig.commissionValue || 0),
          },
        },
      });
      alert(`Settings successfully saved for ${selectedScheduleRestaurant}!`);
    } catch (err) {
      console.error(err);
      alert("Permission denied or Firestore configuration missing while saving settings.");
    }
  };

  // Ranges + base pin (Riders tab).
  const handleSaveDeliveryRanges = async () => {
    try {
      await saveDeliveryConfigFields({
        riderRangeKm: Number(riderRangeKmInput),
        userRangeKm: Number(userRangeKmInput),
        baseLocationCoords: { lat: Number(baseLatInput), lng: Number(baseLngInput) },
      });
      alert("Delivery ranges & base location saved!");
    } catch (err) {
      console.error(err);
      alert("Permission denied or Firestore configuration missing while saving ranges.");
    }
  };

  // Announcement / promo popup (Settings tab) — only the announcement field.
  const handleSaveAnnouncement = async () => {
    if (announcementActive && !announcementImageUrl.trim()) {
      alert("Aapne Announcement active rakhi hai magar Image URL khali hai! Pehle image ka link dalein.");
      return;
    }
    let targetId = announcementId.trim();
    if (!targetId) {
      targetId = "promo_" + Date.now();
      setAnnouncementId(targetId);
    }
    try {
      await saveDeliveryConfigFields({
        announcement: {
          active: announcementActive,
          imageUrl: announcementImageUrl.trim(),
          title: announcementTitle.trim(),
          description: announcementDescription.trim(),
          id: targetId,
        },
      });
      alert("🎉 Mubarak Ho! Global Offer/Announcement successfully publish ho gayi hai!");
    } catch (err) {
      console.error(err);
      alert("Firestore error while publishing announcement: " + err);
    }
  };

  // Voice order toggle + delivery areas + delivery-time text (Settings tab).
  // App.tsx reads delivery_config.voiceOrderEnabled / deliveryAreas /
  // deliveryTimeText with fallbacks, so these field names must not change.
  const handleSaveHomepageSettings = async () => {
    try {
      const areas = deliveryAreasInput.split("\n").map((a) => a.trim()).filter(Boolean);
      await saveDeliveryConfigFields({
        voiceOrderEnabled: voiceOrderEnabledInput,
        chatAgentEnabled: chatAgentEnabledInput,
        deliveryAreas: areas,
        deliveryTimeText: deliveryTimeTextInput.trim() || "25–35 min",
      });
      alert("Homepage & voice settings saved!");
    } catch (err) {
      console.error(err);
      alert("Permission denied or Firestore configuration missing while saving homepage settings.");
    }
  };

  // Munchi voice pace — save the pre-speech pause to settings/voice_config.
  // App.tsx reads it (cache-first) and passes it to VoiceOrderModal, so the
  // pace changes without any code change or rebuild. Press "Refresh All
  // Users" after saving to push it to every open phone at once.
  const handleSaveVoicePace = async () => {
    try {
      const ms = Math.min(5000, Math.max(0, Math.round(Number(voicePauseMsInput) || 300)));
      setVoicePauseMsInput(ms);
      await setDoc(doc(db, "settings", "voice_config"), { pauseMs: ms }, { merge: true });
      setVoicePauseSaved(true);
      window.setTimeout(() => setVoicePauseSaved(false), 2500);
    } catch (err) {
      console.error(err);
      alert("Permission denied or Firestore configuration missing while saving voice pace.");
    }
  };

  // Refresh All Users — admin presses this after changing a price or anything else;
  // it writes a new timestamp to settings/refresh_signal, and every open user page
  // (listening to that one tiny doc) reloads the latest menu/prices.
  const handleRefreshAllUsers = async () => {
    try {
      await setDoc(
        doc(db, "settings", "refresh_signal"),
        { updatedAt: Date.now(), triggeredBy: "admin" },
        { merge: true },
      );
      // Also clear the catalogue delta so pages that were closed (and
      // missed the refresh signal) full re-fetch on their next load
      // instead of trusting a pre-Refresh cache.
      await clearCatalogDelta();
      alert("Done! Har user ke page par naya menu aur prices refresh ho jayenge.");
    } catch (err) {
      console.error("Failed to send refresh signal:", err);
      alert("Refresh signal nahi bheja ja saka. Dobara try karein.");
    }
  };

  // Save Maintenance Mode Config
  const handleSaveMaintenanceConfig = async () => {
    try {
      await setDoc(
        doc(db, "settings", "delivery_config"),
        { isMaintenanceMode: isMaintenanceMode, maintenanceMessage: maintenanceMessage.trim() },
        { merge: true },
      );
      alert("Maintenance mode configuration saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Permission denied or Firestore configuration missing while saving maintenance config.");
    }
  };

  // Save Loyalty Wallet Config
  const handleSaveLoyaltyConfig = async () => {
    try {
      await setDoc(
        doc(db, "settings", "delivery_config"),
        {
          loyaltyEnabled: Boolean(loyaltyEnabled),
          loyaltyMinOrderForEarn: Number(loyaltyMinOrderForEarn),
          loyaltyEarnCoins: Number(loyaltyEarnCoins),
          loyaltyEarnType,
          loyaltyMaxSpendCoins: Number(loyaltyMaxSpendCoins),
          loyaltyAllowOnFood: Boolean(loyaltyAllowOnFood),
          loyaltyAllowOnGrocery: Boolean(loyaltyAllowOnGrocery),
        },
        { merge: true },
      );
      alert("Loyalty Coin Wallet configuration saved successfully! 🪙");
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
        medicineDeliveryFee: Number(gMedicineDeliveryFee),
      });
      // Mirror into delivery_config so the Settings fee card never disagrees.
      await setDoc(
        doc(db, "settings", "delivery_config"),
        {
          groceryDeliveryFee: Number(gBaseDeliveryFee),
          medicineDeliveryFee: Number(gMedicineDeliveryFee),
        },
        { merge: true },
      );
      alert("Grocery store settings saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Error saving grocery delivery settings.");
    }
  };

  // Clear all sales/orders history
  const handleClearAllOrderHistory = async () => {
    // Typed confirmation: one accidental confirm must not wipe every order.
    const typed = window.prompt(
      "This will PERMANENTLY delete ALL order history. To confirm, type DELETE exactly:",
    );
    if (typed !== "DELETE") {
      if (typed !== null) alert("Cancelled — type DELETE exactly to confirm.");
      return;
    }
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
      recordCatalogChange("groceryCategories", generatedId, "upsert");
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
      const defaultImg = newGProdImageUrl.trim() || "/logo.png"; // branded tile — no fake product photo
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
          costPrice: newGProdCostPrice > 0 ? Number(newGProdCostPrice) : undefined,
        }),
      );
      recordCatalogChange("groceryProducts", generatedId, "upsert");
      setNewGProdName("");
      setNewGProdImageUrl("");
      setNewGProdPrice(100);
      setNewGProdDiscountPrice(0);
      setNewGProdStock(10);
      setNewGProdCommission(0);
      setNewGProdCostPrice(0);
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
      recordCatalogChange("groceryCategories", catId, "upsert");
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateCategoryImageUrl = async (id: string) => {
    try {
      await updateDoc(doc(db, "groceryCategories", id), {
        imageUrl: editingCategoryImageUrl.trim(),
      });
      recordCatalogChange("groceryCategories", id, "upsert");
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
          // Delete the category's products too — otherwise they linger orphaned in "All"/search.
          const prods = await getDocs(
            query(collection(db, "groceryProducts"), where("categoryId", "==", catId)),
          );
          await Promise.all(prods.docs.map((d) => deleteDoc(d.ref)));
          // B7: tombstone each deleted product too — without per-item
          // "delete" entries, mergeOwnerFirst would resurrect owner
          // products (og_/gcat_) from the local seed on the next load.
          prods.docs.forEach((d) =>
            recordCatalogChange("groceryProducts", d.id, "delete"),
          );
          await deleteDoc(doc(db, "groceryCategories", catId));
          recordCatalogChange("groceryCategories", catId, "delete");
          // Bulk product delete — user pages re-fetch the whole collection.
          recordCatalogFull("groceryProducts");
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
      recordCatalogChange("groceryProducts", prodId, "upsert");
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
          recordCatalogChange("groceryProducts", prodId, "delete");
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
        costPrice: editingGProdCostPriceInput > 0 ? Number(editingGProdCostPriceInput) : null,
      });
      recordCatalogChange("groceryProducts", prodId, "upsert");
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
      category: newItemCategory,
      imageUrl: finalImg,
      isAvailable: true,
      openingTime: newItemOpeningTime || undefined,
      closingTime: newItemClosingTime || undefined,
      type: newItemType,
      restaurantName:
        newItemRestaurantName.trim() || "Dadu Fast Food & Kitchen",
      commission: Number(newItemCommission),
      costPrice: newItemCostPrice > 0 ? Number(newItemCostPrice) : undefined,
      isBestseller: newItemIsBestseller,
      sizes:
        newItemSizes.length > 0
          ? newItemSizes
          : undefined,
      flavors:
        newItemFlavors.length > 0
          ? newItemFlavors
          : undefined,
      addOns:
        newItemAddOns.length > 0
          ? newItemAddOns
          : undefined,
    };

    try {
      await setDoc(doc(db, "menu", uniqueId), cleanObject(dishModel));
      recordCatalogChange("menu", uniqueId, "upsert");
      alert(`Dish "${newItemName}" added successfully!`);
      setNewItemName("");
      setNewItemDescription("");
      setNewItemPrice(300);
      setNewItemDiscountPrice(0);
      setNewItemImageUrl("");
      setNewItemRestaurantName("");
      setNewItemCommission(0);
      setNewItemCostPrice(0);
      setNewItemIsBestseller(false);
      setNewItemSizes([]);
      setNewItemFlavors([]);
      setNewItemAddOns([]);
      setNewItemOpeningTime("");
      setNewItemClosingTime("");
    } catch (err) {
      console.error(err);
      alert("Could not add menu item. Check database permissions and try again.");
    }
  };

  const handleToggleFeatured = async (dish: Dish) => {
    try {
      await updateDoc(doc(db, "menu", dish.id), {
        isFeatured: !dish.isFeatured,
      });
      recordCatalogChange("menu", dish.id, "upsert");
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleBestseller = async (dish: Dish) => {
    try {
      await updateDoc(doc(db, "menu", dish.id), {
        isBestseller: !dish.isBestseller,
      });
      recordCatalogChange("menu", dish.id, "upsert");
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
            { name: "Veggie Lover Pizza", price: 0 },
          ],
          imageUrl: "/images/dishes/pizza.jpg",
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
            { name: "Spicy Ranch Pizza", price: 0 },
            { name: "BBQ Tikka Pizza", price: 0 },
            { name: "Afghani Feast Pizza", price: 0 },
            { name: "Chilli Garlic Cream", price: 0 },
            { name: "Bihari Boti Pizza", price: 0 },
          ],
          imageUrl: "/images/dishes/pizza.jpg",
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
            { name: "Kabab Delight", price: 0 },
            { name: "Mughlai Beast Pizza", price: 0 },
          ],
          imageUrl: "/images/dishes/pizza.jpg",
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
            { name: "Sauce Crust Pizza", price: 0 },
            { name: "Kofta Kabab Pizza", price: 0 },
            { name: "Melt Malai Pizza", price: 0 },
            { name: "Cheese Crust Pizza", price: 0 },
            { name: "Cheese Stick Pizza", price: 0 },
          ],
          imageUrl: "/images/dishes/pizza.jpg",
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
            { name: "Tasty's Zinger", price: 200 },
            { name: "Chicken Double Patty Burger", price: 250 },
            { name: "Mighty Burger", price: 350 },
            { name: "Pizza Burger", price: 350 },
            { name: "Jumbo Double Patty Burger", price: 350 },
            { name: "MAC Burger", price: 350 },
            { name: "Tasty's Signature", price: 550 },
          ],
          imageUrl: "/images/dishes/burger.jpg",
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
            { name: "Beef Double Patty Burger", price: 200 },
            { name: "Full Fried Burger", price: 300 },
            { name: "Cheese Beef Burger", price: 300 },
            { name: "Lava Beef Burger", price: 500 },
          ],
          imageUrl: "/images/dishes/burger.jpg",
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
          imageUrl: "/images/dishes/burger.jpg",
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
          imageUrl: "/images/dishes/broast.jpg",
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
          imageUrl: "/images/dishes/broast.jpg",
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
            { name: "Veggie Roll", price: 0 },
            { name: "Grilled Cheese Paratha Roll", price: 50 },
            { name: "Zingratha Roll", price: 100 },
            { name: "Twister Roll", price: 150 },
          ],
          imageUrl: "/images/dishes/roll.jpg",
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
          imageUrl: "/images/dishes/roll.jpg",
          isAvailable: true, type: "food", restaurantName
        },
        {
          name: "Lasagna",
          description: "Delicious Lasagna in multiple flavors.",
          price: 500,
          category: "Lasagna",
          sizes: [
            { name: "Plain Lasagna - Small", price: 500 },
            { name: "Plain Lasagna - Large", price: 600 },
            { name: "Fajita Lasagna - Small", price: 550 },
            { name: "Fajita Lasagna - Large", price: 650 },
            { name: "Malai Boti Lasagna - Small", price: 550 },
            { name: "Malai Boti Lasagna - Large", price: 650 },
            { name: "Crispy Lasagna - Small", price: 600 },
            { name: "Crispy Lasagna - Large", price: 750 },
          ],
          imageUrl: "/images/dishes/lasagna.jpg",
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
            { name: "Alfredo Pasta - Small", price: 600 },
            { name: "Alfredo Pasta - Large", price: 750 },
          ],
          imageUrl: "/images/dishes/pasta.jpg",
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
          imageUrl: "/images/dishes/fries.jpg",
          isAvailable: true, type: "food", restaurantName
        },
        {
          name: "Paratha",
          description: "Stuffed and plain parathas.",
          price: 100,
          category: "Paratha",
          flavors: [
            { name: "Plain Paratha", price: 0 },
            { name: "Cheese Paratha", price: 250 },
            { name: "Pizza Paratha", price: 300 },
            { name: "Chocolate Paratha", price: 300 },
            { name: "Malai Boti Pizza Paratha", price: 400 },
          ],
          imageUrl: "/images/dishes/paratha.jpg",
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
          imageUrl: "/images/dishes/sandwich.jpg",
          isAvailable: true, type: "food", restaurantName
        }
      ];

      for (let i = 0; i < menuData.length; i++) {
        const item = menuData[i];
        const docId = `tasty_bites_${item.category.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${item.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        await setDoc(doc(db, "menu", docId), cleanObject(item));
        setImportProgressTasty(Math.round(((i + 1) / menuData.length) * 100));
      }
      // Bulk import — user pages re-fetch the whole menu once.
      recordCatalogFull("menu");
      
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
      recordCatalogChange("menu", dish.id, "upsert");
    } catch (err) {
      console.error(err);
    }
  };

  // Price inline editing
  const handleSavePriceChange = async (dish: Dish) => {
    if (editingPriceInput <= 0 || !editingNameInput.trim()) {
      alert("Please enter a valid dish name and a price greater than Rs. 0.");
      return;
    }
    try {
      const updates: any = {
        name: editingNameInput.trim(),
        price: editingPriceInput,
        openingTime: editingOpeningTime || null,
        closingTime: editingClosingTime || null,
        discountPrice:
          editingDiscountPriceInput > 0 ? editingDiscountPriceInput : null,
        commission: editingCommissionInput,
        costPrice: editingCostPriceInput > 0 ? editingCostPriceInput : null,
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
      recordCatalogChange("menu", dish.id, "upsert");
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
          recordCatalogChange("menu", dishId, "delete");
        } catch (err) {
          console.error(err);
        alert("Price save nahi hui — dobara try karein.");
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
          // B7: tombstone each deleted dish too, so the seed guard cannot
          // resurrect owner dishes from the local menu seed.
          dishesToDelete.forEach((d) =>
            recordCatalogChange("menu", d.id, "delete"),
          );
          // Bulk delete — user pages re-fetch the whole menu once.
          recordCatalogFull("menu");

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
            openingTime: "12:00",
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
          // Bulk rename — user pages re-fetch the whole menu once.
          recordCatalogFull("menu");

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
      // Status machine guard: only the listed transitions are allowed.
      // In particular an Easypaisa order awaiting verification can ONLY
      // become confirmed via handleVerifyEasypaisaPayment (receipt
      // checked) — the generic Confirmed button must never confirm it.
      const currentOrder = orders.find((o) => o.id === orderId);
      const fromStatus = currentOrder?.status;
      const ALLOWED_TRANSITIONS: Record<string, string[]> = {
        placed: ["confirmed", "cancelled"],
        pending: ["confirmed", "cancelled"],
        confirmed: ["preparing", "cancelled"],
        preparing: ["out_for_delivery", "cancelled"],
        out_for_delivery: ["delivered", "cancelled"],
        payment_verification_pending: ["cancelled"],
      };
      if (
        fromStatus &&
        ALLOWED_TRANSITIONS[fromStatus] &&
        !ALLOWED_TRANSITIONS[fromStatus].includes(nextStatus)
      ) {
        if (fromStatus === "payment_verification_pending" && nextStatus === "confirmed") {
          alert("Easypaisa receipt verify kiye baghair order confirm nahi ho sakta. Pehle receipt verify karein.");
        } else {
          alert(`Order ${fromStatus} se ${nextStatus} nahi ho sakta.`);
        }
        return;
      }

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
          title: `Order Update ${formatOrderId(orderId)}`,
          message: `Your booking status turned to: ${statusText.toUpperCase()}`,
          createdAt: { seconds: Date.now() / 1000 },
          read: false,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Easypaisa payment verification: receipt confirmed -> order becomes confirmed
  const handleVerifyEasypaisaPayment = async (orderId: string) => {
    if (verifyingOrderId === orderId) return; // double-tap guard
    const targetOrder = orders.find((o) => o.id === orderId);
    setVerifyingOrderId(orderId);
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: "confirmed",
        paymentVerified: true,
        paymentRejected: false,
        paymentVerifiedAt: { seconds: Date.now() / 1000 },
        // M23: snapshot the amount that was actually verified, so the
        // receipt is bound to the order total at verification time.
        paymentVerifiedAmount: targetOrder?.grandTotal ?? null,
      });
      if (targetOrder) {
        await addDoc(collection(db, "notifications"), {
          userId: targetOrder.userId,
          title: `Order Update ${formatOrderId(orderId)}`,
          message: "Your Easypaisa payment was verified. Order confirmed!",
          createdAt: { seconds: Date.now() / 1000 },
          read: false,
        });
      }
    } catch (err) {
      console.error(err);
      alert("Verification save nahi ho saki — dobara try karein. " + handleFirestoreError(err));
    } finally {
      setVerifyingOrderId(null);
    }
  };

  // Easypaisa payment rejection: ask reason -> order cancelled + customer notified
  const handleRejectEasypaisaPayment = async (orderId: string) => {
    if (verifyingOrderId === orderId) return; // double-tap guard
    const reason = prompt(
      "Payment reject karne ki wajah likhein (customer ko bheji jayegi):",
    );
    if (reason === null) return; // User pressed cancel on the prompt
    setVerifyingOrderId(orderId);
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: "cancelled",
        paymentVerified: false,
        paymentRejected: true,
        paymentRejectionReason:
          reason || "Payment receipt could not be verified.",
        cancelReason: reason || "Easypaisa payment could not be verified.",
      });
      const targetOrder = orders.find((o) => o.id === orderId);
      if (targetOrder) {
        await addDoc(collection(db, "notifications"), {
          userId: targetOrder.userId,
          title: `Order Update ${formatOrderId(orderId)}`,
          message:
            "Your Easypaisa payment could not be verified. Order cancelled.",
          createdAt: { seconds: Date.now() / 1000 },
          read: false,
        });
      }
    } catch (err) {
      console.error(err);
      alert("Rejection save nahi ho saki — dobara try karein. " + handleFirestoreError(err));
    } finally {
      setVerifyingOrderId(null);
    }
  };

  // Save customized Rider & custom ETA
  const handleSaveRiderAndEta = async (orderId: string) => {
    const riderIdValue = riderNames[orderId]?.trim() || "";
    const etaValue = orderEtas[orderId]?.trim() || "";

    if (!riderIdValue && !etaValue) return;

    try {
      const targetOrder = orders.find((o) => o.id === orderId);
      const updates: any = {};
      if (riderIdValue) {
        const selectedRider = ridersSubset.find(r => r.uid === riderIdValue);
        if (selectedRider) {
          updates.riderId = selectedRider.uid;
          updates.riderName = selectedRider.name;
          // M12: an assigned order must not stay "confirmed" — with a
          // riderId set it disappears from the riders' available list
          // (which only shows confirmed orders WITHOUT a rider), and
          // with status "confirmed" it never enters a rider's active
          // list, so nobody can move it. Mark it accepted so the
          // assigned rider can start it. Only for confirmed food/grocery
          // orders — never force-accept an unapproved order, and never
          // touch the service pipeline (booked service orders).
          if (targetOrder?.status === "confirmed" && targetOrder?.orderType !== "service") {
            updates.status = "accepted";
            updates.acceptedAt = { seconds: Date.now() / 1000 };
          }
        } else {
          updates.riderName = riderIdValue; // fallback for string
        }
      }
      if (etaValue) {
        updates.eta = etaValue;
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
    // Escape one CSV cell: wrap in quotes when it contains a comma, quote or
    // newline, and double any quotes inside (RFC 4180).
    const csvCell = (value: unknown): string => {
      const text = value === undefined || value === null ? "" : String(value);
      return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const headers = ["Order ID", "Date", "Customer Name", "Phone", "Address", "Total", "Status", "Items"];
    const rows = orders.map(order => [
      order.id,
      // createdAt is a Firestore Timestamp ({seconds}), not a Date —
      // new Date(order.createdAt) used to produce "Invalid Date" here.
      parseDateToMillis(order.createdAt)
        ? new Date(parseDateToMillis(order.createdAt)).toLocaleString()
        : "",
      order.userName,
      order.userPhone,
      order.userAddress,
      order.grandTotal,
      order.status,
      (order.items || []).map(i => `${i.quantity}x ${i.name}`).join(", ")
    ]);

    const csvContent = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `dadu_food_orders_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintReceipt = (order: Order) => {
    setReceiptModalOrder(order);
    setIsReceiptModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 admin-glass-bg text-white overflow-y-auto font-sans flex flex-col antialiased">
      {/* Header Admin Strip */}
      <div className="glass-header border-b border-white/10 px-3 py-2.5 sm:px-6 sm:py-3.5 sticky top-0 z-20 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="bg-gradient-to-r from-[#E21B70] to-[#C2145E] text-white px-2.5 py-1 text-[9.5px] sm:text-[10.5px] font-black uppercase tracking-widest rounded-lg shadow-sm">
            Console Active
          </div>
          <div>
            <h2 className="text-xs sm:text-base font-black tracking-tight text-white flex items-center gap-1.5">
              Dadu Hub
              <span className="text-[#E21B70] font-mono text-[10px] sm:text-xs select-all bg-[#E21B70]/5 px-1.5 py-0.5 rounded border border-[#E21B70]/20">
                @{adminUsername}
              </span>
            </h2>
            <span className="hidden sm:block text-[11px] text-white/60 font-medium font-sans">
              Enterprise Business Management Control & Live Logistics Telemetry
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Prominent Live Orders Quick Action Pill */}
          <button
            onClick={() => setActiveSubTab("orders")}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 min-h-[40px] rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 ${
              activeSubTab === "orders"
                ? "bg-[#E21B70] text-white shadow-md ring-2 ring-[#E21B70]/30"
                : "bg-[#E21B70]/10 text-pink-400 hover:bg-[#E21B70]/20 border border-[#E21B70]/25"
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E21B70]"></span>
            </span>
            <ShoppingCart className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Live Orders</span>
            {totalActiveCount > 0 && (
              <span className="bg-[#E21B70] text-white text-[10px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                {totalActiveCount}
              </span>
            )}
          </button>

          <button
            onClick={toggleAdminMute}
            aria-label="Toggle admin ringtone sound"
            className={`px-3 py-1.5 sm:px-3.5 sm:py-2 min-h-[40px] rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer border active:scale-95 ${
              isAdminMuted
                ? "bg-white/5 text-white/60 border-white/10"
                : (unapprovedOrdersCount > 0 || lockedUsersCount > 0)
                ? "bg-red-500 text-white border-red-600 animate-pulse shadow-md"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-400/25"
            }`}
            title="Toggle Admin Ringtone Sound"
          >
            {isAdminMuted ? "🔇 Muted" : "🔊 Ringing"}
          </button>

          <button
            onClick={handleExportCSV}
            aria-label="Export all orders as CSV"
            className="hidden md:flex bg-white/5 hover:bg-white/10 text-white/80 text-xs font-bold px-3 py-1.5 min-h-[40px] rounded-xl transition cursor-pointer items-center gap-1.5 border border-white/10"
          >
            <ClipboardList className="w-3.5 h-3.5 text-white/70" /> Export CSV
          </button>

          <button
            onClick={onClose}
            aria-label="Close admin panel"
            className="glass-dark hover:bg-white/10 border border-white/10 text-[11px] sm:text-xs font-bold text-white/80 px-3 py-1.5 sm:px-4 sm:py-2 min-h-[40px] rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-xs active:scale-95"
          >
            Exit 🚪
          </button>
        </div>
      </div>

      {/* Main Container Dashboard */}
      <div className="max-w-7xl mx-auto w-full px-2.5 py-3 sm:px-6 sm:py-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-6 pb-20">
        {/* Prominent New Order / New User Ring Alert Banner */}
        {(unapprovedOrdersCount > 0 || lockedUsersCount > 0) && (
          <div className="col-span-1 lg:col-span-12 bg-gradient-to-r from-red-600 via-[#E21B70] to-red-600 text-white p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl border-2 border-red-400/50">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <span className="text-3xl animate-bounce">🚨</span>
              <div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2 justify-center sm:justify-start">
                  <span>HIGH ALERT: ACTION REQUIRED!</span>
                  <span className="bg-white text-red-600 font-black text-[9.5px] px-2 py-0.5 rounded-full uppercase animate-pulse">
                    RINGING ACTIVE
                  </span>
                </h3>
                <p className="text-[11px] text-pink-100 font-medium mt-0.5">
                  {unapprovedOrdersCount > 0 && `📦 ${unapprovedOrdersCount} New Pending Order(s) waiting for dispatch! `}
                  {lockedUsersCount > 0 && `👤 ${lockedUsersCount} New User(s) awaiting verification & unlock!`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 flex-wrap">
              <button
                onClick={() => {
                  playAdminHighVolumeRing();
                  triggerAdminVibration();
                }}
                className="py-2.5 px-3 min-h-[40px] bg-white/20 hover:bg-white/30 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition active:scale-95 cursor-pointer border border-white/30"
              >
                🔊 Test Ring
              </button>
              {unapprovedOrdersCount > 0 && (
                <button
                  onClick={() => setActiveSubTab("orders")}
                  className="py-2.5 px-3 min-h-[40px] bg-white text-red-600 hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 cursor-pointer shadow-sm"
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
                  className="py-2.5 px-3 min-h-[40px] bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 cursor-pointer shadow-sm"
                >
                  Verify Users ({lockedUsersCount})
                </button>
              )}
              <button
                onClick={toggleAdminMute}
                className="py-2.5 px-3 min-h-[40px] bg-red-950/60 hover:bg-red-950 text-white rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 cursor-pointer border border-red-400/30"
              >
                {isAdminMuted ? "🔊 Unmute Ring" : "🔇 Mute Ring"}
              </button>
            </div>
          </div>
        )}
        {/* Mobile Horizontal Navigation Tab Bar (Shown only on small/medium screens) */}
        <div className="lg:hidden col-span-1 glass-dark border border-white/10 p-2 rounded-2xl shadow-xs space-y-1.5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-nowrap scrollbar-none">
            {/* Prominent High-Priority Live Orders Pill First */}
            <button
              onClick={() => setActiveSubTab("orders")}
              className={`px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-black flex items-center gap-1.5 border transition cursor-pointer shadow-xs ${
                activeSubTab === "orders"
                  ? "bg-[#E21B70] border-[#E21B70] text-white shadow-md"
                  : "bg-[#E21B70]/10 border border-[#E21B70]/25 text-pink-400"
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5 animate-pulse" /> Live Orders {totalActiveCount > 0 && `(${totalActiveCount})`}
            </button>
            <button
              onClick={() => setActiveSubTab("analytics")}
              className={`px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                activeSubTab === "analytics" ? "bg-[#E21B70] border-[#E21B70] text-white" : "bg-white/5 border-white/10 text-white/80"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" /> Analytics
            </button>
            <button
              onClick={() => setActiveSubTab("restaurants")}
              className={`px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                activeSubTab === "restaurants" ? "bg-[#E21B70] border-[#E21B70] text-white" : "bg-white/5 border-white/10 text-white/80"
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Vendors
            </button>
            <button
              onClick={() => { setActiveSubTab("items"); setNewItemType("food"); }}
              className={`px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                activeSubTab === "items" ? "bg-[#E21B70] border-[#E21B70] text-white" : "bg-white/5 border-white/10 text-white/80"
              }`}
            >
              <ListCollapse className="w-3.5 h-3.5" /> Food Items
            </button>
            <button
              onClick={() => setActiveSubTab("food_categories")}
              className={`px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                activeSubTab === "food_categories" ? "bg-[#E21B70] border-[#E21B70] text-white" : "bg-white/5 border-white/10 text-white/80"
              }`}
            >
              <Grid className="w-3.5 h-3.5" /> Categories
            </button>
            <button
              onClick={() => setActiveSubTab("grocery")}
              className={`px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                activeSubTab === "grocery" ? "bg-[#E21B70] border-[#E21B70] text-white" : "bg-white/5 border-white/10 text-white/80"
              }`}
            >
              <ShoppingBasket className="w-3.5 h-3.5" /> Grocery
            </button>
            <button
              onClick={() => setActiveSubTab("riders")}
              className={`px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                activeSubTab === "riders" ? "bg-[#E21B70] border-[#E21B70] text-white" : "bg-white/5 border-white/10 text-white/80"
              }`}
            >
              <Truck className="w-3.5 h-3.5" /> Riders
            </button>
            <button
              onClick={() => setActiveSubTab("users")}
              className={`px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                activeSubTab === "users" ? "bg-[#E21B70] border-[#E21B70] text-white" : "bg-white/5 border-white/10 text-white/80"
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Users ({allUsersList.length})
            </button>

            <button
              onClick={() => setActiveSubTab("vouchers")}
              className={`px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                activeSubTab === "vouchers" ? "bg-[#E21B70] border-[#E21B70] text-white" : "bg-white/5 border-white/10 text-white/80"
              }`}
            >
              <Ticket className="w-3.5 h-3.5" /> Vouchers ({vouchersList.length})
            </button>
            <button
              onClick={() => setActiveSubTab("loyalty")}
              className={`px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                activeSubTab === "loyalty" ? "bg-[#E21B70] border-[#E21B70] text-white" : "bg-white/5 border-white/10 text-white/80"
              }`}
            >
              <Coins className="w-3.5 h-3.5" /> Coins
            </button>
            <button
              onClick={() => setActiveSubTab("seo")}
              className={`px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                activeSubTab === "seo" ? "bg-[#E21B70] border-[#E21B70] text-white" : "bg-white/5 border-white/10 text-white"
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> SEO
            </button>
            <button
              onClick={() => setActiveSubTab("settings")}
              className={`px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                activeSubTab === "settings" ? "bg-[#E21B70] border-[#E21B70] text-white" : "bg-white/5 border-white/10 text-white/80"
              }`}
            >
              <Settings className="w-3.5 h-3.5" /> Settings
            </button>
          </div>
        </div>

        {/* Navigation Admin Side Rail (Desktop) */}
        <div className="hidden lg:block lg:col-span-3 space-y-4">
          <div className="glass-dark border border-white/10 p-5 rounded-2xl shadow-sm space-y-5 sticky top-20">
            {/* Branding & High Priority Live Operations Callout Card */}
            <div className="glass-dark glass-glow border border-white/10 text-white p-4 rounded-2xl shadow-md space-y-3">
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
                <span className="text-[9.5px] font-mono font-bold text-white/50 uppercase">
                  @{adminUsername}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-2xl font-black text-white tracking-tight flex items-baseline gap-1.5">
                    {totalActiveCount}
                    <span className="text-xs font-extrabold text-pink-400">Active</span>
                  </div>
                  <p className="text-[10px] text-white/50 font-medium leading-tight">
                    Fulfillment queue
                  </p>
                </div>
                <button
                  onClick={() => setActiveSubTab("orders")}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95 ${
                    activeSubTab === "orders"
                      ? "bg-[#E21B70] text-white ring-2 ring-pink-400/50"
                      : "bg-[#E21B70] hover:bg-[#b80c54] text-white"
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
                <span className="text-[9px] font-black text-[#E21B70] block uppercase tracking-widest pl-1 mb-1.5 flex items-center gap-1">
                  ⚡ Operational Control
                </span>
                <div className="space-y-1">
                  <button
                    onClick={() => setActiveSubTab("orders")}
                    className={`w-full font-extrabold text-xs px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer border ${
                      activeSubTab === "orders"
                        ? "bg-[#E21B70] border-[#E21B70] text-white shadow-md"
                        : "bg-[#E21B70]/10 border border-[#E21B70]/25 text-pink-400 hover:bg-[#E21B70]/20"
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4 shrink-0 animate-pulse" />
                    <span>Live Orders Manager</span>
                    {totalActiveCount > 0 && (
                      <span className={`ml-auto font-black px-2 py-0.5 text-[9.5px] rounded-full leading-none shadow-xs ${
                        activeSubTab === "orders" 
                          ? "glass-dark text-[#E21B70]" 
                          : "bg-[#E21B70] text-white"
                      }`}>
                        {totalActiveCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveSubTab("analytics")}
                    className={`w-full font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer border ${
                      activeSubTab === "analytics"
                        ? "bg-[#E21B70] border-[#E21B70] text-white shadow-sm"
                        : "bg-transparent border-transparent text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                    Realtime Analytics
                  </button>
                </div>
              </div>

              {/* Group 2: Catalog & Merchants */}
              <div>
                <span className="text-[9px] font-black text-white/50 block uppercase tracking-widest pl-1 mb-1.5">
                  🍽️ Food & Merchants
                </span>
                <div className="space-y-0.5">
                  <button
                    onClick={() => setActiveSubTab("restaurants")}
                    className={`w-full font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer border ${
                      activeSubTab === "restaurants"
                        ? "bg-[#E21B70] border-[#E21B70] text-white shadow-sm"
                        : "bg-transparent border-transparent text-white/70 hover:bg-white/10 hover:text-white"
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
                        ? "bg-[#E21B70] border-[#E21B70] text-white shadow-sm"
                        : "bg-transparent border-transparent text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <ListCollapse className="w-3.5 h-3.5 shrink-0" />
                    Manage Food Items
                  </button>

                  <button
                    onClick={() => setActiveSubTab("food_categories")}
                    className={`w-full font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer border ${
                      activeSubTab === "food_categories"
                        ? "bg-[#E21B70] border-[#E21B70] text-white shadow-sm"
                        : "bg-transparent border-transparent text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Grid className="w-3.5 h-3.5 shrink-0" />
                    Food Categories
                  </button>

                  <button
                    onClick={() => setActiveSubTab("grocery")}
                    className={`w-full font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer border ${
                      activeSubTab === "grocery"
                        ? "bg-[#E21B70] border-[#E21B70] text-white shadow-sm"
                        : "bg-transparent border-transparent text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <ShoppingBasket className="w-3.5 h-3.5 shrink-0" />
                    Grocery Store
                  </button>
                </div>
              </div>

              {/* Group 3: Users & Logistics */}
              <div>
                <span className="text-[9px] font-black text-white/50 block uppercase tracking-widest pl-1 mb-1.5">
                  🚚 People & Logistics
                </span>
                <div className="space-y-0.5">
                  <button
                    onClick={() => setActiveSubTab("riders")}
                    className={`w-full font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer border ${
                      activeSubTab === "riders"
                        ? "bg-[#E21B70] border-[#E21B70] text-white shadow-sm"
                        : "bg-transparent border-transparent text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5 shrink-0" />
                    Riders Directory
                  </button>

                  <button
                    onClick={() => setActiveSubTab("users")}
                    className={`w-full font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer border ${
                      activeSubTab === "users"
                        ? "bg-[#E21B70] border-[#E21B70] text-white shadow-sm"
                        : "bg-transparent border-transparent text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    Users Directory
                    <span className={`ml-auto font-bold px-1.5 py-0.5 text-[9px] rounded-full leading-none ${
                      activeSubTab === "users" 
                        ? "glass-dark text-[#E21B70]" 
                        : "bg-white/5 text-white/60"
                    }`}>
                      {allUsersList.length}
                    </span>
                  </button>


                </div>
              </div>

              {/* Group 4: Global Settings & Marketing */}
              <div>
                <span className="text-[9px] font-black text-white/50 block uppercase tracking-widest pl-1 mb-1.5">
                  ⚙️ System & Marketing
                </span>
                <div className="space-y-0.5">

                  <button
                    onClick={() => setActiveSubTab("vouchers")}
                    className={`w-full font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer border ${
                      activeSubTab === "vouchers"
                        ? "bg-[#E21B70] border-[#E21B70] text-white shadow-sm"
                        : "bg-transparent border-transparent text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Ticket className="w-3.5 h-3.5 shrink-0" />
                    <span>Vouchers & Discounts</span>
                    {vouchersList.length > 0 && (
                      <span className={`ml-auto text-[10px] font-black px-1.5 py-0.2 rounded-md ${
                        activeSubTab === "vouchers" ? "bg-white/20 text-white" : "bg-white/5 text-white/70"
                      }`}>
                        {vouchersList.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveSubTab("loyalty")}
                    className={`w-full font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer border ${
                      activeSubTab === "loyalty"
                        ? "bg-[#E21B70] border-[#E21B70] text-white shadow-sm"
                        : "bg-transparent border-transparent text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5 shrink-0" />
                    Coins Loyalty Wallet
                  </button>

                  <button
                    onClick={() => setActiveSubTab("settings")}
                    className={`w-full font-black text-xs px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer border mt-1 ${
                      activeSubTab === "settings"
                        ? "bg-[#E21B70] border-[#E21B70] text-white shadow-md ring-1 ring-white/20"
                        : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                    }`}
                  >
                    <Settings className="w-4 h-4 shrink-0 text-white/60" />
                    <span>Store Settings</span>
                  </button>

                  {/* Distinct styling for Global System Settings */}
                  <button
                    onClick={() => setActiveSubTab("seo")}
                    className={`w-full font-black text-xs px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer border mt-1 ${
                      activeSubTab === "seo"
                        ? "bg-[#E21B70] border-[#E21B70] text-white shadow-md ring-1 ring-white/20"
                        : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                    }`}
                  >
                    <Settings className="w-4 h-4 shrink-0 text-white/60" />
                    <span>Global System & Settings</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Stats overview panel */}
            <div className="pt-4 border-t border-white/5 space-y-3">
              <span className="text-[9px] font-black text-white/50 block uppercase tracking-widest pl-1">
                Financial Coordinates
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="glass-tile glass-tile-pink admin-anim-in rounded-xl p-2.5 transition-all duration-300 hover:-translate-y-1" style={{ animationDelay: "0ms" }}>
                  <div className="relative z-10">
                    <span className="inline-block bg-black/25 text-white/90 text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full">
                      Gross Rev
                    </span>
                    <span className="text-[12.5px] font-black text-white mt-1 block leading-tight">
                      Rs. <CountUp value={totalRevenue} />
                    </span>
                  </div>
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    <DollarSign className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <div className="glass-tile glass-tile-green admin-anim-in rounded-xl p-2.5 transition-all duration-300 hover:-translate-y-1" style={{ animationDelay: "70ms" }}>
                  <div className="relative z-10">
                    <span className="inline-block bg-black/25 text-white/90 text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full">
                      Comm
                    </span>
                    <span className="text-[12.5px] font-black text-white mt-1 block leading-tight">
                      Rs. <CountUp value={totalCommissionSum} />
                    </span>
                  </div>
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    <Percent className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <div className="glass-tile glass-tile-blue admin-anim-in rounded-xl p-2.5 transition-all duration-300 hover:-translate-y-1" style={{ animationDelay: "140ms" }}>
                  <div className="relative z-10">
                    <span className="inline-block bg-black/25 text-white/90 text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full">
                      Completed
                    </span>
                    <span className="text-[12.5px] font-black text-white mt-1 block leading-tight">
                      <CountUp value={totalCompletedCount} />
                    </span>
                  </div>
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    <CheckCheck className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <div className="glass-tile glass-tile-violet admin-anim-in rounded-xl p-2.5 transition-all duration-300 hover:-translate-y-1" style={{ animationDelay: "210ms" }}>
                  <div className="relative z-10">
                    <span className="inline-block bg-black/25 text-white/90 text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full">
                      Active
                    </span>
                    <span className="text-[12.5px] font-black text-white mt-1 block leading-tight">
                      <CountUp value={totalActiveCount} />
                    </span>
                  </div>
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    <ShoppingCart className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Panels Area */}
        <div className="col-span-1 lg:col-span-9 space-y-8">
          {/* TAB 1: Real-time Analytics Dashboard */}
          {activeSubTab === "settings" && (
            <div className="space-y-8 animate-fade-in text-white col-span-1 lg:col-span-9">
              <div className="glass-dark border border-white/10 p-6 rounded-2xl shadow-sm relative">
                <h3 className="text-lg font-black text-white tracking-wide uppercase flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#E21B70]" /> Store Settings
                </h3>
                <p className="text-[11px] text-white/70 font-medium mt-1">
                  Delivery fees, store controls, announcement, live tracking, maintenance, Deal of the Hour and homepage images — sab kuch aik jagah.
                </p>
              </div>
              {/* Delivery Fees, Site Tax & Night Surcharge — new fee structure, 27 Nov 2026 */}
              <div className="glass-dark border border-white/10 p-6 rounded-2xl shadow-sm relative space-y-4">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#E21B70]/10 to-transparent" />
                <h4 className="font-black text-sm text-white flex items-center gap-2 pb-2.5 border-b border-white/10 uppercase tracking-wide">
                  <Truck className="w-4 h-4 text-[#E21B70]" />
                  Delivery Fees, Site Tax &amp; Night Surcharge
                </h4>
                <p className="text-[10.5px] text-white/70 font-medium leading-relaxed">
                  Food Rs. 70 · Grocery Rs. 100 · Medicine Rs. 30. Site Tax Rs. 12 applies to every order, even when delivery is free. Night surcharge is added on top of the final delivery fee from the start hour; free delivery (≥ Rs. 1000 or first order) waives the whole delivery fee including the surcharge.
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">Food Delivery Fee (Rs.)</span>
                    <input type="number" min="0" value={deliveryChargeInput} onChange={(e) => setDeliveryChargeInput(Number(e.target.value))} className="w-full p-3 glass-input border border-white/10 rounded-xl outline-none text-white font-extrabold focus:border-[#E21B70] transition text-xs" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">Grocery Delivery Fee (Rs.)</span>
                    <input type="number" min="0" value={groceryDeliveryFeeInput} onChange={(e) => setGroceryDeliveryFeeInput(Number(e.target.value))} className="w-full p-3 glass-input border border-white/10 rounded-xl outline-none text-white font-extrabold focus:border-[#E21B70] transition text-xs" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">Medicine Delivery Fee (Rs.)</span>
                    <input type="number" min="0" value={medicineDeliveryFeeInput} onChange={(e) => setMedicineDeliveryFeeInput(Number(e.target.value))} className="w-full p-3 glass-input border border-white/10 rounded-xl outline-none text-white font-extrabold focus:border-[#E21B70] transition text-xs" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">Site Tax (per order) (Rs.)</span>
                    <input type="number" min="0" value={siteTaxInput} onChange={(e) => setSiteTaxInput(Number(e.target.value))} className="w-full p-3 glass-input border border-white/10 rounded-xl outline-none text-white font-extrabold focus:border-[#E21B70] transition text-xs" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">Night Surcharge Amount (Rs)</span>
                    <input type="number" min="0" value={nightSurchargeAmountInput} onChange={(e) => setNightSurchargeAmountInput(Number(e.target.value))} className="w-full p-3 glass-input border border-white/10 rounded-xl outline-none text-white font-extrabold focus:border-[#E21B70] transition text-xs" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">Night Surcharge Starts At (hour, 0–23)</span>
                    <input type="number" min="0" max="23" value={nightSurchargeStartHourInput} onChange={(e) => setNightSurchargeStartHourInput(Number(e.target.value))} className="w-full p-3 glass-input border border-white/10 rounded-xl outline-none text-white font-extrabold focus:border-[#E21B70] transition text-xs" />
                  </div>
                </div>
                <button type="button" onClick={handleSaveDeliveryCharges} className="bg-[#E21B70] text-white font-black px-5 py-3 rounded-xl hover:scale-[1.02] active:scale-95 transition cursor-pointer text-xs uppercase w-full">
                  Save Delivery Fees
                </button>
              </div>
              {/* App Version — new APK launch notification (28 Nov 2026) */}
              <div className="glass-dark border border-white/10 p-6 rounded-2xl shadow-sm relative space-y-4">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#E21B70]/10 to-transparent" />
                <h4 className="font-black text-sm text-white flex items-center gap-2 pb-2.5 border-b border-white/10 uppercase tracking-wide">
                  📱 App Version — Update Notification (PWA)
                </h4>
                <p className="text-[10.5px] text-white/70 font-medium leading-relaxed">
                  APK band hai — ab sirf website (PWA) hai. Jab naya version launch ho, yahan naya version number set karo — purani PWA kholne par user ko turant update notification milega. Version number har nayi release par +1 karo (current app version: 3).
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">Latest Version (number)</span>
                    <input type="number" min="1" value={appVersionInput} onChange={(e) => setAppVersionInput(Number(e.target.value))} className="w-full p-3 glass-input border border-white/10 rounded-xl outline-none text-white font-extrabold focus:border-[#E21B70] transition text-xs" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">Update Message</span>
                    <input type="text" value={appVersionMsgInput} onChange={(e) => setAppVersionMsgInput(e.target.value)} placeholder="Naya version aa gaya!" className="w-full p-3 glass-input border border-white/10 rounded-xl outline-none text-white font-extrabold focus:border-[#E21B70] transition text-xs" />
                  </div>
                </div>
                <div className="text-[10.5px] text-white/60 font-semibold bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                  APK download band hai — ab sirf website (PWA) use hoti hai, is liye download link ki zaroorat nahi.
                </div>
                <button type="button" onClick={handleSaveAppVersion} className="bg-[#E21B70] text-white font-black px-5 py-3 rounded-xl hover:scale-[1.02] active:scale-95 transition cursor-pointer text-xs uppercase w-full">
                  Save &amp; Notify Old Apps
                </button>
              </div>
              <div className="glass-dark border border-white/10 p-6 rounded-2xl shadow-sm relative space-y-4">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#E21B70]/10 to-transparent" />
                <h4 className="font-black text-sm text-white flex items-center gap-2 pb-2.5 border-b border-white/10 uppercase tracking-wide">
                  <Truck className="w-4 h-4 text-[#E21B70]" />
                  Store Controls — Checkout &amp; Payment
                </h4>
<div className="pt-3 mt-3 border-t border-white/5 space-y-3">
                      <span className="block text-[10px] font-bold text-white/60 uppercase tracking-widest">
                        🏪 Store Controls — Checkout & Payment (user panel options)
                      </span>
                      <p className="text-[10.5px] text-white/60 font-semibold leading-relaxed">
                        Jo option customer ko cart/checkout mein dikhti hai, wo yahan se control hoti hai. Save karne par user panel turant update ho jata hai.
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">Easypaisa Account Title</span>
                          <input type="text" value={easypaisaTitleInput} onChange={(e) => setEasypaisaTitleInput(e.target.value)} placeholder="Ghulam Murtaza" className="w-full p-3 glass-input border border-white/10 rounded-xl outline-none text-white font-extrabold focus:border-[#E21B70] transition text-xs" />
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">Easypaisa Number</span>
                          <input type="text" value={easypaisaNumberInput} onChange={(e) => setEasypaisaNumberInput(e.target.value)} placeholder="03277004471" className="w-full p-3 glass-input border border-white/10 rounded-xl outline-none text-white font-extrabold focus:border-[#E21B70] transition text-xs" />
                        </div>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">WhatsApp / Support Number (country code ke saath, + ke baghair)</span>
                        <input type="text" value={whatsappNumberInput} onChange={(e) => setWhatsappNumberInput(e.target.value)} placeholder="923277004471" className="w-full p-3 glass-input border border-white/10 rounded-xl outline-none text-white font-extrabold focus:border-[#E21B70] transition text-xs" />
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">Rider Tip Options (comma se alag, Rs.)</span>
                        <input type="text" value={tipOptionsInput} onChange={(e) => setTipOptionsInput(e.target.value)} placeholder="0,50,100,200,300" className="w-full p-3 glass-input border border-white/10 rounded-xl outline-none text-white font-extrabold focus:border-[#E21B70] transition text-xs" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">Priority Extra Fee (Rs.)</span>
                          <input type="number" min="0" value={priorityFeeInput} onChange={(e) => setPriorityFeeInput(Number(e.target.value))} className="w-full p-3 glass-input border border-white/10 rounded-xl outline-none text-white font-extrabold focus:border-[#E21B70] transition text-xs" />
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">Free Delivery Above (Rs.)</span>
                          <input type="number" min="0" value={freeDeliveryAboveInput} onChange={(e) => setFreeDeliveryAboveInput(Number(e.target.value))} className="w-full p-3 glass-input border border-white/10 rounded-xl outline-none text-white font-extrabold focus:border-[#E21B70] transition text-xs" />
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">Double Fee Below (Rs., 0 = off)</span>
                          <input type="number" min="0" value={doubleFeeBelowInput} onChange={(e) => setDoubleFeeBelowInput(Number(e.target.value))} className="w-full p-3 glass-input border border-white/10 rounded-xl outline-none text-white font-extrabold focus:border-[#E21B70] transition text-xs" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {([
                          { label: "Priority speed dikhao", value: priorityEnabledInput, set: setPriorityEnabledInput },
                          { label: "Cutlery option dikhao", value: cutleryEnabledInput, set: setCutleryEnabledInput },
                          { label: "Leave at door dikhao", value: leaveAtDoorEnabledInput, set: setLeaveAtDoorEnabledInput },
                          { label: "Message on arrival dikhao", value: messageOnArrivalEnabledInput, set: setMessageOnArrivalEnabledInput },
                          { label: "First order FREE delivery", value: firstOrderFreeDeliveryInput, set: setFirstOrderFreeDeliveryInput },
                        ]).map((t) => (
                          <label key={t.label} className="flex items-center gap-2 glass-dark border border-white/10 rounded-xl px-3 py-2.5 cursor-pointer text-xs font-bold text-white/80">
                            <input type="checkbox" checked={t.value} onChange={(e) => t.set(e.target.checked)} className="accent-[#E21B70] w-4 h-4" />
                            {t.label}
                          </label>
                        ))}
                      </div>
                      <button type="button" onClick={handleSaveStoreControls} className="bg-[#E21B70] text-white font-black px-5 py-3 rounded-xl hover:scale-[1.02] active:scale-95 transition cursor-pointer text-xs uppercase w-full">
                        Save Store Controls
                      </button>
                      <button type="button" onClick={handleRefreshAllUsers} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-5 py-3 rounded-xl hover:scale-[1.02] active:scale-95 transition cursor-pointer text-xs uppercase w-full flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 shrink-0" />
                        Refresh All Users — Naya Menu/Price Sab Ko Bhejo
                      </button>
                      <p className="text-[10.5px] text-white/60 font-semibold leading-relaxed">
                        Price ya kuch bhi change karne ke baad ye dabayen — har user ke khule hue page par naya menu aur prices turant load ho jayenge.
                      </p>
                    </div>
              </div>
              {/* Voice Order, Delivery Areas & Delivery Time */}
              <div className="glass-dark border border-white/10 p-6 rounded-2xl shadow-sm relative space-y-4">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#E21B70]/10 to-transparent" />
                <h4 className="font-black text-sm text-white flex items-center gap-2 pb-2.5 border-b border-white/10 uppercase tracking-wide">
                  <Smartphone className="w-4 h-4 text-[#E21B70]" />
                  Voice Order &amp; Homepage
                </h4>
                <p className="text-[10.5px] text-white/70 font-medium leading-relaxed">
                  Voice order button (Munchi), the "We Deliver Across Dadu City" areas and the delivery-time text shown on the homepage. Saved in settings/delivery_config; the user panel reads them with fallbacks (voice on, the 10 areas, "25–35 min").
                </p>
                <label className="flex items-center gap-2 glass-dark border border-white/10 rounded-xl px-3 py-2.5 cursor-pointer text-xs font-bold text-white/80">
                  <input type="checkbox" checked={voiceOrderEnabledInput} onChange={(e) => setVoiceOrderEnabledInput(e.target.checked)} className="accent-[#E21B70] w-4 h-4" />
                  Voice order button dikhao (Munchi)
                </label>
                <label className="flex items-center gap-2 glass-dark border border-white/10 rounded-xl px-3 py-2.5 cursor-pointer text-xs font-bold text-white/80">
                  <input type="checkbox" checked={chatAgentEnabledInput} onChange={(e) => setChatAgentEnabledInput(e.target.checked)} className="accent-[#E21B70] w-4 h-4" />
                  Munchi chat agent dikhao (Chat karein)
                </label>
                <div>
                  <span className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">Delivery Time Text</span>
                  <input type="text" value={deliveryTimeTextInput} onChange={(e) => setDeliveryTimeTextInput(e.target.value)} placeholder="25–35 min" className="w-full p-3 glass-input border border-white/10 rounded-xl outline-none text-white font-extrabold focus:border-[#E21B70] transition text-xs" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">Delivery Areas (one per line)</span>
                  <textarea value={deliveryAreasInput} onChange={(e) => setDeliveryAreasInput(e.target.value)} rows={6} placeholder={"Shahani Paro\nMoro Road\nStation Road"} className="w-full p-3 glass-input border border-white/10 rounded-xl outline-none text-white font-extrabold focus:border-[#E21B70] transition text-xs resize-none" />
                </div>
                <button type="button" onClick={handleSaveHomepageSettings} className="bg-[#E21B70] text-white font-black px-5 py-3 rounded-xl hover:scale-[1.02] active:scale-95 transition cursor-pointer text-xs uppercase w-full">
                  Save Homepage Settings
                </button>
              </div>
              {/* Munchi Voice Pace — pre-speech pause, set from inside the app */}
              <div className="glass-dark border border-white/10 p-6 rounded-2xl shadow-sm relative space-y-4">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#E21B70]/10 to-transparent" />
                <h4 className="font-black text-sm text-white flex items-center gap-2 pb-2.5 border-b border-white/10 uppercase tracking-wide">
                  <Smartphone className="w-4 h-4 text-[#E21B70]" />
                  Munchi Voice Pace
                </h4>
                <p className="text-[10.5px] text-white/70 font-medium leading-relaxed">
                  Munchi ke jawab se pehle ka pause (milliseconds). Kam pause = tez jawab, zyada pause = aaram se jawab. Saved in settings/voice_config; user panel reads it — koi code change ya rebuild nahi chahiye. Save ke baad "Refresh All Users" dabayen to har phone par turant lag jaye.
                </p>
                <div className="flex gap-2">
                  {[
                    { label: "Tez · 150ms", ms: 150 },
                    { label: "Balanced · 700ms", ms: 700 },
                    { label: "Slow · 1200ms", ms: 1200 },
                  ].map((p) => (
                    <button
                      key={p.ms}
                      type="button"
                      onClick={() => setVoicePauseMsInput(p.ms)}
                      className={`flex-1 px-2 py-2.5 rounded-xl text-[11px] font-black cursor-pointer transition border ${voicePauseMsInput === p.ms ? "bg-white text-[#E21B70] border-white" : "glass-dark border-white/10 text-white/80 hover:border-[#E21B70]"}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">Pause (ms) — 0 se 5000</span>
                  <input type="number" min={0} max={5000} step={50} value={voicePauseMsInput} onChange={(e) => setVoicePauseMsInput(Number(e.target.value))} className="w-full p-3 glass-input border border-white/10 rounded-xl outline-none text-white font-extrabold focus:border-[#E21B70] transition text-xs" />
                </div>
                <button type="button" onClick={handleSaveVoicePace} className="bg-[#E21B70] text-white font-black px-5 py-3 rounded-xl hover:scale-[1.02] active:scale-95 transition cursor-pointer text-xs uppercase w-full">
                  {voicePauseSaved ? "Saved ✓" : "Save Voice Pace"}
                </button>
              </div>
<div className="glass-dark border border-white/10 p-6 rounded-2xl shadow-sm relative space-y-6">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#E21B70]/10 to-transparent" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                  <div>
                    <h4 className="font-black text-sm text-white flex items-center gap-2 uppercase tracking-wide">
                      <Percent className="w-4 h-4 text-[#E21B70]" />
                      Deal of the Hour Controller
                    </h4>
                    <p className="text-[11px] text-white/70 mt-1 leading-relaxed font-medium">
                      Configure the high-intensity countdown timer, set the
                      custom discount rate, and dynamically pick featured
                      dishes/services on sale.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveDealConfig}
                    className="bg-[#E21B70] hover:bg-[#C2145E] transition-all text-white font-black px-5 py-3 rounded-2xl text-[11px] uppercase tracking-wider cursor-pointer shadow-lg shadow-[#E21B70]/15 flex items-center gap-2 shrink-0 hover:scale-[1.02] active:scale-95 self-start sm:self-auto animate-pulse"
                  >
                    <Save className="w-4 h-4" />
                    Save Deal Settings
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-xs text-white">
                  <div className="md:col-span-12 flex items-center justify-between glass-dark border border-white/10 p-4 rounded-2xl border border-white/10">
                    <div>
                      <h5 className="font-bold text-sm text-white">
                        Enable Deal of the Hour
                      </h5>
                      <p className="text-[10px] text-white/60 mt-1">
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
                      <div className="w-11 h-6 bg-white/15 rounded-full peer transition-colors duration-300 peer-focus:ring-2 peer-focus:ring-[#E21B70]/40 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white/15 after:border-white/15 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E21B70] group-hover:after:glass-dark"></div>
                    </label>
                  </div>

                  <div className="md:col-span-4 space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-white/70 font-bold uppercase tracking-widest text-[9px]">
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
                      className="w-full p-3 glass-input border border-white/10 border border-white/10 rounded-2xl text-xs sm:text-sm outline-none text-white focus:border-[#E21B70]/60 transition"
                    />
                  </div>

                  <div className="md:col-span-4 space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-white/70 font-bold uppercase tracking-widest text-[9px]">
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
                      className="w-full p-3 glass-input border border-white/10 border border-white/10 rounded-2xl text-xs sm:text-sm outline-none text-white focus:border-[#E21B70]/60 transition"
                    />
                  </div>

                  <div className="md:col-span-4 space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-[#E21B70] font-bold uppercase tracking-widest text-[9px]">
                      Deal Banner Text (Optional)
                    </label>
                    <input
                      type="text"
                      value={dealText}
                      onChange={(e) => setDealText(e.target.value)}
                      placeholder={`e.g. Save ${dealDiscount}% on Tea & Fresh Platters!`}
                      className="w-full p-3 glass-input border border-white/10 border border-white/10 rounded-2xl text-xs sm:text-sm outline-none text-white focus:border-[#E21B70]/60 transition"
                    />
                  </div>
                </div>

                {/* Dynamic Items Select list */}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-white/70 font-bold uppercase tracking-widest text-[9px]">
                    Select Included Products & Services
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-3 glass-dark border border-white/10 rounded-2xl scrollbar-none">
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
                              ? "bg-[#E21B70]/10 border-[#E21B70] text-white/80"
                              : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // click handled on container
                            className="accent-[#E21B70] scale-105 pointer-events-none"
                          />
                          <div className="truncate flex-1">
                            <p className="font-bold truncate text-white leading-snug">
                              {dish.name}
                            </p>
                            <p className="text-[9.5px] text-white/60 font-extrabold uppercase mt-0.5 tracking-wide">
                              {dish.category} • Rs. {dish.price}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-white/60 font-bold uppercase tracking-wider block leading-relaxed">
                    💡 Active Deal of the Hour items will dynamically show the
                    discounted price calculated from your discount rate.
                  </span>
                </div>
              </div>
<div className="glass-dark border border-white/10 p-6 rounded-2xl shadow-sm relative space-y-4">
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#E21B70]/10 to-transparent" />
                  <h4 className="font-black text-sm text-white flex items-center gap-2 pb-2.5 border-b border-white/10 uppercase tracking-wide">
                    <ImageIcon className="w-4 h-4 text-[#E21B70]" />
                    Global Promo Offer / Pop-up Announcement
                  </h4>
                  <p className="text-[10.5px] text-white/70 font-medium leading-relaxed">
                    Yahan se aap kisi bhi product ya special offer ki image lagayein. Ye image har user ko app open karte hi aik dafa popup modal me dikhayi degi.
                  </p>

                  <div className="space-y-4 pt-1">
                    {/* Active Status Switch */}
                    <div className="flex items-center justify-between p-3.5 bg-emerald-500/10 rounded-2xl border border-emerald-400/25">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-white">Announcement Popup Status</span>
                        <span className="text-[10px] font-bold text-white/60">
                          {announcementActive ? "🔴 ACTIVE - Users Will See Popup" : "⚪ INACTIVE - Hidden"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAnnouncementActive(!announcementActive)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          announcementActive ? "bg-emerald-500" : "bg-white/15"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full glass-dark shadow-sm ring-0 transition duration-200 ease-in-out ${
                            announcementActive ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Announcement Image URL */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest flex items-center justify-between">
                        <span>Offer Image URL (Pehli Fursat Me Image Link Dalein)</span>
                        {announcementImageUrl && (
                          <span className="text-[9px] text-[#E21B70] lowercase select-all font-mono">
                            {announcementImageUrl.length > 30 ? announcementImageUrl.substring(0, 30) + "..." : announcementImageUrl}
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={announcementImageUrl}
                        onChange={(e) => setAnnouncementImageUrl(e.target.value)}
                        placeholder="https://example.com/offer-image.jpg"
                        className="w-full p-3 glass-input border border-white/10 rounded-xl outline-none text-white font-extrabold focus:border-[#E21B70] transition text-xs"
                      />
                    </div>

                    {/* Optional Title */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest">
                          Popup Title (Optional)
                        </label>
                        <input
                          type="text"
                          value={announcementTitle}
                          onChange={(e) => setAnnouncementTitle(e.target.value)}
                          placeholder="e.g. 50% Flat Discount Offer!"
                          className="w-full p-3 glass-input border border-white/10 rounded-xl outline-none text-white font-extrabold focus:border-[#E21B70] transition text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest">
                          Announcement ID (Unique string to force popup again)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={announcementId}
                            onChange={(e) => setAnnouncementId(e.target.value)}
                            placeholder="Auto-generated timestamp"
                            className="flex-1 p-3 glass-input border border-white/10 rounded-xl outline-none text-white/70 font-bold text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newId = "promo_" + Date.now();
                              setAnnouncementId(newId);
                              alert("Naya ID set ho gaya! Ab sab users ko ye popup aik bar phir dikhayi dega.");
                            }}
                            className="bg-zinc-100 hover:bg-zinc-200 text-white/80 text-[10px] font-black uppercase px-3.5 rounded-xl transition shrink-0"
                          >
                            🔄 Reset
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Optional Description */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest">
                        Popup Detail Description (Optional)
                      </label>
                      <textarea
                        value={announcementDescription}
                        onChange={(e) => setAnnouncementDescription(e.target.value)}
                        rows={2}
                        placeholder="Describe details of your flash sale or instruction..."
                        className="w-full p-3 glass-input border border-white/10 rounded-xl outline-none text-white font-extrabold focus:border-[#E21B70] transition text-xs resize-none"
                      />
                    </div>

                    {/* Live Preview of the Image Announcement */}
                    {announcementImageUrl && (
                      <div className="space-y-2 border border-white/5 bg-white/5 p-4 rounded-2xl">
                        <span className="block text-[9px] font-extrabold text-white/50 uppercase tracking-widest">Live Promo Image Preview:</span>
                        <div className="max-h-48 overflow-hidden rounded-xl border border-white/10 glass-dark flex items-center justify-center relative group">
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
                      onClick={handleSaveAnnouncement}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-xl hover:scale-[1.01] active:scale-95 transition cursor-pointer text-xs uppercase shadow-md shadow-emerald-500/15 flex items-center justify-center gap-2"
                    >
                      <span>📢 Save & Publish Offer Announcement</span>
                    </button>
                  </div>
                </div>
<div className="glass-dark border border-white/10 p-6 rounded-2xl shadow-sm relative space-y-4">
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#E21B70]/10 to-transparent" />
                  <h4 className="font-black text-sm text-white flex items-center gap-2 pb-2.5 border-b border-white/10 uppercase tracking-wide">
                    <Navigation className="w-4 h-4 text-[#E21B70]" />
                    Enable Live Rider Tracking
                  </h4>
                  <p className="text-[10.5px] text-white/70 font-medium leading-relaxed">
                    Toggle live rider GPS tracking on or off. Turning this OFF disables live location writes from riders to stay strictly within free plan limits.
                  </p>

                  <div className="flex items-center justify-between p-3.5 bg-pink-500/10 rounded-2xl border border-pink-400/25">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-white">Live Rider Tracking Status</span>
                      <span className="text-[10px] font-bold text-white/60">
                        {isLiveTrackingEnabled ? "🟢 ENABLED - Live GPS Active" : "🔴 PAUSED - Quota Saver Active"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleLiveTracking(!isLiveTrackingEnabled)}
                      aria-label="Toggle live rider GPS tracking"
                      aria-pressed={isLiveTrackingEnabled}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E21B70] ${
                        isLiveTrackingEnabled ? "bg-[#E21B70]" : "bg-white/15"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full glass-dark shadow-sm ring-0 transition duration-200 ease-in-out ${
                          isLiveTrackingEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
<div className="glass-dark border border-white/10 p-6 rounded-2xl shadow-sm relative space-y-4">
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#E21B70]/10 to-transparent" />
                  <h4 className="font-black text-sm text-white flex items-center gap-2 pb-2.5 border-b border-white/10 uppercase tracking-wide">
                    <Wrench className="w-4 h-4 text-[#E21B70]" />
                    System Maintenance Mode
                  </h4>
                  <p className="text-[10.5px] text-white/70 font-medium leading-relaxed">
                    Toggle maintenance mode. While enabled, general users will be blocked from using the platform and will see only your custom message. Admins bypass this block.
                  </p>

                  <div className="space-y-4 pt-1">
                    <div className="flex items-center justify-between p-3.5 bg-rose-500/10 rounded-2xl border border-rose-400/25">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-white">Maintenance Status</span>
                        <span className="text-[10px] font-bold text-white/60">
                          {isMaintenanceMode ? "🔴 ACTIVE - Users Blocked" : "🟢 INACTIVE - Public Access"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsMaintenanceMode(!isMaintenanceMode)}
                        aria-label="Toggle maintenance mode"
                        aria-pressed={isMaintenanceMode}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E21B70] ${
                          isMaintenanceMode ? "bg-[#E21B70]" : "bg-white/15"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full glass-dark shadow-sm ring-0 transition duration-200 ease-in-out ${
                            isMaintenanceMode ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest">
                        Maintenance Message for Users
                      </label>
                      <textarea
                        value={maintenanceMessage}
                        onChange={(e) => setMaintenanceMessage(e.target.value)}
                        rows={3}
                        placeholder="Provide a clear explanation..."
                        className="w-full p-3 glass-input border border-white/10 rounded-xl outline-none text-white font-extrabold focus:border-[#E21B70] transition text-xs resize-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveMaintenanceConfig}
                      className="w-full bg-[#E21B70] text-white font-black py-3 rounded-xl hover:scale-[1.01] active:scale-95 transition cursor-pointer text-xs uppercase"
                    >
                      Update Maintenance Mode
                    </button>
                  </div>
                </div>
<div className="glass-dark border border-white/10 rounded-3xl p-6 relative overflow-hidden mt-6 animate-scale-up">
                <div className="absolute right-0 top-0 w-80 h-80 bg-[#E21B70]/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-[#E21B70]">
                      <Grid className="w-5 h-5 text-[#E21B70]" />
                      <span className="text-[10px] font-black uppercase tracking-widest bg-[#E21B70]/10 px-2 py-0.5 rounded-full">
                        UI Configuration
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-white mt-1">
                      Theme Settings
                    </h2>
                    <p className="text-xs text-white/60 font-medium mt-1">
                      Configure the main hero background image.
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={handleSaveUiConfig}
                      className="bg-[#E21B70] hover:bg-[#C2145E] text-white font-black text-[10px] uppercase tracking-widest py-3 px-5 rounded-xl transition cursor-pointer shrink-0"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
<div className="glass-dark border border-white/10 rounded-[24px] p-5 lg:p-7 shadow-sm relative">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-white/60 uppercase tracking-widest block mb-1.5">
                      Hero Background Image URL
                    </label>
                    <input
                      type="text"
                      value={heroBgUrl}
                      onChange={(e) => setHeroBgUrl(e.target.value)}
                      placeholder="e.g. /images/dishes/pizza.jpg"
                      className="w-full p-3 glass-input border border-white/10 rounded-2xl text-xs sm:text-sm outline-none text-white focus:border-[#E21B70]/60 transition"
                    />
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <label className="text-[10px] font-black text-white/60 uppercase tracking-widest block mb-1.5">
                      Partner Shops Section Background Image URL 🏪
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={partnerShopsBgUrl}
                        onChange={(e) => setPartnerShopsBgUrl(e.target.value)}
                        placeholder="e.g. /images/dishes/pizza.jpg"
                        className="flex-1 p-3 glass-input border border-white/10 rounded-2xl text-xs sm:text-sm outline-none text-white focus:border-[#E21B70]/60 transition"
                      />
                      {partnerShopsBgUrl && (
                        <button
                          type="button"
                          onClick={() => setPartnerShopsBgUrl("")}
                          className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white/80 text-xs font-black rounded-2xl transition cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-white/50 font-medium mt-1.5">
                      Enter any image URL to customize the backdrop of the "Partner Shops" card. Leave empty to use the default high-definition culinary theme.
                    </p>

                    {partnerShopsBgUrl && (
                      <div className="mt-3 relative h-28 rounded-2xl overflow-hidden border border-white/10 shadow-inner">
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

          {activeSubTab === "analytics" && (
            <div className="space-y-8 animate-fade-in">
              {/* Glassy Stats Row — real admin stats (no invented numbers) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
                <div className="glass-dark admin-anim-in glass-sheen-sweep rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5" style={{ animationDelay: "0ms" }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-sm text-white/60 font-medium block">Total Revenue</span>
                      <span className="text-2xl font-bold text-white block mt-1.5">Rs. <CountUp value={totalRevenue} /></span>
                      <span className="text-emerald-400 text-xs font-bold flex items-center gap-1 mt-2">
                        <ArrowUpRight className="w-3.5 h-3.5" /> {totalCompletedCount} completed orders
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-[#E21B70]/15 text-pink-400 flex items-center justify-center shrink-0">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                </div>
                <div className="glass-dark admin-anim-in glass-sheen-sweep rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5" style={{ animationDelay: "70ms" }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-sm text-white/60 font-medium block">Active Orders</span>
                      <span className="text-2xl font-bold text-white block mt-1.5"><CountUp value={totalActiveCount} /></span>
                      <span className="text-emerald-400 text-xs font-bold flex items-center gap-1 mt-2">
                        <ArrowUpRight className="w-3.5 h-3.5" /> live fulfilment queue
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
                      <ShoppingCart className="w-5 h-5" />
                    </div>
                  </div>
                </div>
                <div className="glass-dark admin-anim-in glass-sheen-sweep rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5" style={{ animationDelay: "140ms" }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-sm text-white/60 font-medium block">Completed Orders</span>
                      <span className="text-2xl font-bold text-white block mt-1.5"><CountUp value={totalCompletedCount} /></span>
                      <span className="text-emerald-400 text-xs font-bold flex items-center gap-1 mt-2">
                        <ArrowUpRight className="w-3.5 h-3.5" /> Rs. {totalCommissionSum} commission earned
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCheck className="w-5 h-5" />
                    </div>
                  </div>
                </div>
                <div className="glass-dark admin-anim-in glass-sheen-sweep rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5" style={{ animationDelay: "210ms" }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-sm text-white/60 font-medium block">Total Users</span>
                      <span className="text-2xl font-bold text-white block mt-1.5"><CountUp value={allUsersList.length} /></span>
                      <span className="text-emerald-400 text-xs font-bold flex items-center gap-1 mt-2">
                        <ArrowUpRight className="w-3.5 h-3.5" /> {ridersSubset.length} riders onboard
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-violet-500/15 text-violet-400 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sales Summary last 7 days of order volume and total revenue */}
              <div className="glass-dark glass-glow admin-anim-in glass-sheen-sweep border border-white/10 p-6 rounded-2xl shadow-sm relative" style={{ animationDelay: "280ms" }}>
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#E21B70]/20 to-transparent" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h4 className="font-black text-sm text-white flex items-center gap-2 tracking-wide uppercase">
                      <TrendingUp className="w-4 h-4 text-[#E21B70]" />
                      Sales Summary (Last 7 Days)
                    </h4>
                    <span className="text-[10px] text-white/60 font-bold uppercase tracking-wider block mt-0.5">
                      Completed orders volume & total gross revenue mapped daily
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-[11px] font-bold">
                    <div className="flex items-center gap-1.5 bg-[#E21B70]/10 border border-[#E21B70]/25 text-pink-400 px-2.5 py-1 rounded-lg">
                      <span className="w-2 h-2 rounded-full bg-[#E21B70]"></span>
                      Revenue (Left Axis)
                    </div>
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-400/25 text-emerald-400 px-2.5 py-1 rounded-lg">
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
                        stroke="rgba(255,255,255,0.08)"
                        opacity={0.3}
                      />
                      <XAxis
                        dataKey="date"
                        stroke="rgba(255,255,255,0.5)"
                        fontSize={10}
                        fontWeight="bold"
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="left"
                        orientation="left"
                        stroke="#E21B70"
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
                        cursor={{ fill: 'rgba(255,255,255,0.06)', opacity: 0.5 }}
                        contentStyle={{
                          backgroundColor: "#14141A",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: "14px",
                          fontSize: "11px",
                          color: "#ffffff",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                        }}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Bar
                        yAxisId="left"
                        dataKey="revenue"
                        animationDuration={900}
                        animationBegin={0}
                        animationEasing="ease-out"
                        fill="#E21B70"
                        name="Total Revenue (Rs.)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={45}
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="volume"
                        animationDuration={900}
                        animationBegin={150}
                        animationEasing="ease-out"
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
                <div className="glass-dark admin-anim-in border border-white/10 p-6 rounded-2xl shadow-sm relative" style={{ animationDelay: "350ms" }}>
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#E21B70]/10 to-transparent" />
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h4 className="font-black text-sm text-white flex items-center gap-2 tracking-wide uppercase">
                        <TrendingUp className="w-4 h-4 text-[#E21B70]" />
                        Delivered Order Revenue Pipeline
                      </h4>
                      <span className="text-[10px] text-white/60 font-bold uppercase tracking-wider">
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
                          stroke="rgba(255,255,255,0.08)"
                          opacity={0.3}
                        />
                        <XAxis
                          dataKey="date"
                          stroke="rgba(255,255,255,0.5)"
                          fontSize={9}
                          fontStyle="bold"
                        />
                        <YAxis stroke="rgba(255,255,255,0.5)" fontSize={9} fontStyle="bold" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#14141A",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: "14px",
                            fontSize: "11px",
                            color: "#ffffff",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          animationDuration={900}
                          animationEasing="ease-out"
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
                <div className="glass-dark admin-anim-in border border-white/10 p-6 rounded-2xl shadow-sm relative" style={{ animationDelay: "420ms" }}>
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-pink-500/10 to-transparent" />
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h4 className="font-black text-sm text-white flex items-center gap-2 tracking-wide uppercase">
                        <Package className="w-4 h-4 text-[#E21B70]" />
                        Category Quantity Demand Analytics
                      </h4>
                      <span className="text-[10px] text-white/60 font-bold uppercase tracking-wider">
                        Volume of products purchased from database
                      </span>
                    </div>
                  </div>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getCategoryChartData()}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.08)"
                          opacity={0.3}
                        />
                        <XAxis
                          dataKey="name"
                          stroke="rgba(255,255,255,0.5)"
                          fontSize={9}
                          fontStyle="bold"
                        />
                        <YAxis stroke="rgba(255,255,255,0.5)" fontSize={9} fontStyle="bold" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#14141A",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: "14px",
                            fontSize: "11px",
                            color: "#ffffff",
                          }}
                        />
                        <Bar
                          dataKey="sales"
                          animationDuration={900}
                          animationBegin={100}
                          animationEasing="ease-out"
                          fill="#E21B70"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Delivery Charge Setup Card & Broadcast Manager */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                

                {/* Chime trigger in-app broadcaster */}
                <div className="glass-dark border border-white/10 p-6 rounded-2xl shadow-sm space-y-5 relative">
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent" />
                  <div>
                    <h4 className="font-black text-sm text-white flex items-center gap-2 uppercase tracking-wide">
                      <Smartphone className="w-4 h-4 text-emerald-400 animate-pulse" />
                      In-App Broadcast Dispatcher
                    </h4>
                    <p className="text-[11px] text-white/70 mt-2.5 leading-relaxed font-medium">
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
                      className="w-full p-3 glass-input border border-white/10 border border-white/10 rounded-xl outline-none text-white focus:border-emerald-400/40 focus:ring-1 focus:ring-emerald-500/10 transition"
                    />
                    <textarea
                      rows={2}
                      placeholder="Notification Message body text..."
                      value={alertMessage}
                      onChange={(e) => setAlertMessage(e.target.value)}
                      className="w-full p-3 glass-input border border-white/10 border border-white/10 rounded-xl outline-none text-white focus:border-emerald-400/40 focus:ring-1 focus:ring-emerald-500/10 transition resize-none"
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

              
            </div>
          )}

          {/* TAB: Manage Restaurants */}
          {activeSubTab === "restaurants" && (
            <div className="space-y-8 animate-fade-in">
              <div className="glass-dark border border-white/10 p-6 rounded-2xl shadow-sm relative">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
                <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white tracking-wide uppercase">
                      Restaurants & Vendors Manager
                    </h3>
                    <p className="text-[11px] text-white/70 font-medium">
                      Control opening/closing hours and register new partners
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Register New Restaurant */}
                  <div className="glass-dark border border-white/10 border border-white/10 p-5 rounded-2xl space-y-4">
                    <h4 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                      <Plus className="w-3.5 h-3.5 text-emerald-400" /> Add New
                      Restaurant
                    </h4>
                    <div className="space-y-3">
                      <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest">
                        Restaurant Name
                      </label>
                      <input
                        type="text"
                        value={newRestaurantInput}
                        onChange={(e) => setNewRestaurantInput(e.target.value)}
                        placeholder="e.g. Dadu Pizza Shop"
                        className="w-full p-3 glass-input border border-white/10 rounded-xl text-xs text-white outline-none text-white focus:border-[#E21B70]/60 transition"
                      />
                      <button
                        onClick={handleAddNewRestaurant}
                        disabled={!newRestaurantInput.trim()}
                        className={`w-full py-3 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                          !newRestaurantInput.trim()
                            ? "bg-white/15 text-white/60 cursor-not-allowed"
                            : "bg-emerald-500 hover:bg-emerald-600 text-black shadow-lg shadow-emerald-500/10 cursor-pointer hover:scale-[1.02] active:scale-95"
                        }`}
                      >
                        <UserPlus className="w-4 h-4 shrink-0" />
                        Register Vendor
                      </button>
                    </div>
                  </div>

                  {/* Schedule Manager */}
                  <div className="glass-dark border border-white/10 border border-white/10 p-5 rounded-2xl space-y-4">
                    <h4 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                      <Settings className="w-3.5 h-3.5 text-purple-400" />{" "}
                      Manage Timings
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">
                          Select Vendor
                        </label>
                        <div className="relative">
                          <select
                            value={selectedScheduleRestaurant}
                            onChange={(e) =>
                              setSelectedScheduleRestaurant(e.target.value)
                            }
                            className="w-full p-3 glass-input border border-white/10 rounded-xl text-xs text-white outline-none appearance-none focus:border-[#E21B70]/60 transition"
                          >
                            {uniqueRestaurants.map((rest) => (
                              <option key={rest} value={rest}>
                                {rest}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/60">
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

                      <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
                        <div>
                          <h5 className="font-bold text-xs text-white">
                            Temporarily Unavailable
                          </h5>
                          <p className="text-[9px] text-white/60 mt-0.5">
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
                          <div className="w-10 h-5 bg-white/15 rounded-full peer transition-colors duration-300 peer-focus:ring-2 peer-focus:ring-purple-500/40 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/15 after:border-white/15 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">
                            Open Time
                          </label>
                          <input
                            type="time"
                            value={restOpeningTime}
                            onChange={(e) => setRestOpeningTime(e.target.value)}
                            className="w-full p-3 glass-input border border-white/10 rounded-xl text-xs text-white outline-none text-white focus:border-[#E21B70]/60 transition"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">
                            Close Time
                          </label>
                          <input
                            type="time"
                            value={restClosingTime}
                            onChange={(e) => setRestClosingTime(e.target.value)}
                            className="w-full p-3 glass-input border border-white/10 rounded-xl text-xs text-white outline-none text-white focus:border-[#E21B70]/60 transition"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">
                          Restaurant Contact Phone
                        </label>
                        <input
                          type="text"
                          value={restPhone}
                          onChange={(e) => setRestPhone(e.target.value)}
                          placeholder="e.g. 03277004471"
                          className="w-full p-3 glass-input border border-white/10 rounded-xl text-xs text-white outline-none text-white focus:border-[#E21B70]/60 transition"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">
                            Min Order
                          </label>
                          <input
                            type="number"
                            value={restMinOrder}
                            onChange={(e) => setRestMinOrder(e.target.value)}
                            placeholder="e.g. 300"
                            className="w-full p-3 glass-input border border-white/10 rounded-xl text-xs text-white outline-none text-white focus:border-[#E21B70]/60 transition"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">
                            Delivery Charge Text
                          </label>
                          <input
                            type="text"
                            value={restDeliveryCharge}
                            onChange={(e) => setRestDeliveryCharge(e.target.value)}
                            placeholder="e.g. Rs. 70"
                            className="w-full p-3 glass-input border border-white/10 rounded-xl text-xs text-white outline-none text-white focus:border-[#E21B70]/60 transition"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">
                            Delivery Time Text
                          </label>
                          <input
                            type="text"
                            value={restDeliveryTime}
                            onChange={(e) => setRestDeliveryTime(e.target.value)}
                            placeholder="e.g. 25–35 min"
                            className="w-full p-3 glass-input border border-white/10 rounded-xl text-xs text-white outline-none text-white focus:border-[#E21B70]/60 transition"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">
                            Tagline
                          </label>
                          <input
                            type="text"
                            value={restTagline}
                            onChange={(e) => setRestTagline(e.target.value)}
                            placeholder="e.g. Dadu's favourite biryani"
                            className="w-full p-3 glass-input border border-white/10 rounded-xl text-xs text-white outline-none text-white focus:border-[#E21B70]/60 transition"
                          />
                        </div>
                      </div>
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#E21B70]" />
                            Restaurant Location on Map
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowRestManualCoords(!showRestManualCoords)}
                            className="text-[9.5px] font-bold text-[#E21B70] hover:underline cursor-pointer"
                          >
                            {showRestManualCoords ? "Hide Manual Inputs" : "✍️ Manual Fill (Lat / Lng)"}
                          </button>
                        </div>
                        <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl shrink-0 ${restLat && restLng ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/15 text-white/60"}`}>
                              <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="block text-xs font-black text-white">
                                {restLat && restLng ? "📍 Pinpoint Location Set" : "No Location Set"}
                              </span>
                              <span className="block text-[10.5px] text-white/60 font-semibold font-mono mt-0.5">
                                {restLat && restLng ? `${restLat}, ${restLng}` : "Click map button to choose exact restaurant location"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {restLat && restLng && (
                              <button
                                type="button"
                                onClick={() => { setRestLat(""); setRestLng(""); }}
                                className="px-2.5 py-2 rounded-xl border border-white/10 text-[10px] font-extrabold text-white/60 hover:text-rose-400 hover:bg-white/10 transition cursor-pointer"
                              >
                                Clear
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setIsRestaurantMapPickerOpen(true)}
                              className="px-4 py-2 rounded-xl bg-[#E21B70] hover:bg-[#C2145E] text-white text-xs font-black shadow-md shadow-pink-500/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{restLat && restLng ? "Change on Map" : "Set Location on Map"}</span>
                            </button>
                          </div>
                        </div>

                        {showRestManualCoords && (
                          <div className="grid grid-cols-2 gap-2.5 mt-2.5 p-3 bg-white/5 border border-white/10 rounded-2xl animate-fade-in">
                            <div>
                              <label className="text-[9px] font-extrabold text-white/60 uppercase tracking-wider block mb-1">
                                Latitude (e.g. 26.7323)
                              </label>
                              <input
                                type="text"
                                placeholder="26.7323"
                                value={restLat}
                                onChange={(e) => setRestLat(e.target.value)}
                                className="w-full p-2.5 glass-input border border-white/10 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-[#E21B70] transition"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-extrabold text-white/60 uppercase tracking-wider block mb-1">
                                Longitude (e.g. 67.7744)
                              </label>
                              <input
                                type="text"
                                placeholder="67.7744"
                                value={restLng}
                                onChange={(e) => setRestLng(e.target.value)}
                                className="w-full p-2.5 glass-input border border-white/10 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-[#E21B70] transition"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Restaurant Commission Configuration (Admin Only) */}
                      <div className="bg-purple-500/5 p-4 rounded-2xl border border-purple-500/15 space-y-3.5 mt-2">
                        <div className="flex items-center justify-between">
                          <div className="text-left">
                            <h5 className="font-extrabold text-xs text-white uppercase tracking-wide">
                              Restaurant Commission (Admin Share)
                            </h5>
                            <p className="text-[9.5px] text-white/60 font-semibold leading-normal mt-0.5">
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
                            <div className="w-10 h-5 bg-white/15 rounded-full peer transition-colors duration-300 peer-focus:ring-2 peer-focus:ring-purple-500/40 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/15 after:border-white/15 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
                          </label>
                        </div>

                        {restCommissionEnabled && (
                          <div className="grid grid-cols-2 gap-3 pt-1 text-left">
                            <div>
                              <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">
                                Commission Type
                              </label>
                              <select
                                value={restCommissionType}
                                onChange={(e) => setRestCommissionType(e.target.value as "percentage" | "fixed")}
                                className="w-full p-2.5 glass-input border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#E21B70]/60 transition appearance-none cursor-pointer"
                              >
                                <option value="percentage">Percentage (%)</option>
                                <option value="fixed">Fixed Amount (Rs.)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">
                                {restCommissionType === "percentage" ? "Commission % Rate" : "Commission Flat (Rs.)"}
                              </label>
                              <input
                                type="number"
                                value={restCommissionValue}
                                onChange={(e) => setRestCommissionValue(e.target.value)}
                                placeholder={restCommissionType === "percentage" ? "e.g. 10" : "e.g. 50"}
                                className="w-full p-2.5 glass-input border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#E21B70]/60 transition"
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
                          onClick={handleSaveRestaurantStatus}
                          className="w-full bg-[#E21B70] hover:bg-[#C2145E] transition-all text-white font-black py-3 rounded-xl text-[11px] uppercase tracking-wider cursor-pointer shadow-lg shadow-pink-500/15 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
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
                          className="w-full bg-white/5 hover:bg-white/10 border border-white/15 transition-all text-white font-black py-3 rounded-xl text-[11px] uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
                        >
                          <ListCollapse className="w-4 h-4 shrink-0" />
                          Manage Menu / Items
                        </button>

                        <button
                          onClick={() =>
                            handleRenameRestaurant(selectedScheduleRestaurant)
                          }
                          className="w-full bg-blue-500/10 hover:bg-blue-500/15 text-blue-400 border border-blue-400/30 transition-all font-black py-3 rounded-xl text-[11px] uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
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
                <div className="mt-8 glass-dark border border-white/10 border border-white/10 p-5 rounded-2xl space-y-4">
                  <h4 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                    <ListCollapse className="w-3.5 h-3.5 text-purple-400" /> Existing Vendors Directory
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {uniqueRestaurants.map((restName) => (
                      <div
                        key={restName}
                        className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between group hover:border-purple-500/30 transition-colors animate-fade-in"
                      >
                        <span className="text-xs font-bold text-white line-clamp-1 pr-2">
                          {restName}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              setSelectedRestLedgerName(restName);
                              setRestStatsTimeframe("all");
                              setShowRestSettledHistory(false);
                            }}
                            className="h-7 px-2.5 flex items-center justify-center gap-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all font-black text-[9.5px] uppercase tracking-wider cursor-pointer shadow-sm"
                            title={`View Report Ledger for ${restName}`}
                          >
                            <ClipboardList className="w-3.5 h-3.5" />
                            Ledger
                          </button>
                          <button
                            onClick={() => handleDeleteRestaurant(restName)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors shrink-0 cursor-pointer"
                            title={`Delete ${restName}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {uniqueRestaurants.length === 0 && (
                      <p className="text-[10px] text-white/60 italic col-span-full">No vendors found.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Manage Items Directory */}
          {activeSubTab === "items" && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center justify-between glass-dark  border border-white/10 p-4 rounded-2xl shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E21B70]/10 flex items-center justify-center">
                    <ListCollapse className="w-5 h-5 text-[#E21B70]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white tracking-wide uppercase">
                      Managing Menu
                    </h3>
                    <p className="text-[11px] text-white/60 font-semibold mt-0.5">Menu — khane ki cheezein, price aur photo yahan se badlein</p>
                    <p className="text-[11px] text-white/70 font-medium">
                      For:{" "}
                      <span className="text-[#E21B70] font-bold">
                        {newItemRestaurantName || "All Vendors"}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    type="text"
                    value={itemSearchTerm}
                    onChange={(e) => setItemSearchTerm(e.target.value)}
                    placeholder="🔍 Dish dhoondhein (naam likhein)..."
                    className="glass-input border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-[#E21B70] transition min-w-[220px] flex-1"
                  />
                  <button
                    onClick={() => {
                      setActiveSubTab("restaurants");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="bg-white/5 hover:bg-slate-900 text-white/80 hover:text-white px-4 py-2 min-h-[40px] rounded-xl text-[10px] uppercase font-black tracking-wider transition-colors border border-white/10 hover:border-white/15 flex items-center gap-2"
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

              {/* Add New Dish Form */}
              <form
                onSubmit={handleAddNewItem}
                className="glass-dark border border-white/10 p-6 rounded-2xl shadow-sm space-y-5 relative"
              >
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#E21B70]/10 to-transparent" />
                <h4 className="font-black text-sm text-white flex items-center gap-2 pb-3 border-b border-white/10 uppercase tracking-wide">
                  <Plus className="w-4 h-4 text-[#E21B70]" />
                  Register New Dish
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 text-xs">
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-white/60 font-bold uppercase tracking-widest text-[9px]">
                      Title Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="e.g. Premium Beef Cheese Burger"
                      className="w-full p-3 glass-input border border-white/10 border border-white/10 rounded-xl text-white outline-none text-white focus:border-[#E21B70] transition focus:ring-1 focus:ring-[#E21B70]/10 animate-pulse-subtle"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-white/60 font-bold uppercase tracking-widest text-[9px]">
                      Catalog Category
                    </label>
                    <select
                      value={newItemCategory}
                      onChange={(e) =>
                        setNewItemCategory(e.target.value as Dish["category"])
                      }
                      className="w-full p-3 glass-input border border-white/10 border border-white/10 rounded-xl text-white outline-none text-white focus:border-[#E21B70] cursor-pointer transition focus:ring-1 focus:ring-[#E21B70]/10"
                    >
                      {foodCategories.length > 0 ? (
                        foodCategories.map((cat) => (
                          <option key={cat.id} value={cat.name}>
                            {cat.name} {cat.emoji}
                          </option>
                        ))
                      ) : (
                        // Fallback while categories are still loading / none exist yet —
                        // otherwise the select renders empty and the dish silently
                        // saves with the stale default category.
                        (["Burgers", "Pizza", "Broast", "Rolls", "Pasta", "Lazania", "Fries", "Paratha", "Sandwich", "Chicken & Rice", "Drinks", "Specials"] as const).map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-white/60 font-bold uppercase tracking-widest text-[9px]">
                      Base Price (Rs.)
                    </label>
                    <input
                      type="number"
                      required
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(Number(e.target.value))}
                      placeholder="e.g. 500"
                      className="w-full p-3 glass-input border border-white/10 border border-white/10 rounded-xl text-white outline-none text-white focus:border-[#E21B70] transition focus:ring-1 focus:ring-[#E21B70]/10"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-white/60 font-bold uppercase tracking-widest text-[9px]">
                      Discount Price (Rs.)
                    </label>
                    <input
                      type="number"
                      value={newItemDiscountPrice || ""}
                      onChange={(e) =>
                        setNewItemDiscountPrice(Number(e.target.value))
                      }
                      placeholder="Optional"
                      className="w-full p-3 glass-input border border-white/10 border border-white/10 rounded-xl text-white outline-none text-white focus:border-[#E21B70] transition focus:ring-1 focus:ring-[#E21B70]/10"
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
                      className="w-full p-3 glass-input border border-white/10 border border-emerald-400/40 rounded-xl text-white outline-none text-white focus:border-emerald-400/40 transition focus:ring-1 focus:ring-emerald-500/10 font-bold"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-white/60 font-bold uppercase tracking-widest text-[9px]">
                      Cost Price (Rs.) — for margin
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newItemCostPrice || ""}
                      onChange={(e) => setNewItemCostPrice(Number(e.target.value))}
                      placeholder="e.g. 200"
                      className="w-full p-3 glass-input border border-white/10 border border-white/10 rounded-xl text-white outline-none text-white focus:border-[#E21B70] transition focus:ring-1 focus:ring-[#E21B70]/10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-white/60 font-bold uppercase tracking-widest text-[9px]">
                      Open Time
                    </label>
                    <input
                      type="time"
                      value={newItemOpeningTime}
                      onChange={(e) => setNewItemOpeningTime(e.target.value)}
                      className="w-full p-3 glass-input border border-white/10 rounded-xl text-white outline-none text-white focus:border-[#E21B70] transition"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-white/60 font-bold uppercase tracking-widest text-[9px]">
                      Close Time
                    </label>
                    <input
                      type="time"
                      value={newItemClosingTime}
                      onChange={(e) => setNewItemClosingTime(e.target.value)}
                      className="w-full p-3 glass-input border border-white/10 rounded-xl text-white outline-none text-white focus:border-[#E21B70] transition"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-white/60 font-bold uppercase tracking-widest text-[9px]">
                      Description Information
                    </label>
                    <input
                      type="text"
                      value={newItemDescription}
                      onChange={(e) => setNewItemDescription(e.target.value)}
                      placeholder="Brief descriptive labels shown to customers"
                      className="w-full p-3 glass-input border border-white/10 border border-white/10 rounded-xl text-white outline-none text-white focus:border-[#E21B70] transition focus:ring-1 focus:ring-[#E21B70]/10"
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
                    <label className="text-[#E21B70] font-bold uppercase tracking-widest text-[9px]">
                      Restaurant / Partner Shop Name
                    </label>
                    <div className="relative">
                      <select
                        value={newItemRestaurantName}
                        onChange={(e) =>
                          setNewItemRestaurantName(e.target.value)
                        }
                        className="w-full p-3 glass-input border border-white/10 border border-white/10 rounded-xl text-white outline-none appearance-none focus:border-[#E21B70] transition focus:ring-1 focus:ring-[#E21B70]/10"
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
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/60">
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
                    <label className="flex items-center gap-2 cursor-pointer bg-amber-500/10 border border-amber-500/30 px-3.5 py-3 rounded-xl text-amber-400 font-extrabold text-xs transition hover:bg-amber-500/20 w-full">
                      <input
                        type="checkbox"
                        checked={newItemIsBestseller}
                        onChange={(e) => setNewItemIsBestseller(e.target.checked)}
                        className="w-4 h-4 accent-[#E21B70] rounded cursor-pointer"
                      />
                      <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
                      <span>Mark as Bestseller Option 🔥</span>
                    </label>
                  </div>

                  <div className="md:col-span-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <label className="text-white/60 font-bold uppercase tracking-widest text-[9px]">
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
                            className="bg-[#E21B70]/10 text-[#E21B70] px-2 py-1 rounded text-[10px] font-bold hover:bg-[#E21B70]/20"
                          >
                            + Add Size
                          </button>
                        </div>
                        {newItemSizes.map((size, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col gap-2 glass-dark border border-white/10 p-3 rounded-xl border border-white/10 relative"
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
                                className="w-full p-2 bg-transparent text-white text-xs outline-none border border-white/10 rounded-lg focus:border-[#E21B70]"
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
                                className="w-full p-2 bg-transparent text-white text-xs outline-none border border-white/10 rounded-lg focus:border-[#E21B70]"
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
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <label className="text-white/60 font-bold uppercase tracking-widest text-[9px]">
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
                            className="bg-[#E21B70]/10 text-[#E21B70] px-2 py-1 rounded text-[10px] font-bold hover:bg-[#E21B70]/20"
                          >
                            + Add Flavor
                          </button>
                        </div>
                        {newItemFlavors.map((flavor, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col gap-2 glass-dark border border-white/10 p-3 rounded-xl border border-white/10 relative"
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
                                className="w-full p-2 bg-transparent text-white text-xs outline-none border border-white/10 rounded-lg focus:border-[#E21B70]"
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
                                className="w-full p-2 bg-transparent text-white text-xs outline-none border border-white/10 rounded-lg focus:border-[#E21B70]"
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
                                className="w-full p-2 bg-transparent text-white text-xs outline-none border border-white/10 rounded-lg focus:border-[#E21B70]"
                              />
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <label className="text-xs text-white flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={flavor.isPopular || false}
                                  onChange={(e) => {
                                    const newFlavors = [...newItemFlavors];
                                    newFlavors[idx].isPopular =
                                      e.target.checked;
                                    setNewItemFlavors(newFlavors);
                                  }}
                                  className="w-4 h-4 rounded text-[#E21B70] glass-input border-white/15"
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
                        <div className="flex justify-between items-center border-b border-white/10 pb-2">
                          <label className="text-white/60 font-bold uppercase tracking-widest text-[9px]">
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
                            className="bg-[#E21B70]/10 text-[#E21B70] px-2 py-1 rounded text-[10px] font-bold hover:bg-[#E21B70]/20"
                          >
                            + Add Add-on
                          </button>
                        </div>
                        {newItemAddOns.map((ad, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col gap-2 glass-dark border border-white/10 p-3 rounded-xl border border-white/10 relative"
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
                                className="w-full p-2 bg-transparent text-white text-xs outline-none border border-white/10 rounded-lg focus:border-[#E21B70]"
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
                                className="w-full p-2 bg-transparent text-white text-xs outline-none border border-white/10 rounded-lg focus:border-[#E21B70]"
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
                                className="w-full p-2 bg-transparent text-white text-xs outline-none border border-white/10 rounded-lg focus:border-[#E21B70]"
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
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-[#E21B70] hover:bg-[#C2145E] transition-all font-black text-xs tracking-widest text-white uppercase py-3.5 px-6 rounded-2xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#E21B70]/10 hover:scale-[1.02] active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    Dispatch Item to Database
                  </button>
                </div>
              </form>

              {/* Items Table List */}
              <div className="glass-dark  border border-white/10 rounded-[24px] overflow-hidden shadow-sm relative">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#E21B70]/10 to-transparent" />
                <div className="p-5 border-b border-white/10 bg-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-black text-sm text-white uppercase tracking-wide">
                      Operational Catalog Directory
                    </h4>
                    <span className="text-[10px] text-white/60 font-bold uppercase tracking-wider">
                      Enable availability controls and edit prices instantly
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-white/50 whitespace-nowrap">Filter by Restaurant:</span>
                    <select
                      value={newItemRestaurantName}
                      onChange={(e) => setNewItemRestaurantName(e.target.value)}
                      className="p-2 glass-input border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:border-[#E21B70] min-w-[200px]"
                    >
                      <option value="">All Restaurants / Vendors</option>
                      {uniqueRestaurants.map((rest) => (
                        <option key={rest} value={rest}>{rest}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-white/70 font-medium">
                    <thead className="glass-dark border border-white/10 text-white/60 uppercase font-black tracking-widest text-[9px] border-b border-white/10">
                      <tr>
                        <th className="p-4.5">Item Name</th>
                        <th className="p-4.5">Category</th>
                        <th className="p-4.5">Type</th>
                        <th className="p-4.5">Price (Rs.)</th>
              <th className="p-4.5">Margin</th>
                        <th className="p-4.5 text-center">Featured</th>
                        <th className="p-4.5 text-center">Bestseller</th>
                        <th className="p-4.5 text-center">ON/OFF Toggle</th>
                        <th className="p-4.5 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {dishes
                        .filter((dish) => {
                          if (dish.type === "service") return false;
                          if (itemSearchTerm.trim()) {
                            const q = itemSearchTerm.trim().toLowerCase();
                            if (!(dish.name || "").toLowerCase().includes(q)) return false;
                          }
                          if (!newItemRestaurantName) return true;
                          const dishRest =
                            dish.restaurantName || "Dadu Fast Food & Kitchen";
                          return dishRest === newItemRestaurantName;
                        })
                        .map((dish) => (
                          <tr
                            key={dish.id}
                            className="hover:bg-white/20 transition-colors"
                          >
                            <td className="p-4 font-bold text-gray-200">
                              <div className="flex items-center gap-3">
                                {dish.imageUrl ? (
                                  <img
                                    src={dish.imageUrl}
                                    alt={dish.name}
                                    className="w-8 h-8 rounded-lg object-cover glass-dark border border-white/10 shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                    <span className="text-[7px] text-white/60 font-black uppercase text-center leading-tight">No<br/>Img</span>
                                  </div>
                                )}
                                <div className="truncate max-w-xs">
                                  <div>{dish.name}</div>
                                  <div className="text-[10px] text-white/60 font-medium font-sans mt-0.5">
                                    🏪 Shop:{" "}
                                    <span className="text-[#E21B70] font-bold">
                                      {dish.restaurantName ||
                                        (dish.type === "service"
                                          ? "Dadu Home Services"
                                          : "Dadu Fast Food & Kitchen")}
                                    </span>
                                  </div>
                                  {dish.type === "service" &&
                                    dish.serviceDuration && (
                                      <div className="text-[10px] text-white/60 font-medium font-sans mt-0.5">
                                        ⏱️ Duration:{" "}
                                        <span className="text-[#E21B70] font-bold">
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
                                    ? "bg-amber-950 border border-amber-900 text-[#E21B70]"
                                    : "bg-white/5 border border-white/10 text-white/80"
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
                                    <span className="text-[8px] text-white/60 uppercase font-bold w-12">
                                      Name:
                                    </span>
                                    <input
                                      type="text"
                                      value={editingNameInput}
                                      onChange={(e) =>
                                        setEditingNameInput(e.target.value)
                                      }
                                      className="flex-1 p-1 glass-input border border-[#E21B70] text-white rounded text-xs leading-none"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[8px] text-white/60 uppercase font-bold w-12">
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
                                      className="w-20 p-1 glass-input border border-[#E21B70] text-white rounded text-xs leading-none"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[8px] text-white/60 uppercase font-bold w-12">
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
                                      className="w-20 p-1 glass-input border border-[#E21B70] text-white rounded text-xs leading-none"
                                      placeholder="0 for none"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[8px] text-white/60 uppercase font-bold w-12">
                                      Cost:
                                    </span>
                                    <input
                                      type="number"
                                      value={editingCostPriceInput || ""}
                                      onChange={(e) =>
                                        setEditingCostPriceInput(
                                          Number(e.target.value),
                                        )
                                      }
                                      className="w-20 p-1 glass-input border border-[#E21B70] text-white rounded text-xs leading-none"
                                      placeholder="Cost price"
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
                                      className="w-20 p-1 glass-input border border-emerald-400/40 text-white rounded text-xs leading-none"
                                      placeholder="Commission"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[8px] text-white/60 uppercase font-bold w-12">
                                      Open:
                                    </span>
                                    <input
                                      type="time"
                                      value={editingOpeningTime}
                                      onChange={(e) =>
                                        setEditingOpeningTime(e.target.value)
                                      }
                                      className="w-20 p-1 glass-input border border-[#E21B70] text-white rounded text-xs leading-none"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[8px] text-white/60 uppercase font-bold w-12">
                                      Close:
                                    </span>
                                    <input
                                      type="time"
                                      value={editingClosingTime}
                                      onChange={(e) =>
                                        setEditingClosingTime(e.target.value)
                                      }
                                      className="w-20 p-1 glass-input border border-[#E21B70] text-white rounded text-xs leading-none"
                                    />
                                  </div>
                                  {dish.type === "food" && (
                                    <div className="mt-2 space-y-3 border-t border-white/10 pt-2">
                                      <div className="flex flex-col gap-1">
                                        <div className="flex justify-between items-center">
                                          <span className="text-[9px] text-white/60 uppercase font-bold">
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
                                            className="text-[9px] text-[#E21B70] hover:underline"
                                          >
                                            + Add
                                          </button>
                                        </div>
                                        {editingSizes.map((sz, idx) => (
                                          <div key={idx} className="flex flex-col gap-2 p-2 bg-white/5 rounded border border-white/10">
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
                                                className="flex-1 p-1 glass-input border border-white/15 text-white rounded text-[10px]"
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
                                                className="w-16 p-1 glass-input border border-white/15 text-white rounded text-[10px]"
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
                                          <span className="text-[9px] text-white/60 uppercase font-bold">
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
                                            className="text-[9px] text-[#E21B70] hover:underline"
                                          >
                                            + Add
                                          </button>
                                        </div>
                                        {editingFlavors.map((fl, idx) => (
                                          <div
                                            key={idx}
                                            className="flex flex-col gap-2 p-2 bg-white/5 rounded border border-white/10"
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
                                                className="w-16 p-1 glass-input border border-white/15 text-white rounded text-[10px]"
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
                                                className="w-14 p-1 glass-input border border-white/15 text-white rounded text-[10px]"
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
                                                className="w-12 p-1 glass-input border border-white/15 text-white rounded text-[10px]"
                                              />
                                              <label className="text-[9px] text-white/70 flex items-center gap-0.5 ml-auto">
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
                                          <span className="text-[8px] text-white/60 uppercase font-bold">
                                            Add-ons (Optional)
                                          </span>
                                          <button
                                            onClick={() =>
                                              setEditingAddOns([
                                                ...editingAddOns,
                                                { name: "", price: 0 },
                                              ])
                                            }
                                            className="text-[9px] text-[#E21B70] font-bold"
                                          >
                                            + Add
                                          </button>
                                        </div>
                                        {editingAddOns.map((ad, idx) => (
                                          <div
                                            key={idx}
                                            className="flex flex-col gap-2 p-2 bg-white/5 rounded border border-white/10 mb-1"
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
                                                className="flex-1 p-1 glass-input border border-white/15 text-white rounded text-[10px]"
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
                                                className="w-16 p-1 glass-input border border-white/15 text-white rounded text-[10px]"
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
                                                className="w-16 p-1 glass-input border border-white/15 text-white rounded text-[10px]"
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
                                  <label className="flex items-center gap-1.5 cursor-pointer bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg text-amber-400 font-extrabold text-[10px] my-1">
                                    <input
                                      type="checkbox"
                                      checked={editingIsBestseller}
                                      onChange={(e) => setEditingIsBestseller(e.target.checked)}
                                      className="w-3.5 h-3.5 accent-[#E21B70] rounded cursor-pointer"
                                    />
                                    <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                    <span>Bestseller 🔥</span>
                                  </label>
                                  <div className="flex gap-1 justify-end">
                                    <button
                                      onClick={() =>
                                        setEditingPriceDishId(null)
                                      }
                                      className="px-3 py-1.5 min-h-[32px] bg-white/15 text-white/80 rounded text-[9px] font-bold cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleSavePriceChange(dish)
                                      }
                                      className="px-3 py-1.5 min-h-[32px] bg-[#E21B70] text-white rounded text-[9px] font-black cursor-pointer shadow-xs animate-pulse-subtle"
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
                                      <span className="font-bold text-white/60 text-[10px] line-through">
                                        Rs. {dish.price}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="font-extrabold text-white">
                                      Rs. {dish.price}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">
                                    Comm: Rs. {dish.commission || 0}
                                  </span>
                                  {(dish.openingTime || dish.closingTime) && (
                                    <span className="text-[10px] text-[#E21B70] font-bold block mt-0.5">
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
                                      setEditingCostPriceInput(dish.costPrice || 0);
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
                                    className="text-[10px] text-[#E21B70] hover:underline cursor-pointer text-left mt-1 font-bold"
                                  >
                                    Edit Details
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="p-4">
                              {dish.costPrice && dish.costPrice > 0 ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-extrabold text-emerald-400 text-xs">
                                    Rs. {(dish.discountPrice || dish.price) - dish.costPrice}
                                  </span>
                                  <span className="text-[10px] text-white/60 font-bold">
                                    Cost: Rs. {dish.costPrice} • {Math.round((((dish.discountPrice || dish.price) - dish.costPrice) / (dish.discountPrice || dish.price)) * 100)}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[10px] text-white/40 font-bold">No cost set</span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => handleToggleFeatured(dish)}
                                aria-label={`${dish.isFeatured ? "Remove from" : "Mark as"} featured: ${dish.name}`}
                                className="inline-flex justify-center items-center min-w-[40px] min-h-[40px] transition cursor-pointer text-[#E21B70] hover:scale-110"
                                title="Toggle Featured / Favorite Status"
                              >
                                {dish.isFeatured ? (
                                  <Star className="w-5 h-5 fill-current" />
                                ) : (
                                  <Star className="w-5 h-5 text-white/60" />
                                )}
                              </button>
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => handleToggleBestseller(dish)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-black text-[10px] uppercase tracking-wider transition cursor-pointer ${
                                  dish.isBestseller
                                    ? "bg-amber-500/15 text-amber-400 border border-amber-400/40 shadow-xs"
                                    : "bg-white/5 text-white/50 hover:text-white/70 border border-white/10"
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
                                aria-label={`${dish.isAvailable ? "Mark as sold out" : "Mark as available"}: ${dish.name}`}
                                className="inline-flex justify-center items-center min-w-[40px] min-h-[40px] transition cursor-pointer"
                              >
                                {dish.isAvailable ? (
                                  <div className="flex items-center gap-1.5 text-emerald-400">
                                    <ToggleRight className="w-7 h-7 stroke-[1.5]" />
                                    <span className="text-[10px] uppercase font-bold tracking-wide">
                                      Available
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 text-white/60">
                                    <ToggleLeft className="w-7 h-7 stroke-[1.5]" />
                                    <span className="text-[10px] uppercase font-bold tracking-wide text-white/60">
                                      Sold Out
                                    </span>
                                  </div>
                                )}
                              </button>
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => handleDeleteItem(dish.id)}
                                aria-label={`Delete item ${dish.name}`}
                                className="p-2 min-w-[36px] min-h-[36px] text-white/60 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition cursor-pointer"
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
              <div className="glass-dark  border border-white/10 rounded-[24px] overflow-hidden shadow-sm relative">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#E21B70]/10 to-transparent" />
                <div className="p-6 border-b border-white/10 bg-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-black text-sm text-white uppercase tracking-wide">
                      Live Operational Orders Pipeline
                      <span className="block text-[11px] text-white/60 font-semibold normal-case tracking-normal mt-0.5">Live Orders — naye orders yahan aate hain, pehle admin approve kare phir rider ko jaye</span>
                    </h4>
                    <span className="text-[10px] text-white/60 font-bold uppercase tracking-wider">
                      Monitor order transactions and assign dispatchers in
                      real-time
                    </span>
                  </div>
                  {orders.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleExportCSV}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition shrink-0"
                      >
                        Export CSV 📊
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAllOrderHistory}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/15 text-red-400 border border-red-400/30 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition shrink-0"
                      >
                        Clear Sales History 🧹
                      </button>
                    </div>
                  )}
                </div>

                {/* Modern Filter Sub-Tabs for Orders */}
                <div className="bg-white/5 border-b border-white/10 p-3 flex flex-wrap gap-2 items-center justify-between">
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setAdminOrderFilterTab("new")}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer relative ${
                        adminOrderFilterTab === "new"
                          ? "bg-[#E21B70] text-white shadow-md shadow-[#E21B70]/20 scale-[1.02]"
                          : "glass-dark border border-white/10 text-white/80 hover:bg-white/10"
                      }`}
                    >
                      <span>🆕 New Orders</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                        adminOrderFilterTab === "new" ? "glass-dark text-[#E21B70]" : "bg-white/5 text-white/70"
                      }`}>
                        {orders.filter(o => o.status !== "delivered" && o.status !== "completed" && o.status !== "cancelled").length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAdminOrderFilterTab("delivered")}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer relative ${
                        adminOrderFilterTab === "delivered"
                          ? "bg-[#E21B70] text-white shadow-md shadow-[#E21B70]/20 scale-[1.02]"
                          : "glass-dark border border-white/10 text-white/80 hover:bg-white/10"
                      }`}
                    >
                      <span>✅ Delivered Orders</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                        adminOrderFilterTab === "delivered" ? "glass-dark text-[#E21B70]" : "bg-white/5 text-white/70"
                      }`}>
                        {orders.filter(o => o.status === "delivered" || o.status === "completed").length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAdminOrderFilterTab("cancelled")}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer relative ${
                        adminOrderFilterTab === "cancelled"
                          ? "bg-[#E21B70] text-white shadow-md shadow-[#E21B70]/20 scale-[1.02]"
                          : "glass-dark border border-white/10 text-white/80 hover:bg-white/10"
                      }`}
                    >
                      <span>❌ Cancelled Orders</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                        adminOrderFilterTab === "cancelled" ? "glass-dark text-[#E21B70]" : "bg-white/5 text-white/70"
                      }`}>
                        {orders.filter(o => o.status === "cancelled").length}
                      </span>
                    </button>
                  </div>

                  <span className="text-[10px] text-white/50 font-extrabold uppercase tracking-widest hidden md:inline-block pr-2">
                    {`Viewing ${adminOrderFilterTab} pipeline • ${orders.length} total`}
                  </span>
                </div>

                {/* Date Filter Bar for Operational & History Orders */}
                <div className="bg-white/5 border-b border-white/10 p-3 flex flex-wrap gap-3 items-center justify-between">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase text-white/60 mr-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#E21B70]" /> Date Filter:
                    </span>
                    <button
                      type="button"
                      onClick={() => setOrderDateRange("all")}
                      className={`px-3 py-2 min-h-[36px] rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        orderDateRange === "all"
                          ? "bg-[#E21B70] text-white shadow-xs"
                          : "glass-dark text-white/70 border border-white/10 hover:bg-white/10"
                      }`}
                    >
                      All Time
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderDateRange("1day")}
                      className={`px-3 py-2 min-h-[36px] rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        orderDateRange === "1day"
                          ? "bg-[#E21B70] text-white shadow-xs"
                          : "glass-dark text-white/70 border border-white/10 hover:bg-white/10"
                      }`}
                    >
                      1 Day (Today)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderDateRange("7days")}
                      className={`px-3 py-2 min-h-[36px] rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        orderDateRange === "7days"
                          ? "bg-[#E21B70] text-white shadow-xs"
                          : "glass-dark text-white/70 border border-white/10 hover:bg-white/10"
                      }`}
                    >
                      7 Days (1 Wk)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderDateRange("30days")}
                      className={`px-3 py-2 min-h-[36px] rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        orderDateRange === "30days"
                          ? "bg-[#E21B70] text-white shadow-xs"
                          : "glass-dark text-white/70 border border-white/10 hover:bg-white/10"
                      }`}
                    >
                      30 Days (1 Mo)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderDateRange("custom")}
                      className={`px-3 py-2 min-h-[36px] rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                        orderDateRange === "custom"
                          ? "bg-[#E21B70] text-white shadow-xs"
                          : "glass-dark text-white/70 border border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <span>Manual</span>
                      <Calendar className="w-3 h-3" />
                    </button>

                    {orderDateRange === "custom" && (
                      <div className="flex items-center gap-1.5 ml-2 glass-dark p-1 rounded-xl border border-white/10 shadow-xs">
                        <input
                          type="date"
                          value={orderCustomStartDate}
                          onChange={(e) => setOrderCustomStartDate(e.target.value)}
                          className="px-2 py-1 text-xs font-bold border border-white/10 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#E21B70]"
                        />
                        <span className="text-[10px] text-white/50 font-bold">to</span>
                        <input
                          type="date"
                          value={orderCustomEndDate}
                          onChange={(e) => setOrderCustomEndDate(e.target.value)}
                          className="px-2 py-1 text-xs font-bold border border-white/10 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#E21B70]"
                        />
                      </div>
                    )}
                  </div>

                  {/* Filtered Sales Revenue Summary Badge */}
                  {(() => {
                    const inRange = orders.filter((o) => checkOrderInDateRange(o, orderDateRange, orderCustomStartDate, orderCustomEndDate));
                    const deliveredInFilter = inRange.filter((o) => o.status === "delivered" || o.status === "completed");
                    const cancelledInFilter = inRange.filter((o) => o.status === "cancelled");
                    const newInFilter = inRange.filter((o) => o.status !== "delivered" && o.status !== "completed" && o.status !== "cancelled");
                    const totalSales = deliveredInFilter.reduce((acc, o) => acc + (o.grandTotal || 0), 0);
                    // The badge follows the active tab — cancelled tab must not show delivered revenue.
                    if (adminOrderFilterTab === "cancelled") {
                      return (
                        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl text-red-300 text-xs font-black">
                          <span>Cancelled:</span>
                          <span className="bg-red-600 text-white px-2 py-0.5 rounded-md text-[10px] font-black">{cancelledInFilter.length}</span>
                          <span className="text-red-300">|</span>
                          <span>Cancelled value: Rs. {Math.round(cancelledInFilter.reduce((acc, o) => acc + (o.grandTotal || 0), 0)).toLocaleString()}</span>
                        </div>
                      );
                    }
                    if (adminOrderFilterTab === "new") {
                      return (
                        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl text-amber-300 text-xs font-black">
                          <span>New orders:</span>
                          <span className="bg-amber-600 text-white px-2 py-0.5 rounded-md text-[10px] font-black">{newInFilter.length}</span>
                          <span className="text-amber-300">|</span>
                          <span>New value: Rs. {Math.round(newInFilter.reduce((acc, o) => acc + (o.grandTotal || 0), 0)).toLocaleString()}</span>
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-emerald-300 text-xs font-black">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Filtered Revenue:</span>
                          <span className="text-emerald-400 font-extrabold">Rs. {Math.round(totalSales).toLocaleString()}</span>
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

                <div className="divide-y divide-white/10">
                  {orders.length === 0 ? (
                    <div className="p-16 text-center text-xs text-white/60 font-bold uppercase tracking-wider">
                      Logs directory is blank. Waiting for live user
                      transactions...
                    </div>
                  ) : (() => {
                    const filtered = orders.filter((order) => {
                      const isDelivered = order.status === "delivered" || order.status === "completed";
                      const isCancelled = order.status === "cancelled";
                      if (adminOrderFilterTab === "new" && (isDelivered || isCancelled)) return false;
                      if (adminOrderFilterTab === "delivered" && !isDelivered) return false;
                      if (adminOrderFilterTab === "cancelled" && !isCancelled) return false;

                      return checkOrderInDateRange(order, orderDateRange, orderCustomStartDate, orderCustomEndDate);
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="p-16 text-center text-xs text-white/50 font-bold uppercase tracking-wider">
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
                          className="p-6 hover:bg-white/10 transition-all space-y-5"
                        >
                          {/* Top metadata strip */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-dark border border-white/10 p-4 rounded-2xl border border-white/10">
                            <div>
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono text-xs font-black text-white uppercase bg-white/5 border border-white/10 py-1.5 px-3 rounded-lg shadow-inner">
                                  {formatOrderId(order.id)}
                                </span>
                                <span
                                  className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                    isSvc
                                      ? "bg-amber-500/15 border border-amber-400/30 text-amber-400"
                                      : "bg-pink-500/15 border border-pink-400/30 text-[#E21B70]"
                                  }`}
                                >
                                  {order.orderType}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-3 items-center mt-3 text-xs text-white/70">
                                <span className="font-extrabold text-white">
                                  {order.userName}
                                </span>
                                <span className="text-white/80">|</span>
                                <span className="font-medium text-white/80 flex items-center gap-2">
                                  Phone:{" "}
                                  <span className="font-bold text-white">
                                    {order.userPhone}
                                  </span>
                                  <a
                                    href={`tel:${order.userPhone}`}
                                    className="inline-flex items-center justify-center px-2.5 py-2 min-h-[36px] bg-emerald-500/10 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-md transition-colors border border-emerald-400/30"
                                    title="Call Customer"
                                  >
                                    📞 Call
                                  </a>
                                  <a
                                    href={`https://wa.me/${formatWhatsAppPhone(order.userPhone)}?text=${encodeURIComponent(`Hello ${order.userName}, we are contacting you regarding your Dadu Food order.`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center p-1.5 bg-green-500/20 text-green-400 hover:bg-green-600 hover:text-white rounded-md transition-colors border border-green-500/30"
                                    title="WhatsApp Customer"
                                  >
                                    💬 WhatsApp
                                  </a>
                                </span>
                                <span className="text-white/80">|</span>
                                <span className="font-medium text-white/80">
                                  Total:{" "}
                                  <span className="font-black text-[#E21B70]">
                                    Rs. {order.grandTotal}
                                  </span>
                                </span>
                              </div>
                            </div>

                            {/* Status label banner */}
                            <div className="text-left sm:text-right">
                              <span className="text-[10px] uppercase tracking-widest font-black text-white/50 block mb-1">
                                Current Status
                              </span>
                              {(() => {
                                const isCompleted = order.status === "delivered" || order.status === "completed";
                                const isCancelled = order.status === "cancelled";
                                
                                let badgeStyles = "bg-blue-500/10 text-blue-400 border border-blue-400/30";
                                let dotStyles = "bg-blue-500";
                                
                                if (isCompleted) {
                                  badgeStyles = "bg-emerald-500/10 text-emerald-400 border border-emerald-400/30";
                                  dotStyles = "bg-emerald-500";
                                } else if (isCancelled) {
                                  badgeStyles = "bg-rose-500/10 text-rose-400 border border-rose-400/30";
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
                              <div className="mt-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handlePrintReceipt(order)}
                                  className="inline-flex items-center justify-center p-1.5 text-[10px] bg-white/15 text-white/80 hover:bg-white/25 rounded-md transition-colors font-bold border border-white/15 cursor-pointer"
                                >
                                  🖨️ Print Receipt
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Easypaisa payment verification (receipt) */}
                          {order.paymentMethod === "Easypaisa" && (
                            <div className="bg-amber-500/10 border border-amber-400/30 rounded-2xl p-4 space-y-3">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">
                                  📱 Easypaisa Payment —{" "}
                                  {order.paymentVerified
                                    ? "Verified ✅"
                                    : order.paymentRejected
                                      ? "Rejected ❌"
                                      : "Verification Pending"}
                                </span>
                                <span className="text-[11px] font-bold text-white/70">
                                  {order.paymentAccountTitle || "Ghulam Murtaza"} ·{" "}
                                  {order.paymentAccountNumber || "03277004471"}
                                </span>
                              </div>
                              {order.paymentReceiptUrl ? (
                                <a
                                  href={order.paymentReceiptUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block"
                                >
                                  <img
                                    src={order.paymentReceiptUrl}
                                    alt="Easypaisa payment receipt"
                                    className="max-h-64 w-auto rounded-xl border border-white/10 shadow-sm"
                                  />
                                </a>
                              ) : (
                                <p className="text-xs text-white/60 font-medium">
                                  Customer ne abhi tak receipt screenshot upload nahi kiya.
                                </p>
                              )}
                              {order.status === "payment_verification_pending" &&
                                !order.paymentVerified &&
                                !order.paymentRejected && (
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      disabled={verifyingOrderId === order.id}
                                      onClick={() =>
                                        handleVerifyEasypaisaPayment(order.id)
                                      }
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider cursor-pointer transition hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-wait disabled:hover:scale-100"
                                    >
                                      {verifyingOrderId === order.id ? "⏳ Verifying…" : "✅ Verify & Confirm Order"}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={verifyingOrderId === order.id}
                                      onClick={() =>
                                        handleRejectEasypaisaPayment(order.id)
                                      }
                                      className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider cursor-pointer transition hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-wait disabled:hover:scale-100"
                                    >
                                      {verifyingOrderId === order.id ? "⏳ Working…" : "❌ Reject Payment"}
                                    </button>
                                  </div>
                                )}
                              {order.paymentRejectionReason && (
                                <p className="text-[11px] text-rose-400 font-bold">
                                  Rejection reason: {order.paymentRejectionReason}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Items descriptions and customer address */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-medium">
                            <div className="glass-dark border border-white/10 p-4 rounded-2xl border border-white/10 space-y-3">
                              <span className="text-[10px] font-black text-white/60 uppercase tracking-widest block">
                                Cart Summary
                              </span>
                              <div className="divide-y divide-white/10">
                                {order.items.map((item, id) => (
                                  <div
                                    key={id}
                                    className="py-2 flex justify-between"
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-white font-medium">
                                        {item.name}{" "}
                                        <span className="text-xs text-[#E21B70] font-black font-sans">
                                          (
                                          {item.restaurantName ||
                                            (item.type === "service"
                                              ? "Dadu Home Services"
                                              : "Dadu Fast Food")}
                                          )
                                        </span>{" "}
                                        <span className="text-white/60 font-bold">
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
                                    <span className="font-extrabold text-white/70">
                                      Rs. {item.price * item.quantity}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="text-[10px] text-white/60 pt-2 border-t border-white/10 leading-normal font-bold uppercase tracking-wider">
                                {isSvc ? (
                                  <span className="text-[#E21B70]/80">
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

                            <div className="glass-dark border border-white/10 p-4 rounded-2xl border border-white/10 space-y-3">
                              <span className="text-[10px] font-black text-white/60 uppercase tracking-widest block">
                                Destination address Coordinates
                              </span>
                              <p className="text-white/80 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/10 truncate">
                                📍 {order.userAddress}
                              </p>

                              {/* Logistics parameters inputs (Save Rider / saved ETA) */}
                              {isActive && (
                                <div className="pt-2.5 border-t border-white/10 flex gap-3">
                                  <div className="flex-1 space-y-1">
                                    <span className="text-[8.5px] font-black text-white/60 tracking-widest block uppercase">
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
                                      className="w-full text-xs p-2 glass-input border border-white/10 rounded-lg text-white font-medium outline-none text-white focus:border-[#E21B70] appearance-none"
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
                                    <span className="text-[8.5px] font-black text-white/60 tracking-widest block uppercase">
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
                                      className="w-full text-xs p-2 glass-input border border-white/10 rounded-lg text-white font-medium outline-none text-white focus:border-[#E21B70]"
                                    />
                                  </div>

                                  <button
                                    onClick={() =>
                                      handleSaveRiderAndEta(order.id)
                                    }
                                    className="bg-[#E21B70] hover:bg-[#C2145E] text-white font-black p-2 px-3 rounded-lg self-end text-[10px] uppercase tracking-wider cursor-pointer h-9 shadow-md transition-all flex items-center justify-center shrink-0 hover:scale-[1.02] active:scale-95"
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
                              <span className="text-[9.5px] font-black uppercase text-[#E21B70]/90 tracking-widest mr-1">
                                Configure Next State:
                              </span>

                              {/* FOOD SPECIFIC DISPATCH BUTTONS */}
                              {!isSvc && (
                                <>
                                  {order.status !== "payment_verification_pending" && (
                                  <button
                                    onClick={() =>
                                      handleUpdateOrderStatus(
                                        order.id,
                                        "confirmed",
                                      )
                                    }
                                    className="bg-white/5 border border-white/10 hover:border-white/15 text-white/80 px-3.5 py-2 min-h-[40px] rounded-xl transition cursor-pointer text-[10px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95"
                                  >
                                    🤝 Confirmed
                                  </button>
                                  )}
                                  <button
                                    onClick={() =>
                                      handleUpdateOrderStatus(
                                        order.id,
                                        "preparing",
                                      )
                                    }
                                    className="bg-purple-500/10 border border-purple-400/30 text-purple-400 px-3.5 py-2 min-h-[40px] rounded-xl hover:bg-purple-500/15 transition cursor-pointer text-[10px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95"
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
                                    className="bg-teal-500/10 border border-teal-400/30 text-teal-400 px-3.5 py-2 min-h-[40px] rounded-xl hover:bg-teal-500/15 transition cursor-pointer text-[10px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95"
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
                                    className="bg-emerald-600 border border-emerald-600 text-white px-4 py-2 min-h-[40px] rounded-xl hover:bg-emerald-700 transition cursor-pointer text-[10.5px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95 shadow-md shadow-emerald-500/5"
                                  >
                                    ✅ Delivered Done
                                  </button>
                                </>
                              )}

                              {/* CANCEL COMMON ACTIONS */}
                              <button
                                onClick={() =>
                                  handleUpdateOrderStatus(order.id, "cancelled")
                                }
                                className="ml-auto bg-red-500/10 border border-red-400/30 text-red-400 px-3.5 py-2 min-h-[40px] rounded-xl hover:bg-red-500/15 transition cursor-pointer text-[10px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95"
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
            <div className="space-y-8 animate-fade-in text-white col-span-1 lg:col-span-9">
              {/* Top Row: General Settings & Status Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Global Delivery Charge Config */}
                <div className="glass-dark border border-white/10 p-6 rounded-2xl shadow-sm relative space-y-4">
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#E21B70]/10 to-transparent" />
                  <h4 className="font-black text-sm text-white flex items-center gap-2 pb-2.5 border-b border-white/10 uppercase tracking-wide">
                    <Truck className="w-4 h-4 text-[#E21B70]" />
                    Delivery Ranges & Base Location
                  </h4>
                  <p className="text-[10.5px] text-white/70 font-medium leading-relaxed">
                    Delivery fees live in the Settings tab now. Set the distance ranges and the base pin here — beyond the Rider Double Charge Range the delivery fee doubles.
                  </p>

                  <div className="flex flex-col gap-3 text-xs pt-1">
                    
                    
                    
                    <div className="pt-2 mt-2 border-t border-white/5 grid grid-cols-2 gap-3">
                      <div className="relative flex-grow">
                        <span className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5 flex items-center gap-1"><MapPin className="w-3 h-3"/> Rider Double Charge Range (KM) — fee doubles beyond this</span>
                        <input
                          type="number"
                          min="0"
                          value={riderRangeKmInput}
                          onChange={(e) =>
                            setRiderRangeKmInput(Number(e.target.value))
                          }
                          placeholder="e.g. 5"
                          className="w-full p-3 glass-input border border-white/10 rounded-xl outline-none text-white font-extrabold focus:border-[#E21B70] transition text-xs"
                        />
                      </div>
                      <div className="relative flex-grow">
                        <span className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5 flex items-center gap-1"><MapPin className="w-3 h-3"/> User Service Range (KM)</span>
                        <input
                          type="number"
                          min="0"
                          value={userRangeKmInput}
                          onChange={(e) =>
                            setUserRangeKmInput(Number(e.target.value))
                          }
                          placeholder="e.g. 10"
                          className="w-full p-3 glass-input border border-white/10 rounded-xl outline-none text-white font-extrabold focus:border-[#E21B70] transition text-xs"
                        />
                      </div>
                    </div>
                    <button type="button" onClick={handleSaveDeliveryRanges} className="bg-[#E21B70] text-white font-black px-5 py-3 rounded-xl hover:scale-[1.02] active:scale-95 transition cursor-pointer text-xs uppercase w-full">
                      Save Ranges &amp; Base Location
                    </button>
                    

                    <div className="pt-2">
                      <span className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#E21B70]" />
                        Base Store/Delivery Pinpoint on Map
                      </span>
                      <div className="p-3 glass-dark border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                            <MapPin className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="block text-xs font-black text-white">
                              📍 Base Delivery Location
                            </span>
                            <span className="block text-[10.5px] text-white/60 font-semibold font-mono mt-0.5">
                              {baseLatInput}, {baseLngInput}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsBaseMapPickerOpen(true)}
                          className="px-4 py-2 rounded-xl bg-[#E21B70] hover:bg-[#C2145E] text-white text-xs font-black shadow-md shadow-pink-500/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Change Location on Map</span>
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

                

                

                

                {/* Mobile Restaurant Schedule Manager */}
                <div className="glass-dark border border-white/10 p-6 rounded-2xl shadow-sm relative space-y-4">
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-purple-500/10 to-transparent" />
                  <h4 className="font-black text-sm text-white flex items-center gap-2 pb-2.5 border-b border-white/10 uppercase tracking-wide">
                    <Clock className="w-4 h-4 text-purple-500" />
                    Restaurant Schedule
                  </h4>

                  <div className="space-y-4 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">
                        Select Restaurant / Vendor
                      </label>
                      <div className="relative">
                        <select
                          value={selectedScheduleRestaurant}
                          onChange={(e) =>
                            setSelectedScheduleRestaurant(e.target.value)
                          }
                          className="w-full p-3 glass-input border border-white/10 border border-white/10 rounded-xl text-xs text-white focus:border-[#E21B70]/60 outline-none appearance-none"
                        >
                          {uniqueRestaurants.map((rest) => (
                            <option key={rest} value={rest}>
                              {rest}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/60">
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

                    <div className="flex items-center justify-between glass-dark border border-white/10 p-4 rounded-xl border border-white/10">
                      <div>
                        <h5 className="font-bold text-xs text-white">
                          Temporarily Unavailable
                        </h5>
                        <p className="text-[10px] text-white/60">
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
                        <div className="w-10 h-5 bg-white/15 rounded-full peer transition-colors duration-300 peer-focus:ring-2 peer-focus:ring-purple-500/40 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/15 after:border-white/15 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">
                          Open Time
                        </label>
                        <input
                          type="time"
                          value={restOpeningTime}
                          onChange={(e) => setRestOpeningTime(e.target.value)}
                          className="w-full p-3 glass-input border border-white/10 border border-white/10 rounded-xl text-xs text-white focus:border-[#E21B70]/60 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">
                          Close Time
                        </label>
                        <input
                          type="time"
                          value={restClosingTime}
                          onChange={(e) => setRestClosingTime(e.target.value)}
                          className="w-full p-3 glass-input border border-white/10 border border-white/10 rounded-xl text-xs text-white focus:border-[#E21B70]/60 outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">
                        Restaurant Contact Phone
                      </label>
                      <input
                        type="text"
                        value={restPhone}
                        onChange={(e) => setRestPhone(e.target.value)}
                        placeholder="e.g. 03277004471"
                        className="w-full p-3 glass-input border border-white/10 border border-white/10 rounded-xl text-xs text-white focus:border-[#E21B70]/60 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">
                          Min Order
                        </label>
                        <input
                          type="number"
                          value={restMinOrder}
                          onChange={(e) => setRestMinOrder(e.target.value)}
                          placeholder="e.g. 300"
                          className="w-full p-3 glass-input border border-white/10 border border-white/10 rounded-xl text-xs text-white focus:border-[#E21B70]/60 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1.5">
                          Delivery Charge Text
                        </label>
                        <input
                          type="text"
                          value={restDeliveryCharge}
                          onChange={(e) => setRestDeliveryCharge(e.target.value)}
                          placeholder="e.g. Rs. 70"
                          className="w-full p-3 glass-input border border-white/10 border border-white/10 rounded-xl text-xs text-white focus:border-[#E21B70]/60 outline-none"
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
                      onClick={handleSaveRestaurantStatus}
                      className="w-full bg-purple-500 text-black font-black px-5 py-3 rounded-xl hover:scale-[1.02] active:scale-95 transition cursor-pointer text-xs uppercase"
                    >
                      Save Times
                    </button>
                  </div>
                </div>

                {/* Live assigned deliveries summary stats */}
                <div className="glass-dark border border-white/10 p-6 rounded-2xl shadow-sm relative space-y-4">
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-green-500/10 to-transparent" />
                  <h4 className="font-black text-sm text-white flex items-center gap-2 pb-2.5 border-b border-white/10 uppercase tracking-wide">
                    <TrendingUp className="w-4 h-4 text-emerald-450" />
                    Delivery Fleet Statistics
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                    <div className="glass-dark border border-white/10 border border-white/10 p-3.5 rounded-xl text-center">
                      <span className="text-[9px] text-[#E21B70] uppercase tracking-widest font-black block">
                        active shipments
                      </span>
                      <span className="text-xl font-black text-white block mt-1">
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
                    <div className="glass-dark border border-white/10 border border-white/10 p-3.5 rounded-xl text-center">
                      <span className="text-[9px] text-white/70 uppercase tracking-widest font-black block">
                        rider registry
                      </span>
                      <span className="text-xl font-black text-white block mt-1">
                        {ridersSubset.length} Riders
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Secure Registration form */}
              <form
                onSubmit={handleRegisterRiderSubmit}
                className="glass-dark border border-white/10 p-6 rounded-2xl shadow-sm space-y-5 relative"
              >
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#E21B70]/20 to-transparent" />
                <h4 className="font-black text-sm text-white flex items-center gap-2 pb-3 border-b border-white/10 uppercase tracking-wide">
                  <UserPlus className="w-4 h-4 text-[#E21B70]" />
                  Rider Registry Form (Manual Credentials Creation)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                  <div className="space-y-1.5">
                    <label className="text-white/70 font-black uppercase tracking-widest text-[9px] flex items-center gap-1">
                      <User className="w-3 h-3 text-[#E21B70]" /> Rider Name
                    </label>
                    <input
                      type="text"
                      required
                      value={riderNameInput}
                      onChange={(e) => setRiderNameInput(e.target.value)}
                      placeholder="e.g. Muhammad Ali"
                      className="w-full p-3 glass-input border border-white/10 border border-white/10 rounded-xl text-white outline-none text-white focus:border-[#E21B70] transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-white/70 font-black uppercase tracking-widest text-[9px] flex items-center gap-1">
                      <Phone className="w-3 h-3 text-[#E21B70]" /> Phone /
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      value={riderPhoneInput}
                      onChange={(e) => setRiderPhoneInput(e.target.value)}
                      placeholder="e.g. 03277004471 or ali_rider"
                      className="w-full p-3 glass-input border border-white/10 border border-white/10 rounded-xl text-white outline-none text-white focus:border-[#E21B70] transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-white/70 font-black uppercase tracking-widest text-[9px] flex items-center gap-1">
                      <Key className="w-3 h-3 text-[#E21B70]" /> Access Password
                    </label>
                    <input
                      type="password"
                      required
                      value={riderPasswordInput}
                      onChange={(e) => setRiderPasswordInput(e.target.value)}
                      placeholder="• • • • • • (Min 6 tokens)"
                      className="w-full p-3 glass-input border border-white/10 border border-white/10 rounded-xl text-white outline-none text-white focus:border-[#E21B70] transition"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={riderRegLoading}
                    className="bg-[#E21B70] hover:bg-[#C2145E] text-white font-black text-xs uppercase tracking-wider py-3.5 px-6 rounded-xl shadow-lg shadow-pink-500/10 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-55"
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
              <div className="glass-dark border border-white/10 p-6 rounded-2xl shadow-sm relative space-y-5">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#E21B70]/20 to-transparent" />
                <h4 className="font-black text-sm text-white flex items-center gap-2 pb-3 border-b border-white/10 uppercase tracking-wide">
                  <Compass className="w-4 h-4 text-[#E21B70] animate-spin [animation-duration:3s]" />
                  Fleet Live Assignments Tracker
                </h4>

                <div className="space-y-4 max-h-[350px] overflow-y-auto scrollbar-none">
                  {orders.filter((o) => o.riderId).length === 0 ? (
                    <div className="text-center p-8 text-white/60 text-xs font-semibold">
                      📦 No accepted shipments currently on active duty route.
                    </div>
                  ) : (
                    orders
                      .filter((o) => o.riderId)
                      .map((order) => (
                        <div
                          key={order.id}
                          className="glass-dark border border-white/10 p-4.5 rounded-2xl flex items-center justify-between gap-4 flex-wrap text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-[#E21B70]">
                                {formatOrderId(order.id)}
                              </span>
                              {(() => {
                                const isCompleted = order.status === "delivered" || order.status === "completed";
                                const isCancelled = order.status === "cancelled";
                                
                                let badgeStyles = "bg-blue-500/10 text-blue-400 border border-blue-400/30";
                                let dotStyles = "bg-blue-500";
                                
                                if (isCompleted) {
                                  badgeStyles = "bg-emerald-500/10 text-emerald-400 border border-emerald-400/30";
                                  dotStyles = "bg-emerald-500";
                                } else if (isCancelled) {
                                  badgeStyles = "bg-rose-500/10 text-rose-400 border border-rose-400/30";
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
                            <p className="text-white/70 text-[11px] font-semibold mt-1">
                              Customer: {order.userName} ({order.userAddress})
                            </p>
                          </div>

                          <div className="bg-white/5 border border-white/10 p-3 rounded-xl min-w-[200px] text-right text-xs">
                            <span className="text-[9px] text-white/60 uppercase tracking-widest font-black block">
                              assigned driver
                            </span>
                            <span className="text-white font-extrabold block text-xs mt-0.5">
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
              <div className="glass-dark border border-white/10 p-6 rounded-2xl shadow-sm relative space-y-4">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                <h4 className="font-black text-sm text-white flex items-center gap-2 pb-3 border-b border-white/10 uppercase tracking-wide">
                  <User className="w-4 h-4 text-white/60" />
                  Riders Directory Registry ({ridersSubset.length} Profiles)
                  <span className="block text-[11px] text-white/60 font-semibold normal-case tracking-normal mt-0.5">Riders — delivery wale, unki duty aur earnings</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ridersSubset.length === 0 ? (
                    <div className="text-center p-8 col-span-2 text-white/60 text-xs font-semibold">
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
                          className="glass-dark border border-white/10 p-4.5 rounded-2xl space-y-3 shadow-xs font-sans"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10.5px] font-black tracking-wider text-white flex items-center gap-1.5 flex-wrap">
                                Rider Name: {rider.name}
                                {rider.status === "blocked" && (
                                  <span className="text-[8.5px] bg-red-600 text-white font-extrabold px-1.5 py-0.5 rounded uppercase shrink-0">
                                    Blocked 🚫
                                  </span>
                                )}
                              </span>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                <span className="text-[9px] text-[#E21B70] font-bold block bg-[#E21B70]/5 border border-[#E21B70]/20 px-2.5 py-0.5 rounded-full uppercase">
                                  Vehicle/Owner No: {rider.vehicleNumber || "N/A"}
                                </span>
                                <span className="text-[9px] font-bold block bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full uppercase text-amber-400 flex items-center gap-1 shrink-0">
                                  ⭐ {stats.avgRating !== "N/A" ? `${stats.avgRating} / 5` : "No Ratings"} ({stats.totalRated})
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[9px] text-white/60">
                                {rider.uid.substring(0, 8)}
                              </span>
                              <button
                                onClick={() =>
                                  handleDeleteRider(rider.uid, rider.name, rider.phone)
                                }
                                className="text-pink-400 hover:text-pink-300 p-1.5 rounded-lg hover:bg-red-500/10 transition cursor-pointer shrink-0"
                                title="Block Rider"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="border-t border-white/10 pt-2 text-[11px] font-semibold text-white/70 font-sans space-y-1">
                            <div>
                              📞 Contact Phone:{" "}
                              <span className="font-mono text-white">
                                {rider.phone}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span>📍 Logged-in HQ Status:</span>
                              <span className="text-emerald-400 font-bold uppercase text-[9px]">
                                ONLINE DUTY
                              </span>
                            </div>

                            {/* Rider Total Deliveries & Earned Commission */}
                            <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-xl p-3 mt-2.5 flex items-center justify-between gap-3 text-xs font-semibold">
                              <div>
                                <span className="text-[9px] text-emerald-400 uppercase tracking-widest font-black block">
                                  delivered runs
                                </span>
                                <span className="text-xs font-extrabold text-white block mt-0.5">
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
                            <div className="glass-dark border border-white/10 rounded-xl p-3 mt-2 space-y-2">
                              <span className="text-[9.5px] font-black uppercase text-[#E21B70] tracking-wider flex items-center gap-1">
                                📊 Rider Earnings & Sales Stats
                              </span>

                              <div className="grid grid-cols-3 gap-2 text-center">
                                {/* Today */}
                                <div className="bg-white/5 border border-white/10 p-2 rounded-lg">
                                  <span className="text-[8px] text-white/60 uppercase font-black block">
                                    Aaj (Today)
                                  </span>
                                  <span className="text-[10.5px] font-black text-rose-500 block mt-0.5">
                                    {stats.today.count} Orders
                                  </span>
                                  <span className="text-[9.5px] font-bold text-white block font-mono mt-0.5">
                                    Rs. {stats.today.sales}
                                  </span>
                                </div>

                                {/* Week */}
                                <div className="bg-white/5 border border-white/10 p-2 rounded-lg">
                                  <span className="text-[8px] text-white/60 uppercase font-black block">
                                    Hafta (Week)
                                  </span>
                                  <span className="text-[10.5px] font-black text-[#E21B70] block mt-0.5">
                                    {stats.week.count} Orders
                                  </span>
                                  <span className="text-[9.5px] font-bold text-white block font-mono mt-0.5">
                                    Rs. {stats.week.sales}
                                  </span>
                                </div>

                                {/* Month */}
                                <div className="bg-white/5 border border-white/10 p-2 rounded-lg">
                                  <span className="text-[8px] text-white/60 uppercase font-black block">
                                    Mahina (Month)
                                  </span>
                                  <span className="text-[10.5px] font-black text-emerald-500 block mt-0.5">
                                    {stats.month.count} Orders
                                  </span>
                                  <span className="text-[9.5px] font-bold text-white block font-mono mt-0.5">
                                    Rs. {stats.month.sales}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {rider.riderCoords ? (
                              <div className="bg-emerald-500/10 border border-emerald-400/30 p-2.5 rounded-xl mt-1.5 space-y-1.5 text-white/80">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="text-emerald-400 font-black flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    LIVE GPS SIGNAL
                                  </span>
                                  <span className="text-[9px] text-white/60">
                                    {rider.riderCoords.lastUpdated
                                      ? `${Math.round((Date.now() - rider.riderCoords.lastUpdated) / 1000)}s ago`
                                      : "Active"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-mono text-[9.5px] text-white/70">
                                    {rider.riderCoords.latitude.toFixed(5)},{" "}
                                    {rider.riderCoords.longitude.toFixed(5)}
                                  </span>
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${rider.riderCoords.latitude},${rider.riderCoords.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-emerald-600 text-white font-black text-[9px] px-2.5 py-1.5 rounded-lg hover:bg-emerald-700 transition uppercase tracking-widest leading-none block shrink-0"
                                  >
                                    Open Map 🗺️
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <div className="text-white/60 text-[10px] italic mt-2 bg-white/5 p-2 rounded-xl border border-white/10 text-center">
                                📡 Awaiting active GPS tracking signal...
                              </div>
                            )}

                            {/* Password Management */}
                            <div className="flex items-center gap-2 mt-3 bg-white/5 border border-white/10 rounded-xl p-2.5">
                              <Key className="w-3.5 h-3.5 text-[#E21B70] shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] text-white/60 uppercase tracking-widest block font-bold">Rider Password</span>
                                <span className="text-[11px] text-white/70 block mt-0.5">Firebase Auth se manage hota hai — panel se change nahi hota. Change karne ke liye Firebase Console → Authentication → Users me jayein.</span>
                              </div>
                            </div>

                            {/* Block / Unblock Controls */}
                            <div className="mt-2.5 space-y-1.5">
                              {rider.status === "blocked" ? (
                                <div className="space-y-1.5">
                                  <div className="text-[10px] text-red-400 font-semibold bg-red-500/10 border border-red-400/30 p-2.5 rounded-xl text-left">
                                    <span className="block text-[8.5px] uppercase tracking-wider text-red-500 font-black">Blocked Reason / Wajah:</span>
                                    <span className="block font-bold mt-0.5 whitespace-pre-wrap">{rider.blockReason || "No reason provided."}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConfirmDialog({
                                        title: "Unblock Rider",
                                        message: `Kya aap Rider "${rider.name}" ko unblock karna chahte hain?`,
                                        confirmLabel: "Unblock karein",
                                        onConfirm: async () => {
                                          try {
                                            await updateDoc(doc(db, "users", rider.uid), {
                                              status: "verified",
                                              needsUnblockAlert: true,
                                              unblockAlertMessage: "Aapka account admin ne unblock kar diya hai! Ab aap duty shuru kar sakte hain."
                                            });
                                            alert(`✅ Rider "${rider.name}" successfully unblock ho gaya hai!`);
                                          } catch (err) {
                                            console.error("Failed to unblock rider:", err);
                                            alert("Error: Database permission denied.");
                                          }
                                        },
                                      });
                                    }}
                                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-2.5 rounded-xl transition text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10"
                                  >
                                    🔓 Unblock Rider (Kholain)
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
                                        alert(`❌ Rider "${rider.name}" block ho gaya hai.`);
                                      } catch (err) {
                                        console.error("Failed to block rider:", err);
                                        alert("Error: Database permission denied.");
                                      }
                                    }
                                  }}
                                  className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-2.5 rounded-xl transition text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-red-500/10"
                                >
                                  🚫 Block Rider (Band Karein)
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
                              className="w-full bg-[#E21B70]/10 text-[#E21B70] font-black border border-[#E21B70]/20 py-2.5 rounded-xl hover:bg-[#E21B70]/20 transition text-xs uppercase flex items-center justify-center gap-1.5 mt-2.5"
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
            <div className="space-y-8 animate-fade-in text-white col-span-1 lg:col-span-12 lg:col-start-4 font-sans">
              <div className="glass-dark border border-white/10 p-6 rounded-2xl shadow-sm relative space-y-6">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-pink-500/10 to-transparent" />
                <h4 className="font-black text-sm text-white flex items-center gap-2 pb-2.5 border-b border-white/10 uppercase tracking-widest text-[#E21B70]">
                  <Grid className="w-4 h-4 text-[#E21B70]" />
                  Add New Food Category
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-white/70">
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
                      className="w-full p-3 glass-input border border-white/10 border border-white/10 rounded-xl text-white focus:border-[#E21B70] outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-white/70">
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
                      className="w-full p-3 glass-input border border-white/10 border border-white/10 rounded-xl text-white focus:border-[#E21B70] outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-white/70">
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
                      className="w-full p-3 glass-input border border-white/10 border border-white/10 rounded-xl text-white focus:border-[#E21B70] outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-white/70">
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
                      className="w-full p-3 glass-input border border-white/10 border border-white/10 rounded-xl text-white focus:border-[#E21B70] outline-none"
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
                  className="w-full bg-pink-600 hover:bg-[#E21B70] text-white font-black py-4 rounded-xl text-[11px] uppercase tracking-wider shadow-lg transition-all"
                >
                  Add Category
                </button>
              </div>

              <div className="glass-dark border border-white/10 p-6 rounded-2xl shadow-sm relative space-y-4">
                <h4 className="font-black text-sm text-white flex items-center gap-2 pb-2.5 border-b border-white/10 uppercase tracking-widest text-[#E21B70]">
                  <Grid className="w-4 h-4 text-[#E21B70]" />
                  Existing Food Categories
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {foodCategories.map((cat) => (
                    <div
                      key={cat.id}
                      className="glass-dark border border-white/10 border border-white/10 rounded-xl p-3 flex flex-col relative overflow-hidden"
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
                            aria-label={`Edit category ${cat.name}`}
                            className="min-h-[36px] px-2 py-1.5 rounded-lg text-white/70 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                          >
                            <span className="text-xs uppercase font-bold tracking-wider">Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteFoodCategory(cat.id)}
                            aria-label={`Delete category ${cat.name}`}
                            className="min-h-[36px] min-w-[36px] p-2 rounded-lg text-white/70 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {editingFoodCategory?.id === cat.id ? (
                        <div className="mt-4 space-y-3 border-t border-white/10 pt-3">
                          <input 
                            type="text"
                            value={editingFoodCategory.name}
                            onChange={(e) => setEditingFoodCategory({...editingFoodCategory, name: e.target.value})}
                            className="w-full p-2 glass-input border border-white/15 rounded-lg text-xs outline-none"
                            placeholder="Name"
                          />
                          <input 
                            type="text"
                            value={editingFoodCategory.subtitle || ""}
                            onChange={(e) => setEditingFoodCategory({...editingFoodCategory, subtitle: e.target.value})}
                            className="w-full p-2 glass-input border border-white/15 rounded-lg text-xs outline-none"
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
                            className="w-full bg-[#E21B70] hover:bg-[#C2145E] text-white text-[10px] font-bold uppercase py-2 rounded-lg transition cursor-pointer"
                          >
                            Save Changes
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-bold text-sm mt-1">{cat.name}</span>
                          <span className="text-[10px] text-white/60">
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
            <div className="space-y-8 animate-fade-in text-white col-span-1 lg:col-span-12 lg:col-start-4 font-sans">
              {/* Top Row: Grocery-specific store settings */}
              <div className="glass-dark border border-white/10 p-6 rounded-2xl shadow-sm relative space-y-4">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-orange-500/10 to-transparent" />
                <h4 className="font-black text-sm text-white flex items-center gap-2 pb-2.5 border-b border-white/10 uppercase tracking-widest text-orange-500">
                  <ShoppingBasket className="w-4 h-4 text-orange-500" />
                  Grocery Delivery Configuration Settings
                </h4>
                <p className="text-[10.5px] text-white/70 font-medium leading-relaxed">
                  These metrics govern shipping charges, thresholds, and
                  checkout policies for standalone retail groceries.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5 pt-1 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-white/70">
                      Base Shipping Fee
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3.5 text-white/70 font-bold">
                        Rs.
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={gBaseDeliveryFee}
                        onChange={(e) =>
                          setGBaseDeliveryFee(Number(e.target.value))
                        }
                        className="w-full pl-10 pr-4 py-3 glass-input border border-white/10 border border-white/10 rounded-xl outline-none text-white font-extrabold focus:border-[#E21B70]/40 transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-white/60 font-sans">
                      Free Delivery Above
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3.5 text-white/60 font-bold">
                        Rs.
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={gFreeDeliveryAbove}
                        onChange={(e) =>
                          setGFreeDeliveryAbove(Number(e.target.value))
                        }
                        className="w-full pl-10 pr-4 py-3 glass-input border border-white/10 border border-white/10 rounded-xl outline-none text-white font-extrabold focus:border-[#E21B70]/40 transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-white/70">
                      Medicine Delivery Fee
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3.5 text-white/70 font-bold">
                        Rs.
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={gMedicineDeliveryFee}
                        onChange={(e) =>
                          setGMedicineDeliveryFee(Number(e.target.value))
                        }
                        className="w-full pl-10 pr-4 py-3 glass-input border border-white/10 border border-white/10 rounded-xl outline-none text-white font-extrabold focus:border-[#E21B70]/40 transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-white/70 block font-sans">
                      Mixed Basket Checkout Policy
                    </span>
                    <button
                      type="button"
                      onClick={() => setGAllowMixed(!gAllowMixed)}
                      className="w-full py-3 px-4 glass-dark border border-white/10 rounded-xl border border-white/10 hover:border-orange-500/20 transition flex items-center justify-between cursor-pointer"
                    >
                      <span className="font-semibold text-white/80">
                        Allow Food + Grocery
                      </span>
                      {gAllowMixed ? (
                        <ToggleRight className="w-6 h-6 text-orange-500 shrink-0" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-white/60 shrink-0" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveGroceryConfig}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-black px-6 py-3 rounded-xl hover:scale-[1.01] active:scale-95 transition cursor-pointer text-xs uppercase tracking-wide"
                  >
                    Save Grocery Settings 💾
                  </button>
                </div>
              </div>

              {/* Middle Row: Create Category, and list of current ones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Category Form */}
                <div className="glass-dark border border-white/10 p-6 rounded-[24px] space-y-4">
                  <h4 className="font-black text-xs text-white uppercase tracking-widest text-orange-500 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-orange-500" />
                    Create Grocery Division
                  </h4>
                  <form
                    onSubmit={handleAddGroceryCategory}
                    className="space-y-3.5 text-xs"
                  >
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-bold text-white/70 block uppercase">
                        Division Category Name
                      </label>
                      <input
                        type="text"
                        required
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="E.g., Dairy, Spices, Household..."
                        className="w-full p-3 glass-input border border-white/10 rounded-xl outline-none text-white focus:border-[#E21B70]/40 transition text-white font-semibold"
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
                      <label className="text-[9.5px] font-bold text-white/70 block uppercase">
                        Display Order Position
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={newCatPosition}
                        onChange={(e) =>
                          setNewCatPosition(Number(e.target.value))
                        }
                        className="w-full p-3 glass-input border border-white/10 border border-white/10 rounded-xl outline-none text-white focus:border-[#E21B70]/40 transition text-white font-mono font-bold"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                    >
                      Save New Category +
                    </button>
                  </form>
                </div>

                {/* 2. Categories List */}
                <div className="glass-dark border border-white/10 p-6 rounded-[24px] space-y-4">
                  <h4 className="font-black text-xs text-white uppercase tracking-widest text-orange-500">
                    Active Categories Directory ({groceryCategories.length})
                  </h4>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {groceryCategories.map((cat) => (
                      <div
                        key={cat.id}
                        className="glass-dark border border-white/10 p-2.5 rounded-xl border border-white/10 w-full flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between text-xs font-semibold gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            {cat.imageUrl && (
                              <img
                                src={cat.imageUrl}
                                alt=""
                                className="w-8 h-8 rounded-lg object-cover bg-white/5 shrink-0 border border-white/10"
                              />
                            )}
                            <div className="truncate">
                              <span className="text-white/60 pr-1.5 font-bold font-mono">
                                #{cat.position || 0}
                              </span>
                              <span className="text-white/60 font-bold">
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
                              className="p-1 px-2 rounded text-[10px] font-black uppercase cursor-pointer bg-blue-500/10 text-blue-400 hover:bg-blue-500/15 transition"
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
                                  : "bg-white/15 text-white/60"
                              }`}
                            >
                              {cat.isAvailable ? "Available" : "Disabled"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.id)}
                              aria-label={`Delete category ${cat.name}`}
                              className="p-1.5 px-2 min-w-[32px] min-h-[32px] rounded bg-red-500/10 text-red-400 hover:text-red-400 transition"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        {editingCategoryId === cat.id && (
                          <div className="mt-1 space-y-2 bg-white/5 p-3 rounded-xl border border-white/10">
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
                                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition w-full"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {groceryCategories.length === 0 && (
                      <p className="text-[10px] italic text-white/60 text-center py-6">
                        No custom grocery categories yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Row: Create product, and product grid directory */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* 1. Product creator column */}
                <div className="glass-dark border border-white/10 p-6 rounded-[24px] col-span-1 md:col-span-5 space-y-4">
                  <h4 className="font-black text-xs text-white uppercase tracking-widest text-orange-500 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-orange-500" />
                    Add Grocery Product
                  </h4>
                  <form
                    onSubmit={handleAddGroceryProduct}
                    className="space-y-3 text-xs"
                  >
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/70 block uppercase">
                        Product Title / Name
                      </label>
                      <input
                        type="text"
                        required
                        value={newGProdName}
                        onChange={(e) => setNewGProdName(e.target.value)}
                        placeholder="E.g., Farm Fresh Eggs, Cheddar Cheese..."
                        className="w-full p-2.5 glass-input border border-white/10 border border-white/10 outline-none text-white focus:border-[#E21B70]/40 rounded-xl text-white text-xs font-semibold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-white/70 block uppercase font-sans">
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
                          className="w-full p-2.5 glass-input border border-white/10 border border-white/10 rounded-xl outline-none text-white focus:border-[#E21B70]/40 text-white text-xs font-mono font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-white/70 block uppercase font-sans">
                          Offered Price (Rs.)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={newGProdDiscountPrice}
                          onChange={(e) =>
                            setNewGProdDiscountPrice(Number(e.target.value))
                          }
                          className="w-full p-2.5 glass-input border border-white/10 rounded-xl outline-none text-white focus:border-[#E21B70]/40 text-white text-xs font-mono font-semibold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-white/70 block uppercase font-sans">
                          Unit Metric
                        </label>
                        <select
                          value={newGProdUnit}
                          onChange={(e: any) => setNewGProdUnit(e.target.value)}
                          className="w-full p-2.5 glass-input border border-white/10 rounded-xl text-white outline-none text-white focus:border-[#E21B70]/40 transition"
                        >
                          <option value="kg">kg (Kilo)</option>
                          <option value="litre">litre (Liter)</option>
                          <option value="piece">piece (Single)</option>
                          <option value="pack">pack (Package)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-white/70 block uppercase">
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
                          className="w-full p-2.5 glass-input border border-white/10 rounded-xl outline-none text-white focus:border-[#E21B70]/40 text-white text-xs font-mono font-bold"
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
                        className="w-full p-2.5 glass-input border border-white/10 rounded-xl outline-none text-white focus:border-emerald-400/40 text-white text-xs font-mono font-bold"
                        placeholder="Commission in Rs."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/70 block uppercase font-sans">
                        Cost Price (Rs.) — for margin
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={newGProdCostPrice || ""}
                        onChange={(e) =>
                          setNewGProdCostPrice(Number(e.target.value))
                        }
                        className="w-full p-2.5 glass-input border border-white/10 rounded-xl outline-none text-white focus:border-[#E21B70]/40 text-white text-xs font-mono font-bold"
                        placeholder="Cost price in Rs."
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/60 block uppercase">
                        Choose Category Division
                      </label>
                      <select
                        required
                        value={newGProdCategoryId}
                        onChange={(e) => setNewGProdCategoryId(e.target.value)}
                        className="w-full p-2.5 glass-input border border-white/10 text-white outline-none text-white focus:border-[#E21B70]/40 rounded-xl text-xs font-semibold"
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
                      className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                    >
                      Save Grocery Product 📦
                    </button>
                  </form>
                </div>

                {/* 2. Product directory table column */}
                <div className="glass-dark border border-white/10 p-6 rounded-[24px] col-span-1 md:col-span-12 lg:col-span-7 space-y-4">
                  <h4 className="font-black text-xs text-white uppercase tracking-widest text-orange-500 font-sans">
                    Product Stock & Catalog Directory ({groceryProducts.length})
                  </h4>
                  <input
                    type="text"
                    value={grocerySearchTerm}
                    onChange={(e) => setGrocerySearchTerm(e.target.value)}
                    placeholder="🔍 Product dhoondhein (naam likhein)..."
                    className="w-full glass-input border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-[#E21B70] transition"
                  />
                  <div className="overflow-x-auto select-none">
                    <table className="w-full text-xs text-left text-white/70 font-medium border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 uppercase text-[9px] tracking-wider text-white/60">
                          <th className="py-2.5 px-2">Image & Product</th>
                          <th className="py-2.5 px-2">Group</th>
                          <th className="py-2.5 px-2">Pricing / Stock</th>
                          <th className="py-2.5 px-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groceryProducts
                          .filter((p) => {
                            if (!grocerySearchTerm.trim()) return true;
                            const q = grocerySearchTerm.trim().toLowerCase();
                            return (p.name || "").toLowerCase().includes(q);
                          })
                          .map((p) => {
                          const catName =
                            groceryCategories.find((c) => c.id === p.categoryId)
                              ?.name || "Segment";
                          const isEditing = editingGProductId === p.id;

                          return (
                            <tr
                              key={p.id}
                              className="border-b border-white/10 hover:glass-dark border border-white/10 text-[11px] font-semibold"
                            >
                              <td className="py-3 px-2 flex items-center gap-2 min-w-[150px]">
                                <img
                                  src={p.imageUrl}
                                  alt={p.name}
                                  className="w-8 h-8 rounded-lg object-cover shrink-0 bg-white/5 border border-white/10"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="truncate">
                                  <span className="text-white font-bold block truncate leading-tight">
                                    {p.name}
                                  </span>
                                  <span className="text-[9px] text-white/60 block font-mono font-semibold">
                                    ID: {p.id.substring(0, 6)}...
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-2 text-white/70">
                                <span className="glass-dark border border-white/10 px-2 py-0.5 rounded border border-white/10 text-[10px] uppercase font-bold">
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
                                      className="p-1.5 text-xs text-white glass-input border border-[#E21B70]/40 rounded font-bold w-full"
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
                                      className="p-1.5 text-xs text-white glass-input border border-[#E21B70]/40 rounded font-semibold w-full"
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
                                      className="p-1.5 text-xs text-white glass-input border border-emerald-400/40 rounded font-semibold w-full"
                                    />
                                    <input
                                      type="number"
                                      value={editingGProdCostPriceInput}
                                      onChange={(e) =>
                                        setEditingGProdCostPriceInput(
                                          Number(e.target.value),
                                        )
                                      }
                                      placeholder="Cost"
                                      className="p-1.5 text-xs text-white glass-input border border-[#E21B70]/40 rounded font-semibold w-full"
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <span className="text-orange-400 font-bold block font-mono">
                                      Rs. {p.price} /{p.unit}
                                    </span>
                                    {p.stock <= 0 ? (
                                      <span className="text-red-500 text-[9px] uppercase font-black">
                                        Out of Stock
                                      </span>
                                    ) : (
                                      <span className="text-white/60 text-[9px] font-semibold">
                                        Stock: {p.stock} units
                                      </span>
                                    )}
                                    <span className="text-emerald-400 text-[10px] block font-bold mt-0.5">
                                      Comm: Rs. {p.commission || 0}
                                    </span>
                                    {p.costPrice && p.costPrice > 0 ? (
                                      <span className="text-emerald-400 text-[10px] block font-bold mt-0.5">
                                        Margin: Rs. {(p.discountPrice || p.price) - p.costPrice} ({Math.round((((p.discountPrice || p.price) - p.costPrice) / (p.discountPrice || p.price)) * 100)}%)
                                      </span>
                                    ) : (
                                      <span className="text-white/40 text-[10px] block font-bold mt-0.5">No cost set</span>
                                    )}
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
                                        className="bg-white/15 text-white/60 px-1.5 py-0.5 rounded text-[9.5px] cursor-pointer"
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
                                          setEditingGProdCostPriceInput(p.costPrice || 0);
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
                                            ? "bg-orange-500/10 text-orange-400"
                                            : "bg-white/15 text-white/60"
                                        }`}
                                      >
                                        {p.isAvailable ? "Live" : "Hold"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDeleteProduct(p.id)
                                        }
                                        aria-label={`Delete product ${p.name}`}
                                        className="p-1.5 px-2 min-w-[32px] min-h-[32px] bg-red-500/10 text-red-400 hover:text-red-400 transition shrink-0 cursor-pointer text-xs font-black rounded"
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
              <div className="glass-dark border border-white/10 rounded-3xl p-6 relative overflow-hidden animate-scale-up">
                <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                        Registered Directory
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-white mt-1">
                      Dadu Food User Database
                    </h2>
                    <p className="text-[11px] text-white/70 font-semibold mt-0.5">
                      View, search and manage all registered customers, riders
                      and administrators.
                    </p>
                  </div>

                  {/* Totals Badge */}
                  <div className="bg-white/15 border border-white/10 rounded-2xl px-5 py-3 text-center sm:text-right">
                    <span className="text-[9.5px] font-black text-white/60 uppercase tracking-wider block">
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
                      className="w-full glass-input border border-white/10 text-white placeholder:text-white/40 pl-4 pr-10 py-3 rounded-2xl text-xs font-semibold focus:outline-hidden focus:border-emerald-400/50 transition-all"
                    />
                    {userSearchTerm && (
                      <button
                        onClick={() => setUserSearchTerm("")}
                        aria-label="Clear search"
                        className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full text-white/60 hover:text-white/80 hover:bg-white/10 text-xs font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* 3 Status filter options: New Users, Active Users, Blocked Users */}
                <div className="mt-5 flex flex-wrap gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10 max-w-xl">
                  <button
                    onClick={() => setUserFilterTab("new")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 select-none cursor-pointer ${
                      userFilterTab === "new"
                        ? "bg-[#E21B70] text-white shadow-md shadow-[#E21B70]/10"
                        : "text-white/70 hover:bg-white/10"
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
                        ? "bg-[#E21B70] text-white shadow-md shadow-[#E21B70]/10"
                        : "text-white/70 hover:bg-white/10"
                    }`}
                  >
                    Active Users
                  </button>

                  <button
                    onClick={() => setUserFilterTab("blocked")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 select-none cursor-pointer ${
                      userFilterTab === "blocked"
                        ? "bg-[#E21B70] text-white shadow-md shadow-[#E21B70]/10"
                        : "text-white/70 hover:bg-white/10"
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
                    <div className="glass-dark border border-white/10 rounded-3xl p-10 text-center space-y-3 mb-6 animate-scale-up">
                      <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto">
                        <CheckCheck className="w-6 h-6 text-emerald-500" />
                      </div>
                      <h3 className="font-black text-white text-sm uppercase tracking-wider">
                        All Caught Up!
                      </h3>
                      <p className="text-xs text-white/60 font-semibold max-w-sm mx-auto leading-relaxed">
                        No new unverified users found. Every customer is verified and ready to order.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
                      <h3 className="font-black text-xs uppercase tracking-widest text-white/80">
                        New Unverified Users ({lockedUsers.length})
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {lockedUsers.map(u => {
                        // createdAt may be a Firestore Timestamp, Date, number or string —
                        // new Date(u.createdAt) on a Timestamp object gives "Invalid Date".
                        const createdMs = parseDateToMillis(u.createdAt);
                        const formattedTime = createdMs
                          ? new Date(createdMs).toLocaleString()
                          : "Unknown Time";
                        return (
                          <div 
                            key={u.uid} 
                            className="glass-dark border-2 border-orange-500/30 hover:border-orange-500/50 rounded-3xl p-5 shadow-lg relative overflow-hidden transition-all flex flex-col justify-between gap-4 animate-scale-up"
                          >
                            <div className="absolute top-0 right-0 bg-orange-500 text-black text-[9px] font-black uppercase tracking-wider px-3.5 py-1 rounded-bl-2xl">
                              NEW
                            </div>

                            <div className="space-y-3">
                              <div className="space-y-1">
                                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">Registered At</span>
                                <span className="text-[11px] text-zinc-500 font-mono block mb-2">{formattedTime}</span>
                                <h4 className="text-xl font-black text-white select-all tracking-tight">
                                  {u.phone}
                                </h4>
                              </div>

                              {u.savedLocation?.lat && u.savedLocation?.lng ? (
                                <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-2xl p-3 text-[11px] font-semibold text-emerald-300 space-y-1.5 shadow-xs">
                                  <div className="flex items-center gap-1.5 font-black text-[10px] text-emerald-400 uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    📍 GPS Pinpoint Active
                                  </div>
                                  <p className="text-[9.5px] text-emerald-400 font-mono">
                                    Lat: {u.savedLocation.lat.toFixed(5)}, Lng: {u.savedLocation.lng.toFixed(5)}
                                  </p>
                                  <a
                                    href={`https://www.google.com/maps?q=${u.savedLocation.lat},${u.savedLocation.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[#E21B70] hover:underline font-black text-[10px] uppercase tracking-wider mt-0.5"
                                  >
                                    🗺️ View on Map ➔
                                  </a>
                                </div>
                              ) : (
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-[10px] text-white/60 font-bold italic">
                                  ⚠️ GPS pinpoint data not synced yet
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2">
                              <a
                                href={`tel:${u.phone}`}
                                className="col-span-2 bg-[#E21B70] hover:bg-[#C2145E] text-white py-2.5 px-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition active:scale-95 flex items-center justify-center gap-2"
                              >
                                📞 Call Karein
                              </a>

                              {u.phone !== "03277004471" && u.role !== "admin" && (
                              <button
                                onClick={() => setUnlockingUser(u)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-3 rounded-2xl font-bold text-[11px] uppercase tracking-wider transition active:scale-95 flex items-center justify-center gap-1"
                              >
                                ✅ Unlock
                              </button>
                              )}

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
                  <div className="glass-dark border border-white/10 rounded-3xl overflow-hidden shadow-xl animate-scale-up">
                    <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <h3 className="font-black text-xs uppercase tracking-widest text-white/80">
                        {userFilterTab === "blocked" ? "Blocked Users Ledger" : "Active Users Ledger"}
                      </h3>
                      <span className="text-[10.5px] font-bold text-white/60">
                        {`Showing ${filteredUsers.length} of ${totalInTab}`}
                      </span>
                    </div>

                    {/* Mobile View */}
                    <div className="block md:hidden divide-y divide-white/10">
                      {filteredUsers.map((u) => {
                        const isSpecialAdmin = u.uid === "Wf1NfRofZ9dhre1t4WIsas7b6fJ3" || u.role === "admin";
                        return (
                          <div key={u.uid} className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-xs text-white/80 uppercase shrink-0">
                                  {u.name ? u.name.slice(0, 2) : "DU"}
                                </div>
                                <div>
                                  <span className="text-white font-black text-xs block">
                                    {u.name || "Dadu User"}
                                  </span>
                                  <span className="text-[10px] text-white/60 font-mono block select-all">
                                    {u.uid}
                                  </span>
                                </div>
                              </div>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                  u.role === "admin"
                                    ? "bg-red-500/10 text-red-400 border border-red-400/30"
                                    : u.role === "rider"
                                      ? "bg-sky-50 text-sky-600 border border-sky-200"
                                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-400/30"
                                }`}
                              >
                                {u.role || "buyer"}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="block text-[9px] font-black uppercase text-white/50 mb-0.5">Phone</span>
                                <span className="font-mono text-white/80 font-bold select-all">{u.phone || "Not set/Guest"}</span>
                              </div>
                              <div>
                                <span className="block text-[9px] font-black uppercase text-white/50 mb-0.5">Orders</span>
                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md glass-dark border border-white/10 font-mono text-[10px] font-bold text-white/80">
                                  {u.ordersCount || 0}
                                </span>
                              </div>
                            </div>

                            <div>
                              <span className="block text-[9px] font-black uppercase text-white/50 mb-0.5">Address & GPS Pinpoint</span>
                              <div className="bg-white/5 p-2 rounded-lg border border-white/5 space-y-1.5">
                                <p className="text-[11px] text-white/80 font-bold whitespace-pre-wrap break-words max-h-16 overflow-y-auto">
                                  {u.address || "No address saved"}
                                </p>
                                {u.savedLocation?.lat && u.savedLocation?.lng ? (
                                  <div className="pt-1.5 border-t border-white/10 flex flex-col gap-0.5 text-[9.5px]">
                                    <span className="text-emerald-400 font-black flex items-center gap-1 uppercase tracking-wider">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                      📍 Live Pinpoint Location
                                    </span>
                                    <a
                                      href={`https://www.google.com/maps?q=${u.savedLocation.lat},${u.savedLocation.lng}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[#E21B70] hover:underline font-bold text-[10px] block"
                                    >
                                      🗺️ Open Google Maps ➔ ({u.savedLocation.lat.toFixed(5)}, {u.savedLocation.lng.toFixed(5)})
                                    </a>
                                  </div>
                                ) : (
                                  <span className="text-[9px] text-white/50 font-medium italic block pt-1 border-t border-white/10">
                                    No GPS coordinates synced yet.
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="pt-2 flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setInspectingVoucherUser(u)}
                                className="flex-1 min-w-[70px] py-2.5 min-h-[44px] rounded-lg text-[10px] font-black uppercase transition-all bg-pink-500/10 text-[#E21B70] hover:bg-pink-500/20 cursor-pointer text-center"
                              >
                                🎟️ Vouchers ({vouchersList.filter(v => v.assignedUserIds?.includes(u.uid)).length})
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCoinManagingUser(u);
                                  setCoinAmountInput(50);
                                  setCoinNoteInput("");
                                }}
                                className="flex-1 min-w-[70px] py-2.5 min-h-[44px] rounded-lg text-[10px] font-black uppercase transition-all bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 cursor-pointer text-center"
                              >
                                🪙 Coins
                              </button>
                              <button
                                type="button"
                                onClick={() => setUnlockingUser(u)}
                                className="flex-1 min-w-[70px] py-2.5 min-h-[44px] rounded-lg text-[10px] font-black uppercase transition-all bg-sky-50 text-sky-600 hover:bg-sky-100 cursor-pointer text-center"
                              >
                                Edit Addr
                              </button>
                              
                              {u.status === "locked" && u.phone !== "03277004471" && u.role !== "admin" && (
                                <button
                                  type="button"
                                  onClick={() => setUnlockingUser(u)}
                                  className="flex-1 min-w-[70px] py-2.5 min-h-[44px] rounded-lg text-[10px] font-black uppercase transition-all bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 cursor-pointer text-center"
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
                                        alert(`❌ User ${u.phone} permanently blocked and blacklisted.`);
                                      } catch (err) {
                                        alert("Failed to block user: " + err);
                                      }
                                    }
                                  }}
                                  className="flex-1 min-w-[70px] py-2.5 min-h-[44px] rounded-lg text-[10px] font-black uppercase transition-all bg-orange-500/10 text-orange-400 hover:bg-orange-500/15 cursor-pointer text-center"
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
                                        unblockAlertMessage: "Aapka account admin ne unblock kar diya hai! Ab aap orders place kar sakte hain. 🎉"
                                      });
                                      await deleteDoc(doc(db, "blacklist", u.uid));
                                      alert(`✅ User ${u.phone} unblocked and removed from blacklist.`);
                                    } catch (err) {
                                      alert("Failed to unblock user: " + err);
                                    }
                                  }}
                                  className="flex-1 min-w-[70px] py-2.5 min-h-[44px] rounded-lg text-[10px] font-black uppercase transition-all bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 cursor-pointer text-center"
                                >
                                  Unblock
                                </button>
                              )}
                              
                            </div>
                          </div>
                        );
                      })}
                      {filteredUsers.length === 0 && (
                        <div className="p-8 text-center text-white/60 font-black text-xs uppercase tracking-widest">
                          No registered users found.
                        </div>
                      )}
                    </div>

                    {/* Desktop View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-xs text-left text-white/70 font-semibold border-collapse">
                        <thead>
                          <tr className="glass-dark border border-white/10 border-b border-white/10 text-white/60 text-[9.5px] uppercase tracking-wider font-black">
                            <th className="py-4 px-5">User Info</th>
                            <th className="py-4 px-5">Role</th>
                            <th className="py-4 px-5">Phone Number</th>
                            <th className="py-2 px-5">Delivery/Living Address</th>
                            <th className="py-4 px-5 text-center">Total Orders</th>
                            <th className="py-4 px-5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {filteredUsers.map((u) => {
                              const isSpecialAdmin = u.uid === "Wf1NfRofZ9dhre1t4WIsas7b6fJ3" || u.role === "admin";
                              return (
                                <tr key={u.uid} className="hover:bg-white/10 transition-all">
                                  {/* User Info */}
                                  <td className="py-4 px-5">
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-xs text-white/80 uppercase shrink-0">
                                        {u.name ? u.name.slice(0, 2) : "DU"}
                                      </div>
                                      <div>
                                        <span className="text-white font-black text-xs block">
                                          {u.name || "Dadu User"}
                                        </span>
                                        <span className="text-[10px] text-white/60 font-mono block select-all">
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
                                          ? "bg-red-500/10 text-red-400 border border-red-400/30"
                                          : u.role === "rider"
                                            ? "bg-sky-50 text-sky-600 border border-sky-200"
                                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-400/30"
                                      }`}
                                    >
                                      {u.role || "buyer"}
                                    </span>
                                  </td>
                                  {/* Phone Number */}
                                  <td className="py-4 px-5">
                                    <span className="font-mono text-xs text-white/80 font-bold select-all">
                                      {u.phone || "Not set/Guest"}
                                    </span>
                                  </td>
                                  {/* Delivery Address */}
                                  <td className="py-2 px-5 max-w-xs">
                                    <div className="space-y-1.5">
                                      <p className="text-[11px] text-white/80 font-bold whitespace-pre-wrap break-words max-h-16 overflow-y-auto leading-relaxed">
                                        {u.address || "No address saved"}
                                      </p>
                                      {u.savedLocation?.lat && u.savedLocation?.lng ? (
                                        <div className="flex flex-col gap-0.5 text-[9.5px]">
                                          <span className="text-emerald-400 font-black flex items-center gap-1 uppercase tracking-wider">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                            📍 Pinpoint Live Location
                                          </span>
                                          <a
                                            href={`https://www.google.com/maps?q=${u.savedLocation.lat},${u.savedLocation.lng}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[#E21B70] hover:underline font-black text-[10px] block"
                                          >
                                            🗺️ Open Google Maps ➔ ({u.savedLocation.lat.toFixed(5)}, {u.savedLocation.lng.toFixed(5)})
                                          </a>
                                        </div>
                                      ) : (
                                        <span className="text-[9px] text-white/50 font-medium italic block">No GPS coordinates synced</span>
                                      )}
                                    </div>
                                  </td>
                                  {/* Total Orders */}
                                  <td className="py-4 px-5 text-center">
                                    <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md glass-dark border border-white/10 font-mono text-[10.5px] font-bold text-white/80 border border-white/10">
                                      {u.ordersCount || 0}
                                    </span>
                                  </td>
                                  {/* Actions */}
                                  <td className="py-4 px-5 text-right flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setInspectingVoucherUser(u)}
                                      className="px-2.5 py-2 min-h-[36px] rounded text-[10px] font-black uppercase transition-all bg-pink-500/10 text-[#E21B70] hover:bg-pink-500/20 cursor-pointer flex items-center gap-1"
                                    >
                                      🎟️ Vouchers ({vouchersList.filter(v => v.assignedUserIds?.includes(u.uid)).length})
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCoinManagingUser(u);
                                        setCoinAmountInput(50);
                                        setCoinNoteInput("");
                                      }}
                                      className="px-2.5 py-2 min-h-[36px] rounded text-[10px] font-black uppercase transition-all bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 cursor-pointer flex items-center gap-1"
                                    >
                                      🪙 Manage Coins
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setUnlockingUser(u)}
                                      className="px-2.5 py-2 min-h-[36px] rounded text-[10px] font-black uppercase transition-all bg-sky-50 text-sky-600 hover:bg-sky-100 cursor-pointer"
                                    >
                                      Edit Addr
                                    </button>
                                    {u.status === "locked" && u.phone !== "03277004471" && u.role !== "admin" && (
                                      <button
                                        type="button"
                                        onClick={() => setUnlockingUser(u)}
                                        className="px-2.5 py-2 min-h-[36px] rounded text-[10px] font-black uppercase transition-all bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 cursor-pointer"
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
                                              alert(`❌ User ${u.phone} permanently blocked and blacklisted.`);
                                            } catch (err) {
                                              alert("Failed to block user: " + err);
                                            }
                                          }
                                        }}
                                        className="px-2.5 py-2 min-h-[36px] rounded text-[10px] font-black uppercase transition-all bg-orange-500/10 text-orange-400 hover:bg-orange-500/15 cursor-pointer"
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
                                              unblockAlertMessage: "Aapka account admin ne unblock kar diya hai! Ab aap orders place kar sakte hain. 🎉"
                                            });
                                            await deleteDoc(doc(db, "blacklist", u.uid));
                                            alert(`✅ User ${u.phone} unblocked and removed from blacklist.`);
                                          } catch (err) {
                                            alert("Failed to unblock user: " + err);
                                          }
                                        }}
                                        className="px-2.5 py-2 min-h-[36px] rounded text-[10px] font-black uppercase transition-all bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 cursor-pointer"
                                      >
                                        Unblock
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}

                          {filteredUsers.length === 0 && (
                            <tr>
                              <td
                                colSpan={6}
                                className="text-center py-10 text-white/60 font-black"
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
              <div className="glass-dark border border-white/10 rounded-3xl p-6 relative overflow-hidden animate-scale-up">
                <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-blue-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-full">
                        Global Configuration
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-white mt-1">
                      SEO & Metadata
                    </h2>
                    <p className="text-xs text-white/70 font-medium mt-1">
                      Update global SEO tags injected into the document head.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveSeoConfig}
                      className="bg-[#E21B70] hover:bg-[#C2145E] text-white font-black text-[10px] uppercase tracking-widest py-3 px-5 rounded-xl transition cursor-pointer shrink-0"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>

              <div className="glass-dark border border-white/10 rounded-[24px] p-5 lg:p-7 shadow-sm relative">
                <div className="space-y-5">
                  <div>
                    <label className="text-[10px] font-black text-white/60 uppercase tracking-widest block mb-1.5">
                      Meta Title
                    </label>
                    <input
                      type="text"
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      placeholder="Best Online Food Delivery in Dadu | Dadu Food"
                      className="w-full p-3 glass-input border border-white/10 rounded-2xl text-xs sm:text-sm outline-none text-white focus:border-[#E21B70] transition"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-white/60 uppercase tracking-widest block mb-1.5">
                      Meta Description
                    </label>
                    <textarea
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value)}
                      placeholder="Order fresh pizza, burgers, biryani, BBQ, chai, and groceries online in Dadu City with 25-40 min delivery. Helpline: 03277004471."
                      className="w-full p-3 glass-input border border-white/10 rounded-2xl text-xs sm:text-sm outline-none text-white focus:border-[#E21B70] transition resize-none h-24"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-white/60 uppercase tracking-widest block mb-1.5">
                      Meta Keywords
                    </label>
                    <input
                      type="text"
                      value={seoKeywords}
                      onChange={(e) => setSeoKeywords(e.target.value)}
                      placeholder="Dadu Food, online food delivery Dadu, Dadu restaurants, pizza Dadu, biryani Dadu, grocery delivery Dadu"
                      className="w-full p-3 glass-input border border-white/10 rounded-2xl text-xs sm:text-sm outline-none text-white focus:border-[#E21B70] transition"
                    />
                  </div>
                </div>
              </div>

              
              

            </div>
          )}

          {activeSubTab === "loyalty" && (
            <div className="space-y-6 animate-fade-in text-left font-sans">
              {/* Header card */}
              <div className="glass-dark border border-white/10 rounded-3xl p-6 relative overflow-hidden animate-scale-up">
                <div className="absolute right-0 top-0 w-80 h-80 bg-[#E21B70]/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-[#E21B70]">
                      <Coins className="w-5 h-5 text-[#E21B70]" />
                      <span className="text-[10px] font-black uppercase tracking-widest bg-[#E21B70]/10 px-2.5 py-0.5 rounded-full">
                        Loyalty Wallet Controller
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-white mt-1">
                      Dadu Loyalty Coins Wallet
                    </h2>
                    <p className="text-xs text-white/70 font-medium mt-1">
                      Manage how many loyalty coins users earn per order, spend limits, and toggles to show or hide the system.
                    </p>
                  </div>
                  <button
                    onClick={handleSaveLoyaltyConfig}
                    className="bg-[#E21B70] hover:bg-[#C2145E] text-white font-black text-[11px] uppercase tracking-wider py-3 px-6 rounded-2xl transition cursor-pointer shrink-0 shadow-md flex items-center gap-2 self-start sm:self-auto hover:scale-[1.02] active:scale-95"
                  >
                    <Save className="w-4 h-4 text-white" />
                    Save Wallet Config
                  </button>
                </div>
              </div>

              {/* Settings Configuration Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Earn Rules Card */}
                <div className="glass-dark border border-white/10 rounded-3xl p-6 shadow-sm space-y-6 animate-scale-up">
                  <div>
                    <h3 className="font-black text-sm text-white uppercase tracking-wide flex items-center gap-2">
                      💰 Coin Earning Rules
                    </h3>
                    <p className="text-[11px] text-white/60 mt-1">
                      Set how much cashback/coins users earn when their order is completed.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Enable/Disable System */}
                    <div className="flex items-center justify-between p-3.5 bg-white/5 border border-white/10 rounded-2xl">
                      <div>
                        <span className="text-xs font-black text-white block">
                          Loyalty Coins System Status
                        </span>
                        <span className="text-[10px] text-white/60 font-medium block">
                          Dadu Coins system ko completely enable ya disable karein.
                        </span>
                      </div>
                      <button
                        onClick={() => setLoyaltyEnabled(!loyaltyEnabled)}
                        className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer outline-none shrink-0 ${
                          loyaltyEnabled ? "bg-[#E21B70]" : "bg-white/15"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full glass-dark shadow-sm transition-transform ${
                            loyaltyEnabled ? "transform translate-x-6" : ""
                          }`}
                        />
                      </button>
                    </div>

                    {/* Reward Calculation Type */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/60 uppercase tracking-widest block">
                        Reward Calculation Type
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setLoyaltyEarnType("fixed")}
                          className={`p-3 rounded-2xl text-xs font-bold border transition cursor-pointer text-center ${
                            loyaltyEarnType === "fixed"
                              ? "border-[#E21B70] bg-[#E21B70]/5 text-[#E21B70]"
                              : "border-white/10 glass-dark text-white/70 hover:bg-white/10"
                          }`}
                        >
                          Flat Coins Per Order
                        </button>
                        <button
                          type="button"
                          onClick={() => setLoyaltyEarnType("percentage")}
                          className={`p-3 rounded-2xl text-xs font-bold border transition cursor-pointer text-center ${
                            loyaltyEarnType === "percentage"
                              ? "border-[#E21B70] bg-[#E21B70]/5 text-[#E21B70]"
                              : "border-white/10 glass-dark text-white/70 hover:bg-white/10"
                          }`}
                        >
                          % of Order Total (Cashback)
                        </button>
                      </div>
                    </div>

                    {/* Reward Value */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/60 uppercase tracking-widest block">
                        {loyaltyEarnType === "fixed" ? "Flat Coin Reward Value" : "Cashback Percentage (%)"}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={loyaltyEarnCoins}
                          onChange={(e) => setLoyaltyEarnCoins(Math.max(0, Number(e.target.value)))}
                          placeholder={loyaltyEarnType === "fixed" ? "e.g. 15" : "e.g. 5"}
                          className="w-full p-3 glass-input border border-white/10 rounded-2xl text-xs sm:text-sm outline-none text-white focus:border-[#E21B70]/60 transition"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10.5px] font-black text-white/50">
                          {loyaltyEarnType === "fixed" ? "Coins" : "% of Subtotal"}
                        </span>
                      </div>
                    </div>

                    {/* Minimum Order Value */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/60 uppercase tracking-widest block">
                        Minimum Order Amount to Earn
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={loyaltyMinOrderForEarn}
                          onChange={(e) => setLoyaltyMinOrderForEarn(Math.max(0, Number(e.target.value)))}
                          placeholder="e.g. 100"
                          className="w-full p-3 glass-input border border-white/10 rounded-2xl text-xs sm:text-sm outline-none text-white focus:border-[#E21B70]/60 transition"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10.5px] font-black text-white/50">
                          Rs. Minimum
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spending Rules & Applicability Card */}
                <div className="glass-dark border border-white/10 rounded-3xl p-6 shadow-sm space-y-6 animate-scale-up">
                  <div>
                    <h3 className="font-black text-sm text-white uppercase tracking-wide flex items-center gap-2">
                      🛍️ Spend Limits & Applicability
                    </h3>
                    <p className="text-[11px] text-white/60 mt-1">
                      Configure maximum spend limits and allow coins usage on Food vs Grocery store.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Max Spend Coins */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/60 uppercase tracking-widest block">
                        Max Coins Usable Per Order
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={loyaltyMaxSpendCoins}
                          onChange={(e) => setLoyaltyMaxSpendCoins(Math.max(1, Number(e.target.value)))}
                          placeholder="e.g. 50"
                          className="w-full p-3 glass-input border border-white/10 rounded-2xl text-xs sm:text-sm outline-none text-white focus:border-[#E21B70]/60 transition"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10.5px] font-black text-white/50">
                          Coins Max
                        </span>
                      </div>
                      <span className="text-[9.5px] text-white/50 font-bold block mt-1">
                        💡 User ek single checkout mein isse zyada coins use nahi kar payega.
                      </span>
                    </div>

                    {/* Applicability Section */}
                    <div className="pt-2 border-t border-white/5 space-y-3">
                      <span className="text-[10px] font-black text-white/50 block uppercase tracking-widest">
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
                              ? "bg-[#E21B70]/10 border-[#E21B70] text-[#E21B70]"
                              : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                          }`}
                        >
                          🍕🛒 Both Categories
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setLoyaltyAllowOnFood(true);
                            setLoyaltyAllowOnGrocery(false);
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-black transition text-center ${
                            loyaltyAllowOnFood && !loyaltyAllowOnGrocery
                              ? "bg-[#E21B70]/10 border-[#E21B70] text-[#E21B70]"
                              : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                          }`}
                        >
                          🍕 Food Only
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setLoyaltyAllowOnFood(false);
                            setLoyaltyAllowOnGrocery(true);
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-black transition text-center ${
                            !loyaltyAllowOnFood && loyaltyAllowOnGrocery
                              ? "bg-[#E21B70]/10 border-[#E21B70] text-[#E21B70]"
                              : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                          }`}
                        >
                          🛒 Grocery Only
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setLoyaltyAllowOnFood(false);
                            setLoyaltyAllowOnGrocery(false);
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-black transition text-center ${
                            !loyaltyAllowOnFood && !loyaltyAllowOnGrocery
                              ? "bg-[#E21B70]/10 border-[#E21B70] text-[#E21B70]"
                              : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                          }`}
                        >
                          🚫 Disabled All
                        </button>
                      </div>

                      {/* Allow on Food */}
                      <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-2xl">
                        <div>
                          <span className="text-xs font-black text-white block">
                            Allow on Food items
                          </span>
                          <span className="text-[9.5px] text-white/60 font-medium block">
                            Food delivery orders pe coins earn/redeem allow karein.
                          </span>
                        </div>
                        <button
                          onClick={() => setLoyaltyAllowOnFood(!loyaltyAllowOnFood)}
                          className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer outline-none shrink-0 ${
                            loyaltyAllowOnFood ? "bg-[#E21B70]" : "bg-white/15"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full glass-dark shadow-sm transition-transform ${
                              loyaltyAllowOnFood ? "transform translate-x-4.5" : ""
                            }`}
                          />
                        </button>
                      </div>

                      {/* Allow on Grocery */}
                      <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-2xl">
                        <div>
                          <span className="text-xs font-black text-white block">
                            Allow on Grocery store
                          </span>
                          <span className="text-[9.5px] text-white/60 font-medium block">
                            Grocery checkout orders pe coins earn/redeem allow karein.
                          </span>
                        </div>
                        <button
                          onClick={() => setLoyaltyAllowOnGrocery(!loyaltyAllowOnGrocery)}
                          className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer outline-none shrink-0 ${
                            loyaltyAllowOnGrocery ? "bg-[#E21B70]" : "bg-white/15"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full glass-dark shadow-sm transition-transform ${
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

          {activeSubTab === "vouchers" && (
            <AdminVoucherManager
              vouchers={vouchersList}
              allUsersList={allUsersList}
              restaurantNames={uniqueRestaurants}
            />
          )}


        </div>
      </div>

      {showClearSalesModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in text-left">
          <div className="glass-dark border border-white/10 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl text-white p-6 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2.5 text-rose-400">
                <Trash2 className="w-5 h-5 shrink-0" />
                <div>
                  <h4 className="font-black text-sm uppercase tracking-wider text-white">
                    Clear Sales & Order History 🧹
                  </h4>
                  <p className="text-[11px] text-white/60 font-bold">
                    Filter and permanently delete order records from database
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowClearSalesModal(false)}
                className="text-white/50 hover:text-white/70 p-1.5 rounded-xl hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scope Filter 1: Status */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-white/80 tracking-wider">
                1. Order Status Scope:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setClearSalesStatus("delivered")}
                  className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                    clearSalesStatus === "delivered"
                      ? "bg-[#E21B70] text-white border-[#E21B70]"
                      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                  }`}
                >
                  ✅ Delivered Only
                </button>
                <button
                  type="button"
                  onClick={() => setClearSalesStatus("cancelled")}
                  className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                    clearSalesStatus === "cancelled"
                      ? "bg-[#E21B70] text-white border-[#E21B70]"
                      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                  }`}
                >
                  ❌ Cancelled Only
                </button>
                <button
                  type="button"
                  onClick={() => setClearSalesStatus("all")}
                  className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                    clearSalesStatus === "all"
                      ? "bg-[#E21B70] text-white border-[#E21B70]"
                      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                  }`}
                >
                  🌐 All Statuses
                </button>
              </div>
            </div>

            {/* Scope Filter 2: Date Range */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-white/80 tracking-wider">
                2. Select Time Period:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                <button
                  type="button"
                  onClick={() => setClearSalesRange("all")}
                  className={`py-2 px-2 rounded-xl text-[11px] font-extrabold border transition cursor-pointer ${
                    clearSalesRange === "all"
                      ? "bg-slate-900 text-white border-white/15"
                      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                  }`}
                >
                  All Time
                </button>
                <button
                  type="button"
                  onClick={() => setClearSalesRange("1day")}
                  className={`py-2 px-2 rounded-xl text-[11px] font-extrabold border transition cursor-pointer ${
                    clearSalesRange === "1day"
                      ? "bg-slate-900 text-white border-white/15"
                      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                  }`}
                >
                  1 Day
                </button>
                <button
                  type="button"
                  onClick={() => setClearSalesRange("7days")}
                  className={`py-2 px-2 rounded-xl text-[11px] font-extrabold border transition cursor-pointer ${
                    clearSalesRange === "7days"
                      ? "bg-slate-900 text-white border-white/15"
                      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                  }`}
                >
                  7 Days
                </button>
                <button
                  type="button"
                  onClick={() => setClearSalesRange("30days")}
                  className={`py-2 px-2 rounded-xl text-[11px] font-extrabold border transition cursor-pointer ${
                    clearSalesRange === "30days"
                      ? "bg-slate-900 text-white border-white/15"
                      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                  }`}
                >
                  1 Month
                </button>
                <button
                  type="button"
                  onClick={() => setClearSalesRange("custom")}
                  className={`py-2 px-2 rounded-xl text-[11px] font-extrabold border transition cursor-pointer ${
                    clearSalesRange === "custom"
                      ? "bg-slate-900 text-white border-white/15"
                      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                  }`}
                >
                  Manual
                </button>
              </div>

              {clearSalesRange === "custom" && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div>
                    <label className="text-[10px] font-bold text-white/60 uppercase">From Date:</label>
                    <input
                      type="date"
                      value={clearSalesCustomStart}
                      onChange={(e) => setClearSalesCustomStart(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-bold border border-white/15 rounded-xl focus:ring-1 focus:ring-[#E21B70]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-white/60 uppercase">To Date:</label>
                    <input
                      type="date"
                      value={clearSalesCustomEnd}
                      onChange={(e) => setClearSalesCustomEnd(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-bold border border-white/15 rounded-xl focus:ring-1 focus:ring-[#E21B70]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Live Count Preview */}
            {(() => {
              const matchingOrders = orders.filter((order) => {
                const isDelivered = order.status === "delivered" || order.status === "completed";
                const isCancelled = order.status === "cancelled";

                if (clearSalesStatus === "delivered" && !isDelivered) return false;
                if (clearSalesStatus === "cancelled" && !isCancelled) return false;

                return checkOrderInDateRange(order, clearSalesRange, clearSalesCustomStart, clearSalesCustomEnd);
              });
              const matchingRevenue = matchingOrders.reduce((acc, o) => acc + (o.grandTotal || 0), 0);

              return (
                <div className="bg-rose-500/10 border border-rose-400/30 p-4 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between text-xs font-black text-rose-300">
                    <span>Target Orders to Delete:</span>
                    <span className="bg-rose-600 text-white px-2.5 py-0.5 rounded-lg">
                      {matchingOrders.length} orders
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-rose-400">
                    <span>Associated Revenue Value:</span>
                    <span>Rs. {Math.round(matchingRevenue).toLocaleString()}</span>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowClearSalesModal(false)}
                className="px-4 py-2.5 rounded-xl border border-white/10 text-white/70 font-black text-xs hover:bg-white/10 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingSales}
                onClick={handleExecuteClearSalesHistory}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-rose-500/20 cursor-pointer disabled:opacity-50"
              >
                {isDeletingSales ? "Deleting Orders..." : "Permanently Delete Selected Orders 🧹"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in text-left">
          <div className="glass-dark border border-white/10 rounded-3xl max-w-sm w-full overflow-hidden shadow-sm text-white p-6 space-y-4 animate-scale-up">
            <div className="flex items-center gap-2.5 text-red-500">
              <AlertTriangle className="w-5 h-5 shrink-0 animate-pulse" />
              <h4 className="font-black text-xs uppercase tracking-widest">
                {confirmDialog.title}
              </h4>
            </div>
            <p className="text-[11px] text-white/70 font-semibold leading-relaxed">
              {confirmDialog.message}
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  const cb = confirmDialog.onCancel;
                  setConfirmDialog(null);
                  cb?.();
                }}
                className="px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] uppercase font-black text-white/70 hover:text-white/80 hover:bg-white/10 transition cursor-pointer"
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
                className="px-4 py-2.5 min-h-[40px] bg-gradient-to-r from-pink-600 to-pink-700 text-white rounded-xl text-[10px] font-black hover:brightness-110 shadow-md cursor-pointer transition uppercase tracking-wide"
              >
                {confirmDialog.confirmLabel || "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADDRESS ENTRY MODAL FOR UNLOCKING USER */}
      {unlockingUser && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in text-left">
          <div className="glass-dark border border-white/10 rounded-[32px] max-w-md w-full overflow-hidden shadow-2xl p-6 relative animate-scale-up">
            <button
              onClick={() => {
                setUnlockingUser(null);
                setUnlockArea("");
                setUnlockStreet("");
                setUnlockLandmark("");
                setUnlockNotes("");
                setUnlockCoords(null);
              }}
              aria-label="Close"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/60 flex items-center justify-center transition cursor-pointer font-black text-xs"
            >
              ✕
            </button>
            
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#E21B70] block">
                  {unlockingUser.status === "locked" ? "Verify & Configure Address" : "Update Delivery Address"}
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  {unlockingUser.status === "locked" ? "Unlock User:" : "Edit Address for:"} {unlockingUser.phone}
                </h3>
                <p className="text-[11.5px] text-white/60 mt-1 font-semibold leading-relaxed">
                  {unlockingUser.status === "locked"
                    ? "Call user to verify their details, then enter their delivery/mohalla address below. After saving, the user will be unlocked!"
                    : "Update the user's structured address and coordinates below. This address will be used for all future deliveries."}
                </p>
              </div>

              <form onSubmit={handleUnlockSubmit} className="space-y-4">
                <div className="space-y-3.5">
                  <div>
                    <label className="text-[9.5px] font-black uppercase tracking-wider text-white/70 block mb-1">
                      Area / Mohalla <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={unlockArea}
                      onChange={(e) => setUnlockArea(e.target.value)}
                      placeholder="e.g. Model Town, Gulberg, Dadu"
                      className="w-full p-3 glass-input border border-white/10 rounded-2xl text-xs font-bold outline-none text-white focus:border-[#E21B70] focus:ring-1 focus:ring-[#E21B70] transition"
                    />
                  </div>

                  <div>
                    <label className="text-[9.5px] font-black uppercase tracking-wider text-white/70 block mb-1">
                      Street / Gali <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={unlockStreet}
                      onChange={(e) => setUnlockStreet(e.target.value)}
                      placeholder="e.g. Gali No. 4, Street 12, Main Road"
                      className="w-full p-3 glass-input border border-white/10 rounded-2xl text-xs font-bold outline-none text-white focus:border-[#E21B70] focus:ring-1 focus:ring-[#E21B70] transition"
                    />
                  </div>

                  <div>
                    <label className="text-[9.5px] font-black uppercase tracking-wider text-white/70 block mb-1">
                      Landmark / Mashoor Jagah
                    </label>
                    <input
                      type="text"
                      value={unlockLandmark}
                      onChange={(e) => setUnlockLandmark(e.target.value)}
                      placeholder="e.g. Near Bilal Masjid, Opp. Govt School"
                      className="w-full p-3 glass-input border border-white/10 rounded-2xl text-xs font-bold outline-none text-white focus:border-[#E21B70] focus:ring-1 focus:ring-[#E21B70] transition"
                    />
                  </div>

                  <div>
                    <label className="text-[9.5px] font-black uppercase tracking-wider text-white/70 block mb-1">
                      Delivery Notes / Special Instructions
                    </label>
                    <textarea
                      value={unlockNotes}
                      onChange={(e) => setUnlockNotes(e.target.value)}
                      placeholder="e.g. deliver to back gate, call on arrival, orange gate house"
                      rows={2}
                      className="w-full p-3 glass-input border border-white/10 rounded-2xl text-xs font-bold outline-none text-white focus:border-[#E21B70] focus:ring-1 focus:ring-[#E21B70] transition resize-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[9.5px] font-black uppercase tracking-wider text-white/70 block">
                        Precise GPS coordinates / Location
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowUserManualCoords(!showUserManualCoords)}
                        className="text-[9.5px] font-bold text-[#E21B70] hover:underline cursor-pointer"
                      >
                        {showUserManualCoords ? "Hide Manual Inputs" : "✍️ Manual Fill (Lat / Lng)"}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDetectUnlockGPS}
                        disabled={isDetectingUnlockGPS}
                        className="bg-white/5 border border-white/10 text-white/80 py-2.5 px-3.5 rounded-xl font-bold text-[10.5px] uppercase tracking-wider transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 hover:bg-white/10"
                      >
                        {isDetectingUnlockGPS ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          "📍 Auto Fill GPS"
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsUserMapPickerOpen(true)}
                        className="bg-[#E21B70] text-white py-2.5 px-3.5 rounded-xl font-bold text-[10.5px] uppercase tracking-wider transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs hover:bg-[#C2145E]"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{unlockCoords?.lat && unlockCoords?.lng ? "Change on Map" : "🗺️ Select on Map"}</span>
                      </button>

                      {unlockCoords && !showUserManualCoords && (
                        <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-400/25">
                          <span className="text-[10px] font-mono text-emerald-400 font-bold">
                            {unlockCoords.lat?.toFixed(5)}, {unlockCoords.lng?.toFixed(5)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setUnlockCoords(null)}
                            aria-label="Clear coordinates"
                            className="text-rose-500 hover:text-rose-400 text-xs font-bold px-2 py-1 min-h-[32px] cursor-pointer"
                            title="Clear coordinates"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    {showUserManualCoords && (
                      <div className="grid grid-cols-2 gap-2.5 mt-2.5 p-3 bg-white/5 border border-white/10 rounded-2xl animate-fade-in">
                        <div>
                          <label className="text-[9px] font-extrabold text-white/60 uppercase tracking-wider block mb-1">
                            Latitude (e.g. 26.7323)
                          </label>
                          <input
                            type="text"
                            placeholder="26.7323"
                            value={unlockCoords?.lat !== undefined ? String(unlockCoords.lat) : ""}
                            onChange={(e) => {
                              const val = e.target.value !== "" ? parseFloat(e.target.value) : undefined;
                              setUnlockCoords({
                                lat: isNaN(val as number) ? undefined : val,
                                lng: unlockCoords?.lng,
                              });
                            }}
                            className="w-full p-2.5 glass-input border border-white/10 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-[#E21B70] transition"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-extrabold text-white/60 uppercase tracking-wider block mb-1">
                            Longitude (e.g. 67.7744)
                          </label>
                          <input
                            type="text"
                            placeholder="67.7744"
                            value={unlockCoords?.lng !== undefined ? String(unlockCoords.lng) : ""}
                            onChange={(e) => {
                              const val = e.target.value !== "" ? parseFloat(e.target.value) : undefined;
                              setUnlockCoords({
                                lat: unlockCoords?.lat,
                                lng: isNaN(val as number) ? undefined : val,
                              });
                            }}
                            className="w-full p-2.5 glass-input border border-white/10 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-[#E21B70] transition"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5 mt-4">
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
                    className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10.5px] uppercase font-black text-white/70 hover:text-white/80 hover:bg-white/10 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUnlocking}
                    className="px-5 py-2.5 bg-[#E21B70] text-white rounded-xl text-[10.5px] font-black hover:bg-[#C2145E] shadow-md cursor-pointer transition uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-wait"
                  >
                    {isUnlocking ? "⏳ Saving..." : unlockingUser.status === "locked" ? "Save & Unlock ✅" : "Save Address 💾"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* COIN MANAGEMENT MODAL */}
      {coinManagingUser && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in text-left">
          <div className="glass-dark border border-white/10 rounded-[32px] max-w-md w-full overflow-hidden shadow-2xl p-6 relative animate-scale-up">
            <button
              onClick={() => {
                setCoinManagingUser(null);
                setCoinAmountInput(50);
                setCoinNoteInput("");
              }}
              aria-label="Close"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/60 flex items-center justify-center transition cursor-pointer font-black text-xs"
            >
              ✕
            </button>
            
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">
                  Coin Benefit Wallet Management
                </span>
                <h3 className="text-lg font-black text-white mt-1 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-500" />
                  Coins for {coinManagingUser.name || coinManagingUser.phone || "User"}
                </h3>
                <p className="text-[11.5px] text-white/60 mt-1 font-semibold leading-relaxed">
                  Aap user ko manually Coin Benefit send (add) bhi kar sakte hain aur deduct (remove) bhi kar sakte hain!
                </p>
              </div>

              <div className="space-y-4">
                {/* User Current Balance */}
                <div className="bg-amber-500/10 border border-amber-400/30 p-3.5 rounded-2xl text-xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 font-bold uppercase text-[9.5px]">Current Coin Balance:</span>
                    <span className="text-amber-400 font-mono font-black text-sm bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-400/40">
                      {getUserCoins(coinManagingUser, deliverySettings)} Coins (Rs. {getUserCoins(coinManagingUser, deliverySettings)})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50 font-bold uppercase text-[9px]">Phone Number:</span>
                    <span className="text-white font-mono font-bold">{coinManagingUser.phone || "Guest"}</span>
                  </div>
                </div>

                {/* Coin Amount Input */}
                <div>
                  <label className="text-[9.5px] font-black uppercase tracking-wider text-white/70 block mb-1">
                    Number of Coins (Amount) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={coinAmountInput}
                    onChange={(e) => setCoinAmountInput(Math.max(1, Number(e.target.value)))}
                    placeholder="Enter coin amount e.g. 50"
                    className="w-full p-3 glass-input border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                  />
                </div>

                {/* Custom Note / Message */}
                <div>
                  <label className="text-[9.5px] font-black uppercase tracking-wider text-white/70 block mb-1">
                    Optional Note / Notification Message
                  </label>
                  <input
                    type="text"
                    value={coinNoteInput}
                    onChange={(e) => setCoinNoteInput(e.target.value)}
                    placeholder="e.g. Special loyalty bonus or manual correction"
                    className="w-full p-3 glass-input border border-white/10 rounded-2xl text-xs font-bold text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                  />
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 mt-4">
                  {/* Remove / Deduct Button */}
                  <button
                    type="button"
                    disabled={isCoinProcessing}
                    onClick={async () => {
                      if (!coinAmountInput || coinAmountInput <= 0) {
                        alert("Please enter a valid coin amount!");
                        return;
                      }
                      setIsCoinProcessing(true);
                      try {
                        const currentBalance = getUserCoins(coinManagingUser, deliverySettings);
                        const newBalance = Math.max(0, currentBalance - coinAmountInput);
                        
                        await updateDoc(doc(db, "users", coinManagingUser.uid), {
                          loyaltyCoins: newBalance
                        });

                        const msg = coinNoteInput.trim() || `⚠️ Admin ne aapke wallet se ${coinAmountInput} Coins deduct/remove kiye hain. Naya balance: ${newBalance} coins.`;
                        await addDoc(collection(db, "notifications"), {
                          userId: coinManagingUser.uid,
                          title: "🪙 Coins Deducted",
                          message: msg,
                          createdAt: new Date(),
                          read: false
                        });

                        alert(`⚠️ ${coinAmountInput} coins deducted from ${coinManagingUser.name || coinManagingUser.phone}! New Balance: ${newBalance}`);
                        setCoinManagingUser(null);
                      } catch (err: any) {
                        alert("Failed to deduct coins: " + err.message);
                      } finally {
                        setIsCoinProcessing(false);
                      }
                    }}
                    className="px-4 py-3 bg-red-500 text-white rounded-xl text-[10.5px] font-black hover:bg-red-600 shadow-md cursor-pointer transition uppercase tracking-wider flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    ➖ Remove Coins
                  </button>

                  {/* Add / Send Button */}
                  <button
                    type="button"
                    disabled={isCoinProcessing}
                    onClick={async () => {
                      if (!coinAmountInput || coinAmountInput <= 0) {
                        alert("Please enter a valid coin amount!");
                        return;
                      }
                      setIsCoinProcessing(true);
                      try {
                        await updateDoc(doc(db, "users", coinManagingUser.uid), {
                          loyaltyCoins: increment(coinAmountInput)
                        });

                        const msg = coinNoteInput.trim() || `🎉 Mubarak ho! Admin ne aapko ${coinAmountInput} Coins credit kar diye hain! Enjoy your rewards! 🎁`;
                        await addDoc(collection(db, "notifications"), {
                          userId: coinManagingUser.uid,
                          title: "🪙 Coins Received!",
                          message: msg,
                          createdAt: new Date(),
                          read: false
                        });

                        alert(`✅ ${coinAmountInput} coins successfully sent to ${coinManagingUser.name || coinManagingUser.phone}!`);
                        setCoinManagingUser(null);
                      } catch (err: any) {
                        alert("Failed to send coins: " + err.message);
                      } finally {
                        setIsCoinProcessing(false);
                      }
                    }}
                    className="px-4 py-3 bg-amber-500 text-zinc-950 rounded-xl text-[10.5px] font-black hover:bg-amber-400 shadow-md cursor-pointer transition uppercase tracking-wider flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    ➕ Send / Add Coins
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RIDER STATS LEDGER MODAL */}
      {selectedRiderStatsId && (() => {
        const selectedRiderObj = ridersSubset.find((r) => r.uid === selectedRiderStatsId);
        if (!selectedRiderObj) return null;

        // 1. Gather all delivered orders for this rider
        const riderDeliveredOrders = orders.filter((o) => {
          if (o.riderId !== selectedRiderStatsId) return false;
          if (o.status !== "delivered" && o.status !== "completed") return false;

          // If NOT showing settled/cleared history, filter out settled orders
          if (!showSettledHistory) {
            if (o.riderSettled) return false;
            if (selectedRiderObj.lastSettledAt) {
              const orderDeliveredTime = parseDateToMillis(o.deliveryCompletedAt || o.createdAt);
              const settledTime = parseDateToMillis(selectedRiderObj.lastSettledAt);

              if (orderDeliveredTime <= settledTime) {
                return false;
              }
            }
          }
          return true;
        });

        // 2. Filter by timeframe
        const now = Date.now();
        const timeframeFiltered = riderDeliveredOrders.filter((o) => {
          const orderTime = parseDateToMillis(o.deliveryCompletedAt || o.createdAt);

          if (statsTimeframe === "1day") {
            const todayStart = new Date().setHours(0, 0, 0, 0);
            return orderTime >= todayStart;
          } else if (statsTimeframe === "7days") {
            const limit = now - 7 * 24 * 60 * 60 * 1000;
            return orderTime >= limit;
          } else if (statsTimeframe === "30days") {
            const limit = now - 30 * 24 * 60 * 60 * 1000;
            return orderTime >= limit;
          } else if (statsTimeframe === "60days") {
            const limit = now - 60 * 24 * 60 * 60 * 1000;
            return orderTime >= limit;
          }
          return true; // all
        });

        // 3. Group by day for daily list
        const dailyGroups: Record<string, {
          dateStr: string;
          count: number;
          sales: number;
          commission: number;
          orders: Order[];
        }> = {};

        timeframeFiltered.forEach((o) => {
          const orderTime = parseDateToMillis(o.deliveryCompletedAt || o.createdAt);

          const dateObj = new Date(orderTime);
          const formattedDate = dateObj.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
          });

          const amt = o.grandTotal || o.totalPrice || 0;
          const comm = o.deliveryFee || 0;

          if (!dailyGroups[formattedDate]) {
            dailyGroups[formattedDate] = {
              dateStr: formattedDate,
              count: 0,
              sales: 0,
              commission: 0,
              orders: []
            };
          }

          dailyGroups[formattedDate].count += 1;
          dailyGroups[formattedDate].sales += amt;
          dailyGroups[formattedDate].commission += comm;
          dailyGroups[formattedDate].orders.push(o);
        });

        const dailyGroupsArray = Object.values(dailyGroups).sort((a, b) => {
          return Date.parse(b.dateStr) - Date.parse(a.dateStr);
        });

        // Totals inside timeframe
        const totalTimeframeOrders = timeframeFiltered.length;
        const totalTimeframeSales = timeframeFiltered.reduce((sum, o) => sum + (o.grandTotal || o.totalPrice || 0), 0);
        const totalTimeframeCommission = timeframeFiltered.reduce((sum, o) => {
          return sum + (o.deliveryFee || 0);
        }, 0);

        return (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in text-left">
            <div className="glass-dark border border-white/10 rounded-[32px] max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl p-6 relative font-sans text-white animate-scale-up">
              <button
                type="button"
                onClick={() => setSelectedRiderStatsId(null)}
                aria-label="Close rider report"
                className="absolute top-6 right-6 text-white/50 hover:text-white/70 p-2 min-w-[40px] min-h-[40px] hover:bg-white/10 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="bg-[#E21B70]/10 p-2.5 rounded-2xl">
                  <ClipboardList className="w-6 h-6 text-[#E21B70]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wide">
                    Delivery Report Ledger
                  </h3>
                  <p className="text-[11px] text-white/60 font-bold">
                    Rider: <span className="text-[#E21B70] font-black">{selectedRiderObj.name}</span> ({selectedRiderObj.phone})
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto py-4 space-y-5 scrollbar-none">
                
                {/* Filters */}
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <span className="text-[10px] font-black uppercase text-white/60 tracking-wider">
                      📅 Select Duration (Mudat)
                    </span>
                    <div className="flex flex-wrap gap-1 glass-dark border border-white/10 p-1 rounded-xl">
                      {[
                        { id: "1day", label: "1 Din (Today)" },
                        { id: "7days", label: "7 Din (Week)" },
                        { id: "30days", label: "30 Din (Month)" },
                        { id: "60days", label: "60 Din (2 Months)" },
                        { id: "all", label: "All Data" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setStatsTimeframe(item.id as any)}
                          className={`px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wide rounded-lg transition-all cursor-pointer ${
                            statsTimeframe === item.id
                              ? "bg-[#E21B70] text-white"
                              : "text-white/60 hover:text-white/80 hover:bg-white/10"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Settle Options */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/10 flex-wrap gap-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showSettledHistory}
                        onChange={(e) => setShowSettledHistory(e.target.checked)}
                        className="w-4 h-4 rounded border-white/15 text-[#E21B70] focus:ring-[#E21B70]"
                      />
                      <span className="text-[10.5px] text-white/70 font-extrabold uppercase tracking-wide">
                        Settle kiya hua history bhi shamil karein
                      </span>
                    </label>

                    {selectedRiderObj.lastSettledAt && (
                      <span className="text-[9px] bg-white/15 text-white/60 px-2 py-0.5 rounded-md font-bold uppercase">
                        Aakhri Settle Time: {new Date(
                          parseDateToMillis(selectedRiderObj.lastSettledAt)
                        ).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Ledger Key Numbers */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/5 border border-white/10 p-3 rounded-2xl text-center">
                    <span className="text-[8.5px] text-white/60 uppercase tracking-widest font-black block leading-none">
                      DELIVERED RUNS
                    </span>
                    <span className="text-lg font-black text-white block mt-1.5 leading-none">
                      {totalTimeframeOrders}
                    </span>
                    <span className="text-[8px] text-white/50 font-bold block mt-1">
                      completed shipments
                    </span>
                  </div>
                  
                  <div className="bg-[#E21B70]/5 border border-[#E21B70]/10 p-3 rounded-2xl text-center">
                    <span className="text-[8.5px] text-white/60 uppercase tracking-widest font-black block leading-none">
                      TOTAL ORDER AMOUNT
                    </span>
                    <span className="text-lg font-black text-[#E21B70] block mt-1.5 leading-none font-mono">
                      Rs. {totalTimeframeSales}
                    </span>
                    <span className="text-[8px] text-white/50 font-bold block mt-1">
                      cumulative collection
                    </span>
                  </div>

                  <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-2xl text-center">
                    <span className="text-[8.5px] text-white/60 uppercase tracking-widest font-black block leading-none">
                      EARNED RIDER FEE (KAMAEE)
                    </span>
                    <span className="text-lg font-black text-emerald-400 block mt-1.5 leading-none font-mono font-sans">
                      Rs. {totalTimeframeCommission}
                    </span>
                    <span className="text-[8px] text-white/50 font-bold block mt-1">
                      due rider fee payout
                    </span>
                  </div>
                </div>

                {/* Daily Performance list */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-[11px] font-black uppercase text-white/60 tracking-wider flex items-center justify-between">
                    <span>📅 Daily Performance Breakdown (Rozana Reports)</span>
                    <span className="text-[10px] text-white/50 lowercase font-medium">({dailyGroupsArray.length} active days)</span>
                  </h4>

                  {dailyGroupsArray.length === 0 ? (
                    <div className="text-center p-8 bg-white/5 border border-dashed border-white/10 rounded-2xl text-white/50 text-xs font-semibold">
                      Is duration me koi completed deliveries nahi hain.
                    </div>
                  ) : (
                    <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-none">
                      {dailyGroupsArray.map((group) => (
                        <div key={group.dateStr} className="glass-dark border border-white/10 rounded-2xl p-4 space-y-2.5 hover:border-white/15 transition-colors">
                          <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                            <span className="text-xs font-black text-white">
                              {group.dateStr}
                            </span>
                            <span className="text-[10px] bg-[#E21B70]/10 text-[#E21B70] font-black px-2.5 py-0.5 rounded-full uppercase">
                              {group.count} Delivered {group.count === 1 ? "Order" : "Orders"}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                            <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl">
                              <span className="text-white/60 text-[10px]">Total Order Value:</span>
                              <span className="font-mono text-white font-black">Rs. {group.sales}</span>
                            </div>
                            <div className="flex items-center justify-between bg-emerald-500/5 p-2 rounded-xl">
                              <span className="text-white/60 text-[10px]">Rider Fee Earned:</span>
                              <span className="font-mono text-emerald-400 font-black font-sans">Rs. {group.commission}</span>
                            </div>
                          </div>

                          {/* Order-by-order detail drawer inside daily item */}
                          <div className="space-y-2 pt-1.5">
                            <span className="text-[8.5px] font-black uppercase text-white/50 tracking-widest block">Deliveries List:</span>
                            <div className="space-y-2 max-h-[280px] overflow-y-auto text-[10px] leading-none scrollbar-none">
                              {group.orders.map((order) => {
                                const fee = order.deliveryFee !== undefined ? order.deliveryFee : 0;
                                const riderTotal = fee;
                                return (
                                  <div key={order.id} className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl space-y-2.5 transition text-left font-sans">
                                    <div className="flex justify-between items-start gap-2.5">
                                      <div className="flex items-center gap-1.5 truncate">
                                        <span className="font-black text-[#E21B70] text-[10px]">{formatOrderId(order.id)}</span>
                                        <span className="text-white/80">|</span>
                                        <span className="text-white/80 font-sans truncate font-bold text-[10.5px]">{order.userName}</span>
                                      </div>
                                      <div className="flex items-center gap-2.5 shrink-0 text-[10px] font-sans">
                                        <span className="text-white/50 font-medium">Order: Rs. {order.grandTotal || order.totalPrice}</span>
                                        <span className="bg-[#E21B70]/10 text-[#E21B70] font-black px-2 py-0.5 rounded-md">
                                          Total: Rs. {riderTotal}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Breakdown details */}
                                    <div className="flex justify-between items-center text-[10px] border-t border-white/10 pt-2 font-sans font-semibold">
                                      <span className="text-white/60">Rider Delivery Fee (Pure Payout):</span>
                                      <span className="font-mono text-[#E21B70] font-extrabold text-[11px]">Rs. {riderTotal}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Action Buttons / Footer */}
              <div className="border-t border-white/10 pt-4 flex items-center justify-between gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedRiderStatsId(null)}
                  className="px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-xs uppercase font-black text-white/60 hover:text-white/80 hover:bg-white/10 transition cursor-pointer"
                >
                  Close (Band Karein)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleSettleRider(selectedRiderStatsId, selectedRiderObj.name);
                  }}
                  className="px-5 py-3 bg-[#E21B70] text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#C2145E] transition shadow-lg shadow-pink-500/10 cursor-pointer flex items-center gap-1.5"
                >
                  🧹 Clear & Settle Stats (Stats Reset Karein)
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {selectedRestLedgerName && (() => {
        const restName = selectedRestLedgerName;
        // 1. Gather all delivered orders that contain at least one item of this restaurant
        const restDeliveredOrders = orders.filter((o) => {
          if (o.status !== "delivered" && o.status !== "completed") return false;

          // Check if it contains at least one item from this restaurant
          const hasItem = (o.items || []).some((item) => {
            const itemRestName = item.restaurantName || (item.type === "service" ? "Dadu Home Services" : "Dadu Fast Food & Kitchen");
            return itemRestName === restName;
          });
          if (!hasItem) return false;

          // If NOT showing settled/cleared history, filter out settled orders based on restaurant's lastSettledAt
          if (!showRestSettledHistory) {
            const restConfig = deliverySettings?.restaurantStatuses?.[restName];
            if (restConfig?.lastSettledAt) {
              const orderDeliveredTime = parseDateToMillis(o.deliveryCompletedAt || o.createdAt);
              const settledTime = parseDateToMillis(restConfig.lastSettledAt);

              if (orderDeliveredTime <= settledTime) {
                return false;
              }
            }
          }
          return true;
        });

        // 2. Filter by statsTimeframe
        const filteredOrders = restDeliveredOrders.filter((o) => {
          if (restStatsTimeframe === "all") return true;

          const orderTime = parseDateToMillis(o.deliveryCompletedAt || o.createdAt);

          const diffMs = Date.now() - orderTime;
          const diffDays = diffMs / (1000 * 60 * 60 * 24);

          if (restStatsTimeframe === "1day") return diffDays <= 1;
          if (restStatsTimeframe === "7days") return diffDays <= 7;
          if (restStatsTimeframe === "30days") return diffDays <= 30;
          if (restStatsTimeframe === "60days") return diffDays <= 60;
          return true;
        });

        // 3. Compute stats metrics
        let totalOrdersCount = filteredOrders.length;
        let totalRestaurantSales = 0;
        let totalRestaurantCommission = 0;

        const restConfig = deliverySettings?.restaurantStatuses?.[restName];
        const isCustomCommission = restConfig?.commissionEnabled === true;
        const commType = restConfig?.commissionType || "percentage";
        const commVal = Number(restConfig?.commissionValue || 0);

        filteredOrders.forEach((o) => {
          let orderSales = 0;
          let orderItemCommission = 0;
          (o.items || []).forEach((item) => {
            const itemRestName = item.restaurantName || (item.type === "service" ? "Dadu Home Services" : "Dadu Fast Food & Kitchen");
            if (itemRestName === restName) {
              const itemTotal = item.price * item.quantity;
              orderSales += itemTotal;
              orderItemCommission += (item.commission || 0) * item.quantity;
            }
          });
          totalRestaurantSales += orderSales;
          if (isCustomCommission) {
            if (orderSales > 0) {
              if (commType === "percentage") {
                totalRestaurantCommission += orderSales * (commVal / 100);
              } else {
                totalRestaurantCommission += commVal;
              }
            }
          } else {
            totalRestaurantCommission += orderItemCommission;
          }
        });

        // 4. Group by Day
        const groupedByDay: Record<string, { dateStr: string; orders: typeof filteredOrders; sales: number; commission: number }> = {};
        filteredOrders.forEach((o) => {
          const orderTime = parseDateToMillis(o.deliveryCompletedAt || o.createdAt);
          const dateObj = new Date(orderTime);

          const dayKey = dateObj.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric"
          });

          if (!groupedByDay[dayKey]) {
            groupedByDay[dayKey] = { dateStr: dayKey, orders: [], sales: 0, commission: 0 };
          }
          groupedByDay[dayKey].orders.push(o);

          // Calculate matching items contribution for this specific order inside the day
          let orderSales = 0;
          let orderItemCommission = 0;
          (o.items || []).forEach((item) => {
            const itemRestName = item.restaurantName || (item.type === "service" ? "Dadu Home Services" : "Dadu Fast Food & Kitchen");
            if (itemRestName === restName) {
              orderSales += item.price * item.quantity;
              orderItemCommission += (item.commission || 0) * item.quantity;
            }
          });

          groupedByDay[dayKey].sales += orderSales;
          if (isCustomCommission) {
            if (orderSales > 0) {
              if (commType === "percentage") {
                groupedByDay[dayKey].commission += orderSales * (commVal / 100);
              } else {
                groupedByDay[dayKey].commission += commVal;
              }
            }
          } else {
            groupedByDay[dayKey].commission += orderItemCommission;
          }
        });

        const dailyGroups = Object.values(groupedByDay);

        return (
          <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in font-sans">
            <div className="glass-dark rounded-3xl shadow-2xl max-w-4xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto border border-white/5 flex flex-col justify-between animate-scale-up">
              
              {/* Header */}
              <div className="flex justify-between items-start border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-base font-black text-white tracking-wide uppercase flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-emerald-500 animate-pulse" />
                    Restaurant Ledger Report: {restName}
                  </h3>
                  <p className="text-[11px] text-white/60 font-medium mt-1">
                    Manage sales, calculate commission settings, and clear/settle stats for this restaurant.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRestLedgerName(null)}
                  aria-label="Close restaurant report"
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white/60 flex items-center justify-center transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Timeframe Selector & Settle Switcher */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-wrap gap-1 glass-dark p-1 rounded-xl border border-white/10 shadow-sm shrink-0">
                  {(["1day", "7days", "30days", "60days", "all"] as const).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setRestStatsTimeframe(tf)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                        restStatsTimeframe === tf
                          ? "bg-emerald-500 text-white shadow-sm"
                          : "text-white/60 hover:bg-white/10"
                      }`}
                    >
                      {tf === "1day" ? "Today" : tf === "7days" ? "1 Week" : tf === "30days" ? "1 Month" : tf === "60days" ? "2 Month" : "All Time"}
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showRestSettledHistory}
                    onChange={(e) => setShowRestSettledHistory(e.target.checked)}
                    className="w-4.5 h-4.5 rounded text-emerald-400 focus:ring-emerald-500/20 border-white/15"
                  />
                  <div className="text-left leading-tight">
                    <span className="text-[11px] font-black text-white block">Settle kiya hua data bhi shamil karein</span>
                    <span className="text-[9.5px] text-white/50 font-medium block">Include settled orders history</span>
                  </div>
                </label>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl space-y-1 text-left">
                  <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider block">Delivered Orders Count</span>
                  <div className="text-2xl font-black text-white font-mono">{totalOrdersCount}</div>
                  <span className="text-[9.5px] text-white/60 font-semibold block">Total completed runs</span>
                </div>

                <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-2xl space-y-1 text-left">
                  <span className="text-[9px] font-black uppercase text-purple-400 tracking-wider block">Total Restaurant Sales</span>
                  <div className="text-2xl font-black text-white font-mono">Rs. {totalRestaurantSales}</div>
                  <span className="text-[9.5px] text-white/60 font-semibold block">Excludes other vendors' items</span>
                </div>

                <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl space-y-1 text-left">
                  <span className="text-[9px] font-black uppercase text-indigo-400 tracking-wider block">Admin Commission</span>
                  <div className="text-2xl font-black text-indigo-400 font-mono">Rs. {Math.round(totalRestaurantCommission)}</div>
                  <span className="text-[9.5px] text-white/60 font-semibold block">Based on per-item commission</span>
                </div>

                <div className="p-4 bg-[#E21B70]/5 border border-[#E21B70]/10 rounded-2xl space-y-1 text-left">
                  <span className="text-[9px] font-black uppercase text-[#E21B70] tracking-wider block">Kul Kamaee (Total Earnings)</span>
                  <div className="text-2xl font-black text-[#E21B70] font-mono">Rs. {Math.round(totalRestaurantSales - totalRestaurantCommission)}</div>
                  <span className="text-[9.5px] text-white/60 font-semibold block">Sales minus Commission net payout</span>
                </div>
              </div>

              {/* Detailed Daily Breakdown */}
              <div className="space-y-3 text-left">
                <h4 className="font-extrabold text-[11px] uppercase tracking-wider text-white/50 flex items-center gap-1.5 border-b border-white/5 pb-2">
                  <span>📅</span> Daily Reports & Settle Breakdown
                </h4>

                {dailyGroups.length === 0 ? (
                  <div className="p-10 text-center bg-white/5 border border-white/10 rounded-2xl text-xs font-semibold text-white/60 italic">
                    Is timeframe me koi completed order ya commission statistics nahi mili.
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                    {dailyGroups.map((group) => (
                      <div key={group.dateStr} className="p-4 glass-dark border border-white/10 rounded-2xl space-y-3.5">
                        
                        {/* Day Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-white/5 pb-2.5">
                          <span className="text-xs font-black text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            {group.dateStr}
                          </span>
                          <div className="flex items-center gap-4 text-[10.5px]">
                            <div className="flex items-center gap-1">
                              <span className="text-white/50 font-medium">Sales:</span>
                              <span className="font-mono text-white font-black">Rs. {group.sales}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-white/50 font-medium">Commission:</span>
                              <span className="font-mono text-emerald-400 font-black">Rs. {Math.round(group.commission)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Deliveries List */}
                        <div className="space-y-2 pt-1">
                          <span className="text-[8.5px] font-black uppercase text-white/50 tracking-widest block">Orders List:</span>
                          <div className="space-y-2 max-h-[220px] overflow-y-auto text-[10px] leading-none scrollbar-none">
                            {group.orders.map((order) => {
                              // Compute matching items and totals
                              const matchingItems = (order.items || []).filter((item) => {
                                const itemRestName = item.restaurantName || (item.type === "service" ? "Dadu Home Services" : "Dadu Fast Food & Kitchen");
                                return itemRestName === restName;
                              });

                              const orderSales = matchingItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                              let orderComm = 0;
                              if (isCustomCommission) {
                                if (orderSales > 0) {
                                  if (commType === "percentage") {
                                    orderComm = orderSales * (commVal / 100);
                                  } else {
                                    orderComm = commVal;
                                  }
                                }
                              } else {
                                orderComm = matchingItems.reduce((sum, item) => sum + ((item.commission || 0) * item.quantity), 0);
                              }

                              return (
                                <div key={order.id} className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl space-y-2.5 transition text-left font-sans">
                                  <div className="flex justify-between items-start gap-2.5">
                                    <div className="flex items-center gap-1.5 truncate">
                                      <span className="font-black text-[#E21B70] text-[10px]">{formatOrderId(order.id)}</span>
                                      <span className="text-white/80">|</span>
                                      <span className="text-white/80 font-sans truncate font-bold text-[10.5px]">{order.userName}</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 shrink-0 text-[10px] font-sans">
                                      <span className="text-white/50 font-medium">Order: Rs. {order.grandTotal}</span>
                                      <span className="bg-[#E21B70]/10 text-[#E21B70] font-black px-2 py-0.5 rounded-md">
                                        Rest Sales: Rs. {orderSales}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Breakdown details */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-white/10 pt-2 font-sans">
                                    <div className="space-y-1">
                                      <span className="font-bold text-white/50 uppercase tracking-wider block">Items & Commission</span>
                                      {matchingItems.map((item, itemIdx) => {
                                        let itemCommStr = `Rs. ${(item.commission || 0) * item.quantity}`;
                                        if (isCustomCommission) {
                                          if (commType === "percentage") {
                                            itemCommStr = `Rs. ${(item.price * item.quantity * (commVal / 100)).toFixed(1)} (${commVal}%)`;
                                          } else {
                                            itemCommStr = "Flat order rate";
                                          }
                                        }
                                        return (
                                          <div key={itemIdx} className="flex justify-between text-white/70 font-semibold gap-2">
                                            <span className="truncate">{item.quantity}x {item.name}</span>
                                            <span className="shrink-0 text-emerald-400 font-bold font-mono">{itemCommStr}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <div className="flex flex-col justify-end items-end text-right">
                                      <div className="text-[10px] font-black text-white">
                                        Commission Earned: <span className="font-mono text-[#E21B70] font-extrabold">Rs. {Math.round(orderComm)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons / Footer */}
              <div className="border-t border-white/10 pt-4 flex items-center justify-between gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedRestLedgerName(null)}
                  className="px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-xs uppercase font-black text-white/60 hover:text-white/80 hover:bg-white/10 transition cursor-pointer"
                >
                  Close (Band Karein)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleSettleRestaurant(restName);
                  }}
                  className="px-5 py-3 bg-[#E21B70] text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#C2145E] transition shadow-lg shadow-pink-500/10 cursor-pointer flex items-center gap-1.5"
                >
                  🧹 Clear & Settle Stats (Stats Reset Karein)
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ORDER RECEIPT & WHATSAPP MODAL */}
      <OrderReceiptModal
        order={receiptModalOrder}
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        senderRole="admin"
      />

      {/* Map Location Picker Modals */}
      <MapLocationPickerModal
        isOpen={isRestaurantMapPickerOpen}
        onClose={() => setIsRestaurantMapPickerOpen(false)}
        initialLat={restLat ? parseFloat(restLat) : null}
        initialLng={restLng ? parseFloat(restLng) : null}
        title={`Select Location for ${selectedScheduleRestaurant}`}
        onSaveLocation={(lat, lng) => {
          setRestLat(lat.toString());
          setRestLng(lng.toString());
        }}
      />

      <MapLocationPickerModal
        isOpen={isBaseMapPickerOpen}
        onClose={() => setIsBaseMapPickerOpen(false)}
        initialLat={baseLatInput}
        initialLng={baseLngInput}
        title="Select Central Base Delivery Location"
        onSaveLocation={(lat, lng) => {
          setBaseLatInput(lat);
          setBaseLngInput(lng);
        }}
      />

      <MapLocationPickerModal
        isOpen={isUserMapPickerOpen}
        onClose={() => setIsUserMapPickerOpen(false)}
        initialLat={unlockCoords?.lat ?? null}
        initialLng={unlockCoords?.lng ?? null}
        title={`Select Location on Map for ${unlockingUser?.phone || "User"}`}
        onSaveLocation={(lat, lng) => {
          setUnlockCoords({ lat, lng });
        }}
      />

      {/* USER VOUCHERS INSPECTOR & SENDER MODAL */}
      {inspectingVoucherUser && (
        <UserVoucherInspectorModal
          user={inspectingVoucherUser}
          onClose={() => setInspectingVoucherUser(null)}
          allVouchers={vouchersList}
        />
      )}

      {/* NEW USER REALTIME NOTIFICATION TOAST */}
      {newUserToast && newUserToast.show && (
        <div className="fixed bottom-6 right-6 z-[120] p-4 max-w-sm bg-zinc-950 border-2 border-[#E21B70] text-zinc-100 rounded-2xl shadow-2xl flex items-start gap-3 micro-toast-in">
          <div className="bg-[#E21B70] text-white p-2.5 rounded-xl shrink-0 animate-bounce">
            <span className="text-lg">⏳</span>
          </div>
          <div>
            <h5 className="font-extrabold text-xs text-pink-400 uppercase tracking-wider flex items-center gap-2">
              Naya user aaya!
              <span className="bg-[#E21B70]/20 text-pink-400 text-[8px] font-black px-1.5 py-0.5 rounded-md animate-pulse">
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
