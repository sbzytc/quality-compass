import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Finding {
  id: string;
  evaluationId: string;
  branchId: string;
  branchName: string;
  criterionId: string;
  criterionName: string;
  categoryName: string;
  score: number;
  maxScore: number;
  assessorNotes?: string;
  attachments: string[];
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
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

export function useFindings(filters?: { status?: string; branchId?: string }) {
  return useQuery({
    queryKey: ['findings', filters],
    queryFn: async () => {
      let query = supabase
        .from('non_conformities')
        .select(`
          *,
          branches:branch_id (name, name_ar),
          template_criteria:criterion_id (
            name,
            name_ar,
            template_categories!inner (name, name_ar)
          )
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

      return data.map(f => ({
        id: f.id,
        evaluationId: f.evaluation_id,
        branchId: f.branch_id,
        branchName: (f.branches as any)?.name || 'Unknown',
        criterionId: f.criterion_id,
        criterionName: (f.template_criteria as any)?.name || 'Unknown',
        categoryName: (f.template_criteria as any)?.template_categories?.name || 'Unknown',
        score: f.score,
        maxScore: f.max_score,
        assessorNotes: f.assessor_notes,
        attachments: f.attachments || [],
        status: f.status as 'open' | 'in_progress' | 'resolved',
        createdAt: f.created_at,
      })) as Finding[];
    },
  });
}

export function useFindingStats() {
  return useQuery({
    queryKey: ['finding-stats'],
    queryFn: async () => {
      const { count: openCount } = await supabase
        .from('non_conformities')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');

      const { count: inProgressCount } = await supabase
        .from('non_conformities')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress');

      const { count: resolvedCount } = await supabase
        .from('non_conformities')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'resolved');

      return {
        open: openCount || 0,
        inProgress: inProgressCount || 0,
        resolved: resolvedCount || 0,
        total: (openCount || 0) + (inProgressCount || 0) + (resolvedCount || 0),
      };
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
        priority: a.priority as 'low' | 'medium' | 'high' | 'critical',
        status: a.status as 'pending' | 'in_progress' | 'completed' | 'overdue',
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
