import React from "react";

interface LinkedInLoginPageProps {
  onOAuthLogin: () => void;
}

export const LinkedInLoginPage: React.FC<LinkedInLoginPageProps> = ({ onOAuthLogin }) => {
  return (
    <div className="min-h-screen bg-[#ede6db] text-[#212020] flex flex-col items-center justify-center p-6 antialiased font-sans selection:bg-[#212020] selection:text-white">
      <div className="flex flex-col items-center text-center space-y-10 animate-fade-in max-w-md w-full">
        {/* Large Logo - No container box, no outline, blends seamlessly */}
        <div className="w-72 h-72 sm:w-88 sm:h-88 md:w-96 md:h-96 flex items-center justify-center">
          <img
            src="/draftr-logo.jpg"
            alt="draftr logo"
            className="w-full h-full object-contain mix-blend-multiply drop-shadow-sm select-none"
          />
        </div>

        {/* Action Button: LOGIN WITH LinkedIn */}
        <div className="w-full max-w-xs sm:max-w-sm">
          <button
            id="btn-login-with-linkedin"
            type="button"
            onClick={onOAuthLogin}
            className="w-full py-4 px-6 bg-[#262626] hover:bg-[#171717] text-white font-extrabold text-sm sm:text-base rounded-2xl flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] border border-[#333333] tracking-wider uppercase"
          >
            <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.2a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24Z" />
            </svg>
            <span>LOGIN WITH LinkedIn</span>
          </button>
        </div>
      </div>
    </div>
  );
};
