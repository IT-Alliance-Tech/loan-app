"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { getUserFromToken } from "../utils/auth";
import Logo from "./Logo";

const navItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: "📊" },
  { name: "Analytics", href: "/admin/analytics", icon: "📈" },
  { name: "Customers", href: "/admin/customers", icon: "👤" },
  { name: "Loans", href: "/admin/loans", icon: "💰" },
  {
    name: "Employees",
    href: "/admin/employees",
    icon: "👥",
    roles: ["SUPER_ADMIN"],
  },
  { name: "EMI Details", href: "/admin/emi-details", icon: "🗓️" },
  { name: "Seized Vehicles", href: "/admin/seized-vehicles", icon: "🚗" },
  {
    name: "Payments",
    icon: "💸",
    subItems: [
      { name: "Pending", href: "/admin/pending-payments" },
      { name: "Partial", href: "/admin/partial-payments" },
      { name: "Followup", href: "/admin/followup-payments" },
      { name: "Foreclosure", href: "/admin/foreclosure-payments" },
    ],
  },
  { name: "Expenses", href: "/admin/expenses", icon: "🧾" },

  {
    name: "Documents",
    icon: "📄",
    subItems: [
      { name: "NOC", href: "/admin/generate-document/noc" },
      {
        name: "Seizing Notice",
        href: "/admin/generate-document/seizing-notice",
      },
    ],
  },
];

const Sidebar = () => {
  const pathname = usePathname();
  const user = getUserFromToken();
  const [expandedMenus, setExpandedMenus] = useState({});

  useEffect(() => {
    // Auto-expand menu if sub-item is active
    const activeSubMenu = navItems.find((item) =>
      item.subItems?.some((sub) => pathname === sub.href),
    );
    if (activeSubMenu) {
      setTimeout(() => {
        setExpandedMenus((prev) => ({ ...prev, [activeSubMenu.name]: true }));
      }, 0);
    }
  }, [pathname]);

  const toggleMenu = (name) => {
    setExpandedMenus((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role),
  );

  return (
    <>
      {/* DESKTOP SIDEBAR DESIGN */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0">
        <div className="h-24 flex items-center gap-3 px-6 border-b border-slate-200 flex-shrink-0 bg-slate-50/30">
          <Logo size="sm" />
          <div className="h-8 w-px bg-slate-200"></div>
          <span className="font-black text-slate-400 tracking-[0.2em] uppercase text-[9px]">
            Admin
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <nav className="space-y-1">
            {filteredNavItems.map((item) => {
              if (item.subItems) {
                const isExpanded = expandedMenus[item.name];
                const isAnySubActive = item.subItems.some(
                  (sub) => pathname === sub.href,
                );
                return (
                  <div key={item.name} className="space-y-1">
                    <button
                      onClick={() => toggleMenu(item.name)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        isAnySubActive
                          ? "text-primary bg-primary/5"
                          : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-base">{item.icon}</span>
                        {item.name}
                      </div>
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="3"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {isExpanded && (
                      <div className="ml-4 pl-4 border-l-2 border-slate-100 space-y-1 animate-in slide-in-from-top-2 duration-200">
                        {item.subItems.map((sub) => {
                          const isSubActive = pathname === sub.href;
                          return (
                            <Link
                              key={sub.name}
                              href={sub.href}
                              className={`flex items-center gap-3 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                isSubActive
                                  ? "bg-primary text-white shadow-lg shadow-blue-100"
                                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                              }`}
                            >
                              {sub.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    isActive
                      ? "bg-primary text-white shadow-lg shadow-blue-100"
                      : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-[90] px-2 py-2 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
        {expandedMenus["mobilePayments"] && (
          <div className="absolute bottom-full left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-slate-100 flex gap-4 animate-in slide-in-from-bottom-5 duration-300">
            <Link
              href="/admin/pending-payments"
              onClick={() => toggleMenu("mobilePayments")}
              className="flex-1 py-4 bg-primary text-white text-center rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-200"
            >
              Pending
            </Link>
            <Link
              href="/admin/partial-payments"
              onClick={() => toggleMenu("mobilePayments")}
              className="flex-1 py-4 bg-slate-900 text-white text-center rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200"
            >
              Partial
            </Link>
            <Link
              href="/admin/foreclosure-payments"
              onClick={() => toggleMenu("mobilePayments")}
              className="flex-1 py-4 bg-red-600 text-white text-center rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-200"
            >
              Foreclosure
            </Link>
          </div>
        )}
        <div className="flex justify-around items-center max-w-xl mx-auto">
          {[
            {
              name: "Dashboard",
              href: "/admin/dashboard",
              icon: (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                  />
                </svg>
              ),
            },
            {
              name: "Customers",
              href: "/admin/customers",
              icon: (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ),
            },
            {
              name: "Loans",
              href: "/admin/loans",
              icon: (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              ),
            },
            {
              name: "EMI",
              href: "/admin/emi-details",
              icon: (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              ),
            },
            {
              name: "Payments",
              onClick: () => toggleMenu("mobilePayments"),
              isActive: pathname.includes("payments"),
              icon: (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zM12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zM12 20c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"
                  />
                </svg>
              ),
            },
          ].map((item) => {
            const isActive =
              item.isActive !== undefined
                ? item.isActive
                : pathname === item.href;
            const Component = item.href ? Link : "button";

            return (
              <Component
                key={item.name}
                href={item.href}
                onClick={item.onClick}
                className={`flex flex-col items-center gap-1.5 p-2 transition-all ${
                  isActive
                    ? "text-primary bg-primary/5 rounded-2xl"
                    : "text-slate-400"
                }`}
              >
                <div
                  className={`transition-transform duration-300 ${isActive ? "scale-110" : ""}`}
                >
                  {item.icon}
                </div>
                <span
                  className={`text-[7px] sm:text-[8px] font-black uppercase tracking-widest ${
                    isActive ? "text-primary" : "text-slate-400"
                  }`}
                >
                  {item.name}
                </span>
              </Component>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
