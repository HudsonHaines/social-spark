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
import DeckStrip from "./components/DeckStrip";
import DeckPickerV3 from "./decks/DeckPickerV3";
import { useConfirmModal } from "./components/ConfirmModal";
import { useToast } from "./components/Toast";
import DecksPage from "./decks/DecksPage";
import BrandsPage from "./brands/BrandsPage";
import ShareLinksPage from "./share/ShareLinksPage";
import EditorPresentMode from "./components/EditorPresentMode";

import { emptyPost, ensurePostShape } from "./data/postShape";
import { useExportStability } from "./hooks/useExportStability"; // FIXED: Use the hook
import { useUndoRedo } from "./hooks/useUndoRedo";
import {
  listDecks,
  createDeck,
  addItemToDeck,
  listDeckItems,
  updateDeckItem,
  deleteDeckItems,
  renameDeck,
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
  // Core editor state (undo/redo temporarily disabled)
  const [post, setPost] = useState(() => ensurePostShape(emptyPost));
  const undoPost = () => {};
  const redoPost = () => {};
  const canUndo = false;
  const canRedo = false;
  const resetPostHistory = () => {};
  
  const [localDeck, setLocalDeck] = useState([]);
  const [deckBrand, setDeckBrand] = useState(null); // Brand applied to all posts in deck
  const [showDeckStrip, setShowDeckStrip] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [deckRefreshTrigger, setDeckRefreshTrigger] = useState(0);
  
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
    version: 1,
    deckTitle: null
  });

  // Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Custom modal hook
  const { ConfirmModal, alert, confirm } = useConfirmModal();
  
  // Toast notifications
  const { success: showSuccessToast, error: showErrorToast, ToastContainer } = useToast();

  // refs
  const previewRef = useRef(null);
  const videoRef = useRef(null);

  // Export functionality will be provided by RightPreview component
  const [isExporting, setIsExporting] = useState(false);
  const [imagesReady, setImagesReady] = useState(true);

  // Update images ready state from preview ref
  useEffect(() => {
    const interval = setInterval(() => {
      if (previewRef.current?.imagesReady !== undefined) {
        setImagesReady(previewRef.current.imagesReady);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, []);

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
      const currentPost = ensurePostShape(p);
      const next =
        typeof patchOrFn === "function" ? patchOrFn(currentPost) : { ...currentPost, ...patchOrFn };
      return ensurePostShape(next);
    });
    // Mark as having unsaved changes when editing from a deck
    if (editingFromDeck.deckId) {
      setHasUnsavedChanges(true);
    }
  }, [editingFromDeck.deckId]);

  // Reset unsaved changes when we clear editing state or save
  useEffect(() => {
    if (!editingFromDeck.deckId) {
      setHasUnsavedChanges(false);
    }
  }, [editingFromDeck.deckId]);

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

    updatePost((p) => {
      const prev = ensurePostShape(p);
      const media = [...(prev.media || []), ...datas].slice(0, 5);
      const nextType = prev.type === "video" ? "single" : media.length > 1 ? "carousel" : "single";
      const meta = Array.from({ length: media.length }, (_, i) => prev.mediaMeta?.[i] || { headline: "", subhead: "" });
      return ensurePostShape({
        ...prev,
        media,
        mediaMeta: meta,
        type: nextType,
        videoSrc: "",
      });
    });
  }, [updatePost]);

  const processVideoFile = useCallback(async (file) => {
    if (!file) return;
    const data = await new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
    updatePost((p) => ensurePostShape({ ...p, videoSrc: data, type: "video" }));
  }, [updatePost]);

  const removeVideo = useCallback(() => {
    updatePost((p) => ensurePostShape({ ...p, videoSrc: "", type: "single" }));
  }, [updatePost]);

  const removeImageAt = useCallback((idx) => {
    updatePost((p) => {
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
  }, [updatePost]);

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

  // Start deck without adding anything
  const startDeckBuilding = useCallback(() => {
    setShowDeckStrip(true);
  }, []);

  // Local deck operations
  // Add current post to deck (save/update existing)
  const addCurrentToDeck = useCallback(
    async (p) => {
      setShowDeckStrip(true); // Also show deck strip when adding posts
      
      let processedPost = ensurePostShape(p || post);
      
      // Process video if present to extract thumbnail
      if (processedPost.videoSrc && processedPost.videoSrc.startsWith('data:video/')) {
        console.log('🎬 Processing video for local deck...');
        try {
          const videoData = await processVideoForDeck(processedPost.videoSrc);
          processedPost = {
            ...processedPost,
            videoThumbnail: videoData.thumbnail,
            videoMetadata: videoData.metadata
          };
          console.log('✅ Video processed for local deck, thumbnail extracted');
        } catch (error) {
          console.error('❌ Failed to process video for local deck:', error);
          // Continue without thumbnail - will use placeholder
        }
      }
      
      // Check if the current post matches an existing deck item by comparing IDs or content
      const existingItemIndex = localDeck.findIndex(item => {
        // First try ID match
        if (processedPost.id && item.id === processedPost.id) {
          return true;
        }
        // Then try exact post reference match
        if (item.post === post) {
          return true;
        }
        return false;
      });
      
      if (existingItemIndex !== -1) {
        // Update existing item
        setLocalDeck((d) => {
          const newDeck = [...d];
          newDeck[existingItemIndex] = {
            ...newDeck[existingItemIndex],
            post: processedPost,
            updatedAt: Date.now()
          };
          return newDeck;
        });
        console.log('✅ Updated existing deck item');
        return;
      }
      
      // Create new item with ID that will be preserved
      const newItemId = uid();
      const item = {
        id: newItemId,
        createdAt: Date.now(),
        post: { ...processedPost, id: newItemId },
      };
      setLocalDeck((d) => [item, ...d]);
      console.log('✅ Created new deck item with ID:', newItemId);
    },
    [post, localDeck]
  );

  // Add new empty post to deck for editing
  const addNewPostToDeck = useCallback(() => {
    setShowDeckStrip(true);
    
    // Create a new empty post with a unique ID and inherit settings from current post or deck
    const newItemId = uid();
    const inheritedBrand = post.brand || deckBrand || emptyPost.brand;
    const emptyPostWithId = { 
      ...ensurePostShape(emptyPost), 
      id: newItemId,
      brand: inheritedBrand,
      // Inherit platform-specific settings from current post
      platform: post.platform || 'facebook',
      isReel: post.isReel || false,
      fbAspectRatio: post.fbAspectRatio || "1:1",
      fbAdFormat: post.fbAdFormat || "feed-1:1",
      fbAdType: post.fbAdType || "feed",
      igAdFormat: post.igAdFormat || "feed-1:1",
      igAdType: post.igAdType || "feed"
    };
    
    const item = {
      id: newItemId,
      createdAt: Date.now(),
      post: emptyPostWithId,
    };
    
    setLocalDeck((d) => [item, ...d]);
    
    // Load this new empty post for editing
    setPost(emptyPostWithId);
    resetPostHistory(emptyPostWithId);
    
    console.log('✅ Created new empty deck item for editing with ID:', newItemId, 'with inherited brand:', inheritedBrand?.name, 'platform:', post.platform);
  }, [post, deckBrand, setPost, resetPostHistory]);

  // Set deck brand and optionally apply to all existing posts
  const setDeckBrandAndApply = useCallback((brand, applyToExisting = true) => {
    setDeckBrand(brand);
    
    if (applyToExisting && localDeck.length > 0) {
      setLocalDeck((deck) => 
        deck.map(item => ({
          ...item,
          post: { ...item.post, brand: brand },
          updatedAt: Date.now()
        }))
      );
      
      // Also update current post if it has the same ID as a deck item
      if (post.id && localDeck.some(item => item.id === post.id)) {
        updatePost(prev => ({ ...prev, brand: brand }));
      }
      
      console.log('✅ Applied brand to all', localDeck.length, 'existing deck posts:', brand?.name);
    }
    
    console.log('✅ Set deck brand:', brand?.name);
  }, [localDeck, post.id, updatePost]);

  // Legacy function for backward compatibility
  const addToDeck = addCurrentToDeck;

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
      if (it) {
        const loadedPost = ensurePostShape(it.post);
        // Ensure the post has the same ID as the deck item for proper updating
        loadedPost.id = id;
        setPost(loadedPost);
        // Reset undo/redo history when loading a different post
        resetPostHistory(loadedPost);
      }
      return d;
    });
  }, [setPost, resetPostHistory]);

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
      
      // If we're editing a deck from the deck strip, just update the local deck and save it
      if (editingFromDeck.deckId && localDeck.length > 0) {
        console.log("📝 Updating current post in local deck and saving entire deck");
        
        // Find and update the current post in the local deck
        console.log('🔍 Looking for post to update in local deck. Current post:', post);
        console.log('🔍 Local deck items:', localDeck.map(item => ({ id: item.id, post: item.post })));
        
        let foundMatch = false;
        const updatedLocalDeck = localDeck.map((item, index) => {
          // Try multiple matching strategies
          const isExactMatch = item.post === post;
          const isJsonMatch = JSON.stringify(item.post) === JSON.stringify(post);
          const isIdMatch = item.deckItemId === editingFromDeck.itemId;
          const isCaptionMatch = item.post.caption === post.caption; // Use caption instead of text
          
          console.log(`🔍 Item ${index}:`, {
            itemId: item.id,
            deckItemId: item.deckItemId,
            editingItemId: editingFromDeck.itemId,
            itemCaption: item.post.caption?.substring(0, 50) + '...',
            currentCaption: post.caption?.substring(0, 50) + '...',
            isExactMatch,
            isJsonMatch,
            isIdMatch,
            isCaptionMatch
          });
          
          // Update if we find a match by ID, but only if the content also matches
          // This prevents updating the wrong item if IDs are stale
          if (isIdMatch && (isJsonMatch || isCaptionMatch)) {
            console.log('✅ Found match by ID + content! Updating item:', item.id);
            foundMatch = true;
            return {
              ...item,
              post: {
                ...ensurePostShape(post),
                version: (item.post.version || 1) + 1,
                updatedAt: new Date().toISOString()
              }
            };
          }
          
          // Fallback: if no ID match but content matches, update this item
          if (isJsonMatch || isCaptionMatch) {
            console.log('✅ Found match by content! Updating item:', item.id);
            foundMatch = true;
            return {
              ...item,
              post: {
                ...ensurePostShape(post),
                version: (item.post.version || 1) + 1,
                updatedAt: new Date().toISOString()
              }
            };
          }
          return item;
        });
        
        if (!foundMatch) {
          console.warn('⚠️ No exact match found. Looking for best match by media similarity...');
          
          // Try to find the best match by comparing media (images/videos)
          let bestMatchIndex = 0;
          let bestMatchScore = 0;
          
          localDeck.forEach((item, index) => {
            let score = 0;
            
            // Compare media arrays
            if (item.post.media && post.media && item.post.media.length === post.media.length) {
              score += 2; // Same number of media items
            }
            
            // Compare video source
            if (item.post.videoSrc && post.videoSrc && item.post.videoSrc === post.videoSrc) {
              score += 3; // Same video source
            }
            
            // Compare platform and type
            if (item.post.platform === post.platform) score += 1;
            if (item.post.type === post.type) score += 1;
            
            console.log(`🔍 Item ${index} similarity score:`, score);
            
            if (score > bestMatchScore) {
              bestMatchScore = score;
              bestMatchIndex = index;
            }
          });
          
          console.log('✅ Using best match (index', bestMatchIndex, ') with score:', bestMatchScore);
          updatedLocalDeck[bestMatchIndex] = {
            ...updatedLocalDeck[bestMatchIndex],
            post: {
              ...ensurePostShape(post),
              version: (updatedLocalDeck[bestMatchIndex].post.version || 1) + 1,
              updatedAt: new Date().toISOString()
            }
          };
        }
        
        console.log('🔄 Updated local deck:', updatedLocalDeck.map(item => ({ id: item.id, caption: item.post.caption })));
        
        setLocalDeck(updatedLocalDeck);
        
        // Save the entire updated deck
        try {
          const deckName = editingFromDeck.deckTitle || 'Updated Deck';
          console.log("💾 Saving updated deck:", deckName);
          
          // Use the existing deck save logic by calling the DeckStrip's onSaveDeck
          // First update the local deck state
          setLocalDeck(updatedLocalDeck);
          
          // Then save it using the same logic as the deck strip
          await new Promise((resolve, reject) => {
            // We'll trigger the save through the deck strip save logic
            // For now, let's use a simplified approach
            setTimeout(async () => {
              try {
                // Save the deck using the same logic as onSaveDeck
                const isEditingExistingDeck = !!editingFromDeck.deckId;
                const currentDeckTitle = editingFromDeck.deckTitle;
                
                if (isEditingExistingDeck && currentDeckTitle) {
                  // Updating existing deck - delete old items and save new ones
                  console.log('Updating existing deck:', editingFromDeck.deckId);
                  
                  // Delete existing items
                  const existingItems = await listDeckItems(editingFromDeck.deckId);
                  if (existingItems.length > 0) {
                    const itemIds = existingItems.map(item => item.id);
                    await deleteDeckItems(itemIds);
                  }
                  
                  // Save new items with media upload
                  for (let i = 0; i < updatedLocalDeck.length; i++) {
                    const item = updatedLocalDeck[i];
                    console.log(`Processing item ${i + 1}/${updatedLocalDeck.length}...`);
                    
                    // Upload media files if needed
                    console.log('Uploading media for item', i + 1, '...');
                    let postWithUploadedMedia = await uploadPostMedia(item.post, authenticatedUserId);
                    
                    // Process video if needed
                    if (postWithUploadedMedia.videoSrc && postWithUploadedMedia.videoSrc.startsWith('data:video/')) {
                      console.log('🎬 Processing video for deck item...');
                      try {
                        const videoData = await processVideoForDeck(postWithUploadedMedia.videoSrc);
                        postWithUploadedMedia = {
                          ...postWithUploadedMedia,
                          videoThumbnail: videoData.thumbnail,
                          videoMetadata: videoData.metadata,
                          videoSrc: videoData.videoSrc // Use processed video src
                        };
                        console.log('🎥 Video processed successfully');
                      } catch (videoError) {
                        console.error('Video processing failed:', videoError);
                        // Continue anyway - video will remain as data URL
                      }
                    }
                    
                    // Add to deck
                    await addItemToDeck(editingFromDeck.deckId, postWithUploadedMedia, i);
                    console.log(`✅ Item ${i + 1} saved successfully`);
                  }
                  
                  console.log('🎉 All items saved successfully!');
                  
                  // Verify the save worked
                  const verifyItems = await listDeckItems(editingFromDeck.deckId);
                  console.log('✅ Verification: Deck now has', verifyItems.length, 'items in database');
                  
                  resolve();
                } else {
                  reject(new Error('Not editing an existing deck'));
                }
              } catch (error) {
                reject(error);
              }
            }, 100); // Small delay to ensure state is updated
          });
          
          showSuccessToast(`Updated "${deckName}" successfully!`);
          setHasUnsavedChanges(false);
          setDeckRefreshTrigger(prev => prev + 1);
        } catch (e) {
          console.error("Error saving updated deck:", e);
          await alert({
            title: "Update Failed",
            message: `Could not save updated deck: ${e.message}`,
            type: "error"
          });
        }
        return;
      }
      
      // Fallback to individual item update (shouldn't happen in normal flow)
      if (!editingFromDeck.itemId) {
        await alert({
          title: "Nothing to Update",
          message: "No deck item is currently selected for updating.",
          type: "warning"
        });
        return;
      }

      try {
        const postJson = ensurePostShape(post);
        
        // Upload media files before saving
        console.log("Uploading media files for update...");
        console.log("📝 Updating item:", editingFromDeck.itemId, "with post:", postJson);
        const postWithUploadedMedia = await uploadPostMedia(postJson, authenticatedUserId);
        
        // Update the deck item with version tracking
        await updateDeckItem(editingFromDeck.itemId, postWithUploadedMedia);
        
        // Update the version tracking
        setEditingFromDeck(prev => ({
          ...prev,
          version: (postWithUploadedMedia.version || 1) + 1
        }));
        
        showSuccessToast(`Post updated to v${(postWithUploadedMedia.version || 1) + 1}!`);
        setHasUnsavedChanges(false);
        setDeckRefreshTrigger(prev => prev + 1);
      } catch (e) {
        console.error(e);
        await alert({
          title: "Update Failed", 
          message: `Could not update deck item: ${e.message}`,
          type: "error"
        });
      }
    },
    [post, editingFromDeck.itemId, editingFromDeck.deckId, editingFromDeck.deckTitle, localDeck, ensureAuthenticated, setDeckRefreshTrigger]
  );

  // Keyboard shortcuts (after updateInDeck is defined)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only trigger shortcuts when focused on the body or editor elements
      const isEditableElement = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true';
      
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (editingFromDeck?.itemId && hasUnsavedChanges) {
          updateInDeck();
        }
        return;
      }
      
      // Cmd/Ctrl + Z for undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          undoPost();
        }
        return;
      }
      
      // Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y for redo
      if ((e.metaKey || e.ctrlKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        if (canRedo) {
          redoPost();
        }
        return;
      }
      
      // Don't trigger navigation shortcuts when typing in input fields
      if (isEditableElement) return;
      
      // Arrow keys for deck navigation (both local deck building and saved deck editing)
      if (localDeck.length > 0 && (editingFromDeck?.deckId || showDeckStrip)) {
        const currentIndex = localDeck.findIndex(item => 
          item.post.id === post.id || JSON.stringify(item.post) === JSON.stringify(post)
        );
        
        if (e.key === 'ArrowLeft' && currentIndex > 0) {
          e.preventDefault();
          const prevItem = localDeck[currentIndex - 1];
          setPost(prevItem.post);
          resetPostHistory(prevItem.post);
          showSuccessToast(`← Previous post (${currentIndex}/${localDeck.length})`);
        } else if (e.key === 'ArrowRight' && currentIndex < localDeck.length - 1) {
          e.preventDefault();
          const nextItem = localDeck[currentIndex + 1];
          setPost(nextItem.post);
          resetPostHistory(nextItem.post);
          showSuccessToast(`Next post → (${currentIndex + 2}/${localDeck.length})`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingFromDeck, hasUnsavedChanges, updateInDeck, localDeck, post, setPost, resetPostHistory, showSuccessToast, canUndo, canRedo, undoPost, redoPost]);

  // Exit warnings for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges || localDeck.some(item => item.updatedAt && (!item.savedAt || item.updatedAt > item.savedAt))) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, localDeck]);

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
    console.log("🖼️ Export PNG clicked", { 
      previewRefExists: !!previewRef.current,
      exportFnExists: !!previewRef.current?.exportAsPng,
      previewRefKeys: previewRef.current ? Object.keys(previewRef.current) : 'no ref',
      previewRefValues: previewRef.current,
      isDOM: previewRef.current instanceof HTMLElement,
      previewRefType: typeof previewRef.current
    });
    
    if (!previewRef.current?.exportAsPng) {
      console.error("Export function not available");
      alert("Export function not available. Please try again.");
      return;
    }
    
    setIsExporting(true);
    console.log("🖼️ Starting PNG export...");
    try {
      const result = await previewRef.current.exportAsPng();
      console.log("🖼️ Export completed successfully:", result);
    } catch (err) {
      console.error("PNG export failed:", err);
      alert("PNG export failed. Check console for details.");
    } finally {
      setIsExporting(false);
      console.log("🖼️ Export process finished");
    }
  }, []);


  return (
    <Fragment>
      <AppShell
        user={authenticatedUser}
        showDeckStrip={appState.page === "editor" && (showDeckStrip || localDeck.length > 0)}
        topBarProps={{
          user: authenticatedUser,
          onOpenMenu: () => setUiState(prev => ({ ...prev, menuOpen: true })),
        }}
        deckStripProps={{
          deck: localDeck,
          currentPost: post,
          onStartDeckBuilding: startDeckBuilding,
          onAddToDeck: addCurrentToDeck,
          onAddNewPost: addNewPostToDeck,
          onLoadFromDeck: loadFromDeck,
          onDeleteFromDeck: deleteFromDeck,
          onDuplicateToDeck: duplicateToDeck,
          onReorderDeck: reorderDeck,
          onPreviewDeck: openLocalDeckPreview,
          onStartNewDeck: () => {
            // Clear everything and start fresh
            setLocalDeck([]);
            setDeckBrand(null);
            const freshPost = ensurePostShape(emptyPost);
            setPost(freshPost);
            resetPostHistory(freshPost);
            setEditingFromDeck({ deckId: null, itemId: null, version: 1, deckTitle: null });
            setHasUnsavedChanges(false);
            setShowDeckStrip(false);
            showSuccessToast("Started new deck! 🎉");
          },
          lastSaved: lastSaved,
          isEditingExistingDeck: !!editingFromDeck.deckId,
          currentDeckTitle: editingFromDeck.deckTitle,
          hasUnsavedChanges: hasUnsavedChanges,
          onSaveDeck: async (deckName) => {
            const authenticatedUserId = await ensureAuthenticated();
            if (!authenticatedUserId) return;
            
            console.log('Starting deck save:', { 
              deckName, 
              userId: authenticatedUserId, 
              itemCount: localDeck.length,
              isEditing: !!editingFromDeck.deckId,
              editingDeckId: editingFromDeck.deckId,
              editingDeckTitle: editingFromDeck.deckTitle
            });
            
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

              let targetDeckId;
              
              // Check if we're editing an existing deck
              if (editingFromDeck.deckId) {
                console.log('Updating existing deck:', editingFromDeck.deckId);
                
                // Update the deck title
                await renameDeck(editingFromDeck.deckId, deckName.trim());
                
                // Clear existing deck items - first get all item IDs
                const existingItems = await listDeckItems(editingFromDeck.deckId);
                if (existingItems.length > 0) {
                  const itemIds = existingItems.map(item => item.id);
                  await deleteDeckItems(itemIds);
                }
                
                targetDeckId = editingFromDeck.deckId;
              } else {
                console.log('Creating new deck...');
                const newDeck = await createDeck(authenticatedUserId, deckName.trim());
                console.log('Deck created successfully:', newDeck);
                targetDeckId = newDeck.id;
              }
              
              // Add all local deck items to the deck with media upload
              for (let i = 0; i < localDeck.length; i++) {
                const item = localDeck[i];
                console.log(`Processing item ${i + 1}/${localDeck.length}...`);
                
                // Ensure post is properly shaped
                const cleanPost = ensurePostShape(item.post);
                
                try {
                  // Upload all media files to Supabase Storage
                  console.log(`Uploading media for item ${i + 1}...`);
                  const postWithUploadedMedia = await uploadPostMedia(cleanPost, authenticatedUserId);
                  
                  // Save to deck with the uploaded media URLs
                  await addItemToDeck(targetDeckId, postWithUploadedMedia, i);
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
                        headline: meta?.headline || '',
                        subhead: meta?.subhead || ''
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
              
              console.log('🎉 All items saved successfully!');
              
              // Verify save by checking database
              if (editingFromDeck.deckId) {
                try {
                  const verifyItems = await listDeckItems(editingFromDeck.deckId);
                  console.log('✅ Verification: Deck now has', verifyItems.length, 'items in database');
                } catch (verifyError) {
                  console.error('❌ Could not verify save:', verifyError);
                }
              }
              
              // Update last saved timestamp
              setLastSaved(new Date());
              
              // Trigger deck refresh for DecksPage
              setDeckRefreshTrigger(prev => {
                const newValue = prev + 1;
                console.log('🔄 Triggering deck refresh:', newValue);
                return newValue;
              });
              
              // If we were editing an existing deck, keep the deck strip visible
              // If it was a new deck, optionally clear it
              if (!editingFromDeck.deckId) {
                setLocalDeck([]);
                setShowDeckStrip(false);
              }
            } catch (error) {
              console.error("❌ Failed to save deck:", {
                error: error.message,
                stack: error.stack,
                deckName,
                itemCount: localDeck.length,
                isEditing: !!editingFromDeck.deckId,
                editingDeckId: editingFromDeck.deckId,
                editingDeckTitle: editingFromDeck.deckTitle,
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
              refreshTrigger={deckRefreshTrigger}
              onLoadToEditor={async (post, deckId, itemId, deckTitle) => {
                try {
                  // Load the entire deck into the strip
                  const deckItems = await listDeckItems(deckId);
                  
                  // Convert deck items to local deck format
                  const localDeckItems = deckItems.map(item => ({
                    id: item.id,
                    post: ensurePostShape(item.post_json),
                    deckItemId: item.id // Keep reference to original deck item
                  }));
                  
                  // Set the deck in local state and show the strip
                  setLocalDeck(localDeckItems);
                  setShowDeckStrip(true);
                  
                  // Set the clicked post as current, ensuring proper ID matching
                  const normalizedPost = ensurePostShape(post);
                  // Find the matching deck item to ensure ID consistency
                  const matchingDeckItem = localDeckItems.find(item => item.deckItemId === itemId);
                  if (matchingDeckItem) {
                    // Use the post from the deck with consistent ID
                    const postWithId = { ...matchingDeckItem.post, id: matchingDeckItem.id };
                    setPost(postWithId);
                    resetPostHistory(postWithId);
                  } else {
                    setPost(normalizedPost);
                    resetPostHistory(normalizedPost);
                  }
                  
                  // Track that we're editing from a deck
                  setEditingFromDeck({
                    deckId: deckId,
                    itemId: itemId,
                    version: (post.version || 1),
                    deckTitle: deckTitle || 'Untitled Deck'
                  });
                  
                  navigateToPage("editor");
                } catch (error) {
                  console.error('Failed to load deck for editing:', error);
                  alert('Failed to load deck. Loading just this post instead.');
                  
                  // Fallback to original behavior
                  setPost(post);
                  resetPostHistory(post);
                  setEditingFromDeck({
                    deckId: deckId,
                    itemId: itemId,
                    version: (post.version || 1),
                    deckTitle: deckTitle || 'Untitled Deck'
                  });
                  navigateToPage("editor");
                }
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
              videoRef={videoRef}
              showDeckStrip={showDeckStrip}
              onSetDeckBrand={setDeckBrandAndApply}
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
              hasUnsavedChanges={hasUnsavedChanges}
              clearEditingFromDeck={() => setEditingFromDeck({ deckId: null, itemId: null, version: 1, deckTitle: null })}
              openDeckPicker={openDeckPicker}
              onExportPNG={handleExportPNG}
              isExporting={isExporting}
              imagesReady={imagesReady}
              onUndo={undoPost}
              onRedo={redoPost}
              canUndo={canUndo}
              canRedo={canRedo}
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
                setPost={updatePost}
                mode="create"
                videoRef={videoRef}
                showExport={true}
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

      {/* Custom Confirmation Modal */}
      <ConfirmModal />
      
      {/* Toast Notifications */}
      <ToastContainer />
    </Fragment>
  );
}