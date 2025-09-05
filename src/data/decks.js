import { supabase } from "../lib/supabaseClient";
import { handleSupabaseError, withRetry, validators } from '../lib/supabaseUtils';

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

export async function renameDeck(deckId, newTitle) {
  validateDeckId(deckId);
  if (!newTitle?.trim()) throw new Error('Deck title is required');
  
  const { data, error } = await supabase
    .from("decks")
    .update({ title: newTitle.trim() })
    .eq("id", deckId)
    .select("id, title, created_at")
    .single();
    
  if (error) throw error;
  return data;
}

export async function updateDeckApproval(deckId, approved) {
  validateDeckId(deckId);
  if (typeof approved !== 'boolean') throw new Error('Approved must be a boolean value');
  
  const { data, error } = await supabase
    .from("decks")
    .update({ approved })
    .eq("id", deckId)
    .select("id, title, created_at, approved")
    .single();
    
  if (error) throw error;
  return data;
}

export async function getDeck(deckId) {
  validateDeckId(deckId);
  
  const { data, error } = await supabase
    .from("decks")
    .select("id, title, created_at, approved")
    .eq("id", deckId)
    .single();
    
  if (error) throw error;
  return data;
}

// Delivery link functions (similar to share links but for social media managers)
export async function getExistingDeliveryLink(deckId) {
  const { data, error } = await supabase
    .from("deck_delivery_links")
    .select(`
      token,
      expires_at,
      created_at,
      is_revoked
    `)
    .eq("deck_id", deckId)
    .eq("is_revoked", false)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] || null;
}

async function createDeliveryLink(deckId, { days = 365 } = {}) {
  const token = crypto.randomUUID();
  const expires_at = new Date();
  expires_at.setDate(expires_at.getDate() + days);

  const { error } = await supabase
    .from("deck_delivery_links")
    .insert([{ deck_id: deckId, token, expires_at }]);

  if (error) throw error;
  return token;
}

// Get or create a delivery link for a deck (reuses existing non-revoked links)
export async function getOrCreateDeliveryLink(deckId, { days = 365 } = {}) {
  validateDeckId(deckId);
  
  try {
    // First check if there's an existing non-revoked delivery link
    const existing = await getExistingDeliveryLink(deckId);
    
    if (existing && existing.token) {
      // Check if it's not expired (or has no expiration)
      if (!existing.expires_at || new Date(existing.expires_at) > new Date()) {
        return existing.token;
      }
    }
    
    // If no existing valid link, create a new one
    return await createDeliveryLink(deckId, { days });
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'getOrCreateDeliveryLink', deckId });
  }
}

export async function revokeDeliveryLink(token) {
  if (!validators.nonEmptyString(token)) {
    throw handleSupabaseError(new Error('Valid delivery token is required'), { token });
  }
  
  try {
    const { error } = await supabase
      .from("deck_delivery_links")
      .update({ 
        is_revoked: true, 
        revoked_at: new Date().toISOString() 
      })
      .eq("token", token);
    
    if (error) throw error;
    return true;
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'revokeDeliveryLink', token });
  }
}

// Get deck data from delivery token (for delivery page)
export async function getDeckFromDeliveryToken(token) {
  if (!validators.nonEmptyString(token)) {
    throw new Error('Valid delivery token is required');
  }
  
  try {
    const { data, error } = await supabase
      .from("deck_delivery_links")
      .select(`
        token,
        expires_at,
        is_revoked,
        decks!inner (
          id,
          title,
          created_at,
          approved
        )
      `)
      .eq("token", token)
      .eq("is_revoked", false)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Delivery link not found or has been revoked');
      }
      throw error;
    }
    
    // Check if link is expired
    if (data.expires_at && new Date(data.expires_at) <= new Date()) {
      throw new Error('Delivery link has expired');
    }
    
    // Check if deck is approved
    if (!data.decks.approved) {
      throw new Error('This deck is no longer approved for delivery');
    }
    
    return {
      deckId: data.decks.id,
      deck: data.decks
    };
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'getDeckFromDeliveryToken', token });
  }
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

export async function updateDeckItem(itemId, postJson) {
  if (!itemId) throw new Error('Item ID is required');
  if (!postJson || typeof postJson !== 'object') throw new Error('Invalid post data');
  
  console.log('🔄 updateDeckItem called with:', { itemId, postJsonKeys: Object.keys(postJson) });
  
  // Add version tracking
  const updatedPost = {
    ...postJson,
    version: (postJson.version || 1) + 1,
    updatedAt: new Date().toISOString()
  };
  
  console.log('📝 About to update item:', itemId, 'with version:', updatedPost.version);
  
  const { data, error } = await supabase
    .from("deck_items")
    .update({ post_json: updatedPost })
    .eq("id", itemId)
    .select("id, deck_id, order_index, post_json, created_at")
    .single();
    
  if (error) throw error;
  return data;
}

export async function deleteDeckItems(itemIds) {
  if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
    throw new Error('Item IDs array is required');
  }
  
  const { error } = await supabase
    .from("deck_items")
    .delete()
    .in("id", itemIds);
    
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

// Get or create a share link for a deck (reuses existing non-revoked links)
export async function getOrCreateDeckShare(deckId, { days = 7 } = {}) {
  validateDeckId(deckId);
  
  try {
    // First check if there's an existing non-revoked share link
    const existing = await getExistingDeckShare(deckId);
    
    if (existing && existing.token) {
      // Check if it's not expired
      if (!existing.expires_at || new Date(existing.expires_at) > new Date()) {
        return existing.token;
      }
    }
    
    // If no existing valid link, create a new one
    return await createDeckShare(deckId, { days });
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'getOrCreateDeckShare', deckId });
  }
}

export async function revokeDeckShare(token) {
  if (!validators.nonEmptyString(token)) {
    throw handleSupabaseError(new Error('Valid share token is required'), { token });
  }
  
  try {
    const { error } = await supabase
      .from("deck_shares")
      .update({ 
        is_revoked: true, 
        revoked_at: new Date().toISOString() 
      })
      .eq("token", token);
    
    if (error) throw error;
    return true;
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'revokeDeckShare', token });
  }
}

// Delete a share link permanently
export async function deleteDeckShare(token) {
  if (!validators.nonEmptyString(token)) {
    throw handleSupabaseError(new Error('Valid share token is required'), { token });
  }
  
  try {
    const { error } = await supabase
      .from("deck_shares")
      .delete()
      .eq("token", token);
    
    if (error) throw error;
    return true;
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'deleteDeckShare', token });
  }
}

// Get deck share info
export async function getDeckShareInfo(token) {
  if (!validators.nonEmptyString(token)) {
    throw handleSupabaseError(new Error('Valid share token is required'), { token });
  }
  
  try {
    const { data, error } = await supabase
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
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'getDeckShareInfo', token });
  }
}

// Get existing share link for a specific deck
export async function getExistingDeckShare(deckId) {
  validateDeckId(deckId);
  
  try {
    const { data, error } = await supabase
      .from("deck_shares")
      .select(`
        token,
        expires_at,
        is_revoked,
        created_at,
        share_count,
        max_shares,
        last_accessed_at
      `)
      .eq("deck_id", deckId)
      .eq("is_revoked", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'getExistingDeckShare', deckId });
  }
}

// Get all share links for a user
export async function getUserDeckShares(userId) {
  validateUserId(userId);
  
  try {
    const { data, error } = await supabase
      .from("deck_shares")
      .select(`
        token,
        expires_at,
        is_revoked,
        created_at,
        revoked_at,
        share_count,
        max_shares,
        last_accessed_at,
        decks!inner(id, title, user_id)
      `)
      .eq("decks.user_id", userId)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'getUserDeckShares', userId });
  }
}

// Update share link expiration
export async function updateDeckShareExpiration(token, expirationDate) {
  if (!validators.nonEmptyString(token)) {
    throw handleSupabaseError(new Error('Valid share token is required'), { token });
  }
  
  const expires_at = expirationDate ? new Date(expirationDate).toISOString() : null;
  
  try {
    const { data, error } = await supabase
      .from("deck_shares")
      .update({ expires_at })
      .eq("token", token)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'updateDeckShareExpiration', token, expires_at });
  }
}

// Get share link analytics/stats
export async function getDeckShareStats(token) {
  if (!validators.nonEmptyString(token)) {
    throw handleSupabaseError(new Error('Valid share token is required'), { token });
  }
  
  try {
    const { data, error } = await supabase
      .from("deck_shares")
      .select(`
        token,
        share_count,
        max_shares,
        created_at,
        last_accessed_at,
        expires_at,
        is_revoked
      `)
      .eq("token", token)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'getDeckShareStats', token });
  }
}

// Export validation helpers for use in components
export { validateDeckId, validateUserId };
