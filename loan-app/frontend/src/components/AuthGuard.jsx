'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '../utils/auth';

const AuthGuard = ({ children }) => {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/admin/login');
    } else {
      // Defer state update to avoid cascading render warning
      Promise.resolve().then(() => setAuthorized(true));
    }
  }, [router]);

  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-gray-500 font-medium">Loading...</div>
      </div>
    );
  }

  return children;
};

export default AuthGuard;
