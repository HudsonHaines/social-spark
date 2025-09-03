-- Fix the organization creation policy
-- The issue is that new users can't create organizations because they're not admins of any org yet

-- Drop the problematic creation policy
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can create organizations" ON organizations;

-- Create a simpler policy that allows any authenticated user to create organizations
CREATE POLICY "Authenticated users can create organizations" ON organizations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
  );

-- Also make sure we can insert organization memberships for new orgs
-- Drop and recreate the membership insertion policy
DROP POLICY IF EXISTS "Admins can add members" ON organization_memberships;

CREATE POLICY "Can add members to organizations" ON organization_memberships
  FOR INSERT WITH CHECK (
    -- Allow if no members exist yet (first member/admin)
    (
      SELECT COUNT(*) FROM organization_memberships existing
      WHERE existing.organization_id = organization_memberships.organization_id
    ) = 0
    OR
    -- Or if user is already an admin of the organization
    is_org_admin(organization_id, auth.uid())
  );