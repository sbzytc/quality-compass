
-- Add review workflow columns to non_conformities
ALTER TABLE public.non_conformities
  ADD COLUMN IF NOT EXISTS resolution_notes text,
  ADD COLUMN IF NOT EXISTS resolution_attachments text[],
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS review_attachments text[],
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone;

-- The assessor_id from the evaluation is the reviewer.
-- We need to track which evaluator originally found this issue.
-- We can get that from evaluations.assessor_id via evaluation_id FK.
