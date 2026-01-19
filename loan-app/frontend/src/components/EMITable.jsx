import React, { useState } from "react";
import { updateEMI } from "../services/customer";
import { useToast } from "../context/ToastContext";

const EMITable = ({ emis, isEditMode = false, onUpdateSuccess }) => {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(false);
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
    setEditingId(emi._id);
    setEditData({
      amountPaid: emi.amountPaid || "",
      paymentMode: emi.paymentMode || "",
      paymentDate: emi.paymentDate
        ? new Date(emi.paymentDate).toISOString().split("T")[0]
        : "",
      overdue: emi.overdue || 0,
      status: emi.status || "Pending",
      remarks: emi.remarks || "",
    });
  };

  const handleSave = async (id) => {
    setLoading(true);
    try {
      const response = await updateEMI(id, editData);
      if (response.success) {
        setEditingId(null);
        showToast("EMI updated successfully", "success");
        if (onUpdateSuccess) onUpdateSuccess();
      } else {
        showToast(response.message || "Failed to update EMI", "error");
      }
    } catch (error) {
      console.error("Error updating EMI:", error);
      showToast("An error occurred while updating EMI", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="overflow-x-auto bg-white rounded-3xl border border-slate-200 shadow-sm mt-8">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
              No.
            </th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
              Due Date
            </th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
              EMI Amount
            </th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
              Amount Paid
            </th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
              Payment Date
            </th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
              Mode
            </th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
              Overdue
            </th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
              Status
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
              <td className="px-6 py-4 text-xs font-black text-slate-900">
                ₹{emi.emiAmount}
              </td>
              <td className="px-6 py-4 text-xs font-medium text-slate-600">
                {editingId === emi._id ? (
                  <input
                    type="number"
                    name="amountPaid"
                    value={editData.amountPaid}
                    onChange={handleChange}
                    className="w-24 px-2 py-1 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                ) : (
                  `₹${emi.amountPaid || 0}`
                )}
              </td>
              <td className="px-6 py-4 text-xs font-medium text-slate-600">
                {editingId === emi._id ? (
                  <input
                    type="date"
                    name="paymentDate"
                    value={editData.paymentDate}
                    onChange={handleChange}
                    className="px-2 py-1 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                ) : (
                  formatDate(emi.paymentDate)
                )}
              </td>
              <td className="px-6 py-4 text-xs font-medium text-slate-600">
                {editingId === emi._id ? (
                  <select
                    name="paymentMode"
                    value={editData.paymentMode}
                    onChange={handleChange}
                    className="px-2 py-1 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="">Select</option>
                    <option value="Cash">Cash</option>
                    <option value="Online">Online</option>
                    <option value="GPay">GPay</option>
                    <option value="PhonePe">PhonePe</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                ) : (
                  emi.paymentMode || "-"
                )}
              </td>
              <td className="px-6 py-4 text-xs font-medium text-red-600">
                {editingId === emi._id ? (
                  <input
                    type="number"
                    name="overdue"
                    value={editData.overdue}
                    onChange={handleChange}
                    className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-xs text-red-600 focus:ring-2 focus:ring-red-100 outline-none"
                  />
                ) : (
                  `₹${emi.overdue || 0}`
                )}
              </td>
              <td className="px-6 py-4">
                {editingId === emi._id ? (
                  <select
                    name="status"
                    value={editData.status}
                    onChange={handleChange}
                    className="px-2 py-1 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                ) : (
                  <span
                    className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      emi.status === "Paid"
                        ? "bg-green-100 text-green-700"
                        : emi.status === "Overdue"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {emi.status}
                  </span>
                )}
              </td>
              {isEditMode && (
                <td className="px-6 py-4">
                  <div className="flex justify-center gap-2">
                    {editingId === emi._id ? (
                      <>
                        <button
                          onClick={() => handleSave(emi._id)}
                          disabled={loading}
                          className="w-8 h-8 flex items-center justify-center bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm"
                          title="Save"
                        >
                          {loading ? "..." : "✓"}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"
                          title="Cancel"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleEditClick(emi)}
                        className="px-4 py-1.5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-lg hover:shadow-blue-200 transition-all"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EMITable;
