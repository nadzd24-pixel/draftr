import React, { useState, useEffect } from "react";
import {
  Smartphone,
  Share2,
  PlusSquare,
  MoreVertical,
  Download,
  Check,
  Copy,
  X,
  Sparkles,
  CheckCircle2,
  Laptop
} from "lucide-react";
import { DraftrLogo } from "./DraftrLogo";

interface InstallToPhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstallNative: () => void;
  onInstallSuccess?: () => void;
}

export const InstallToPhoneModal: React.FC<InstallToPhoneModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallNative,
  onInstallSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<"ios" | "android" | "desktop">("ios");
  const [copied, setCopied] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = window.location.href;
      setCurrentUrl(url);

      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes("android-app://");
      setIsStandalone(standalone);
      if (standalone && onInstallSuccess) {
        onInstallSuccess();
      }
    }
  }, [isOpen, onInstallSuccess]);

  useEffect(() => {
    const handleInstalled = () => {
      setIsStandalone(true);
      if (onInstallSuccess) onInstallSuccess();
    };
    window.addEventListener("appinstalled", handleInstalled);
    return () => window.removeEventListener("appinstalled", handleInstalled);
  }, [onInstallSuccess]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy link:", e);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="modal-install-to-phone"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border-2 border-[#0f172a] rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] animate-scale-up text-[#0f172a]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b-2 border-slate-800 flex items-center justify-between bg-[#0f172a] text-white">
          <div className="flex items-center gap-3">
            <DraftrLogo className="w-8 h-8" variant="light" />
            <div>
              <h3 className="font-serif text-lg font-bold text-white tracking-tight">
                Install draftr (PWA App)
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Install as a lightweight progressive web app on any device
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Status Badge */}
          {isStandalone ? (
            <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-900 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Installed & Ready:</strong> draftr is currently running as a standalone app!
              </span>
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-[#0f172a] text-[#0f172a] text-xs px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 font-medium">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0f172a] shrink-0" />
                <span>Runs full-screen with offline support, instant launch, and zero app store hassle.</span>
              </div>
              {deferredPrompt && (
                <button
                  onClick={onInstallNative}
                  className="bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0 transition shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                  Install Now
                </button>
              )}
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-bold border border-slate-200">
            <button
              onClick={() => setActiveTab("ios")}
              className={`flex-1 py-2 px-2.5 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
                activeTab === "ios"
                  ? "bg-[#0f172a] text-white shadow-xs"
                  : "text-slate-600 hover:text-[#0f172a]"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>iOS / iPhone</span>
            </button>
            <button
              onClick={() => setActiveTab("android")}
              className={`flex-1 py-2 px-2.5 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
                activeTab === "android"
                  ? "bg-[#0f172a] text-white shadow-xs"
                  : "text-slate-600 hover:text-[#0f172a]"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android</span>
            </button>
            <button
              onClick={() => setActiveTab("desktop")}
              className={`flex-1 py-2 px-2.5 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
                activeTab === "desktop"
                  ? "bg-[#0f172a] text-white shadow-xs"
                  : "text-slate-600 hover:text-[#0f172a]"
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Desktop</span>
            </button>
          </div>

          {/* TAB 1: iPhone (iOS Safari) */}
          {activeTab === "ios" && (
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 rounded-2xl border-2 border-[#0f172a] space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#0f172a] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#0f172a]">
                      Open Safari on iPhone or iPad
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">
                      Open this website in Apple Safari (PWA install requires Safari on iOS).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-2.5 border-t border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-[#0f172a] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#0f172a] flex items-center gap-1.5">
                      Tap the Share Button <Share2 className="w-3.5 h-3.5 text-blue-600 inline" />
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">
                      Tap the square Share icon with an upward arrow in Safari's bottom toolbar.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-2.5 border-t border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-[#0f172a] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#0f172a] flex items-center gap-1.5">
                      Select "Add to Home Screen" <PlusSquare className="w-3.5 h-3.5 text-slate-700 inline" />
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">
                      Scroll down the share sheet and tap <strong>Add to Home Screen</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-2.5 border-t border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-[#0f172a] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#0f172a]">
                      Tap "Add"
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">
                      draftr will now be installed on your Home Screen as an app icon!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Android (Google Chrome) */}
          {activeTab === "android" && (
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 rounded-2xl border-2 border-[#0f172a] space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#0f172a] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#0f172a]">
                      Open Chrome on Android
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">
                      Open this URL in Google Chrome on your Android device.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-2.5 border-t border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-[#0f172a] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#0f172a] flex items-center gap-1.5">
                      Tap Menu (3 dots) <MoreVertical className="w-3.5 h-3.5 text-slate-700 inline" />
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">
                      In the top right corner of Chrome, tap the three dots icon.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-2.5 border-t border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-[#0f172a] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#0f172a]">
                      Tap "Install App" or "Add to Home screen"
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">
                      Chrome will prompt you to install draftr directly to your device.
                    </p>
                  </div>
                </div>
              </div>

              {deferredPrompt && (
                <button
                  onClick={onInstallNative}
                  className="w-full bg-[#0f172a] hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer text-xs shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  Install directly on this device
                </button>
              )}
            </div>
          )}

          {/* TAB 3: Desktop (Chrome / Edge / Safari / Brave) */}
          {activeTab === "desktop" && (
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 rounded-2xl border-2 border-[#0f172a] space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#0f172a] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#0f172a]">
                      Look at Browser Address Bar
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">
                      In Chrome, Edge, or Brave, look at the right side of the address bar for the <strong>Install</strong> icon (<Download className="w-3 h-3 inline" /> or a screen with a down arrow).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-2.5 border-t border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-[#0f172a] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#0f172a]">
                      Click "Install draftr"
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">
                      draftr will install as a native desktop application with its own dock/taskbar icon and dedicated window.
                    </p>
                  </div>
                </div>
              </div>

              {deferredPrompt && (
                <button
                  onClick={onInstallNative}
                  className="w-full bg-[#0f172a] hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer text-xs shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  Install Desktop App Now
                </button>
              )}
            </div>
          )}

          {/* Copy Share Link */}
          <div className="space-y-1.5 text-left pt-2 border-t border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Share link with mobile:
            </span>
            <div className="flex items-center gap-2 bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2">
              <span className="text-xs text-slate-800 truncate font-mono flex-1">
                {currentUrl}
              </span>
              <button
                onClick={handleCopy}
                className="bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1.5 shrink-0 transition cursor-pointer shadow-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t-2 border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
          {!isStandalone ? (
            <button
              type="button"
              onClick={() => {
                if (onInstallSuccess) onInstallSuccess();
                setIsStandalone(true);
                onClose();
              }}
              className="text-[11px] font-bold text-blue-900 hover:text-blue-700 underline cursor-pointer"
            >
              ✓ I've installed draftr to my device
            </button>
          ) : (
            <span className="text-[11px] text-slate-500 font-medium">
              Installed progressive web app.
            </span>
          )}
          <button
            onClick={onClose}
            className="bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

