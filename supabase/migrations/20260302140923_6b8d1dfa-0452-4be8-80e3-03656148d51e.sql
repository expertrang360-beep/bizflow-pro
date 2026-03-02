-- Fix: Restrict audit_logs SELECT to owners and managers only
DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON public.audit_logs;

CREATE POLICY "Owners and managers can view audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
  );