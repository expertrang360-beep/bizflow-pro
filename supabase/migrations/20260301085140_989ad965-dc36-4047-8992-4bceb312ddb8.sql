
-- ============================================================
-- FIX 1: Restrict SECURITY DEFINER functions
-- ============================================================

-- has_role: only allow checking own role, or if caller is owner/manager
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id = auth.uid() THEN
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role)
    WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'manager')) THEN
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role)
    ELSE false
  END;
$$;

-- get_user_branch: only allow checking own branch, or if caller is owner/manager
CREATE OR REPLACE FUNCTION public.get_user_branch(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id = auth.uid() THEN
      (SELECT branch_id FROM profiles WHERE id = _user_id)
    WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'manager')) THEN
      (SELECT branch_id FROM profiles WHERE id = _user_id)
    ELSE NULL
  END;
$$;

-- ============================================================
-- FIX 2: Role-based RLS policies for write operations
-- ============================================================

-- PRODUCTS: Replace permissive "Staff can manage" with role-scoped policies
DROP POLICY IF EXISTS "Staff can manage products" ON public.products;
CREATE POLICY "Owners managers can manage products" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')
  );
CREATE POLICY "Owners managers can update products" ON public.products
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')
  );
CREATE POLICY "Owners managers can delete products" ON public.products
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')
  );

-- CUSTOMERS: All staff can create/update, only owner/manager can delete
DROP POLICY IF EXISTS "Staff can manage customers" ON public.customers;
CREATE POLICY "Staff can create customers" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can update customers" ON public.customers
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Owners managers can delete customers" ON public.customers
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')
  );

-- SUPPLIERS: Only owner/manager/accountant can manage
DROP POLICY IF EXISTS "Staff can manage suppliers" ON public.suppliers;
CREATE POLICY "Privileged staff can create suppliers" ON public.suppliers
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
  );
CREATE POLICY "Privileged staff can update suppliers" ON public.suppliers
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
  );
CREATE POLICY "Owners managers can delete suppliers" ON public.suppliers
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')
  );

-- SALES: Staff can create/update, only owner/manager can delete (already exists)
DROP POLICY IF EXISTS "Staff can create sales" ON public.sales;
CREATE POLICY "Staff can create sales" ON public.sales
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'cashier')
  );
DROP POLICY IF EXISTS "Staff can update sales" ON public.sales;
CREATE POLICY "Staff can update sales" ON public.sales
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'cashier')
  );

-- SALE_ITEMS: Same as sales
DROP POLICY IF EXISTS "Staff can manage sale items" ON public.sale_items;
CREATE POLICY "Sales staff can create sale items" ON public.sale_items
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'cashier')
  );
CREATE POLICY "Sales staff can update sale items" ON public.sale_items
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'cashier')
  );
CREATE POLICY "Owners managers can delete sale items" ON public.sale_items
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')
  );

-- PURCHASES: Owner/manager/accountant can manage
DROP POLICY IF EXISTS "Staff can manage purchases" ON public.purchases;
CREATE POLICY "Privileged staff can create purchases" ON public.purchases
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
  );
CREATE POLICY "Privileged staff can update purchases" ON public.purchases
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
  );
CREATE POLICY "Owners managers can delete purchases" ON public.purchases
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')
  );

-- PURCHASE_ITEMS: Same as purchases
DROP POLICY IF EXISTS "Staff can manage purchase items" ON public.purchase_items;
CREATE POLICY "Privileged staff can create purchase items" ON public.purchase_items
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
  );
CREATE POLICY "Privileged staff can update purchase items" ON public.purchase_items
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
  );
CREATE POLICY "Owners managers can delete purchase items" ON public.purchase_items
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')
  );

-- EXPENSES: Owner/manager/accountant can manage
DROP POLICY IF EXISTS "Staff can manage expenses" ON public.expenses;
CREATE POLICY "Finance staff can create expenses" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
  );
CREATE POLICY "Finance staff can update expenses" ON public.expenses
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
  );
CREATE POLICY "Owners managers can delete expenses" ON public.expenses
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')
  );

-- DEBT_PAYMENTS: Cashier/owner/manager can manage
DROP POLICY IF EXISTS "Staff can manage debt payments" ON public.debt_payments;
CREATE POLICY "Staff can create debt payments" ON public.debt_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'cashier')
  );
CREATE POLICY "Staff can update debt payments" ON public.debt_payments
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'cashier')
  );
CREATE POLICY "Owners managers can delete debt payments" ON public.debt_payments
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')
  );

-- SUPPLIER_PAYMENTS: Owner/manager/accountant
DROP POLICY IF EXISTS "Staff can manage supplier payments" ON public.supplier_payments;
CREATE POLICY "Finance staff can create supplier payments" ON public.supplier_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
  );
CREATE POLICY "Finance staff can update supplier payments" ON public.supplier_payments
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
  );
CREATE POLICY "Owners managers can delete supplier payments" ON public.supplier_payments
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')
  );

-- CASHBOOK_ENTRIES: Owner/manager/cashier/accountant can create, only owner/manager delete
DROP POLICY IF EXISTS "Staff can manage cashbook" ON public.cashbook_entries;
CREATE POLICY "Staff can create cashbook entries" ON public.cashbook_entries
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can update cashbook entries" ON public.cashbook_entries
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Owners managers can delete cashbook entries" ON public.cashbook_entries
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')
  );

-- INVENTORY_MOVEMENTS: Owner/manager can manage
DROP POLICY IF EXISTS "Staff can manage inventory movements" ON public.inventory_movements;
CREATE POLICY "Privileged staff can create inventory movements" ON public.inventory_movements
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'cashier')
  );
CREATE POLICY "Privileged staff can update inventory movements" ON public.inventory_movements
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')
  );
CREATE POLICY "Owners managers can delete inventory movements" ON public.inventory_movements
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')
  );
