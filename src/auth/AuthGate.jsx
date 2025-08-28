import React from "react";
import { useAuth } from "./AuthProvider";
import SignInPanel from "./SignInPanel";

export default function AuthGate({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="panel p-6">Loading…</div>
      </div>
    );
  }

  if (!user) return <SignInPanel />;

  return children;
}
