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
      className="max-w-7xl mx-auto px-3.5 sm:px-4 py-8 space-y-6"
    >
      {/* Clear Business Facts Strip (Consistent across UI & JSON-LD for AEO) */}
      <div className="bg-white dark:bg-[#14141A] border border-[#E6E6EE] dark:border-[#272733] rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="mb-5">
          <h2 className="text-lg sm:text-xl font-extrabold text-[#14141A] dark:text-[#F5F5F8]">
            {language === "ur" ? "Dadu Food — Aapka Apna Food Delivery Partner" : "Online Food Delivery in Dadu City"}
          </h2>
          <p className="speakable-summary text-xs sm:text-sm text-[#5A5A6B] dark:text-[#A1A1B2] mt-1 leading-relaxed">
            {DADU_FOOD_BUSINESS.tagline}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-xl bg-[#F9F9FB] dark:bg-[#1B1B23] border border-[#E6E6EE] dark:border-[#272733]">
            <div className="flex items-center gap-2 text-[#E21B70] dark:text-[#FF4D94] font-bold text-xs uppercase mb-1">
              <Truck className="w-4 h-4" /> Delivery Fee Policy
            </div>
            <p className="text-sm font-bold text-[#14141A] dark:text-white tabular-nums">
              {`Rs. ${DADU_FOOD_BUSINESS.standardDeliveryFee} standard`}
            </p>
            <p className="text-xs text-[#5A5A6B] dark:text-[#A1A1B2] mt-0.5">
              {`Doubled (Rs. ${DADU_FOOD_BUSINESS.standardDeliveryFee * 2}) below Rs. ${DADU_FOOD_BUSINESS.smallOrderThreshold} · Free above Rs. ${DADU_FOOD_BUSINESS.freeDeliveryThreshold.toLocaleString()}`}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F9F9FB] dark:bg-[#1B1B23] border border-[#E6E6EE] dark:border-[#272733]">
            <div className="flex items-center gap-2 text-[#E21B70] dark:text-[#FF4D94] font-bold text-xs uppercase mb-1">
              <Clock className="w-4 h-4" /> Opening Hours
            </div>
            <p className="text-sm font-bold text-[#14141A] dark:text-white">{DADU_FOOD_BUSINESS.openingHoursDisplay}</p>
            <p className="text-xs text-[#5A5A6B] dark:text-[#A1A1B2] mt-0.5">
              Est. delivery time: 20–35 minutes
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F9F9FB] dark:bg-[#1B1B23] border border-[#E6E6EE] dark:border-[#272733]">
            <div className="flex items-center gap-2 text-[#E21B70] dark:text-[#FF4D94] font-bold text-xs uppercase mb-1">
              <MapPin className="w-4 h-4" /> Dadu Delivery Areas
            </div>
            <p className="text-sm font-bold text-[#14141A] dark:text-white">{DADU_FOOD_BUSINESS.address}</p>
            <p className="text-xs text-[#5A5A6B] dark:text-[#A1A1B2] mt-0.5">
              {`Serving ${DADU_FOOD_BUSINESS.deliveryAreas.slice(0, 5).join(", ")} & all Dadu City.`}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F9F9FB] dark:bg-[#1B1B23] border border-[#E6E6EE] dark:border-[#272733]">
            <div className="flex items-center gap-2 text-[#E21B70] dark:text-[#FF4D94] font-bold text-xs uppercase mb-1">
              <Phone className="w-4 h-4" /> Order Helpline
            </div>
            <a
              href={`tel:${DADU_FOOD_BUSINESS.phoneIntl}`}
              className="text-sm font-extrabold font-mono text-[#14141A] dark:text-white hover:text-[#E21B70]"
            >
              {DADU_FOOD_BUSINESS.phoneDisplay}
            </a>
            <p className="text-xs text-[#5A5A6B] dark:text-[#A1A1B2] mt-0.5">
              COD, JazzCash, Easypaisa, or Debit/Credit Card.
            </p>
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions (AEO + FAQPage JSON-LD aligned) */}
      <div className="bg-white dark:bg-[#14141A] border border-[#E6E6EE] dark:border-[#272733] rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-5 h-5 text-[#E21B70]" />
          <h2 id="dadu-faq-heading" className="text-lg sm:text-xl font-extrabold text-[#14141A] dark:text-white">
            {language === "ur" ? "Aam Sawalat (FAQs)" : "Frequently Asked Questions — Dadu Food"}
          </h2>
        </div>

        <div className="divide-y divide-[#EFEFF5] dark:divide-[#23232E]">
          {DADU_FOOD_FAQS.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div key={faq.question} className="py-2 first:pt-0 last:pb-0">
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="w-full min-h-[44px] flex items-center justify-between gap-4 text-left cursor-pointer group py-1.5"
                >
                  <h3 className="text-sm sm:text-base font-bold text-[#14141A] dark:text-white group-hover:text-[#E21B70] transition-colors">
                    {faq.question}
                  </h3>
                  <ChevronDown
                    className={`w-4 h-4 text-[#5A5A6B] shrink-0 transition-transform ${
                      isOpen ? "rotate-180 text-[#E21B70]" : ""
                    }`}
                  />
                </button>
                <p
                  className={`faq-answer text-sm text-[#5A5A6B] dark:text-[#A1A1B2] leading-relaxed pb-2 pr-6 ${
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
