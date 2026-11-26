import React, { useEffect, useState } from "react";
import { MapPin, Navigation, Edit3, CheckCircle2, Map } from "lucide-react";

interface LocationPermissionModalProps {
  onAllow: () => void;
  onLater?: () => void;
  onManualAddressSave?: (address: string) => void;
  onPickOnMap?: () => void;
  requireForOrder?: boolean;
  initialAddress?: string;
}

export default function LocationPermissionModal({
  onAllow,
  onLater,
  onManualAddressSave,
  onPickOnMap,
  requireForOrder = false,
  initialAddress = "",
}: LocationPermissionModalProps) {
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualAddress, setManualAddress] = useState(initialAddress);
  const [manualError, setManualError] = useState("");

  // Keep the draft in sync if the parent hands us a saved address later
  // (e.g. reopening the prompt after a previous manual entry).
  useEffect(() => {
    setManualAddress(initialAddress);
  }, [initialAddress]);

  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = manualAddress.trim();
    if (cleaned.length < 6) {
      setManualError("Please enter your complete street, house/shop number, and area in Dadu.");
      return;
    }
    setManualError("");
    onManualAddressSave?.(cleaned);
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-prompt-heading"
    >
      <div className="bg-white dark:bg-[#14141A] border border-[#E6E6EE] dark:border-[#272733] rounded-t-3xl sm:rounded-3xl p-6 max-w-sm w-full shadow-2xl relative animate-sheet-up sm:animate-scale-up space-y-5">
        <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto sm:hidden" />

        <div className="w-16 h-16 bg-[#FFF0F5] dark:bg-[#2A101B] rounded-2xl flex items-center justify-center mx-auto border border-[#E21B70]/20">
          <MapPin className="w-8 h-8 text-[#E21B70]" />
        </div>

        <div className="space-y-2 text-center">
          <h2
            id="location-prompt-heading"
            className="text-xl font-extrabold text-[#14141A] dark:text-white tracking-tight"
          >
            Apni Location On Karein
          </h2>
          <p className="text-[#5A5A6B] dark:text-[#A1A1B2] text-sm leading-relaxed font-medium">
            Aapka order sahi address par pahunche, is liye location zaroori hai. Location on karein — tabhi aap order kar sakte hain.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onAllow}
            className="w-full min-h-[48px] bg-[#E21B70] hover:bg-[#C2145E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E21B70]/50 text-white font-extrabold py-3.5 px-4 rounded-2xl text-sm transition-transform duration-180 active:scale-[0.97] active:brightness-110 relative overflow-hidden after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0)_65%)] after:opacity-0 after:scale-50 after:transition-all after:duration-300 after:pointer-events-none active:after:opacity-100 active:after:scale-125 active:after:duration-100 cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            <Navigation className="w-4 h-4" aria-hidden="true" />
            <span>Allow Location</span>
          </button>

          {onManualAddressSave && !showManualInput && (
            <div className={onPickOnMap ? "grid grid-cols-2 gap-2.5" : ""}>
              {onPickOnMap && (
                <button
                  type="button"
                  onClick={onPickOnMap}
                  className="w-full min-h-[48px] bg-[#FFF0F5] dark:bg-[#2A101B] hover:bg-[#FFE4EF] dark:hover:bg-[#3A1424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E21B70]/50 border border-[#E21B70]/25 text-[#14141A] dark:text-[#F5F5F8] font-bold py-3 px-3 rounded-2xl text-xs transition-transform duration-180 active:scale-[0.97] active:brightness-110 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Map className="w-4 h-4 text-[#E21B70]" aria-hidden="true" />
                  <span>Pick on Map</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowManualInput(true)}
                className="w-full min-h-[48px] bg-[#F7F7FA] dark:bg-[#1B1B23] hover:bg-[#EFEFF5] dark:hover:bg-[#252530] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E21B70]/50 border border-[#E6E6EE] dark:border-[#272733] text-[#14141A] dark:text-[#F5F5F8] font-bold py-3 px-3 rounded-2xl text-xs transition-transform duration-180 active:scale-[0.97] active:brightness-110 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#E21B70]" aria-hidden="true" />
                <span>{onPickOnMap ? "Type Address" : "Enter Manual Dadu Address Instead"}</span>
              </button>
            </div>
          )}

          {showManualInput && onManualAddressSave && (
            <form onSubmit={handleSaveManual} className="space-y-2.5 pt-1 animate-fade-in">
              <textarea
                rows={2}
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                maxLength={200}
                placeholder="House/Shop #, Street, Mohalla / Road (e.g., Station Road, Dadu)"
                aria-label="Delivery address"
                aria-invalid={manualError ? true : undefined}
                aria-describedby={manualError ? "manual-address-error" : undefined}
                className="w-full rounded-xl bg-[#F7F7FA] dark:bg-[#1B1B23] border border-[#E6E6EE] dark:border-[#272733] px-3 py-2.5 text-xs font-medium text-[#14141A] dark:text-white focus:outline-none focus:border-[#E21B70] focus:ring-2 focus:ring-[#E21B70]/20 resize-none"
              />
              {manualError && (
                <p id="manual-address-error" role="alert" className="text-[11px] font-semibold text-rose-500">{manualError}</p>
              )}
              <button
                type="submit"
                className="w-full min-h-[48px] bg-[#E21B70] hover:bg-[#C2145E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E21B70]/50 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-transform duration-180 active:scale-[0.97] active:brightness-110 relative overflow-hidden after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0)_65%)] after:opacity-0 after:scale-50 after:transition-all after:duration-300 after:pointer-events-none active:after:opacity-100 active:after:scale-125 active:after:duration-100 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                <span>Save Delivery Address</span>
              </button>
              {onPickOnMap && (
                <button
                  type="button"
                  onClick={() => setShowManualInput(false)}
                  className="w-full min-h-[44px] text-[#E21B70] hover:text-[#C2145E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E21B70]/50 font-bold py-2 rounded-xl text-xs transition-transform duration-180 active:scale-[0.97] active:brightness-110 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Map className="w-4 h-4" aria-hidden="true" />
                  <span>Pick on Map instead</span>
                </button>
              )}
            </form>
          )}

          {!requireForOrder && onLater && (
            <button
              type="button"
              onClick={onLater}
              className="w-full min-h-[48px] text-[#5A5A6B] dark:text-[#A1A1B2] hover:text-[#14141A] dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E21B70]/50 font-bold py-2.5 rounded-xl text-xs transition-transform duration-180 active:scale-[0.97] active:brightness-110 cursor-pointer"
            >
              Browse Menu First
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
