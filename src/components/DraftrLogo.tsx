import React from "react";

interface DraftrLogoProps {
  className?: string;
  variant?: "dark" | "light";
  showText?: boolean;
}

export const DraftrLogo: React.FC<DraftrLogoProps> = ({
  className = "w-9 h-9",
  variant = "light",
  showText = false
}) => {
  const textColor = variant === "dark" ? "#0f172a" : "#f8fafc";

  return (
    <div className={`flex items-center gap-2.5 ${showText ? "" : "inline-flex"}`}>
      <img
        src="/draftr-logo.jpg"
        alt="draftr logo"
        className={`${className} rounded-lg object-contain`}
      />
      {showText && (
        <span
          className="font-sans lowercase tracking-[0.2em] font-semibold text-base select-none"
          style={{ color: textColor }}
        >
          draftr
        </span>
      )}
    </div>
  );
};
