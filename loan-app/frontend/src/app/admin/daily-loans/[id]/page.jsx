"use client";
import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../../../components/Sidebar";
import Navbar from "../../../../components/Navbar";
import AuthGuard from "../../../../components/AuthGuard";
import DailyLoanForm from "../../../../components/DailyLoanForm";
import EMITable from "../../../../components/EMITable";
import {
  getDailyLoanById,
  getDailyLoanEMIs,
} from "../../../../services/dailyLoan.service";
import { useToast } from "../../../../context/ToastContext";
import { format } from "date-fns";

const ViewDailyLoanPage = ({ params: paramsPromise }) => {
  const params = use(paramsPromise);
  const router = useRouter();
  const { showToast } = useToast();
  const [loanData, setLoanData] = useState(null);
  const [emis, setEmis] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [loanRes, emiRes] = await Promise.all([
        getDailyLoanById(params.id),
        getDailyLoanEMIs(params.id),
      ]);
      const data = loanRes.data;
      const emiData = emiRes.data || [];

      // Format dates for the form
      if (data.startDate)
        data.startDate = format(new Date(data.startDate), "yyyy-MM-dd");
      if (data.emiStartDate)
        data.emiStartDate = format(new Date(data.emiStartDate), "yyyy-MM-dd");
      if (data.nextFollowUpDate)
        data.nextFollowUpDate = format(
          new Date(data.nextFollowUpDate),
          "yyyy-MM-dd",
        );

      setLoanData(data);
      setEmis(emiData);
    } catch (err) {
      showToast(err.message || "Failed to fetch details", "error");
      router.push("/admin/daily-loans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [params.id]);

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-[#F8FAFC]">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="flex-1 py-8 px-4 sm:px-8">
            <div className="max-w-5xl mx-auto">
              <div className="mb-8 text-center flex flex-col items-center">
                <span className="w-16 h-16 bg-blue-500/10 text-blue-600 rounded-3xl flex items-center justify-center text-3xl mb-4 group-hover:rotate-12 transition-transform duration-500">
                  📄
                </span>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                  View Daily Loan
                </h1>
                <p className="text-slate-500 font-medium text-sm">
                  Detailed view of daily loan record: {loanData?.loanNumber}
                </p>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                </div>
              ) : (
                <>
                  <DailyLoanForm
                    initialData={loanData}
                    isViewOnly={true}
                    onCancel={() => router.push("/admin/daily-loans")}
                  />

                  <div className="mt-12">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase mb-6 flex items-center gap-3">
                      <span className="w-10 h-10 bg-blue-500/10 text-blue-600 rounded-xl flex items-center justify-center text-lg">
                        📋
                      </span>
                      EMI Payment Schedule
                    </h2>
                    <EMITable
                      emis={emis}
                      isEditMode={false}
                      onUpdateSuccess={fetchData}
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

export default ViewDailyLoanPage;
