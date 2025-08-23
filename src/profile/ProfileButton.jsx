// src/profile/ProfileButton.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useProfile } from './ProfileProvider';
import { supabase } from '../lib/supabaseClient';

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4"/>
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4"/>
    </svg>
  );
}

export default function ProfileButton() {
  const { profile, loading, save, uploadAvatar } = useProfile();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(profile?.display_name || '');
  const btnRef = useRef(null);
  const popRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => { setName(profile?.display_name || ''); }, [profile?.display_name]);

  // click outside to close
  useEffect(() => {
    function onDocClick(e) {
      if (!open) return;
      const t = e.target;
      if (btnRef.current?.contains(t)) return;
      if (popRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const avatar = profile?.avatar_url;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 relative z-[60]"
        onClick={() => setOpen(o => !o)}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Profile"
      >
        <div className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden">
          {avatar ? <img src={avatar} className="w-full h-full object-cover" /> : null}
        </div>
        <span className="text-sm">
          {loading ? <span className="inline-flex items-center gap-1"><Spinner/> Loading</span> : (profile?.display_name || 'Profile')}
        </span>
      </button>

      {open ? (
        <div
          ref={popRef}
          className="absolute right-0 mt-2 w-72 bg-white border rounded-xl shadow p-3 z-[70]"
          role="menu"
        >
          <div className="text-sm font-semibold mb-2">Your profile</div>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden">
              {avatar ? <img src={avatar} className="w-full h-full object-cover" /> : null}
            </div>
            <div className="flex-1">
              <input
                className="input w-full"
                placeholder="Display name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <div className="text-xs text-slate-500 mt-1 truncate">{profile?.id}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="btn"
              onClick={async () => {
                await save({ display_name: name, avatar_url: avatar || null });
                setOpen(false);
              }}
            >
              Save
            </button>

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

            <button
              className="btn-outline ml-auto"
              onClick={async () => { await supabase.auth.signOut(); setOpen(false); }}
            >
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
