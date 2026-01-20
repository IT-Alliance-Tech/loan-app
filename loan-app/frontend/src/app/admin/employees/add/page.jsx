"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "../../../../components/AuthGuard";
import Navbar from "../../../../components/Navbar";
import Sidebar from "../../../../components/Sidebar";
import { useToast } from "../../../../context/ToastContext";
import { createEmployee } from "../../../../services/userService";

const AddEmployeePage = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const [step, setStep] = useState(1); // 1: Details, 2: Preview
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
    accessKey: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = (e) => {
    e.preventDefault();
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await createEmployee(formData);
      showToast("Employee authorized successfully", "success");
      router.push("/admin/employees");
    } catch (err) {
      showToast(err.message || "Failed to create employee", "error");
      setStep(1);
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
                  Authorize Operator
                </h1>
                <p className="text-slate-500 font-medium text-sm">
                  Step {step} of 2:{" "}
                  {step === 1 ? "Credential Entry" : "Final Review"}
                </p>
              </div>

              {step === 1 ? (
                <form
                  onSubmit={handleNext}
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
                        Secure Password
                      </label>
                      <input
                        type="password"
                        name="password"
                        required
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
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
                    className="w-full bg-primary text-white p-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all"
                  >
                    Next: Review Credentials
                  </button>
                </form>
              ) : (
                <div className="space-y-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          Name
                        </p>
                        <p className="text-lg font-black text-slate-900 uppercase">
                          {formData.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          Role
                        </p>
                        <span className="inline-flex px-3 py-1 bg-blue-50 text-primary text-[10px] font-black uppercase rounded-lg border border-blue-100">
                          {formData.role}
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Email
                      </p>
                      <p className="font-bold text-slate-700">
                        {formData.email}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Access Key
                      </p>
                      <p className="font-bold text-slate-700 uppercase">
                        {formData.accessKey || "None Provided"}
                      </p>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-100 flex gap-4">
                    <button
                      onClick={handleBack}
                      className="flex-1 bg-slate-50 text-slate-400 p-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-100 hover:text-slate-600 transition-all"
                    >
                      Hold: Back to Edit
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="flex-[2] bg-emerald-600 text-white p-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all disabled:opacity-50"
                    >
                      {submitting ? "Committing..." : "Finalize Authorization"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default AddEmployeePage;
