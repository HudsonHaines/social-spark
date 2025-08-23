import React, { useRef, useState } from 'react';
import { useProfile } from './ProfileProvider';

export default function ProfilePanel() {
  const { profile, loading, save, uploadAvatar } = useProfile();
  const [name, setName] = useState(profile?.display_name || '');
  const fileRef = useRef(null);

  React.useEffect(() => { setName(profile?.display_name || ''); }, [profile?.display_name]);

  if (loading) return <div className="p-4 text-sm">Loading profile...</div>;

  return (
    <div className="bg-white border rounded-2xl p-4">
      <div className="text-lg font-semibold mb-3">Profile</div>
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-slate-200 overflow-hidden">
          {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : null}
        </div>
        <div className="flex-1">
          <label className="text-xs text-slate-500">Display name</label>
          <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="text-xs text-slate-500 mt-1">User ID: {profile?.id}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4">
        <button className="btn" onClick={async () => { await save({ display_name: name, avatar_url: profile?.avatar_url || null }); }}>Save</button>
        <button className="btn-outline" onClick={() => fileRef.current?.click()}>Change avatar</button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) await uploadAvatar(f);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
