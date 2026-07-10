import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, GitBranch, Activity, FlaskConical } from 'lucide-react';

export default function CompanyOverviewTab() {
  const { company } = useOutletContext<{ company: any }>();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const { data: stats } = useQuery({
    queryKey: ['super-admin-company-stats', company.id],
    queryFn: async () => {
      const [{ count: branchCount }, { count: userCount }, { count: logCount }] = await Promise.all([
        supabase.from('branches').select('id', { count: 'exact', head: true }).eq('company_id', company.id),
        supabase.from('company_users').select('id', { count: 'exact', head: true }).eq('company_id', company.id).eq('is_active', true),
        supabase.from('audit_logs').select('id', { count: 'exact', head: true }).eq('company_id', company.id),
      ]);
      return { branchCount: branchCount ?? 0, userCount: userCount ?? 0, logCount: logCount ?? 0 };
    },
  });

  const items = [
    { icon: GitBranch, label: isRTL ? 'الفروع' : 'Branches', value: stats?.branchCount ?? '—' },
    { icon: Users, label: isRTL ? 'المستخدمين النشطين' : 'Active users', value: stats?.userCount ?? '—' },
    { icon: Activity, label: isRTL ? 'سجلات التدقيق' : 'Audit logs', value: stats?.logCount ?? '—' },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-6 h-6 text-primary" />
          {isRTL ? 'نظرة عامة' : 'Overview'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isRTL ? 'ملخص هذه الشركة كما يراه السوبر ادمن' : 'Super Admin summary of this company'}
        </p>
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-sm">
          <Row label={isRTL ? 'الاسم' : 'Name'} value={company.name} />
          <Row label={isRTL ? 'الاسم بالعربية' : 'Arabic name'} value={company.name_ar || '—'} />
          <Row label={isRTL ? 'المعرف' : 'Slug'} value={`/${company.slug}`} />
          <Row label={isRTL ? 'نوع مساحة العمل' : 'Workspace type'} value={company.workspace_type} />
          <Row
            label={isRTL ? 'الحالة' : 'Status'}
            value={<Badge variant={company.status === 'active' ? 'default' : 'secondary'}>{company.status}</Badge>}
          />
          <Row
            label={isRTL ? 'النوع' : 'Type'}
            value={company.is_sandbox
              ? <Badge className="bg-amber-500 hover:bg-amber-500 text-white gap-1"><FlaskConical className="w-3 h-3" />{isRTL ? 'تجريبية' : 'Sandbox'}</Badge>
              : <Badge variant="outline">{isRTL ? 'حية' : 'Live'}</Badge>}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map(it => (
          <Card key={it.label} className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <it.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{it.label}</div>
              <div className="text-2xl font-bold">{it.value}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}