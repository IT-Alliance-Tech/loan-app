"use client";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";

const SeizedVehiclesPage = () => {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-6xl mx-auto">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase mb-4">
                Seized Vehicles
              </h1>
              <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
                <p className="text-secondary font-medium">
                  Seized vehicles inventory coming soon.
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default SeizedVehiclesPage;
