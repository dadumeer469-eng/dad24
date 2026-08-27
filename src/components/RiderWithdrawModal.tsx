import React, { useState } from "react";
import { 
  X, Wallet, ArrowRight, CheckCircle2, AlertCircle, 
  Smartphone, Building2, Banknote, ShieldCheck, Sparkles, Loader2, Coins, Ticket
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { UserProfile, PayoutRequest } from "../types";

interface RiderWithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  withdrawableBalance: number;
  deliveryFeesPortion: number;
  discountSubsidiesPortion: number;
  voucherSubsidies: number;
  coinsSubsidies: number;
  unsettledOrdersCount: number;
  onSuccess?: () => void;
}

type PaymentMethodType = "easypaisa" | "jazzcash" | "sadapay" | "nayapay" | "bank" | "cash";

const POPULAR_BANKS = [
  "Meezan Bank",
  "Habib Bank Limited (HBL)",
  "United Bank Limited (UBL)",
  "MCB Bank",
  "Bank Alfalah",
  "Allied Bank (ABL)",
  "Askari Bank",
  "National Bank of Pakistan (NBP)",
  "Faysal Bank",
  "Bank of Punjab (BOP)",
  "JS Bank",
  "Standard Chartered",
  "Soneri Bank",
  "Dubai Islamic Bank",
  "Other Bank",
];

export default function RiderWithdrawModal({
  isOpen,
  onClose,
  currentUser,
  withdrawableBalance,
  deliveryFeesPortion,
  discountSubsidiesPortion,
  voucherSubsidies,
  coinsSubsidies,
  unsettledOrdersCount,
  onSuccess,
}: RiderWithdrawModalProps) {
  const [amount, setAmount] = useState<string>(String(withdrawableBalance || ""));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("easypaisa");
  const [accountNumber, setAccountNumber] = useState<string>(currentUser.phone || "");
  const [accountTitle, setAccountTitle] = useState<string>(currentUser.name || "");
  const [bankName, setBankName] = useState<string>("Meezan Bank");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [createdRequestId, setCreatedRequestId] = useState<string>("");

  // Sync default amount when opening or when balance changes
  React.useEffect(() => {
    if (isOpen) {
      setAmount(withdrawableBalance > 0 ? String(withdrawableBalance) : "");
      setAccountNumber(currentUser.phone || "");
      setAccountTitle(currentUser.name || "");
      setErrorMsg(null);
      setIsSuccess(false);
      setCreatedRequestId("");
    }
  }, [isOpen, withdrawableBalance, currentUser]);

  if (!isOpen) return null;

  const parsedAmount = Number(amount) || 0;
  const remainingBalance = Math.max(0, withdrawableBalance - parsedAmount);

  const handleSetQuickAmount = (val: number) => {
    const safeVal = Math.min(val, withdrawableBalance);
    setAmount(String(safeVal));
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (withdrawableBalance <= 0) {
      setErrorMsg("Aapke paas koi pending withdrawable balance mojood nahi hai.");
      return;
    }

    if (parsedAmount <= 0) {
      setErrorMsg("Barahe karam nikalwane ki raqam (Withdrawal Amount) darj karein.");
      return;
    }

    if (parsedAmount > withdrawableBalance) {
      setErrorMsg(`Aap zyada se zyada Rs. ${withdrawableBalance} withdraw kar sakte hain.`);
      return;
    }

    if (paymentMethod !== "cash") {
      if (!accountNumber.trim()) {
        setErrorMsg("Barahe karam apna Account / Mobile Number darj karein.");
        return;
      }
      if (!accountTitle.trim()) {
        setErrorMsg("Barahe karam Account Holder ka Name darj karein.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Calculate proportional breakdown
      const ratio = withdrawableBalance > 0 ? parsedAmount / withdrawableBalance : 1;
      const feesPortion = Math.round(deliveryFeesPortion * ratio);
      const discountPortion = parsedAmount - feesPortion;

      const payoutData: PayoutRequest = {
        riderId: currentUser.uid,
        riderName: currentUser.name || "Rider",
        riderPhone: currentUser.phone || "",
        amount: parsedAmount,
        deliveryFeesPortion: feesPortion,
        discountSubsidiesPortion: discountPortion,
        paymentMethod: paymentMethod,
        accountNumber: paymentMethod === "cash" ? "Cash At Dadu Office" : accountNumber.trim(),
        accountTitle: paymentMethod === "cash" ? currentUser.name : accountTitle.trim(),
        bankName: paymentMethod === "bank" ? bankName : undefined,
        notes: notes.trim() || undefined,
        status: "pending",
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, "payoutRequests"), payoutData);
      setCreatedRequestId(docRef.id);

      // Create Admin Notification
      await addDoc(collection(db, "notifications"), {
        userId: "admin",
        title: `💸 New Rider Payout Request: Rs. ${parsedAmount}`,
        message: `Rider ${currentUser.name} (${currentUser.phone}) has requested a withdrawal of Rs. ${parsedAmount} via ${paymentMethod.toUpperCase()} (${accountTitle} - ${accountNumber}). Unsettled deliveries: ${unsettledOrdersCount}.`,
        createdAt: Timestamp.now(),
        read: false,
      }).catch((err) => console.warn("Admin notification write skipped:", err));

      // Create Rider Notification
      await addDoc(collection(db, "notifications"), {
        userId: currentUser.uid,
        title: "📤 Payout Request Submitted",
        message: `Aapki Rs. ${parsedAmount} ki payout request (${paymentMethod.toUpperCase()}) successfully submit ho chuki hai. Admin verification ke baad payment release karega.`,
        createdAt: Timestamp.now(),
        read: false,
      }).catch((err) => console.warn("Rider notification write skipped:", err));

      setIsSuccess(true);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error("Payout submission error:", err);
      setErrorMsg("Payout request submit karne me masla pesh aya. Barahe karam dobara koshish karein.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div 
        id="rider-withdraw-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative my-auto text-zinc-100"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#D70F64] via-pink-600 to-rose-700 p-5 text-white relative">
            <button
              onClick={onClose}
              id="rider-withdraw-close-btn"
              className="absolute top-4 right-4 bg-black/30 hover:bg-black/50 text-white p-1.5 rounded-full transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 shrink-0">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-pink-100 block">
                  Rider Payout & Withdrawal
                </span>
                <h2 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
                  Kamaee Nikalwayein (Withdraw)
                </h2>
              </div>
            </div>

            {/* Quick Balance Preview Ribbon */}
            <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-pink-100 font-bold uppercase tracking-wider block">
                  Available Withdrawable Balance
                </span>
                <span className="text-2xl sm:text-3xl font-black text-white font-mono font-sans">
                  Rs. {withdrawableBalance}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-pink-100 font-bold uppercase tracking-wider block">
                  Unsettled Runs
                </span>
                <span className="text-sm font-black bg-white/20 px-2.5 py-1 rounded-xl inline-block mt-0.5">
                  {unsettledOrdersCount} Completed Runs
                </span>
              </div>
            </div>
          </div>

          {/* Success Screen */}
          {isSuccess ? (
            <div className="p-6 text-center space-y-5">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-black text-white">
                  Payout Request Successfully Submitted!
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Aapki <strong className="text-emerald-400 font-bold">Rs. {parsedAmount}</strong> ki withdrawal request admin ke pass verification ke liye bhej di gayi hai.
                </p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-zinc-850">
                  <span className="text-zinc-400">Payment Channel:</span>
                  <span className="font-bold text-white uppercase">{paymentMethod}</span>
                </div>
                {paymentMethod !== "cash" && (
                  <>
                    <div className="flex justify-between py-1 border-b border-zinc-850">
                      <span className="text-zinc-400">Account Number:</span>
                      <span className="font-bold text-white font-mono">{accountNumber}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-zinc-850">
                      <span className="text-zinc-400">Account Title:</span>
                      <span className="font-bold text-white">{accountTitle}</span>
                    </div>
                  </>
                )}
                {paymentMethod === "bank" && (
                  <div className="flex justify-between py-1 border-b border-zinc-850">
                    <span className="text-zinc-400">Bank:</span>
                    <span className="font-bold text-white">{bankName}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-zinc-850">
                  <span className="text-zinc-400">Delivery Fees:</span>
                  <span className="font-bold text-emerald-400">Rs. {Math.round(deliveryFeesPortion * (withdrawableBalance > 0 ? parsedAmount / withdrawableBalance : 1))}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">Customer Discount Subsidy:</span>
                  <span className="font-bold text-amber-400">Rs. {parsedAmount - Math.round(deliveryFeesPortion * (withdrawableBalance > 0 ? parsedAmount / withdrawableBalance : 1))}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-pink-950/40 border border-pink-500/20 p-3 rounded-xl text-left text-[11px] text-pink-200">
                <Sparkles className="w-4 h-4 text-pink-400 shrink-0" />
                <span>Admin aam tour par 2 se 12 ghanton ke andar payment release aur verify kar deta hai.</span>
              </div>

              <button
                onClick={onClose}
                id="rider-withdraw-success-close-btn"
                className="w-full py-3.5 px-4 bg-[#D70F64] hover:bg-pink-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition cursor-pointer shadow-lg active:scale-98"
              >
                Theek Hai / Back to Panel
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
              
              {/* Earnings Breakdown Mini Card */}
              <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Included in This Balance:</span>
                  </span>
                  <span className="text-zinc-500 text-[10px]">100% Guaranteed</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-zinc-900/90 border border-emerald-500/20 p-2.5 rounded-xl">
                    <span className="text-[9.5px] uppercase font-bold text-emerald-400 block">🚲 Delivery Fees</span>
                    <span className="text-base font-black text-white font-mono block mt-0.5">Rs. {deliveryFeesPortion}</span>
                    <span className="text-[9px] text-zinc-400">Rider Base Charges</span>
                  </div>

                  <div className="bg-zinc-900/90 border border-amber-500/20 p-2.5 rounded-xl">
                    <span className="text-[9.5px] uppercase font-bold text-amber-400 block">🎟️ Customer Discounts</span>
                    <span className="text-base font-black text-amber-300 font-mono block mt-0.5">Rs. {discountSubsidiesPortion}</span>
                    <span className="text-[9px] text-zinc-400">Voucher + Coins Subsidy</span>
                  </div>
                </div>

                <div className="text-[10px] text-zinc-400 bg-zinc-900/50 p-2 rounded-lg flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Ticket className="w-3 h-3 text-amber-400" /> Voucher: Rs. {voucherSubsidies}
                  </span>
                  <span className="flex items-center gap-1">
                    <Coins className="w-3 h-3 text-amber-400" /> Coins: Rs. {coinsSubsidies}
                  </span>
                  <span className="text-emerald-400 font-bold">Admin Payable</span>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="withdraw-amount-input" className="text-xs font-black uppercase tracking-wider text-zinc-300">
                    Withdrawal Amount (Rs.)
                  </label>
                  {withdrawableBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => handleSetQuickAmount(withdrawableBalance)}
                      className="text-[10px] font-black uppercase tracking-wider text-[#D70F64] hover:text-pink-400 cursor-pointer"
                    >
                      Puri Raqam Nikalwayein (Rs. {withdrawableBalance})
                    </button>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-zinc-400">
                    Rs.
                  </span>
                  <input
                    id="withdraw-amount-input"
                    type="number"
                    min="1"
                    max={withdrawableBalance}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount (e.g. 500)"
                    disabled={withdrawableBalance <= 0}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64] rounded-2xl pl-12 pr-4 py-3 text-base font-black text-white placeholder-zinc-600 outline-none transition disabled:opacity-50"
                  />
                </div>

                {/* Quick amount chips */}
                {withdrawableBalance > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      { label: "Max", val: withdrawableBalance },
                      { label: "Rs. 500", val: 500 },
                      { label: "Rs. 1,000", val: 1000 },
                      { label: "Rs. 2,000", val: 2000 },
                    ]
                      .filter((c) => c.val <= withdrawableBalance)
                      .map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSetQuickAmount(chip.val)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition cursor-pointer active:scale-95"
                        >
                          {chip.label}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-zinc-300 block">
                  Select Payout Channel (Kahan transfer chahiye?)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "easypaisa", name: "EasyPaisa", icon: Smartphone, color: "hover:border-emerald-500", active: "bg-emerald-950/40 border-emerald-500 text-emerald-300" },
                    { id: "jazzcash", name: "JazzCash", icon: Smartphone, color: "hover:border-red-500", active: "bg-red-950/40 border-red-500 text-red-300" },
                    { id: "sadapay", name: "SadaPay", icon: Smartphone, color: "hover:border-cyan-500", active: "bg-cyan-950/40 border-cyan-500 text-cyan-300" },
                    { id: "nayapay", name: "NayaPay", icon: Smartphone, color: "hover:border-orange-500", active: "bg-orange-950/40 border-orange-500 text-orange-300" },
                    { id: "bank", name: "Bank Transfer", icon: Building2, color: "hover:border-indigo-500", active: "bg-indigo-950/40 border-indigo-500 text-indigo-300" },
                    { id: "cash", name: "Cash (Office)", icon: Banknote, color: "hover:border-amber-500", active: "bg-amber-950/40 border-amber-500 text-amber-300" },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as PaymentMethodType)}
                        className={`p-2.5 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          isSelected
                            ? `${m.active} ring-1`
                            : `bg-zinc-950/60 border-zinc-800 text-zinc-400 ${m.color} hover:text-zinc-200`
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[10px] font-bold tracking-tight">{m.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Account Details Form */}
              {paymentMethod !== "cash" && (
                <div className="space-y-3 bg-zinc-950/60 border border-zinc-800/80 p-3.5 rounded-2xl">
                  {paymentMethod === "bank" && (
                    <div>
                      <label htmlFor="bank-select" className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                        Bank Name
                      </label>
                      <select
                        id="bank-select"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#D70F64] rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                      >
                        {POPULAR_BANKS.map((b, i) => (
                          <option key={i} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="account-num-input" className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                        {paymentMethod === "bank" ? "Account / IBAN Number" : "Mobile / Account Number"}
                      </label>
                      <input
                        id="account-num-input"
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder={paymentMethod === "bank" ? "PK00XXXX..." : "03XXXXXXXXX"}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#D70F64] rounded-xl px-3 py-2 text-xs font-bold text-white placeholder-zinc-600 outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label htmlFor="account-title-input" className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                        Account Title (Name on Account)
                      </label>
                      <input
                        id="account-title-input"
                        type="text"
                        value={accountTitle}
                        onChange={(e) => setAccountTitle(e.target.value)}
                        placeholder="e.g. Muhammad Ali"
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#D70F64] rounded-xl px-3 py-2 text-xs font-bold text-white placeholder-zinc-600 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === "cash" && (
                <div className="bg-amber-950/30 border border-amber-500/30 p-3.5 rounded-2xl text-xs text-amber-200/90 flex items-start gap-2.5">
                  <Banknote className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-black">Dadu Office Cash Collection</strong>
                    Aapki request approve hone par aap Dadu24#7 Main Hub Office se hand-to-hand cash payout receive kar sakte hain.
                  </div>
                </div>
              )}

              {/* Optional Notes */}
              <div>
                <label htmlFor="withdraw-notes-input" className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Optional Notes (Admin ke liye koi paigham)
                </label>
                <input
                  id="withdraw-notes-input"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Urgent payout / Daily settlement"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-[#D70F64] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 outline-none"
                />
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="bg-red-950/60 border border-red-500/40 p-3 rounded-xl flex items-center gap-2 text-xs text-red-200 animate-shake">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-2xl transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  id="rider-submit-withdraw-btn"
                  disabled={isSubmitting || withdrawableBalance <= 0 || parsedAmount <= 0}
                  className="flex-2 py-3 px-4 bg-[#D70F64] hover:bg-pink-600 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition cursor-pointer shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2 active:scale-98"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Payout Request (Rs. {parsedAmount || 0})</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
