// src/data/decks.js
import { supabase } from "../lib/supabaseClient";

// Types
// Deck: { id, user_id, title, created_at }
// DeckItem: { id, deck_id, order_index, post_json, created_at }

export async function listDecks(userId) {
  const { data, error } = await supabase
    .from("decks")
    .select("id, title, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createDeck(userId, title) {
  const { data, error } = await supabase
    .from("decks")
    .insert([{ user_id: userId, title }])
    .select("id, title, created_at")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDeck(deckId) {
  const { error } = await supabase
    .from("decks")
    .delete()
    .eq("id", deckId);
  if (error) throw error;
  return true;
}

export async function addItemToDeck(deckId, postJson, orderIndex = null) {
  // If orderIndex is null, place at end
  let finalIndex = orderIndex;
  if (finalIndex == null) {
    const { data: maxRow, error: maxErr } = await supabase
      .from("deck_items")
      .select("order_index")
      .eq("deck_id", deckId)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (maxErr) throw maxErr;
    finalIndex = maxRow ? (maxRow.order_index + 1) : 0;
  }

  const { data, error } = await supabase
    .from("deck_items")
    .insert([{ deck_id: deckId, order_index: finalIndex, post_json: postJson }])
    .select("id, deck_id, order_index, post_json, created_at")
    .single();
  if (error) throw error;
  return data;
}

export async function listDeckItems(deckId) {
  const { data, error } = await supabase
    .from("deck_items")
    .select("id, deck_id, order_index, post_json, created_at")
    .eq("deck_id", deckId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function deleteDeckItem(itemId) {
  const { error } = await supabase
    .from("deck_items")
    .delete()
    .eq("id", itemId);
  if (error) throw error;
  return true;
}

export async function reorderDeckItems(deckId, orderedIds) {
  // orderedIds: array of item ids in the desired order
  // Batch updates in a single RPC for consistency if you add one later.
  // For now, simple loop is fine for small lists.
  const updates = orderedIds.map((id, idx) => ({ id, order_index: idx }));
  for (const u of updates) {
    const { error } = await supabase
      .from("deck_items")
      .update({ order_index: u.order_index })
      .eq("id", u.id)
      .eq("deck_id", deckId);
    if (error) throw error;
  }
  return true;
}

// Helper to fetch a full deck ready for Present mode
export async function openDeck(deckId) {
  const [items] = await Promise.all([listDeckItems(deckId)]);
  // Return posts in order
  return items.map(row => row.post_json);
}
