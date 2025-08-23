import { supabase } from '../lib/supabaseClient'

export async function getMyProfile() {
  const { data: { user }, error: uErr } = await supabase.auth.getUser()
  if (uErr) throw uErr
  if (!user) throw new Error('No user')

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, updated_at')
    .eq('id', user.id)
    .maybeSingle()

  if (error) throw error
  return data || { id: user.id, display_name: '', avatar_url: '' }
}

export async function upsertMyProfile({ display_name, avatar_url }) {
  const { data: { user }, error: uErr } = await supabase.auth.getUser()
  if (uErr) throw uErr
  if (!user) throw new Error('No user')

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      display_name: display_name ?? null,
      avatar_url: avatar_url ?? null,
      updated_at: new Date().toISOString(),
    })
    .select('id, display_name, avatar_url, updated_at')
    .single()

  if (error) throw error
  return data
}

export async function uploadAvatar(file) {
  const { data: { user }, error: uErr } = await supabase.auth.getUser()
  if (uErr) throw uErr
  if (!user) throw new Error('No user')

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