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