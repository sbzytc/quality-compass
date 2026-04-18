import { useCurrentCompany } from '@/contexts/CurrentCompanyContext';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Centralized helper for multi-tenant scoping.
 *
 * - `companyId`: the active workspace id (or null while loading / for super-admins with no workspace selected)
 * - `isSuperAdmin`: bypasses tenant filtering at the UI layer (RLS still enforces server-side)
 * - `scopeKey`: include in react-query keys so caches don't bleed between workspaces
 * - `applyCompanyFilter(query)`: chain on a Supabase query builder to filter by company_id
 * - `withCompanyId(payload)`: spread into insert payloads to attach company_id
 */
export function useCompanyScope() {
  const { currentCompany, loading } = useCurrentCompany();
  const { roles } = useAuth();
  const isSuperAdmin = roles.includes('super_admin');
  const companyId = currentCompany?.id ?? null;

  function applyCompanyFilter<T extends { eq: (col: string, val: any) => T }>(query: T): T {
    if (companyId && !isSuperAdmin) {
      return query.eq('company_id', companyId);
    }
    if (companyId && isSuperAdmin) {
      // Super admin viewing a specific workspace
      return query.eq('company_id', companyId);
    }
    return query;
  }

  function withCompanyId<T extends Record<string, any>>(payload: T): T & { company_id: string | null } {
    return { ...payload, company_id: companyId };
  }

  return {
    companyId,
    isSuperAdmin,
    loading,
    scopeKey: companyId ?? 'no-company',
    applyCompanyFilter,
    withCompanyId,
  };
}
