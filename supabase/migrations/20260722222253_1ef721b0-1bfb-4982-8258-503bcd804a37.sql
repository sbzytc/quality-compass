CREATE OR REPLACE FUNCTION public.enforce_profile_self_update_whitelist()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  jwt_role text := COALESCE(current_setting('request.jwt.claim.role', true), current_setting('request.jwt.claims', true)::json->>'role', '');
  sess text := session_user;
BEGIN
  -- Internal service-role operations (edge functions) are always allowed.
  IF jwt_role = 'service_role' OR sess IN ('service_role','supabase_admin','postgres') THEN
    RETURN NEW;
  END IF;

  IF caller IS NOT NULL AND (
       private.has_role(caller, 'admin'::app_role)
       OR private.is_super_admin(caller)
  ) THEN
    RETURN NEW;
  END IF;

  IF caller IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Not permitted to modify this profile';
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.ai_assistant_enabled IS DISTINCT FROM OLD.ai_assistant_enabled
     OR NEW.can_view_customer_feedback IS DISTINCT FROM OLD.can_view_customer_feedback
     OR NEW.can_view_complaints IS DISTINCT FROM OLD.can_view_complaints
     OR NEW.can_view_suggestions IS DISTINCT FROM OLD.can_view_suggestions
     OR NEW.branch_id IS DISTINCT FROM OLD.branch_id
     OR NEW.region_id IS DISTINCT FROM OLD.region_id
     OR NEW.default_company_id IS DISTINCT FROM OLD.default_company_id
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.direct_manager_id IS DISTINCT FROM OLD.direct_manager_id
     OR NEW.job_title IS DISTINCT FROM OLD.job_title
  THEN
    RAISE EXCEPTION 'You are not permitted to modify privileged profile fields';
  END IF;

  IF NEW.force_password_change IS DISTINCT FROM OLD.force_password_change
     AND NOT (OLD.force_password_change = true AND NEW.force_password_change = false)
  THEN
    RAISE EXCEPTION 'You are not permitted to modify the force_password_change flag';
  END IF;

  RETURN NEW;
END;
$function$;