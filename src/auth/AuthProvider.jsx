import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const handleAuthError = (error) => {
      console.error("Auth error:", error);
      setError(error.message || "Authentication failed");
    };

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) handleAuthError(error);
      if (mounted) {
        setSession(data?.session ?? null);
        setError(null);
        setLoading(false);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) {
        setSession(newSession ?? null);
        setError(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.subscription?.unsubscribe?.();
    };
  }, []);

  const contextValue = useMemo(() => ({
    user: session?.user ?? null,
    session,
    loading,
    error,
    signOut: async () => {
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("signOut error:", error);
        setError(error.message || "Sign out failed");
      }
    }
  }), [session, loading, error]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
