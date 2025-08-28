// src/components/SaveToDeckModal.jsx
import React, { useEffect, useMemo, useState } from "react";

export default function SaveToDeckModal({
  open,
  onClose,
  initialDecks = [],
  onCreateAndSave, // async (title) => deckId
  onSaveToExisting, // async (deckId) => void
}) {
  const [decks, setDecks] = useState(initialDecks);
  const [newTitle, setNewTitle] = useState("");
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDecks(initialDecks);
    // default to first deck if present
    setSelectedDeckId(initialDecks[0]?.id || "");
  }, [initialDecks]);

  if (!open) return null;

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      if (newTitle.trim()) {
        const id = await onCreateAndSave(newTitle.trim());
        setSelectedDeckId(id);
      } else if (selectedDeckId) {
        await onSaveToExisting(selectedDeckId);
      } else {
        alert("Pick a deck or enter a new title.");
        return;
      }
      onClose?.();
    } catch (e) {
      console.error(e);
      alert("Could not save to deck.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white border shadow-xl">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Save to deck</h2>
          <button className="px-2 py-1 text-sm rounded hover:bg-slate-100" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Choose existing deck</label>
            <select
              className="select w-full"
              value={selectedDeckId}
              onChange={(e) => setSelectedDeckId(e.target.value)}
            >
              {decks.length === 0 ? (
                <option value="">No decks yet</option>
              ) : null}
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-500">Or create new deck</label>
            <input
              className="input w-full"
              placeholder="New deck title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button className="btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
