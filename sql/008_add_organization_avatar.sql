-- Add avatar_url column to organizations table
ALTER TABLE organizations ADD COLUMN avatar_url TEXT;

-- Create storage bucket for organization avatars if it doesn't exist
-- Note: You'll need to run this in the Supabase storage interface or via SQL
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('organization-avatars', 'organization-avatars', true)
-- ON CONFLICT (id) DO NOTHING;

-- Create storage policy for organization avatars
-- Note: These policies need to be created in the Supabase storage policies section
-- Allow authenticated users to upload organization avatars
-- Allow public read access to organization avatars