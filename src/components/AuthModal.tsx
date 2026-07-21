import React, { useState } from "react";
import { motion } from "motion/react";
import { X, Phone, Loader2, ArrowRight, UserCog, Key } from "lucide-react";
import daduLogo from "../assets/images/dadu_food_logo_new_1782333467889.jpg";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (phoneNumber: string, isStaffMode?: boolean, password?: string) => Promise<void> | void;
  onRequestLocation?: () => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  onRequestLocation,
}: AuthModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isStaffMode, setIsStaffMode] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanPhone = phoneNumber.trim();
    if (!isStaffMode) {
      if (!/^03\d{9}$/.test(cleanPhone)) {
        setError("Please enter a valid 11-digit mobile number starting with 03.");
        return;
      }
    } else {
      if (cleanPhone.length === 0) {
        setError("Please enter your Phone Number or Username.");
        return;
      }
    }

    if (isStaffMode && password.length < 4) {
      setError("Please enter a valid passcode.");
      return;
    }

    setLoading(true);
    try {
      await onAuthSuccess(cleanPhone, isStaffMode, password);
    } catch (err: any) {
      setError(err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-sm bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-800"
      >
        <button
          type="button"
          onClick={() => {
            setIsStaffMode(!isStaffMode);
            setPhoneNumber("");
            setPassword("");
            setError("");
          }}
          className="absolute top-4 left-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full z-10 transition-colors"
          title="Staff Login"
        >
          <UserCog className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full z-10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="bg-[#D70F64] p-6 text-center">
          <img
            src={daduLogo}
            alt="Dadu Food Logo"
            className="w-16 h-16 rounded-2xl mx-auto shadow-xl border-2 border-white/20 mb-3 object-cover"
          />
          <h2 className="text-2xl font-black text-white tracking-tight">
            {isStaffMode ? "Staff Login" : "Apna Number Dalein"}
          </h2>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-pink-950/30 border border-pink-900/50 text-pink-400 text-xs p-3.5 rounded-2xl font-semibold text-center flex flex-col items-center justify-center gap-2.5">
                <span>{error}</span>
                {onRequestLocation && (error.toLowerCase().includes("location") || error.toLowerCase().includes("gps")) && (
                  <button
                    type="button"
                    onClick={() => {
                      onRequestLocation();
                      setError(""); // Clear error to allow retry
                    }}
                    className="bg-[#D70F64] hover:bg-[#b00c50] text-white px-3 py-2 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-md"
                  >
                    📍 Location Access Allow Karein
                  </button>
                )}
              </div>
            )}
            <div className="space-y-3">
              <div className="relative">
                <Phone className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />
                <input
                  type={isStaffMode ? "text" : "tel"}
                  inputMode={isStaffMode ? "text" : "numeric"}
                  required
                  placeholder={isStaffMode ? "Phone or Username" : "03XX-XXXXXXX"}
                  value={phoneNumber}
                  onChange={(e) => {
                    if (isStaffMode) {
                      setPhoneNumber(e.target.value);
                    } else {
                      const val = e.target.value.replace(/\D/g, "");
                      setPhoneNumber(val.slice(0, 11));
                    }
                  }}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-zinc-700 outline-none focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64] transition bg-zinc-950 text-zinc-100 font-bold text-lg"
                />
              </div>

              {isStaffMode && (
                <div className="relative animate-in fade-in zoom-in duration-200">
                  <Key className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />
                  <input
                    type="password"
                    required
                    placeholder="Enter Passcode"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-zinc-700 outline-none focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64] transition bg-zinc-950 text-zinc-100 font-bold text-lg"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || (!isStaffMode && phoneNumber.length < 11) || phoneNumber.trim().length === 0 || (isStaffMode && password.length < 4)}
              className="w-full bg-[#D70F64] hover:bg-[#b00c50] text-white font-black tracking-wide shadow-md transition-all flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm uppercase disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isStaffMode ? "Login" : "Aage Badhein"} <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
