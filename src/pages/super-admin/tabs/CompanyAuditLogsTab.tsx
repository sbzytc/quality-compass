import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Activity, Loader2, KeyRound, Mail, UserPlus, UserCog, UserMinus,
  Building2, ClipboardList, FileText, ShieldCheck, LogIn, Pencil, Trash2, ArrowLeftRight,
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';
import { getInitials } from '@/lib/getInitials';
import { useMemo } from 'react';

type ActionMeta = {
  title: { ar: string; en: string };
  icon: React.ElementType;
  tone: string;
};

const ACTIONS: Record<string, ActionMeta> = {
  'user.created':               { title: { ar: 'إنشاء مستخدم',        en: 'User created' },          icon: UserPlus,     tone: 'bg-emerald-100 text-emerald-700' },
  'user.updated':               { title: { ar: 'تعديل بيانات مستخدم', en: 'User updated' },          icon: UserCog,      tone: 'bg-blue-100 text-blue-700' },
  'user.deleted':               { title: { ar: 'حذف مستخدم',          en: 'User deleted' },          icon: UserMinus,    tone: 'bg-red-100 text-red-700' },
  'user.email_changed':         { title: { ar: 'تغيير البريد',        en: 'Email changed' },         icon: Mail,         tone: 'bg-amber-100 text-amber-700' },
  'user.password_reset_manual': { title: { ar: 'تعيين كلمة مرور يدويًا', en: 'Password set manually' }, icon: KeyRound,   tone: 'bg-amber-100 text-amber-700' },
  'user.password_reset_email':  { title: { ar: 'إرسال رابط تغيير كلمة المرور', en: 'Password reset email sent' }, icon: Mail, tone: 'bg-sky-100 text-sky-700' },
  'user.role_changed':          { title: { ar: 'تغيير الصلاحية',      en: 'Role changed' },          icon: ShieldCheck,  tone: 'bg-purple-100 text-purple-700' },
  'user.login':                 { title: { ar: 'تسجيل دخول',          en: 'Signed in' },             icon: LogIn,        tone: 'bg-gray-100 text-gray-700' },
  'branch.created':             { title: { ar: 'إنشاء فرع',           en: 'Branch created' },        icon: Building2,    tone: 'bg-emerald-100 text-emerald-700' },
  'branch.updated':             { title: { ar: 'تعديل فرع',           en: 'Branch updated' },        icon: Pencil,       tone: 'bg-blue-100 text-blue-700' },
  'branch.deleted':             { title: { ar: 'حذف فرع',             en: 'Branch deleted' },        icon: Trash2,       tone: 'bg-red-100 text-red-700' },
  'company.updated':            { title: { ar: 'تعديل بيانات الشركة', en: 'Company updated' },       icon: Pencil,       tone: 'bg-blue-100 text-blue-700' },
  'template.created':           { title: { ar: 'إنشاء نموذج تقييم',   en: 'Template created' },      icon: FileText,     tone: 'bg-emerald-100 text-emerald-700' },
  'template.updated':           { title: { ar: 'تعديل نموذج تقييم',   en: 'Template updated' },      icon: FileText,     tone: 'bg-blue-100 text-blue-700' },
  'evaluation.created':         { title: { ar: 'إجراء تقييم',         en: 'Evaluation submitted' },  icon: ClipboardList,tone: 'bg-emerald-100 text-emerald-700' },
};

function actionMeta(action: string): ActionMeta {
  return ACTIONS[action] || {
    title: { ar: action, en: action },
    icon: Activity,
    tone: 'bg-muted text-muted-foreground',
  };
}

const FIELD_LABELS: Record<string, { ar: string; en: string }> = {
  branch_id:         { ar: 'الفرع',              en: 'Branch' },
  direct_manager_id: { ar: 'المدير المباشر',     en: 'Direct manager' },
  phone:             { ar: 'رقم الجوال',         en: 'Phone' },
  job_title:         { ar: 'المسمى الوظيفي',     en: 'Job title' },
  full_name:         { ar: 'الاسم',              en: 'Name' },
  email:             { ar: 'البريد الإلكتروني',  en: 'Email' },
  role:              { ar: 'الصلاحية',           en: 'Role' },
  is_active:         { ar: 'الحالة',             en: 'Status' },
  name:              { ar: 'الاسم',              en: 'Name' },
  address:           { ar: 'العنوان',            en: 'Address' },
  city:              { ar: 'المدينة',            en: 'City' },
};

function fieldLabel(field: string, isRTL: boolean): string {
  const m = FIELD_LABELS[field];
  if (m) return isRTL ? m.ar : m.en;
  return field.replace(/_/g, ' ');
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function friendlyTime(iso: string, isRTL: boolean): { relative: string; absolute: string } {
  const d = new Date(iso);
  const locale = isRTL ? arLocale : undefined;
  const relative = formatDistanceToNow(d, { addSuffix: true, locale });
  let absolute: string;
  if (isToday(d)) {
    absolute = `${isRTL ? 'اليوم' : 'Today'} ${format(d, 'HH:mm')}`;
  } else if (isYesterday(d)) {
    absolute = `${isRTL ? 'أمس' : 'Yesterday'} ${format(d, 'HH:mm')}`;
  } else {
    absolute = format(d, 'yyyy-MM-dd HH:mm');
  }
  return { relative, absolute };
}

function formatValue(v: any, isRTL: boolean, lookup: Map<string, string>): string {
  if (v === null || v === undefined || v === '') return isRTL ? '— (فارغ)' : '— (empty)';
  if (typeof v === 'boolean') return v ? (isRTL ? 'نعم' : 'Yes') : (isRTL ? 'لا' : 'No');
  if (typeof v === 'string' && UUID_RE.test(v)) {
    return lookup.get(v) || (isRTL ? 'قيمة' : 'Value');
  }
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export default function CompanyAuditLogsTab() {
  const { company } = useOutletContext<{ company: any }>();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const { data, isLoading } = useQuery({
    queryKey: ['super-admin-company-audit', company.id],
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('id, action, entity_type, entity_id, details, created_at, actor_user_id')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;

      const userIds = new Set<string>();
      const branchIds = new Set<string>();
      for (const l of logs || []) {
        if (l.actor_user_id) userIds.add(l.actor_user_id);
        const changes = (l.details as any)?.changes;
        if (changes && typeof changes === 'object') {
          for (const [field, val] of Object.entries<any>(changes)) {
            for (const v of [val?.from, val?.to]) {
              if (typeof v === 'string' && UUID_RE.test(v)) {
                if (field === 'branch_id') branchIds.add(v);
                else userIds.add(v);
              }
            }
          }
        }
      }

      const lookup = new Map<string, string>();
      if (userIds.size) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', Array.from(userIds));
        for (const p of profiles || []) {
          lookup.set(p.user_id, p.full_name || p.email || '');
        }
      }
      if (branchIds.size) {
        const { data: branches } = await supabase
          .from('branches')
          .select('id, name')
          .in('id', Array.from(branchIds));
        for (const b of branches || []) {
          lookup.set(b.id, b.name);
        }
      }

      return { logs: logs || [], lookup };
    },
  });

  const items = data?.logs || [];
  const lookup = useMemo(() => data?.lookup || new Map<string, string>(), [data]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="w-6 h-6 text-primary" />
          {isRTL ? 'سجلات التدقيق' : 'Audit Logs'}
        </h1>
        <p className="text-base text-muted-foreground">
          {isRTL ? 'آخر 200 حدث خاص بهذه الشركة' : 'Last 200 events scoped to this company'}
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      <div className="space-y-3">
        {items.map(l => {
          const meta = actionMeta(l.action);
          const Icon = meta.icon;
          const time = friendlyTime(l.created_at as string, isRTL);
          const actorName = lookup.get(l.actor_user_id as string) || (isRTL ? 'مستخدم غير معروف' : 'Unknown user');
          const details = (l.details || {}) as any;
          const changes = details.changes as Record<string, { from: any; to: any }> | undefined;
          const targetEmail: string | undefined = details.email;

          return (
            <Card key={l.id} className="p-5">
              <div className="flex items-start gap-4">
                <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${meta.tone}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0 space-y-2.5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="text-lg font-semibold text-foreground">
                        {isRTL ? meta.title.ar : meta.title.en}
                      </div>
                      {targetEmail && (
                        <div className="text-base text-muted-foreground mt-1">
                          {isRTL ? 'المستخدم المعني: ' : 'Target: '}
                          <span className="font-medium text-foreground/80">{targetEmail}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-base text-muted-foreground text-end whitespace-nowrap">
                      <div>{time.relative}</div>
                      <div className="text-sm opacity-70">{time.absolute}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-base">
                    <Avatar className="w-7 h-7">
                      <AvatarFallback className="text-xs">{getInitials(actorName)}</AvatarFallback>
                    </Avatar>
                    <span className="text-muted-foreground">{isRTL ? 'قام بالتعديل:' : 'By:'}</span>
                    <span className="font-medium text-foreground">{actorName}</span>
                  </div>

                  {changes && Object.keys(changes).length > 0 && (
                    <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 divide-y divide-border/60 overflow-hidden">
                      {Object.entries(changes).map(([field, val]) => (
                        <div key={field} className="grid grid-cols-[minmax(140px,auto)_1fr] gap-3 px-4 py-3 text-base items-center">
                          <div className="font-medium text-foreground/80">{fieldLabel(field, isRTL)}</div>
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <Badge variant="outline" className="font-normal text-sm max-w-full truncate">
                              {formatValue(val?.from, isRTL, lookup)}
                            </Badge>
                            <ArrowLeftRight className="w-4 h-4 text-muted-foreground shrink-0" />
                            <Badge className="bg-primary/10 text-primary hover:bg-primary/10 font-normal text-sm max-w-full truncate">
                              {formatValue(val?.to, isRTL, lookup)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}

        {!isLoading && items.length === 0 && (
          <div className="text-base text-muted-foreground text-center py-8">
            {isRTL ? 'لا توجد سجلات بعد.' : 'No logs yet.'}
          </div>
        )}
      </div>
    </div>
  );
}