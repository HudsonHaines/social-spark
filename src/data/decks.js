// src/data/decks.js
import { supabase } from "../lib/supabaseClient";

// Fetch all decks for the user
export async function listDecks(userId) {
  const { data, error } = await supabase
    .from("decks")
    .select("id, title, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// Create a new deck
export async function createDeck(userId, title) {
  const { data, error } = await supabase
    .from("decks")
    .insert([{ user_id: userId, title }])
    .select("id, title, created_at")
    .single();
  if (error) throw error;
  return data;
}

// Delete a deck
export async function deleteDeck(deckId) {
  const { error } = await supabase.from("decks").delete().eq("id", deckId);
  if (error) throw error;
  return true;
}

// Add a post to a deck
export async function addItemToDeck(deckId, postJson, orderIndex = null) {
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
    finalIndex = maxRow ? maxRow.order_index + 1 : 0;
  }

  const { data, error } = await supabase
    .from("deck_items")
    .insert([{ deck_id: deckId, order_index: finalIndex, post_json: postJson }])
    .select("id, deck_id, order_index, post_json, created_at")
    .single();
  if (error) throw error;
  return data;
}

// Fetch all posts inside a deck
export async function listDeckItems(deckId) {
  const { data, error } = await supabase
    .from("deck_items")
    .select("id, deck_id, order_index, post_json, created_at")
    .eq("deck_id", deckId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data || [];
}

// Delete a specific post from a deck
export async function deleteDeckItem(itemId) {
  const { error } = await supabase.from("deck_items").delete().eq("id", itemId);
  if (error) throw error;
  return true;
}

// Reorder deck items
export async function reorderDeckItems(deckId, orderedIds) {
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

// Fetch a deck with posts ready for presentation mode
export async function openDeck(deckId) {
  const items = await listDeckItems(deckId);
  return items.map((row) => row.post_json);
}

/* -------- Sharing helpers -------- */

function randomToken(len = 32) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function createDeckShare(deckId, { days = 7 } = {}) {
  const token = randomToken(32);
  const expires_at =
    days && days > 0
      ? new Date(Date.now() + days * 86400000).toISOString()
      : null;

  const { data, error } = await supabase
    .from("deck_shares")
    .insert([{ deck_id: deckId, token, expires_at }])
    .select("token")
    .single();

  if (error) throw error;
  return data.token;
}

export async function revokeDeckShare(token) {
  const { error } = await supabase
    .from("deck_shares")
    .update({ is_revoked: true })
    .eq("token", token);
  if (error) throw error;
  return true;
}
