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
  const [dateGroups, setDateGroups] = useState([]);

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
      overdue: emi.overdue || 0,
      status: emi.status || "Pending",
      remarks: emi.remarks || "",
    });

    if (emi.paymentHistory && emi.paymentHistory.length > 0) {
      // Group history by date
      const groups = {};
      emi.paymentHistory.forEach((p) => {
        const dateKey = new Date(p.date).toISOString().split("T")[0];
        if (!groups[dateKey]) {
          groups[dateKey] = {
            id: Math.random(),
            date: dateKey,
            payments: [],
          };
        }
        groups[dateKey].payments.push({
          id: Math.random(),
          mode: p.mode,
          amount: p.amount,
        });
      });
      setDateGroups(Object.values(groups));
    } else if (emi.amountPaid > 0) {
      // Fallback for legacy data (before paymentHistory was added)
      setDateGroups([
        {
          id: Date.now(),
          date: emi.paymentDate
            ? new Date(emi.paymentDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          payments: [
            {
              id: Date.now() + 1,
              mode: (emi.paymentMode || "").split(", ")[0] || "CASH",
              amount: emi.amountPaid,
            },
          ],
        },
      ]);
    } else {
      setDateGroups([
        {
          id: Date.now(),
          date: new Date().toISOString().split("T")[0],
          payments: [{ id: Date.now() + 1, mode: "", amount: "" }],
        },
      ]);
    }
    setShowModal(true);
  };

  const handleAddDate = () => {
    setDateGroups([
      ...dateGroups,
      {
        id: Date.now(),
        date: new Date().toISOString().split("T")[0],
        payments: [{ id: Date.now() + 1, mode: "", amount: "" }],
      },
    ]);
  };

  const handleAddMore = (groupId) => {
    setDateGroups(
      dateGroups.map((group) => {
        if (group.id === groupId) {
          return {
            ...group,
            payments: [
              ...group.payments,
              { id: Date.now(), mode: "", amount: "" },
            ],
          };
        }
        return group;
      }),
    );
  };

  const handleGroupDateChange = (groupId, value) => {
    setDateGroups(
      dateGroups.map((group) =>
        group.id === groupId ? { ...group, date: value } : group,
      ),
    );
  };

  const handlePaymentChange = (groupId, paymentId, field, value) => {
    setDateGroups(
      dateGroups.map((group) => {
        if (group.id === groupId) {
          return {
            ...group,
            payments: group.payments.map((p) =>
              p.id === paymentId ? { ...p, [field]: value } : p,
            ),
          };
        }
        return group;
      }),
    );
  };

  const handleRemovePayment = (groupId, paymentId) => {
    setDateGroups(
      dateGroups
        .map((group) => {
          if (group.id === groupId) {
            return {
              ...group,
              payments: group.payments.filter((p) => p.id !== paymentId),
            };
          }
          return group;
        })
        .filter((g) => g.payments.length > 0),
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    const totalAddedAmount = dateGroups.reduce((acc, group) => {
      return (
        acc +
        group.payments.reduce(
          (pAcc, p) => pAcc + (parseFloat(p.amount) || 0),
          0,
        )
      );
    }, 0);

    const allModes = [
      ...new Set(
        dateGroups
          .flatMap((g) => g.payments.map((p) => p.mode))
          .filter(Boolean),
      ),
    ].join(", ");

    const latestDate = dateGroups[dateGroups.length - 1]?.date;

    try {
      await updateEMI(editingEmi._id, {
        ...editData,
        dateGroups: dateGroups, // Send the full date groups to backend
      });
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
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const calculateTotalPaidNow = () => {
    return dateGroups.reduce((acc, group) => {
      return (
        acc +
        group.payments.reduce(
          (pAcc, p) => pAcc + (parseFloat(p.amount) || 0),
          0,
        )
      );
    }, 0);
  };

  const remainingBalance = Math.max(
    0,
    (editingEmi?.emiAmount || 0) - calculateTotalPaidNow(),
  );

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
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap text-center">
                Last Updated
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
                <td className="px-6 py-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                  {formatDate(emi.dueDate)}
                </td>
                <td className="px-6 py-4 text-xs font-black text-slate-900 text-center">
                  ₹{emi.emiAmount}
                </td>
                <td className="px-6 py-4 text-xs font-medium text-slate-600 text-center whitespace-nowrap">
                  ₹{emi.amountPaid || 0}
                </td>
                <td className="px-6 py-4 text-xs font-medium text-slate-600 text-center whitespace-nowrap">
                  {formatDate(emi.paymentDate)}
                </td>
                <td className="px-6 py-4 text-xs font-medium text-slate-600 text-center">
                  {emi.status === "Pending" &&
                  new Date() < new Date(emi.dueDate) ? (
                    "-"
                  ) : (
                    <div className="flex flex-col gap-1 items-center">
                      {(emi.paymentMode || "-").split(", ").map((mode, idx) => (
                        <span key={idx} className="block whitespace-nowrap">
                          {mode}
                        </span>
                      ))}
                    </div>
                  )}
                </td>

                <td className="px-6 py-4 text-xs font-medium text-red-600 text-center">
                  ₹{emi.overdue || 0}
                </td>
                <td className="px-6 py-4 text-center whitespace-nowrap">
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
                <td className="px-6 py-4 text-xs font-medium text-slate-500 text-center whitespace-nowrap">
                  {emi.updatedBy ? (
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700">
                        {typeof emi.updatedBy === "string"
                          ? emi.updatedBy
                          : emi.updatedBy.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(emi.updatedAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  ) : (
                    "-"
                  )}
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

            <form onSubmit={handleSave} className="flex flex-col max-h-[85vh]">
              {/* Scrollable Content Container */}
              <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                {/* Remaining Balance at Top */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-1">
                    Remaining Amount
                  </label>
                  <div className="text-xl font-black text-slate-900">
                    ₹{remainingBalance.toLocaleString()}
                  </div>
                </div>

                {/* Dynamic Date Groups */}
                <div className="space-y-8">
                  {dateGroups.map((group, groupIdx) => (
                    <div
                      key={group.id}
                      className="space-y-4 p-4 border border-slate-100 rounded-2xl bg-white shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                            Payment Date
                          </label>
                          <input
                            type="date"
                            value={group.date}
                            onChange={(e) =>
                              handleGroupDateChange(group.id, e.target.value)
                            }
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-mono"
                            required
                          />
                        </div>
                        {dateGroups.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setDateGroups(
                                dateGroups.filter((g) => g.id !== group.id),
                              )
                            }
                            className="mt-6 p-2 text-red-400 hover:text-red-600 transition-colors"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Payments within group */}
                      <div className="space-y-4 pl-4 border-l-2 border-slate-50">
                        {group.payments.map((payment, pIdx) => (
                          <div
                            key={payment.id}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4 relative"
                          >
                            <div className="relative">
                              <PaymentModeSelector
                                value={payment.mode}
                                onChange={(val) =>
                                  handlePaymentChange(
                                    group.id,
                                    payment.id,
                                    "mode",
                                    val,
                                  )
                                }
                              />
                            </div>
                            <div className="flex gap-2 items-end">
                              <div className="flex-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                                  Amount
                                </label>
                                <input
                                  type="number"
                                  value={payment.amount}
                                  onChange={(e) =>
                                    handlePaymentChange(
                                      group.id,
                                      payment.id,
                                      "amount",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-300"
                                  placeholder="0.00"
                                  required
                                />
                              </div>
                              {group.payments.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemovePayment(group.id, payment.id)
                                  }
                                  className="mb-2 p-2 text-red-400 hover:text-red-600 transition-colors"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => handleAddMore(group.id)}
                          className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1.5 px-1 py-2"
                        >
                          + Add More
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddDate}
                    className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-primary hover:text-primary transition-all bg-slate-50/50"
                  >
                    + Add Date
                  </button>
                </div>

                {/* Status and Overdue Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                      Payment Status
                    </label>
                    <div
                      className={`w-full px-4 py-3 border rounded-xl text-sm font-black uppercase tracking-wider ${
                        remainingBalance === 0
                          ? "bg-green-50 border-green-200 text-green-600"
                          : remainingBalance < (editingEmi?.emiAmount || 0)
                            ? "bg-orange-50 border-orange-200 text-orange-600"
                            : "bg-red-50 border-red-200 text-red-600"
                      }`}
                    >
                      {remainingBalance === 0
                        ? "Paid"
                        : remainingBalance < (editingEmi?.emiAmount || 0)
                          ? "Partially Paid"
                          : "Pending"}
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
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-red-600 focus:outline-none focus:ring-4 focus:ring-red-100 focus:border-red-400 transition-all font-mono"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Remarks */}
                <div className="pt-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                    Remark
                  </label>
                  <textarea
                    name="remarks"
                    value={editData.remarks}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all resize-none min-h-[100px]"
                    placeholder="Add any payment notes..."
                  ></textarea>
                </div>
              </div>

              {/* Fixed Footer Buttons Container */}
              <div className="p-8 border-t border-slate-100 bg-white flex gap-4 mt-auto">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-4 border border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  CANCEL
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
                      PROCESSING...
                    </>
                  ) : (
                    "UPDATE EMI"
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
