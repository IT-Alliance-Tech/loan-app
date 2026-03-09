"use client";
import { useState, useEffect } from "react";
import { searchLoanInfo, createExpense } from "../services/expenseService";
import { useToast } from "../context/ToastContext";

const AddExpenseModal = ({ isOpen, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [formData, setFormData] = useState({
    loanNumber: "",
    vehicleNumber: "",
    particulars: "",
    date: new Date().toISOString().split("T")[0],
    amount: "",
    isOfficeExpense: false,
  });

  if (!isOpen) return null;

  const formatVehicleNumber = (val) => {
    // Remove all non-alphanumeric characters and uppercase
    const clean = val.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const parts = [];

    if (clean.length > 0) parts.push(clean.substring(0, 2)); // KA
    if (clean.length > 2) parts.push(clean.substring(2, 4)); // 02
    if (clean.length > 4) parts.push(clean.substring(4, 6)); // UJ
    if (clean.length > 6) parts.push(clean.substring(6, 10)); // 7890

    return parts.join("-");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "vehicleNumber") {
      setFormData((prev) => ({ ...prev, [name]: formatVehicleNumber(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSearch = async (query) => {
    if (!query || query.length < 3) return;
    setSearching(true);
    try {
      const res = await searchLoanInfo(query);
      if (res.data) {
        setFormData((prev) => ({
          ...prev,
          loanNumber: res.data.loanNumber,
          vehicleNumber: res.data.vehicleNumber || "",
        }));
        showToast("Loan details fetched", "success");
      }
    } catch (err) {
      // Silently fail search if not found, let user type manually
      console.error("Search failed:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createExpense(formData);
      showToast("Expense added successfully", "success");
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        loanNumber: "",
        vehicleNumber: "",
        particulars: "",
        date: new Date().toISOString().split("T")[0],
        amount: "",
        isOfficeExpense: false,
      });
    } catch (err) {
      showToast(err.message || "Failed to add expense", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      <div className="relative bg-white w-full max-w-md rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              Add Expense
            </h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">
              Record operational cost
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="flex items-center gap-3 px-1">
            <input
              type="checkbox"
              id="isOfficeExpense"
              name="isOfficeExpense"
              className="w-5 h-5 text-primary bg-slate-50 border-slate-200 rounded-lg focus:ring-primary/20 transition-all cursor-pointer"
              checked={formData.isOfficeExpense}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  isOfficeExpense: e.target.checked,
                  // Option: could clear loan text if checked, but better not to lose user input if they misclick
                }))
              }
            />
            <label
              htmlFor="isOfficeExpense"
              className="text-xs font-black text-slate-700 uppercase tracking-wider cursor-pointer"
            >
              Office Expense
            </label>
          </div>

          {!formData.isOfficeExpense && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                  Loan Number
                </label>
                <input
                  type="text"
                  name="loanNumber"
                  required={!formData.isOfficeExpense}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all uppercase"
                  value={formData.loanNumber}
                  onChange={handleChange}
                  onBlur={(e) => handleSearch(e.target.value)}
                  placeholder="E.G. L-123"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  name="vehicleNumber"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all uppercase"
                  value={formData.vehicleNumber}
                  onChange={handleChange}
                  onBlur={(e) => handleSearch(e.target.value)}
                  placeholder="E.G. GJ01..."
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
              Particulars
            </label>
            <input
              type="text"
              name="particulars"
              required
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
              value={formData.particulars}
              onChange={handleChange}
              placeholder="Reason for expense..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                Date
              </label>
              <input
                type="date"
                name="date"
                required
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                value={formData.date}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                Amount
              </label>
              <input
                type="number"
                name="amount"
                required
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || searching}
            className="w-full bg-primary text-white p-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-200 hover:bg-blue-700 transform active:scale-[98] transition-all disabled:opacity-50 mt-4"
          >
            {loading
              ? "Recording..."
              : searching
                ? "Fetching Data..."
                : "Save Expense"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddExpenseModal;
