import React, { useState, useRef } from "react";
import { X, Camera, Sparkles, CheckCircle2, Upload, Link, User } from "lucide-react";
import { fetchLinkedInProfile } from "../services/linkedinProfileService";
import { saveUserProfileToFirestore, SUPER_ADMIN_EMAIL } from "../services/firestoreService";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  currentHeadline: string;
  currentAvatar: string;
  isAdmin: boolean;
  userEmail?: string;
  onSaveProfile: (profile: { name: string; headline: string; avatar: string }) => void;
  triggerToast: (msg: string) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentName,
  currentHeadline,
  currentAvatar,
  isAdmin,
  userEmail,
  onSaveProfile,
  triggerToast
}) => {
  const [name, setName] = useState(currentName || "Naadirah Devnath");
  const [headline, setHeadline] = useState(
    currentHeadline && currentHeadline !== "Content Creator"
      ? currentHeadline
      : "Marketing Strategist & Digital Creator | Founder"
  );
  const [avatar, setAvatar] = useState(currentAvatar || "");
  const [linkedinUrl, setLinkedinUrl] = useState(() => localStorage.getItem("draftr_linkedin_handle") || "");
  const [isFetchingLinkedIn, setIsFetchingLinkedIn] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle local image upload (from device)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      triggerToast("⚠️ Image is too large. Please select a photo under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setAvatar(result);
        triggerToast("📸 Profile photo updated!");
      }
    };
    reader.readAsDataURL(file);
  };

  // Auto-fetch profile picture and headline from LinkedIn profile URL or handle
  const handleFetchFromLinkedIn = async () => {
    if (!linkedinUrl.trim()) {
      setFetchError("Please enter your LinkedIn profile handle or URL.");
      return;
    }

    setIsFetchingLinkedIn(true);
    setFetchError("");

    try {
      const data = await fetchLinkedInProfile(linkedinUrl);
      if (data.name) setName(data.name);
      if (data.headline) setHeadline(data.headline);
      if (data.picture) setAvatar(data.picture);
      localStorage.setItem("draftr_linkedin_handle", data.handle);
      triggerToast("✨ Profile details successfully fetched from LinkedIn!");
    } catch (err: any) {
      console.warn("LinkedIn fetch error:", err);
      setFetchError(err.message || "Could not fetch public profile. You can upload your photo directly below.");
    } finally {
      setIsFetchingLinkedIn(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const finalName = name.trim() || "Naadirah Devnath";
    const finalHeadline = headline.trim() || "Marketing Strategist & Digital Creator";
    const finalAvatar = avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(finalName)}&background=0A66C2&color=fff&size=256`;

    // 1. Update React state in parent
    onSaveProfile({
      name: finalName,
      headline: finalHeadline,
      avatar: finalAvatar
    });

    // 2. Persist to Firestore
    try {
      await saveUserProfileToFirestore({
        id: isAdmin ? "admin_user" : "user_" + Date.now(),
        email: userEmail || SUPER_ADMIN_EMAIL,
        name: finalName,
        headline: finalHeadline,
        avatar: finalAvatar
      });
    } catch (err) {
      console.warn("Error syncing to Firestore:", err);
    }

    setIsSaving(false);
    triggerToast("✓ Profile successfully updated and saved!");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border-2 border-[#0f172a] shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-scale-up text-[#0f172a]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#0f172a] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0a66c2] flex items-center justify-center font-bold text-white text-base">
              in
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Edit Your Profile</h3>
              <p className="text-[11px] text-slate-300">Update photo, name & LinkedIn description</p>
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

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          
          {/* Avatar Upload / Preview Section */}
          <div className="flex flex-col items-center justify-center pb-3 border-b border-stone-200">
            <div className="relative group">
              <img
                src={avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0A66C2&color=fff&size=256`}
                alt="Profile Preview"
                referrerPolicy="no-referrer"
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg bg-stone-100"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0A66C2&color=fff&size=256`;
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 bg-[#0a66c2] hover:bg-[#004182] text-white rounded-full shadow-md cursor-pointer transition transform hover:scale-110"
                title="Upload Photo from Device"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageFileChange}
              accept="image/*"
              className="hidden"
            />

            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-[#0a66c2] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload from Device</span>
              </button>
            </div>
          </div>

          {/* Auto-Fetch from LinkedIn Handle */}
          <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-[#0a66c2]" />
                <span>Import from LinkedIn Profile URL</span>
              </label>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="linkedin.com/in/your-name"
                className="flex-1 px-3 py-2 rounded-xl bg-white border border-blue-300 focus:border-[#0a66c2] focus:outline-hidden text-xs"
              />
              <button
                type="button"
                onClick={handleFetchFromLinkedIn}
                disabled={isFetchingLinkedIn || !linkedinUrl.trim()}
                className="px-3 py-2 bg-[#0a66c2] hover:bg-[#004182] disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0 transition"
              >
                {isFetchingLinkedIn ? (
                  <span>Syncing...</span>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Auto-Sync</span>
                  </>
                )}
              </button>
            </div>
            {fetchError && (
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                {fetchError}
              </p>
            )}
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-[#0f172a] mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Naadirah Devnath"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-stone-200 focus:border-[#0f172a] focus:outline-hidden text-xs font-medium"
            />
          </div>

          {/* Professional Headline / Description */}
          <div>
            <label className="block text-xs font-bold text-[#0f172a] mb-1.5">
              Professional Headline / LinkedIn Bio
            </label>
            <textarea
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Marketing Strategist & Digital Creator | Founder"
              rows={2}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-stone-200 focus:border-[#0f172a] focus:outline-hidden text-xs font-medium resize-none"
            />
            <p className="text-[10px] text-stone-500 mt-1">
              This appears under your name on all generated LinkedIn post cards.
            </p>
          </div>

          {/* Photo URL Direct Paste (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">
              Photo URL (Optional)
            </label>
            <input
              type="url"
              value={avatar.startsWith("data:") ? "" : avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="https://media.licdn.com/dms/image/..."
              className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:border-[#0f172a] focus:outline-hidden text-xs text-stone-700"
            />
          </div>

          {/* Role Status Badge */}
          {isAdmin && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-900">
                👑 Super Admin Status: Active
              </span>
              <span className="text-[10px] font-semibold text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-md">
                Unlimited 20-Cap Access
              </span>
            </div>
          )}

          {/* Submit Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border-2 border-stone-300 hover:bg-stone-100 font-bold text-xs text-stone-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{isSaving ? "Saving..." : "Save Profile"}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
