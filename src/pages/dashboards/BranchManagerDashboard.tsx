import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, AlertTriangle, CheckCircle2, Clock, Users, ClipboardCheck, ExternalLink } from 'lucide-react';
import { QualityCircle } from '@/components/QualityCircle';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { CategoryProgressBar } from '@/components/CategoryProgressBar';
import { mockBranches } from '@/data/mockData';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function BranchManagerDashboard() {
  const navigate = useNavigate();
  const { t, direction, language } = useLanguage();
  const { profile } = useAuth();
  const isAr = language === 'ar';
  const dateLocale = isAr ? { locale: ar } : {};
  
  // Simulating the manager's branch data
  const myBranch = mockBranches[0];

  // Fetch real pending corrective actions
  const { data: pendingActions = [] } = useQuery({
    queryKey: ['pending-corrective-actions', profile?.branch_id],
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
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile,
  });

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
            {myBranch.name} - {myBranch.city}
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
            score={myBranch.overallScore}
            status={myBranch.status}
            size="xl"
          />
          <h3 className="mt-4 text-lg font-semibold text-foreground">{t('dashboard.currentScore')}</h3>
          <StatusBadge status={myBranch.status} className="mt-2" />
          <p className="text-sm text-muted-foreground mt-2">
            {t('dashboard.lastEvaluation')}: {format(new Date(myBranch.lastEvaluationDate), 'd MMM yyyy', dateLocale)}
          </p>
        </div>
        
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <StatCard
            title={t('dashboard.pendingActions')}
            value={pendingActions.length}
            subtitle={t('dashboard.actionItems')}
            icon={AlertTriangle}
            variant="average"
          />
          <StatCard
            title={t('dashboard.completedThisMonth')}
            value={12}
            subtitle={t('dashboard.actionsCompleted')}
            icon={CheckCircle2}
            variant="good"
          />
          <StatCard
            title={t('dashboard.teamMembers')}
            value={15}
            subtitle={t('dashboard.activeStaff')}
            icon={Users}
          />
          <StatCard
            title={t('dashboard.nextEvaluation')}
            value={isAr ? '٢٨ فبراير' : 'Feb 28'}
            subtitle={t('dashboard.scheduled')}
            icon={ClipboardCheck}
          />
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6">{t('dashboard.categoryBreakdown')}</h2>
        <div className="space-y-4">
          {myBranch.categoryScores.map((cat) => (
            <CategoryProgressBar
              key={cat.id}
              name={direction === 'rtl' && cat.nameAr ? cat.nameAr : cat.name}
              percentage={cat.percentage}
              status={cat.status}
              failedCriteria={cat.failedCriteria}
            />
          ))}
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
              const branchName = isAr ? (nc?.branches?.name_ar || nc?.branches?.name) : nc?.branches?.name;
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
                      {branchName && (
                        <p className="text-xs text-muted-foreground mt-0.5">{branchName}</p>
                      )}
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
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t('dashboard.scoreTrend')}</h2>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-score-good" />
            <span className="text-lg font-bold text-score-good">+5.2%</span>
            <span className="text-sm text-muted-foreground">{t('dashboard.vsLastMonth')}</span>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-sm text-muted-foreground">
            {t('dashboard.consistentImprovement')}
          </div>
        </div>
      </div>
    </div>
  );
}
