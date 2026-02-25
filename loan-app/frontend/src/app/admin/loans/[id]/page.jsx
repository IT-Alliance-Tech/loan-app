"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AuthGuard from "../../../../components/AuthGuard";
import Navbar from "../../../../components/Navbar";
import Sidebar from "../../../../components/Sidebar";
import LoanForm from "../../../../components/LoanForm";
import EMITable from "../../../../components/EMITable";
import { useToast } from "../../../../context/ToastContext";
import { getLoanById } from "../../../../services/loan.service";
import { getEMIsByLoanId } from "../../../../services/customer";
import { flattenLoan } from "../../../../utils/loanUtils";

const ViewLoanPage = () => {
  const router = useRouter();
  const { id } = useParams();
  const [loan, setLoan] = useState(null);
  const [emis, setEmis] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
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
              ? new Date(data.loanTerms.emiStartDate)
                  .toISOString()
                  .split("T")[0]
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
          status: {
            ...data.status,
            nextFollowUpDate: data.status?.nextFollowUpDate
              ? new Date(data.status.nextFollowUpDate)
                  .toISOString()
                  .split("T")[0]
              : "",
            foreclosureDetails: data.status?.foreclosureDetails
              ? {
                  ...data.status.foreclosureDetails,
                  foreclosureDate: data.status.foreclosureDetails
                    .foreclosureDate
                    ? new Date(data.status.foreclosureDetails.foreclosureDate)
                        .toISOString()
                        .split("T")[0]
                    : "",
                }
              : undefined,
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

    if (id && id !== "undefined") {
      fetchLoanData();
    } else if (id === "undefined") {
      setLoading(false);
      showToast("Invalid Loan ID provided", "error");
      router.push("/admin/loans");
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
                  Loan Profile View
                </h1>
                <p className="text-slate-500 font-medium text-sm">
                  Detailed view of loan record: {loan?.loanNumber}
                </p>
              </div>

              {loan && (
                <>
                  <LoanForm
                    initialData={loan}
                    isViewOnly={true}
                    onCancel={() => router.push("/admin/loans")}
                    emis={emis}
                  />

                  <div className="mt-12">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase mb-6">
                      EMI Payment Schedule
                    </h2>
                    <EMITable
                      emis={
                        loan?.status?.status?.toLowerCase() === "closed"
                          ? emis.filter((emi) => (emi.amountPaid || 0) > 0)
                          : emis
                      }
                      isEditMode={false}
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

export default ViewLoanPage;
