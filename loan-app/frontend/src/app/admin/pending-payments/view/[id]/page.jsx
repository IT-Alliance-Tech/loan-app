"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthGuard from "../../../../../components/AuthGuard";
import Navbar from "../../../../../components/Navbar";
import Sidebar from "../../../../../components/Sidebar";
import {
  getLoanById,
  updatePaymentStatus,
} from "../../../../../services/loan.service";
import { format } from "date-fns";

const LoanPendingViewPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id) fetchLoanDetails();
  }, [id]);

  const fetchLoanDetails = async () => {
    try {
      setLoading(true);
      const res = await getLoanById(id);
      if (res.data) {
        setLoan(res.data);
        setNewStatus(res.data.paymentStatus || "Pending");
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
      await updatePaymentStatus(id, newStatus);
      // Optional: Show success message or redirect
      router.push("/admin/pending-payments");
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
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
              <div className="flex items-center gap-4 mb-8">
                <button
                  onClick={() => router.back()}
                  className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 transition-all shadow-sm"
                >
                  ←
                </button>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                    Pending Case Details
                  </h1>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">
                    Manage collection response for {loan.loanNumber}
                  </p>
                </div>
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
                        <p className="text-xs font-bold text-slate-500 mt-1">
                          {loan.mobileNumber}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
                          {loan.address}
                        </p>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest block mb-2">
                          Guarantor
                        </span>
                        <p className="text-sm font-black text-slate-900 uppercase">
                          {loan.guarantorName || "N/A"}
                        </p>
                        <p className="text-xs font-bold text-slate-500 mt-1">
                          {loan.guarantorMobileNumber || "N/A"}
                        </p>
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
                      Status Update (Client Response)
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
                        {updating ? "Updating..." : "Update Status Response"}
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
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          Monthly EMI
                        </span>
                        <span className="text-xs font-black text-primary font-mono">
                          ₹{loan.monthlyEMI?.toLocaleString()}
                        </span>
                      </div>
                      <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                        <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter">
                          O/S Balance
                        </span>
                        <span className="text-lg font-black text-slate-900 tracking-tighter">
                          ₹
                          {(
                            loan.principalAmount +
                            (loan.totalInterestAmount || 0)
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 rounded-3xl border border-red-100 p-6 text-center">
                    <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-1">
                      Missed Payments
                    </p>
                    <p className="text-3xl font-black text-red-600 tracking-tighter">
                      {loan.tenureMonths || "0"}{" "}
                      <span className="text-[10px] uppercase font-bold text-red-400">
                        Total Months
                      </span>
                    </p>
                    <p className="text-[10px] font-bold text-red-400 uppercase mt-2 italic">
                      Check EMI Section for breakdown
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default LoanPendingViewPage;
