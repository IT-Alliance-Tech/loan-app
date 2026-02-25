"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { removeToken, getUserFromToken } from "../utils/auth";
import Logo from "./Logo";

const Navbar = () => {
  const router = useRouter();
  const user = getUserFromToken();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    removeToken();
    router.push("/admin/login");
  };

  const userInitial = user?.name ? user.name[0].toUpperCase() : "U";

  return (
    <nav className="sticky top-0 z-40 w-full h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="h-full flex items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/dashboard"
            className="md:hidden flex items-center gap-2"
          >
            <Logo size="sm" showText={false} />
            <span className="text-[#dc2626] font-black text-xs uppercase tracking-widest">
              Square Finance
            </span>
          </Link>
          <div className="hidden md:block lg:hidden h-6 w-px bg-slate-200"></div>
          <span className="hidden md:inline lg:hidden text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            Enterprise Terminal
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-1.5 pl-0.5 pr-2.5 py-0.5 bg-blue-50/50 hover:bg-blue-100/50 rounded-full border border-blue-100 transition-all focus:outline-none group"
            >
              <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-[11px] font-black shadow-sm group-hover:scale-105 transition-transform">
                {userInitial}
              </div>
              <span className="text-[9px] font-black text-primary uppercase tracking-wider">
                {user?.role === "SUPER_ADMIN"
                  ? "Super Admin"
                  : user?.role || "User"}
              </span>
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDropdown(false)}
                ></div>
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-20 animate-scale-up origin-top-right">
                  <div className="px-4 py-3 border-b border-slate-50">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Signed in as
                    </p>
                    <p className="text-sm font-black text-slate-900 truncate">
                      {user?.name || "User"}
                    </p>
                    <p className="text-[10px] font-bold text-primary uppercase mt-1">
                      {user?.role}
                    </p>
                  </div>

                  <div className="px-2 py-2">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors uppercase tracking-wider"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.5"
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
