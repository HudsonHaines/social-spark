// src/components/AppShell.jsx
import React from "react";
import TopBar from "./TopBar";
import LeftPanel from "./LeftPanel";
import RightPreview from "./RightPreview";
import { SkipBack, SkipForward, Download, Edit3 } from "lucide-react";

const cx = (...a) => a.filter(Boolean).join(" ");

function PresenterControls({
  platform,
  setPlatform,
  exit,
  saveAsPng,
  savingImg,
  hasDeck,
  onPrev,
  onNext,
  index,
  total,
}) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white shadow-lg border rounded-full px-3 py-2 flex items-center gap-2 z-40">
      {/* Platform toggle */}
      <div className="flex items-center bg-slate-100 rounded-xl p-1">
        {["facebook", "instagram"].map((id) => (
          <button
            key={id}
            onClick={() => setPlatform(id)}
            className={cx(
              "px-3 py-1.5 rounded-lg text-sm capitalize",
              platform === id ? "bg-white shadow" : "text-slate-600"
            )}
          >
            {id}
          </button>
        ))}
      </div>

      {hasDeck ? (
        <div className="flex items-center gap-1 ml-2">
          <button className="btn-outline" onClick={onPrev}>
            <SkipBack className="w-4 h-4 mr-1" />
            Prev
          </button>
          <div className="text-xs text-slate-600 px-2">
            {index + 1} / {total}
          </div>
          <button className="btn-outline" onClick={onNext}>
            Next
            <SkipForward className="w-4 h-4 ml-1" />
          </button>
        </div>
      ) : null}

      <div className="w-px h-6 bg-slate-200 mx-2" />

      <button className="btn-outline" onClick={saveAsPng} disabled={savingImg}>
        <Download className="w-4 h-4 mr-1" />
        Export PNG
      </button>
      <button className="btn" onClick={exit}>
        <Edit3 className="w-4 h-4 mr-1" />
        Edit
      </button>
    </div>
  );
}

export default function AppShell(props) {
  const {
    // state
    post,
    update,
    deck,
    setPost,
    mode,
    setMode,
    savingImg,
    presentIndex,
    onPrev,
    onNext,
    previewPost,
    previewRef,
    videoRef,

    // media
    onDrop,
    handleImageFiles,
    handleVideoFile,
    clearVideo,
    removeImageAt,

    // deck
    addToDeck,
    duplicateToDeck,
    loadFromDeck,
    deleteFromDeck,
    startPresentingDeck,

    // export
    saveAsPng,
    loadingDeck,

    // brands
    brands,
    selectedBrandId,
    onSelectBrand,
    openBrandManager, // may be a no-op if you haven't wired a modal yet
    onPlatformChange,
  } = props;

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900">
      <TopBar
        platform={post.platform}
        setPlatform={onPlatformChange}
        mode={mode}
        setMode={setMode}
      />

      <div
        className={cx(
          "mx-auto max-w-[1400px] p-4 gap-4",
          mode === "create" ? "grid grid-cols-1 lg:grid-cols-[460px_minmax(0,1fr)]" : ""
        )}
      >
        {mode === "create" ? (
          <LeftPanel
            // editor side
            post={post}
            update={update}
            onDrop={onDrop}
            handleImageFiles={handleImageFiles}
            handleVideoFile={handleVideoFile}
            clearVideo={clearVideo}
            removeImageAt={removeImageAt}
            // deck side
            addToDeck={addToDeck}
            duplicateToDeck={duplicateToDeck}
            deck={deck}
            loadFromDeck={loadFromDeck}
            deleteFromDeck={deleteFromDeck}
            startPresentingDeck={startPresentingDeck}
            loadingDeck={loadingDeck}
            // brands
            brands={brands}
            selectedBrandId={selectedBrandId}
            onSelectBrand={onSelectBrand}
            openBrandManager={openBrandManager}
          />
        ) : null}

        <RightPreview
            ref={previewRef}
            videoRef={videoRef}
            post={previewPost}
            setPost={setPost}
            mode={mode}
            saveAsPng={saveAsPng}
            savingImg={savingImg}
        />
      </div>

      {mode === "present" ? (
        <PresenterControls
          platform={previewPost.platform}
          setPlatform={(platform) => setPost((p) => ({ ...p, platform }))}
          exit={() => setMode("create")}
          saveAsPng={saveAsPng}
          savingImg={savingImg}
          hasDeck={deck.length > 1}
          onPrev={onPrev}
          onNext={onNext}
          index={presentIndex}
          total={deck.length}
        />
      ) : null}
    </div>
  );
}
