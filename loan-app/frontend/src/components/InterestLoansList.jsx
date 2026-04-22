"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import interestLoanService from "@/services/interestLoanService";
import { useToast } from "@/context/ToastContext";
import { format } from "date-fns";
import TableActionMenu from "./TableActionMenu";
import Pagination from "./Pagination";
import { Trash2, Eye, Edit, Download } from "lucide-react";
import ContactActionMenu from "./ContactActionMenu";
import { getUserFromToken } from "@/utils/auth";
import { exportLoansToExcel } from "@/utils/exportExcel";

const InterestLoansList = ({ type, title }) => {
  const router = useRouter();
  const { showToast } = useToast();
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [activeContactMenu, setActiveContactMenu] = useState(null);

  const user = getUserFromToken();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(25);

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit,
      };

      if (searchQuery.trim()) {
        params.searchQuery = searchQuery.trim();
      }

      if (type === "pending") {
        params.status = "Pending";
      }

      const response = await interestLoanService.getAllLoans(params);
      const { loans: dataLoans, pagination } = response.data;

      setLoans(dataLoans);
      setTotalRecords(pagination.total);
      setTotalPages(pagination.totalPages);
    } catch (err) {
      showToast(err.message || "Failed to fetch interest loans", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLoans();
    }, 500);
    return () => clearTimeout(timer);
  }, [type, searchQuery, currentPage]);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this interest loan?")) {
      try {
        await interestLoanService.deleteLoan(id);
        showToast("Interest loan deleted", "success");
        fetchLoans();
      } catch (err) {
        showToast(err.message || "Failed to delete", "error");
      }
    }
  };

  const handleExportAll = async () => {
    try {
      showToast("Preparing export...", "info");
      // Fetch all interest loans without pagination for export
      const response = await interestLoanService.getAllLoans({ limit: 5000 });
      const { loans: allLoans } = response.data;
      
      if (allLoans && allLoans.length > 0) {
        await exportLoansToExcel(allLoans, "INTEREST");
        showToast("Export successful", "success");
      } else {
        showToast("No data to export", "warning");
      }
    } catch (err) {
      showToast(err.message || "Export failed", "error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
            {title || "Interest Loan Management"}
          </h1>
          <p className="text-slate-400 font-bold text-sm uppercase tracking-[0.15em] mt-1.5">
            {totalRecords} RECORDS FOUND
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportAll}
            className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wide shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <Download size={14} /> Export Excel
          </button>
          <Link
            href="/admin/interest-loan/add"
            className="bg-[#2463EB] text-white px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wide shadow-lg hover:bg-blue-700 transition-all flex items-center gap-1.5"
          >
            <span className="text-sm">+</span> Add New
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-8">
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center h-[46px] px-4">
          <span className="text-slate-300 mr-2">🔍</span>
          <input
            type="text"
            placeholder="Search Interest Loans..."
            className="w-full text-sm font-bold text-slate-700 focus:outline-none placeholder:text-slate-300 uppercase bg-transparent"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
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
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Principal</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Interest Rate</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase">Loading...</td></tr>
              ) : loans.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase">No records found</td></tr>
              ) : (
                loans.map((loan) => (
                  <tr key={loan._id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-5">
                      <Link href={`/admin/interest-loan/${loan._id}`} className="text-primary font-black text-xs uppercase hover:underline">
                        {loan.loanNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-800 text-xs uppercase">{loan.customerName}</span>
                        <span className="text-[10px] text-slate-500 font-bold">{loan.mobileNumbers?.[0]}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800 text-xs">₹{loan.remainingPrincipalAmount?.toLocaleString("en-IN")}</span>
                        <span className="text-[9px] text-slate-400 uppercase font-bold">Remaining</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 font-black text-slate-600 text-xs">
                      {loan.interestRate}% <span className="text-[9px] text-slate-400 font-bold">/ MONTH</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                        loan.status === "Active" ? "bg-green-100 text-green-600 border-green-200" :
                        loan.status === "Closed" ? "bg-slate-100 text-slate-500 border-slate-200" :
                        "bg-orange-100 text-orange-600 border-orange-200"
                      }`}>
                        {loan.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-center items-center gap-2">
                        <button onClick={() => router.push(`/admin/interest-loan/${loan._id}`)} className="p-2 bg-slate-50 text-slate-400 hover:text-primary rounded-lg border border-slate-100 transition-all">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => router.push(`/admin/interest-loan/edit/${loan._id}`)} className="p-2 bg-slate-50 text-slate-400 hover:text-primary rounded-lg border border-slate-100 transition-all">
                          <Edit size={16} />
                        </button>
                        {isSuperAdmin && (
                          <button onClick={() => handleDelete(loan._id)} className="p-2 bg-red-50 text-red-400 hover:text-red-600 rounded-lg border border-red-100 transition-all">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && loans.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setCurrentPage(p)}
          totalRecords={totalRecords}
          limit={limit}
        />
      )}
    </div>
  );
};

export default InterestLoansList;
