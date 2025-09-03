-- Fix the SELECT policy for organizations
-- The current policy prevents users from seeing organizations at all

DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;

-- Create a more permissive SELECT policy
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT USING (
    -- Users can see organizations they are members of
    id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid()
    )
    OR
    -- Or if they are the creator
    created_by = auth.uid()
  );

-- Also check if RLS is properly enabled
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;