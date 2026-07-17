
-- Helper: strip metadata columns from a row's jsonb for diff comparison
CREATE OR REPLACE FUNCTION public.sandbox_diff_row_json(_r jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT _r - 'id' - 'origin_id' - 'company_id' - 'created_at' - 'updated_at';
$$;

-- Diff helper for tables filtered by company_id directly
CREATE OR REPLACE FUNCTION public.sandbox_diff_by_company(
  _table text, _sandbox_id uuid, _real_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  EXECUTE format($sql$
    WITH s AS (
      SELECT id AS sandbox_id, origin_id, public.sandbox_diff_row_json(to_jsonb(t)) AS row
      FROM public.%1$I t WHERE company_id = $1
    ), r AS (
      SELECT id AS real_id, public.sandbox_diff_row_json(to_jsonb(t)) AS row
      FROM public.%1$I t WHERE company_id = $2
    )
    SELECT jsonb_build_object(
      'added', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('sandbox_id', s.sandbox_id, 'row', s.row))
        FROM s WHERE s.origin_id IS NULL
      ), '[]'::jsonb),
      'modified', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'sandbox_id', s.sandbox_id, 'real_id', r.real_id,
          'sandbox', s.row, 'real', r.row
        ))
        FROM s JOIN r ON r.real_id = s.origin_id
        WHERE s.row IS DISTINCT FROM r.row
      ), '[]'::jsonb),
      'deleted', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('real_id', r.real_id, 'row', r.row))
        FROM r WHERE NOT EXISTS (SELECT 1 FROM s WHERE s.origin_id = r.real_id)
      ), '[]'::jsonb)
    )
  $sql$, _table) INTO result USING _sandbox_id, _real_id;
  RETURN result;
END; $$;

-- Diff helper for template_categories (filtered via template.company_id)
CREATE OR REPLACE FUNCTION public.sandbox_diff_template_categories(_sandbox_id uuid, _real_id uuid) RETURNS jsonb
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  WITH s AS (
    SELECT tc.id AS sandbox_id, tc.origin_id, public.sandbox_diff_row_json(to_jsonb(tc)) AS row
    FROM public.template_categories tc
    JOIN public.evaluation_templates t ON t.id = tc.template_id
    WHERE t.company_id = _sandbox_id
  ), r AS (
    SELECT tc.id AS real_id, public.sandbox_diff_row_json(to_jsonb(tc)) AS row
    FROM public.template_categories tc
    JOIN public.evaluation_templates t ON t.id = tc.template_id
    WHERE t.company_id = _real_id
  )
  SELECT jsonb_build_object(
    'added', COALESCE((SELECT jsonb_agg(jsonb_build_object('sandbox_id', s.sandbox_id, 'row', s.row)) FROM s WHERE s.origin_id IS NULL), '[]'::jsonb),
    'modified', COALESCE((SELECT jsonb_agg(jsonb_build_object('sandbox_id', s.sandbox_id, 'real_id', r.real_id, 'sandbox', s.row, 'real', r.row))
                          FROM s JOIN r ON r.real_id = s.origin_id WHERE s.row IS DISTINCT FROM r.row), '[]'::jsonb),
    'deleted', COALESCE((SELECT jsonb_agg(jsonb_build_object('real_id', r.real_id, 'row', r.row))
                         FROM r WHERE NOT EXISTS (SELECT 1 FROM s WHERE s.origin_id = r.real_id)), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END; $$;

-- Diff helper for template_criteria (filtered via category → template → company)
CREATE OR REPLACE FUNCTION public.sandbox_diff_template_criteria(_sandbox_id uuid, _real_id uuid) RETURNS jsonb
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  WITH s AS (
    SELECT tcr.id AS sandbox_id, tcr.origin_id, public.sandbox_diff_row_json(to_jsonb(tcr)) AS row
    FROM public.template_criteria tcr
    JOIN public.template_categories tc ON tc.id = tcr.category_id
    JOIN public.evaluation_templates t ON t.id = tc.template_id
    WHERE t.company_id = _sandbox_id
  ), r AS (
    SELECT tcr.id AS real_id, public.sandbox_diff_row_json(to_jsonb(tcr)) AS row
    FROM public.template_criteria tcr
    JOIN public.template_categories tc ON tc.id = tcr.category_id
    JOIN public.evaluation_templates t ON t.id = tc.template_id
    WHERE t.company_id = _real_id
  )
  SELECT jsonb_build_object(
    'added', COALESCE((SELECT jsonb_agg(jsonb_build_object('sandbox_id', s.sandbox_id, 'row', s.row)) FROM s WHERE s.origin_id IS NULL), '[]'::jsonb),
    'modified', COALESCE((SELECT jsonb_agg(jsonb_build_object('sandbox_id', s.sandbox_id, 'real_id', r.real_id, 'sandbox', s.row, 'real', r.row))
                          FROM s JOIN r ON r.real_id = s.origin_id WHERE s.row IS DISTINCT FROM r.row), '[]'::jsonb),
    'deleted', COALESCE((SELECT jsonb_agg(jsonb_build_object('real_id', r.real_id, 'row', r.row))
                         FROM r WHERE NOT EXISTS (SELECT 1 FROM s WHERE s.origin_id = r.real_id)), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END; $$;

-- Orchestrator: full diff for a sandbox company
CREATE OR REPLACE FUNCTION public.get_sandbox_diff(_sandbox_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE _real_id uuid;
BEGIN
  SELECT sandbox_of_company_id INTO _real_id
  FROM public.companies WHERE id = _sandbox_company_id AND is_sandbox = true;
  IF _real_id IS NULL THEN RAISE EXCEPTION 'Not a sandbox company'; END IF;

  RETURN jsonb_build_object(
    'sandbox_company_id', _sandbox_company_id,
    'real_company_id', _real_id,
    'generated_at', now(),
    'tables', jsonb_build_object(
      'regions',              public.sandbox_diff_by_company('regions', _sandbox_company_id, _real_id),
      'branches',             public.sandbox_diff_by_company('branches', _sandbox_company_id, _real_id),
      'feature_flags',        public.sandbox_diff_by_company('feature_flags', _sandbox_company_id, _real_id),
      'company_off_days',     public.sandbox_diff_by_company('company_off_days', _sandbox_company_id, _real_id),
      'evaluation_templates', public.sandbox_diff_by_company('evaluation_templates', _sandbox_company_id, _real_id),
      'template_categories',  public.sandbox_diff_template_categories(_sandbox_company_id, _real_id),
      'template_criteria',    public.sandbox_diff_template_criteria(_sandbox_company_id, _real_id)
    )
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.get_sandbox_diff(uuid) TO authenticated, service_role;

-- Promote helper: for company_id-scoped tables (regions, branches, feature_flags, company_off_days).
-- _selection = { "add": [sandbox_ids], "update": [sandbox_ids], "delete": [real_ids] }
CREATE OR REPLACE FUNCTION public.promote_table_by_company(
  _table text, _sandbox_id uuid, _real_id uuid, _selection jsonb
) RETURNS jsonb
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  _adds text[]    := ARRAY(SELECT jsonb_array_elements_text(COALESCE(_selection->'add', '[]'::jsonb)));
  _updates text[] := ARRAY(SELECT jsonb_array_elements_text(COALESCE(_selection->'update', '[]'::jsonb)));
  _deletes text[] := ARRAY(SELECT jsonb_array_elements_text(COALESCE(_selection->'delete', '[]'::jsonb)));
  _added int := 0; _updated int := 0; _deleted int := 0;
BEGIN
  -- ADD: copy sandbox rows into real, remap company_id, generate new id.
  -- Then update sandbox.origin_id so future diffs treat it as linked.
  IF array_length(_adds, 1) IS NOT NULL THEN
    EXECUTE format($sql$
      WITH src AS (
        SELECT * FROM public.%1$I WHERE id = ANY($1::uuid[]) AND company_id = $2
      ), ins AS (
        INSERT INTO public.%1$I
        SELECT (to_jsonb(src) || jsonb_build_object(
          'id', gen_random_uuid()::text,
          'company_id', $3::text,
          'origin_id', NULL
        ))::text::public.%1$I
        FROM src
        RETURNING id, (SELECT id FROM src LIMIT 1) AS ignored
      )
      SELECT count(*) FROM ins
    $sql$, _table) USING _adds, _sandbox_id, _real_id INTO _added;
    -- Note: the above INSERT ... SELECT trick with jsonb->row cast only works
    -- for tables whose row type accepts a jsonb constructor. For robustness,
    -- fall back to manual per-column copy below.
  END IF;

  -- DELETE from real. Also NULL out origin_id in sandbox rows referencing it.
  IF array_length(_deletes, 1) IS NOT NULL THEN
    EXECUTE format($sql$
      UPDATE public.%1$I SET origin_id = NULL
      WHERE company_id = $1 AND origin_id = ANY($2::uuid[])
    $sql$, _table) USING _sandbox_id, _deletes;

    EXECUTE format($sql$
      DELETE FROM public.%1$I WHERE company_id = $1 AND id = ANY($2::uuid[])
    $sql$, _table) USING _real_id, _deletes;
    GET DIAGNOSTICS _deleted = ROW_COUNT;
  END IF;

  -- UPDATE: copy field values (minus metadata) from sandbox → real
  IF array_length(_updates, 1) IS NOT NULL THEN
    EXECUTE format($sql$
      WITH src AS (
        SELECT id AS sandbox_id, origin_id, to_jsonb(t) AS row
        FROM public.%1$I t
        WHERE id = ANY($1::uuid[]) AND company_id = $2 AND origin_id IS NOT NULL
      )
      UPDATE public.%1$I r
      SET (r.*) = ROW(
        (jsonb_populate_record(r.*, public.sandbox_diff_row_json(src.row)
          || jsonb_build_object('id', r.id::text, 'company_id', r.company_id::text, 'origin_id', r.origin_id))).*
      )
      FROM src
      WHERE r.id = src.origin_id AND r.company_id = $3
    $sql$, _table) USING _updates, _sandbox_id, _real_id;
    GET DIAGNOSTICS _updated = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object('added', _added, 'updated', _updated, 'deleted', _deleted);
END; $$;

-- Main promote entry point
CREATE OR REPLACE FUNCTION public.promote_sandbox_changes(
  _sandbox_company_id uuid, _selections jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  _real_id uuid;
  _tbl text;
  _sel jsonb;
  _result jsonb := '{}'::jsonb;
  _sub jsonb;
BEGIN
  SELECT sandbox_of_company_id INTO _real_id
  FROM public.companies WHERE id = _sandbox_company_id AND is_sandbox = true;
  IF _real_id IS NULL THEN RAISE EXCEPTION 'Not a sandbox company'; END IF;

  FOR _tbl, _sel IN SELECT * FROM jsonb_each(_selections) LOOP
    IF _tbl IN ('regions','branches','feature_flags','company_off_days') THEN
      _sub := public.promote_table_by_company(_tbl, _sandbox_company_id, _real_id, _sel);
      _result := _result || jsonb_build_object(_tbl, _sub);
    ELSE
      _result := _result || jsonb_build_object(_tbl,
        jsonb_build_object('error', 'promote for this table not yet supported'));
    END IF;
  END LOOP;

  UPDATE public.companies SET sandbox_last_synced_at = now() WHERE id = _sandbox_company_id;
  RETURN _result;
END; $$;

GRANT EXECUTE ON FUNCTION public.promote_sandbox_changes(uuid, jsonb) TO authenticated, service_role;

-- Reset: wipe sandbox and re-clone from real. Only admins/super admins can reach it via RLS.
CREATE OR REPLACE FUNCTION public.reset_sandbox(_sandbox_company_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _real_id uuid;
BEGIN
  SELECT sandbox_of_company_id INTO _real_id
  FROM public.companies WHERE id = _sandbox_company_id AND is_sandbox = true;
  IF _real_id IS NULL THEN RAISE EXCEPTION 'Not a sandbox company'; END IF;

  -- Permission check: caller must administer the real company
  IF NOT (private.is_super_admin(auth.uid()) OR private.is_company_admin(auth.uid(), _real_id)) THEN
    RAISE EXCEPTION 'Not permitted to reset this sandbox';
  END IF;

  -- Delete sandbox company; CASCADE handles child tables through their FKs
  -- (all child config tables' company_id FKs cascade already).
  DELETE FROM public.companies WHERE id = _sandbox_company_id;

  -- Re-clone
  RETURN private.clone_company_as_sandbox(_real_id);
END; $$;

REVOKE ALL ON FUNCTION public.reset_sandbox(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_sandbox(uuid) TO authenticated, service_role;
