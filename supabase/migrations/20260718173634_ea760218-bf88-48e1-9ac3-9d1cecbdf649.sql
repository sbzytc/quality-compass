
-- Helper: is caller a company admin of any company the target user belongs to (or super admin, or self)
CREATE OR REPLACE FUNCTION private.is_admin_of_user(_caller uuid, _target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    _caller IS NOT NULL AND (
      _caller = _target
      OR private.is_super_admin(_caller)
      OR EXISTS (
        SELECT 1
        FROM public.company_users cu_caller
        JOIN public.company_users cu_target
          ON cu_target.company_id = cu_caller.company_id
        WHERE cu_caller.user_id = _caller
          AND cu_caller.role IN ('owner','admin')
          AND cu_caller.is_active = true
          AND cu_target.user_id = _target
          AND cu_target.is_active = true
      )
    );
$$;
REVOKE EXECUTE ON FUNCTION private.is_admin_of_user(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.is_admin_of_user(uuid, uuid) FROM anon, authenticated;

-- ============ BRANCHES ============
DROP POLICY IF EXISTS "Admins can manage branches" ON public.branches;
CREATE POLICY "Company admins can manage branches" ON public.branches FOR ALL
  USING (private.is_super_admin(auth.uid()) OR (company_id IS NOT NULL AND private.is_company_admin(auth.uid(), company_id)))
  WITH CHECK (private.is_super_admin(auth.uid()) OR (company_id IS NOT NULL AND private.is_company_admin(auth.uid(), company_id)));

DROP POLICY IF EXISTS "Members can view their company branches" ON public.branches;
CREATE POLICY "Members can view their company branches" ON public.branches FOR SELECT
  USING (
    private.is_super_admin(auth.uid())
    OR (company_id IS NOT NULL AND private.user_belongs_to_company(auth.uid(), company_id))
    OR manager_id = auth.uid()
  );

-- ============ REGIONS ============
DROP POLICY IF EXISTS "Admins can manage regions" ON public.regions;
CREATE POLICY "Company admins can manage regions" ON public.regions FOR ALL
  USING (private.is_super_admin(auth.uid()) OR (company_id IS NOT NULL AND private.is_company_admin(auth.uid(), company_id)))
  WITH CHECK (private.is_super_admin(auth.uid()) OR (company_id IS NOT NULL AND private.is_company_admin(auth.uid(), company_id)));

DROP POLICY IF EXISTS "Members can view their company regions" ON public.regions;
CREATE POLICY "Members can view their company regions" ON public.regions FOR SELECT
  USING (
    private.is_super_admin(auth.uid())
    OR (company_id IS NOT NULL AND private.user_belongs_to_company(auth.uid(), company_id))
  );

-- ============ EVALUATION_TEMPLATES ============
DROP POLICY IF EXISTS "Admins can manage templates" ON public.evaluation_templates;
CREATE POLICY "Company admins can manage templates" ON public.evaluation_templates FOR ALL
  USING (private.is_super_admin(auth.uid()) OR (company_id IS NOT NULL AND private.is_company_admin(auth.uid(), company_id)))
  WITH CHECK (private.is_super_admin(auth.uid()) OR (company_id IS NOT NULL AND private.is_company_admin(auth.uid(), company_id)));

DROP POLICY IF EXISTS "Members can view their company templates" ON public.evaluation_templates;
CREATE POLICY "Members can view their company templates" ON public.evaluation_templates FOR SELECT
  USING (
    private.is_super_admin(auth.uid())
    OR company_id IS NULL
    OR private.user_belongs_to_company(auth.uid(), company_id)
  );

-- ============ TEMPLATE_CATEGORIES ============
DROP POLICY IF EXISTS "Admins can manage categories" ON public.template_categories;
CREATE POLICY "Company admins can manage categories" ON public.template_categories FOR ALL
  USING (
    private.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.evaluation_templates t
      WHERE t.id = template_categories.template_id
        AND t.company_id IS NOT NULL
        AND private.is_company_admin(auth.uid(), t.company_id)
    )
  )
  WITH CHECK (
    private.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.evaluation_templates t
      WHERE t.id = template_categories.template_id
        AND t.company_id IS NOT NULL
        AND private.is_company_admin(auth.uid(), t.company_id)
    )
  );

DROP POLICY IF EXISTS "Members can view template categories" ON public.template_categories;
CREATE POLICY "Members can view template categories" ON public.template_categories FOR SELECT
  USING (
    private.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.evaluation_templates t
      WHERE t.id = template_categories.template_id
        AND (t.company_id IS NULL OR private.user_belongs_to_company(auth.uid(), t.company_id))
    )
  );

-- ============ TEMPLATE_CRITERIA ============
DROP POLICY IF EXISTS "Admins can manage criteria" ON public.template_criteria;
CREATE POLICY "Company admins can manage criteria" ON public.template_criteria FOR ALL
  USING (
    private.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.template_categories c
      JOIN public.evaluation_templates t ON t.id = c.template_id
      WHERE c.id = template_criteria.category_id
        AND t.company_id IS NOT NULL
        AND private.is_company_admin(auth.uid(), t.company_id)
    )
  )
  WITH CHECK (
    private.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.template_categories c
      JOIN public.evaluation_templates t ON t.id = c.template_id
      WHERE c.id = template_criteria.category_id
        AND t.company_id IS NOT NULL
        AND private.is_company_admin(auth.uid(), t.company_id)
    )
  );

DROP POLICY IF EXISTS "Members can view template criteria" ON public.template_criteria;
CREATE POLICY "Members can view template criteria" ON public.template_criteria FOR SELECT
  USING (
    private.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.template_categories c
      JOIN public.evaluation_templates t ON t.id = c.template_id
      WHERE c.id = template_criteria.category_id
        AND (t.company_id IS NULL OR private.user_belongs_to_company(auth.uid(), t.company_id))
    )
  );

-- ============ TEMPLATE_DOMAINS ============
DROP POLICY IF EXISTS "Admins manage domains" ON public.template_domains;
CREATE POLICY "Company admins manage domains" ON public.template_domains FOR ALL
  USING (
    private.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.evaluation_templates t
      WHERE t.id = template_domains.template_id
        AND t.company_id IS NOT NULL
        AND private.is_company_admin(auth.uid(), t.company_id)
    )
  )
  WITH CHECK (
    private.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.evaluation_templates t
      WHERE t.id = template_domains.template_id
        AND t.company_id IS NOT NULL
        AND private.is_company_admin(auth.uid(), t.company_id)
    )
  );

DROP POLICY IF EXISTS "Company members view domains" ON public.template_domains;
CREATE POLICY "Company members view domains" ON public.template_domains FOR SELECT
  USING (
    private.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.evaluation_templates t
      WHERE t.id = template_domains.template_id
        AND (t.company_id IS NULL OR private.user_belongs_to_company(auth.uid(), t.company_id))
    )
  );

-- ============ TEMPLATE_FREQUENCIES ============
DROP POLICY IF EXISTS "Admins manage frequencies" ON public.template_frequencies;
CREATE POLICY "Company admins manage frequencies" ON public.template_frequencies FOR ALL
  USING (
    private.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.template_domains d
      JOIN public.evaluation_templates t ON t.id = d.template_id
      WHERE d.id = template_frequencies.domain_id
        AND t.company_id IS NOT NULL
        AND private.is_company_admin(auth.uid(), t.company_id)
    )
  )
  WITH CHECK (
    private.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.template_domains d
      JOIN public.evaluation_templates t ON t.id = d.template_id
      WHERE d.id = template_frequencies.domain_id
        AND t.company_id IS NOT NULL
        AND private.is_company_admin(auth.uid(), t.company_id)
    )
  );

DROP POLICY IF EXISTS "Company members view frequencies" ON public.template_frequencies;
CREATE POLICY "Company members view frequencies" ON public.template_frequencies FOR SELECT
  USING (
    private.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.template_domains d
      JOIN public.evaluation_templates t ON t.id = d.template_id
      WHERE d.id = template_frequencies.domain_id
        AND (t.company_id IS NULL OR private.user_belongs_to_company(auth.uid(), t.company_id))
    )
  );

-- ============ TEMPLATE_PRIORITIES ============
DROP POLICY IF EXISTS "Admins manage priorities" ON public.template_priorities;
CREATE POLICY "Company admins manage priorities" ON public.template_priorities FOR ALL
  USING (
    private.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.template_frequencies f
      JOIN public.template_domains d ON d.id = f.domain_id
      JOIN public.evaluation_templates t ON t.id = d.template_id
      WHERE f.id = template_priorities.frequency_id
        AND t.company_id IS NOT NULL
        AND private.is_company_admin(auth.uid(), t.company_id)
    )
  )
  WITH CHECK (
    private.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.template_frequencies f
      JOIN public.template_domains d ON d.id = f.domain_id
      JOIN public.evaluation_templates t ON t.id = d.template_id
      WHERE f.id = template_priorities.frequency_id
        AND t.company_id IS NOT NULL
        AND private.is_company_admin(auth.uid(), t.company_id)
    )
  );

DROP POLICY IF EXISTS "Company members view priorities" ON public.template_priorities;
CREATE POLICY "Company members view priorities" ON public.template_priorities FOR SELECT
  USING (
    private.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.template_frequencies f
      JOIN public.template_domains d ON d.id = f.domain_id
      JOIN public.evaluation_templates t ON t.id = d.template_id
      WHERE f.id = template_priorities.frequency_id
        AND (t.company_id IS NULL OR private.user_belongs_to_company(auth.uid(), t.company_id))
    )
  );

-- ============ PROFILES ============
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

CREATE POLICY "Company admins can view profiles" ON public.profiles FOR SELECT
  USING (private.is_admin_of_user(auth.uid(), user_id));
CREATE POLICY "Company admins can insert profiles" ON public.profiles FOR INSERT
  WITH CHECK (
    private.is_super_admin(auth.uid())
    OR private.is_admin_of_user(auth.uid(), user_id)
  );
CREATE POLICY "Company admins can update profiles" ON public.profiles FOR UPDATE
  USING (private.is_admin_of_user(auth.uid(), user_id))
  WITH CHECK (private.is_admin_of_user(auth.uid(), user_id));
CREATE POLICY "Company admins can delete profiles" ON public.profiles FOR DELETE
  USING (private.is_admin_of_user(auth.uid(), user_id));

-- ============ PROFILE_CHANGE_REQUESTS ============
DROP POLICY IF EXISTS "Admins can view all change requests" ON public.profile_change_requests;
DROP POLICY IF EXISTS "Admins can update change requests" ON public.profile_change_requests;

CREATE POLICY "Company admins can view change requests" ON public.profile_change_requests FOR SELECT
  USING (private.is_admin_of_user(auth.uid(), user_id));
CREATE POLICY "Company admins can update change requests" ON public.profile_change_requests FOR UPDATE
  USING (private.is_admin_of_user(auth.uid(), user_id))
  WITH CHECK (private.is_admin_of_user(auth.uid(), user_id));

-- ============ USER_ROLES ============
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Company admins can view roles" ON public.user_roles FOR SELECT
  USING (private.is_admin_of_user(auth.uid(), user_id));
CREATE POLICY "Company admins can insert roles" ON public.user_roles FOR INSERT
  WITH CHECK (
    private.is_super_admin(auth.uid())
    OR (role <> 'super_admin'::app_role AND private.is_admin_of_user(auth.uid(), user_id))
  );
CREATE POLICY "Company admins can update roles" ON public.user_roles FOR UPDATE
  USING (
    private.is_super_admin(auth.uid())
    OR (role <> 'super_admin'::app_role AND private.is_admin_of_user(auth.uid(), user_id))
  )
  WITH CHECK (
    private.is_super_admin(auth.uid())
    OR (role <> 'super_admin'::app_role AND private.is_admin_of_user(auth.uid(), user_id))
  );
CREATE POLICY "Company admins can delete roles" ON public.user_roles FOR DELETE
  USING (
    private.is_super_admin(auth.uid())
    OR (role <> 'super_admin'::app_role AND private.is_admin_of_user(auth.uid(), user_id))
  );
