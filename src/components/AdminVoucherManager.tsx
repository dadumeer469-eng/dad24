import React, { useState } from "react";
import {
  Ticket,
  Plus,
  Search,
  Calendar,
  Sparkles,
  Trash2,
  Edit2,
  Send,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  UserCheck,
  Check,
  X,
  Store,
  ShoppingBag,
  Percent,
  Coins,
  Copy,
} from "lucide-react";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from "firebase/firestore";
import { db, cleanObject } from "../firebase";
import { Voucher, UserProfile, isVoucherExpired } from "../types";

interface AdminVoucherManagerProps {
  vouchers: Voucher[];
  allUsersList: UserProfile[];
  restaurantNames: string[];
}

export default function AdminVoucherManager({
  vouchers,
  allUsersList,
  restaurantNames,
}: AdminVoucherManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "active" | "expired" | "assigned">("all");
  
  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState<number>(20);
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<number | undefined>(undefined);
  const [minOrderAmount, setMinOrderAmount] = useState<number>(500);
  const [applicableType, setApplicableType] = useState<"all" | "food_only" | "grocery_only" | "restaurant">("all");
  const [applicableRestaurant, setApplicableRestaurant] = useState<string>("");
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [maxUses, setMaxUses] = useState<number>(0);
  const [perUserLimit, setPerUserLimit] = useState<number>(1);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState<string>("");
  const [sendNotificationOnCreate, setSendNotificationOnCreate] = useState<boolean>(true);

  // Direct "Send Voucher" Modal State
  const [sendModalVoucher, setSendModalVoucher] = useState<Voucher | null>(null);
  const [sendTargetUserIds, setSendTargetUserIds] = useState<string[]>([]);
  const [sendModalSearch, setSendModalSearch] = useState<string>("");
  const [isSending, setIsSending] = useState(false);

  // User Vouchers Inspector Modal
  const [inspectingUser, setInspectingUser] = useState<UserProfile | null>(null);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingVoucher(null);
    setCode("");
    setDiscountType("percentage");
    setDiscountValue(20);
    setMaxDiscountAmount(undefined);
    setMinOrderAmount(500);
    setApplicableType("all");
    setApplicableRestaurant(restaurantNames[0] || "");
    // Default expiry 7 days from now
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 7);
    defaultExpiry.setHours(23, 59, 0, 0);
    setExpiryDate(defaultExpiry.toISOString().slice(0, 16));
    setMaxUses(0);
    setPerUserLimit(1);
    setIsActive(true);
    setSuccessMessage("");
    setSelectedUserIds([]);
    setUserSearchTerm("");
    setSendNotificationOnCreate(true);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (v: Voucher) => {
    setEditingVoucher(v);
    setCode(v.code);
    setDiscountType(v.discountType);
    setDiscountValue(v.discountValue);
    setMaxDiscountAmount(v.maxDiscountAmount);
    setMinOrderAmount(v.minOrderAmount || 0);
    setApplicableType(v.applicableType || "all");
    setApplicableRestaurant(v.applicableRestaurant || restaurantNames[0] || "");
    setExpiryDate(v.expiryDate ? new Date(v.expiryDate).toISOString().slice(0, 16) : "");
    setMaxUses(v.maxUses || 0);
    setPerUserLimit(v.perUserLimit || 1);
    setIsActive(v.isActive);
    setSuccessMessage(v.successMessage || "");
    setSelectedUserIds(v.assignedUserIds || []);
    setUserSearchTerm("");
    setSendNotificationOnCreate(false);
    setIsModalOpen(true);
  };

  // Save Voucher (Create / Update)
  const handleSaveVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      alert("Please enter a voucher code!");
      return;
    }
    if (discountValue <= 0) {
      alert("Discount value must be greater than 0!");
      return;
    }

    setIsSaving(true);
    try {
      const voucherId = editingVoucher ? editingVoucher.id || editingVoucher.code : cleanCode;
      
      // Build assigned user names lookup cache
      const assignedNamesMap: { [uid: string]: string } = {};
      selectedUserIds.forEach((uid) => {
        const u = allUsersList.find((usr) => usr.uid === uid);
        if (u) {
          assignedNamesMap[uid] = u.name || u.phone || "User";
        }
      });

      const voucherData: any = {
        id: voucherId,
        code: cleanCode,
        discountType,
        discountValue: Number(discountValue),
        minOrderAmount: Number(minOrderAmount) || 0,
        applicableType,
        maxUses: Number(maxUses) || 0,
        currentUses: editingVoucher?.currentUses || 0,
        perUserLimit: Number(perUserLimit) || 1,
        assignedUserIds: selectedUserIds,
        assignedUserNames: assignedNamesMap,
        isActive,
      };

      if (maxDiscountAmount !== undefined && maxDiscountAmount !== null && Number(maxDiscountAmount) > 0) {
        voucherData.maxDiscountAmount = Number(maxDiscountAmount);
      }
      if (applicableType === "restaurant" && applicableRestaurant) {
        voucherData.applicableRestaurant = applicableRestaurant;
      }
      if (expiryDate) {
        voucherData.expiryDate = new Date(expiryDate).toISOString();
      }
      if (successMessage.trim()) {
        voucherData.successMessage = successMessage.trim();
      }

      if (!editingVoucher) {
        voucherData.createdAt = new Date();
      }

      await setDoc(doc(db, "vouchers", voucherId), cleanObject(voucherData), { merge: true });

      // If assigning to specific users and notification is checked, send notifications
      if (sendNotificationOnCreate && selectedUserIds.length > 0) {
        const discountText =
          discountType === "percentage"
            ? `${discountValue}% OFF`
            : `Rs. ${discountValue} OFF`;
        const minOrderText = minOrderAmount > 0 ? ` (Min. Order: Rs. ${minOrderAmount})` : "";
        const expiryText = expiryDate ? ` Valid till: ${new Date(expiryDate).toLocaleDateString("en-PK")}` : "";

        for (const uid of selectedUserIds) {
          await addDoc(collection(db, "notifications"), {
            userId: uid,
            title: `🎟️ Special Voucher: ${cleanCode}`,
            message: `Admin ne aapko special discount voucher bheja hai! Use code '${cleanCode}' to get ${discountText}${minOrderText}.${expiryText} 🎉`,
            createdAt: new Date(),
            read: false,
          }).catch((err) => console.error("Failed to send notification:", err));
        }
      }

      alert(editingVoucher ? `✅ Voucher '${cleanCode}' updated successfully!` : `✅ Voucher '${cleanCode}' created successfully!`);
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Error saving voucher:", err);
      alert("Failed to save voucher: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Voucher
  const handleDeleteVoucher = async (v: Voucher) => {
    if (!window.confirm(`Are you sure you want to permanently delete voucher '${v.code}'?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, "vouchers", v.id || v.code));
      alert(`🗑️ Voucher '${v.code}' deleted.`);
    } catch (err: any) {
      alert("Failed to delete voucher: " + err.message);
    }
  };

  // Toggle Active Status
  const handleToggleActive = async (v: Voucher) => {
    try {
      await updateDoc(doc(db, "vouchers", v.id || v.code), {
        isActive: !v.isActive,
      });
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  // Send Voucher to Users Action
  const handleSendVoucherSubmit = async () => {
    if (!sendModalVoucher) return;
    if (sendTargetUserIds.length === 0) {
      alert("Please select at least one user!");
      return;
    }

    setIsSending(true);
    try {
      const v = sendModalVoucher;
      const vId = v.id || v.code;
      
      // Update assignedUserIds on voucher doc
      await updateDoc(doc(db, "vouchers", vId), {
        assignedUserIds: arrayUnion(...sendTargetUserIds),
      });

      // Send notifications to each recipient
      const discountText =
        v.discountType === "percentage"
          ? `${v.discountValue}% OFF`
          : `Rs. ${v.discountValue} OFF`;
      const minOrderText = v.minOrderAmount ? ` on orders above Rs. ${v.minOrderAmount}` : "";

      for (const uid of sendTargetUserIds) {
        await addDoc(collection(db, "notifications"), {
          userId: uid,
          title: `🎁 Voucher Gift: ${v.code}`,
          message: `Mubarak ho! Admin ne aapko ${discountText} ka voucher '${v.code}' gift kiya hai${minOrderText}! Checkout par use karein 🛒`,
          createdAt: new Date(),
          read: false,
        }).catch(() => {});
      }

      alert(`✅ Voucher '${v.code}' successfully sent to ${sendTargetUserIds.length} users with notifications!`);
      setSendModalVoucher(null);
      setSendTargetUserIds([]);
    } catch (err: any) {
      alert("Failed to send voucher: " + err.message);
    } finally {
      setIsSending(false);
    }
  };

  // Revoke / Remove voucher from a specific user
  const handleRevokeFromUser = async (voucher: Voucher, userId: string) => {
    if (!window.confirm(`Revoke voucher '${voucher.code}' from this user?`)) return;
    try {
      await updateDoc(doc(db, "vouchers", voucher.id || voucher.code), {
        assignedUserIds: arrayRemove(userId),
      });
      alert(`Voucher '${voucher.code}' removed from user.`);
    } catch (err: any) {
      alert("Failed to revoke voucher: " + err.message);
    }
  };

  // Filter vouchers
  const filteredVouchers = vouchers.filter((v) => {
    const isExpired = isVoucherExpired(v);
    if (filterTab === "active" && (!v.isActive || isExpired)) return false;
    if (filterTab === "expired" && !isExpired) return false;
    if (filterTab === "assigned" && (!v.assignedUserIds || v.assignedUserIds.length === 0)) return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const codeMatch = v.code.toLowerCase().includes(q);
      const descMatch = (v.successMessage || "").toLowerCase().includes(q);
      const restMatch = (v.applicableRestaurant || "").toLowerCase().includes(q);
      return codeMatch || descMatch || restMatch;
    }
    return true;
  });

  const totalActive = vouchers.filter((v) => v.isActive && !isVoucherExpired(v)).length;
  const totalExpired = vouchers.filter((v) => isVoucherExpired(v)).length;
  const totalUses = vouchers.reduce((acc, v) => acc + (v.currentUses || 0), 0);

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white/95 border border-slate-200 rounded-3xl p-6 relative overflow-hidden shadow-sm">
        <div className="absolute right-0 top-0 w-80 h-80 bg-pink-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#D70F64]">
              <Ticket className="w-5 h-5 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#D70F64]">
                Promotions & Coupons
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 mt-1">
              Voucher & Discount Management
            </h2>
            <p className="text-[11.5px] text-slate-600 font-semibold mt-0.5">
              Create discount coupons, set expiry dates & minimum order limits, assign to specific users, and track redemptions.
            </p>
          </div>

          {/* Action Button */}
          <button
            onClick={handleOpenCreate}
            className="px-5 py-3 bg-[#D70F64] hover:bg-[#b00c50] text-white font-black text-xs uppercase tracking-wider rounded-2xl transition shadow-md shadow-pink-500/20 flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create New Voucher</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-150 p-3 rounded-2xl">
            <span className="text-[9.5px] font-black uppercase text-slate-400 block">Total Vouchers</span>
            <span className="text-xl font-black text-slate-800 mt-0.5 block">{vouchers.length}</span>
          </div>
          <div className="bg-emerald-50/60 border border-emerald-200/60 p-3 rounded-2xl">
            <span className="text-[9.5px] font-black uppercase text-emerald-600 block">Active & Live</span>
            <span className="text-xl font-black text-emerald-600 mt-0.5 block">{totalActive}</span>
          </div>
          <div className="bg-amber-50/60 border border-amber-200/60 p-3 rounded-2xl">
            <span className="text-[9.5px] font-black uppercase text-amber-600 block">Expired Vouchers</span>
            <span className="text-xl font-black text-amber-600 mt-0.5 block">{totalExpired}</span>
          </div>
          <div className="bg-pink-50/60 border border-pink-200/60 p-3 rounded-2xl">
            <span className="text-[9.5px] font-black uppercase text-[#D70F64] block">Total Redeemed</span>
            <span className="text-xl font-black text-[#D70F64] mt-0.5 block">{totalUses} Uses</span>
          </div>
        </div>

        {/* Search and Tabs */}
        <div className="mt-6 flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by voucher code, restaurant or description..."
              className="w-full bg-slate-100/90 border border-slate-200 text-slate-900 placeholder-slate-400 pl-10 pr-4 py-2.5 rounded-2xl text-xs font-semibold focus:outline-hidden focus:border-[#D70F64]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              onClick={() => setFilterTab("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                filterTab === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All ({vouchers.length})
            </button>
            <button
              onClick={() => setFilterTab("active")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                filterTab === "active" ? "bg-emerald-500 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Active ({totalActive})
            </button>
            <button
              onClick={() => setFilterTab("expired")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                filterTab === "expired" ? "bg-red-500 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Expired ({totalExpired})
            </button>
            <button
              onClick={() => setFilterTab("assigned")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                filterTab === "assigned" ? "bg-amber-500 text-slate-950 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              User Assigned
            </button>
          </div>
        </div>
      </div>

      {/* Vouchers List */}
      {filteredVouchers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-pink-50 border border-pink-100 flex items-center justify-center text-3xl mx-auto text-[#D70F64]">
            🎟️
          </div>
          <h3 className="text-base font-black text-slate-800">No Vouchers Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
            {searchTerm
              ? "No vouchers match your search criteria. Try a different query."
              : "No vouchers currently exist in this filter. Click 'Create New Voucher' above to add one!"}
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-2 px-4 py-2 bg-[#D70F64] hover:bg-[#b00c50] text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
          >
            + Create First Voucher
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredVouchers.map((v) => {
            const isExpired = isVoucherExpired(v);
            const isAssigned = v.assignedUserIds && v.assignedUserIds.length > 0;
            const hasUsageCap = v.maxUses > 0;
            const reachedCap = hasUsageCap && (v.currentUses || 0) >= v.maxUses;

            return (
              <div
                key={v.id || v.code}
                className={`bg-white border rounded-3xl p-5 relative transition-all shadow-xs flex flex-col justify-between ${
                  !v.isActive || isExpired || reachedCap
                    ? "border-slate-200 opacity-75 bg-slate-50/50"
                    : isAssigned
                    ? "border-amber-300 ring-1 ring-amber-200/50"
                    : "border-slate-200 hover:border-pink-300"
                }`}
              >
                <div>
                  {/* Top Bar: Code & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-base text-slate-900 bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl tracking-wider">
                        {v.code}
                      </span>
                      {isAssigned && (
                        <span className="bg-amber-100 border border-amber-300 text-amber-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Users className="w-2.5 h-2.5" /> {v.assignedUserIds?.length} Users
                        </span>
                      )}
                    </div>

                    <div>
                      {isExpired ? (
                        <span className="bg-red-100 text-red-700 border border-red-200 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                          Expired
                        </span>
                      ) : !v.isActive ? (
                        <span className="bg-slate-200 text-slate-600 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                          Disabled
                        </span>
                      ) : reachedCap ? (
                        <span className="bg-orange-100 text-orange-700 border border-orange-200 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                          Max Reached
                        </span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Discount Value */}
                  <div className="mt-3">
                    <div className="text-xl font-black text-[#D70F64] flex items-baseline gap-1.5">
                      {v.discountType === "percentage" ? (
                        <>
                          <span>{v.discountValue}% OFF</span>
                          {v.maxDiscountAmount ? (
                            <span className="text-xs text-slate-500 font-bold">
                              (Max Rs. {v.maxDiscountAmount})
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span>Rs. {v.discountValue} FLAT OFF</span>
                      )}
                    </div>
                    {v.successMessage && (
                      <p className="text-[11px] text-slate-500 font-semibold mt-0.5 line-clamp-1">
                        {v.successMessage}
                      </p>
                    )}
                  </div>

                  {/* Rules Grid */}
                  <div className="mt-4 p-3 bg-slate-50 border border-slate-150 rounded-2xl space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">Min Order:</span>
                      <span className="font-extrabold text-slate-800">
                        {v.minOrderAmount ? `Rs. ${v.minOrderAmount}` : "None"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">Applicable On:</span>
                      <span className="font-bold text-slate-800 truncate max-w-[150px]">
                        {v.applicableType === "grocery_only"
                          ? "🛒 Grocery Only"
                          : v.applicableType === "food_only"
                          ? "🍔 Food Only"
                          : v.applicableType === "restaurant" && v.applicableRestaurant
                          ? `🏪 ${v.applicableRestaurant}`
                          : "🌐 All Food & Grocery"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">Usage:</span>
                      <span className="font-bold text-slate-800">
                        {v.currentUses || 0} {hasUsageCap ? `/ ${v.maxUses}` : "uses (Unlimited)"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">Expiry Date:</span>
                      <span className={`font-bold ${isExpired ? "text-red-600 font-black" : "text-slate-800"}`}>
                        {v.expiryDate
                          ? new Date(v.expiryDate).toLocaleDateString("en-PK", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "No Expiry"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    {/* Toggle Active Button */}
                    <button
                      onClick={() => handleToggleActive(v)}
                      title={v.isActive ? "Disable Voucher" : "Enable Voucher"}
                      className={`p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        v.isActive
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                          : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {v.isActive ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    {/* Send to Users button */}
                    <button
                      onClick={() => {
                        setSendModalVoucher(v);
                        setSendTargetUserIds(v.assignedUserIds || []);
                        setSendModalSearch("");
                      }}
                      title="Send/Assign to Users"
                      className="px-2.5 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>Send</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Edit Button */}
                    <button
                      onClick={() => handleOpenEdit(v)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-200"
                      title="Edit Voucher"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteVoucher(v)}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition cursor-pointer border border-red-200"
                      title="Delete Voucher"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT VOUCHER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col text-left">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#D70F64]/10 border border-[#D70F64]/20 flex items-center justify-center text-[#D70F64]">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    {editingVoucher ? `Edit Voucher '${editingVoucher.code}'` : "Create New Discount Voucher"}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Configure discount rules, items/store scope & expiry conditions
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 rounded-full border border-slate-200 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveVoucher} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Row 1: Code & Active */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                    Voucher Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. WELCOME100, DADU20"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black font-mono text-slate-900 uppercase tracking-wider outline-none focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                    Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`w-full py-2.5 px-3 rounded-xl border text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      isActive
                        ? "bg-emerald-500 text-white border-emerald-600"
                        : "bg-slate-200 text-slate-600 border-slate-300"
                    }`}
                  >
                    {isActive ? "🟢 Active" : "⚪ Disabled"}
                  </button>
                </div>
              </div>

              {/* Row 2: Discount Type & Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                    Discount Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDiscountType("percentage")}
                      className={`py-2 px-3 rounded-xl border text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                        discountType === "percentage"
                          ? "bg-[#D70F64] text-white border-[#D70F64]"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      % Percentage
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("fixed")}
                      className={`py-2 px-3 rounded-xl border text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                        discountType === "fixed"
                          ? "bg-[#D70F64] text-white border-[#D70F64]"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      Rs. Flat Amount
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                    Discount Value ({discountType === "percentage" ? "%" : "Rs."}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Math.max(1, Number(e.target.value)))}
                    placeholder={discountType === "percentage" ? "e.g. 20 (for 20%)" : "e.g. 100 (for Rs. 100)"}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-[#D70F64]"
                  />
                </div>
              </div>

              {/* Row 3: Minimum Order & Max Cap */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                    Min Order / Items Subtotal (Rs.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(Math.max(0, Number(e.target.value)))}
                    placeholder="e.g. 500 (Voucher applies if order >= Rs. 500)"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-[#D70F64]"
                  />
                  <span className="text-[9.5px] text-slate-400 mt-0.5 block">0 for no minimum requirement</span>
                </div>

                {discountType === "percentage" && (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                      Max Discount Cap (Rs.) (Optional)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={maxDiscountAmount || ""}
                      onChange={(e) => setMaxDiscountAmount(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="e.g. 200 (Max discount amount limit)"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-[#D70F64]"
                    />
                    <span className="text-[9.5px] text-slate-400 mt-0.5 block">Leave empty for no maximum cap</span>
                  </div>
                )}
              </div>

              {/* Row 4: Scope (Where can it be used?) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                  🏪 Where Can This Voucher Be Used? (Store Scope)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setApplicableType("all")}
                    className={`p-2 rounded-xl border text-[10.5px] font-black uppercase tracking-wider transition cursor-pointer text-center ${
                      applicableType === "all"
                        ? "bg-[#D70F64] text-white border-[#D70F64]"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    🌐 All Shops
                  </button>
                  <button
                    type="button"
                    onClick={() => setApplicableType("food_only")}
                    className={`p-2 rounded-xl border text-[10.5px] font-black uppercase tracking-wider transition cursor-pointer text-center ${
                      applicableType === "food_only"
                        ? "bg-[#D70F64] text-white border-[#D70F64]"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    🍔 Food Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setApplicableType("grocery_only")}
                    className={`p-2 rounded-xl border text-[10.5px] font-black uppercase tracking-wider transition cursor-pointer text-center ${
                      applicableType === "grocery_only"
                        ? "bg-[#D70F64] text-white border-[#D70F64]"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    🛒 Grocery Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setApplicableType("restaurant")}
                    className={`p-2 rounded-xl border text-[10.5px] font-black uppercase tracking-wider transition cursor-pointer text-center ${
                      applicableType === "restaurant"
                        ? "bg-[#D70F64] text-white border-[#D70F64]"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    🏪 1 Specific Rest.
                  </button>
                </div>

                {applicableType === "restaurant" && (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <label className="text-[9.5px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                      Select Specific Restaurant:
                    </label>
                    <select
                      value={applicableRestaurant}
                      onChange={(e) => setApplicableRestaurant(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#D70F64]"
                    >
                      {restaurantNames.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Row 5: Expiry Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                    Expiry Date & Time (Expire hone par use nahi hoga)
                  </label>
                  <input
                    type="datetime-local"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-[#D70F64]"
                  />
                  {expiryDate && (
                    <button
                      type="button"
                      onClick={() => setExpiryDate("")}
                      className="text-[9.5px] text-pink-600 hover:underline font-bold mt-1 inline-block cursor-pointer"
                    >
                      Clear Expiry (No Expiry)
                    </button>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                    Total Usage Limit (Max Uses)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={maxUses}
                    onChange={(e) => setMaxUses(Math.max(0, Number(e.target.value)))}
                    placeholder="0 for unlimited uses across system"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-[#D70F64]"
                  />
                  <span className="text-[9.5px] text-slate-400 mt-0.5 block">0 = Unlimited redemptions</span>
                </div>
              </div>

              {/* Row 6: Description / Promo message */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                  Optional Promo Message / Description
                </label>
                <input
                  type="text"
                  value={successMessage}
                  onChange={(e) => setSuccessMessage(e.target.value)}
                  placeholder="e.g. Special 20% discount for Dadu foodies!"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-[#D70F64]"
                />
              </div>

              {/* Row 7: Assign to Specific Users Picker */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10.5px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-600" />
                    Assign Directly to Specific User(s) ({selectedUserIds.length} Selected)
                  </label>
                  {selectedUserIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedUserIds([])}
                      className="text-[10px] text-red-600 hover:underline font-bold cursor-pointer"
                    >
                      Clear Selection (Make Public)
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-amber-800 font-medium">
                  {selectedUserIds.length === 0
                    ? "🌐 Currently Public: Any user can enter this code at checkout."
                    : `⭐ Private Voucher: Only the ${selectedUserIds.length} selected users can see and use this voucher.`}
                </p>

                {/* User Search & Multi-select Box */}
                <div className="space-y-2">
                  <input
                    type="text"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    placeholder="Search users by name or phone to assign..."
                    className="w-full p-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-slate-800 outline-none"
                  />

                  <div className="max-h-36 overflow-y-auto border border-amber-200 rounded-xl bg-white divide-y divide-amber-100">
                    {allUsersList
                      .filter((u) => {
                        if (!userSearchTerm) return true;
                        const q = userSearchTerm.toLowerCase();
                        return (
                          (u.name || "").toLowerCase().includes(q) ||
                          (u.phone || "").toLowerCase().includes(q)
                        );
                      })
                      .slice(0, 20)
                      .map((u) => {
                        const isSelected = selectedUserIds.includes(u.uid);
                        return (
                          <div
                            key={u.uid}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedUserIds(selectedUserIds.filter((id) => id !== u.uid));
                              } else {
                                setSelectedUserIds([...selectedUserIds, u.uid]);
                              }
                            }}
                            className={`p-2 flex items-center justify-between text-xs cursor-pointer transition ${
                              isSelected ? "bg-amber-100/80 font-black text-amber-950" : "hover:bg-amber-50 text-slate-700"
                            }`}
                          >
                            <div>
                              <span className="font-bold block">{u.name || "Dadu User"}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{u.phone || "No Phone"}</span>
                            </div>
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                              isSelected ? "bg-amber-500 border-amber-600 text-white" : "border-slate-300 bg-white"
                            }`}>
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Send notification checkbox */}
                {selectedUserIds.length > 0 && !editingVoucher && (
                  <label className="flex items-center gap-2 pt-1 text-xs text-amber-950 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendNotificationOnCreate}
                      onChange={(e) => setSendNotificationOnCreate(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span>Send immediate in-app gift notification to selected users</span>
                  </label>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-[#D70F64] hover:bg-[#b00c50] text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : editingVoucher ? "Update Voucher" : "Create & Activate Voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIRECT SEND VOUCHER MODAL */}
      {sendModalVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col text-left">
            <div className="p-5 border-b border-slate-100 bg-amber-50/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-800">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    Send Voucher '{sendModalVoucher.code}' to Users
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Users will receive an instant notification and see this coupon in their account!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSendModalVoucher(null)}
                className="p-2 text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 rounded-full border border-slate-200 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {/* Voucher Preview Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="font-mono font-black text-sm text-slate-900 block">{sendModalVoucher.code}</span>
                  <span className="text-xs text-[#D70F64] font-black">
                    {sendModalVoucher.discountType === "percentage"
                      ? `${sendModalVoucher.discountValue}% OFF`
                      : `Rs. ${sendModalVoucher.discountValue} OFF`}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-bold">
                  Min Order: Rs. {sendModalVoucher.minOrderAmount || 0}
                </span>
              </div>

              {/* User Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                    Select Recipient Users ({sendTargetUserIds.length} Selected)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (sendTargetUserIds.length === allUsersList.length) {
                        setSendTargetUserIds([]);
                      } else {
                        setSendTargetUserIds(allUsersList.map((u) => u.uid));
                      }
                    }}
                    className="text-[10px] font-black text-[#D70F64] hover:underline cursor-pointer"
                  >
                    {sendTargetUserIds.length === allUsersList.length ? "Deselect All" : "Select All Users"}
                  </button>
                </div>

                <input
                  type="text"
                  value={sendModalSearch}
                  onChange={(e) => setSendModalSearch(e.target.value)}
                  placeholder="Filter users by name or phone..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none"
                />

                <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y divide-slate-100">
                  {allUsersList
                    .filter((u) => {
                      if (!sendModalSearch) return true;
                      const q = sendModalSearch.toLowerCase();
                      return (
                        (u.name || "").toLowerCase().includes(q) ||
                        (u.phone || "").toLowerCase().includes(q)
                      );
                    })
                    .map((u) => {
                      const isSelected = sendTargetUserIds.includes(u.uid);
                      return (
                        <div
                          key={u.uid}
                          onClick={() => {
                            if (isSelected) {
                              setSendTargetUserIds(sendTargetUserIds.filter((id) => id !== u.uid));
                            } else {
                              setSendTargetUserIds([...sendTargetUserIds, u.uid]);
                            }
                          }}
                          className={`p-2.5 flex items-center justify-between text-xs cursor-pointer transition ${
                            isSelected ? "bg-amber-50 font-bold text-amber-950" : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div>
                            <span className="font-extrabold block">{u.name || "Dadu User"}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{u.phone || "No Phone"}</span>
                          </div>
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                            isSelected ? "bg-[#D70F64] border-[#D70F64] text-white" : "border-slate-300 bg-white"
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSendModalVoucher(null)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSending || sendTargetUserIds.length === 0}
                onClick={handleSendVoucherSubmit}
                className="px-5 py-2 bg-[#D70F64] hover:bg-[#b00c50] text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSending ? "Sending..." : `Send to ${sendTargetUserIds.length} Users`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
