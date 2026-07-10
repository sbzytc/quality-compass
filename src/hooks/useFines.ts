import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FineViolation {
  id: string;
  branch_id: string;
  branch_name: string;
  branch_name_ar: string | null;
  criterion_name: string;
  criterion_name_ar: string | null;
  violation_value: number;
  created_at: string;
  status: string;
  assigned_to: string | null;
  days_since: number;
}

export interface BranchFinesSummary {
  branch_id: string;
  branch_name: string;
  branch_name_ar: string | null;
  total_value: number;
  count: number;
  open_count: number;
  violations: FineViolation[];
}

function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - then) / (1000 * 60 * 60 * 24)));
}

/**
 * Fetch non-conformities that carry a monetary violation value (fines),
 * grouped per branch. Optionally scoped to a single branch.
 */
export function useBranchFines(branchId?: string) {
  return useQuery({
    queryKey: ['branch-fines', branchId ?? 'all'],
    queryFn: async (): Promise<BranchFinesSummary[]> => {
      let query = supabase
        .from('non_conformities')
        .select(`
          id,
          branch_id,
          created_at,
          status,
          assigned_to,
          template_criteria!inner(name, name_ar, violation_value),
          branches!inner(id, name, name_ar)
        `)
        .gt('template_criteria.violation_value', 0)
        .order('created_at', { ascending: false });

      if (branchId) query = query.eq('branch_id', branchId);

      const { data, error } = await query;
      if (error) throw error;

      const map = new Map<string, BranchFinesSummary>();
      for (const row of (data as any[]) || []) {
        const tc = row.template_criteria || {};
        const br = row.branches || {};
        const value = Number(tc.violation_value) || 0;
        if (value <= 0) continue;

        const bid = row.branch_id;
        if (!map.has(bid)) {
          map.set(bid, {
            branch_id: bid,
            branch_name: br.name || '',
            branch_name_ar: br.name_ar || null,
            total_value: 0,
            count: 0,
            open_count: 0,
            violations: [],
          });
        }
        const summary = map.get(bid)!;
        const isOpen = row.status !== 'resolved';
        // Only unresolved fines count toward branch's outstanding total.
        if (isOpen) {
          summary.total_value += value;
          summary.open_count += 1;
        }
        summary.count += 1;
        summary.violations.push({
          id: row.id,
          branch_id: bid,
          branch_name: br.name || '',
          branch_name_ar: br.name_ar || null,
          criterion_name: tc.name || '',
          criterion_name_ar: tc.name_ar || null,
          violation_value: value,
          created_at: row.created_at,
          status: row.status,
          assigned_to: row.assigned_to,
          days_since: daysSince(row.created_at),
        });
      }

      return Array.from(map.values()).sort((a, b) => b.total_value - a.total_value);
    },
  });
}
