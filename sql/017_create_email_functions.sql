-- Create a secure function to find user ID by email
CREATE OR REPLACE FUNCTION get_user_id_by_email(user_email TEXT)
RETURNS UUID AS $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = user_email
  AND email_confirmed_at IS NOT NULL;
  
  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get user profile info by email
CREATE OR REPLACE FUNCTION get_user_profile_by_email(user_email TEXT)
RETURNS TABLE(user_id UUID, display_name TEXT, avatar_url TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    COALESCE(p.display_name, u.raw_user_meta_data->>'full_name', u.email) as display_name,
    p.avatar_url
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE u.email = user_email
  AND u.email_confirmed_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;