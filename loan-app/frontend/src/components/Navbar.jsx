"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { removeToken, getUserFromToken } from "../utils/auth";
import { useUI } from "../context/UIContext";

const Navbar = () => {
  const router = useRouter();
  const user = getUserFromToken();
  const { toggleSidebar } = useUI();

  const handleLogout = () => {
    removeToken();
    router.push("/admin/login");
  };

  return (
    <nav className="sticky top-0 z-40 w-full h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="h-full flex items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M4 6h16M4 12h16M4 18h16"
              ></path>
            </svg>
          </button>

          <Link
            href="/admin/dashboard"
            className="lg:hidden bg-primary px-3 py-1.5 rounded-lg shadow-sm"
          >
            <span className="text-white font-black text-xl tracking-tighter">
              ILMRS
            </span>
          </Link>
          <div className="hidden md:block lg:hidden h-6 w-px bg-slate-200"></div>
          <span className="hidden md:inline lg:hidden text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            Enterprise Terminal
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 pr-4 border-r border-slate-200">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black text-slate-900 leading-none mb-1 uppercase tracking-tight">
                {user?.id ? "Secured" : "Guest"}
              </p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-primary border border-blue-100 uppercase">
                {user?.role || "No Role"}
              </span>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-primary font-bold shadow-inner">
              {user?.role?.[0] || "U"}
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="text-[10px] font-black text-red-600 hover:text-red-700 uppercase tracking-widest transition-all"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
