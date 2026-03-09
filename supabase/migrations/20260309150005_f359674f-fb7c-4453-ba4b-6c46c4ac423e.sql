ALTER TABLE public.evaluations 
ADD COLUMN started_at timestamp with time zone DEFAULT NULL,
ADD COLUMN duration_minutes numeric DEFAULT NULL;