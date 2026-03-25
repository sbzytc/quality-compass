import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Clock, AlertTriangle, FileText, TrendingUp } from 'lucide-react';
import { QualityCircle } from '@/components/QualityCircle';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { CategoryProgressBar } from '@/components/CategoryProgressBar';
import { useMyEvaluations, useEvaluationStats } from '@/hooks/useEvaluations';
import { useFindings } from '@/hooks/useFindings';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';
import { getScoreLevel } from '@/types';

export default function AuditorDashboard() {
  const navigate = useNavigate();
  const { t, direction, language } = useLanguage();
  
  const { data: myEvaluations, isLoading: evalsLoading } = useMyEvaluations();
  const { data: evalStats, isLoading: statsLoading } = useEvaluationStats();
  const { data: findings } = useFindings();

  const isLoading = evalsLoading || statsLoading;

  // Get last audit
  const lastAudit = myEvaluations?.[0];
  const lastAuditScore = lastAudit?.overallPercentage || 0;
  const lastAuditStatus = getScoreLevel(lastAuditScore);

  // Get findings from the last audit
  const lastAuditFindings = findings?.filter(f => f.evaluationId === lastAudit?.id) || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('dashboard.auditor.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('dashboard.auditor.subtitle')}
          </p>
        </div>
        <button
          onClick={() => navigate('/evaluations')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <ClipboardCheck className="w-4 h-4" />
          {t('dashboard.auditor.startNewAudit')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </>
        ) : (
          <>
            <StatCard
              title={t('dashboard.auditor.auditsThisMonth')}
              value={evalStats?.auditsThisMonth || 0}
              subtitle={t('dashboard.auditor.completed')}
              icon={ClipboardCheck}
              variant="good"
            />
            <StatCard
              title={t('dashboard.auditor.avgScoreGiven')}
              value={`${evalStats?.avgScoreGiven || 0}%`}
              subtitle={t('dashboard.auditor.thisMonth')}
              icon={TrendingUp}
            />
            <StatCard
              title={t('dashboard.auditor.findingsRaised')}
              value={evalStats?.findingsRaised || 0}
              subtitle={t('dashboard.auditor.fromAllAudits')}
              icon={AlertTriangle}
              variant="average"
            />
            <StatCard
              title={t('dashboard.auditor.scheduledAudits')}
              value={evalStats?.scheduledAudits || 0}
              subtitle={t('dashboard.auditor.upcoming')}
              icon={FileText}
            />
          </>
        )}
      </div>

      {/* Last Audit Results */}
      {lastAudit && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t('dashboard.auditor.lastAuditResults')}</h2>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? lastAudit.branchNameAr || lastAudit.branchName : lastAudit.branchName} 
                {' - '}
                {lastAudit.submittedAt 
                  ? format(new Date(lastAudit.submittedAt), 'MMMM d, yyyy')
                  : format(new Date(lastAudit.createdAt), 'MMMM d, yyyy')
                }
              </p>
            </div>
            <button
              onClick={() => navigate(`/branches/${lastAudit.branchId}`)}
              className="text-sm text-primary hover:underline"
            >
              {t('common.viewDetails')} →
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Score Circle */}
            <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-xl">
              <QualityCircle
                score={lastAuditScore}
                status={lastAuditStatus}
                size="xl"
              />
              <StatusBadge status={lastAuditStatus} className="mt-4" />
            </div>

            {/* Info */}
            <div className="lg:col-span-2 flex flex-col justify-center">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">{t('dashboard.auditor.findingsRaised')}</p>
                  <p className="text-2xl font-bold text-foreground">{lastAuditFindings.length}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">{t('common.status')}</p>
                  <p className="text-lg font-semibold text-foreground capitalize">{lastAudit.status}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Last Audit Findings */}
      {lastAuditFindings.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">{t('dashboard.auditor.findingsFromLastAudit')}</h2>
          </div>
          <div className="divide-y divide-border">
            {lastAuditFindings.map((finding) => (
              <div key={finding.id} className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-muted-foreground">{finding.categoryName}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      finding.score === 0
                        ? 'bg-score-critical/10 text-score-critical'
                        : finding.score <= 2
                        ? 'bg-score-average/10 text-score-average'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {finding.score}/{finding.maxScore}
                    </span>
                  </div>
                  <p className="text-foreground">{finding.criterionName}</p>
                  {finding.assessorNotes && (
                    <p className="text-sm text-muted-foreground mt-1">{finding.assessorNotes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Audits */}
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">{t('dashboard.auditor.recentAudits')}</h2>
          </div>
          {evalsLoading ? (
            <div className="p-4 space-y-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : myEvaluations && myEvaluations.length > 0 ? (
            <div className="divide-y divide-border">
              {myEvaluations.slice(0, 5).map((audit) => (
                <div key={audit.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div>
                    <h4 className="font-medium text-foreground">
                      {language === 'ar' ? audit.branchNameAr || audit.branchName : audit.branchName}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(audit.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-lg font-bold ${
                      (audit.overallPercentage || 0) >= 90 ? 'text-score-excellent' : 
                      (audit.overallPercentage || 0) >= 75 ? 'text-score-good' : 'text-score-average'
                    }`}>
                      {audit.overallPercentage || 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <ClipboardCheck className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>{t('common.noData')}</p>
            </div>
          )}
        </div>

        {/* Upcoming Schedule - Placeholder */}
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">{t('dashboard.auditor.upcomingSchedule')}</h2>
          </div>
          <div className="p-8 text-center text-muted-foreground">
            <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>{t('common.noData')}</p>
            <p className="text-xs mt-1">
              {language === 'ar' ? 'ميزة الجدولة قادمة قريباً' : 'Scheduling feature coming soon'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
