import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Loader2 } from 'lucide-react';

export default function CompanyAuditLogsTab() {
  const { company } = useOutletContext<{ company: any }>();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const { data, isLoading } = useQuery({
    queryKey: ['super-admin-company-audit', company.id],
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('id, action, entity_type, entity_id, details, created_at, actor_user_id')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      const ids = Array.from(new Set((logs || []).map(l => l.actor_user_id).filter(Boolean)));
      let pmap = new Map<string, any>();
      if (ids.length) {
        const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, email').in('user_id', ids);
        pmap = new Map((profiles || []).map(p => [p.user_id, p]));
      }
      return (logs || []).map(l => ({ ...l, actor: pmap.get(l.actor_user_id) }));
    },
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="w-6 h-6 text-primary" />
          {isRTL ? 'سجلات التدقيق' : 'Audit Logs'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isRTL ? 'آخر 200 حدث خاص بهذه الشركة' : 'Last 200 events scoped to this company'}
        </p>
      </div>

      {isLoading && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}

      <div className="space-y-2">
        {data?.map(l => (
          <Card key={l.id} className="p-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">{l.action}</Badge>
                {l.entity_type && <span className="text-xs text-muted-foreground">{l.entity_type}</span>}
              </div>
              <div className="text-xs text-muted-foreground mt-1 truncate">
                {l.actor?.full_name || l.actor?.email || l.actor_user_id}
              </div>
              {l.details && Object.keys(l.details as any).length > 0 && (
                <pre className="mt-1 text-[10px] text-muted-foreground/80 max-w-full overflow-x-auto">{JSON.stringify(l.details, null, 0)}</pre>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground whitespace-nowrap">
              {new Date(l.created_at).toLocaleString()}
            </div>
          </Card>
        ))}
        {data?.length === 0 && <div className="text-sm text-muted-foreground">{isRTL ? 'لا توجد سجلات بعد.' : 'No logs yet.'}</div>}
      </div>
    </div>
  );
}