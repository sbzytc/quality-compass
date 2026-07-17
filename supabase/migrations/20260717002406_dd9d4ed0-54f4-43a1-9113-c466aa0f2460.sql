REVOKE EXECUTE ON FUNCTION public.enforce_storage_bucket_limits() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_storage_bucket_limits() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_storage_bucket_limits() FROM authenticated;