import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Building2, Stethoscope, Utensils, Store, Factory, Package, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

const SECTORS = [
  { value: 'clinic',  labelEn: 'Clinic / Healthcare',     labelAr: 'عيادة / رعاية صحية', icon: Stethoscope },
  { value: 'fnb',     labelEn: 'F&B / Restaurants',       labelAr: 'مطاعم وأغذية',       icon: Utensils },
  { value: 'retail',  labelEn: 'Retail / Multi-branch',   labelAr: 'تجزئة / فروع متعددة', icon: Store },
  { value: 'factory', labelEn: 'Factory / Manufacturing', labelAr: 'مصنع / تصنيع',       icon: Factory },
  { value: 'other',   labelEn: 'Other',                   labelAr: 'أخرى',               icon: Building2 },
] as const;

type SectorValue = typeof SECTORS[number]['value'];

function sectorLabel(value: string, lang: string) {
  const s = SECTORS.find(x => x.value === value);
  if (!s) return value;
  return lang === 'ar' ? s.labelAr : s.labelEn;
}

export default function CompaniesPage() {
  const qc = useQueryClient();
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', name_ar: '', slug: '', sector_type: 'clinic' as SectorValue });

  const { data: companies, isLoading } = useQuery({
    queryKey: ['admin-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createCompany = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('companies').insert({
        name: form.name,
        name_ar: form.name_ar || null,
        slug: form.slug.toLowerCase().replace(/\s+/g, '-'),
        sector_type: form.sector_type,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(language === 'ar' ? 'تم إنشاء الشركة' : 'Company created');
      qc.invalidateQueries({ queryKey: ['admin-companies'] });
      setOpen(false);
      setForm({ name: '', name_ar: '', slug: '', sector_type: 'clinic' });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            {language === 'ar' ? 'الشركات' : 'Companies'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {language === 'ar' ? 'إدارة كل الشركات (Workspaces) في المنصة' : 'Manage all tenant workspaces'}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 me-2" />{language === 'ar' ? 'إضافة شركة' : 'New Company'}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{language === 'ar' ? 'شركة جديدة' : 'New Company'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{language === 'ar' ? 'نوع النشاط' : 'Business Type'}</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {SECTORS.map(s => {
                    const Icon = s.icon;
                    const active = form.sector_type === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setForm({ ...form, sector_type: s.value })}
                        className={`flex items-center gap-2 p-3 rounded-lg border text-start transition ${
                          active ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="text-sm">{language === 'ar' ? s.labelAr : s.labelEn}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div><Label>Name (EN)</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>الاسم (AR)</Label><Input value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} /></div>
              <div><Label>Slug</Label><Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="acme-clinics" /></div>
            </div>
            <DialogFooter>
              <Button onClick={() => createCompany.mutate()} disabled={!form.name || !form.slug || createCompany.isPending}>
                {language === 'ar' ? 'إنشاء' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {isLoading && <div className="text-muted-foreground">Loading…</div>}
        {companies?.map((c: any) => (
          <Card
            key={c.id}
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/40 transition"
            onClick={() => setSelectedCompany(c)}
          >
            <div>
              <div className="font-medium">{c.name} {c.name_ar && <span className="text-muted-foreground">— {c.name_ar}</span>}</div>
              <div className="text-xs text-muted-foreground">/{c.slug} · {sectorLabel(c.sector_type, language)}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status}</Badge>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </Card>
        ))}
        {companies?.length === 0 && <div className="text-muted-foreground text-sm">No companies yet.</div>}
      </div>

      <CompanyDrawer
        company={selectedCompany}
        onClose={() => setSelectedCompany(null)}
      />
    </div>
  );
}

function CompanyDrawer({ company, onClose }: { company: any | null; onClose: () => void }) {
  const { language } = useLanguage();
  const qc = useQueryClient();
  const companyId = company?.id;

  const { data: rows, isLoading } = useQuery({
    queryKey: ['admin-company-modules', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const [{ data: modules, error: e1 }, { data: cms, error: e2 }] = await Promise.all([
        supabase.from('modules').select('*').order('is_core', { ascending: false }),
        supabase.from('company_modules').select('*').eq('company_id', companyId),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const map = new Map((cms || []).map((r: any) => [r.module_id, r]));
      return (modules || []).map((m: any) => ({
        module: m,
        link: map.get(m.id) || null,
        enabled: map.get(m.id)?.enabled ?? false,
      }));
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ module_id, link, enabled }: { module_id: string; link: any; enabled: boolean }) => {
      if (link) {
        const { error } = await supabase
          .from('company_modules')
          .update({ enabled })
          .eq('id', link.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_modules')
          .insert({ company_id: companyId, module_id, enabled });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-company-modules', companyId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Sheet open={!!company} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {company?.name}
          </SheetTitle>
          <SheetDescription>
            {language === 'ar' ? 'تفعيل/تعطيل الموديولات لهذه الشركة' : 'Enable / disable modules for this workspace'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          <div className="text-xs text-muted-foreground">
            {language === 'ar' ? 'النشاط' : 'Sector'}: <span className="font-medium text-foreground">{company && sectorLabel(company.sector_type, language)}</span>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-primary" />
              <h3 className="font-medium">{language === 'ar' ? 'الموديولات' : 'Modules'}</h3>
            </div>

            {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}

            <div className="space-y-2">
              {rows?.map(({ module, link, enabled }) => {
                const sectorOk = !module.available_for_sectors?.length
                  || module.available_for_sectors.includes(company?.sector_type);
                return (
                  <div
                    key={module.id}
                    className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${!sectorOk ? 'opacity-50' : ''}`}
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-sm flex items-center gap-2">
                        {language === 'ar' && module.name_ar ? module.name_ar : module.name}
                        {module.is_core && <Badge variant="secondary" className="text-[10px]">Core</Badge>}
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground">{module.code}</div>
                      {!sectorOk && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {language === 'ar' ? 'غير متاح لهذا النشاط' : 'Not available for this sector'}
                        </div>
                      )}
                    </div>
                    <Switch
                      checked={module.is_core || enabled}
                      disabled={module.is_core || !sectorOk || toggle.isPending}
                      onCheckedChange={(v) => toggle.mutate({ module_id: module.id, link, enabled: v })}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
