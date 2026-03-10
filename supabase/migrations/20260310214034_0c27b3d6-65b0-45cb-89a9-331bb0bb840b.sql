
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS can_view_customer_feedback boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_view_complaints boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_view_suggestions boolean NOT NULL DEFAULT false;

-- Enable these for existing admin and executive users by default
UPDATE public.profiles
SET can_view_customer_feedback = true,
    can_view_complaints = true,
    can_view_suggestions = true
WHERE user_id IN (
  SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'executive')
);

-- Also enable for branch managers
UPDATE public.profiles
SET can_view_customer_feedback = true,
    can_view_complaints = true,
    can_view_suggestions = true
WHERE user_id IN (
  SELECT user_id FROM public.user_roles WHERE role = 'branch_manager'
);
