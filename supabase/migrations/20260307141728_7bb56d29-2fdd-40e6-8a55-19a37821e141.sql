
CREATE TABLE public.profile_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_change_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own change requests"
ON public.profile_change_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all change requests"
ON public.profile_change_requests
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Users can insert their own requests
CREATE POLICY "Users can insert own change requests"
ON public.profile_change_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can update requests (approve/reject)
CREATE POLICY "Admins can update change requests"
ON public.profile_change_requests
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));
