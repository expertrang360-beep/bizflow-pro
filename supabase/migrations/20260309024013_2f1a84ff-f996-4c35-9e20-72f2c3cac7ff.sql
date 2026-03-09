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