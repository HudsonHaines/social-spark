-- First, let's disable RLS temporarily to create helper functions
ALTER TABLE organization_memberships DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view organization memberships" ON organization_memberships;
DROP POLICY IF EXISTS "Admins can add members" ON organization_memberships;
DROP POLICY IF EXISTS "Members can update memberships" ON organization_memberships;
DROP POLICY IF EXISTS "Members can be removed" ON organization_memberships;

-- Create a helper function to check if user is admin of an organization
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

-- Create a helper function to check if user is member of an organization
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE organization_id = org_id 
    AND organization_memberships.user_id = is_org_member.user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a helper function to check if organization has any members
CREATE OR REPLACE FUNCTION org_has_members(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE organization_id = org_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-enable RLS
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;

-- Create simple policies using the helper functions
CREATE POLICY "Users can view organization memberships" ON organization_memberships
  FOR SELECT USING (
    user_id = auth.uid() OR is_org_member(organization_id, auth.uid())
  );

CREATE POLICY "Admins can add members" ON organization_memberships
  FOR INSERT WITH CHECK (
    NOT org_has_members(organization_id) OR is_org_admin(organization_id, auth.uid())
  );

CREATE POLICY "Members can update memberships" ON organization_memberships
  FOR UPDATE USING (
    user_id = auth.uid() OR is_org_admin(organization_id, auth.uid())
  );

CREATE POLICY "Members can be removed" ON organization_memberships
  FOR DELETE USING (
    user_id = auth.uid() OR is_org_admin(organization_id, auth.uid())
  );