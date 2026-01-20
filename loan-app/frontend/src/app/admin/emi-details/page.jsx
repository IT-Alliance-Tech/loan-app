"use client";
import { useState, useEffect, useMemo } from "react";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import { getAllEMIs } from "../../../services/customer";
import Pagination from "../../../components/Pagination";

const EMIDetailsPage = () => {
  const [emis, setEmis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [limit] = useState(10);

  useEffect(() => {
    fetchEMIs({ page: currentPage, limit });
  }, [currentPage]);

  const fetchEMIs = async (params = {}) => {
    try {
      setLoading(true);
      const response = await getAllEMIs({ ...params, limit });
      if (response.data && response.data.emis) {
        setEmis(response.data.emis || []);
        setTotalPages(response.data.pagination.totalPages);
        setTotalRecords(response.data.pagination.total);
      } else {
        setEmis(response.data || []);
      }
    } catch (err) {
      setError(err.message || "Failed to fetch EMI details");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const customerWiseEMIs = useMemo(() => {
    const grouped = emis.reduce((acc, emi) => {
      const key = emi.loanId || emi.loanNumber;
      if (!acc[key]) {
        acc[key] = {
          loanId: emi.loanId,
          loanNumber: emi.loanNumber,
          customerName: emi.customerName,
          totalEMIs: 0,
          paidEMIs: 0,
          totalAmount: 0,
          amountPaid: 0,
          nextDueDate: null,
          lastPaymentDate: null,
          lastUpdate: emi.updatedAt,
          status: "Pending",
        };
      }

      const group = acc[key];
      group.totalEMIs += 1;
      group.totalAmount += emi.emiAmount;
      group.amountPaid += emi.amountPaid || 0;

      if (emi.status === "Paid") {
        group.paidEMIs += 1;
      }

      if (
        emi.paymentDate &&
        (!group.lastPaymentDate ||
          new Date(emi.paymentDate) > new Date(group.lastPaymentDate))
      ) {
        group.lastPaymentDate = emi.paymentDate;
      }

      const emiUpdateDate = new Date(emi.updatedAt);
      if (emiUpdateDate > new Date(group.lastUpdate)) {
        group.lastUpdate = emi.updatedAt;
      }

      // Find next pending EMI
      if (
        emi.status !== "Paid" &&
        (!group.nextDueDate ||
          new Date(emi.dueDate) < new Date(group.nextDueDate))
      ) {
        group.nextDueDate = emi.dueDate;
        group.status = emi.status;
      }

      return acc;
    }, {});

    return Object.values(grouped)
      .filter(
        (item) =>
          item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.loanNumber.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .sort((a, b) => new Date(b.lastUpdate) - new Date(a.lastUpdate));
  }, [emis, searchQuery]);

  const exportToExcel = () => {
    // Filter and sort individual EMIs for the detailed export
    const filteredEmis = emis
      .filter(
        (emi) =>
          emi.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          emi.loanNumber.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    const headers = [
      "Loan Number",
      "Customer Name",
      "EMI No.",
      "Due Date",
      "EMI Amount",
      "Amount Paid",
      "Payment Date",
      "Payment Mode",
      "Overdue",
      "Status",
      "Remarks",
    ];

    const rows = filteredEmis.map((emi) => [
      emi.loanNumber || "-",
      emi.customerName || "-",
      emi.emiNumber || "-",
      formatDate(emi.dueDate),
      emi.emiAmount || 0,
      emi.amountPaid || 0,
      formatDate(emi.paymentDate),
      emi.paymentMode || "-",
      emi.overdue || 0,
      emi.status || "Pending",
      emi.remarks || "-",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Detailed_EMI_History_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase mb-2">
                    EMI Ledger
                  </h1>
                  <p className="text-slate-500 font-medium text-sm">
                    Customer-wise payment tracking and account history
                  </p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-72">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      🔍
                    </span>
                    <input
                      type="text"
                      placeholder="Search Customer or Loan..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-tighter focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <button
                    onClick={exportToExcel}
                    disabled={customerWiseEMIs.length === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all flex items-center gap-2 whitespace-nowrap"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Export
                  </button>
                </div>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold uppercase tracking-tight">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                    Synchronizing Records...
                  </p>
                </div>
              ) : customerWiseEMIs.length === 0 ? (
                <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                    No matching accounts identified
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto bg-white rounded-3xl border border-slate-200 shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                          Acc No.
                        </th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                          Customer Profile
                        </th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">
                          EMI Milestone
                        </th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">
                          Total Value
                        </th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">
                          Balance Paid
                        </th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">
                          Next Due
                        </th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">
                          Activity
                        </th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customerWiseEMIs.map((group) => (
                        <tr
                          key={group.loanId || group.loanNumber}
                          className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                          onClick={() =>
                            (window.location.href = `/admin/loans/edit/${group.loanId}`)
                          }
                        >
                          <td className="px-6 py-4">
                            <span className="bg-blue-50 text-sky-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                              {group.loanNumber}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">
                              {group.customerName}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[10px] font-black text-slate-900">
                                {group.paidEMIs} / {group.totalEMIs}
                              </span>
                              <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary transition-all duration-500"
                                  style={{
                                    width: `${
                                      (group.paidEMIs / group.totalEMIs) * 100
                                    }%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right text-xs font-bold text-slate-900">
                            ₹{group.totalAmount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-xs font-black text-emerald-600">
                              ₹{group.amountPaid.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                              {formatDate(group.nextDueDate)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                              {formatDate(group.lastPaymentDate)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                group.status === "Paid"
                                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                  : group.status === "Overdue"
                                    ? "bg-red-50 text-red-600 border border-red-100"
                                    : group.status === "Partially Paid"
                                      ? "bg-blue-50 text-blue-600 border border-blue-100"
                                      : "bg-amber-50 text-amber-600 border border-amber-100"
                              }`}
                            >
                              {group.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                totalRecords={totalRecords}
                limit={limit}
              />
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default EMIDetailsPage;
