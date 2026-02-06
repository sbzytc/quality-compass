import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Building2, TrendingUp, AlertTriangle, CheckCircle2, Clock, BarChart3 } from 'lucide-react';
import { QualityCircle } from '@/components/QualityCircle';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { mockBranches, summaryStats } from '@/data/mockData';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CEODashboard() {
  const navigate = useNavigate();
  const { t, direction } = useLanguage();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('dashboard.ceo.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('dashboard.ceo.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          {t('common.lastUpdated')}: {format(new Date(), 'MMM d, yyyy h:mm a')}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('dashboard.totalBranches')}
          value={summaryStats.totalBranches}
          subtitle={t('dashboard.activeLocations')}
          icon={Building2}
        />
        <StatCard
          title={t('dashboard.averageScore')}
          value={`${summaryStats.averageScore}%`}
          subtitle={t('dashboard.acrossAllBranches')}
          icon={TrendingUp}
          trend={{ value: 2.5, isPositive: true }}
          variant="good"
        />
        <StatCard
          title={t('dashboard.openFindings')}
          value={summaryStats.openFindings}
          subtitle={t('dashboard.requireAttention')}
          icon={AlertTriangle}
          variant={summaryStats.openFindings > 0 ? 'average' : 'excellent'}
        />
        <StatCard
          title={t('dashboard.overdueActions')}
          value={summaryStats.overdueActions}
          subtitle={t('dashboard.pastDueDate')}
          icon={CheckCircle2}
          variant={summaryStats.overdueActions > 0 ? 'critical' : 'excellent'}
        />
      </div>

      {/* Score Distribution */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t('dashboard.scoreDistribution')}</h2>
        <div className="flex flex-wrap gap-4 justify-center md:justify-start">
          {[
            { label: t('status.excellent'), count: summaryStats.excellentBranches, status: 'excellent' as const },
            { label: t('status.good'), count: summaryStats.goodBranches, status: 'good' as const },
            { label: t('status.average'), count: summaryStats.averageBranches, status: 'average' as const },
            { label: t('status.weak'), count: summaryStats.weakBranches, status: 'weak' as const },
            { label: t('status.critical'), count: summaryStats.criticalBranches, status: 'critical' as const },
          ].map((item) => (
            <div
              key={item.status}
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/50"
            >
              <div
                className={`w-4 h-4 rounded-full ${
                  item.status === 'excellent'
                    ? 'bg-score-excellent'
                    : item.status === 'good'
                    ? 'bg-score-good'
                    : item.status === 'average'
                    ? 'bg-score-average'
                    : item.status === 'weak'
                    ? 'bg-score-weak'
                    : 'bg-score-critical'
                }`}
              />
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-2xl font-bold text-foreground">{item.count}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Branch Circles Grid */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">{t('dashboard.allBranches')}</h2>
          <button
            onClick={() => navigate('/branches')}
            className="text-sm text-primary hover:underline"
          >
            {t('common.viewDetails')} →
          </button>
        </div>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: 0.05 },
            },
          }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6"
        >
          {mockBranches.map((branch) => (
            <motion.div
              key={branch.id}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              className="flex flex-col items-center text-center"
            >
              <QualityCircle
                score={branch.overallScore}
                status={branch.status}
                size="lg"
                onClick={() => navigate(`/branches/${branch.id}`)}
              />
              <h3 className="mt-3 text-sm font-medium text-foreground line-clamp-1">
                {branch.name}
              </h3>
              <p className="text-xs text-muted-foreground">{branch.city}</p>
              <StatusBadge status={branch.status} size="sm" className="mt-2" />
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Regional Summary Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{t('dashboard.regionalSummary')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className={`text-${direction === 'rtl' ? 'right' : 'left'} px-6 py-3 text-sm font-medium text-muted-foreground`}>
                  {t('common.region')}
                </th>
                <th className="text-center px-6 py-3 text-sm font-medium text-muted-foreground">
                  {t('dashboard.branchCount')}
                </th>
                <th className="text-center px-6 py-3 text-sm font-medium text-muted-foreground">
                  {t('dashboard.avgScore')}
                </th>
                <th className="text-center px-6 py-3 text-sm font-medium text-muted-foreground">
                  {t('dashboard.trend')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {['Central', 'Western', 'Eastern', 'Northern', 'Southern'].map((region) => {
                const regionBranches = mockBranches.filter(b => b.region === region);
                const avgScore = regionBranches.length > 0 
                  ? Math.round(regionBranches.reduce((sum, b) => sum + b.overallScore, 0) / regionBranches.length)
                  : 0;
                return (
                  <tr key={region} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{region}</td>
                    <td className="px-6 py-4 text-center text-muted-foreground">{regionBranches.length}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-bold ${avgScore >= 90 ? 'text-score-excellent' : avgScore >= 75 ? 'text-score-good' : 'text-score-average'}`}>
                        {avgScore}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-score-good flex items-center justify-center gap-1">
                        <TrendingUp className="w-4 h-4" /> +2.1%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
