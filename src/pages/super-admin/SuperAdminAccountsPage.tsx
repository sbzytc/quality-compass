import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateUser, useResetPassword, useUpdateUserStatus } from '@/hooks/useUsers';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ShieldCheck, ArrowLeft, Plus, Loader2, KeyRound, MoreHorizontal, UserX, UserCheck, Pencil, Utensils, Stethoscope, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { SuperAdminHeader } from '@/components/SuperAdminHeader';

type Scope = 'all' | 'food' | 'medical';

const SCOPE_META: Record<Scope, { icon: any; ar: string; en: string; color: string }> = {
  all: { icon: Globe, ar: 'كل الموديولز', en: 'All modules', color: 'bg-slate-500' },
  food: { icon: Utensils, ar: 'المطاعم فقط', en: 'F&B only', color: 'bg-orange-500' },
  medical: { icon: Stethoscope, ar: 'العيادات فقط', en: 'Clinics only', color: 'bg-emerald-500' },
};

export default function SuperAdminAccountsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { language, direction } = useLanguage();
  const { user: currentUser, roles } = useAuth();
  const isRTL = direction === 'rtl';

  if (!roles.includes('super_admin')) return <Navigate to="/" replace />;

  const { data: admins, isLoading } = useQuery({
    queryKey: ['super-admin-accounts'],
    queryFn: async () => {
      const { data: roleRows, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'super_admin');
      if (error) throw error;
      const ids = (roleRows || []).map(r => r.user_id);
      if (!ids.length) return [];
      const [{ data: profiles }, { data: scopes }] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, email, phone, avatar_url, is_active').in('user_id', ids),
        supabase.from('super_admin_scopes').select('user_id, scope').in('user_id', ids),
      ]);
      const smap = new Map((scopes || []).map(s => [s.user_id, s.scope as Scope]));
      return (profiles || []).map(p => ({ ...p, scope: (smap.get(p.user_id) || 'all') as Scope }));
    },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#edf3ff] to-[#e8eff9] p-6" dir={direction}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/super-admin')} className="gap-2">
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            {isRTL ? 'الرجوع' : 'Back'}
          </Button>
          <SuperAdminHeader />
        </div>

        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-500/20 to-zinc-500/20 flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-slate-700" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{isRTL ? 'حسابات السوبر ادمن' : 'Super Admin Accounts'}</h1>
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'كل حساب سوبر ادمن يمكن أن يكون على موديول محدد أو على كل الموديولز' : 'Each super admin can be scoped to a specific module or to all modules'}
              </p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            {isRTL ? 'حساب سوبر ادمن جديد' : 'New Super Admin'}
          </Button>
        </div>

        {isLoading && <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}

        <div className="space-y-3">
          {admins?.map((a: any) => {
            const meta = SCOPE_META[a.scope];
            const ScopeIcon = meta.icon;
            const isSelf = a.user_id === currentUser?.id;
            return (
              <Card key={a.user_id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-full ${meta.color} flex items-center justify-center text-white`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate flex items-center gap-2">
                      {a.full_name || a.email}
                      {isSelf && <Badge variant="outline" className="text-[10px]">{isRTL ? 'أنت' : 'you'}</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{a.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${meta.color} hover:${meta.color} text-white gap-1`}>
                    <ScopeIcon className="w-3 h-3" />
                    {isRTL ? meta.ar : meta.en}
                  </Badge>
                  <Badge variant={a.is_active ? 'default' : 'secondary'}>
                    {a.is_active ? (isRTL ? 'نشط' : 'active') : (isRTL ? 'موقوف' : 'inactive')}
                  </Badge>
                  <AccountActions account={a} isSelf={isSelf} onEdit={() => setEditing(a)} />
                </div>
              </Card>
            );
          })}
          {admins?.length === 0 && !isLoading && (
            <div className="text-sm text-muted-foreground text-center py-8">
              {isRTL ? 'لا يوجد حسابات سوبر ادمن.' : 'No super admin accounts yet.'}
            </div>
          )}
        </div>

        <CreateSuperAdminDialog open={createOpen} onOpenChange={setCreateOpen} />
        {editing && <EditScopeDialog account={editing} onClose={() => setEditing(null)} />}
      </div>
    </div>
  );
}

function AccountActions({ account, isSelf, onEdit }: { account: any; isSelf: boolean; onEdit: () => void }) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const qc = useQueryClient();
  const resetPassword = useResetPassword();
  const updateStatus = useUpdateUserStatus();
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const doReset = async () => {
    try {
      await resetPassword.mutateAsync({ userId: account.user_id, email: account.email });
      toast.success(isRTL ? 'تم إرسال رابط تعيين كلمة المرور' : 'Password reset link sent');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setConfirmReset(false);
    }
  };

  const doToggle = async () => {
    try {
      await updateStatus.mutateAsync({ userId: account.user_id, isActive: !account.is_active });
      qc.invalidateQueries({ queryKey: ['super-admin-accounts'] });
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
            {isRTL ? 'تعديل النطاق والبيانات' : 'Edit scope & info'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setConfirmReset(true)}>
            <KeyRound className="w-4 h-4 me-2" />
            {isRTL ? 'إعادة تعيين كلمة المرور' : 'Reset password'}
          </DropdownMenuItem>
          {!isSelf && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setConfirmStatus(true)} className={account.is_active ? 'text-destructive' : ''}>
                {account.is_active
                  ? <><UserX className="w-4 h-4 me-2" />{isRTL ? 'إيقاف الحساب' : 'Deactivate'}</>
                  : <><UserCheck className="w-4 h-4 me-2" />{isRTL ? 'تفعيل الحساب' : 'Activate'}</>}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? 'إعادة تعيين كلمة المرور؟' : 'Reset password?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL ? `سيتم إرسال رابط لإعادة تعيين كلمة المرور إلى ${account.email}.` : `A password reset link will be sent to ${account.email}.`}
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
              {account.is_active
                ? (isRTL ? 'إيقاف هذا الحساب؟' : 'Deactivate this account?')
                : (isRTL ? 'تفعيل هذا الحساب؟' : 'Activate this account?')}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={doToggle} className={account.is_active ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}>
              {isRTL ? 'تأكيد' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EditScopeDialog({ account, onClose }: { account: any; onClose: () => void }) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const qc = useQueryClient();
  const [scope, setScope] = useState<Scope>(account.scope);
  const [fullName, setFullName] = useState(account.full_name || '');

  const save = useMutation({
    mutationFn: async () => {
      const { error: pErr } = await supabase.from('profiles').update({ full_name: fullName }).eq('user_id', account.user_id);
      if (pErr) throw pErr;
      const { error: sErr } = await supabase.from('super_admin_scopes').upsert({ user_id: account.user_id, scope });
      if (sErr) throw sErr;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تم الحفظ' : 'Saved');
      qc.invalidateQueries({ queryKey: ['super-admin-accounts'] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isRTL ? 'تعديل حساب السوبر ادمن' : 'Edit Super Admin'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{isRTL ? 'البريد الإلكتروني' : 'Email'}</Label>
            <Input value={account.email} disabled className="mt-1" />
          </div>
          <div>
            <Label>{isRTL ? 'الاسم الكامل' : 'Full name'}</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>{isRTL ? 'النطاق' : 'Scope'}</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'كل الموديولز' : 'All modules'}</SelectItem>
                <SelectItem value="food">{isRTL ? 'المطاعم فقط' : 'F&B only'}</SelectItem>
                <SelectItem value="medical">{isRTL ? 'العيادات فقط' : 'Clinics only'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{isRTL ? 'حفظ' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateSuperAdminDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const qc = useQueryClient();
  const createUser = useCreateUser();
  const [form, setForm] = useState({ email: '', fullName: '', password: '', scope: 'all' as Scope });

  const submit = async () => {
    if (!form.email || !form.fullName || form.password.length < 6) {
      toast.error(isRTL ? 'اكمل الحقول (كلمة المرور 6+ أحرف)' : 'Fill all fields (password 6+ chars)');
      return;
    }
    try {
      await createUser.mutateAsync({
        email: form.email,
        fullName: form.fullName,
        password: form.password,
        role: 'super_admin' as any,
        forcePasswordChange: true,
        ...( { superAdminScope: form.scope } as any ),
      } as any);
      toast.success(isRTL ? 'تم إنشاء حساب السوبر ادمن' : 'Super admin created');
      qc.invalidateQueries({ queryKey: ['super-admin-accounts'] });
      onOpenChange(false);
      setForm({ email: '', fullName: '', password: '', scope: 'all' });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isRTL ? 'حساب سوبر ادمن جديد' : 'New Super Admin'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>{isRTL ? 'الاسم الكامل' : 'Full name'}</Label><Input className="mt-1" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></div>
          <div><Label>{isRTL ? 'البريد الإلكتروني' : 'Email'}</Label><Input type="email" className="mt-1" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>{isRTL ? 'كلمة المرور المؤقتة' : 'Temporary password'}</Label><Input type="text" className="mt-1" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
          <div>
            <Label>{isRTL ? 'النطاق' : 'Scope'}</Label>
            <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v as Scope })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'كل الموديولز' : 'All modules'}</SelectItem>
                <SelectItem value="food">{isRTL ? 'المطاعم فقط' : 'F&B only'}</SelectItem>
                <SelectItem value="medical">{isRTL ? 'العيادات فقط' : 'Clinics only'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
          <Button onClick={submit} disabled={createUser.isPending}>{isRTL ? 'إنشاء' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}