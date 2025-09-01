import React, { useRef, useState, useCallback } from 'react';
import { useProfile } from './ProfileProvider';

export default function ProfilePanel() {
  const { profile, loading, error, saveProfile, uploadAvatar } = useProfile();
  const [name, setName] = useState(profile?.display_name || '');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  React.useEffect(() => {
    setName(profile?.display_name || '');
  }, [profile?.display_name]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveProfile({ 
        display_name: name, 
        avatar_url: profile?.avatar_url || null 
      });
    } catch (err) {
      // Error is handled in ProfileProvider
    } finally {
      setSaving(false);
    }
  }, [name, profile?.avatar_url, saveProfile]);

  const handleAvatarChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await uploadAvatar(file);
      } catch (err) {
        // Error is handled in ProfileProvider
      }
    }
    e.target.value = '';
  }, [uploadAvatar]);

  if (loading) return <div className="p-4 text-sm">Loading profile...</div>;

  return (
    <div className="bg-white border rounded-2xl p-4">
      <div className="text-lg font-semibold mb-3">Profile</div>
      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-slate-200 overflow-hidden">
          {profile?.avatar_url && (
            <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
          )}
        </div>
        <div className="flex-1">
          <label className="text-xs text-slate-500">Display name</label>
          <input 
            className="input w-full" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            disabled={loading || saving}
          />
          <div className="text-xs text-slate-500 mt-1">User ID: {profile?.id}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4">
        <button 
          className="btn" 
          onClick={handleSave}
          disabled={loading || saving}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button 
          className="btn-outline" 
          onClick={() => fileRef.current?.click()}
          disabled={loading}
        >
          Change avatar
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>
    </div>
  );
}
