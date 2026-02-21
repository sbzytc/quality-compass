import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Finding {
  id: string;
  evaluationId: string;
  branchId: string;
  branchName: string;
  branchNameAr?: string;
  criterionId: string;
  criterionName: string;
  criterionNameAr?: string;
  categoryName: string;
  categoryNameAr?: string;
  score: number;
  maxScore: number;
  assessorNotes?: string;
  attachments: string[];
  status: 'open' | 'in_progress' | 'resolved';
  assignedTo?: string;
  dueDate?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
  evaluationDate?: string;
}

export interface CorrectiveAction {
  id: string;
  nonConformityId: string;
  description: string;
  ownerId?: string;
  ownerName?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  evidence: string[];
  completedAt?: string;
  createdAt: string;
}

function mapFinding(f: any): Finding {
  return {
    id: f.id,
    evaluationId: f.evaluation_id,
    branchId: f.branch_id,
    branchName: (f.branches as any)?.name || 'Unknown',
    branchNameAr: (f.branches as any)?.name_ar,
    criterionId: f.criterion_id,
    criterionName: (f.template_criteria as any)?.name || 'Unknown',
    criterionNameAr: (f.template_criteria as any)?.name_ar,
    categoryName: (f.template_criteria as any)?.template_categories?.name || 'Unknown',
    categoryNameAr: (f.template_criteria as any)?.template_categories?.name_ar,
    score: f.score,
    maxScore: f.max_score,
    assessorNotes: f.assessor_notes,
    attachments: f.attachments || [],
    status: f.status as Finding['status'],
    assignedTo: f.assigned_to,
    dueDate: f.due_date,
    resolvedAt: f.resolved_at,
    resolvedBy: f.resolved_by,
    createdAt: f.created_at,
    evaluationDate: (f.evaluations as any)?.submitted_at || (f.evaluations as any)?.created_at,
  };
}

const FINDINGS_SELECT = `
  *,
  branches:branch_id (name, name_ar),
  template_criteria:criterion_id (
    name,
    name_ar,
    template_categories!inner (name, name_ar)
  ),
  evaluations!inner (status, is_archived, submitted_at, created_at)
`;

export function useFindings(filters?: { status?: string; branchId?: string }) {
  return useQuery({
    queryKey: ['findings', filters],
    queryFn: async () => {
      let query = supabase
        .from('non_conformities')
        .select(FINDINGS_SELECT)
        .in('evaluations.status', ['submitted', 'approved'])
        .eq('evaluations.is_archived', false)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.branchId) {
        query = query.eq('branch_id', filters.branchId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data.map(mapFinding) as Finding[];
    },
  });
}

// Critical findings: score 0-3 (out of 5), grouped by branch
export function useCriticalFindings(filters?: { status?: string; branchId?: string }) {
  return useQuery({
    queryKey: ['critical-findings', filters],
    queryFn: async () => {
      let query = supabase
        .from('non_conformities')
        .select(FINDINGS_SELECT)
        .in('evaluations.status', ['submitted', 'approved'])
        .eq('evaluations.is_archived', false)
        .lte('score', 3)
        .order('score', { ascending: true })
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.branchId) {
        query = query.eq('branch_id', filters.branchId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data.map(mapFinding) as Finding[];
    },
  });
}

export function useFindingStats() {
  return useQuery({
    queryKey: ['finding-stats'],
    queryFn: async () => {
      // Get all critical findings (score <= 3) from non-archived, completed evaluations
      const { data: allFindings, error } = await supabase
        .from('non_conformities')
        .select('status, score, assigned_to, due_date, resolved_at, created_at, evaluations!inner(status, is_archived)')
        .lte('score', 3)
        .in('evaluations.status', ['submitted', 'approved'])
        .eq('evaluations.is_archived', false);

      if (error) throw error;

      const open = allFindings.filter(f => f.status === 'open').length;
      const inProgress = allFindings.filter(f => f.status === 'in_progress').length;
      const resolved = allFindings.filter(f => f.status === 'resolved').length;
      const total = allFindings.length;

      const assigned = allFindings.filter(f => f.assigned_to).length;
      const unassigned = allFindings.filter(f => !f.assigned_to && f.status !== 'resolved').length;

      const now = new Date();
      const overdue = allFindings.filter(f => 
        f.due_date && new Date(f.due_date) < now && f.status !== 'resolved'
      ).length;

      // Calculate average resolution time (days) for resolved findings
      const resolvedFindings = allFindings.filter(f => f.resolved_at);
      let avgResolutionDays = 0;
      if (resolvedFindings.length > 0) {
        const totalDays = resolvedFindings.reduce((sum, f) => {
          const created = new Date(f.created_at).getTime();
          const resolvedDate = new Date(f.resolved_at!).getTime();
          return sum + (resolvedDate - created) / (1000 * 60 * 60 * 24);
        }, 0);
        avgResolutionDays = Math.round(totalDays / resolvedFindings.length);
      }

      const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

      return {
        open,
        inProgress,
        resolved,
        total,
        assigned,
        unassigned,
        overdue,
        avgResolutionDays,
        resolutionRate,
      };
    },
  });
}

export function useAssignFinding() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ findingId, assignedTo, dueDate }: { findingId: string; assignedTo: string; dueDate: string }) => {
      const { error } = await supabase
        .from('non_conformities')
        .update({
          assigned_to: assignedTo,
          due_date: dueDate,
          status: 'in_progress',
        })
        .eq('id', findingId);

      if (error) throw error;

      // Create notification for assigned user
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: assignedTo,
          title: 'New Finding Assigned',
          message: 'A critical finding has been assigned to you for resolution.',
          type: 'assignment',
          reference_type: 'finding',
          reference_id: findingId,
        });

      if (notifError) console.error('Notification error:', notifError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['findings'] });
      queryClient.invalidateQueries({ queryKey: ['critical-findings'] });
      queryClient.invalidateQueries({ queryKey: ['finding-stats'] });
    },
  });
}

export function useResolveFinding() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ findingId, assignedTo, resolution, attachments }: { findingId: string; assignedTo?: string; resolution: string; attachments?: string[] }) => {
      const updateData: any = {
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id,
        assessor_notes: resolution,
      };
      if (attachments && attachments.length > 0) {
        updateData.attachments = attachments;
      }
      const { error } = await supabase
        .from('non_conformities')
        .update(updateData)
        .eq('id', findingId);

      if (error) throw error;

      // Notify the branch manager and admins
      if (assignedTo) {
        await supabase.from('notifications').insert({
          user_id: assignedTo,
          title: 'Finding Resolved',
          message: 'A finding assigned to you has been marked as resolved.',
          type: 'resolution',
          reference_type: 'finding',
          reference_id: findingId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['findings'] });
      queryClient.invalidateQueries({ queryKey: ['critical-findings'] });
      queryClient.invalidateQueries({ queryKey: ['finding-stats'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useCorrectiveActions(findingId?: string) {
  return useQuery({
    queryKey: ['corrective-actions', findingId],
    queryFn: async () => {
      let query = supabase
        .from('corrective_actions')
        .select('*')
        .order('created_at', { ascending: false });

      if (findingId) {
        query = query.eq('non_conformity_id', findingId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map(a => ({
        id: a.id,
        nonConformityId: a.non_conformity_id,
        description: a.description,
        ownerId: a.owner_id,
        dueDate: a.due_date,
        priority: a.priority as CorrectiveAction['priority'],
        status: a.status as CorrectiveAction['status'],
        evidence: a.evidence || [],
        completedAt: a.completed_at,
        createdAt: a.created_at,
      })) as CorrectiveAction[];
    },
    enabled: findingId !== undefined,
  });
}

export function usePendingActions() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['pending-actions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('corrective_actions')
        .select(`
          *,
          non_conformities!inner (
            branch_id,
            branches:branch_id (manager_id)
          )
        `)
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}
