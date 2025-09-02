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
  updateDeckItem,
} from "./data/decks";
import { supabase } from "./lib/supabaseClient";
import { uploadPostMedia, checkStorageSetup } from "./data/mediaStorage";
import { processVideoForDeck } from "./data/videoUtils";

// Quick compression for database fallback
const compressForDatabase = async (dataURL) => {
  if (!dataURL || !dataURL.startsWith('data:image/')) return dataURL;
  
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      
      // Very aggressive sizing for database storage
      const maxSize = 400; // Much smaller for database
      let { width, height } = img;
      
      const ratio = Math.min(maxSize / width, maxSize / height, 1);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      // Very low quality for database storage
      const compressed = canvas.toDataURL('image/jpeg', 0.3);
      
      // If still too large, go even smaller
      if (compressed.length > 200000) { // 200KB limit
        canvas.width = 200;
        canvas.height = 200;
        ctx.fillRect(0, 0, 200, 200);
        ctx.drawImage(img, 0, 0, 200, 200);
        resolve(canvas.toDataURL('image/jpeg', 0.2));
      } else {
        resolve(compressed);
      }
    };
    img.src = dataURL;
  });
};

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
  
  // Track if we're editing from a deck
  const [editingFromDeck, setEditingFromDeck] = useState({
    deckId: null,
    itemId: null,
    version: 1
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

  const reorderDeck = useCallback((newDeck) => {
    setLocalDeck(newDeck);
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

  // Local deck preview handler
  const openLocalDeckPreview = useCallback(() => {
    if (localDeck.length === 0) {
      alert("Add some posts to your deck first.");
      return;
    }
    const posts = localDeck.map(item => item.post);
    setUiState(prev => ({ ...prev, internalCheckerOpen: true, checkerPosts: posts }));
  }, [localDeck]);

  // Deck operations
  // Update existing deck item
  const updateInDeck = useCallback(
    async () => {
      const authenticatedUserId = await ensureAuthenticated();
      if (!authenticatedUserId) return;
      
      if (!editingFromDeck.itemId) {
        alert("No deck item to update");
        return;
      }

      try {
        const postJson = ensurePostShape(post);
        
        // Upload media files before saving
        console.log("Uploading media files for update...");
        const postWithUploadedMedia = await uploadPostMedia(postJson, authenticatedUserId);
        
        // Update the deck item with version tracking
        await updateDeckItem(editingFromDeck.itemId, postWithUploadedMedia);
        
        // Update the version tracking
        setEditingFromDeck(prev => ({
          ...prev,
          version: (postWithUploadedMedia.version || 1) + 1
        }));
        
        alert(`Updated deck item (Version ${(postWithUploadedMedia.version || 1) + 1})`);
      } catch (e) {
        console.error(e);
        alert("Could not update deck item: " + e.message);
      }
    },
    [post, editingFromDeck.itemId, ensureAuthenticated]
  );

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
        
        // Upload media files before saving
        console.log("Uploading media files...");
        const postWithUploadedMedia = await uploadPostMedia(postJson, authenticatedUserId);
        
        await addItemToDeck(targetDeckId, postWithUploadedMedia);
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
        
        // Get user ID for media upload
        const authenticatedUserId = await ensureAuthenticated();
        if (!authenticatedUserId) return;
        
        // Upload media files before saving
        console.log("Uploading media files...");
        const postWithUploadedMedia = await uploadPostMedia(postJson, authenticatedUserId);
        
        await addItemToDeck(pickedId, postWithUploadedMedia);
        setUiState(prev => ({ ...prev, deckPickerOpen: false }));
        alert("Saved to deck.");
      } catch (e) {
        console.error(e);
        alert("Could not save to deck.");
      }
    },
    [post, ensureAuthenticated]
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
        user={authenticatedUser}
        showDeckStrip={appState.page === "editor"}
        topBarProps={{
          user: authenticatedUser,
          onOpenMenu: () => setUiState(prev => ({ ...prev, menuOpen: true })),
        }}
        deckStripProps={{
          deck: localDeck,
          currentPost: post,
          onAddToDeck: addToDeck,
          onLoadFromDeck: loadFromDeck,
          onDeleteFromDeck: deleteFromDeck,
          onDuplicateToDeck: duplicateToDeck,
          onReorderDeck: reorderDeck,
          onPreviewDeck: openLocalDeckPreview,
          onSaveDeck: async (deckName) => {
            const authenticatedUserId = await ensureAuthenticated();
            if (!authenticatedUserId) return;
            
            console.log('Starting deck save:', { deckName, userId: authenticatedUserId, itemCount: localDeck.length });
            
            try {
              // Validate deck name
              if (!deckName?.trim()) {
                throw new Error('Deck name is required');
              }

              // Validate local deck has items
              if (!localDeck || localDeck.length === 0) {
                throw new Error('Cannot save empty deck');
              }

              // Create new deck
              // Check storage setup first (but don't block save if check fails)
              console.log('Checking storage configuration...');
              try {
                const storageCheck = await checkStorageSetup();
                if (!storageCheck.exists) {
                  console.warn(`Storage setup issue: ${storageCheck.suggestion}`);
                  console.warn('Proceeding with save anyway - uploads may fail');
                }
              } catch (storageCheckError) {
                console.warn('Storage check failed, proceeding anyway:', storageCheckError);
              }

              console.log('Creating new deck...');
              const newDeck = await createDeck(authenticatedUserId, deckName.trim());
              console.log('Deck created successfully:', newDeck);
              
              // Add all local deck items to the new deck with media upload
              for (let i = 0; i < localDeck.length; i++) {
                const item = localDeck[i];
                console.log(`Processing item ${i + 1}/${localDeck.length}...`);
                
                // Ensure post is properly shaped
                const cleanPost = ensurePostShape(item.post);
                
                try {
                  // Upload all media files to Supabase Storage
                  console.log(`Uploading media for item ${i + 1}...`);
                  const postWithUploadedMedia = await uploadPostMedia(cleanPost, authenticatedUserId);
                  
                  // Now the post has URLs instead of base64 data
                  const sanitizedPost = {
                    ...postWithUploadedMedia,
                    mediaMeta: postWithUploadedMedia.mediaMeta?.map(meta => ({
                      headline: meta?.headline || ''
                    })) || [],
                    brand: postWithUploadedMedia.brand ? {
                      id: postWithUploadedMedia.brand.id || null,
                      name: postWithUploadedMedia.brand.name || '',
                      username: postWithUploadedMedia.brand.username || '',
                      profileSrc: postWithUploadedMedia.brand.profileSrc || '',
                      verified: !!postWithUploadedMedia.brand.verified
                    } : null,
                    link: postWithUploadedMedia.link ? {
                      headline: postWithUploadedMedia.link.headline || '',
                      subhead: postWithUploadedMedia.link.subhead || '',
                      url: postWithUploadedMedia.link.url || '',
                      cta: postWithUploadedMedia.link.cta || 'Learn More'
                    } : null
                  };
                  
                  // Check final size (should be much smaller now with URLs instead of base64)
                  const jsonString = JSON.stringify(sanitizedPost);
                  console.log(`Item ${i + 1} final size: ${(jsonString.length / 1024).toFixed(1)}KB`);
                  
                  // Log the media URLs for debugging
                  if (sanitizedPost.media?.length) {
                    console.log(`Item ${i + 1} media URLs:`, sanitizedPost.media);
                  }
                  if (sanitizedPost.videoSrc) {
                    console.log(`Item ${i + 1} video URL:`, sanitizedPost.videoSrc);
                  }
                  
                  // Save to deck with the uploaded media URLs
                  await addItemToDeck(newDeck.id, sanitizedPost, i);
                  console.log(`✅ Item ${i + 1} saved successfully`);
                  
                } catch (uploadError) {
                  console.error(`Failed to process item ${i + 1}:`, uploadError);
                  
                  // For MVP, try to save with original data if upload fails
                  console.warn('Upload failed, attempting to save with original media data...');
                  
                  try {
                    console.log(`Compressing media for database fallback (item ${i + 1})...`);
                    
                    // Aggressively compress all media for database storage
                    const compressedMedia = [];
                    if (cleanPost.media) {
                      for (const mediaUrl of cleanPost.media) {
                        const compressed = await compressForDatabase(mediaUrl);
                        compressedMedia.push(compressed);
                      }
                    }
                    
                    // Process video (extract thumbnail and handle size)
                    let compressedVideoSrc = cleanPost.videoSrc;
                    let videoThumbnail = cleanPost.videoThumbnail;
                    
                    if (cleanPost.videoSrc && cleanPost.videoSrc.startsWith('data:video/')) {
                      try {
                        console.log('Processing video for fallback save...');
                        const videoData = await processVideoForDeck(cleanPost.videoSrc);
                        
                        const videoSizeMB = videoData.metadata?.sizeMB || 0;
                        if (videoSizeMB > 10) { // Videos over 10MB for database fallback
                          console.warn(`Video too large for database fallback (${videoSizeMB.toFixed(1)}MB), keeping thumbnail only`);
                          compressedVideoSrc = '[LARGE_VIDEO_FALLBACK]';
                          videoThumbnail = videoData.thumbnail; // Keep the thumbnail
                        } else {
                          compressedVideoSrc = cleanPost.videoSrc;
                          videoThumbnail = videoData.thumbnail;
                        }
                      } catch (videoError) {
                        console.error('Video processing failed in fallback:', videoError);
                        compressedVideoSrc = '[VIDEO_PROCESSING_FAILED]';
                      }
                    }
                    
                    // Use the compressed data
                    const fallbackPost = {
                      ...cleanPost,
                      media: compressedMedia,
                      videoSrc: compressedVideoSrc,
                      videoThumbnail: videoThumbnail,
                      mediaMeta: cleanPost.mediaMeta?.map(meta => ({
                        headline: meta?.headline || ''
                      })) || [],
                      brand: cleanPost.brand ? {
                        id: cleanPost.brand.id || null,
                        name: cleanPost.brand.name || '',
                        username: cleanPost.brand.username || '',
                        profileSrc: await compressForDatabase(cleanPost.brand.profileSrc),
                        verified: !!cleanPost.brand.verified
                      } : null,
                      link: cleanPost.link ? {
                        headline: cleanPost.link.headline || '',
                        subhead: cleanPost.link.subhead || '',
                        url: cleanPost.link.url || '',
                        cta: cleanPost.link.cta || 'Learn More'
                      } : null
                    };
                    
                    // Check if this would be too large for database
                    const fallbackSize = JSON.stringify(fallbackPost).length;
                    console.log(`Item ${i + 1} compressed fallback size: ${(fallbackSize / 1024).toFixed(1)}KB`);
                    
                    if (fallbackSize > 1024 * 1024) { // 1MB limit
                      throw new Error(`Item ${i + 1} still too large after compression (${(fallbackSize / 1024 / 1024).toFixed(2)}MB). This shouldn't happen - please report this issue.`);
                    }
                    
                    await addItemToDeck(newDeck.id, fallbackPost, i);
                    console.log(`✅ Item ${i + 1} saved with compressed fallback data`);
                    
                  } catch (fallbackError) {
                    console.error(`Fallback save also failed for item ${i + 1}:`, fallbackError);
                    throw new Error(`Failed to save item ${i + 1}: ${uploadError.message}. Fallback also failed: ${fallbackError.message}`);
                  }
                }
              }
              
              console.log('All items added successfully');
              
              // Clear local deck after successful save
              setLocalDeck([]);
              console.log('Deck saved successfully!');
            } catch (error) {
              console.error("Failed to save deck:", {
                error: error.message,
                stack: error.stack,
                deckName,
                itemCount: localDeck.length,
                items: localDeck.map((item, i) => ({
                  index: i,
                  id: item.id,
                  hasPost: !!item.post,
                  postKeys: item.post ? Object.keys(item.post) : []
                }))
              });
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
              onLoadToEditor={(post, deckId, itemId) => {
                setPost(post);
                // Track that we're editing from a deck
                setEditingFromDeck({
                  deckId: deckId,
                  itemId: itemId,
                  version: (post.version || 1)
                });
                navigateToPage("editor");
              }}
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
              addToDeck={addToDeck}
              saveToDeck={saveToDeck}
              updateInDeck={updateInDeck}
              editingFromDeck={editingFromDeck}
              clearEditingFromDeck={() => setEditingFromDeck({ deckId: null, itemId: null, version: 1 })}
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
        <div className="fixed inset-0 z-50 bg-gray-100">
          <EditorPresentMode
            posts={uiState.checkerPosts}
            initialIndex={0}
            onClose={() => setUiState(prev => ({ ...prev, internalCheckerOpen: false, checkerPosts: [] }))}
            showPlatformTags={true}
            isInternalMode={true}
          />
        </div>
      )}
    </Fragment>
  );
}