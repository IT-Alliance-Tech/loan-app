import React, { useState, useEffect, useRef } from "react";

const PaymentModeSelector = ({ value, onChange, label = "Payment Mode" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const modes = ["Cash", "Online", "GPay", "PhonePe", "Cheque"];

  const selectedModes = value
    ? value
        .split(",")
        .map((m) => m.trim())
        .filter((m) => m !== "")
    : [];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleMode = (mode) => {
    let newModes;
    if (selectedModes.includes(mode)) {
      newModes = selectedModes.filter((m) => m !== mode);
    } else {
      newModes = [...selectedModes, mode];
    }
    onChange(newModes.join(", "));
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
          {label}
        </label>
      )}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex items-center justify-between hover:border-slate-300 transition-all cursor-pointer min-h-[46px]"
      >
        <span className="truncate">
          {selectedModes.length > 0 ? selectedModes.join(", ") : "Select Mode"}
        </span>
        <span
          className={`transition-transform duration-200 text-[10px] text-slate-400 ${isOpen ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[120] p-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {modes.map((mode) => {
            const isSelected = selectedModes.includes(mode);
            return (
              <button
                key={mode}
                type="button"
                onClick={() => toggleMode(mode)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all mb-1 last:mb-0 ${
                  isSelected
                    ? "bg-primary/5 text-primary"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {mode}
                {isSelected && (
                  <span className="text-primary font-bold">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PaymentModeSelector;
