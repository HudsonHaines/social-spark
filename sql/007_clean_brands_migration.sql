-- Add organization_id to brands table
ALTER TABLE brands ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX idx_brands_organization_id ON brands(organization_id);

-- Drop existing RLS policies for brands
DROP POLICY IF EXISTS "Users can view all brands" ON brands;
DROP POLICY IF EXISTS "Users can insert brands" ON brands;
DROP POLICY IF EXISTS "Users can update their own brands" ON brands;
DROP POLICY IF EXISTS "Users can delete their own brands" ON brands;

-- Create new RLS policies for organization-based brand access
CREATE POLICY "Users can view organization brands" ON brands
  FOR SELECT USING (
    (organization_id IS NOT NULL AND is_org_member(organization_id, auth.uid()))
    OR
    (organization_id IS NULL AND user_id = auth.uid())
  );

CREATE POLICY "Users can create brands" ON brands
  FOR INSERT WITH CHECK (
    (organization_id IS NULL AND user_id = auth.uid())
    OR
    (organization_id IS NOT NULL AND is_org_member(organization_id, auth.uid()))
  );

CREATE POLICY "Users can update brands" ON brands
  FOR UPDATE USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR
    (organization_id IS NOT NULL AND is_org_member(organization_id, auth.uid()))
  );

CREATE POLICY "Users can delete brands" ON brands
  FOR DELETE USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR
    (organization_id IS NOT NULL AND is_org_member(organization_id, auth.uid()))
  );

-- Add helper function
CREATE OR REPLACE FUNCTION get_user_organizations(user_id UUID)
RETURNS TABLE(organization_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT om.organization_id
  FROM organization_memberships om
  WHERE om.user_id = get_user_organizations.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;