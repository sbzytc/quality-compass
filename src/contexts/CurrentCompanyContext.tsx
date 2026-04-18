import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';


export type SectorType = 'fnb' | 'clinic' | 'retail' | 'factory' | 'other';
export type CompanyRole = 'owner' | 'admin' | 'member';

export interface Company {
  id: string;
  name: string;
  name_ar: string | null;
  slug: string;
  sector_type: SectorType;
  logo_url: string | null;
  status: string;
}

export interface CompanyMembership extends Company {
  membership_role: CompanyRole;
}

export interface ModuleInfo {
  code: string;
  name: string;
  name_ar: string | null;
  enabled: boolean;
  is_core: boolean;
}

interface CurrentCompanyContextValue {
  currentCompany: Company | null;
  companies: CompanyMembership[];
  modules: ModuleInfo[];
  loading: boolean;
  switchCompany: (companyId: string) => Promise<void>;
  hasModule: (code: string) => boolean;
  isCompanyAdmin: boolean;
  refresh: () => Promise<void>;
}

const STORAGE_KEY = 'rasdah.current_company_id';
const CurrentCompanyContext = createContext<CurrentCompanyContextValue | undefined>(undefined);

export function CurrentCompanyProvider({ children }: { children: ReactNode }) {
  const { user, roles } = useAuth();
  const isSuperAdmin = roles.includes('super_admin');
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<CompanyMembership[]>([]);
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const loadModules = useCallback(async (companyId: string) => {
    const { data, error } = await supabase
      .from('company_modules')
      .select('enabled, modules(code, name, name_ar, is_core)')
      .eq('company_id', companyId);

    if (error) {
      console.error('Error loading modules:', error);
      setModules([]);
      return;
    }

    const list: ModuleInfo[] = (data || []).map((row: any) => ({
      code: row.modules.code,
      name: row.modules.name,
      name_ar: row.modules.name_ar,
      is_core: row.modules.is_core,
      enabled: row.enabled || row.modules.is_core,
    }));
    setModules(list);
  }, []);

  const loadCompanies = useCallback(async () => {
    if (!user) {
      setCompanies([]);
      setCurrentCompany(null);
      setModules([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    let list: CompanyMembership[] = [];

    if (isSuperAdmin) {
      // Super admin sees ALL companies
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, name_ar, slug, sector_type, logo_url, status')
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
        .select('role, companies(id, name, name_ar, slug, sector_type, logo_url, status)')
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

    // Pick current: stored > first
    const stored = localStorage.getItem(STORAGE_KEY);
    const picked = list.find(c => c.id === stored) || list[0] || null;
    setCurrentCompany(picked);

    if (picked) {
      localStorage.setItem(STORAGE_KEY, picked.id);
      await loadModules(picked.id);
    }
    setLoading(false);
  }, [user, isSuperAdmin, loadModules]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const switchCompany = useCallback(async (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    if (!company) return;
    setCurrentCompany(company);
    localStorage.setItem(STORAGE_KEY, companyId);
    await loadModules(companyId);
  }, [companies, loadModules]);

  const hasModule = useCallback(
    (code: string) => modules.some(m => m.code === code && (m.enabled || m.is_core)),
    [modules]
  );

  const isCompanyAdmin = !!currentCompany &&
    !!companies.find(c => c.id === currentCompany.id && (c.membership_role === 'owner' || c.membership_role === 'admin'));

  return (
    <CurrentCompanyContext.Provider
      value={{
        currentCompany,
        companies,
        modules,
        loading,
        switchCompany,
        hasModule,
        isCompanyAdmin,
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
