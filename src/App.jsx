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
import EditorPresentMode from "./components/EditorPresentMode";

import { emptyPost, ensurePostShape } from "./data/postShape";
import { useExportStability } from "./hooks/useExportStability"; // FIXED: Use the hook
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

  // presenter state
  const [presentPosts, setPresentPosts] = useState([]);

  // ui state
  const [menuOpen, setMenuOpen] = useState(false);
  const [brandMgr, setBrandMgr] = useState(false);
  const [deckMgr, setDeckMgr] = useState(false);
  const [deckPickerOpen, setDeckPickerOpen] = useState(false);

  // refs
  const previewRef = useRef(null);
  const videoRef = useRef(null);

  // FIXED: Use the export stability hook
  const { isExporting, imagesReady, exportAsPng, attachNode } = useExportStability();

  // Attach the preview ref to the export hook
  useEffect(() => {
    attachNode(previewRef.current);
  }, [attachNode]);

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

  // present from Decks page (Supabase deck)
  const presentFromDecksPage = useCallback(async (deckId) => {
    try {
      const rows = await listDeckItems(deckId);
      const posts = rows.map((r) => r.post_json);
      setPresentPosts(posts);
      setPage("editor");
      setMode("present");
      if (posts.length) setPost(ensurePostShape(posts[0]));
    } catch (e) {
      console.error(e);
      alert("Could not open deck.");
    }
  }, []);

  // start presenting from local scratch deck
  const startPresentingLocalDeck = useCallback(() => {
    if (deck.length === 0) {
      alert("Add some posts to your deck first to start presenting.");
      return;
    }
    const posts = deck.map((d) => d.post);
    setPresentPosts(posts);
    setMode("present");
    if (posts.length) setPost(ensurePostShape(posts[0]));
  }, [deck]);

  // exit present mode
  const exitPresentMode = useCallback(() => {
    setMode("create");
    setPresentPosts([]);
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

  // FIXED: Use the stable export function
  const handleExportPNG = useCallback(async () => {
    try {
      await exportAsPng(previewRef);
    } catch (err) {
      alert("PNG export failed. Check console for details.");
    }
  }, [exportAsPng]);

  // FIXED: Determine if we can present (have posts available)
  const canPresent = useMemo(() => {
    return deck.length > 0; // Can present local deck
  }, [deck.length]);

  // FIXED: Handle present mode toggle properly
  const handlePresentModeToggle = useCallback(() => {
    if (mode === "present") {
      exitPresentMode();
    } else {
      startPresentingLocalDeck();
    }
  }, [mode, exitPresentMode, startPresentingLocalDeck]);

  return (
    <Fragment>
      <AppShell
        singleColumn={page === "decks" || page === "brands"}
        topBarProps={{
          mode,
          setMode, // Keep this for direct mode setting
          onExportPNG: handleExportPNG, // FIXED: Use stable export
          user,
          onOpenMenu: () => setMenuOpen(true),
          openDeckManager: () => setPage("decks"),
          openDeckPicker,
          // FIXED: Add these props for better present mode handling
          canPresent,
          onStartPresent: handlePresentModeToggle,
          exportDisabled: !imagesReady || isExporting, // FIXED: Disable while images loading
        }}
        leftPanel={
          page === "decks" ? (
            <DecksPage
              userId={userId}
              currentPost={null}
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
              startPresentingDeck={startPresentingLocalDeck}
              loadingDeck={false}
              openBrandManager={() => setBrandMgr(true)}
              saveToDeck={saveToDeck}
              openDeckPicker={openDeckPicker}
            />
          )
        }
        rightPreview={
          page !== "editor"
            ? null
            : mode === "present"
            ? (
              <EditorPresentMode
                posts={presentPosts}
                initialIndex={0}
                onClose={exitPresentMode}
                showPlatformTags={true}
              />
            )
            : (
              <RightPreview
                ref={previewRef}
                post={safePost}
                setPost={setPost}
                mode={mode}
                saveAsPng={handleExportPNG} // FIXED: Use stable export
                savingImg={isExporting} // FIXED: Use hook state
                videoRef={videoRef}
                showExport={true}
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
              setPresentPosts(payload.posts);
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