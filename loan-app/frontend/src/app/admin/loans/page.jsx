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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [limit] = useState(10);

  useEffect(() => {
    fetchLoans({ page: currentPage, limit });
  }, [currentPage]);

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

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const params = { page: 1 };
    if (searchQuery.trim()) params.loanNumber = searchQuery;
    setCurrentPage(1);
    fetchLoans(params);
  };

  const handleAdvancedSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchLoans({ ...filters, page: 1 });
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
    setCurrentPage(1);
    fetchLoans({ page: 1 });
    setIsFilterOpen(false);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-6xl mx-auto">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold uppercase tracking-tight">
                  {error}
                </div>
              )}
              {/* Header Section */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
                    Loan Management
                  </h1>
                  <p className="text-slate-500 font-medium text-sm">
                    {totalRecords} active records identified in system
                  </p>
                </div>
                <div className="w-full sm:w-auto flex items-center gap-3">
                  <button
                    onClick={async () => await exportLoansToExcel(loans)}
                    className="flex-1 sm:flex-none bg-emerald-600 text-white px-4 sm:px-6 py-3 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
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
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Export
                  </button>
                  {isSuperAdmin && (
                    <button
                      onClick={() => router.push("/admin/loans/add")}
                      className="flex-[2] sm:flex-none bg-primary text-white px-4 sm:px-6 py-3 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <span className="text-lg leading-none">+</span> Add New
                    </button>
                  )}
                </div>
              </div>

              {/* Search & Stats */}
              <div className="flex flex-col lg:flex-row items-center gap-4 mb-8">
                <div className="w-full lg:flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center overflow-hidden">
                  <form
                    onSubmit={handleSearch}
                    className="flex-1 flex items-center"
                  >
                    <div className="pl-4 text-slate-400">🔍</div>
                    <input
                      type="text"
                      placeholder="Search by Loan Number (e.g. LN-001)"
                      className="w-full py-3 px-3 text-xs font-bold text-slate-700 focus:outline-none placeholder:text-slate-300 placeholder:font-bold uppercase"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button type="submit" className="hidden">
                      Search
                    </button>
                  </form>
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        fetchLoans();
                      }}
                      className="text-[10px] font-black text-slate-400 px-4 hover:text-slate-600 uppercase border-l border-slate-100"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="w-full lg:w-auto flex items-center gap-3">
                  <button
                    onClick={handleSearch}
                    className="flex-1 lg:flex-none bg-primary text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                  >
                    🔍 Search
                  </button>
                  <button
                    onClick={() => setIsFilterOpen(true)}
                    className="flex-1 lg:flex-none bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                      />
                    </svg>
                    Filter
                  </button>
                </div>
              </div>

              {/* Loans Table (Desktop) */}
              <div className="hidden md:block bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-200">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Loan Number
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Customer Name
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Mobile
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                          EMI
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                          Tenure
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                          Status
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr>
                          <td
                            colSpan="7"
                            className="px-6 py-12 text-center text-slate-400 font-bold"
                          >
                            Initializing data stream...
                          </td>
                        </tr>
                      ) : loans.length === 0 ? (
                        <tr>
                          <td
                            colSpan="7"
                            className="px-6 py-12 text-center text-slate-400 font-bold"
                          >
                            No records found
                          </td>
                        </tr>
                      ) : (
                        loans.map((loan) => (
                          <tr
                            key={loan._id}
                            className={`${
                              loan.isSeized
                                ? "bg-red-50/50"
                                : "hover:bg-slate-50"
                            } transition-colors`}
                          >
                            <td className="px-6 py-4">
                              <span className="font-black text-slate-900 uppercase text-xs tracking-tighter">
                                {loan.loanNumber}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-700 text-sm">
                              {loan.customerName}
                            </td>
                            <td className="px-6 py-4 text-slate-500 font-medium text-xs tracking-widest">
                              {loan.mobileNumber}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="font-black text-primary">
                                ₹{loan.monthlyEMI?.toLocaleString()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-black">
                                {loan.tenureMonths}M
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {loan.isSeized ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[9px] font-black uppercase tracking-tighter border border-red-200">
                                  Seized
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-600 text-[9px] font-black uppercase tracking-tighter border border-green-200">
                                  Active
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex justify-center items-center gap-3">
                                <button
                                  onClick={() =>
                                    router.push(`/admin/loans/${loan._id}`)
                                  }
                                  className="text-slate-400 hover:text-primary transition-colors"
                                  title="View Profile"
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
                                    ></path>
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                    ></path>
                                  </svg>
                                </button>
                                {isSuperAdmin && (
                                  <button
                                    onClick={() =>
                                      router.push(
                                        `/admin/loans/edit/${loan._id}`,
                                      )
                                    }
                                    className="text-slate-400 hover:text-primary transition-colors"
                                    title="Edit Loan"
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
                                      ></path>
                                    </svg>
                                  </button>
                                )}
                                {!isSuperAdmin && (
                                  <span className="text-[9px] font-black text-slate-300 uppercase">
                                    View Only
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  totalRecords={totalRecords}
                  limit={limit}
                />
              </div>

              {/* Mobile View */}
              <div className="md:hidden space-y-4">
                {loading ? (
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">
                    Initializing data stream...
                  </div>
                ) : loans.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">
                    No records found
                  </div>
                ) : (
                  <>
                    {loans.map((loan) => (
                      <div
                        key={loan._id}
                        className={`bg-white rounded-2xl border border-slate-200 p-5 shadow-sm ${
                          loan.isSeized ? "border-l-4 border-l-red-500" : ""
                        }`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                              Loan Number
                            </span>
                            <span className="text-sm font-black text-slate-900 uppercase">
                              {loan.loanNumber}
                            </span>
                          </div>
                          {loan.isSeized ? (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[9px] font-black uppercase tracking-tighter border border-red-200">
                              Seized
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-600 text-[9px] font-black uppercase tracking-tighter border border-green-200">
                              Active
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                              Customer
                            </span>
                            <span className="text-xs font-bold text-slate-700 uppercase break-words">
                              {loan.customerName}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                              Mobile
                            </span>
                            <span className="text-xs font-medium text-slate-500 tracking-widest">
                              {loan.mobileNumber}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                              EMI
                            </span>
                            <span className="text-sm font-black text-primary">
                              ₹{loan.monthlyEMI?.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                              Tenure
                            </span>
                            <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md inline-block">
                              {loan.tenureMonths}M
                            </span>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex gap-3">
                          <button
                            onClick={() =>
                              router.push(`/admin/loans/${loan._id}`)
                            }
                            className="flex-1 bg-slate-50 text-slate-600 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all text-center"
                          >
                            View Details
                          </button>
                          {isSuperAdmin && (
                            <button
                              onClick={() =>
                                router.push(`/admin/loans/edit/${loan._id}`)
                              }
                              className="flex-1 bg-primary/5 text-primary py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-primary/10 transition-all text-center"
                            >
                              Edit Loan
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                      totalRecords={totalRecords}
                      limit={limit}
                    />
                  </>
                )}
              </div>
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
                          <option value="Seized">SEIZED</option>
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
    </AuthGuard>
  );
};

export default LoansPage;
