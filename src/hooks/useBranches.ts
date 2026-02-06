import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getScoreLevel, ScoreLevel } from '@/types';

export interface BranchWithScore {
  id: string;
  name: string;
  nameAr?: string;
  region: string;
  regionId?: string;
  city: string;
  overallScore: number;
  lastEvaluationDate: string | null;
  status: ScoreLevel;
  isActive: boolean;
}

export function useBranches() {
  return useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      // Fetch branches with their regions
      const { data: branches, error } = await supabase
        .from('branches')
        .select(`
          *,
          regions:region_id (
            id,
            name,
            name_ar
          )
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // Get latest evaluation for each branch
      const branchIds = branches.map(b => b.id);
      const { data: evaluations } = await supabase
        .from('evaluations')
        .select('branch_id, overall_percentage, created_at')
        .in('branch_id', branchIds)
        .eq('status', 'submitted')
        .order('created_at', { ascending: false });

      // Create a map of latest evaluations per branch
      const latestEvalMap = new Map<string, { score: number; date: string }>();
      evaluations?.forEach(e => {
        if (!latestEvalMap.has(e.branch_id)) {
          latestEvalMap.set(e.branch_id, {
            score: Number(e.overall_percentage) || 0,
            date: e.created_at
          });
        }
      });

      return branches.map(branch => {
        const evaluation = latestEvalMap.get(branch.id);
        const score = evaluation?.score || 0;
        
        return {
          id: branch.id,
          name: branch.name,
          nameAr: branch.name_ar,
          region: (branch.regions as any)?.name || 'Unknown',
          regionId: branch.region_id,
          city: branch.city || '',
          overallScore: score,
          lastEvaluationDate: evaluation?.date || null,
          status: getScoreLevel(score),
          isActive: branch.is_active,
        } as BranchWithScore;
      });
    },
  });
}

export function useBranch(branchId: string) {
  return useQuery({
    queryKey: ['branch', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select(`
          *,
          regions:region_id (
            id,
            name,
            name_ar
          )
        `)
        .eq('id', branchId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!branchId,
  });
}

export function useRegions() {
  return useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regions')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    },
  });
}

export function useBranchStats() {
  return useQuery({
    queryKey: ['branch-stats'],
    queryFn: async () => {
      // Get total branches
      const { count: totalBranches } = await supabase
        .from('branches')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get all submitted evaluations with scores
      const { data: evaluations } = await supabase
        .from('evaluations')
        .select('overall_percentage')
        .eq('status', 'submitted');

      const avgScore = evaluations?.length 
        ? evaluations.reduce((sum, e) => sum + (Number(e.overall_percentage) || 0), 0) / evaluations.length
        : 0;

      // Get open findings count
      const { count: openFindings } = await supabase
        .from('non_conformities')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');

      // Get overdue actions
      const { count: overdueActions } = await supabase
        .from('corrective_actions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'overdue');

      return {
        totalBranches: totalBranches || 0,
        averageScore: Math.round(avgScore),
        openFindings: openFindings || 0,
        overdueActions: overdueActions || 0,
      };
    },
  });
}
