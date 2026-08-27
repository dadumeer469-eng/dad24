import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Ticket, Copy, Check, Calendar, Store, ShoppingBag, Sparkles, AlertCircle, ArrowRight, UserCheck, ShieldCheck, History } from "lucide-react";
import { Voucher, UserProfile, isVoucherExpired, canUserUseVoucher, isVoucherExhaustedForUser } from "../types";

interface UserVouchersModalProps {
  isOpen: boolean;
  onClose: () => void;
  vouchers: Voucher[];
  currentUser: UserProfile | null;
  onApplyVoucher?: (voucher: Voucher) => void;
  cartSubtotal?: number;
  cartType?: "food" | "grocery";
  cartRestaurant?: string;
}

export default function UserVouchersModal({
  isOpen,
  onClose,
  vouchers,
  currentUser,
  onApplyVoucher,
  cartSubtotal,
  cartType,
  cartRestaurant,
}: UserVouchersModalProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<"all" | "food" | "grocery" | "exclusive" | "used">("all");

  if (!isOpen) return null;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Base list of vouchers targeted to this user or public
  const baseUserVouchers = vouchers.filter((v) => {
    if (!v.isActive) return false;
    // If voucher is targeted to specific users, check if currentUser.uid is in assignedUserIds
    if (v.assignedUserIds && v.assignedUserIds.length > 0) {
      if (!currentUser || !v.assignedUserIds.includes(currentUser.uid)) {
        return false;
      }
    }
    return true;
  });

  // Active usable vouchers (exhausted or already-used vouchers automatically removed!)
  const activeAvailableVouchers = baseUserVouchers.filter((v) => {
    return !isVoucherExhaustedForUser(v, currentUser?.uid);
  });

  // Already used / exhausted vouchers for history reference
  const usedOrExhaustedVouchers = baseUserVouchers.filter((v) => {
    return isVoucherExhaustedForUser(v, currentUser?.uid);
  });

  const displayedVouchers = (filterTab === "used" ? usedOrExhaustedVouchers : activeAvailableVouchers).filter((v) => {
    if (filterTab === "food") {
      return v.applicableType === "food_only" || v.applicableType === "restaurant" || !v.applicableType || v.applicableType === "all";
    }
    if (filterTab === "grocery") {
      return v.applicableType === "grocery_only" || !v.applicableType || v.applicableType === "all";
    }
    if (filterTab === "exclusive") {
      return v.assignedUserIds && currentUser && v.assignedUserIds.includes(currentUser.uid);
    }
    return true;
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh] text-left"
        >
          {/* Header */}
          <div className="p-5 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#D70F64] to-pink-600 flex items-center justify-center text-white shadow-md shadow-pink-500/20">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  My Vouchers & Offers
                  <span className="text-[10px] bg-[#D70F64]/20 border border-[#D70F64]/30 text-pink-400 font-bold px-2 py-0.5 rounded-full">
                    {activeAvailableVouchers.length} Available
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">
                  Redeem exclusive discount coupons on your checkout (1 offer per order)
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 rounded-full transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Pills */}
          <div className="px-5 py-3 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
            <button
              onClick={() => setFilterTab("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
                filterTab === "all"
                  ? "bg-[#D70F64] text-white shadow-sm"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Available ({activeAvailableVouchers.length})
            </button>
            <button
              onClick={() => setFilterTab("food")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
                filterTab === "food"
                  ? "bg-[#D70F64] text-white shadow-sm"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              🍔 Food
            </button>
            <button
              onClick={() => setFilterTab("grocery")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
                filterTab === "grocery"
                  ? "bg-[#D70F64] text-white shadow-sm"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              🛒 Grocery
            </button>
            {currentUser && activeAvailableVouchers.some(v => v.assignedUserIds?.includes(currentUser.uid)) && (
              <button
                onClick={() => setFilterTab("exclusive")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
                  filterTab === "exclusive"
                    ? "bg-amber-500 text-zinc-950 shadow-sm"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
                }`}
              >
                ⭐ Sent Just For You
              </button>
            )}
            {usedOrExhaustedVouchers.length > 0 && (
              <button
                onClick={() => setFilterTab("used")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
                  filterTab === "used"
                    ? "bg-zinc-700 text-white shadow-sm"
                    : "bg-zinc-800/60 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                🕒 Used / Expired ({usedOrExhaustedVouchers.length})
              </button>
            )}
          </div>

          {/* Vouchers List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-zinc-950/60">
            {displayedVouchers.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-2xl">
                  🎟️
                </div>
                <h4 className="text-sm font-black text-zinc-200">
                  {filterTab === "used" ? "No Used Vouchers" : "No Vouchers Available"}
                </h4>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                  {filterTab === "used"
                    ? "You haven't used any vouchers yet."
                    : "There are currently no active vouchers in this category. Used vouchers are automatically cleared!"}
                </p>
              </div>
            ) : (
              displayedVouchers.map((voucher) => {
                const expired = isVoucherExpired(voucher);
                const isAssignedToUser = !!(currentUser && voucher.assignedUserIds?.includes(currentUser.uid));
                const hasReachedTotalLimit = voucher.maxUses > 0 && (voucher.currentUses || 0) >= voucher.maxUses;
                
                const userUsage = currentUser?.uid
                  ? (voucher.userUsageCount?.[currentUser.uid] ?? (voucher.usedUserIds?.includes(currentUser.uid) ? 1 : 0))
                  : 0;
                const perUserLimit = voucher.perUserLimit !== undefined && voucher.perUserLimit > 0 ? voucher.perUserLimit : 1;
                const hasReachedUserLimit = currentUser ? userUsage >= perUserLimit : false;

                const eligibility = canUserUseVoucher(voucher, currentUser?.uid);
                
                // Can apply in current cart check
                let canApplyNow = false;
                let applyReason = "";
                if (onApplyVoucher) {
                  if (!eligibility.allowed) {
                    applyReason = eligibility.reason || "Not eligible";
                  } else if (voucher.applicableType === "grocery_only" && cartType === "food") {
                    applyReason = "Grocery orders only";
                  } else if (voucher.applicableType === "food_only" && cartType === "grocery") {
                    applyReason = "Food orders only";
                  } else if (voucher.applicableType === "restaurant" && voucher.applicableRestaurant && cartRestaurant && voucher.applicableRestaurant !== cartRestaurant) {
                    applyReason = `Only for ${voucher.applicableRestaurant}`;
                  } else if (cartSubtotal !== undefined && voucher.minOrderAmount && cartSubtotal < voucher.minOrderAmount) {
                    applyReason = `Min order Rs. ${voucher.minOrderAmount} required`;
                  } else {
                    canApplyNow = true;
                  }
                }

                return (
                  <div
                    key={voucher.id || voucher.code}
                    className={`relative rounded-3xl border transition-all overflow-hidden p-4.5 ${
                      expired || hasReachedTotalLimit || hasReachedUserLimit
                        ? "bg-zinc-900/40 border-zinc-800/80 opacity-60"
                        : isAssignedToUser
                        ? "bg-gradient-to-br from-amber-500/10 via-zinc-900 to-zinc-900 border-amber-500/30 shadow-md shadow-amber-500/5"
                        : "bg-gradient-to-br from-[#D70F64]/10 via-zinc-900 to-zinc-900 border-[#D70F64]/20 shadow-md shadow-pink-500/5"
                    }`}
                  >
                    {/* Top Row: Discount & Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                          {isAssignedToUser && (
                            <span className="inline-flex items-center gap-1 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                              <Sparkles className="w-2.5 h-2.5" /> Sent For You
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 bg-zinc-800 border border-zinc-700 text-zinc-300 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                            <UserCheck className="w-2.5 h-2.5 text-[#D70F64]" />
                            {perUserLimit === 1 ? "1 Use Per User" : `${perUserLimit} Uses Per User`}
                          </span>
                          {voucher.maxUses > 0 && (
                            <span className="inline-flex items-center gap-1 bg-zinc-800/80 border border-zinc-700 text-zinc-400 text-[9px] font-bold px-2 py-0.5 rounded-full">
                              👥 {Math.max(0, voucher.maxUses - (voucher.currentUses || 0))} / {voucher.maxUses} users left
                            </span>
                          )}
                        </div>

                        <h4 className="text-lg font-black text-white flex items-baseline gap-2">
                          {voucher.discountType === "percentage" ? (
                            <>
                              <span className="text-[#D70F64]">{voucher.discountValue}% OFF</span>
                              {voucher.maxDiscountAmount ? (
                                <span className="text-xs text-zinc-400 font-semibold">(Up to Rs. {voucher.maxDiscountAmount})</span>
                              ) : null}
                            </>
                          ) : (
                            <span className="text-emerald-400">Rs. {voucher.discountValue} FLAT OFF</span>
                          )}
                        </h4>
                        {voucher.successMessage && (
                          <p className="text-xs text-zinc-300 font-medium mt-0.5">
                            {voucher.successMessage}
                          </p>
                        )}
                      </div>

                      {/* Status Tag */}
                      <div>
                        {expired ? (
                          <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-black uppercase px-2.5 py-1 rounded-full">
                            Expired
                          </span>
                        ) : hasReachedUserLimit ? (
                          <span className="bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[9px] font-black uppercase px-2.5 py-1 rounded-full">
                            Already Used
                          </span>
                        ) : hasReachedTotalLimit ? (
                          <span className="bg-zinc-800 text-zinc-400 text-[9px] font-black uppercase px-2.5 py-1 rounded-full">
                            All Claims Used
                          </span>
                        ) : (
                          <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase px-2.5 py-1 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Code & Copy Box */}
                    <div className="mt-3.5 flex items-center justify-between bg-zinc-950/80 border border-zinc-800 p-2.5 rounded-2xl">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">Code:</span>
                        <span className="font-mono font-black text-sm text-pink-400 tracking-wider">
                          {voucher.code}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopy(voucher.code)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white text-[10px] font-black uppercase tracking-wider transition cursor-pointer border border-zinc-750"
                      >
                        {copiedCode === voucher.code ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Bottom Info Grid */}
                    <div className="mt-3 pt-3 border-t border-zinc-800/80 grid grid-cols-2 gap-2 text-[10.5px] text-zinc-400">
                      <div>
                        <span className="text-zinc-500 font-bold block text-[9px] uppercase">Min Order:</span>
                        <span className="font-extrabold text-zinc-200">
                          {voucher.minOrderAmount ? `Rs. ${voucher.minOrderAmount}` : "No Minimum"}
                        </span>
                      </div>

                      <div>
                        <span className="text-zinc-500 font-bold block text-[9px] uppercase">Applicable On:</span>
                        <span className="font-extrabold text-zinc-200 truncate block">
                          {voucher.applicableType === "grocery_only"
                            ? "🛒 Grocery Only"
                            : voucher.applicableType === "food_only"
                            ? "🍔 Food Only"
                            : voucher.applicableType === "restaurant" && voucher.applicableRestaurant
                            ? `🏪 ${voucher.applicableRestaurant}`
                            : "🌐 All Food & Grocery"}
                        </span>
                      </div>

                      {voucher.expiryDate && (
                        <div className="col-span-2 flex items-center gap-1.5 text-zinc-400 pt-1">
                          <Calendar className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                          <span>
                            Expires: <strong className="text-zinc-200">{new Date(voucher.expiryDate).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quick Apply Button if modal opened in checkout context */}
                    {onApplyVoucher && !expired && !hasReachedTotalLimit && !hasReachedUserLimit && (
                      <div className="mt-3.5 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                        <span className="text-[10px] text-zinc-400 font-medium truncate max-w-[200px]">
                          {canApplyNow ? "Ready to apply to your cart!" : applyReason}
                        </span>
                        <button
                          disabled={!canApplyNow}
                          onClick={() => {
                            onApplyVoucher(voucher);
                            onClose();
                          }}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
                            canApplyNow
                              ? "bg-[#D70F64] hover:bg-[#b00c50] text-white shadow-sm"
                              : "bg-zinc-800 text-zinc-500 opacity-60 cursor-not-allowed"
                          }`}
                        >
                          <span>Apply Voucher</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-zinc-400 font-semibold">
              💡 Copy code or tap apply at checkout
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
