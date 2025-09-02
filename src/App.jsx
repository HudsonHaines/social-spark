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
import ShareLinksPage from "./share/ShareLinksPage";
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
  // Core editor state
  const [post, setPost] = useState(() => ensurePostShape(emptyPost));
  const [localDeck, setLocalDeck] = useState([]);
  
  // App navigation state
  const [appState, setAppState] = useState({
    page: "editor", // editor | decks | brands | sharelinks
  });
  

  // UI modal state
  const [uiState, setUiState] = useState({
    menuOpen: false,
    brandManagerOpen: false,
    deckManagerOpen: false,
    deckPickerOpen: false,
    internalCheckerOpen: false,
    checkerPosts: [],
  });

  // refs
  const previewRef = useRef(null);
  const videoRef = useRef(null);

  // Export stability hook
  const { isExporting, imagesReady, exportAsPng, attachNode } = useExportStability();

  useEffect(() => {
    attachNode(previewRef.current);
  }, [attachNode]);

  // Auth state (simplified)
  const [userId, setUserId] = useState(null);
  const authenticatedUser = useMemo(() => userId ? { id: userId } : null, [userId]);
  
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

  // Post updater with normalization
  const updatePost = useCallback((patchOrFn) => {
    setPost((p) => {
      const next =
        typeof patchOrFn === "function" ? patchOrFn(ensurePostShape(p)) : { ...p, ...patchOrFn };
      return ensurePostShape(next);
    });
  }, []);

  // Consolidated auth check utility
  const ensureAuthenticated = useCallback(async () => {
    let currentUserId = userId;
    if (!currentUserId) {
      const { data } = await supabase.auth.getUser();
      currentUserId = data?.user?.id ?? null;
      if (currentUserId) setUserId(currentUserId);
    }
    if (!currentUserId) {
      alert("Please sign in first.");
      return null;
    }
    return currentUserId;
  }, [userId]);

  // Navigation helpers
  const navigateToPage = useCallback((page) => {
    setAppState(prev => ({ ...prev, page }));
  }, []);

  // File processing (memoized)
  const processImageFiles = useCallback(async (fileList) => {
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

  const processVideoFile = useCallback(async (file) => {
    if (!file) return;
    const data = await new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
    setPost((p) => ensurePostShape({ ...p, videoSrc: data, type: "video" }));
  }, []);

  const removeVideo = useCallback(() => {
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

  // Drag and drop handler
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

      if (imgs.length) await processImageFiles(imgs);
      if (vid) await processVideoFile(vid);
    },
    [processImageFiles, processVideoFile]
  );

  // Local deck operations
  const addToDeck = useCallback(
    (p) => {
      const item = {
        id: uid(),
        createdAt: Date.now(),
        post: ensurePostShape(p || post),
      };
      setLocalDeck((d) => [item, ...d]);
    },
    [post]
  );

  const duplicateToDeck = useCallback((id) => {
    setLocalDeck((d) => {
      const it = d.find((x) => x.id === id);
      if (!it) return d;
      const clone = { ...it, id: uid(), createdAt: Date.now() };
      return [clone, ...d];
    });
  }, []);

  const loadFromDeck = useCallback((id) => {
    setLocalDeck((d) => {
      const it = d.find((x) => x.id === id);
      if (it) setPost(ensurePostShape(it.post));
      return d;
    });
  }, []);

  const deleteFromDeck = useCallback((id) => {
    setLocalDeck((d) => d.filter((x) => x.id !== id));
  }, []);

  // Internal deck checker handler (repurposed from present mode)
  const openInternalDeckChecker = useCallback(async (deckId) => {
    try {
      const rows = await listDeckItems(deckId);
      const posts = rows.map((r) => r.post_json);
      setUiState(prev => ({ ...prev, internalCheckerOpen: true, checkerPosts: posts }));
    } catch (e) {
      console.error(e);
      alert("Could not open deck for review.");
    }
  }, []);

  // Deck operations
  const saveToDeck = useCallback(
    async ({ deckId } = {}) => {
      const authenticatedUserId = await ensureAuthenticated();
      if (!authenticatedUserId) {
        return;
      }

      let targetDeckId = deckId || null;

      try {
        if (!targetDeckId) {
          const title =
            (prompt("Save to which deck title? If it does not exist, it will be created.") || "").trim();
          if (!title) return;

          const decks = await listDecks(authenticatedUserId);
          const existing = decks.find((d) => d.title.toLowerCase() === title.toLowerCase());
          if (existing) {
            targetDeckId = existing.id;
          } else {
            const created = await createDeck(authenticatedUserId, title);
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
    [post, ensureAuthenticated]
  );

  const openDeckPicker = useCallback(async () => {
    const authenticatedUserId = await ensureAuthenticated();
    if (!authenticatedUserId) {
      return;
    }
    setUiState(prev => ({ ...prev, deckPickerOpen: true }));
  }, [ensureAuthenticated]);

  const handlePickDeckAndSave = useCallback(
    async (pickedId) => {
      try {
        const postJson = ensurePostShape(post);
        await addItemToDeck(pickedId, postJson);
        setUiState(prev => ({ ...prev, deckPickerOpen: false }));
        alert("Saved to deck.");
      } catch (e) {
        console.error(e);
        alert("Could not save to deck.");
      }
    },
    [post]
  );

  // Export handler
  const handleExportPNG = useCallback(async () => {
    try {
      await exportAsPng(previewRef);
    } catch (err) {
      alert("PNG export failed. Check console for details.");
    }
  }, [exportAsPng]);


  return (
    <Fragment>
      <AppShell
        singleColumn={appState.page === "decks" || appState.page === "brands" || appState.page === "sharelinks"}
        showDeckStrip={appState.page === "editor"}
        topBarProps={{
          onExportPNG: handleExportPNG,
          user: authenticatedUser,
          onOpenMenu: () => setUiState(prev => ({ ...prev, menuOpen: true })),
          deckActions: {
            openDeckManager: () => navigateToPage("decks"),
            openDeckPicker,
          },
          exportDisabled: !imagesReady || isExporting,
        }}
        deckStripProps={{
          deck: localDeck,
          currentPost: post,
          onAddToDeck: addToDeck,
          onLoadFromDeck: loadFromDeck,
          onDeleteFromDeck: deleteFromDeck,
          onDuplicateToDeck: duplicateToDeck,
          onSaveDeck: async (deckName) => {
            const authenticatedUserId = await ensureAuthenticated();
            if (!authenticatedUserId) return;
            
            try {
              // Create new deck
              const newDeck = await createDeck(authenticatedUserId, deckName);
              
              // Add all local deck items to the new deck
              for (const item of localDeck) {
                await addItemToDeck(newDeck.id, item.post);
              }
              
              // Clear local deck after successful save
              setLocalDeck([]);
              alert(`Deck "${deckName}" saved successfully!`);
            } catch (error) {
              console.error("Failed to save deck:", error);
              throw error; // Let DeckStrip handle the error state
            }
          },
        }}
        leftPanel={
          appState.page === "decks" ? (
            <DecksPage
              userId={userId}
              currentPost={null}
              onBack={() => navigateToPage("editor")}
              onPresent={openInternalDeckChecker}
            />
          ) : appState.page === "brands" ? (
            <BrandsPage
              userId={userId}
              onBack={() => navigateToPage("editor")}
              onOpenBrandManager={() => setUiState(prev => ({ ...prev, brandManagerOpen: true }))}
            />
          ) : appState.page === "sharelinks" ? (
            <ShareLinksPage />
          ) : (
            <LeftPanel
              user={authenticatedUser}
              post={post}
              update={updatePost}
              onDrop={onDrop}
              handleImageFiles={processImageFiles}
              handleVideoFile={processVideoFile}
              clearVideo={removeVideo}
              removeImageAt={removeImageAt}
              openBrandManager={() => setUiState(prev => ({ ...prev, brandManagerOpen: true }))}
              saveToDeck={saveToDeck}
              openDeckPicker={openDeckPicker}
              onExportPNG={handleExportPNG}
              isExporting={isExporting}
              imagesReady={imagesReady}
            />
          )
        }
        rightPreview={
          appState.page !== "editor"
            ? null
            : (
              <RightPreview
                ref={previewRef}
                post={post}
                setPost={setPost}
                mode="create"
                videoRef={videoRef}
                showExport={false}
              />
            )
        }
        modals={{
          brandManagerOpen: uiState.brandManagerOpen,
          onCloseBrandManager: () => setUiState(prev => ({ ...prev, brandManagerOpen: false })),
          deckManagerOpen: uiState.deckManagerOpen,
          onCloseDeckManager: () => setUiState(prev => ({ ...prev, deckManagerOpen: false })),
        }}
      />

      <MenuDrawer
        open={uiState.menuOpen}
        onClose={() => setUiState(prev => ({ ...prev, menuOpen: false }))}
        onOpenCreate={() => navigateToPage("editor")}
        onOpenDeckManager={() => navigateToPage("decks")}
        onOpenBrandsPage={() => navigateToPage("brands")}
        onOpenShareLinks={() => navigateToPage("sharelinks")}
      />

      <DeckPickerV3
        userId={userId}
        open={uiState.deckPickerOpen}
        onClose={() => setUiState(prev => ({ ...prev, deckPickerOpen: false }))}
        onPick={handlePickDeckAndSave}
      />

      {/* Internal Deck Checker Modal */}
      {uiState.internalCheckerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50">
          <div className="h-full w-full">
            <EditorPresentMode
              posts={uiState.checkerPosts}
              initialIndex={0}
              onClose={() => setUiState(prev => ({ ...prev, internalCheckerOpen: false, checkerPosts: [] }))}
              showPlatformTags={true}
              isInternalMode={true}
            />
          </div>
        </div>
      )}
    </Fragment>
  );
}