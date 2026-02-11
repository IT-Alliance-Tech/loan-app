"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import { getUserFromToken } from "../../../utils/auth";
import { getLoans, searchLoan } from "../../../services/loan.service";
import { exportLoansToExcel } from "../../../utils/exportExcel";
import Pagination from "../../../components/Pagination";

const LoansPage = () => {
  const router = useRouter();
  const user = getUserFromToken();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    loanNumber: "",
    customerName: "",
    mobileNumber: "",
    tenureMonths: "",
    status: "",
  });
  const [selectedContact, setSelectedContact] = useState(null); // For contact details modal

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [limit] = useState(10);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = { page: currentPage, limit };
      if (searchQuery.trim()) {
        params.loanNumber = searchQuery;
      }
      fetchLoans({ ...filters, ...params });
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, currentPage]);

  const fetchLoans = async (filterParams = {}) => {
    try {
      setLoading(true);
      const res = await getLoans({ ...filterParams, limit });
      if (res.data && res.data.loans) {
        setLoans(res.data.loans);
        setTotalPages(res.data.pagination.totalPages);
        setTotalRecords(res.data.pagination.total);
      } else {
        setLoans(res.data || []);
      }
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    handleAdvancedSearch();
  };

  const handleAdvancedSearch = (e) => {
    if (e) e.preventDefault();
    const params = { ...filters, page: 1 };
    if (searchQuery.trim()) params.loanNumber = searchQuery;
    setCurrentPage(1);
    fetchLoans(params);
    setIsFilterOpen(false);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    const emptyFilters = {
      loanNumber: "",
      customerName: "",
      mobileNumber: "",
      tenureMonths: "",
      status: "",
    };
    setFilters(emptyFilters);
    setSearchQuery("");
    setCurrentPage(1);
    fetchLoans({ page: 1 });
    setIsFilterOpen(false);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 pb-20 sm:pb-0">
          <div className="hidden lg:block">
            <Navbar />
          </div>
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-6xl mx-auto">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold uppercase tracking-tight">
                  {error}
                </div>
              )}
              {/* Header Section */}
              <div className="flex justify-between items-start mb-2 sm:mb-8">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Loan Management
                  </h1>
                  <p className="text-slate-400 font-bold text-[9px] sm:text-sm uppercase tracking-[0.15em] mt-1.5">
                    {totalRecords} RECORDS FOUND
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => await exportLoansToExcel(loans)}
                    className="flex bg-slate-50 text-slate-500 border border-slate-100 px-3 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-slate-100 transition-all items-center justify-center gap-1.5 shadow-sm"
                  >
                    <svg
                      className="w-3.5 h-3.5 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M16 8l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Export
                  </button>
                  {isSuperAdmin && (
                    <button
                      onClick={() => router.push("/admin/loans/add")}
                      className="bg-[#2463EB] text-white px-4 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-wide shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      <span className="text-lg leading-none">+</span> Add New
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 mb-8">
                <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center h-[46px]">
                  <form
                    onSubmit={handleSearch}
                    className="flex-1 flex items-center px-4"
                  >
                    <div className="text-slate-300 text-lg">🔍</div>
                    <input
                      type="text"
                      placeholder="Search by Loan Number (e.g. LN-001)"
                      className="w-full px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none placeholder:text-slate-300 placeholder:font-black uppercase bg-transparent"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </form>
                </div>
                <button
                  onClick={() => setIsFilterOpen(true)}
                  className="flex-none w-[46px] h-[46px] bg-white border border-slate-200 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm"
                  title="Advanced Filter"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                </button>
                <button
                  onClick={resetFilters}
                  className="flex-none px-6 h-[46px] bg-red-50 border border-red-100 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  Clear
                </button>
              </div>

              {/* MOBILE VIEW (Table Optimized for small screens) */}
              <div className="md:hidden mb-8">
                <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                  <div className="overflow-x-auto scrollbar-none">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="bg-slate-50/30 border-b border-slate-100 uppercase">
                          <th className="w-[80px] px-4 py-4 text-[9px] font-bold text-slate-400 tracking-[0.1em] whitespace-nowrap">
                            LOAN NO
                          </th>
                          <th className="px-4 py-4 text-[9px] font-bold text-slate-400 tracking-[0.1em] whitespace-nowrap">
                            CUSTOMER NAME
                          </th>
                          <th className="w-[100px] px-4 py-4 text-[9px] font-bold text-slate-400 tracking-[0.1em] text-center whitespace-nowrap">
                            EMI
                          </th>
                          <th className="w-[80px] px-4 py-4 text-[9px] font-bold text-slate-400 tracking-[0.1em] text-center whitespace-nowrap">
                            TENURE
                          </th>
                          <th className="w-[80px] px-4 py-4 text-[9px] font-bold text-slate-400 tracking-[0.1em] text-center whitespace-nowrap">
                            STATUS
                          </th>
                          <th className="w-[100px] px-4 py-4 text-[9px] font-bold text-slate-400 tracking-[0.1em] text-center whitespace-nowrap">
                            CLIENT RESPONSE
                          </th>
                          <th className="w-[100px] px-4 py-4 text-[9px] font-bold text-slate-400 tracking-[0.1em] text-center whitespace-nowrap">
                            ACTIONS
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {loading ? (
                          <tr>
                            <td
                              colSpan="6"
                              className="px-6 py-12 text-center text-slate-300 font-bold text-xs uppercase"
                            >
                              Loading records...
                            </td>
                          </tr>
                        ) : loans.length === 0 ? (
                          <tr>
                            <td
                              colSpan="6"
                              className="px-6 py-12 text-center text-slate-300 font-bold text-xs uppercase"
                            >
                              No records
                            </td>
                          </tr>
                        ) : (
                          loans.map((loan) => (
                            <tr
                              key={loan._id}
                              className="active:bg-slate-50 transition-colors"
                            >
                              <td className="px-4 py-6 whitespace-nowrap">
                                <span className="font-bold text-slate-900 tracking-tight text-base">
                                  {loan.loanTerms?.loanNumber}
                                </span>
                              </td>
                              <td className="px-4 py-6">
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-700 text-base leading-tight">
                                    {loan.customerDetails?.customerName}
                                  </span>
                                  <div className="flex flex-col gap-0.5 mt-1">
                                    {(
                                      loan.customerDetails?.mobileNumbers || []
                                    ).map((num, idx) => (
                                      <span
                                        key={idx}
                                        className="text-[10px] font-bold text-slate-400 tracking-tight"
                                      >
                                        {num}
                                      </span>
                                    ))}
                                    <div className="mt-1 flex flex-col pt-1 border-t border-slate-100">
                                      <span className="text-[8px] font-black text-primary uppercase">
                                        G: {loan.customerDetails?.guarantorName}
                                      </span>
                                      {(
                                        loan.customerDetails
                                          ?.guarantorMobileNumbers || []
                                      ).map((num, idx) => (
                                        <span
                                          key={idx}
                                          className="text-[9px] font-bold text-slate-400 opacity-70"
                                        >
                                          {num}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-6 text-center whitespace-nowrap text-[#2463EB] font-black text-base">
                                ₹
                                {loan.loanTerms?.monthlyEMI
                                  ?.toLocaleString()
                                  ?.split(".")[0] || "0"}
                              </td>
                              <td className="px-4 py-6 text-center whitespace-nowrap">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 text-[10px] font-bold border border-slate-100">
                                  {loan.loanTerms?.tenureMonths}M
                                </span>
                              </td>
                              <td className="px-4 py-6 text-center whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tighter border ${loan.isSeized ? "bg-red-50 text-red-500 border-red-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}
                                >
                                  {loan.status.isSeized ? "Seized" : "Active"}
                                </span>
                              </td>
                              <td className="px-4 py-6 text-center whitespace-nowrap">
                                <span
                                  title={loan.status.clientResponse}
                                  className="text-[10px] font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 block truncate max-w-[100px] mx-auto"
                                >
                                  {loan.status.clientResponse || "—"}
                                </span>
                              </td>
                              <td className="px-4 py-6 text-center whitespace-nowrap">
                                <div className="flex justify-center items-center gap-4">
                                  <button
                                    onClick={() => {
                                      const id =
                                        loan._id || loan.id || loan.status?.id;
                                      if (id && id !== "undefined") {
                                        router.push(`/admin/loans/${id}`);
                                      } else {
                                        console.error(
                                          "Loan ID is undefined",
                                          loan,
                                        );
                                      }
                                    }}
                                    className="text-[#2463EB] hover:scale-110 transition-transform"
                                  >
                                    <svg
                                      className="w-5 h-5"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                      />
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                      />
                                    </svg>
                                  </button>
                                  {isSuperAdmin && (
                                    <button
                                      onClick={() => {
                                        const id =
                                          loan._id ||
                                          loan.id ||
                                          loan.status?.id;
                                        if (id && id !== "undefined") {
                                          router.push(
                                            `/admin/loans/edit/${id}`,
                                          );
                                        } else {
                                          console.error(
                                            "Loan ID is undefined",
                                            loan,
                                          );
                                        }
                                      }}
                                      className="text-[#2463EB] hover:scale-110 transition-transform"
                                    >
                                      <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                        />
                                      </svg>
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
                  <div className="py-4 bg-slate-50/50 border-t border-slate-100 text-center">
                    <p className="text-[10px] font-medium text-slate-400 italic">
                      Swipe horizontally to see more details
                    </p>
                  </div>
                </div>
              </div>

              {/* DESKTOP VIEW (Table Optimized for large screens) */}
              <div className="hidden md:block">
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden">
                  <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-100 pb-1">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200">
                          <th className="px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                            Loan Number
                          </th>
                          <th className="px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                            Customer Name
                          </th>
                          <th className="px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                            Mobile
                          </th>
                          <th className="px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                            Guarantor
                          </th>
                          <th className="px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                            Guar. Mobile
                          </th>
                          <th className="px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                            EMI
                          </th>
                          <th className="px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                            Tenure
                          </th>
                          <th className="px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                            Status
                          </th>
                          <th className="px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                            Client Response
                          </th>
                          <th className="px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loading ? (
                          <tr>
                            <td
                              colSpan="7"
                              className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase"
                            >
                              Loading...
                            </td>
                          </tr>
                        ) : loans.length === 0 ? (
                          <tr>
                            <td
                              colSpan="7"
                              className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase"
                            >
                              Empty
                            </td>
                          </tr>
                        ) : (
                          loans.map((loan) => (
                            <tr
                              key={loan._id}
                              className={`${loan.isSeized ? "bg-red-50/50" : "hover:bg-slate-50"} transition-colors`}
                            >
                              <td className="px-6 py-4 whitespace-nowrap font-black text-slate-900 uppercase text-xs tracking-tight">
                                {loan.loanTerms?.loanNumber}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap font-extrabold text-slate-800 text-xs uppercase">
                                {loan.customerDetails?.customerName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col gap-1 items-start">
                                  {(
                                    loan.customerDetails?.mobileNumbers || []
                                  ).map((num, idx) => (
                                    <span
                                      key={idx}
                                      className="text-slate-600 font-bold text-xs tracking-widest"
                                    >
                                      {num}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap font-extrabold text-slate-800 text-xs uppercase">
                                {loan.customerDetails?.guarantorName || "—"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col gap-1 items-start">
                                  {(
                                    loan.customerDetails
                                      ?.guarantorMobileNumbers || []
                                  ).map((num, idx) => (
                                    <span
                                      key={idx}
                                      className="text-slate-600 font-bold text-xs tracking-widest"
                                    >
                                      {num}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center font-black text-primary text-xs">
                                ₹{loan.loanTerms?.monthlyEMI?.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-black">
                                  {loan.loanTerms?.tenureMonths}M
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border ${loan.isSeized ? "bg-red-100 text-red-600 border-red-200" : "bg-green-100 text-green-600 border-green-200"}`}
                                >
                                  {loan.status.isSeized ? "Seized" : "Active"}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span
                                  title={loan.status.clientResponse}
                                  className="text-[10px] font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 block truncate max-w-[150px] mx-auto"
                                >
                                  {loan.status.clientResponse || "—"}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="flex justify-center items-center gap-3">
                                  <button
                                    onClick={() => {
                                      const id =
                                        loan._id || loan.id || loan.status?.id;
                                      if (id && id !== "undefined") {
                                        router.push(`/admin/loans/${id}`);
                                      } else {
                                        console.error(
                                          "Loan ID is undefined",
                                          loan,
                                        );
                                      }
                                    }}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:text-primary border border-slate-100 transition-all"
                                  >
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
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                      />
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                      />
                                    </svg>
                                  </button>
                                  {isSuperAdmin && (
                                    <button
                                      onClick={() => {
                                        const id =
                                          loan._id ||
                                          loan.id ||
                                          loan.status?.id;
                                        if (id && id !== "undefined") {
                                          router.push(
                                            `/admin/loans/edit/${id}`,
                                          );
                                        } else {
                                          console.error(
                                            "Loan ID is undefined",
                                            loan,
                                          );
                                        }
                                      }}
                                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:text-primary border border-slate-100 transition-all"
                                    >
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
                                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                        />
                                      </svg>
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
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                totalRecords={totalRecords}
                limit={limit}
              />
            </div>
          </main>
        </div>

        {/* Advanced Filter Drawer */}
        {isFilterOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
              onClick={() => setIsFilterOpen(false)}
            ></div>
            <div className="relative w-full max-w-md bg-white h-full shadow-2xl animate-slide-in-right border-l border-slate-100 flex flex-col">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                    Advanced Filter
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Refine your search results
                  </p>
                </div>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all border border-slate-100"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <form
                  id="filterForm"
                  onSubmit={handleAdvancedSearch}
                  className="space-y-8"
                >
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 px-1">
                        Loan Number
                      </label>
                      <input
                        type="text"
                        name="loanNumber"
                        value={filters.loanNumber}
                        onChange={handleFilterChange}
                        placeholder="E.G. LN-001"
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-300 uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 px-1">
                        Customer Name
                      </label>
                      <input
                        type="text"
                        name="customerName"
                        value={filters.customerName}
                        onChange={handleFilterChange}
                        placeholder="ENTER NAME"
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-300 uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 px-1">
                        Mobile Number
                      </label>
                      <input
                        type="text"
                        name="mobileNumber"
                        value={filters.mobileNumber}
                        onChange={handleFilterChange}
                        placeholder="MOBILE NUMBER"
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-300"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 px-1">
                          Tenure
                        </label>
                        <input
                          type="number"
                          name="tenureMonths"
                          value={filters.tenureMonths}
                          onChange={handleFilterChange}
                          placeholder="MONTHS"
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-300"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 px-1">
                          Status
                        </label>
                        <select
                          name="status"
                          value={filters.status}
                          onChange={handleFilterChange}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all appearance-none cursor-pointer"
                        >
                          <option value="">ALL</option>
                          <option value="Active">ACTIVE</option>
                          <option value="Rented">RENTED</option>
                          <option value="Closed">CLOSED</option>
                          <option value="Sold">SOLD</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-3">
                <button
                  type="submit"
                  form="filterForm"
                  className="w-full bg-primary text-white py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  🔍 APPLY FILTERS
                </button>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full bg-white border border-slate-200 text-slate-400 py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest hover:text-slate-600 hover:bg-slate-50 transition-all"
                >
                  RESET FILTERS
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around items-center h-20 px-4 z-[90] shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
        <button
          onClick={() => router.push("/admin/dashboard")}
          className="flex flex-col items-center gap-1.5 text-slate-400"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 012 2H4V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-tighter">
            Dashboard
          </span>
        </button>
        <button
          onClick={() => router.push("/admin/customers")}
          className="flex flex-col items-center gap-1.5 text-slate-400"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-tighter">
            Customers
          </span>
        </button>
        <button
          onClick={() => router.push("/admin/loans")}
          className="flex flex-col items-center gap-1.5 text-primary"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-tighter text-blue-600">
            Loans
          </span>
        </button>
        <button
          onClick={() => router.push("/admin/emi-details")}
          className="flex flex-col items-center gap-1.5 text-slate-400"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-tighter">
            EMI
          </span>
        </button>
        <button
          onClick={() => router.push("/admin/seized-vehicles")}
          className="flex flex-col items-center gap-1.5 text-slate-400"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 011-1h2.342a1 1 0 01.832.445l2.036 3.054a1 1 0 00.832.445H21v-1a1 1 0 00-1-1h-1m-5 1v-5a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16"
            />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-tighter">
            Seized
          </span>
        </button>
      </div>
    </AuthGuard>
  );
};

export default LoansPage;
