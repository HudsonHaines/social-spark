-- Update the organization SELECT policy to allow invited users to see organization names
-- This is needed so invitation notifications can display the organization name

DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;

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
    OR
    -- Or if they have a pending invitation to this organization
    id IN (
      SELECT organization_id
      FROM organization_invitations
      WHERE invitee_user_id = auth.uid()
      AND status = 'pending'
    )
  );