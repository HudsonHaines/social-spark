-- Create user roles enum
CREATE TYPE user_role AS ENUM ('admin', 'project_manager');

-- Create organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create organization memberships table
CREATE TABLE organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Ensure a user can only have one role per organization
  UNIQUE(organization_id, user_id)
);

-- Add RLS policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;

-- Organizations policies
-- Users can view organizations they are members of
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid()
    )
  );

-- Only admins can create organizations
CREATE POLICY "Admins can create organizations" ON organizations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_memberships 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
    OR NOT EXISTS (
      SELECT 1 FROM organization_memberships 
      WHERE user_id = auth.uid()
    ) -- Allow first-time users to create organizations
  );

-- Only admins of the organization can update it
CREATE POLICY "Admins can update their organizations" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Only admins can delete organizations
CREATE POLICY "Admins can delete their organizations" ON organizations
  FOR DELETE USING (
    id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Organization memberships policies
-- Users can view memberships of organizations they belong to
CREATE POLICY "Users can view organization memberships" ON organization_memberships
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid()
    )
  );

-- Only admins can add members to organizations
CREATE POLICY "Admins can add members" ON organization_memberships
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
    OR NOT EXISTS (
      SELECT 1 FROM organization_memberships 
      WHERE organization_id = organization_memberships.organization_id
    ) -- Allow creating first admin membership
  );

-- Admins can update member roles, users can update their own membership
CREATE POLICY "Members can update memberships" ON organization_memberships
  FOR UPDATE USING (
    user_id = auth.uid() -- Users can update their own
    OR organization_id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    ) -- Or admins can update others
  );

-- Admins can remove members, users can remove themselves
CREATE POLICY "Members can be removed" ON organization_memberships
  FOR DELETE USING (
    user_id = auth.uid() -- Users can remove themselves
    OR organization_id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    ) -- Or admins can remove others
  );

-- Add indexes for better performance
CREATE INDEX idx_organization_memberships_org_id ON organization_memberships(organization_id);
CREATE INDEX idx_organization_memberships_user_id ON organization_memberships(user_id);
CREATE INDEX idx_organization_memberships_role ON organization_memberships(role);

-- Add updated_at trigger for organizations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at 
  BEFORE UPDATE ON organizations 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add function to get user's role in organization
CREATE OR REPLACE FUNCTION get_user_org_role(org_id UUID, user_id UUID)
RETURNS user_role AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM organization_memberships 
    WHERE organization_id = org_id 
    AND organization_memberships.user_id = get_user_org_role.user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;