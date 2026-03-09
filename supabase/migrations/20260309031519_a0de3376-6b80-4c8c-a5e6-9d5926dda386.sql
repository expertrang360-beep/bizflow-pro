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