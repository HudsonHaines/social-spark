// src/components/TopBar.jsx
import React, { memo } from "react";
import { Menu } from "lucide-react";
import ProfileButton from "../profile/ProfileButton";

const TopBar = memo(function TopBar({
  onOpenMenu = () => {},
  user = null,
}) {

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

        {/* App Title */}
        <div className="font-semibold text-gray-800">
          Social Spark
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          <ProfileButton />
        </div>
      </div>
    </header>
  );
});

export default TopBar;