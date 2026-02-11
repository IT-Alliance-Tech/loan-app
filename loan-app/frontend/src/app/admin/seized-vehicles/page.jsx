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
  const [activeContactMenu, setActiveContactMenu] = useState(null); // { number, name, type, x, y }

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
                                <div className="flex flex-col gap-0.5 mt-1">
                                  {(loan.mobileNumbers || []).map(
                                    (num, idx) => (
                                      <button
                                        key={idx}
                                        onClick={(e) => {
                                          const rect =
                                            e.currentTarget.getBoundingClientRect();
                                          setActiveContactMenu({
                                            number: num,
                                            name: loan.customerName,
                                            type: "Applicant",
                                            x: rect.left,
                                            y: rect.bottom,
                                          });
                                        }}
                                        className="text-[10px] font-bold text-slate-400 hover:text-primary transition-colors text-left"
                                      >
                                        {num}
                                      </button>
                                    ),
                                  )}
                                  {loan.guarantorMobileNumbers?.length > 0 && (
                                    <div className="mt-1 pt-1 border-t border-slate-50 flex flex-col gap-0.5">
                                      <span className="text-[7px] font-black text-slate-300 uppercase">
                                        Guarantor
                                      </span>
                                      {loan.guarantorMobileNumbers.map(
                                        (num, idx) => (
                                          <button
                                            key={idx}
                                            onClick={(e) => {
                                              const rect =
                                                e.currentTarget.getBoundingClientRect();
                                              setActiveContactMenu({
                                                number: num,
                                                name:
                                                  loan.guarantorName ||
                                                  "Guarantor",
                                                type: "Guarantor",
                                                x: rect.left,
                                                y: rect.bottom,
                                              });
                                            }}
                                            className="text-[9px] font-bold text-slate-400/60 hover:text-primary transition-colors text-left"
                                          >
                                            {num}
                                          </button>
                                        ),
                                      )}
                                    </div>
                                  )}
                                </div>
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
        {/* Contact Action Menu */}
        {activeContactMenu && (
          <div
            className="fixed inset-0 z-[200]"
            onClick={() => setActiveContactMenu(null)}
          >
            <div
              className="absolute bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 min-w-[160px] animate-scale-up"
              style={{
                top: activeContactMenu.y,
                left: Math.min(activeContactMenu.x, window.innerWidth - 180),
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-2 border-b border-slate-50 mb-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {activeContactMenu.type}
                </p>
                <p className="text-xs font-bold text-slate-900 truncate">
                  {activeContactMenu.name}
                </p>
                <p className="text-[10px] font-medium text-slate-500">
                  {activeContactMenu.number}
                </p>
              </div>

              <a
                href={`https://wa.me/91${activeContactMenu.number.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setActiveContactMenu(null)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-emerald-600 transition-colors w-full"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.445 0 .081 5.363.079 11.969c0 2.112.551 4.173 1.594 5.973L0 24l6.163-1.617a11.83 11.83 0 005.883 1.586h.005c6.604 0 11.967-5.363 11.969-11.969a11.85 11.85 0 00-3.41-8.462" />
                  </svg>
                </div>
                <span className="text-xs font-black uppercase tracking-wider">
                  WhatsApp
                </span>
              </a>

              <a
                href={`tel:${activeContactMenu.number}`}
                onClick={() => setActiveContactMenu(null)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 text-blue-600 transition-colors w-full"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </div>
                <span className="text-xs font-black uppercase tracking-wider">
                  Call Now
                </span>
              </a>

              <a
                href={`sms:${activeContactMenu.number}`}
                onClick={() => setActiveContactMenu(null)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-orange-50 text-orange-600 transition-colors w-full"
              >
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <span className="text-xs font-black uppercase tracking-wider">
                  Send SMS
                </span>
              </a>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
};

export default SeizedVehiclesPage;
