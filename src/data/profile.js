import { supabase } from '../lib/supabaseClient';
import { handleSupabaseError, withRetry, validators } from '../lib/supabaseUtils';

export async function getCurrentUser() {
  try {
    const { data: { session }, error } = await withRetry(
      () => supabase.auth.getSession(),
      { maxRetries: 2, retryableErrors: ['network', 'timeout'] }
    );
    
    if (error) throw error;
    return session?.user || null;
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'getCurrentUser' });
  }
}

export async function fetchProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    // Not found is OK for profiles
    if (error.code === 'PGRST116') {
      return null;
    }
    throw handleSupabaseError(error, { operation: 'fetchProfile', userId: user.id });
  }
}

export async function ensureProfileExists() {
  const user = await getCurrentUser();
  if (!user) return null;

  // Validate user data
  if (!validators.uuid(user.id)) {
    throw handleSupabaseError(new Error('Invalid user ID format'), { userId: user.id });
  }

  // Sanitize display name
  const rawDisplayName = user.user_metadata?.full_name ||
                        user.user_metadata?.name ||
                        user.email?.split('@')[0] ||
                        'User';
  
  const displayName = typeof rawDisplayName === 'string' 
    ? rawDisplayName.trim().slice(0, 50) // Limit length
    : 'User';

  // Validate avatar URL if present
  const avatarUrl = user.user_metadata?.avatar_url;
  if (avatarUrl && !validators.url(avatarUrl)) {
    console.warn('Invalid avatar URL from OAuth provider:', avatarUrl);
  }

  const base = {
    id: user.id,
    display_name: displayName,
    avatar_url: (avatarUrl && validators.url(avatarUrl)) ? avatarUrl : null,
  };

  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ 
        ...base, 
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'ensureProfileExists', userId: user.id });
  }
}

export async function saveProfile({ display_name, avatar_url }) {
  const user = await getCurrentUser();
  if (!user) {
    throw handleSupabaseError(new Error('Not signed in'), { operation: 'saveProfile' });
  }

  // Validate inputs
  if (!display_name || !validators.nonEmptyString(display_name)) {
    throw handleSupabaseError(new Error('Display name is required'), { operation: 'saveProfile' });
  }

  if (display_name.length > 50) {
    throw handleSupabaseError(new Error('Display name must be 50 characters or less'), { 
      operation: 'saveProfile', 
      displayNameLength: display_name.length 
    });
  }

  if (avatar_url && !validators.url(avatar_url)) {
    throw handleSupabaseError(new Error('Avatar URL must be a valid URL'), { 
      operation: 'saveProfile', 
      avatar_url 
    });
  }

  // Sanitize inputs
  const sanitizedData = {
    display_name: display_name.trim(),
    avatar_url: avatar_url?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(sanitizedData)
      .eq('id', user.id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'saveProfile', userId: user.id });
  }
}

export async function uploadAvatarFile(file) {
  const user = await getCurrentUser();
  if (!user) {
    throw handleSupabaseError(new Error('Not signed in'), { operation: 'uploadAvatar' });
  }

  // Comprehensive file validation
  if (!file || !(file instanceof File)) {
    throw handleSupabaseError(new Error('Invalid file provided'), { operation: 'uploadAvatar' });
  }

  if (!file.type.startsWith('image/')) {
    throw handleSupabaseError(new Error('File must be an image'), { 
      operation: 'uploadAvatar', 
      fileType: file.type 
    });
  }

  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw handleSupabaseError(new Error('File size must be less than 5MB'), { 
      operation: 'uploadAvatar', 
      fileSize: file.size,
      maxSize 
    });
  }

  // Sanitize file name
  const sanitizedFileName = file.name
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
    .slice(0, 100); // Limit length
  
  const path = `${user.id}/${Date.now()}_${sanitizedFileName}`;

  try {
    const { error: upErr } = await withRetry(
      () => supabase
        .storage
        .from('avatars')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type,
        }),
      { maxRetries: 2, retryableErrors: ['network', 'timeout'] }
    );

    if (upErr) throw upErr;

    const { data: pub } = supabase
      .storage
      .from('avatars')
      .getPublicUrl(path);

    // Validate the returned URL
    if (!pub.publicUrl || !validators.url(pub.publicUrl)) {
      throw handleSupabaseError(new Error('Invalid public URL returned from storage'), {
        operation: 'uploadAvatar',
        publicUrl: pub.publicUrl
      });
    }

    return pub.publicUrl;
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'uploadAvatar', fileName: sanitizedFileName });
  }
}