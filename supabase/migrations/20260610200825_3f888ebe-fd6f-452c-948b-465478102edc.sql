-- Allow super admins to manage profiles and branches (for cross-workspace user/branch management)
CREATE POLICY "Super admins can update profiles"
ON public.profiles FOR UPDATE
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert profiles"
ON public.profiles FOR INSERT
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete profiles"
ON public.profiles FOR DELETE
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage branches"
ON public.branches FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));