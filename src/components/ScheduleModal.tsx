import React from "react";
import {
  Calendar,
  Clock,
  X,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Globe,
  Share2
} from "lucide-react";

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  postText: string;
  postTitle: string;
  postImage?: string | null;
  userName: string;
  userAvatar: string;
  scheduledDate: string;
  setScheduledDate: (date: string) => void;
  scheduledTime: string;
  setScheduledTime: (time: string) => void;
  onConfirmSchedule: (viewQueue?: boolean) => void;
  isLinkedInConnected: boolean;
  onConnectLinkedIn?: () => void;
  isLoggedIn?: boolean;
  onOpenLogin?: () => void;
  drafts?: Array<{ styleLabel: string; title: string; text: string }>;
  selectedDraftIndex?: number;
  onSelectDraftIndex?: (idx: number) => void;
}

export function ScheduleModal({
  isOpen,
  onClose,
  postText,
  postTitle,
  postImage,
  userName,
  userAvatar,
  scheduledDate,
  setScheduledDate,
  scheduledTime,
  setScheduledTime,
  onConfirmSchedule,
  isLinkedInConnected,
  onConnectLinkedIn,
  isLoggedIn = true,
  onOpenLogin,
  drafts,
  selectedDraftIndex = 0,
  onSelectDraftIndex
}: ScheduleModalProps) {
  if (!isOpen) return null;

  // Local timezone string
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local Time";

  // Calculate presets
  const getPresetDate = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString().split("T")[0];
  };

  const getNextWeekdayDate = (dayOfWeek: number) => {
    // 1 = Monday
    const d = new Date();
    d.setDate(d.getDate() + ((dayOfWeek + 7 - d.getDay()) % 7 || 7));
    return d.toISOString().split("T")[0];
  };

  const timingPresets = [
    {
      label: "Tomorrow Morning (Peak Reach)",
      date: getPresetDate(1),
      time: "08:30",
      description: "Best for early workday professionals"
    },
    {
      label: "Tomorrow Lunch Break",
      date: getPresetDate(1),
      time: "12:15",
      description: "High mobile scroll traffic"
    },
    {
      label: "In 2 Days Afternoon",
      date: getPresetDate(2),
      time: "17:00",
      description: "Commute & evening engagement"
    },
    {
      label: "Next Monday Kickoff",
      date: getNextWeekdayDate(1),
      time: "08:45",
      description: "High algorithm reset velocity"
    }
  ];

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border-2 border-[#0f172a] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#0f172a] text-white px-6 py-4.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 id="schedule-modal-title" className="font-serif font-bold text-base sm:text-lg text-white leading-tight">
                Schedule LinkedIn Post
              </h3>
              <p className="text-xs text-slate-400">Plan ahead and publish at peak visibility times</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close schedule modal"
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Post Snippet Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center gap-2">
              <img
                src={userAvatar}
                alt={userName}
                className="w-7 h-7 rounded-full border border-slate-300 object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=0A66C2&color=fff`;
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate">{userName}</p>
                <p className="text-[10px] text-slate-500 truncate">
                  {postTitle ? `Topic: ${postTitle}` : "Draft ready for scheduling"}
                </p>
              </div>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full shrink-0">
                Queued Draft
              </span>
            </div>

            <p className="text-xs text-slate-700 line-clamp-3 leading-relaxed whitespace-pre-wrap font-sans bg-white p-2.5 rounded-xl border border-slate-200/80">
              {postText || "No post text selected"}
            </p>

            {drafts && drafts.length > 1 && (
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Choose Draft:</span>
                <div className="flex gap-1.5 flex-wrap">
                  {drafts.map((d, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onSelectDraftIndex && onSelectDraftIndex(i)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        selectedDraftIndex === i
                          ? "bg-[#0f172a] text-white shadow-xs"
                          : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                      }`}
                    >
                      {d.styleLabel || `Draft ${i + 1}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {postImage && (
              <div className="flex items-center gap-2 text-[11px] text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg">
                <span className="text-blue-600">🖼️</span>
                <span className="font-medium truncate">Visual asset attached</span>
              </div>
            )}
          </div>

          {/* Quick Timing Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Recommended Peak Hours (LinkedIn Algorithm)
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {timingPresets.map((preset, idx) => {
                const isSelected = scheduledDate === preset.date && scheduledTime === preset.time;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setScheduledDate(preset.date);
                      setScheduledTime(preset.time);
                    }}
                    className={`text-left p-2.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "border-[#0f172a] bg-slate-100/90 shadow-xs"
                        : "border-slate-200 hover:border-slate-400 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-slate-900">{preset.time} AM/PM</span>
                      {isSelected && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 mt-0.5">
                      {preset.label}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      {preset.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Date & Time Picker */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-600" />
              Custom Date & Time
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Schedule Date
                </label>
                <input
                  type="date"
                  min={todayStr}
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full text-xs border-2 border-slate-200 rounded-xl p-2.5 bg-slate-50 text-slate-900 font-semibold focus:bg-white focus:border-[#0f172a] focus:outline-none transition cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Schedule Time ({userTimezone.split("/").pop()?.replace(/_/g, " ")})
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full text-xs border-2 border-slate-200 rounded-xl p-2.5 bg-slate-50 text-slate-900 font-semibold focus:bg-white focus:border-[#0f172a] focus:outline-none transition cursor-pointer"
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Globe className="w-3 h-3 text-slate-400" />
              <span>Timezone: {userTimezone}</span>
            </div>
          </div>

          {/* LinkedIn Account Connection Notice */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0077b5] flex items-center justify-center text-white shrink-0">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {isLinkedInConnected ? "LinkedIn Account Connected" : "Publish directly to LinkedIn"}
                </p>
                <p className="text-[11px] text-slate-600">
                  {isLinkedInConnected
                    ? "Posts can be published seamlessly from your scheduled queue"
                    : "Connect your LinkedIn profile for instant 1-click posting"}
                </p>
              </div>
            </div>
            {!isLinkedInConnected && onConnectLinkedIn && (
              <button
                type="button"
                onClick={onConnectLinkedIn}
                className="bg-[#0077b5] hover:bg-[#006097] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shrink-0 cursor-pointer shadow-xs transition"
              >
                Connect
              </button>
            )}
          </div>

          {/* Login Required Notice if not logged in */}
          {!isLoggedIn && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3.5 flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white shrink-0 text-sm font-bold">
                  🔒
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-900">
                    Account Login Required
                  </p>
                  <p className="text-[11px] text-amber-800">
                    You must be logged in to save and queue posts to your automated schedule.
                  </p>
                </div>
              </div>
              {onOpenLogin && (
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shrink-0 cursor-pointer shadow-xs transition whitespace-nowrap"
                >
                  Log In
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer rounded-xl"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!isLoggedIn ? (
              <button
                type="button"
                onClick={onOpenLogin}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md border-2 border-[#0f172a]"
              >
                <span>🔒 Log In to Schedule Post</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onConfirmSchedule(true)}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-white border-2 border-[#0f172a] text-[#0f172a] hover:bg-slate-50 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <span>Schedule & View Queue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => onConfirmSchedule(false)}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md border-2 border-[#0f172a]"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Confirm Schedule</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
