
CREATE OR REPLACE FUNCTION public.internal_clone_sandbox(_source_company_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role text;
BEGIN
  _role := COALESCE(current_setting('request.jwt.claim.role', true), '');
  IF _role <> 'service_role' THEN
    RAISE EXCEPTION 'service_role only';
  END IF;
  RETURN private.clone_company_as_sandbox(_source_company_id);
END; $$;

REVOKE ALL ON FUNCTION public.internal_clone_sandbox(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.internal_clone_sandbox(uuid) TO service_role;
