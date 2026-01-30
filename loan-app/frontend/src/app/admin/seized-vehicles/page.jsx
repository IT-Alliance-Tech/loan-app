"use client";
import { useState, useEffect } from "react";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import { getLoans } from "../../../services/loan.service";

const SeizedVehiclesPage = () => {
  const [seizedLoans, setSeizedLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSeizedLoans();
  }, []);

  const fetchSeizedLoans = async () => {
    try {
      setLoading(true);
      // Fetching all loans with status filter done in component or backend for simplicity
      const res = await getLoans({ status: "Seized", limit: 100 });
      if (res.data && res.data.loans) {
        setSeizedLoans(res.data.loans);
      }
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="hidden lg:block">
            <Navbar />
          </div>
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-6xl mx-auto">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase mb-8">
                Seized Vehicles Inventory
              </h1>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold uppercase tracking-tight">
                  {error}
                </div>
              )}

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Vehicle / Loan
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Customer Details
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                          Model
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {loading ? (
                        <tr>
                          <td
                            colSpan="4"
                            className="px-6 py-12 text-center text-slate-300 font-bold text-xs uppercase"
                          >
                            Loading inventory...
                          </td>
                        </tr>
                      ) : seizedLoans.length === 0 ? (
                        <tr>
                          <td
                            colSpan="4"
                            className="px-6 py-12 text-center text-slate-300 font-bold text-xs uppercase"
                          >
                            No seized vehicles found
                          </td>
                        </tr>
                      ) : (
                        seizedLoans.map((loan) => (
                          <tr
                            key={loan._id}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="px-6 py-5">
                              <div className="flex flex-col">
                                <span className="font-black text-slate-900 text-xs uppercase tracking-tight">
                                  {loan.vehicleNumber}
                                </span>
                                <span className="text-[10px] font-bold text-primary uppercase mt-1">
                                  {loan.loanNumber}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-col">
                                <span className="font-extrabold text-slate-700 text-xs uppercase">
                                  {loan.customerName}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 mt-1">
                                  {loan.mobileNumber}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-center">
                              <span className="text-[10px] font-black text-slate-500 uppercase">
                                {loan.model || "N/A"}
                              </span>
                            </td>
                            <td className="px-6 py-5 text-center">
                              <span className="inline-flex px-3 py-1 rounded-full bg-red-100 text-red-600 text-[9px] font-black uppercase border border-red-200">
                                Seized
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default SeizedVehiclesPage;
