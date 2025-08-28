import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function SignInPanel() {
  const [busy, setBusy] = useState(false);

  async function signInWithGoogle() {
    try {
      setBusy(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin, // http://localhost:5173 in dev
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error("OAuth error:", err);
      alert("Sign-in failed. Check console.");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="panel max-w-sm w-full p-6 text-center">
        <h1 className="h2 mb-2">Sign in</h1>
        <p className="muted mb-6">Use your Google account to continue.</p>
        <button className="btn w-full" onClick={signInWithGoogle} disabled={busy}>
          {busy ? "Redirecting..." : "Continue with Google"}
        </button>
        <p className="text-xs text-app-muted mt-3">
          Redirect URL must match your Supabase Auth settings.
        </p>
      </div>
    </div>
  );
}
