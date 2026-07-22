CREATE OR REPLACE FUNCTION public.enforce_profile_self_update_whitelist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  jwt_role text := COALESCE(current_setting('request.jwt.claim.role', true), '');
BEGIN
  -- Internal service operations with a recognized service role are allowed.
  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Some managed internal service requests do not expose request.jwt.claim.role
  -- inside triggers. Allow only the narrow password-reset marker change for
  -- claim-less backend updates; all identity/privileged fields must remain unchanged.
  IF caller IS NULL
     AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id
     AND NEW.email IS NOT DISTINCT FROM OLD.email
     AND NEW.full_name IS NOT DISTINCT FROM OLD.full_name
     AND NEW.phone IS NOT DISTINCT FROM OLD.phone
     AND NEW.avatar_url IS NOT DISTINCT FROM OLD.avatar_url
     AND NEW.ai_assistant_enabled IS NOT DISTINCT FROM OLD.ai_assistant_enabled
     AND NEW.can_view_customer_feedback IS NOT DISTINCT FROM OLD.can_view_customer_feedback
     AND NEW.can_view_complaints IS NOT DISTINCT FROM OLD.can_view_complaints
     AND NEW.can_view_suggestions IS NOT DISTINCT FROM OLD.can_view_suggestions
     AND NEW.branch_id IS NOT DISTINCT FROM OLD.branch_id
     AND NEW.region_id IS NOT DISTINCT FROM OLD.region_id
     AND NEW.default_company_id IS NOT DISTINCT FROM OLD.default_company_id
     AND NEW.is_active IS NOT DISTINCT FROM OLD.is_active
     AND NEW.direct_manager_id IS NOT DISTINCT FROM OLD.direct_manager_id
     AND NEW.job_title IS NOT DISTINCT FROM OLD.job_title
     AND NEW.force_password_change IS DISTINCT FROM OLD.force_password_change
  THEN
    RETURN NEW;
  END IF;

  -- Admins and super admins can change anything on any profile.
  IF caller IS NOT NULL AND (
       private.has_role(caller, 'admin'::app_role)
       OR private.is_super_admin(caller)
  ) THEN
    RETURN NEW;
  END IF;

  -- Users editing someone else's profile is blocked here as a defense-in-depth
  -- layer on top of RLS (RLS already restricts self to auth.uid()=user_id).
  IF caller IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Not permitted to modify this profile';
  END IF;

  -- Identity / privileged fields: reject any change
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

  -- Allow clearing the force_password_change flag (true -> false) but never
  -- allow a user to force themselves into (or out of, other than clearing) it.
  IF NEW.force_password_change IS DISTINCT FROM OLD.force_password_change
     AND NOT (OLD.force_password_change = true AND NEW.force_password_change = false)
  THEN
    RAISE EXCEPTION 'You are not permitted to modify the force_password_change flag';
  END IF;

  RETURN NEW;
END;
$function$;