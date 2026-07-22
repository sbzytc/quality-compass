import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { useUpdateUserRole, useToggleAIAssistant, useToggleFeatureAccess, UserWithRole } from '@/hooks/useUsers';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ASSIGNABLE_ROLES: AppRole[] = ['admin', 'executive', 'branch_manager', 'assessor', 'branch_employee', 'support_agent'];
const COMPANY_LEVEL_ROLES: AppRole[] = ['admin', 'executive'];
const SUPERVISOR_ELIGIBLE_ROLES: AppRole[] = ['branch_manager', 'executive'];

const roleLabel: Record<AppRole, { en: string; ar: string }> = {
  super_admin: { en: 'Super Admin', ar: 'مدير المنصة' },
  admin: { en: 'Admin', ar: 'أدمن' },
  executive: { en: 'Executive', ar: 'تنفيذي' },
  branch_manager: { en: 'Branch Manager', ar: 'مدير الفرع' },
  assessor: { en: 'Assessor', ar: 'مقيّم' },
  branch_employee: { en: 'Employee', ar: 'موظف فرع' },
  support_agent: { en: 'Support Agent', ar: 'دعم فني' },
};

type EditUser = Pick<UserWithRole,
  'user_id' | 'email' | 'full_name' | 'phone' | 'branch_id' | 'is_active' |
  'ai_assistant_enabled' | 'can_view_customer_feedback' | 'can_view_complaints' | 'can_view_suggestions' |
  'job_title' | 'direct_manager_id' | 'roles'>;

interface Props {
  user: EditUser;
  companyId: string;
  onClose: () => void;
  onSaved?: () => void;
}

export default function UserEditDialog({ user, companyId, onClose, onSaved }: Props) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const qc = useQueryClient();
  const audit = useAuditLog();
  const updateRole = useUpdateUserRole();
  const toggleAI = useToggleAIAssistant();
  const toggleFeature = useToggleFeatureAccess();
  const { user: authUser, refreshProfile } = useAuth();

  const initialRole = (user.roles?.[0] as AppRole) || 'assessor';
  const [fullName, setFullName] = useState(user.full_name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [jobTitle, setJobTitle] = useState(user.job_title || '');
  const [directManagerId, setDirectManagerId] = useState<string>(user.direct_manager_id || '');
  const [role, setRole] = useState<AppRole>(initialRole);
  const [branchId, setBranchId] = useState<string>(user.branch_id || '');
  const [aiEnabled, setAiEnabled] = useState(!!user.ai_assistant_enabled);
  const [canFeedback, setCanFeedback] = useState(!!user.can_view_customer_feedback);
  const [canComplaints, setCanComplaints] = useState(!!user.can_view_complaints);
  const [canSuggestions, setCanSuggestions] = useState(!!user.can_view_suggestions);
  const [saving, setSaving] = useState(false);

  const isCompanyLevel = COMPANY_LEVEL_ROLES.includes(role);
  const canSupervise = SUPERVISOR_ELIGIBLE_ROLES.includes(role);

  const { data: branches = [] } = useQuery({
    queryKey: ['company-branches-min', companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches')
        .select('id, name, name_ar').eq('company_id', companyId).eq('is_active', true).order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['company-employees-all', companyId],
    queryFn: async () => {
      const { data: cu, error } = await supabase.from('company_users')
        .select('user_id').eq('company_id', companyId).eq('is_active', true);
      if (error) throw error;
      const ids = (cu || []).map((r: any) => r.user_id);
      if (!ids.length) return [];
      const { data: profs, error: e2 } = await supabase.from('profiles')
        .select('user_id, full_name, email').in('user_id', ids).eq('is_active', true);
      if (e2) throw e2;
      return profs || [];
    },
  });

  const managerOptions = useMemo(
    () => (employees as any[]).filter(e => e.user_id !== user.user_id),
    [employees, user.user_id]
  );

  const { data: initialSupervised = [] } = useQuery({
    queryKey: ['branch-supervisors', user.user_id, companyId],
    enabled: canSupervise,
    queryFn: async () => {
      const { data, error } = await supabase.from('branch_supervisors')
        .select('branch_id').eq('user_id', user.user_id).eq('company_id', companyId);
      if (error) throw error;
      return (data || []).map((r: any) => r.branch_id as string);
    },
  });
  const [supervisedIds, setSupervisedIds] = useState<string[] | null>(null);
  const effectiveSupervised = supervisedIds ?? initialSupervised;

  const handleSave = async () => {
    if (!isCompanyLevel && !branchId) {
      toast.error(isRTL ? 'يجب اختيار فرع لهذا الدور' : 'Branch required for this role');
      return;
    }
    setSaving(true);
    const changes: Record<string, { from: any; to: any }> = {};
    const compareAndSet = (key: string, from: any, to: any) => {
      const a = from ?? null; const b = to ?? null;
      if (a !== b) changes[key] = { from: a, to: b };
    };
    compareAndSet('full_name', user.full_name, fullName);
    compareAndSet('phone', user.phone, phone || null);
    compareAndSet('job_title', user.job_title, jobTitle || null);
    compareAndSet('direct_manager_id', user.direct_manager_id, directManagerId || null);
    compareAndSet('branch_id', user.branch_id, isCompanyLevel ? null : branchId);
    compareAndSet('role', initialRole, role);
    compareAndSet('ai_assistant_enabled', !!user.ai_assistant_enabled, aiEnabled);
    compareAndSet('can_view_customer_feedback', !!user.can_view_customer_feedback, canFeedback);
    compareAndSet('can_view_complaints', !!user.can_view_complaints, canComplaints);
    compareAndSet('can_view_suggestions', !!user.can_view_suggestions, canSuggestions);

    try {
      const { error: pErr } = await supabase.from('profiles').update({
        full_name: fullName,
        phone: phone || null,
        job_title: jobTitle || null,
        direct_manager_id: directManagerId || null,
        branch_id: isCompanyLevel ? null : branchId,
        ai_assistant_enabled: aiEnabled,
        can_view_customer_feedback: canFeedback,
        can_view_complaints: canComplaints,
        can_view_suggestions: canSuggestions,
      } as any).eq('user_id', user.user_id);
      if (pErr) throw pErr;

      if (role !== initialRole) {
        await updateRole.mutateAsync({ userId: user.user_id, newRole: role });
      }

      if (canSupervise) {
        const desired = new Set(effectiveSupervised.filter(id => id && id !== branchId));
        const current = new Set(initialSupervised);
        const toAdd = [...desired].filter(id => !current.has(id));
        const toRemove = [...current].filter(id => !desired.has(id));
        if (toRemove.length) {
          const { error } = await supabase.from('branch_supervisors').delete()
            .eq('user_id', user.user_id).eq('company_id', companyId).in('branch_id', toRemove);
          if (error) throw error;
          changes['supervised_removed'] = { from: [...current], to: [...desired] };
        }
        if (toAdd.length) {
          const { error } = await supabase.from('branch_supervisors')
            .insert(toAdd.map(bid => ({ user_id: user.user_id, company_id: companyId, branch_id: bid })));
          if (error) throw error;
          changes['supervised_added'] = { from: [...current], to: [...desired] };
        }
      } else if (initialSupervised.length) {
        await supabase.from('branch_supervisors').delete()
          .eq('user_id', user.user_id).eq('company_id', companyId);
        changes['supervised_cleared'] = { from: initialSupervised, to: [] };
      }

      if (Object.keys(changes).length > 0) {
        await audit({
          action: 'user.updated',
          entityType: 'user',
          entityId: user.user_id,
          companyId,
          details: { email: user.email, changes },
        });
      }

      if (user.user_id === authUser?.id) await refreshProfile();
      toast.success(isRTL ? 'تم الحفظ' : 'Saved');
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['super-admin-company-users', companyId] });
      qc.invalidateQueries({ queryKey: ['branch-supervisors', user.user_id, companyId] });
      onSaved?.();
      onClose();
    } catch (e: any) {
      toast.error(e.message || (isRTL ? 'فشل الحفظ' : 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{isRTL ? 'تعديل بيانات المستخدم' : 'Edit user'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{isRTL ? 'البريد الإلكتروني' : 'Email'}</Label>
            <Input value={user.email} disabled className="mt-1" />
          </div>
          <div>
            <Label>{isRTL ? 'الاسم الكامل' : 'Full name'}</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{isRTL ? 'الجوال' : 'Phone'}</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>{isRTL ? 'المنصب' : 'Job title'}</Label>
              <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>{isRTL ? 'المدير المباشر' : 'Direct manager'}</Label>
            <Select value={directManagerId || 'none'} onValueChange={(v) => setDirectManagerId(v === 'none' ? '' : v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder={isRTL ? 'اختر مدير' : 'Select manager'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{isRTL ? 'بدون' : 'None'}</SelectItem>
                {managerOptions.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    {isRTL ? 'لا يوجد موظفون آخرون' : 'No other employees'}
                  </div>
                )}
                {managerOptions.map((e: any) => (
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
                {ASSIGNABLE_ROLES.map(r => <SelectItem key={r} value={r}>{roleLabel[r][language]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {!isCompanyLevel && (
            <div>
              <Label>{isRTL ? 'الفرع' : 'Branch'}</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={isRTL ? 'اختر فرع' : 'Select branch'} /></SelectTrigger>
                <SelectContent>
                  {(branches as any[]).map((b) => (
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
              <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-2 mt-1">
                {(branches as any[]).filter((b) => b.id !== branchId).map((b) => {
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
                {(branches as any[]).filter((b) => b.id !== branchId).length === 0 && (
                  <p className="text-xs text-muted-foreground">{isRTL ? 'لا توجد فروع أخرى' : 'No other branches'}</p>
                )}
              </div>
            </div>
          )}
          <div className="border-t pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer">{isRTL ? 'المساعد الذكي' : 'AI Assistant'}</Label>
              <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer">{isRTL ? 'صلاحية التقييمات' : 'Customer Feedback access'}</Label>
              <Switch checked={canFeedback} onCheckedChange={setCanFeedback} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer">{isRTL ? 'صلاحية الشكاوى' : 'Complaints access'}</Label>
              <Switch checked={canComplaints} onCheckedChange={setCanComplaints} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer">{isRTL ? 'صلاحية الاقتراحات' : 'Suggestions access'}</Label>
              <Switch checked={canSuggestions} onCheckedChange={setCanSuggestions} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
            {isRTL ? 'حفظ' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}