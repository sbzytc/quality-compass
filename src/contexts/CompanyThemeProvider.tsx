import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from '@/contexts/CurrentCompanyContext';
import { useQuery } from '@tanstack/react-query';

export interface CompanyTheme {
  colors?: {
    primary?: string;              // HSL triple: "217 72% 42%"
    primaryForeground?: string;
    accent?: string;
    accentForeground?: string;
    background?: string;
    foreground?: string;
    ring?: string;
  };
  radius?: string;                 // e.g. "0.875rem"
  shadows?: {
    soft?: string;
    medium?: string;
  };
}

const VAR_MAP: Record<string, (t: CompanyTheme) => string | undefined> = {
  '--primary':             (t) => t.colors?.primary,
  '--primary-foreground':  (t) => t.colors?.primaryForeground,
  '--accent':              (t) => t.colors?.accent,
  '--accent-foreground':   (t) => t.colors?.accentForeground,
  '--background':          (t) => t.colors?.background,
  '--foreground':          (t) => t.colors?.foreground,
  '--ring':                (t) => t.colors?.ring || t.colors?.primary,
  '--radius':              (t) => t.radius,
  '--shadow-soft':         (t) => t.shadows?.soft,
  '--shadow-medium':       (t) => t.shadows?.medium,
};

function applyTheme(theme: CompanyTheme | null) {
  const root = document.documentElement;
  // Clear previously-set inline overrides so we don't leak between companies.
  Object.keys(VAR_MAP).forEach((v) => root.style.removeProperty(v));
  if (!theme) return;
  for (const [cssVar, get] of Object.entries(VAR_MAP)) {
    const val = get(theme);
    if (val) root.style.setProperty(cssVar, val);
  }
}

export function CompanyThemeProvider({ children }: { children: React.ReactNode }) {
  const { currentCompany } = useCurrentCompany();
  const companyId = currentCompany?.id ?? null;
  const parentId =
    currentCompany?.is_sandbox && currentCompany?.sandbox_of_company_id
      ? currentCompany.sandbox_of_company_id
      : null;

  const { data } = useQuery({
    queryKey: ['company-theme', companyId, parentId],
    enabled: !!companyId,
    queryFn: async () => {
      const ids = [companyId!, parentId].filter(Boolean) as string[];
      const { data, error } = await supabase
        .from('companies')
        .select('id, theme')
        .in('id', ids);
      if (error) throw error;
      const self = data?.find((r) => r.id === companyId);
      const parent = parentId ? data?.find((r) => r.id === parentId) : null;
      const effective = (self?.theme as CompanyTheme | null) ?? (parent?.theme as CompanyTheme | null) ?? null;
      return effective;
    },
  });

  useEffect(() => {
    applyTheme((data ?? null) as CompanyTheme | null);
    return () => applyTheme(null);
  }, [data, companyId]);

  return <>{children}</>;
}