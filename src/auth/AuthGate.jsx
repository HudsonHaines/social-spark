import React from 'react';
import { useAuth } from './AuthProvider';

export default function AuthGate({ children }) {
  const { user, loading, signInWithGoogle } = useAuth();

  if (loading) return <div className="p-6">Loading...</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white border rounded-xl shadow p-6 space-y-3">
          <h1 className="text-lg font-semibold">Sign in</h1>
          <button className="btn" onClick={signInWithGoogle}>Continue with Google</button>
        </div>
      </div>
    );
  }

  return children;
}
