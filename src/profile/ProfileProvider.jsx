import React, { createContext, useContext, useEffect, useRef, useState, useMemo, useCallback } from 'react';
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
  const [error, setError] = useState(null);

  const loadingRef = useRef(false);

  const loadProfile = useCallback(async (session) => {
    if (loadingRef.current) {
      return;
    }
    
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      const user = session?.user || null;
      if (!user) {
        setProfile(null);
        return;
      }

      await ensureProfileExists();
      const profileData = await fetchProfile();
      setProfile(profileData);
    } catch (err) {
      console.error('Profile load error:', err);
      setError(err.message || 'Failed to load profile');
      setProfile(null);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      await loadProfile(session);
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        loadProfile(session);
      }
    });

    return () => {
      active = false;
      subscription?.subscription?.unsubscribe();
    };
  }, [loadProfile]);

  const saveProfile = useCallback(async (profileData) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await saveProfileApi(profileData);
      setProfile(updated);
      return updated;
    } catch (err) {
      console.error('Profile save error:', err);
      setError(err.message || 'Failed to save profile');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadAvatar = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    try {
      const url = await uploadAvatarFile(file);
      const updated = await saveProfile({ 
        display_name: profile?.display_name || 'User', 
        avatar_url: url 
      });
      return updated;
    } catch (err) {
      setError(err.message || 'Failed to upload avatar');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [profile?.display_name, saveProfile]);

  const contextValue = useMemo(() => ({
    profile,
    loading,
    error,
    saveProfile,
    uploadAvatar,
  }), [profile, loading, error, saveProfile, uploadAvatar]);

  return <ProfileContext.Provider value={contextValue}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within <ProfileProvider>');
  return ctx;
}
