"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Sidebar from "../../../../../components/Sidebar";
import Navbar from "../../../../../components/Navbar";
import AuthGuard from "../../../../../components/AuthGuard";
import DailyLoanForm from "../../../../../components/DailyLoanForm";
import EMITable from "../../../../../components/EMITable";
import {
  getDailyLoanById,
  updateDailyLoan,
  getDailyLoanEMIs,
} from "../../../../../services/dailyLoan.service";
import { useToast } from "../../../../../context/ToastContext";

const EditDailyLoanPage = () => {
  const router = useRouter();
  const { id } = useParams();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loanData, setLoanData] = useState(null);
  const [emis, setEmis] = useState([]);

  const fetchData = React.useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [loanRes, emiRes] = await Promise.all([
        getDailyLoanById(id),
        getDailyLoanEMIs(id),
      ]);

      if (loanRes.data) {
        const loan = loanRes.data;
        setLoanData({
          ...loan,
          startDate: loan.startDate ? loan.startDate.split("T")[0] : "",
          emiStartDate: loan.emiStartDate
            ? loan.emiStartDate.split("T")[0]
            : "",
          nextFollowUpDate: loan.nextFollowUpDate
            ? loan.nextFollowUpDate.split("T")[0]
            : "",
        });
      }
      if (emiRes.data) {
        setEmis(emiRes.data);
      }
    } catch (err) {
      showToast(err.message || "Failed to fetch loan details", "error");
      router.push("/admin/daily-loans");
    } finally {
      setLoading(false);
    }
  }, [id, router, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    try {
      await updateDailyLoan(id, formData);
      showToast("Daily loan updated successfully", "success");
      router.push("/admin/daily-loans");
    } catch (err) {
      showToast(err.message || "Failed to update daily loan", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-[#F8FAFC]">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="hidden lg:block">
            <Navbar />
          </div>
          <main className="flex-1 py-8 px-4 sm:px-8">
            <div className="max-w-5xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                  Edit Daily Loan
                </h1>
                <p className="text-slate-500 font-medium text-sm">
                  Update daily repayment loan record details
                </p>
              </div>

              {loading ? (
                <div className="flex justify-center py-20">
                  <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                </div>
              ) : (
                <>
                  <DailyLoanForm
                    initialData={loanData}
                    onSubmit={handleSubmit}
                    onCancel={() => router.push("/admin/daily-loans")}
                    submitting={submitting}
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
                      isEditMode={true}
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

export default EditDailyLoanPage;
