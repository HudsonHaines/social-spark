import React, { createContext, useContext, useEffect, useRef, useState, useMemo, useCallback, memo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { handleSupabaseError, withRetry } from '../lib/supabaseUtils';
import {
  fetchProfile,
  ensureProfileExists,
  saveProfile as saveProfileApi,
  uploadAvatarFile,
} from '../data/profile';

const ProfileContext = createContext(null);

const ProfileProvider = memo(function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadingRef = useRef(false);
  const retryCountRef = useRef(0);

  const handleProfileError = useCallback((error, operation = 'profile') => {
    const supabaseError = handleSupabaseError(error, { operation });
    console.error('Profile error:', supabaseError);
    setError(supabaseError.userMessage);
    return supabaseError;
  }, []);

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
        retryCountRef.current = 0;
        return;
      }

      await withRetry(
        () => ensureProfileExists(),
        { maxRetries: 2, retryableErrors: ['network', 'timeout'] }
      );
      
      const profileData = await withRetry(
        () => fetchProfile(),
        { maxRetries: 2, retryableErrors: ['network', 'timeout'] }
      );
      
      setProfile(profileData);
      retryCountRef.current = 0; // Reset retry count on success
    } catch (error) {
      handleProfileError(error, 'loadProfile');
      setProfile(null);
      
      // Exponential backoff for retries
      if (retryCountRef.current < 3) {
        retryCountRef.current++;
        const retryDelay = Math.pow(2, retryCountRef.current) * 1000;
        setTimeout(() => loadProfile(session), retryDelay);
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [handleProfileError]);

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
    if (!profileData || typeof profileData !== 'object') {
      const error = new Error('Invalid profile data provided');
      handleProfileError(error, 'saveProfile');
      throw error;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const updated = await withRetry(
        () => saveProfileApi(profileData),
        { maxRetries: 2, retryableErrors: ['network', 'timeout'] }
      );
      
      setProfile(updated);
      return updated;
    } catch (error) {
      handleProfileError(error, 'saveProfile');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleProfileError]);

  const uploadAvatar = useCallback(async (file) => {
    // Validate file
    if (!file || !(file instanceof File)) {
      const error = new Error('Invalid file provided for avatar upload');
      handleProfileError(error, 'uploadAvatar');
      throw error;
    }
    
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      const error = new Error('File size must be less than 5MB');
      handleProfileError(error, 'uploadAvatar');
      throw error;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      const error = new Error('File must be an image');
      handleProfileError(error, 'uploadAvatar');
      throw error;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const url = await withRetry(
        () => uploadAvatarFile(file),
        { maxRetries: 2, retryableErrors: ['network', 'timeout'] }
      );
      
      const updated = await saveProfile({ 
        display_name: profile?.display_name || 'User', 
        avatar_url: url 
      });
      
      return updated;
    } catch (error) {
      handleProfileError(error, 'uploadAvatar');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [profile?.display_name, saveProfile, handleProfileError]);

  const contextValue = useMemo(() => ({
    profile,
    loading,
    error,
    saveProfile,
    uploadAvatar,
    // Helper methods
    clearError: () => setError(null),
    refreshProfile: () => loadProfile({ user: profile?.id ? { id: profile.id } : null }),
    hasProfile: !!profile,
  }), [profile, loading, error, saveProfile, uploadAvatar, loadProfile]);

  return <ProfileContext.Provider value={contextValue}>{children}</ProfileContext.Provider>;
});

export default ProfileProvider;
export { ProfileProvider };

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within <ProfileProvider>');
  return ctx;
}
