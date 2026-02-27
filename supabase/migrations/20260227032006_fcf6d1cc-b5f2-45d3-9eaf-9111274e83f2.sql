
-- Create operations tasks table
CREATE TABLE public.operations_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  assigned_to UUID, -- user_id from profiles
  created_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed
  priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.operations_tasks ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view tasks for their branch or if admin/executive
CREATE POLICY "Users can view tasks"
ON public.operations_tasks
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'executive') OR
  assigned_to = auth.uid() OR
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM branches b WHERE b.id = operations_tasks.branch_id AND b.manager_id = auth.uid())
);

-- Admin, branch manager, assessor can create tasks
CREATE POLICY "Users can create tasks"
ON public.operations_tasks
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND auth.uid() = created_by
);

-- Creator, assigned user, branch manager, admin can update
CREATE POLICY "Users can update tasks"
ON public.operations_tasks
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR
  created_by = auth.uid() OR
  assigned_to = auth.uid() OR
  EXISTS (SELECT 1 FROM branches b WHERE b.id = operations_tasks.branch_id AND b.manager_id = auth.uid())
);

-- Creator and admin can delete
CREATE POLICY "Users can delete tasks"
ON public.operations_tasks
FOR DELETE
USING (
  has_role(auth.uid(), 'admin') OR
  created_by = auth.uid()
);

-- Indexes
CREATE INDEX idx_ops_tasks_branch ON public.operations_tasks(branch_id);
CREATE INDEX idx_ops_tasks_assigned ON public.operations_tasks(assigned_to);
CREATE INDEX idx_ops_tasks_status ON public.operations_tasks(status);

-- Auto-update updated_at
CREATE TRIGGER update_operations_tasks_updated_at
BEFORE UPDATE ON public.operations_tasks
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
