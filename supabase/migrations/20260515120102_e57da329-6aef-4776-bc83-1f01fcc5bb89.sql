
-- Helper: super admin check
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin');
$$;

-- ===== plans =====
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  billing_period text NOT NULL DEFAULT 'monthly', -- monthly | yearly | lifetime | trial
  duration_days integer NOT NULL DEFAULT 30,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active plans" ON public.plans
  FOR SELECT TO authenticated USING (active = true OR public.is_super_admin());
CREATE POLICY "Super admins manage plans" ON public.plans
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE TRIGGER plans_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== license_keys =====
CREATE TABLE public.license_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'unused', -- unused | active | expired | revoked
  assigned_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  activated_at timestamptz,
  expires_at timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_license_keys_status ON public.license_keys(status);
CREATE INDEX idx_license_keys_org ON public.license_keys(assigned_org_id);
ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage license keys" ON public.license_keys
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Org owners view their assigned keys" ON public.license_keys
  FOR SELECT TO authenticated USING (assigned_org_id = public.get_user_organization_id());

CREATE TRIGGER license_keys_updated_at BEFORE UPDATE ON public.license_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== subscriptions =====
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  license_key_id uuid REFERENCES public.license_keys(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active', -- active | expired | cancelled
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_subscriptions_org ON public.subscriptions(organization_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view their subscription" ON public.subscriptions
  FOR SELECT TO authenticated USING (organization_id = public.get_user_organization_id() OR public.is_super_admin());
CREATE POLICY "Super admins manage subscriptions" ON public.subscriptions
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== Generate license key function =====
CREATE OR REPLACE FUNCTION public.generate_license_key()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := 'BIZ';
  segment text;
  i int;
  j int;
BEGIN
  FOR i IN 1..4 LOOP
    segment := '';
    FOR j IN 1..4 LOOP
      segment := segment || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    result := result || '-' || segment;
  END LOOP;
  RETURN result;
END; $$;

-- ===== Redeem license key (atomic) =====
CREATE OR REPLACE FUNCTION public.redeem_license_key(p_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_id uuid;
  v_license RECORD;
  v_plan RECORD;
  v_expires_at timestamptz;
  v_sub_id uuid;
BEGIN
  v_org_id := public.get_user_organization_id();
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated or no organization';
  END IF;

  IF NOT public.has_role(auth.uid(), 'owner') THEN
    RAISE EXCEPTION 'Only organization owners can redeem licenses';
  END IF;

  SELECT * INTO v_license FROM public.license_keys WHERE key = upper(trim(p_key)) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid license key'; END IF;
  IF v_license.status <> 'unused' THEN RAISE EXCEPTION 'License key already used or revoked'; END IF;

  SELECT * INTO v_plan FROM public.plans WHERE id = v_license.plan_id AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan unavailable'; END IF;

  v_expires_at := CASE WHEN v_plan.billing_period = 'lifetime' THEN NULL
                       ELSE now() + (v_plan.duration_days || ' days')::interval END;

  -- Expire previous active subscriptions for this org
  UPDATE public.subscriptions SET status = 'expired', updated_at = now()
    WHERE organization_id = v_org_id AND status = 'active';

  INSERT INTO public.subscriptions (organization_id, plan_id, license_key_id, status, starts_at, expires_at)
    VALUES (v_org_id, v_plan.id, v_license.id, 'active', now(), v_expires_at)
    RETURNING id INTO v_sub_id;

  UPDATE public.license_keys
    SET status = 'active', assigned_org_id = v_org_id, activated_at = now(), expires_at = v_expires_at, updated_at = now()
    WHERE id = v_license.id;

  RETURN jsonb_build_object('success', true, 'subscription_id', v_sub_id, 'plan_name', v_plan.name, 'expires_at', v_expires_at);
END; $$;

-- ===== Get current organization subscription =====
CREATE OR REPLACE FUNCTION public.get_org_subscription(p_org_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org uuid := COALESCE(p_org_id, public.get_user_organization_id());
  v_sub RECORD;
BEGIN
  IF v_org IS NULL THEN RETURN NULL; END IF;
  SELECT s.*, p.name AS plan_name, p.features AS plan_features, p.price AS plan_price, p.billing_period
    INTO v_sub
    FROM public.subscriptions s
    JOIN public.plans p ON p.id = s.plan_id
    WHERE s.organization_id = v_org AND s.status = 'active'
      AND (s.expires_at IS NULL OR s.expires_at > now())
    ORDER BY s.created_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN to_jsonb(v_sub);
END; $$;

-- ===== Feature gate check =====
CREATE OR REPLACE FUNCTION public.check_org_feature(p_feature text, p_org_id uuid DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_features jsonb;
BEGIN
  SELECT plan_features INTO v_features FROM (
    SELECT (public.get_org_subscription(p_org_id)->>'plan_features')::jsonb AS plan_features
  ) x;
  IF v_features IS NULL THEN RETURN false; END IF;
  RETURN COALESCE((v_features->'modules'->>p_feature)::boolean, false);
END; $$;

-- ===== Auto-create trial subscription on org creation =====
CREATE OR REPLACE FUNCTION public.create_trial_subscription()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_trial_id uuid;
BEGIN
  SELECT id INTO v_trial_id FROM public.plans WHERE name = 'Trial' AND active = true LIMIT 1;
  IF v_trial_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (organization_id, plan_id, status, starts_at, expires_at)
      VALUES (NEW.id, v_trial_id, 'active', now(), now() + interval '14 days');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER organizations_trial_subscription
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.create_trial_subscription();

-- ===== Seed default plans =====
INSERT INTO public.plans (name, description, price, billing_period, duration_days, sort_order, features) VALUES
  ('Trial', '14-day free trial of core features', 0, 'trial', 14, 0,
    '{"max_branches":1,"max_staff":2,"max_products":20,"modules":{"manufacturing":false,"ai_advisor":false,"payroll":false,"assets":false,"multi_branch":false}}'::jsonb),
  ('Starter', 'Best for small shops just starting out', 5000, 'monthly', 30, 1,
    '{"max_branches":1,"max_staff":3,"max_products":100,"modules":{"manufacturing":false,"ai_advisor":false,"payroll":false,"assets":true,"multi_branch":false}}'::jsonb),
  ('Pro', 'Growing businesses needing payroll and AI insights', 15000, 'monthly', 30, 2,
    '{"max_branches":3,"max_staff":10,"max_products":-1,"modules":{"manufacturing":false,"ai_advisor":true,"payroll":true,"assets":true,"multi_branch":true}}'::jsonb),
  ('Enterprise', 'Full power including manufacturing and unlimited everything', 50000, 'monthly', 30, 3,
    '{"max_branches":-1,"max_staff":-1,"max_products":-1,"modules":{"manufacturing":true,"ai_advisor":true,"payroll":true,"assets":true,"multi_branch":true}}'::jsonb);
