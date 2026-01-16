-- Fix handle_new_user trigger to be more resilient
-- This migration ensures the trigger doesn't fail when creating users via Edge Functions

-- Drop existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the function with better error handling and ON CONFLICT
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  extracted_name TEXT;
BEGIN
  -- Extract name from email if not provided
  extracted_name := SPLIT_PART(NEW.email, '@', 1);
  extracted_name := REPLACE(extracted_name, '.', ' ');
  extracted_name := INITCAP(extracted_name);

  -- Insert profile, ignore if already exists (Edge Function might have created it)
  INSERT INTO profiles (id, email, full_name, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', extracted_name),
    COALESCE(NEW.raw_user_meta_data->>'display_name', extracted_name)
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'handle_new_user trigger error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Also update the INSERT policy on profiles to allow service role inserts
-- The service role bypasses RLS anyway, but let's make sure

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins podem criar perfis" ON profiles;
DROP POLICY IF EXISTS "Perfis podem ser criados por admins ou trigger" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

-- Create a new policy that also allows the trigger (via SECURITY DEFINER) to work
CREATE POLICY "Perfis podem ser criados por admins ou trigger"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin() OR
    id = auth.uid() -- Allow users to have their own profile created
  );

-- Also add a policy for service_role (this is technically not needed as service_role bypasses RLS)
-- but adding it for clarity
CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  TO service_role
  WITH CHECK (true);
