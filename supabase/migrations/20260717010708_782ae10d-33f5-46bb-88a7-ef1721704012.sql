
CREATE OR REPLACE FUNCTION public.promote_table_by_company(
  _table text, _sandbox_id uuid, _real_id uuid, _selection jsonb
) RETURNS jsonb
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  _adds uuid[]    := ARRAY(SELECT jsonb_array_elements_text(COALESCE(_selection->'add', '[]'::jsonb)))::uuid[];
  _updates uuid[] := ARRAY(SELECT jsonb_array_elements_text(COALESCE(_selection->'update', '[]'::jsonb)))::uuid[];
  _deletes uuid[] := ARRAY(SELECT jsonb_array_elements_text(COALESCE(_selection->'delete', '[]'::jsonb)))::uuid[];
  _added int := 0; _updated int := 0; _deleted int := 0;
BEGIN
  IF _table NOT IN ('regions','branches','feature_flags','company_off_days') THEN
    RAISE EXCEPTION 'Table % not supported for promote', _table;
  END IF;

  -- ADD: insert sandbox rows into real (rebuild via jsonb_populate_record)
  IF array_length(_adds, 1) IS NOT NULL THEN
    EXECUTE format($sql$
      WITH src AS (
        SELECT id AS sandbox_id, to_jsonb(t) AS row
        FROM public.%1$I t
        WHERE id = ANY($1) AND company_id = $2
      ), reshaped AS (
        SELECT
          src.sandbox_id,
          jsonb_populate_record(NULL::public.%1$I,
            src.row
            || jsonb_build_object(
              'id', gen_random_uuid(),
              'company_id', $3,
              'origin_id', NULL
            )
          ) AS new_row
        FROM src
      ), ins AS (
        INSERT INTO public.%1$I SELECT (r.new_row).* FROM reshaped r
        RETURNING id
      )
      SELECT count(*) FROM ins
    $sql$, _table) USING _adds, _sandbox_id, _real_id INTO _added;
  END IF;

  -- DELETE from real; null out origin_id in sandbox rows referencing them
  IF array_length(_deletes, 1) IS NOT NULL THEN
    EXECUTE format($sql$
      UPDATE public.%1$I SET origin_id = NULL
      WHERE company_id = $1 AND origin_id = ANY($2)
    $sql$, _table) USING _sandbox_id, _deletes;

    EXECUTE format($sql$
      DELETE FROM public.%1$I WHERE company_id = $1 AND id = ANY($2)
    $sql$, _table) USING _real_id, _deletes;
    GET DIAGNOSTICS _deleted = ROW_COUNT;
  END IF;

  -- UPDATE: rebuild target row from sandbox row's jsonb, preserving id/company_id/origin_id
  IF array_length(_updates, 1) IS NOT NULL THEN
    EXECUTE format($sql$
      WITH src AS (
        SELECT id AS sandbox_id, origin_id, to_jsonb(t) AS row
        FROM public.%1$I t
        WHERE id = ANY($1) AND company_id = $2 AND origin_id IS NOT NULL
      ), targets AS (
        SELECT src.origin_id AS target_id,
               jsonb_populate_record(NULL::public.%1$I,
                 src.row
                 || jsonb_build_object(
                   'id', src.origin_id,
                   'company_id', $3,
                   'origin_id', NULL
                 )
               ) AS new_row
        FROM src
      ), upd AS (
        UPDATE public.%1$I r
        SET r = (t.new_row).*
        FROM targets t
        WHERE r.id = t.target_id AND r.company_id = $3
        RETURNING r.id
      )
      SELECT count(*) FROM upd
    $sql$, _table) USING _updates, _sandbox_id, _real_id INTO _updated;
  END IF;

  RETURN jsonb_build_object('added', _added, 'updated', _updated, 'deleted', _deleted);
END; $$;
