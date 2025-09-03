-- Check if RLS is enabled and fix the policies
-- First, let's see what policies exist and fix them

-- Drop existing policies and recreate them properly
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can create organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can update their organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can delete their organizations" ON organizations;

-- Create fixed policies for organizations table
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      WHERE om.organization_id = organizations.id
      AND om.user_id = auth.uid()
    )
  );

-- Allow any authenticated user to create organizations
CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Only admins can update organizations
CREATE POLICY "Admins can update organizations" ON organizations
  FOR UPDATE USING (
    is_org_admin(organizations.id, auth.uid())
  );

-- Only admins can delete organizations  
CREATE POLICY "Admins can delete organizations" ON organizations
  FOR DELETE USING (
    is_org_admin(organizations.id, auth.uid())
  );

-- Also make sure the helper functions work properly
-- Let's recreate the is_org_admin function to make sure it works
CREATE OR REPLACE FUNCTION is_org_admin(org_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE organization_id = org_id 
    AND organization_memberships.user_id = is_org_admin.user_id
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;