import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Building2, TrendingUp, AlertTriangle, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { QualityCircle } from '@/components/QualityCircle';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { useBranches, useBranchStats } from '@/hooks/useBranches';
import { useRegions } from '@/hooks/useBranches';
import { useFindingStats } from '@/hooks/useFindings';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function CEODashboard() {
  const navigate = useNavigate();
  const { t, direction, language } = useLanguage();
  const { data: branches, isLoading: branchesLoading } = useBranches();
  const { data: stats, isLoading: statsLoading } = useBranchStats();
  const { data: findingStats, isLoading: findingStatsLoading } = useFindingStats();
  const { data: regions } = useRegions();

  // Fetch aggregated criterion scores across all submitted evaluations
  const { data: criterionScoreDistribution, isLoading: criterionScoresLoading } = useQuery({
    queryKey: ['criterion-score-distribution'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluation_criterion_scores')
        .select('score, evaluations!inner(status)')
        .eq('evaluations.status', 'submitted');

      if (error) throw error;

      let excellent = 0; // score = 5
      let good = 0;      // score = 4
      let medium = 0;    // score = 3
      let bad = 0;       // score = 0-2

      for (const row of data || []) {
        const s = row.score;
        if (s === 5) excellent++;
        else if (s === 4) good++;
        else if (s === 3) medium++;
        else bad++; // 0, 1, 2
      }

      return { excellent, good, medium, bad, total: (data || []).length };
    },
  });

  const isLoading = branchesLoading || statsLoading || findingStatsLoading || criterionScoresLoading;

  // Build findings summary subtitle
  const findingsSummary = language === 'ar'
    ? `${findingStats?.open || 0} مفتوح، ${findingStats?.inProgress || 0} قيد المعالجة`
    : `${findingStats?.open || 0} open, ${findingStats?.inProgress || 0} in progress`;

  // Calculate overall score across all branches
  const overallScore = stats?.averageScore || 0;
  const evaluatedBranches = branches?.filter(b => b.lastEvaluationDate !== null).length || 0;
  const totalBranches = stats?.totalBranches || 0;
  const overallStatus = overallScore >= 90 ? 'excellent' : 
                        overallScore >= 75 ? 'good' : 
                        overallScore >= 60 ? 'average' : 
                        overallScore >= 40 ? 'weak' : 'critical';

  // Score distribution from aggregated criterion scores
  const scoreDistribution = {
    excellent: criterionScoreDistribution?.excellent || 0,
    good: criterionScoreDistribution?.good || 0,
    medium: criterionScoreDistribution?.medium || 0,
    bad: criterionScoreDistribution?.bad || 0,
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
      {/* Header Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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

      {/* Score Circles */}
      {!isLoading && (
        <div className="flex items-center justify-center gap-12">
          {/* Evaluation Pie */}
          <div className="flex flex-col items-center cursor-pointer" onClick={() => navigate('/score-analysis')}>
            <div className="w-48 h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  {(() => {
                    const raw = [
                      { name: language === 'ar' ? 'ممتاز' : 'Excellent', value: scoreDistribution.excellent, color: 'hsl(142, 76%, 36%)' },
                      { name: language === 'ar' ? 'جيد' : 'Good', value: scoreDistribution.good, color: 'hsl(142, 52%, 50%)' },
                      { name: language === 'ar' ? 'متوسط' : 'Medium', value: scoreDistribution.medium, color: 'hsl(45, 93%, 47%)' },
                      { name: language === 'ar' ? 'سيء' : 'Bad', value: scoreDistribution.bad, color: 'hsl(0, 84%, 50%)' },
                    ];
                    const total = raw.reduce((s, d) => s + d.value, 0);
                    const filtered = raw.filter(d => d.value > 0).map(d => ({ ...d, percent: total > 0 ? Math.round((d.value / total) * 100) : 0 }));
                    return (
                      <Pie
                        data={filtered}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                        labelLine={false}
                        label={({ cx, cy, midAngle, innerRadius: iR, outerRadius: oR, percent }: any) => {
                          if (percent < 0.05) return null;
                          const RADIAN = Math.PI / 180;
                          const radius = iR + (oR - iR) / 2;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          return (
                            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700}>
                              {Math.round(percent * 100)}%
                            </text>
                          );
                        }}
                      >
                        {filtered.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    );
                  })()}
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value}`, name]}
                    contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-sm font-bold text-foreground">{language === 'ar' ? 'التقييم' : 'Evaluation'}</span>
              </div>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 max-w-[220px]">
              {[
                { name: language === 'ar' ? 'ممتاز' : 'Excellent', value: scoreDistribution.excellent, color: 'hsl(142, 76%, 36%)' },
                { name: language === 'ar' ? 'جيد' : 'Good', value: scoreDistribution.good, color: 'hsl(142, 52%, 50%)' },
                { name: language === 'ar' ? 'متوسط' : 'Medium', value: scoreDistribution.medium, color: 'hsl(45, 93%, 47%)' },
                { name: language === 'ar' ? 'سيء' : 'Bad', value: scoreDistribution.bad, color: 'hsl(0, 84%, 50%)' },
              ].filter(d => d.value > 0).map((d, i) => {
                const total = scoreDistribution.excellent + scoreDistribution.good + scoreDistribution.medium + scoreDistribution.bad;
                const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                return (
                  <div key={i} className="flex items-center gap-1 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="font-semibold text-foreground">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Resolution Pie */}
          <div className="flex flex-col items-center cursor-pointer" onClick={() => navigate('/findings')}>
            <div className="w-48 h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                {(() => {
                    const raw = [
                      { name: language === 'ar' ? 'تم الحل' : 'Resolved', value: findingStats?.resolved || 0, color: 'hsl(142, 76%, 36%)' },
                      { name: language === 'ar' ? 'جارية' : 'In Progress', value: findingStats?.inProgress || 0, color: 'hsl(45, 93%, 47%)' },
                      { name: language === 'ar' ? 'مفتوح' : 'Open', value: findingStats?.open || 0, color: 'hsl(0, 84%, 60%)' },
                      { name: language === 'ar' ? 'متأخر' : 'Overdue', value: findingStats?.overdue || 0, color: 'hsl(25, 95%, 53%)' },
                    ];
                    const total = raw.reduce((s, d) => s + d.value, 0);
                    const filtered = raw.filter(d => d.value > 0).map(d => ({ ...d, percent: total > 0 ? Math.round((d.value / total) * 100) : 0 }));
                    return (
                      <Pie
                        data={filtered}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                        labelLine={false}
                        label={({ cx, cy, midAngle, innerRadius: iR, outerRadius: oR, percent }: any) => {
                          if (percent < 0.05) return null;
                          const RADIAN = Math.PI / 180;
                          const radius = iR + (oR - iR) / 2;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          return (
                            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700}>
                              {Math.round(percent * 100)}%
                            </text>
                          );
                        }}
                      >
                        {filtered.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    );
                  })()}
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value}`, name]}
                    contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-sm font-bold text-foreground">{language === 'ar' ? 'نسبة الحل' : 'Resolution'}</span>
              </div>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 max-w-[220px]">
              {[
                { name: language === 'ar' ? 'تم الحل' : 'Resolved', value: findingStats?.resolved || 0, color: 'hsl(142, 76%, 36%)' },
                { name: language === 'ar' ? 'جارية' : 'In Progress', value: findingStats?.inProgress || 0, color: 'hsl(45, 93%, 47%)' },
                { name: language === 'ar' ? 'مفتوح' : 'Open', value: findingStats?.open || 0, color: 'hsl(0, 84%, 60%)' },
                { name: language === 'ar' ? 'متأخر' : 'Overdue', value: findingStats?.overdue || 0, color: 'hsl(25, 95%, 53%)' },
              ].filter(d => d.value > 0).map((d, i) => {
                const total = (findingStats?.resolved || 0) + (findingStats?.inProgress || 0) + (findingStats?.open || 0) + (findingStats?.overdue || 0);
                const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                return (
                  <div key={i} className="flex items-center gap-1 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="font-semibold text-foreground">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats - Now Clickable */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {isLoading ? (
          <>
            {[...Array(5)].map((_, i) => (
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
              subtitle={
                <span>
                  {t('dashboard.acrossAllBranches')}
                  <span className="block text-[11px] text-muted-foreground/70 mt-0.5">
                    {language === 'ar' 
                      ? `${evaluatedBranches} من ${totalBranches} فرع مُقيَّم`
                      : `${evaluatedBranches} of ${totalBranches} branches evaluated`}
                  </span>
                </span>
              }
              icon={TrendingUp}
              variant={stats?.averageScore && stats.averageScore >= 80 ? 'good' : 'average'}
              onClick={() => navigate('/score-analysis')}
            />
            <StatCard
              title={language === 'ar' ? 'الملاحظات' : 'Findings'}
              value={findingStats?.total || 0}
              subtitle={findingsSummary}
              icon={AlertTriangle}
              variant={findingStats?.open && findingStats.open > 0 ? 'average' : 'excellent'}
              onClick={() => navigate('/findings')}
            />
            <StatCard
              title={language === 'ar' ? 'نسبة الحل' : 'Resolution Rate'}
              value={`${findingStats?.total ? Math.round(((findingStats?.resolved || 0) / findingStats.total) * 100) : 0}%`}
              subtitle={
                language === 'ar'
                  ? `${findingStats?.resolved || 0} من ${findingStats?.total || 0} تم حلها`
                  : `${findingStats?.resolved || 0} of ${findingStats?.total || 0} resolved`
              }
              icon={ShieldCheck}
              variant={findingStats?.total && findingStats.total > 0 && ((findingStats?.resolved || 0) / findingStats.total) >= 0.7 ? 'excellent' : (findingStats?.resolved || 0) > 0 ? 'average' : 'weak'}
              onClick={() => navigate('/findings')}
            />
            <StatCard
              title={t('dashboard.overdueActions')}
              value={stats?.overdueActions || 0}
              subtitle={t('dashboard.pastDueDate')}
              icon={CheckCircle2}
              variant={stats?.overdueActions && stats.overdueActions > 0 ? 'critical' : 'excellent'}
              onClick={() => navigate('/corrective-actions')}
            />
          </>
        )}
      </div>

      {/* Score Distribution */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t('dashboard.scoreDistribution')}</h2>
        <div className="flex flex-wrap gap-4 justify-center md:justify-start">
          {[
            { label: language === 'ar' ? 'ممتاز (5)' : 'Excellent (5)', count: scoreDistribution.excellent, colorClass: 'bg-score-excellent' },
            { label: language === 'ar' ? 'جيد (4)' : 'Good (4)', count: scoreDistribution.good, colorClass: 'bg-score-good' },
            { label: language === 'ar' ? 'متوسط (3)' : 'Medium (3)', count: scoreDistribution.medium, colorClass: 'bg-score-average' },
            { label: language === 'ar' ? 'سيء (0-2)' : 'Bad (0-2)', count: scoreDistribution.bad, colorClass: 'bg-score-critical' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/50"
            >
              <div className={`w-4 h-4 rounded-full ${item.colorClass}`} />
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-2xl font-bold text-foreground">{item.count}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resolution Overview */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {language === 'ar' ? 'حالة حل المشكلات' : 'Resolution Overview'}
          </h2>
          <button
            onClick={() => navigate('/findings')}
            className="text-sm text-primary hover:underline"
          >
            {t('common.viewDetails')} →
          </button>
        </div>
        {findingStatsLoading ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : (
          <>
            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">
                  {language === 'ar' ? 'تقدم الحل' : 'Resolution Progress'}
                </span>
                <span className="font-semibold text-foreground">
                  {findingStats?.resolutionRate || 0}%
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                <div className="flex h-full">
                  <div
                    className="bg-score-excellent transition-all duration-500"
                    style={{ width: `${findingStats?.total ? ((findingStats?.resolved || 0) / findingStats.total) * 100 : 0}%` }}
                  />
                  <div
                    className="bg-score-average transition-all duration-500"
                    style={{ width: `${findingStats?.total ? ((findingStats?.inProgress || 0) / findingStats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
            {/* Status breakdown */}
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              {[
                { label: language === 'ar' ? 'تم الحل' : 'Resolved', count: findingStats?.resolved || 0, color: 'bg-score-excellent' },
                { label: language === 'ar' ? 'قيد المعالجة' : 'In Progress', count: findingStats?.inProgress || 0, color: 'bg-score-average' },
                { label: language === 'ar' ? 'مفتوح' : 'Open', count: findingStats?.open || 0, color: 'bg-score-critical' },
                { label: language === 'ar' ? 'متأخر' : 'Overdue', count: findingStats?.overdue || 0, color: 'bg-score-weak' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/50"
                >
                  <div className={`w-4 h-4 rounded-full ${item.color}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-2xl font-bold text-foreground">{item.count}</p>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/50 border border-border">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'متوسط وقت الحل' : 'Avg Resolution Time'}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {findingStats?.avgResolutionDays || 0} <span className="text-sm font-normal text-muted-foreground">{language === 'ar' ? 'يوم' : 'days'}</span>
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
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
