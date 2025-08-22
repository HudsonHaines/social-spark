import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type SBUser = { id: string; email?: string | null } | null;

type AuthShape = {
  user: SBUser;
  loading: boolean;
};
const AuthCtx = createContext<AuthShape>({ user: null, loading: true });
export const useAuth = () => useContext(AuthCtx);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SBUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return <AuthCtx.Provider value={{ user, loading }}>{children}</AuthCtx.Provider>;
};
