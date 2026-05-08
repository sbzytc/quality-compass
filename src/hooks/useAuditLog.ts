import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Write to public.audit_logs. Visible to:
 *  - Company admins for their own company_id (RLS)
 *  - Super admins for everything (RLS)
 */
export function useAuditLog() {
  const { user } = useAuth();
  return useCallback(
    async (params: {
      action: string;
      entityType?: string;
      entityId?: string | null;
      companyId?: string | null;
      details?: Record<string, any>;
    }) => {
      if (!user) return;
      try {
        await supabase.from('audit_logs').insert({
          actor_user_id: user.id,
          action: params.action,
          entity_type: params.entityType ?? null,
          entity_id: params.entityId ?? null,
          company_id: params.companyId ?? null,
          details: params.details ?? {},
        });
      } catch (e) {
        console.error('audit_logs insert failed', e);
      }
    },
    [user]
  );
}