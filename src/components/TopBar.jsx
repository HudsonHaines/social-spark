// src/components/TopBar.jsx
import React from "react";
import { Image as ImageIcon, FolderOpen, PlusSquare, Menu } from "lucide-react";
import ProfileButton from "../profile/ProfileButton";

export default function TopBar({
  mode = "create",
  setMode = () => {},
  onExportPNG = () => {},
  onOpenMenu = () => {},
  openDeckManager = null,
  openDeckPicker = null,
  user = null,
  // Add these props to handle present mode properly
  canPresent = false,
  onStartPresent = () => {},
  exportDisabled = false,
}) {
  const handlePresentClick = () => {
    if (mode === "present") {
      // Exit present mode
      setMode("create");
    } else {
      // Enter present mode - but only if we have posts to present
      if (canPresent) {
        onStartPresent();
      } else {
        alert("No posts to present. Add posts to your deck or open a saved deck first.");
      }
    }
  };

  return (
    <header className="border-b bg-white h-12">
      <div className="container-tight h-full flex items-center gap-3">
        {/* Menu button */}
        <button
          className="p-2 rounded hover:bg-slate-100 -ml-2"
          onClick={onOpenMenu}
          aria-label="Menu"
          aria-expanded="false"
          aria-controls="app-menu-drawer"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Mode tabs */}
        <div className="tabs">
          <button
            className="tab"
            aria-selected={mode === "create"}
            onClick={() => setMode("create")}
          >
            Create
          </button>
          <button
            className="tab"
            aria-selected={mode === "present"}
            onClick={handlePresentClick}
            title={mode === "present" ? "Exit present mode" : 
                   canPresent ? "Start presenting" : "No posts to present"}
          >
            Present
          </button>
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

          {/* Only show Save to deck button in create mode */}
          {mode === "create" && (
            <button
              className="btn-outline hidden sm:inline-flex"
              onClick={openDeckPicker || (() => {})}
              title="Save current post to a deck"
            >
              <PlusSquare className="w-4 h-4 mr-1" />
              Save to deck
            </button>
          )}

          <button 
            className="btn-outline" 
            onClick={onExportPNG} 
            title={exportDisabled ? "Waiting for images to load..." : "Export PNG"}
            disabled={exportDisabled}
          >
            <ImageIcon className="w-4 h-4 mr-1" />
            Export
          </button>

          <div className="h-6 w-px bg-slate-200 mx-1" />

          <ProfileButton />
        </div>
      </div>
    </header>
  );
}