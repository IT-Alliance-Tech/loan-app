"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AuthGuard from "../../../../../components/AuthGuard";
import Navbar from "../../../../../components/Navbar";
import Sidebar from "../../../../../components/Sidebar";
import ContactActionMenu from "../../../../../components/ContactActionMenu";
import PaymentModeSelector from "../../../../../components/PaymentModeSelector";
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
                {/* <button
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
                </button> */}
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
                            className={`bg-white border rounded-[2rem] p-4 mb-2 last:mb-0 shadow-sm hover:shadow-md transition-shadow ${idx === 0 ? "border-red-100 ring-1 ring-red-50" : "border-slate-100"}`}
                          >
                            {/* Header: Date & Amount */}
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.15em] block mb-0.5">
                                  Due Date
                                </span>
                                <p className="text-[11px] font-black text-slate-900 uppercase">
                                  {emi.dueDate &&
                                    format(new Date(emi.dueDate), "dd MMM yy")}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.15em] block mb-0.5">
                                  Due Amount
                                </span>
                                <p className="text-[12px] font-black text-red-600 font-mono">
                                  ₹{emi.emiAmount?.toLocaleString()}
                                </p>
                              </div>
                            </div>

                            {/* Mid row: Paid & Balance (Conditional) */}
                            {emi.amountPaid > 0 && (
                              <div className="grid grid-cols-2 gap-2 py-2.5 border-y border-slate-50 mb-3">
                                <div>
                                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.15em] block mb-0.5">
                                    Paid
                                  </span>
                                  <p className="text-[10px] font-bold text-emerald-600">
                                    ₹{emi.amountPaid?.toLocaleString()}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.15em] block mb-0.5">
                                    Balance
                                  </span>
                                  <p className="text-[10px] font-bold text-red-600">
                                    ₹
                                    {Math.max(
                                      0,
                                      (emi.emiAmount || 0) -
                                        (emi.amountPaid || 0),
                                    ).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Action Row: Full Width Button */}
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
                              className="w-full bg-primary hover:bg-blue-700 text-white rounded-xl py-2.5 font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-blue-100 active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                              <span className="text-sm">₹</span> PAY EMI
                            </button>
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

                      <PaymentModeSelector
                        value={editData.paymentMode}
                        onChange={handleModalChange}
                      />

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
        <ContactActionMenu
          contact={activeContactMenu}
          onClose={() => setActiveContactMenu(null)}
        />
      </div>
    </AuthGuard>
  );
};

export default LoanPendingViewPage;
