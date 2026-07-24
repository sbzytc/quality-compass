import { useOutletContext, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Users, GitBranch, Activity, FlaskConical, ExternalLink, Copy, Check } from 'lucide-react';
import { useCurrentCompany } from '@/contexts/CurrentCompanyContext';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

export default function CompanyOverviewTab() {
  const { company } = useOutletContext<{ company: any }>();
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const navigate = useNavigate();
  const { switchCompany, refresh } = useCurrentCompany();
  const [copied, setCopied] = useState(false);

  const basePath = company.workspace_type === 'medical' ? '/clinic' : '/';
  const workspacePath = `${basePath}${basePath.endsWith('/') ? '' : '/'}?company=${encodeURIComponent(company.slug)}`;
  const workspaceUrl = `${window.location.origin}${workspacePath}`;

  const openWorkspace = async () => {
    await switchCompany(company.id);
    await refresh();
    navigate(workspacePath);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(workspaceUrl);
    setCopied(true);
    toast({ title: isRTL ? 'تم نسخ الرابط' : 'Link copied' });
    setTimeout(() => setCopied(false), 1500);
  };

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
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold sa-ink flex items-center gap-2 tracking-tight">
          <Building2 className="w-7 h-7 sa-accent" />
          {isRTL ? 'نظرة عامة' : 'Overview'}
        </h1>
        <p className="text-sm sa-ink-soft mt-1">
          {isRTL ? 'ملخص هذه الشركة كما يراه السوبر ادمن' : 'Super Admin summary of this company'}
        </p>
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((it, i) => (
          <div key={it.label} className="sa-card p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              i === 0 ? 'bg-[#f4a261]/15 text-[#c26b3a]' : i === 1 ? 'bg-[#e9c46a]/20 text-[#a67c1a]' : 'bg-[#2a9d8f]/15 text-[#2a7a70]'
            }`}>
              <it.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sa-ink-muted uppercase tracking-wider">{it.label}</div>
              <div className="text-3xl font-bold sa-ink tracking-tight">{it.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Workspace access — dark accent card matching HR reference */}
      <div className="sa-card-dark p-6 relative overflow-hidden">
        <div className="absolute -top-24 -end-24 w-56 h-56 rounded-full bg-gradient-to-br from-[#f4a261]/30 to-transparent blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <ExternalLink className="w-4 h-4 text-[#f4a261]" />
              <h3 className="font-semibold text-white text-lg">{isRTL ? 'الدخول على مساحة عمل الشركة' : 'Open company workspace'}</h3>
            </div>
            <p className="text-xs text-white/60 mb-3 max-w-md">
              {isRTL
                ? 'انتقل إلى مساحة العمل الخاصة بهذه الشركة كما يراها مستخدموها.'
                : "Jump into this company's workspace as its users see it."}
            </p>
            <code className="text-xs bg-white/10 text-white/80 px-2.5 py-1.5 rounded-lg border border-white/10 break-all">
              {workspaceUrl}
            </code>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyLink} className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {isRTL ? 'نسخ الرابط' : 'Copy link'}
            </Button>
            <Button size="sm" onClick={openWorkspace} className="gap-2 bg-[#f4a261] hover:bg-[#e8935a] text-[#1a1410] font-semibold">
              <ExternalLink className="w-4 h-4" />
              {isRTL ? 'فتح مساحة العمل' : 'Open workspace'}
            </Button>
          </div>
        </div>
      </div>

      {/* Details card */}
      <div className="sa-card p-6">
        <h3 className="text-sm font-semibold uppercase tracking-widest sa-ink-muted mb-4">
          {isRTL ? 'تفاصيل الشركة' : 'Company details'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8 text-sm">
          <Row label={isRTL ? 'الاسم' : 'Name'} value={company.name} />
          <Row label={isRTL ? 'الاسم بالعربية' : 'Arabic name'} value={company.name_ar || '—'} />
          <Row
            label={isRTL ? 'كود الشركة' : 'Company code'}
            value={
              company.code ? (
                <button
                  onClick={() => { navigator.clipboard.writeText(company.code); toast({ title: isRTL ? 'تم نسخ الكود' : 'Code copied' }); }}
                  className="font-mono font-bold tracking-wider bg-[#c26b3a]/10 text-[#c26b3a] px-2 py-0.5 rounded border border-[#c26b3a]/20 hover:bg-[#c26b3a]/20 transition-colors"
                  title={isRTL ? 'اضغط للنسخ' : 'Click to copy'}
                >
                  {company.code}
                </button>
              ) : '—'
            }
          />
          <Row label={isRTL ? 'المعرف' : 'Slug'} value={`/${company.slug}`} />
          <Row label={isRTL ? 'نوع مساحة العمل' : 'Workspace type'} value={company.workspace_type} />
          <Row
            label={isRTL ? 'الحالة' : 'Status'}
            value={<Badge variant={company.status === 'active' ? 'default' : 'secondary'}>{company.status}</Badge>}
          />
          <Row
            label={isRTL ? 'النوع' : 'Type'}
            value={
              company.is_sandbox && company.sandbox_of_company_id
                ? <Badge className="bg-[#f4a261] hover:bg-[#f4a261] text-white gap-1"><FlaskConical className="w-3 h-3" />{isRTL ? 'تجريبية' : 'Sandbox'}</Badge>
                : company.is_sandbox && !company.sandbox_of_company_id
                  ? <Badge variant="outline" className="border-[#c9b8a3] text-[#6b5b4f] bg-white/60 gap-1"><FlaskConical className="w-3 h-3" />{isRTL ? 'تجريبي قديم — غير مرتبط' : 'Legacy — Unlinked'}</Badge>
                  : <Badge variant="outline">{isRTL ? 'حية' : 'Live'}</Badge>
            }
          />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 border-b border-[#f0e4d2] last:border-0">
      <span className="sa-ink-muted text-xs uppercase tracking-wider">{label}</span>
      <span className="font-medium sa-ink">{value}</span>
    </div>
  );
}