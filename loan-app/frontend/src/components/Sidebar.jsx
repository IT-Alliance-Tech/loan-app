"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { getUserFromToken } from "../utils/auth";
import Logo from "./Logo";
import { useUI } from "../context/UIContext";

const navItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: "📊" },
  { name: "Analytics", href: "/admin/analytics", icon: "📈" },
  //{ name: "Customers", href: "/admin/customers", icon: "👤" },
  { name: "To-Do List", href: "/admin/todo", icon: "📋" },
  { name: "Collections", href: "/admin/collections", icon: "🏦" },
  { name: "Loans", href: "/admin/loans", icon: "💰" },
  { name: "Expired", href: "/admin/expired", icon: "⌛" },
  {
    name: "Weekly Loans",
    href: "/admin/weekly-loans",
    icon: "📅",
    subItems: [
      { name: "Pending", href: "/admin/weekly-loans/pending" },
      { name: "Followups", href: "/admin/weekly-loans/followups" },
    ],
  },
  {
    name: "Daily Loans",
    href: "/admin/daily-loans",
    icon: "☀️",
    subItems: [
      { name: "Pending", href: "/admin/daily-loans/pending" },
      { name: "Followups", href: "/admin/daily-loans/followups" },
    ],
  },
  {
    name: "Employees",
    href: "/admin/employees",
    icon: "👥",
    roles: ["SUPER_ADMIN"],
  },
  //{ name: "EMI Details", href: "/admin/emi-details", icon: "🗓️" },
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
  const { isSidebarOpen, closeSidebar } = useUI();
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

  useEffect(() => {
    // Close mobile sidebar on route change
    closeSidebar();
  }, [pathname]);

  const toggleMenu = (name) => {
    setExpandedMenus((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const filteredNavItems = navItems.filter((item) => {
    // 1. Role-based restriction (existing)
    if (item.roles && !item.roles.includes(user?.role)) {
      return false;
    }

    // 2. Permission-based restriction for employees
    if (user?.role === "EMPLOYEE") {
      // Map item name to permission module key
      const permissionMap = {
        Dashboard: "dashboard",
        Analytics: "analytics",
        "To-Do List": true, // Always visible for employees to see their tasks
        Collections: "payments",
        Loans: "loans",
        Expired: "documents",
        "Weekly Loans": "weeklyLoans",
        "Daily Loans": "dailyLoans",
        "Seized Vehicles": "vehicles",
        Payments: "payments",
        Expenses: "expenses",
        Documents: "documents",
      };

      const moduleKey = permissionMap[item.name];
      if (moduleKey && user.permissions?.[moduleKey]) {
        return user.permissions[moduleKey].view;
      }
    }

    return true;
  });

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
                    <div className="flex items-center group">
                      <Link
                        href={item.href || "#"}
                        className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-l-xl text-xs font-black uppercase tracking-widest transition-all ${
                          isAnySubActive ||
                          (item.href && pathname === item.href)
                            ? "text-primary bg-primary/5"
                            : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                        }`}
                      >
                        <span className="text-base">{item.icon}</span>
                        {item.name}
                      </Link>
                      <button
                        onClick={() => toggleMenu(item.name)}
                        className={`px-3 py-3 rounded-r-xl transition-all ${
                          isAnySubActive ||
                          (item.href && pathname === item.href)
                            ? "text-primary bg-primary/5"
                            : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                        }`}
                      >
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
                    </div>

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

      {/* MOBILE SIDEBAR (OFF-CANVAS) */}
      <div
        className={`fixed inset-0 z-[100] md:hidden transition-opacity duration-300 ${isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={closeSidebar}
        ></div>

        {/* Sidebar Panel */}
        <aside
          className={`absolute top-0 left-0 w-72 h-full bg-white shadow-2xl transition-transform duration-300 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <Logo size="sm" />
              <div className="h-6 w-px bg-slate-200"></div>
              <span className="font-black text-slate-400 tracking-[0.2em] uppercase text-[8px]">
                Menu
              </span>
            </div>
            <button
              onClick={closeSidebar}
              className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="overflow-y-auto h-[calc(100%-5rem)] p-6">
            <nav className="space-y-1 pb-10">
              {filteredNavItems.map((item) => {
                if (item.subItems) {
                  const isExpanded = expandedMenus[item.name];
                  const isAnySubActive = item.subItems.some(
                    (sub) => pathname === sub.href,
                  );
                  return (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center">
                        <Link
                          href={item.href || "#"}
                          className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-l-xl text-xs font-black uppercase tracking-widest transition-all ${
                            isAnySubActive ||
                            (item.href && pathname === item.href)
                              ? "text-primary bg-primary/5"
                              : "text-slate-400 active:bg-slate-50"
                          }`}
                        >
                          <span className="text-base">{item.icon}</span>
                          {item.name}
                        </Link>
                        <button
                          onClick={() => toggleMenu(item.name)}
                          className={`px-3 py-3 rounded-r-xl transition-all ${
                            isAnySubActive ||
                            (item.href && pathname === item.href)
                              ? "text-primary bg-primary/5"
                              : "text-slate-400"
                          }`}
                        >
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
                      </div>

                      {isExpanded && (
                        <div className="ml-4 pl-4 border-l-2 border-slate-100 space-y-1">
                          {item.subItems.map((sub) => {
                            const isSubActive = pathname === sub.href;
                            return (
                              <Link
                                key={sub.name}
                                href={sub.href}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                  isSubActive
                                    ? "bg-primary text-white shadow-lg shadow-blue-100"
                                    : "text-slate-400 hover:text-slate-600"
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
                        : "text-slate-400 active:bg-slate-50"
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
      </div>
    </>
  );
};

export default Sidebar;
