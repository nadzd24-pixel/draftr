import React, { useState } from "react";
import { X, RefreshCw, CheckCircle2, User, ExternalLink, Sparkles } from "lucide-react";
import { fetchLinkedInProfile, LinkedInProfileData } from "../services/linkedinProfileService";

interface SyncLinkedInModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  currentHeadline: string;
  currentAvatar: string;
  onApplyProfile: (data: { name: string; headline: string; avatar: string }) => void;
  triggerToast: (msg: string) => void;
}

export const SyncLinkedInModal: React.FC<SyncLinkedInModalProps> = ({
  isOpen,
  onClose,
  currentName,
  currentHeadline,
  currentAvatar,
  onApplyProfile,
  triggerToast
}) => {
  const [inputUrl, setInputUrl] = useState(() => {
    return localStorage.getItem("draftr_linkedin_handle") || "";
  });
  const [isFetching, setIsFetching] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [previewData, setPreviewData] = useState<LinkedInProfileData | null>(null);

  if (!isOpen) return null;

  const handleFetch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputUrl.trim()) {
      setErrorMsg("Please enter your LinkedIn profile username or URL.");
      return;
    }

    setIsFetching(true);
    setErrorMsg("");

    try {
      const data = await fetchLinkedInProfile(inputUrl);
      setPreviewData(data);
      localStorage.setItem("draftr_linkedin_handle", data.handle);
    } catch (err: any) {
      console.error("Failed to pull LinkedIn profile:", err);
      setErrorMsg(err.message || "Failed to pull profile from LinkedIn. Please verify the username.");
    } finally {
      setIsFetching(false);
    }
  };

  const handleApply = () => {
    if (!previewData) return;
    onApplyProfile({
      name: previewData.name,
      headline: previewData.headline,
      avatar: previewData.picture
    });
    triggerToast("✓ LinkedIn profile picture and description updated!");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border-2 border-[#0f172a] shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-scale-up text-[#0f172a]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0f172a] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0a66c2] flex items-center justify-center font-bold text-white text-base">
              in
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Sync LinkedIn Profile</h3>
              <p className="text-[11px] text-slate-300">Pull your official photo & description</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <p className="text-xs text-stone-600 leading-relaxed">
            Enter your public LinkedIn username or profile link (e.g. <span className="font-mono bg-stone-100 px-1 py-0.5 rounded text-stone-800">linkedin.com/in/your-name</span>) to pull your live profile picture, name, and headline directly into Draftr.
          </p>

          <form onSubmit={handleFetch} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#0f172a] mb-1">
                LinkedIn Profile URL or Username
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="e.g. satyanadella or linkedin.com/in/..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl border-2 border-stone-300 focus:border-[#0a66c2] focus:outline-hidden text-xs font-medium"
                />
                <button
                  type="submit"
                  disabled={isFetching || !inputUrl.trim()}
                  className="px-4 py-2.5 bg-[#0a66c2] hover:bg-[#004182] disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition cursor-pointer shrink-0"
                >
                  {isFetching ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Pulling...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Pull Info</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                {errorMsg}
              </p>
            )}
          </form>

          {/* Preview of pulled LinkedIn Data */}
          {previewData && (
            <div className="p-4 rounded-2xl bg-stone-50 border-2 border-stone-200 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Live LinkedIn Profile Found
                </span>
                <span className="text-[10px] text-stone-500 font-normal">Preview</span>
              </div>

              <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-stone-200">
                <img
                  src={previewData.picture}
                  alt={previewData.name}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-full object-cover border-2 border-[#0a66c2] shadow-xs shrink-0"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(previewData.name)}&background=0A66C2&color=fff`;
                  }}
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-[#0f172a] truncate">{previewData.name}</h4>
                  <p className="text-xs text-stone-600 line-clamp-2 mt-0.5 leading-snug">{previewData.headline}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleApply}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Apply This Profile to Draftr</span>
              </button>
            </div>
          )}

          {/* Current Profile Info */}
          {!previewData && (currentName || currentAvatar) && (
            <div className="pt-2 border-t border-stone-200">
              <span className="text-[10px] uppercase font-bold text-stone-600 block mb-2">Current Active Profile in Draftr</span>
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-stone-50">
                <img
                  src={currentAvatar || "/draftr-logo.jpg"}
                  alt="Avatar"
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover border border-stone-300"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold block truncate">{currentName || "Unnamed User"}</span>
                  <span className="text-[10px] text-stone-600 block truncate">{currentHeadline || "No description set"}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-stone-100 border-t border-stone-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
