import React from "react";

const Logo = ({ className = "", showText = true, size = "md" }) => {
  const sizeClasses = {
    sm: {
      box: "w-10 h-10 border-[1.5px]",
      sf: "text-lg",
      text: "text-[6px]",
      gap: "gap-0.5",
    },
    md: {
      box: "w-16 h-16 border-2",
      sf: "text-3xl",
      text: "text-[8px]",
      gap: "gap-1",
    },
    lg: {
      box: "w-24 h-24 border-3",
      sf: "text-5xl",
      text: "text-[12px]",
      gap: "gap-1.5",
    },
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div
      className={`flex flex-col items-center justify-center ${currentSize.gap} ${className}`}
    >
      <div
        className={`${currentSize.box} border-slate-900 bg-white flex items-center justify-center overflow-hidden`}
      >
        <span
          className={`${currentSize.sf} font-black text-[#1e293b] leading-none select-none`}
        >
          SF
        </span>
      </div>
      {showText && (
        <span
          className={`${currentSize.text} font-black text-[#dc2626] uppercase tracking-[0.2em] whitespace-nowrap select-none`}
        >
          Square Finance
        </span>
      )}
    </div>
  );
};

export default Logo;
