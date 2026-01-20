"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AuthGuard from "../../../../../components/AuthGuard";
import Navbar from "../../../../../components/Navbar";
import Sidebar from "../../../../../components/Sidebar";
import { useToast } from "../../../../../context/ToastContext";
import {
  getEmployeeById,
  toggleEmployeeStatus,
  deleteEmployee,
} from "../../../../../services/userService";

const ViewEmployeePage = () => {
  const router = useRouter();
  const { id } = useParams();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState(null);

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      const res = await getEmployeeById(id);
      setEmployee(res.data);
    } catch (err) {
      showToast("Failed to fetch employee details", "error");
      router.push("/admin/employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployee();
  }, [id]);

  const handleToggleStatus = async () => {
    try {
      await toggleEmployeeStatus(id);
      showToast("Employee status updated", "success");
      fetchEmployee();
    } catch (err) {
      showToast(err.message || "Failed to toggle status", "error");
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        "CRITICAL: Are you sure you want to remove this operator from the registry? This cannot be undone.",
      )
    )
      return;
    try {
      await deleteEmployee(id);
      showToast("Operator removed from registry", "success");
      router.push("/admin/employees");
    } catch (err) {
      showToast(err.message || "Failed to delete employee", "error");
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-[#F8FAFC] flex">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Navbar />
            <main className="py-8 px-4 sm:px-8 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
            </main>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-2xl mx-auto">
              <div className="mb-8 flex justify-between items-end">
                <div>
                  <button
                    onClick={() => router.push("/admin/employees")}
                    className="text-slate-400 hover:text-slate-600 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 mb-4 transition-all"
                  >
                    ← Back to Registry
                  </button>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                    Operator Details
                  </h1>
                  <p className="text-slate-500 font-medium text-sm">
                    Profile and protocol status for {employee.name}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => router.push(`/admin/employees/edit/${id}`)}
                    className="bg-white border border-slate-200 text-primary px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
                  >
                    Edit Profile
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {/* Status Card */}
                <div
                  className={`p-6 rounded-3xl border flex items-center justify-between ${
                    employee.isActive
                      ? "bg-emerald-50/50 border-emerald-100"
                      : "bg-amber-50/50 border-amber-100"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-3 h-3 rounded-full animate-pulse ${
                        employee.isActive ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                    ></div>
                    <div>
                      <p
                        className={`text-[10px] font-black uppercase tracking-widest ${
                          employee.isActive
                            ? "text-emerald-600"
                            : "text-amber-600"
                        }`}
                      >
                        Current Status
                      </p>
                      <p className="text-lg font-black text-slate-900 uppercase">
                        {employee.isActive ? "Fully Active" : "Suspended"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleStatus}
                    className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                      employee.isActive
                        ? "bg-amber-500 text-white shadow-lg shadow-amber-100 hover:bg-amber-600"
                        : "bg-emerald-600 text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700"
                    }`}
                  >
                    {employee.isActive ? "Suspend Access" : "Restore Access"}
                  </button>
                </div>

                {/* Info Card */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Operator Name
                      </p>
                      <p className="text-lg font-black text-slate-900 uppercase">
                        {employee.name}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Protocol Level
                      </p>
                      <span className="inline-flex px-3 py-1 bg-blue-50 text-primary text-[10px] font-black uppercase rounded-lg border border-blue-100 mt-1">
                        {employee.role}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Registry Email
                      </p>
                      <p className="font-bold text-slate-700">
                        {employee.email}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Access Key
                      </p>
                      <p className="font-bold text-slate-700 uppercase">
                        {employee.accessKey || "None Assigned"}
                      </p>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="text-slate-400">
                      <p className="text-[10px] font-bold uppercase tracking-widest">
                        Added to Registry
                      </p>
                      <p className="text-xs font-medium">
                        {new Date(employee.createdAt).toLocaleDateString()}{" "}
                        {new Date(employee.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <button
                      onClick={handleDelete}
                      className="w-full sm:w-auto text-red-500 font-black text-[10px] uppercase tracking-[0.2em] hover:text-red-700 p-2 transition-all"
                    >
                      Delete From Registry
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default ViewEmployeePage;
