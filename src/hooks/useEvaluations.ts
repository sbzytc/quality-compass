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
}

export function useEvaluations() {
  return useQuery({
    queryKey: ['evaluations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluations')
        .select(`
          *,
          branches:branch_id (name),
          evaluation_templates:template_id (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(e => ({
        id: e.id,
        branchId: e.branch_id,
        branchName: (e.branches as any)?.name || 'Unknown',
        templateId: e.template_id,
        templateName: (e.evaluation_templates as any)?.name || 'Unknown',
        assessorId: e.assessor_id,
        assessorName: 'Assessor', // Would need to join with profiles
        overallScore: e.overall_score,
        overallPercentage: e.overall_percentage,
        status: e.status as 'draft' | 'submitted' | 'approved',
        createdAt: e.created_at,
        submittedAt: e.submitted_at,
      })) as EvaluationWithDetails[];
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
