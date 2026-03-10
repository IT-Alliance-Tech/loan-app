"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  forgotPassword,
  resetPassword,
} from "../../../../services/auth.service";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState(1); // 1: Email, 2: OTP/New Password
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(120); // 120 seconds for 2 minutes
  const [canResend, setCanResend] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let interval;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault(); // Only prevent default if event object exists (i.e., from form submission)
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email);
      setStep(2);
      setTimer(120);
      setCanResend(false);
      setMessage("OTP has been sent to your email.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (timer === 0 && !canResend) {
      // Check if timer is 0 and resend was not clicked
      setError("OTP has expired. Please request a new one.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email, otp, newPassword);
      setMessage("Password reset successful. Redirecting...");
      setTimeout(() => router.push("/admin/login"), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="card max-w-md w-full p-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-slate-900">
            Reset Password
          </h1>
          <p className="text-secondary mt-2 text-sm font-medium">
            Follow the steps to regain access
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold uppercase">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 text-xs font-bold uppercase">
            {message}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestOtp} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                Registered Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                required
                suppressHydrationWarning
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3.5 rounded-lg"
              suppressHydrationWarning
            >
              {loading ? "Requesting..." : "Send Reset OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                Enter 6-Digit OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="input-field"
                required
                suppressHydrationWarning
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                New Secure Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-field"
                required
                suppressHydrationWarning
              />
            </div>
            <div className="flex flex-col items-center space-y-3">
              <div
                className={`text-sm font-bold ${timer < 30 ? "text-red-500 animate-pulse" : "text-slate-600"}`}
              >
                {timer > 0
                  ? `OTP expires in: ${formatTime(timer)}`
                  : "OTP Expired"}
              </div>

              {canResend && (
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  className="text-xs font-bold text-primary uppercase hover:underline"
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Resend OTP"}
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || timer === 0}
              className={`w-full btn-primary py-3.5 rounded-lg ${loading || timer === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
              suppressHydrationWarning
            >
              {loading ? "Resetting..." : "Update Password"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push("/admin/login")}
            className="text-xs font-bold text-primary uppercase hover:underline"
            suppressHydrationWarning
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
