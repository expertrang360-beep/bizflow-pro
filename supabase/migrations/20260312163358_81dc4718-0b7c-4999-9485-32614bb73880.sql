
-- Add payment_method to payroll_runs to track how payment is made
ALTER TABLE public.payroll_runs 
ADD COLUMN payment_method text NOT NULL DEFAULT 'cash';

-- Add payment_method to payroll_items for per-employee tracking
ALTER TABLE public.payroll_items
ADD COLUMN payment_status text NOT NULL DEFAULT 'pending';
