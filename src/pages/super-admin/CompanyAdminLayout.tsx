import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ArrowLeft, Building2, Users, GitBranch, CreditCard, Activity, LayoutDashboard, Loader2, FlaskConical, Palette } from 'lucide-react';
import { SuperAdminHeader } from '@/components/SuperAdminHeader';

export default function CompanyAdminLayout() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { language, direction } = useLanguage();
  const isRTL = direction === 'rtl';

  const { data: company, isLoading } = useQuery({
    queryKey: ['super-admin-company', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, name_ar, slug, code, status, is_sandbox, sandbox_of_company_id, workspace_type')
        .eq('id', companyId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const sectorRoute = company?.workspace_type === 'medical' ? '/super-admin/sector/medical' : '/super-admin/sector/food';

  const items = [
    { to: `/super-admin/company/${companyId}`, end: true, icon: LayoutDashboard, en: 'Overview', ar: 'نظرة عامة' },
    { to: `/super-admin/company/${companyId}/users`, icon: Users, en: 'Users', ar: 'المستخدمين' },
    { to: `/super-admin/company/${companyId}/branches`, icon: GitBranch, en: 'Branches', ar: 'الفروع' },
    { to: `/super-admin/company/${companyId}/subscription`, icon: CreditCard, en: 'Subscription', ar: 'الاشتراك' },
    { to: `/super-admin/company/${companyId}/theme`, icon: Palette, en: 'Theme', ar: 'الثيم' },
    { to: `/super-admin/company/${companyId}/audit-logs`, icon: Activity, en: 'Audit Logs', ar: 'سجلات التدقيق' },
  ];

  return (
    <div className="min-h-screen flex sa-warm-bg" dir={direction}>
      <aside className="w-64 m-4 rounded-3xl p-4 flex flex-col gap-2 self-start sticky top-4 max-h-[calc(100vh-2rem)] bg-transparent">
        <div className="relative z-10 mb-2">
          <SuperAdminHeader />
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate(sectorRoute)} className="relative z-10 justify-start gap-2 mb-2 sa-ink hover:bg-white/70">
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          {isRTL ? 'قائمة الشركات' : 'Companies list'}
        </Button>

        <div className="relative z-10 px-2 py-3 mb-2 border-b border-white/40">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 sa-accent" />
            <div className="text-sm font-bold sa-ink truncate">
              {isRTL ? (company?.name_ar || company?.name) : company?.name}
            </div>
          </div>
          <div className="text-[11px] sa-ink-muted">/{company?.slug}</div>
          <div className="flex gap-1 mt-2 flex-wrap">
            <Badge variant={company?.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
              {company?.status}
            </Badge>
            {company?.is_sandbox && company?.sandbox_of_company_id && (
              <Badge className="text-[10px] bg-[#f4a261] hover:bg-[#f4a261] text-white gap-1">
                <FlaskConical className="w-2.5 h-2.5" />
                {isRTL ? 'تجريبية' : 'Sandbox'}
              </Badge>
            )}
            {company?.is_sandbox && !company?.sandbox_of_company_id && (
              <Badge variant="outline" className="text-[10px] border-[#c9b8a3] text-[#6b5b4f] bg-white/60 gap-1">
                <FlaskConical className="w-2.5 h-2.5" />
                {isRTL ? 'تجريبي قديم — غير مرتبط' : 'Legacy — Unlinked'}
              </Badge>
            )}
          </div>
        </div>

        {items.map(it => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className={({ isActive }) => cn(
              'relative z-10 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all overflow-hidden',
              isActive
                ? 'bg-white/85 backdrop-blur-xl backdrop-saturate-150 text-[#1a1410] font-semibold border border-white/70 ring-1 ring-white/40 shadow-[0_10px_30px_-10px_rgba(26,20,16,0.35),inset_0_1px_0_rgba(255,255,255,0.9)]'
                : 'sa-ink-soft hover:bg-white/50 hover:sa-ink'
            )}
          >
            <it.icon className="w-4 h-4" />
            <span>{isRTL ? it.ar : it.en}</span>
          </NavLink>
        ))}
      </aside>

      <main className="flex-1 p-6 overflow-auto">
        {isLoading || !company ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin sa-accent" /></div>
        ) : (
          <Outlet context={{ company }} />
        )}
      </main>
    </div>
  );
}