import { supabase } from "../lib/supabaseClient";

// Input validation helpers
const validateUserId = (userId) => {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid user ID provided');
  }
};

const validateDeckId = (deckId) => {
  if (!deckId || (typeof deckId !== 'string' && typeof deckId !== 'number')) {
    throw new Error('Invalid deck ID provided');
  }
};

// Fetch all decks for the user
export async function listDecks(userId) {
  validateUserId(userId);
  const { data, error } = await supabase
    .from("decks")
    .select("id, title, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createDeck(userId, title) {
  validateUserId(userId);
  if (!title?.trim()) throw new Error('Deck title is required');
  const { data, error } = await supabase
    .from("decks")
    .insert([{ user_id: userId, title: title.trim() }])
    .select("id, title, created_at")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDeck(deckId) {
  validateDeckId(deckId);
  const { error } = await supabase.from("decks").delete().eq("id", deckId);
  if (error) throw error;
  return true;
}

export async function addItemToDeck(deckId, postJson, orderIndex = null) {
  validateDeckId(deckId);
  if (!postJson || typeof postJson !== 'object') throw new Error('Invalid post data');
  
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

export async function listDeckItems(deckId) {
  validateDeckId(deckId);
  const { data, error } = await supabase
    .from("deck_items")
    .select("id, deck_id, order_index, post_json, created_at")
    .eq("deck_id", deckId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function deleteDeckItem(itemId) {
  if (!itemId) throw new Error('Item ID is required');
  const { error } = await supabase.from("deck_items").delete().eq("id", itemId);
  if (error) throw error;
  return true;
}

export async function reorderDeckItems(deckId, orderedIds) {
  validateDeckId(deckId);
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    throw new Error('Invalid ordered IDs array');
  }

  // Batch update using a transaction-like approach
  const updates = orderedIds.map((id, index) => ({ 
    id, 
    deck_id: deckId, 
    order_index: index 
  }));

  const { error } = await supabase
    .from("deck_items")
    .upsert(updates, { onConflict: 'id' });
  
  if (error) throw error;
  return true;
}

// Fetch a deck with posts ready for presentation mode
export async function openDeck(deckId) {
  const items = await listDeckItems(deckId);
  return items.map((row) => row.post_json);
}

/* -------- Sharing helpers -------- */

// Optimized token generation
let tokenCache = new Map();
const CACHE_SIZE = 100;

function randomToken(length = 32) {
  // Simple cache to avoid regenerating similar tokens
  const cacheKey = `token_${length}`;
  if (tokenCache.has(cacheKey) && tokenCache.get(cacheKey).length > 0) {
    return tokenCache.get(cacheKey).pop();
  }
  
  return crypto.getRandomValues(new Uint8Array(length)).reduce((str, byte) => 
    str + byte.toString(36), '').slice(0, length);
}

export async function createDeckShare(deckId, { days = 7 } = {}) {
  validateDeckId(deckId);
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
  if (!validators.nonEmptyString(token)) {
    throw handleSupabaseError(new Error('Valid share token is required'), { token });
  }
  
  return executeSupabaseQuery(
    () => supabase
      .from("deck_shares")
      .update({ 
        is_revoked: true, 
        revoked_at: new Date().toISOString() 
      })
      .eq("token", token),
    { operation: 'revokeDeckShare', token }
  ).then(() => true);
}

// Get deck share info
export async function getDeckShareInfo(token) {
  if (!validators.nonEmptyString(token)) {
    throw handleSupabaseError(new Error('Valid share token is required'), { token });
  }
  
  return executeSupabaseQuery(
    () => supabase
      .from("deck_shares")
      .select(`
        token,
        expires_at,
        is_revoked,
        created_at,
        share_count,
        max_shares,
        decks!inner(id, title, user_id)
      `)
      .eq("token", token)
      .single(),
    { operation: 'getDeckShareInfo', token }
  ).then(result => result.data);
}

// Export validation helpers for use in components
export { validateDeckId, validateUserId };
