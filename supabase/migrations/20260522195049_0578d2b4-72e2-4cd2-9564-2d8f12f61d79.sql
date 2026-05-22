
-- 1) Replace permissive INSERT policies (WITH CHECK true) with validated checks
DROP POLICY IF EXISTS "Anyone can submit complaints" ON public.customer_complaints;
CREATE POLICY "Anyone can submit complaints" ON public.customer_complaints
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    feedback_id IS NOT NULL
    AND branch_id IS NOT NULL
    AND complaint_text IS NOT NULL
    AND char_length(complaint_text) BETWEEN 1 AND 5000
    AND status = 'new'
    AND resolved_by IS NULL
    AND resolved_at IS NULL
    AND assigned_to IS NULL
  );

DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.customer_feedbacks;
CREATE POLICY "Anyone can submit feedback" ON public.customer_feedbacks
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    branch_id IS NOT NULL
    AND customer_name IS NOT NULL AND char_length(customer_name) BETWEEN 1 AND 200
    AND customer_phone IS NOT NULL AND char_length(customer_phone) BETWEEN 1 AND 30
    AND status = 'new'
  );

DROP POLICY IF EXISTS "Anyone can insert scores" ON public.customer_feedback_scores;
CREATE POLICY "Anyone can insert scores" ON public.customer_feedback_scores
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    feedback_id IS NOT NULL
    AND question_id IS NOT NULL
    AND score BETWEEN 1 AND 5
  );

-- 2) Drop broad listing policies on storage.objects (public URLs still work)
DROP POLICY IF EXISTS "Authenticated users can view evaluation attachments" ON storage.objects;
DROP POLICY IF EXISTS "Support attachments are publicly accessible" ON storage.objects;

-- 3) Lock down SECURITY DEFINER helper functions: revoke EXECUTE from anon/public,
--    keep what's strictly needed by authenticated for RLS evaluation.
REVOKE ALL ON FUNCTION public.cleanup_expired_drafts_on_select() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_expired_drafts() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_template_criteria_answer_type() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_user_profile(uuid, text, text, app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.compute_next_due_date(uuid, text, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_company_ids(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_roles(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_company_admin(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_belongs_to_company(uuid, uuid) FROM PUBLIC, anon;

-- Make sure authenticated still has EXECUTE on RLS helpers
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_company(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_company_ids(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_roles(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_next_due_date(uuid, text, date) TO authenticated;
