"use client";
import React, { useState, useEffect } from "react";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import { getTodoList } from "../../../services/loan.service";
import Link from "next/link";

const TodoListPage = () => {
  const [todoData, setTodoData] = useState({
    followups: [],
    hpEntries: [],
    rtoWorks: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTodo();
  }, []);

  const fetchTodo = async () => {
    try {
      setLoading(true);
      const res = await getTodoList();
      if (res.data) {
        setTodoData(res.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const TaskCard = ({ title, count, items, type }) => (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden flex flex-col">
      <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">
          {title}
        </h2>
        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black tracking-tighter">
          {count} ITEMS
        </span>
      </div>
      <div className="flex-1 p-6 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
        {items.length === 0 ? (
          <div className="text-center py-8 text-slate-300 font-bold text-[10px] uppercase tracking-widest italic">
            No pending tasks
          </div>
        ) : (
          items.map((item, idx) => (
            <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-primary/20 transition-all group relative">
              <div className="flex justify-between items-start">
                <div>
                  <Link 
                    href={`/admin/loans/edit/${item._id || item.id}`}
                    className="text-xs font-black text-slate-900 uppercase hover:text-primary transition-colors block mb-1"
                  >
                    {item.loanNumber}
                  </Link>
                  <p className="text-[11px] font-bold text-slate-500 uppercase">
                    {item.customerName}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                   {type === 'followup' && (
                     <span className="text-[9px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                       DUE: {new Date(item.nextFollowUpDate).toLocaleDateString()}
                     </span>
                   )}
                   {type === 'hp' && (
                     <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                       {item.hpEntry}
                     </span>
                   )}
                </div>
              </div>
              
              {type === 'rto' && item.rtoWorkPending && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {item.rtoWorkPending.map((work, widx) => (
                    <span key={widx} className="text-[8px] font-black bg-white text-slate-400 px-2 py-1 rounded-lg border border-slate-200 uppercase tracking-tighter">
                      {work}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex font-sans">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="mb-10">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                  To-Do List
                </h1>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mt-2">
                  CONSOLIDATED OPERATIONS DASHBOARD
                </p>
              </div>

              {error && (
                 <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-[10px] font-black uppercase tracking-tight">
                   {error}
                 </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <TaskCard 
                  title="Follow Ups" 
                  count={todoData.followups.length} 
                  items={todoData.followups}
                  type="followup"
                />
                <TaskCard 
                  title="HP Entry" 
                  count={todoData.hpEntries.length} 
                  items={todoData.hpEntries}
                  type="hp"
                />
                <TaskCard 
                  title="RTO Works" 
                  count={todoData.rtoWorks.length} 
                  items={todoData.rtoWorks}
                  type="rto"
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default TodoListPage;
