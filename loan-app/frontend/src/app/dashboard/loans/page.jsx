"use client";
import { useState, useEffect } from "react";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import { getUserFromToken } from "../../../utils/auth";
import {
  getLoans,
  createLoan,
  updateLoan,
  toggleSeized,
  searchLoan,
} from "../../../services/loan.service";

const LoansPage = () => {
  const user = getUserFromToken();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentLoan, setCurrentLoan] = useState(null);
  const [formData, setFormData] = useState({
    loanNumber: "",
    customerName: "",
    mobileNumber: "",
    address: "",
    principal: "",
    roi: "",
    tenureMonths: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const res = await getLoans();
      setLoans(res.data);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchLoans();
      return;
    }
    try {
      setLoading(true);
      const res = await searchLoan(searchQuery);
      setLoans([res.data]);
      setError("");
    } catch (err) {
      setLoans([]);
      setError("No loan found with this number");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (loan = null) => {
    if (loan) {
      setCurrentLoan(loan);
      setFormData({
        loanNumber: loan.loanNumber,
        customerName: loan.customerName,
        mobileNumber: loan.mobileNumber,
        address: loan.address || "",
        principal: loan.principal,
        roi: loan.roi,
        tenureMonths: loan.tenureMonths,
      });
    } else {
      setCurrentLoan(null);
      setFormData({
        loanNumber: "",
        customerName: "",
        mobileNumber: "",
        address: "",
        principal: "",
        roi: "",
        tenureMonths: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setError("");
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const calculateEMI = (p, r_annual, n) => {
    const principal = parseFloat(p);
    const roi = parseFloat(r_annual);
    const tenure = parseInt(n);
    if (!principal || !roi || !tenure) return 0;
    const r = roi / 12 / 100;
    if (r === 0) return (principal / tenure).toFixed(2);
    const emi =
      (principal * r * Math.pow(1 + r, tenure)) / (Math.pow(1 + r, tenure) - 1);
    return emi.toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (currentLoan) {
        await updateLoan(currentLoan._id, formData);
      } else {
        await createLoan(formData);
      }
      handleCloseModal();
      fetchLoans();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSeized = async (id) => {
    try {
      await toggleSeized(id);
      fetchLoans();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-6xl mx-auto">
              {/* Header Section */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                    Loan Management
                  </h1>
                  <p className="text-slate-500 font-medium text-sm">
                    {loans.length} active records identified in system
                  </p>
                </div>
                {isSuperAdmin && (
                  <button
                    onClick={() => handleOpenModal()}
                    className="bg-primary text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
                  >
                    <span className="text-lg leading-none">+</span> Add New Loan
                  </button>
                )}
              </div>

              {/* Search & Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                <div className="lg:col-span-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
                  <form
                    onSubmit={handleSearch}
                    className="flex-1 flex items-center"
                  >
                    <span className="pl-4 text-slate-400">🔍</span>
                    <input
                      type="text"
                      placeholder="Search by Loan Number (e.g. LN-001)"
                      className="w-full p-3 text-sm font-bold text-slate-700 focus:outline-none placeholder:text-slate-300 placeholder:font-black uppercase"
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
                      className="text-[10px] font-black text-slate-400 pr-4 hover:text-slate-600 uppercase"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center text-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Status
                  </span>
                  <span className="text-primary font-black uppercase text-sm">
                    Enterprise Online
                  </span>
                </div>
              </div>

              {/* Loans Table */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
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
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
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
                            <td className="px-6 py-4 text-right">
                              <span className="font-black text-primary">
                                ₹{loan.monthlyEmi?.toLocaleString()}
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
                            <td className="px-6 py-4">
                              <div className="flex justify-center items-center gap-3">
                                {isSuperAdmin && (
                                  <>
                                    <button
                                      onClick={() => handleOpenModal(loan)}
                                      className="text-slate-400 hover:text-primary transition-colors"
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
                                    <button
                                      onClick={() =>
                                        handleToggleSeized(loan._id)
                                      }
                                      title={
                                        loan.isSeized ? "Unseize" : "Seize"
                                      }
                                      className={`${
                                        loan.isSeized
                                          ? "text-green-500"
                                          : "text-red-500"
                                      } hover:opacity-70 transition-opacity`}
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
                                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                        ></path>
                                      </svg>
                                    </button>
                                  </>
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
              </div>
            </div>
          </main>

          {/* Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                    {currentLoan
                      ? "Modify Loan Parameters"
                      : "Register New Loan"}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="text-slate-400 hover:text-slate-600 text-2xl font-black"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-[11px] font-black uppercase tracking-wider rounded-xl">
                      Error: {error}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
                        Loan Number
                      </label>
                      <input
                        type="text"
                        name="loanNumber"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase disabled:opacity-50"
                        value={formData.loanNumber}
                        onChange={handleChange}
                        disabled={!!currentLoan}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
                        Customer Name
                      </label>
                      <input
                        type="text"
                        name="customerName"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        value={formData.customerName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
                        Mobile Number
                      </label>
                      <input
                        type="text"
                        name="mobileNumber"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        value={formData.mobileNumber}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
                        Principal Amount
                      </label>
                      <input
                        type="number"
                        name="principal"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        value={formData.principal}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
                        ROI (Annual %)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="roi"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        value={formData.roi}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
                        Tenure (Months)
                      </label>
                      <input
                        type="number"
                        name="tenureMonths"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        value={formData.tenureMonths}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
                      Full Address
                    </label>
                    <textarea
                      name="address"
                      rows="2"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      value={formData.address}
                      onChange={handleChange}
                    ></textarea>
                  </div>

                  <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex justify-between items-center">
                    <div>
                      <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em]">
                        Calculated Monthly EMI
                      </span>
                      <p className="text-xl font-black text-primary">
                        ₹
                        {calculateEMI(
                          formData.principal,
                          formData.roi,
                          formData.tenureMonths
                        ).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em]">
                        Interest Type
                      </span>
                      <p className="text-[10px] font-black text-slate-700 uppercase">
                        Amortized Fixed
                      </p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-primary text-white p-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 mt-2"
                  >
                    {submitting
                      ? "Communicating with Server..."
                      : currentLoan
                      ? "Update Records"
                      : "Commit New Loan"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
};

export default LoansPage;
