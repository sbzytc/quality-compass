import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCreateUser, useResetPassword, useUpdateUserStatus, useUpdateUserRole } from '@/hooks/useUsers';
import type { AppRole } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Users, Loader2, MoreHorizontal, KeyRound, Pencil, UserX, UserCheck, Plus } from 'lucide-react';
import { toast } from 'sonner';

const ASSIGNABLE_ROLES: AppRole[] = ['admin', 'executive', 'branch_manager', 'assessor', 'branch_employee', 'support_agent'];
const COMPANY_LEVEL_ROLES: AppRole[] = ['admin', 'executive'];

function useCompanyBranches(companyId: string) {
  return useQuery({
    queryKey: ['company-branches-min', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, name_ar')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });
}

function useCompanyEmployees(companyId: string) {
  return useQuery({
    queryKey: ['company-employees-all', companyId],
    queryFn: async () => {
      const { data: cu, error } = await supabase
        .from('company_users')
        .select('user_id')
        .eq('company_id', companyId)
        .eq('is_active', true);
      if (error) throw error;
      const ids = (cu || []).map((r: any) => r.user_id);
      if (!ids.length) return [];
      const { data: profs, error: e2 } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', ids)
        .eq('is_active', true);
      if (e2) throw e2;
      return profs || [];
    },
  });
}

export default function CompanyUsersTab() {
  const { company } = useOutletContext<{ company: any }>();
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

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
      const [{ data: profiles }, { data: appRoles }] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, email, phone, avatar_url, is_active').in('user_id', ids),
        supabase.from('user_roles').select('user_id, role').in('user_id', ids),
      ]);
      const pmap = new Map((profiles || []).map(p => [p.user_id, p]));
      const rmap = new Map<string, AppRole[]>();
      (appRoles || []).forEach(r => {
        const list = rmap.get(r.user_id) || [];
        list.push(r.role as AppRole);
        rmap.set(r.user_id, list);
      });
      return (cu || []).map(r => ({ ...r, profile: pmap.get(r.user_id), appRoles: rmap.get(r.user_id) || [] }));
    },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            {isRTL ? 'المستخدمين' : 'Users'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isRTL ? 'أعضاء هذه الشركة وأدوارهم' : 'Members of this company and their roles'}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          {isRTL ? 'إضافة مستخدم' : 'Add user'}
        </Button>
      </div>

      {isLoading && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}

      <div className="space-y-2">
        {data?.map((m: any) => (
          <Card key={m.id} className="p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-medium truncate">{m.profile?.full_name || m.profile?.email || m.user_id}</div>
              <div className="text-xs text-muted-foreground truncate">{m.profile?.email}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {m.appRoles.length > 0 ? (
                m.appRoles.map((r: AppRole) => <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>)
              ) : (
                <Badge variant="outline" className="text-[10px]">{m.role}</Badge>
              )}
              <Badge variant={m.profile?.is_active !== false ? 'default' : 'secondary'}>
                {m.profile?.is_active !== false ? (isRTL ? 'نشط' : 'active') : (isRTL ? 'موقوف' : 'inactive')}
              </Badge>
              <UserActions member={m} companyId={company.id} onEdit={() => setEditing(m)} />
            </div>
          </Card>
        ))}
        {data?.length === 0 && <div className="text-sm text-muted-foreground">{isRTL ? 'لا يوجد أعضاء بعد.' : 'No members yet.'}</div>}
      </div>

      {createOpen && <CreateUserDialog companyId={company.id} onClose={() => setCreateOpen(false)} />}
      {editing && <EditUserDialog member={editing} companyId={company.id} onClose={() => setEditing(null)} />}
    </div>
  );
}

function UserActions({ member, companyId, onEdit }: { member: any; companyId: string; onEdit: () => void }) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const qc = useQueryClient();
  const resetPassword = useResetPassword();
  const updateStatus = useUpdateUserStatus();
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(false);

  const active = member.profile?.is_active !== false;

  const doReset = async () => {
    try {
      await resetPassword.mutateAsync({ userId: member.user_id, email: member.profile?.email });
      toast.success(isRTL ? 'تم إرسال رابط إعادة التعيين' : 'Reset link sent');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setConfirmReset(false);
    }
  };

  const doToggle = async () => {
    try {
      await updateStatus.mutateAsync({ userId: member.user_id, isActive: !active });
      qc.invalidateQueries({ queryKey: ['super-admin-company-users', companyId] });
      toast.success(isRTL ? 'تم التحديث' : 'Updated');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setConfirmStatus(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost"><MoreHorizontal className="w-4 h-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="w-4 h-4 me-2" />
            {isRTL ? 'تعديل البيانات والدور' : 'Edit info & role'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setConfirmReset(true)}>
            <KeyRound className="w-4 h-4 me-2" />
            {isRTL ? 'إعادة تعيين كلمة المرور' : 'Reset password'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setConfirmStatus(true)} className={active ? 'text-destructive' : ''}>
            {active
              ? <><UserX className="w-4 h-4 me-2" />{isRTL ? 'إيقاف' : 'Deactivate'}</>
              : <><UserCheck className="w-4 h-4 me-2" />{isRTL ? 'تفعيل' : 'Activate'}</>}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? 'إعادة تعيين كلمة المرور؟' : 'Reset password?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL ? `سيتم إرسال رابط إلى ${member.profile?.email}` : `A reset link will be sent to ${member.profile?.email}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={doReset}>{isRTL ? 'إرسال' : 'Send'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmStatus} onOpenChange={setConfirmStatus}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {active ? (isRTL ? 'إيقاف هذا المستخدم؟' : 'Deactivate this user?') : (isRTL ? 'تفعيل هذا المستخدم؟' : 'Activate this user?')}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={doToggle} className={active ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}>
              {isRTL ? 'تأكيد' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EditUserDialog({ member, companyId, onClose }: { member: any; companyId: string; onClose: () => void }) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const qc = useQueryClient();
  const updateRole = useUpdateUserRole();
  const [fullName, setFullName] = useState(member.profile?.full_name || '');
  const [phone, setPhone] = useState(member.profile?.phone || '');
  const initialRole = (member.appRoles?.[0] as AppRole) || 'assessor';
  const [role, setRole] = useState<AppRole>(initialRole);
  const [branchId, setBranchId] = useState<string>(member.profile?.branch_id || '');
  const { data: branches = [] } = useCompanyBranches(companyId);
  const isCompanyLevel = COMPANY_LEVEL_ROLES.includes(role);

  const save = useMutation({
    mutationFn: async () => {
      if (!isCompanyLevel && !branchId) {
        throw new Error(isRTL ? 'يجب اختيار فرع لهذا الدور' : 'Branch required for this role');
      }
      const { error: pErr } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone || null,
          branch_id: isCompanyLevel ? null : branchId,
        })
        .eq('user_id', member.user_id);
      if (pErr) throw pErr;
      if (role !== initialRole) {
        await updateRole.mutateAsync({ userId: member.user_id, newRole: role });
      }
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تم الحفظ' : 'Saved');
      qc.invalidateQueries({ queryKey: ['super-admin-company-users', companyId] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isRTL ? 'تعديل بيانات المستخدم' : 'Edit user'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>{isRTL ? 'البريد الإلكتروني' : 'Email'}</Label><Input value={member.profile?.email || ''} disabled className="mt-1" /></div>
          <div><Label>{isRTL ? 'الاسم الكامل' : 'Full name'}</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} className="mt-1" /></div>
          <div><Label>{isRTL ? 'الجوال' : 'Phone'}</Label><Input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1" /></div>
          <div>
            <Label>{isRTL ? 'الدور' : 'Role'}</Label>
            <Select value={role} onValueChange={(v) => { const nr = v as AppRole; setRole(nr); if (COMPANY_LEVEL_ROLES.includes(nr)) setBranchId(''); }}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {!isCompanyLevel && (
            <div>
              <Label>{isRTL ? 'الفرع' : 'Branch'}</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={isRTL ? 'اختر فرع' : 'Select branch'} /></SelectTrigger>
                <SelectContent>
                  {branches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{isRTL ? (b.name_ar || b.name) : b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {isCompanyLevel && (
            <p className="text-xs text-muted-foreground">
              {isRTL ? 'دور على مستوى الشركة — بدون فرع.' : 'Company-level role — no branch.'}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{isRTL ? 'حفظ' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateUserDialog({ companyId, onClose }: { companyId: string; onClose: () => void }) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const qc = useQueryClient();
  const createUser = useCreateUser();
  const [form, setForm] = useState({ email: '', fullName: '', password: '', role: 'assessor' as AppRole, branchId: '', phone: '', jobTitle: '', directManagerId: '' });
  const { data: branches = [] } = useCompanyBranches(companyId);
  const { data: employees = [] } = useCompanyEmployees(companyId);
  const isCompanyLevel = COMPANY_LEVEL_ROLES.includes(form.role);

  const submit = async () => {
    if (!form.email || !form.fullName || form.password.length < 6) {
      toast.error(isRTL ? 'اكمل الحقول (كلمة المرور 6+ أحرف)' : 'Fill all fields (password 6+ chars)');
      return;
    }
    if (!isCompanyLevel && !form.branchId) {
      toast.error(isRTL ? 'اختر فرع لهذا الدور' : 'Select a branch for this role');
      return;
    }
    try {
      await createUser.mutateAsync({
        email: form.email,
        fullName: form.fullName,
        password: form.password,
        role: form.role,
        forcePasswordChange: true,
        companyId,
        branchId: isCompanyLevel ? undefined : form.branchId,
        phone: form.phone || undefined,
        jobTitle: form.jobTitle || undefined,
        directManagerId: form.directManagerId || undefined,
      });
      toast.success(isRTL ? 'تم إنشاء المستخدم' : 'User created');
      qc.invalidateQueries({ queryKey: ['super-admin-company-users', companyId] });
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isRTL ? 'إضافة مستخدم للشركة' : 'Add user to company'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>{isRTL ? 'الاسم الكامل' : 'Full name'}</Label><Input className="mt-1" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></div>
          <div><Label>{isRTL ? 'البريد الإلكتروني' : 'Email'}</Label><Input type="email" className="mt-1" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>{isRTL ? 'رقم الجوال' : 'Phone'}</Label><Input className="mt-1" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>{isRTL ? 'المنصب' : 'Job title'}</Label><Input className="mt-1" value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })} /></div>
          <div><Label>{isRTL ? 'كلمة المرور المؤقتة' : 'Temporary password'}</Label><Input className="mt-1" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
          <div>
            <Label>{isRTL ? 'المدير المباشر' : 'Direct manager'}</Label>
            <Select value={form.directManagerId} onValueChange={(v) => setForm({ ...form, directManagerId: v })}>
              <SelectTrigger className="mt-1"><SelectValue placeholder={isRTL ? 'اختر مدير' : 'Select manager'} /></SelectTrigger>
              <SelectContent>
                {employees.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    {isRTL ? 'لا يوجد موظفون بعد' : 'No employees yet'}
                  </div>
                )}
                {employees.map((e: any) => (
                  <SelectItem key={e.user_id} value={e.user_id}>{e.full_name || e.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{isRTL ? 'الدور' : 'Role'}</Label>
            <Select value={form.role} onValueChange={(v) => {
              const nr = v as AppRole;
              setForm(f => ({ ...f, role: nr, branchId: COMPANY_LEVEL_ROLES.includes(nr) ? '' : f.branchId }));
            }}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {!isCompanyLevel && (
            <div>
              <Label>{isRTL ? 'الفرع' : 'Branch'}</Label>
              <Select value={form.branchId} onValueChange={(v) => setForm({ ...form, branchId: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={isRTL ? 'اختر فرع' : 'Select branch'} /></SelectTrigger>
                <SelectContent>
                  {branches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{isRTL ? (b.name_ar || b.name) : b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {isCompanyLevel && (
            <p className="text-xs text-muted-foreground">
              {isRTL ? 'دور على مستوى الشركة — بدون فرع.' : 'Company-level role — no branch.'}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
          <Button onClick={submit} disabled={createUser.isPending}>{isRTL ? 'إنشاء' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}