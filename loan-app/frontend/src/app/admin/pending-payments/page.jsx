"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import ContactActionMenu from "../../../components/ContactActionMenu";
import {
  getSeizedPending,
  updateLoan,
  toggleSeized,
} from "../../../services/loan.service";
import Pagination from "../../../components/Pagination";
import { useToast } from "../../../context/ToastContext";
import Link from "next/link";
import TableActionMenu from "../../../components/TableActionMenu";

const PendingPaymentsPage = () => {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    loanNumber: "",
    customerName: "",
    vehicleNumber: "",
    mobileNumber: "",
  });
  const [selectedContact, setSelectedContact] = useState(null); // Contact Details Modal
  const [activeContactMenu, setActiveContactMenu] = useState(null); // { number, name, type, x, y }

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [limit] = useState(10);
  const { showToast } = useToast();

  useEffect(() => {
    fetchSeizedPending({ page: currentPage, limit });
  }, [currentPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== undefined) {
        setCurrentPage(1);
        fetchSeizedPending({ loanNumber: searchQuery, page: 1, limit });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchSeizedPending = async (params = {}) => {
    try {
      setLoading(true);
      const res = await getSeizedPending({
        ...params,
        limit,
      });
      if (res.data) {
        if (res.data.payments) {
          setData(res.data.payments);
          setTotalPages(res.data.pagination.totalPages);
          setTotalRecords(res.data.pagination.total);
        } else {
          setData(res.data);
        }
      }
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    setCurrentPage(1);
    fetchSeizedPending({ loanNumber: searchQuery, page: 1, limit });
  };

  const handleAdvancedSearch = (e) => {
    if (e) e.preventDefault();
    setCurrentPage(1);
    fetchSeizedPending({ ...filters, page: 1, limit });
    setIsFilterOpen(false);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    const emptyFilters = {
      loanNumber: "",
      customerName: "",
      vehicleNumber: "",
      mobileNumber: "",
    };
    setFilters(emptyFilters);
    setSearchQuery("");
    setCurrentPage(1);
    fetchSeizedPending({ page: 1, limit });
    setIsFilterOpen(false);
  };

  const handleSeize = async (loanId) => {
    if (
      !window.confirm("Are you sure you want to mark this vehicle as seized?")
    )
      return;
    try {
      await toggleSeized(loanId);
      showToast("Vehicle marked as seized", "success");
      fetchSeizedPending({ page: currentPage, limit });
    } catch (err) {
      showToast(err.message || "Failed to seize vehicle", "error");
    }
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
            <div className="max-w-7xl mx-auto">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
                    Pending Payments
                  </h1>
                  <p className="text-slate-400 font-bold text-[9px] sm:text-[10px] uppercase tracking-[0.2em] mt-2">
                    Monitoring outstanding payments for assets
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-8">
                <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center h-14 overflow-hidden">
                  <form
                    onSubmit={handleSearch}
                    className="flex-1 flex items-center px-4"
                  >
                    <div className="text-slate-300 text-lg">🔍</div>
                    <input
                      type="text"
                      placeholder="Quick Search Loan #"
                      className="w-full py-3 px-3 text-sm font-medium text-slate-700 focus:outline-none placeholder:text-slate-300 uppercase"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </form>
                </div>
                <button
                  onClick={() => setIsFilterOpen(true)}
                  className="w-14 h-14 bg-white border border-slate-100 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm group"
                >
                  <svg
                    className="w-6 h-6 group-hover:text-primary transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                </button>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold uppercase tracking-tight">
                  {error}
                </div>
              )}

              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-100 pb-1">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-200">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                          Loan ID
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                          Applicant Name
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                          Applicant Mobile
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                          Guarantor Name
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                          Guarantor Mobile
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                          Months
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                          Remaining Amount
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                          Client Response
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap sticky right-0 bg-slate-50 z-20 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr>
                          <td
                            colSpan="9"
                            className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase text-center"
                          >
                            Loading records...
                          </td>
                        </tr>
                      ) : data.length === 0 ? (
                        <tr>
                          <td
                            colSpan="9"
                            className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase text-center"
                          >
                            No records found
                          </td>
                        </tr>
                      ) : (
                        data.map((item) => (
                          <tr
                            key={item.loanId}
                            className="hover:bg-slate-50 transition-colors group"
                          >
                            <td className="px-6 py-5 whitespace-nowrap">
                              <Link
                                href={`/admin/pending-payments/view/${item.earliestEmiId}`}
                                className="text-[11px] font-black text-primary uppercase tracking-wider hover:underline"
                              >
                                {item.loanNumber}
                              </Link>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <span className="font-black text-slate-900 text-xs uppercase tracking-tight">
                                {item.customerName}
                              </span>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="flex flex-col gap-0.5 mt-1">
                                {(item.mobileNumbers || []).map((num, idx) => (
                                  <button
                                    key={idx}
                                    onClick={(e) => {
                                      const rect =
                                        e.currentTarget.getBoundingClientRect();
                                      setActiveContactMenu({
                                        number: num,
                                        name: item.customerName,
                                        type: "Applicant",
                                        x: rect.left,
                                        y: rect.bottom,
                                      });
                                    }}
                                    className="text-[11px] font-bold text-primary hover:underline transition-colors text-left"
                                  >
                                    {num}
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <span className="font-black text-slate-900 text-xs uppercase tracking-tight">
                                {item.guarantorName || "—"}
                              </span>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="flex flex-col gap-0.5 mt-1">
                                {(item.guarantorMobileNumbers || []).map(
                                  (num, idx) => (
                                    <button
                                      key={idx}
                                      onClick={(e) => {
                                        const rect =
                                          e.currentTarget.getBoundingClientRect();
                                        setActiveContactMenu({
                                          number: num,
                                          name: item.guarantorName,
                                          type: "Guarantor",
                                          x: rect.left,
                                          y: rect.bottom,
                                        });
                                      }}
                                      className="text-[11px] font-bold text-primary hover:underline transition-colors text-left"
                                    >
                                      {num}
                                    </button>
                                  ),
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-5 text-center whitespace-nowrap">
                              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded-md">
                                {item.unpaidMonths}{" "}
                                {item.unpaidMonths === 1 ? "Month" : "Months"}
                              </span>
                            </td>
                            <td className="px-6 py-5 text-center whitespace-nowrap">
                              <div className="flex flex-col items-center">
                                <span className="text-sm font-black text-red-600 tracking-tight">
                                  ₹{item.totalDueAmount.toLocaleString()}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                <span
                                  title={
                                    item.clientResponse ||
                                    item.status?.clientResponse
                                  }
                                  className="text-[10px] font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 block truncate max-w-[120px]"
                                >
                                  {item.clientResponse ||
                                    item.status?.clientResponse ||
                                    "—"}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-center whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 z-10 transition-colors shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">
                              <TableActionMenu
                                actions={[
                                  {
                                    label: "View",
                                    onClick: () => {
                                      if (
                                        item.earliestEmiId &&
                                        item.earliestEmiId !== "undefined"
                                      ) {
                                        router.push(
                                          `/admin/pending-payments/view/${item.earliestEmiId}`,
                                        );
                                      } else {
                                        console.error(
                                          "Payment ID is undefined",
                                          item,
                                        );
                                      }
                                    },
                                  },
                                  {
                                    label: "Seize Vehicle",
                                    onClick: () => handleSeize(item.loanId),
                                  },
                                ]}
                              />
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
                onPageChange={handlePageChange}
                totalRecords={totalRecords}
                limit={limit}
              />
            </div>
          </main>
        </div>

        {/* Filter Drawer */}
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
                    Filters
                  </h2>
                </div>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:text-slate-600 border border-slate-100"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8">
                <form
                  id="filterForm"
                  onSubmit={handleAdvancedSearch}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                      Loan Number
                    </label>
                    <input
                      type="text"
                      name="loanNumber"
                      value={filters.loanNumber}
                      onChange={handleFilterChange}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-primary uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                      Applicant Name
                    </label>
                    <input
                      type="text"
                      name="customerName"
                      value={filters.customerName}
                      onChange={handleFilterChange}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-primary uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                      Vehicle Number
                    </label>
                    <input
                      type="text"
                      name="vehicleNumber"
                      value={filters.vehicleNumber}
                      onChange={handleFilterChange}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-primary uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                      Mobile Number
                    </label>
                    <input
                      type="text"
                      name="mobileNumber"
                      value={filters.mobileNumber}
                      onChange={handleFilterChange}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-primary uppercase"
                    />
                  </div>
                </form>
              </div>
              <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-3">
                <button
                  type="submit"
                  form="filterForm"
                  className="w-full bg-primary text-white py-4 rounded-2xl font-black text-[12px] uppercase shadow-xl shadow-blue-200"
                >
                  Apply Filters
                </button>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full bg-white border border-slate-200 text-slate-400 py-4 rounded-2xl font-black text-[12px] uppercase"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Contact Action Menu */}
        <ContactActionMenu
          contact={activeContactMenu}
          onClose={() => setActiveContactMenu(null)}
        />
      </div>
    </AuthGuard>
  );
};

export default PendingPaymentsPage;
