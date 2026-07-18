
-- 1) profiles: narrow coworker visibility. Regular company members no longer
-- see full profile rows of every coworker (which included permission flags,
-- email, phone, direct manager). Access is preserved for self, admins,
-- executives, super admins, and branch managers of the same company.
DROP POLICY IF EXISTS "Company members can view each other's profiles" ON public.profiles;

CREATE POLICY "Company managers can view member profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR private.is_super_admin(auth.uid())
  OR private.has_role(auth.uid(), 'admin'::app_role)
  OR private.has_role(auth.uid(), 'executive'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.company_users me
    JOIN public.company_users them ON them.company_id = me.company_id
    JOIN public.branches b ON b.company_id = me.company_id
    WHERE me.user_id = auth.uid()
      AND me.is_active = true
      AND them.user_id = profiles.user_id
      AND them.is_active = true
      AND b.manager_id = auth.uid()
  )
);

-- 2) customer_feedbacks: harden anon insert with format validation + rate limiting.
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.customer_feedbacks;

CREATE POLICY "Anyone can submit valid feedback"
ON public.customer_feedbacks
FOR INSERT
TO anon, authenticated
WITH CHECK (
  branch_id IS NOT NULL
  AND customer_name IS NOT NULL
  AND char_length(btrim(customer_name)) BETWEEN 2 AND 120
  AND customer_phone IS NOT NULL
  AND customer_phone ~ '^[0-9+()\-\s]{7,20}$'
  AND status = 'new'
  AND (overall_rating IS NULL OR overall_rating BETWEEN 1 AND 5)
);

CREATE OR REPLACE FUNCTION public.enforce_customer_feedback_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_per_phone int;
  recent_per_branch int;
BEGIN
  SELECT count(*) INTO recent_per_phone
  FROM public.customer_feedbacks
  WHERE branch_id = NEW.branch_id
    AND customer_phone = NEW.customer_phone
    AND created_at > now() - interval '1 hour';
  IF recent_per_phone >= 3 THEN
    RAISE EXCEPTION 'Too many feedback submissions from this phone for this branch. Try again later.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(*) INTO recent_per_branch
  FROM public.customer_feedbacks
  WHERE branch_id = NEW.branch_id
    AND created_at > now() - interval '1 minute';
  IF recent_per_branch >= 30 THEN
    RAISE EXCEPTION 'Feedback rate limit exceeded for this branch. Try again shortly.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_customer_feedback_rate_limit ON public.customer_feedbacks;
CREATE TRIGGER trg_enforce_customer_feedback_rate_limit
BEFORE INSERT ON public.customer_feedbacks
FOR EACH ROW EXECUTE FUNCTION public.enforce_customer_feedback_rate_limit();

-- 3) customer_complaints: keep feedback linkage but enforce that the complaint
-- targets the same branch as its parent feedback, and add a rate limit per
-- feedback so a single feedback can't be spammed with many complaints.
DROP POLICY IF EXISTS "Anyone can submit valid complaints" ON public.customer_complaints;

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
  AND EXISTS (
    SELECT 1 FROM public.customer_feedbacks f
    WHERE f.id = customer_complaints.feedback_id
      AND f.branch_id = customer_complaints.branch_id
  )
);

CREATE OR REPLACE FUNCTION public.enforce_customer_complaint_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  per_feedback int;
  per_branch int;
BEGIN
  SELECT count(*) INTO per_feedback
  FROM public.customer_complaints
  WHERE feedback_id = NEW.feedback_id;
  IF per_feedback >= 5 THEN
    RAISE EXCEPTION 'This feedback has reached the maximum number of complaints.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(*) INTO per_branch
  FROM public.customer_complaints
  WHERE branch_id = NEW.branch_id
    AND created_at > now() - interval '1 minute';
  IF per_branch >= 30 THEN
    RAISE EXCEPTION 'Complaint submission rate limit exceeded for this branch.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_customer_complaint_rate_limit ON public.customer_complaints;
CREATE TRIGGER trg_enforce_customer_complaint_rate_limit
BEFORE INSERT ON public.customer_complaints
FOR EACH ROW EXECUTE FUNCTION public.enforce_customer_complaint_rate_limit();
