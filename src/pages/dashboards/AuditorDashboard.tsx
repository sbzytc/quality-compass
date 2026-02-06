import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Clock, CheckCircle2, AlertTriangle, FileText, TrendingUp } from 'lucide-react';
import { QualityCircle } from '@/components/QualityCircle';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { CategoryProgressBar } from '@/components/CategoryProgressBar';
import { mockBranches } from '@/data/mockData';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AuditorDashboard() {
  const navigate = useNavigate();
  const { t, direction } = useLanguage();

  // Simulating the last audit done by this auditor
  const lastAuditBranch = mockBranches[2];
  const lastAuditDate = new Date('2026-02-03');

  const recentAudits = [
    { id: 1, branch: 'Al Olaya Branch', score: 87, date: '2026-02-03', findings: 3 },
    { id: 2, branch: 'Al Malaz Branch', score: 92, date: '2026-01-28', findings: 1 },
    { id: 3, branch: 'Al Naseem Branch', score: 78, date: '2026-01-22', findings: 5 },
    { id: 4, branch: 'Al Rawdah Branch', score: 95, date: '2026-01-15', findings: 0 },
  ];

  const lastAuditFindings = [
    { id: 1, category: 'Food Safety', description: 'Temperature log not updated for 2 days', severity: 'high' },
    { id: 2, category: 'Cleanliness', description: 'Kitchen floor needs deep cleaning', severity: 'medium' },
    { id: 3, category: 'Documentation', description: 'Missing staff training certificates', severity: 'low' },
  ];

  const upcomingSchedule = [
    { id: 1, branch: 'Al Sahafa Branch', date: '2026-02-10', type: 'Full Audit' },
    { id: 2, branch: 'Al Sulimaniyah Branch', date: '2026-02-15', type: 'Follow-up' },
    { id: 3, branch: 'Al Muruj Branch', date: '2026-02-18', type: 'Full Audit' },
  ];

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
        <StatCard
          title={t('dashboard.auditor.auditsThisMonth')}
          value={4}
          subtitle={t('dashboard.auditor.completed')}
          icon={ClipboardCheck}
          variant="good"
        />
        <StatCard
          title={t('dashboard.auditor.avgScoreGiven')}
          value="88%"
          subtitle={t('dashboard.auditor.thisMonth')}
          icon={TrendingUp}
        />
        <StatCard
          title={t('dashboard.auditor.findingsRaised')}
          value={9}
          subtitle={t('dashboard.auditor.fromAllAudits')}
          icon={AlertTriangle}
          variant="average"
        />
        <StatCard
          title={t('dashboard.auditor.scheduledAudits')}
          value={upcomingSchedule.length}
          subtitle={t('dashboard.auditor.upcoming')}
          icon={FileText}
        />
      </div>

      {/* Last Audit Results */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t('dashboard.auditor.lastAuditResults')}</h2>
            <p className="text-sm text-muted-foreground">
              {lastAuditBranch.name} - {format(lastAuditDate, 'MMMM d, yyyy')}
            </p>
          </div>
          <button
            onClick={() => navigate(`/branches/${lastAuditBranch.id}`)}
            className="text-sm text-primary hover:underline"
          >
            {t('common.viewDetails')} →
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Score Circle */}
          <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-xl">
            <QualityCircle
              score={lastAuditBranch.overallScore}
              status={lastAuditBranch.status}
              size="xl"
            />
            <StatusBadge status={lastAuditBranch.status} className="mt-4" />
          </div>

          {/* Category Scores */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">{t('dashboard.categoryBreakdown')}</h3>
            {lastAuditBranch.categoryScores.map((cat) => (
              <CategoryProgressBar
                key={cat.id}
                name={cat.name}
                percentage={cat.percentage}
                status={cat.status}
                failedCriteria={cat.failedCriteria}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Last Audit Findings */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{t('dashboard.auditor.findingsFromLastAudit')}</h2>
        </div>
        <div className="divide-y divide-border">
          {lastAuditFindings.map((finding) => (
            <div key={finding.id} className="p-4 flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-muted-foreground">{finding.category}</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    finding.severity === 'high' 
                      ? 'bg-score-critical/10 text-score-critical'
                      : finding.severity === 'medium'
                      ? 'bg-score-average/10 text-score-average'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {finding.severity}
                  </span>
                </div>
                <p className="text-foreground">{finding.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Audits */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">{t('dashboard.auditor.recentAudits')}</h2>
          </div>
          <div className="divide-y divide-border">
            {recentAudits.map((audit) => (
              <div key={audit.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div>
                  <h4 className="font-medium text-foreground">{audit.branch}</h4>
                  <p className="text-sm text-muted-foreground">{format(new Date(audit.date), 'MMM d, yyyy')}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-lg font-bold ${
                    audit.score >= 90 ? 'text-score-excellent' : 
                    audit.score >= 75 ? 'text-score-good' : 'text-score-average'
                  }`}>
                    {audit.score}%
                  </span>
                  {audit.findings > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {audit.findings} {t('common.findings')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Schedule */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">{t('dashboard.auditor.upcomingSchedule')}</h2>
          </div>
          <div className="divide-y divide-border">
            {upcomingSchedule.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div>
                  <h4 className="font-medium text-foreground">{item.branch}</h4>
                  <p className="text-sm text-muted-foreground">{item.type}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  {format(new Date(item.date), 'MMM d, yyyy')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
