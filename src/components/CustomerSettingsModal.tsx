import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { springSmooth } from "../utils/motion";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { X, User, MapPin, CreditCard, Bell, Globe, Plus, Trash2, Check, Save } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { UserProfile } from "../types";
import { getSavedAddresses, saveRecentAddress, removeSavedAddress, SavedAddressEntry } from "../utils/savedAddresses";

interface CustomerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onUserUpdated: (updated: UserProfile) => void;
  language: "en" | "ur";
  onLanguageChange: (lang: "en" | "ur") => void;
}

type SettingsTab = "profile" | "addresses" | "payments" | "notifications" | "language";

const PAYMENT_OPTIONS = [
  { id: "COD", label: "Cash on Delivery (COD)", desc: "Pay cash at your doorstep when your order arrives." },
  {
    id: "Easypaisa",
    label: "Easypaisa (Ghulam Murtaza · 03277004471)",
    desc: "Transfer via Easypaisa and upload your receipt at checkout.",
  },
];

export const CustomerSettingsModal: React.FC<CustomerSettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserUpdated,
  language,
  onLanguageChange,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Addresses state
  const storageUid = user?.uid || "guest_local";
  const [addresses, setAddresses] = useState<SavedAddressEntry[]>([]);
  const [newLabel, setNewLabel] = useState<SavedAddressEntry["label"]>("Ghar");
  const [newAddress, setNewAddress] = useState("");
  const [newLandmark, setNewLandmark] = useState("");

  // Payment methods state (strictly COD or Easypaisa)
  const [preferredPayment, setPreferredPayment] = useState<string>(() => {
    const saved = localStorage.getItem("dadu_preferred_payment") || user?.preferredPayment || "COD";
    return saved === "Easypaisa" ? "Easypaisa" : "COD";
  });
  const [walletAccount, setWalletAccount] = useState<string>(
    () => localStorage.getItem("dadu_wallet_number") || user?.phone || ""
  );

  // Notification preferences state
  const [notifPrefs, setNotifPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem("dadu_notif_prefs");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return user?.notificationPrefs || { orderChimes: true, smsUpdates: true, promoAlerts: true };
  });

  useEffect(() => {
    if (isOpen) {
      setName(user?.name || "");
      setEmail(user?.email || "");
      setAddresses(getSavedAddresses(storageUid));
      setToast(null);
    }
  }, [isOpen, user, storageUid]);

  // Focus trap + ESC to close (a11y fix 27 Nov 2026). Must sit above the
  // `if (!isOpen) return null` below so the hook order never changes.
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(dialogRef, isOpen, onClose);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const persistUserPatch = async (patch: Partial<UserProfile>, successMsg: string) => {
    setSaving(true);
    try {
      if (user?.uid) {
        await setDoc(doc(db, "users", user.uid), patch, { merge: true });
        onUserUpdated({ ...user, ...patch });
      }
      showToast(successMsg);
    } catch {
      showToast("Saved locally. Sign in to sync across devices.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    localStorage.setItem("dadu_user_name", name.trim());
    await persistUserPatch({ name: name.trim(), email: email.trim() }, "Profile updated successfully!");
  };

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.trim()) return;
    const fullAddr = newLandmark.trim()
      ? `${newAddress.trim()} (Near ${newLandmark.trim()})`
      : newAddress.trim();
    const updated = saveRecentAddress(storageUid, fullAddr, newLabel);
    setAddresses(updated);
    if (user?.uid) {
      setDoc(doc(db, "users", user.uid), { address: fullAddr }, { merge: true }).catch(() => {});
    }
    setNewAddress("");
    setNewLandmark("");
    showToast("Address saved!");
  };

  const handleDeleteAddress = (addrText: string) => {
    const updated = removeSavedAddress(storageUid, addrText);
    setAddresses(updated);
    showToast("Address removed.");
  };

  const handleSavePayment = async () => {
    localStorage.setItem("dadu_preferred_payment", preferredPayment);
    localStorage.setItem("dadu_wallet_number", walletAccount.trim());
    await persistUserPatch(
      { preferredPayment },
      `Default payment set to ${preferredPayment}`
    );
  };

  const handleToggleNotif = async (key: "orderChimes" | "smsUpdates" | "promoAlerts") => {
    const next = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(next);
    localStorage.setItem("dadu_notif_prefs", JSON.stringify(next));
    await persistUserPatch({ notificationPrefs: next }, "Notification preferences updated.");
  };

  const handleSelectLanguage = async (lang: "en" | "ur") => {
    onLanguageChange(lang);
    localStorage.setItem("dadu_language", lang);
    await persistUserPatch(
      { language: lang },
      lang === "ur" ? "Zaban Urdu muntakhib ho gayi." : "Language switched to English."
    );
  };

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
    { id: "profile", label: "My Profile", icon: <User className="w-4 h-4" /> },
    { id: "addresses", label: "Addresses", icon: <MapPin className="w-4 h-4" /> },
    { id: "payments", label: "Payments", icon: <CreditCard className="w-4 h-4" /> },
    { id: "notifications", label: "Alerts", icon: <Bell className="w-4 h-4" /> },
    { id: "language", label: "Language", icon: <Globe className="w-4 h-4" /> },
  ];

  return (
    <div ref={dialogRef} className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-settings-heading"
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={springSmooth}
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 id="customer-settings-heading" className="text-lg font-black text-zinc-900 dark:text-white">Account &amp; Settings</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {user ? `Signed in as ${user.name || user.phone}` : "Manage your local preferences"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-1.5 px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === t.id
                  ? "bg-[#E21B70] text-white shadow-sm"
                  : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {toast && (
          <div className="mx-5 mt-3 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            {toast}
          </div>
        )}

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {activeTab === "profile" && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com (for receipts)"
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 mb-1.5">Verified Mobile Number</label>
                <input
                  type="text"
                  disabled
                  value={user?.phone || "Not signed in"}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E21B70] hover:bg-[#b50c54] text-white font-bold text-sm cursor-pointer disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </form>
          )}

          {activeTab === "addresses" && (
            <div className="space-y-4">
              <div className="space-y-2.5">
                {addresses.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl">
                    No saved Dadu addresses yet. Add your Home or Work address below for 1-tap checkout.
                  </p>
                ) : (
                  addresses.map((addr, idx) => (
                    <div
                      key={`${addr.address}-${idx}`}
                      className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60"
                    >
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded bg-[#E21B70]/15 text-[#E21B70] text-[11px] font-bold mb-1">
                          {addr.label}
                        </span>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">{addr.address}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(addr.address)}
                        aria-label="Delete address"
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddAddress} className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Add New Dadu Address</h3>
                <div className="flex flex-wrap gap-2">
                  {(["Ghar", "Dukan / Office", "Hostel", "Other"] as const).map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setNewLabel(lbl)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                        newLabel === lbl
                          ? "bg-[#E21B70] text-white"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="House / Street / Mohalla (e.g., House 14, Station Road, Dadu)"
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm"
                />
                <input
                  type="text"
                  value={newLandmark}
                  onChange={(e) => setNewLandmark(e.target.value)}
                  placeholder="Nearby Landmark (optional, e.g., Near Civil Hospital)"
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#E21B70] hover:bg-[#b50c54] text-white font-bold text-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Save Address
                </button>
              </form>
            </div>
          )}

          {activeTab === "payments" && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Choose your default payment method for faster checkout on Dadu Food.
              </p>
              <div className="space-y-2.5">
                {PAYMENT_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                      preferredPayment === opt.id
                        ? "border-[#E21B70] bg-[#E21B70]/5 dark:bg-[#E21B70]/10"
                        : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="preferredPayment"
                      checked={preferredPayment === opt.id}
                      onChange={() => setPreferredPayment(opt.id)}
                      className="mt-1 accent-[#E21B70]"
                    />
                    <div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">{opt.label}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              {preferredPayment === "Easypaisa" && (
                <div className="space-y-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-3.5">
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    Easypaisa Account: Ghulam Murtaza · <span className="font-mono">03277004471</span>
                  </p>
                  <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    Your Easypaisa Sender Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={walletAccount}
                    onChange={(e) => setWalletAccount(e.target.value)}
                    placeholder="03XXXXXXXXX"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={handleSavePayment}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D70F64] hover:bg-[#B80C54] text-white font-bold text-sm cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save Payment Preference
              </button>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-3">
              {[
                {
                  key: "orderChimes" as const,
                  title: "Live Order Status Chimes",
                  desc: "Play a subtle sound alert when your order is accepted, cooking, or on the way.",
                },
                {
                  key: "smsUpdates" as const,
                  title: "Order & Rider Updates",
                  desc: "Receive status alerts when your Dadu Food rider arrives near your location.",
                },
                {
                  key: "promoAlerts" as const,
                  title: "Dadu Deals & Vouchers",
                  desc: "Get notified about weekend discounts, free delivery days, and new shops.",
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-4 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60"
                >
                  <div>
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">{item.title}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{item.desc}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(notifPrefs[item.key])}
                    onClick={() => handleToggleNotif(item.key)}
                    className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                      notifPrefs[item.key] ? "bg-[#E21B70]" : "bg-zinc-300 dark:bg-zinc-600"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white shadow absolute top-1 transition-transform ${
                        notifPrefs[item.key] ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === "language" && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Choose your preferred display language for key menus, checkout hints, and FAQs.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSelectLanguage("en")}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-colors ${
                    language === "en"
                      ? "border-[#E21B70] bg-[#E21B70]/10 text-zinc-900 dark:text-white"
                      : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200"
                  }`}
                >
                  <p className="font-black text-base">English</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Default English interface</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectLanguage("ur")}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-colors ${
                    language === "ur"
                      ? "border-[#E21B70] bg-[#E21B70]/10 text-zinc-900 dark:text-white"
                      : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200"
                  }`}
                >
                  <p className="font-black text-base">اردو / Roman Urdu</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Dadu customers ke liye aasan Urdu labels</p>
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
