"use client";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import StatsCard from "../../../components/analytics/StatsCard";
import { getUserFromToken } from "../../../utils/auth";
import { useState, useEffect } from "react";
import { getAnalyticsStats } from "../../../services/loan.service";
import {
  ShieldCheck,
  UserCheck,
  Users,
  IndianRupee,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  BarChart3,
} from "lucide-react";

const DashboardPage = () => {
  const user = getUserFromToken();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getAnalyticsStats();
        if (res.data) {
          setStats(res.data);
        }
      } catch (err) {
        console.error("Dashboard stats fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />

          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-6xl mx-auto">
              {/* Header Section */}
              <div className="mb-10 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full mb-4">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                    System Operational
                  </span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mb-3">
                  System Dashboard
                </h1>
                <p className="text-secondary font-medium text-base sm:text-lg max-w-2xl">
                  Monitoring internal operations. Your session is secured with
                  enterprise-grade encryption.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[160px]">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      Profile Status
                    </span>
                    <div className="p-2 bg-slate-50 rounded-xl text-xl">👤</div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-1">
                      {user?.role || "Restricted"}
                    </h3>
                    <div className="h-1 w-8 bg-primary rounded-full"></div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[160px]">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      Data Connectivity
                    </span>
                    <div className="p-2 bg-slate-50 rounded-xl text-xl">📡</div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-1">
                      Stable
                    </h3>
                    <div className="h-1 w-8 bg-green-500 rounded-full"></div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[160px] sm:col-span-2 lg:col-span-1">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      Security Modules
                    </span>
                    <div className="p-2 bg-slate-50 rounded-xl text-xl">🛡️</div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-1">
                      Level 4
                    </h3>
                    <div className="h-1 w-8 bg-amber-500 rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Employee Management Counts - NEW SECTION */}
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px bg-slate-200 flex-1"></div>
                  <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] whitespace-nowrap">
                    Human Capital Modules
                  </h2>
                  <div className="h-px bg-slate-200 flex-1"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-200 transition-colors">
                    <div className="flex justify-between items-center mb-4">
                      <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Authority
                      </span>
                    </div>
                    <div className="text-3xl font-black text-slate-900 mb-1">
                      {loading
                        ? "..."
                        : stats?.cards?.userCounts?.SUPER_ADMIN || "0"}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                      Super Admins
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-200 transition-colors">
                    <div className="flex justify-between items-center mb-4">
                      <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Management
                      </span>
                    </div>
                    <div className="text-3xl font-black text-slate-900 mb-1">
                      {loading ? "..." : stats?.cards?.userCounts?.ADMIN || "0"}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                      Administrators
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-200 transition-colors">
                    <div className="flex justify-between items-center mb-4">
                      <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                        <Users className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Operations
                      </span>
                    </div>
                    <div className="text-3xl font-black text-slate-900 mb-1">
                      {loading
                        ? "..."
                        : stats?.cards?.userCounts?.EMPLOYEE || "0"}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                      Personnel
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default DashboardPage;
