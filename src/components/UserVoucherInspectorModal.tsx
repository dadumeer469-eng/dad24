import React, { useState } from "react";
import { X, Ticket, Send, Trash2, CheckCircle, Calendar, Plus, Sparkles, Store, ShoppingBag } from "lucide-react";
import { collection, doc, updateDoc, arrayUnion, arrayRemove, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Voucher, UserProfile, isVoucherExpired } from "../types";

interface UserVoucherInspectorModalProps {
  user: UserProfile | null;
  onClose: () => void;
  allVouchers: Voucher[];
}

export default function UserVoucherInspectorModal({
  user,
  onClose,
  allVouchers,
}: UserVoucherInspectorModalProps) {
  const [selectedVoucherCode, setSelectedVoucherCode] = useState<string>("");
  const [customNote, setCustomNote] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  if (!user) return null;

  // Find all vouchers assigned to this user
  const assignedVouchers = allVouchers.filter(
    (v) => v.assignedUserIds && v.assignedUserIds.includes(user.uid)
  );

  // Active vouchers available to assign (not already assigned)
  const assignableVouchers = allVouchers.filter((v) => {
    if (!v.isActive || isVoucherExpired(v)) return false;
    if (v.assignedUserIds && v.assignedUserIds.includes(user.uid)) return false;
    return true;
  });

  // Assign Voucher to this user
  const handleAssignVoucher = async () => {
    if (!selectedVoucherCode) {
      alert("Please select a voucher to assign!");
      return;
    }
    const targetVoucher = allVouchers.find((v) => v.code === selectedVoucherCode);
    if (!targetVoucher) return;

    setIsProcessing(true);
    try {
      const vId = targetVoucher.id || targetVoucher.code;
      await updateDoc(doc(db, "vouchers", vId), {
        assignedUserIds: arrayUnion(user.uid),
      });

      const discountText =
        targetVoucher.discountType === "percentage"
          ? `${targetVoucher.discountValue}% OFF`
          : `Rs. ${targetVoucher.discountValue} OFF`;
      const noteMsg =
        customNote.trim() ||
        `🎁 Admin ne aapko special discount voucher '${targetVoucher.code}' (${discountText}) assign kiya hai! Enjoy your meal! 🎉`;

      await addDoc(collection(db, "notifications"), {
        userId: user.uid,
        title: `🎟️ Voucher Assigned: ${targetVoucher.code}`,
        message: noteMsg,
        createdAt: new Date(),
        read: false,
      });

      alert(`✅ Voucher '${targetVoucher.code}' successfully assigned to ${user.name || user.phone}!`);
      setSelectedVoucherCode("");
      setCustomNote("");
    } catch (err: any) {
      alert("Failed to assign voucher: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Revoke Voucher from this user
  const handleRevokeVoucher = async (v: Voucher) => {
    if (!window.confirm(`Revoke voucher '${v.code}' from ${user.name || user.phone}?`)) return;
    setIsProcessing(true);
    try {
      const vId = v.id || v.code;
      await updateDoc(doc(db, "vouchers", vId), {
        assignedUserIds: arrayRemove(user.uid),
      });
      alert(`Voucher '${v.code}' removed from user.`);
    } catch (err: any) {
      alert("Failed to revoke voucher: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs text-left">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-800 font-black">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900">
                Vouchers for {user.name || user.phone || "User"}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Phone: {user.phone || "N/A"} • UID: {user.uid.slice(0, 8)}...
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 rounded-full border border-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {/* Section 1: Assign New Voucher */}
          <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-amber-700" />
              Assign / Send a New Voucher
            </span>

            {assignableVouchers.length === 0 ? (
              <p className="text-xs text-amber-800 font-medium">
                No new assignable vouchers available. Create more active vouchers from the Vouchers tab.
              </p>
            ) : (
              <div className="space-y-2">
                <select
                  value={selectedVoucherCode}
                  onChange={(e) => setSelectedVoucherCode(e.target.value)}
                  className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="">-- Select Active Voucher to Send --</option>
                  {assignableVouchers.map((v) => (
                    <option key={v.code} value={v.code}>
                      {v.code} ({v.discountType === "percentage" ? `${v.discountValue}% OFF` : `Rs. ${v.discountValue} OFF`}{" "}
                      - Min Order: Rs. {v.minOrderAmount || 0})
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Optional custom message to include in user notification..."
                  className="w-full p-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-slate-800 outline-none"
                />

                <button
                  type="button"
                  disabled={!selectedVoucherCode || isProcessing}
                  onClick={handleAssignVoucher}
                  className="w-full py-2.5 bg-[#D70F64] hover:bg-[#b00c50] text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isProcessing ? "Assigning..." : "Assign & Send Notification"}</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Currently Assigned Vouchers */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Assigned Vouchers ({assignedVouchers.length})
              </span>
            </div>

            {assignedVouchers.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 space-y-1">
                <span className="text-2xl block">🎟️</span>
                <p className="text-xs font-bold">No exclusive vouchers currently assigned</p>
                <p className="text-[10.5px] text-slate-400">
                  This user can still use public vouchers available across the store.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {assignedVouchers.map((v) => {
                  const expired = isVoucherExpired(v);
                  return (
                    <div
                      key={v.code}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                        expired
                          ? "bg-slate-50 border-slate-200 opacity-60"
                          : "bg-white border-amber-200 shadow-xs"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                            {v.code}
                          </span>
                          <span className="text-xs font-black text-[#D70F64]">
                            {v.discountType === "percentage"
                              ? `${v.discountValue}% OFF`
                              : `Rs. ${v.discountValue} OFF`}
                          </span>
                          {expired && (
                            <span className="text-[8.5px] bg-red-100 text-red-700 font-black uppercase px-1.5 py-0.5 rounded">
                              Expired
                            </span>
                          )}
                        </div>
                        <div className="text-[10.5px] text-slate-500 font-semibold mt-1">
                          Min Order: Rs. {v.minOrderAmount || 0} • Scope: {v.applicableType || "All"}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleRevokeVoucher(v)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer border border-red-200 shrink-0"
                        title="Remove voucher from this user"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
