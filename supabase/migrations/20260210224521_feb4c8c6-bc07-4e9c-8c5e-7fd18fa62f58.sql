
-- Add assignment and due date tracking directly to findings
ALTER TABLE public.non_conformities
ADD COLUMN assigned_to uuid NULL,
ADD COLUMN due_date date NULL;

-- Create notifications table for alerts
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  reference_type text NULL,
  reference_id uuid NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'assessor'::app_role) OR
  has_role(auth.uid(), 'branch_manager'::app_role) OR
  has_role(auth.uid(), 'executive'::app_role)
);

-- Index for faster notification queries
CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, is_read) WHERE is_read = false;

-- Index for finding assignments
CREATE INDEX idx_non_conformities_assigned ON public.non_conformities (assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_non_conformities_due_date ON public.non_conformities (due_date) WHERE due_date IS NOT NULL;
