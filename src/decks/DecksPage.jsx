import React, { useEffect, useMemo, useState } from "react";
import {
  listDecks,
  listDeckItems,
  addItemToDeck,
  deleteDeck,
  deleteDeckItem,
} from "../data/decks";
import { ensurePostShape } from "../data/postShape";
import { Trash2, Plus, Play, ArrowLeft, Image as ImageIcon, Images, Film } from "lucide-react";
import PostPreviewModal from "./PostPreviewModal";

const cx = (...a) => a.filter(Boolean).join(" ");

export default function DecksPage({
  userId,
  currentPost,
  onBack,
  onPresent,          // (deckId) => void
  onLoadToEditor,     // optional: (post) => void
}) {
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [decks, setDecks] = useState([]);
  const [activeId, setActiveId] = useState(null); // store as string
  const [items, setItems] = useState([]);

  // modal preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPost, setPreviewPost] = useState(null);

  const activeDeck = useMemo(
    () => decks.find((d) => String(d.id) === activeId) || null,
    [decks, activeId]
  );

  useEffect(() => {
    let mounted = true;
    async function run() {
      if (!userId) {
        setDecks([]);
        setLoadingDecks(false);
        return;
      }
      setLoadingDecks(true);
      try {
        const rows = await listDecks(userId);
        if (!mounted) return;
        setDecks(rows);
        if (rows.length && !activeId) setActiveId(String(rows[0].id));
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoadingDecks(false);
      }
    }
    run();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    let mounted = true;
    async function loadItems() {
      if (!activeId) {
        setItems([]);
        return;
      }
      setLoadingItems(true);
      try {
        const rows = await listDeckItems(activeId);
        if (!mounted) return;
        setItems(rows);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoadingItems(false);
      }
    }
    loadItems();
    return () => { mounted = false; };
  }, [activeId]);

  async function handleAddCurrent() {
    if (!currentPost || !activeId) return;
    try {
      await addItemToDeck(activeId, ensurePostShape(currentPost));
      const rows = await listDeckItems(activeId);
      setItems(rows);
    } catch (e) {
      console.error(e);
      alert("Could not add post.");
    }
  }

  async function handleDeleteDeck(deckId) {
    if (!deckId) return;
    if (!confirm("Delete this deck and all posts in it?")) return;
    try {
      await deleteDeck(deckId);
      const rows = await listDecks(userId);
      setDecks(rows);
      if (rows.length) {
        setActiveId(String(rows[0].id));
      } else {
        setActiveId(null);
        setItems([]);
      }
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
            disabled={!activeDeck || !currentPost}
            onClick={handleAddCurrent}
            title="Add the current editor post to this deck"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add current post
          </button>
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
            <div className="max-h-[60vh] overflow-auto">
              {loadingDecks ? (
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
                        onClick={() => setActiveId(idStr)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setActiveId(idStr);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
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
                            <div className="min-w-0">
                              <div className="font-medium truncate">{d.title}</div>
                              <div className="text-app-muted text-xs">
                                {new Date(d.created_at).toLocaleString()}
                              </div>
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

            {loadingItems ? (
              <div className="p-4 text-sm text-app-muted">Loading...</div>
            ) : !activeDeck ? (
              <div className="p-4 text-sm text-app-muted">Pick a deck</div>
            ) : items.length === 0 ? (
              <div className="p-4 text-sm text-app-muted">
                This deck has no posts. Use Add current post.
              </div>
            ) : (
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

                  const thumb =
                    pj.type === "video" && pj.videoSrc
                      ? pj.videoSrc
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
                      className="border border-app rounded-lg overflow-hidden cursor-pointer"
                      onClick={() => openPreview(pj)}
                    >
                      <div className="relative aspect-square bg-app-muted">
                        {thumb ? (
                          pj.type === "video" ? (
                            <video
                              src={thumb}
                              className="absolute inset-0 w-full h-full object-cover"
                              muted
                              playsInline
                              preload="metadata"
                            />
                          ) : (
                            <img
                              src={thumb}
                              className="absolute inset-0 w-full h-full object-cover"
                              alt=""
                              draggable={false}
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
                        <div className="text-sm truncate">{label}</div>
                        <div className="text-app-muted text-xs">
                          {new Date(it.created_at).toLocaleString()}
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-2">
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
    </div>
  );
}
