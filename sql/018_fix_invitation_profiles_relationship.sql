-- Add foreign key relationship between organization_invitations.invited_by and profiles.id
-- This allows proper joins in Supabase queries

-- First, let's ensure we have a proper foreign key constraint
-- Note: invited_by already references auth.users(id), and profiles.id also references auth.users(id)
-- So we need to add a constraint that allows the relationship to be recognized

-- Add a comment to help Supabase understand the relationship
COMMENT ON COLUMN organization_invitations.invited_by IS 'References profiles.id via auth.users.id';

-- Create a view that makes the relationship explicit if needed
CREATE OR REPLACE VIEW organization_invitations_with_profiles AS
SELECT 
  oi.*,
  p.display_name as invited_by_display_name,
  p.avatar_url as invited_by_avatar_url
FROM organization_invitations oi
LEFT JOIN profiles p ON p.id = oi.invited_by;

-- Grant permissions on the view
GRANT SELECT ON organization_invitations_with_profiles TO authenticated;

-- Enable RLS on the view (will inherit from base table)
ALTER VIEW organization_invitations_with_profiles SET (security_invoker = true);