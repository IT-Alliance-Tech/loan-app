"use client";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";

const AnalyticsPage = () => {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-6xl mx-auto text-center py-20">
              <div className="inline-block p-4 bg-primary/10 rounded-full mb-6">
                <span className="text-4xl text-primary">📈</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase mb-4">
                Analytics Dashboard
              </h1>
              <p className="text-slate-500 font-medium max-w-md mx-auto">
                Our business intelligence module is currently being finalized.
                Soon you'll be able to view detailed performance metrics, loan
                growth, and recovery trends.
              </p>
              <div className="mt-12 p-8 border-2 border-dashed border-slate-200 rounded-3xl max-w-2xl mx-auto bg-slate-50/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-40">
                  <div className="h-24 bg-slate-200 rounded-2xl animate-pulse"></div>
                  <div className="h-24 bg-slate-200 rounded-2xl animate-pulse"></div>
                  <div className="h-24 bg-slate-200 rounded-2xl animate-pulse"></div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default AnalyticsPage;
