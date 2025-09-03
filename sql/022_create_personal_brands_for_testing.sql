-- Create some personal brands for testing personal context
-- This will allow users to have both personal and organization brands

-- Option 1: Move some organization brands back to personal (organization_id = NULL)
-- Uncomment if you want to move some existing brands back to personal context
/*
UPDATE brands 
SET organization_id = NULL 
WHERE id IN (
  SELECT id 
  FROM brands 
  WHERE organization_id IS NOT NULL 
  ORDER BY created_at DESC 
  LIMIT 2
);
*/

-- Option 2: Create new personal test brands
-- This will create personal brands for users who have organizations
-- Replace 'your-user-id-here' with actual user ID if needed

-- You can also manually create personal brands through the UI when in Personal context