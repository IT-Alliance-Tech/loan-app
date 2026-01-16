"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AuthGuard from "../../../../../components/AuthGuard";
import Navbar from "../../../../../components/Navbar";
import Sidebar from "../../../../../components/Sidebar";
import LoanForm from "../../../../../components/LoanForm";
import { getLoanById, updateLoan, toggleSeized } from "../../../../../services/loan.service";

const EditLoanPage = () => {
  const router = useRouter();
  const { id } = useParams();
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLoan = async () => {
      try {
        const res = await getLoanById(id);
        const data = res.data;
        
        // Format dates for input[type="date"]
        const formattedData = {
          ...data,
          dateLoanDisbursed: data.dateLoanDisbursed ? new Date(data.dateLoanDisbursed).toISOString().split('T')[0] : "",
          emiStartDate: data.emiStartDate ? new Date(data.emiStartDate).toISOString().split('T')[0] : "",
          emiEndDate: data.emiEndDate ? new Date(data.emiEndDate).toISOString().split('T')[0] : "",
          fcDate: data.fcDate ? new Date(data.fcDate).toISOString().split('T')[0] : "",
          insuranceDate: data.insuranceDate ? new Date(data.insuranceDate).toISOString().split('T')[0] : "",
        };
        
        setLoan(formattedData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchLoan();
    }
  }, [id]);

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    setError("");
    try {
      await updateLoan(id, formData);
      router.push("/dashboard/loans");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSeized = async () => {
    try {
      setSubmitting(true);
      await toggleSeized(id);
      const res = await getLoanById(id);
      const data = res.data;
      const formattedData = {
        ...data,
        dateLoanDisbursed: data.dateLoanDisbursed ? new Date(data.dateLoanDisbursed).toISOString().split('T')[0] : "",
        emiStartDate: data.emiStartDate ? new Date(data.emiStartDate).toISOString().split('T')[0] : "",
        emiEndDate: data.emiEndDate ? new Date(data.emiEndDate).toISOString().split('T')[0] : "",
        fcDate: data.fcDate ? new Date(data.fcDate).toISOString().split('T')[0] : "",
        insuranceDate: data.insuranceDate ? new Date(data.insuranceDate).toISOString().split('T')[0] : "",
      };
      setLoan(formattedData);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-[#F8FAFC] flex">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Navbar />
            <main className="py-8 px-4 sm:px-8 flex items-center justify-center">
              <p className="text-slate-400 font-bold">Loading loan profile...</p>
            </main>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                  Modify Loan Parameters
                </h1>
                <p className="text-slate-500 font-medium text-sm">
                  Updating loan record: {loan?.loanNumber}
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold uppercase tracking-tight">
                  {error}
                </div>
              )}

              {loan && (
                <LoanForm
                  initialData={loan}
                  onSubmit={handleSubmit}
                  onCancel={() => router.push("/dashboard/loans")}
                  submitting={submitting}
                  renderExtraActions={() => (
                    <button
                      type="button"
                      onClick={handleToggleSeized}
                      disabled={submitting}
                      className={`${
                        loan.isSeized ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                      } text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all flex items-center gap-2`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      {loan.isSeized ? "Unseize Loan" : "Seize Loan"}
                    </button>
                  )}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default EditLoanPage;
