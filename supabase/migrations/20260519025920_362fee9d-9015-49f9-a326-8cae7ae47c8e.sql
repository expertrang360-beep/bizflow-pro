
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
