
-- 1. Create organizations table
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'My Business',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 2. Add organization_id to profiles first
ALTER TABLE public.profiles ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

-- 3. Helper function to get user's org
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$;

-- 4. Organizations RLS
CREATE POLICY "Users can view own org" ON public.organizations AS RESTRICTIVE
FOR SELECT TO authenticated
USING (id = get_user_organization_id());

CREATE POLICY "Owners can manage own org" ON public.organizations
FOR ALL TO authenticated
USING (id = get_user_organization_id() AND has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (id = get_user_organization_id());

-- 5. Add organization_id to all data tables
ALTER TABLE public.branches ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.products ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.customers ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.sales ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.purchases ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.expenses ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.suppliers ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.assets ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.raw_materials ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.bill_of_materials ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.production_orders ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.daily_production_logs ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.cashbook_entries ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.debt_payments ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.supplier_payments ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.staff_salaries ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.payroll_runs ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.tax_records ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.audit_logs ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.inventory_movements ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.app_settings ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

-- 6. Auto-set trigger function
CREATE OR REPLACE FUNCTION public.auto_set_organization_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := get_user_organization_id();
  END IF;
  RETURN NEW;
END;
$$;

-- 7. Apply triggers to all tables
CREATE TRIGGER set_org_id BEFORE INSERT ON public.branches FOR EACH ROW EXECUTE FUNCTION auto_set_organization_id();
CREATE TRIGGER set_org_id BEFORE INSERT ON public.products FOR EACH ROW EXECUTE FUNCTION auto_set_organization_id();
CREATE TRIGGER set_org_id BEFORE INSERT ON public.customers FOR EACH ROW EXECUTE FUNCTION auto_set_organization_id();
CREATE TRIGGER set_org_id BEFORE INSERT ON public.sales FOR EACH ROW EXECUTE FUNCTION auto_set_organization_id();
CREATE TRIGGER set_org_id BEFORE INSERT ON public.purchases FOR EACH ROW EXECUTE FUNCTION auto_set_organization_id();
CREATE TRIGGER set_org_id BEFORE INSERT ON public.expenses FOR EACH ROW EXECUTE FUNCTION auto_set_organization_id();
CREATE TRIGGER set_org_id BEFORE INSERT ON public.suppliers FOR EACH ROW EXECUTE FUNCTION auto_set_organization_id();
CREATE TRIGGER set_org_id BEFORE INSERT ON public.assets FOR EACH ROW EXECUTE FUNCTION auto_set_organization_id();
CREATE TRIGGER set_org_id BEFORE INSERT ON public.raw_materials FOR EACH ROW EXECUTE FUNCTION auto_set_organization_id();
CREATE TRIGGER set_org_id BEFORE INSERT ON public.bill_of_materials FOR EACH ROW EXECUTE FUNCTION auto_set_organization_id();
CREATE TRIGGER set_org_id BEFORE INSERT ON public.production_orders FOR EACH ROW EXECUTE FUNCTION auto_set_organization_id();
CREATE TRIGGER set_org_id BEFORE INSERT ON public.daily_production_logs FOR EACH ROW EXECUTE FUNCTION auto_set_organization_id();
CREATE TRIGGER set_org_id BEFORE INSERT ON public.cashbook_entries FOR EACH ROW EXECUTE FUNCTION auto_set_organization_id();
CREATE TRIGGER set_org_id BEFORE INSERT ON public.debt_payments FOR EACH ROW EXECUTE FUNCTION auto_set_organization_id();
CREATE TRIGGER set_org_id BEFORE INSERT ON public.supplier_payments FOR EACH ROW EXECUTE FUNCTION auto_set_organization_id();
CREATE TRIGGER set_org_id BEFORE INSERT ON public.staff_salaries FOR EACH ROW EXECUTE FUNCTION auto_set_organization_id();
CREATE TRIGGER set_org_id BEFORE INSERT ON public.payroll_runs FOR EACH ROW EXECUTE FUNCTION auto_set_organization_id();
CREATE TRIGGER set_org_id BEFORE INSERT ON public.tax_records FOR EACH ROW EXECUTE FUNCTION auto_set_organization_id();
CREATE TRIGGER set_org_id BEFORE INSERT ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION auto_set_organization_id();
CREATE TRIGGER set_org_id BEFORE INSERT ON public.inventory_movements FOR EACH ROW EXECUTE FUNCTION auto_set_organization_id();
CREATE TRIGGER set_org_id BEFORE INSERT ON public.app_settings FOR EACH ROW EXECUTE FUNCTION auto_set_organization_id();

-- 8. Add RESTRICTIVE org isolation policies to all data tables
CREATE POLICY "org_isolation" ON public.branches AS RESTRICTIVE FOR ALL TO authenticated
USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "org_isolation" ON public.products AS RESTRICTIVE FOR ALL TO authenticated
USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "org_isolation" ON public.customers AS RESTRICTIVE FOR ALL TO authenticated
USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "org_isolation" ON public.sales AS RESTRICTIVE FOR ALL TO authenticated
USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "org_isolation" ON public.purchases AS RESTRICTIVE FOR ALL TO authenticated
USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "org_isolation" ON public.expenses AS RESTRICTIVE FOR ALL TO authenticated
USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "org_isolation" ON public.suppliers AS RESTRICTIVE FOR ALL TO authenticated
USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "org_isolation" ON public.assets AS RESTRICTIVE FOR ALL TO authenticated
USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "org_isolation" ON public.raw_materials AS RESTRICTIVE FOR ALL TO authenticated
USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "org_isolation" ON public.bill_of_materials AS RESTRICTIVE FOR ALL TO authenticated
USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "org_isolation" ON public.production_orders AS RESTRICTIVE FOR ALL TO authenticated
USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "org_isolation" ON public.daily_production_logs AS RESTRICTIVE FOR ALL TO authenticated
USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "org_isolation" ON public.cashbook_entries AS RESTRICTIVE FOR ALL TO authenticated
USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "org_isolation" ON public.debt_payments AS RESTRICTIVE FOR ALL TO authenticated
USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "org_isolation" ON public.supplier_payments AS RESTRICTIVE FOR ALL TO authenticated
USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "org_isolation" ON public.staff_salaries AS RESTRICTIVE FOR ALL TO authenticated
USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "org_isolation" ON public.payroll_runs AS RESTRICTIVE FOR ALL TO authenticated
USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "org_isolation" ON public.tax_records AS RESTRICTIVE FOR ALL TO authenticated
USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "org_isolation" ON public.audit_logs AS RESTRICTIVE FOR ALL TO authenticated
USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "org_isolation" ON public.inventory_movements AS RESTRICTIVE FOR ALL TO authenticated
USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "org_isolation" ON public.app_settings AS RESTRICTIVE FOR ALL TO authenticated
USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id());

-- 9. Update handle_new_user to create org for new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_user_count INT;
  new_org_id uuid;
  invite_org_id uuid;
BEGIN
  -- Check if user was invited with an organization
  invite_org_id := (NEW.raw_user_meta_data->>'organization_id')::uuid;

  IF invite_org_id IS NOT NULL AND EXISTS (SELECT 1 FROM organizations WHERE id = invite_org_id) THEN
    new_org_id := invite_org_id;
  ELSE
    -- Create a new organization
    INSERT INTO public.organizations (name)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business'))
    RETURNING id INTO new_org_id;
  END IF;

  -- Insert profile with organization
  INSERT INTO public.profiles (id, name, phone, organization_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    new_org_id
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

  -- If no invite, make the user an owner of their new org
  IF invite_org_id IS NULL AND existing_user_count > 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'owner');
  END IF;

  RETURN NEW;
END;
$$;

-- 10. Backfill existing data with a default org
DO $$
DECLARE
  default_org_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM profiles WHERE organization_id IS NULL) THEN
    INSERT INTO organizations (name) VALUES ('My Business') RETURNING id INTO default_org_id;
    
    UPDATE profiles SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE branches SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE products SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE customers SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE sales SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE purchases SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE expenses SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE suppliers SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE assets SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE raw_materials SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE bill_of_materials SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE production_orders SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE daily_production_logs SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE cashbook_entries SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE debt_payments SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE supplier_payments SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE staff_salaries SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE payroll_runs SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE tax_records SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE audit_logs SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE inventory_movements SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE app_settings SET organization_id = default_org_id WHERE organization_id IS NULL;
  END IF;
END;
$$;
