-- Fix: allow assessors to save/update scores for submitted evaluations within 24h
-- This matches the product rule: submitted evaluations remain editable for 24 hours.

-- 1. Update evaluations policy for assessors
DROP POLICY IF EXISTS "Assessors can update own evaluations" ON public.evaluations;
CREATE POLICY "Assessors can update own evaluations"
ON public.evaluations
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    assessor_id = auth.uid()
    AND (
      status = 'draft'
      OR (
        status = 'submitted'
        AND COALESCE(submitted_at, created_at) >= now() - interval '24 hours'
      )
    )
  )
);

-- 2. Update evaluation_criterion_scores policy
DROP POLICY IF EXISTS "Assessors can manage criterion scores" ON public.evaluation_criterion_scores;
CREATE POLICY "Assessors can manage criterion scores"
ON public.evaluation_criterion_scores
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.evaluations e
    WHERE e.id = evaluation_criterion_scores.evaluation_id
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR (
          e.assessor_id = auth.uid()
          AND (
            e.status = 'draft'
            OR (
              e.status = 'submitted'
              AND COALESCE(e.submitted_at, e.created_at) >= now() - interval '24 hours'
            )
          )
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.evaluations e
    WHERE e.id = evaluation_criterion_scores.evaluation_id
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR (
          e.assessor_id = auth.uid()
          AND (
            e.status = 'draft'
            OR (
              e.status = 'submitted'
              AND COALESCE(e.submitted_at, e.created_at) >= now() - interval '24 hours'
            )
          )
        )
      )
  )
);

-- 3. Update evaluation_category_scores policy
DROP POLICY IF EXISTS "Assessors can manage evaluation scores" ON public.evaluation_category_scores;
CREATE POLICY "Assessors can manage evaluation scores"
ON public.evaluation_category_scores
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.evaluations e
    WHERE e.id = evaluation_category_scores.evaluation_id
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR (
          e.assessor_id = auth.uid()
          AND (
            e.status = 'draft'
            OR (
              e.status = 'submitted'
              AND COALESCE(e.submitted_at, e.created_at) >= now() - interval '24 hours'
            )
          )
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.evaluations e
    WHERE e.id = evaluation_category_scores.evaluation_id
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR (
          e.assessor_id = auth.uid()
          AND (
            e.status = 'draft'
            OR (
              e.status = 'submitted'
              AND COALESCE(e.submitted_at, e.created_at) >= now() - interval '24 hours'
            )
          )
        )
      )
  )
);