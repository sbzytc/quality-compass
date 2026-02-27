import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OperationsTask {
  id: string;
  title: string;
  description?: string;
  branchId?: string;
  branchName?: string;
  branchNameAr?: string;
  assignedTo?: string;
  assignedToName?: string;
  createdBy: string;
  createdByName?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export function useOperationsTasks(filters?: { status?: string; branchId?: string }) {
  return useQuery({
    queryKey: ['operations-tasks', filters],
    queryFn: async () => {
      let query = supabase
        .from('operations_tasks')
        .select(`
          *,
          branches:branch_id (name, name_ar),
          assigned_profile:assigned_to (full_name),
          creator_profile:created_by (full_name)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.branchId) {
        query = query.eq('branch_id', filters.branchId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        branchId: t.branch_id,
        branchName: t.branches?.name,
        branchNameAr: t.branches?.name_ar,
        assignedTo: t.assigned_to,
        assignedToName: t.assigned_profile?.full_name,
        createdBy: t.created_by,
        createdByName: t.creator_profile?.full_name,
        status: t.status,
        priority: t.priority,
        dueDate: t.due_date,
        completedAt: t.completed_at,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      })) as OperationsTask[];
    },
  });
}

export function useOperationsTaskStats() {
  return useQuery({
    queryKey: ['operations-task-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operations_tasks')
        .select('status, due_date');

      if (error) throw error;

      const now = new Date();
      const total = data.length;
      const pending = data.filter(t => t.status === 'pending').length;
      const inProgress = data.filter(t => t.status === 'in_progress').length;
      const completed = data.filter(t => t.status === 'completed').length;
      const overdue = data.filter(t =>
        t.due_date && new Date(t.due_date) < now && t.status !== 'completed'
      ).length;

      return { total, pending, inProgress, completed, overdue };
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (task: {
      title: string;
      description?: string;
      branchId?: string;
      assignedTo?: string;
      priority: string;
      dueDate?: string;
    }) => {
      const { error } = await supabase
        .from('operations_tasks')
        .insert({
          title: task.title,
          description: task.description || null,
          branch_id: task.branchId || null,
          assigned_to: task.assignedTo || null,
          created_by: user!.id,
          priority: task.priority,
          due_date: task.dueDate || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['operations-task-stats'] });
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const updateData: any = { status };
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }

      const { error } = await supabase
        .from('operations_tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['operations-task-stats'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('operations_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['operations-task-stats'] });
    },
  });
}
