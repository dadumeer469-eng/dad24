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
      <a
        href="/"
        onClick={(e) => {
          e.preventDefault();
          onBack();
        }}
        className="inline-flex items-center gap-2 text-sm font-bold text-[#E21B70] hover:underline mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dadu Food Home
      </a>

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
          <a
            key={slug}
            href={`/${slug}`}
            onClick={(e) => {
              e.preventDefault();
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
          </a>
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

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Our Story</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Dadu Food was built for Dadu city, because ordering food, groceries and medicines online should not
                be something only big cities get. Until now, people in Dadu had to call each shop separately, or
                travel to the bazaar for everyday items. Dadu Food brings the city&apos;s own restaurants, grocery
                shelves and pharmacy essentials together on one website, with one rider, one delivery fee and live
                tracking from the kitchen to your door. Our grand opening is on Tuesday, 15 December 2026, and from
                that day food, grocery and medicine delivery will run across Dadu city every day. That is what
                food delivery in Dadu Sindh should feel like — local kitchens, local riders, and one honest
                delivery fee.
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                We are a local team, not a faraway call centre. The restaurants on Dadu Food are Dadu&apos;s own
                kitchens, the riders are from Dadu&apos;s own mohallas, and the support helpline is answered here in
                Dadu. When you order, your money goes to a local restaurant and a local rider — and if anything goes
                wrong with your order, you can call or WhatsApp 03277004471 and talk to someone who knows the city.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Areas We Serve in Dadu City</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Dadu Food delivers across Dadu city, Sindh, including Shahani Paro, Moro Road, Station Road,
                College Road, {DADU_FOOD_BUSINESS.deliveryAreas.join(", ")} and nearby areas. When you place an
                order, enter your address or share your live location and the app will confirm whether delivery is
                available to you. If your area is just outside the city, message us on WhatsApp at 03277004471 and
                we will tell you honestly whether we can reach you.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">How Ordering Works</h2>
              <ol className="list-decimal pl-5 text-sm text-zinc-600 dark:text-zinc-300 space-y-1.5">
                <li>Open dadufood.store and allow location access, or type your Dadu address manually.</li>
                <li>Browse restaurants, grocery items and medicines, and add what you need to your cart.</li>
                <li>At checkout, enter your name, phone number and delivery address, then choose Cash on Delivery or Easypaisa.</li>
                <li>Confirm your order. The restaurant prepares it, our rider picks it up, and you can track it live on the website until it reaches your door — usually in 20 to 35 minutes.</li>
              </ol>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Food is delivered from 12:00 PM to 11:00 PM every day, seven days a week. Grocery and medicine
                orders can be placed from the morning. There is no minimum order amount, so you can order even a
                single dish or a single grocery item. The flat delivery fee is Rs 50 for food and grocery orders,
                and Rs 30 for medicine-only orders — the full total, including the delivery fee, is always shown
                before you confirm.
              </p>
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
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">5. Service Area &amp; Hours</h2>
                <p>Dadu Food serves Dadu city, Sindh, including Shahani Paro, Moro Road, Station Road, College Road and nearby areas. Food delivery runs from 12:00 PM to 11:00 PM every day. Grocery and medicine orders can be placed from the morning. Orders placed outside food hours are accepted once the restaurants open at 12:00 PM. If your address is outside our delivery range, the app will tell you before you pay anything.</p>
              </section>
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">6. Prices, Availability &amp; Substitutions</h2>
                <p>Menu and grocery prices are set by the restaurant or listed on the site in Pakistani Rupees (PKR), and the price shown at checkout is the price you pay. Prices and availability can change, for example when an item sells out. If something you ordered is unavailable, the restaurant will contact you where possible and we will not substitute another item without your agreement.</p>
              </section>
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">7. Delivery, Allergies &amp; Food Safety</h2>
                <p>Most orders arrive in 20 to 35 minutes, but preparation time and distance can change this, and we will keep you updated through live order tracking. If you have a food allergy, please mention it in your order notes and check with the restaurant before ordering, because kitchens handle many ingredients. Please check your order when it arrives and report any problem within 30 minutes on WhatsApp at {DADU_FOOD_BUSINESS.phoneDisplay} — see our Refund &amp; Cancellation Policy for what happens next.</p>
              </section>
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">8. Accounts, Vouchers &amp; Fair Use</h2>
                <p>Your account, loyalty coins and vouchers are for your own household use and cannot be sold or transferred. Vouchers and free-delivery offers apply only as described when you use them, and we may withdraw an offer if it is misused. Please keep your phone number up to date, because it is how the rider and the restaurant reach you about your order.</p>
              </section>
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">9. Changes to These Terms</h2>
                <p>We may update these terms when our service changes, for example when new restaurants, fees or features are added. The version on this page is the one that applies to your order. If you have a question about these terms, contact our helpline at {DADU_FOOD_BUSINESS.phoneDisplay} or email {DADU_FOOD_BUSINESS.email}.</p>
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
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">5. Cookies, Local Storage &amp; Third-Party Services</h2>
                <p>The website stores small amounts of data on your device, such as your cart and your saved delivery address, so your order is not lost if you reload the page. We also use trusted third-party services to run the app — for example, our database and login system, and Google Maps for delivery locations. Easypaisa handles its own payment verification, and we only record the receipt details you share with us. These services have their own privacy policies for the data they process.</p>
              </section>
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">6. How Long We Keep Your Data</h2>
                <p>We keep your order history while your account is active, so you can reorder and track past orders. Delivery addresses and phone numbers are kept only as long as needed to serve you and to resolve order or payment issues. When you ask us to delete your account, we remove your personal details from our active systems; a limited record may be kept only where we need it to settle an open payment or a dispute.</p>
              </section>
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">7. Your Rights &amp; Choices</h2>
                <p>You can ask us what personal data we hold about you, ask us to correct a wrong phone number or address, or ask us to delete your account. You can also order without enabling GPS location by typing your address manually, and you can clear your saved cart and addresses from your device at any time. To make any of these requests, call or WhatsApp {DADU_FOOD_BUSINESS.phoneDisplay} or email {DADU_FOOD_BUSINESS.email}, and we will respond as soon as we can.</p>
              </section>
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">8. Changes to This Policy</h2>
                <p>If we change how we collect or use personal data — for example when we add a new feature or payment method — we will update this page. Please check back here from time to time. If you continue to use Dadu Food after an update, that means you accept the updated policy.</p>
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
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">4. Wrong Item Delivered</h2>
                <p>If you receive a different dish or grocery item from the one you ordered, do not worry — message us on WhatsApp at {DADU_FOOD_BUSINESS.phoneDisplay} within 30 minutes with your Order ID and a photo of what arrived. We will arrange the correct item to be sent to you, or refund the full price of the wrong item if it cannot be replaced. You do not need to return the wrong item unless the rider asks for it at the door.</p>
              </section>
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">5. Late Delivery</h2>
                <p>Most orders arrive in 20 to 35 minutes, but cooking time, weather and distance can cause delays, and we will keep you updated through live order tracking. If your order is much later than the time shown, message us on WhatsApp at {DADU_FOOD_BUSINESS.phoneDisplay} with your Order ID. We will check with the restaurant and the rider, and if the delay was our fault we will offer a replacement or a refund as appropriate. Food that arrives cold or spoiled because of a long delay is treated the same as a damaged item — see below.</p>
              </section>
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">6. Damaged or Spoiled Items</h2>
                <p>If your food arrives spilled, damaged or spoiled, or a grocery item is broken or leaking, report it within 30 minutes on WhatsApp at {DADU_FOOD_BUSINESS.phoneDisplay} with your Order ID and a quick photo. We will arrange an immediate replacement or a full refund for the affected item. For medicines, please also tell us if the packaging seal is broken, so we can check the item before replacing it.</p>
              </section>
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">7. How to Request a Refund</h2>
                <p>Message us on WhatsApp at {DADU_FOOD_BUSINESS.phoneDisplay}, or call the same number during delivery hours (12:00 PM to 11:00 PM daily). Tell us your Order ID, what went wrong, and send a photo if an item is missing, wrong, damaged or spoiled. Our support team will confirm your request the same day. Prepaid Easypaisa amounts for cancelled orders are refunded within 24 hours. Other approved refunds are credited via Easypaisa or Dadu Food Coins Wallet, your choice, within 24–48 business hours. Cash on Delivery orders are refunded for the item value — if you already paid cash for an item you did not receive, the refund is sent to you by Easypaisa or added to your Coins Wallet.</p>
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

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Delivery Areas &amp; Hours</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                We deliver across Dadu city, Sindh, including Shahani Paro, Moro Road, Station Road, College Road,{" "}
                {DADU_FOOD_BUSINESS.deliveryAreas.join(", ")} and nearby areas. Food is delivered from 12:00 PM to
                11:00 PM every day, seven days a week, and grocery and medicine orders can be placed from the
                morning. Our helpline on 03277004471 (call or WhatsApp) is open during delivery hours, and the
                delivery fee is Rs 50 for food and grocery orders and Rs 30 for medicine-only orders. If you are
                unsure whether we deliver to your area, send us your address on WhatsApp and we will confirm.
              </p>
            </section>

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

            <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">Commission — 10% Per Order</h2>
                <p>Dadu Food charges a simple 10% commission on each order you receive through us — that is all. There is no upfront setup fee and no monthly fee to join. You keep 90% of every order value, and the delivery fee paid by the customer covers the rider. Compare that with the big platforms, which commonly charge restaurants 20 to 30%, and you can see why Dadu&apos;s own restaurants are joining us first. Your commission is calculated per completed order, and you can see your orders and earnings in your restaurant panel.</p>
              </section>
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">How to Join</h2>
                <p>Joining takes three simple steps. First, fill in the application form below with your restaurant or shop name, the owner or manager&apos;s name, your WhatsApp number and your shop address in Dadu. Second, our onboarding manager will call you within 24 hours to confirm your menu, prices and opening hours. Third, we set up your online menu and restaurant panel, and your kitchen goes live on Dadu Food — usually within a day or two of your call. If you prefer to talk first, you can also call or WhatsApp our helpline at 03277004471.</p>
              </section>
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">What You Get as a Partner</h2>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong className="text-zinc-900 dark:text-white">Your own restaurant panel:</strong> see incoming orders live, accept or manage them, update your menu and prices, and set your opening hours and delivery settings yourself.</li>
                  <li><strong className="text-zinc-900 dark:text-white">Our rider panel and delivery fleet:</strong> you do not need your own delivery boys. Our local Dadu riders pick up from your shop and deliver to the customer, with live tracking the customer can follow.</li>
                  <li><strong className="text-zinc-900 dark:text-white">Live order tracking:</strong> you, the rider and the customer all see the same order status — placed, accepted, preparing, picked up and delivered — so there are fewer phone calls and fewer mistakes.</li>
                  <li><strong className="text-zinc-900 dark:text-white">Marketing across Dadu city:</strong> your restaurant is listed on the Dadu Food home page and in search results for Dadu food delivery, and we promote partner restaurants to our customers. More restaurants are being added before our grand opening on Tuesday, 15 December 2026, so early partners get the most visibility. Dadu Fast Food &amp; Kitchen, S M Bilal Hotel and Tasty Bites Dadu already list with us, and every online food order Dadu customers place through the app reaches the kitchen instantly.</li>
                </ul>
              </section>
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">What We Ask From Partners</h2>
                <p>We ask for a real shop or kitchen in Dadu city, a working phone or WhatsApp number so we can reach you about orders, and an accurate menu with real prices — the prices customers see must be the prices they pay. Please keep your opening hours updated in your panel, pack orders on time so riders are not kept waiting, and keep your food preparation clean and hygienic. If an item sells out, mark it unavailable in your panel so customers are not disappointed. That is all we ask — we handle the app, the riders, the tracking and the customer support.</p>
              </section>
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

            <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">How to Join</h2>
                <p>Joining is simple. Fill in the application form below with your full name, mobile number, your vehicle type and your mohalla or area in Dadu. Tell us your preferred shift timing — morning, evening or full day — and whether your CNIC is available. Our fleet supervisor in Dadu will contact you shortly after you apply to confirm your details and explain the next step. There is no fee to apply. If you prefer to talk first, call or WhatsApp our helpline at 03277004471.</p>
              </section>
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">What You Need</h2>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Your own vehicle — a motorbike (70cc or 125cc), an electric bike or a bicycle — in good working condition, with fuel or charge you arrange yourself.</li>
                  <li>A mobile phone you can use for the rider panel, so you can see new orders, navigate to the restaurant and the customer, and update the delivery status.</li>
                  <li>Your CNIC available for verification, and a reachable mobile number.</li>
                  <li>Good knowledge of Dadu city — its mohallas, roads and landmarks — so you can find addresses quickly, and a polite, helpful manner with customers.</li>
                </ul>
              </section>
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">How Earnings Work</h2>
                <p>Riders earn a payout for every order they deliver, so the more you deliver, the more you earn — and you can choose shifts that fit your day, morning, evening or full day. On top of the per-order payout, 100% of customer tips go straight to you; Dadu Food takes nothing from your tips. Earnings are paid out regularly, and you can see your completed deliveries in the rider panel. There is no fixed salary promise here — your daily earning depends on how many orders you complete — but with food, grocery and medicine orders across the whole city, there is work through the day from 12:00 PM to 11:00 PM, and grocery and medicine orders from the morning.</p>
              </section>
              <section>
                <h2 className="font-bold text-zinc-900 dark:text-white text-base mb-1">How a Delivery Works</h2>
                <p>When a customer orders, the restaurant prepares the food and the order appears in the rider panel. You accept it, ride to the restaurant, pick up the order, and deliver it to the customer&apos;s address — the app shows you the route, and the customer can track you live. For Cash on Delivery orders you collect the cash from the customer; for Easypaisa orders the payment is already handled. If you cannot find an address or the customer does not answer, call them on the number in the order, and if you still cannot deliver, contact our support on 03277004471 instead of leaving the order unattended. Ride safely, follow traffic rules, and keep the food upright and protected — a careful rider is a rider customers ask for again. Deliveries run across Dadu city, including Shahani Paro, Moro Road, Station Road and College Road.</p>
              </section>
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
