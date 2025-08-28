// src/components/AppShell.jsx
import React from "react";
import TopBar from "./TopBar";
import BrandManager from "../brands/BrandManager";
import DeckManager from "../decks/DeckManager";

export default function AppShell({
  topBarProps = {},
  leftPanel = null,
  rightPreview = null,
  modals = {},
}) {
  const {
    brandManagerOpen = false,
    onCloseBrandManager = () => {},
    deckManagerOpen = false,
    onCloseDeckManager = () => {},
    deckManagerOnOpenForPresent = null,
  } = modals;

  return (
    <div className="min-h-screen grid grid-rows-[auto_1fr]">
      {/* Top bar uses built-in container utilities */}
      <TopBar
        {...topBarProps}
      />

      {/* Main content — built-in Tailwind grid only */}
      <main className="container mx-auto px-4 py-4 grid gap-4 lg:grid-cols-[360px_1fr]">
        <section aria-label="Editor" className="min-w-0">{leftPanel}</section>
        <section aria-label="Live preview" className="min-w-0">{rightPreview}</section>
      </main>

      {brandManagerOpen ? <BrandManager onClose={onCloseBrandManager} /> : null}
      {deckManagerOpen ? (
        <DeckManager
          onClose={onCloseDeckManager}
          onOpenForPresent={deckManagerOnOpenForPresent}
        />
      ) : null}
    </div>
  );
}
