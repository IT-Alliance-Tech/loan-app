import React from "react";
import Image from "next/image";

const Logo = ({ className = "", showText = true, size = "md" }) => {
  const sizeClasses = {
    sm: {
      width: 48,
      height: 48,
    },
    md: {
      width: 80,
      height: 80,
    },
    lg: {
      width: 140,
      height: 140,
    },
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Image
        src="/logo.jpg"
        alt="Square Finance"
        width={currentSize.width}
        height={currentSize.height}
        className="object-contain rounded-sm"
        priority
      />
    </div>
  );
};

export default Logo;
