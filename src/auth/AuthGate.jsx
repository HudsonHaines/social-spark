// src/auth/AuthGate.jsx
import React from "react";
import { LogIn, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./AuthProvider";

export default function AuthGate({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Checking session…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return children;
}

function LoginScreen() {
  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          // keep it simple; add scopes here if needed
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white border shadow-sm rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl grid place-items-center bg-slate-900 text-white">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-semibold">Social Mockup Builder</div>
                <div className="text-sm text-slate-500">Sign in to continue</div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-4">
            <p className="text-sm text-slate-600">
              Create realistic Facebook and Instagram mockups, save decks, and present to clients.
            </p>

            <button onClick={handleGoogle} className="btn w-full justify-center">
              <LogIn className="w-4 h-4 mr-2" />
              Continue with Google
            </button>

            <div className="text-xs text-slate-500 text-center">
              By continuing, you agree to the terms.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 mt-4">
          © {new Date().getFullYear()} Social Mockup Builder
        </div>
      </div>
    </div>
  );
}
