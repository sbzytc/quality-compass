import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Coins, Building2, Calendar, Clock, UserCheck, AlertCircle, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBranchFines, type BranchFinesSummary, type FineViolation } from '@/hooks/useFines';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers } from '@/hooks/useUsers';
import { useAssignFinding } from '@/hooks/useFindings';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface FinesIndicatorProps {
  /** When provided, renders a single-branch card (used on Branch Manager Dashboard). */
  branchId?: string;
  className?: string;
}

function formatCurrency(value: number, isAr: boolean) {
  const formatted = new Intl.NumberFormat(isAr ? 'ar-SA' : 'en-US').format(value);
  return isAr ? `${formatted} ر.س` : `${formatted} SAR`;
}

function statusLabel(status: string, isAr: boolean) {
  const map: Record<string, { en: string; ar: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    open: { en: 'Open', ar: 'مفتوحة', variant: 'destructive' },
    in_progress: { en: 'In progress', ar: 'قيد المعالجة', variant: 'default' },
    pending_review: { en: 'Pending review', ar: 'بانتظار المراجعة', variant: 'secondary' },
    pending_manager_review: { en: 'Manager review', ar: 'مراجعة المدير', variant: 'secondary' },
    resolved: { en: 'Resolved', ar: 'تم الحل', variant: 'outline' },
    rejected: { en: 'Rejected', ar: 'مرفوض', variant: 'outline' },
  };
  return map[status] || { en: status, ar: status, variant: 'outline' as const };
}

export function FinesIndicator({ branchId, className }: FinesIndicatorProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const dateLocale = isAr ? { locale: ar } : {};
  const { data: summaries, isLoading } = useBranchFines(branchId);

  const [selected, setSelected] = useState<BranchFinesSummary | null>(null);
  const [assignTarget, setAssignTarget] = useState<FineViolation | null>(null);

  const { user, isAdmin, isExecutive, isBranchManager } = useAuth();
  const canAssign = isAdmin || isExecutive || isBranchManager;
  const { data: users } = useUsers();
  const assignMutation = useAssignFinding();
  const [assignUserId, setAssignUserId] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');

  const openAssign = (v: FineViolation) => {
    setAssignTarget(v);
    setAssignUserId(v.assigned_to || '');
    setAssignDueDate('');
  };

  const branchEmployees = useMemo(() => {
    if (!users || !assignTarget) return [];
    return users.filter(
      (u) =>
        u.is_active &&
        u.branch_id === assignTarget.branch_id &&
        (u.roles.includes('branch_employee') || u.roles.includes('branch_manager')),
    );
  }, [users, assignTarget]);

  const submitAssign = async () => {
    if (!assignTarget || !assignUserId || !assignDueDate) return;
    try {
      await assignMutation.mutateAsync({
        findingId: assignTarget.id,
        assignedTo: assignUserId,
        dueDate: assignDueDate,
      });
      toast.success(isAr ? 'تم تحويل المخالفة إلى مهمة' : 'Violation converted to a task');
      setAssignTarget(null);
      // Optimistic close of details so user sees fresh list on next open
      setSelected(null);
    } catch {
      toast.error(isAr ? 'حدث خطأ أثناء الإسناد' : 'Failed to assign task');
    }
  };

  const totalOutstanding = useMemo(
    () => (summaries || []).reduce((sum, b) => sum + b.total_value, 0),
    [summaries],
  );
  const totalOpenCount = useMemo(
    () => (summaries || []).reduce((sum, b) => sum + b.open_count, 0),
    [summaries],
  );

  if (isLoading) {
    return <Skeleton className={cn('h-40 rounded-xl', className)} />;
  }

  const singleBranch = branchId ? summaries?.[0] : null;

  return (
    <>
      <div className={cn('glass-card p-6', className)}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-score-critical/10 text-score-critical">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {isAr ? 'مؤشر الغرامات' : 'Fines Indicator'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {branchId
                  ? isAr
                    ? 'إجمالي قيمة المخالفات المفتوحة على هذا الفرع'
                    : 'Total outstanding fines on this branch'
                  : isAr
                  ? 'إجمالي قيمة المخالفات لكل فرع'
                  : 'Outstanding fines per branch'}
              </p>
            </div>
          </div>
          <div className="text-end">
            <p className="text-2xl font-bold text-score-critical">
              {formatCurrency(totalOutstanding, isAr)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isAr ? `${totalOpenCount} مخالفة مفتوحة` : `${totalOpenCount} open violations`}
            </p>
          </div>
        </div>

        {branchId ? (
          <SingleBranchBody
            summary={singleBranch}
            isAr={isAr}
            onOpen={() => singleBranch && setSelected(singleBranch)}
          />
        ) : (
          <BranchBarChart
            summaries={summaries || []}
            isAr={isAr}
            onSelect={setSelected}
          />
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-score-critical" />
              {isAr ? 'تفاصيل الغرامات' : 'Fine details'}
              {selected && (
                <span className="text-sm font-normal text-muted-foreground ms-2">
                  — {isAr ? (selected.branch_name_ar || selected.branch_name) : selected.branch_name}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <ViolationList
              violations={selected.violations}
              isAr={isAr}
              dateLocale={dateLocale}
              canAssign={canAssign}
              onAssign={openAssign}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Assign as task dialog */}
      <Dialog open={!!assignTarget} onOpenChange={(open) => !open && setAssignTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              {isAr ? 'تحويل إلى مهمة' : 'Convert to task'}
            </DialogTitle>
          </DialogHeader>
          {assignTarget && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/40 text-sm">
                <p className="font-medium text-foreground">
                  {isAr ? (assignTarget.criterion_name_ar || assignTarget.criterion_name) : assignTarget.criterion_name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(assignTarget.violation_value, isAr)}
                </p>
              </div>
              <div className="space-y-2">
                <Label>{isAr ? 'الموظف المستلم' : 'Assign to'}</Label>
                <Select value={assignUserId} onValueChange={setAssignUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder={isAr ? 'اختر موظفاً...' : 'Select an employee...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {branchEmployees.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        {isAr ? 'لا يوجد موظفون في هذا الفرع' : 'No employees in this branch'}
                      </div>
                    ) : (
                      branchEmployees.map((u) => (
                        <SelectItem key={u.user_id} value={u.user_id}>
                          {u.full_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isAr ? 'تاريخ الاستحقاق' : 'Due date'}</Label>
                <Input
                  type="date"
                  value={assignDueDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setAssignDueDate(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setAssignTarget(null)}>
                  {isAr ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button
                  onClick={submitAssign}
                  disabled={!assignUserId || !assignDueDate || assignMutation.isPending}
                >
                  {assignMutation.isPending
                    ? isAr ? 'جارٍ الإسناد...' : 'Assigning...'
                    : isAr ? 'إسناد كمهمة' : 'Assign as task'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SingleBranchBody({
  summary,
  isAr,
  onOpen,
}: {
  summary: BranchFinesSummary | null | undefined;
  isAr: boolean;
  onOpen: () => void;
}) {
  if (!summary || summary.violations.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        {isAr ? 'لا توجد غرامات مسجلة على هذا الفرع' : 'No fines recorded on this branch'}
      </div>
    );
  }
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onOpen}
      className="w-full flex items-center justify-between p-4 rounded-lg bg-muted/40 hover:bg-muted/70 transition"
    >
      <div className="text-start">
        <p className="text-sm font-medium text-foreground">
          {isAr ? 'اعرض تفاصيل المخالفات' : 'View violation details'}
        </p>
        <p className="text-xs text-muted-foreground">
          {isAr
            ? `${summary.open_count} مفتوحة · ${summary.count} إجمالي`
            : `${summary.open_count} open · ${summary.count} total`}
        </p>
      </div>
      <span className="text-primary text-sm">{isAr ? 'تفاصيل ←' : 'Details →'}</span>
    </motion.button>
  );
}

const BAR_COLORS = [
  'hsl(0, 84%, 60%)',
  'hsl(24, 90%, 55%)',
  'hsl(45, 93%, 47%)',
  'hsl(142, 60%, 45%)',
  'hsl(190, 80%, 45%)',
  'hsl(220, 80%, 60%)',
  'hsl(265, 70%, 60%)',
  'hsl(320, 70%, 55%)',
];

function BranchBarChart({
  summaries,
  isAr,
  onSelect,
}: {
  summaries: BranchFinesSummary[];
  isAr: boolean;
  onSelect: (s: BranchFinesSummary) => void;
}) {
  const chartData = useMemo(
    () =>
      summaries
        .filter((s) => s.total_value > 0)
        .map((s) => ({
          id: s.branch_id,
          name: isAr ? (s.branch_name_ar || s.branch_name) : s.branch_name,
          value: s.total_value,
          count: s.open_count,
          summary: s,
        })),
    [summaries, isAr],
  );

  if (chartData.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        {isAr ? 'لا توجد غرامات مسجلة على أي فرع' : 'No fines recorded on any branch'}
      </div>
    );
  }

  return (
    <>
      <p className="text-xs text-muted-foreground mb-2">
        {isAr ? 'اضغط على أي عمود لعرض تفاصيل مخالفات الفرع' : 'Click any bar to view branch violation details'}
      </p>
      <div className="h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 24, right: 30, left: 30, bottom: 50 }}
            onClick={(state: any) => {
              if (state?.activePayload?.length) {
                const p = state.activePayload[0].payload;
                if (p?.summary) onSelect(p.summary);
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              interval={0}
              angle={0}
              textAnchor="middle"
              height={40}
              tickMargin={10}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              width={90}
              tickMargin={22}
              tickFormatter={(v) => new Intl.NumberFormat(isAr ? 'ar-SA' : 'en-US').format(v as number)}
            />
            <RechartsTooltip
              cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number, _n, ctx: any) => [
                `${new Intl.NumberFormat(isAr ? 'ar-SA' : 'en-US').format(value)} ${isAr ? 'ر.س' : 'SAR'} · ${ctx?.payload?.count ?? 0} ${isAr ? 'مفتوحة' : 'open'}`,
                isAr ? 'الغرامات' : 'Fines',
              ]}
            />
            <Bar
              dataKey="value"
              radius={[6, 6, 0, 0]}
              maxBarSize={60}
              label={({ x, y, width, value }: any) => (
                <text
                  x={x + width / 2}
                  y={y - 8}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={700}
                  fill="hsl(var(--foreground))"
                >
                  {new Intl.NumberFormat(isAr ? 'ar-SA' : 'en-US').format(value as number)}
                </text>
              )}
            >
              {chartData.map((d, i) => (
                <Cell key={d.id} fill={BAR_COLORS[i % BAR_COLORS.length]} cursor="pointer" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

function ViolationList({
  violations,
  isAr,
  dateLocale,
  canAssign,
  onAssign,
}: {
  violations: FineViolation[];
  isAr: boolean;
  dateLocale: any;
  canAssign: boolean;
  onAssign: (v: FineViolation) => void;
}) {
  return (
    <div className="space-y-3">
      {violations.map((v) => {
        const s = statusLabel(v.status, isAr);
        const canAssignThis = canAssign && v.status !== 'resolved';
        return (
          <div key={v.id} className="p-4 rounded-lg border border-border bg-muted/30">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {isAr ? (v.criterion_name_ar || v.criterion_name) : v.criterion_name}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(v.created_at), 'd MMM yyyy', dateLocale)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {isAr ? `مضى ${v.days_since} يوم` : `${v.days_since} day${v.days_since === 1 ? '' : 's'} ago`}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    {v.assigned_to ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5 text-primary" />
                        {isAr ? 'تم استلامها كمهمة' : 'Assigned as task'}
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-score-critical" />
                        {isAr ? 'لم تُستلم بعد' : 'Not assigned yet'}
                      </>
                    )}
                  </span>
                </div>
                {canAssignThis && (
                  <div className="mt-3">
                    <Button size="sm" variant="outline" onClick={() => onAssign(v)}>
                      <UserPlus className="w-3.5 h-3.5 me-1" />
                      {v.assigned_to
                        ? isAr ? 'إعادة تعيين' : 'Reassign'
                        : isAr ? 'تحويل إلى مهمة' : 'Convert to task'}
                    </Button>
                  </div>
                )}
              </div>
              <div className="text-end shrink-0">
                <p className="text-lg font-bold text-score-critical">
                  {formatCurrency(v.violation_value, isAr)}
                </p>
                <Badge variant={s.variant} className="mt-1">
                  {isAr ? s.ar : s.en}
                </Badge>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
