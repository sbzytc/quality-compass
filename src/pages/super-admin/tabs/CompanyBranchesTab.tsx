import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GitBranch, Loader2, Plus } from 'lucide-react';
import AddBranchDialog from '../AddBranchDialog';

export default function CompanyBranchesTab() {
  const { company } = useOutletContext<{ company: any }>();
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['super-admin-company-branches', company.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, name_ar, city, is_active, created_at')
        .eq('company_id', company.id)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-primary" />
            {isRTL ? 'الفروع' : 'Branches'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isRTL ? 'فروع هذه الشركة' : 'Branches of this company'}
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          {isRTL ? 'إضافة فرع' : 'Add branch'}
        </Button>
      </div>

      {isLoading && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}

      <div className="space-y-2">
        {data?.map(b => (
          <Card key={b.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{isRTL ? (b.name_ar || b.name) : b.name}</div>
              <div className="text-xs text-muted-foreground">{b.city || (isRTL ? 'بدون مدينة' : 'no city')}</div>
            </div>
            <Badge variant={b.is_active ? 'default' : 'secondary'}>
              {b.is_active ? (isRTL ? 'نشط' : 'active') : (isRTL ? 'موقوف' : 'inactive')}
            </Badge>
          </Card>
        ))}
        {data?.length === 0 && <div className="text-sm text-muted-foreground">{isRTL ? 'لا توجد فروع بعد.' : 'No branches yet.'}</div>}
      </div>

      <AddBranchDialog open={open} onOpenChange={setOpen} companyId={company.id} />
    </div>
  );
}