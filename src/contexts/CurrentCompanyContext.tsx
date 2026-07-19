import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';


export type SectorType = 'fnb' | 'clinic' | 'retail' | 'factory' | 'other';
export type WorkspaceType = 'medical' | 'food';
export type PrimaryModule = 'medical_clinics' | 'food_restaurants';
export type CompanyRole = 'owner' | 'admin' | 'member';

export interface Company {
  id: string;
  name: string;
  name_ar: string | null;
  slug: string;
  sector_type: SectorType;
  workspace_type: WorkspaceType;
  primary_module: PrimaryModule;
  logo_url: string | null;
  status: string;
  is_sandbox?: boolean;
  sandbox_of_company_id?: string | null;
}

export interface CompanyMembership extends Company {
  membership_role: CompanyRole;
}

interface CurrentCompanyContextValue {
  currentCompany: Company | null;
  companies: CompanyMembership[];
  loading: boolean;
  switchCompany: (companyId: string) => Promise<void>;
  workspaceType: WorkspaceType | null;
  primaryModule: PrimaryModule | null;
  /** @deprecated use workspaceType. Kept for legacy call sites. */
  hasModule: (code: string) => boolean;
  isCompanyAdmin: boolean;
  isSandbox: boolean;
  sandboxOfCompanyId: string | null;
  refresh: () => Promise<void>;
}

const STORAGE_KEY = 'rasdah.current_company_id';
const CurrentCompanyContext = createContext<CurrentCompanyContextValue | undefined>(undefined);

export function CurrentCompanyProvider({ children }: { children: ReactNode }) {
  const { user, roles } = useAuth();
  const isSuperAdmin = roles.includes('super_admin');
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<CompanyMembership[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCompanies = useCallback(async () => {
    if (!user) {
      setCompanies([]);
      setCurrentCompany(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    let list: CompanyMembership[] = [];

    if (isSuperAdmin) {
      // Super admin sees ALL companies
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, name_ar, slug, sector_type, workspace_type, primary_module, logo_url, status, is_sandbox, sandbox_of_company_id')
        .is('deleted_at', null)
        .order('name');
      if (error) {
        console.error('Error loading companies (super admin):', error);
        setLoading(false);
        return;
      }
      list = (data || []).map((c: any) => ({ ...c, membership_role: 'admin' as CompanyRole }));
    } else {
      const { data, error } = await supabase
        .from('company_users')
        .select('role, companies(id, name, name_ar, slug, sector_type, workspace_type, primary_module, logo_url, status, is_sandbox, sandbox_of_company_id)')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) {
        console.error('Error loading companies:', error);
        setLoading(false);
        return;
      }

      list = (data || [])
        .filter((row: any) => row.companies)
        .map((row: any) => ({ ...row.companies, membership_role: row.role }));
    }

    setCompanies(list);

    // Pick current: URL ?company=<slug|id> > stored > first
    const params = new URLSearchParams(window.location.search);
    const urlKey = params.get('company');
    const stored = localStorage.getItem(STORAGE_KEY);
    const picked =
      (urlKey && (list.find(c => c.slug === urlKey) || list.find(c => c.id === urlKey))) ||
      list.find(c => c.id === stored) ||
      list[0] ||
      null;
    setCurrentCompany(picked);

    if (picked) {
      localStorage.setItem(STORAGE_KEY, picked.id);
    }
    setLoading(false);
  }, [user, isSuperAdmin]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  // Watch ?company= URL param so in-app navigation (e.g. super-admin opening a
  // company workspace) actually switches the active company.
  useEffect(() => {
    if (!companies.length) return;
    const params = new URLSearchParams(window.location.search);
    const urlKey = params.get('company');
    if (!urlKey) return;
    const match = companies.find(c => c.slug === urlKey) || companies.find(c => c.id === urlKey);
    if (match && match.id !== currentCompany?.id) {
      setCurrentCompany(match);
      localStorage.setItem(STORAGE_KEY, match.id);
    }
  }, [companies, currentCompany?.id]);

  const switchCompany = useCallback(async (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    if (!company) return;
    setCurrentCompany(company);
    localStorage.setItem(STORAGE_KEY, companyId);
  }, [companies]);

  const workspaceType = currentCompany?.workspace_type ?? null;
  const primaryModule = currentCompany?.primary_module ?? null;
  const isSandbox = !!currentCompany?.is_sandbox;
  const sandboxOfCompanyId = currentCompany?.sandbox_of_company_id ?? null;

  // Legacy compatibility: hasModule('medical') → workspace_type === 'medical'
  const hasModule = useCallback(
    (code: string) => workspaceType === code || primaryModule === code,
    [workspaceType, primaryModule]
  );

  const isCompanyAdmin = !!currentCompany &&
    !!companies.find(c => c.id === currentCompany.id && (c.membership_role === 'owner' || c.membership_role === 'admin'));

  return (
    <CurrentCompanyContext.Provider
      value={{
        currentCompany,
        companies,
        loading,
        switchCompany,
        workspaceType,
        primaryModule,
        hasModule,
        isCompanyAdmin,
        isSandbox,
        sandboxOfCompanyId,
        refresh: loadCompanies,
      }}
    >
      {children}
    </CurrentCompanyContext.Provider>
  );
}

export function useCurrentCompany() {
  const ctx = useContext(CurrentCompanyContext);
  if (!ctx) throw new Error('useCurrentCompany must be used within CurrentCompanyProvider');
  return ctx;
}
