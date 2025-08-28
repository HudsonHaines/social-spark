// src/decks/DeckManager.jsx
import React, { useEffect, useState } from "react";
import { listDecks, createDeck, deleteDeck, listDeckItems, openDeck } from "../data/decks";
import { useAuth } from "../auth/AuthProvider";

const cx = (...a) => a.filter(Boolean).join(" ");

function DeckManagerInner({ onOpenForPresent, onClose }) {
  const { user } = useAuth();
  const userId = user?.id || user?.user?.id || null;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!userId) { setLoading(false); return; }
      setLoading(true);
      try {
        const data = await listDecks(userId);
        if (mounted) setRows(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [userId]);

  async function handleCreate() {
    const t = title.trim();
    if (!t || !userId) return;
    setCreating(true);
    try {
      const deck = await createDeck(userId, t);
      setRows((prev) => [deck, ...prev]);
      setTitle("");
    } catch (e) {
      console.error(e);
      alert("Could not create deck");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id) {
    if (!id) return;
    if (!confirm("Delete this deck?")) return;
    setBusyId(id);
    try {
      await deleteDeck(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.error(e);
      alert("Could not delete deck");
    } finally {
      setBusyId(null);
    }
  }

  async function handleOpen(id) {
    if (!id) return;
    setBusyId(id);
    try {
      const items = await listDeckItems(id);
      if (onOpenForPresent) {
        const posts = items.map((r) => r.post_json);
        onOpenForPresent({ deckId: id, count: items.length, posts });
      } else {
        const posts = await openDeck(id);
        alert(`Loaded deck with ${posts.length} post(s). Wire onOpenForPresent to present it.`);
      }
      onClose?.();
    } catch (e) {
      console.error(e);
      alert("Could not open deck");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-xl border">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-semibold">Decks</h2>
          <button className="px-2 py-1 text-sm rounded hover:bg-slate-100" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="New deck title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <button className="btn" onClick={handleCreate} disabled={creating || !title.trim()}>
              {creating ? "Creating..." : "Create"}
            </button>
          </div>

          {loading ? (
            <div className="text-sm text-slate-500">Loading decks...</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-slate-500">No decks yet</div>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-auto pr-1">
              {rows.map((d) => {
                const isBusy = busyId === d.id;
                const created = new Date(d.created_at);
                return (
                  <li
                    key={d.id}
                    className="border rounded-lg p-3 flex items-center justify-between hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{d.title}</div>
                      <div className="text-xs text-slate-500">
                        {isNaN(created.getTime()) ? "" : created.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        className="px-2 py-1 text-sm rounded border"
                        onClick={() => handleOpen(d.id)}
                        disabled={isBusy}
                        title="Open for Present mode"
                      >
                        {isBusy ? "Opening..." : "Open"}
                      </button>
                      <button
                        className="px-2 py-1 text-sm rounded border"
                        onClick={() => handleDelete(d.id)}
                        disabled={isBusy}
                        title="Delete deck"
                      >
                        {isBusy ? "..." : "Delete"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// Default export
export default function DeckManager(props) {
  return <DeckManagerInner {...props} />;
}
