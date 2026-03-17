"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "../../../services/auth.service";
import { useToast } from "../../../context/ToastContext";
import Logo from "../../../components/Logo";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showAccessKey, setShowAccessKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password, accessKey);
      showToast("Welcome back! Authentication successful.", "success");
      router.push("/admin/dashboard");
    } catch (err) {
      showToast(err.message || "Authentication failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const EyeIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );

  const EyeOffIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>
  );

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-900">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[20%] right-[15%] w-[15%] h-[15%] bg-blue-400/10 rounded-full blur-[80px]"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>

      <div className="relative z-10 w-full max-w-md px-4 py-12 animate-fade-in">
        <div className="glass backdrop-blur-2xl bg-white/80 border border-white/20 rounded-[2.5rem] shadow-2xl p-8 sm:p-12 transition-all hover:shadow-blue-500/10 hover:border-blue-500/20 group">
          <div className="mb-10 text-center flex flex-col items-center">
            <div className="mb-6 p-4 bg-white rounded-2xl shadow-sm border border-slate-100 group-hover:scale-105 transition-transform duration-500">
              <Logo size="md" />
            </div>
            <div className="inline-block px-4 py-1.5 mb-5 text-[10px] font-black tracking-[0.2em] text-blue-600 uppercase bg-blue-50/50 rounded-full border border-blue-100/50">
              Square Finance Security
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
              Internal Portal
            </h1>
            <p className="text-slate-500 mt-3 text-sm font-semibold tracking-wide flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Secure Authentication Required
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-[0.15em] ml-1">
                Registry Email
              </label>
              <div className="relative group/input">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300 placeholder:font-bold uppercase"
                  placeholder="e.g. administrator@sf.com"
                  required
                />
                <div className="absolute inset-y-0 right-4 flex items-center text-slate-300 group-focus-within/input:text-blue-500 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center mb-1.5 ml-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                  Security Password
                </label>
                <button
                  type="button"
                  onClick={() => router.push("/admin/login/forgot-password")}
                  className="text-[9px] font-black text-blue-600 uppercase hover:text-blue-800 transition-colors tracking-widest bg-blue-50 px-2 py-0.5 rounded"
                >
                  Retrieve?
                </button>
              </div>
              <div className="relative group/input">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500 transition-all p-1"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-[0.15em] ml-1">
                Administrator Access Key
              </label>
              <div className="relative group/input">
                <input
                  type={showAccessKey ? "text" : "password"}
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  className="w-full px-5 py-4 bg-blue-50/30 border border-blue-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-bold text-slate-700 placeholder:text-blue-200"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowAccessKey(!showAccessKey)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-200 hover:text-blue-500 transition-all p-1"
                >
                  {showAccessKey ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group/btn overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 transition-all group-hover:scale-105 active:scale-95 duration-300"></div>
              <div className="relative py-4 w-full flex items-center justify-center gap-3 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-500/25">
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Executing...
                  </>
                ) : (
                  <>
                    Initialize Dashboard
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </div>
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col items-center">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.25em]">
              Square Finance <span className="text-slate-300">v4.0.2</span>
            </p>
            <p className="text-[9px] text-slate-300 mt-2 font-bold uppercase tracking-widest">
              Digital Assets Secured by IT Alliance Tech
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
