// src/components/MenuDrawer.jsx
import React from "react";

export default function MenuDrawer({ open, onClose, onOpenBrandManager }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      {/* Backdrop */}
      <button
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />

      {/* Sheet */}
      <div className="absolute left-0 top-0 h-full w-[280px] bg-white border-r shadow-lg p-3 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Menu</div>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-slate-100">
            <svg className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" stroke="currentColor" fill="none">
              <path d="M6 6l12 12M18 6l-12 12" />
            </svg>
          </button>
        </div>

        <nav className="space-y-1">
          <button
            className="w-full text-left px-2 py-2 rounded hover:bg-slate-50"
            onClick={() => {
              onClose();
              onOpenBrandManager();
            }}
          >
            Brand Manager
            <div className="text-xs text-slate-500">Add, edit, and remove brands</div>
          </button>
          <button
  className="w-full text-left px-3 py-2 rounded hover:bg-slate-100"
  onClick={() => {
    onClose?.();
    onOpenDeckManager?.();
  }}
>
  Presentation Decks
</button>

          {/* Future options can go here */}
          {/* <button className="w-full text-left px-2 py-2 rounded hover:bg-slate-50">Settings</button> */}
        </nav>

        <div className="mt-auto pt-2 text-xs text-slate-400">
          v1
        </div>
      </div>
    </div>
  );
}
