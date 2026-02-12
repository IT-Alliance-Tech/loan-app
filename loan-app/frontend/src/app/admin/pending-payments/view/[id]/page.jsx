"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AuthGuard from "../../../../../components/AuthGuard";
import Navbar from "../../../../../components/Navbar";
import Sidebar from "../../../../../components/Sidebar";
import {
  getLoanById,
  getPendingEmiDetails,
  updateLoan,
  updatePaymentStatus,
} from "../../../../../services/loan.service";
import { updateEMI } from "../../../../../services/customer";
import { format } from "date-fns";
import { useToast } from "../../../../../context/ToastContext";

const LoanPendingViewPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPage = searchParams.get("from");
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [updating, setUpdating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState({
    amountPaid: "",
    paymentMode: "",
    paymentDate: new Date().toISOString().split("T")[0],
    overdue: 0,
    status: "Pending",
    remarks: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [activeContactMenu, setActiveContactMenu] = useState(null); // { number, name, type, x, y }
  const [pendingEmis, setPendingEmis] = useState([]);
  const [selectedEmi, setSelectedEmi] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (id) fetchLoanDetails();
  }, [id]);

  const fetchLoanDetails = async () => {
    try {
      setLoading(true);
      const res = await getPendingEmiDetails(id);
      if (res.data && Array.isArray(res.data)) {
        setPendingEmis(res.data);
        const current = res.data.find((e) => e._id === id) || res.data[0];
        setLoan(current);
        setNewStatus(current.clientResponse || "");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    try {
      setUpdating(true);
      // Update the Loan's clientResponse globally
      await updateLoan(loan.loanId, { clientResponse: newStatus });
      showToast("Client response updated globally", "success");
      const redirectPath =
        fromPage === "partial"
          ? "/admin/partial-payments"
          : "/admin/pending-payments";
      router.push(redirectPath);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveEMI = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      // Send addedAmount for incremental update
      const payload = {
        ...editData,
        addedAmount: parseFloat(editData.amountPaid) || 0,
      };
      // Remove amountPaid from payload to avoid confusion/overwriting with the small incremental value as absolute
      delete payload.amountPaid;

      await updateEMI(selectedEmi._id, payload);
      showToast("EMI updated successfully", "success");
      setShowModal(false);
      const redirectPath =
        fromPage === "partial"
          ? "/admin/partial-payments"
          : "/admin/pending-payments";
      router.push(redirectPath);
    } catch (error) {
      showToast(error.message || "Failed to update EMI", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleModalChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => {
      let newData = { ...prev };

      if (name === "paymentMode") {
        // Multi-select logic: value is the chip clicked
        const currentModes = prev.paymentMode
          ? prev.paymentMode.split(", ")
          : [];
        const updatedModes = currentModes.includes(value)
          ? currentModes.filter((m) => m !== value)
          : [...currentModes, value];
        newData.paymentMode = updatedModes.join(", ");
      } else {
        newData[name] = value;
      }

      // UI Preview only: Auto-calculate status if amountPaid changes
      if (name === "amountPaid") {
        const currentPaid = parseFloat(selectedEmi?.amountPaid) || 0;
        const newPayment = parseFloat(value) || 0;
        const totalPaid = currentPaid + newPayment;
        const total = parseFloat(selectedEmi?.emiAmount) || 0;

        if (totalPaid >= total) {
          newData.status = "Paid";
        } else if (totalPaid > 0) {
          newData.status = "Partially Paid";
        } else {
          newData.status = "Pending";
        }
      }

      return newData;
    });
  };

  if (loading)
    return (
      <div className="p-20 text-center font-black uppercase text-slate-300">
        Loading details...
      </div>
    );
  if (!loan)
    return (
      <div className="p-20 text-center font-black uppercase text-red-400">
        Loan record not found
      </div>
    );

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 pb-20 sm:pb-0">
          <div className="hidden lg:block">
            <Navbar />
          </div>
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-5xl mx-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => router.back()}
                    className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 transition-all shadow-sm"
                  >
                    ←
                  </button>
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                      Pending EMI Details
                    </h1>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">
                      Manage collection response for {loan.loanNumber}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedEmi(pendingEmis[0]);
                    setEditData({
                      amountPaid: "",
                      paymentMode: pendingEmis[0].paymentMode || "",
                      paymentDate: new Date().toISOString().split("T")[0],
                      overdue: pendingEmis[0].overdue || 0,
                      status: pendingEmis[0].status || "Pending",
                      remarks: pendingEmis[0].remarks || "",
                    });
                    setShowModal(true);
                    setIsDropdownOpen(false);
                  }}
                  className="px-6 py-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-100 flex items-center gap-2"
                >
                  <span className="text-sm">₹</span> Pay EMI
                </button>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold uppercase tracking-tight">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Applicant & Guarantor */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 border-b border-slate-50 pb-4">
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest block mb-2">
                          Applicant
                        </span>
                        <p className="text-sm font-black text-slate-900 uppercase">
                          {loan.customerName}
                        </p>
                        <div className="text-xs font-bold text-slate-500 mt-1 flex flex-col items-start gap-1">
                          {(loan.mobileNumbers || []).map((num, idx) => (
                            <button
                              key={idx}
                              onClick={(e) => {
                                const rect =
                                  e.currentTarget.getBoundingClientRect();
                                setActiveContactMenu({
                                  number: num,
                                  name: loan.customerName,
                                  type: "Applicant",
                                  x: rect.left,
                                  y: rect.bottom,
                                });
                              }}
                              className="hover:text-primary transition-colors"
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest block mb-2">
                          Guarantor
                        </span>
                        <p className="text-sm font-black text-slate-900 uppercase">
                          {loan.guarantorName || "N/A"}
                        </p>
                        <div className="text-xs font-bold text-slate-500 mt-1 flex flex-col items-start gap-1">
                          {(loan.guarantorMobileNumbers || []).length > 0 ? (
                            loan.guarantorMobileNumbers.map((num, idx) => (
                              <button
                                key={idx}
                                onClick={(e) => {
                                  const rect =
                                    e.currentTarget.getBoundingClientRect();
                                  setActiveContactMenu({
                                    number: num,
                                    name: loan.guarantorName || "Guarantor",
                                    type: "Guarantor",
                                    x: rect.left,
                                    y: rect.bottom,
                                  });
                                }}
                                className="hover:text-primary transition-colors"
                              >
                                {num}
                              </button>
                            ))
                          ) : (
                            <p className="text-slate-300">N/A</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Details */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 border-b border-slate-50 pb-4">
                      Asset Details
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div>
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">
                          Vehicle No
                        </span>
                        <p className="text-xs font-black text-slate-800 uppercase">
                          {loan.vehicleNumber}
                        </p>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">
                          Model
                        </span>
                        <p className="text-xs font-black text-slate-800 uppercase">
                          {loan.model}
                        </p>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">
                          Engine No
                        </span>
                        <p className="text-xs font-black text-slate-800 uppercase">
                          {loan.engineNumber || "N/A"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">
                          Chassis No
                        </span>
                        <p className="text-xs font-black text-slate-800 uppercase">
                          {loan.chassisNumber || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Update Section */}
                  <div className="bg-slate-900 rounded-3xl p-8 shadow-2xl shadow-slate-200">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">
                      Client Response
                    </h3>
                    <div className="space-y-4">
                      <textarea
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        placeholder="Enter the response or current status of the collection..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-5 text-white text-sm font-medium focus:outline-none focus:border-primary transition-all min-h-[120px] placeholder:text-slate-600"
                      />
                      <button
                        onClick={handleUpdateStatus}
                        disabled={updating}
                        className="w-full bg-primary text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-700 transition-all disabled:opacity-50 shadow-xl shadow-blue-500/20"
                      >
                        {updating ? "Updating..." : "Update Client Response"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-4">
                      Financial Summary
                    </span>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          Principal
                        </span>
                        <span className="text-xs font-black text-slate-900 font-mono">
                          ₹{loan.principalAmount?.toLocaleString()}
                        </span>
                      </div>
                      <div className="space-y-4 max-h-[520px] overflow-y-auto pr-2 custom-scrollbar">
                        {pendingEmis.map((emi, idx) => (
                          <div
                            key={emi._id}
                            className={`${idx === 0 ? "bg-red-50" : "bg-slate-50"} border ${idx === 0 ? "border-red-100" : "border-slate-100"} rounded-2xl p-4 mb-4 last:mb-0`}
                          >
                            <div className="flex justify-between items-center mb-3">
                              <span
                                className={`text-[10px] font-black ${idx === 0 ? "text-red-500" : "text-slate-400"} uppercase tracking-wider`}
                              >
                                EMI {emi.emiNumber || idx + 1} ACTION
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              {/* Box 1: EMI Amount */}
                              <div className="bg-white border border-red-50/50 rounded-xl py-1 px-2.5 text-center shadow-sm">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                                  Amount
                                </span>
                                <span className="text-[10px] font-black text-red-600 font-mono">
                                  ₹{emi.emiAmount?.toLocaleString()}
                                </span>
                              </div>

                              {/* Box 2: EMI Month */}
                              <div className="bg-white border border-red-50/50 rounded-xl py-1 px-2.5 text-center shadow-sm">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                                  Month
                                </span>
                                <span className="text-[10px] font-black text-slate-700 uppercase">
                                  {emi.dueDate &&
                                    format(new Date(emi.dueDate), "MMM yy")}
                                </span>
                              </div>

                              {/* Box 3: Pay Button */}
                              <button
                                onClick={() => {
                                  setSelectedEmi(emi);
                                  setEditData({
                                    amountPaid: "",
                                    paymentMode: emi.paymentMode || "",
                                    paymentDate: new Date()
                                      .toISOString()
                                      .split("T")[0],
                                    overdue: emi.overdue || 0,
                                    status: emi.status || "Pending",
                                    remarks: emi.remarks || "",
                                  });
                                  setShowModal(true);
                                  setIsDropdownOpen(false);
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white rounded-xl py-1 px-2.5 flex flex-col items-center justify-center transition-all shadow-md active:scale-95 group"
                              >
                                <span className="text-[8px] font-black text-white/70 uppercase tracking-widest block mb-0.5">
                                  Action
                                </span>
                                <span className="text-[10px] font-black uppercase flex items-center gap-1">
                                  <span className="text-xs">₹</span> PAY
                                </span>
                              </button>
                            </div>

                            {emi.amountPaid > 0 && (
                              <div className="mt-4 pt-3 border-t border-red-50 space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                                    Paid: ₹{emi.amountPaid?.toLocaleString()}
                                  </span>
                                  <span className="text-[9px] font-black text-red-600 uppercase">
                                    Bal: ₹
                                    {Math.max(
                                      0,
                                      (emi.emiAmount || 0) -
                                        (emi.amountPaid || 0),
                                    ).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Modal */}
            {showModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                        UPDATE EMI #{selectedEmi?.emiNumber}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        DUE DATE:{" "}
                        {selectedEmi?.dueDate &&
                          format(
                            new Date(selectedEmi.dueDate),
                            "dd-MM-yyyy",
                          )}{" "}
                        | AMOUNT: ₹{selectedEmi?.emiAmount}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowModal(false)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all"
                    >
                      ✕
                    </button>
                  </div>

                  {isDropdownOpen && (
                    <div
                      className="fixed inset-0 z-[110]"
                      onClick={() => setIsDropdownOpen(false)}
                    />
                  )}

                  <form onSubmit={handleSaveEMI} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                          Amount to Pay
                        </label>
                        <input
                          type="number"
                          name="amountPaid"
                          value={editData.amountPaid}
                          onChange={handleModalChange}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                          placeholder="Enter Amount"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                          Remaining Amount
                        </label>
                        <input
                          type="text"
                          value={`₹${Math.max(
                            0,
                            (selectedEmi?.emiAmount || 0) -
                              (selectedEmi?.amountPaid || 0) -
                              (parseFloat(editData.amountPaid) || 0),
                          ).toFixed(2)}`}
                          disabled
                          className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                          Payment Date
                        </label>
                        <input
                          type="date"
                          name="paymentDate"
                          value={editData.paymentDate}
                          onChange={handleModalChange}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                          required
                        />
                      </div>

                      <div className="relative">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                          Payment Mode
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex items-center justify-between hover:border-slate-300 transition-all"
                        >
                          <span className="truncate">
                            {editData.paymentMode || "Select Mode"}
                          </span>
                          <span
                            className={`transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
                          >
                            ▼
                          </span>
                        </button>

                        {isDropdownOpen && (
                          <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[120] p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                            {[
                              "Cash",
                              "Online",
                              "GPay",
                              "PhonePe",
                              "Cheque",
                            ].map((mode) => {
                              const isSelected = editData.paymentMode
                                .split(", ")
                                .includes(mode);
                              return (
                                <button
                                  key={mode}
                                  type="button"
                                  onClick={() =>
                                    handleModalChange({
                                      target: {
                                        name: "paymentMode",
                                        value: mode,
                                      },
                                    })
                                  }
                                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all mb-1 last:mb-0 ${
                                    isSelected
                                      ? "bg-primary/5 text-primary"
                                      : "text-slate-500 hover:bg-slate-50"
                                  }`}
                                >
                                  {mode}
                                  {isSelected && (
                                    <span className="text-primary">✓</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                          Payment Status
                        </label>
                        <div
                          className={`w-full px-4 py-3 border rounded-xl text-sm font-black uppercase tracking-wider ${
                            editData.status === "Paid"
                              ? "bg-green-50 border-green-200 text-green-600"
                              : editData.status === "Partially Paid"
                                ? "bg-orange-50 border-orange-200 text-orange-600"
                                : "bg-red-50 border-red-200 text-red-600"
                          }`}
                        >
                          {editData.status}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                          Overdue Amount
                        </label>
                        <input
                          type="number"
                          name="overdue"
                          value={editData.overdue}
                          onChange={handleModalChange}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-red-600 focus:outline-none focus:ring-4 focus:ring-red-100 focus:border-red-400 transition-all"
                          placeholder="0"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                          Remarks
                        </label>
                        <textarea
                          name="remarks"
                          value={editData.remarks}
                          onChange={handleModalChange}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all resize-none"
                          rows="3"
                          placeholder="Add any payment notes..."
                        ></textarea>
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="flex-1 px-6 py-4 border border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                      >
                        CANCEL
                      </button>
                      <button
                        type="submit"
                        disabled={updating}
                        className="flex-[2] px-6 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {updating ? "PROCESSING..." : "UPDATE PAYMENT RECORD"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </main>
        </div>
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
    </AuthGuard>
  );
};

export default LoanPendingViewPage;
