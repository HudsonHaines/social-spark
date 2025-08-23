import { supabase } from '../lib/supabaseClient';

async function getUid() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

export async function fetchBrands() {
  const uid = await getUid();
  if (!uid) return [];
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createBrand(brand) {
  const uid = await getUid();
  if (!uid) throw new Error('Not signed in');
  const payload = {
    user_id: uid,
    fb_name: brand.fb_name || '',
    fb_avatar_url: brand.fb_avatar_url || null,
    ig_username: brand.ig_username || '',
    ig_avatar_url: brand.ig_avatar_url || null,
    verified: !!brand.verified,
  };
  const { data, error } = await supabase
    .from('brands')
    .insert([payload])
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateBrand(id, patch) {
  const uid = await getUid();
  if (!uid) throw new Error('Not signed in');
  const payload = {
    fb_name: patch.fb_name,
    fb_avatar_url: patch.fb_avatar_url,
    ig_username: patch.ig_username,
    ig_avatar_url: patch.ig_avatar_url,
    verified: patch.verified,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('brands')
    .update(payload)
    .eq('id', id)
    .eq('user_id', uid)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBrand(id) {
  const uid = await getUid();
  if (!uid) throw new Error('Not signed in');
  const { error } = await supabase
    .from('brands')
    .delete()
    .eq('id', id)
    .eq('user_id', uid);
  if (error) throw error;
  return true;
}

export async function uploadBrandAvatar(file, keyPrefix) {
  const uid = await getUid();
  if (!uid) throw new Error('Not signed in');
  const safeName = file.name?.replace(/\s+/g, '_') || 'avatar';
  const path = `${uid}/${keyPrefix}/${Date.now()}_${safeName}`;
  const { error: upErr } = await supabase
    .storage
    .from('brand_avatars')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    });
  if (upErr) throw upErr;
  const { data: pub } = supabase
    .storage
    .from('brand_avatars')
    .getPublicUrl(path);
  return pub.publicUrl;
}
