import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Package, Plus, Layers } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { toast } from 'sonner';

export default function ModulesPage() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const qc = useQueryClient();
  const audit = useAuditLog();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', name_ar: '', description: '' });

  const { data: modules } = useQuery({
    queryKey: ['admin-modules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('modules').select('*').order('is_system_module', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createModule = useMutation({
    mutationFn: async () => {
      if (!form.code.trim() || !form.name.trim()) throw new Error('Code & name required');
      const { data, error } = await supabase.from('modules').insert({
        code: form.code.trim().toLowerCase().replace(/\s+/g, '_'),
        name: form.name.trim(),
        name_ar: form.name_ar.trim() || null,
        description: form.description.trim() || null,
        is_system_module: true,
        category: 'industry',
        available_for_sectors: ['fnb', 'clinic', 'retail', 'factory', 'other'] as any,
      }).select().single();
      if (error) throw error;
      await audit({ action: 'module_created', entityType: 'module', entityId: data.id, details: { code: data.code, name: data.name } });
      return data;
    },
    onSuccess: () => {
      toast.success(isAr ? 'تم إنشاء الموديول' : 'Module created');
      qc.invalidateQueries({ queryKey: ['admin-modules'] });
      setOpen(false);
      setForm({ code: '', name: '', name_ar: '', description: '' });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const industryModules = (modules || []).filter((m: any) => m.is_system_module || m.category === 'industry');
  const sharedCore = (modules || []).filter((m: any) => !(m.is_system_module || m.category === 'industry'));

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
              ? 'موديولان رئيسيان فقط حالياً: الطبي (العيادات) والتغذية (المطاعم). يمكنك إضافة موديول جديد مستقبلاً يستخدم نفس نواة رصده للجودة.'
              : 'Only two industry modules today: Medical (Clinics) and Food (Restaurants). You can add future modules that share the same Rasdah quality core.'}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 me-2" />{isAr ? 'موديول جديد' : 'New module'}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isAr ? 'إنشاء موديول جديد' : 'Create new module'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>{isAr ? 'الكود' : 'Code'}</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. retail" />
              </div>
              <div>
                <Label>{isAr ? 'الاسم (EN)' : 'Name (EN)'}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>{isAr ? 'الاسم (AR)' : 'Name (AR)'}</Label>
                <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} dir="rtl" />
              </div>
              <div>
                <Label>{isAr ? 'الوصف' : 'Description'}</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <p className="text-xs text-muted-foreground">
                {isAr
                  ? 'سيستخدم الموديول نفس النواة المشتركة (الفروع، التقييمات، الملاحظات، الإجراءات التصحيحية، التقارير).'
                  : 'The module will reuse the shared core (branches, assessments, findings, corrective actions, reports).'}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
              <Button onClick={() => createModule.mutate()} disabled={createModule.isPending}>
                {isAr ? 'إنشاء' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-3 border-s-4 border-primary ps-3">
          <Package className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">{isAr ? 'الموديولات الرئيسية (الصناعات)' : 'Industry Modules'}</h2>
          <Badge variant="outline" className="ms-auto">{industryModules.length}</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {industryModules.map((m: any) => (
            <Card key={m.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{isAr && m.name_ar ? m.name_ar : m.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">{m.code}</div>
                  {m.description && <div className="text-sm mt-1 text-muted-foreground">{m.description}</div>}
                </div>
                <Badge>{isAr ? 'صناعة' : 'Industry'}</Badge>
              </div>
            </Card>
          ))}
          {industryModules.length === 0 && (
            <div className="text-sm text-muted-foreground col-span-2 p-4 text-center border rounded-lg">
              {isAr ? 'لا يوجد موديولات' : 'No modules'}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {isAr
            ? 'لتفعيل/تعطيل موديول لشركة معينة افتح الشركة من شاشة الشركات → تبويب الموديولات.'
            : 'To enable/disable per company, open Companies → select a company → Modules tab.'}
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
    </div>
  );
}
