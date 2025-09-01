import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "../auth/AuthProvider";

export default function ProfileButton() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const userLabel = user?.email || "Guest";

  const handleSignOut = useCallback(() => {
    signOut();
    setOpen(false);
  }, [signOut]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="chip bg-app-surface hover:bg-app-muted border-app"
        title="Account menu"
      >
        <span className="truncate max-w-[160px]">{userLabel}</span>
        <svg
          className="w-3.5 h-3.5 ml-1 text-app-muted"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white border border-app rounded-lg shadow-lg z-50">
          <div className="px-3 py-2 border-b border-app text-sm text-app-muted">
            {user ? "Signed in" : "Not signed in"}
          </div>

          {user ? (
            <button onClick={handleSignOut} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-app-muted transition">
              Sign Out
            </button>
          ) : (
            <div className="px-3 py-2 text-sm text-app-body">Please sign in</div>
          )}
        </div>
      )}
    </div>
  );
}
