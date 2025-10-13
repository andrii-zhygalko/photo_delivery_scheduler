-- Create a function that bypasses RLS for user creation during auth
-- This function runs with SECURITY DEFINER, meaning it executes with the privileges
-- of the user who created it (the database owner), bypassing RLS policies.

CREATE OR REPLACE FUNCTION auth_upsert_user(
  p_email TEXT,
  p_name TEXT,
  p_image TEXT
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Insert or update user
  INSERT INTO users (email, name, image)
  VALUES (p_email, p_name, p_image)
  ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    image = EXCLUDED.image,
    updated_at = NOW()
  RETURNING id INTO v_user_id;

  -- Insert user_settings if they don't exist
  INSERT INTO user_settings (user_id, default_deadline_days, timezone)
  VALUES (v_user_id, 30, 'UTC')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN v_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION auth_upsert_user(TEXT, TEXT, TEXT) TO PUBLIC;
