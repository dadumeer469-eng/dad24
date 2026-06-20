import React, { useState, useEffect } from "react";
import { UserProfile, Dish, Order, SystemSettings, AppNotification } from "../types";
import { 
  doc, setDoc, deleteDoc, collection, addDoc, updateDoc, query, where, onSnapshot, getDocs
} from "firebase/firestore";
import { db, firebaseConfig } from "../firebase";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from "recharts";
import { 
  Plus, Settings, LayoutDashboard, ShoppingCart, ListCollapse, ToggleLeft, ToggleRight, Trash2, 
  HelpCircle, RefreshCw, Smartphone, TrendingUp, DollarSign, Package, CheckCheck, Save, Send, EyeOff, Wrench,
  UserPlus, User, Loader2, Key, Truck, Compass
} from "lucide-react";

interface AdminPanelProps {
  dishes: Dish[];
  orders: Order[];
  onClose: () => void;
  adminUsername: string;
  deliverySettings: SystemSettings;
}

export default function AdminPanel({
  dishes,
  orders,
  onClose,
  adminUsername,
  deliverySettings,
}: AdminPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<"analytics" | "items" | "orders" | "riders">("analytics");
  
  // Delivery config state
  const [deliveryChargeInput, setDeliveryChargeInput] = useState(deliverySettings?.deliveryFee || 50);

  // Form states for adding items
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState<Dish["category"]>("Burgers");
  const [newItemPrice, setNewItemPrice] = useState<number>(300);
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemImageUrl, setNewItemImageUrl] = useState("");
  const [newItemType, setNewItemType] = useState<"food" | "service">("food");
  const [newItemServiceDuration, setNewItemServiceDuration] = useState("");
  const [newItemRestaurantName, setNewItemRestaurantName] = useState("");

  // Inline editing state for prices
  const [editingPriceDishId, setEditingPriceDishId] = useState<string | null>(null);
  const [editingPriceInput, setEditingPriceInput] = useState<number>(0);

  // Rider/ETA state overrides
  const [riderNames, setRiderNames] = useState<{ [orderId: string]: string }>({});
  const [orderEtas, setOrderEtas] = useState<{ [orderId: string]: string }>({});

  // Alert dispatcher state
  const [alertTitle, setAlertTitle] = useState("Dadu Specials Alert!");
  const [alertMessage, setAlertMessage] = useState("A new professional is ready to deliver hot burgers and help!");

  // Rider registration form states
  const [riderNameInput, setRiderNameInput] = useState("");
  const [riderPhoneInput, setRiderPhoneInput] = useState("");
  const [riderVehicleInput, setRiderVehicleInput] = useState("");
  const [riderEmailInput, setRiderEmailInput] = useState("");
  const [riderPasswordInput, setRiderPasswordInput] = useState("");
  const [riderRegLoading, setRiderRegLoading] = useState(false);
  const [ridersSubset, setRidersSubset] = useState<UserProfile[]>([]);

  // Real-time listen to registered riders list
  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "rider"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach((doc) => {
        list.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });
      setRidersSubset(list);
    }, (err) => {
      console.error("Failed to fetch real-time riders:", err);
    });
    return () => unsubscribe();
  }, []);

  // Secure Rider Creator
  const handleRegisterRiderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!riderNameInput.trim() || !riderPhoneInput.trim() || !riderVehicleInput.trim() || !riderEmailInput.trim() || !riderPasswordInput) {
      alert("All fields are required!");
      return;
    }
    if (riderPasswordInput.length < 6) {
      alert("Password must be at least 6 characters long!");
      return;
    }

    setRiderRegLoading(true);
    let tempApp;
    try {
      // 1. First, check if there is an existing database profile with this exact phone number
      const phoneQuery = query(collection(db, "users"), where("phone", "==", riderPhoneInput.trim()));
      const querySnapshot = await getDocs(phoneQuery);
      if (!querySnapshot.empty) {
        const existingDoc = querySnapshot.docs[0];
        const existingData = existingDoc.data() as UserProfile;
        const confirmResult = window.confirm(
          `Profile MATCH detected:\n\nA user named "${existingData.name}" is already registered database-wide with the phone number: ${riderPhoneInput}.\nTheir current system role is: "${existingData.role}".\n\nWould you like to directly PROMOTE this existing customer/user to standard "rider" duty and assign the vehicle number "${riderVehicleInput}"? (This saves you from creating a duplicate authentication account!)`
        );
        if (confirmResult) {
          await updateDoc(doc(db, "users", existingDoc.id), {
            role: "rider",
            vehicleNumber: riderVehicleInput,
            address: "Dadu Riders HQ"
          });
          alert(`Success! "${existingData.name}" has been upgraded to Rider duty successfully.`);
          setRiderNameInput("");
          setRiderPhoneInput("");
          setRiderVehicleInput("");
          setRiderEmailInput("");
          setRiderPasswordInput("");
          setRiderRegLoading(false);
          return;
        }
      }

      // 2. Otherwise launch secondary Auth registration pipeline
      const uniqueAppName = `RiderApp_${Date.now()}`;
      tempApp = initializeApp(firebaseConfig, uniqueAppName);
      const tempAuth = getAuth(tempApp);

      // Create new Auth credential
      const userCredential = await createUserWithEmailAndPassword(tempAuth, riderEmailInput, riderPasswordInput);
      const createdUid = userCredential.user.uid;

      // Create database record with role "rider"
      const newRiderProfile: UserProfile = {
        uid: createdUid,
        name: riderNameInput,
        phone: riderPhoneInput,
        address: "Dadu Riders HQ",
        role: "rider",
        ordersCount: 0,
        vehicleNumber: riderVehicleInput,
      };

      await setDoc(doc(db, "users", createdUid), newRiderProfile);

      alert(`Success! Rider ${riderNameInput} registered under UID: ${createdUid}`);

      // Clear states
      setRiderNameInput("");
      setRiderPhoneInput("");
      setRiderVehicleInput("");
      setRiderEmailInput("");
      setRiderPasswordInput("");
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use" || String(err.message || err).includes("email-already-in-use")) {
        console.warn("Secured Rider Auth Creation warning (Email in Use):", err);
      } else {
        console.error("Secured Rider Auth Creation failure:", err);
      }
      
      const errMsg = err.message || String(err);
      if (err.code === "auth/email-already-in-use" || errMsg.includes("email-already-in-use")) {
        const emailAliasSuggested = riderEmailInput.includes("@") 
          ? riderEmailInput.replace("@", `+rider_${Date.now().toString().slice(-4)}@`) 
          : "rider.alias@dadu247.com";
        alert(
          `Registration Conflict (Email in Use):\n\nThe email account "${riderEmailInput}" is already registered in our systems.\n\nRECOMMENDED ACTIONS:\n1. If they are already a customer, try promoting them by typing their Phone Number so our smart backend upgrades them directly!\n2. Otherwise, use an email alias like "${emailAliasSuggested}" or a unique email address to register this new driver profile.`
        );
      } else {
        alert("Rider registration failed: " + errMsg);
      }
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

  const handleDeleteRider = async (uid: string, name: string) => {
    const isConfirmed = window.confirm(`Are you absolutely sure you want to PERMANENTLY delete and revoke Rider "${name}" access?`);
    if (!isConfirmed) return;

    try {
      await deleteDoc(doc(db, "users", uid));
      alert(`Success: Rider profile "${name}" has been permanently deleted.`);
    } catch (err) {
      console.error("Failed to delete rider profile:", err);
      alert("Error: Database permission denied or insufficient administrative credentials.");
    }
  };

  // --- BUSINESS LOGIC MATH FOR ANALYTICS ---
  // Calculates live numbers
  const deliveredOrders = orders.filter((o) => o.status === "delivered" || o.status === "completed");
  const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalCompletedCount = deliveredOrders.length;
  const totalCancelledCount = orders.filter((o) => o.status === "cancelled").length;
  const totalActiveCount = orders.filter((o) => o.status !== "delivered" && o.status !== "completed" && o.status !== "cancelled").length;

  // Render Category distributions
  const getCategoryChartData = () => {
    const categoryMap: { [key: string]: number } = {};
    deliveredOrders.forEach((order) => {
      order.items.forEach((item) => {
        const dish = dishes.find((d) => d.name === item.name);
        if (dish) {
          categoryMap[dish.category] = (categoryMap[dish.category] || 0) + item.quantity;
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
        ? new Date(order.createdAt.seconds * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" }) 
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

  // Save new Delivery Setting
  const handleSaveDeliveryConfig = async () => {
    try {
      await setDoc(doc(db, "settings", "delivery_config"), {
        deliveryFee: Number(deliveryChargeInput),
      });
      alert(`Delivery charges successfully saved as Rs. ${deliveryChargeInput}!`);
    } catch (err) {
      console.error(err);
      alert("Permission denied or Firestore configuration missing while saving settings.");
    }
  };

  // Create new dish/service (Admin click handles)
  const handleAddNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    // Set default illustrations based on category
    let finalImg = newItemImageUrl.trim();
    if (!finalImg) {
      if (newItemType === "service") {
        finalImg = "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=400";
      } else {
        finalImg = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=400";
      }
    }

    const uniqueId = `custom_${Date.now()}`;
    const dishModel: Dish = {
      id: uniqueId,
      name: newItemName,
      description: newItemDescription,
      price: Number(newItemPrice),
      category: newItemCategory,
      imageUrl: finalImg,
      isAvailable: true,
      type: newItemType,
      restaurantName: newItemRestaurantName.trim() || (newItemType === "service" ? "Dadu Home Services" : "Dadu Fast Food & Kitchen"),
      ...(newItemType === "service" && newItemServiceDuration ? { serviceDuration: newItemServiceDuration } : {}),
    };

    try {
      await setDoc(doc(db, "menu", uniqueId), dishModel);
      alert("New and fresh dish or service added successfully!");
      setNewItemName("");
      setNewItemDescription("");
      setNewItemImageUrl("");
      setNewItemServiceDuration("");
      setNewItemRestaurantName("");
    } catch (err) {
      console.error(err);
      alert("Check database permissions. Could not add menu item.");
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
  const handleSavePriceChange = async (dishId: string) => {
    if (editingPriceInput <= 0) return;
    try {
      await updateDoc(doc(db, "menu", dishId), {
        price: editingPriceInput,
      });
      setEditingPriceDishId(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Delete item from directory
  const handleDeleteItem = async (dishId: string) => {
    if (!confirm("Are you sure you want to delete this catalog item permanently?")) return;
    try {
      await deleteDoc(doc(db, "menu", dishId));
    } catch (err) {
      console.error(err);
    }
  };

  // Manual orders status controls
  const handleUpdateOrderStatus = async (orderId: string, nextStatus: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: nextStatus,
      });
      
      // Dispatch an automatic in-app notification to the customer profile!
      // This will sound a beautiful chime!
      const targetOrder = orders.find((o) => o.id === orderId);
      if (targetOrder) {
        let statusText = nextStatus;
        if (nextStatus === "confirmed") statusText = "Accepted & Scheduled";
        if (nextStatus === "preparing") statusText = "Being cooked hot";
        if (nextStatus === "out_for_delivery") statusText = "With dispatch rider";
        if (nextStatus === "delivered") statusText = "Successfully delivered! Enjoy!";
        if (nextStatus === "completed") statusText = "Technician Job Completed successfully!";
        
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
    const riderNameValue = riderNames[orderId]?.trim() || "";
    const etaValue = orderEtas[orderId]?.trim() || "";

    if (!riderNameValue && !etaValue) return;

    try {
      const updates: any = {};
      if (riderNameValue) updates.riderName = riderNameValue;
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
          })
        )
      );

      alert("Push notifications fired to all active users!");
      setAlertMessage("");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-[#050505] via-[#09090b] to-[#030303] text-zinc-100 overflow-y-auto font-sans flex flex-col antialiased">
      
      {/* Header Admin Strip */}
      <div className="bg-[#09090b]/90 backdrop-blur-md border-b border-zinc-800/60 p-5 sticky top-0 z-20 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-black px-3.5 py-1.5 text-[10.5px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-amber-500/10">
            Console Active
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
              Dadu24#7 System Hub
              <span className="text-amber-500 font-mono text-xs select-all bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/20">@{adminUsername}</span>
            </h2>
            <span className="text-[11px] text-zinc-400 font-medium font-sans">Enterprise Business Management Control & Live Logistics Telemetry</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 text-xs font-bold text-zinc-200 px-5 py-2.5 rounded-2xl transition-all hover:scale-[1.02] cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
        >
          Exit Console 🚪
        </button>
      </div>

      {/* Main Container Dashboard */}
      <div className="max-w-7xl mx-auto w-full px-4 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 pb-24">
        
        {/* Navigation Admin Side Rail */}
        <div className="col-span-1 lg:col-span-3 space-y-4">
          <div className="bg-[#0b0b0d]/90 border border-zinc-800/80 p-4.5 rounded-[24px] space-y-2.5 shadow-2xl relative overflow-hidden">
            {/* Ambient golden top line */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
            
            <span className="text-[9.5px] font-black text-zinc-500 block uppercase tracking-widest pl-1 mb-1">Navigation Terminals</span>
            
            <button
              onClick={() => setActiveSubTab("analytics")}
              className={`w-full font-black text-xs px-4 py-3.5 rounded-2xl transition-all duration-300 flex items-center gap-3.5 cursor-pointer border ${
                activeSubTab === "analytics" 
                  ? "bg-amber-500/5 border-amber-500/30 text-amber-500 font-extrabold shadow-[0_0_20px_rgba(245,158,11,0.04)]" 
                  : "bg-transparent border-transparent hover:bg-zinc-900/40 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              Realtime Analytics
            </button>

            <button
              onClick={() => setActiveSubTab("items")}
              className={`w-full font-black text-xs px-4 py-3.5 rounded-2xl transition-all duration-300 flex items-center gap-3.5 cursor-pointer border ${
                activeSubTab === "items" 
                  ? "bg-amber-500/5 border-amber-500/30 text-amber-500 font-extrabold shadow-[0_0_20px_rgba(245,158,11,0.04)]" 
                  : "bg-transparent border-transparent hover:bg-zinc-900/40 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <ListCollapse className="w-4 h-4 shrink-0" />
              Manage Items Directory
            </button>

            <button
              onClick={() => setActiveSubTab("orders")}
              className={`w-full font-black text-xs px-4 py-3.5 rounded-2xl transition-all duration-300 flex items-center gap-3.5 cursor-pointer border ${
                activeSubTab === "orders" 
                  ? "bg-amber-500/5 border-amber-500/30 text-amber-500 font-extrabold shadow-[0_0_20px_rgba(245,158,11,0.04)]" 
                  : "bg-transparent border-transparent hover:bg-zinc-900/40 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <ShoppingCart className="w-4 h-4 shrink-0" />
              Live Orders Manager
              {totalActiveCount > 0 && (
                <span className="ml-auto bg-[#FF5C00] text-zinc-950 font-black px-2.5 py-0.5 text-[9.5px] rounded-full shadow-[0_2px_10px_rgba(255,92,0,0.2)]">
                  {totalActiveCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubTab("riders")}
              className={`w-full font-black text-xs px-4 py-3.5 rounded-2xl transition-all duration-300 flex items-center gap-3.5 cursor-pointer border ${
                activeSubTab === "riders" 
                  ? "bg-amber-500/5 border-amber-500/30 text-amber-500 font-extrabold shadow-[0_0_20px_rgba(245,158,11,0.04)]" 
                  : "bg-transparent border-transparent hover:bg-zinc-900/40 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <User className="w-4 h-4 shrink-0" />
              Manage Riders Directory
            </button>
          </div>

          {/* Quick Stats overview panel */}
          <div className="bg-[#0b0b0d]/90 border border-zinc-800/80 p-5 rounded-[24px] space-y-4 shadow-2xl relative overflow-hidden text-xs">
            <span className="text-[9.5px] font-black text-zinc-500 block uppercase tracking-widest">Financial Coordinates</span>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-950/80 border border-zinc-900/80 p-3 rounded-2xl hover:border-amber-500/20 transition-all group">
                <span className="text-zinc-500 block text-[9.5px] font-bold uppercase tracking-wider">Gross Rev</span>
                <span className="text-[15px] font-black text-amber-500 mt-1 block">Rs. {totalRevenue}</span>
              </div>
              <div className="bg-zinc-950/80 border border-zinc-900/80 p-3 rounded-2xl hover:border-emerald-500/20 transition-all">
                <span className="text-zinc-500 block text-[9.5px] font-bold uppercase tracking-wider">Completed</span>
                <span className="text-[15px] font-black text-emerald-400 mt-1 block">{totalCompletedCount}</span>
              </div>
              <div className="bg-zinc-950/80 border border-zinc-900/80 p-3 rounded-2xl hover:border-orange-500/20 transition-all">
                <span className="text-zinc-500 block text-[9.5px] font-bold uppercase tracking-wider">Active</span>
                <span className="text-[15px] font-black text-[#FF5C00] mt-1 block">{totalActiveCount}</span>
              </div>
              <div className="bg-zinc-950/80 border border-zinc-900/80 p-3 rounded-2xl hover:border-red-500/20 transition-all">
                <span className="text-zinc-500 block text-[9.5px] font-bold uppercase tracking-wider">Declined</span>
                <span className="text-[15px] font-black text-red-500 mt-1 block">{totalCancelledCount}</span>
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
                <div className="bg-[#0b0b0d]/80 backdrop-blur-md border border-zinc-800/80 p-6 rounded-[24px] shadow-2xl relative">
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-500/10 to-transparent" />
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h4 className="font-black text-sm text-zinc-100 flex items-center gap-2 tracking-wide uppercase">
                        <TrendingUp className="w-4 h-4 text-amber-500" />
                        Delivered Order Revenue Pipeline
                      </h4>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Gross delivered totals mapped chronologically</span>
                    </div>
                  </div>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={getRevenueTimelineData()}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" opacity={0.3}/>
                        <XAxis dataKey="date" stroke="#666" fontSize={9} fontStyle="bold"/>
                        <YAxis stroke="#666" fontSize={9} fontStyle="bold"/>
                        <Tooltip contentStyle={{ backgroundColor: "#0b0b0d", border: "1px solid #333", borderRadius: "14px", fontSize: "11px", color: "#fff" }}/>
                        <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Categories demand distribution Recharts bar plot */}
                <div className="bg-[#0b0b0d]/80 backdrop-blur-md border border-zinc-800/80 p-6 rounded-[24px] shadow-2xl relative">
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-orange-500/10 to-transparent" />
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h4 className="font-black text-sm text-zinc-100 flex items-center gap-2 tracking-wide uppercase">
                        <Package className="w-4 h-4 text-[#FF5C00]" />
                        Category Quantity Demand Analytics
                      </h4>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Volume of products purchased from database</span>
                    </div>
                  </div>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getCategoryChartData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" opacity={0.3}/>
                        <XAxis dataKey="name" stroke="#666" fontSize={9} fontStyle="bold"/>
                        <YAxis stroke="#666" fontSize={9} fontStyle="bold"/>
                        <Tooltip contentStyle={{ backgroundColor: "#0b0b0d", border: "1px solid #333", borderRadius: "14px", fontSize: "11px", color: "#fff" }}/>
                        <Bar dataKey="sales" fill="#FF5C00" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Delivery Charge Setup Card & Broadcast Manager */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Delivery Fee Adjustment form */}
                <div className="bg-[#0b0b0d]/80 backdrop-blur-md border border-zinc-800/80 p-6 rounded-[24px] shadow-2xl space-y-5 relative">
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-500/10 to-transparent" />
                  <div>
                    <h4 className="font-black text-sm text-zinc-100 flex items-center gap-2 uppercase tracking-wide">
                      <Settings className="w-4 h-4 text-amber-500" />
                      Delivery Charges Controller
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-2.5 leading-relaxed font-medium">
                      Overwrite the default delivery charges for food deliveries instantly on user screens. (Services are automatically forced to Rs. 0).
                    </p>
                  </div>

                  <div className="space-y-4 pt-1">
                    <div className="flex gap-3">
                      <input
                        type="number"
                        value={deliveryChargeInput}
                        onChange={(e) => setDeliveryChargeInput(Number(e.target.value))}
                        placeholder="e.g. 100"
                        className="flex-1 p-3 bg-zinc-950 border border-zinc-800/80 rounded-2xl text-xs sm:text-sm outline-none text-white focus:border-amber-500/60 transition focus:ring-1 focus:ring-amber-500/10"
                      />
                      <button
                        onClick={handleSaveDeliveryConfig}
                        className="bg-amber-500 hover:bg-amber-600 transition-all text-black font-black px-5 py-3 rounded-2xl text-[11px] uppercase tracking-wider cursor-pointer shadow-lg shadow-amber-500/10 flex items-center gap-2 shrink-0 hover:scale-[1.02] active:scale-95"
                      >
                        <Save className="w-4 h-4" />
                        Save Rate
                      </button>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block leading-relaxed">
                      💡 Stored coordinates: settings/delivery_config with Firestore.
                    </span>
                  </div>
                </div>

                {/* Chime trigger in-app broadcaster */}
                <div className="bg-[#0b0b0d]/80 backdrop-blur-md border border-zinc-800/80 p-6 rounded-[24px] shadow-2xl space-y-5 relative">
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent" />
                  <div>
                    <h4 className="font-black text-sm text-zinc-100 flex items-center gap-2 uppercase tracking-wide">
                      <Smartphone className="w-4 h-4 text-emerald-400 animate-pulse" />
                      In-App Broadcast Dispatcher
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-2.5 leading-relaxed font-medium">
                      Broadcasting triggers a text alert banner accompanied by a musical sound on customer screens!
                    </p>
                  </div>

                  <div className="space-y-3 pt-1 text-xs">
                    <input
                      type="text"
                      placeholder="Notification Title"
                      value={alertTitle}
                      onChange={(e) => setAlertTitle(e.target.value)}
                      className="w-full p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl outline-none text-white focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/10 transition"
                    />
                    <textarea
                      rows={2}
                      placeholder="Notification Message body text..."
                      value={alertMessage}
                      onChange={(e) => setAlertMessage(e.target.value)}
                      className="w-full p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl outline-none text-white focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/10 transition resize-none"
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

          {/* TAB 2: Manage Items Directory */}
          {activeSubTab === "items" && (
            <div className="space-y-8 animate-fade-in">
              
              {/* Add New Dish / Home Service Product Form */}
              <form onSubmit={handleAddNewItem} className="bg-[#0b0b0d]/80 backdrop-blur-md border border-zinc-800/80 p-6 rounded-[24px] shadow-2xl space-y-5 relative">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-500/10 to-transparent" />
                <h4 className="font-black text-sm text-zinc-100 flex items-center gap-2 pb-3 border-b border-zinc-800/50 uppercase tracking-wide">
                  <Plus className="w-4 h-4 text-amber-500" />
                  Register New Dish / Home Service Product
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 text-xs">
                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Title Name</label>
                    <input
                      type="text"
                      required
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="e.g. Premium Beef Cheese Burger"
                      className="w-full p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl text-white outline-none focus:border-amber-500 transition focus:ring-1 focus:ring-amber-500/10 animate-pulse-subtle"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Catalog Category</label>
                    <select
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value as Dish["category"])}
                      className="w-full p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl text-white outline-none focus:border-amber-500 cursor-pointer transition focus:ring-1 focus:ring-amber-500/10"
                    >
                      <option value="Burgers">Burgers 🍔</option>
                      <option value="Pizzas">Pizzas 🍕</option>
                      <option value="Chicken & Rice">Chicken & Rice 🍗</option>
                      <option value="Only Tea">Only Tea ☕</option>
                      <option value="Specials">Specials (Offers) ⭐️</option>
                      <option value="Home Services">Home Services 🛠️</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Base Price (Rs.)</label>
                    <input
                      type="number"
                      required
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(Number(e.target.value))}
                      placeholder="e.g. 500"
                      className="w-full p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl text-white outline-none focus:border-amber-500 transition focus:ring-1 focus:ring-amber-500/10"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Service / Product Type</label>
                    <div className="grid grid-cols-2 gap-1 bg-zinc-950 border border-zinc-800/80 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => setNewItemType("food")}
                        className={`py-1.5 rounded-lg font-black text-[9px] uppercase cursor-pointer transition-all ${
                          newItemType === "food" ? "bg-amber-500 text-black font-extrabold shadow-sm" : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        Food 🍔
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewItemType("service")}
                        className={`py-1.5 rounded-lg font-black text-[9px] uppercase cursor-pointer transition-all ${
                          newItemType === "service" ? "bg-amber-500 text-black font-extrabold shadow-sm" : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        Service 🛠️
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Description Information</label>
                    <input
                      type="text"
                      value={newItemDescription}
                      onChange={(e) => setNewItemDescription(e.target.value)}
                      placeholder="Brief descriptive labels shown to customers"
                      className="w-full p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl text-white outline-none focus:border-amber-500 transition focus:ring-1 focus:ring-amber-500/10"
                    />
                  </div>

                  <div className="md:col-span-4 space-y-1.5 font-mono">
                    <label className="text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Image URL (Optional)</label>
                    <input
                      type="text"
                      value={newItemImageUrl}
                      onChange={(e) => setNewItemImageUrl(e.target.value)}
                      placeholder="Blank for auto high quality Unsplash"
                      className="w-full p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl text-white outline-none focus:border-amber-500 transition focus:ring-1 focus:ring-amber-500/10"
                    />
                  </div>

                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-amber-500 font-bold uppercase tracking-widest text-[9px]">Restaurant / Partner Shop Name</label>
                    <input
                      type="text"
                      value={newItemRestaurantName}
                      onChange={(e) => setNewItemRestaurantName(e.target.value)}
                      placeholder="e.g. KFC, Savour Foods, Dadu Tea House"
                      className="w-full p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl text-white outline-none focus:border-amber-500 transition focus:ring-1 focus:ring-amber-500/10"
                    />
                  </div>

                  {newItemType === "service" && (
                    <div className="md:col-span-12 space-y-1.5">
                      <label className="text-amber-500 font-bold uppercase tracking-widest text-[9px]">Service Duration / Timing</label>
                      <input
                        type="text"
                        value={newItemServiceDuration}
                        onChange={(e) => setNewItemServiceDuration(e.target.value)}
                        placeholder="e.g. Expected arrival within 1 hour"
                        className="w-full p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl text-white outline-none focus:border-amber-500 transition focus:ring-1 focus:ring-amber-500/10"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-600 transition-all font-black text-xs tracking-widest text-black uppercase py-3.5 px-6 rounded-2xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/10 hover:scale-[1.02] active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    Dispatch Item to Database
                  </button>
                </div>
              </form>

              {/* Items Table List */}
              <div className="bg-[#0b0b0d]/80 backdrop-blur-md border border-zinc-800/80 rounded-[24px] overflow-hidden shadow-2xl relative">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-500/10 to-transparent" />
                <div className="p-5 border-b border-zinc-800/50 bg-zinc-900/15">
                  <h4 className="font-black text-sm text-zinc-100 uppercase tracking-wide">Operational Catalog Directory</h4>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Enable availability controls and edit prices instantly</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-zinc-455 font-medium">
                    <thead className="bg-zinc-950/70 text-zinc-500 uppercase font-black tracking-widest text-[9px] border-b border-zinc-850/40">
                      <tr>
                        <th className="p-4.5">Item Name</th>
                        <th className="p-4.5">Category</th>
                        <th className="p-4.5">Type</th>
                        <th className="p-4.5">Price (Rs.)</th>
                        <th className="p-4.5 text-center">ON/OFF Toggle</th>
                        <th className="p-4.5 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/40">
                      {dishes.map((dish) => (
                        <tr key={dish.id} className="hover:bg-zinc-900/20 transition-colors">
                          <td className="p-4 font-bold text-gray-200">
                            <div className="flex items-center gap-3">
                              <img src={dish.imageUrl} alt={dish.name} className="w-8 h-8 rounded-lg object-cover bg-zinc-950 shrink-0"/>
                              <div className="truncate max-w-xs">
                                <div>{dish.name}</div>
                                <div className="text-[10px] text-zinc-500 font-medium font-sans mt-0.5">
                                  🏪 Shop: <span className="text-amber-500 font-bold">{dish.restaurantName || (dish.type === "service" ? "Dadu Home Services" : "Dadu Fast Food & Kitchen")}</span>
                                </div>
                                {dish.type === "service" && dish.serviceDuration && (
                                  <div className="text-[10px] text-zinc-500 font-medium font-sans mt-0.5">
                                    ⏱️ Duration: <span className="text-amber-500 font-bold">{dish.serviceDuration}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">{dish.category}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] uppercase ${
                              dish.type === "service" ? "bg-amber-950 border border-amber-900 text-amber-500" : "bg-zinc-900 border border-zinc-800 text-zinc-300"
                            }`}>
                              {dish.type}
                            </span>
                          </td>
                          <td className="p-4">
                            {editingPriceDishId === dish.id ? (
                              <div className="flex items-center gap-1 max-w-[120px]">
                                <input
                                  type="number"
                                  value={editingPriceInput}
                                  onChange={(e) => setEditingPriceInput(Number(e.target.value))}
                                  className="w-16 p-1 bg-[#1a1a1a] border border-amber-500 text-white rounded text-xs leading-none"
                                />
                                <button
                                  onClick={() => handleSavePriceChange(dish.id)}
                                  className="p-1 bg-amber-500 text-black rounded text-[10px] font-black cursor-pointer shadow-xs"
                                >
                                  Save
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-white">Rs. {dish.price}</span>
                                <button
                                  onClick={() => {
                                    setEditingPriceDishId(dish.id);
                                    setEditingPriceInput(dish.price);
                                  }}
                                  className="text-[10px] text-amber-500 hover:underline cursor-pointer"
                                >
                                  Edit
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
                                  <span className="text-[10px] uppercase font-bold tracking-wide">Available</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-zinc-650">
                                  <ToggleLeft className="w-7 h-7 stroke-[1.5]" />
                                  <span className="text-[10px] uppercase font-bold tracking-wide text-zinc-500">Sold Out</span>
                                </div>
                              )}
                            </button>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleDeleteItem(dish.id)}
                              className="p-2 text-zinc-650 hover:text-red-500 hover:bg-red-950/20 rounded-xl transition cursor-pointer"
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

              <div className="bg-[#0b0b0d]/80 backdrop-blur-md border border-zinc-800/80 rounded-[24px] overflow-hidden shadow-2xl relative">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-500/10 to-transparent" />
                <div className="p-6 border-b border-zinc-800/50 bg-zinc-900/15">
                  <h4 className="font-black text-sm text-zinc-100 uppercase tracking-wide">Live Operational Orders Pipeline</h4>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Monitor order transactions and assign dispatchers in real-time</span>
                </div>

                <div className="divide-y divide-zinc-900/30">
                  {orders.length === 0 ? (
                    <div className="p-16 text-center text-xs text-zinc-500 font-bold uppercase tracking-wider">
                      Logs directory is blank. Waiting for live user transactions...
                    </div>
                  ) : (
                    orders.map((order) => {
                      const isSvc = order.orderType === "service";
                      const isActive = order.status !== "delivered" && order.status !== "completed" && order.status !== "cancelled";

                      return (
                        <div key={order.id} className="p-6 hover:bg-zinc-900/10 transition-all space-y-5">
                          
                          {/* Top metadata strip */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-zinc-950 p-4 rounded-2xl border border-zinc-900">
                            <div>
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono text-xs font-black text-white uppercase bg-zinc-900 border border-zinc-800 py-1.5 px-3 rounded-lg shadow-inner">
                                  dadu-{order.id.substring(0, 8)}
                                </span>
                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                  isSvc ? "bg-amber-950/80 border border-amber-900/40 text-amber-500" : "bg-orange-950/80 border border-orange-900/40 text-[#FF5C00]"
                                }`}>
                                  {order.orderType}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-3 items-center mt-3 text-xs text-zinc-400">
                                <span className="font-extrabold text-zinc-200">{order.userName}</span>
                                <span className="text-zinc-700">|</span>
                                <span className="font-medium text-zinc-300">Phone: <span className="font-bold text-white">{order.userPhone}</span></span>
                                <span className="text-zinc-700">|</span>
                                <span className="font-medium text-zinc-300">Total: <span className="font-black text-amber-500">Rs. {order.grandTotal}</span></span>
                              </div>
                            </div>

                            {/* Status label banner */}
                            <div className="text-left sm:text-right">
                              <span className="text-[10px] uppercase tracking-widest font-black text-zinc-500 block">Current Status</span>
                              <span className={`text-xs font-black uppercase mt-1.5 inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-zinc-900/60 ${
                                order.status === "delivered" || order.status === "completed" 
                                  ? "text-emerald-400 border border-emerald-950/65" 
                                  : order.status === "cancelled" 
                                    ? "text-red-500 border border-red-950/65"
                                    : "text-amber-500 border border-amber-950/65"
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full animate-ping ${
                                  order.status === "delivered" || order.status === "completed" 
                                    ? "bg-emerald-400" 
                                    : order.status === "cancelled" 
                                      ? "bg-red-500"
                                      : "bg-amber-500"
                                }`} />
                                {order.status}
                              </span>
                            </div>
                          </div>

                          {/* Items descriptions and customer address */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-medium">
                            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-900 space-y-3">
                              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Cart Summary</span>
                              <div className="divide-y divide-zinc-900/60">
                                {order.items.map((item, id) => (
                                  <div key={id} className="py-2 flex justify-between">
                                    <span className="text-gray-300 font-medium">
                                      {item.name}{" "}
                                      <span className="text-xs text-[#FF5C00] font-black font-sans">
                                        ({item.restaurantName || (item.type === "service" ? "Dadu Home Services" : "Dadu Fast Food")})
                                      </span>{" "}
                                      <span className="text-zinc-500 font-bold">x{item.quantity}</span>
                                    </span>
                                    <span className="font-extrabold text-zinc-400">Rs. {item.price * item.quantity}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="text-[10px] text-zinc-500 pt-2 border-t border-zinc-900/60 leading-normal font-bold uppercase tracking-wider">
                                {isSvc ? (
                                  <span className="text-amber-500/80">🛠️ Service inspection visit - PAY ON VISIT</span>
                                ) : (
                                  <span className="text-orange-500/80">🍔 Fast food parcel dispatch - CASH ON DELIVERY</span>
                                )}
                              </div>
                            </div>

                            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-900 space-y-3">
                              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Destination address Coordinates</span>
                              <p className="text-gray-300 leading-relaxed bg-zinc-900/20 p-3 rounded-xl border border-zinc-900 truncate">
                                📍 {order.userAddress}
                              </p>

                              {/* Logistics parameters inputs (Save Rider / saved ETA) */}
                              {isActive && (
                                <div className="pt-2.5 border-t border-zinc-900/60 flex gap-3">
                                  <div className="flex-1 space-y-1">
                                    <span className="text-[8.5px] font-black text-zinc-500 tracking-widest block uppercase">
                                      {isSvc ? "Technician Name" : "Delivery Rider"}
                                    </span>
                                    <input
                                      type="text"
                                      placeholder={isSvc ? "e.g. Asif (Tech)" : "e.g. Ali (Rider)"}
                                      value={riderNames[order.id] || order.riderName || ""}
                                      onChange={(e) => setRiderNames({ ...riderNames, [order.id]: e.target.value })}
                                      className="w-full text-xs p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white font-medium outline-none focus:border-amber-500"
                                    />
                                  </div>

                                  <div className="flex-1 space-y-1">
                                    <span className="text-[8.5px] font-black text-zinc-500 tracking-widest block uppercase">
                                      {isSvc ? "Arrival ETA" : "Duration ETA"}
                                    </span>
                                    <input
                                      type="text"
                                      placeholder={isSvc ? "1 Hour" : "25 mins"}
                                      value={orderEtas[order.id] || order.eta || ""}
                                      onChange={(e) => setOrderEtas({ ...orderEtas, [order.id]: e.target.value })}
                                      className="w-full text-xs p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white font-medium outline-none focus:border-amber-500"
                                    />
                                  </div>

                                  <button
                                    onClick={() => handleSaveRiderAndEta(order.id)}
                                    className="bg-amber-500 hover:bg-amber-600 text-black font-black p-2 px-3 rounded-lg self-end text-[10px] uppercase tracking-wider cursor-pointer h-9 shadow-md transition-all flex items-center justify-center shrink-0 hover:scale-[1.02] active:scale-95"
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
                              <span className="text-[9.5px] font-black uppercase text-amber-500/90 tracking-widest mr-1">Configure Next State:</span>
                              
                              {/* FOOD SPECIFIC DISPATCH BUTTONS */}
                              {!isSvc && (
                                <>
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.id, "confirmed")}
                                    className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-gray-300 px-3.5 py-2 rounded-xl transition cursor-pointer text-[10px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95"
                                  >
                                    🤝 Confirmed
                                  </button>
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.id, "preparing")}
                                    className="bg-purple-950/20 border border-purple-900/40 text-purple-400 px-3.5 py-2 rounded-xl hover:bg-purple-950/50 transition cursor-pointer text-[10px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95"
                                  >
                                    👩‍🍳 Cooking
                                  </button>
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.id, "out_for_delivery")}
                                    className="bg-teal-950/20 border border-teal-900/40 text-teal-400 px-3.5 py-2 rounded-xl hover:bg-teal-950/50 transition cursor-pointer text-[10px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95"
                                  >
                                    🛵 Dispatched
                                  </button>
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.id, "delivered")}
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
                                    onClick={() => handleUpdateOrderStatus(order.id, "confirmed")}
                                    className="bg-zinc-900 border border-zinc-800 hover:border-zinc-750 text-gray-300 px-3.5 py-2 rounded-xl transition cursor-pointer text-[10px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95"
                                  >
                                    🤝 Confirm Booking
                                  </button>
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.id, "diagnostic_on_way")}
                                    className="bg-sky-950/20 border border-sky-900/40 text-sky-400 px-3.5 py-2 rounded-xl hover:bg-sky-950/50 transition cursor-pointer text-[10px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95"
                                  >
                                    🛵 Mechanic Out
                                  </button>
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.id, "diagnostic_underway")}
                                    className="bg-yellow-950/20 border border-yellow-900/40 text-yellow-500 px-3.5 py-2 rounded-xl hover:bg-yellow-950/50 transition cursor-pointer text-[10px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95"
                                  >
                                    🛠️ Underway
                                  </button>
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.id, "completed")}
                                    className="bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 px-4 py-2 rounded-xl hover:bg-emerald-950/60 transition cursor-pointer text-[10.5px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95 shadow-md shadow-emerald-500/5"
                                  >
                                    ✅ Job Completed
                                  </button>
                                </>
                              )}

                              {/* CANCEL COMMON ACTIONS */}
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, "cancelled")}
                                className="ml-auto bg-red-950/20 border border-red-900/30 text-red-500 px-3.5 py-2 rounded-xl hover:bg-red-950/40 transition cursor-pointer text-[10px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95"
                              >
                                Cancel Order
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
            <div className="space-y-8 animate-fade-in text-zinc-100 col-span-1 lg:col-span-9">
              
              {/* Top Row: General Settings & Status Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Global Delivery Charge Config */}
                <div className="bg-[#0b0b0d]/80 backdrop-blur-md border border-zinc-800/80 p-6 rounded-[24px] shadow-2xl relative space-y-4">
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-500/10 to-transparent" />
                  <h4 className="font-black text-sm text-zinc-100 flex items-center gap-2 pb-2.5 border-b border-zinc-805/50 uppercase tracking-wide">
                    <Truck className="w-4 h-4 text-[#FF5C00]" />
                    Set Global Delivery Charges
                  </h4>
                  <p className="text-[10.5px] text-zinc-400 font-medium leading-relaxed">
                    This setting governs the base delivery rate added to checkout carts across Dadu24#7 dynamically.
                  </p>
                  
                  <div className="flex items-center gap-3 text-xs pt-1">
                    <div className="relative flex-grow">
                      <span className="absolute left-3.5 top-3.5 text-zinc-500 font-bold">Rs.</span>
                      <input
                        type="number"
                        min="0"
                        value={deliveryChargeInput}
                        onChange={(e) => setDeliveryChargeInput(Number(e.target.value))}
                        className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl outline-none text-white font-extrabold focus:border-amber-500 transition"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveDeliveryConfig}
                      className="bg-[#FF5C00] text-zinc-950 font-black px-5 py-3 rounded-xl hover:scale-[1.02] active:scale-95 transition cursor-pointer text-xs uppercase"
                    >
                      Update Rate
                    </button>
                  </div>
                </div>

                {/* Live assigned deliveries summary stats */}
                <div className="bg-[#0b0b0d]/80 backdrop-blur-md border border-zinc-800/80 p-6 rounded-[24px] shadow-2xl relative space-y-4">
                  <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-green-500/10 to-transparent" />
                  <h4 className="font-black text-sm text-zinc-100 flex items-center gap-2 pb-2.5 border-b border-zinc-805/50 uppercase tracking-wide">
                    <TrendingUp className="w-4 h-4 text-emerald-450" />
                    Delivery Fleet Statistics
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                    <div className="bg-zinc-950/40 border border-zinc-850 p-3.5 rounded-xl text-center">
                      <span className="text-[9px] text-[#FF5C00] uppercase tracking-widest font-black block">active shipments</span>
                      <span className="text-xl font-black text-white block mt-1">
                        {orders.filter((o) => o.riderId && o.status !== "delivered" && o.status !== "cancelled").length}
                      </span>
                    </div>
                    <div className="bg-zinc-950/40 border border-zinc-850 p-3.5 rounded-xl text-center">
                      <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-black block">rider registry</span>
                      <span className="text-xl font-black text-white block mt-1">{ridersSubset.length} Riders</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Secure Registration form */}
              <form onSubmit={handleRegisterRiderSubmit} className="bg-[#0b0b0d]/80 backdrop-blur-md border border-zinc-800/80 p-6 rounded-[24px] shadow-2xl space-y-5 relative">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FF5C00]/20 to-transparent" />
                <h4 className="font-black text-sm text-zinc-100 flex items-center gap-2 pb-3 border-b border-zinc-800/50 uppercase tracking-wide">
                  <UserPlus className="w-4 h-4 text-[#FF5C00]" />
                  Rider Registry Form (Manual Credentials Creation)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 text-xs">
                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Full Name</label>
                    <input
                      type="text"
                      required
                      value={riderNameInput}
                      onChange={(e) => setRiderNameInput(e.target.value)}
                      placeholder="e.g. Ali Haider Meer"
                      className="w-full p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl text-white outline-none focus:border-amber-500 transition"
                    />
                  </div>

                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={riderPhoneInput}
                      onChange={(e) => setRiderPhoneInput(e.target.value)}
                      placeholder="e.g. 03277004471"
                      className="w-full p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl text-white outline-none focus:border-amber-500 transition"
                    />
                  </div>

                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Vehicle License Number</label>
                    <input
                      type="text"
                      required
                      value={riderVehicleInput}
                      onChange={(e) => setRiderVehicleInput(e.target.value)}
                      placeholder="e.g. DADU-7729"
                      className="w-full p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl text-white outline-none focus:border-amber-500 transition"
                    />
                  </div>

                  <div className="md:col-span-6 space-y-1.5">
                    <label className="text-zinc-400 font-black uppercase tracking-widest text-[9px] flex items-center gap-1">
                      <Send className="w-3 h-3 text-[#FF5C00]" /> Corporate Email Account
                    </label>
                    <input
                      type="email"
                      required
                      value={riderEmailInput}
                      onChange={(e) => setRiderEmailInput(e.target.value)}
                      placeholder="e.g. ali.rider@dadu247.com"
                      className="w-full p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl text-white outline-none focus:border-amber-500 transition"
                    />
                  </div>

                  <div className="md:col-span-6 space-y-1.5">
                    <label className="text-zinc-400 font-black uppercase tracking-widest text-[9px] flex items-center gap-1">
                      <Key className="w-3 h-3 text-[#FF5C00]" /> Access Password
                    </label>
                    <input
                      type="password"
                      required
                      value={riderPasswordInput}
                      onChange={(e) => setRiderPasswordInput(e.target.value)}
                      placeholder="• • • • • • (Min 6 tokens)"
                      className="w-full p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl text-white outline-none focus:border-amber-500 transition"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={riderRegLoading}
                    className="bg-[#FF5C00] hover:bg-orange-600 text-zinc-950 font-black text-xs uppercase tracking-wider py-3.5 px-6 rounded-xl shadow-lg shadow-orange-500/10 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-55"
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
              <div className="bg-[#0b0b0d]/80 backdrop-blur-md border border-zinc-800/80 p-6 rounded-[24px] shadow-2xl relative space-y-5">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FF5C00]/20 to-transparent" />
                <h4 className="font-black text-sm text-zinc-100 flex items-center gap-2 pb-3 border-b border-zinc-800/50 uppercase tracking-wide">
                  <Compass className="w-4 h-4 text-[#FF5C00] animate-spin-slow" />
                  Fleet Live Assignments Tracker
                </h4>

                <div className="space-y-4 max-h-[350px] overflow-y-auto scrollbar-none">
                  {orders.filter((o) => o.riderId).length === 0 ? (
                    <div className="text-center p-8 text-zinc-500 text-xs font-semibold">
                      📦 No accepted shipments currently on active duty route.
                    </div>
                  ) : (
                    orders.filter((o) => o.riderId).map((order) => (
                      <div key={order.id} className="bg-zinc-950 border border-zinc-850 p-4.5 rounded-2xl flex items-center justify-between gap-4 flex-wrap text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-[#FF5C00]">dadu-{order.id.substring(0, 8)}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                              order.status === "delivered" 
                                ? "bg-emerald-500/10 text-emerald-400" 
                                : "bg-amber-500/10 text-amber-500 animate-pulse"
                            }`}>
                              {order.status}
                            </span>
                          </div>
                          <p className="text-zinc-400 text-[11px] font-semibold mt-1">Customer: {order.userName} ({order.userAddress})</p>
                        </div>

                        <div className="bg-zinc-900 border border-zinc-850 p-3 rounded-xl min-w-[200px] text-right text-xs">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black block">assigned driver</span>
                          <span className="text-zinc-100 font-extrabold block text-xs mt-0.5">{order.riderName}</span>
                          <span className="text-emerald-450 block font-mono text-[10px]">{order.riderPhone}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Master directory list */}
              <div className="bg-[#0b0b0d]/80 backdrop-blur-md border border-zinc-800/80 p-6 rounded-[24px] shadow-2xl relative space-y-4">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-zinc-500/20 to-transparent" />
                <h4 className="font-black text-sm text-zinc-100 flex items-center gap-2 pb-3 border-b border-zinc-800/50 uppercase tracking-wide">
                  <User className="w-4 h-4 text-zinc-450" />
                  Riders Directory Registry ({ridersSubset.length} Profiles)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ridersSubset.length === 0 ? (
                    <div className="text-center p-8 col-span-2 text-zinc-500 text-xs font-semibold">
                      📋 No active riders provisioned.
                    </div>
                  ) : (
                    ridersSubset.map((rider) => (
                      <div key={rider.uid} className="bg-zinc-950 border border-zinc-850 p-4.5 rounded-2xl space-y-3 shadow-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10.5px] font-black tracking-wider text-white block">{rider.name}</span>
                            <span className="text-[9px] text-[#FF5C00] font-bold block bg-[#FF5C00]/5 border border-[#FF5C00]/20 px-2.5 py-0.5 rounded-full w-max mt-1 uppercase">
                              License: {rider.vehicleNumber || "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[9px] text-zinc-550">{rider.uid.substring(0, 8)}</span>
                            <button
                              onClick={() => handleDeleteRider(rider.uid, rider.name)}
                              className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition cursor-pointer shrink-0"
                              title="Delete Rider Permanent"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="border-t border-zinc-900 pt-2 text-[11px] font-semibold text-zinc-400 font-sans space-y-1">
                          <div>📞 Contact Phone: <span className="font-mono text-zinc-200">{rider.phone}</span></div>
                          <div className="flex items-center justify-between gap-2">
                            <span>📍 Logged-in HQ Status:</span>
                            <span className="text-emerald-440 font-bold uppercase text-[9px]">ONLINE DUTY</span>
                          </div>
                          {rider.riderCoords ? (
                            <div className="bg-emerald-950/10 border border-emerald-950 p-2.5 rounded-xl mt-1.5 space-y-1.5 text-zinc-300">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-emerald-400 font-black flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                  LIVE GPS SIGNAL
                                </span>
                                <span className="text-[9px] text-zinc-500">
                                  {rider.riderCoords.lastUpdated ? `${Math.round((Date.now() - rider.riderCoords.lastUpdated) / 1000)}s ago` : "Active"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-mono text-[9.5px] text-zinc-400">
                                  {rider.riderCoords.latitude.toFixed(5)}, {rider.riderCoords.longitude.toFixed(5)}
                                </span>
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${rider.riderCoords.latitude},${rider.riderCoords.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-emerald-500 text-zinc-950 font-black text-[9px] px-2.5 py-1 rounded-lg hover:bg-emerald-400 transition uppercase tracking-widest leading-none block shrink-0"
                                >
                                  Open Map 🗺️
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="text-zinc-500 text-[10px] italic mt-2 bg-zinc-900/30 p-2 rounded-xl border border-zinc-900 text-center">
                              📡 Awaiting active GPS tracking signal...
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
