
-- 1. Add organization_id to user_roles, backfill, stamp on insert
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS organization_id uuid;
UPDATE public.user_roles ur
  SET organization_id = p.organization_id
  FROM public.profiles p
  WHERE p.id = ur.user_id AND ur.organization_id IS NULL;

CREATE OR REPLACE FUNCTION public.stamp_user_role_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id FROM public.profiles WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_user_role_org ON public.user_roles;
CREATE TRIGGER trg_stamp_user_role_org
  BEFORE INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.stamp_user_role_org();

-- 2. Block super_admin self-escalation. Only existing super_admins can grant super_admin.
CREATE OR REPLACE FUNCTION public.prevent_super_admin_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'super_admin' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    ) THEN
      RAISE EXCEPTION 'Only platform super_admins can assign the super_admin role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_super_admin_escalation ON public.user_roles;
CREATE TRIGGER trg_prevent_super_admin_escalation
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_super_admin_escalation();

-- 3. RESTRICTIVE org_isolation on user_roles
DROP POLICY IF EXISTS "org_isolation" ON public.user_roles;
CREATE POLICY "org_isolation" ON public.user_roles
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR public.is_super_admin()
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    OR public.is_super_admin()
  );

-- 4. RESTRICTIVE org_isolation on profiles
DROP POLICY IF EXISTS "org_isolation" ON public.profiles;
CREATE POLICY "org_isolation" ON public.profiles
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR id = auth.uid()
    OR public.is_super_admin()
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    OR id = auth.uid()
    OR public.is_super_admin()
  );

-- 5. Scope has_role to same organization (prevents cross-tenant lookups)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id = auth.uid() THEN
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
    WHEN EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('owner','manager','super_admin')
    ) AND (
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
      OR (
        SELECT organization_id FROM public.profiles WHERE id = _user_id
      ) = public.get_user_organization_id()
    ) THEN
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
    ELSE false
  END;
$$;

-- 6. RESTRICTIVE org_isolation for child tables via parent joins
DROP POLICY IF EXISTS "org_isolation" ON public.payroll_items;
CREATE POLICY "org_isolation" ON public.payroll_items
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.payroll_runs pr
    WHERE pr.id = payroll_items.payroll_run_id
      AND pr.organization_id = public.get_user_organization_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.payroll_runs pr
    WHERE pr.id = payroll_items.payroll_run_id
      AND pr.organization_id = public.get_user_organization_id()
  ));

DROP POLICY IF EXISTS "org_isolation" ON public.asset_maintenance;
CREATE POLICY "org_isolation" ON public.asset_maintenance
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assets a
    WHERE a.id = asset_maintenance.asset_id
      AND a.organization_id = public.get_user_organization_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.assets a
    WHERE a.id = asset_maintenance.asset_id
      AND a.organization_id = public.get_user_organization_id()
  ));

DROP POLICY IF EXISTS "org_isolation" ON public.bom_items;
CREATE POLICY "org_isolation" ON public.bom_items
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bill_of_materials b
    WHERE b.id = bom_items.bom_id
      AND b.organization_id = public.get_user_organization_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.bill_of_materials b
    WHERE b.id = bom_items.bom_id
      AND b.organization_id = public.get_user_organization_id()
  ));

DROP POLICY IF EXISTS "org_isolation" ON public.daily_material_usage;
CREATE POLICY "org_isolation" ON public.daily_material_usage
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.daily_production_logs d
    WHERE d.id = daily_material_usage.daily_log_id
      AND d.organization_id = public.get_user_organization_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.daily_production_logs d
    WHERE d.id = daily_material_usage.daily_log_id
      AND d.organization_id = public.get_user_organization_id()
  ));

DROP POLICY IF EXISTS "org_isolation" ON public.production_costs;
CREATE POLICY "org_isolation" ON public.production_costs
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.production_orders po
    WHERE po.id = production_costs.production_order_id
      AND po.organization_id = public.get_user_organization_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.production_orders po
    WHERE po.id = production_costs.production_order_id
      AND po.organization_id = public.get_user_organization_id()
  ));

DROP POLICY IF EXISTS "org_isolation" ON public.production_material_usage;
CREATE POLICY "org_isolation" ON public.production_material_usage
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.production_orders po
    WHERE po.id = production_material_usage.production_order_id
      AND po.organization_id = public.get_user_organization_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.production_orders po
    WHERE po.id = production_material_usage.production_order_id
      AND po.organization_id = public.get_user_organization_id()
  ));

DROP POLICY IF EXISTS "org_isolation" ON public.purchase_items;
CREATE POLICY "org_isolation" ON public.purchase_items
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.purchases p
    WHERE p.id = purchase_items.purchase_id
      AND p.organization_id = public.get_user_organization_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.purchases p
    WHERE p.id = purchase_items.purchase_id
      AND p.organization_id = public.get_user_organization_id()
  ));

DROP POLICY IF EXISTS "org_isolation" ON public.sale_items;
CREATE POLICY "org_isolation" ON public.sale_items
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_items.sale_id
      AND s.organization_id = public.get_user_organization_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_items.sale_id
      AND s.organization_id = public.get_user_organization_id()
  ));
