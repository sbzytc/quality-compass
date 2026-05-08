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

export function useSystemLogs(filters?: { entityType?: string; limit?: number; companyId?: string | null }) {
  return useQuery({
    queryKey: ['system-logs', filters],
    queryFn: async () => {
      const limit = filters?.limit || 200;
      let query = (supabase as any)
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (filters?.entityType && filters.entityType !== 'all') {
        query = query.eq('entity_type', filters.entityType);
      }

      let auditQuery = (supabase as any)
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (filters?.companyId) auditQuery = auditQuery.eq('company_id', filters.companyId);
      if (filters?.entityType && filters.entityType !== 'all') {
        auditQuery = auditQuery.eq('entity_type', filters.entityType);
      }

      const [{ data: sys, error: sysErr }, { data: aud, error: audErr }] = await Promise.all([query, auditQuery]);
      if (sysErr) throw sysErr;
      // audit_logs may return permission-denied for non-admins — ignore that error silently
      if (audErr) console.warn('audit_logs read skipped:', audErr.message);

      const sysMapped = (sys || []).map((log: any) => ({
        id: log.id,
        userId: log.user_id,
        userName: log.user_name,
        action: log.action,
        entityType: log.entity_type,
        entityId: log.entity_id,
        details: log.details,
        createdAt: log.created_at,
      })) as SystemLog[];

      const audMapped = (aud || []).map((log: any) => ({
        id: `audit_${log.id}`,
        userId: log.actor_user_id,
        userName: null,
        action: log.action,
        entityType: log.entity_type || 'audit',
        entityId: log.entity_id,
        details: log.details,
        createdAt: log.created_at,
      })) as SystemLog[];

      return [...sysMapped, ...audMapped]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
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
