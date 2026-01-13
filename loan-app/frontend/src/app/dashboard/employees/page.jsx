"use client";
import { useState, useEffect } from "react";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import {
  getEmployees,
  createEmployee,
  toggleEmployeeStatus,
} from "../../../services/userService";

const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await getEmployees();
      setEmployees(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleToggleStatus = async (id) => {
    try {
      await toggleEmployeeStatus(id);
      fetchEmployees();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await createEmployee(formData);
      setIsModalOpen(false);
      setFormData({ name: "", email: "", password: "" });
      fetchEmployees();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8 max-w-6xl mx-auto">
            <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                  Employee Management
                </h1>
                <p className="text-slate-500 font-medium text-sm">
                  System access control and personnel monitoring
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-primary text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                <span className="text-lg leading-none">+</span> Add Operator
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Operator Name
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Credential ID
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                        Protocol Level
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                        Registry Status
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                        Override
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="px-6 py-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest"
                        >
                          Synchronizing Registry...
                        </td>
                      </tr>
                    ) : employees.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="px-6 py-12 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest"
                        >
                          No active operators identified
                        </td>
                      </tr>
                    ) : (
                      employees.map((emp) => (
                        <tr
                          key={emp._id}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-6 py-4 font-black text-slate-900 uppercase text-xs tracking-tighter">
                            {emp.name}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-500 text-xs">
                            {emp.email}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-primary text-[9px] font-black uppercase border border-blue-100">
                              {emp.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {emp.isActive ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-tighter border border-emerald-100">
                                <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
                                Fully Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-400 text-[9px] font-black uppercase tracking-tighter border border-slate-200">
                                Suspended
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleToggleStatus(emp._id)}
                              className={`text-[9px] font-black uppercase tracking-widest transition-all ${
                                emp.isActive
                                  ? "text-red-500 hover:text-red-600"
                                  : "text-emerald-500 hover:text-emerald-600"
                              }`}
                            >
                              {emp.isActive ? "Deactivate" : "Authorize"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>

        {/* Create Employee Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                  Authorize New Operator
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-2xl font-black"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-[10px] font-black uppercase tracking-wider rounded-xl text-center">
                    Security Fault: {error}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
                    Registry Email
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
                    Secure Password
                  </label>
                  <input
                    type="password"
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                  />
                </div>

                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">
                    Authorization Note
                  </p>
                  <p className="text-[10px] font-bold text-slate-600 leading-relaxed uppercase">
                    New operators are defaulted to EMPLOYEE protocol level with
                    filtered terminal access.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary text-white p-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {submitting
                    ? "Processing Registry..."
                    : "Commit Authorization"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
};

export default EmployeesPage;
