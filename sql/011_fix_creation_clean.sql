DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can create organizations" ON organizations;

CREATE POLICY "Authenticated users can create organizations" ON organizations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Admins can add members" ON organization_memberships;

CREATE POLICY "Can add members to organizations" ON organization_memberships
  FOR INSERT WITH CHECK (
    (
      SELECT COUNT(*) FROM organization_memberships existing
      WHERE existing.organization_id = organization_memberships.organization_id
    ) = 0
    OR
    is_org_admin(organization_id, auth.uid())
  );