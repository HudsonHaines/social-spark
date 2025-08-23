import { supabase } from '../lib/supabaseClient'

async function getUserFromSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const user = data?.session?.user
  if (!user) throw new Error('No session')
  return user
}

export async function getMyProfile() {
  const user = await getUserFromSession()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, updated_at')
    .eq('id', user.id)
    .maybeSingle()
  if (error) throw error
  return data || { id: user.id, display_name: '', avatar_url: '' }
}

export async function upsertMyProfile({ display_name, avatar_url }) {
  const user = await getUserFromSession()
  const payload = {
    id: user.id,
    display_name: display_name ?? null,
    avatar_url: avatar_url ?? null,
    updated_at: new Date().toISOString()
  }
  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('id, display_name, avatar_url, updated_at')
    .single()
  if (error) throw error
  return data
}

export async function uploadAvatar(file) {
  const user = await getUserFromSession()
  const ext = file.name.split('.').pop()
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`

  const { data, error } = await supabase
    .storage
    .from('avatars')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error

  const { data: pub } = supabase.storage.from('avatars').getPublicUrl(data.path)
  return pub.publicUrl
}
