
-- 1) Audit logs: prevent forging user_id
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "Users insert their own audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (user_id IS NULL OR user_id = auth.uid())
);

-- 2) Cashbook entries: restrict writes to finance roles
DROP POLICY IF EXISTS "Staff can create cashbook entries" ON public.cashbook_entries;
DROP POLICY IF EXISTS "Staff can update cashbook entries" ON public.cashbook_entries;
CREATE POLICY "Finance staff create cashbook entries"
ON public.cashbook_entries
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'owner'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
  OR public.has_role(auth.uid(), 'cashier'::app_role)
  OR public.has_role(auth.uid(), 'accountant'::app_role)
);
CREATE POLICY "Finance staff update cashbook entries"
ON public.cashbook_entries
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'owner'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
  OR public.has_role(auth.uid(), 'cashier'::app_role)
  OR public.has_role(auth.uid(), 'accountant'::app_role)
);

-- 3) Customers: restrict writes to roles
DROP POLICY IF EXISTS "Staff can create customers" ON public.customers;
DROP POLICY IF EXISTS "Staff can update customers" ON public.customers;
CREATE POLICY "Staff create customers"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'owner'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
  OR public.has_role(auth.uid(), 'cashier'::app_role)
  OR public.has_role(auth.uid(), 'accountant'::app_role)
);
CREATE POLICY "Staff update customers"
ON public.customers
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'owner'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
  OR public.has_role(auth.uid(), 'cashier'::app_role)
  OR public.has_role(auth.uid(), 'accountant'::app_role)
);

-- 4) Scope public-role policies on production tables to authenticated only
-- bill_of_materials
DROP POLICY IF EXISTS "Owners managers can create BOMs" ON public.bill_of_materials;
DROP POLICY IF EXISTS "Owners managers can delete BOMs" ON public.bill_of_materials;
DROP POLICY IF EXISTS "Owners managers can update BOMs" ON public.bill_of_materials;
DROP POLICY IF EXISTS "Users can view branch BOMs" ON public.bill_of_materials;
CREATE POLICY "Owners managers can create BOMs" ON public.bill_of_materials
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners managers can delete BOMs" ON public.bill_of_materials
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners managers can update BOMs" ON public.bill_of_materials
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Users can view branch BOMs" ON public.bill_of_materials
  FOR SELECT TO authenticated
  USING (public.user_can_access_branch(branch_id));

-- bom_items
DROP POLICY IF EXISTS "Owners managers can manage BOM items" ON public.bom_items;
DROP POLICY IF EXISTS "Users can view BOM items" ON public.bom_items;
CREATE POLICY "Owners managers can manage BOM items" ON public.bom_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Users can view BOM items" ON public.bom_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bill_of_materials bom
    WHERE bom.id = bom_items.bom_id AND public.user_can_access_branch(bom.branch_id)
  ));

-- raw_materials
DROP POLICY IF EXISTS "Owners managers can create raw materials" ON public.raw_materials;
DROP POLICY IF EXISTS "Owners managers can delete raw materials" ON public.raw_materials;
DROP POLICY IF EXISTS "Owners managers can update raw materials" ON public.raw_materials;
DROP POLICY IF EXISTS "Users can view branch raw materials" ON public.raw_materials;
CREATE POLICY "Owners managers can create raw materials" ON public.raw_materials
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners managers can delete raw materials" ON public.raw_materials
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners managers can update raw materials" ON public.raw_materials
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Users can view branch raw materials" ON public.raw_materials
  FOR SELECT TO authenticated
  USING (public.user_can_access_branch(branch_id));

-- production_orders
DROP POLICY IF EXISTS "Owners managers can create production orders" ON public.production_orders;
DROP POLICY IF EXISTS "Owners managers can delete production orders" ON public.production_orders;
DROP POLICY IF EXISTS "Owners managers can update production orders" ON public.production_orders;
DROP POLICY IF EXISTS "Users can view branch production orders" ON public.production_orders;
CREATE POLICY "Owners managers can create production orders" ON public.production_orders
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners managers can delete production orders" ON public.production_orders
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners managers can update production orders" ON public.production_orders
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Users can view branch production orders" ON public.production_orders
  FOR SELECT TO authenticated
  USING (public.user_can_access_branch(branch_id));

-- production_costs
DROP POLICY IF EXISTS "Owners managers can manage production costs" ON public.production_costs;
DROP POLICY IF EXISTS "Users can view production costs" ON public.production_costs;
CREATE POLICY "Owners managers can manage production costs" ON public.production_costs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Users can view production costs" ON public.production_costs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.production_orders po
    WHERE po.id = production_costs.production_order_id AND public.user_can_access_branch(po.branch_id)
  ));

-- production_material_usage
DROP POLICY IF EXISTS "Owners managers can manage material usage" ON public.production_material_usage;
DROP POLICY IF EXISTS "Users can view material usage" ON public.production_material_usage;
CREATE POLICY "Owners managers can manage prod material usage" ON public.production_material_usage
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Users can view prod material usage" ON public.production_material_usage
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.production_orders po
    WHERE po.id = production_material_usage.production_order_id AND public.user_can_access_branch(po.branch_id)
  ));

-- 5) complete_production_order: enforce org check
CREATE OR REPLACE FUNCTION public.complete_production_order(p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_bom_item RECORD;
  v_required_qty numeric;
  v_caller_org uuid;
  v_result jsonb := '{"success": true, "materials_deducted": [], "product_added": null}'::jsonb;
BEGIN
  v_caller_org := public.get_user_organization_id();
  IF v_caller_org IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT po.*, bom.product_id, p.name as product_name
  INTO v_order
  FROM production_orders po
  JOIN bill_of_materials bom ON bom.id = po.bom_id
  JOIN products p ON p.id = bom.product_id
  WHERE po.id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Production order not found';
  END IF;

  IF v_order.organization_id IS DISTINCT FROM v_caller_org THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF NOT (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF v_order.status = 'completed' THEN
    RAISE EXCEPTION 'Production order is already completed';
  END IF;

  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot complete a cancelled production order';
  END IF;

  FOR v_bom_item IN
    SELECT bi.raw_material_id, bi.quantity, rm.name, rm.stock_qty, rm.cost_price
    FROM bom_items bi
    JOIN raw_materials rm ON rm.id = bi.raw_material_id
    WHERE bi.bom_id = v_order.bom_id
  LOOP
    v_required_qty := v_bom_item.quantity * v_order.quantity;

    IF v_bom_item.stock_qty < v_required_qty THEN
      RAISE EXCEPTION 'Insufficient raw material "%": need %, have %',
        v_bom_item.name, v_required_qty, v_bom_item.stock_qty;
    END IF;

    UPDATE raw_materials
    SET stock_qty = stock_qty - v_required_qty, updated_at = now()
    WHERE id = v_bom_item.raw_material_id;

    INSERT INTO production_material_usage (
      production_order_id, raw_material_id, quantity_used, unit_cost, total_cost
    ) VALUES (
      p_order_id, v_bom_item.raw_material_id, v_required_qty,
      v_bom_item.cost_price, v_required_qty * v_bom_item.cost_price
    );

    v_result := jsonb_set(
      v_result, '{materials_deducted}',
      (v_result->'materials_deducted') || jsonb_build_object('name', v_bom_item.name, 'qty', v_required_qty)
    );
  END LOOP;

  UPDATE products
  SET stock_qty = stock_qty + v_order.quantity, updated_at = now()
  WHERE id = v_order.product_id;

  v_result := jsonb_set(v_result, '{product_added}', jsonb_build_object(
    'name', v_order.product_name, 'qty', v_order.quantity
  ));

  UPDATE production_orders
  SET status = 'completed', actual_end_date = CURRENT_DATE, updated_at = now()
  WHERE id = p_order_id;

  RETURN v_result;
END;
$function$;
