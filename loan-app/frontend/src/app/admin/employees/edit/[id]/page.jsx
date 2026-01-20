"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AuthGuard from "../../../../../components/AuthGuard";
import Navbar from "../../../../../components/Navbar";
import Sidebar from "../../../../../components/Sidebar";
import { useToast } from "../../../../../context/ToastContext";
import {
  getEmployeeById,
  updateEmployee,
} from "../../../../../services/userService";

const EditEmployeePage = () => {
  const router = useRouter();
  const { id } = useParams();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
    accessKey: "",
  });

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const res = await getEmployeeById(id);
        const { name, email, role, accessKey } = res.data;
        setFormData({ name, email, role, accessKey, password: "" });
      } catch (err) {
        showToast("Failed to fetch employee details", "error");
        router.push("/admin/employees");
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const dataToUpdate = { ...formData };
      if (!dataToUpdate.password) delete dataToUpdate.password;

      await updateEmployee(id, dataToUpdate);
      showToast("Operator updated successfully", "success");
      router.push("/admin/employees");
    } catch (err) {
      showToast(err.message || "Failed to update employee", "error");
    } finally {
      setSubmitting(false);
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
              <div className="mb-8">
                <button
                  onClick={() => router.back()}
                  className="text-slate-400 hover:text-slate-600 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 mb-4"
                >
                  ← Back to Registry
                </button>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                  Edit Operator
                </h1>
                <p className="text-slate-500 font-medium text-sm">
                  Modify protocol access levels and credentials
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm"
              >
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      Protocol Level
                    </label>
                    <select
                      name="role"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
                      value={formData.role}
                      onChange={handleChange}
                    >
                      <option value="EMPLOYEE">OPERATOR (EMPLOYEE)</option>
                      <option value="SUPER_ADMIN">ADMINISTRATOR</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      Registry Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      Update Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      placeholder="Leave blank to keep current"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-300"
                      value={formData.password}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      Quick Access Key
                    </label>
                    <input
                      type="text"
                      name="accessKey"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-300"
                      placeholder="E.G. OP-44"
                      value={formData.accessKey}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary text-white p-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {submitting ? "Applying Changes..." : "Update Registry"}
                </button>
              </form>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default EditEmployeePage;
