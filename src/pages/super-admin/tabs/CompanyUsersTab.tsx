import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCreateUser, useResetPassword, useUpdateUserStatus, useUpdateUserRole } from '@/hooks/useUsers';
import type { AppRole } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Users, Loader2, MoreHorizontal, KeyRound, Pencil, UserX, UserCheck, Plus, Mail, Eye, EyeOff, Key, Wand2 } from 'lucide-react';
import { DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { generateStrongPassword, getPasswordPolicyError, getWeakPasswordServerMessage } from '@/lib/passwordPolicy';
import { useAuditLog } from '@/hooks/useAuditLog';

const ASSIGNABLE_ROLES: AppRole[] = ['admin', 'executive', 'branch_manager', 'assessor', 'branch_employee', 'support_agent'];
const COMPANY_LEVEL_ROLES: AppRole[] = ['admin', 'executive'];
const SUPERVISOR_ELIGIBLE_ROLES: AppRole[] = ['branch_manager', 'executive', 'assessor'];

function useSupervisedBranches(userId: string, companyId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['branch-supervisors', userId, companyId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branch_supervisors')
        .select('branch_id')
        .eq('user_id', userId)
        .eq('company_id', companyId);
      if (error) throw error;
      return (data || []).map((r: any) => r.branch_id as string);
    },
  });
}

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
  const { isAdmin, roles } = useAuth();
  const audit = useAuditLog();
  const isSuperAdmin = roles.includes('super_admin');
  const canChangeEmail = isSuperAdmin || isAdmin;
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [resetMode, setResetMode] = useState<'choose' | 'email' | 'manual' | 'done'>('choose');
  const [manualPassword, setManualPassword] = useState('');
  const [confirmPasswordText, setConfirmPasswordText] = useState('');
  const [showManualPassword, setShowManualPassword] = useState(false);
  const [resetResult, setResetResult] = useState<{ tempPassword?: string; emailSent?: boolean } | null>(null);

  const active = member.profile?.is_active !== false;

  const resetDialogState = () => {
    setResetMode('choose');
    setManualPassword('');
    setConfirmPasswordText('');
    setShowManualPassword(false);
    setResetResult(null);
  };

  const handleResetViaEmail = async () => {
    try {
      const result: any = await resetPassword.mutateAsync({ userId: member.user_id, email: member.profile?.email });
      setResetResult(result);
      setResetMode('done');
      await audit({ action: 'user.password_reset_email', entityType: 'user', entityId: member.user_id, companyId, details: { email: member.profile?.email } });
      toast.success(
        isRTL
          ? (result?.emailSent ? `تم إرسال كلمة المرور إلى ${member.profile?.email}` : 'تم إعادة تعيين كلمة المرور')
          : (result?.emailSent ? `Password sent to ${member.profile?.email}` : 'Password reset successfully')
      );
    } catch (e: any) {
      toast.error(e.message || (isRTL ? 'فشل إعادة التعيين' : 'Failed to reset password'));
    }
  };

  const handleResetManual = async () => {
    if (manualPassword !== confirmPasswordText) {
      toast.error(isRTL ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }
    const policyError = getPasswordPolicyError(manualPassword, language);
    if (policyError) {
      toast.error(policyError);
      return;
    }
    try {
      await resetPassword.mutateAsync({ userId: member.user_id, email: member.profile?.email, customPassword: manualPassword });
      setResetResult({});
      setResetMode('done');
      await audit({ action: 'user.password_reset_manual', entityType: 'user', entityId: member.user_id, companyId, details: { email: member.profile?.email } });
      toast.success(isRTL ? 'تم تعيين كلمة المرور بنجاح' : 'Password set successfully');
    } catch (e: any) {
      toast.error(e?.code === 'weak_password' ? getWeakPasswordServerMessage(language) : (e.message || (isRTL ? 'فشل تعيين كلمة المرور' : 'Failed to set password')));
    }
  };

  const generateManualPassword = () => {
    const password = generateStrongPassword();
    setManualPassword(password);
    setConfirmPasswordText(password);
    setShowManualPassword(true);
    toast.success(isRTL ? 'تم توليد كلمة مرور' : 'Password generated');
  };

  const doToggle = async () => {
    try {
      await updateStatus.mutateAsync({ userId: member.user_id, isActive: !active });
      await audit({
        action: active ? 'user.deactivated' : 'user.activated',
        entityType: 'user',
        entityId: member.user_id,
        companyId,
        details: { email: member.profile?.email, from: active, to: !active },
      });
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
          {canChangeEmail && (
            <DropdownMenuItem onClick={() => { setNewEmail(member.profile?.email || ''); setEmailOpen(true); }}>
              <Mail className="w-4 h-4 me-2" />
              {isRTL ? 'تغيير البريد الإلكتروني' : 'Change email'}
            </DropdownMenuItem>
          )}
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

      <Dialog open={confirmReset} onOpenChange={(o) => { setConfirmReset(o); if (!o) resetDialogState(); }}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{isRTL ? 'إعادة تعيين كلمة المرور' : 'Reset password'}</DialogTitle>
            <DialogDescription>
              {isRTL ? 'اختر طريقة إعادة تعيين كلمة المرور' : 'Choose how to reset the password'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div className="p-3 bg-muted/40 rounded-lg">
              <p className="font-medium text-sm">{member.profile?.full_name}</p>
              <p className="text-xs text-muted-foreground">{member.profile?.email}</p>
            </div>

            {resetMode === 'choose' && (
              <div className="flex flex-col gap-3">
                <Button variant="outline" className="justify-start gap-3 h-auto py-3" onClick={() => setResetMode('email')}>
                  <Mail className="w-5 h-5 text-primary" />
                  <div className="text-start">
                    <p className="font-medium">{isRTL ? 'إرسال عبر البريد الإلكتروني' : 'Send via Email'}</p>
                    <p className="text-xs text-muted-foreground">{isRTL ? 'إنشاء كلمة مرور مؤقتة وإرسالها للمستخدم' : 'Generate a temporary password and email it to the user'}</p>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start gap-3 h-auto py-3" onClick={() => setResetMode('manual')}>
                  <Key className="w-5 h-5 text-primary" />
                  <div className="text-start">
                    <p className="font-medium">{isRTL ? 'تعيين يدوي' : 'Set Manually'}</p>
                    <p className="text-xs text-muted-foreground">{isRTL ? 'إدخال كلمة مرور جديدة يدوياً' : 'Enter a new password manually'}</p>
                  </div>
                </Button>
              </div>
            )}

            {resetMode === 'email' && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm">
                  {isRTL
                    ? 'سيتم إنشاء كلمة مرور مؤقتة وإرسالها إلى بريد المستخدم. متابعة؟'
                    : "A new temporary password will be generated and sent to the user's email. Continue?"}
                </p>
              </div>
            )}

            {resetMode === 'manual' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>{isRTL ? 'كلمة المرور الجديدة' : 'New Password'}</Label>
                    <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={generateManualPassword}>
                      <Wand2 className="w-3.5 h-3.5" />
                      {isRTL ? 'توليد' : 'Generate'}
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      type={showManualPassword ? 'text' : 'password'}
                      value={manualPassword}
                      onChange={(e) => setManualPassword(e.target.value)}
                      placeholder={isRTL ? '6 خانات أو أكثر' : '6+ characters'}
                    />
                    <Button type="button" variant="ghost" size="icon" className="absolute end-0 top-0 h-full px-3" onClick={() => setShowManualPassword(!showManualPassword)}>
                      {showManualPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'تأكيد كلمة المرور' : 'Confirm Password'}</Label>
                  <Input
                    type={showManualPassword ? 'text' : 'password'}
                    value={confirmPasswordText}
                    onChange={(e) => setConfirmPasswordText(e.target.value)}
                    placeholder={isRTL ? 'أعد إدخال كلمة المرور' : 'Re-enter password'}
                  />
                </div>
                {manualPassword && confirmPasswordText && manualPassword !== confirmPasswordText && (
                  <p className="text-xs text-destructive">{isRTL ? 'كلمات المرور غير متطابقة' : 'Passwords do not match'}</p>
                )}
                {manualPassword && manualPassword === confirmPasswordText && getPasswordPolicyError(manualPassword, language) && (
                  <p className="text-xs text-destructive">{getPasswordPolicyError(manualPassword, language)}</p>
                )}
              </div>
            )}

            {resetMode === 'done' && (
              <div className="space-y-3">
                {resetResult?.tempPassword && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                    <p className="text-sm font-medium">{isRTL ? 'كلمة المرور المؤقتة الجديدة:' : 'New temporary password:'}</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-muted rounded text-sm font-mono select-all break-all">{resetResult.tempPassword}</code>
                      <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(resetResult.tempPassword!); toast.success(isRTL ? 'تم النسخ' : 'Copied!'); }}>
                        {isRTL ? 'نسخ' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                )}
                {resetResult?.emailSent && (
                  <div className="p-3 bg-score-excellent/10 border border-score-excellent/20 rounded-lg">
                    <p className="text-sm text-score-excellent">{isRTL ? '✓ تم إرسال كلمة المرور الجديدة عبر البريد الإلكتروني' : '✓ New password has been sent via email'}</p>
                  </div>
                )}
                {!resetResult?.tempPassword && !resetResult?.emailSent && (
                  <div className="p-3 bg-score-excellent/10 border border-score-excellent/20 rounded-lg">
                    <p className="text-sm text-score-excellent">{isRTL ? '✓ تم تعيين كلمة المرور بنجاح' : '✓ Password has been set successfully'}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            {resetMode === 'done' ? (
              <Button onClick={() => { setConfirmReset(false); resetDialogState(); }}>
                {isRTL ? 'إغلاق' : 'Close'}
              </Button>
            ) : resetMode === 'choose' ? (
              <Button variant="outline" onClick={() => setConfirmReset(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
            ) : (
              <div className="flex gap-2 w-full justify-end">
                <Button variant="outline" onClick={() => setResetMode('choose')}>{isRTL ? 'رجوع' : 'Back'}</Button>
                {resetMode === 'email' && (
                  <Button onClick={handleResetViaEmail} disabled={resetPassword.isPending}>
                    {resetPassword.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                    <Mail className="w-4 h-4 me-2" />
                    {isRTL ? 'إرسال' : 'Send'}
                  </Button>
                )}
                {resetMode === 'manual' && (
                  <Button onClick={handleResetManual} disabled={resetPassword.isPending || !manualPassword || manualPassword !== confirmPasswordText || !!getPasswordPolicyError(manualPassword, language)}>
                    {resetPassword.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                    <Key className="w-4 h-4 me-2" />
                    {isRTL ? 'تعيين كلمة المرور' : 'Set Password'}
                  </Button>
                )}
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isRTL ? 'تغيير البريد الإلكتروني' : 'Change email'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              {isRTL ? 'البريد الحالي:' : 'Current:'} <span className="font-medium">{member.profile?.email}</span>
            </div>
            <div>
              <Label>{isRTL ? 'البريد الجديد' : 'New email'}</Label>
              <Input type="email" className="mt-1" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEmailOpen(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
            <Button
              disabled={emailSaving || !newEmail || newEmail === member.profile?.email}
              onClick={async () => {
                setEmailSaving(true);
                try {
                  const { data, error } = await supabase.functions.invoke('update-user-email', {
                    body: { userId: member.user_id, newEmail: newEmail.trim() },
                  });
                  if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
                  toast.success(isRTL ? 'تم تحديث البريد' : 'Email updated');
                  await audit({
                    action: 'user.email_changed',
                    entityType: 'user',
                    entityId: member.user_id,
                    companyId,
                    details: { from: member.profile?.email, to: newEmail.trim() },
                  });
                  qc.invalidateQueries({ queryKey: ['super-admin-company-users', companyId] });
                  setEmailOpen(false);
                } catch (e: any) {
                  toast.error(e.message || (isRTL ? 'فشل التحديث' : 'Update failed'));
                } finally {
                  setEmailSaving(false);
                }
              }}
            >
              {emailSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRTL ? 'حفظ' : 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EditUserDialog({ member, companyId, onClose }: { member: any; companyId: string; onClose: () => void }) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const qc = useQueryClient();
  const updateRole = useUpdateUserRole();
  const audit = useAuditLog();
  const [fullName, setFullName] = useState(member.profile?.full_name || '');
  const [phone, setPhone] = useState(member.profile?.phone || '');
  const [jobTitle, setJobTitle] = useState(member.profile?.job_title || '');
  const [directManagerId, setDirectManagerId] = useState<string>(member.profile?.direct_manager_id || '');
  const initialRole = (member.appRoles?.[0] as AppRole) || 'assessor';
  const [role, setRole] = useState<AppRole>(initialRole);
  const [branchId, setBranchId] = useState<string>(member.profile?.branch_id || '');
  const { data: branches = [] } = useCompanyBranches(companyId);
  const { data: employees = [] } = useCompanyEmployees(companyId);
  const isCompanyLevel = COMPANY_LEVEL_ROLES.includes(role);
  const canSupervise = SUPERVISOR_ELIGIBLE_ROLES.includes(role);
  const { data: initialSupervised = [] } = useSupervisedBranches(member.user_id, companyId, canSupervise);
  const [supervisedIds, setSupervisedIds] = useState<string[] | null>(null);
  const effectiveSupervised = supervisedIds ?? initialSupervised;

  const save = useMutation({
    mutationFn: async () => {
      if (!isCompanyLevel && !branchId) {
        throw new Error(isRTL ? 'يجب اختيار فرع لهذا الدور' : 'Branch required for this role');
      }
      const changes: Record<string, { from: any; to: any }> = {};
      const cmp = (k: string, a: any, b: any) => { const x = a ?? null; const y = b ?? null; if (x !== y) changes[k] = { from: x, to: y }; };
      cmp('full_name', member.profile?.full_name, fullName);
      cmp('phone', member.profile?.phone, phone || null);
      cmp('job_title', member.profile?.job_title, jobTitle || null);
      cmp('direct_manager_id', member.profile?.direct_manager_id, directManagerId || null);
      cmp('branch_id', member.profile?.branch_id, isCompanyLevel ? null : branchId);
      cmp('role', initialRole, role);
      const { error: pErr } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone || null,
          job_title: jobTitle || null,
          direct_manager_id: directManagerId || null,
          branch_id: isCompanyLevel ? null : branchId,
        } as any)
        .eq('user_id', member.user_id);
      if (pErr) throw pErr;
      if (role !== initialRole) {
        await updateRole.mutateAsync({ userId: member.user_id, newRole: role });
      }
      // Sync supervised branches
      if (canSupervise) {
        const desired = new Set(effectiveSupervised.filter(id => id && id !== branchId));
        const current = new Set(initialSupervised);
        const toAdd = [...desired].filter(id => !current.has(id));
        const toRemove = [...current].filter(id => !desired.has(id));
        if (toRemove.length) {
          const { error } = await supabase
            .from('branch_supervisors')
            .delete()
            .eq('user_id', member.user_id)
            .eq('company_id', companyId)
            .in('branch_id', toRemove);
          if (error) throw error;
          changes['supervised_removed'] = { from: [...current], to: [...desired] };
        }
        if (toAdd.length) {
          const { error } = await supabase
            .from('branch_supervisors')
            .insert(toAdd.map(bid => ({ user_id: member.user_id, company_id: companyId, branch_id: bid })));
          if (error) throw error;
          changes['supervised_added'] = { from: [...current], to: [...desired] };
        }
      } else if (initialSupervised.length) {
        // Role changed to a non-supervisor role: clear extras
        await supabase
          .from('branch_supervisors')
          .delete()
          .eq('user_id', member.user_id)
          .eq('company_id', companyId);
        changes['supervised_cleared'] = { from: initialSupervised, to: [] };
      }
      if (Object.keys(changes).length > 0) {
        await audit({
          action: 'user.updated',
          entityType: 'user',
          entityId: member.user_id,
          companyId,
          details: { email: member.profile?.email, changes },
        });
      }
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تم الحفظ' : 'Saved');
      qc.invalidateQueries({ queryKey: ['super-admin-company-users', companyId] });
      qc.invalidateQueries({ queryKey: ['branch-supervisors', member.user_id, companyId] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader><DialogTitle>{isRTL ? 'تعديل بيانات المستخدم' : 'Edit user'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>{isRTL ? 'البريد الإلكتروني' : 'Email'}</Label><Input value={member.profile?.email || ''} disabled className="mt-1" /></div>
          <div><Label>{isRTL ? 'الاسم الكامل' : 'Full name'}</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} className="mt-1" /></div>
          <div><Label>{isRTL ? 'الجوال' : 'Phone'}</Label><Input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1" /></div>
          <div><Label>{isRTL ? 'المنصب' : 'Job title'}</Label><Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} className="mt-1" /></div>
          <div>
            <Label>{isRTL ? 'المدير المباشر' : 'Direct manager'}</Label>
            <Select value={directManagerId || 'none'} onValueChange={(v) => setDirectManagerId(v === 'none' ? '' : v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder={isRTL ? 'اختر مدير' : 'Select manager'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{isRTL ? 'بدون' : 'None'}</SelectItem>
                {(employees as any[]).filter(e => e.user_id !== member.user_id).map((e: any) => (
                  <SelectItem key={e.user_id} value={e.user_id}>{e.full_name || e.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              {isRTL ? 'من موظفي نفس الشركة فقط.' : 'From the same company only.'}
            </p>
          </div>
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
          {canSupervise && (
            <div>
              <Label>{isRTL ? 'فروع إضافية تحت الإشراف' : 'Additional supervised branches'}</Label>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                {isRTL
                  ? 'يحصل المستخدم على صلاحيات مدير الفرع كاملة على الفروع المختارة.'
                  : 'The user gets full branch-manager permissions on the selected branches.'}
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-2">
                {branches.filter((b: any) => b.id !== branchId).map((b: any) => {
                  const checked = effectiveSupervised.includes(b.id);
                  return (
                    <label key={b.id} className="flex items-center gap-2 cursor-pointer text-sm py-1">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = new Set(effectiveSupervised);
                          if (checked) next.delete(b.id); else next.add(b.id);
                          setSupervisedIds([...next]);
                        }}
                      />
                      <span>{isRTL ? (b.name_ar || b.name) : b.name}</span>
                    </label>
                  );
                })}
                {branches.filter((b: any) => b.id !== branchId).length === 0 && (
                  <p className="text-xs text-muted-foreground">{isRTL ? 'لا توجد فروع أخرى' : 'No other branches'}</p>
                )}
              </div>
            </div>
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
  const [supervisedBranchIds, setSupervisedBranchIds] = useState<string[]>([]);
  const { data: branches = [] } = useCompanyBranches(companyId);
  const { data: employees = [] } = useCompanyEmployees(companyId);
  const isCompanyLevel = COMPANY_LEVEL_ROLES.includes(form.role);
  const showSupervised = SUPERVISOR_ELIGIBLE_ROLES.includes(form.role);
  const [emailStatus, setEmailStatus] = useState<
    | { state: 'idle' | 'checking' | 'ok' }
    | { state: 'taken'; companies: string[] }
    | { state: 'invalid' }
  >({ state: 'idle' });

  // Debounced live email uniqueness check
  const emailValue = form.email.trim().toLowerCase();
  useEffect(() => {
    if (!emailValue) { setEmailStatus({ state: 'idle' }); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      setEmailStatus({ state: 'invalid' });
      return;
    }
    let cancelled = false;
    setEmailStatus({ state: 'checking' });
    const t = setTimeout(async () => {
      const { data: prof } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('email', emailValue)
        .maybeSingle();
      if (cancelled) return;
      if (!prof?.user_id) { setEmailStatus({ state: 'ok' }); return; }
      const { data: cu } = await supabase
        .from('company_users')
        .select('companies:company_id(name)')
        .eq('user_id', prof.user_id);
      if (cancelled) return;
      const names = (cu || []).map((r: any) => r.companies?.name).filter(Boolean);
      setEmailStatus({ state: 'taken', companies: names });
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [emailValue]);

  const submit = async () => {
    if (emailStatus.state === 'taken') {
      toast.error(isRTL ? 'هذا البريد مسجّل مسبقًا' : 'This email is already registered');
      return;
    }
    if (!form.email || !form.fullName || form.password.length < 6) {
      toast.error(isRTL ? 'اكمل الحقول (كلمة المرور 6+ أحرف)' : 'Fill all fields (password 6+ chars)');
      return;
    }
    if (!isCompanyLevel && !form.branchId) {
      toast.error(isRTL ? 'اختر فرع لهذا الدور' : 'Select a branch for this role');
      return;
    }
    try {
      const created = await createUser.mutateAsync({
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
      // Insert supervised branches (exclude the primary branch to avoid duplication)
      const newUserId: string | undefined = (created as any)?.user?.id;
      if (newUserId && showSupervised) {
        const extras = supervisedBranchIds.filter(id => id && id !== form.branchId);
        if (extras.length > 0) {
          const { error: supErr } = await supabase
            .from('branch_supervisors')
            .insert(extras.map(bid => ({ user_id: newUserId, company_id: companyId, branch_id: bid })));
          if (supErr) console.error('branch_supervisors insert failed', supErr);
        }
      }
      toast.success(isRTL ? 'تم إنشاء المستخدم' : 'User created');
      qc.invalidateQueries({ queryKey: ['super-admin-company-users', companyId] });
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader><DialogTitle>{isRTL ? 'إضافة مستخدم للشركة' : 'Add user to company'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>{isRTL ? 'الاسم الكامل' : 'Full name'}</Label><Input className="mt-1" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></div>
          <div>
            <Label>{isRTL ? 'البريد الإلكتروني' : 'Email'}</Label>
            <Input
              type="email"
              className="mt-1"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
            {emailStatus.state === 'checking' && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                {isRTL ? 'جاري التحقق من البريد…' : 'Checking email…'}
              </p>
            )}
            {emailStatus.state === 'ok' && (
              <p className="text-xs text-emerald-600 mt-1">
                {isRTL ? '✓ البريد متاح' : '✓ Email available'}
              </p>
            )}
            {emailStatus.state === 'invalid' && form.email.length > 3 && (
              <p className="text-xs text-destructive mt-1">
                {isRTL ? 'صيغة بريد غير صحيحة' : 'Invalid email format'}
              </p>
            )}
            {emailStatus.state === 'taken' && (
              <p className="text-xs text-destructive mt-1">
                {isRTL
                  ? `هذا البريد مسجّل مسبقًا${emailStatus.companies.length ? ` في: ${emailStatus.companies.join('، ')}` : ''}`
                  : `Email already registered${emailStatus.companies.length ? ` in: ${emailStatus.companies.join(', ')}` : ''}`}
              </p>
            )}
          </div>
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
          {showSupervised && (
            <div>
              <Label>{isRTL ? 'فروع إضافية تحت الإشراف' : 'Additional supervised branches'}</Label>
              <p className="text-xs text-muted-foreground mb-2">
                {isRTL
                  ? 'يحصل المستخدم على صلاحيات مدير الفرع الكاملة على الفروع المختارة.'
                  : 'The user gets full branch-manager permissions on the selected branches.'}
              </p>
              <div className="space-y-2 border rounded-md p-2 max-h-48 overflow-y-auto">
                {branches.filter((b: any) => b.id !== form.branchId).map((b: any) => {
                  const checked = supervisedBranchIds.includes(b.id);
                  return (
                    <label key={b.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setSupervisedBranchIds(prev =>
                            e.target.checked ? [...prev, b.id] : prev.filter(id => id !== b.id)
                          );
                        }}
                      />
                      <span>{isRTL ? (b.name_ar || b.name) : b.name}</span>
                    </label>
                  );
                })}
                {branches.filter((b: any) => b.id !== form.branchId).length === 0 && (
                  <p className="text-xs text-muted-foreground">{isRTL ? 'لا توجد فروع أخرى' : 'No other branches'}</p>
                )}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
          <Button
            onClick={submit}
            disabled={createUser.isPending || emailStatus.state === 'taken' || emailStatus.state === 'checking' || emailStatus.state === 'invalid'}
          >
            {isRTL ? 'إنشاء' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}