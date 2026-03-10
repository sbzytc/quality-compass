
-- Customer feedback questions (fixed, admin-managed)
CREATE TABLE public.customer_feedback_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text text NOT NULL,
  question_text_ar text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_feedback_questions ENABLE ROW LEVEL SECURITY;

-- Anyone can view active questions (public page)
CREATE POLICY "Anyone can view active questions" ON public.customer_feedback_questions
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage questions" ON public.customer_feedback_questions
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Customer feedbacks (main record)
CREATE TABLE public.customer_feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  overall_rating numeric,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_feedbacks ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public page, no auth)
CREATE POLICY "Anyone can submit feedback" ON public.customer_feedbacks
  FOR INSERT WITH CHECK (true);

-- Authenticated users with roles can view
CREATE POLICY "Staff can view feedbacks" ON public.customer_feedbacks
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'executive'::app_role)
    OR has_role(auth.uid(), 'assessor'::app_role)
    OR EXISTS (SELECT 1 FROM branches b WHERE b.id = customer_feedbacks.branch_id AND b.manager_id = auth.uid())
  );

CREATE POLICY "Staff can update feedbacks" ON public.customer_feedbacks
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM branches b WHERE b.id = customer_feedbacks.branch_id AND b.manager_id = auth.uid())
  );

-- Customer feedback scores (per question)
CREATE TABLE public.customer_feedback_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL REFERENCES public.customer_feedbacks(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.customer_feedback_questions(id),
  score integer NOT NULL CHECK (score >= 1 AND score <= 5),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_feedback_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert scores" ON public.customer_feedback_scores
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can view scores" ON public.customer_feedback_scores
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM customer_feedbacks cf
      WHERE cf.id = customer_feedback_scores.feedback_id
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'executive'::app_role)
        OR has_role(auth.uid(), 'assessor'::app_role)
        OR EXISTS (SELECT 1 FROM branches b WHERE b.id = cf.branch_id AND b.manager_id = auth.uid())
      )
    )
  );

-- Customer complaints/suggestions
CREATE TABLE public.customer_complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL REFERENCES public.customer_feedbacks(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  complaint_text text NOT NULL,
  type text NOT NULL DEFAULT 'complaint',
  status text NOT NULL DEFAULT 'new',
  assigned_to uuid,
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit complaints" ON public.customer_complaints
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can view complaints" ON public.customer_complaints
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'executive'::app_role)
    OR has_role(auth.uid(), 'assessor'::app_role)
    OR EXISTS (SELECT 1 FROM branches b WHERE b.id = customer_complaints.branch_id AND b.manager_id = auth.uid())
    OR assigned_to = auth.uid()
  );

CREATE POLICY "Staff can update complaints" ON public.customer_complaints
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM branches b WHERE b.id = customer_complaints.branch_id AND b.manager_id = auth.uid())
    OR assigned_to = auth.uid()
  );

-- Insert default feedback questions
INSERT INTO public.customer_feedback_questions (question_text, question_text_ar, sort_order) VALUES
  ('Quality of Service', 'جودة الخدمة', 1),
  ('Cleanliness', 'النظافة', 2),
  ('Speed of Service', 'سرعة الخدمة', 3),
  ('Staff Friendliness', 'تعامل الموظفين', 4),
  ('Overall Experience', 'التجربة العامة', 5);
