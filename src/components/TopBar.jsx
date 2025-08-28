// src/components/TopBar.jsx
import React from "react";
import ProfileButton from "../profile/ProfileButton";
import { Grid3X3 } from "lucide-react";

const cx = (...a) => a.filter(Boolean).join(" ");

function Tabs({ items, value, onChange = () => {} }) {
  return (
    <div className="tabset">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onChange(it.id)}
          data-active={value === it.id ? "true" : "false"}
          className="tabset-btn"
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export default function TopBar({
  platform,
  setPlatform = () => {},
  mode,
  setMode = () => {},
  onExportPNG,
  user,
  onOpenMenu = () => {},
}) {
  return (
    <div className="topbar">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left: hamburger + title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Open menu"
            onClick={onOpenMenu}
            className="p-2 rounded-[8px] hover:bg-app-muted"
          >
            <svg
              className="w-5 h-5 text-app-strong"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <line x1="4" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="2" />
              <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" />
              <line x1="4" y1="18" x2="20" y2="18" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-app-strong" aria-hidden="true" />
            <span className="font-semibold text-app-strong">Social Spark</span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          <Tabs
            value={platform}
            onChange={setPlatform}
            items={[
              { id: "facebook", label: "Facebook" },
              { id: "instagram", label: "Instagram" },
            ]}
          />

          <div className="w-px h-6" style={{ background: "var(--app-border)" }} />

          <Tabs
            value={mode}
            onChange={setMode}
            items={[
              { id: "create", label: "Create" },
              { id: "present", label: "Present" },
            ]}
          />

          <div className="w-px h-6" style={{ background: "var(--app-border)" }} />

          {onExportPNG ? (
            <button type="button" className="btn" onClick={onExportPNG} title="Export PNG">
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeWidth="2" />
                <polyline points="7 10 12 15 17 10" strokeWidth="2" />
                <line x1="12" y1="15" x2="12" y2="3" strokeWidth="2" />
              </svg>
              <span className="text-sm">Export PNG</span>
            </button>
          ) : null}

          <ProfileButton user={user} />
        </div>
      </div>
    </div>
  );
}
