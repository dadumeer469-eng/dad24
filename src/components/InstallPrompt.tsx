import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Download, Smartphone, Compass, ArrowRight, Share } from "lucide-react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"android" | "ios" | "iframe">("android");
  const [isIframe, setIsIframe] = useState(false);

  useEffect(() => {
    // 1. Check if running inside an iframe
    try {
      if (window.self !== window.top) {
        setIsIframe(true);
        setActiveTab("iframe");
        // Always show the banner inside the preview iframe to guide the user to open in new tab!
        const bannerDismissed = localStorage.getItem("dadu_pwa_banner_dismissed");
        if (!bannerDismissed) {
          setShowBanner(true);
        }
      }
    } catch (e) {
      setIsIframe(true);
      setActiveTab("iframe");
      setShowBanner(true);
    }

    // 2. Detect PWA installation capability
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show install banner if not dismissed before
      const bannerDismissed = localStorage.getItem("dadu_pwa_banner_dismissed");
      if (!bannerDismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 3. Fallback: If on iOS and not already running as standalone (installed)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
    
    if (isIOS && !isStandalone) {
      setActiveTab("ios");
      const bannerDismissed = localStorage.getItem("dadu_pwa_banner_dismissed");
      if (!bannerDismissed) {
        // Show after 3 seconds for iOS users to let them know they can install
        const timer = setTimeout(() => {
          setShowBanner(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }

    // 4. If we are in standalone mode, hide the banner
    if (isStandalone) {
      setShowBanner(false);
    }

    // Fallback: If it is standard Android/Chrome but prompt hasn't fired yet,
    // let's still show a subtle install banner after some user interaction
    const timer = setTimeout(() => {
      const bannerDismissed = localStorage.getItem("dadu_pwa_banner_dismissed");
      if (!bannerDismissed && !isStandalone) {
        setShowBanner(true);
      }
    }, 8000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          setShowBanner(false);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.warn("Native install prompt error:", err);
        setShowModal(true);
      }
    } else {
      // If native prompt is not available, show the beautiful guide modal
      setShowModal(true);
    }
  };

  const dismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem("dadu_pwa_banner_dismissed", "true");
  };

  return (
    <>
      {/* Floating Installation Banner */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", stiffness: 120, damping: 15 }}
            className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-45"
            id="pwa-install-banner"
          >
            <div className="bg-zinc-900 border border-zinc-800 text-white rounded-2xl shadow-2xl p-4 flex flex-col gap-3 relative overflow-hidden backdrop-blur-md bg-opacity-95">
              {/* Decorative background glow */}
              <div className="absolute -top-12 -right-12 w-24 h-24 bg-[#D70F64] rounded-full blur-2xl opacity-20 pointer-events-none"></div>
              
              <button
                onClick={dismissBanner}
                className="absolute top-3 right-3 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D70F64] flex items-center justify-center shrink-0 shadow-lg shadow-[#D70F64]/20">
                  <Download className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div className="flex-1 pr-6">
                  <h4 className="text-sm font-black text-white tracking-wide">
                    Install Dadu Food App 📱
                  </h4>
                  <p className="text-[11px] text-zinc-300 font-medium mt-0.5 leading-relaxed">
                    Fast speed, live rider tracking, and easy order access directly from your phone's screen!
                  </p>
                </div>
              </div>

              <div className="flex gap-2 items-center mt-1">
                <button
                  onClick={handleInstallClick}
                  className="flex-1 bg-[#D70F64] hover:bg-[#b00c50] active:scale-98 text-white text-[11px] font-black py-2.5 px-4 rounded-xl transition-all shadow-md shadow-[#D70F64]/10 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  Install Now <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-bold py-2.5 px-3.5 rounded-xl transition cursor-pointer"
                >
                  How to Install?
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Beautiful Bilingual Installation Guide Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 text-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
              id="pwa-guide-modal"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 bg-black/40 hover:bg-black/70 text-zinc-400 hover:text-[#D70F64] transition-colors p-2 rounded-full cursor-pointer z-10"
              >
                <X className="w-4.5 h-4.5" />
              </button>

              {/* Header */}
              <div className="p-6 pb-4 border-b border-zinc-800 bg-zinc-950/50">
                <h3 className="text-lg font-black text-white tracking-tight">
                  How to Install Dadu Food App 🚀
                </h3>
                <p className="text-xs text-zinc-400 font-bold tracking-wide mt-1 uppercase text-[#D70F64]">
                  ایپ انسٹال کرنے کا طریقہ
                </p>
              </div>

              {/* Device Tabs */}
              <div className="flex border-b border-zinc-800 bg-zinc-950/20 px-4 pt-2">
                <button
                  onClick={() => setActiveTab("android")}
                  className={`flex-1 py-3 text-xs font-black tracking-wide border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === "android"
                      ? "border-[#D70F64] text-[#D70F64]"
                      : "border-transparent text-zinc-400 hover:text-white"
                  }`}
                >
                  <Smartphone className="w-4 h-4" /> Android / Chrome
                </button>
                <button
                  onClick={() => setActiveTab("ios")}
                  className={`flex-1 py-3 text-xs font-black tracking-wide border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === "ios"
                      ? "border-[#D70F64] text-[#D70F64]"
                      : "border-transparent text-zinc-400 hover:text-white"
                  }`}
                >
                  <Smartphone className="w-4 h-4" /> iPhone / Safari
                </button>
                {isIframe && (
                  <button
                    onClick={() => setActiveTab("iframe")}
                    className={`flex-1 py-3 text-xs font-black tracking-wide border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeTab === "iframe"
                        ? "border-[#D70F64] text-[#D70F64]"
                        : "border-transparent text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Compass className="w-4 h-4" /> Preview Mode
                  </button>
                )}
              </div>

              {/* Content Panel */}
              <div className="p-6 space-y-5 max-h-[350px] overflow-y-auto">
                {activeTab === "android" && (
                  <div className="space-y-4">
                    <p className="text-xs text-zinc-300 font-semibold leading-relaxed">
                      Follow these steps on Android phone (Chrome browser):
                      <span className="block text-[#D70F64] font-bold mt-1">انڈرائیڈ فون (کروم بروزر) پر انسٹال کرنے کا طریقہ:</span>
                    </p>

                    <div className="space-y-3.5">
                      <div className="flex gap-3 items-start bg-zinc-950/40 p-3 rounded-xl border border-zinc-800">
                        <span className="w-6 h-6 rounded-lg bg-zinc-800 text-[#D70F64] font-black text-xs flex items-center justify-center shrink-0">1</span>
                        <div>
                          <p className="text-xs font-bold text-white">Tap browser menu (three dots)</p>
                          <p className="text-[10.5px] text-zinc-400 font-medium">کروم بروزر کے اوپر دائیں طرف تین ڈاٹس پر کلک کریں۔</p>
                        </div>
                      </div>

                      {deferredPrompt && (
                        <div className="flex gap-3 items-start bg-[#D70F64]/10 p-3 rounded-xl border border-[#D70F64]/20">
                          <span className="w-6 h-6 rounded-lg bg-[#D70F64] text-white font-black text-xs flex items-center justify-center shrink-0">⚡</span>
                          <div className="flex-1">
                            <p className="text-xs font-black text-white">Direct One-Click Install</p>
                            <p className="text-[10.5px] text-zinc-300 font-medium mb-2">ڈائریکٹ انسٹال کرنے کے لیے یہاں کلک کریں۔</p>
                            <button
                              onClick={handleInstallClick}
                              className="bg-[#D70F64] hover:bg-[#b00c50] text-white text-[10px] font-black px-3.5 py-1.5 rounded-lg transition"
                            >
                              Install Directly Now
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3 items-start bg-zinc-950/40 p-3 rounded-xl border border-zinc-800">
                        <span className="w-6 h-6 rounded-lg bg-zinc-800 text-[#D70F64] font-black text-xs flex items-center justify-center shrink-0">2</span>
                        <div>
                          <p className="text-xs font-bold text-white">Select "Install app" or "Add to Home screen"</p>
                          <p className="text-[10.5px] text-zinc-400 font-medium">پھر "Install app" یا "Add to Home screen" پر کلک کریں۔</p>
                        </div>
                      </div>

                      <div className="flex gap-3 items-start bg-zinc-950/40 p-3 rounded-xl border border-zinc-800">
                        <span className="w-6 h-6 rounded-lg bg-zinc-800 text-[#D70F64] font-black text-xs flex items-center justify-center shrink-0">3</span>
                        <div>
                          <p className="text-xs font-bold text-white">Enjoy Dadu Food App!</p>
                          <p className="text-[10.5px] text-zinc-400 font-medium">اب آپ کی ہوم اسکرین سے ایک سیکنڈ میں دادو فوڈ ایپ اوپن ہو جائے گی!</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "ios" && (
                  <div className="space-y-4">
                    <p className="text-xs text-zinc-300 font-semibold leading-relaxed">
                      Follow these steps on iPhone (Safari browser):
                      <span className="block text-[#D70F64] font-bold mt-1">آئی فون (سفاری بروزر) پر انسٹال کرنے کا طریقہ:</span>
                    </p>

                    <div className="space-y-3.5">
                      <div className="flex gap-3 items-start bg-zinc-950/40 p-3 rounded-xl border border-zinc-800">
                        <span className="w-6 h-6 rounded-lg bg-zinc-800 text-[#D70F64] font-black text-xs flex items-center justify-center shrink-0">1</span>
                        <div>
                          <p className="text-xs font-bold text-white flex items-center gap-1.5">
                            Tap the Share button <Share className="w-3.5 h-3.5 text-[#D70F64]" /> at the bottom
                          </p>
                          <p className="text-[10.5px] text-zinc-400 font-medium">سفاری بروزر کے نیچے موجود "Share" بٹن پر کلک کریں۔</p>
                        </div>
                      </div>

                      <div className="flex gap-3 items-start bg-zinc-950/40 p-3 rounded-xl border border-zinc-800">
                        <span className="w-6 h-6 rounded-lg bg-zinc-800 text-[#D70F64] font-black text-xs flex items-center justify-center shrink-0">2</span>
                        <div>
                          <p className="text-xs font-bold text-white">Scroll down & select "Add to Home Screen"</p>
                          <p className="text-[10.5px] text-zinc-400 font-medium">تھوڑا نیچے اسکرول کر کے "Add to Home Screen" پر کلک کریں۔</p>
                        </div>
                      </div>

                      <div className="flex gap-3 items-start bg-zinc-950/40 p-3 rounded-xl border border-zinc-800">
                        <span className="w-6 h-6 rounded-lg bg-zinc-800 text-[#D70F64] font-black text-xs flex items-center justify-center shrink-0">3</span>
                        <div>
                          <p className="text-xs font-bold text-white">Tap "Add" in top-right</p>
                          <p className="text-[10.5px] text-zinc-400 font-medium">اوپر دائیں کونے میں "Add" کے بٹن پر کلک کریں۔</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "iframe" && (
                  <div className="space-y-4">
                    <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs rounded-xl leading-relaxed">
                      ⚠️ <strong>Currently inside AI Studio Preview Sandbox.</strong> Browsers block automatic installation prompts when inside an iframe container.
                      <span className="block font-bold mt-1.5 text-amber-300">آئی فریم کے اندر انسٹالیشن بلاک ہوتی ہے۔ نیچے والے طریقے سے نیا لنک کھولیں:</span>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs text-zinc-300 font-bold leading-relaxed">
                        To install, you must open the app in a real, dedicated tab:
                      </p>
                      
                      <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 flex flex-col gap-3">
                        <div className="text-[11px] text-zinc-300 font-semibold">
                          1. Click the <span className="text-white font-black bg-zinc-800 px-1.5 py-0.5 rounded text-[10px]">Open in new tab ↗</span> button at the very top-right of your AI Studio interface.
                        </div>
                        <div className="text-[11px] text-zinc-300 font-semibold">
                          2. Then, the PWA installation popups and install options will appear instantly!
                        </div>
                        <a
                          href={window.location.origin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-black py-2 px-4 rounded-xl text-center transition shadow-lg shadow-amber-600/10"
                        >
                          Open in Direct Tab ↗
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4.5 bg-zinc-950 border-t border-zinc-850 flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Dadu Food PWA Engine v1.5</span>
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-zinc-800 hover:bg-zinc-750 text-white text-[10px] font-black px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  Close (بند کریں)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
