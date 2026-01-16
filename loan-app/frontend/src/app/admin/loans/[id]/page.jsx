"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AuthGuard from "../../../../components/AuthGuard";
import Navbar from "../../../../components/Navbar";
import Sidebar from "../../../../components/Sidebar";
import LoanForm from "../../../../components/LoanForm";
import { getLoanById } from "../../../../services/loan.service";

const ViewLoanPage = () => {
  const router = useRouter();
  const { id } = useParams();
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
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
                  Loan Profile View
                </h1>
                <p className="text-slate-500 font-medium text-sm">
                  Detailed view of loan record: {loan?.loanNumber}
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
                  isViewOnly={true}
                  onCancel={() => router.push("/admin/loans")}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default ViewLoanPage;
