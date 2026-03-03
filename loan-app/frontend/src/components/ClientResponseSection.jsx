"use client";
import React from "react";

const ClientResponseSection = ({
  clientResponse,
  nextFollowUpDate,
  onChange,
  onBlur,
  isViewOnly = false,
  nameResponse = "clientResponse",
  nameDate = "nextFollowUpDate",
}) => {
  return (
    <div className="bg-[#0A0C14] rounded-xl p-6 shadow-xl border border-slate-800 animate-in slide-in-from-bottom duration-700 max-w-xl">
      <h2 className="text-[10px] font-black text-slate-500 mb-6 flex items-center gap-3 uppercase tracking-[0.2em]">
        Status Update (Client Response)
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <div className="md:col-span-8 space-y-3">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">
            Message
          </label>
          <textarea
            name={nameResponse}
            value={clientResponse || ""}
            onChange={onChange}
            onBlur={onBlur}
            placeholder="Response..."
            disabled={isViewOnly}
            rows="3"
            className="w-full bg-transparent border border-slate-800 rounded-2xl px-5 py-4 text-sm font-bold text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-slate-700 resize-none disabled:opacity-50"
          />
        </div>
        <div className="md:col-span-4 space-y-3">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">
            Follow-up Date
          </label>
          <input
            type="date"
            name={nameDate}
            value={nextFollowUpDate || ""}
            onChange={onChange}
            onBlur={onBlur}
            disabled={isViewOnly}
            className="w-full bg-transparent border border-slate-800 rounded-2xl px-5 py-4 text-sm font-bold text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all [color-scheme:dark] disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  );
};

export default ClientResponseSection;
