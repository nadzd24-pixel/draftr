import React, { useState } from "react";
import { Lock, Sparkles, CheckCircle2 } from "lucide-react";
import { SUPER_ADMIN_EMAIL } from "../services/firestoreService";

interface BetaWaitlistScreenProps {
  currentCount: number;
  cap: number;
  onAdminLoginAttempt: () => void;
}

export const BetaWaitlistScreen: React.FC<BetaWaitlistScreenProps> = ({
  currentCount,
  cap,
  onAdminLoginAttempt,
}) => {
  const [emailInput, setEmailInput] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    try {
      const waitlist = JSON.parse(localStorage.getItem("draftr_waitlist") || "[]");
      waitlist.push({ email: emailInput.trim(), date: new Date().toISOString() });
      localStorage.setItem("draftr_waitlist", JSON.stringify(waitlist));
    } catch {}
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#ede6db] text-[#212020] flex flex-col items-center justify-center p-6 antialiased font-sans selection:bg-[#212020] selection:text-white">
      <div className="max-w-md w-full bg-white rounded-3xl border-2 border-[#0f172a] shadow-2xl p-8 text-center space-y-6 animate-fade-in">
        {/* Logo */}
        <div className="w-20 h-20 mx-auto bg-[#0f172a] rounded-2xl flex items-center justify-center shadow-md">
          <img
            src="/draftr-logo.jpg"
            alt="draftr logo"
            className="w-full h-full object-contain rounded-2xl"
          />
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-300 text-xs font-extrabold uppercase tracking-wider">
          <Lock className="w-3.5 h-3.5" />
          <span>Private Beta Capacity Reached</span>
        </div>

        {/* Heading & Subhead */}
        <div className="space-y-2">
          <h2 className="font-serif text-2xl font-bold text-slate-900">
            Initial Launch Full ({currentCount} / {cap})
          </h2>
          <p className="text-xs text-stone-600 leading-relaxed">
            draftr is currently in an exclusive 20-creator cohort to ensure lightning speed, dedicated Gemini intelligence, and personal onboarding.
          </p>
        </div>

        {/* Waitlist submission form */}
        {submitted ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 space-y-1 animate-fade-in">
            <div className="flex items-center justify-center gap-1.5 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>You're on the priority waitlist!</span>
            </div>
            <p className="text-[11px] text-emerald-700">
              We'll notify {emailInput} the moment our administrator unlocks the next batch of creator seats.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitWaitlist} className="space-y-3">
            <input
              type="email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Enter your email for next wave"
              className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#0f172a] bg-stone-50"
            />
            <button
              type="submit"
              className="w-full py-3 bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Request Early Access Invite</span>
            </button>
          </form>
        )}

        {/* Admin Login Bypass Link */}
        <div className="pt-4 border-t border-stone-150">
          <button
            type="button"
            onClick={onAdminLoginAttempt}
            className="text-[11px] font-bold text-stone-500 hover:text-slate-900 transition underline cursor-pointer"
          >
            Are you the draftr Super Admin ({SUPER_ADMIN_EMAIL})? Click to log in
          </button>
        </div>
      </div>
    </div>
  );
};
