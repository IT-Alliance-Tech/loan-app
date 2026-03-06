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
              <div className="mb-8 flex justify-between items-end">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                    Expense Management
                  </h1>
                  <p className="text-slate-500 font-medium text-sm mt-1">
                    Track and manage operational expenditures
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                  <span className="text-lg">+</span> Add Expense
                </button>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Date
                        </th>
                        <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Loan #
                        </th>
                        <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Vehicle #
                        </th>
                        <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Particulars
                        </th>
                        <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {loading ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-20 text-center">
                            <div className="flex flex-col items-center gap-4">
                              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                                Synchronizing Registry...
                              </span>
                            </div>
                          </td>
                        </tr>
                      ) : expenses.length === 0 ? (
                        <tr>
                          <td
                            colSpan="5"
                            className="px-6 py-20 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest"
                          >
                            No records found in active database
                          </td>
                        </tr>
                      ) : (
                        expenses.map((expense) => (
                          <tr
                            key={expense._id}
                            className="hover:bg-slate-50/50 transition-all"
                          >
                            <td className="px-6 py-5">
                              <span className="font-bold text-slate-700 text-xs">
                                {format(new Date(expense.date), "dd MMM yyyy")}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <span className="px-3 py-1 bg-blue-50 text-primary text-[10px] font-black rounded-lg border border-blue-100 uppercase">
                                {expense.loanNumber}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <span className="font-black text-slate-900 text-[10px] uppercase tracking-wider">
                                {expense.vehicleNumber || "N/A"}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <p className="text-slate-500 font-medium text-xs max-w-xs">
                                {expense.particulars}
                              </p>
                            </td>
                            <td className="px-6 py-5 text-right">
                              <span className="font-black text-slate-900 text-xs">
                                ₹{expense.amount.toLocaleString()}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
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
