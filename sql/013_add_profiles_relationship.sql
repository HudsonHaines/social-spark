-- Add foreign key relationship between organization_memberships and profiles
-- This should already exist via auth.users, but let's make it explicit

-- First, let's see if we need to create the profiles table relationship
-- The profiles table should reference auth.users(id)

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
    -- Check if the foreign key constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'organization_memberships_profiles_fkey'
    ) THEN
        -- Add foreign key relationship from organization_memberships to profiles
        ALTER TABLE organization_memberships 
        ADD CONSTRAINT organization_memberships_profiles_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Also ensure profiles table has proper structure
-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create basic profile policies if they don't exist
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
CREATE POLICY "Users can view profiles" ON profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR ALL USING (auth.uid() = id);