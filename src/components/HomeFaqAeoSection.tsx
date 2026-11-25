import React, { useState } from "react";
import { ChevronDown, MapPin, Phone, Clock, Truck, HelpCircle } from "lucide-react";
import { DADU_FOOD_BUSINESS, DADU_FOOD_FAQS } from "../utils/seoManager";

interface HomeFaqAeoSectionProps {
  language?: "en" | "ur";
}

export const HomeFaqAeoSection: React.FC<HomeFaqAeoSectionProps> = ({ language = "en" }) => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section
      aria-labelledby="dadu-faq-heading"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8"
    >
      {/* Clear Business Facts Strip (Consistent across UI & JSON-LD for AEO) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white">
            {language === "ur" ? "Dadu Food — Aapka Apna Food Delivery Partner" : "Online Food Delivery in Dadu City"}
          </h2>
          <p className="speakable-summary text-sm sm:text-base text-zinc-600 dark:text-zinc-300 mt-1.5 leading-relaxed">
            {DADU_FOOD_BUSINESS.tagline}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-[#d70f64] font-bold text-xs uppercase mb-1">
              <Truck className="w-4 h-4" /> Delivery Fee Policy
            </div>
            <p className="text-sm font-bold text-zinc-900 dark:text-white">
              Rs. {DADU_FOOD_BUSINESS.standardDeliveryFee} standard
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
              Doubled (Rs. {DADU_FOOD_BUSINESS.standardDeliveryFee * 2}) below Rs. {DADU_FOOD_BUSINESS.smallOrderThreshold} • Free above Rs. {DADU_FOOD_BUSINESS.freeDeliveryThreshold.toLocaleString()}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-[#d70f64] font-bold text-xs uppercase mb-1">
              <Clock className="w-4 h-4" /> Opening Hours
            </div>
            <p className="text-sm font-bold text-zinc-900 dark:text-white">{DADU_FOOD_BUSINESS.openingHoursDisplay}</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
              Average delivery time: 20–35 minutes • Min order Rs. {DADU_FOOD_BUSINESS.minOrder}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-[#d70f64] font-bold text-xs uppercase mb-1">
              <MapPin className="w-4 h-4" /> Dadu Delivery Areas
            </div>
            <p className="text-sm font-bold text-zinc-900 dark:text-white">{DADU_FOOD_BUSINESS.address}</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
              Serving {DADU_FOOD_BUSINESS.deliveryAreas.slice(0, 5).join(", ")} &amp; nearby areas.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-[#d70f64] font-bold text-xs uppercase mb-1">
              <Phone className="w-4 h-4" /> Order Helpline
            </div>
            <a
              href={`tel:${DADU_FOOD_BUSINESS.phoneIntl}`}
              className="text-sm font-black text-zinc-900 dark:text-white hover:text-[#d70f64]"
            >
              {DADU_FOOD_BUSINESS.phoneDisplay}
            </a>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
              Pay via COD, JazzCash, Easypaisa, or Debit/Credit Card.
            </p>
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions (AEO + FAQPage JSON-LD aligned) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-5 h-5 text-[#d70f64]" />
          <h2 id="dadu-faq-heading" className="text-xl font-black text-zinc-900 dark:text-white">
            {language === "ur" ? "Aam Sawalat (FAQs)" : "Frequently Asked Questions — Dadu Food"}
          </h2>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {DADU_FOOD_FAQS.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div key={faq.question} className="py-3.5 first:pt-1 last:pb-1">
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-4 text-left cursor-pointer group"
                >
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white group-hover:text-[#d70f64] transition-colors">
                    {faq.question}
                  </h3>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform ${
                      isOpen ? "rotate-180 text-[#d70f64]" : ""
                    }`}
                  />
                </button>
                <p
                  className={`faq-answer text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed mt-2 pr-6 ${
                    isOpen ? "block" : "sr-only"
                  }`}
                >
                  {faq.answer}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
