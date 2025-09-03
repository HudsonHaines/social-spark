// src/components/MenuDrawer.jsx
import React, { useEffect } from "react";
import { useProfile } from "../profile/ProfileProvider";

export default function MenuDrawer({
  open,
  onClose,
  onOpenDeckManager, // go to Decks page
  onOpenBrandsPage,  // go to Brands page
  onOpenShareLinks,  // go to Share Links page
  onOpenCreate,      // go to Create/Editor page
}) {
  const { profile } = useProfile();
  const displayName = profile?.display_name;
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div id="app-menu-drawer" className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <aside
        role="dialog"
        aria-modal="true"
        className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-xl border-r
                   transform transition-transform duration-200 ease-out translate-x-0"
      >
        <div className="flex items-center justify-between px-4 h-14 border-b">
          <div className="flex items-center gap-2">
            <img 
              src="/social-spark-logo.png" 
              alt="Social Spark" 
              className="w-5 h-5"
            />
            <div>
              <div className="font-medium">Social Spark</div>
              {displayName && (
                <div className="text-xs text-gray-500">{displayName}</div>
              )}
            </div>
          </div>
          <button className="btn-outline" onClick={onClose} aria-label="Close menu">
            Close
          </button>
        </div>

        <nav className="p-3 space-y-1">
          <button
            className="w-full text-left px-3 py-2 rounded hover:bg-slate-100 font-medium"
            onClick={() => {
              onOpenCreate?.();
              onClose?.();
            }}
          >
            Create
          </button>

          <button
            className="w-full text-left px-3 py-2 rounded hover:bg-slate-100"
            onClick={() => {
              onOpenDeckManager?.();
              onClose?.();
            }}
          >
            Decks
          </button>

          <button
            className="w-full text-left px-3 py-2 rounded hover:bg-slate-100"
            onClick={() => {
              onOpenBrandsPage?.();
              onClose?.();
            }}
          >
            Brands
          </button>

          <button
            className="w-full text-left px-3 py-2 rounded hover:bg-slate-100"
            onClick={() => {
              onOpenShareLinks?.();
              onClose?.();
            }}
          >
            Share Links
          </button>
        </nav>
      </aside>
    </div>
  );
}
