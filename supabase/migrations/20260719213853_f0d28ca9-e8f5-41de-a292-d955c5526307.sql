
CREATE OR REPLACE FUNCTION private.recent_feedback_exists(_feedback_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.customer_feedbacks
    WHERE id = _feedback_id
      AND branch_id = _branch_id
      AND created_at >= now() - interval '2 minutes'
  )
$$;

CREATE OR REPLACE FUNCTION private.recent_feedback_exists(_feedback_id uuid)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$ SELECT false $$;

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
  AND private.recent_feedback_exists(feedback_id, branch_id)
);

DROP POLICY IF EXISTS "Anyone can submit valid feedback" ON public.customer_feedbacks;
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
  AND (overall_rating IS NULL OR (overall_rating >= 1 AND overall_rating <= 5))
  AND EXISTS (
    SELECT 1 FROM public.branches b
    WHERE b.id = customer_feedbacks.branch_id
      AND b.is_active = true
  )
);

CREATE OR REPLACE FUNCTION public.enforce_customer_feedback_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_per_phone int;
  recent_per_branch int;
BEGIN
  SELECT count(*) INTO recent_per_phone
  FROM public.customer_feedbacks
  WHERE branch_id = NEW.branch_id
    AND customer_phone = NEW.customer_phone
    AND created_at > now() - interval '1 day';
  IF recent_per_phone >= 1 THEN
    RAISE EXCEPTION 'You have already submitted feedback for this branch today.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(*) INTO recent_per_branch
  FROM public.customer_feedbacks
  WHERE branch_id = NEW.branch_id
    AND created_at > now() - interval '1 minute';
  IF recent_per_branch >= 15 THEN
    RAISE EXCEPTION 'Feedback rate limit exceeded for this branch. Try again shortly.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;
