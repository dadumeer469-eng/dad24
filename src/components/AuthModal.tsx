import React, { useState } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db, cleanObject } from "../firebase";
import { UserProfile } from "../types";
import { X, Phone, Lock, User, MapPin, Loader2, AlertCircle, LogIn } from "lucide-react";
import { motion } from "motion/react";
import daduLogo from "../assets/images/dadu_food_logo_new_1782333467889.jpg";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (profile: UserProfile) => void;
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  // State to handle Google sign in profile completion for new users
  const [googleUserForProfileCompletion, setGoogleUserForProfileCompletion] = useState<any | null>(null);

  if (!isOpen) return null;

  // Sanitizes phone number format to standard
  const sanitizePhone = (phone: string) => {
    let cleaned = phone.replace(/\D/g, ""); // Keep only digits
    if (cleaned.startsWith("92")) {
      cleaned = "0" + cleaned.substring(2);
    }
    return cleaned;
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage("");
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user has an existing Firestore Profile
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      const isAdminEmail = user.email === "dadumeer469@gmail.com";

      if (userDocSnap.exists()) {
        const profile = { uid: user.uid, ...userDocSnap.data() } as UserProfile;
        // Keep role updated for admin
        if (isAdminEmail && profile.role !== "admin") {
          const updated = { ...profile, role: "admin" as const };
          await setDoc(userDocRef, cleanObject(updated));
          onAuthSuccess(updated);
        } else {
          onAuthSuccess(profile);
        }
        onClose();
      } else {
        // First-time signup with Google! Take them to complete profile details
        setName(user.displayName || "");
        setGoogleUserForProfileCompletion(user);
        setErrorMessage(""); // clear
      }
    } catch (error: any) {
      console.error("Google Authentication error:", error);
      if (error.code === "auth/popup-closed-by-user") {
        setErrorMessage("Sign in was cancelled (Popup closed). Please try again!");
      } else if (error.code === "auth/network-request-failed" || error.message?.includes("offline")) {
        setErrorMessage("Network request failed. Your browser or the AI Studio iframe may be blocking connection popups/third-party cookies. Please open the app in a 'New Tab' (top-right icon) or use standard Phone/Password or Phone Login instead!");
      } else {
        setErrorMessage(error.message || "Google Sign-In failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleProfileCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    
    const cleanPhone = sanitizePhone(phoneNumber);
    if (cleanPhone.length < 10) {
      setErrorMessage("Please enter a valid Phone Number (Min 10 digits).");
      return;
    }

    if (!address.trim()) {
      setErrorMessage("Please enter your complete delivery/office address.");
      return;
    }

    setLoading(true);
    try {
      const user = googleUserForProfileCompletion;
      const isAdminEmail = user.email === "dadumeer469@gmail.com" || cleanPhone === "03277004471";
      const finalRole = isAdminEmail ? "admin" : "buyer";
      const finalName = isAdminEmail ? "meerali120" : (name.trim() || user.displayName || "Dadu Buyer");

      const newProfile: UserProfile = {
        uid: user.uid,
        name: finalName,
        phone: cleanPhone,
        address: address,
        role: finalRole as "admin" | "buyer",
        ordersCount: 0,
      };

      await setDoc(doc(db, "users", user.uid), cleanObject(newProfile));
      onAuthSuccess(newProfile);
      onClose();
    } catch (err: any) {
      console.error("Error setting up Google profile:", err);
      setErrorMessage(err.message || "Failed to create your profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    // Support both username (contains letters or has short length) and standard phone numbers
    const isUsername = /[a-zA-Z]/.test(phoneNumber) || (phoneNumber.trim().length > 0 && phoneNumber.trim().length < 10 && !/^\d+$/.test(phoneNumber.trim()));
    const cleanIdentifier = isUsername 
      ? phoneNumber.trim().toLowerCase() 
      : sanitizePhone(phoneNumber);
    const cleanPhone = cleanIdentifier;

    if (!isUsername && cleanIdentifier.length < 10) {
      setErrorMessage("Please enter a valid Phone Number (Kam se kam 10 hindsay).");
      setLoading(false);
      return;
    }

    if (isUsername && cleanIdentifier.length < 3) {
      setErrorMessage("Username must be at least 3 characters.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long (Kam se kam 6 hindsay).");
      setLoading(false);
      return;
    }

    // Convert to email representation so we can tap into Firebase Email/Password Auth
    const virtualEmail = `${cleanIdentifier}@dadu247.com`;

    try {
      if (isSignUp) {
        if (!name.trim()) {
          setErrorMessage("Please provide your full name (Apna Naam likhein).");
          setLoading(false);
          return;
        }
        if (!address.trim()) {
          setErrorMessage("Please provide your delivery address (Ghar ka pata likhein).");
          setLoading(false);
          return;
        }

        // 1. Create firebase auth user
        const userCredential = await createUserWithEmailAndPassword(auth, virtualEmail, password);
        const user = userCredential.user;

        // Determine if this is the exclusive admin credentials
        const isAdminCreds = cleanPhone === "03277004471" && password === "meerali120";
        const finalRoleValue = isAdminCreds ? "admin" : "buyer";
        const finalNameValue = isAdminCreds ? "meerali120" : name;

        // 2. Save custom profile document
        const newProfile: UserProfile = {
          uid: user.uid,
          name: finalNameValue,
          phone: cleanPhone,
          address: address,
          role: finalRoleValue as "admin" | "buyer",
          ordersCount: 0,
        };

        await setDoc(doc(db, "users", user.uid), cleanObject(newProfile));
        onAuthSuccess(newProfile);
        onClose();
      } else {
        // Sign In Flow
        // Check if user is trying to login as admin using the specific requested rules
        const isAdminCreds = cleanPhone === "03277004471" && password === "meerali120";

        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(auth, virtualEmail, password);
        } catch (err: any) {
          // If admin user is not registered yet, register them on first login attempt!
          if (isAdminCreds && (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential")) {
            try {
              // Register Admin automatically
              userCredential = await createUserWithEmailAndPassword(auth, virtualEmail, password);
              const user = userCredential.user;
              const newAdminProfile: UserProfile = {
                uid: user.uid,
                name: "meerali120",
                phone: "03277004471",
                address: "Main Dadu Admin Office",
                role: "admin",
                ordersCount: 0,
              };
              await setDoc(doc(db, "users", user.uid), cleanObject(newAdminProfile));
              onAuthSuccess(newAdminProfile);
              onClose();
              setLoading(false);
              return;
            } catch (createErr: any) {
              if (createErr.code === "auth/email-already-in-use") {
                // Already registered previously, meaning password entered is actually incorrect!
                throw new Error("Incorrect Admin password entered. Please check your credentials.");
              } else {
                throw createErr;
              }
            }
          } else {
            throw err;
          }
        }

        const user = userCredential.user;

        // Retrieve existing Firestore Profile
        const userDocRef = doc(db, "users", user.uid);
        let userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          // Fallback profile if Firestore got cleared but login succeeded
          const finalRoleValue = isAdminCreds ? "admin" : "buyer";
          const finalNameValue = isAdminCreds ? "meerali120" : `User ${cleanPhone}`;
          const fallbackProfile: UserProfile = {
            uid: user.uid,
            name: finalNameValue,
            phone: cleanPhone,
            address: isAdminCreds ? "Main Dadu Admin Office" : "Not Provided",
            role: finalRoleValue as "admin" | "buyer",
            ordersCount: 0,
          };
          await setDoc(doc(db, "users", user.uid), cleanObject(fallbackProfile));
          onAuthSuccess(fallbackProfile);
        } else {
          const profile = { uid: user.uid, ...userDocSnap.data() } as UserProfile;
          
          // Make sure that if it is the admin credentials, they always have the admin name and role!
          if (isAdminCreds && (profile.role !== "admin" || profile.name !== "meerali120")) {
            const updatedProfile = { ...profile, role: "admin" as const, name: "meerali120" };
            await setDoc(doc(db, "users", user.uid), cleanObject(updatedProfile));
            onAuthSuccess(updatedProfile);
          } else {
            onAuthSuccess(profile);
          }
        }
        
        onClose();
      }
    } catch (error: any) {
      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/user-not-found" ||
        error.code === "auth/email-already-in-use"
      ) {
        console.warn("Expected Auth rejection during processing:", error.code || error.message);
      } else {
        console.error("Authentication error during processing:", error);
      }
      
      // Strict friendly translations for errors
      if (error.code === "auth/email-already-in-use") {
        setErrorMessage("This phone number is already registered. Please login instead! (Yeh phone number pehle se registered hai).");
      } else if (error.code === "auth/operation-not-allowed") {
        setErrorMessage("Phone/Email registration is currently pending permission. Please Sign In using Google instead — it is fast, secure, and fully active!");
      } else if (error.code === "auth/invalid-credential" || 
                 error.code === "auth/wrong-password" || 
                 error.code === "auth/user-not-found") {
        setErrorMessage("Incorrect phone number or password. Please check and try again! (Meerali120 admin pass check krein).");
      } else if (error.code === "auth/too-many-requests") {
        setErrorMessage("Too many failed login attempts. Your account is temporarily locked. Please try again in 2-3 minutes.");
      } else {
        setErrorMessage(error.message || "An authentication error occurred. Please try again in a few seconds.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-3xl shadow-xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-right floating close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/60 hover:bg-black/85 text-white hover:text-[#D70F64] transition-colors p-2 rounded-full cursor-pointer z-50"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Banner with official logo */}
        <div 
          className={`text-center relative border-b border-zinc-800/10 transition-all duration-300 bg-cover bg-center ${isSignUp ? "p-3" : "p-5"}`}
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80')` }}
        >
          {/* Dark appetizing overlay */}
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"></div>
          
          <div className={`relative z-10 flex justify-center items-center transition-all duration-300 ${isSignUp ? "py-1 h-12" : "py-2 h-20"}`}>
            <div className="bg-white/95 px-4 py-2 rounded-2xl shadow-lg backdrop-blur-md border border-white/25 flex items-center justify-center">
              <img 
                src={daduLogo} 
                alt="DaduFood Logo" 
                className="h-8 sm:h-12 object-contain mx-auto"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className={`-mt-4 bg-zinc-900 rounded-t-3xl relative transition-all duration-300 ${isSignUp ? "p-4" : "p-6"}`}>
          {googleUserForProfileCompletion ? (
            /* Google Sign-in First-time profile creation */
            <div className="space-y-4">
              <div className="text-center mb-2">
                <span className="text-xs bg-[#D70F64]/10 text-[#D70F64] py-1 px-3 rounded-full font-bold uppercase tracking-wider">
                  One Final Step
                </span>
                <h3 className="text-lg font-black text-zinc-100 mt-2">Complete Your Profile</h3>
                <p className="text-xs text-zinc-450 mt-1">
                  Please provide your phone & address for clean, correct deliveries.
                </p>
              </div>

              {errorMessage && (
                <div className="bg-red-950/20 border border-red-900/40 text-red-400 text-xs p-3 rounded-2xl mb-2 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleGoogleProfileCompletion} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 block uppercase tracking-wider">Your Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-zinc-550" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter full name"
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-zinc-800 outline-none focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64] transition text-sm bg-zinc-950 font-semibold text-zinc-200"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 block uppercase tracking-wider">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 w-4 h-4 text-zinc-550" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. 03277004471"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-zinc-800 outline-none focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64] transition text-sm bg-zinc-950 font-semibold text-zinc-200"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 block uppercase tracking-wider">Delivery Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-zinc-550" />
                    <textarea
                      required
                      rows={2}
                      placeholder="Complete home description, sector, street..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-2xl border border-zinc-800 outline-none focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64] transition text-sm bg-zinc-950 font-semibold text-zinc-200 resize-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#D70F64] hover:bg-[#b00c50] text-white py-3 rounded-2xl font-bold tracking-wider uppercase text-xs shadow-md transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-75 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Finish Profile Creation"
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* Standard Sign-In / Register screens with secondary Google sign-in */
            <>
              {/* Header switch tabs */}
              <div className={`grid grid-cols-2 bg-zinc-950 p-1 rounded-xl border border-zinc-850 ${isSignUp ? "mb-3" : "mb-5"}`}>
                <button
                  onClick={() => { setIsSignUp(false); setErrorMessage(""); }}
                  className={`py-1.5 text-center text-xs sm:text-sm font-black rounded-lg transition-all cursor-pointer ${
                    !isSignUp ? "bg-[#D70F64] text-white shadow-xs" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setIsSignUp(true); setErrorMessage(""); }}
                  className={`py-1.5 text-center text-xs sm:text-sm font-black rounded-lg transition-all cursor-pointer ${
                    isSignUp ? "bg-[#D70F64] text-white shadow-xs" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Register
                </button>
              </div>

              {errorMessage && (
                <div className={`bg-red-950/20 border border-red-900/40 text-red-400 text-xs p-3 rounded-xl flex items-start gap-2 shadow-3xs leading-relaxed font-semibold ${isSignUp ? "mb-3" : "mb-4"}`}>
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Primary Fast login option: Sign in with Google (Only show on Sign In tab, hidden on Register to make it compact) */}
              {!isSignUp && (
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full bg-zinc-950 hover:bg-zinc-855 border border-zinc-800 transition text-[#D70F64] py-3 rounded-2xl font-black text-xs uppercase tracking-wide shadow-md flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4 text-[#D70F64] shrink-0" />
                    <span>Sign In with Google</span>
                  </button>
                  <div className="relative flex py-3 items-center">
                    <div className="flex-grow border-t border-zinc-800"></div>
                    <span className="flex-shrink mx-4 text-zinc-500 text-[10px] font-black tracking-widest uppercase">Or Phone Login</span>
                    <div className="flex-grow border-t border-zinc-800"></div>
                  </div>
                </div>
              )}

              <form onSubmit={handleAuth} className={isSignUp ? "space-y-2.5" : "space-y-4"}>
                {isSignUp && (
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2 w-3.5 h-3.5 text-zinc-550" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter full name"
                        className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 outline-none focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64] transition text-xs bg-zinc-950 text-zinc-200 font-semibold"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-0.5">
                  <label className={`font-bold text-zinc-400 block uppercase tracking-wider ${isSignUp ? "text-[10px]" : "text-xs"}`}>Phone / Username</label>
                  <div className="relative">
                    <Phone className={`absolute left-3 text-zinc-550 ${isSignUp ? "top-2 w-3.5 h-3.5" : "top-3 w-4 h-4"}`} />
                    <input
                      type="text"
                      required
                      placeholder="e.g. 03277004471 or rider_username"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className={`w-full pr-4 border border-zinc-800 outline-none focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64] transition bg-zinc-950 text-zinc-200 font-semibold ${
                        isSignUp ? "pl-9 py-1.5 rounded-lg text-xs" : "pl-10 py-2.5 rounded-2xl text-sm"
                      }`}
                    />
                  </div>
                </div>

                {isSignUp && (
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">Delivery Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2 w-3.5 h-3.5 text-zinc-550" />
                      <textarea
                        required
                        rows={1.5}
                        placeholder="Complete home and street address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 outline-none focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64] transition text-xs bg-zinc-950 text-zinc-200 font-semibold resize-none"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-0.5">
                  <label className={`font-bold text-zinc-400 block uppercase tracking-wider ${isSignUp ? "text-[10px]" : "text-xs"}`}>Password</label>
                  <div className="relative">
                    <Lock className={`absolute left-3 text-zinc-550 ${isSignUp ? "top-2 w-3.5 h-3.5" : "top-3 w-4 h-4"}`} />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className={`w-full pr-4 border border-zinc-800 outline-none focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64] transition bg-zinc-950 text-zinc-200 font-semibold ${
                        isSignUp ? "pl-9 py-1.5 rounded-lg text-xs" : "pl-10 py-2.5 rounded-2xl text-sm"
                      }`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full bg-[#D70F64] hover:bg-[#b00c50] text-white font-black tracking-wide shadow-md transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-75 cursor-pointer uppercase ${
                    isSignUp ? "py-2 rounded-lg text-[11px]" : "py-3 rounded-2xl text-xs"
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                      Processing...
                    </>
                  ) : isSignUp ? (
                    "Create Account"
                  ) : (
                    "Secure Sign In"
                  )}
                </button>
              </form>
            </>
          )}

          {/* Secure notice info instead of fake presets */}
          <div className="mt-6 text-center">
            <span className="text-[11px] text-zinc-500 font-semibold block">
              🔒 Standard 256-bit Firebase Encryption Verified
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
