'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '../../services/auth.service';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password, isAdmin ? accessKey : null);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="card max-w-md w-full p-10">
        <div className="mb-8 text-center">
          <div className="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-widest text-primary uppercase bg-blue-50 rounded-full">
            ILMRS Security
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Internal Portal</h1>
          <p className="text-secondary mt-2 text-sm font-medium">Secure System Login</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold uppercase tracking-tight">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center justify-center gap-6 mb-6">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="radio" 
                name="role" 
                checked={!isAdmin} 
                onChange={() => setIsAdmin(false)}
                className="w-4 h-4 text-primary border-slate-300 focus:ring-primary"
              />
              <span className={`text-xs font-bold uppercase tracking-wide ${!isAdmin ? 'text-primary' : 'text-slate-400'}`}>Employee</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="radio" 
                name="role" 
                checked={isAdmin} 
                onChange={() => setIsAdmin(true)}
                className="w-4 h-4 text-primary border-slate-300 focus:ring-primary"
              />
              <span className={`text-xs font-bold uppercase tracking-wide ${isAdmin ? 'text-primary' : 'text-slate-400'}`}>Super Admin</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2 tracking-wide">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="e.g. admin@company.com"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Password</label>
              <button 
                type="button"
                onClick={() => router.push('/login/forgot-password')}
                className="text-[10px] font-bold text-primary uppercase hover:underline tracking-tight"
              >
                Forgot?
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              required
            />
          </div>

          {isAdmin && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2 tracking-wide">Super Admin Access Key</label>
              <input
                type="password"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                className="input-field border-primary/30 bg-blue-50/30"
                placeholder="Enter Secure Key"
                required={isAdmin}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3.5 rounded-lg disabled:opacity-50 mt-4"
          >
            {loading ? 'Verifying Credentials...' : 'Sign In to Dashboard'}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Enterprise Loan Management System © 2026
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
