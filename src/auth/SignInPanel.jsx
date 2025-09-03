import React, { useState, memo, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { handleSupabaseError, withRetry } from "../lib/supabaseUtils";
import { Mail, Chrome, KeyRound } from "lucide-react";

const SignInPanel = memo(function SignInPanel() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [authMode, setAuthMode] = useState('options'); // options, magic-link, email-password, signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Google OAuth sign in
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

  // Magic link sign in
  const signInWithMagicLink = useCallback(async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin,
        }
      });

      if (error) throw error;

      setSuccess('Check your email for the magic link!');
      setEmail('');
    } catch (err) {
      const supabaseError = handleSupabaseError(err, { operation: 'magicLink' });
      console.error('Magic link error:', supabaseError);
      setError(supabaseError.userMessage || 'Failed to send magic link');
    } finally {
      setBusy(false);
    }
  }, [email]);

  // Email/password sign in
  const signInWithPassword = useCallback(async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) throw error;

      // Success - user will be automatically redirected
    } catch (err) {
      const supabaseError = handleSupabaseError(err, { operation: 'passwordSignIn' });
      console.error('Password sign in error:', supabaseError);
      setError(supabaseError.userMessage || 'Invalid email or password');
      setBusy(false);
    }
  }, [email, password]);

  // Sign up with email/password
  const signUpWithPassword = useCallback(async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          emailRedirectTo: window.location.origin,
        }
      });

      if (error) throw error;

      setSuccess('Account created! Check your email to verify your account.');
      setEmail('');
      setPassword('');
      setTimeout(() => setAuthMode('options'), 3000);
    } catch (err) {
      const supabaseError = handleSupabaseError(err, { operation: 'signUp' });
      console.error('Sign up error:', supabaseError);
      setError(supabaseError.userMessage || 'Failed to create account');
      setBusy(false);
    }
  }, [email, password]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="panel max-w-sm w-full p-6">
        <div className="flex justify-center mb-4">
          <img 
            src="/social-spark-logo.png" 
            alt="Social Spark" 
            className="w-12 h-12"
          />
        </div>
        <h1 className="h2 mb-2 text-center">
          {authMode === 'signup' ? 'Create Account' : 'Sign In'}
        </h1>
        <p className="muted mb-6 text-center">
          {authMode === 'options' && 'Choose your preferred sign in method'}
          {authMode === 'magic-link' && 'Enter your email to receive a magic link'}
          {authMode === 'email-password' && 'Sign in with your email and password'}
          {authMode === 'signup' && 'Create a new account with email and password'}
        </p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            {success}
          </div>
        )}

        {authMode === 'options' && (
          <div className="space-y-3">
            <button 
              className="btn w-full flex items-center justify-center gap-2" 
              onClick={signInWithGoogle} 
              disabled={busy}
            >
              <Chrome className="w-4 h-4" />
              {busy ? "Redirecting..." : "Continue with Google"}
            </button>
            
            <button 
              className="btn-outline w-full flex items-center justify-center gap-2" 
              onClick={() => setAuthMode('magic-link')}
              disabled={busy}
            >
              <Mail className="w-4 h-4" />
              Sign in with Magic Link
            </button>
            
            <button 
              className="btn-outline w-full flex items-center justify-center gap-2" 
              onClick={() => setAuthMode('email-password')}
              disabled={busy}
            >
              <KeyRound className="w-4 h-4" />
              Sign in with Password
            </button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">New user?</span>
              </div>
            </div>
            
            <button 
              className="text-sm text-blue-600 hover:text-blue-800 w-full"
              onClick={() => setAuthMode('signup')}
              disabled={busy}
            >
              Create an account
            </button>
          </div>
        )}

        {(authMode === 'magic-link' || authMode === 'email-password' || authMode === 'signup') && (
          <div className="space-y-3">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
                disabled={busy}
              />
            </div>

            {(authMode === 'email-password' || authMode === 'signup') && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={authMode === 'signup' ? "Min 6 characters" : "••••••••"}
                  disabled={busy}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (authMode === 'signup') signUpWithPassword();
                      else if (authMode === 'email-password') signInWithPassword();
                    }
                  }}
                />
              </div>
            )}

            <button
              className="btn w-full"
              onClick={() => {
                if (authMode === 'magic-link') signInWithMagicLink();
                else if (authMode === 'email-password') signInWithPassword();
                else if (authMode === 'signup') signUpWithPassword();
              }}
              disabled={busy}
            >
              {busy ? 'Processing...' : 
                authMode === 'magic-link' ? 'Send Magic Link' :
                authMode === 'signup' ? 'Create Account' : 'Sign In'
              }
            </button>

            <button
              className="btn-outline w-full"
              onClick={() => {
                setAuthMode('options');
                setEmail('');
                setPassword('');
                setError(null);
                setSuccess(null);
              }}
              disabled={busy}
            >
              Back to options
            </button>

            {authMode === 'email-password' && (
              <button
                className="text-sm text-blue-600 hover:text-blue-800 w-full"
                onClick={() => setAuthMode('signup')}
                disabled={busy}
              >
                Don't have an account? Sign up
              </button>
            )}

            {authMode === 'signup' && (
              <button
                className="text-sm text-blue-600 hover:text-blue-800 w-full"
                onClick={() => setAuthMode('email-password')}
                disabled={busy}
              >
                Already have an account? Sign in
              </button>
            )}
          </div>
        )}
        
        <p className="text-xs text-app-muted mt-4 text-center">
          By signing in, you agree to our terms of service
        </p>
      </div>
    </div>
  );
});

export default SignInPanel;
