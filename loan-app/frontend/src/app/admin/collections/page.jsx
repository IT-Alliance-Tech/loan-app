"use client";
import React, { useState, useEffect } from "react";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import { getCollectionReport } from "../../../services/loan.service";

const CollectionsPage = () => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchCollections();
  }, [filters]);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const res = await getCollectionReport(filters);
      if (res.data) {
        setCollections(res.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const totalCollected = collections.reduce((sum, c) => sum + c.totalAmount, 0);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex font-sans">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="flex justify-between items-end mb-10">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                    Collections Report
                  </h1>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mt-2">
                    DAILY PERFORMANCE BREAKDOWN
                  </p>
                </div>
                <div></div>
              </div>

              {/* Filters */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-8 flex flex-wrap gap-6 items-center">
                 <div className="flex flex-col gap-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Start Date</label>
                   <input 
                    type="date" 
                    name="startDate"
                    value={filters.startDate}
                    onChange={handleFilterChange}
                    className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                  />
                 </div>
                 <div className="flex flex-col gap-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">End Date</label>
                   <input 
                    type="date" 
                    name="endDate"
                    value={filters.endDate}
                    onChange={handleFilterChange}
                    className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                  />
                 </div>
              </div>

              {error && (
                 <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-[10px] font-black uppercase tracking-tight">
                   {error}
                 </div>
              )}

              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Date</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Collector</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Mode</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Txn Count</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loading ? (
                          <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-300 font-bold text-xs uppercase">Loading...</td></tr>
                        ) : collections.length === 0 ? (
                          <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-300 font-bold text-xs uppercase">No collections found for this period</td></tr>
                        ) : (
                          collections.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 text-xs font-black text-slate-900">{item._id.date}</td>
                              <td className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">{item._id.collector}</td>
                              <td className="px-6 py-4 text-xs text-center"><span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg font-black text-[9px] uppercase border border-blue-100">{item._id.mode}</span></td>
                              <td className="px-6 py-4 text-xs text-center font-bold text-slate-400">{item.count} Txns</td>
                              <td className="px-6 py-4 text-xs text-right font-black text-emerald-600">₹{item.totalAmount.toLocaleString()}</td>
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

export default CollectionsPage;
