// src/profile/ProfileButton.jsx
import React, { useState, useRef, useEffect } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

function getDisplay(user) {
  if (!user) return { name: "Guest", email: "", avatar: "" };
  const meta = user.user_metadata || {};
  const name =
    meta.full_name ||
    meta.name ||
    meta.user_name ||
    meta.preferred_username ||
    "";
  const email = user.email || "";
  const avatar = meta.avatar_url || meta.picture || "";
  return { name: name || email || "Account", email, avatar };
}

export default function ProfileButton({ user }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const { name, email, avatar } = getDisplay(user);

  useEffect(() => {
    const onDoc = (e) => {
      if (!btnRef.current) return;
      if (!btnRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    // Supabase AuthProvider should handle UI update on sign out
  };

  return (
    <div className="relative" ref={btnRef}>
      <button
        type="button"
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100"
        onClick={() => setOpen((s) => !s)}
      >
        <div className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center">
          {avatar ? (
            <img src={avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs text-slate-600">
              {(name || email || "A").slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <span className="text-sm max-w-[140px] truncate">
          {name || email || "Account"}
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-56 bg-white border rounded-xl shadow-lg p-2 z-50">
          <div className="px-2 py-2">
            <div className="text-sm font-medium truncate">{name || "Account"}</div>
            {email ? <div className="text-xs text-slate-500 truncate">{email}</div> : null}
          </div>
          <div className="h-px bg-slate-200 my-1" />
          <button
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 text-sm"
            onClick={signOut}
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
