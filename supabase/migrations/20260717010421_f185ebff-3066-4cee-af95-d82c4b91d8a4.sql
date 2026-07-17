
CREATE OR REPLACE FUNCTION private.reset_sandbox(_sandbox_company_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _real_id uuid;
BEGIN
  SELECT sandbox_of_company_id INTO _real_id
  FROM public.companies WHERE id = _sandbox_company_id AND is_sandbox = true;
  IF _real_id IS NULL THEN RAISE EXCEPTION 'Not a sandbox company'; END IF;

  IF NOT (private.is_super_admin(auth.uid()) OR private.is_company_admin(auth.uid(), _real_id)) THEN
    RAISE EXCEPTION 'Not permitted to reset this sandbox';
  END IF;

  DELETE FROM public.companies WHERE id = _sandbox_company_id;
  RETURN private.clone_company_as_sandbox(_real_id);
END; $$;

REVOKE ALL ON FUNCTION private.reset_sandbox(uuid) FROM PUBLIC;

DROP FUNCTION IF EXISTS public.reset_sandbox(uuid);
