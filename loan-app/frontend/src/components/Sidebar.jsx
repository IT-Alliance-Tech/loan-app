"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUI } from "../context/UIContext";
import { getUserFromToken } from "../utils/auth";

const navItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: "📊" },
   { name: 'Customers', href: '/admin/customers', icon: '👤' },
   { name: 'Loans', href: '/admin/loans', icon: '💰' },
   { name: 'Employees', href: '/admin/employees', icon: '👥' },
   { name: 'EMI Details', href: '/admin/emi-details', icon: '🗓️' },
   { name: 'Seized Vehicles', href: '/admin/seized-vehicles', icon: '🚗' },
  
];

const Sidebar = () => {
  const pathname = usePathname();
  const { isSidebarOpen, closeSidebar } = useUI();
  const user = getUserFromToken();

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  );

  return (
    <>
      {/* DESKTOP SIDEBAR DESIGN */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0">
        <div className="p-6">
          <div className="flex items-center gap-3 px-2 py-4 border-b border-slate-100 mb-6">
            <div className="bg-primary px-3 py-1.5 rounded-lg shadow-sm">
              <span className="text-white font-black text-lg tracking-tighter">
                ILMRS
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200 ml-1"></div>
            <span className="font-black text-slate-300 tracking-[0.2em] uppercase text-[9px] ml-1">
              Admin
            </span>
          </div>

          <nav className="space-y-1">
            {filteredNavItems.map((item) => {
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

        <div className="mt-auto p-6 border-t border-slate-100">
          <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-primary">
              {user?.role?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-slate-900 truncate uppercase tracking-tighter">
                {user?.email}
              </p>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                {user?.role}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* MOBILE VIEW DESIGN (OVERLAY) */}
      <div
        className={`lg:hidden fixed inset-0 z-[100] transition-visibility duration-300 ${
          isSidebarOpen ? "visible" : "invisible"
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${
            isSidebarOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={closeSidebar}
        ></div>

        {/* Sidebar Content */}
        <aside
          className={`absolute top-0 left-0 bottom-0 w-72 bg-white shadow-2xl transition-transform duration-300 transform ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-primary px-3 py-1.5 rounded-lg">
                  <span className="text-white font-black text-xl tracking-tighter">
                    ILMRS
                  </span>
                </div>
              </div>
              <button
                onClick={closeSidebar}
                className="p-2 text-slate-400 hover:text-slate-600 text-2xl font-black"
              >
                &times;
              </button>
            </div>

            <nav className="flex-1 p-6 space-y-2">
              {filteredNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={closeSidebar}
                    className={`flex items-center gap-4 px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                      isActive
                        ? "bg-primary text-white shadow-xl shadow-blue-200"
                        : "text-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">
                Account Secure
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-primary font-black shadow-sm">
                  {user?.role?.[0]}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">
                    {user?.email}
                  </p>
                  <p className="text-[9px] font-bold text-primary uppercase">
                    {user?.role}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
};

export default Sidebar;
