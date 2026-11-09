import React from "react";
import { BookOpen, Sliders, Calendar, Sparkles, X, CheckCircle2, ArrowRight } from "lucide-react";
import { DraftrLogo } from "./DraftrLogo";

interface HowToUseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToUseModal: React.FC<HowToUseModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border-2 border-[#0f172a] shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-up text-[#0f172a] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#0f172a] text-white px-6 py-4 flex items-center justify-between border-b-2 border-slate-800">
          <div className="flex items-center gap-3">
            <DraftrLogo className="w-8 h-8" variant="light" />
            <div>
              <h3 className="font-serif text-lg font-bold text-white tracking-tight">
                How to use draftr
              </h3>
              <p className="text-[11px] text-slate-300">Quick guide to high-impact LinkedIn content</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          <div className="text-center max-w-lg mx-auto space-y-1">
            <h4 className="font-bold text-base text-[#0f172a]">
              Turn Raw Notes into Polished LinkedIn Posts in 3 Simple Steps
            </h4>
            <p className="text-xs text-slate-600">
              draftr formats your thoughts, code, and transcripts into high-retention posts designed for LinkedIn's feed algorithm.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {/* Step 1 */}
            <div className="p-4 rounded-2xl bg-slate-50 border-2 border-[#0f172a] flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-[#0f172a] text-white font-bold flex items-center justify-center shrink-0 text-sm">
                1
              </div>
              <div className="space-y-1">
                <h5 className="font-bold text-sm text-[#0f172a] flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#0f172a]" />
                  Paste Raw Notes, Code, or Links
                </h5>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Drop your messy meeting bullets, code snippets, project notes, or link any blog/article URL. No formatting required.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-2xl bg-slate-50 border-2 border-[#0f172a] flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-[#0f172a] text-white font-bold flex items-center justify-center shrink-0 text-sm">
                2
              </div>
              <div className="space-y-1">
                <h5 className="font-bold text-sm text-[#0f172a] flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-[#0f172a]" />
                  Tune Tone & Visual Graphics
                </h5>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Choose a writing persona (e.g. Educational Breakdown, Inspiring Story, Analytical Deep-Dive) and generate or upload an optional custom graphic.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-2xl bg-slate-50 border-2 border-[#0f172a] flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-[#0f172a] text-white font-bold flex items-center justify-center shrink-0 text-sm">
                3
              </div>
              <div className="space-y-1">
                <h5 className="font-bold text-sm text-[#0f172a] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#0f172a]" />
                  Preview, Schedule, or Publish
                </h5>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Review 3 tailored draft variations in the real-time LinkedIn feed mockup. Edit copy on the fly, copy to clipboard, or schedule for automated posting.
                </p>
              </div>
            </div>
          </div>

          {/* Pro Tips */}
          <div className="p-4 bg-blue-50/60 rounded-2xl border-2 border-blue-200 space-y-2">
            <h5 className="font-bold text-xs uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Best Practices for Engagement
            </h5>
            <ul className="text-xs text-slate-700 space-y-1.5">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-800 shrink-0" />
                <span><strong>Hook Optimization:</strong> draftr ensures the first 2 lines stop the scroll.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-800 shrink-0" />
                <span><strong>Zero AI Clichés:</strong> Automatically strips corporate buzzwords for authentic personal voice.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-800 shrink-0" />
                <span><strong>High-Retention Formatting:</strong> Uses clean line breaks for mobile screen readability.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t-2 border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#0f172a] hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            Got it, Let's Draft
          </button>
        </div>
      </div>
    </div>
  );
};
