import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface EvaluationWithDetails {
  id: string;
  branchId: string;
  branchName: string;
  templateId: string;
  templateName: string;
  assessorId: string;
  assessorName: string;
  overallScore: number | null;
  overallPercentage: number | null;
  status: 'draft' | 'submitted' | 'approved';
  createdAt: string;
  submittedAt: string | null;
  isArchived?: boolean;
}

export function useEvaluations() {
  return useQuery({
    queryKey: ['evaluations'],
    queryFn: async () => {
      // Cleanup expired drafts before fetching (non-blocking, ignore errors)
      try {
        await supabase.rpc('cleanup_expired_drafts');
      } catch (e) {
        console.warn('Cleanup expired drafts failed:', e);
      }

      const { data, error } = await supabase
        .from('evaluations')
        .select(`
          *,
          branches:branch_id (name),
          evaluation_templates:template_id (name)
        `)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch assessor names
      const assessorIds = [...new Set(data.map(e => e.assessor_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', assessorIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      return data.map(e => ({
        id: e.id,
        branchId: e.branch_id,
        branchName: (e.branches as any)?.name || 'Unknown',
        templateId: e.template_id,
        templateName: (e.evaluation_templates as any)?.name || 'Unknown',
        assessorId: e.assessor_id,
        assessorName: profileMap.get(e.assessor_id) || 'Unknown',
        overallScore: e.overall_score,
        overallPercentage: e.overall_percentage,
        status: e.status as 'draft' | 'submitted' | 'approved',
        createdAt: e.created_at,
        submittedAt: e.submitted_at,
        isArchived: e.is_archived,
      })) as EvaluationWithDetails[];
    },
  });
}

export function useArchivedEvaluations() {
  return useQuery({
    queryKey: ['evaluations-archived'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluations')
        .select(`
          *,
          branches:branch_id (name),
          evaluation_templates:template_id (name)
        `)
        .eq('is_archived', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(e => ({
        id: e.id,
        branchId: e.branch_id,
        branchName: (e.branches as any)?.name || 'Unknown',
        templateId: e.template_id,
        templateName: (e.evaluation_templates as any)?.name || 'Unknown',
        assessorId: e.assessor_id,
        assessorName: 'Assessor',
        overallScore: e.overall_score,
        overallPercentage: e.overall_percentage,
        status: e.status as 'draft' | 'submitted' | 'approved',
        createdAt: e.created_at,
        submittedAt: e.submitted_at,
        isArchived: e.is_archived,
      })) as EvaluationWithDetails[];
    },
  });
}

export function useArchiveEvaluations() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (evaluationIds: string[]) => {
      const { error } = await supabase
        .from('evaluations')
        .update({ is_archived: true })
        .in('id', evaluationIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['evaluations-archived'] });
    },
  });
}

export function useUnarchiveEvaluations() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (evaluationIds: string[]) => {
      const { error } = await supabase
        .from('evaluations')
        .update({ is_archived: false })
        .in('id', evaluationIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['evaluations-archived'] });
    },
  });
}

export function useDeleteEvaluation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (evaluationId: string) => {
      const { error } = await supabase
        .from('evaluations')
        .delete()
        .eq('id', evaluationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['my-evaluations'] });
    },
  });
}

export function useMyEvaluations() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['my-evaluations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('evaluations')
        .select(`
          *,
          branches:branch_id (name, name_ar),
          evaluation_templates:template_id (name)
        `)
        .eq('assessor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return data.map(e => ({
        id: e.id,
        branchId: e.branch_id,
        branchName: (e.branches as any)?.name || 'Unknown',
        branchNameAr: (e.branches as any)?.name_ar,
        templateId: e.template_id,
        templateName: (e.evaluation_templates as any)?.name || 'Unknown',
        overallScore: e.overall_score,
        overallPercentage: e.overall_percentage,
        status: e.status as 'draft' | 'submitted' | 'approved',
        createdAt: e.created_at,
        submittedAt: e.submitted_at,
      }));
    },
    enabled: !!user?.id,
  });
}

export function useEvaluationStats() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['evaluation-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get current month's start
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Count this month's evaluations
      const { count: auditsThisMonth } = await supabase
        .from('evaluations')
        .select('*', { count: 'exact', head: true })
        .eq('assessor_id', user.id)
        .eq('status', 'submitted')
        .gte('submitted_at', monthStart);

      // Average score given
      const { data: evalScores } = await supabase
        .from('evaluations')
        .select('overall_percentage')
        .eq('assessor_id', user.id)
        .eq('status', 'submitted')
        .gte('submitted_at', monthStart);

      const avgScore = evalScores?.length
        ? evalScores.reduce((sum, e) => sum + (Number(e.overall_percentage) || 0), 0) / evalScores.length
        : 0;

      // Findings raised
      const { count: findingsRaised } = await supabase
        .from('non_conformities')
        .select('*, evaluations!inner(assessor_id)', { count: 'exact', head: true })
        .eq('evaluations.assessor_id', user.id);

      return {
        auditsThisMonth: auditsThisMonth || 0,
        avgScoreGiven: Math.round(avgScore),
        findingsRaised: findingsRaised || 0,
        scheduledAudits: 0, // Would need a scheduling table
      };
    },
    enabled: !!user?.id,
  });
}
