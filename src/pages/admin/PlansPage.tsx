import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PlansPage() {
  const { language } = useLanguage();
  const { data: plans } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: async () => {
      const { data, error } = await supabase.from('plans').select('*').order('price_monthly');
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-primary" />
          {language === 'ar' ? 'الخطط' : 'Plans'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {language === 'ar' ? 'باقات الاشتراك المتاحة' : 'Subscription tiers offered to companies'}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {plans?.map((p: any) => (
          <Card key={p.id} className="p-5">
            <div className="text-lg font-semibold">{p.name}</div>
            {p.name_ar && <div className="text-sm text-muted-foreground">{p.name_ar}</div>}
            <div className="mt-3 text-2xl font-bold">{Number(p.price_monthly).toFixed(0)} <span className="text-sm font-normal text-muted-foreground">/mo</span></div>
            <div className="text-xs text-muted-foreground mt-1">{Number(p.price_yearly).toFixed(0)} /yr</div>
            <div className="text-xs text-muted-foreground mt-3">
              {p.max_branches ? `${p.max_branches} branches` : '∞ branches'} · {p.max_users ? `${p.max_users} users` : '∞ users'}
            </div>
          </Card>
        ))}
        {plans?.length === 0 && <div className="text-muted-foreground text-sm">No plans configured.</div>}
      </div>
    </div>
  );
}
