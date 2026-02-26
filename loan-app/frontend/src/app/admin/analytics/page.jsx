"use client";
import React, { useState, useEffect } from "react";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import StatsCard from "../../../components/analytics/StatsCard";
import VehicleStatsChart from "../../../components/analytics/VehicleStatsChart";
import { getAnalyticsStats } from "../../../services/loan.service";
import {
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  BarChart2,
} from "lucide-react";

const AnalyticsPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await getAnalyticsStats();
        if (res.data) {
          setStats(res.data);
        }
      } catch (err) {
        setError(err.message || "Failed to fetch analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-[#F8FAFC] flex">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Navbar />
            <main className="py-8 px-4 sm:px-8 flex items-center justify-center flex-1">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
                  Loading Dashboard...
                </p>
              </div>
            </main>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 pb-20 sm:pb-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-6xl mx-auto">
              {/* Header */}
              <div className="mb-10">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                  <BarChart2 className="w-8 h-8 text-primary" strokeWidth={3} />
                  ANALYTICS DASHBOARD
                </h1>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2 px-1">
                  Real-time business performance overview
                </p>
              </div>

              {error && (
                <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold uppercase tracking-tight">
                  {error}
                </div>
              )}

              {/* Stats Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatsCard
                  title="Total Disbursed"
                  value={`₹${stats?.cards?.totalLoanAmount?.toLocaleString() || "0"}`}
                  icon={<DollarSign className="w-6 h-6" />}
                  color="primary"
                />
                <StatsCard
                  title="Total Collected"
                  value={`₹${stats?.cards?.totalCollectedAmount?.toLocaleString() || "0"}`}
                  icon={<TrendingUp className="w-6 h-6" />}
                  color="success"
                />
                <StatsCard
                  title="Pending/Partial"
                  value={stats?.cards?.pendingPartialLoansCount || "0"}
                  icon={<Clock className="w-6 h-6" />}
                  color="warning"
                />
                <StatsCard
                  title="Active Loans"
                  value={stats?.cards?.activeLoansCount || "0"}
                  icon={<CheckCircle className="w-6 h-6" />}
                  color="danger"
                />
              </div>

              {/* Chart Section */}
              <div className="grid grid-cols-1 gap-10">
                <VehicleStatsChart data={stats?.vehicleStats || []} />
              </div>

              {/* Footer Note */}
              <div className="mt-12 text-center">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">
                  Dashboard data is updated automatically every time you visit.
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default AnalyticsPage;
