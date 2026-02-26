import React from "react";

const Logo = ({ className = "", showText = true, size = "md" }) => {
  const sizeClasses = {
    sm: {
      boxPadding: "px-3 py-2 border-[1.5px]",
      sf: "text-xl",
      text: "text-[9px]",
      mt: "mt-1",
    },
    md: {
      boxPadding: "px-5 py-4 border-2",
      sf: "text-5xl",
      text: "text-[14px]",
      mt: "mt-1.5",
    },
    lg: {
      boxPadding: "px-10 py-8 border-4",
      sf: "text-8xl",
      text: "text-[24px]",
      mt: "mt-3",
    },
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div
      className={`${currentSize.boxPadding} border-[#26467a] bg-white flex flex-col items-center justify-center rounded-sm ${className}`}
    >
      <span
        className={`${currentSize.sf} font-black text-[#26467a] leading-tight select-none`}
      >
        SF
      </span>
      {showText && (
        <span
          className={`${currentSize.text} font-bold text-[#8b3a36] tracking-tight whitespace-nowrap select-none ${currentSize.mt}`}
        >
          Square Finance
        </span>
      )}
    </div>
  );
};

export default Logo;
