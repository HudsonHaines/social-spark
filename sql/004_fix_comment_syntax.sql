-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can add members" ON organization_memberships;

-- Recreate with correct syntax
CREATE POLICY "Admins can add members" ON organization_memberships
  FOR INSERT WITH CHECK (
    (
      SELECT COUNT(*) FROM organization_memberships existing
      WHERE existing.organization_id = organization_memberships.organization_id
    ) = 0
    OR
    EXISTS (
      SELECT 1 FROM organization_memberships existing
      WHERE existing.organization_id = organization_memberships.organization_id
      AND existing.user_id = auth.uid()
      AND existing.role = 'admin'
    )
  );