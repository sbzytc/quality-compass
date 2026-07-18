
REVOKE EXECUTE ON FUNCTION public.enforce_super_admin_role_writes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_super_admin_role_writes() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_super_admin_role_writes() FROM authenticated;
