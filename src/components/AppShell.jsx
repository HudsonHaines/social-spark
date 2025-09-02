// src/components/AppShell.jsx
import React from "react";
import TopBar from "./TopBar";
import DeckStrip from "./DeckStrip";
import BrandManager from "../brands/BrandManager";
import DeckManager from "../decks/DeckManager";

const cx = (...a) => a.filter(Boolean).join(" ");

export default function AppShell({
  topBarProps = {},
  deckStripProps = {},
  leftPanel = null,
  rightPreview = null,
  modals = {},
  singleColumn = false,
  showDeckStrip = false,
}) {
  const {
    brandManagerOpen = false,
    onCloseBrandManager = () => {},
    deckManagerOpen = false,
    onCloseDeckManager = () => {},
    deckManagerOnOpenForPresent = null,
  } = modals;

  const hasLeft = !!leftPanel;
  const hasRight = !!rightPreview;
  const twoCols = hasLeft && hasRight && !singleColumn;

  return (
    <div className="app-shell">
      <TopBar {...topBarProps} />
      
      {showDeckStrip && <DeckStrip {...deckStripProps} />}

      <main
        className={cx(
          singleColumn ? "mx-auto w-full max-w-screen-2xl px-4" : "container-tight",
          "py-4"
        )}
        style={singleColumn ? { maxWidth: "1536px" } : undefined}
      >
        <div
          className={cx(
            "grid gap-4 w-full",
            twoCols ? "grid-cols-[minmax(320px,420px)_1fr]" : "grid-cols-1"
          )}
        >
          {hasLeft ? (
            <section aria-label="Primary" className="min-w-0 w-full">
              {leftPanel}
            </section>
          ) : null}

          {hasRight ? (
            <section aria-label="Live preview" className="min-w-0 w-full">
              {rightPreview}
            </section>
          ) : null}
        </div>
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
