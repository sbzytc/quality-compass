import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentCompany } from '@/contexts/CurrentCompanyContext';

/**
 * Returns all branch IDs the current user can act on:
 * - Their primary branch (profiles.branch_id)
 * - Any extra branches they supervise (branch_supervisors)
 *
 * Admins/executives/super-admins get `null` (meaning: no branch restriction).
 */
export function useAccessibleBranchIds() {
  const { user, profile, isAdmin, isExecutive, roles } = useAuth();
  const { currentCompany } = useCurrentCompany();
  const unrestricted = isAdmin || isExecutive || roles.includes('super_admin');

  const { data: supervised = [] } = useQuery({
    queryKey: ['my-supervised-branches', user?.id, currentCompany?.id],
    enabled: !!user?.id && !unrestricted,
    queryFn: async () => {
      let q = supabase.from('branch_supervisors').select('branch_id').eq('user_id', user!.id);
      if (currentCompany?.id) q = q.eq('company_id', currentCompany.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map((r: any) => r.branch_id as string);
    },
  });

  if (unrestricted) return { branchIds: null as string[] | null, isRestricted: false };
  const ids = new Set<string>();
  if (profile?.branch_id) ids.add(profile.branch_id);
  supervised.forEach((id) => ids.add(id));
  return { branchIds: [...ids], isRestricted: true };
}

export function canAccessBranch(list: string[] | null, branchId?: string | null) {
  if (list === null) return true;
  if (!branchId) return false;
  return list.includes(branchId);
}