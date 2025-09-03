import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useProfile } from "./ProfileProvider";
import ProfileSettingsModal from "./ProfileSettingsModal";
import ChangePasswordModal from "./ChangePasswordModal";
import OrganizationManager from "../organizations/OrganizationManager";

export default function ProfileButton() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [organizationModalOpen, setOrganizationModalOpen] = useState(false);
  const ref = useRef(null);

  const displayName = profile?.display_name;
  const userLabel = displayName || user?.email || "Guest";
  const isOAuthUser = user?.app_metadata?.provider !== 'email';

  const handleSignOut = useCallback(() => {
    signOut();
    setOpen(false);
  }, [signOut]);

  const handleProfileSettings = useCallback(() => {
    setProfileModalOpen(true);
    setOpen(false);
  }, []);


  const handleChangePassword = useCallback(() => {
    setPasswordModalOpen(true);
    setOpen(false);
  }, []);

  const handleOrganizations = useCallback(() => {
    setOrganizationModalOpen(true);
    setOpen(false);
  }, []);

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
        <div className="absolute right-0 mt-2 w-48 bg-white border border-app rounded-lg shadow-lg z-50">
          <div className="px-3 py-2 border-b border-app">
            {user ? (
              <div>
                {displayName && (
                  <div className="text-sm font-medium text-app-strong">{displayName}</div>
                )}
                <div className="text-xs text-app-muted">{user.email}</div>
              </div>
            ) : (
              <div className="text-sm text-app-muted">Not signed in</div>
            )}
          </div>

          {user ? (
            <div className="py-1">
              <button onClick={handleProfileSettings} className="w-full text-left px-3 py-2 text-sm hover:bg-app-muted transition">
                Profile Settings
              </button>
              {!isOAuthUser && (
                <button onClick={handleChangePassword} className="w-full text-left px-3 py-2 text-sm hover:bg-app-muted transition">
                  Change Password
                </button>
              )}
              <button onClick={handleOrganizations} className="w-full text-left px-3 py-2 text-sm hover:bg-app-muted transition">
                Organizations
              </button>
              <div className="border-t border-app mt-1 pt-1">
                <button onClick={handleSignOut} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition">
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="px-3 py-2 text-sm text-app-body">Please sign in</div>
          )}
        </div>
      )}

      <ProfileSettingsModal 
        open={profileModalOpen} 
        onClose={() => setProfileModalOpen(false)} 
      />
      
      <ChangePasswordModal 
        open={passwordModalOpen} 
        onClose={() => setPasswordModalOpen(false)} 
      />
      
      <OrganizationManager
        open={organizationModalOpen}
        onClose={() => setOrganizationModalOpen(false)}
      />
    </div>
  );
}
