"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import interestLoanService from "@/services/interestLoanService";
import Pagination from "./Pagination";
import { useToast } from "@/context/ToastContext";
import { Eye, Calendar } from "lucide-react";

const InterestFollowupList = () => {
  const router = useRouter();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [limit] = useState(25);
  const { showToast } = useToast();

  const fetchFollowups = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit,
        followup: "true", // Special filter for follow-ups
      };

      if (searchQuery.trim()) {
        params.searchQuery = searchQuery.trim();
      }

      const res = await interestLoanService.getAllLoans(params);
      if (res.data) {
        setLoans(res.data.loans || []);
        setTotalRecords(res.data.pagination.total);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch (err) {
      showToast(err.message || "Failed to fetch follow-ups", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFollowups();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, currentPage]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
            Interest Loan Follow-ups
          </h1>
          <p className="text-slate-400 font-bold text-sm uppercase tracking-[0.15em] mt-1.5">
            {totalRecords} UPCOMING FOLLOW-UPS
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-8">
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center h-[46px] px-4">
          <span className="text-slate-300 mr-2">🔍</span>
          <input
            type="text"
            placeholder="Search by Loan Number or Customer..."
            className="w-full text-sm font-bold text-slate-700 focus:outline-none placeholder:text-slate-300 uppercase bg-transparent"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          onClick={() => setSearchQuery("")}
          className="px-6 h-[46px] bg-red-50 border border-red-100 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all"
        >
          Clear
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Loan No</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Follow-up Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Last Response</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase">Loading...</td></tr>
              ) : loans.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase">No follow-ups found</td></tr>
              ) : (
                loans.map((loan) => (
                  <tr key={loan._id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-5">
                      <Link href={`/admin/interest-loan/${loan._id}`} className="text-primary font-black text-xs uppercase hover:underline">
                        {loan.loanNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-5 font-extrabold text-slate-800 text-xs uppercase">
                      {loan.customerName}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black uppercase border border-amber-100">
                        <Calendar size={12} />
                        {loan.nextFollowUpDate ? format(new Date(loan.nextFollowUpDate), "dd MMM yyyy") : "NOT SET"}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 truncate inline-block max-w-[200px]">
                        {loan.clientResponse || "NO PREVIOUS RESPONSE"}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <button onClick={() => router.push(`/admin/interest-loan/${loan._id}`)} className="p-2 bg-slate-50 text-slate-400 hover:text-primary rounded-lg border border-slate-100 transition-all shadow-sm">
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(p) => setCurrentPage(p)}
        totalRecords={totalRecords}
        limit={limit}
      />
    </div>
  );
};

export default InterestFollowupList;
