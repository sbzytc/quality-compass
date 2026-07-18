
-- 1. Table
CREATE TABLE IF NOT EXISTS public.branch_supervisors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (user_id, branch_id)
);
CREATE INDEX IF NOT EXISTS idx_branch_supervisors_user ON public.branch_supervisors(user_id);
CREATE INDEX IF NOT EXISTS idx_branch_supervisors_branch ON public.branch_supervisors(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_supervisors_company ON public.branch_supervisors(company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.branch_supervisors TO authenticated;
GRANT ALL ON public.branch_supervisors TO service_role;

ALTER TABLE public.branch_supervisors ENABLE ROW LEVEL SECURITY;

-- Users see their own supervision rows
CREATE POLICY "Users see own supervision rows"
ON public.branch_supervisors FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Company admins / executives see and manage all rows in their company
CREATE POLICY "Company admins manage supervisors"
ON public.branch_supervisors FOR ALL TO authenticated
USING (
  private.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = branch_supervisors.company_id
      AND cu.is_active = true
      AND cu.role IN ('owner','admin')
  )
  OR private.has_role(auth.uid(), 'executive'::app_role)
)
WITH CHECK (
  private.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = branch_supervisors.company_id
      AND cu.is_active = true
      AND cu.role IN ('owner','admin')
  )
  OR private.has_role(auth.uid(), 'executive'::app_role)
);

-- 2. Helper: is _user a manager or supervisor of _branch?
CREATE OR REPLACE FUNCTION private.user_manages_branch(_user uuid, _branch uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.branches b
    WHERE b.id = _branch AND b.manager_id = _user
  ) OR EXISTS (
    SELECT 1 FROM public.branch_supervisors s
    WHERE s.branch_id = _branch AND s.user_id = _user
  );
$$;

GRANT EXECUTE ON FUNCTION private.user_manages_branch(uuid, uuid) TO authenticated, service_role;

-- 3. Companion policies: extend "branch manager" access to supervisors
-- non_conformities
DROP POLICY IF EXISTS "Branch supervisors access non_conformities" ON public.non_conformities;
CREATE POLICY "Branch supervisors access non_conformities"
ON public.non_conformities FOR ALL TO authenticated
USING (private.user_manages_branch(auth.uid(), branch_id))
WITH CHECK (private.user_manages_branch(auth.uid(), branch_id));

-- non_conformity_history
DROP POLICY IF EXISTS "Branch supervisors access nc_history" ON public.non_conformity_history;
CREATE POLICY "Branch supervisors access nc_history"
ON public.non_conformity_history FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.non_conformities nc
  WHERE nc.id = non_conformity_history.non_conformity_id
    AND private.user_manages_branch(auth.uid(), nc.branch_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.non_conformities nc
  WHERE nc.id = non_conformity_history.non_conformity_id
    AND private.user_manages_branch(auth.uid(), nc.branch_id)
));

-- corrective_actions
DROP POLICY IF EXISTS "Branch supervisors access corrective_actions" ON public.corrective_actions;
CREATE POLICY "Branch supervisors access corrective_actions"
ON public.corrective_actions FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.non_conformities nc
  WHERE nc.id = corrective_actions.non_conformity_id
    AND private.user_manages_branch(auth.uid(), nc.branch_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.non_conformities nc
  WHERE nc.id = corrective_actions.non_conformity_id
    AND private.user_manages_branch(auth.uid(), nc.branch_id)
));

-- evaluations
DROP POLICY IF EXISTS "Branch supervisors view evaluations" ON public.evaluations;
CREATE POLICY "Branch supervisors view evaluations"
ON public.evaluations FOR SELECT TO authenticated
USING (private.user_manages_branch(auth.uid(), branch_id));

-- evaluation_category_scores
DROP POLICY IF EXISTS "Branch supervisors view eval categories" ON public.evaluation_category_scores;
CREATE POLICY "Branch supervisors view eval categories"
ON public.evaluation_category_scores FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.evaluations e
  WHERE e.id = evaluation_category_scores.evaluation_id
    AND private.user_manages_branch(auth.uid(), e.branch_id)
));

-- evaluation_criterion_scores
DROP POLICY IF EXISTS "Branch supervisors view eval criteria" ON public.evaluation_criterion_scores;
CREATE POLICY "Branch supervisors view eval criteria"
ON public.evaluation_criterion_scores FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.evaluations e
  WHERE e.id = evaluation_criterion_scores.evaluation_id
    AND private.user_manages_branch(auth.uid(), e.branch_id)
));

-- operations_tasks
DROP POLICY IF EXISTS "Branch supervisors access tasks" ON public.operations_tasks;
CREATE POLICY "Branch supervisors access tasks"
ON public.operations_tasks FOR ALL TO authenticated
USING (private.user_manages_branch(auth.uid(), branch_id))
WITH CHECK (private.user_manages_branch(auth.uid(), branch_id));

-- customer_feedbacks
DROP POLICY IF EXISTS "Branch supervisors view feedbacks" ON public.customer_feedbacks;
CREATE POLICY "Branch supervisors view feedbacks"
ON public.customer_feedbacks FOR SELECT TO authenticated
USING (private.user_manages_branch(auth.uid(), branch_id));

-- customer_feedback_scores
DROP POLICY IF EXISTS "Branch supervisors view feedback scores" ON public.customer_feedback_scores;
CREATE POLICY "Branch supervisors view feedback scores"
ON public.customer_feedback_scores FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.customer_feedbacks cf
  WHERE cf.id = customer_feedback_scores.feedback_id
    AND private.user_manages_branch(auth.uid(), cf.branch_id)
));

-- customer_complaints
DROP POLICY IF EXISTS "Branch supervisors access complaints" ON public.customer_complaints;
CREATE POLICY "Branch supervisors access complaints"
ON public.customer_complaints FOR ALL TO authenticated
USING (private.user_manages_branch(auth.uid(), branch_id))
WITH CHECK (private.user_manages_branch(auth.uid(), branch_id));

-- support_tickets
DROP POLICY IF EXISTS "Branch supervisors view tickets" ON public.support_tickets;
CREATE POLICY "Branch supervisors view tickets"
ON public.support_tickets FOR SELECT TO authenticated
USING (private.user_manages_branch(auth.uid(), branch_id));

-- ticket_comments
DROP POLICY IF EXISTS "Branch supervisors view ticket comments" ON public.ticket_comments;
CREATE POLICY "Branch supervisors view ticket comments"
ON public.ticket_comments FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.support_tickets st
  WHERE st.id = ticket_comments.ticket_id
    AND private.user_manages_branch(auth.uid(), st.branch_id)
));
