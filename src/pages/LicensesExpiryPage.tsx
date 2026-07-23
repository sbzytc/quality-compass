import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyScope } from '@/hooks/useCompanyScope';
import { useAccessibleBranchIds } from '@/hooks/useAccessibleBranchIds';
import { useScopedBranchId } from '@/contexts/BranchScopeContext';
import { BranchScopeSwitcher } from '@/components/BranchScopeSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CalendarClock, FileText, Loader2, ShieldCheck } from 'lucide-react';

type Item = {
  branchId: string;
  branchName: string;
  type: string;
  label: string;
  labelAr: string;
  number?: string;
  provider?: string;
  expiresAt: string;
  daysLeft: number;
};

const DOC_META: Record<string, { en: string; ar: string; kind: 'license' | 'contract' }> = {
  municipality: { en: 'Municipality license', ar: 'رخصة البلدية', kind: 'license' },
  civil_defense: { en: 'Civil defense license', ar: 'رخصة الدفاع المدني', kind: 'license' },
  signboard: { en: 'Signboard license', ar: 'ترخيص اللوحة الإعلانية', kind: 'license' },
  pest_control: { en: 'Pest control contract', ar: 'عقد مكافحة الحشرات', kind: 'contract' },
  cameras_contract: { en: 'Cameras contract', ar: 'عقد الكاميرات', kind: 'contract' },
  filters_contract: { en: 'Filters contract', ar: 'عقد الفلاتر', kind: 'contract' },
};

function daysBetween(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  d.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function LicensesExpiryPage() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { profile, isBranchManager, isAdmin, isExecutive } = useAuth();
  const { companyId, scopeKey } = useCompanyScope();
  const { branchIds: accessibleBranchIds } = useAccessibleBranchIds();
  const scopedBranchId = useScopedBranchId();

  const { data: branches = [], isLoading } = useQuery({
      queryKey: ['branches-expiry', scopeKey, (accessibleBranchIds || []).join(',')],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from('branches')
        .select('id, name, name_ar, documents, company_id')
        .eq('company_id', companyId!);
        // Branch manager (not admin/executive) sees only their primary + supervised branches
        if (isBranchManager && !isAdmin && !isExecutive && accessibleBranchIds) {
          if (accessibleBranchIds.length === 0) return [];
          q = q.in('id', accessibleBranchIds);
        }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const items: Item[] = useMemo(() => {
    const out: Item[] = [];
    const filtered = scopedBranchId
      ? (branches as any[]).filter(b => b.id === scopedBranchId)
      : (branches as any[]);
    for (const br of filtered) {
      const docs = br.documents || {};
      for (const [key, meta] of Object.entries(DOC_META)) {
        const d = docs[key];
        if (!d) continue;
        if (key === 'signboard' && d.has === false) continue;
        const exp = d.expires_at;
        if (!exp) continue;
        out.push({
          branchId: br.id,
          branchName: isRTL ? (br.name_ar || br.name) : br.name,
          type: key,
          label: meta.en,
          labelAr: meta.ar,
          number: d.number,
          provider: d.provider,
          expiresAt: exp,
          daysLeft: daysBetween(exp),
        });
      }
    }
    return out.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [branches, isRTL, scopedBranchId]);

  const expired = items.filter(i => i.daysLeft < 0);
  const soon = items.filter(i => i.daysLeft >= 0 && i.daysLeft <= 30);
  const ok = items.filter(i => i.daysLeft > 30);

  const statusFor = (d: number) => {
    if (d < 0) return { color: 'bg-red-100 text-red-700 border-red-300', text: isRTL ? 'منتهية' : 'Expired' };
    if (d <= 30) return { color: 'bg-red-100 text-red-700 border-red-300', text: isRTL ? `تحذير - باقي ${d} يوم` : `Warning - ${d} days left` };
    if (d <= 90) return { color: 'bg-amber-100 text-amber-700 border-amber-300', text: isRTL ? `باقي ${d} يوم` : `${d} days left` };
    return { color: 'bg-emerald-100 text-emerald-700 border-emerald-300', text: isRTL ? `باقي ${d} يوم` : `${d} days left` };
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-primary" />
            {isRTL ? 'الرخص و العقود - متابعة انتهاء الصلاحية' : 'Licenses & Contracts - Expiry Tracker'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL ? 'تنبيه تلقائي قبل انتهاء الرخصة أو العقد بشهر' : 'Automatic warning one month before any license or contract expires'}
          </p>
        </div>
        <BranchScopeSwitcher />
      </div>

      {(expired.length > 0 || soon.length > 0) && (
        <Card className="p-4 border-red-300 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-red-800">
                {isRTL ? 'يوجد عناصر تحتاج انتباهك' : 'Items requiring your attention'}
              </div>
              <div className="text-red-700 mt-1">
                {isRTL
                  ? `${expired.length} منتهية، و ${soon.length} ستنتهي خلال 30 يوم`
                  : `${expired.length} expired, ${soon.length} expiring within 30 days`}
              </div>
            </div>
          </div>
        </Card>
      )}

      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
          {isRTL ? 'لا توجد رخص أو عقود مسجلة بعد.' : 'No licenses or contracts recorded yet.'}
        </Card>
      )}

      <div className="space-y-2">
        {items.map((it, idx) => {
          const s = statusFor(it.daysLeft);
          const isCritical = it.daysLeft <= 30;
          return (
            <Card
              key={idx}
              className={`p-4 flex items-center justify-between gap-3 ${isCritical ? 'border-red-300 bg-red-50/60' : ''}`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <FileText className={`w-5 h-5 mt-0.5 ${isCritical ? 'text-red-600' : 'text-primary'}`} />
                <div className="min-w-0">
                  <div className={`font-medium ${isCritical ? 'text-red-800' : ''}`}>
                    {isRTL ? it.labelAr : it.label}
                    <span className="text-muted-foreground font-normal"> — {it.branchName}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-3">
                    {it.number && <span>{isRTL ? 'رقم:' : 'No:'} {it.number}</span>}
                    {it.provider && <span>{isRTL ? 'المزود:' : 'Provider:'} {it.provider}</span>}
                    <span>{isRTL ? 'ينتهي في:' : 'Expires:'} {it.expiresAt}</span>
                  </div>
                </div>
              </div>
              <Badge variant="outline" className={`${s.color} whitespace-nowrap`}>
                {s.text}
              </Badge>
            </Card>
          );
        })}
      </div>

      {!isLoading && ok.length > 0 && (
        <div className="text-xs text-muted-foreground pt-4">
          {isRTL
            ? `${ok.length} رخصة/عقد صالحة لأكثر من 30 يوم`
            : `${ok.length} licenses/contracts valid for more than 30 days`}
        </div>
      )}
    </div>
  );
}