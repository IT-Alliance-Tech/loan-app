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
import { exportLoansToExcel } from "../../../utils/exportExcel";

const LoansPage = () => {
  const user = getUserFromToken();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [currentLoan, setCurrentLoan] = useState(null);
  const [formData, setFormData] = useState({
    loanNumber: "",
    customerName: "",
    address: "",
    ownRent: "Own",
    mobileNumber: "",
    panNumber: "",
    aadharNumber: "",
    principalAmount: "",
    processingFeeRate: "2",
    processingFee: "",
    tenureType: "Monthly",
    tenureMonths: "",
    annualInterestRate: "",
    dateLoanDisbursed: "",
    emiStartDate: "",
    emiEndDate: "",
    totalInterestAmount: "",
    vehicleNumber: "",
    chassisNumber: "",
    model: "",
    typeOfVehicle: "",
    ywBoard: "Yellow",
    docChecklist: "",
    dealerName: "",
    dealerNumber: "",
    hpEntry: "Not done",
    fcDate: "",
    insuranceDate: "",
    rtoWorkPending: "HPA,TO",
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

  const handleOpenModal = (loan = null, viewOnly = false) => {
    setIsViewOnly(viewOnly);
    if (loan) {
      setCurrentLoan(loan);
      setFormData({
        loanNumber: loan.loanNumber || "",
        customerName: loan.customerName || "",
        address: loan.address || "",
        ownRent: loan.ownRent || "Own",
        mobileNumber: loan.mobileNumber || "",
        panNumber: loan.panNumber || "",
        aadharNumber: loan.aadharNumber || "",
        principalAmount: loan.principalAmount || "",
        processingFeeRate: loan.processingFeeRate || "2",
        processingFee: loan.processingFee || "",
        tenureType: loan.tenureType || "Monthly",
        tenureMonths: loan.tenureMonths || "",
        annualInterestRate: loan.annualInterestRate || "",
        dateLoanDisbursed: loan.dateLoanDisbursed ? new Date(loan.dateLoanDisbursed).toISOString().split('T')[0] : "",
        emiStartDate: loan.emiStartDate ? new Date(loan.emiStartDate).toISOString().split('T')[0] : "",
        emiEndDate: loan.emiEndDate ? new Date(loan.emiEndDate).toISOString().split('T')[0] : "",
        totalInterestAmount: loan.totalInterestAmount || "",
        vehicleNumber: loan.vehicleNumber || "",
        chassisNumber: loan.chassisNumber || "",
        model: loan.model || "",
        typeOfVehicle: loan.typeOfVehicle || "",
        ywBoard: loan.ywBoard || "Yellow",
        docChecklist: loan.docChecklist || "",
        dealerName: loan.dealerName || "",
        dealerNumber: loan.dealerNumber || "",
        hpEntry: loan.hpEntry || "Not done",
        fcDate: loan.fcDate ? new Date(loan.fcDate).toISOString().split('T')[0] : "",
        insuranceDate: loan.insuranceDate ? new Date(loan.insuranceDate).toISOString().split('T')[0] : "",
        rtoWorkPending: loan.rtoWorkPending || "HPA,TO",
      });
    } else {
      setCurrentLoan(null);
      setFormData({
        loanNumber: "",
        customerName: "",
        address: "",
        ownRent: "Own",
        mobileNumber: "",
        panNumber: "",
        aadharNumber: "",
        principalAmount: "",
        processingFeeRate: "2",
        processingFee: "",
        tenureType: "Monthly",
        tenureMonths: "",
        annualInterestRate: "",
        dateLoanDisbursed: "",
        emiStartDate: "",
        emiEndDate: "",
        totalInterestAmount: "",
        vehicleNumber: "",
        chassisNumber: "",
        model: "",
        typeOfVehicle: "",
        ywBoard: "Yellow",
        docChecklist: "",
        dealerName: "",
        dealerNumber: "",
        hpEntry: "Not done",
        fcDate: "",
        insuranceDate: "",
        rtoWorkPending: "HPA,TO",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsViewOnly(false);
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

  const validateForm = () => {
    const mobileRegex = /^[6-9]\d{9}$/;
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    const aadharRegex = /^\d{12}$/;
    const vehicleRegex = /^[A-Z]{2}-\d{2}[-\s][A-Z]{1,2}-\d{4}$/;

    if (!mobileRegex.test(formData.mobileNumber)) {
      setError("Invalid Mobile Number. Must be 10 digits starting with 6-9.");
      return false;
    }
    if (formData.panNumber && !panRegex.test(formData.panNumber.toUpperCase())) {
      setError("Invalid PAN Number format (e.g., ABCDE1234F).");
      return false;
    }
    if (formData.aadharNumber && !aadharRegex.test(formData.aadharNumber)) {
      setError("Invalid Aadhar Number. Must be 12 digits.");
      return false;
    }
    if (formData.vehicleNumber && !vehicleRegex.test(formData.vehicleNumber.toUpperCase())) {
      setError("Invalid Vehicle Number format (e.g., KA-01 AB-1234).");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
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
                <div className="flex items-center gap-3">
                  <button
                    onClick={async () => await exportLoansToExcel(loans)}
                    className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export
                  </button>
                  {isSuperAdmin && (
                    <button
                      onClick={() => handleOpenModal()}
                      className="bg-primary text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
                    >
                      <span className="text-lg leading-none">+</span> Add New Loan
                    </button>
                  )}
                </div>
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
                            <td className="px-6 py-4">
                              <div className="flex justify-center items-center gap-3">
                                <button
                                  onClick={() => handleOpenModal(loan, true)}
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
                                  <>
                                    <button
                                      onClick={() => handleOpenModal(loan, false)}
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
              <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200 flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                    {isViewOnly 
                      ? "Loan Profile View" 
                      : currentLoan
                        ? "Modify Loan Parameters"
                        : "Create Profile"}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="text-slate-400 hover:text-slate-600 text-2xl font-black"
                  >
                    ×
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                  {error && (
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold uppercase tracking-tight">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">Basic Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loan Number</label>
                          <input type="text" name="loanNumber" value={formData.loanNumber} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase" placeholder="LN-001" required />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</label>
                          <input type="text" name="customerName" value={formData.customerName} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Full Name" required />
                        </div>
                      </div>
                    </div>

                    {/* Customer Details */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">Customer Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Address</label>
                          <textarea name="address" value={formData.address} onChange={handleChange} readOnly={isViewOnly} rows="2" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" required></textarea>
                        </div>
                        <div className="grid grid-cols-2 gap-6 md:col-span-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Own/Rent</label>
                            <select name="ownRent" value={formData.ownRent} onChange={handleChange} disabled={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20">
                              <option value="Own">Own</option>
                              <option value="Rent">Rent</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile Number</label>
                            <input type="text" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" required />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6 md:col-span-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PAN Number</label>
                            <input type="text" name="panNumber" value={formData.panNumber} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aadhar Number</label>
                            <input type="text" name="aadharNumber" value={formData.aadharNumber} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Loan Terms */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">Loan Terms</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                            <input type="number" name="principalAmount" value={formData.principalAmount} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" required />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Processing Fee Rate (%)</label>
                          <input type="number" name="processingFeeRate" value={formData.processingFeeRate} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Processing Fee</label>
                          <input type="number" name="processingFee" value={formData.processingFee} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tenure Type</label>
                          <select name="tenureType" value={formData.tenureType} onChange={handleChange} disabled={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20">
                            <option value="Monthly">Monthly</option>
                            <option value="Weekly">Weekly</option>
                            <option value="Daily">Daily</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tenure (Months)</label>
                          <input type="number" name="tenureMonths" value={formData.tenureMonths} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" required />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Interest Rate (%)</label>
                          <input type="number" step="0.01" name="annualInterestRate" value={formData.annualInterestRate} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" required />
                        </div>
                      </div>
                    </div>

                    {/* Dates & EMI */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">Dates & EMI Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Loan Disbursed</label>
                          <input type="date" name="dateLoanDisbursed" value={formData.dateLoanDisbursed} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">EMI Start Date</label>
                          <input type="date" name="emiStartDate" value={formData.emiStartDate} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">EMI End Date</label>
                          <input type="date" name="emiEndDate" value={formData.emiEndDate} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        </div>
                        <div className="md:col-span-3">
                          <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex justify-between items-center">
                            <div>
                              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Calculated Monthly EMI</span>
                              <p className="text-xl font-black text-primary">₹{calculateEMI(formData.principalAmount, formData.annualInterestRate, formData.tenureMonths)}</p>
                            </div>
                            <div className="text-right">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Interest Amount</label>
                              <input type="number" name="totalInterestAmount" value={formData.totalInterestAmount} onChange={handleChange} readOnly={isViewOnly} className="bg-transparent border-b border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:border-primary text-right w-32" placeholder="0" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Vehicle Info */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">Vehicle Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vehicle Number</label>
                          <input type="text" name="vehicleNumber" value={formData.vehicleNumber} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chassis Number</label>
                          <input type="text" name="chassisNumber" value={formData.chassisNumber} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Model</label>
                          <input type="text" name="model" value={formData.model} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type of Vehicle</label>
                          <input type="text" name="typeOfVehicle" value={formData.typeOfVehicle} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Board (Yellow/White)</label>
                          <select name="ywBoard" value={formData.ywBoard} onChange={handleChange} disabled={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20">
                            <option value="Yellow">Yellow</option>
                            <option value="White">White</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Doc Checklist</label>
                          <input type="text" name="docChecklist" value={formData.docChecklist} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-slate-900 text-white px-4 py-2 rounded-lg">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Doc Checklist & RTO Details</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dealer Name</label>
                          <input type="text" name="dealerName" value={formData.dealerName} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dealer Number</label>
                          <input type="text" name="dealerNumber" value={formData.dealerNumber} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">HP Entry</label>
                          <select name="hpEntry" value={formData.hpEntry} onChange={handleChange} disabled={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20">
                            <option value="Not done">Not done</option>
                            <option value="Done">Done</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">FC Date</label>
                          <input type="date" name="fcDate" value={formData.fcDate} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Insurance Date</label>
                          <input type="date" name="insuranceDate" value={formData.insuranceDate} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RTO Work Pending</label>
                          <input type="text" name="rtoWorkPending" value={formData.rtoWorkPending} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        </div>
                      </div>
                    </div>
                  </form>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-4 sticky bottom-0 z-10">
                  {isViewOnly ? (
                    <button type="button" onClick={handleCloseModal} className="flex-1 bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all">Close Profile View</button>
                  ) : (
                    <>
                      <button type="button" onClick={handleCloseModal} className="flex-1 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-200 transition-colors">Cancel</button>
                      <button onClick={handleSubmit} disabled={submitting} className="flex-[2] bg-primary text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 transition-all uppercase">
                        {submitting ? "Processing..." : currentLoan ? "Commit Changes" : "Create Profile"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
};

export default LoansPage;
