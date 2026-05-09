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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Building2, Stethoscope, Utensils, ChevronRight, Users, Activity, LifeBuoy, Power, Shield, MoreHorizontal, KeyRound, UserX, UserCheck, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { useCreateUser, useInviteUser, useResetPassword, useUpdateUserRole, useUpdateUserStatus } from '@/hooks/useUsers';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import type { AppRole } from '@/contexts/AuthContext';

const WORKSPACE_TYPES = [
  {
    value: 'medical' as const,
    primaryModule: 'medical_clinics' as const,
    sectorType: 'clinic' as const,
    labelEn: 'Medical / Clinics',
    labelAr: 'الطبي / العيادات',
    icon: Stethoscope,
  },
  {
    value: 'food' as const,
    primaryModule: 'food_restaurants' as const,
    sectorType: 'fnb' as const,
    labelEn: 'Food / Restaurants',
    labelAr: 'الأغذية / المطاعم',
    icon: Utensils,
  },
] as const;

type WorkspaceTypeValue = typeof WORKSPACE_TYPES[number]['value'];

function workspaceTypeLabel(value: string, lang: string) {
  const s = WORKSPACE_TYPES.find(x => x.value === value);
  if (!s) return value;
  return lang === 'ar' ? s.labelAr : s.labelEn;
}

export default function CompaniesPage() {
  const qc = useQueryClient();
  const { language } = useLanguage();
  const audit = useAuditLog();
  const [open, setOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', name_ar: '', slug: '', workspace_type: 'medical' as WorkspaceTypeValue });

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
      const wt = WORKSPACE_TYPES.find(w => w.value === form.workspace_type)!;
      const { data, error } = await supabase.from('companies').insert({
        name: form.name,
        name_ar: form.name_ar || null,
        slug: form.slug.toLowerCase().replace(/\s+/g, '-'),
        sector_type: wt.sectorType,
        workspace_type: wt.value,
        primary_module: wt.primaryModule,
      }).select().single();
      if (error) throw error;
      await audit({ action: 'company_created', entityType: 'company', entityId: data?.id, companyId: data?.id, details: { name: form.name, workspace_type: wt.value } });
    },
    onSuccess: () => {
      toast.success(language === 'ar' ? 'تم إنشاء الشركة' : 'Company created');
      qc.invalidateQueries({ queryKey: ['admin-companies'] });
      setOpen(false);
      setForm({ name: '', name_ar: '', slug: '', workspace_type: 'medical' });
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
                <Label>{language === 'ar' ? 'نوع مساحة العمل' : 'Workspace Type'}</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'ar'
                    ? 'كل مساحة عمل تخدم نشاطاً واحداً فقط ولا يمكن تغييره لاحقاً.'
                    : 'Each workspace serves one activity only and cannot be changed later.'}
                </p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {WORKSPACE_TYPES.map(s => {
                    const Icon = s.icon;
                    const active = form.workspace_type === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setForm({ ...form, workspace_type: s.value })}
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
              <div>
                <Label>Slug</Label>
                <Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="acme-clinics" />
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'ar'
                    ? 'رابط الشركة المختصر — يظهر في عنوان الموقع (URL) لسهولة الوصول. يحتوي على أحف إنجليزية وأرقام وشرطات فقط.'
                    : 'Short URL-friendly identifier used in the web address. Only lowercase letters, numbers, and hyphens.'}
                </p>
              </div>
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
              <div className="text-xs text-muted-foreground">/{c.slug} · {workspaceTypeLabel(c.workspace_type || c.sector_type, language)}</div>
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
  const audit = useAuditLog();
  const companyId = company?.id;

  const toggleStatus = useMutation({
    mutationFn: async (next: 'active' | 'suspended') => {
      const { error } = await supabase.from('companies').update({ status: next }).eq('id', companyId);
      if (error) throw error;
      await audit({
        action: next === 'active' ? 'company_activated' : 'company_suspended',
        entityType: 'company',
        entityId: companyId,
        companyId,
      });
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
            <ConfirmStatusButton
              status={company?.status}
              pending={toggleStatus.isPending}
              onConfirm={() => toggleStatus.mutate(company?.status === 'active' ? 'suspended' : 'active')}
            />
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

function ConfirmStatusButton({ status, pending, onConfirm }: { status?: string; pending: boolean; onConfirm: () => void }) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const isActive = status === 'active';
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        size="sm"
        variant={isActive ? 'destructive' : 'default'}
        onClick={() => setOpen(true)}
        disabled={pending}
      >
        <Power className="w-3.5 h-3.5 me-1" />
        {isActive ? (language === 'ar' ? 'تعليق' : 'Suspend') : (language === 'ar' ? 'تفعيل' : 'Activate')}
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isActive
              ? (language === 'ar' ? 'تعليق الشركة؟' : 'Suspend company?')
              : (language === 'ar' ? 'تفعيل الشركة؟' : 'Activate company?')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isActive
              ? (language === 'ar' ? 'سيتم منع الأعضاء من الوصول للوركسبيس حتى يُعاد تفعيله. هل أنت متأكد؟' : 'Members will lose access until you re-activate. Are you sure?')
              : (language === 'ar' ? 'سيُعاد تفعيل الوركسبيس وعودة الوصول لكل الأعضاء.' : 'The workspace will be re-enabled for all members.')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
          <AlertDialogAction
            className={isActive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            onClick={() => { onConfirm(); setOpen(false); }}
          >
            {isActive ? (language === 'ar' ? 'نعم، علّق' : 'Yes, suspend') : (language === 'ar' ? 'نعم، فعّل' : 'Yes, activate')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CompanyMembersTab({ companyId }: { companyId: string }) {
  const { language } = useLanguage();
  const qc = useQueryClient();
  const audit = useAuditLog();
  const createUser = useCreateUser();
  const updateStatus = useUpdateUserStatus();
  const updateRole = useUpdateUserRole();
  const resetPassword = useResetPassword();

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ email: '', fullName: '', password: '', role: 'assessor' as AppRole });
  const [confirmRemove, setConfirmRemove] = useState<{ id: string; name?: string } | null>(null);
  const [changeRoleFor, setChangeRoleFor] = useState<{ userId: string; role: AppRole; name?: string } | null>(null);

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
      const [{ data: profiles }, { data: ur }] = await Promise.all([
        supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url, is_active')
        .in('user_id', userIds),
        supabase.from('user_roles').select('user_id, role').in('user_id', userIds),
      ]);
      const pmap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      const rolesByUser = new Map<string, string[]>();
      (ur || []).forEach((r: any) => {
        const list = rolesByUser.get(r.user_id) || [];
        list.push(r.role);
        rolesByUser.set(r.user_id, list);
      });
      return (cu || []).map((r: any) => ({
        ...r,
        profile: pmap.get(r.user_id),
        appRoles: rolesByUser.get(r.user_id) || [],
      }));
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-company-members', companyId] });
    qc.invalidateQueries({ queryKey: ['users'] });
  };

  const handleCreate = async () => {
    if (!form.email || !form.password || form.password.length < 6) {
      toast.error(language === 'ar' ? 'تحقق من البريد وكلمة المرور (6 أحرف على الأقل)' : 'Check email and password (min 6 chars)');
      return;
    }
    try {
      await createUser.mutateAsync({
        email: form.email,
        fullName: form.fullName || form.email,
        password: form.password,
        role: form.role,
        forcePasswordChange: true,
        companyId,
      });
      await audit({ action: 'member_added', entityType: 'user', companyId, details: { email: form.email, role: form.role } });
      toast.success(language === 'ar' ? 'تم إضافة المستخدم' : 'User added');
      setAddOpen(false);
      setForm({ email: '', fullName: '', password: '', role: 'assessor' });
      refresh();
    } catch (e: any) {
      toast.error(e?.message || (language === 'ar' ? 'فشل الإنشاء' : 'Failed'));
    }
  };

  const handleToggleActive = async (m: any) => {
    try {
      await updateStatus.mutateAsync({ userId: m.user_id, isActive: !m.profile?.is_active });
      await audit({
        action: m.profile?.is_active ? 'member_suspended' : 'member_activated',
        entityType: 'user',
        entityId: m.user_id,
        companyId,
        details: { email: m.profile?.email },
      });
      toast.success(language === 'ar' ? 'تم التحديث' : 'Updated');
      refresh();
    } catch (e: any) {
      toast.error(e?.message);
    }
  };

  const handleResetPassword = async (m: any) => {
    try {
      const r = await resetPassword.mutateAsync({ userId: m.user_id, email: m.profile?.email });
      await audit({ action: 'member_password_reset', entityType: 'user', entityId: m.user_id, companyId });
      toast.success(
        r?.tempPassword
          ? `${language === 'ar' ? 'كلمة مرور مؤقتة:' : 'Temp password:'} ${r.tempPassword}`
          : (language === 'ar' ? 'تم إرسال البريد' : 'Email sent')
      );
    } catch (e: any) {
      toast.error(e?.message);
    }
  };

  const handleRoleChange = async () => {
    if (!changeRoleFor) return;
    try {
      await updateRole.mutateAsync({ userId: changeRoleFor.userId, newRole: changeRoleFor.role });
      await audit({
        action: 'member_role_changed',
        entityType: 'user',
        entityId: changeRoleFor.userId,
        companyId,
        details: { new_role: changeRoleFor.role },
      });
      toast.success(language === 'ar' ? 'تم تحديث الدور' : 'Role updated');
      setChangeRoleFor(null);
      refresh();
    } catch (e: any) {
      toast.error(e?.message);
    }
  };

  const handleRemove = async () => {
    if (!confirmRemove) return;
    try {
      const { error } = await supabase
        .from('company_users')
        .update({ is_active: false })
        .eq('id', confirmRemove.id);
      if (error) throw error;
      await audit({ action: 'member_removed', entityType: 'user', companyId, details: { name: confirmRemove.name } });
      toast.success(language === 'ar' ? 'تم إزالة العضو' : 'Member removed');
      setConfirmRemove(null);
      refresh();
    } catch (e: any) {
      toast.error(e?.message);
    }
  };

  const ROLES: { v: AppRole; en: string; ar: string }[] = [
    { v: 'admin', en: 'Workspace Admin', ar: 'أدمن المساحة' },
    { v: 'executive', en: 'Executive', ar: 'تنفيذي' },
    { v: 'branch_manager', en: 'Branch Manager', ar: 'مدير فرع' },
    { v: 'assessor', en: 'Assessor', ar: 'مقيّم' },
    { v: 'branch_employee', en: 'Branch Employee', ar: 'موظف فرع' },
    { v: 'support_agent', en: 'Support Agent', ar: 'موظف دعم' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {language === 'ar' ? 'تحكم كامل في أعضاء هذه المساحة' : 'Full control over this workspace members'}
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <UserPlus className="w-3.5 h-3.5 me-1" />
          {language === 'ar' ? 'إضافة عضو' : 'Add member'}
        </Button>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {!isLoading && !data?.length && (
        <div className="text-sm text-muted-foreground">{language === 'ar' ? 'لا يوجد أعضاء' : 'No members yet.'}</div>
      )}

      {data?.map((m: any) => (
        <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border">
          <div className="min-w-0">
            <div className="font-medium text-sm">{m.profile?.full_name || '—'}</div>
            <div className="text-xs text-muted-foreground truncate">{m.profile?.email}</div>
            {m.appRoles?.length > 0 && (
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {m.appRoles.join(' · ')}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] uppercase">{m.role}</Badge>
            <Badge variant={m.profile?.is_active ? 'default' : 'secondary'} className="text-[10px]">
              {m.profile?.is_active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'موقوف' : 'Inactive')}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setChangeRoleFor({ userId: m.user_id, role: (m.appRoles?.[0] as AppRole) || 'assessor', name: m.profile?.full_name })}>
                  <Shield className="w-3.5 h-3.5 me-2" />{language === 'ar' ? 'تغيير الصلاحية' : 'Change role'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleResetPassword(m)}>
                  <KeyRound className="w-3.5 h-3.5 me-2" />{language === 'ar' ? 'إعادة كلمة المرور' : 'Reset password'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleToggleActive(m)}>
                  {m.profile?.is_active ? (
                    <><UserX className="w-3.5 h-3.5 me-2" />{language === 'ar' ? 'تعليق' : 'Suspend'}</>
                  ) : (
                    <><UserCheck className="w-3.5 h-3.5 me-2" />{language === 'ar' ? 'تفعيل' : 'Activate'}</>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setConfirmRemove({ id: m.id, name: m.profile?.full_name })}
                >
                  <Trash2 className="w-3.5 h-3.5 me-2" />{language === 'ar' ? 'إزالة من المساحة' : 'Remove from workspace'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}

      {/* Add member dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{language === 'ar' ? 'إضافة عضو للمساحة' : 'Add workspace member'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>{language === 'ar' ? 'الاسم' : 'Full name'}</Label><Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></div>
            <div><Label>{language === 'ar' ? 'كلمة مرور مؤقتة' : 'Temp password'}</Label><Input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
            <div>
              <Label>{language === 'ar' ? 'الصلاحية' : 'Role'}</Label>
              <Select value={form.role} onValueChange={v => setForm({ ...form, role: v as AppRole })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r.v} value={r.v}>{language === 'ar' ? r.ar : r.en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} disabled={createUser.isPending}>{language === 'ar' ? 'إنشاء' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change role dialog */}
      <Dialog open={!!changeRoleFor} onOpenChange={(o) => !o && setChangeRoleFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{language === 'ar' ? `تغيير صلاحية ${changeRoleFor?.name || ''}` : `Change role for ${changeRoleFor?.name || ''}`}</DialogTitle></DialogHeader>
          {changeRoleFor && (
            <Select value={changeRoleFor.role} onValueChange={v => setChangeRoleFor({ ...changeRoleFor, role: v as AppRole })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map(r => <SelectItem key={r.v} value={r.v}>{language === 'ar' ? r.ar : r.en}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <DialogFooter>
            <Button onClick={handleRoleChange} disabled={updateRole.isPending}>{language === 'ar' ? 'حفظ' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm remove */}
      <AlertDialog open={!!confirmRemove} onOpenChange={(o) => !o && setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{language === 'ar' ? 'إزالة العضو من المساحة؟' : 'Remove member from workspace?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar' ? 'لن يتم حذف الحساب، فقط إلغاء عضويته في هذه المساحة.' : "The user account isn't deleted; only the workspace membership is revoked."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleRemove}>
              {language === 'ar' ? 'إزالة' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
