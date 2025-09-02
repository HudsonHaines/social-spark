// src/decks/DecksPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  listDecks,
  listDeckItems,
  addItemToDeck,
  deleteDeck,
  deleteDeckItem,
  deleteDeckItems,
  renameDeck,
  getOrCreateDeckShare,
} from "../data/decks";
import { ensurePostShape } from "../data/postShape";
import {
  Trash2,
  Play,
  ArrowLeft,
  Image as ImageIcon,
  Images,
  Film,
  Link as LinkIcon,
  Plus,
  Edit3,
  RefreshCw,
  Check,
  X,
  Copy,
  Edit2,
} from "lucide-react";
import PostPreviewModal from "./PostPreviewModal";
import { getVideoThumbnail, canPlayVideo } from "../data/videoUtils";

const cx = (...a) => a.filter(Boolean).join(" ");

export default function DecksPage({
  userId,
  currentPost, // FIXED: Made optional - when null, hide "Add current post" button
  onBack,
  onPresent, // (deckId) => void
  onLoadToEditor, // optional: (post) => void
}) {
  // Consolidated state
  const [state, setState] = useState({
    decks: [],
    items: [],
    activeId: null,
    loading: {
      decks: true,
      items: false,
      operations: new Set()
    },
    error: null
  });

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPost, setPreviewPost] = useState(null);
  
  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  
  // Bulk operations state
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  
  // Deck bulk operations state
  const [selectedDecks, setSelectedDecks] = useState(new Set());
  const [bulkDeckUpdating, setBulkDeckUpdating] = useState(false);
  
  // Deck rename state
  const [renamingDeckId, setRenamingDeckId] = useState(null);
  const [newDeckName, setNewDeckName] = useState('');

  const { decks, items, activeId, loading } = state;

  const activeDeck = useMemo(
    () => decks.find((d) => String(d.id) === activeId) || null,
    [decks, activeId]
  );

  useEffect(() => {
    let mounted = true;
    
    const loadDecks = async () => {
      if (!userId) {
        if (mounted) {
          setState(prev => ({
            ...prev,
            decks: [],
            loading: { ...prev.loading, decks: false }
          }));
        }
        return;
      }
      
      try {
        const rows = await listDecks(userId);
        if (!mounted) return;
        
        setState(prev => ({
          ...prev,
          decks: rows,
          activeId: rows.length && !prev.activeId ? String(rows[0].id) : prev.activeId,
          loading: { ...prev.loading, decks: false },
          error: null
        }));
      } catch (error) {
        console.error('Load decks error:', error);
        if (mounted) {
          setState(prev => ({
            ...prev,
            loading: { ...prev.loading, decks: false },
            error: error.message
          }));
        }
      }
    };
    
    loadDecks();
    return () => { mounted = false; };
  }, [userId]);

  // Load items effect
  useEffect(() => {
    let mounted = true;
    
    // Clear selections when switching decks
    setSelectedItems(new Set());
    
    const loadItems = async () => {
      if (!activeId) {
        if (mounted) {
          setState(prev => ({ ...prev, items: [] }));
        }
        return;
      }
      
      setState(prev => ({ 
        ...prev, 
        loading: { ...prev.loading, items: true } 
      }));
      
      try {
        const rows = await listDeckItems(activeId);
        if (mounted) {
          setState(prev => ({
            ...prev,
            items: rows,
            loading: { ...prev.loading, items: false },
            error: null
          }));
        }
      } catch (error) {
        console.error('Load items error:', error);
        if (mounted) {
          setState(prev => ({
            ...prev,
            loading: { ...prev.loading, items: false },
            error: error.message
          }));
        }
      }
    };
    
    loadItems();
    return () => { mounted = false; };
  }, [activeId]);

  // Memoized handlers
  const handleAddCurrent = useCallback(async () => {
    if (!currentPost || !activeId) return;
    
    const opId = 'add-current';
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, operations: new Set(prev.loading.operations).add(opId) }
    }));
    
    try {
      await addItemToDeck(activeId, ensurePostShape(currentPost));
      const rows = await listDeckItems(activeId);
      setState(prev => ({
        ...prev,
        items: rows,
        error: null
      }));
    } catch (error) {
      console.error('Add current error:', error);
      alert("Could not add post.");
    } finally {
      setState(prev => {
        const newOps = new Set(prev.loading.operations);
        newOps.delete(opId);
        return {
          ...prev,
          loading: { ...prev.loading, operations: newOps }
        };
      });
    }
  }, [currentPost, activeId]);

  // Bulk operations handlers
  const handleSelectAll = useCallback(() => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  }, [selectedItems.size, items]);

  const handleSelectItem = useCallback((itemId) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedItems.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedItems.size} post(s) from this deck? This cannot be undone.`)) {
      return;
    }

    setBulkUpdating(true);
    
    try {
      await deleteDeckItems(Array.from(selectedItems));
      const rows = await listDeckItems(activeId);
      setState(prev => ({
        ...prev,
        items: rows,
        error: null
      }));
      setSelectedItems(new Set());
      alert(`Successfully deleted ${selectedItems.size} post(s).`);
    } catch (err) {
      console.error('Failed to bulk delete:', err);
      alert('Failed to delete posts: ' + err.message);
    } finally {
      setBulkUpdating(false);
    }
  }, [selectedItems, activeId]);

  // Deck rename handlers
  const handleStartRename = useCallback((deckId, currentName) => {
    setRenamingDeckId(deckId);
    setNewDeckName(currentName);
  }, []);

  const handleCancelRename = useCallback(() => {
    setRenamingDeckId(null);
    setNewDeckName('');
  }, []);

  const handleSaveRename = useCallback(async () => {
    if (!renamingDeckId || !newDeckName.trim()) return;
    
    try {
      await renameDeck(renamingDeckId, newDeckName.trim());
      const rows = await listDecks(userId);
      setState(prev => ({
        ...prev,
        decks: rows,
        error: null
      }));
      setRenamingDeckId(null);
      setNewDeckName('');
    } catch (err) {
      console.error('Failed to rename deck:', err);
      alert('Failed to rename deck: ' + err.message);
    }
  }, [renamingDeckId, newDeckName, userId]);

  // Deck bulk operation handlers
  const handleSelectAllDecks = useCallback(() => {
    if (selectedDecks.size === decks.length) {
      setSelectedDecks(new Set());
    } else {
      setSelectedDecks(new Set(decks.map(deck => deck.id)));
    }
  }, [selectedDecks.size, decks]);

  const handleSelectDeck = useCallback((deckId) => {
    setSelectedDecks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deckId)) {
        newSet.delete(deckId);
      } else {
        newSet.add(deckId);
      }
      return newSet;
    });
  }, []);

  const handleBulkDeleteDecks = useCallback(async () => {
    if (selectedDecks.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedDecks.size} deck(s) and all their posts? This cannot be undone.`)) {
      return;
    }

    setBulkDeckUpdating(true);
    
    try {
      // Delete each deck
      for (const deckId of selectedDecks) {
        await deleteDeck(deckId);
      }
      
      // Reload decks and reset state
      const rows = await listDecks(userId);
      setState(prev => ({
        ...prev,
        decks: rows,
        activeId: rows.length ? String(rows[0].id) : null,
        items: rows.length ? prev.items : [],
        error: null
      }));
      setSelectedDecks(new Set());
      alert(`Successfully deleted ${selectedDecks.size} deck(s).`);
    } catch (err) {
      console.error('Failed to bulk delete decks:', err);
      alert('Failed to delete decks: ' + err.message);
    } finally {
      setBulkDeckUpdating(false);
    }
  }, [selectedDecks, userId]);

  async function handleDeleteDeck(deckId) {
    if (!deckId) return;
    if (!confirm("Delete this deck and all posts in it?")) return;
    try {
      await deleteDeck(deckId);
      const rows = await listDecks(userId);
      setState(prev => ({
        ...prev,
        decks: rows,
        activeId: rows.length ? String(rows[0].id) : null,
        items: rows.length ? prev.items : []
      }));
    } catch (e) {
      console.error(e);
      alert("Could not delete deck.");
    }
  }

  async function handleDeleteItem(itemId) {
    if (!itemId) return;
    try {
      await deleteDeckItem(itemId);
      const rows = await listDeckItems(activeId);
      setItems(rows);
    } catch (e) {
      console.error(e);
      alert("Could not delete post.");
    }
  }

  // Get or reuse existing share link for the deck
  async function handleShare() {
    if (!activeDeck) return;
    try {
      const token = await getOrCreateDeckShare(activeDeck.id, { days: 7 });
      const url = `${window.location.origin}/s/${encodeURIComponent(token)}`;
      
      setShareUrl(url);
      setShareModalOpen(true);
      
      console.log("Share link retrieved/created:", url);
    } catch (e) {
      console.error("Share link error:", e);
      alert(`Could not get share link. Error: ${e.message}`);
    }
  }

  function openPreview(pj) {
    setPreviewPost(ensurePostShape(pj || {}));
    setPreviewOpen(true);
  }

  return (
    <div className="panel w-full overflow-hidden flex flex-col">
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="btn-outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </button>
          <div className="font-medium text-app-strong">Manage decks</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-outline"
            disabled={!activeDeck}
            onClick={() => activeDeck && onPresent?.(activeDeck.id)}
            title="Start presentation from this deck"
          >
            <Play className="w-4 h-4 mr-1" />
            Present
          </button>
          <button
            className="btn-outline"
            disabled={!activeDeck}
            onClick={handleShare}
            title="Create a public preview link (requires /s/:token route)"
          >
            <LinkIcon className="w-4 h-4 mr-1" />
            Share
          </button>
          {/* FIXED: Only show "Add current post" button when currentPost is provided */}
          {currentPost && (
            <button
              className="btn-outline"
              disabled={!activeDeck}
              onClick={handleAddCurrent}
              title="Add the current editor post to this deck"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add current post
            </button>
          )}
          <button
            className="btn-outline"
            disabled={!activeDeck}
            onClick={() => activeDeck && handleDeleteDeck(activeDeck.id)}
            title="Delete this deck"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete deck
          </button>
        </div>
      </div>

      <div className="bg-app-surface p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Deck list */}
          <div className="card p-0 overflow-hidden">
            <div className="px-3 py-2 border-b text-xs uppercase tracking-wide label-strong">
              Your decks
            </div>
            
            {/* Deck bulk select controls */}
            {decks.length > 0 && (
              <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedDecks.size === decks.length && decks.length > 0}
                    onChange={handleSelectAllDecks}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-offset-0 focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="text-sm text-gray-700">
                    {selectedDecks.size > 0 
                      ? `${selectedDecks.size} of ${decks.length} selected`
                      : `Select all ${decks.length} decks`
                    }
                  </span>
                </div>
                
                {selectedDecks.size > 0 && (
                  <button
                    onClick={handleBulkDeleteDecks}
                    disabled={bulkDeckUpdating}
                    className="btn-outline text-sm text-red-600 hover:bg-red-50"
                  >
                    {bulkDeckUpdating ? (
                      <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-1" />
                    )}
                    Delete Selected
                  </button>
                )}
              </div>
            )}
            
            <div className="max-h-[60vh] overflow-auto">
              {loading.decks ? (
                <div className="p-3 text-sm text-app-muted">Loading...</div>
              ) : decks.length === 0 ? (
                <div className="p-3 text-sm text-app-muted">No decks yet</div>
              ) : (
                <ul className="divide-y" role="radiogroup" aria-label="Decks">
                  {decks.map((d) => {
                    const idStr = String(d.id);
                    const selected = activeId === idStr;
                    return (
                      <li
                        key={idStr}
                        role="radio"
                        aria-checked={selected}
                        tabIndex={0}
                        className={cx(
                          "px-3 py-2 cursor-pointer outline-none",
                          selected ? "bg-slate-50" : "hover:bg-slate-50"
                        )}
                        onClick={() => setState(prev => ({ ...prev, activeId: idStr }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setState(prev => ({ ...prev, activeId: idStr }));
                          }
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Bulk select checkbox */}
                            <div onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedDecks.has(d.id)}
                                onChange={() => handleSelectDeck(d.id)}
                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-offset-0 focus:ring-blue-200 focus:ring-opacity-50"
                              />
                            </div>
                            
                            {/* custom radio */}
                            <span
                              aria-hidden="true"
                              className="inline-block"
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: 9999,
                                border: `1px solid ${
                                  selected ? "var(--brand-500)" : "var(--app-border)"
                                }`,
                                background: selected ? "var(--brand-500)" : "white",
                                boxShadow: selected
                                  ? "0 0 0 3px rgba(4,107,217,0.20)"
                                  : "none",
                                flex: "0 0 auto",
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              {renamingDeckId === d.id ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={newDeckName}
                                    onChange={(e) => setNewDeckName(e.target.value)}
                                    className="text-sm px-1 py-0.5 border rounded flex-1 min-w-0"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveRename();
                                      if (e.key === 'Escape') handleCancelRename();
                                    }}
                                    autoFocus
                                  />
                                  <button
                                    onClick={handleSaveRename}
                                    className="p-0.5 text-green-600 hover:bg-green-50 rounded"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={handleCancelRename}
                                    className="p-0.5 text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="group flex items-center gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium truncate">{d.title}</div>
                                    <div className="text-app-muted text-xs">
                                      {new Date(d.created_at).toLocaleString()}
                                    </div>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartRename(d.id, d.title);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-all"
                                    title="Rename deck"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="chip">{d.count ?? ""}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Items in deck */}
          <div className="md:col-span-2 card p-0 overflow-hidden">
            <div className="px-3 py-2 border-b text-xs uppercase tracking-wide label-strong">
              {activeDeck ? activeDeck.title : "Deck items"}
            </div>

            {loading.items ? (
              <div className="p-4 text-sm text-app-muted">Loading...</div>
            ) : !activeDeck ? (
              <div className="p-4 text-sm text-app-muted">Pick a deck</div>
            ) : items.length === 0 ? (
              <div className="p-4 text-sm text-app-muted">
                This deck has no posts. Create posts in the editor and use "Save to deck" to add them.
              </div>
            ) : (
              <>
                {/* Select All Controls */}
                <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === items.length && items.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-offset-0 focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="text-sm text-gray-700">
                      {selectedItems.size > 0 
                        ? `${selectedItems.size} of ${items.length} selected`
                        : `Select all ${items.length} posts`
                      }
                    </span>
                  </div>
                  
                  {selectedItems.size > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      disabled={bulkUpdating}
                      className="btn-outline text-sm text-red-600 hover:bg-red-50"
                    >
                      {bulkUpdating ? (
                        <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-1" />
                      )}
                      Delete Selected
                    </button>
                  )}
                </div>
                
                <ul className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((it) => {
                  const pj = ensurePostShape(it.post_json || {});
                  const kind =
                    pj.type === "video"
                      ? "video"
                      : (pj.media?.length || 0) > 1
                      ? "carousel"
                      : "single";
                  const Icon =
                    kind === "video" ? Film : kind === "carousel" ? Images : ImageIcon;

                  const thumb = pj.type === "video" && pj.videoSrc
                    ? getVideoThumbnail(pj) || pj.videoSrc
                    : pj.media?.[0] || "";

                  const label =
                    (pj.brand?.name || pj.brand?.username || "Post") +
                    " · " +
                    (pj.platform || "facebook") +
                    " · " +
                    (pj.type || "single");

                  return (
                    <li
                      key={it.id}
                      className="border border-app rounded-lg overflow-hidden cursor-pointer relative"
                    >
                      {/* Individual item checkbox */}
                      <div 
                        className="absolute top-2 left-2 z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedItems.has(it.id)}
                          onChange={() => handleSelectItem(it.id)}
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-offset-0 focus:ring-blue-200 focus:ring-opacity-50"
                        />
                      </div>
                      
                      <div 
                        className="relative aspect-square bg-app-muted"
                        onClick={() => openPreview(pj)}
                      >
                        {thumb ? (
                          pj.type === "video" ? (
                            canPlayVideo(pj.videoSrc) ? (
                              <div className="relative w-full h-full">
                                <img
                                  src={thumb}
                                  className="absolute inset-0 w-full h-full object-cover"
                                  alt="Video thumbnail"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="bg-black/60 rounded-full p-3">
                                    <Film className="w-6 h-6 text-white" />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-100">
                                <Film className="w-8 h-8 mb-2" />
                                <div className="text-xs">Video unavailable</div>
                              </div>
                            )
                          ) : (
                            <img
                              src={thumb}
                              className="absolute inset-0 w-full h-full object-cover"
                              alt=""
                              draggable={false}
                              onError={(e) => {
                                console.error('Image failed to load:', thumb);
                                // Handle broken images gracefully
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = `
                                  <div class="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                    <svg class="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <div class="text-xs">Image unavailable</div>
                                  </div>
                                `;
                              }}
                            />
                          )
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-app-muted text-sm">
                            No media
                          </div>
                        )}

                        {/* media type badge */}
                        <div className="absolute right-2 top-2 bg-black/70 text-white rounded-full px-2 py-0.5 flex items-center gap-1">
                          <Icon className="w-4 h-4" />
                          {kind === "carousel" ? (
                            <span className="text-xs">{pj.media?.length || 0}</span>
                          ) : null}
                        </div>
                      </div>

                      <div className="p-2">
                        <div className="flex items-center justify-between">
                          <div className="text-sm truncate flex-1">{label}</div>
                          {pj.version && pj.version > 1 && (
                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded ml-2">
                              v{pj.version}
                            </span>
                          )}
                        </div>
                        <div className="text-app-muted text-xs">
                          {new Date(it.created_at).toLocaleString()}
                          {pj.updatedAt && (
                            <span className="ml-1 text-green-600">
                              • Updated {new Date(pj.updatedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-2">
                          {onLoadToEditor && (
                            <button
                              className="chip"
                              onClick={(e) => {
                                e.stopPropagation();
                                onLoadToEditor(pj, activeId, it.id);
                              }}
                              title="Load this post in the editor"
                            >
                              <Edit2 className="w-3 h-3 mr-1" />
                              Edit
                            </button>
                          )}
                          <button
                            className="chip"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteItem(it.id);
                            }}
                            title="Remove from deck"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              </>
            )}
          </div>
        </div>
      </div>

      <PostPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        post={previewPost}
        onLoadToEditor={onLoadToEditor}
      />
      
      <ShareModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        url={shareUrl}
        deckTitle={activeDeck?.title}
      />
    </div>
  );
}

// Share Modal Component
function ShareModal({ open, onClose, url, deckTitle }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
        // Fallback: select the text
        const input = document.querySelector('#share-url-input');
        if (input) {
          input.select();
          input.setSelectionRange(0, 99999);
        }
      }
    } else {
      // Fallback: select the text
      const input = document.querySelector('#share-url-input');
      if (input) {
        input.select();
        input.setSelectionRange(0, 99999);
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 m-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Share Deck</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-3">
            Share "{deckTitle}" with this public link. The link stays the same and updates automatically with any changes to your deck.
          </p>
          
          <div className="flex items-center gap-2">
            <input
              id="share-url-input"
              type="text"
              value={url}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
            />
            <button
              onClick={handleCopy}
              className="btn-outline px-3 py-2 flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-outline">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}