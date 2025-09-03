-- Add organization_id to brands table
ALTER TABLE brands ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX idx_brands_organization_id ON brands(organization_id);

-- For existing brands without organization_id, we need to handle them
-- Option 1: Create a default "Personal" organization for users with existing brands
-- Option 2: Allow brands to exist without organization (NULL organization_id for personal brands)

-- Let's go with Option 2 for now - allow personal brands (NULL organization_id)
-- This means users can have personal brands or organization brands

-- Drop existing RLS policies for brands
DROP POLICY IF EXISTS "Users can view all brands" ON brands;
DROP POLICY IF EXISTS "Users can insert brands" ON brands;
DROP POLICY IF EXISTS "Users can update their own brands" ON brands;
DROP POLICY IF EXISTS "Users can delete their own brands" ON brands;

-- Create new RLS policies for organization-based brand access
CREATE POLICY "Users can view organization brands" ON brands
  FOR SELECT USING (
    -- Users can see brands from organizations they belong to
    (organization_id IS NOT NULL AND is_org_member(organization_id, auth.uid()))
    OR
    -- Users can see their own personal brands (no organization)
    (organization_id IS NULL AND user_id = auth.uid())
  );

CREATE POLICY "Users can create brands" ON brands
  FOR INSERT WITH CHECK (
    -- Users can create personal brands
    (organization_id IS NULL AND user_id = auth.uid())
    OR
    -- Users can create organization brands if they're members
    (organization_id IS NOT NULL AND is_org_member(organization_id, auth.uid()))
  );

CREATE POLICY "Users can update brands" ON brands
  FOR UPDATE USING (
    -- Users can update their own personal brands
    (organization_id IS NULL AND user_id = auth.uid())
    OR
    -- Organization members can update organization brands
    (organization_id IS NOT NULL AND is_org_member(organization_id, auth.uid()))
  );

CREATE POLICY "Users can delete brands" ON brands
  FOR DELETE USING (
    -- Users can delete their own personal brands
    (organization_id IS NULL AND user_id = auth.uid())
    OR
    -- Organization members can delete organization brands
    (organization_id IS NOT NULL AND is_org_member(organization_id, auth.uid()))
  );

-- Add a function to get user's organizations for easier querying
CREATE OR REPLACE FUNCTION get_user_organizations(user_id UUID)
RETURNS TABLE(organization_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT om.organization_id
  FROM organization_memberships om
  WHERE om.user_id = get_user_organizations.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;