import React, { useEffect, useState } from "react";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";

export default function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [justReconnected, setJustReconnected] = useState<boolean>(false);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const handleOffline = () => {
      setIsOnline(false);
      setJustReconnected(false);
    };

    const handleOnline = () => {
      setIsOnline(true);
      setJustReconnected(true);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        setJustReconnected(false);
      }, 3500);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  if (isOnline && !justReconnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-2 left-1/2 -translate-x-1/2 z-[120] w-[92vw] max-w-md pointer-events-none"
    >
      {!isOnline ? (
        <div className="bg-zinc-950/95 border border-amber-500/50 text-amber-100 px-3.5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center justify-between gap-2.5 pointer-events-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-400">
              <WifiOff className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-amber-300 leading-tight">
                Internet disconnect ho gaya hai
              </p>
              <p className="text-[10px] text-zinc-300 font-medium truncate">
                Reconnecting... Network aate hi app khud sync ho jayegi
              </p>
            </div>
          </div>
          <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
        </div>
      ) : (
        <div className="bg-emerald-950/95 border border-emerald-500/50 text-emerald-100 px-3.5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 pointer-events-auto">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
            <Wifi className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-emerald-300 leading-tight">
              Internet wapas aa gaya!
            </p>
            <p className="text-[10px] text-emerald-100/80 font-medium truncate">
              Live menus aur orders sync ho rahe hain...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
