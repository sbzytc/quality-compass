-- Add is_archived column to evaluations table
ALTER TABLE public.evaluations
ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster archived queries
CREATE INDEX idx_evaluations_is_archived ON public.evaluations(is_archived);

-- Allow deletion of draft evaluations by their owner
CREATE POLICY "Assessors can delete own draft evaluations"
ON public.evaluations
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (assessor_id = auth.uid() AND status = 'draft')
);