-- BizFlow consolidated schema for new Supabase project
-- Apply in Supabase SQL Editor (or via: supabase db push)
-- Generated 2026-07-01T18:59:23Z

-- ============================================================
-- 20260220190203_c742dc4f-9585-4b3c-9341-26c18763543e.sql
-- ============================================================

-- BizKit Complete Database Schema

-- Branches table
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- App roles enum
CREATE TYPE public.app_role AS ENUM ('owner', 'manager', 'cashier', 'accountant');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  branch_id UUID REFERENCES public.branches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (RBAC)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  branch_id UUID REFERENCES public.branches(id),
  UNIQUE(user_id, role)
);

-- Products / Inventory
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id),
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  unit TEXT DEFAULT 'piece',
  cost_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  sell_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  stock_qty NUMERIC(15,2) NOT NULL DEFAULT 0,
  reorder_level NUMERIC(15,2) DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customers
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  total_credit NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Suppliers
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  total_payable NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sales
CREATE TYPE public.payment_type AS ENUM ('cash', 'transfer', 'pos', 'credit');
CREATE TYPE public.sale_status AS ENUM ('completed', 'credit', 'partial', 'cancelled');

CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id),
  customer_id UUID REFERENCES public.customers(id),
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax NUMERIC(15,2) NOT NULL DEFAULT 0,
  total NUMERIC(15,2) NOT NULL DEFAULT 0,
  payment_type public.payment_type NOT NULL DEFAULT 'cash',
  status public.sale_status NOT NULL DEFAULT 'completed',
  amount_paid NUMERIC(15,2) NOT NULL DEFAULT 0,
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sale items
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  qty NUMERIC(15,2) NOT NULL,
  price NUMERIC(15,2) NOT NULL,
  cost_at_time NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount NUMERIC(15,2) NOT NULL DEFAULT 0,
  total NUMERIC(15,2) NOT NULL
);

-- Purchases
CREATE TYPE public.purchase_status AS ENUM ('paid', 'partial', 'unpaid');

CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id),
  supplier_id UUID REFERENCES public.suppliers(id),
  total NUMERIC(15,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  status public.purchase_status NOT NULL DEFAULT 'paid',
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Purchase items
CREATE TABLE public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  qty NUMERIC(15,2) NOT NULL,
  cost_price NUMERIC(15,2) NOT NULL,
  total NUMERIC(15,2) NOT NULL
);

-- Expenses
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id),
  category TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  payment_type public.payment_type NOT NULL DEFAULT 'cash',
  note TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Debt payments (customer payments)
CREATE TABLE public.debt_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  sale_id UUID REFERENCES public.sales(id),
  amount NUMERIC(15,2) NOT NULL,
  payment_type public.payment_type NOT NULL DEFAULT 'cash',
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Supplier payments
CREATE TABLE public.supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  purchase_id UUID REFERENCES public.purchases(id),
  amount NUMERIC(15,2) NOT NULL,
  payment_type public.payment_type NOT NULL DEFAULT 'cash',
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cashbook entries
CREATE TYPE public.cashbook_direction AS ENUM ('in', 'out');

CREATE TABLE public.cashbook_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id),
  direction public.cashbook_direction NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID,
  description TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inventory movements
CREATE TABLE public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id),
  type TEXT NOT NULL,
  qty NUMERIC(15,2) NOT NULL,
  ref_type TEXT,
  ref_id UUID,
  note TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  before_json JSONB,
  after_json JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- App settings
CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id),
  key TEXT NOT NULL,
  value TEXT,
  UNIQUE(branch_id, key),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FUNCTIONS

-- has_role function for RBAC
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- get_user_branch function
CREATE OR REPLACE FUNCTION public.get_user_branch(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT branch_id FROM public.profiles WHERE id = _user_id
$$;

-- update_updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ENABLE RLS ON ALL TABLES
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES (branch-scoped for authenticated users)

-- Branches: any authenticated user can read
CREATE POLICY "Authenticated users can view branches" ON public.branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners can manage branches" ON public.branches FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- Profiles: users see own, owners see all
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "System inserts profiles" ON public.profiles FOR INSERT WITH CHECK (true);

-- User roles
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- Products: authenticated users in same branch
CREATE POLICY "Authenticated users can view products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage products" ON public.products FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Customers
CREATE POLICY "Authenticated users can view customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage customers" ON public.customers FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Suppliers
CREATE POLICY "Authenticated users can view suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage suppliers" ON public.suppliers FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Sales
CREATE POLICY "Authenticated users can view sales" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can create sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can update sales" ON public.sales FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Owners managers can delete sales" ON public.sales FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'));

-- Sale items
CREATE POLICY "Authenticated users can view sale items" ON public.sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage sale items" ON public.sale_items FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Purchases
CREATE POLICY "Authenticated users can view purchases" ON public.purchases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage purchases" ON public.purchases FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Purchase items
CREATE POLICY "Authenticated users can view purchase items" ON public.purchase_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage purchase items" ON public.purchase_items FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Expenses
CREATE POLICY "Authenticated users can view expenses" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage expenses" ON public.expenses FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Debt payments
CREATE POLICY "Authenticated users can view debt payments" ON public.debt_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage debt payments" ON public.debt_payments FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Supplier payments
CREATE POLICY "Authenticated users can view supplier payments" ON public.supplier_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage supplier payments" ON public.supplier_payments FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Cashbook
CREATE POLICY "Authenticated users can view cashbook" ON public.cashbook_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage cashbook" ON public.cashbook_entries FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Inventory movements
CREATE POLICY "Authenticated users can view inventory movements" ON public.inventory_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage inventory movements" ON public.inventory_movements FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Audit logs
CREATE POLICY "Authenticated users can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- App settings
CREATE POLICY "Authenticated users can view settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners can manage settings" ON public.app_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager')) WITH CHECK (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'));

-- Seed: default branch
INSERT INTO public.branches (id, name, address) VALUES ('00000000-0000-0000-0000-000000000001', 'Main Branch', 'Lagos, Nigeria');

-- ============================================================
-- 20260220190212_f1d1c32b-b1c4-426d-877b-8cd451ef1429.sql
-- ============================================================

-- Fix overly permissive profiles INSERT policy
DROP POLICY IF EXISTS "System inserts profiles" ON public.profiles;
CREATE POLICY "System inserts profiles" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());

-- ============================================================
-- 20260301085140_989ad965-dc36-4047-8992-4bceb312ddb8.sql
-- ============================================================

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

-- ============================================================
-- 20260301131257_2888ce02-2367-448a-bcab-cc504ed1782e.sql
-- ============================================================

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

-- ============================================================
-- 20260302140923_6b8d1dfa-0452-4be8-80e3-03656148d51e.sql
-- ============================================================
-- Fix: Restrict audit_logs SELECT to owners and managers only
DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON public.audit_logs;

CREATE POLICY "Owners and managers can view audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
  );
-- ============================================================
-- 20260305130226_14753f46-e7d9-4f00-b7bd-8e092fe65ac1.sql
-- ============================================================

-- =============================================
-- ASSET MANAGEMENT TABLES
-- =============================================

-- Asset categories enum
CREATE TYPE public.asset_status AS ENUM ('active', 'disposed', 'maintenance', 'retired');
CREATE TYPE public.depreciation_method AS ENUM ('straight_line', 'declining_balance');

-- Fixed assets table
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID REFERENCES public.branches(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  purchase_cost NUMERIC NOT NULL DEFAULT 0,
  salvage_value NUMERIC NOT NULL DEFAULT 0,
  useful_life_months INTEGER NOT NULL DEFAULT 60,
  depreciation_method depreciation_method NOT NULL DEFAULT 'straight_line',
  status asset_status NOT NULL DEFAULT 'active',
  location TEXT,
  serial_number TEXT,
  disposal_date DATE,
  disposal_amount NUMERIC DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view branch assets" ON public.assets
  FOR SELECT TO authenticated
  USING (user_can_access_branch(branch_id));

CREATE POLICY "Owners managers can create assets" ON public.assets
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Owners managers can update assets" ON public.assets
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Owners managers can delete assets" ON public.assets
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));

-- Asset maintenance log
CREATE TABLE public.asset_maintenance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  maintenance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  cost NUMERIC NOT NULL DEFAULT 0,
  performed_by TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.asset_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view asset maintenance" ON public.asset_maintenance
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM assets WHERE assets.id = asset_maintenance.asset_id AND user_can_access_branch(assets.branch_id)));

CREATE POLICY "Owners managers can manage maintenance" ON public.asset_maintenance
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM assets WHERE assets.id = asset_maintenance.asset_id AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))))
  WITH CHECK (EXISTS (SELECT 1 FROM assets WHERE assets.id = asset_maintenance.asset_id AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))));

-- =============================================
-- TAX MANAGEMENT TABLES
-- =============================================

CREATE TYPE public.tax_type AS ENUM ('vat', 'cit');
CREATE TYPE public.tax_period_status AS ENUM ('open', 'filed', 'paid');

CREATE TABLE public.tax_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID REFERENCES public.branches(id),
  tax_type tax_type NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  taxable_amount NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  status tax_period_status NOT NULL DEFAULT 'open',
  filed_date DATE,
  paid_date DATE,
  reference_number TEXT,
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance staff can view tax records" ON public.tax_records
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant'));

CREATE POLICY "Finance staff can create tax records" ON public.tax_records
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant'));

CREATE POLICY "Finance staff can update tax records" ON public.tax_records
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant'));

CREATE POLICY "Owners managers can delete tax records" ON public.tax_records
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));

-- =============================================
-- PAYROLL TABLES
-- =============================================

CREATE TYPE public.payroll_status AS ENUM ('draft', 'approved', 'paid');

CREATE TABLE public.staff_salaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID REFERENCES public.branches(id),
  user_id UUID,
  staff_name TEXT NOT NULL,
  role TEXT,
  base_salary NUMERIC NOT NULL DEFAULT 0,
  bank_name TEXT,
  account_number TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_salaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners managers can view salaries" ON public.staff_salaries
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Owners can manage salaries" ON public.staff_salaries
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner'))
  WITH CHECK (has_role(auth.uid(), 'owner'));

CREATE TABLE public.payroll_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID REFERENCES public.branches(id),
  pay_period TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_gross NUMERIC NOT NULL DEFAULT 0,
  total_deductions NUMERIC NOT NULL DEFAULT 0,
  total_net NUMERIC NOT NULL DEFAULT 0,
  status payroll_status NOT NULL DEFAULT 'draft',
  approved_by UUID,
  paid_date DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners managers can view payroll" ON public.payroll_runs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Owners can manage payroll" ON public.payroll_runs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner'))
  WITH CHECK (has_role(auth.uid(), 'owner'));

CREATE TABLE public.payroll_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  staff_salary_id UUID NOT NULL REFERENCES public.staff_salaries(id),
  staff_name TEXT NOT NULL,
  base_salary NUMERIC NOT NULL DEFAULT 0,
  allowances NUMERIC NOT NULL DEFAULT 0,
  paye_tax NUMERIC NOT NULL DEFAULT 0,
  pension NUMERIC NOT NULL DEFAULT 0,
  other_deductions NUMERIC NOT NULL DEFAULT 0,
  net_pay NUMERIC NOT NULL DEFAULT 0
);

ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners managers can view payroll items" ON public.payroll_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM payroll_runs WHERE payroll_runs.id = payroll_items.payroll_run_id AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))));

CREATE POLICY "Owners can manage payroll items" ON public.payroll_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM payroll_runs WHERE payroll_runs.id = payroll_items.payroll_run_id AND has_role(auth.uid(), 'owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM payroll_runs WHERE payroll_runs.id = payroll_items.payroll_run_id AND has_role(auth.uid(), 'owner')));

-- ============================================================
-- 20260309014038_1c003bbf-8bf7-4b50-af89-66884ea927c5.sql
-- ============================================================
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
-- ============================================================
-- 20260309022649_020c6aa4-4280-4578-9300-c9a42d7f5992.sql
-- ============================================================
-- Create business_type enum
CREATE TYPE public.business_type AS ENUM ('trader', 'manufacturer');

-- Create production_status enum
CREATE TYPE public.production_status AS ENUM ('draft', 'in_progress', 'completed', 'cancelled');

-- Raw materials table (separate from finished products)
CREATE TABLE public.raw_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID REFERENCES public.branches(id),
  name TEXT NOT NULL,
  sku TEXT,
  unit TEXT DEFAULT 'piece',
  category TEXT,
  stock_qty NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  reorder_level NUMERIC DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bill of Materials (defines what raw materials make a product)
CREATE TABLE public.bill_of_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID REFERENCES public.branches(id),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  estimated_labor_cost NUMERIC NOT NULL DEFAULT 0,
  estimated_overhead_cost NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- BOM items (raw materials needed for a BOM)
CREATE TABLE public.bom_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bom_id UUID REFERENCES public.bill_of_materials(id) ON DELETE CASCADE NOT NULL,
  raw_material_id UUID REFERENCES public.raw_materials(id) ON DELETE CASCADE NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Production orders
CREATE TABLE public.production_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID REFERENCES public.branches(id),
  bom_id UUID REFERENCES public.bill_of_materials(id) NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  status public.production_status NOT NULL DEFAULT 'draft',
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Production costs (tracks actual costs per production order)
CREATE TABLE public.production_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  production_order_id UUID REFERENCES public.production_orders(id) ON DELETE CASCADE NOT NULL,
  cost_type TEXT NOT NULL, -- 'material', 'labor', 'overhead', 'other'
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Production material usage (actual raw materials consumed)
CREATE TABLE public.production_material_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  production_order_id UUID REFERENCES public.production_orders(id) ON DELETE CASCADE NOT NULL,
  raw_material_id UUID REFERENCES public.raw_materials(id) NOT NULL,
  quantity_used NUMERIC NOT NULL DEFAULT 0,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_of_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_material_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies for raw_materials
CREATE POLICY "Users can view branch raw materials" ON public.raw_materials
  FOR SELECT USING (user_can_access_branch(branch_id));

CREATE POLICY "Owners managers can create raw materials" ON public.raw_materials
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Owners managers can update raw materials" ON public.raw_materials
  FOR UPDATE USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Owners managers can delete raw materials" ON public.raw_materials
  FOR DELETE USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));

-- RLS policies for bill_of_materials
CREATE POLICY "Users can view branch BOMs" ON public.bill_of_materials
  FOR SELECT USING (user_can_access_branch(branch_id));

CREATE POLICY "Owners managers can create BOMs" ON public.bill_of_materials
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Owners managers can update BOMs" ON public.bill_of_materials
  FOR UPDATE USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Owners managers can delete BOMs" ON public.bill_of_materials
  FOR DELETE USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));

-- RLS policies for bom_items
CREATE POLICY "Users can view BOM items" ON public.bom_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM bill_of_materials bom 
    WHERE bom.id = bom_items.bom_id AND user_can_access_branch(bom.branch_id)
  ));

CREATE POLICY "Owners managers can manage BOM items" ON public.bom_items
  FOR ALL USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
  WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));

-- RLS policies for production_orders
CREATE POLICY "Users can view branch production orders" ON public.production_orders
  FOR SELECT USING (user_can_access_branch(branch_id));

CREATE POLICY "Owners managers can create production orders" ON public.production_orders
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Owners managers can update production orders" ON public.production_orders
  FOR UPDATE USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Owners managers can delete production orders" ON public.production_orders
  FOR DELETE USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));

-- RLS policies for production_costs
CREATE POLICY "Users can view production costs" ON public.production_costs
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM production_orders po 
    WHERE po.id = production_costs.production_order_id AND user_can_access_branch(po.branch_id)
  ));

CREATE POLICY "Owners managers can manage production costs" ON public.production_costs
  FOR ALL USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
  WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));

-- RLS policies for production_material_usage
CREATE POLICY "Users can view material usage" ON public.production_material_usage
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM production_orders po 
    WHERE po.id = production_material_usage.production_order_id AND user_can_access_branch(po.branch_id)
  ));

CREATE POLICY "Owners managers can manage material usage" ON public.production_material_usage
  FOR ALL USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
  WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));

-- Add updated_at triggers
CREATE TRIGGER update_raw_materials_updated_at
  BEFORE UPDATE ON public.raw_materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bill_of_materials_updated_at
  BEFORE UPDATE ON public.bill_of_materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_production_orders_updated_at
  BEFORE UPDATE ON public.production_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================================
-- 20260309024013_2f1a84ff-f996-4c35-9e20-72f2c3cac7ff.sql
-- ============================================================
-- Create atomic function to complete production order
-- This deducts raw materials and adds finished products to inventory
CREATE OR REPLACE FUNCTION public.complete_production_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD;
  v_bom_item RECORD;
  v_raw_material RECORD;
  v_required_qty numeric;
  v_result jsonb := '{"success": true, "materials_deducted": [], "product_added": null}'::jsonb;
BEGIN
  -- Get production order details
  SELECT po.*, bom.product_id, p.name as product_name
  INTO v_order
  FROM production_orders po
  JOIN bill_of_materials bom ON bom.id = po.bom_id
  JOIN products p ON p.id = bom.product_id
  WHERE po.id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Production order not found: %', p_order_id;
  END IF;

  IF v_order.status = 'completed' THEN
    RAISE EXCEPTION 'Production order is already completed';
  END IF;

  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot complete a cancelled production order';
  END IF;

  -- Check raw material availability and deduct
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

    -- Deduct raw material stock
    UPDATE raw_materials
    SET stock_qty = stock_qty - v_required_qty,
        updated_at = now()
    WHERE id = v_bom_item.raw_material_id;

    -- Record material usage
    INSERT INTO production_material_usage (
      production_order_id,
      raw_material_id,
      quantity_used,
      unit_cost,
      total_cost
    ) VALUES (
      p_order_id,
      v_bom_item.raw_material_id,
      v_required_qty,
      v_bom_item.cost_price,
      v_required_qty * v_bom_item.cost_price
    );

    v_result := jsonb_set(
      v_result, 
      '{materials_deducted}', 
      (v_result->'materials_deducted') || jsonb_build_object('name', v_bom_item.name, 'qty', v_required_qty)
    );
  END LOOP;

  -- Add finished products to inventory
  UPDATE products
  SET stock_qty = stock_qty + v_order.quantity,
      updated_at = now()
  WHERE id = v_order.product_id;

  v_result := jsonb_set(v_result, '{product_added}', jsonb_build_object(
    'name', v_order.product_name,
    'qty', v_order.quantity
  ));

  -- Update production order status
  UPDATE production_orders
  SET status = 'completed',
      actual_end_date = CURRENT_DATE,
      updated_at = now()
  WHERE id = p_order_id;

  RETURN v_result;
END;
$$;
-- ============================================================
-- 20260309030210_69b98b1a-6acb-4ec2-b849-b4d890b2eb10.sql
-- ============================================================
-- Daily production logs table
CREATE TABLE public.daily_production_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity_produced numeric NOT NULL DEFAULT 0,
  quantity_packaged numeric NOT NULL DEFAULT 0,
  quantity_unpackaged numeric NOT NULL DEFAULT 0,
  notes text,
  branch_id uuid REFERENCES public.branches(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Daily production material usage
CREATE TABLE public.daily_material_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id uuid REFERENCES public.daily_production_logs(id) ON DELETE CASCADE NOT NULL,
  raw_material_id uuid REFERENCES public.raw_materials(id) ON DELETE CASCADE NOT NULL,
  quantity_used numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_production_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_material_usage ENABLE ROW LEVEL SECURITY;

-- RLS for daily_production_logs
CREATE POLICY "Users can view branch daily logs" ON public.daily_production_logs
  FOR SELECT TO authenticated USING (user_can_access_branch(branch_id));

CREATE POLICY "Staff can create daily logs" ON public.daily_production_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can update own daily logs" ON public.daily_production_logs
  FOR UPDATE TO authenticated USING (created_by = auth.uid() OR has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Owners managers can delete daily logs" ON public.daily_production_logs
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- RLS for daily_material_usage
CREATE POLICY "Users can view material usage" ON public.daily_material_usage
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM daily_production_logs dpl WHERE dpl.id = daily_material_usage.daily_log_id AND user_can_access_branch(dpl.branch_id))
  );

CREATE POLICY "Staff can manage material usage" ON public.daily_material_usage
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
-- ============================================================
-- 20260309031519_a0de3376-6b80-4c8c-a5e6-9d5926dda386.sql
-- ============================================================
-- Add delivery tracking to sales
ALTER TABLE public.sales ADD COLUMN delivered boolean NOT NULL DEFAULT false;
ALTER TABLE public.sales ADD COLUMN delivered_at timestamptz;

-- Create atomic function for raw material stock deduction
CREATE OR REPLACE FUNCTION public.update_raw_material_stock_atomic(p_material_id uuid, p_quantity_delta numeric)
RETURNS numeric
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  new_stock numeric;
BEGIN
  UPDATE raw_materials
  SET stock_qty = stock_qty + p_quantity_delta,
      updated_at = now()
  WHERE id = p_material_id
  RETURNING stock_qty INTO new_stock;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Raw material not found: %', p_material_id;
  END IF;

  IF new_stock < 0 THEN
    RAISE EXCEPTION 'Insufficient raw material stock. Available: %', new_stock - p_quantity_delta;
  END IF;

  RETURN new_stock;
END;
$$;
-- ============================================================
-- 20260310104725_854b82bc-8dd9-4d28-9d13-699961ba87e6.sql
-- ============================================================

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

-- ============================================================
-- 20260312163358_81dc4718-0b7c-4999-9485-32614bb73880.sql
-- ============================================================

-- Add payment_method to payroll_runs to track how payment is made
ALTER TABLE public.payroll_runs 
ADD COLUMN payment_method text NOT NULL DEFAULT 'cash';

-- Add payment_method to payroll_items for per-employee tracking
ALTER TABLE public.payroll_items
ADD COLUMN payment_status text NOT NULL DEFAULT 'pending';

-- ============================================================
-- 20260515120012_23b5e8e8-04e0-4f30-a25e-d8e354fd07e4.sql
-- ============================================================

-- 1. Add super_admin to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- ============================================================
-- 20260515120102_e57da329-6aef-4776-bc83-1f01fcc5bb89.sql
-- ============================================================

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

-- ============================================================
-- 20260515120358_eef53eef-af8a-4174-b462-9143a722cc43.sql
-- ============================================================

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

-- ============================================================
-- 20260516042744_dc587fb9-4c5d-4e55-b1a7-88411f18c7f9.sql
-- ============================================================

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

-- ============================================================
-- 20260519025920_362fee9d-9015-49f9-a326-8cae7ae47c8e.sql
-- ============================================================

-- Replace overly-permissive policy on daily_material_usage with parent-scoped, role-scoped policies
DROP POLICY IF EXISTS "Staff can manage material usage" ON public.daily_material_usage;

-- INSERT: must reference a daily log in the user's org, and user must be privileged staff
CREATE POLICY "Privileged staff insert material usage"
ON public.daily_material_usage
FOR INSERT
TO authenticated
WITH CHECK (
  (public.has_role(auth.uid(), 'owner'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.daily_production_logs dpl
    WHERE dpl.id = daily_material_usage.daily_log_id
      AND dpl.organization_id = public.get_user_organization_id()
  )
);

-- UPDATE: same restrictions
CREATE POLICY "Privileged staff update material usage"
ON public.daily_material_usage
FOR UPDATE
TO authenticated
USING (
  (public.has_role(auth.uid(), 'owner'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.daily_production_logs dpl
    WHERE dpl.id = daily_material_usage.daily_log_id
      AND dpl.organization_id = public.get_user_organization_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.daily_production_logs dpl
    WHERE dpl.id = daily_material_usage.daily_log_id
      AND dpl.organization_id = public.get_user_organization_id()
  )
);

-- DELETE: owners and managers only, scoped to their org
CREATE POLICY "Owners managers delete material usage"
ON public.daily_material_usage
FOR DELETE
TO authenticated
USING (
  (public.has_role(auth.uid(), 'owner'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.daily_production_logs dpl
    WHERE dpl.id = daily_material_usage.daily_log_id
      AND dpl.organization_id = public.get_user_organization_id()
  )
);

-- ============================================================
-- 20260519030335_e3b1878c-2984-4281-8618-f5c16efc295c.sql
-- ============================================================

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

-- ============================================================
-- 20260607162115_477ba216-0574-482e-9bf3-16c5d7e5cde2.sql
-- ============================================================

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

-- ============================================================
-- 20260608154938_414f1db5-508e-4dc2-aecd-f950887a982b.sql
-- ============================================================

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

-- ============================================================
-- Data API GRANTs (required for PostgREST on new projects)
-- ============================================================
DO $$
DECLARE tbl record;
BEGIN
  FOR tbl IN
    SELECT c.relname AS t FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE c.relkind='r' AND n.nspname='public'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl.t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl.t);
  END LOOP;
END $$;
-- Public-readable catalog tables
GRANT SELECT ON public.plans TO anon;
GRANT SELECT ON public.platform_bank_accounts TO anon;
