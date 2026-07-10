import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Loader2 } from 'lucide-react';

export default function CompanyUsersTab() {
  const { company } = useOutletContext<{ company: any }>();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const { data, isLoading } = useQuery({
    queryKey: ['super-admin-company-users', company.id],
    queryFn: async () => {
      const { data: cu, error } = await supabase
        .from('company_users')
        .select('id, user_id, role, is_active, created_at')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const ids = (cu || []).map(r => r.user_id);
      if (!ids.length) return [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .in('user_id', ids);
      const pmap = new Map((profiles || []).map(p => [p.user_id, p]));
      return (cu || []).map(r => ({ ...r, profile: pmap.get(r.user_id) }));
    },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          {isRTL ? 'المستخدمين' : 'Users'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isRTL ? 'أعضاء هذه الشركة وأدوارهم' : 'Members of this company and their roles'}
        </p>
      </div>

      {isLoading && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}

      <div className="space-y-2">
        {data?.map((m: any) => (
          <Card key={m.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{m.profile?.full_name || m.profile?.email || m.user_id}</div>
              <div className="text-xs text-muted-foreground">{m.profile?.email}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{m.role}</Badge>
              <Badge variant={m.is_active ? 'default' : 'secondary'}>
                {m.is_active ? (isRTL ? 'نشط' : 'active') : (isRTL ? 'موقوف' : 'inactive')}
              </Badge>
            </div>
          </Card>
        ))}
        {data?.length === 0 && <div className="text-sm text-muted-foreground">{isRTL ? 'لا يوجد أعضاء بعد.' : 'No members yet.'}</div>}
      </div>
    </div>
  );
}