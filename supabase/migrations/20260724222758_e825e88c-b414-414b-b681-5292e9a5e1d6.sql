
-- Scope customer_feedbacks staff SELECT to same company as branch
DROP POLICY IF EXISTS "Staff can view feedbacks" ON public.customer_feedbacks;
CREATE POLICY "Staff can view feedbacks"
ON public.customer_feedbacks FOR SELECT
USING (
  private.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.branches b
    WHERE b.id = customer_feedbacks.branch_id
      AND (
        b.manager_id = auth.uid()
        OR private.user_manages_branch(auth.uid(), b.id)
        OR (
          private.user_belongs_to_company(auth.uid(), b.company_id)
          AND (
            private.has_role(auth.uid(), 'admin'::app_role)
            OR private.has_role(auth.uid(), 'executive'::app_role)
            OR private.has_role(auth.uid(), 'assessor'::app_role)
          )
        )
      )
  )
);

-- Scope profile visibility to same-company members only for admin/executive/branch-manager paths
DROP POLICY IF EXISTS "Company managers can view member profiles" ON public.profiles;
CREATE POLICY "Company managers can view member profiles"
ON public.profiles FOR SELECT
USING (
  auth.uid() = user_id
  OR private.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.company_users me
    JOIN public.company_users them ON them.company_id = me.company_id
    WHERE me.user_id = auth.uid()
      AND me.is_active = true
      AND them.user_id = profiles.user_id
      AND them.is_active = true
      AND (
        (me.role IN ('owner','admin'))
        OR private.has_role(auth.uid(), 'admin'::app_role)
        OR private.has_role(auth.uid(), 'executive'::app_role)
        OR EXISTS (
          SELECT 1 FROM public.branches b
          WHERE b.company_id = me.company_id
            AND b.manager_id = auth.uid()
        )
      )
  )
);
