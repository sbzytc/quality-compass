
-- Create history/audit trail table for non-conformity status changes
CREATE TABLE public.non_conformity_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  non_conformity_id UUID NOT NULL REFERENCES public.non_conformities(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'assigned', 'resolved', 'approved', 'rejected', 'reassigned'
  performed_by UUID NOT NULL,
  notes TEXT,
  attachments TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.non_conformity_history ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view history (same access as non_conformities)
CREATE POLICY "Users can view non-conformity history"
ON public.non_conformity_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM non_conformities nc
    WHERE nc.id = non_conformity_history.non_conformity_id
    AND (
      has_role(auth.uid(), 'admin') OR
      has_role(auth.uid(), 'executive') OR
      EXISTS (SELECT 1 FROM evaluations e WHERE e.id = nc.evaluation_id AND e.assessor_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM branches b WHERE b.id = nc.branch_id AND b.manager_id = auth.uid())
    )
  )
);

-- Authenticated users involved can insert history
CREATE POLICY "Users can insert non-conformity history"
ON public.non_conformity_history
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create index for fast lookups
CREATE INDEX idx_nc_history_nc_id ON public.non_conformity_history(non_conformity_id);
CREATE INDEX idx_nc_history_created ON public.non_conformity_history(created_at);
