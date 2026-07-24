import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CompanyTheme } from '@/contexts/CompanyThemeProvider';

export type SiteTheme = CompanyTheme;

const VAR_MAP: Record<string, (t: SiteTheme) => string | undefined> = {
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

function applyTheme(theme: SiteTheme | null) {
  const root = document.documentElement;
  Object.keys(VAR_MAP).forEach((v) => root.style.removeProperty(v));
  if (!theme) return;
  for (const [cssVar, get] of Object.entries(VAR_MAP)) {
    const val = get(theme);
    if (val) root.style.setProperty(cssVar, val);
  }
}

/**
 * Applies the public "landing" site theme stored in `public.site_settings`.
 * Mount this ONLY on the public marketing site (LandingPage) — it is
 * intentionally independent from the per-company theme applied inside the app.
 */
export function LandingThemeProvider({ children }: { children: React.ReactNode }) {
  const { data } = useQuery({
    queryKey: ['site-theme', 'landing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('theme')
        .eq('key', 'landing')
        .maybeSingle();
      if (error) throw error;
      return (data?.theme as SiteTheme | null) ?? null;
    },
  });

  useEffect(() => {
    applyTheme((data ?? null) as SiteTheme | null);
    return () => applyTheme(null);
  }, [data]);

  return <>{children}</>;
}