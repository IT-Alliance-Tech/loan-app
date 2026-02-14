import React, { useState } from "react";
import { updateEMI } from "../services/customer";
import { useToast } from "../context/ToastContext";
import PaymentModeSelector from "./PaymentModeSelector";

const EMITable = ({ emis, isEditMode = false, onUpdateSuccess }) => {
  const [editingEmi, setEditingEmi] = useState(null);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { showToast } = useToast();

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleEditClick = (emi) => {
    setEditingEmi(emi);
    setEditData({
      amountPaid: emi.amountPaid || "",
      paymentMode: emi.paymentMode || "",
      paymentDate: emi.paymentDate
        ? new Date(emi.paymentDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      overdue: emi.overdue || 0,
      status: emi.status || "Pending",
      remarks: emi.remarks || "",
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateEMI(editingEmi._id, editData);
      setShowModal(false);
      setEditingEmi(null);
      showToast("EMI updated successfully", "success");
      if (onUpdateSuccess) onUpdateSuccess();
    } catch (error) {
      console.error("Error updating EMI:", error);
      showToast(
        error.message || "An error occurred while updating EMI",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => {
      const newData = { ...prev, [name]: value };

      if (name === "amountPaid") {
        const paid = parseFloat(value) || 0;
        const total = parseFloat(editingEmi?.emiAmount) || 0;

        if (paid >= total) {
          newData.status = "Paid";
        } else if (paid > 0) {
          newData.status = "Partially Paid";
        } else {
          newData.status = "Pending";
        }
      }

      return newData;
    });
  };

  return (
    <div className="mt-8">
      <div className="overflow-x-auto bg-white rounded-3xl border border-slate-200 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
                No.
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
                Due Date
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap text-center">
                EMI Amount
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap text-center">
                Amount Paid
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap text-center">
                Payment Date
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap text-center">
                Mode
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap text-center">
                Overdue
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap text-center">
                Payment
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap text-center">
                Remarks
              </th>
              {isEditMode && (
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap text-center">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {emis.map((emi, index) => (
              <tr
                key={emi._id}
                className="hover:bg-slate-50/50 transition-colors"
              >
                <td className="px-6 py-4 text-xs font-bold text-slate-900">
                  {emi.emiNumber}
                </td>
                <td className="px-6 py-4 text-xs font-medium text-slate-600">
                  {formatDate(emi.dueDate)}
                </td>
                <td className="px-6 py-4 text-xs font-black text-slate-900 text-center">
                  ₹{emi.emiAmount}
                </td>
                <td className="px-6 py-4 text-xs font-medium text-slate-600 text-center">
                  ₹{emi.amountPaid || 0}
                </td>
                <td className="px-6 py-4 text-xs font-medium text-slate-600 text-center">
                  {formatDate(emi.paymentDate)}
                </td>
                <td className="px-6 py-4 text-xs font-medium text-slate-600 text-center">
                  {emi.status === "Pending" &&
                  new Date() < new Date(emi.dueDate)
                    ? "-"
                    : emi.paymentMode || "-"}
                </td>
                <td className="px-6 py-4 text-xs font-medium text-red-600 text-center">
                  ₹{emi.overdue || 0}
                </td>
                <td className="px-6 py-4 text-center">
                  {emi.status === "Pending" &&
                  new Date() < new Date(emi.dueDate) ? (
                    <span className="text-xs font-bold text-slate-400">-</span>
                  ) : (
                    <span
                      className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        emi.status === "Paid"
                          ? "bg-green-100 text-green-700"
                          : emi.status === "Partially Paid"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {emi.status}
                    </span>
                  )}
                </td>
                <td
                  className="px-6 py-4 text-xs font-medium text-slate-500 text-center max-w-[150px] truncate"
                  title={emi.remarks}
                >
                  {emi.remarks || "-"}
                </td>
                {isEditMode && (
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <button
                        onClick={() => handleEditClick(emi)}
                        className="px-4 py-1.5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-lg hover:shadow-blue-200 transition-all"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pop-up Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  Update EMI #{editingEmi?.emiNumber}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Due Date: {formatDate(editingEmi?.dueDate)} | Amount: ₹
                  {editingEmi?.emiAmount}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                    Amount Paid
                  </label>
                  <input
                    type="number"
                    name="amountPaid"
                    value={editData.amountPaid}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                    Remaining Amount
                  </label>
                  <input
                    type="text"
                    value={`₹${Math.max(0, (editingEmi?.emiAmount || 0) - (editData.amountPaid || 0)).toFixed(2)}`}
                    disabled
                    className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    name="paymentDate"
                    value={editData.paymentDate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                    required
                  />
                </div>

                <PaymentModeSelector
                  value={editData.paymentMode}
                  onChange={(val) =>
                    setEditData((prev) => ({ ...prev, paymentMode: val }))
                  }
                />

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                    Payment Status
                  </label>
                  <div
                    className={`w-full px-4 py-3 border rounded-xl text-sm font-black uppercase tracking-wider ${
                      editData.status === "Paid"
                        ? "bg-green-50 border-green-200 text-green-600"
                        : editData.status === "Partially Paid"
                          ? "bg-orange-50 border-orange-200 text-orange-600"
                          : "bg-red-50 border-red-200 text-red-600"
                    }`}
                  >
                    {editData.status}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                    Overdue Amount
                  </label>
                  <input
                    type="number"
                    name="overdue"
                    value={editData.overdue}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-red-600 focus:outline-none focus:ring-4 focus:ring-red-100 focus:border-red-400 transition-all"
                    placeholder="0.00"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                    Remarks
                  </label>
                  <textarea
                    name="remarks"
                    value={editData.remarks}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all resize-none"
                    rows="3"
                    placeholder="Add any payment notes..."
                  ></textarea>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-4 border border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] px-6 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    "Update Payment Record"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EMITable;
