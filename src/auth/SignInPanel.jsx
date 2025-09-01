import React, { useState, memo, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { handleSupabaseError, withRetry } from "../lib/supabaseUtils";

const SignInPanel = memo(function SignInPanel() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const signInWithGoogle = useCallback(async () => {
    setBusy(true);
    setError(null);
    
    try {
      const { error } = await withRetry(
        () => supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: window.location.origin,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            }
          },
        }),
        { maxRetries: 2, retryableErrors: ['network', 'timeout'] }
      );
      
      if (error) throw error;
      
      // Success - OAuth redirect will happen automatically
    } catch (err) {
      const supabaseError = handleSupabaseError(err, { operation: 'googleOAuth' });
      console.error('OAuth error:', supabaseError);
      setError(supabaseError.userMessage);
      setBusy(false);
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="panel max-w-sm w-full p-6 text-center">
        <h1 className="h2 mb-2">Sign in</h1>
        <p className="muted mb-6">Use your Google account to continue.</p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
        
        <button 
          className="btn w-full" 
          onClick={signInWithGoogle} 
          disabled={busy}
          aria-describedby={error ? 'signin-error' : undefined}
        >
          {busy ? "Redirecting..." : "Continue with Google"}
        </button>
        
        {error && (
          <button
            className="btn-outline w-full mt-3"
            onClick={() => setError(null)}
            disabled={busy}
          >
            Try Again
          </button>
        )}
        
        <p className="text-xs text-app-muted mt-3">
          Redirect URL must match your Supabase Auth settings.
        </p>
      </div>
    </div>
  );
});

export default SignInPanel;
