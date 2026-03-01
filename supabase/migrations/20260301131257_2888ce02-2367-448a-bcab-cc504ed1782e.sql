
-- =============================================
-- FIX 1: Branch-scoped SELECT RLS policies
-- Replace USING(true) with branch-scoped access
-- Owners/managers can see all branches
-- =============================================

-- Helper function to check branch access (avoids repetition)
CREATE OR REPLACE FUNCTION public.user_can_access_branch(p_branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Owners and managers can see all branches
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'manager'))
    OR
    -- Other staff can only see their own branch (or records with no branch)
    p_branch_id IS NULL
    OR
    p_branch_id = (SELECT branch_id FROM profiles WHERE id = auth.uid())
$$;

-- products
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
CREATE POLICY "Users can view branch products"
  ON public.products FOR SELECT TO authenticated
  USING (public.user_can_access_branch(branch_id));

-- customers
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
CREATE POLICY "Users can view branch customers"
  ON public.customers FOR SELECT TO authenticated
  USING (public.user_can_access_branch(branch_id));

-- suppliers
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;
CREATE POLICY "Users can view branch suppliers"
  ON public.suppliers FOR SELECT TO authenticated
  USING (public.user_can_access_branch(branch_id));

-- sales
DROP POLICY IF EXISTS "Authenticated users can view sales" ON public.sales;
CREATE POLICY "Users can view branch sales"
  ON public.sales FOR SELECT TO authenticated
  USING (public.user_can_access_branch(branch_id));

-- purchases
DROP POLICY IF EXISTS "Authenticated users can view purchases" ON public.purchases;
CREATE POLICY "Users can view branch purchases"
  ON public.purchases FOR SELECT TO authenticated
  USING (public.user_can_access_branch(branch_id));

-- expenses
DROP POLICY IF EXISTS "Authenticated users can view expenses" ON public.expenses;
CREATE POLICY "Users can view branch expenses"
  ON public.expenses FOR SELECT TO authenticated
  USING (public.user_can_access_branch(branch_id));

-- debt_payments
DROP POLICY IF EXISTS "Authenticated users can view debt payments" ON public.debt_payments;
CREATE POLICY "Users can view branch debt payments"
  ON public.debt_payments FOR SELECT TO authenticated
  USING (public.user_can_access_branch(branch_id));

-- supplier_payments
DROP POLICY IF EXISTS "Authenticated users can view supplier payments" ON public.supplier_payments;
CREATE POLICY "Users can view branch supplier payments"
  ON public.supplier_payments FOR SELECT TO authenticated
  USING (public.user_can_access_branch(branch_id));

-- cashbook_entries
DROP POLICY IF EXISTS "Authenticated users can view cashbook" ON public.cashbook_entries;
CREATE POLICY "Users can view branch cashbook"
  ON public.cashbook_entries FOR SELECT TO authenticated
  USING (public.user_can_access_branch(branch_id));

-- inventory_movements (no branch_id - join via product)
DROP POLICY IF EXISTS "Authenticated users can view inventory movements" ON public.inventory_movements;
CREATE POLICY "Users can view branch inventory movements"
  ON public.inventory_movements FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = inventory_movements.product_id
      AND public.user_can_access_branch(products.branch_id)
    )
  );

-- sale_items (no branch_id - join via sale)
DROP POLICY IF EXISTS "Authenticated users can view sale items" ON public.sale_items;
CREATE POLICY "Users can view branch sale items"
  ON public.sale_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_items.sale_id
      AND public.user_can_access_branch(sales.branch_id)
    )
  );

-- purchase_items (no branch_id - join via purchase)
DROP POLICY IF EXISTS "Authenticated users can view purchase items" ON public.purchase_items;
CREATE POLICY "Users can view branch purchase items"
  ON public.purchase_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM purchases
      WHERE purchases.id = purchase_items.purchase_id
      AND public.user_can_access_branch(purchases.branch_id)
    )
  );

-- =============================================
-- FIX 2: Atomic functions for race conditions
-- =============================================

-- Atomic stock update (delta-based, not read-modify-write)
CREATE OR REPLACE FUNCTION public.update_stock_atomic(
  p_product_id uuid,
  p_quantity_delta numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  new_stock numeric;
BEGIN
  UPDATE products
  SET stock_qty = stock_qty + p_quantity_delta,
      updated_at = now()
  WHERE id = p_product_id
  RETURNING stock_qty INTO new_stock;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;

  IF new_stock < 0 THEN
    RAISE EXCEPTION 'Insufficient stock. Available: %', new_stock - p_quantity_delta;
  END IF;

  RETURN new_stock;
END;
$$;

-- Atomic customer credit update (delta-based)
CREATE OR REPLACE FUNCTION public.update_customer_credit_atomic(
  p_customer_id uuid,
  p_credit_delta numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  new_credit numeric;
BEGIN
  UPDATE customers
  SET total_credit = total_credit + p_credit_delta,
      updated_at = now()
  WHERE id = p_customer_id
  RETURNING total_credit INTO new_credit;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found: %', p_customer_id;
  END IF;

  IF new_credit < 0 THEN
    RAISE EXCEPTION 'Credit cannot go below zero';
  END IF;

  RETURN new_credit;
END;
$$;

-- Atomic supplier payable update (delta-based)
CREATE OR REPLACE FUNCTION public.update_supplier_payable_atomic(
  p_supplier_id uuid,
  p_payable_delta numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  new_payable numeric;
BEGIN
  UPDATE suppliers
  SET total_payable = total_payable + p_payable_delta,
      updated_at = now()
  WHERE id = p_supplier_id
  RETURNING total_payable INTO new_payable;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Supplier not found: %', p_supplier_id;
  END IF;

  RETURN new_payable;
END;
$$;
