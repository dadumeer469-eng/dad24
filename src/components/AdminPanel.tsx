import React, { useState } from "react";
import { Dish, Order, SystemSettings, AppNotification } from "../types";
import { doc, setDoc, deleteDoc, collection, addDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from "recharts";
import { 
  Plus, Settings, LayoutDashboard, ShoppingCart, ListCollapse, ToggleLeft, ToggleRight, Trash2, 
  HelpCircle, RefreshCw, Smartphone, TrendingUp, DollarSign, Package, CheckCheck, Save, Send, EyeOff, Wrench
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
  const [activeSubTab, setActiveSubTab] = useState<"analytics" | "items" | "orders">("analytics");
  
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
    <div className="fixed inset-0 z-50 bg-[#0A0A0A] text-gray-200 overflow-y-auto font-sans flex flex-col">
      
      {/* Header Admin Strip */}
      <div className="bg-[#121212] border-b border-zinc-900 p-4 sticky top-0 z-20 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 text-black px-3 py-1 text-xs font-black rounded-lg">
            SYS ADMIN
          </div>
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
              Dadu24#7 Admin Suite Console
              <span className="text-amber-500 text-xs">@{adminUsername}</span>
            </h2>
            <span className="text-[11px] text-zinc-500">Business Control Center & Live Logistics Monitor</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-gray-300 px-4 py-2 rounded-xl transition cursor-pointer"
        >
          Exit Console 🚪
        </button>
      </div>

      {/* Main Container Dashboard */}
      <div className="max-w-7xl mx-auto w-full px-4 py-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
        
        {/* Navigation Admin Side Rail */}
        <div className="col-span-1 lg:col-span-3 space-y-3">
          <div className="bg-[#121212] border border-zinc-920 p-4 rounded-3xl space-y-2 shadow-lg">
            <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider">Console sections</span>
            
            <button
              onClick={() => setActiveSubTab("analytics")}
              className={`w-full font-bold text-xs px-4 py-3 rounded-2xl transition flex items-center gap-3 cursor-pointer ${
                activeSubTab === "analytics" 
                  ? "bg-amber-500/10 border border-amber-500/20 text-amber-500 shadow-xs" 
                  : "hover:bg-zinc-900 text-zinc-400"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Realtime Analytics
            </button>

            <button
              onClick={() => setActiveSubTab("items")}
              className={`w-full font-bold text-xs px-4 py-3 rounded-2xl transition flex items-center gap-3 cursor-pointer ${
                activeSubTab === "items" 
                  ? "bg-amber-500/10 border border-amber-500/20 text-amber-500 shadow-xs" 
                  : "hover:bg-zinc-900 text-zinc-400"
              }`}
            >
              <ListCollapse className="w-4 h-4" />
              Manage Items Directory
            </button>

            <button
              onClick={() => setActiveSubTab("orders")}
              className={`w-full font-bold text-xs px-4 py-3 rounded-2xl transition flex items-center gap-3 cursor-pointer ${
                activeSubTab === "orders" 
                  ? "bg-amber-500/10 border border-amber-500/20 text-amber-500 shadow-xs" 
                  : "hover:bg-zinc-900 text-zinc-400"
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              Live Orders Manager
              {totalActiveCount > 0 && (
                <span className="ml-auto bg-amber-500 text-neutral-950 font-black px-2 py-0.5 text-[10px] rounded-full">
                  {totalActiveCount}
                </span>
              )}
            </button>
          </div>

          {/* Quick Stats overview panel */}
          <div className="bg-[#121212] border border-zinc-920 p-5 rounded-3xl space-y-4 shadow-lg text-xs">
            <h3 className="font-extrabold text-[10px] uppercase text-zinc-500 tracking-wider">Financial Coordinates</h3>
            <div className="grid grid-cols-2 gap-3.5">
              <div className="bg-[#1c1c1c] border border-zinc-900 p-3 rounded-2xl">
                <span className="text-zinc-500 block">Gross Revenue</span>
                <span className="text-base font-black text-amber-500 mt-1 block">Rs. {totalRevenue}</span>
              </div>
              <div className="bg-[#1c1c1c] border border-zinc-900 p-3 rounded-2xl">
                <span className="text-zinc-500 block">Delivered</span>
                <span className="text-base font-black text-emerald-400 mt-1 block">{totalCompletedCount}</span>
              </div>
              <div className="bg-[#1c1c1c] border border-zinc-900 p-3 rounded-2xl">
                <span className="text-zinc-500 block">Active Triggers</span>
                <span className="text-base font-black text-[#FF5C00] mt-1 block">{totalActiveCount}</span>
              </div>
              <div className="bg-[#1c1c1c] border border-zinc-900 p-3 rounded-2xl">
                <span className="text-zinc-500 block">Cancelled</span>
                <span className="text-base font-black text-red-500 mt-1 block">{totalCancelledCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Panels Area */}
        <div className="col-span-1 lg:col-span-9 space-y-6">

          {/* TAB 1: Real-time Analytics Dashboard */}
          {activeSubTab === "analytics" && (
            <div className="space-y-6">
              
              {/* Graphical Recharts Visual Analytics blocks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Gross revenue timeline Recharts Area scale */}
                <div className="bg-[#121212] border border-zinc-920 p-5 rounded-3xl shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-extrabold text-sm text-zinc-100 flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 text-amber-500" />
                        Delivered Order Revenue Pipeline
                      </h4>
                      <span className="text-[10px] text-zinc-500">Delivered order totals mapped chronologically</span>
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
                        <CartesianGrid strokeDasharray="3 3" stroke="#222"/>
                        <XAxis dataKey="date" stroke="#666" fontSize={10}/>
                        <YAxis stroke="#666" fontSize={10}/>
                        <Tooltip contentStyle={{ backgroundColor: "#1c1c1c", border: "1px solid #333", borderRadius: "10px", fontSize: "11px" }}/>
                        <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Categories demand distribution Recharts bar plot */}
                <div className="bg-[#121212] border border-zinc-920 p-5 rounded-3xl shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-extrabold text-sm text-zinc-100 flex items-center gap-1">
                        <Package className="w-4 h-4 text-[#FF5C00]" />
                        Category Quantity Demand Analytics
                      </h4>
                      <span className="text-[10px] text-zinc-500">Volume of products purchased from database</span>
                    </div>
                  </div>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getCategoryChartData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222"/>
                        <XAxis dataKey="name" stroke="#666" fontSize={10}/>
                        <YAxis stroke="#666" fontSize={10}/>
                        <Tooltip contentStyle={{ backgroundColor: "#1c1c1c", border: "1px solid #333", borderRadius: "10px", fontSize: "11px" }}/>
                        <Bar dataKey="sales" fill="#FF5C00" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Delivery Charge Setup Card & Broadcast Manager */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Delivery Fee Adjustment form */}
                <div className="bg-[#121212] border border-zinc-920 p-5 rounded-3xl shadow-lg space-y-4">
                  <div>
                    <h4 className="font-extrabold text-sm text-zinc-100 flex items-center gap-1.5">
                      <Settings className="w-4 h-4 text-amber-500" />
                      Dynamic Delivery Charges Controller
                    </h4>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Overwrite the default delivery charges for food deliveries instantly on user screens. (Services are automatically forced to Rs. 0).
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex gap-2.5">
                      <input
                        type="number"
                        value={deliveryChargeInput}
                        onChange={(e) => setDeliveryChargeInput(Number(e.target.value))}
                        placeholder="e.g. 100"
                        className="flex-1 p-2.5 bg-[#1c1c1c] border border-zinc-850 rounded-2xl text-sm outline-none text-white focus:border-amber-500"
                      />
                      <button
                        onClick={handleSaveDeliveryConfig}
                        className="bg-amber-500 hover:bg-amber-600 font-bold px-4 py-2.5 rounded-2xl text-xs text-black cursor-pointer shadow-md flex items-center gap-1.5 shrink-0"
                      >
                        <Save className="w-4 h-4" />
                        Save Rate
                      </button>
                    </div>
                    <span className="text-[10px] text-zinc-500 block leading-relaxed">
                      💡 Stored coordinates: **settings/delivery_config** with Firestore. Automatically updates user carts in real-time.
                    </span>
                  </div>
                </div>

                {/* Chime trigger in-app broadcaster */}
                <div className="bg-[#121212] border border-zinc-920 p-5 rounded-3xl shadow-lg space-y-4">
                  <div>
                    <h4 className="font-extrabold text-sm text-zinc-100 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                      In-App Notification Dispatcher
                    </h4>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Broadcasting triggers a text alert banner accompanied by a musical sound on customer screens!
                    </p>
                  </div>

                  <div className="space-y-2 pt-1 text-xs">
                    <input
                      type="text"
                      placeholder="Notification Title"
                      value={alertTitle}
                      onChange={(e) => setAlertTitle(e.target.value)}
                      className="w-full p-2 bg-[#1c1c1c] border border-zinc-850 rounded-xl outline-none focus:border-amber-500"
                    />
                    <textarea
                      rows={2}
                      placeholder="Notification Message body text..."
                      value={alertMessage}
                      onChange={(e) => setAlertMessage(e.target.value)}
                      className="w-full p-2 bg-[#1c1c1c] border border-zinc-850 rounded-xl outline-none focus:border-amber-500 resize-none"
                    />
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={handleTriggerBroadcasterNotifications}
                        className="bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs py-2 px-5 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
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
            <div className="space-y-6">
              
              {/* Add New Dish / Home Service Product Form */}
              <form onSubmit={handleAddNewItem} className="bg-[#121212] border border-zinc-920 p-5 rounded-3xl shadow-lg space-y-4">
                <h4 className="font-extrabold text-sm text-zinc-100 flex items-center gap-2 pb-2 border-b border-zinc-900">
                  <Plus className="w-4 h-4 text-amber-500" />
                  Add New Dish or Home Service
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Title Name</label>
                    <input
                      type="text"
                      required
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="e.g. Premium Beef Cheese Burger"
                      className="w-full p-2.5 bg-[#1c1c1c] border border-zinc-850 rounded-xl text-white outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-1">
                    <label className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Catalog Category</label>
                    <select
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value as Dish["category"])}
                      className="w-full p-2.5 bg-[#1c1c1c] border border-zinc-850 rounded-xl text-white outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="Burgers">Burgers 🍔</option>
                      <option value="Pizzas">Pizzas 🍕</option>
                      <option value="Chicken & Rice">Chicken & Rice 🍗</option>
                      <option value="Only Tea">Only Tea ☕</option>
                      <option value="Specials">Specials (Offers) ⭐️</option>
                      <option value="Home Services">Home Services 🛠️</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Base Price (Rs.)</label>
                    <input
                      type="number"
                      required
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(Number(e.target.value))}
                      placeholder="e.g. 500"
                      className="w-full p-2.5 bg-[#1c1c1c] border border-zinc-850 rounded-xl text-white outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-1">
                    <label className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Service / Product Type</label>
                    <div className="grid grid-cols-2 gap-1 bg-[#1c1c1c] border border-zinc-850 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => setNewItemType("food")}
                        className={`py-1 rounded-lg font-bold text-[10px] uppercase cursor-pointer ${
                          newItemType === "food" ? "bg-amber-500 text-black shadow-xs" : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        Food 🍔
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewItemType("service")}
                        className={`py-1 rounded-lg font-bold text-[10px] uppercase cursor-pointer ${
                          newItemType === "service" ? "bg-amber-500 text-black shadow-xs" : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        Service 🛠️
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-4 space-y-1">
                    <label className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Description Information</label>
                    <input
                      type="text"
                      value={newItemDescription}
                      onChange={(e) => setNewItemDescription(e.target.value)}
                      placeholder="Brief descriptive labels shown to customers"
                      className="w-full p-2.5 bg-[#1c1c1c] border border-zinc-850 rounded-xl text-white outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="md:col-span-4 space-y-1 font-mono">
                    <label className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Image URL (Optional)</label>
                    <input
                      type="text"
                      value={newItemImageUrl}
                      onChange={(e) => setNewItemImageUrl(e.target.value)}
                      placeholder="Blank for auto high quality Unsplash"
                      className="w-full p-2.5 bg-[#1c1c1c] border border-zinc-850 rounded-xl text-white outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="md:col-span-4 space-y-1">
                    <label className="text-amber-500 font-bold uppercase tracking-wider text-[10px]">Restaurant / Partner Shop Name</label>
                    <input
                      type="text"
                      value={newItemRestaurantName}
                      onChange={(e) => setNewItemRestaurantName(e.target.value)}
                      placeholder="e.g. KFC, Savour Foods, Dadu Tea House"
                      className="w-full p-2.5 bg-[#1c1c1c] border border-zinc-850 rounded-xl text-white outline-none focus:border-amber-500"
                    />
                  </div>

                  {newItemType === "service" && (
                    <div className="md:col-span-12 space-y-1">
                      <label className="text-amber-500 font-bold uppercase tracking-wider text-[10px]">Service Duration / Timing</label>
                      <input
                        type="text"
                        value={newItemServiceDuration}
                        onChange={(e) => setNewItemServiceDuration(e.target.value)}
                        placeholder="e.g. Expected arrival within 1 hour"
                        className="w-full p-2.5 bg-[#1c1c1c] border border-zinc-850 rounded-xl text-white outline-none focus:border-amber-500"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-600 font-extrabold text-xs tracking-wide text-black uppercase py-2.5 px-6 rounded-2xl flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    Dispatch Item to Database
                  </button>
                </div>
              </form>

              {/* Items Table List */}
              <div className="bg-[#121212] border border-zinc-920 rounded-3xl overflow-hidden shadow-lg">
                <div className="p-4 border-b border-zinc-900 bg-zinc-900/40">
                  <h4 className="font-extrabold text-sm text-zinc-100">Operational Catalog Directory</h4>
                  <span className="text-[10px] text-zinc-500">Enable availability controls and edit prices instantly</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-zinc-400 font-medium">
                    <thead className="bg-[#1c1c1c] text-zinc-500 uppercase font-black text-[9px] border-b border-zinc-850">
                      <tr>
                        <th className="p-4">Item Name</th>
                        <th className="p-4">Category</th>
                        <th className="p-4">Type</th>
                        <th className="p-4">Price (Rs.)</th>
                        <th className="p-4 text-center">ON/OFF Toggle</th>
                        <th className="p-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {dishes.map((dish) => (
                        <tr key={dish.id} className="hover:bg-zinc-900/35 transition">
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
            <div className="space-y-6">

              <div className="bg-[#121212] border border-zinc-920 rounded-3xl overflow-hidden shadow-lg">
                <div className="p-4 border-b border-zinc-900 bg-zinc-900/40">
                  <h4 className="font-extrabold text-sm text-zinc-100">Live Operational Orders Pipeline</h4>
                  <span className="text-[10px] text-zinc-500">Monitor order transactions and assign dispatchers in real-time</span>
                </div>

                <div className="divide-y divide-zinc-900">
                  {orders.length === 0 ? (
                    <div className="p-12 text-center text-xs text-zinc-500 font-medium">
                      Logs directory is blank. Waiting for live user transactions...
                    </div>
                  ) : (
                    orders.map((order) => {
                      const isSvc = order.orderType === "service";
                      const isActive = order.status !== "delivered" && order.status !== "completed" && order.status !== "cancelled";

                      return (
                        <div key={order.id} className="p-5 hover:bg-zinc-900/25 transition space-y-4">
                          
                          {/* Top metadata strip */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#111] p-3 rounded-2xl border border-zinc-920">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-black text-white uppercase bg-zinc-900 border border-zinc-800 py-1 px-2.5 rounded-lg">
                                  dadu-{order.id.substring(0, 8)}
                                </span>
                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                  isSvc ? "bg-amber-950 border border-amber-900/40 text-amber-500" : "bg-orange-950/45 border border-orange-900/30 text-[#FF5C00]"
                                }`}>
                                  {order.orderType}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2.5 items-center mt-2.5 text-xs text-zinc-400">
                                <span className="font-bold text-zinc-200">{order.userName}</span>
                                <span className="text-zinc-650">|</span>
                                <span>Phone: {order.userPhone}</span>
                                <span className="text-zinc-650">|</span>
                                <span>Total: <span className="font-extrabold text-white">Rs. {order.grandTotal}</span></span>
                              </div>
                            </div>

                            {/* Status label banner */}
                            <div>
                              <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-550 block">Current Status</span>
                              <span className={`text-xs font-black uppercase mt-1 inline-block ${
                                order.status === "delivered" || order.status === "completed" 
                                  ? "text-emerald-400" 
                                  : order.status === "cancelled" 
                                    ? "text-red-500"
                                    : "text-amber-500"
                              }`}>
                                {order.status}
                              </span>
                            </div>
                          </div>

                          {/* Items descriptions and customer address */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
                            <div className="bg-[#181818] p-3.5 rounded-2xl border border-zinc-920 space-y-2">
                              <span className="text-[10px] font-extrabold text-zinc-550 uppercase tracking-widest block">Cart Summary</span>
                              <div className="divide-y divide-zinc-900/80">
                                {order.items.map((item, id) => (
                                  <div key={id} className="py-1.5 flex justify-between">
                                    <span className="text-gray-200">
                                      {item.name}{" "}
                                      <span className="text-xs text-[#FF5C00] font-black font-sans">
                                        ({item.restaurantName || (item.type === "service" ? "Dadu Home Services" : "Dadu Fast Food")})
                                      </span>{" "}
                                      <span className="text-zinc-600 font-bold">x{item.quantity}</span>
                                    </span>
                                    <span className="font-bold text-gray-400">Rs. {item.price * item.quantity}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="text-[10px] text-zinc-500 pt-1.5 border-t border-zinc-900 leading-normal">
                                {isSvc ? (
                                  <span className="text-amber-500/80 font-bold">🛠️ Service inspection visit - PAY ON VISIT</span>
                                ) : (
                                  <span>🍔 Fast food parcel dispatch - CASH ON DELIVERY</span>
                                )}
                              </div>
                            </div>

                            <div className="bg-[#181818] p-3.5 rounded-2xl border border-zinc-920 space-y-2">
                              <span className="text-[10px] font-extrabold text-zinc-550 uppercase tracking-widest block">Destination address Coordinates</span>
                              <p className="text-gray-300 leading-relaxed bg-[#121212] p-2 rounded-xl border border-zinc-900 truncate">
                                📍 {order.userAddress}
                              </p>

                              {/* Logistics parameters inputs (Save Rider / saved ETA) */}
                              {isActive && (
                                <div className="pt-2 border-t border-zinc-900 flex gap-2">
                                  <div className="flex-1 space-y-1">
                                    <span className="text-[8.5px] font-black text-zinc-500 tracking-wider block uppercase">
                                      {isSvc ? "Technician Name" : "Delivery Rider"}
                                    </span>
                                    <input
                                      type="text"
                                      placeholder={isSvc ? "e.g. Asif (Tech)" : "e.g. Ali (Rider)"}
                                      value={riderNames[order.id] || order.riderName || ""}
                                      onChange={(e) => setRiderNames({ ...riderNames, [order.id]: e.target.value })}
                                      className="w-full text-xs p-1.5 bg-zinc-950 border border-zinc-850 rounded-lg text-white"
                                    />
                                  </div>

                                  <div className="flex-1 space-y-1">
                                    <span className="text-[8.5px] font-black text-zinc-500 tracking-wider block uppercase">
                                      {isSvc ? "Arrival ETA" : "Duration ETA"}
                                    </span>
                                    <input
                                      type="text"
                                      placeholder={isSvc ? "1 Hour" : "25 mins"}
                                      value={orderEtas[order.id] || order.eta || ""}
                                      onChange={(e) => setOrderEtas({ ...orderEtas, [order.id]: e.target.value })}
                                      className="w-full text-xs p-1.5 bg-zinc-950 border border-zinc-850 rounded-lg text-white"
                                    />
                                  </div>

                                  <button
                                    onClick={() => handleSaveRiderAndEta(order.id)}
                                    className="bg-amber-500 hover:bg-amber-600 text-black font-black p-2 rounded-lg self-end text-[10px] uppercase tracking-wide cursor-pointer h-8 shadow-xs inline-flex items-center justify-center shrink-0"
                                  >
                                    Apply
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Interactive order dispatch pipelines selectors */}
                          {isActive && (
                            <div className="pt-2 flex flex-wrap gap-2 items-center">
                              <span className="text-[10px] font-extrabold uppercase text-amber-500/80 tracking-wider">Execute Next State:</span>
                              
                              {/* FOOD SPECIFIC DISPATCH BUTTONS */}
                              {!isSvc && (
                                <>
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.id, "confirmed")}
                                    className="bg-zinc-900 border border-zinc-800 text-gray-300 px-3 py-1.5 rounded-xl hover:bg-zinc-850 hover:text-white transition cursor-pointer text-[10.5px] font-extrabold"
                                  >
                                    🤝 Confirmed
                                  </button>
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.id, "preparing")}
                                    className="bg-purple-950/20 border border-purple-900/40 text-purple-400 px-3 py-1.5 rounded-xl hover:bg-purple-950/50 transition cursor-pointer text-[10.5px] font-extrabold"
                                  >
                                    👩‍🍳 Prep/Cooking
                                  </button>
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.id, "out_for_delivery")}
                                    className="bg-teal-950/20 border border-teal-900/40 text-teal-400 px-3 py-1.5 rounded-xl hover:bg-teal-950/50 transition cursor-pointer text-[10.5px] font-extrabold"
                                  >
                                    🛵 Dispatch Out
                                  </button>
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.id, "delivered")}
                                    className="bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 px-4 py-1.5 rounded-xl hover:bg-emerald-950/60 transition cursor-pointer text-[10.5px] font-black"
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
                                    className="bg-zinc-900 border border-zinc-800 text-gray-300 px-3 py-1.5 rounded-xl hover:bg-zinc-850 hover:text-white transition cursor-pointer text-[10.5px] font-extrabold"
                                  >
                                    🤝 Confirm Booking
                                  </button>
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.id, "diagnostic_on_way")}
                                    className="bg-sky-950/20 border border-sky-900/40 text-sky-450 px-3 py-1.5 rounded-xl hover:bg-sky-950/50 transition cursor-pointer text-[10.5px] font-extrabold"
                                  >
                                    🛵 Mechanic Out
                                  </button>
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.id, "diagnostic_underway")}
                                    className="bg-yellow-950/20 border border-yellow-900/40 text-yellow-500 px-3 py-1.5 rounded-xl hover:bg-yellow-950/50 transition cursor-pointer text-[10.5px] font-extrabold"
                                  >
                                    🛠️ Diagnostics Underway
                                  </button>
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.id, "completed")}
                                    className="bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 px-4 py-1.5 rounded-xl hover:bg-emerald-950/60 transition cursor-pointer text-[10.5px] font-black"
                                  >
                                    ✅ Job Completed
                                  </button>
                                </>
                              )}

                              {/* CANCEL COMMON ACTIONS */}
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, "cancelled")}
                                className="ml-auto bg-red-950/10 border border-red-900/30 text-red-500 px-3 py-1.5 rounded-xl hover:bg-red-950/30 transition cursor-pointer text-[10.5px] font-extrabold"
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

        </div>

      </div>

    </div>
  );
}
