
-- Add foreign keys for operations_tasks to profiles (user_id)
ALTER TABLE public.operations_tasks
  ADD CONSTRAINT operations_tasks_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

ALTER TABLE public.operations_tasks
  ADD CONSTRAINT operations_tasks_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
