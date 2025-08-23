import React, { useCallback, useMemo, useRef, useState } from "react";
import * as htmlToImage from "html-to-image";

import AuthGate from "./auth/AuthGate";
import { useAuth } from "./auth/AuthProvider";

import AppShell from "./components/AppShell";
import LeftPanel from "./components/LeftPanel";
import RightPreview from "./components/RightPreview";
import TopBar from "./components/TopBar";

import { ensurePostShape, emptyPost as POST_TEMPLATE } from "./data/postShape";

export default function App() {
  const { user } = useAuth();

  // Layout state
  const [platform, setPlatform] = useState("facebook");   // "facebook" | "instagram"
  const [mode, setMode] = useState("create");             // "create" | "present"

  // Post state
  const [post, setPost] = useState(() => ensurePostShape({ ...POST_TEMPLATE, platform }));

  // Deck state (stub)
  const [deck, setDeck] = useState([]);
  const [loadingDeck, setLoadingDeck] = useState(false);

  // Keep platform in post when switching tabs
  const handleSetPlatform = useCallback((next) => {
    setPlatform(next);
    setPost((p) => ensurePostShape({ ...p, platform: next }));
  }, []);

  // Generic post updater
  const updatePost = useCallback((patch) => {
    setPost((prev) => ensurePostShape({ ...prev, ...patch }));
  }, []);

  // Add images — keep mediaMeta in sync and infer type
  const handleImageFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const urls = await Promise.all(files.map((f) => new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.readAsDataURL(f);
    })));
    setPost((prev) => {
      const p = ensurePostShape(prev || {});
      const nextMedia = [...(p.media || []), ...urls].slice(0, 5);
      // pad mediaMeta to same length
      const nextMeta = [...(p.mediaMeta || [])];
      while (nextMeta.length < nextMedia.length) nextMeta.push({ headline: "" });
      const nextType = p.type === "video" ? "video" : (nextMedia.length > 1 ? "carousel" : "single");
      return ensurePostShape({
        ...p,
        media: nextMedia,
        mediaMeta: nextMeta.slice(0, nextMedia.length),
        type: nextType,
        videoSrc: "",
      });
    });
  }, []);

  // Add video
  const handleVideoFile = useCallback(async (file) => {
    const url = await new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.readAsDataURL(file);
    });
    updatePost({ videoSrc: url, type: "video" });
  }, [updatePost]);

  const clearVideo = useCallback(() => updatePost({ videoSrc: "", type: "single" }), [updatePost]);

  // Remove image — keep mediaMeta in sync
  const removeImageAt = useCallback((i) => {
    setPost((prev) => {
      const p = ensurePostShape(prev || {});
      const media = [...(p.media || [])];
      const meta = [...(p.mediaMeta || [])];
      if (i < 0 || i >= media.length) return p;
      media.splice(i, 1);
      meta.splice(i, 1);
      const activeIndex = Math.max(0, Math.min(p.activeIndex, media.length - 1));
      const type = media.length > 1 ? "carousel" : "single";
      return ensurePostShape({ ...p, media, mediaMeta: meta, activeIndex, type });
    });
  }, []);

  // Drag-drop
  const onDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const dt = e.dataTransfer;
    if (!dt) return;
    const images = Array.from(dt.files || []).filter((f) => f.type.startsWith("image/"));
    const videos = Array.from(dt.files || []).filter((f) => f.type.startsWith("video/"));
    if (videos[0]) return handleVideoFile(videos[0]);
    if (images.length) return handleImageFiles(images);
  }, [handleImageFiles, handleVideoFile]);

  // Deck actions (stub)
  const addToDeck = useCallback(() => {
    setLoadingDeck(true);
    setDeck((d) => [{ id: crypto.randomUUID(), createdAt: Date.now(), post }, ...d]);
    setLoadingDeck(false);
  }, [post]);

  const duplicateToDeck = useCallback((id) => {
    setDeck((d) => {
      const item = d.find((x) => x.id === id);
      return item ? [{ id: crypto.randomUUID(), createdAt: Date.now(), post: item.post }, ...d] : d;
    });
  }, []);

  const loadFromDeck = useCallback((id) => {
    setDeck((d) => {
      const item = d.find((x) => x.id === id);
      if (item) setPost(ensurePostShape(item.post));
      return d;
    });
  }, []);

  const deleteFromDeck = useCallback((id) => {
    setDeck((d) => d.filter((x) => x.id !== id));
  }, []);

  const startPresentingDeck = useCallback(() => {
    setMode("present");
  }, []);

  // Preview ref for PNG export
  const previewRef = useRef(null);

  const handleExportPNG = useCallback(async () => {
    if (!previewRef.current) return;
    const dataUrl = await htmlToImage.toPng(previewRef.current, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#ffffff",
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    a.download = `social-spark-${post.platform}-${ts}.png`;
    a.click();
  }, [post.platform]);

  const shellProps = useMemo(() => ({
    platform, setPlatform: handleSetPlatform,
    mode, setMode,
    onExportPNG: handleExportPNG,
    user,
  }), [platform, handleSetPlatform, mode, setMode, handleExportPNG, user]);

  const leftProps = useMemo(() => ({
    user,
    post,
    update: updatePost,
    onDrop,
    handleImageFiles,
    handleVideoFile,
    clearVideo,
    removeImageAt,
    addToDeck,
    duplicateToDeck,
    deck,
    loadFromDeck,
    deleteFromDeck,
    startPresentingDeck,
    loadingDeck,
  }), [
    user, post, updatePost, onDrop, handleImageFiles, handleVideoFile, clearVideo,
    removeImageAt, addToDeck, duplicateToDeck, deck, loadFromDeck,
    deleteFromDeck, startPresentingDeck, loadingDeck
  ]);

  const rightProps = useMemo(() => ({
    user,
    post,
    setPost, // needed for carousel arrows to update activeIndex
  }), [user, post, setPost]);

  return (
    <AuthGate>
      <AppShell
        topBar={<TopBar {...shellProps} />}
        left={mode === "create" ? <LeftPanel {...leftProps} /> : null}
        right={<RightPreview {...rightProps} />}
        previewRef={previewRef}
        mode={mode}
      />
    </AuthGate>
  );
}
