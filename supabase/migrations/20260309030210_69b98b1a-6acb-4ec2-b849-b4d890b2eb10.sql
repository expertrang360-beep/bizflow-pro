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