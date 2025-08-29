// src/components/TopBar.jsx
import React from "react";
import { Image as ImageIcon, FolderOpen, PlusSquare, User, Menu } from "lucide-react";
import ProfileButton from "../profile/ProfileButton";

const cx = (...a) => a.filter(Boolean).join(" ");

export default function TopBar({
  platform = "facebook",
  setPlatform = () => {},
  mode = "create",
  setMode = () => {},
  onExportPNG = () => {},
  onOpenMenu = () => {},
  openDeckManager = null,
  openDeckPicker = null,
  user = null,
}) {
  const Btn = ({ active, children, onClick }) => (
    <button
      className={cx(
        "px-3 py-1.5 rounded-md border text-sm",
        active ? "bg-app-strong text-white border-app" : "bg-white hover:bg-slate-50"
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );

  return (
    <header className="border-b bg-white">
      <div className="container-tight h-14 flex items-center gap-3">
        {/* Left cluster */}
         <button
            className="p-2 rounded hover:bg-slate-100"
            onClick={onOpenMenu}
            aria-label="Menu"
            aria-expanded="true"
            aria-controls="app-menu-drawer"
          >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <Btn active={platform === "facebook"} onClick={() => setPlatform("facebook")}>
            Facebook
          </Btn>
          <Btn active={platform === "instagram"} onClick={() => setPlatform("instagram")}>
            Instagram
          </Btn>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <Btn active={mode === "create"} onClick={() => setMode("create")}>
            Create
          </Btn>
          <Btn active={mode === "present"} onClick={() => setMode("present")}>
            Present
          </Btn>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          <button
            className="btn-outline hidden sm:inline-flex"
            onClick={openDeckManager || (() => {})}
            title="Open Deck Manager"
          >
            <FolderOpen className="w-4 h-4 mr-1" />
            Decks
          </button>

          <button
            className="btn-outline hidden sm:inline-flex"
            onClick={openDeckPicker || (() => {})}
            title="Save current post to a deck"
          >
            <PlusSquare className="w-4 h-4 mr-1" />
            Save to deck
          </button>

          <button className="btn-outline" onClick={onExportPNG} title="Export PNG">
            <ImageIcon className="w-4 h-4 mr-1" />
            Export
          </button>

          <div className="h-6 w-px bg-slate-200 mx-1" />

          {/* Use your existing ProfileButton for sign in/out */}
          <ProfileButton />
        </div>
      </div>
    </header>
  );
}
