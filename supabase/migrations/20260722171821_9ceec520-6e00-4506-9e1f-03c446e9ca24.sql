-- 1) Harden customer_feedback_scores insert policy to use branch-scoped recent_feedback_exists (two-arg)
DROP POLICY IF EXISTS "Anyone can insert valid scores" ON public.customer_feedback_scores;

CREATE POLICY "Anyone can insert valid scores"
ON public.customer_feedback_scores
FOR INSERT
TO anon, authenticated
WITH CHECK (
  score >= 1 AND score <= 5
  AND EXISTS (
    SELECT 1
    FROM public.customer_feedbacks cf
    WHERE cf.id = customer_feedback_scores.feedback_id
      AND private.recent_feedback_exists(cf.id, cf.branch_id)
  )
  AND EXISTS (
    SELECT 1
    FROM public.customer_feedback_questions q
    WHERE q.id = customer_feedback_scores.question_id
      AND q.is_active = true
  )
);

-- 2) Scope plans/modules SELECT to relevant users only (no more platform-wide reads)
DROP POLICY IF EXISTS "Anyone authenticated can view plans" ON public.plans;

CREATE POLICY "Relevant users can view plans"
ON public.plans
FOR SELECT
TO authenticated
USING (
  private.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.plan_id = plans.id
      AND private.user_belongs_to_company(auth.uid(), s.company_id)
  )
);

DROP POLICY IF EXISTS "Anyone authenticated can view modules" ON public.modules;

CREATE POLICY "Relevant users can view modules"
ON public.modules
FOR SELECT
TO authenticated
USING (
  private.is_super_admin(auth.uid())
  OR is_core = true
  OR EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE private.user_belongs_to_company(auth.uid(), c.id)
      AND (
        modules.available_for_sectors IS NULL
        OR c.sector_type = ANY(modules.available_for_sectors)
      )
  )
);