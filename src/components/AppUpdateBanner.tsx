// In-app update banner — shows when a NEW APK version is available.
// The user taps Download to install the new version (user 28 Nov 02:55).
// Rendered at the top of the app (below the header) so it is visible on
// every screen until dismissed or installed.
import { useState } from "react";
import { Download, X, Smartphone } from "lucide-react";
import type { AppVersionInfo } from "../utils/appVersion";
import { APP_VERSION } from "../utils/appVersion";

export default function AppUpdateBanner({ info }: { info: AppVersionInfo }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="sticky top-0 z-[70] bg-gradient-to-r from-[#E21B70] via-[#FF2B85] to-[#E21B70] text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-3 py-2.5 flex items-center gap-3">
        <span className="shrink-0 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
          <Smartphone className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black leading-tight truncate">
            Naya version aa gaya! 🎉
          </p>
          <p className="text-[11px] font-medium text-white/90 leading-tight truncate">
            {info.message || `Version ${info.version} — naye features aur behtareen speed. Abhi update karein.`}
          </p>
        </div>
        <a
          href={info.apkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 bg-white text-[#E21B70] text-xs font-black px-3.5 py-2 rounded-full shadow active:scale-95 transition"
        >
          <Download className="w-4 h-4" />
          Download
        </a>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss update"
          className="shrink-0 w-7 h-7 rounded-full bg-white/15 flex items-center justify-center active:scale-95 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="sr-only">Current app version {APP_VERSION}</p>
    </div>
  );
}
