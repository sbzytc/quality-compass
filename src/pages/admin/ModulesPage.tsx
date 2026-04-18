import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ModulesPage() {
  const { language } = useLanguage();
  const { data: modules } = useQuery({
    queryKey: ['admin-modules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('modules').select('*').order('is_core', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="w-6 h-6 text-primary" />
          {language === 'ar' ? 'الموديولات' : 'Modules'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {language === 'ar' ? 'القدرات المتاحة لتفعيلها داخل الشركات' : 'Capabilities that can be enabled per company'}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {modules?.map((m: any) => (
          <Card key={m.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{m.name} {m.name_ar && <span className="text-muted-foreground">— {m.name_ar}</span>}</div>
                <div className="text-xs text-muted-foreground font-mono">{m.code}</div>
                {m.description && <div className="text-sm mt-1 text-muted-foreground">{m.description}</div>}
              </div>
              {m.is_core ? <Badge>Core</Badge> : <Badge variant="secondary">Optional</Badge>}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Sectors: {(m.available_for_sectors || []).join(', ')}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
