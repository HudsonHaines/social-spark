import { supabase } from '../lib/supabaseClient';

export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
}

export async function fetchProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // not found is ok
  return data || null;
}

export async function ensureProfileExists() {
  const user = await getCurrentUser();
  if (!user) return null;

  const base = {
    id: user.id,
    display_name:
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'User',
    avatar_url: user.user_metadata?.avatar_url || null,
  };

  // upsert by id
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ ...base, updated_at: new Date().toISOString() })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function saveProfile({ display_name, avatar_url }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('profiles')
    .update({
      display_name,
      avatar_url,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function uploadAvatarFile(file) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not signed in');

  const path = `${user.id}/${Date.now()}_${file.name}`;

  const { error: upErr } = await supabase
    .storage
    .from('avatars')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    });

  if (upErr) throw upErr;

  const { data: pub } = supabase
    .storage
    .from('avatars')
    .getPublicUrl(path);

  return pub.publicUrl;
}
