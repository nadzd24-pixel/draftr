import React, { useState, useEffect } from "react";
import { X, ShieldCheck, Users, Settings2, RefreshCw, CheckCircle2 } from "lucide-react";
import { getAdminOverview, updateBetaCap, UserProfileDoc, SUPER_ADMIN_EMAIL } from "../services/firestoreService";

interface AdminPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerToast: (msg: string) => void;
}

export const AdminPortalModal: React.FC<AdminPortalModalProps> = ({
  isOpen,
  onClose,
  triggerToast,
}) => {
  const [cap, setCap] = useState(20);
  const [newCapInput, setNewCapInput] = useState("20");
  const [users, setUsers] = useState<UserProfileDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAdminOverview();
      setCap(data.cap);
      setNewCapInput(data.cap.toString());
      setUsers(data.users);
    } catch {
      triggerToast("Could not fetch latest Firestore admin data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleUpdateCap = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(newCapInput, 10);
    if (isNaN(parsed) || parsed < 1) {
      triggerToast("Please enter a valid cap number (e.g. 20, 50).");
      return;
    }
    setSaving(true);
    const success = await updateBetaCap(parsed);
    setSaving(false);
    if (success) {
      setCap(parsed);
      triggerToast(`✓ Beta user capacity updated to ${parsed} users!`);
    } else {
      triggerToast("Failed to update cap in Firestore.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#fcfbfa] w-full max-w-2xl rounded-3xl border-2 border-[#0f172a] shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-fade-in text-slate-800">
        {/* Header */}
        <div className="p-6 border-b-2 border-stone-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-900 flex items-center justify-center font-bold shadow-sm">
              <ShieldCheck className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-slate-900 text-lg leading-tight">draftr Admin Control Portal</h3>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-stone-500">Sole administrator: {SUPER_ADMIN_EMAIL}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-2xl border-2 border-stone-200 space-y-1">
              <div className="flex items-center justify-between text-stone-500 text-xs font-bold uppercase">
                <span>Active Beta Users</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-serif font-bold text-slate-900">
                {users.length} <span className="text-sm font-sans text-stone-400">/ {cap}</span>
              </p>
              <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (users.length / cap) * 100)}%` }}
                />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border-2 border-stone-200 space-y-1">
              <div className="flex items-center justify-between text-stone-500 text-xs font-bold uppercase">
                <span>Remaining Slots</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-serif font-bold text-slate-900">
                {Math.max(0, cap - users.length)}
              </p>
              <p className="text-[10px] text-stone-400">Slots open before waitlist triggers</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border-2 border-stone-200 space-y-1">
              <div className="flex items-center justify-between text-stone-500 text-xs font-bold uppercase">
                <span>Firestore Sync</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              </div>
              <p className="text-base font-bold text-slate-900 mt-1">Live & Encrypted</p>
              <p className="text-[10px] text-stone-400">Connected to Cloud Firestore</p>
            </div>
          </div>

          {/* Adjust Beta Cap Form */}
          <div className="bg-white p-5 rounded-2xl border-2 border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-stone-700" />
                <h4 className="font-bold text-sm text-slate-900">Beta Launch User Capacity Limit</h4>
              </div>
              <button
                type="button"
                onClick={loadData}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>
            <p className="text-xs text-stone-600">
              Capped to 20 users for your initial launch. Once capacity is reached, new visitors are automatically placed on the private beta waitlist.
            </p>
            <form onSubmit={handleUpdateCap} className="flex items-center gap-3 pt-1">
              <input
                type="number"
                min="1"
                max="10000"
                value={newCapInput}
                onChange={(e) => setNewCapInput(e.target.value)}
                className="w-32 px-3 py-2 border-2 border-stone-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-[#0f172a]"
              />
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {saving ? "Saving..." : "Update Capacity"}
              </button>
            </form>
          </div>

          {/* Registered Users List */}
          <div className="bg-white p-5 rounded-2xl border-2 border-stone-200 space-y-3">
            <h4 className="font-bold text-sm text-slate-900 flex items-center justify-between">
              <span>Registered Beta Creators ({users.length})</span>
              <span className="text-xs text-stone-400 font-normal">Real-time Cloud Firestore</span>
            </h4>

            {loading ? (
              <div className="py-8 text-center text-xs text-stone-400 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>Loading users from Firestore...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-500 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                No external beta users have connected yet.
              </div>
            ) : (
              <div className="divide-y divide-stone-100 max-h-60 overflow-y-auto">
                {users.map((u, idx) => (
                  <div key={u.id || idx} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || "User")}&background=0A66C2&color=fff`}
                        alt={u.name}
                        className="w-8 h-8 rounded-full object-cover bg-stone-100 border border-stone-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-900 truncate">
                          {u.name} {u.role === "admin" && <span className="text-[9px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.2 rounded ml-1">ADMIN</span>}
                        </p>
                        <p className="text-[10px] text-stone-500 truncate">{u.headline || u.email || "Beta Participant"}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-stone-400 font-medium shrink-0">
                      Slot #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t-2 border-stone-200 bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Close Portal
          </button>
        </div>
      </div>
    </div>
  );
};
