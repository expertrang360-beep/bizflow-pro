
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  existing_user_count INT;
  new_org_id uuid;
  invite_org_id uuid;
BEGIN
  invite_org_id := (NEW.raw_user_meta_data->>'organization_id')::uuid;

  IF invite_org_id IS NOT NULL AND EXISTS (SELECT 1 FROM organizations WHERE id = invite_org_id) THEN
    new_org_id := invite_org_id;
  ELSE
    INSERT INTO public.organizations (name)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business'))
    RETURNING id INTO new_org_id;
  END IF;

  INSERT INTO public.profiles (id, name, phone, organization_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    new_org_id
  );

  SELECT COUNT(*) INTO existing_user_count FROM auth.users WHERE id != NEW.id;

  -- Very first user becomes both platform super_admin AND organization owner
  IF existing_user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
  ELSIF invite_org_id IS NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
  END IF;

  RETURN NEW;
END;
$function$;

-- Backfill super_admin for existing first user(s) if none exists yet
DO $$
DECLARE first_user uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') THEN
    SELECT id INTO first_user FROM auth.users ORDER BY created_at ASC LIMIT 1;
    IF first_user IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (first_user, 'super_admin')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;

-- Backfill trial subscriptions for existing organizations without one
INSERT INTO public.subscriptions (organization_id, plan_id, status, starts_at, expires_at)
SELECT o.id, p.id, 'active', now(), now() + interval '14 days'
FROM public.organizations o
CROSS JOIN LATERAL (SELECT id FROM public.plans WHERE name = 'Trial' LIMIT 1) p
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscriptions s WHERE s.organization_id = o.id AND s.status = 'active'
);
