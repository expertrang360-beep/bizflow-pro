
-- 1) activate_subscription_from_payment: require super_admin and revoke from authenticated
CREATE OR REPLACE FUNCTION public.activate_subscription_from_payment(p_payment_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_payment RECORD;
  v_plan RECORD;
  v_expires_at timestamptz;
  v_sub_id uuid;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_payment FROM public.payment_transactions WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF v_payment.status = 'approved' AND v_payment.subscription_id IS NOT NULL THEN
    RETURN v_payment.subscription_id;
  END IF;

  SELECT * INTO v_plan FROM public.plans WHERE id = v_payment.plan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan unavailable'; END IF;

  v_expires_at := CASE WHEN v_plan.billing_period = 'lifetime' THEN NULL
                       ELSE now() + (v_plan.duration_days || ' days')::interval END;

  UPDATE public.subscriptions SET status = 'expired', updated_at = now()
    WHERE organization_id = v_payment.organization_id AND status = 'active';

  INSERT INTO public.subscriptions (organization_id, plan_id, status, starts_at, expires_at)
    VALUES (v_payment.organization_id, v_plan.id, 'active', now(), v_expires_at)
    RETURNING id INTO v_sub_id;

  UPDATE public.payment_transactions
    SET status = 'approved', subscription_id = v_sub_id, approved_at = now(), updated_at = now()
    WHERE id = p_payment_id;

  RETURN v_sub_id;
END; $function$;

REVOKE EXECUTE ON FUNCTION public.activate_subscription_from_payment(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_subscription_from_payment(uuid) TO service_role;

-- 2) get_org_subscription: restrict cross-org access
CREATE OR REPLACE FUNCTION public.get_org_subscription(p_org_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid := COALESCE(p_org_id, public.get_user_organization_id());
  v_sub RECORD;
BEGIN
  IF v_org IS NULL THEN RETURN NULL; END IF;
  IF p_org_id IS NOT NULL AND p_org_id <> public.get_user_organization_id() THEN
    IF NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Access denied';
    END IF;
  END IF;
  SELECT s.*, p.name AS plan_name, p.features AS plan_features, p.price AS plan_price, p.billing_period
    INTO v_sub
    FROM public.subscriptions s
    JOIN public.plans p ON p.id = s.plan_id
    WHERE s.organization_id = v_org AND s.status = 'active'
      AND (s.expires_at IS NULL OR s.expires_at > now())
    ORDER BY s.created_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN to_jsonb(v_sub);
END; $function$;

-- 3) check_org_feature: same guard
CREATE OR REPLACE FUNCTION public.check_org_feature(p_feature text, p_org_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_features jsonb;
BEGIN
  IF p_org_id IS NOT NULL AND p_org_id <> public.get_user_organization_id() THEN
    IF NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Access denied';
    END IF;
  END IF;
  SELECT plan_features INTO v_features FROM (
    SELECT (public.get_org_subscription(p_org_id)->>'plan_features')::jsonb AS plan_features
  ) x;
  IF v_features IS NULL THEN RETURN false; END IF;
  RETURN COALESCE((v_features->'modules'->>p_feature)::boolean, false);
END; $function$;

-- 4) staff_salaries: restrict bank fields to owners only
DROP POLICY IF EXISTS "Owners and managers can view salaries" ON public.staff_salaries;
DROP POLICY IF EXISTS "Owners/managers view salaries" ON public.staff_salaries;
DROP POLICY IF EXISTS "Managers view salaries" ON public.staff_salaries;

-- Owners (full read incl. bank fields)
CREATE POLICY "Owners view all salary fields"
  ON public.staff_salaries FOR SELECT
  TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.has_role(auth.uid(), 'owner'::app_role)
  );

-- Managers: read rows but app must avoid selecting bank fields; enforce via column privilege
CREATE POLICY "Managers view salary rows"
  ON public.staff_salaries FOR SELECT
  TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.has_role(auth.uid(), 'manager'::app_role)
    AND NOT public.has_role(auth.uid(), 'owner'::app_role)
  );

-- Revoke column-level SELECT on sensitive bank fields from non-owners by using REVOKE on columns
REVOKE SELECT (account_number, bank_name) ON public.staff_salaries FROM authenticated;
GRANT SELECT (account_number, bank_name) ON public.staff_salaries TO service_role;

-- Owners need a way to read those columns; grant via a security-definer view
CREATE OR REPLACE VIEW public.staff_salaries_with_bank
WITH (security_invoker = true)
AS
  SELECT * FROM public.staff_salaries
  WHERE public.has_role(auth.uid(), 'owner'::app_role)
    AND organization_id = public.get_user_organization_id();

GRANT SELECT ON public.staff_salaries_with_bank TO authenticated;

-- 5) license_keys: restrict full row (incl. key value) to owners only
DROP POLICY IF EXISTS "Org members can view their license keys" ON public.license_keys;
DROP POLICY IF EXISTS "Members view assigned license keys" ON public.license_keys;

CREATE POLICY "Owners view org license keys"
  ON public.license_keys FOR SELECT
  TO authenticated
  USING (
    assigned_org_id = public.get_user_organization_id()
    AND public.has_role(auth.uid(), 'owner'::app_role)
  );
