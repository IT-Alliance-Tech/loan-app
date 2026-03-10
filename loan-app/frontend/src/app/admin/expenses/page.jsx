"use client";
import { useState, useEffect } from "react";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import AddExpenseModal from "../../../components/AddExpenseModal";
import { getAllExpenses } from "../../../services/expenseService";
import { useToast } from "../../../context/ToastContext";
import { format } from "date-fns";

const ExpensesPage = () => {
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterOfficeOnly, setFilterOfficeOnly] = useState(false);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await getAllExpenses();
      setExpenses(res.data || []);
    } catch (err) {
      showToast("Failed to fetch expenses", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-6xl mx-auto">
              {/* Responsive Header Section */}
              <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4 md:gap-0">
                <div className="text-center md:text-left">
                  <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">
                    Expense Management
                  </h1>
                  <p className="text-slate-500 font-medium text-xs md:text-sm mt-1">
                    Track and manage operational expenditures
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4">
                  <div className="flex w-full sm:w-auto items-center justify-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm">
                    <input
                      type="checkbox"
                      id="filterOffice"
                      checked={filterOfficeOnly}
                      onChange={(e) => setFilterOfficeOnly(e.target.checked)}
                      className="w-4 h-4 text-primary bg-slate-50 border-slate-200 rounded focus:ring-primary/20 transition-all cursor-pointer"
                    />
                    <label
                      htmlFor="filterOffice"
                      className="text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer select-none"
                    >
                      Office Expenses Only
                    </label>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full sm:w-auto bg-primary text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="text-lg">+</span> Add Expense
                  </button>
                </div>
              </div>

              {/* Loader & Empty State */}
              {loading ? (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 py-20 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                      Synchronizing Registry...
                    </span>
                  </div>
                </div>
              ) : expenses.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 py-20 text-center">
                  <span className="px-6 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                    No records found in active database
                  </span>
                </div>
              ) : (
                <>
                  <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto scrollbar-hide">
                      <table className="w-full border-collapse min-w-[600px] md:min-w-0">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-4 md:px-6 py-4 md:py-5 text-left text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Date
                            </th>
                            <th className="px-4 md:px-6 py-4 md:py-5 text-left text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Loan #
                            </th>
                            <th className="px-4 md:px-6 py-4 md:py-5 text-left text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Vehicle #
                            </th>
                            <th className="px-4 md:px-6 py-4 md:py-5 text-left text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Particulars
                            </th>
                            <th className="px-4 md:px-6 py-4 md:py-5 text-right text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {expenses
                            .filter((expense) =>
                              filterOfficeOnly ? expense.isOfficeExpense : true,
                            )
                            .map((expense) => (
                              <tr
                                key={expense._id}
                                className="hover:bg-blue-50/80 transition-all cursor-default"
                              >
                                <td className="px-4 md:px-6 py-4 md:py-5 whitespace-nowrap">
                                  <span className="font-bold text-slate-700 text-[11px] md:text-xs">
                                    {format(
                                      new Date(expense.date),
                                      "dd MMM yyyy",
                                    )}
                                  </span>
                                </td>
                                <td className="px-4 md:px-6 py-4 md:py-5 whitespace-nowrap">
                                  <span className="px-2 md:px-3 py-1 bg-blue-50 text-primary text-[9px] md:text-[10px] font-black rounded-lg border border-blue-100 uppercase">
                                    {expense.loanNumber || "OFFICE"}
                                  </span>
                                </td>
                                <td className="px-4 md:px-6 py-4 md:py-5 whitespace-nowrap">
                                  <span className="font-black text-slate-900 text-[9px] md:text-[10px] uppercase tracking-wider">
                                    {!expense.vehicleNumber ||
                                    expense.vehicleNumber === "N/A"
                                      ? "-"
                                      : expense.vehicleNumber}
                                  </span>
                                </td>
                                <td className="px-4 md:px-6 py-4 md:py-5">
                                  <p className="text-slate-500 font-medium text-[11px] md:text-xs max-w-[150px] md:max-w-xs truncate md:whitespace-normal">
                                    {expense.particulars}
                                  </p>
                                </td>
                                <td className="px-4 md:px-6 py-4 md:py-5 text-right whitespace-nowrap">
                                  <span className="font-black text-slate-900 text-[11px] md:text-xs">
                                    ₹{expense.amount.toLocaleString()}
                                  </span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      <AddExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchExpenses}
      />
    </AuthGuard>
  );
};

export default ExpensesPage;
