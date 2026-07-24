
-- 1) Add explicit super_admin SELECT for customer_feedbacks
DROP POLICY IF EXISTS "Staff can view feedbacks" ON public.customer_feedbacks;
CREATE POLICY "Staff can view feedbacks" ON public.customer_feedbacks
FOR SELECT USING (
  private.is_super_admin(auth.uid())
  OR private.has_role(auth.uid(), 'admin'::app_role)
  OR private.has_role(auth.uid(), 'executive'::app_role)
  OR private.has_role(auth.uid(), 'assessor'::app_role)
  OR EXISTS (SELECT 1 FROM public.branches b WHERE b.id = customer_feedbacks.branch_id AND b.manager_id = auth.uid())
);

-- 2) Harden site_settings: restrict public read to landing theme only, others admin-only
DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;
CREATE POLICY "Public can read landing settings" ON public.site_settings
FOR SELECT USING (key = 'landing' OR private.is_super_admin(auth.uid()));

-- 3) user_roles: add explicit shared-company membership check in addition to is_admin_of_user,
-- and block granting super_admin (already) — plus require both users share an active company_users row.
DROP POLICY IF EXISTS "Company admins can insert roles" ON public.user_roles;
CREATE POLICY "Company admins can insert roles" ON public.user_roles
FOR INSERT WITH CHECK (
  private.is_super_admin(auth.uid())
  OR (
    role <> 'super_admin'::app_role
    AND user_id <> auth.uid()
    AND private.is_admin_of_user(auth.uid(), user_id)
    AND EXISTS (
      SELECT 1 FROM public.company_users cu_caller
      JOIN public.company_users cu_target ON cu_target.company_id = cu_caller.company_id
      WHERE cu_caller.user_id = auth.uid()
        AND cu_caller.role IN ('owner','admin')
        AND cu_caller.is_active = true
        AND cu_target.user_id = user_roles.user_id
        AND cu_target.is_active = true
    )
  )
);

DROP POLICY IF EXISTS "Company admins can update roles" ON public.user_roles;
CREATE POLICY "Company admins can update roles" ON public.user_roles
FOR UPDATE USING (
  private.is_super_admin(auth.uid())
  OR (
    role <> 'super_admin'::app_role
    AND user_id <> auth.uid()
    AND private.is_admin_of_user(auth.uid(), user_id)
    AND EXISTS (
      SELECT 1 FROM public.company_users cu_caller
      JOIN public.company_users cu_target ON cu_target.company_id = cu_caller.company_id
      WHERE cu_caller.user_id = auth.uid()
        AND cu_caller.role IN ('owner','admin')
        AND cu_caller.is_active = true
        AND cu_target.user_id = user_roles.user_id
        AND cu_target.is_active = true
    )
  )
) WITH CHECK (
  private.is_super_admin(auth.uid())
  OR (
    role <> 'super_admin'::app_role
    AND user_id <> auth.uid()
    AND private.is_admin_of_user(auth.uid(), user_id)
    AND EXISTS (
      SELECT 1 FROM public.company_users cu_caller
      JOIN public.company_users cu_target ON cu_target.company_id = cu_caller.company_id
      WHERE cu_caller.user_id = auth.uid()
        AND cu_caller.role IN ('owner','admin')
        AND cu_caller.is_active = true
        AND cu_target.user_id = user_roles.user_id
        AND cu_target.is_active = true
    )
  )
);
