-- Add guest user support to comments system
-- Run this in Supabase SQL editor to add guest commenting capabilities

-- Add guest user fields to post_comments table
ALTER TABLE post_comments 
ADD COLUMN IF NOT EXISTS guest_name TEXT NULL,
ADD COLUMN IF NOT EXISTS guest_email TEXT NULL;

-- Update the author_id constraint to allow guest IDs (strings starting with 'guest_')
-- First, drop the existing foreign key constraint
ALTER TABLE post_comments 
DROP CONSTRAINT IF EXISTS post_comments_author_id_fkey;

-- Change author_id to TEXT to support both UUIDs and guest IDs
ALTER TABLE post_comments 
ALTER COLUMN author_id TYPE TEXT;

-- Update resolved_by constraint too for consistency
ALTER TABLE post_comments 
DROP CONSTRAINT IF EXISTS post_comments_resolved_by_fkey;

-- Change resolved_by to TEXT
ALTER TABLE post_comments 
ALTER COLUMN resolved_by TYPE TEXT;