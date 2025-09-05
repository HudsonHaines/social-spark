-- Comments System Database Schema
-- Run this in Supabase SQL editor to set up the comment system

-- Create post_comments table
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL, -- Reference to deck item or post
  deck_id UUID NOT NULL, -- Reference to deck for easy querying
  parent_id UUID NULL, -- For threaded replies
  author_id UUID NOT NULL REFERENCES auth.users(id), -- User who created comment
  author_type TEXT NOT NULL CHECK (author_type IN ('internal', 'client')),
  
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'rich_text')),
  
  comment_type TEXT DEFAULT 'general' CHECK (comment_type IN (
    'general', 'approval', 'revision_request', 'question', 'compliment'
  )),
  
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'archived')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Metadata
  attachments JSONB DEFAULT '[]'::jsonb, -- File attachments
  mentions JSONB DEFAULT '[]'::jsonb, -- @mentioned users
  reactions JSONB DEFAULT '{}'::jsonb, -- Emoji reactions
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ NULL,
  resolved_by UUID NULL REFERENCES auth.users(id),
  
  -- Audit
  edited_at TIMESTAMPTZ NULL,
  edit_count INTEGER DEFAULT 0,
  
  FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES post_comments(id) ON DELETE CASCADE
);

-- Create comment_notifications table
CREATE TABLE IF NOT EXISTS comment_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'mention', 'reply', 'new_comment', 'status_change', 'resolution'
  )),
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_deck_id ON post_comments(deck_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_author_id ON post_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_parent_id ON post_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_status ON post_comments(status);
CREATE INDEX IF NOT EXISTS idx_post_comments_created_at ON post_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_notifications_user_id ON comment_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_notifications_read_at ON comment_notifications(read_at);

-- Add updated_at trigger for post_comments
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_post_comments_updated_at ON post_comments;
CREATE TRIGGER update_post_comments_updated_at
    BEFORE UPDATE ON post_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_notifications ENABLE ROW LEVEL SECURITY;

-- Comments policies
-- Users can view comments on decks they have access to
CREATE POLICY "Users can view comments on accessible decks" ON post_comments
  FOR SELECT
  USING (
    -- Deck owner can see all comments
    deck_id IN (
      SELECT id FROM decks WHERE user_id = auth.uid()
    )
    OR
    -- Organization members can see all comments on org decks
    deck_id IN (
      SELECT d.id FROM decks d
      JOIN organization_memberships om ON d.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
    OR
    -- Users can see comments on decks shared with them (through deck_shares)
    deck_id IN (
      SELECT deck_id FROM deck_shares 
      WHERE expires_at > NOW() 
      AND NOT is_revoked
    )
  );

-- Users can create comments on accessible decks
CREATE POLICY "Users can create comments on accessible decks" ON post_comments
  FOR INSERT
  WITH CHECK (
    deck_id IN (
      SELECT id FROM decks WHERE user_id = auth.uid()
      UNION
      SELECT d.id FROM decks d
      JOIN organization_memberships om ON d.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
      UNION
      SELECT deck_id FROM deck_shares 
      WHERE expires_at > NOW() 
      AND NOT is_revoked
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update their own comments" ON post_comments
  FOR UPDATE
  USING (author_id = auth.uid());

-- Users can delete (archive) their own comments
CREATE POLICY "Users can delete their own comments" ON post_comments
  FOR UPDATE
  USING (author_id = auth.uid());

-- Notification policies
-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications" ON comment_notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- System can create notifications
CREATE POLICY "System can create notifications" ON comment_notifications
  FOR INSERT
  WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON comment_notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- Create function to get user comment permissions
CREATE OR REPLACE FUNCTION get_user_comment_permissions(target_deck_id UUID)
RETURNS TABLE (can_comment BOOLEAN, can_resolve BOOLEAN, is_internal BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Can comment if they have deck access
    EXISTS (
      SELECT 1 FROM decks WHERE id = target_deck_id AND user_id = auth.uid()
      UNION
      SELECT 1 FROM decks d
      JOIN organization_memberships om ON d.organization_id = om.organization_id
      WHERE d.id = target_deck_id AND om.user_id = auth.uid()
      UNION
      SELECT 1 FROM deck_shares ds
      WHERE ds.deck_id = target_deck_id 
      AND ds.expires_at > NOW() 
      AND NOT ds.is_revoked
    ) as can_comment,
    
    -- Can resolve if they're deck owner or org member
    EXISTS (
      SELECT 1 FROM decks WHERE id = target_deck_id AND user_id = auth.uid()
      UNION
      SELECT 1 FROM decks d
      JOIN organization_memberships om ON d.organization_id = om.organization_id
      WHERE d.id = target_deck_id AND om.user_id = auth.uid()
    ) as can_resolve,
    
    -- Is internal if they're deck owner or org member
    EXISTS (
      SELECT 1 FROM decks WHERE id = target_deck_id AND user_id = auth.uid()
      UNION
      SELECT 1 FROM decks d
      JOIN organization_memberships om ON d.organization_id = om.organization_id
      WHERE d.id = target_deck_id AND om.user_id = auth.uid()
    ) as is_internal;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;