// src/App.jsx
import React, {
  useMemo,
  useRef,
  useState,
  useCallback,
  useEffect,
  Fragment,
} from "react";
import AppShell from "./components/AppShell";
import LeftPanel from "./components/LeftPanel";
import RightPreview from "./components/RightPreview";
import MenuDrawer from "./components/MenuDrawer";
import DeckPickerV3 from "./decks/DeckPickerV3";
import DecksPage from "./decks/DecksPage";
import BrandsPage from "./brands/BrandsPage";

import { emptyPost, ensurePostShape } from "./data/postShape";
import * as htmlToImage from "html-to-image";
import {
  listDecks,
  createDeck,
  addItemToDeck,
  listDeckItems,
} from "./data/decks";
import { supabase } from "./lib/supabaseClient";

const uid = () => Math.random().toString(36).slice(2, 10);

export default function App() {
  // core editor state
  const [post, setPost] = useState(() => ensurePostShape(emptyPost));
  const [deck, setDeck] = useState([]); // local scratch deck
  const [mode, setMode] = useState("create"); // create | present
  const [page, setPage] = useState("editor"); // editor | decks | brands

  // ui state
  const [menuOpen, setMenuOpen] = useState(false);
  const [brandMgr, setBrandMgr] = useState(false);
  const [deckMgr, setDeckMgr] = useState(false); // safe to keep
  const [savingImg, setSavingImg] = useState(false);
  const [deckPickerOpen, setDeckPickerOpen] = useState(false);

  // refs
  const previewRef = useRef(null);
  const videoRef = useRef(null);

  // auth
  const [userId, setUserId] = useState(null);
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setUserId(data?.user?.id ?? null);
    });
    const { data } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (active) setUserId(session?.user?.id ?? null);
    });
    return () => {
      active = false;
      data?.subscription?.unsubscribe?.();
    };
  }, []);
  const user = userId ? { id: userId } : null;

  // shape guard
  const safePost = useMemo(() => ensurePostShape(post), [post]);

  // updater that normalizes
  const update = useCallback((patchOrFn) => {
    setPost((p) => {
      const next =
        typeof patchOrFn === "function" ? patchOrFn(ensurePostShape(p)) : { ...p, ...patchOrFn };
      return ensurePostShape(next);
    });
  }, []);

  // images -> data URLs
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
      const meta = Array.from({ length: media.length }, (_, i) => prev.mediaMeta?.[i] || { headline: "" });
      return ensurePostShape({
        ...prev,
        media,
        mediaMeta: meta,
        type: nextType,
        videoSrc: "",
      });
    });
  }, []);

  // video -> data URL
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

  // drag and drop
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

  // local scratch deck
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

  // present from Decks page
  const presentFromDecksPage = useCallback(async (deckId) => {
    try {
      const rows = await listDeckItems(deckId);
      const posts = rows.map((r) => r.post_json);
      setPage("editor");
      setMode("present");
      if (posts.length) setPost(ensurePostShape(posts[0]));
    } catch (e) {
      console.error(e);
      alert("Could not open deck.");
    }
  }, []);

  // save current post to Supabase deck
  const saveToDeck = useCallback(
    async ({ deckId } = {}) => {
      let uidNow = userId;
      if (!uidNow) {
        const { data } = await supabase.auth.getUser();
        uidNow = data?.user?.id ?? null;
        if (uidNow) setUserId(uidNow);
      }
      if (!uidNow) {
        alert("Please sign in to save posts to a deck.");
        return;
      }

      let targetDeckId = deckId || null;

      try {
        if (!targetDeckId) {
          const title =
            (prompt("Save to which deck title? If it does not exist, it will be created.") || "").trim();
          if (!title) return;

          const decks = await listDecks(uidNow);
          const existing = decks.find((d) => d.title.toLowerCase() === title.toLowerCase());
          if (existing) {
            targetDeckId = existing.id;
          } else {
            const created = await createDeck(uidNow, title);
            targetDeckId = created.id;
          }
        }

        const postJson = ensurePostShape(post);
        await addItemToDeck(targetDeckId, postJson);
        alert("Saved to deck.");
      } catch (e) {
        console.error(e);
        alert("Could not save to deck.");
      }
    },
    [post, userId]
  );

  // deck picker open
  const openDeckPicker = useCallback(async () => {
    let uidNow = userId;
    if (!uidNow) {
      const { data } = await supabase.auth.getUser();
      uidNow = data?.user?.id ?? null;
      if (uidNow) setUserId(uidNow);
    }
    if (!uidNow) {
      alert("Please sign in first.");
      return;
    }
    setDeckPickerOpen(true);
  }, [userId]);

  const handlePickDeckAndSave = useCallback(
    async (pickedId) => {
      try {
        const postJson = ensurePostShape(post);
        await addItemToDeck(pickedId, postJson);
        setDeckPickerOpen(false);
        alert("Saved to deck.");
      } catch (e) {
        console.error(e);
        alert("Could not save to deck.");
      }
    },
    [post]
  );

  // export as PNG
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
    <Fragment>
      <AppShell
        singleColumn={page === "decks" || page === "brands"}
        topBarProps={{
          platform: safePost.platform,
          setPlatform: (p) => update({ platform: p }),
          mode,
          setMode,
          onExportPNG: saveAsPng,
          user,
          onOpenMenu: () => setMenuOpen(true),
          openDeckManager: () => setPage("decks"),
          openDeckPicker,
        }}
        leftPanel={
          page === "decks" ? (
            <DecksPage
              userId={userId}
              currentPost={safePost}
              onBack={() => setPage("editor")}
              onPresent={presentFromDecksPage}
            />
          ) : page === "brands" ? (
            <BrandsPage
              userId={userId}
              onBack={() => setPage("editor")}
              onOpenBrandManager={() => setBrandMgr(true)}
            />
          ) : mode === "present" ? null : (
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
              startPresentingDeck={() => setMode("present")}
              loadingDeck={false}
              openBrandManager={() => setBrandMgr(true)}
              saveToDeck={saveToDeck}
              openDeckPicker={openDeckPicker}
            />
          )
        }
        rightPreview={
          page !== "editor" ? null : (
            <RightPreview
              ref={previewRef}
              post={safePost}
              setPost={setPost}
              mode={mode}
              saveAsPng={saveAsPng}
              savingImg={savingImg}
              videoRef={videoRef}
            />
          )
        }
        modals={{
          brandManagerOpen: brandMgr,
          onCloseBrandManager: () => setBrandMgr(false),
          deckManagerOpen: deckMgr,
          onCloseDeckManager: () => setDeckMgr(false),
          deckManagerOnOpenForPresent: (payload) => {
            setDeckMgr(false);
            setMode("present");
            if (payload?.posts?.length) {
              setPost(ensurePostShape(payload.posts[0]));
            }
          },
        }}
      />

      <MenuDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenDeckManager={() => setPage("decks")}
        onOpenBrandsPage={() => setPage("brands")}
      />

      <DeckPickerV3
        userId={userId}
        open={deckPickerOpen}
        onClose={() => setDeckPickerOpen(false)}
        onPick={handlePickDeckAndSave}
      />
    </Fragment>
  );
}
