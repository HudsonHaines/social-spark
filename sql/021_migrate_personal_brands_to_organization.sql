-- Migrate existing personal brands (organization_id IS NULL) to the user's first organization
-- This will help users see their existing brands when they join organizations

-- Update brands that have organization_id = NULL to be assigned to the user's first organization
UPDATE brands 
SET organization_id = (
  SELECT om.organization_id 
  FROM organization_memberships om 
  WHERE om.user_id = brands.user_id 
  ORDER BY om.created_at ASC 
  LIMIT 1
)
WHERE organization_id IS NULL 
  AND user_id IN (
    SELECT user_id 
    FROM organization_memberships 
    GROUP BY user_id
  );