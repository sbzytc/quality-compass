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
        .select('id, name, name_ar, slug, status, is_sandbox, sandbox_of_company_id, workspace_type')
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
    <div className="min-h-screen flex bg-gradient-to-br from-[#edf3ff] to-[#e8eff9]" dir={direction}>
      <aside className="w-64 border-e border-border/60 bg-white/60 backdrop-blur-xl p-4 flex flex-col gap-2">
        <div className="mb-2">
          <SuperAdminHeader />
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate(sectorRoute)} className="justify-start gap-2 mb-2">
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          {isRTL ? 'قائمة الشركات' : 'Companies list'}
        </Button>

        <div className="px-2 py-3 mb-2 border-b border-border/40">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-primary" />
            <div className="text-sm font-bold text-foreground truncate">
              {isRTL ? (company?.name_ar || company?.name) : company?.name}
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground">/{company?.slug}</div>
          <div className="flex gap-1 mt-2 flex-wrap">
            <Badge variant={company?.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
              {company?.status}
            </Badge>
            {company?.is_sandbox && company?.sandbox_of_company_id && (
              <Badge className="text-[10px] bg-amber-500 hover:bg-amber-500 text-white gap-1">
                <FlaskConical className="w-2.5 h-2.5" />
                {isRTL ? 'تجريبية' : 'Sandbox'}
              </Badge>
            )}
            {company?.is_sandbox && !company?.sandbox_of_company_id && (
              <Badge variant="outline" className="text-[10px] border-slate-400/70 text-slate-600 bg-white/60 gap-1">
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
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              isActive ? 'bg-primary/10 text-primary font-medium' : 'text-foreground/70 hover:bg-white/70'
            )}
          >
            <it.icon className="w-4 h-4" />
            <span>{isRTL ? it.ar : it.en}</span>
          </NavLink>
        ))}
      </aside>

      <main className="flex-1 p-6 overflow-auto">
        {isLoading || !company ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <Outlet context={{ company }} />
        )}
      </main>
    </div>
  );
}