"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import interestLoanService from "@/services/interestLoanService";
import Pagination from "./Pagination";
import { useToast } from "@/context/ToastContext";
import ContactActionMenu from "./ContactActionMenu";
import { Eye } from "lucide-react";

const InterestPendingList = () => {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeContactMenu, setActiveContactMenu] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [limit] = useState(25);
  const { showToast } = useToast();

  const fetchPending = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit,
        searchQuery: searchQuery.trim() || undefined,
      };

      const res = await interestLoanService.getPendingPayments(params);
      if (res.data) {
        setData(res.data.pendingPayments || []);
        setTotalPages(res.data.pagination.totalPages);
        setTotalRecords(res.data.pagination.total);
      }
    } catch (err) {
      showToast(err.message || "Failed to fetch pending payments", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPending();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, currentPage]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
            Interest Pending Payments
          </h1>
          <p className="text-slate-400 font-bold text-sm uppercase tracking-[0.15em] mt-1.5">
            {totalRecords} OVERDUE INTEREST PAYMENTS
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
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Due Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Overdue</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Amount Due</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase">Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase">No pending payments found</td></tr>
              ) : (
                data.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-5">
                      <Link href={`/admin/interest-loan/${item.interestLoanId?._id}`} className="text-primary font-black text-xs uppercase hover:underline">
                        {item.loanNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-800 text-xs uppercase">{item.customerName}</span>
                        <span className="text-[10px] text-slate-500 font-bold">{item.interestLoanId?.mobileNumbers?.[0]}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs font-bold text-slate-600">{format(new Date(item.dueDate), "dd MMM yyyy")}</span>
                    </td>
                    <td className="px-6 py-5">
                      {(() => {
                        const days = differenceInDays(new Date(), new Date(item.dueDate));
                        const displayDays = days > 0 ? days : 0;
                        let colorClass = "bg-slate-100 text-slate-500";
                        if (displayDays >= 30) colorClass = "bg-red-100 text-red-600";
                        else if (displayDays >= 7) colorClass = "bg-orange-100 text-orange-600";
                        
                        return (
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${colorClass}`}>
                            {displayDays} DAYS
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="font-black text-red-600 text-sm">₹{(item.interestAmount - (item.amountPaid || 0)).toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <button 
                        onClick={() => router.push(`/admin/interest-loan/${item.interestLoanId?._id}`)} 
                        className="p-2 bg-slate-50 text-slate-400 hover:text-primary rounded-lg border border-slate-100 transition-all"
                      >
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

      <ContactActionMenu
        contact={activeContactMenu}
        onClose={() => setActiveContactMenu(null)}
      />
    </div>
  );
};

export default InterestPendingList;
