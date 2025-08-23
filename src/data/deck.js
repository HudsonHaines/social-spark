// src/data/deck.js
import { supabase } from '../lib/supabaseClient'

async function getUser() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const user = data?.session?.user
  if (!user) throw new Error('No session')
  return user
}

function sanitizePostForPersist(post) {
  // object URLs for local videos do not survive reloads
  if (post?.type === 'video') {
    return { ...post, videoSrc: '' }
  }
  return post
}

export async function fetchDeckFromSupabase() {
  const user = await getUser()
  const { data, error } = await supabase
    .from('deck_posts')
    .select('id, created_at, post_json')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(r => ({
    id: r.id,
    createdAt: new Date(r.created_at).getTime(),
    post: r.post_json
  }))
}

export async function addDeckPostToSupabase(post) {
  const user = await getUser()
  const id = crypto.randomUUID()
  const payload = {
    id,
    user_id: user.id,
    post_json: sanitizePostForPersist(post)
  }
  const { data, error } = await supabase
    .from('deck_posts')
    .insert(payload)
    .select('id, created_at, post_json')
    .single()
  if (error) throw error
  return {
    id: data.id,
    createdAt: new Date(data.created_at).getTime(),
    post: data.post_json
  }
}

export async function updateDeckPostInSupabase(id, post) {
  const user = await getUser()
  const { data, error } = await supabase
    .from('deck_posts')
    .update({ post_json: sanitizePostForPersist(post) })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, created_at, post_json')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Not found')
  return {
    id: data.id,
    createdAt: new Date(data.created_at).getTime(),
    post: data.post_json
  }
}

export async function deleteDeckPostFromSupabase(id) {
  const user = await getUser()
  const { error } = await supabase
    .from('deck_posts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) throw error
}

export async function duplicateDeckPostInSupabase(id) {
  const user = await getUser()
  // fetch original
  const { data: orig, error: selErr } = await supabase
    .from('deck_posts')
    .select('post_json')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (selErr) throw selErr
  if (!orig) throw new Error('Original not found')

  // insert copy
  const copyId = crypto.randomUUID()
  const { data, error } = await supabase
    .from('deck_posts')
    .insert({
      id: copyId,
      user_id: user.id,
      post_json: sanitizePostForPersist({ ...orig.post_json, id: crypto.randomUUID() })
    })
    .select('id, created_at, post_json')
    .single()
  if (error) throw error

  return {
    id: data.id,
    createdAt: new Date(data.created_at).getTime(),
    post: data.post_json
  }
}
