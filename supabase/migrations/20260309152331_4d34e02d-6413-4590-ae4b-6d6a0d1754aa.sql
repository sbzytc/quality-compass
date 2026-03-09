CREATE OR REPLACE FUNCTION public.cleanup_expired_drafts()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete draft evaluations that are older than 24 hours
  DELETE FROM public.evaluations
  WHERE status = 'draft'
    AND created_at < NOW() - INTERVAL '24 hours';
END;
$function$;