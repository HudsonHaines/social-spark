import { supabase } from '../lib/supabaseClient';
import { ensurePostShape } from './postShape';

// db row -> app item
function mapRow(row) {
  const safePost = ensurePostShape(row?.post);
  return {
    id: row.id,
    createdAt: Date.parse(row.created_at || new Date().toISOString()),
    post: safePost,
  };
}

async function getUid() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

export async function fetchDeckFromSupabase() {
  const uid = await getUid();
  if (!uid) return [];

  const { data, error } = await supabase
    .from('deck_posts')
    .select('id, post, created_at, updated_at')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapRow);
}

export async function addDeckPostToSupabase(post) {
  const uid = await getUid();
  if (!uid) throw new Error('Not signed in');

  const safePost = ensurePostShape({ ...post, id: post?.id || crypto.randomUUID() });

  const { data, error } = await supabase
    .from('deck_posts')
    .insert([{ user_id: uid, post: safePost }])
    .select('id, post, created_at, updated_at')
    .single();

  if (error) throw error;
  return mapRow(data);
}

export async function updateDeckPostInSupabase(id, post) {
  const uid = await getUid();
  if (!uid) throw new Error('Not signed in');

  const safePost = ensurePostShape({ ...post, id: post?.id || id });

  const { data, error } = await supabase
    .from('deck_posts')
    .update({ post: safePost, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', uid)
    .select('id, post, created_at, updated_at')
    .single();

  if (error) throw error;
  return mapRow(data);
}

export async function deleteDeckPostFromSupabase(id) {
  const uid = await getUid();
  if (!uid) throw new Error('Not signed in');

  const { error } = await supabase
    .from('deck_posts')
    .delete()
    .eq('id', id)
    .eq('user_id', uid);

  if (error) throw error;
  return true;
}

export async function duplicateDeckPostInSupabase(id) {
  const uid = await getUid();
  if (!uid) throw new Error('Not signed in');

  // fetch the source row scoped to the owner
  const { data: src, error: fetchErr } = await supabase
    .from('deck_posts')
    .select('id, post, created_at, updated_at')
    .eq('id', id)
    .eq('user_id', uid)
    .single();

  if (fetchErr) throw fetchErr;
  if (!src) throw new Error('Source not found');

  const postCopy = ensurePostShape({ ...src.post, id: crypto.randomUUID() });

  const { data, error } = await supabase
    .from('deck_posts')
    .insert([{ user_id: uid, post: postCopy }])
    .select('id, post, created_at, updated_at')
    .single();

  if (error) throw error;
  return mapRow(data);
}

