// src/decks/DeckPickerV3.jsx
import React, { useEffect, useState } from "react";
import { listDecks, createDeck } from "../data/decks";

export default function DeckPickerV3({ userId, open, onClose, onPick }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [decks, setDecks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    console.log("DeckPickerV3 mounted"); // sanity log
    let mounted = true;
    (async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const rows = await listDecks(userId);
        if (!mounted) return;
        setDecks(rows);
        setSelectedId((prev) => prev ?? (rows?.[0]?.id ? String(rows[0].id) : null));
      } catch (e) {
        console.error(e);
        alert("Could not load decks.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [open, userId]);

  async function handleCreate() {
    const title = newTitle.trim();
    if (!title) return;
    if (!userId) { alert("Please sign in first."); return; }
    setCreating(true);
    try {
      const d = await createDeck(userId, title);
      const rows = await listDecks(userId);
      setDecks(rows);
      setSelectedId(String(d.id));
      setNewTitle("");
    } catch (e) {
      console.error(e);
      alert("Could not create deck.");
    } finally {
      setCreating(false);
    }
  }

  async function handleSave() {
    if (!selectedId) { alert("Pick a deck first."); return; }
    if (typeof onPick !== "function") { alert("Save handler missing."); return; }
    setSaving(true);
    try {
      await onPick(selectedId);
      onClose?.();
    } catch (e) {
      console.error(e);
      alert("Could not save to deck.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200]"
      id="deck-picker-v3"
      data-version="v3"
      style={{ outline: "2px dashed #046BD9" }} // obvious visual marker
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                   w-[92vw] max-w-[560px] bg-white rounded-xl shadow-xl border"
      >
        <div className="flex items-center justify-between px-4 h-14 border-b">
          <div className="font-medium">Save to deck · v3</div>
          <button className="btn-outline" onClick={onClose}>Close</button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <div className="label-strong mb-2">Choose a deck</div>
            <div className="max-h-60 overflow-auto border rounded">
              {loading ? (
                <div className="p-3 text-sm text-app-muted">Loading…</div>
              ) : decks.length === 0 ? (
                <div className="p-3 text-sm text-app-muted">No decks yet.</div>
              ) : (
                <ul className="divide-y">
                  {decks.map((d) => {
                    const idStr = String(d.id);
                    const selected = selectedId === idStr;
                    return (
                      <li
                        key={idStr}
                        role="radio"
                        aria-checked={selected}
                        tabIndex={0}
                        className={`outline-none ${selected ? "bg-slate-50" : "hover:bg-slate-50"}`}
                        onClick={() => setSelectedId(idStr)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedId(idStr);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3 px-3 py-2 cursor-pointer w-full">
                          {/* custom radio */}
                          <span
                            aria-hidden="true"
                            className="inline-block"
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 9999,
                              border: `1px solid ${selected ? "var(--brand-500)" : "var(--app-border)"}`,
                              background: selected ? "var(--brand-500)" : "white",
                              boxShadow: selected ? "0 0 0 3px rgba(4,107,217,0.20)" : "none",
                              flex: "0 0 auto",
                            }}
                          />
                          <div className="min-w-0">
                            <div className="font-medium truncate">{d.title}</div>
                            <div className="text-xs text-app-muted">
                              {new Date(d.created_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div>
            <div className="label-strong mb-2">Or create a new deck</div>
            <div className="flex items-center gap-2">
              <input
                className="input flex-1 min-w-0"
                placeholder="Deck title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
              />
              <button className="btn-outline" onClick={handleCreate} disabled={creating || !newTitle.trim()}>
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t flex items-center justify-end gap-2">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={handleSave} disabled={saving || !selectedId}>
            {saving ? "Saving…" : "Save here"}
          </button>
        </div>
      </div>
    </div>
  );
}
