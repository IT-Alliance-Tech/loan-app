"use client";
import AuthGuard from "../../components/AuthGuard";
import Navbar from "../../components/Navbar";
import Sidebar from "../../components/Sidebar";
import { getUserFromToken } from "../../utils/auth";

const DashboardPage = () => {
  const user = getUserFromToken();

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

              {/* Placeholder Content */}
              <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="inline-flex p-4 bg-slate-50 rounded-2xl mb-6 text-3xl">
                    📊
                  </div>
                  <h4 className="text-lg font-black text-slate-900 uppercase tracking-widest mb-3">
                    Analytics Ready
                  </h4>
                  <p className="text-sm font-medium text-secondary leading-relaxed">
                    The statistical engine is awaiting data synchronization.
                    Once active, real-time loan distributions and EMI metrics
                    will be displayed here.
                  </p>
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
