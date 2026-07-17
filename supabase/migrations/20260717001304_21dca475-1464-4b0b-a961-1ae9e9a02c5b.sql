
-- 1) Column-level guard for profile self-updates
CREATE OR REPLACE FUNCTION public.enforce_profile_self_update_whitelist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
BEGIN
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
$$;

DROP TRIGGER IF EXISTS enforce_profile_self_update_whitelist ON public.profiles;
CREATE TRIGGER enforce_profile_self_update_whitelist
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_self_update_whitelist();

-- 2) Notifications INSERT: only self, admin, or support agent
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Users and staff can create scoped notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid()
    OR private.has_role(auth.uid(), 'admin'::app_role)
    OR private.has_role(auth.uid(), 'support_agent'::app_role)
    OR private.is_super_admin(auth.uid())
  )
);

-- 3) customer_complaints INSERT: require recent parent feedback
DROP POLICY IF EXISTS "Anyone can submit complaints" ON public.customer_complaints;
CREATE POLICY "Anyone can submit valid complaints"
ON public.customer_complaints
FOR INSERT
TO anon, authenticated
WITH CHECK (
  feedback_id IS NOT NULL
  AND branch_id IS NOT NULL
  AND complaint_text IS NOT NULL
  AND char_length(complaint_text) BETWEEN 1 AND 5000
  AND status = 'new'
  AND resolved_by IS NULL
  AND resolved_at IS NULL
  AND assigned_to IS NULL
  AND private.recent_feedback_exists(feedback_id)
);
