"use client";
import { useState, useEffect } from "react";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import { useToast } from "../../../context/ToastContext";
import { getPendingApprovals, processApproval } from "../../../services/approvalService";

const ApprovalsPage = () => {
    const { showToast } = useToast();
    const [approvals, setApprovals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    const fetchApprovals = async () => {
        setLoading(true);
        try {
            const res = await getPendingApprovals();
            setApprovals(res.data || []);
        } catch (err) {
            showToast(err.message || "Failed to fetch approvals", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApprovals();

        // Background polling for new requests every 30 seconds
        const interval = setInterval(() => {
            fetchApprovals();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const handleAction = async (id, status) => {
        setProcessingId(id);
        try {
            await processApproval(id, status, "");
            showToast(`Request ${status.toLowerCase()} successfully`, "success");
            fetchApprovals();
        } catch (err) {
            showToast(err.message || "Failed to process request", "error");
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <AuthGuard roles={["SUPER_ADMIN"]}>
            <div className="min-h-screen bg-[#F8FAFC] flex">
                <Sidebar />
                <div className="flex-1 flex flex-col min-w-0">
                    <Navbar />
                    <main className="py-8 px-4 sm:px-8">
                        <div className="max-w-6xl mx-auto">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                <div>
                                    <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Approval Queue</h1>
                                    <p className="text-slate-500 font-medium text-sm">Review and authorize pending payment requests</p>
                                </div>
                                <button 
                                    onClick={fetchApprovals}
                                    className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2"
                                >
                                    <span className={loading ? "animate-spin" : ""}>🔄</span> Refresh
                                </button>
                            </div>

                            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                                {loading ? (
                                    <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Synchronizing Registry</p>
                                    </div>
                                ) : approvals.length === 0 ? (
                                    <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-300">
                                        <div className="text-6xl">✅</div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Queue Clean - No Pending Requests</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-100">
                                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Request Info</th>
                                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount / Mode</th>
                                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Requested By</th>
                                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {approvals.map((app) => (
                                                    <tr key={app._id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-5">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-black text-slate-900 uppercase">{app.requestType.replace("_", " ")}</span>
                                                                <span className="text-[10px] font-bold text-slate-400 mt-0.5">#{app.loanNumber}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <span className="text-xs font-bold text-slate-600 uppercase">{app.customerName}</span>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-black text-emerald-600">
                                                                    ₹{app.requestedData.totalAmount || app.requestedData.amount || app.requestedData.dateGroups?.reduce((acc, g) => acc + g.payments.reduce((pAcc, p) => pAcc + parseFloat(p.amount), 0), 0) || "N/A"}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-slate-400">
                                                                    {app.requestedData.paymentMode || "Multi-mode"}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-[10px] font-black text-primary border border-blue-100">
                                                                    {app.requestedBy?.name?.charAt(0).toUpperCase()}
                                                                </div>
                                                                <span className="text-xs font-bold text-slate-700">{app.requestedBy?.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button 
                                                                    onClick={() => handleAction(app._id, "Rejected")}
                                                                    disabled={processingId === app._id}
                                                                    className="px-4 py-2 text-[10px] font-black uppercase text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100 disabled:opacity-50"
                                                                >
                                                                    Reject
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleAction(app._id, "Approved")}
                                                                    disabled={processingId === app._id}
                                                                    className="px-6 py-2 text-[10px] font-black uppercase text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-100 transform active:scale-95 transition-all disabled:opacity-50"
                                                                >
                                                                    Authorize
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </AuthGuard>
    );
};

export default ApprovalsPage;
