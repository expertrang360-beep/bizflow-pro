-- Enhance handle_new_user() to assign 'owner' role to first user in the system,
-- or if this is an invited user with an existing phone-based email, skip owner assignment.
-- This fixes Team page access for the business owner on first signup.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  existing_user_count INT;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone'
  );

  -- Count existing users (excluding this one)
  SELECT COUNT(*) INTO existing_user_count
  FROM auth.users
  WHERE id != NEW.id;

  -- If this is the very first user in the system, make them owner
  IF existing_user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'owner');
  END IF;

  RETURN NEW;
END;
$$;