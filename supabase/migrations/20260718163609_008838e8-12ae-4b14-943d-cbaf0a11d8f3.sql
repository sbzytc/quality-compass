
DROP POLICY IF EXISTS "Scoped view evaluation attachments" ON storage.objects;

CREATE POLICY "Scoped view evaluation attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'evaluation-attachments'
  AND (
    owner = auth.uid()
    OR (storage.foldername(name))[1] = (auth.uid())::text
    OR private.is_super_admin(auth.uid())
    OR private.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.evaluation_criterion_scores s
      JOIN public.evaluations e ON e.id = s.evaluation_id
      WHERE objects.name = ANY (s.attachments)
        AND (
          e.assessor_id = auth.uid()
          OR private.user_belongs_to_company(auth.uid(), e.company_id)
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.non_conformities nc
      WHERE (
        objects.name = ANY (nc.attachments)
        OR objects.name = ANY (nc.resolution_attachments)
        OR objects.name = ANY (nc.review_attachments)
      )
      AND private.user_belongs_to_company(auth.uid(), nc.company_id)
    )
  )
);

DROP POLICY IF EXISTS "Scoped view support attachments" ON storage.objects;

CREATE POLICY "Scoped view support attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'support-attachments'
  AND (
    owner = auth.uid()
    OR (storage.foldername(name))[1] = (auth.uid())::text
    OR private.is_super_admin(auth.uid())
    OR private.has_role(auth.uid(), 'admin'::app_role)
    OR private.has_role(auth.uid(), 'support_agent'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.support_tickets t
      LEFT JOIN public.profiles p ON p.user_id = auth.uid()
      WHERE objects.name = ANY (t.attachments)
        AND (
          t.created_by = auth.uid()
          OR t.assigned_to = auth.uid()
          OR (
            t.branch_id IS NOT NULL
            AND p.branch_id = (t.branch_id)::text
            AND private.has_role(auth.uid(), 'branch_manager'::app_role)
          )
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.ticket_comments c
      JOIN public.support_tickets t ON t.id = c.ticket_id
      LEFT JOIN public.profiles p ON p.user_id = auth.uid()
      WHERE objects.name = ANY (c.attachments)
        AND (
          c.user_id = auth.uid()
          OR t.created_by = auth.uid()
          OR t.assigned_to = auth.uid()
          OR (
            t.branch_id IS NOT NULL
            AND p.branch_id = (t.branch_id)::text
            AND private.has_role(auth.uid(), 'branch_manager'::app_role)
          )
        )
    )
  )
);

DROP POLICY IF EXISTS "Authenticated users can upload support attachments" ON storage.objects;

CREATE POLICY "Authenticated users can upload support attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'support-attachments'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (auth.uid())::text
);
