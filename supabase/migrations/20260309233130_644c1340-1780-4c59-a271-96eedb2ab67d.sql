
-- Update non_conformities SELECT policy: add branch_employee (assigned) and support_agent
DROP POLICY IF EXISTS "Users can view non-conformities" ON public.non_conformities;
CREATE POLICY "Users can view non-conformities" ON public.non_conformities
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'executive'::app_role) 
  OR has_role(auth.uid(), 'support_agent'::app_role)
  OR (assigned_to = auth.uid())
  OR (EXISTS (SELECT 1 FROM evaluations e WHERE e.id = non_conformities.evaluation_id AND e.assessor_id = auth.uid()))
  OR (EXISTS (SELECT 1 FROM branches b WHERE b.id = non_conformities.branch_id AND b.manager_id = auth.uid()))
);

-- Update non_conformities UPDATE policy: add assigned employee
DROP POLICY IF EXISTS "Users can update non-conformities" ON public.non_conformities;
CREATE POLICY "Users can update non-conformities" ON public.non_conformities
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (assigned_to = auth.uid())
  OR (EXISTS (SELECT 1 FROM evaluations e WHERE e.id = non_conformities.evaluation_id AND e.assessor_id = auth.uid()))
  OR (EXISTS (SELECT 1 FROM branches b WHERE b.id = non_conformities.branch_id AND b.manager_id = auth.uid()))
);

-- Update evaluations SELECT: add support_agent
DROP POLICY IF EXISTS "Users can view evaluations based on role" ON public.evaluations;
CREATE POLICY "Users can view evaluations based on role" ON public.evaluations
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'executive'::app_role)
  OR has_role(auth.uid(), 'support_agent'::app_role)
  OR (assessor_id = auth.uid())
  OR (EXISTS (SELECT 1 FROM branches b WHERE b.id = evaluations.branch_id AND b.manager_id = auth.uid()))
);

-- Update evaluation_category_scores SELECT: add support_agent
DROP POLICY IF EXISTS "Users can view evaluation scores" ON public.evaluation_category_scores;
CREATE POLICY "Users can view evaluation scores" ON public.evaluation_category_scores
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM evaluations e
  WHERE e.id = evaluation_category_scores.evaluation_id
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'executive'::app_role)
    OR has_role(auth.uid(), 'support_agent'::app_role)
    OR e.assessor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM branches b WHERE b.id = e.branch_id AND b.manager_id = auth.uid())
  )
));

-- Update evaluation_criterion_scores SELECT: add support_agent
DROP POLICY IF EXISTS "Users can view criterion scores" ON public.evaluation_criterion_scores;
CREATE POLICY "Users can view criterion scores" ON public.evaluation_criterion_scores
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM evaluations e
  WHERE e.id = evaluation_criterion_scores.evaluation_id
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'executive'::app_role)
    OR has_role(auth.uid(), 'support_agent'::app_role)
    OR e.assessor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM branches b WHERE b.id = e.branch_id AND b.manager_id = auth.uid())
  )
));

-- Update notifications INSERT to allow any authenticated user
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications" ON public.notifications
FOR INSERT TO public
WITH CHECK (auth.uid() IS NOT NULL);
