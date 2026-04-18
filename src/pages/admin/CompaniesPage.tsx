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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Building2, Stethoscope, Utensils, Store, Factory, Package, ChevronRight, Users, Activity, LifeBuoy, Power, Shield } from 'lucide-react';
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

  const toggleStatus = useMutation({
    mutationFn: async (next: 'active' | 'suspended') => {
      const { error } = await supabase.from('companies').update({ status: next }).eq('id', companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-companies'] });
      toast.success(language === 'ar' ? 'تم تحديث الحالة' : 'Status updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Sheet open={!!company} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {company?.name}
            <Badge variant={company?.status === 'active' ? 'default' : 'secondary'} className="ms-2">{company?.status}</Badge>
          </SheetTitle>
          <SheetDescription>
            {language === 'ar' ? 'تحكم كامل في الشركة كـ Super Admin' : 'Full Super Admin control over this workspace'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span>/{company?.slug}</span>
          <span>·</span>
          <span>{company && sectorLabel(company.sector_type, language)}</span>
          <span className="ms-auto">
            <Button
              size="sm"
              variant={company?.status === 'active' ? 'destructive' : 'default'}
              onClick={() => toggleStatus.mutate(company?.status === 'active' ? 'suspended' : 'active')}
              disabled={toggleStatus.isPending}
            >
              <Power className="w-3.5 h-3.5 me-1" />
              {company?.status === 'active'
                ? (language === 'ar' ? 'تعليق' : 'Suspend')
                : (language === 'ar' ? 'تفعيل' : 'Activate')}
            </Button>
          </span>
        </div>

        <Tabs defaultValue="modules" className="mt-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="modules"><Package className="w-3.5 h-3.5 me-1" />{language === 'ar' ? 'الموديولات' : 'Modules'}</TabsTrigger>
            <TabsTrigger value="members"><Users className="w-3.5 h-3.5 me-1" />{language === 'ar' ? 'الأعضاء' : 'Members'}</TabsTrigger>
            <TabsTrigger value="logs"><Activity className="w-3.5 h-3.5 me-1" />{language === 'ar' ? 'السجلات' : 'Logs'}</TabsTrigger>
            <TabsTrigger value="support"><LifeBuoy className="w-3.5 h-3.5 me-1" />{language === 'ar' ? 'دعم' : 'Support'}</TabsTrigger>
          </TabsList>

          <TabsContent value="modules" className="mt-4">
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
          </TabsContent>

          <TabsContent value="members" className="mt-4">
            <CompanyMembersTab companyId={companyId} />
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <CompanyLogsTab companyId={companyId} />
          </TabsContent>

          <TabsContent value="support" className="mt-4">
            <CompanySupportTab companyId={companyId} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function CompanyMembersTab({ companyId }: { companyId: string }) {
  const { language } = useLanguage();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-company-members', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data: cu, error } = await supabase
        .from('company_users')
        .select('id, user_id, role, is_active, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const userIds = (cu || []).map((r: any) => r.user_id);
      if (!userIds.length) return [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url, is_active')
        .in('user_id', userIds);
      const pmap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return (cu || []).map((r: any) => ({ ...r, profile: pmap.get(r.user_id) }));
    },
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground">{language === 'ar' ? 'لا يوجد أعضاء' : 'No members yet.'}</div>;

  return (
    <div className="space-y-2">
      {data.map((m: any) => (
        <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border">
          <div className="min-w-0">
            <div className="font-medium text-sm">{m.profile?.full_name || '—'}</div>
            <div className="text-xs text-muted-foreground truncate">{m.profile?.email}</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] uppercase">{m.role}</Badge>
            <Badge variant={m.is_active ? 'default' : 'secondary'} className="text-[10px]">
              {m.is_active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'موقوف' : 'Inactive')}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

function CompanyLogsTab({ companyId }: { companyId: string }) {
  const { language } = useLanguage();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-company-logs', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground">{language === 'ar' ? 'لا توجد سجلات' : 'No audit entries.'}</div>;

  return (
    <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
      {data.map((l: any) => (
        <div key={l.id} className="p-2.5 rounded-lg border text-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium">{l.action} <span className="text-muted-foreground font-normal">· {l.entity_type || '—'}</span></div>
            <div className="text-[10px] text-muted-foreground">{new Date(l.created_at).toLocaleString()}</div>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">{l.actor_user_id}</div>
        </div>
      ))}
    </div>
  );
}

function CompanySupportTab({ companyId }: { companyId: string }) {
  const { language } = useLanguage();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-company-tickets', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('id, title, status, priority, category, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg border bg-muted/30 text-xs flex items-start gap-2">
        <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          {language === 'ar'
            ? 'بصفتك Super Admin، يمكنك متابعة كل تذاكر الدعم لهذه الشركة وإدارتها من قسم الدعم.'
            : 'As a Super Admin, you can monitor and manage every ticket for this workspace from the Support section.'}
        </div>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {!isLoading && !data?.length && (
        <div className="text-sm text-muted-foreground">{language === 'ar' ? 'لا توجد تذاكر' : 'No tickets.'}</div>
      )}

      <div className="space-y-2">
        {data?.map((t: any) => (
          <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border">
            <div className="min-w-0">
              <div className="font-medium text-sm truncate">{t.title}</div>
              <div className="text-[11px] text-muted-foreground">{t.category} · {new Date(t.created_at).toLocaleDateString()}</div>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px]">{t.priority}</Badge>
              <Badge variant={t.status === 'open' ? 'default' : 'secondary'} className="text-[10px]">{t.status}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
