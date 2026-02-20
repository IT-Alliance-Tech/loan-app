"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import {
  getLoans,
  getLoanById,
  forecloseLoan,
} from "../../../services/loan.service";
import { useToast } from "../../../context/ToastContext";

const ForeclosurePage = () => {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [loans, setLoans] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const [formData, setFormData] = useState({
    foreclosureChargePercent: 0,
    foreclosureChargeAmount: 0,
    od: 0,
    miscellaneousFee: 0,
    remarks: "",
  });

  useEffect(() => {
    const fetchLoansList = async () => {
      try {
        const res = await getLoans({ limit: 1000 });
        if (res.data && res.data.loans) {
          setLoans(res.data.loans);
        }
      } catch (err) {
        console.error("Failed to fetch loans", err);
      }
    };
    fetchLoansList();
  }, []);

  const handleLoanSelect = async (loan) => {
    setLoading(true);
    try {
      const res = await getLoanById(loan._id);
      if (res.data) {
        setSelectedLoan(res.data);
        setSearchTerm(res.data.loanTerms?.loanNumber || "");
      }
    } catch (err) {
      showToast("Failed to fetch loan details", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let numValue = parseFloat(value) || 0;

    setFormData((prev) => {
      const updated = { ...prev, [name]: numValue };

      // Auto-calculate charge amount if percentage changes
      if (name === "foreclosureChargePercent" && selectedLoan) {
        const principal = selectedLoan.loanTerms?.remainingPrincipalAmount || 0;
        updated.foreclosureChargeAmount = (principal * numValue) / 100;
      }

      // Update remarks if text
      if (e.target.type === "textarea") {
        updated[name] = value;
      }

      return updated;
    });
  };

  const remainingPrincipal =
    selectedLoan?.loanTerms?.remainingPrincipalAmount || 0;
  const totalAmount =
    remainingPrincipal +
    formData.foreclosureChargeAmount +
    formData.od +
    formData.miscellaneousFee;

  const handleProceed = async () => {
    setLoading(true);
    try {
      await forecloseLoan(selectedLoan._id, {
        ...formData,
        totalAmount,
        remainingPrincipal,
      });
      showToast("Loan foreclosed successfully", "success");
      setShowPreview(false);
      setSelectedLoan(null);
      setSearchTerm("");
      setFormData({
        foreclosureChargePercent: 0,
        foreclosureChargeAmount: 0,
        od: 0,
        miscellaneousFee: 0,
        remarks: "",
      });
    } catch (err) {
      showToast(err.message || "Failed to foreclose loan", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="hidden lg:block border-b border-slate-100 bg-white">
            <Navbar />
          </div>

          <main className="p-4 sm:p-10 max-w-5xl mx-auto w-full">
            <div className="mb-12">
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight uppercase mb-2">
                Foreclosure Loan
              </h1>
              <div className="h-1.5 w-20 bg-primary rounded-full"></div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* Search Section */}
              <div className="p-6 sm:p-8 bg-slate-50/50 border-b border-slate-100">
                <div className="max-w-md space-y-3 relative">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                    Enter Loan Number
                  </label>
                  <div className="group relative">
                    <input
                      type="text"
                      placeholder="e.g. LN-001"
                      className="w-full pl-6 pr-12 py-5 bg-white border-2 border-slate-100 rounded-2xl text-base font-bold text-slate-700 focus:outline-none focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all placeholder:text-slate-200 uppercase"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && !selectedLoan && (
                      <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar overflow-hidden">
                        {loans
                          .filter(
                            (l) =>
                              l.loanTerms?.loanNumber &&
                              l.loanTerms.loanNumber
                                .toLowerCase()
                                .includes(searchTerm.toLowerCase()),
                          )
                          .map((loan) => (
                            <button
                              key={loan._id}
                              onClick={() => handleLoanSelect(loan)}
                              className="w-full px-6 py-4 text-left hover:bg-slate-50 flex justify-between items-center transition-colors border-b border-slate-50 last:border-0"
                            >
                              <span className="font-black text-slate-700 uppercase">
                                {loan.loanTerms?.loanNumber}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                {loan.customerDetails?.customerName}
                              </span>
                            </button>
                          ))}
                      </div>
                    )}
                    {selectedLoan && (
                      <button
                        onClick={() => {
                          setSelectedLoan(null);
                          setSearchTerm("");
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Simple Table UI Section */}
              <div className="p-0 border-b border-slate-100">
                <table className="w-full border-collapse">
                  <tbody>
                    {/* Row 1: Profile */}
                    <tr className="border-b border-slate-100">
                      <td className="p-5 w-1/3">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                          Customer Name
                        </label>
                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight">
                          {selectedLoan?.customerDetails?.customerName || "—"}
                        </p>
                      </td>
                      <td className="p-5 w-1/3 border-l border-slate-100">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                          Mobile Number
                        </label>
                        <p className="text-sm font-bold text-slate-700 tracking-tight">
                          {(
                            selectedLoan?.customerDetails?.mobileNumbers || []
                          ).join(", ") || "—"}
                        </p>
                      </td>
                      <td className="p-5 w-1/3 border-l border-slate-100">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                          Address
                        </label>
                        <p className="text-[10px] font-bold text-slate-500 line-clamp-1 leading-relaxed">
                          {selectedLoan?.customerDetails?.address || "—"}
                        </p>
                      </td>
                    </tr>

                    {/* Row 2: Vehicle & Finance */}
                    <tr className="border-b border-slate-100">
                      <td className="p-5">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                          Vehicle Number
                        </label>
                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight">
                          {selectedLoan?.vehicleInformation?.vehicleNumber ||
                            "—"}
                        </p>
                      </td>
                      <td className="p-5 border-l border-slate-100">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                          Model
                        </label>
                        <p className="text-sm font-bold text-slate-600 uppercase tracking-tight">
                          {selectedLoan?.vehicleInformation?.model || "—"}
                        </p>
                      </td>
                      <td className="p-5 border-l border-slate-100">
                        <label className="block text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-2">
                          Remaining Principal
                        </label>
                        <p className="text-base font-black text-primary tracking-tight">
                          ₹
                          {remainingPrincipal.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </td>
                    </tr>

                    {/* Row 3: Charges */}
                    <tr className="border-b border-slate-100">
                      <td className="p-5">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                          Foreclosure Charge (%)
                        </label>
                        <input
                          type="number"
                          name="foreclosureChargePercent"
                          value={formData.foreclosureChargePercent}
                          onChange={handleInputChange}
                          className="w-full bg-transparent text-base font-black text-slate-800 focus:outline-none placeholder:text-slate-200"
                          placeholder="00"
                        />
                      </td>
                      <td className="p-5 border-l border-slate-100">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                          Charge Amount
                        </label>
                        <p className="text-base font-black text-slate-800 tracking-tight">
                          ₹
                          {formData.foreclosureChargeAmount.toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}
                        </p>
                      </td>
                      <td className="p-5 border-l border-slate-100">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                          OD Amount
                        </label>
                        <input
                          type="number"
                          name="od"
                          value={formData.od}
                          onChange={handleInputChange}
                          className="w-full bg-transparent text-base font-black text-red-500 focus:outline-none placeholder:text-slate-200"
                          placeholder="0000"
                        />
                      </td>
                    </tr>

                    {/* Row 4: Final Calculation */}
                    <tr>
                      <td className="p-5 border-b border-slate-100">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                          Misalliances Fee
                        </label>
                        <input
                          type="number"
                          name="miscellaneousFee"
                          value={formData.miscellaneousFee}
                          onChange={handleInputChange}
                          className="w-full bg-transparent text-base font-black text-slate-800 focus:outline-none placeholder:text-slate-200"
                          placeholder="0000"
                        />
                      </td>
                      <td className="p-5 border-l border-slate-100 border-b border-slate-100"></td>
                      <td className="p-5 border-l border-slate-100 border-b border-slate-100"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Separated Total Pay Card */}
              <div className="px-6 py-6 flex justify-end bg-slate-50/10">
                <div className="bg-slate-900 rounded-[1.8rem] overflow-hidden flex items-center shadow-2xl shadow-slate-900/40 w-full max-w-sm h-24">
                  <div className="flex-1 px-8 py-4">
                    <label className="block text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mb-0.5">
                      Total Pay Amount
                    </label>
                    <p className="text-2xl font-black text-white tracking-tighter">
                      ₹
                      {totalAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div className="px-6 h-full flex items-center bg-white/5 border-l border-white/5">
                    <button
                      onClick={() => setShowPreview(true)}
                      disabled={!selectedLoan || loading}
                      className="px-8 py-3.5 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 hover:bg-blue-600 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-30 disabled:grayscale disabled:pointer-events-none"
                    >
                      Pay Now
                    </button>
                  </div>
                </div>
              </div>

              {/* Remarks Section */}
              <div className="p-6 bg-white">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-4">
                  Remarks
                </label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  className="w-full p-6 bg-slate-50/50 border border-slate-100 rounded-3xl text-sm font-bold text-slate-600 focus:outline-none focus:border-primary/20 transition-all resize-none h-24 placeholder:text-slate-300"
                  placeholder="Add a remark for this foreclosure..."
                ></textarea>
              </div>
            </div>
          </main>

          {/* Preview Modal */}
          {showPreview && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                    Foreclosure Preview
                  </h3>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-red-500 transition-all"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Customer
                      </label>
                      <p className="text-xs font-black text-slate-900 uppercase">
                        {selectedLoan?.customerDetails?.customerName}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Loan Number
                      </label>
                      <p className="text-xs font-black text-primary uppercase">
                        {selectedLoan?.loanTerms?.loanNumber}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Vehicle
                      </label>
                      <p className="text-xs font-black text-slate-900 uppercase">
                        {selectedLoan?.vehicleInformation?.vehicleNumber} (
                        {selectedLoan?.vehicleInformation?.model || "—"})
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Remaining Principal
                      </label>
                      <p className="text-xs font-black text-slate-900">
                        ₹
                        {remainingPrincipal.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-[1.2rem] p-4 text-center space-y-0.5 max-w-[220px] mx-auto">
                    <label className="text-[7px] font-black text-slate-500 uppercase tracking-[0.3em]">
                      Total Foreclosure Amount
                    </label>
                    <p className="text-lg font-black text-white tracking-tighter">
                      ₹
                      {totalAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                      <span className="text-lg">⚠️</span>
                      <p className="text-[9px] font-bold text-amber-800 leading-relaxed uppercase tracking-tight">
                        Warning: This action will close the loan permanently.
                        All pending EMIs will be marked as paid. This process
                        cannot be undone.
                      </p>
                    </div>

                    <div className="flex gap-4 pt-2">
                      <button
                        onClick={() => setShowPreview(false)}
                        className="flex-1 py-4 border-2 border-slate-100 rounded-2xl font-black text-[9px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                      >
                        BACK TO EDIT
                      </button>
                      <button
                        onClick={handleProceed}
                        disabled={loading}
                        className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
                      >
                        {loading ? "PROCESSING..." : "PROCEED & CLOSE LOAN"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
};

export default ForeclosurePage;
