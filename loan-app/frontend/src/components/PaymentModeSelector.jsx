import React, { useState, useRef, useEffect } from "react";

const PaymentModeSelector = ({ value, onChange, label = "Payment Mode" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const options = ["Cash", "Online", "GPay", "PhonePe", "Cheque"];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = (option) => {
    const currentModes = value ? value.split(", ") : [];
    const updatedModes = currentModes.includes(option)
      ? currentModes.filter((m) => m !== option)
      : [...currentModes, option];

    onChange({
      target: {
        name: "paymentMode",
        value: updatedModes.join(", "),
      },
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex items-center justify-between hover:border-slate-300 transition-all min-h-[46px]"
      >
        <span className="truncate">{value || "Select Mode"}</span>
        <span
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[120] p-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {options.map((mode) => {
            const isSelected = (value || "").split(", ").includes(mode);
            return (
              <button
                key={mode}
                type="button"
                onClick={() => handleToggle(mode)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all mb-1 last:mb-0 ${
                  isSelected
                    ? "bg-primary/5 text-primary"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {mode}
                {isSelected && <span className="text-primary">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PaymentModeSelector;
