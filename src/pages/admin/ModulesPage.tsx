import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Layers, Stethoscope, Utensils } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ModulesPage() {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const { data: modules } = useQuery({
    queryKey: ['admin-modules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('modules').select('*').order('is_system_module', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const industryModules = (modules || []).filter((m: any) => m.is_system_module || m.category === 'industry');
  const sharedCore = (modules || []).filter((m: any) => !(m.is_system_module || m.category === 'industry'));

  const workspaceTypes = [
    {
      code: 'medical',
      primaryModule: 'medical_clinics',
      labelEn: 'Medical / Clinics',
      labelAr: 'الطبي / العيادات',
      icon: Stethoscope,
      color: 'text-emerald-600',
    },
    {
      code: 'food',
      primaryModule: 'food_restaurants',
      labelEn: 'Food / Restaurants',
      labelAr: 'الأغذية / المطاعم',
      icon: Utensils,
      color: 'text-amber-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            {isAr ? 'إدارة الموديولات' : 'Module Management'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAr
              ? 'كل مساحة عمل (Workspace) مرتبطة بموديول رئيسي واحد فقط لا يمكن تغييره. النوعان المتاحان حالياً: الطبي والأغذية.'
              : 'Each Workspace is locked to one primary module. The two supported types today are Medical and Food.'}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-3 border-s-4 border-primary ps-3">
          <Package className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">{isAr ? 'أنواع مساحات العمل' : 'Workspace Types'}</h2>
          <Badge variant="outline" className="ms-auto">{workspaceTypes.length}</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {workspaceTypes.map(t => {
            const Icon = t.icon;
            return (
              <Card key={t.code} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Icon className={`w-6 h-6 ${t.color}`} />
                    <div>
                      <div className="font-medium">{isAr ? t.labelAr : t.labelEn}</div>
                      <div className="text-xs text-muted-foreground font-mono">{t.code}</div>
                      <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{t.primaryModule}</div>
                    </div>
                  </div>
                  <Badge variant="default">{isAr ? 'مفعّل' : 'Active'}</Badge>
                </div>
              </Card>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {isAr
            ? 'يتم تحديد نوع مساحة العمل عند إنشائها من شاشة الشركات ولا يمكن تغييره لاحقاً.'
            : 'A workspace type is set when creating the company and cannot be changed later.'}
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-3 border-s-4 border-muted-foreground/40 ps-3">
          <Layers className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{isAr ? 'النواة المشتركة' : 'Shared Core'}</h2>
          <Badge variant="outline" className="ms-auto">{sharedCore.length}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {isAr
            ? 'هذه القدرات متاحة لكل الموديولات تلقائياً (الدعم، المساعد الذكي، صوت العميل، التقييمات، العمليات).'
            : 'These capabilities are available for all modules automatically.'}
        </p>
        <div className="grid gap-2 md:grid-cols-3">
          {sharedCore.map((m: any) => (
            <Card key={m.id} className="p-3">
              <div className="text-sm font-medium">{isAr && m.name_ar ? m.name_ar : m.name}</div>
              <div className="text-[11px] text-muted-foreground font-mono">{m.code}</div>
            </Card>
          ))}
        </div>
      </section>

      {industryModules.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">{isAr ? 'الموديولات في قاعدة البيانات (مرجعي)' : 'Raw modules in database (reference)'}</summary>
          <ul className="mt-2 space-y-1">
            {industryModules.map((m: any) => (
              <li key={m.id} className="font-mono">{m.code} — {m.name}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
