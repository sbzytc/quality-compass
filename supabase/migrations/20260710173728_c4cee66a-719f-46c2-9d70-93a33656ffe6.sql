
-- 1. Fix broad SELECT policies -----------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view branches" ON public.branches;
CREATE POLICY "Members can view their company branches" ON public.branches
FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR (company_id IS NOT NULL AND public.user_belongs_to_company(auth.uid(), company_id))
  OR manager_id = auth.uid()
);

DROP POLICY IF EXISTS "Authenticated users can view regions" ON public.regions;
CREATE POLICY "Members can view their company regions" ON public.regions
FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR (company_id IS NOT NULL AND public.user_belongs_to_company(auth.uid(), company_id))
);

DROP POLICY IF EXISTS "Authenticated users can view templates" ON public.evaluation_templates;
CREATE POLICY "Members can view their company templates" ON public.evaluation_templates
FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR company_id IS NULL
  OR public.user_belongs_to_company(auth.uid(), company_id)
);

DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.template_categories;
CREATE POLICY "Members can view template categories" ON public.template_categories
FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.evaluation_templates t
    WHERE t.id = template_categories.template_id
      AND (t.company_id IS NULL OR public.user_belongs_to_company(auth.uid(), t.company_id))
  )
);

DROP POLICY IF EXISTS "Authenticated users can view criteria" ON public.template_criteria;
CREATE POLICY "Members can view template criteria" ON public.template_criteria
FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.template_categories c
    JOIN public.evaluation_templates t ON t.id = c.template_id
    WHERE c.id = template_criteria.category_id
      AND (t.company_id IS NULL OR public.user_belongs_to_company(auth.uid(), t.company_id))
  )
);

-- 2. Profiles: remove broad exposure, keep same-company visibility -----------
DROP POLICY IF EXISTS "All authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Company members can view each other's profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_super_admin(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.company_users me
    JOIN public.company_users them ON them.company_id = me.company_id
    WHERE me.user_id = auth.uid() AND me.is_active = true
      AND them.user_id = profiles.user_id AND them.is_active = true
  )
);

-- 3. Audit logs: restrict writes to actor's own company ----------------------
DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert audit logs for their company" ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = actor_user_id
  AND (
    company_id IS NULL AND public.is_super_admin(auth.uid())
    OR (company_id IS NOT NULL AND public.user_belongs_to_company(auth.uid(), company_id))
  )
);

-- 4. System logs: restrict writes to member companies ------------------------
DROP POLICY IF EXISTS "Authenticated users can insert logs" ON public.system_logs;
CREATE POLICY "Members can insert system logs for their company" ON public.system_logs
FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    (SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='system_logs' AND column_name='company_id') IS NOT NULL
  )
);

-- Replace with proper check (company_id column exists on system_logs)
DROP POLICY IF EXISTS "Members can insert system logs for their company" ON public.system_logs;
CREATE POLICY "Members can insert system logs for their company" ON public.system_logs
FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR (company_id IS NOT NULL AND public.user_belongs_to_company(auth.uid(), company_id))
);

-- 5. Non-conformity history: restrict inserts -------------------------------
DROP POLICY IF EXISTS "Users can insert non-conformity history" ON public.non_conformity_history;
CREATE POLICY "Authorized users can insert nc history" ON public.non_conformity_history
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = performed_by
  AND EXISTS (
    SELECT 1 FROM public.non_conformities nc
    WHERE nc.id = non_conformity_history.non_conformity_id
      AND (
        public.is_super_admin(auth.uid())
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'executive'::app_role)
        OR EXISTS (SELECT 1 FROM public.evaluations e WHERE e.id = nc.evaluation_id AND e.assessor_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.branches b WHERE b.id = nc.branch_id AND b.manager_id = auth.uid())
      )
  )
);

-- 6. Storage.objects: ownership on update/delete for evaluation-attachments --
DROP POLICY IF EXISTS "Users can delete their own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own attachments" ON storage.objects;

CREATE POLICY "Owners can delete evaluation attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'evaluation-attachments'
  AND (
    owner = auth.uid()
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_super_admin(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Owners can update evaluation attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'evaluation-attachments'
  AND (
    owner = auth.uid()
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_super_admin(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Add SELECT policies so signed URLs work once buckets flip to private
DROP POLICY IF EXISTS "Authenticated can view evaluation attachments" ON storage.objects;
CREATE POLICY "Authenticated can view evaluation attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'evaluation-attachments');

DROP POLICY IF EXISTS "Authenticated can view support attachments" ON storage.objects;
CREATE POLICY "Authenticated can view support attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'support-attachments');

-- Ownership for support-attachments update/delete
DROP POLICY IF EXISTS "Owners can delete support attachments" ON storage.objects;
CREATE POLICY "Owners can delete support attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND (owner = auth.uid() OR public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
);

DROP POLICY IF EXISTS "Owners can update support attachments" ON storage.objects;
CREATE POLICY "Owners can update support attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND (owner = auth.uid() OR public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
);

-- 7. compute_next_due_date: convert to SECURITY INVOKER ---------------------
ALTER FUNCTION public.compute_next_due_date(uuid, text, date) SECURITY INVOKER;
