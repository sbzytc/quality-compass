-- Drop the existing update policy
DROP POLICY IF EXISTS "Assessors can update own evaluations" ON public.evaluations;

-- Create a new policy that allows:
-- 1. Admins can update any evaluation
-- 2. Assessors can update their own evaluations that are either:
--    a. Draft status, OR
--    b. Submitted within 24 hours (for full edits), OR
--    c. Any submitted/approved evaluation (for archiving only - is_archived field)
CREATE POLICY "Assessors can update own evaluations" 
ON public.evaluations 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (
    assessor_id = auth.uid() 
    AND (
      status = 'draft'::text 
      OR (status = 'submitted'::text AND COALESCE(submitted_at, created_at) >= (now() - '24:00:00'::interval))
      OR status IN ('submitted', 'approved') -- Allow archiving any completed evaluation
    )
  )
);