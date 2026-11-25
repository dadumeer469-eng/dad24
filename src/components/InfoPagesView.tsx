import React, { useState } from "react";
import { ArrowLeft, CheckCircle2, Clock, MapPin, Phone, Mail, Store, Bike, ShieldCheck, FileText, RefreshCw, Send } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { DADU_FOOD_BUSINESS, InfoPageSlug } from "../utils/seoManager";

interface InfoPagesViewProps {
  page: InfoPageSlug;
  onBack: () => void;
  onNavigate: (slug: InfoPageSlug) => void;
}

export const InfoPagesView: React.FC<InfoPagesViewProps> = ({ page, onBack, onNavigate }) => {
  const [submitting, setSubmitting] = useState(false);
  const [submittedMsg, setSubmittedMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Shared form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [vehicleType, setVehicleType] = useState("Motorbike (70cc / 125cc)");
  const [message, setMessage] = useState("");

  const resetForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setBusinessName("");
    setAddress("");
    setMessage("");
  };

  const handleSubmit = async (e: React.FormEvent, collectionName: string, successText: string) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim() || !phone.trim()) {
      setFormError("Please enter your full name and phone number.");
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, collectionName), {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        businessName: businessName.trim(),
        address: address.trim(),
        vehicleType,
        message: message.trim(),
        city: "Dadu",
        status: "new",
        createdAt: serverTimestamp(),
      });
      setSubmittedMsg(successText);
      resetForm();
    } catch {
      setFormError("Could not submit right now. Please call or WhatsApp 03277004471.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-bold text-[#E21B70] hover:underline mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dadu Food Home
      </button>

      {/* Quick Page Navigation Strip */}
      <nav aria-label="Information pages" className="flex flex-wrap gap-2 mb-6">
        {(
          [
            ["about", "About Us"],
            ["contact", "Contact"],
            ["partner-with-us", "Restaurant Partner"],
            ["become-a-rider", "Become a Rider"],
            ["terms", "Terms"],
            ["privacy-policy", "Privacy"],
            ["refund-policy", "Refund Policy"],
          ] as Array<[InfoPageSlug, string]>
        ).map(([slug, label]) => (
          <button
            key={slug}
            type="button"
            onClick={() => {
              setSubmittedMsg(null);
              setFormError(null);
              onNavigate(slug);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              page === slug
                ? "bg-[#E21B70] text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <article className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        {page === "about" && (
          <>
            <header className="space-y-2 border-b border-zinc-100 dark:border-zinc-800 pb-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#E21B70]">About Dadu Food</p>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
                Dadu City&apos;s Fastest Food &amp; Grocery Delivery Platform
              </h1>
              <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-300 leading-relaxed">
                {DADU_FOOD_BUSINESS.tagline}
              </p>
            </header>

            <section className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">Local Kitchens, Real Prices</h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  We partner directly with trusted Dadu restaurants — from wood-fired pizzas and broast to Sindhi biryani, mutton karahi, and highway karak chai — with transparent menu pricing.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">Fast Doorstep Delivery</h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  Our local Dadu riders deliver hot orders in 20–35 minutes across {DADU_FOOD_BUSINESS.deliveryAreas.join(", ")}.
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Our Delivery &amp; Pricing Commitment</h2>
              <ul className="list-disc pl-5 text-sm text-zinc-600 dark:text-zinc-300 space-y-1.5">
                <li>Standard delivery fee is Rs. {DADU_FOOD_BUSINESS.standardDeliveryFee} across Dadu City.</li>
                <li>Orders below Rs. {DADU_FOOD_BUSINESS.smallOrderThreshold} carry a small-order delivery fee (2x standard fee, Rs. {DADU_FOOD_BUSINESS.standardDeliveryFee * 2}).</li>
                <li>Orders of Rs. {DADU_FOOD_BUSINESS.freeDeliveryThreshold} or more qualify for FREE delivery.</li>
                <li>Pay flexibly with Cash on Delivery (COD) or Easypaisa (Ghulam Murtaza · 03277004471).</li>
              </ul>
            </section>
          </>
        )}

        {page === "terms" && (
          <>
            <header className="space-y-2 border-b border-zinc-100 dark:border-zinc-800 pb-5">
              <div className="flex items-center gap-2 text-[#E21B70] text-xs font-bold uppercase tracking-wider">
                <FileText className="w-4 h-4" /> Legal
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">Terms &amp; Conditions</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Effective Date: January 2025 • Dadu Food ({DADU_FOOD_BUSINESS.address})</p>
            </header>
            <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">1. Ordering &amp; Verification</h2>
                <p>Customers must provide an active Pakistani mobile number (verified via SMS OTP) and a reachable address in Dadu City. Orders may be confirmed by phone if address details are incomplete.</p>
              </section>
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">2. Pricing &amp; Delivery Fees</h2>
                <p>All menu prices are listed in Pakistani Rupees (PKR). Standard delivery is Rs. 50; orders below Rs. 500 incur Rs. 100 delivery fee; orders of Rs. 1,000+ receive free delivery. Final totals are shown clearly before placing your order.</p>
              </section>
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">3. Cancellations &amp; Scheduled Orders</h2>
                <p>You may cancel an order directly from your Order Tracker before the kitchen marks it as Preparing or Dispatched. Scheduled pre-orders can be cancelled up to 30 minutes before the chosen slot.</p>
              </section>
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">4. Payments</h2>
                <p>We accept Cash on Delivery (COD) and Easypaisa (with receipt verification). Fraudulent orders or repeated refusals at the doorstep may result in account restriction.</p>
              </section>
            </div>
          </>
        )}

        {page === "privacy-policy" && (
          <>
            <header className="space-y-2 border-b border-zinc-100 dark:border-zinc-800 pb-5">
              <div className="flex items-center gap-2 text-[#E21B70] text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" /> Privacy &amp; Data Protection
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">Privacy Policy</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Dadu Food respects your personal information.</p>
            </header>
            <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">1. Data We Collect</h2>
                <p>We collect only the information needed to deliver your orders: your name, verified mobile phone number, optional email address, delivery addresses in Dadu, and order history.</p>
              </section>
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">2. How We Use Location</h2>
                <p>Browser GPS location is optional and used strictly to help pinpoint your delivery address and calculate distance accurately. You can always type your Dadu address manually without enabling GPS.</p>
              </section>
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">3. Data Sharing &amp; Security</h2>
                <p>Your delivery address and phone number are shared only with the assigned restaurant and rider fulfilling your active order. We never sell customer contact numbers to third parties.</p>
              </section>
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">4. Contact for Data Deletion</h2>
                <p>To request account or data deletion, contact our helpline at {DADU_FOOD_BUSINESS.phoneDisplay} or email {DADU_FOOD_BUSINESS.email}.</p>
              </section>
            </div>
          </>
        )}

        {page === "refund-policy" && (
          <>
            <header className="space-y-2 border-b border-zinc-100 dark:border-zinc-800 pb-5">
              <div className="flex items-center gap-2 text-[#E21B70] text-xs font-bold uppercase tracking-wider">
                <RefreshCw className="w-4 h-4" /> Customer Guarantee
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">Refund &amp; Cancellation Policy</h1>
            </header>
            <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">1. Instant Cancellation</h2>
                <p>Orders cancelled before kitchen preparation begins incur zero charges. Prepaid Easypaisa amounts are refunded within 24 hours.</p>
              </section>
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">2. Missing, Wrong, or Damaged Items</h2>
                <p>If an item is missing, spilled, or incorrect upon delivery, report it within 30 minutes via WhatsApp at {DADU_FOOD_BUSINESS.phoneDisplay} with your unique Order ID and a quick photo. We will arrange an immediate replacement or full item refund.</p>
              </section>
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">3. Refund Methods</h2>
                <p>Approved refunds are credited via Easypaisa or Dadu Food Coins Wallet (your choice) within 24–48 business hours.</p>
              </section>
            </div>
          </>
        )}

        {page === "contact" && (
          <>
            <header className="space-y-2 border-b border-zinc-100 dark:border-zinc-800 pb-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#E21B70]">Customer Support</p>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">Contact Dadu Food</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Need help with an order, refund, or partnership? Our local Dadu support team is here daily.
              </p>
            </header>

            <div className="grid sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700">
                <Phone className="w-5 h-5 text-[#E21B70] mb-2" />
                <h2 className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">Helpline / WhatsApp</h2>
                <a href={`tel:${DADU_FOOD_BUSINESS.phoneIntl}`} className="font-black text-zinc-900 dark:text-white hover:text-[#E21B70]">
                  {DADU_FOOD_BUSINESS.phoneDisplay}
                </a>
              </div>
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700">
                <MapPin className="w-5 h-5 text-[#E21B70] mb-2" />
                <h2 className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">Office Address</h2>
                <p className="font-bold text-sm text-zinc-900 dark:text-white">{DADU_FOOD_BUSINESS.address}</p>
              </div>
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700">
                <Clock className="w-5 h-5 text-[#E21B70] mb-2" />
                <h2 className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">Opening Hours</h2>
                <p className="font-bold text-sm text-zinc-900 dark:text-white">{DADU_FOOD_BUSINESS.openingHoursDisplay}</p>
              </div>
            </div>

            {submittedMsg ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-emerald-800 dark:text-emerald-200 text-sm font-semibold">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                {submittedMsg}
              </div>
            ) : (
              <form
                onSubmit={(e) =>
                  handleSubmit(
                    e,
                    "contact_messages",
                    "Message received! Our Dadu Food support team will contact you shortly."
                  )
                }
                className="space-y-4 pt-2"
              >
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Send Us a Message</h2>
                {formError && <p className="text-sm text-red-600 dark:text-red-400 font-semibold">{formError}</p>}
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Full Name *"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm"
                  />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone Number (03XXXXXXXXX) *"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm"
                  />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address (optional)"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm"
                />
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can we help you? (Include Order ID if relevant)"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#E21B70] hover:bg-[#b50c54] text-white font-bold text-sm transition-colors cursor-pointer disabled:opacity-60"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? "Sending..." : "Send Message"}
                </button>
              </form>
            )}
          </>
        )}

        {page === "partner-with-us" && (
          <>
            <header className="space-y-2 border-b border-zinc-100 dark:border-zinc-800 pb-5">
              <div className="flex items-center gap-2 text-[#E21B70] text-xs font-bold uppercase tracking-wider">
                <Store className="w-4 h-4" /> Restaurant &amp; Shop Partners
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
                Partner Your Restaurant With Dadu Food
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Reach thousands of hungry customers across Dadu City. We handle delivery riders, online menus, and live customer tracking.
              </p>
            </header>

            {submittedMsg ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-emerald-800 dark:text-emerald-200 text-sm font-semibold">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                {submittedMsg}
              </div>
            ) : (
              <form
                onSubmit={(e) =>
                  handleSubmit(
                    e,
                    "partner_applications",
                    "Partner application submitted! Our Dadu onboarding manager will call you within 24 hours."
                  )
                }
                className="space-y-4"
              >
                {formError && <p className="text-sm text-red-600 dark:text-red-400 font-semibold">{formError}</p>}
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Restaurant / Shop Name *"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm"
                  />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Owner / Manager Name *"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="WhatsApp / Mobile Number *"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm"
                  />
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Shop Address in Dadu *"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm"
                  />
                </div>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us about your cuisine (Pizza, Desi, BBQ, Chai, Groceries, etc.)"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#E21B70] hover:bg-[#b50c54] text-white font-bold text-sm transition-colors cursor-pointer disabled:opacity-60"
                >
                  <Store className="w-4 h-4" />
                  {submitting ? "Submitting..." : "Submit Partner Application"}
                </button>
              </form>
            )}
          </>
        )}

        {page === "become-a-rider" && (
          <>
            <header className="space-y-2 border-b border-zinc-100 dark:border-zinc-800 pb-5">
              <div className="flex items-center gap-2 text-[#E21B70] text-xs font-bold uppercase tracking-wider">
                <Bike className="w-4 h-4" /> Delivery Fleet
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
                Become a Dadu Food Rider
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Earn daily delivering food and groceries in Dadu City. Flexible shifts, competitive per-order payouts, and 100% of customer tips go straight to you.
              </p>
            </header>

            {submittedMsg ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-emerald-800 dark:text-emerald-200 text-sm font-semibold">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                {submittedMsg}
              </div>
            ) : (
              <form
                onSubmit={(e) =>
                  handleSubmit(
                    e,
                    "rider_applications",
                    "Rider registration received! Our fleet supervisor in Dadu will contact you shortly."
                  )
                }
                className="space-y-4"
              >
                {formError && <p className="text-sm text-red-600 dark:text-red-400 font-semibold">{formError}</p>}
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full Name *"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm"
                  />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Mobile Number (03XXXXXXXXX) *"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm"
                  >
                    <option value="Motorbike (70cc / 125cc)">Motorbike (70cc / 125cc)</option>
                    <option value="Bicycle">Bicycle</option>
                    <option value="Electric Bike">Electric Bike</option>
                  </select>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Your Mohalla / Area in Dadu *"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm"
                  />
                </div>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Preferred shift timing (Morning / Evening / Full Day) & CNIC availability"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#E21B70] hover:bg-[#b50c54] text-white font-bold text-sm transition-colors cursor-pointer disabled:opacity-60"
                >
                  <Bike className="w-4 h-4" />
                  {submitting ? "Submitting..." : "Apply as Delivery Rider"}
                </button>
              </form>
            )}
          </>
        )}

        <footer className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="inline-flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-[#E21B70]" /> {DADU_FOOD_BUSINESS.email}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-[#E21B70]" /> Helpline: {DADU_FOOD_BUSINESS.phoneDisplay}
          </span>
        </footer>
      </article>
    </main>
  );
};
