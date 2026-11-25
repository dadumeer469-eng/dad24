import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { X, Phone, ArrowRight, UserCog, Key, ShieldCheck, RefreshCw, ArrowLeft } from "lucide-react";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { auth } from "../firebase";
import daduLogo from "../assets/images/dadu_food_logo_new_1782333467889.jpg";
import DaduLogoLoader from "./DaduLogoLoader";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (
    phoneNumber: string,
    isStaffMode?: boolean,
    password?: string,
    verifiedFirebaseUid?: string
  ) => Promise<void> | void;
}

declare global {
  interface Window {
    daduRecaptchaVerifier?: RecaptchaVerifier | null;
  }
}

export default function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
}: AuthModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpStep, setOtpStep] = useState<"phone" | "verify">("phone");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [isStaffMode, setIsStaffMode] = useState(false);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  useEffect(() => {
    if (!isOpen) {
      setOtpStep("phone");
      setOtpCode("");
      setConfirmationResult(null);
      setError("");
      setInfoMsg("");
      if (window.daduRecaptchaVerifier) {
        try {
          window.daduRecaptchaVerifier.clear();
        } catch {
          // ignore
        }
        window.daduRecaptchaVerifier = null;
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatPakistanE164 = (localPhone: string): string => {
    const digits = localPhone.replace(/\D/g, "");
    if (digits.startsWith("92") && digits.length === 12) return `+${digits}`;
    if (digits.startsWith("0") && digits.length === 11) return `+92${digits.slice(1)}`;
    return `+92${digits}`;
  };

  const initRecaptcha = (): RecaptchaVerifier => {
    if (window.daduRecaptchaVerifier) {
      try {
        window.daduRecaptchaVerifier.clear();
      } catch {
        // ignore
      }
      window.daduRecaptchaVerifier = null;
    }
    if (recaptchaContainerRef.current) {
      recaptchaContainerRef.current.innerHTML = "";
    }
    const verifier = new RecaptchaVerifier(auth, "dadu-recaptcha-container", {
      size: "invisible",
    });
    window.daduRecaptchaVerifier = verifier;
    return verifier;
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setInfoMsg("");

    const cleanPhone = phoneNumber.trim();
    if (!/^03\d{9}$/.test(cleanPhone)) {
      setError("Please enter a valid 11-digit Pakistani mobile number starting with 03.");
      return;
    }

    setLoading(true);
    try {
      const verifier = initRecaptcha();
      const e164 = formatPakistanE164(cleanPhone);
      const confirmation = await signInWithPhoneNumber(auth, e164, verifier);
      setConfirmationResult(confirmation);
      setOtpStep("verify");
      setResendCooldown(60);
      setInfoMsg(`6-digit SMS verification code sent to ${cleanPhone}.`);
    } catch (err: any) {
      if (window.daduRecaptchaVerifier) {
        try {
          window.daduRecaptchaVerifier.clear();
        } catch {
          // ignore
        }
        window.daduRecaptchaVerifier = null;
      }
      const code = err?.code || "";
      if (code === "auth/operation-not-allowed") {
        setError(
          "SMS OTP Sign-In is not yet enabled in Firebase Console (Authentication → Sign-in method → Phone). Enable Phone Auth to receive live SMS codes."
        );
      } else if (code === "auth/unauthorized-domain") {
        setError(
          "This domain is not authorized for Firebase Phone Auth. Add this domain under Firebase Console → Authentication → Settings → Authorized domains."
        );
      } else if (code === "auth/too-many-requests") {
        setError("Too many OTP attempts. Please wait a few minutes and try again.");
      } else if (code === "auth/invalid-phone-number") {
        setError("Invalid phone number format. Use 03XXXXXXXXX.");
      } else if (code === "auth/captcha-check-failed") {
        setError("reCAPTCHA verification failed. Please tap Send OTP again.");
      } else if (code === "auth/billing-not-enabled" || code === "auth/quota-exceeded") {
        setError(
          "Firebase SMS quota/billing is not enabled on this project yet. Enable Firebase Blaze billing or test phone numbers in Firebase Console."
        );
      } else if (code === "auth/network-request-failed") {
        setError("Network error while sending SMS OTP. Please check your connection and try again.");
      } else {
        setError(err?.message || "Could not send SMS OTP. Please verify Firebase Phone Auth setup.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanCode = otpCode.replace(/\D/g, "").trim();
    if (cleanCode.length !== 6) {
      setError("Please enter the 6-digit OTP sent via SMS.");
      return;
    }
    if (!confirmationResult) {
      setError("OTP session expired. Please request a new code.");
      setOtpStep("phone");
      return;
    }

    setLoading(true);
    try {
      const credential = await confirmationResult.confirm(cleanCode);
      const cleanPhone = phoneNumber.trim();
      await onAuthSuccess(cleanPhone, false, undefined, credential.user.uid);
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/invalid-verification-code") {
        setError("Incorrect 6-digit OTP code. Please check your SMS and try again.");
      } else if (code === "auth/code-expired") {
        setError("This OTP code has expired. Tap Resend OTP to receive a new one.");
      } else {
        setError(err?.message || "OTP verification failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanIdentifier = phoneNumber.trim();
    if (!cleanIdentifier) {
      setError("Please enter your staff email or registered staff phone number.");
      return;
    }
    if (password.length < 4) {
      setError("Please enter your staff password.");
      return;
    }

    setLoading(true);
    try {
      await onAuthSuccess(cleanIdentifier, true, password);
    } catch (err: any) {
      setError(err?.message || "Staff authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800"
      >
        <button
          type="button"
          onClick={() => {
            setIsStaffMode(!isStaffMode);
            setOtpStep("phone");
            setOtpCode("");
            setPhoneNumber("");
            setPassword("");
            setError("");
            setInfoMsg("");
          }}
          className="absolute top-4 left-4 p-2 bg-black/20 hover:bg-black/35 text-white rounded-full z-10 transition-colors cursor-pointer"
          title={isStaffMode ? "Back to Customer Sign-In" : "Staff / Admin Login"}
          aria-label={isStaffMode ? "Switch to customer login" : "Switch to staff login"}
        >
          <UserCog className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sign in dialog"
          className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/35 text-white rounded-full z-10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="bg-[#E21B70] p-6 text-center">
          <img
            src={daduLogo}
            alt="Dadu Food Logo"
            className="w-16 h-16 rounded-2xl mx-auto shadow-xl border-2 border-white/25 mb-3 object-cover"
          />
          <h2 className="text-xl font-black text-white tracking-tight">
            {isStaffMode
              ? "Staff & Admin Login"
              : otpStep === "verify"
              ? "Verify SMS Code"
              : "Sign In with Phone OTP"}
          </h2>
          <p className="text-xs text-white/90 mt-1 font-medium">
            {isStaffMode
              ? "Authorized Dadu Food staff & riders only"
              : otpStep === "verify"
              ? "Enter the 6-digit code sent via SMS"
              : "Real SMS verification keeps your orders safe"}
          </p>
        </div>

        <div className="p-6 sm:p-7 space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs p-3 rounded-xl font-semibold text-center leading-relaxed">
              {error}
            </div>
          )}

          {infoMsg && !error && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs p-3 rounded-xl font-semibold text-center flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{infoMsg}</span>
            </div>
          )}

          {isStaffMode ? (
            <form onSubmit={handleStaffSubmit} className="space-y-4">
              <div className="space-y-3">
                <div className="relative">
                  <Phone className="absolute left-4 top-3.5 w-5 h-5 text-zinc-400" />
                  <input
                    type="text"
                    required
                    placeholder="Staff Email or Phone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-zinc-300 dark:border-zinc-700 outline-none focus:border-[#E21B70] focus:ring-2 focus:ring-[#E21B70]/20 transition bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-bold text-sm"
                  />
                </div>
                <div className="relative">
                  <Key className="absolute left-4 top-3.5 w-5 h-5 text-zinc-400" />
                  <input
                    type="password"
                    required
                    placeholder="Staff Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-zinc-300 dark:border-zinc-700 outline-none focus:border-[#E21B70] focus:ring-2 focus:ring-[#E21B70]/20 transition bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-bold text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !phoneNumber.trim() || password.length < 4}
                className="w-full bg-[#E21B70] hover:bg-[#C2145E] text-white font-black tracking-wide shadow-md transition-all flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm uppercase disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? <DaduLogoLoader compact size="sm" /> : <>Verify &amp; Login <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          ) : otpStep === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="relative">
                <Phone className="absolute left-4 top-3.5 w-5 h-5 text-zinc-400" />
                <input
                  type="tel"
                  inputMode="numeric"
                  required
                  placeholder="03XX-XXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setPhoneNumber(val.slice(0, 11));
                  }}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-zinc-300 dark:border-zinc-700 outline-none focus:border-[#E21B70] focus:ring-2 focus:ring-[#E21B70]/20 transition bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-bold text-lg tracking-wide"
                />
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center">
                We&apos;ll send a 6-digit SMS code via Firebase Phone Auth to verify your number before signing you in.
              </p>
              <button
                type="submit"
                disabled={loading || phoneNumber.length < 11}
                className="w-full bg-[#E21B70] hover:bg-[#C2145E] text-white font-black tracking-wide shadow-md transition-all flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm uppercase disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? <DaduLogoLoader compact size="sm" /> : <>Send SMS OTP <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="relative">
                <ShieldCheck className="absolute left-4 top-3.5 w-5 h-5 text-[#E21B70]" />
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  placeholder="Enter 6-digit OTP"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-zinc-300 dark:border-zinc-700 outline-none focus:border-[#E21B70] focus:ring-2 focus:ring-[#E21B70]/20 transition bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-black text-xl tracking-[0.3em] text-center"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length < 6}
                className="w-full bg-[#E21B70] hover:bg-[#C2145E] text-white font-black tracking-wide shadow-md transition-all flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm uppercase disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? <DaduLogoLoader compact size="sm" /> : <>Verify OTP &amp; Continue <ArrowRight className="w-4 h-4" /></>}
              </button>

              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setOtpStep("phone");
                    setOtpCode("");
                    setError("");
                  }}
                  className="inline-flex items-center gap-1 font-bold text-zinc-600 dark:text-zinc-300 hover:text-[#E21B70] cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Change Number
                </button>
                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={() => handleSendOtp()}
                  className="inline-flex items-center gap-1 font-bold text-[#E21B70] disabled:text-zinc-400 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                </button>
              </div>
            </form>
          )}

          {/* Invisible Firebase reCAPTCHA container */}
          <div id="dadu-recaptcha-container" ref={recaptchaContainerRef} />
        </div>
      </motion.div>
    </div>
  );
}
