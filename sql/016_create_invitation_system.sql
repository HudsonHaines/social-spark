-- Create organization invitations table
CREATE TABLE organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  invitee_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  
  -- Prevent duplicate invitations
  UNIQUE(organization_id, invitee_email, status) DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes
CREATE INDEX idx_organization_invitations_org_id ON organization_invitations(organization_id);
CREATE INDEX idx_organization_invitations_invitee ON organization_invitations(invitee_user_id);
CREATE INDEX idx_organization_invitations_status ON organization_invitations(status);
CREATE INDEX idx_organization_invitations_email ON organization_invitations(invitee_email);

-- Enable RLS
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invitations
-- Users can view invitations for organizations they're members of (to see pending invites)
CREATE POLICY "Members can view org invitations" ON organization_invitations
  FOR SELECT USING (
    -- Org members can see invitations for their org
    is_org_member(organization_id, auth.uid())
    OR
    -- Users can see their own invitations
    invitee_user_id = auth.uid()
  );

-- Only org admins can create invitations
CREATE POLICY "Admins can send invitations" ON organization_invitations
  FOR INSERT WITH CHECK (
    is_org_admin(organization_id, auth.uid())
  );

-- Users can update their own invitation responses
CREATE POLICY "Users can respond to invitations" ON organization_invitations
  FOR UPDATE USING (
    invitee_user_id = auth.uid()
    AND status = 'pending'
  );

-- Admins can cancel pending invitations
CREATE POLICY "Admins can manage invitations" ON organization_invitations
  FOR UPDATE USING (
    is_org_admin(organization_id, auth.uid())
    AND status = 'pending'
  );

-- Function to automatically accept invitation and create membership
CREATE OR REPLACE FUNCTION accept_organization_invitation(invitation_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  invitation_record organization_invitations%ROWTYPE;
  membership_exists BOOLEAN;
BEGIN
  -- Get the invitation details
  SELECT * INTO invitation_record
  FROM organization_invitations
  WHERE id = invitation_id
    AND invitee_user_id = auth.uid()
    AND status = 'pending'
    AND expires_at > NOW();
  
  -- Check if invitation exists and is valid
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user is already a member
  SELECT EXISTS(
    SELECT 1 FROM organization_memberships
    WHERE organization_id = invitation_record.organization_id
      AND user_id = auth.uid()
  ) INTO membership_exists;
  
  IF membership_exists THEN
    -- Update invitation as accepted but don't create duplicate membership
    UPDATE organization_invitations
    SET status = 'accepted', responded_at = NOW()
    WHERE id = invitation_id;
    RETURN TRUE;
  END IF;
  
  -- Create the membership
  INSERT INTO organization_memberships (
    organization_id,
    user_id,
    role,
    created_by
  ) VALUES (
    invitation_record.organization_id,
    invitation_record.invitee_user_id,
    invitation_record.role,
    invitation_record.invited_by
  );
  
  -- Update invitation status
  UPDATE organization_invitations
  SET status = 'accepted', responded_at = NOW()
  WHERE id = invitation_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decline invitation
CREATE OR REPLACE FUNCTION decline_organization_invitation(invitation_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE organization_invitations
  SET status = 'declined', responded_at = NOW()
  WHERE id = invitation_id
    AND invitee_user_id = auth.uid()
    AND status = 'pending';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired invitations (can be run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE organization_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;