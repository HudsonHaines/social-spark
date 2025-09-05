// src/data/comments.js
import { supabase } from '../lib/supabaseClient';

/**
 * Comment System Data Layer
 * Handles all database operations for the comment system
 */

// Create a new comment
export async function createComment({
  postId,
  deckId,
  parentId = null,
  content,
  commentType = 'general',
  priority = 'normal',
  attachments = [],
  mentions = [],
  guestIdentity = null
}) {
  const { data: { user } } = await supabase.auth.getUser();
  
  let authorId, authorType;
  
  if (user) {
    // Authenticated user
    authorId = user.id;
    authorType = await getUserAuthorType(user.id, deckId);
  } else if (guestIdentity) {
    // Guest user - use a special guest ID format
    authorId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    authorType = 'client'; // Guests are always clients
  } else {
    throw new Error('User must be authenticated or provide guest identity to create comments');
  }

  const commentData = {
    post_id: postId,
    deck_id: deckId,
    parent_id: parentId,
    author_id: authorId,
    author_type: authorType,
    content,
    comment_type: commentType,
    priority,
    attachments,
    mentions
  };

  // Add guest identity data if it's a guest comment
  if (guestIdentity) {
    commentData.guest_name = guestIdentity.display_name;
    commentData.guest_email = guestIdentity.email || null;
  }

  console.log('Creating comment with data:', commentData);
  
  const { data, error } = await supabase
    .from('post_comments')
    .insert(commentData)
    .select('*')
    .single();

  if (error) {
    console.error('createComment error:', error);
    console.error('Error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    throw error;
  }
  
  console.log('Comment created successfully:', data);

  // Create notifications for mentioned users
  if (mentions.length > 0) {
    await createMentionNotifications(data.id, mentions);
  }

  return data;
}

// Get comments for a specific post or deck
export async function getComments({ postId, deckId, includeResolved = false, clientViewOnly = false }) {
  console.log('Loading comments with params:', { postId, deckId, includeResolved, clientViewOnly });
  
  let query = supabase
    .from('post_comments')
    .select('*')
    .is('parent_id', null) // Only top-level comments
    .order('created_at', { ascending: true });

  if (postId) {
    query = query.eq('post_id', postId);
    console.log('Filtering by post_id:', postId);
  } else if (deckId) {
    query = query.eq('deck_id', deckId);
    console.log('Filtering by deck_id:', deckId);
  }

  if (!includeResolved) {
    query = query.neq('status', 'archived');
  }
  
  // Filter to only client comments for share link viewers
  if (clientViewOnly) {
    query = query.eq('author_type', 'client');
    console.log('Filtering to client comments only');
  }

  const { data, error } = await query;
  if (error) {
    console.error('getComments error:', error);
    throw error;
  }
  
  console.log('Loaded comments:', data);
  return data || [];
}

// Get comment thread (comment + all replies)
export async function getCommentThread(commentId) {
  const { data, error } = await supabase
    .from('post_comments')
    .select(`
      *,
      author:auth.users!author_id(email),
      resolved_by_user:auth.users!resolved_by(email),
      replies:post_comments!parent_id(
        *,
        author:auth.users!author_id(email)
      )
    `)
    .eq('id', commentId)
    .single();

  if (error) throw error;
  return data;
}

// Update comment content
export async function updateComment(commentId, { content, priority, commentType }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const { data, error } = await supabase
    .from('post_comments')
    .update({
      content,
      priority,
      comment_type: commentType,
      updated_at: new Date().toISOString(),
      edited_at: new Date().toISOString(),
      edit_count: supabase.sql`edit_count + 1`
    })
    .eq('id', commentId)
    .eq('author_id', user.id) // Only author can edit
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Resolve/unresolve comment
export async function updateCommentStatus(commentId, status, resolvedBy = null) {
  const updates = {
    status,
    updated_at: new Date().toISOString()
  };

  if (status === 'resolved') {
    updates.resolved_at = new Date().toISOString();
    updates.resolved_by = resolvedBy;
  } else if (status === 'open') {
    updates.resolved_at = null;
    updates.resolved_by = null;
  }

  const { data, error } = await supabase
    .from('post_comments')
    .update(updates)
    .eq('id', commentId)
    .select(`
      *,
      author:auth.users!author_id(email),
      resolved_by_user:auth.users!resolved_by(email)
    `)
    .single();

  if (error) throw error;

  // Create notification for status change
  if (status === 'resolved') {
    await createStatusChangeNotification(commentId, 'resolution');
  }

  return data;
}

// Bulk resolve comments
export async function bulkResolveComments(commentIds, resolvedBy) {
  const { data, error } = await supabase
    .from('post_comments')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: resolvedBy,
      updated_at: new Date().toISOString()
    })
    .in('id', commentIds)
    .select();

  if (error) throw error;

  // Create notifications
  await Promise.all(
    commentIds.map(id => createStatusChangeNotification(id, 'resolution'))
  );

  return data;
}

// Delete comment (soft delete by archiving)
export async function deleteComment(commentId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const { data, error } = await supabase
    .from('post_comments')
    .update({
      status: 'archived',
      updated_at: new Date().toISOString()
    })
    .eq('id', commentId)
    .eq('author_id', user.id) // Only author can delete
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Add reaction to comment
export async function addCommentReaction(commentId, emoji) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  // Get current reactions
  const { data: comment } = await supabase
    .from('post_comments')
    .select('reactions')
    .eq('id', commentId)
    .single();

  const reactions = comment?.reactions || {};
  const userReactions = reactions[user.id] || [];

  // Toggle reaction
  const newReactions = userReactions.includes(emoji)
    ? userReactions.filter(r => r !== emoji)
    : [...userReactions, emoji];

  const updatedReactions = {
    ...reactions,
    [user.id]: newReactions
  };

  const { data, error } = await supabase
    .from('post_comments')
    .update({ reactions: updatedReactions })
    .eq('id', commentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get comment statistics for a deck
export async function getCommentStats(deckId, clientViewOnly = false) {
  let query = supabase
    .from('post_comments')
    .select('status, comment_type, author_type')
    .eq('deck_id', deckId);
    
  // Filter to only client comments if in client view
  if (clientViewOnly) {
    query = query.eq('author_type', 'client');
  }
    
  const { data, error } = await query;

  if (error) {
    console.error('getCommentStats error:', error);
    throw error;
  }

  const comments = data || [];
  const stats = {
    total: comments.length,
    open: comments.filter(c => c.status === 'open').length,
    resolved: comments.filter(c => c.status === 'resolved').length,
    byType: {},
    byAuthor: {
      client: comments.filter(c => c.author_type === 'client').length,
      internal: comments.filter(c => c.author_type === 'internal').length
    }
  };

  // Group by comment type
  comments.forEach(comment => {
    stats.byType[comment.comment_type] = (stats.byType[comment.comment_type] || 0) + 1;
  });

  return stats;
}

// Get unresolved comment counts for multiple decks
export async function getUnresolvedCommentCounts(deckIds) {
  if (!deckIds || deckIds.length === 0) return {};
  
  const { data, error } = await supabase
    .from('post_comments')
    .select('deck_id')
    .in('deck_id', deckIds)
    .neq('status', 'resolved')
    .neq('status', 'archived');

  if (error) {
    console.error('getUnresolvedCommentCounts error:', error);
    throw error;
  }

  // Count unresolved comments per deck
  const counts = {};
  deckIds.forEach(id => counts[id] = 0);
  
  data.forEach(comment => {
    counts[comment.deck_id] = (counts[comment.deck_id] || 0) + 1;
  });

  return counts;
}

// Search comments
export async function searchComments({ deckId, query, authorType, status, commentType }) {
  let searchQuery = supabase
    .from('post_comments')
    .select(`
      *,
      author:auth.users!author_id(email),
      deck:decks(title)
    `)
    .eq('deck_id', deckId)
    .ilike('content', `%${query}%`);

  if (authorType) searchQuery = searchQuery.eq('author_type', authorType);
  if (status) searchQuery = searchQuery.eq('status', status);
  if (commentType) searchQuery = searchQuery.eq('comment_type', commentType);

  const { data, error } = await searchQuery.order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// Helper Functions

async function getUserAuthorType(userId, deckId) {
  try {
    // Check if user is the deck owner or organization member
    const { data: deck } = await supabase
      .from('decks')
      .select('user_id, organization_id')
      .eq('id', deckId)
      .single();

    if (deck?.user_id === userId) {
      return 'internal'; // Deck owner
    }

    // Check if user is a member of the deck's organization
    if (deck?.organization_id) {
      const { data: membership } = await supabase
        .from('organization_memberships')
        .select('role')
        .eq('organization_id', deck.organization_id)
        .eq('user_id', userId)
        .single();

      if (membership) {
        return 'internal'; // Organization member
      }
    }

    // Anyone else is a client (shared access, guest, etc.)
    return 'client';
  } catch (error) {
    console.error('getUserAuthorType error:', error);
    // Default to client if there's an error
    return 'client';
  }
}

async function createMentionNotifications(commentId, mentionedUserIds) {
  const notifications = mentionedUserIds.map(userId => ({
    comment_id: commentId,
    user_id: userId,
    notification_type: 'mention'
  }));

  await supabase
    .from('comment_notifications')
    .insert(notifications);
}

async function createStatusChangeNotification(commentId, type) {
  // Get comment details to notify author
  const { data: comment } = await supabase
    .from('post_comments')
    .select('author_id')
    .eq('id', commentId)
    .single();

  if (comment) {
    await supabase
      .from('comment_notifications')
      .insert({
        comment_id: commentId,
        user_id: comment.author_id,
        notification_type: type
      });
  }
}

// Real-time subscriptions
export function subscribeToComments(deckId, callback) {
  const subscription = supabase
    .channel(`comments:${deckId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'post_comments',
        filter: `deck_id=eq.${deckId}`
      },
      callback
    )
    .subscribe();

  return () => subscription.unsubscribe();
}