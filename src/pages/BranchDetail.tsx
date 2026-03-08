import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, MapPin, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { QualityCircle } from '@/components/QualityCircle';
import { StatusBadge, ActionStatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useBranch } from '@/hooks/useBranches';
import { useFindings, useCorrectiveActions } from '@/hooks/useFindings';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGoBack } from '@/hooks/useGoBack';
import { useAuth } from '@/contexts/AuthContext';
import { getScoreLevel } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from 'recharts';

export default function BranchDetail() {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const goBack = useGoBack('/branches');
  const { t, language, direction } = useLanguage();
  const { isAdmin, isExecutive } = useAuth();

  // Fetch branch data
  const { data: branch, isLoading: branchLoading } = useBranch(branchId || '');
  
  // Fetch findings for this branch
  const { data: findings, isLoading: findingsLoading } = useFindings({ branchId });

  // Fetch latest evaluation with category scores
  const { data: evaluationData, isLoading: evalLoading } = useQuery({
    queryKey: ['branch-evaluation', branchId],
    queryFn: async () => {
      const { data: evaluation, error: evalError } = await supabase
        .from('evaluations')
        .select(`
          *,
          evaluation_category_scores (
            *,
            template_categories:category_id (
              id,
              name,
              name_ar
            )
          )
        `)
        .eq('branch_id', branchId!)
        .eq('status', 'submitted')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (evalError) throw evalError;
      return evaluation;
    },
    enabled: !!branchId,
  });

  // Fetch criterion score distribution for this branch
  const { data: branchScoreDistribution } = useQuery({
    queryKey: ['branch-criterion-score-distribution', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluation_criterion_scores')
        .select('score, evaluations!inner(status, branch_id)')
        .eq('evaluations.status', 'submitted')
        .eq('evaluations.branch_id', branchId!);

      if (error) throw error;

      let excellent = 0;
      let good = 0;
      let medium = 0;
      let bad = 0;

      for (const row of data || []) {
        const s = row.score;
        if (s === 5) excellent++;
        else if (s === 4) good++;
        else if (s === 3) medium++;
        else bad++;
      }

      return { excellent, good, medium, bad, total: (data || []).length };
    },
    enabled: !!branchId,
  });

  // Get corrective actions for this branch's findings
  const findingIds = findings?.map(f => f.id) || [];
  const { data: actions } = useQuery({
    queryKey: ['branch-actions', findingIds],
    queryFn: async () => {
      if (findingIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('corrective_actions')
        .select('*')
        .in('non_conformity_id', findingIds);
      
      if (error) throw error;
      return data;
    },
    enabled: findingIds.length > 0,
  });

  const isLoading = branchLoading || evalLoading;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="w-10 h-10" />
          <div>
            <Skeleton className="w-48 h-8" />
            <Skeleton className="w-32 h-4 mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <h2 className="text-xl font-semibold text-foreground">
          {direction === 'rtl' ? 'الفرع غير موجود' : 'Branch not found'}
        </h2>
        <Button onClick={() => navigate('/branches')} className="mt-4">
          {direction === 'rtl' ? 'العودة للفروع' : 'Back to Branches'}
        </Button>
      </div>
    );
  }

  // Calculate branch score
  const overallScore = Number(evaluationData?.overall_percentage) || 0;
  const status = getScoreLevel(overallScore);
  const regionName = language === 'ar' ? (branch.regions as any)?.name_ar || (branch.regions as any)?.name : (branch.regions as any)?.name;

  // Count findings by status
  const openFindingsCount = findings?.filter(f => f.status === 'open').length || 0;
  const inProgressCount = findings?.filter(f => f.status === 'in_progress').length || 0;
  const resolvedCount = findings?.filter(f => f.status === 'resolved').length || 0;
  const pendingReviewCount = findings?.filter(f => f.status === 'pending_review').length || 0;
  const overdueActionsCount = actions?.filter(a => a.status === 'overdue').length || 0;

  // Score distribution data
  const scoreDistribution = {
    excellent: branchScoreDistribution?.excellent || 0,
    good: branchScoreDistribution?.good || 0,
    medium: branchScoreDistribution?.medium || 0,
    bad: branchScoreDistribution?.bad || 0,
  };

  const handleStatClick = (statusFilter: string) => {
    navigate(`/findings?status=${statusFilter}`);
  };

  // Check if executive only (not admin)
  const isExecutiveOnly = isExecutive && !isAdmin;

  return (
    <div className="space-y-8">
      {/* Header with Large Circle */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="mt-1"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {language === 'ar' ? branch.name_ar || branch.name : branch.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {branch.city}, {regionName}
              </span>
              {evaluationData && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {direction === 'rtl' ? 'آخر تقييم:' : 'Last evaluation:'} {format(new Date(evaluationData.created_at), 'MMM d, yyyy')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Large Quality Circle */}
        <div className="flex items-center gap-4">
          <QualityCircle
            score={overallScore}
            status={status}
            size="xl"
            showLabel
          />
        </div>
      </div>

      {/* Quick Stats - Clickable */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => handleStatClick('open')}
          className="bg-card rounded-xl border border-border p-4 text-start hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{direction === 'rtl' ? 'ملاحظات مفتوحة' : 'Open Findings'}</span>
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{openFindingsCount}</p>
        </button>
        <button
          onClick={() => handleStatClick('in_progress')}
          className="bg-card rounded-xl border border-border p-4 text-start hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="text-sm">{direction === 'rtl' ? 'قيد التنفيذ' : 'In Progress'}</span>
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{inProgressCount}</p>
        </button>
        <button
          onClick={() => handleStatClick('pending_review')}
          className="bg-card rounded-xl border border-border p-4 text-start hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="text-sm">{direction === 'rtl' ? 'بانتظار المراجعة' : 'Pending Review'}</span>
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{pendingReviewCount}</p>
        </button>
        <button
          onClick={() => handleStatClick('resolved')}
          className="bg-card rounded-xl border border-border p-4 text-start hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm">{direction === 'rtl' ? 'تم حلها' : 'Resolved'}</span>
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{resolvedCount}</p>
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Score Distribution Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border border-border p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {direction === 'rtl' ? 'توزيع الدرجات' : 'Score Distribution'}
          </h2>
          {(() => {
            const scoreData = [
              { name: language === 'ar' ? 'ممتاز (5)' : 'Excellent (5)', value: scoreDistribution.excellent, fill: 'hsl(142, 76%, 36%)', scoreRange: '5' },
              { name: language === 'ar' ? 'جيد (4)' : 'Good (4)', value: scoreDistribution.good, fill: 'hsl(142, 52%, 50%)', scoreRange: '4' },
              { name: language === 'ar' ? 'متوسط (3)' : 'Medium (3)', value: scoreDistribution.medium, fill: 'hsl(45, 93%, 47%)', scoreRange: '3' },
              { name: language === 'ar' ? 'ضعيف (0-2)' : 'Weak (0-2)', value: scoreDistribution.bad, fill: 'hsl(0, 84%, 50%)', scoreRange: '0-2' },
            ];
            const legendItems = [
              { label: language === 'ar' ? 'ممتاز (5)' : 'Excellent (5)', color: 'hsl(142, 76%, 36%)' },
              { label: language === 'ar' ? 'جيد (4)' : 'Good (4)', color: 'hsl(142, 52%, 50%)' },
              { label: language === 'ar' ? 'متوسط (3)' : 'Medium (3)', color: 'hsl(45, 93%, 47%)' },
              { label: language === 'ar' ? 'ضعيف (0-2)' : 'Weak (0-2)', color: 'hsl(0, 84%, 50%)' },
            ];
            return (
              <>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={scoreData}
                      margin={{ top: 20, right: 20, left: 10, bottom: 10 }}
                      onClick={(state) => {
                        if (state && state.activePayload && state.activePayload.length > 0) {
                          const clicked = state.activePayload[0].payload;
                          navigate(`/findings?scoreRange=${clicked.scoreRange}`);
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} hide />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value: number) => [value, language === 'ar' ? 'العدد' : 'Count']}
                      />
                      <Bar
                        dataKey="value"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={50}
                        label={({ x, y, width, value }: any) => (
                          <text x={x + width / 2} y={y - 8} textAnchor="middle" fontSize={13} fontWeight={700} fill="hsl(var(--foreground))">
                            {value}
                          </text>
                        )}
                      >
                        {scoreData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} cursor="pointer" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {legendItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-sm">
                      <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </motion.div>

        {/* Findings List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-xl border border-border p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-6">
            {direction === 'rtl' ? 'الملاحظات الأخيرة' : 'Recent Findings'}
          </h2>
          {!findings || findings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-score-excellent" />
              <p>{direction === 'rtl' ? 'لا توجد ملاحظات لهذا الفرع' : 'No findings for this branch'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {findings.slice(0, 5).map((finding) => (
                <div
                  key={finding.id}
                  className="p-4 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-medium text-foreground">
                        {finding.criterionName}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {finding.categoryName}
                      </p>
                    </div>
                    <StatusBadge
                      status={
                        finding.score <= 2
                          ? 'critical'
                          : finding.score <= 3
                          ? 'weak'
                          : 'average'
                      }
                      size="sm"
                    />
                  </div>
                  {finding.assessorNotes && (
                    <p className="text-sm text-muted-foreground mt-3">
                      {finding.assessorNotes}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span>
                      {direction === 'rtl' ? 'الدرجة:' : 'Score:'} {finding.score}/{finding.maxScore}
                    </span>
                    <span>{format(new Date(finding.createdAt), 'MMM d')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Corrective Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-xl border border-border overflow-hidden"
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {direction === 'rtl' ? 'الإجراءات التصحيحية' : 'Corrective Actions'}
          </h2>
          {!isExecutiveOnly && (
            <Button size="sm">
              {direction === 'rtl' ? 'إضافة إجراء' : 'Add Action'}
            </Button>
          )}
        </div>
        {!actions || actions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>{direction === 'rtl' ? 'لا توجد إجراءات تصحيحية' : 'No corrective actions recorded'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className={`text-${direction === 'rtl' ? 'right' : 'left'} px-6 py-3 text-sm font-medium text-muted-foreground`}>
                    {direction === 'rtl' ? 'الإجراء' : 'Action'}
                  </th>
                  <th className="text-center px-6 py-3 text-sm font-medium text-muted-foreground">
                    {direction === 'rtl' ? 'الأولوية' : 'Priority'}
                  </th>
                  <th className="text-center px-6 py-3 text-sm font-medium text-muted-foreground">
                    {direction === 'rtl' ? 'الحالة' : 'Status'}
                  </th>
                  <th className={`text-${direction === 'rtl' ? 'right' : 'left'} px-6 py-3 text-sm font-medium text-muted-foreground`}>
                    {direction === 'rtl' ? 'تاريخ الاستحقاق' : 'Due Date'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {actions.map((action) => (
                  <tr key={action.id} className="hover:bg-muted/30">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-foreground line-clamp-2">
                        {action.description}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <PriorityBadge priority={action.priority as any} size="sm" />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ActionStatusBadge status={action.status as any} size="sm" />
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-sm ${
                          action.status === 'overdue'
                            ? 'text-score-critical font-medium'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {action.due_date ? format(new Date(action.due_date), 'MMM d, yyyy') : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
