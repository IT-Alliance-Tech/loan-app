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
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="card max-w-md w-full p-10">
        <div className="mb-8 text-center flex flex-col items-center">
          <Logo className="mb-6" size="lg" />
          <div className="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-widest text-[#dc2626] uppercase bg-red-50 rounded-full">
            Square Finance Security
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">
            Internal Portal
          </h1>
          <p className="text-secondary mt-2 text-sm font-medium">
            Secure System Login
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2 tracking-wide">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="e.g. admin@company.com"
              required
              suppressHydrationWarning
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Password
              </label>
              <button
                type="button"
                onClick={() => router.push("/admin/login/forgot-password")}
                className="text-[10px] font-bold text-primary uppercase hover:underline tracking-tight"
                suppressHydrationWarning
              >
                Forgot?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pr-12"
                placeholder="••••••••"
                required
                suppressHydrationWarning
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
                suppressHydrationWarning
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2 tracking-wide">
              Access Key
            </label>
            <div className="relative">
              <input
                type={showAccessKey ? "text" : "password"}
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                className="input-field border-primary/30 bg-blue-50/30 pr-12"
                placeholder="••••••••"
                suppressHydrationWarning
              />
              <button
                type="button"
                onClick={() => setShowAccessKey(!showAccessKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors p-1"
                aria-label={
                  showAccessKey ? "Hide access key" : "Show access key"
                }
                suppressHydrationWarning
              >
                {showAccessKey ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3.5 rounded-lg disabled:opacity-50 mt-4"
            suppressHydrationWarning
          >
            {loading ? "Verifying Credentials..." : "Sign In to Dashboard"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Square Finance Management System © 2026
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
