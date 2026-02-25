"use client";
import { useState, useEffect } from "react";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import {
  getSeizedVehicles,
  updateSeizedStatus,
} from "../../../services/loan.service";
import Pagination from "../../../components/Pagination";
import Link from "next/link";
import SoldVehicleModal from "../../../components/SoldVehicleModal";
import SuccessModal from "../../../components/SuccessModal";

const SeizedVehiclesPage = () => {
  const [seizedLoans, setSeizedLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    loanNumber: "",
    customerName: "",
    vehicleNumber: "",
  });
  const [activeContactMenu, setActiveContactMenu] = useState(null); // { number, name, type, x, y }
  const [isSoldModalOpen, setIsSoldModalOpen] = useState(false);
  const [selectedLoanForSale, setSelectedLoanForSale] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const handleSeizedStatusChange = async (loanId, newStatus) => {
    if (newStatus === "Sold") {
      const loan = seizedLoans.find((l) => l._id === loanId);
      setSelectedLoanForSale(loan);
      setIsSoldModalOpen(true);
      return;
    }

    try {
      const res = await updateSeizedStatus(loanId, newStatus);
      if (newStatus === "Re-activate") {
        setSeizedLoans((prev) => prev.filter((l) => l._id !== loanId));
        setTotalRecords((prev) => prev - 1);
      } else {
        setSeizedLoans((prev) =>
          prev.map((l) => (l._id === loanId ? { ...l, ...res.data } : l)),
        );
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSoldConfirm = async (soldDetails) => {
    try {
      const res = await updateSeizedStatus(
        selectedLoanForSale._id,
        "Sold",
        soldDetails,
      );
      setSeizedLoans((prev) =>
        prev.map((l) =>
          l._id === selectedLoanForSale._id ? { ...l, ...res.data } : l,
        ),
      );
      setIsSoldModalOpen(false);
      setSuccessMessage("successfully sold the vechile");
      setIsSuccessModalOpen(true);
    } catch (err) {
      setError(err.message);
    }
  };

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
      fetchSeizedLoans({ ...filters, ...params });
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, currentPage]);

  const fetchSeizedLoans = async (params = {}) => {
    try {
      setLoading(true);
      const res = await getSeizedVehicles({ ...params, limit });
      if (res.data && res.data.vehicles) {
        setSeizedLoans(res.data.vehicles);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalRecords(res.data.pagination?.total || res.data.vehicles.length);
      } else {
        setSeizedLoans(res.data || []);
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
    handleAdvancedSearch();
  };

  const handleAdvancedSearch = (e) => {
    if (e) e.preventDefault();
    const params = { ...filters, page: 1 };
    if (searchQuery.trim()) params.loanNumber = searchQuery;
    setCurrentPage(1);
    fetchSeizedLoans(params);
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
    };
    setFilters(emptyFilters);
    setSearchQuery("");
    setCurrentPage(1);
    fetchSeizedLoans({ page: 1 });
    setIsFilterOpen(false);
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
              <div className="flex justify-between items-start mb-2 sm:mb-8">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
                    Seized Vehicles Inventory
                  </h1>
                  <p className="text-slate-400 font-bold text-[9px] sm:text-sm uppercase tracking-[0.15em] mt-1.5">
                    {totalRecords} RECORDS FOUND
                  </p>
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
                          Loan Number
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Name
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Mobile
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Vehicle Number
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                          Months
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                          Amount
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                          Days
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
                            colSpan="8"
                            className="px-6 py-12 text-center text-slate-300 font-bold text-xs uppercase"
                          >
                            Loading inventory...
                          </td>
                        </tr>
                      ) : seizedLoans.length === 0 ? (
                        <tr>
                          <td
                            colSpan="8"
                            className="px-6 py-12 text-center text-slate-300 font-bold text-xs uppercase"
                          >
                            No seized vehicles found
                          </td>
                        </tr>
                      ) : (
                        seizedLoans.map((loan) => {
                          // Countdown Logic (kept for Days Calculation if needed, but UI column removed)
                          const isSeized = loan.seizedStatus === "Seized";
                          const seizedDateRaw = isSeized
                            ? loan.seizedDate
                            : null;
                          const seizedDate = seizedDateRaw
                            ? new Date(seizedDateRaw)
                            : null;

                          let diffDays = 0;
                          let isDateValid = false;

                          if (seizedDate && !isNaN(seizedDate.getTime())) {
                            isDateValid = true;
                            const today = new Date();
                            const diffTime = Math.abs(today - seizedDate);
                            diffDays = Math.ceil(
                              diffTime / (1000 * 60 * 60 * 24),
                            );
                          } else {
                            diffDays = "N/A";
                            isDateValid = false;
                          }

                          return (
                            <tr
                              key={loan._id}
                              className="hover:bg-slate-50 transition-colors"
                            >
                              {/* 1. Loan Number */}
                              <td className="px-6 py-5">
                                <Link
                                  href={`/admin/loans/${loan._id}`}
                                  className="text-[10px] font-bold text-primary hover:underline uppercase transition-all"
                                >
                                  {loan.loanTerms?.loanNumber ||
                                    loan.loanNumber}
                                </Link>
                              </td>

                              {/* 2. Name */}
                              <td className="px-6 py-5">
                                <span className="font-extrabold text-slate-700 text-xs uppercase">
                                  {loan.customerDetails?.customerName ||
                                    loan.customerName}
                                </span>
                              </td>

                              {/* 3. Mobile */}
                              <td className="px-6 py-5">
                                <div className="flex flex-col gap-0.5">
                                  {(
                                    loan.customerDetails?.mobileNumbers ||
                                    loan.mobileNumbers ||
                                    []
                                  ).map((num, idx) => (
                                    <button
                                      key={idx}
                                      onClick={(e) => {
                                        const rect =
                                          e.currentTarget.getBoundingClientRect();
                                        setActiveContactMenu({
                                          number: num,
                                          name:
                                            loan.customerDetails
                                              ?.customerName ||
                                            loan.customerName,
                                          type: "Applicant",
                                          x: rect.left,
                                          y: rect.bottom,
                                        });
                                      }}
                                      className="text-[10px] font-bold text-slate-400 hover:text-primary transition-colors text-left"
                                    >
                                      {num}
                                    </button>
                                  ))}
                                </div>
                              </td>

                              {/* 4. Vehicle Number */}
                              <td className="px-6 py-5">
                                <span className="font-black text-slate-900 text-xs uppercase tracking-tight">
                                  {loan.loanTerms?.vehicleNumber ||
                                    loan.vehicleNumber ||
                                    "N/A"}
                                </span>
                              </td>

                              {/* 5. Months */}
                              <td className="px-6 py-5 text-center">
                                <span className="text-xs font-bold text-slate-600">
                                  {loan.unpaidMonths || 0}
                                </span>
                              </td>

                              {/* 6. Amount */}
                              <td className="px-6 py-5 text-right">
                                <span className="text-xs font-black text-slate-900">
                                  ₹
                                  {loan.totalDueAmount?.toLocaleString() || "0"}
                                </span>
                              </td>

                              {/* 7. Days (Since Seized) */}
                              <td className="px-6 py-5 text-center">
                                <span className="text-[10px] font-bold text-slate-500">
                                  {isDateValid ? `${diffDays} Days` : "N/A"}
                                </span>
                              </td>

                              {/* 8. Status Dropdown */}
                              <td className="px-6 py-5 text-center">
                                <select
                                  value={loan.seizedStatus || "For Seizing"}
                                  onChange={(e) =>
                                    handleSeizedStatusChange(
                                      loan._id,
                                      e.target.value,
                                    )
                                  }
                                  className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${
                                    (loan.seizedStatus || "For Seizing") ===
                                    "For Seizing"
                                      ? "bg-amber-50 text-amber-600 border-amber-200"
                                      : loan.seizedStatus === "Seized"
                                        ? "bg-red-50 text-red-600 border-red-200"
                                        : loan.seizedStatus === "Sold"
                                          ? "bg-slate-100 text-slate-600 border-slate-300"
                                          : "bg-emerald-50 text-emerald-600 border-emerald-200"
                                  }`}
                                >
                                  <option value="For Seizing">
                                    For Seizing
                                  </option>
                                  <option value="Seized">Seized</option>
                                  <option value="Sold">Sold</option>
                                  <option value="Re-activate">
                                    Re-activate
                                  </option>
                                </select>
                              </td>
                            </tr>
                          );
                        })
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
                        Vehicle Number
                      </label>
                      <input
                        type="text"
                        name="vehicleNumber"
                        value={filters.vehicleNumber}
                        onChange={handleFilterChange}
                        placeholder="E.G. KA-01-AB-1234"
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-300 uppercase"
                      />
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

        {/* Sold Vehicle Modal */}
        <SoldVehicleModal
          isOpen={isSoldModalOpen}
          onClose={() => setIsSoldModalOpen(false)}
          onConfirm={handleSoldConfirm}
          loan={selectedLoanForSale}
        />

        {/* Success Modal */}
        <SuccessModal
          isOpen={isSuccessModalOpen}
          onClose={() => setIsSuccessModalOpen(false)}
          message={successMessage}
        />
      </div>
    </AuthGuard>
  );
};

export default SeizedVehiclesPage;
