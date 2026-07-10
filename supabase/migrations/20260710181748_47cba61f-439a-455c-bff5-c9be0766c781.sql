CREATE POLICY "Company members can view company memberships"
ON public.company_users
FOR SELECT
TO authenticated
USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company executives and branch managers can view user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.company_users me
    JOIN public.company_users them ON me.company_id = them.company_id
    WHERE me.user_id = auth.uid()
      AND me.is_active = true
      AND them.user_id = user_roles.user_id
      AND them.is_active = true
  )
  AND (
    public.has_role(auth.uid(), 'executive'::app_role)
    OR public.has_role(auth.uid(), 'branch_manager'::app_role)
  )
);

DROP POLICY IF EXISTS "Users can update non-conformities" ON public.non_conformities;
CREATE POLICY "Users can update non-conformities"
ON public.non_conformities
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'executive'::app_role)
  OR (assigned_to = auth.uid())
  OR EXISTS (SELECT 1 FROM public.evaluations e WHERE e.id = non_conformities.evaluation_id AND e.assessor_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.branches b WHERE b.id = non_conformities.branch_id AND b.manager_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can manage corrective actions" ON public.corrective_actions;
CREATE POLICY "Users can manage corrective actions"
ON public.corrective_actions
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.non_conformities nc
    WHERE nc.id = corrective_actions.non_conformity_id
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'executive'::app_role)
        OR corrective_actions.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.branches b WHERE b.id = nc.branch_id AND b.manager_id = auth.uid())
      )
  )
);