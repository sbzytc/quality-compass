-- Create a function to delete expired draft evaluations (older than 5 hours)
CREATE OR REPLACE FUNCTION public.cleanup_expired_drafts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete draft evaluations that are older than 5 hours
  DELETE FROM public.evaluations
  WHERE status = 'draft'
    AND created_at < NOW() - INTERVAL '5 hours';
END;
$$;

-- Create a function that can be called on each page load to cleanup
CREATE OR REPLACE FUNCTION public.cleanup_expired_drafts_on_select()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cleanup expired drafts in the background
  PERFORM public.cleanup_expired_drafts();
  RETURN NULL;
END;
$$;