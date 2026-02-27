import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Clock, FileSearch, ExternalLink, AlertCircle } from 'lucide-react';
import { QualityCircle } from '@/components/QualityCircle';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getScoreLevel } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function BranchManagerDashboard() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const isAr = language === 'ar';
  const dateLocale = isAr ? { locale: ar } : {};

  const branchId = profile?.branch_id;

  // Fetch branch info
  const { data: branch } = useQuery({
    queryKey: ['manager-branch', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, name_ar, city')
        .eq('id', branchId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!branchId,
  });

  // Fetch latest evaluation for score
  const { data: latestEval } = useQuery({
    queryKey: ['manager-latest-eval', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluations')
        .select('id, overall_percentage, submitted_at, created_at')
        .eq('branch_id', branchId!)
        .in('status', ['submitted', 'approved'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!branchId,
  });

  // Fetch findings stats for this branch
  const { data: findingsStats } = useQuery({
    queryKey: ['manager-findings-stats', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('non_conformities')
        .select('status')
        .eq('branch_id', branchId!);
      if (error) throw error;

      const open = data?.filter(f => f.status === 'open').length || 0;
      const inProgress = data?.filter(f => f.status === 'in_progress').length || 0;
      const pendingReview = data?.filter(f => f.status === 'pending_review').length || 0;
      const resolved = data?.filter(f => f.status === 'resolved').length || 0;
      const total = data?.length || 0;

      return { open, inProgress, pendingReview, resolved, total };
    },
    enabled: !!branchId,
  });

  // Fetch corrective actions stats
  const { data: actionsStats } = useQuery({
    queryKey: ['manager-actions-stats', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('corrective_actions')
        .select(`
          status,
          non_conformities!inner(branch_id)
        `)
        .eq('non_conformities.branch_id', branchId!);
      if (error) throw error;

      const pending = data?.filter(a => a.status === 'pending').length || 0;
      const inProgress = data?.filter(a => a.status === 'in_progress').length || 0;
      const completed = data?.filter(a => a.status === 'completed').length || 0;

      return { pending, inProgress, completed, total: pending + inProgress + completed };
    },
    enabled: !!branchId,
  });

  // Fetch pending corrective actions for list
  const { data: pendingActions = [] } = useQuery({
    queryKey: ['pending-corrective-actions', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('corrective_actions')
        .select(`
          *,
          non_conformities!inner(
            branch_id,
            criterion_id,
            score,
            max_score,
            status,
            branches:branch_id(name, name_ar),
            template_criteria:criterion_id(name, name_ar)
          )
        `)
        .eq('non_conformities.branch_id', branchId!)
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!branchId,
  });

  // Fetch previous evaluation for trend
  const { data: previousEval } = useQuery({
    queryKey: ['manager-prev-eval', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluations')
        .select('overall_percentage')
        .eq('branch_id', branchId!)
        .in('status', ['submitted', 'approved'])
        .order('created_at', { ascending: false })
        .range(1, 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!branchId,
  });

  const currentScore = latestEval?.overall_percentage ? Number(latestEval.overall_percentage) : null;
  const prevScore = previousEval?.overall_percentage ? Number(previousEval.overall_percentage) : null;
  const scoreDiff = currentScore != null && prevScore != null ? +(currentScore - prevScore).toFixed(1) : null;
  const scoreStatus = currentScore != null ? getScoreLevel(currentScore) : 'unrated' as const;

  const branchName = isAr ? (branch?.name_ar || branch?.name) : branch?.name;

  const priorityLabels: Record<string, { en: string; ar: string }> = {
    critical: { en: 'Critical', ar: 'حرج' },
    high: { en: 'High', ar: 'عالي' },
    medium: { en: 'Medium', ar: 'متوسط' },
    low: { en: 'Low', ar: 'منخفض' },
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('dashboard.branchManager.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {branchName || '...'} {branch?.city ? `- ${branch.city}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          {t('common.lastUpdated')}: {format(new Date(), 'd MMM yyyy h:mm a', dateLocale)}
        </div>
      </div>

      {/* Branch Score & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-xl border border-border p-6 flex flex-col items-center justify-center">
          <QualityCircle
            score={currentScore ?? 0}
            status={scoreStatus}
            size="xl"
          />
          <h3 className="mt-4 text-lg font-semibold text-foreground">{t('dashboard.currentScore')}</h3>
          <StatusBadge status={scoreStatus} className="mt-2" />
          {latestEval?.submitted_at && (
            <p className="text-sm text-muted-foreground mt-2">
              {t('dashboard.lastEvaluation')}: {format(new Date(latestEval.submitted_at), 'd MMM yyyy', dateLocale)}
            </p>
          )}
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <StatCard
            title={isAr ? 'ملاحظات مفتوحة' : 'Open Findings'}
            value={findingsStats?.open ?? '...'}
            subtitle={isAr ? 'تحتاج متابعة' : 'Need attention'}
            icon={AlertCircle}
            variant="critical"
            onClick={() => navigate('/findings')}
          />
          <StatCard
            title={t('dashboard.pendingActions')}
            value={(actionsStats?.pending ?? 0) + (actionsStats?.inProgress ?? 0)}
            subtitle={isAr ? 'إجراءات تصحيحية' : 'Corrective actions'}
            icon={AlertTriangle}
            variant="average"
            onClick={() => navigate('/corrective-actions')}
          />
          <StatCard
            title={isAr ? 'قيد المراجعة' : 'Pending Review'}
            value={findingsStats?.pendingReview ?? '...'}
            subtitle={isAr ? 'بانتظار الموافقة' : 'Awaiting approval'}
            icon={FileSearch}
            variant="default"
            onClick={() => navigate('/findings')}
          />
          <StatCard
            title={isAr ? 'تم الحل' : 'Resolved'}
            value={findingsStats?.resolved ?? '...'}
            subtitle={isAr ? 'ملاحظات محلولة' : 'Resolved findings'}
            icon={CheckCircle2}
            variant="good"
            onClick={() => navigate('/findings')}
          />
        </div>
      </div>

      {/* Pending Actions */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{t('dashboard.pendingActions')}</h2>
          <button
            onClick={() => navigate('/corrective-actions')}
            className="text-sm text-primary hover:underline"
          >
            {t('common.viewAll')} →
          </button>
        </div>
        <div className="divide-y divide-border">
          {pendingActions.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              {isAr ? 'لا توجد إجراءات معلقة' : 'No pending actions'}
            </div>
          ) : (
            pendingActions.map((action) => {
              const nc = action.non_conformities as any;
              const criterionName = isAr ? (nc?.template_criteria?.name_ar || nc?.template_criteria?.name) : nc?.template_criteria?.name;
              return (
                <div
                  key={action.id}
                  className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate('/corrective-actions')}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground flex items-center gap-2">
                        {criterionName || action.description}
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                      </h4>
                      {action.due_date && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {t('common.dueDate')}: {format(new Date(action.due_date), 'd MMM yyyy', dateLocale)}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      action.priority === 'critical' || action.priority === 'high'
                        ? 'bg-score-critical/10 text-score-critical'
                        : action.priority === 'medium'
                        ? 'bg-score-average/10 text-score-average'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {isAr ? priorityLabels[action.priority]?.ar || action.priority : priorityLabels[action.priority]?.en || action.priority}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Score Trend */}
      {scoreDiff !== null && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">{t('dashboard.scoreTrend')}</h2>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              {scoreDiff >= 0 ? (
                <TrendingUp className="w-5 h-5 text-score-good" />
              ) : (
                <TrendingDown className="w-5 h-5 text-score-critical" />
              )}
              <span className={`text-lg font-bold ${scoreDiff >= 0 ? 'text-score-good' : 'text-score-critical'}`}>
                {scoreDiff >= 0 ? '+' : ''}{scoreDiff}%
              </span>
              <span className="text-sm text-muted-foreground">
                {isAr ? 'مقارنة بالتقييم السابق' : 'vs previous evaluation'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
