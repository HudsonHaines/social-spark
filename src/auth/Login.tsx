import React, { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setBusy(false);
    setMsg(error ? error.message : "Check your email for a sign in link.");
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({ provider: "google" });
  }

  return (
    <div className="mx-auto mt-24 max-w-sm rounded-xl border bg-white p-6">
      <h1 className="mb-4 text-xl font-semibold">Sign in</h1>
      <form onSubmit={sendMagicLink} className="space-y-3">
        <input
          className="w-full rounded border p-2"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@work.com"
          required
        />
        <button
          className="w-full rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
          disabled={busy}
        >
          {busy ? "Sending..." : "Email me a link"}
        </button>
      </form>

      <div className="my-4 text-center text-sm text-gray-500">or</div>

      <button onClick={signInWithGoogle} className="w-full rounded border px-4 py-2">
        Continue with Google
      </button>

      {msg && <p className="mt-3 text-sm text-gray-700">{msg}</p>}
    </div>
  );
}
