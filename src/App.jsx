import React, { useMemo, useRef, useState, useCallback } from "react";
import AppShell from "./components/AppShell";
import LeftPanel from "./components/LeftPanel";
import RightPreview from "./components/RightPreview";
import { emptyPost, ensurePostShape } from "./data/postShape";
import * as htmlToImage from "html-to-image";
import { useAuth } from "./auth/AuthProvider";

const uid = () => Math.random().toString(36).slice(2, 10);

export default function App() {
  const { user } = useAuth();

  // Core app state
  const [post, setPost] = useState(() => ensurePostShape(emptyPost));
  const [deck, setDeck] = useState([]); // local-only deck entries
  const [mode, setMode] = useState("create");
  const [menuOpen, setMenuOpen] = useState(false);
  const [brandMgr, setBrandMgr] = useState(false);
  const [deckMgr, setDeckMgr] = useState(false);
  const [savingImg, setSavingImg] = useState(false);

  const previewRef = useRef(null);
  const videoRef = useRef(null);

  // keep shape safe
  const safePost = useMemo(() => ensurePostShape(post), [post]);

  // updater merges patches and re-normalizes shape
  const update = useCallback((patch) => {
    setPost((p) => ensurePostShape({ ...p, ...patch }));
  }, []);

  // -------- Media helpers --------
  const handleImageFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList || []).slice(0, 5);
    if (!files.length) return;

    const datas = await Promise.all(
      files.map(
        (f) =>
          new Promise((res, rej) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result);
            reader.onerror = rej;
            reader.readAsDataURL(f);
          })
      )
    );

    setPost((p) => {
      const prev = ensurePostShape(p);
      const media = [...(prev.media || []), ...datas].slice(0, 5);
      const nextType = prev.type === "video" ? "single" : media.length > 1 ? "carousel" : "single";
      // normalize mediaMeta
      const meta = Array.from({ length: media.length }, (_, i) => prev.mediaMeta?.[i] || { headline: "" });
      return ensurePostShape({ ...prev, media, mediaMeta: meta, type: nextType, videoSrc: "" });
    });
  }, []);

  const handleVideoFile = useCallback(async (file) => {
    if (!file) return;
    const data = await new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
    setPost((p) => ensurePostShape({ ...p, videoSrc: data, type: "video" }));
  }, []);

  const clearVideo = useCallback(() => {
    setPost((p) => ensurePostShape({ ...p, videoSrc: "", type: "single" }));
  }, []);

  const removeImageAt = useCallback((idx) => {
    setPost((p) => {
      const prev = ensurePostShape(p);
      const media = (prev.media || []).slice();
      if (idx < 0 || idx >= media.length) return prev;
      media.splice(idx, 1);
      const meta = (prev.mediaMeta || []).slice();
      meta.splice(idx, 1);
      const nextType = media.length > 1 ? "carousel" : "single";
      const nextActive = Math.max(0, Math.min(prev.activeIndex || 0, (media.length || 1) - 1));
      return ensurePostShape({
        ...prev,
        media,
        mediaMeta: meta,
        type: prev.type === "video" ? "video" : nextType,
        activeIndex: nextActive,
      });
    });
  }, []);

  const onDrop = useCallback(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const dt = e.dataTransfer;
      if (!dt) return;

      const imgs = [];
      let vid = null;

      for (const item of Array.from(dt.files || [])) {
        if (item.type.startsWith("image/")) imgs.push(item);
        else if (!vid && item.type.startsWith("video/")) vid = item;
      }

      if (imgs.length) await handleImageFiles(imgs);
      if (vid) await handleVideoFile(vid);
    },
    [handleImageFiles, handleVideoFile]
  );

  // -------- Deck helpers (local for now) --------
  const addToDeck = useCallback(
    (p) => {
      const item = {
        id: uid(),
        createdAt: Date.now(),
        post: ensurePostShape(p || post),
      };
      setDeck((d) => [item, ...d]);
    },
    [post]
  );

  const duplicateToDeck = useCallback((id) => {
    setDeck((d) => {
      const it = d.find((x) => x.id === id);
      if (!it) return d;
      const clone = { ...it, id: uid(), createdAt: Date.now() };
      return [clone, ...d];
    });
  }, []);

  const loadFromDeck = useCallback((id) => {
    setDeck((d) => {
      const it = d.find((x) => x.id === id);
      if (it) setPost(ensurePostShape(it.post));
      return d;
    });
  }, []);

  const deleteFromDeck = useCallback((id) => {
    setDeck((d) => d.filter((x) => x.id !== id));
  }, []);

  const startPresentingDeck = useCallback(
    (id) => {
      setMode("present");
      if (id) loadFromDeck(id);
    },
    [loadFromDeck]
  );

  // -------- Export as PNG (2x) --------
  const saveAsPng = useCallback(async () => {
    if (!previewRef.current) return;
    setSavingImg(true);
    try {
      const node = previewRef.current;
      const dataUrl = await htmlToImage.toPng(node, {
        pixelRatio: 2,
        cacheBust: true,
        quality: 1,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `mockup-${Date.now()}.png`;
      a.click();
    } catch (err) {
      console.error("PNG export failed", err);
      alert("PNG export failed. Check console.");
    } finally {
      setSavingImg(false);
    }
  }, []);

  return (
    <AppShell
      topBarProps={{
        platform: safePost.platform,
        setPlatform: (p) => update({ platform: p }),
        mode,
        setMode,
        onExportPNG: saveAsPng,
        user,
        onOpenMenu: () => setMenuOpen(true),
      }}
      leftPanel={
        <LeftPanel
          user={user}
          post={safePost}
          update={update}
          onDrop={onDrop}
          handleImageFiles={handleImageFiles}
          handleVideoFile={handleVideoFile}
          clearVideo={clearVideo}
          removeImageAt={removeImageAt}
          addToDeck={addToDeck}
          duplicateToDeck={duplicateToDeck}
          deck={deck}
          loadFromDeck={loadFromDeck}
          deleteFromDeck={deleteFromDeck}
          startPresentingDeck={startPresentingDeck}
          loadingDeck={false}
          openBrandManager={() => setBrandMgr(true)}
        />
      }
      rightPreview={
        <RightPreview
          ref={previewRef}
          post={safePost}
          setPost={setPost}
          mode={mode}
          saveAsPng={saveAsPng}
          savingImg={savingImg}
          videoRef={videoRef}
        />
      }
      modals={{
        brandManagerOpen: brandMgr,
        onCloseBrandManager: () => setBrandMgr(false),
        deckManagerOpen: deckMgr,
        onCloseDeckManager: () => setDeckMgr(false),
        deckManagerOnOpenForPresent: (id) => {
          setDeckMgr(false);
          startPresentingDeck(id);
        },
      }}
    />
  );
}
