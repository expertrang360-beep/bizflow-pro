
-- Payment transactions
CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  user_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('paystack','manual_transfer')),
  reference text NOT NULL UNIQUE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'NGN',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','approved','failed','rejected')),
  proof_url text,
  payer_note text,
  admin_note text,
  metadata jsonb DEFAULT '{}'::jsonb,
  approved_by uuid,
  approved_at timestamptz,
  subscription_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_tx_org ON public.payment_transactions(organization_id);
CREATE INDEX idx_payment_tx_status ON public.payment_transactions(status);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view own payments" ON public.payment_transactions
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id() OR public.is_super_admin());

CREATE POLICY "Owners create own payments" ON public.payment_transactions
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id() AND public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners update own pending payments" ON public.payment_transactions
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id() AND public.has_role(auth.uid(), 'owner') AND status IN ('pending','submitted'))
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Super admins manage all payments" ON public.payment_transactions
  FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE TRIGGER trg_payment_tx_updated_at BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Platform bank accounts
CREATE TABLE public.platform_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name text NOT NULL,
  account_name text NOT NULL,
  account_number text NOT NULL,
  instructions text,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view active bank accounts" ON public.platform_bank_accounts
  FOR SELECT TO authenticated USING (active = true OR public.is_super_admin());

CREATE POLICY "Super admins manage bank accounts" ON public.platform_bank_accounts
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE TRIGGER trg_platform_bank_updated_at BEFORE UPDATE ON public.platform_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Org owners upload proofs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = public.get_user_organization_id()::text
  );

CREATE POLICY "Org owners read own proofs" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND ((storage.foldername(name))[1] = public.get_user_organization_id()::text OR public.is_super_admin())
  );

CREATE POLICY "Super admins manage proofs" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'payment-proofs' AND public.is_super_admin())
  WITH CHECK (bucket_id = 'payment-proofs' AND public.is_super_admin());

-- Internal helper: activate subscription from a successful payment
CREATE OR REPLACE FUNCTION public.activate_subscription_from_payment(p_payment_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_payment RECORD;
  v_plan RECORD;
  v_expires_at timestamptz;
  v_sub_id uuid;
BEGIN
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
END; $$;

-- Super admin approves a manual transfer
CREATE OR REPLACE FUNCTION public.approve_manual_payment(p_payment_id uuid, p_admin_note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sub_id uuid;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.payment_transactions
    SET admin_note = COALESCE(p_admin_note, admin_note), approved_by = auth.uid()
    WHERE id = p_payment_id;
  v_sub_id := public.activate_subscription_from_payment(p_payment_id);
  RETURN v_sub_id;
END; $$;

CREATE OR REPLACE FUNCTION public.reject_manual_payment(p_payment_id uuid, p_admin_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.payment_transactions
    SET status = 'rejected', admin_note = p_admin_note, approved_by = auth.uid(), approved_at = now(), updated_at = now()
    WHERE id = p_payment_id AND status IN ('pending','submitted');
END; $$;
