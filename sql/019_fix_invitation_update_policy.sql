-- Fix the RLS policy for updating invitations to allow admins to cancel pending invitations
-- The issue is that the USING clause is too restrictive

-- Drop the existing policy
DROP POLICY "Admins can manage invitations" ON organization_invitations;

-- Create a new policy that allows admins to update any pending invitation
CREATE POLICY "Admins can manage invitations" ON organization_invitations
  FOR UPDATE USING (
    -- Admin can update invitations for their organization
    is_org_admin(organization_id, auth.uid())
  )
  WITH CHECK (
    -- Only allow updating pending invitations to expired/cancelled status
    -- or allow users to respond to their own invitations
    (is_org_admin(organization_id, auth.uid()) AND OLD.status = 'pending')
    OR 
    (invitee_user_id = auth.uid() AND OLD.status = 'pending' AND status IN ('accepted', 'declined'))
  );

-- Also create a separate policy for users responding to their invitations to be clearer
DROP POLICY IF EXISTS "Users can respond to invitations" ON organization_invitations;

CREATE POLICY "Users can respond to invitations" ON organization_invitations
  FOR UPDATE USING (
    invitee_user_id = auth.uid()
    AND status = 'pending'
  )
  WITH CHECK (
    invitee_user_id = auth.uid()
    AND status IN ('accepted', 'declined')
  );