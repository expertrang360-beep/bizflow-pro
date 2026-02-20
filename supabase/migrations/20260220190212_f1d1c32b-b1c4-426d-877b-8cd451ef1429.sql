
-- Fix overly permissive profiles INSERT policy
DROP POLICY IF EXISTS "System inserts profiles" ON public.profiles;
CREATE POLICY "System inserts profiles" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
