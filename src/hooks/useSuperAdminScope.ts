import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type SuperAdminScope = 'all' | 'food' | 'medical';

export function useSuperAdminScope() {
  const { user, roles } = useAuth();
  const isSuperAdmin = roles.includes('super_admin');

  const query = useQuery({
    queryKey: ['super-admin-scope', user?.id],
    enabled: !!user && isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('super_admin_scopes')
        .select('scope')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.scope as SuperAdminScope | undefined) ?? 'all';
    },
  });

  return {
    scope: (query.data ?? 'all') as SuperAdminScope,
    loading: query.isLoading,
    isSuperAdmin,
    canAccessSector: (sector: 'food' | 'medical') => {
      if (!isSuperAdmin) return false;
      const s = query.data ?? 'all';
      return s === 'all' || s === sector;
    },
  };
}