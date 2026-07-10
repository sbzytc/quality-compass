import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Loader2 } from 'lucide-react';

export default function CompanySubscriptionTab() {
  const { company } = useOutletContext<{ company: any }>();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const { data, isLoading } = useQuery({
    queryKey: ['super-admin-company-subscription', company.id],
    queryFn: async () => {
      const { data: subs, error } = await supabase
        .from('subscriptions')
        .select('*, plans(name, name_ar, price_monthly, price_yearly, max_branches, max_users)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return subs;
    },
  });

  const active: any = data?.[0];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-primary" />
          {isRTL ? 'الاشتراك والخطة' : 'Subscription & Plan'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isRTL ? 'باقة هذه الشركة الحالية' : 'Current billing plan for this company'}
        </p>
      </div>

      {isLoading && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}

      {!isLoading && !active && (
        <Card className="p-6 text-center text-muted-foreground text-sm">
          {isRTL ? 'لا يوجد اشتراك نشط لهذه الشركة.' : 'No active subscription for this company.'}
        </Card>
      )}

      {active && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">{active.plans?.name}</div>
              {active.plans?.name_ar && <div className="text-sm text-muted-foreground">{active.plans.name_ar}</div>}
            </div>
            <Badge variant={active.status === 'active' ? 'default' : 'secondary'}>{active.status}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t">
            <div><div className="text-muted-foreground text-xs">{isRTL ? 'شهرياً' : 'Monthly'}</div><div className="font-semibold">{Number(active.plans?.price_monthly ?? 0).toFixed(0)}</div></div>
            <div><div className="text-muted-foreground text-xs">{isRTL ? 'سنوياً' : 'Yearly'}</div><div className="font-semibold">{Number(active.plans?.price_yearly ?? 0).toFixed(0)}</div></div>
            <div><div className="text-muted-foreground text-xs">{isRTL ? 'دورة الفوترة' : 'Billing cycle'}</div><div className="font-semibold">{active.billing_cycle}</div></div>
            <div><div className="text-muted-foreground text-xs">{isRTL ? 'ينتهي في' : 'Period end'}</div><div className="font-semibold">{active.current_period_end ? new Date(active.current_period_end).toLocaleDateString() : '—'}</div></div>
            <div><div className="text-muted-foreground text-xs">{isRTL ? 'حد الفروع' : 'Branches limit'}</div><div className="font-semibold">{active.plans?.max_branches ?? '∞'}</div></div>
            <div><div className="text-muted-foreground text-xs">{isRTL ? 'حد المستخدمين' : 'Users limit'}</div><div className="font-semibold">{active.plans?.max_users ?? '∞'}</div></div>
          </div>
        </Card>
      )}
    </div>
  );
}