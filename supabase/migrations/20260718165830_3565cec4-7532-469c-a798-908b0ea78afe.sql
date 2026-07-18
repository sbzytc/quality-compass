
-- Fix evaluations UPDATE: remove indefinite 'approved' edit ability, keep 24h submitted window
DROP POLICY IF EXISTS "Assessors can update own evaluations" ON public.evaluations;
CREATE POLICY "Assessors can update own evaluations"
ON public.evaluations
FOR UPDATE
USING (
  private.has_role(auth.uid(), 'admin'::app_role)
  OR (
    assessor_id = auth.uid()
    AND (
      status = 'draft'
      OR (status = 'submitted' AND COALESCE(submitted_at, created_at) >= now() - interval '24 hours')
    )
  )
);

-- Scope template_frequencies / template_domains / template_priorities SELECT to company members
DROP POLICY IF EXISTS "Authenticated view domains" ON public.template_domains;
CREATE POLICY "Company members view domains"
ON public.template_domains
FOR SELECT
TO authenticated
USING (
  private.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.evaluation_templates t
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE t.id = template_domains.template_id
      AND t.company_id = p.default_company_id
  )
  OR private.has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Authenticated view frequencies" ON public.template_frequencies;
CREATE POLICY "Company members view frequencies"
ON public.template_frequencies
FOR SELECT
TO authenticated
USING (
  private.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.template_domains d
    JOIN public.evaluation_templates t ON t.id = d.template_id
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE d.id = template_frequencies.domain_id
      AND t.company_id = p.default_company_id
  )
  OR private.has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Authenticated view priorities" ON public.template_priorities;
CREATE POLICY "Company members view priorities"
ON public.template_priorities
FOR SELECT
TO authenticated
USING (
  private.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.template_frequencies f
    JOIN public.template_domains d ON d.id = f.domain_id
    JOIN public.evaluation_templates t ON t.id = d.template_id
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE f.id = template_priorities.frequency_id
      AND t.company_id = p.default_company_id
  )
  OR private.has_role(auth.uid(), 'admin'::app_role)
);
