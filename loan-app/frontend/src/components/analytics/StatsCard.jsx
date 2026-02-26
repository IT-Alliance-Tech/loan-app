import React from "react";

const StatsCard = ({ title, value, icon, color = "primary" }) => {
  const colorClasses = {
    primary: "bg-blue-50 text-blue-600",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    danger: "bg-rose-50 text-rose-600",
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div
          className={`p-3 rounded-2xl ${colorClasses[color] || colorClasses.primary}`}
        >
          {icon}
        </div>
      </div>
      <div>
        <h3 className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-1">
          {title}
        </h3>
        <p className="text-2xl font-black text-slate-900 tracking-tight">
          {value}
        </p>
      </div>
    </div>
  );
};

export default StatsCard;
