import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SystemLog {
  id: string;
  userId: string;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, any> | null;
  createdAt: string;
}

export function useSystemLogs(filters?: { entityType?: string; limit?: number }) {
  return useQuery({
    queryKey: ['system-logs', filters],
    queryFn: async () => {
      let query = (supabase as any)
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 200);

      if (filters?.entityType && filters.entityType !== 'all') {
        query = query.eq('entity_type', filters.entityType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((log: any) => ({
        id: log.id,
        userId: log.user_id,
        userName: log.user_name,
        action: log.action,
        entityType: log.entity_type,
        entityId: log.entity_id,
        details: log.details,
        createdAt: log.created_at,
      })) as SystemLog[];
    },
  });
}

export function useLogAction() {
  const { user, profile } = useAuth();

  return async (action: string, entityType: string, entityId?: string, details?: Record<string, any>) => {
    if (!user) return;
    try {
      await (supabase as any).from('system_logs').insert({
        user_id: user.id,
        user_name: profile?.full_name || user.email,
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        details: details || null,
      });
    } catch (e) {
      console.error('Failed to write system log:', e);
    }
  };
}
