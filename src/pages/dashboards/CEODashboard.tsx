import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Building2, TrendingUp, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { QualityCircle } from '@/components/QualityCircle';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { useBranches, useBranchStats } from '@/hooks/useBranches';
import { useRegions } from '@/hooks/useBranches';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function CEODashboard() {
  const navigate = useNavigate();
  const { t, direction, language } = useLanguage();
  const { data: branches, isLoading: branchesLoading } = useBranches();
  const { data: stats, isLoading: statsLoading } = useBranchStats();
  const { data: regions } = useRegions();

  const isLoading = branchesLoading || statsLoading;

  // Calculate overall score across all branches
  const overallScore = stats?.averageScore || 0;
  const overallStatus = overallScore >= 90 ? 'excellent' : 
                        overallScore >= 75 ? 'good' : 
                        overallScore >= 60 ? 'average' : 
                        overallScore >= 40 ? 'weak' : 'critical';

  // Calculate score distribution
  const scoreDistribution = {
    excellent: branches?.filter(b => b.status === 'excellent').length || 0,
    good: branches?.filter(b => b.status === 'good').length || 0,
    average: branches?.filter(b => b.status === 'average').length || 0,
    weak: branches?.filter(b => b.status === 'weak').length || 0,
    critical: branches?.filter(b => b.status === 'critical').length || 0,
  };

  // Calculate regional stats
  const regionalStats = regions?.map(region => {
    const regionBranches = branches?.filter(b => b.regionId === region.id) || [];
    const avgScore = regionBranches.length > 0
      ? Math.round(regionBranches.reduce((sum, b) => sum + b.overallScore, 0) / regionBranches.length)
      : 0;
    return {
      id: region.id,
      name: language === 'ar' ? region.name_ar || region.name : region.name,
      branchCount: regionBranches.length,
      avgScore,
    };
  }) || [];

  return (
    <div className="space-y-8">
      {/* Header with Overall Score Circle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          {/* Large Overall Score Circle */}
          {!isLoading && (
            <QualityCircle
              score={overallScore}
              status={overallStatus as any}
              size="xl"
              showLabel
            />
          )}
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('dashboard.ceo.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('dashboard.ceo.subtitle')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          {t('common.lastUpdated')}: {format(new Date(), 'MMM d, yyyy h:mm a')}
        </div>
      </div>

      {/* Summary Stats - Now Clickable */}
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
              title={t('dashboard.totalBranches')}
              value={stats?.totalBranches || 0}
              subtitle={t('dashboard.activeLocations')}
              icon={Building2}
              onClick={() => navigate('/branches')}
            />
            <StatCard
              title={t('dashboard.averageScore')}
              value={`${stats?.averageScore || 0}%`}
              subtitle={t('dashboard.acrossAllBranches')}
              icon={TrendingUp}
              variant={stats?.averageScore && stats.averageScore >= 80 ? 'good' : 'average'}
              onClick={() => navigate('/branches')}
            />
            <StatCard
              title={t('dashboard.openFindings')}
              value={stats?.openFindings || 0}
              subtitle={t('dashboard.requireAttention')}
              icon={AlertTriangle}
              variant={stats?.openFindings && stats.openFindings > 0 ? 'average' : 'excellent'}
              onClick={() => navigate('/findings')}
            />
            <StatCard
              title={t('dashboard.overdueActions')}
              value={stats?.overdueActions || 0}
              subtitle={t('dashboard.pastDueDate')}
              icon={CheckCircle2}
              variant={stats?.overdueActions && stats.overdueActions > 0 ? 'critical' : 'excellent'}
              onClick={() => navigate('/findings')}
            />
          </>
        )}
      </div>

      {/* Score Distribution */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t('dashboard.scoreDistribution')}</h2>
        <div className="flex flex-wrap gap-4 justify-center md:justify-start">
          {[
            { label: t('status.excellent'), count: scoreDistribution.excellent, status: 'excellent' as const },
            { label: t('status.good'), count: scoreDistribution.good, status: 'good' as const },
            { label: t('status.average'), count: scoreDistribution.average, status: 'average' as const },
            { label: t('status.weak'), count: scoreDistribution.weak, status: 'weak' as const },
            { label: t('status.critical'), count: scoreDistribution.critical, status: 'critical' as const },
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
        {branchesLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <Skeleton className="w-20 h-20 rounded-full" />
                <Skeleton className="w-16 h-4 mt-3" />
                <Skeleton className="w-12 h-3 mt-1" />
              </div>
            ))}
          </div>
        ) : branches && branches.length > 0 ? (
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
            {branches.map((branch) => (
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
                  {language === 'ar' ? branch.nameAr || branch.name : branch.name}
                </h3>
                <p className="text-xs text-muted-foreground">{branch.city}</p>
                <StatusBadge status={branch.status} size="sm" className="mt-2" />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t('common.noData')}</p>
          </div>
        )}
      </div>

      {/* Regional Summary Table */}
      {regionalStats.length > 0 && (
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
                {regionalStats.map((region) => (
                  <tr key={region.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{region.name}</td>
                    <td className="px-6 py-4 text-center text-muted-foreground">{region.branchCount}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-bold ${
                        region.avgScore >= 90 ? 'text-score-excellent' : 
                        region.avgScore >= 75 ? 'text-score-good' : 'text-score-average'
                      }`}>
                        {region.avgScore}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-muted-foreground">—</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
