import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, AlertTriangle, CheckCircle2, Clock, Users, ClipboardCheck } from 'lucide-react';
import { QualityCircle } from '@/components/QualityCircle';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { CategoryProgressBar } from '@/components/CategoryProgressBar';
import { mockBranches } from '@/data/mockData';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';

export default function BranchManagerDashboard() {
  const navigate = useNavigate();
  const { t, direction, language } = useLanguage();
  const isAr = language === 'ar';
  const dateLocale = isAr ? { locale: ar } : {};
  
  // Simulating the manager's branch data
  const myBranch = mockBranches[0];
  
  const pendingActions = [
    { id: 1, title: 'Fix temperature control unit', titleAr: 'إصلاح وحدة التحكم بالحرارة', dueDate: '2026-02-10', priority: 'high' },
    { id: 2, title: 'Staff training on hygiene protocols', titleAr: 'تدريب الموظفين على بروتوكولات النظافة', dueDate: '2026-02-15', priority: 'medium' },
    { id: 3, title: 'Update safety signage', titleAr: 'تحديث لوحات السلامة', dueDate: '2026-02-20', priority: 'low' },
  ];

  const priorityLabels: Record<string, { en: string; ar: string }> = {
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
          <button className="text-sm text-primary hover:underline">
            {t('common.viewAll')} →
          </button>
        </div>
        <div className="divide-y divide-border">
          {pendingActions.map((action) => (
            <div key={action.id} className="p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">{isAr ? action.titleAr : action.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('common.dueDate')}: {format(new Date(action.dueDate), 'd MMM yyyy', dateLocale)}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  action.priority === 'high' 
                    ? 'bg-score-critical/10 text-score-critical'
                    : action.priority === 'medium'
                    ? 'bg-score-average/10 text-score-average'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {isAr ? priorityLabels[action.priority].ar : priorityLabels[action.priority].en}
                </span>
              </div>
            </div>
          ))}
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
