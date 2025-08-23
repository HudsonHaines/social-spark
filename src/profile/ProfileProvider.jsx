import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  fetchProfile,
  ensureProfileExists,
  saveProfile as saveProfileApi,
  uploadAvatarFile,
} from '../data/profile';

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // prevent overlapping loads when auth fires multiple events
  const loadingGuard = useRef(false);

  async function loadForSession(session, source = 'unknown') {
    // Always end with setLoading(false) even on early returns
    setLoading(true);
    if (loadingGuard.current) {
      // another load is running; let it complete
      return;
    }
    loadingGuard.current = true;
    try {
      const user = session?.user || null;

      if (!user) {
        setProfile(null);
        return; // finally will flip loading off
      }

      // Ensure row exists; then fetch fresh profile
      await ensureProfileExists();
      const p = await fetchProfile();
      setProfile(p);
    } catch (e) {
      console.error(`[profile] load error (${source}):`, e);
      // keep UI usable even on errors
      setProfile(null);
    } finally {
      loadingGuard.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    // 1) Load once using the current session
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      await loadForSession(session, 'getSession');
    })();

    // 2) React to future auth changes (sign-in / sign-out / token refresh)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // We don’t trust event order; always load for the provided session
      loadForSession(session, _event);
    });

    return () => {
      active = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  async function save(next) {
    // make sure we never leave loading stuck
    setLoading(true);
    try {
      const updated = await saveProfileApi(next);
      setProfile(updated);
      return updated;
    } catch (e) {
      console.error('[profile] save error:', e);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  async function uploadAvatar(file) {
    setLoading(true);
    try {
      const url = await uploadAvatarFile(file);
      const updated = await save({ display_name: profile?.display_name || 'User', avatar_url: url });
      return updated;
    } finally {
      setLoading(false);
    }
  }

  const value = { profile, loading, setProfile, save, uploadAvatar };
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within <ProfileProvider>');
  return ctx;
}
