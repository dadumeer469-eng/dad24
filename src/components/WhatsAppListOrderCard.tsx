import React, { useMemo, useState } from "react";
import { MessageCircle, Plus, X, MapPin, Send, ClipboardList } from "lucide-react";

interface WhatsAppListOrderCardProps {
  mode?: "food" | "grocery";
  defaultAddress?: string;
}

const FOOD_SUGGESTIONS = [
  "1x Chicken Biryani",
  "1x Large Fajita Pizza",
  "2x Zinger Burger",
  "2x Doodh Patti Chai",
  "1x Half Mutton Karahi",
  "1x 1.5L Cold Drink",
];

const GROCERY_SUGGESTIONS = [
  "1L Olper's Milk",
  "1 Dozen Eggs",
  "1x Large Bread",
  "1 kg Sugar",
  "1L Cooking Oil",
  "2 kg Fresh Atta",
];

const WHATSAPP_NUMBER = "923277004471";

export default function WhatsAppListOrderCard({
  mode = "food",
  defaultAddress = "",
}: WhatsAppListOrderCardProps) {
  const [items, setItems] = useState<string[]>([]);
  const [draftItem, setDraftItem] = useState("");
  const [freeNotes, setFreeNotes] = useState("");
  const [area, setArea] = useState(defaultAddress);

  const suggestions = mode === "grocery" ? GROCERY_SUGGESTIONS : FOOD_SUGGESTIONS;

  const handleAddItem = (text?: string) => {
    const clean = (text ?? draftItem).trim();
    if (!clean) return;
    if (!items.includes(clean)) {
      setItems((prev) => [...prev, clean]);
    }
    if (!text) setDraftItem("");
  };

  const handleRemoveItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const whatsAppUrl = useMemo(() => {
    const lines: string[] = [
      mode === "grocery"
        ? "Assalam-o-Alaikum Dadu Food! I want to order this Grocery List:"
        : "Assalam-o-Alaikum Dadu Food! I want to place a WhatsApp List Order:",
      "",
    ];

    if (items.length > 0) {
      items.forEach((item, idx) => {
        lines.push(`${idx + 1}. ${item}`);
      });
    }

    if (freeNotes.trim()) {
      if (items.length > 0) lines.push("");
      lines.push(freeNotes.trim());
    }

    if (items.length === 0 && !freeNotes.trim()) {
      lines.push(
        mode === "grocery"
          ? "(Please write your grocery items here)"
          : "(Please write your restaurant & items here)"
      );
    }

    if (area.trim()) {
      lines.push("", `Delivery Area: ${area.trim()}, Dadu`);
    } else {
      lines.push("", "Delivery Area: Dadu City");
    }

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
  }, [items, freeNotes, area, mode]);

  return (
    <section
      id="whatsapp-list-order"
      aria-labelledby={`wa-list-heading-${mode}`}
      className="w-full"
    >
      <div className="bg-white dark:bg-[#14141A] border border-[#E6E6EE] dark:border-[#272733] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EFEFF5] dark:border-[#23232E]">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#E21B70]/10 dark:bg-[#E21B70]/20 text-[#E21B70] dark:text-[#FF4D94] flex items-center justify-center shrink-0">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#E21B70] dark:text-[#FF4D94]">
                WhatsApp List Ordering
              </p>
              <h2
                id={`wa-list-heading-${mode}`}
                className="text-lg sm:text-xl font-extrabold text-[#14141A] dark:text-[#F5F5F8] tracking-tight leading-snug"
              >
                {mode === "grocery"
                  ? "Send Your Grocery List on WhatsApp"
                  : "Order Anything by List on WhatsApp"}
              </h2>
              <p className="text-xs sm:text-sm text-[#5A5A6B] dark:text-[#A1A1B2] mt-0.5">
                Type your items below and send directly to our Dadu dispatch team at{" "}
                <span className="font-mono font-semibold text-[#14141A] dark:text-[#F5F5F8]">
                  0327-7004471
                </span>
                .
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {/* Quick-Add Suggestions */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5A5A6B] dark:text-[#A1A1B2] mb-2">
              Quick tap to add
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => {
                const alreadyAdded = items.includes(suggestion);
                return (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleAddItem(suggestion)}
                    className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
                      alreadyAdded
                        ? "bg-[#E21B70] text-white border-[#E21B70]"
                        : "bg-[#F9F9FB] dark:bg-[#1D1D26] text-[#14141A] dark:text-[#F5F5F8] border-[#E6E6EE] dark:border-[#272733] hover:border-[#E21B70]/60"
                    }`}
                  >
                    {alreadyAdded ? "✓ " : "+ "}
                    {suggestion}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add Custom Item Row */}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={draftItem}
              onChange={(e) => setDraftItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddItem();
                }
              }}
              placeholder={
                mode === "grocery"
                  ? "Add an item (e.g. 2kg Basmati Rice, 1 pack Tapal Tea)"
                  : "Add a dish or item (e.g. 1x Chicken Karahi from S M Bilal)"
              }
              className="flex-1 min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#F9F9FB] dark:bg-[#1D1D26] border border-[#E6E6EE] dark:border-[#272733] text-sm text-[#14141A] dark:text-[#F5F5F8] placeholder-[#717185] outline-none focus:border-[#E21B70] focus:ring-2 focus:ring-[#E21B70]/20"
            />
            <button
              type="button"
              onClick={() => handleAddItem()}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#14141A] dark:bg-[#252530] hover:bg-[#272733] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>

          {/* Added Items List */}
          {items.length > 0 && (
            <div className="bg-[#F9F9FB] dark:bg-[#1B1B23] border border-[#E6E6EE] dark:border-[#272733] rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A5A6B] dark:text-[#A1A1B2]">
                  Your List ({items.length} {items.length === 1 ? "item" : "items"})
                </span>
                <button
                  type="button"
                  onClick={() => setItems([])}
                  className="text-xs font-semibold text-[#E21B70] dark:text-[#FF4D94] hover:underline cursor-pointer"
                >
                  Clear all
                </button>
              </div>
              <ul className="space-y-1.5">
                {items.map((item, idx) => (
                  <li
                    key={`${item}-${idx}`}
                    className="flex items-center justify-between gap-2 bg-white dark:bg-[#14141A] border border-[#E6E6EE] dark:border-[#272733] rounded-lg px-3 py-2 text-sm text-[#14141A] dark:text-[#F5F5F8]"
                  >
                    <span className="truncate font-medium">
                      <span className="font-mono text-xs text-[#E21B70] dark:text-[#FF4D94] mr-2">
                        {idx + 1}.
                      </span>
                      {item}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      aria-label={`Remove ${item}`}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5A5A6B] hover:text-[#DC2626] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Optional Free-Text List + Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <textarea
              rows={2}
              value={freeNotes}
              onChange={(e) => setFreeNotes(e.target.value)}
              placeholder="Or paste your full list / extra instructions here..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F9F9FB] dark:bg-[#1D1D26] border border-[#E6E6EE] dark:border-[#272733] text-sm text-[#14141A] dark:text-[#F5F5F8] placeholder-[#717185] outline-none focus:border-[#E21B70] focus:ring-2 focus:ring-[#E21B70]/20 resize-none"
            />
            <div className="flex flex-col justify-between gap-2">
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#E21B70] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="Your Dadu area (e.g. Station Road)"
                  className="w-full min-h-[44px] pl-9 pr-3.5 py-2.5 rounded-xl bg-[#F9F9FB] dark:bg-[#1D1D26] border border-[#E6E6EE] dark:border-[#272733] text-sm text-[#14141A] dark:text-[#F5F5F8] placeholder-[#717185] outline-none focus:border-[#E21B70] focus:ring-2 focus:ring-[#E21B70]/20"
                />
              </div>

              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[48px] w-full px-5 py-3 rounded-xl bg-[#E21B70] hover:bg-[#C2145E] text-white font-bold text-sm tracking-tight flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-[0.98]"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>Send Order on WhatsApp</span>
                <Send className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
