import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, MapPin, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { QualityCircle } from '@/components/QualityCircle';
import { CategoryProgressBar } from '@/components/CategoryProgressBar';
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
import { getScoreLevel, ScoreLevel } from '@/types';

export default function BranchDetail() {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const goBack = useGoBack('/branches');
  const { t, language, direction } = useLanguage();

  // Fetch branch data
  const { data: branch, isLoading: branchLoading } = useBranch(branchId || '');
  
  // Fetch findings for this branch
  const { data: findings, isLoading: findingsLoading } = useFindings({ branchId });

  // Fetch latest evaluation with category scores
  const { data: evaluationData, isLoading: evalLoading } = useQuery({
    queryKey: ['branch-evaluation', branchId],
    queryFn: async () => {
      // Get latest evaluation
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

  // Map category scores
  const categoryScores = evaluationData?.evaluation_category_scores?.map((cs: any) => ({
    id: cs.id,
    name: language === 'ar' ? cs.template_categories?.name_ar || cs.template_categories?.name : cs.template_categories?.name,
    percentage: Number(cs.percentage) || 0,
    status: getScoreLevel(Number(cs.percentage) || 0),
  })) || [];

  // Count findings by status
  const openFindingsCount = findings?.filter(f => f.status === 'open').length || 0;
  const inProgressCount = findings?.filter(f => f.status === 'in_progress').length || 0;
  const resolvedCount = findings?.filter(f => f.status === 'resolved').length || 0;
  const overdueActionsCount = actions?.filter(a => a.status === 'overdue').length || 0;

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

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{direction === 'rtl' ? 'ملاحظات مفتوحة' : 'Open Findings'}</span>
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{openFindingsCount}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="text-sm">{direction === 'rtl' ? 'قيد التنفيذ' : 'In Progress'}</span>
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{inProgressCount}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm">{direction === 'rtl' ? 'تم حلها' : 'Resolved'}</span>
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{resolvedCount}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-score-critical">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{direction === 'rtl' ? 'إجراءات متأخرة' : 'Overdue Actions'}</span>
          </div>
          <p className="text-2xl font-bold text-score-critical mt-1">{overdueActionsCount}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Category Scores */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border border-border p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-6">
            {direction === 'rtl' ? 'تفصيل الفئات' : 'Category Breakdown'}
          </h2>
          {categoryScores.length > 0 ? (
            <div className="space-y-5">
              {categoryScores.map((category: any) => (
                <CategoryProgressBar
                  key={category.id}
                  name={category.name}
                  percentage={category.percentage}
                  status={category.status}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>{direction === 'rtl' ? 'لا توجد بيانات تقييم' : 'No evaluation data'}</p>
            </div>
          )}
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
          <Button size="sm">
            {direction === 'rtl' ? 'إضافة إجراء' : 'Add Action'}
          </Button>
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