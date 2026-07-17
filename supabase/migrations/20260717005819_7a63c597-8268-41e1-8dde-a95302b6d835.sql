
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS sandbox_of_company_id uuid NULL
    REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sandbox_created_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS sandbox_last_synced_at timestamptz NULL;

CREATE UNIQUE INDEX IF NOT EXISTS companies_sandbox_of_unique
  ON public.companies (sandbox_of_company_id)
  WHERE sandbox_of_company_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_sandbox_company_shape()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_sandbox IS TRUE AND NEW.sandbox_of_company_id IS NULL THEN
    RAISE EXCEPTION 'Sandbox company must reference a real company via sandbox_of_company_id';
  END IF;
  IF NEW.is_sandbox IS NOT TRUE AND NEW.sandbox_of_company_id IS NOT NULL THEN
    RAISE EXCEPTION 'Non-sandbox company cannot have sandbox_of_company_id set';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_enforce_sandbox_company_shape ON public.companies;
CREATE TRIGGER trg_enforce_sandbox_company_shape
  BEFORE INSERT OR UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sandbox_company_shape();

ALTER TABLE public.regions               ADD COLUMN IF NOT EXISTS origin_id uuid NULL;
ALTER TABLE public.branches              ADD COLUMN IF NOT EXISTS origin_id uuid NULL;
ALTER TABLE public.clinic_departments    ADD COLUMN IF NOT EXISTS origin_id uuid NULL;
ALTER TABLE public.clinic_rooms          ADD COLUMN IF NOT EXISTS origin_id uuid NULL;
ALTER TABLE public.evaluation_templates  ADD COLUMN IF NOT EXISTS origin_id uuid NULL;
ALTER TABLE public.template_domains      ADD COLUMN IF NOT EXISTS origin_id uuid NULL;
ALTER TABLE public.template_frequencies  ADD COLUMN IF NOT EXISTS origin_id uuid NULL;
ALTER TABLE public.template_priorities   ADD COLUMN IF NOT EXISTS origin_id uuid NULL;
ALTER TABLE public.template_categories   ADD COLUMN IF NOT EXISTS origin_id uuid NULL;
ALTER TABLE public.template_criteria     ADD COLUMN IF NOT EXISTS origin_id uuid NULL;
ALTER TABLE public.company_off_days      ADD COLUMN IF NOT EXISTS origin_id uuid NULL;
ALTER TABLE public.feature_flags         ADD COLUMN IF NOT EXISTS origin_id uuid NULL;
ALTER TABLE public.evaluation_schedules  ADD COLUMN IF NOT EXISTS origin_id uuid NULL;

CREATE INDEX IF NOT EXISTS idx_regions_origin_id              ON public.regions(origin_id) WHERE origin_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_branches_origin_id             ON public.branches(origin_id) WHERE origin_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clinic_departments_origin_id   ON public.clinic_departments(origin_id) WHERE origin_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clinic_rooms_origin_id         ON public.clinic_rooms(origin_id) WHERE origin_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evaluation_templates_origin_id ON public.evaluation_templates(origin_id) WHERE origin_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_template_domains_origin_id     ON public.template_domains(origin_id) WHERE origin_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_template_frequencies_origin_id ON public.template_frequencies(origin_id) WHERE origin_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_template_priorities_origin_id  ON public.template_priorities(origin_id) WHERE origin_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_template_categories_origin_id  ON public.template_categories(origin_id) WHERE origin_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_template_criteria_origin_id    ON public.template_criteria(origin_id) WHERE origin_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_company_off_days_origin_id     ON public.company_off_days(origin_id) WHERE origin_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feature_flags_origin_id        ON public.feature_flags(origin_id) WHERE origin_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evaluation_schedules_origin_id ON public.evaluation_schedules(origin_id) WHERE origin_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.clone_company_as_sandbox(_source_company_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  src public.companies%ROWTYPE;
  new_company_id uuid;
  new_slug text;
BEGIN
  SELECT * INTO src FROM public.companies WHERE id = _source_company_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Source company % not found', _source_company_id; END IF;
  IF src.is_sandbox THEN RAISE EXCEPTION 'Cannot clone a sandbox company'; END IF;
  IF src.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Cannot clone a deleted company'; END IF;

  IF EXISTS (SELECT 1 FROM public.companies WHERE sandbox_of_company_id = _source_company_id) THEN
    RETURN (SELECT id FROM public.companies WHERE sandbox_of_company_id = _source_company_id);
  END IF;

  new_company_id := gen_random_uuid();
  new_slug := src.slug || '-sandbox-' || substr(new_company_id::text, 1, 8);

  INSERT INTO public.companies (
    id, name, name_ar, slug, sector_type, logo_url, status, settings,
    workspace_type, primary_module, is_sandbox, sandbox_of_company_id,
    sandbox_created_at, sandbox_last_synced_at, details
  ) VALUES (
    new_company_id,
    src.name || ' (Sandbox)',
    CASE WHEN src.name_ar IS NULL THEN NULL ELSE src.name_ar || ' (تجريبي)' END,
    new_slug, src.sector_type, src.logo_url, src.status, src.settings,
    src.workspace_type, src.primary_module, true, _source_company_id,
    now(), now(), src.details
  );

  INSERT INTO public.regions (id, name, name_ar, company_id, origin_id)
  SELECT gen_random_uuid(), name, name_ar, new_company_id, id
  FROM public.regions WHERE company_id = _source_company_id;

  INSERT INTO public.branches (
    id, name, name_ar, region_id, city, address, manager_id, is_active,
    company_id, code, district, gps, status, activity_type, opened_at,
    manager_name, manager_phone, area_m2, employees_count, cameras_count,
    extinguishers_count, documents, details, origin_id
  )
  SELECT gen_random_uuid(), b.name, b.name_ar,
    (SELECT r.id FROM public.regions r WHERE r.company_id = new_company_id AND r.origin_id = b.region_id),
    b.city, b.address, b.manager_id, b.is_active,
    new_company_id, b.code, b.district, b.gps, b.status, b.activity_type, b.opened_at,
    b.manager_name, b.manager_phone, b.area_m2, b.employees_count, b.cameras_count,
    b.extinguishers_count, b.documents, b.details, b.id
  FROM public.branches b WHERE b.company_id = _source_company_id;

  INSERT INTO public.clinic_departments (
    id, branch_id, company_id, code, name, name_ar, sort_order, is_active, origin_id
  )
  SELECT gen_random_uuid(),
    (SELECT nb.id FROM public.branches nb WHERE nb.company_id = new_company_id AND nb.origin_id = cd.branch_id),
    new_company_id, cd.code, cd.name, cd.name_ar, cd.sort_order, cd.is_active, cd.id
  FROM public.clinic_departments cd WHERE cd.company_id = _source_company_id;

  INSERT INTO public.clinic_rooms (
    id, department_id, branch_id, company_id, room_number, name, name_ar,
    room_type, capacity, status, is_active, origin_id
  )
  SELECT gen_random_uuid(),
    (SELECT nd.id FROM public.clinic_departments nd WHERE nd.company_id = new_company_id AND nd.origin_id = cr.department_id),
    (SELECT nb.id FROM public.branches nb WHERE nb.company_id = new_company_id AND nb.origin_id = cr.branch_id),
    new_company_id, cr.room_number, cr.name, cr.name_ar,
    cr.room_type, cr.capacity, cr.status, cr.is_active, cr.id
  FROM public.clinic_rooms cr WHERE cr.company_id = _source_company_id;

  INSERT INTO public.evaluation_templates (
    id, name, name_ar, description, version, is_active,
    period_type, company_id, workspace_type, origin_id
  )
  SELECT gen_random_uuid(), t.name, t.name_ar, t.description, t.version, t.is_active,
         t.period_type, new_company_id, t.workspace_type, t.id
  FROM public.evaluation_templates t WHERE t.company_id = _source_company_id;

  INSERT INTO public.template_domains (id, template_id, name, name_ar, sort_order, origin_id)
  SELECT gen_random_uuid(),
    (SELECT nt.id FROM public.evaluation_templates nt WHERE nt.company_id = new_company_id AND nt.origin_id = td.template_id),
    td.name, td.name_ar, td.sort_order, td.id
  FROM public.template_domains td
  WHERE td.template_id IN (SELECT id FROM public.evaluation_templates WHERE company_id = _source_company_id);

  INSERT INTO public.template_frequencies (id, domain_id, frequency_type, sort_order, origin_id)
  SELECT gen_random_uuid(),
    (SELECT nd.id FROM public.template_domains nd
       JOIN public.evaluation_templates nt ON nt.id = nd.template_id
      WHERE nt.company_id = new_company_id AND nd.origin_id = tf.domain_id),
    tf.frequency_type, tf.sort_order, tf.id
  FROM public.template_frequencies tf
  WHERE tf.domain_id IN (
    SELECT td.id FROM public.template_domains td
    JOIN public.evaluation_templates t ON t.id = td.template_id
    WHERE t.company_id = _source_company_id
  );

  INSERT INTO public.template_priorities (id, frequency_id, priority_level, weight, sort_order, origin_id)
  SELECT gen_random_uuid(),
    (SELECT nf.id FROM public.template_frequencies nf
       JOIN public.template_domains nd ON nd.id = nf.domain_id
       JOIN public.evaluation_templates nt ON nt.id = nd.template_id
      WHERE nt.company_id = new_company_id AND nf.origin_id = tp.frequency_id),
    tp.priority_level, tp.weight, tp.sort_order, tp.id
  FROM public.template_priorities tp
  WHERE tp.frequency_id IN (
    SELECT tf.id FROM public.template_frequencies tf
    JOIN public.template_domains td ON td.id = tf.domain_id
    JOIN public.evaluation_templates t ON t.id = td.template_id
    WHERE t.company_id = _source_company_id
  );

  INSERT INTO public.template_categories (id, template_id, name, name_ar, weight, sort_order, origin_id)
  SELECT gen_random_uuid(),
    (SELECT nt.id FROM public.evaluation_templates nt WHERE nt.company_id = new_company_id AND nt.origin_id = tc.template_id),
    tc.name, tc.name_ar, tc.weight, tc.sort_order, tc.id
  FROM public.template_categories tc
  WHERE tc.template_id IN (SELECT id FROM public.evaluation_templates WHERE company_id = _source_company_id);

  INSERT INTO public.template_criteria (
    id, category_id, name, name_ar, description, max_score, weight, is_critical,
    sort_order, priority_id, violation_value, answer_type, yes_is_positive, origin_id
  )
  SELECT gen_random_uuid(),
    (SELECT ncat.id FROM public.template_categories ncat
       JOIN public.evaluation_templates nt ON nt.id = ncat.template_id
      WHERE nt.company_id = new_company_id AND ncat.origin_id = tcr.category_id),
    tcr.name, tcr.name_ar, tcr.description, tcr.max_score, tcr.weight, tcr.is_critical,
    tcr.sort_order,
    CASE WHEN tcr.priority_id IS NULL THEN NULL ELSE
      (SELECT np.id FROM public.template_priorities np
         JOIN public.template_frequencies nf ON nf.id = np.frequency_id
         JOIN public.template_domains nd ON nd.id = nf.domain_id
         JOIN public.evaluation_templates nt ON nt.id = nd.template_id
        WHERE nt.company_id = new_company_id AND np.origin_id = tcr.priority_id)
    END,
    tcr.violation_value, tcr.answer_type, tcr.yes_is_positive, tcr.id
  FROM public.template_criteria tcr
  WHERE tcr.category_id IN (
    SELECT tc.id FROM public.template_categories tc
    JOIN public.evaluation_templates t ON t.id = tc.template_id
    WHERE t.company_id = _source_company_id
  );

  INSERT INTO public.company_off_days (id, company_id, day_of_week, specific_date, label, origin_id)
  SELECT gen_random_uuid(), new_company_id, day_of_week, specific_date, label, id
  FROM public.company_off_days WHERE company_id = _source_company_id;

  INSERT INTO public.feature_flags (id, company_id, key, enabled, config, origin_id)
  SELECT gen_random_uuid(), new_company_id, key, enabled, config, id
  FROM public.feature_flags WHERE company_id = _source_company_id;

  INSERT INTO public.evaluation_schedules (
    id, company_id, branch_id, frequency_id, first_evaluation_date, next_due_date, last_completed_at, origin_id
  )
  SELECT gen_random_uuid(), new_company_id,
    (SELECT nb.id FROM public.branches nb WHERE nb.company_id = new_company_id AND nb.origin_id = es.branch_id),
    (SELECT nf.id FROM public.template_frequencies nf
       JOIN public.template_domains nd ON nd.id = nf.domain_id
       JOIN public.evaluation_templates nt ON nt.id = nd.template_id
      WHERE nt.company_id = new_company_id AND nf.origin_id = es.frequency_id),
    es.first_evaluation_date, es.next_due_date, es.last_completed_at, es.id
  FROM public.evaluation_schedules es
  WHERE es.company_id = _source_company_id
    AND es.frequency_id IN (
      SELECT tf.id FROM public.template_frequencies tf
      JOIN public.template_domains td ON td.id = tf.domain_id
      JOIN public.evaluation_templates t ON t.id = td.template_id
      WHERE t.company_id = _source_company_id
    );

  INSERT INTO public.company_users (id, company_id, user_id, role, is_active)
  SELECT gen_random_uuid(), new_company_id, user_id, role, is_active
  FROM public.company_users
  WHERE company_id = _source_company_id
    AND is_active = true
    AND role IN ('owner','admin');

  RETURN new_company_id;
END;
$$;

REVOKE ALL ON FUNCTION public.clone_company_as_sandbox(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clone_company_as_sandbox(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trigger_auto_create_sandbox()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_sandbox IS TRUE THEN RETURN NEW; END IF;
  IF NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
  PERFORM public.clone_company_as_sandbox(NEW.id);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_auto_create_sandbox ON public.companies;
CREATE TRIGGER trg_auto_create_sandbox
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.trigger_auto_create_sandbox();
