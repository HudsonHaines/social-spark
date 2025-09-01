import React, { createContext, useContext, useEffect, useState, useMemo, memo, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { handleSupabaseError, withRetry } from "../lib/supabaseUtils";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const AuthProvider = memo(function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleAuthError = useCallback((error) => {
    const supabaseError = handleSupabaseError(error, { operation: 'auth' });
    console.error('Auth error:', supabaseError);
    setError(supabaseError.userMessage);
  }, []);

  const initializeAuth = useCallback(async () => {
    try {
      const { data, error } = await withRetry(
        () => supabase.auth.getSession(),
        { maxRetries: 2, retryableErrors: ['network', 'timeout'] }
      );
      
      if (error) {
        handleAuthError(error);
        return;
      }
      
      setSession(data?.session ?? null);
      setError(null);
    } catch (error) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  useEffect(() => {
    let mounted = true;

    initializeAuth();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) {
        setSession(newSession ?? null);
        if (newSession) {
          setError(null); // Clear errors on successful auth
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.subscription?.unsubscribe?.();
    };
  }, [initializeAuth]);

  const signOut = useCallback(async () => {
    setError(null);
    setLoading(true);
    
    try {
      const { error } = await withRetry(
        () => supabase.auth.signOut(),
        { maxRetries: 2, retryableErrors: ['network', 'timeout'] }
      );
      
      if (error) {
        throw error;
      }
      
      setSession(null);
    } catch (error) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);
  
  const contextValue = useMemo(() => ({
    user: session?.user ?? null,
    session,
    loading,
    error,
    signOut,
    // Helper methods
    clearError: () => setError(null),
    isAuthenticated: !!session?.user,
    refreshAuth: initializeAuth,
  }), [session, loading, error, signOut, initializeAuth]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
});

export { AuthProvider };
export default AuthProvider;
