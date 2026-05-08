import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, UtensilsCrossed, Stethoscope } from 'lucide-react';
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

  const isAr = language === 'ar';
  const groups = [
    {
      key: 'fnb',
      title: isAr ? 'التغذية' : 'Food & Beverage',
      subtitle: isAr ? 'الموديول الأساسي لرصده — الفروع والمدن والمناطق' : 'Original Rasdah module — branches, cities, regions',
      icon: UtensilsCrossed,
      sector: 'fnb',
    },
    {
      key: 'clinic',
      title: isAr ? 'الطبي (العيادات)' : 'Medical (Clinics)',
      subtitle: isAr ? 'إدارة العيادات والأقسام والغرف والعمليات' : 'Clinic management, departments, rooms & operations',
      icon: Stethoscope,
      sector: 'clinic',
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="w-6 h-6 text-primary" />
          {isAr ? 'الموديولات' : 'Modules'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isAr
            ? 'موديولان رئيسيان: التغذية والطبي. تحت كل واحد القدرات المتاحة لتفعيلها داخل الشركات.'
            : 'Two main modules: F&B and Medical. Each groups the capabilities available for companies.'}
        </p>
      </div>

      {groups.map((g) => {
        const items = (modules || []).filter((m: any) =>
          (m.available_for_sectors || []).includes(g.sector)
        );
        const Icon = g.icon;
        return (
          <section key={g.key} className="space-y-3">
            <div className="flex items-center gap-3 border-s-4 border-primary ps-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{g.title}</h2>
                <p className="text-xs text-muted-foreground">{g.subtitle}</p>
              </div>
              <Badge variant="outline" className="ms-auto">{items.length}</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {items.map((m: any) => {
                const exclusive = (m.available_for_sectors || []).length === 1;
                return (
                  <Card key={m.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">
                          {isAr && m.name_ar ? m.name_ar : m.name}
                          {isAr && m.name_ar && <span className="text-muted-foreground"> — {m.name}</span>}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">{m.code}</div>
                        {m.description && <div className="text-sm mt-1 text-muted-foreground">{m.description}</div>}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {m.is_core ? <Badge>Core</Badge> : <Badge variant="secondary">Optional</Badge>}
                        {exclusive ? (
                          <Badge variant="outline" className="text-[10px]">{isAr ? 'حصري' : 'Exclusive'}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">{isAr ? 'مشترك' : 'Shared'}</Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
              {items.length === 0 && (
                <div className="text-sm text-muted-foreground col-span-2 p-4 text-center border rounded-lg">
                  {isAr ? 'لا توجد موديولات بعد' : 'No modules yet'}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
