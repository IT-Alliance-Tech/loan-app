"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import { getSeizedPending, updateLoan } from "../../../services/loan.service";
import Pagination from "../../../components/Pagination";
import { useToast } from "../../../context/ToastContext";
import Link from "next/link";

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

  // Client Response Edit State
  const [editingItem, setEditingItem] = useState(null);
  const [tempResponse, setTempResponse] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleUpdateResponse = async (e) => {
    if (e) e.preventDefault();
    if (!editingItem) return;

    try {
      setIsSubmitting(true);
      await updateLoan(editingItem.loanId, {
        clientResponse: tempResponse,
      });

      showToast("Client response updated successfully", "success");
      setEditingItem(null);
      // Refresh data to show updated response
      fetchSeizedPending({ page: currentPage, limit });
    } catch (err) {
      showToast(err.message || "Failed to update response", "error");
    } finally {
      setIsSubmitting(false);
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
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr>
                          <td
                            colSpan="8"
                            className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase text-center"
                          >
                            Loading records...
                          </td>
                        </tr>
                      ) : data.length === 0 ? (
                        <tr>
                          <td
                            colSpan="8"
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
                                  title={item.clientResponse}
                                  className="text-[10px] font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 block truncate max-w-[120px]"
                                >
                                  {item.clientResponse || "—"}
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingItem(item);
                                    setTempResponse(item.clientResponse || "");
                                  }}
                                  className="text-primary hover:text-blue-700 transition-colors"
                                  title="Edit Response"
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
                              </div>
                            </td>
                            <td className="px-6 py-5 text-center whitespace-nowrap">
                              <button
                                onClick={() => {
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
                                }}
                                className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-800 transition-all shadow-lg shadow-slate-100"
                              >
                                View
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

        {/* Client Response Modal */}
        {editingItem && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
              onClick={() => !isSubmitting && setEditingItem(null)}
            ></div>
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl animate-scale-up overflow-hidden border border-slate-100">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                    Update Client Response
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {editingItem.loanNumber} • {editingItem.customerName}
                  </p>
                </div>
                <button
                  onClick={() => setEditingItem(null)}
                  disabled={isSubmitting}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-slate-600 disabled:opacity-50"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleUpdateResponse} className="p-6">
                <div className="mb-6">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    Client Response
                  </label>
                  <textarea
                    autoFocus
                    value={tempResponse}
                    onChange={(e) => setTempResponse(e.target.value)}
                    placeholder="Enter the client's response or status update..."
                    className="w-full h-32 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-primary transition-all resize-none placeholder:text-slate-300"
                  ></textarea>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-4 rounded-2xl font-black text-[12px] uppercase text-slate-400 border border-slate-100 hover:bg-slate-50 transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-[2] bg-primary text-white py-4 rounded-2xl font-black text-[12px] uppercase shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      "Save Response"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
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

      {/* Contact Action Menu Popover */}
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
                {activeContactMenu.name || "N/A"}
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
    </AuthGuard>
  );
};

export default PendingPaymentsPage;
