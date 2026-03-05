
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
