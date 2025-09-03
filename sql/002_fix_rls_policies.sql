-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view organization memberships" ON organization_memberships;
DROP POLICY IF EXISTS "Admins can add members" ON organization_memberships;
DROP POLICY IF EXISTS "Members can update memberships" ON organization_memberships;
DROP POLICY IF EXISTS "Members can be removed" ON organization_memberships;

-- Create fixed policies for organization_memberships
-- Users can view memberships for organizations they belong to
CREATE POLICY "Users can view organization memberships" ON organization_memberships
  FOR SELECT USING (
    -- Users can see their own memberships
    user_id = auth.uid()
    OR 
    -- Users can see other memberships in organizations they belong to
    EXISTS (
      SELECT 1 FROM organization_memberships om
      WHERE om.organization_id = organization_memberships.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Only existing admins can add new members
CREATE POLICY "Admins can add members" ON organization_memberships
  FOR INSERT WITH CHECK (
    -- Allow first membership creation (when no memberships exist for the org)
    NOT EXISTS (
      SELECT 1 FROM organization_memberships existing
      WHERE existing.organization_id = organization_memberships.organization_id
    )
    OR
    -- Or user must be an admin of the organization
    EXISTS (
      SELECT 1 FROM organization_memberships existing
      WHERE existing.organization_id = organization_memberships.organization_id
      AND existing.user_id = auth.uid()
      AND existing.role = 'admin'
    )
  );

-- Admins can update member roles, users can leave
CREATE POLICY "Members can update memberships" ON organization_memberships
  FOR UPDATE USING (
    -- Users can update their own membership (to leave)
    user_id = auth.uid()
    OR
    -- Admins can update any membership in their organization
    EXISTS (
      SELECT 1 FROM organization_memberships existing
      WHERE existing.organization_id = organization_memberships.organization_id
      AND existing.user_id = auth.uid()
      AND existing.role = 'admin'
    )
  );

-- Admins can remove members, users can remove themselves
CREATE POLICY "Members can be removed" ON organization_memberships
  FOR DELETE USING (
    -- Users can remove themselves
    user_id = auth.uid()
    OR
    -- Admins can remove others from their organization
    EXISTS (
      SELECT 1 FROM organization_memberships existing
      WHERE existing.organization_id = organization_memberships.organization_id
      AND existing.user_id = auth.uid()
      AND existing.role = 'admin'
    )
  );

-- Also fix the organizations policies to avoid potential recursion
DROP POLICY IF EXISTS "Admins can create organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can update their organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can delete their organizations" ON organizations;

-- Recreate organization policies without recursion
CREATE POLICY "Admins can create organizations" ON organizations
  FOR INSERT WITH CHECK (
    -- Allow any authenticated user to create their first organization
    -- The membership will be created separately
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Admins can update their organizations" ON organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      WHERE om.organization_id = organizations.id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete their organizations" ON organizations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      WHERE om.organization_id = organizations.id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );