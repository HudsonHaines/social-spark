import React, { useEffect, useRef, useState } from "react";
import * as htmlToImage from "html-to-image";

import AuthGate from "./auth/AuthGate";
import { useAuth } from "./auth/AuthProvider";
import AppShell from "./components/AppShell";

import { CTA_OPTIONS, ensurePostShape, emptyPost } from "./data/postShape";
import {
  fetchDeckFromSupabase,
  addDeckPostToSupabase,
  deleteDeckPostFromSupabase,
  duplicateDeckPostInSupabase,
} from "./data/deck";
import { fetchBrands } from "./data/brands";

const SESSION_KEY = "smb-session";
const DECK_KEY = "smb-deck";

// --------- Helpers ---------
const readFileAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

async function compressDataUrl(
  dataUrl,
  { maxEdge = 1600, quality = 0.85, format = "image/jpeg" } = {}
) {
  const img = document.createElement("img");
  img.decoding = "async";
  img.src = dataUrl;
  await img.decode();
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const outW = Math.max(1, Math.round(w * scale));
  const outH = Math.max(1, Math.round(h * scale));
  const c = document.createElement("canvas");
  c.width = outW;
  c.height = outH;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0, outW, outH);
  return c.toDataURL(format, quality);
}

async function readImagesSequential(files, limit = 5) {
  const out = [];
  for (const f of files) {
    if (!f.type?.startsWith("image/")) continue;
    if (out.length >= limit) break;
    const raw = await readFileAsDataURL(f);
    const slim = await compressDataUrl(raw, { maxEdge: 1600, quality: 0.85 });
    out.push(slim);
  }
  return out;
}

// --------- Error Boundary ---------
class ErrorBoundary extends React.Component {
  constructor(props){
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error){
    return { error };
  }
  componentDidCatch(error, info){
    // optional: log to service
    console.error('ErrorBoundary caught', error, info);
  }
  render(){
    const { error } = this.state;
    if (error){
      return (
        <div className="p-6 text-sm">
          <div className="font-semibold mb-2">Something went wrong</div>
          <pre className="bg-slate-100 p-3 rounded whitespace-pre-wrap">
            {String(error?.message || error)}
          </pre>
          <button className="btn mt-3" onClick={() => location.reload()}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --------- App Component (state, effects, handlers) ---------
export default function App() {
  const { user } = useAuth();

  // base post
  const [post, setPost] = useState(() => {
    let base = emptyPost;
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) base = { ...emptyPost, ...JSON.parse(saved) };
    } catch {}
    return { ...base, id: crypto.randomUUID() };
  });

  // deck
  const [deck, setDeck] = useState(() => {
    const raw = localStorage.getItem(DECK_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.map((d) => ({ ...d, post: ensurePostShape(d.post) }))
      : [];
  });

  // ui state
  const [mode, setMode] = useState("create");
  const [savingImg, setSavingImg] = useState(false);
  const [presentIndex, setPresentIndex] = useState(0);
  const [loadingDeck, setLoadingDeck] = useState(false);

  // brands
  const [brands, setBrands] = useState([]);
  const [selectedBrandId, setSelectedBrandId] = useState(null);
  const [brandModal, setBrandModal] = useState(false);

  // refs
  const previewRef = useRef(null);
  const videoRef = useRef(null);

  // persist light post in-session (avoid large blobs)
  useEffect(() => {
    try {
      const { media, videoSrc, ...light } = post || {};
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(light));
    } catch {}
  }, [post]);

  // fetch deck from Supabase when user changes
  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      try {
        setLoadingDeck(true);
        const rows = await fetchDeckFromSupabase();
        if (!alive) return;
        const normalized = rows.map((r) => ({ ...r, post: ensurePostShape(r.post) }));
        setDeck(normalized);
        localStorage.setItem(DECK_KEY, JSON.stringify(normalized));
      } catch (e) {
        console.error("fetchDeck error", e);
      } finally {
        if (alive) setLoadingDeck(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  // fetch brands for this user
  useEffect(() => {
    if (!user) {
      setBrands([]);
      setSelectedBrandId(null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const rows = await fetchBrands();
        if (!alive) return;
        setBrands(rows);
        if (!selectedBrandId && rows.length) {
          setSelectedBrandId(rows[0].id);
          applyBrandToPost(rows[0]);
        }
      } catch (e) {
        console.error("fetchBrands error", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const update = (patch) => setPost((p) => ({ ...p, ...patch }));

  function applyBrandToPost(brandRow) {
    if (!brandRow) return;
    const mapped = {
      name: brandRow.fb_name || "Your Brand",
      username: brandRow.ig_username || "yourbrand",
      profileSrc:
        post.platform === "facebook"
          ? brandRow.fb_avatar_url || ""
          : brandRow.ig_avatar_url || "",
      verified: !!brandRow.verified,
    };
    setPost((p) => ({ ...p, brand: mapped }));
  }

  function handleBrandSelect(id) {
    setSelectedBrandId(id);
    const b = brands.find((x) => x.id === id);
    if (b) applyBrandToPost(b);
  }

  // ---------- Media handlers ----------
  const handleImageFiles = async (files) => {
    try {
      const list = Array.from(files || []);
      const urls = await readImagesSequential(list, 5);
      const nextType = urls.length > 1 ? "carousel" : "single";
      setPost((p) => ({
        ...p,
        media: urls,
        videoSrc: "",
        playing: false,
        muted: true,
        type: nextType,
        activeIndex: 0,
      }));
    } catch (e) {
      console.error("handleImageFiles", e);
    }
  };

  const handleVideoFile = async (file) => {
    if (!file || !file.type.startsWith("video/")) return;
    const url = URL.createObjectURL(file);
    setPost((p) => ({
      ...p,
      videoSrc: url,
      media: [],
      type: "video",
      activeIndex: 0,
      playing: false,
    }));
  };

  const clearVideo = () => {
    try {
      if (post.videoSrc) URL.revokeObjectURL(post.videoSrc);
    } catch {}
    setPost((p) => ({
      ...p,
      videoSrc: "",
      playing: false,
      muted: true,
      type: p.media.length > 1 ? "carousel" : "single",
    }));
  };

  const removeImageAt = (idx) => {
    setPost((p) => {
      const media = [...p.media];
      media.splice(idx, 1);
      const nextType = media.length > 1 ? "carousel" : "single";
      const nextIndex = Math.min(p.activeIndex, Math.max(0, media.length - 1));
      return { ...p, media, type: nextType, activeIndex: nextIndex };
    });
  };

  const onDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;
    const vid = files.find((f) => f.type?.startsWith("video/"));
    if (vid) return handleVideoFile(vid);
    const imgs = files.filter((f) => f.type?.startsWith("image/"));
    if (imgs.length) await handleImageFiles(imgs);
  };

  // ---------- Export PNG ----------
  const saveAsPng = async () => {
    if (!previewRef.current) return;
    try {
      setSavingImg(true);
      if (videoRef.current) videoRef.current.pause();
      const dataUrl = await htmlToImage.toPng(previewRef.current, { pixelRatio: 2 });
      const a = document.createElement("a");
      a.download = `${post.platform}-mockup.png`;
      a.href = dataUrl;
      a.click();
    } finally {
      setSavingImg(false);
    }
  };

  // ---------- Deck actions ----------
  const setDeckAndMirror = (rows) => {
    setDeck(rows);
    localStorage.setItem(DECK_KEY, JSON.stringify(rows));
  };

  const addToDeck = async () => {
    try {
      const item = await addDeckPostToSupabase(
        ensurePostShape({ ...post, videoSrc: "" })
      );
      setDeckAndMirror([item, ...deck]);
    } catch (e) {
      console.error(e);
      const item = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        post: ensurePostShape({ ...post, videoSrc: "" }),
      };
      setDeckAndMirror([item, ...deck]);
      alert("Saved locally. Cloud save failed.");
    }
  };

  const duplicateToDeck = async (id) => {
    try {
      const item = await duplicateDeckPostInSupabase(id);
      setDeckAndMirror([item, ...deck]);
    } catch (e) {
      console.error(e);
      const src = deck.find((d) => d.id === id);
      if (!src) return;
      const copy = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        post: ensurePostShape({ ...src.post, id: crypto.randomUUID() }),
      };
      setDeckAndMirror([copy, ...deck]);
      alert("Duplicated locally. Cloud duplicate failed.");
    }
  };

  const loadFromDeck = (id) => {
    const item = deck.find((d) => d.id === id);
    if (item) setPost(ensurePostShape(item.post));
  };

  const deleteFromDeck = async (id) => {
    try {
      await deleteDeckPostFromSupabase(id);
      const next = deck.filter((d) => d.id !== id);
      setDeckAndMirror(next);
    } catch (e) {
      console.error(e);
      const next = deck.filter((d) => d.id !== id);
      setDeckAndMirror(next);
      alert("Deleted locally. Cloud delete failed.");
    }
  };

  const startPresentingDeck = (startId) => {
    const idx = startId ? Math.max(0, deck.findIndex((d) => d.id === startId)) : 0;
    setPresentIndex(idx);
    setMode("present");
  };

  const goPrev = () => setPresentIndex((i) => (i - 1 + deck.length) % deck.length);
  const goNext = () => setPresentIndex((i) => (i + 1) % deck.length);

  const previewPost =
    mode === "present" && deck.length ? deck[presentIndex].post : post;

  function handlePlatformChange(platformId) {
    setPost((p) => ({ ...p, platform: platformId }));
    const b = brands.find((x) => x.id === selectedBrandId);
    if (b) applyBrandToPost(b);
  }

  // render moved to Part 3
  return (
    <AuthGate>
      <ErrorBoundary>
        <AppShell
          // state
          post={post}
          update={(patch) => setPost((p) => ({ ...p, ...patch }))}
          deck={deck}
          setPost={setPost}
          mode={mode}
          setMode={setMode}
          savingImg={savingImg}
          presentIndex={presentIndex}
          onPrev={goPrev}
          onNext={goNext}
          previewPost={previewPost}
          previewRef={previewRef}
          videoRef={videoRef}
          // media
          onDrop={onDrop}
          handleImageFiles={handleImageFiles}
          handleVideoFile={handleVideoFile}
          clearVideo={clearVideo}
          removeImageAt={removeImageAt}
          // deck
          addToDeck={addToDeck}
          duplicateToDeck={duplicateToDeck}
          loadFromDeck={loadFromDeck}
          deleteFromDeck={deleteFromDeck}
          startPresentingDeck={startPresentingDeck}
          // export
          saveAsPng={saveAsPng}
          loadingDeck={loadingDeck}
          // brands
          brands={brands}
          selectedBrandId={selectedBrandId}
          onSelectBrand={handleBrandSelect}
          openBrandManager={() => setBrandModal(true)}
          onPlatformChange={handlePlatformChange}
          brandModal={brandModal}
          setBrandModal={setBrandModal}
        />
      </ErrorBoundary>
    </AuthGate>
  );
}
