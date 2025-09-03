import { supabase } from '../lib/supabaseClient';
import { handleSupabaseError, withRetry, validators } from '../lib/supabaseUtils';
import { getCurrentUser } from './profile';

// Organization data validation
function validateOrganization(org) {
  const errors = {};
  
  if (!org.name || !validators.nonEmptyString(org.name)) {
    errors.name = 'Organization name is required';
  }
  
  if (org.name && org.name.length > 100) {
    errors.name = 'Organization name must be 100 characters or less';
  }
  
  if (org.description && org.description.length > 500) {
    errors.description = 'Description must be 500 characters or less';
  }
  
  if (org.avatar_url && !validators.url(org.avatar_url)) {
    errors.avatar_url = 'Avatar URL must be a valid URL';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Sanitize organization input
function sanitizeOrganization(org = {}) {
  return {
    name: typeof org.name === 'string' ? org.name.trim() : '',
    description: typeof org.description === 'string' ? org.description.trim() : null,
    avatar_url: typeof org.avatar_url === 'string' ? org.avatar_url.trim() : null,
  };
}

/* =========================
   Organization CRUD
   ========================= */

export async function fetchUserOrganizations() {
  const user = await getCurrentUser();
  if (!user) return [];

  try {
    const { data, error } = await supabase
      .from('organizations')
      .select(`
        *,
        organization_memberships!inner(
          role,
          created_at
        )
      `)
      .eq('organization_memberships.user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'fetchUserOrganizations', userId: user.id });
  }
}

export async function fetchOrganizationById(orgId) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  if (!validators.uuid(orgId)) {
    throw new Error('Invalid organization ID');
  }

  try {
    const { data, error } = await supabase
      .from('organizations')
      .select(`
        *,
        organization_memberships(
          user_id,
          role,
          created_at,
          profiles(display_name, avatar_url)
        )
      `)
      .eq('id', orgId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'fetchOrganizationById', orgId });
  }
}

export async function createOrganization(orgData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const sanitized = sanitizeOrganization(orgData);
  const validation = validateOrganization(sanitized);
  
  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    throw new Error(firstError);
  }

  try {
    // Create organization and add creator as admin in a transaction
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        ...sanitized,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (orgError) throw orgError;

    // Add creator as admin
    const { error: memberError } = await supabase
      .from('organization_memberships')
      .insert({
        organization_id: org.id,
        user_id: user.id,
        role: 'admin',
        created_by: user.id,
      });

    if (memberError) {
      // Cleanup: delete the organization if membership creation fails
      await supabase.from('organizations').delete().eq('id', org.id);
      throw memberError;
    }

    return org;
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'createOrganization', userId: user.id });
  }
}

export async function updateOrganization(orgId, orgData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  if (!validators.uuid(orgId)) {
    throw new Error('Invalid organization ID');
  }

  const sanitized = sanitizeOrganization(orgData);
  const validation = validateOrganization(sanitized);
  
  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    throw new Error(firstError);
  }

  try {
    const { data, error } = await supabase
      .from('organizations')
      .update(sanitized)
      .eq('id', orgId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'updateOrganization', orgId });
  }
}

export async function deleteOrganization(orgId) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  if (!validators.uuid(orgId)) {
    throw new Error('Invalid organization ID');
  }

  try {
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', orgId);

    if (error) throw error;
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'deleteOrganization', orgId });
  }
}

/* =========================
   Organization Memberships
   ========================= */

export async function fetchOrganizationMembers(orgId) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  if (!validators.uuid(orgId)) {
    throw new Error('Invalid organization ID');
  }

  try {
    const { data, error } = await supabase
      .from('organization_memberships')
      .select(`
        *,
        profiles(display_name, avatar_url)
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'fetchOrganizationMembers', orgId });
  }
}

export async function inviteUserToOrganization(orgId, userEmail, role = 'project_manager') {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  if (!validators.uuid(orgId)) {
    throw new Error('Invalid organization ID');
  }

  if (!validators.email(userEmail)) {
    throw new Error('Invalid email address');
  }

  if (!['admin', 'project_manager'].includes(role)) {
    throw new Error('Invalid role');
  }

  try {
    // Look up the user by email using our database function
    const { data: userProfile, error: lookupError } = await supabase
      .rpc('get_user_profile_by_email', { user_email: userEmail });

    if (lookupError) throw lookupError;

    if (!userProfile || userProfile.length === 0) {
      throw new Error(`No user found with email address: ${userEmail}. The user must have an account and verified email.`);
    }

    const targetUserId = userProfile[0].user_id;

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('organization_memberships')
      .select('id')
      .eq('organization_id', orgId)
      .eq('user_id', targetUserId)
      .single();

    if (existingMember) {
      throw new Error('User is already a member of this organization');
    }

    // Check if there's already a pending invitation
    const { data: existingInvitation } = await supabase
      .from('organization_invitations')
      .select('id, status')
      .eq('organization_id', orgId)
      .eq('invitee_email', userEmail)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      throw new Error('User already has a pending invitation to this organization');
    }

    // Create the invitation instead of direct membership
    const { data, error } = await supabase
      .from('organization_invitations')
      .insert({
        organization_id: orgId,
        invitee_email: userEmail,
        invitee_user_id: targetUserId,
        invited_by: user.id,
        role,
        status: 'pending',
      })
      .select(`
        *,
        organizations(name, avatar_url)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'inviteUserToOrganization', orgId, userEmail });
  }
}

// Simpler function to add existing user by ID
export async function addUserToOrganization(orgId, userId, role = 'project_manager') {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('Not authenticated');

  if (!validators.uuid(orgId) || !validators.uuid(userId)) {
    throw new Error('Invalid organization or user ID');
  }

  if (!['admin', 'project_manager'].includes(role)) {
    throw new Error('Invalid role');
  }

  try {
    // Check if user is already a member
    const { data: existing } = await supabase
      .from('organization_memberships')
      .select('id')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      throw new Error('User is already a member of this organization');
    }

    // Add the user to the organization
    const { data, error } = await supabase
      .from('organization_memberships')
      .insert({
        organization_id: orgId,
        user_id: userId,
        role,
        created_by: currentUser.id,
      })
      .select(`
        *,
        profiles(display_name, avatar_url)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'addUserToOrganization', orgId, userId });
  }
}

export async function updateMemberRole(orgId, userId, newRole) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('Not authenticated');

  if (!validators.uuid(orgId) || !validators.uuid(userId)) {
    throw new Error('Invalid organization or user ID');
  }

  if (!['admin', 'project_manager'].includes(newRole)) {
    throw new Error('Invalid role');
  }

  try {
    const { data, error } = await supabase
      .from('organization_memberships')
      .update({ role: newRole })
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .select(`
        *,
        profiles(display_name, avatar_url)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'updateMemberRole', orgId, userId, newRole });
  }
}

export async function removeMemberFromOrganization(orgId, userId) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('Not authenticated');

  if (!validators.uuid(orgId) || !validators.uuid(userId)) {
    throw new Error('Invalid organization or user ID');
  }

  try {
    const { error } = await supabase
      .from('organization_memberships')
      .delete()
      .eq('organization_id', orgId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'removeMemberFromOrganization', orgId, userId });
  }
}

export async function leaveOrganization(orgId) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  if (!validators.uuid(orgId)) {
    throw new Error('Invalid organization ID');
  }

  try {
    const { error } = await supabase
      .from('organization_memberships')
      .delete()
      .eq('organization_id', orgId)
      .eq('user_id', user.id);

    if (error) throw error;
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'leaveOrganization', orgId });
  }
}

/* =========================
   Helper Functions
   ========================= */

export async function getUserRole(orgId) {
  const user = await getCurrentUser();
  if (!user) return null;

  if (!validators.uuid(orgId)) {
    throw new Error('Invalid organization ID');
  }

  try {
    const { data, error } = await supabase
      .from('organization_memberships')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data?.role || null;
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'getUserRole', orgId, userId: user.id });
  }
}

export async function isUserAdmin(orgId) {
  const role = await getUserRole(orgId);
  return role === 'admin';
}

export async function isUserMember(orgId) {
  const role = await getUserRole(orgId);
  return role !== null;
}

/* =========================
   Organization Avatar Management
   ========================= */

/* =========================
   Organization Invitations
   ========================= */

export async function fetchUserInvitations() {
  const user = await getCurrentUser();
  if (!user) return [];

  try {
    const { data, error } = await supabase
      .from('organization_invitations')
      .select(`
        *,
        organizations(name, avatar_url)
      `)
      .eq('invitee_user_id', user.id)
      .eq('status', 'pending')
      .gt('expires_at', 'now()')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Manually fetch profiles for invited_by users
    if (data && data.length > 0) {
      const invitedByIds = [...new Set(data.map(inv => inv.invited_by).filter(Boolean))];
      if (invitedByIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', invitedByIds);
        
        if (!profilesError && profiles) {
          // Map profiles to invitations
          return data.map(invitation => ({
            ...invitation,
            invited_by_profile: profiles.find(p => p.id === invitation.invited_by) || null
          }));
        }
      }
    }

    return data || [];
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'fetchUserInvitations', userId: user.id });
  }
}

export async function fetchOrganizationInvitations(orgId) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  if (!validators.uuid(orgId)) {
    throw new Error('Invalid organization ID');
  }

  try {
    const { data, error } = await supabase
      .from('organization_invitations')
      .select(`
        *
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Manually fetch profiles for invited_by users
    if (data && data.length > 0) {
      const invitedByIds = [...new Set(data.map(inv => inv.invited_by).filter(Boolean))];
      if (invitedByIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', invitedByIds);
        
        if (!profilesError && profiles) {
          // Map profiles to invitations
          return data.map(invitation => ({
            ...invitation,
            invited_by_profile: profiles.find(p => p.id === invitation.invited_by) || null
          }));
        }
      }
    }

    return data || [];
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'fetchOrganizationInvitations', orgId });
  }
}

export async function acceptInvitation(invitationId) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  if (!validators.uuid(invitationId)) {
    throw new Error('Invalid invitation ID');
  }

  try {
    const { data, error } = await supabase
      .rpc('accept_organization_invitation', { invitation_id: invitationId });

    if (error) throw error;
    
    if (!data) {
      throw new Error('Unable to accept invitation. It may be expired or invalid.');
    }

    return data;
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'acceptInvitation', invitationId });
  }
}

export async function declineInvitation(invitationId) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  if (!validators.uuid(invitationId)) {
    throw new Error('Invalid invitation ID');
  }

  try {
    const { data, error } = await supabase
      .rpc('decline_organization_invitation', { invitation_id: invitationId });

    if (error) throw error;
    
    if (!data) {
      throw new Error('Unable to decline invitation. It may be expired or invalid.');
    }

    return data;
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'declineInvitation', invitationId });
  }
}

export async function cancelInvitation(invitationId) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  if (!validators.uuid(invitationId)) {
    throw new Error('Invalid invitation ID');
  }

  try {
    const { data, error } = await supabase
      .from('organization_invitations')
      .update({ status: 'expired' })
      .eq('id', invitationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'cancelInvitation', invitationId });
  }
}

/* =========================
   Organization Avatar Management
   ========================= */

export async function uploadOrganizationAvatar(orgId, file) {
  const user = await getCurrentUser();
  if (!user) {
    throw handleSupabaseError(new Error('Not signed in'), { operation: 'uploadOrganizationAvatar' });
  }

  if (!validators.uuid(orgId)) {
    throw new Error('Invalid organization ID');
  }

  // Comprehensive file validation
  if (!file || !(file instanceof File)) {
    throw handleSupabaseError(new Error('Invalid file provided'), { operation: 'uploadOrganizationAvatar' });
  }

  if (!file.type.startsWith('image/')) {
    throw handleSupabaseError(new Error('File must be an image'), { 
      operation: 'uploadOrganizationAvatar', 
      fileType: file.type 
    });
  }

  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw handleSupabaseError(new Error('File size must be less than 5MB'), { 
      operation: 'uploadOrganizationAvatar', 
      fileSize: file.size,
      maxSize 
    });
  }

  // Sanitize file name
  const sanitizedFileName = file.name
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
    .slice(0, 100); // Limit length
  
  const path = `${orgId}/${Date.now()}_${sanitizedFileName}`;

  try {
    console.log('Starting avatar upload for org:', orgId);
    
    // First, check if user has admin access to this organization
    const isAdmin = await isUserAdmin(orgId);
    console.log('Is user admin?', isAdmin);
    
    if (!isAdmin) {
      throw new Error('Only organization admins can upload avatars');
    }

    console.log('Uploading file to path:', path);
    
    const { data, error: upErr } = await supabase
      .storage
      .from('organization-avatars')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      });
      
    console.log('Upload result:', { data, error: upErr });

    if (upErr) throw upErr;

    const { data: pub } = supabase
      .storage
      .from('organization-avatars')
      .getPublicUrl(path);

    // Validate the returned URL
    if (!pub.publicUrl || !validators.url(pub.publicUrl)) {
      throw handleSupabaseError(new Error('Invalid public URL returned from storage'), {
        operation: 'uploadOrganizationAvatar',
        publicUrl: pub.publicUrl
      });
    }

    return pub.publicUrl;
  } catch (error) {
    throw handleSupabaseError(error, { operation: 'uploadOrganizationAvatar', fileName: sanitizedFileName });
  }
}