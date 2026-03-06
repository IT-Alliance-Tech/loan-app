"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { getWeeklyPendingPayments } from "../services/weeklyLoan.service";
import Pagination from "./Pagination";
import { useToast } from "../context/ToastContext";
import TableActionMenu from "./TableActionMenu";
import ContactActionMenu from "./ContactActionMenu";

const WeeklyPendingList = () => {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeContactMenu, setActiveContactMenu] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [limit] = useState(10);
  const { showToast } = useToast();

  const fetchPending = async () => {
    try {
      setLoading(true);
      const params = {
        pageNum: currentPage,
        limitNum: limit,
        loanNumber: searchQuery,
      };

      const res = await getWeeklyPendingPayments(params);
      if (res.data) {
        setData(res.data.payments || []);
        setTotalPages(res.data.pagination.totalPages);
        setTotalRecords(res.data.pagination.total);
      }
      setError("");
    } catch (err) {
      setError(err.message);
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPending();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, currentPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
            Weekly Pending Payments
          </h1>
          <p className="text-slate-400 font-bold text-[9px] sm:text-sm uppercase tracking-[0.15em] mt-1.5">
            {totalRecords} OVERDUE RECORDS
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-8">
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center h-[46px]">
          <div className="flex-1 flex items-center px-4">
            <div className="text-slate-300 text-lg">🔍</div>
            <input
              type="text"
              placeholder="SEARCH BY LOAN NUMBER (E.G. WL-001)"
              className="w-full px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none placeholder:text-slate-300 placeholder:font-black uppercase bg-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <button
          onClick={() => setSearchQuery("")}
          className="flex-none px-6 h-[46px] bg-red-50 border border-red-100 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          Clear
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold uppercase tracking-tight">
          {error}
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-100 pb-1">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Loan ID
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Customer Name
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Mobile Number
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                  Weeks Pending
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                  Total Due
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                  Overdue Days
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                  Client Response
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap sticky right-0 bg-slate-50 z-20 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase"
                  >
                    Loading records...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase"
                  >
                    No pending payments found
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr
                    key={item.loanId}
                    className="hover:bg-slate-50 transition-colors group"
                  >
                    <td className="px-6 py-5 whitespace-nowrap">
                      <Link
                        href={`/admin/weekly-loans/pending/view/${item.earliestEmiId}?from=pending`}
                        className="text-[11px] font-black text-primary uppercase tracking-wider hover:underline"
                      >
                        {item.loanNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap font-black text-slate-900 text-xs uppercase tracking-tight">
                      {item.customerName}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setActiveContactMenu({
                            number: item.mobileNumber,
                            name: item.customerName,
                            type: "Applicant",
                            x: rect.left,
                            y: rect.bottom,
                          });
                        }}
                        className="text-[11px] font-bold text-primary hover:underline transition-colors text-left"
                      >
                        {item.mobileNumber}
                      </button>
                    </td>
                    <td className="px-6 py-5 text-center whitespace-nowrap">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded-md">
                        {item.unpaidWeeks}{" "}
                        {item.unpaidWeeks === 1 ? "Week" : "Weeks"}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center whitespace-nowrap font-black text-red-600 text-sm tracking-tight">
                      ₹{item.totalDueAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-5 text-center whitespace-nowrap">
                      {(() => {
                        const days = differenceInDays(
                          new Date(),
                          new Date(item.earliestDueDate),
                        );
                        let bgColor = "bg-slate-500";
                        if (days >= 28) bgColor = "bg-red-600";
                        else if (days >= 14) bgColor = "bg-orange-600";
                        else if (days >= 1) bgColor = "bg-yellow-600";

                        return (
                          <span
                            className={`text-[10px] font-black tracking-tight px-3 py-1.5 rounded-lg inline-block min-w-[80px] text-white ${bgColor}`}
                          >
                            {days > 0 ? `${days} Days` : "0 Days"}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex items-center justify-center max-w-[200px] mx-auto">
                        <span
                          className="text-[11px] font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 truncate w-full"
                          title={item.clientResponse}
                        >
                          {item.clientResponse || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 z-10 transition-colors shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">
                      <TableActionMenu
                        actions={[
                          {
                            label: "View",
                            onClick: () =>
                              router.push(
                                `/admin/weekly-loans/pending/view/${item.earliestEmiId}?from=pending`,
                              ),
                          },
                          {
                            label: "Edit Loan",
                            onClick: () =>
                              router.push(
                                `/admin/weekly-loans/edit/${item.loanId}`,
                              ),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        totalRecords={totalRecords}
        limit={limit}
      />

      <ContactActionMenu
        contact={activeContactMenu}
        onClose={() => setActiveContactMenu(null)}
      />
    </div>
  );
};

export default WeeklyPendingList;
