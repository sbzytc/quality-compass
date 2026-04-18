import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AuditLogsPage() {
  const { language } = useLanguage();
  const { data: logs } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="w-6 h-6 text-primary" />
          {language === 'ar' ? 'سجلات التدقيق' : 'Audit Logs'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {language === 'ar' ? 'آخر 100 إجراء عبر كل المنصة' : 'Last 100 actions across all tenants'}
        </p>
      </div>
      <Card className="divide-y">
        {logs?.length === 0 && <div className="p-4 text-sm text-muted-foreground">No audit log entries yet.</div>}
        {logs?.map((l: any) => (
          <div key={l.id} className="p-3 text-sm flex items-center justify-between">
            <div>
              <div className="font-medium">{l.action} <span className="text-muted-foreground">· {l.entity_type}</span></div>
              <div className="text-xs text-muted-foreground font-mono">{l.actor_user_id}</div>
            </div>
            <div className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}
