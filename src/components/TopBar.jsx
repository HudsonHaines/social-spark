import React from "react";
import ProfileButton from "../profile/ProfileButton";

const cx = (...a) => a.filter(Boolean).join("");

// Simple reusable Tabs component
function Tabs({ items, value, onChange }) {
  return (
    <div className="flex items-center bg-slate-100 rounded-xl p-1">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onChange(it.id)}
          className={cx(
            "px-3 py-1.5 rounded-lg text-sm capitalize transition-all",
            value === it.id ? "bg-white shadow font-medium" : "text-slate-600 hover:bg-slate-200"
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export default function TopBar({ platform, setPlatform, mode, setMode }) {
  return (
    <div className="w-full border-b bg-white/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left Logo / Title */}
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-slate-700"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle cx="6" cy="6" r="3" stroke="currentColor" />
            <circle cx="18" cy="6" r="3" stroke="currentColor" />
            <circle cx="6" cy="18" r="3" stroke="currentColor" />
            <circle cx="18" cy="18" r="3" stroke="currentColor" />
          </svg>
          <span className="font-semibold">Social Mockup Builder</span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Platform Tabs */}
          <Tabs
            value={platform}
            onChange={setPlatform}
            items={[
              { id: "facebook", label: "Facebook" },
              { id: "instagram", label: "Instagram" },
            ]}
          />

          <div className="w-px h-6 bg-slate-200 mx-1" />

          {/* Mode Tabs */}
          <Tabs
            value={mode}
            onChange={setMode}
            items={[
              { id: "create", label: "Create" },
              { id: "present", label: "Present" },
            ]}
          />

          <div className="w-px h-6 bg-slate-200 mx-1" />

          {/* Profile */}
          <ProfileButton />
        </div>
      </div>
    </div>
  );
}
