"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AuthGuard from "../../../../../components/AuthGuard";
import Navbar from "../../../../../components/Navbar";
import Sidebar from "../../../../../components/Sidebar";
import LoanForm from "../../../../../components/LoanForm";
import EMITable from "../../../../../components/EMITable";
import { useToast } from "../../../../../context/ToastContext";
import {
  getLoanById,
  updateLoan,
  toggleSeized,
} from "../../../../../services/loan.service";
import { getEMIsByLoanId } from "../../../../../services/customer";
import { flattenLoan } from "../../../../../utils/loanUtils";

const EditLoanPage = () => {
  const router = useRouter();
  const { id } = useParams();
  const [loan, setLoan] = useState(null);
  const [emis, setEmis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const fetchLoanData = async () => {
    try {
      const [loanRes, emiRes] = await Promise.all([
        getLoanById(id),
        getEMIsByLoanId(id),
      ]);

      const data = loanRes.data; // Already structured from backend
      const emiData = emiRes.data || [];

      // Format dates for input[type="date"]
      const formattedData = {
        ...data,
        loanTerms: {
          ...data.loanTerms,
          dateLoanDisbursed: data.loanTerms?.dateLoanDisbursed
            ? new Date(data.loanTerms.dateLoanDisbursed)
                .toISOString()
                .split("T")[0]
            : "",
          emiStartDate: data.loanTerms?.emiStartDate
            ? new Date(data.loanTerms.emiStartDate).toISOString().split("T")[0]
            : "",
          emiEndDate: data.loanTerms?.emiEndDate
            ? new Date(data.loanTerms.emiEndDate).toISOString().split("T")[0]
            : "",
        },
        vehicleInformation: {
          ...data.vehicleInformation,
          fcDate: data.vehicleInformation?.fcDate
            ? new Date(data.vehicleInformation.fcDate)
                .toISOString()
                .split("T")[0]
            : "",
          insuranceDate: data.vehicleInformation?.insuranceDate
            ? new Date(data.vehicleInformation.insuranceDate)
                .toISOString()
                .split("T")[0]
            : "",
        },
      };

      setLoan(formattedData);
      setEmis(emiData);
    } catch (err) {
      showToast(err.message || "Failed to fetch loan data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchLoanData();
    }
  }, [id]);

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    try {
      await updateLoan(id, formData);
      showToast("Loan profile updated and EMIs synchronized", "success");
      await fetchLoanData();
    } catch (err) {
      showToast(err.message || "Failed to update loan", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSeized = async () => {
    try {
      setSubmitting(true);
      await toggleSeized(id);
      showToast(
        loan.isSeized
          ? "Loan unseized successfully"
          : "Loan seized successfully",
        "success",
      );
      await fetchLoanData();
    } catch (err) {
      showToast(err.message || "Failed to toggle seized status", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEMIUpdate = async () => {
    // Refresh EMI data after update
    try {
      const emiRes = await getEMIsByLoanId(id);
      setEmis(emiRes.data || []);
    } catch (err) {
      console.error("Error refreshing EMI data:", err);
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
              <p className="text-slate-400 font-bold">
                Loading loan profile...
              </p>
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

              {loan && (
                <>
                  <LoanForm
                    initialData={loan}
                    onSubmit={handleSubmit}
                    onCancel={() => router.push("/admin/loans")}
                    submitting={submitting}
                    renderExtraActions={() =>
                      // <button
                      //   type="button"
                      //   onClick={handleToggleSeized}
                      //   disabled={submitting}
                      //   className={`${
                      //     loan.isSeized
                      //       ? "bg-green-600 hover:bg-green-700"
                      //       : "bg-red-600 hover:bg-red-700"
                      //   } text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all flex items-center gap-2`}
                      // >
                      //   <svg
                      //     className="w-4 h-4"
                      //     fill="none"
                      //     stroke="currentColor"
                      //     viewBox="0 0 24 24"
                      //   >
                      //     <path
                      //       strokeLinecap="round"
                      //       strokeLinejoin="round"
                      //       strokeWidth="2"
                      //       d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      //     />
                      //   </svg>
                      //   {loan.isSeized ? "Unseize Loan" : "Seize Loan"}
                      // </button>
                      null
                    }
                  />

                  <div className="mt-12">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase mb-6">
                      EMI Payment Schedule
                    </h2>
                    <EMITable
                      emis={emis}
                      isEditMode={true}
                      onUpdateSuccess={handleEMIUpdate}
                    />
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default EditLoanPage;
