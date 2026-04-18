import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Navigate } from 'react-router-dom';
import { Building2, TrendingUp, AlertTriangle, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend } from 'recharts';
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
import { useCurrentCompany } from '@/contexts/CurrentCompanyContext';

export default function CEODashboard() {
  const navigate = useNavigate();
  const { t, direction, language } = useLanguage();
  const { currentCompany, loading: companyLoading } = useCurrentCompany();

  // Sector-aware routing: if the active workspace is a clinic, render the clinic dashboard instead.
  if (!companyLoading && currentCompany?.sector_type === 'clinic') {
    return <Navigate to="/clinic/dashboard" replace />;
  }
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

  // Fetch unique assessors who submitted evaluations vs total evaluations submitted
  const { data: assessorStats } = useQuery({
    queryKey: ['assessor-submission-stats'],
    queryFn: async () => {
      // Get all submitted evaluations to count unique assessors
      const { data: submittedEvals, error } = await supabase
        .from('evaluations')
        .select('assessor_id, branch_id')
        .eq('status', 'submitted');

      if (error) throw error;

      const uniqueAssessors = new Set((submittedEvals || []).map(e => e.assessor_id));
      const uniqueBranchesEvaluated = new Set((submittedEvals || []).map(e => e.branch_id));

      return {
        submittedCount: uniqueAssessors.size,
        evaluatedBranches: uniqueBranchesEvaluated.size,
        totalSubmissions: submittedEvals?.length || 0,
      };
    },
  });

  // Fetch performance trend per branch over time
  const { data: branchTrendData } = useQuery({
    queryKey: ['branch-performance-trends-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluations')
        .select('branch_id, overall_percentage, submitted_at, created_at, branches!inner(name, name_ar)')
        .in('status', ['submitted', 'approved'])
        .order('created_at', { ascending: true });
      if (error) throw error;

      // Group by branch
      const branchMap = new Map<string, { name: string; nameAr?: string; points: { date: string; score: number }[] }>();
      for (const e of data || []) {
        const bid = e.branch_id;
        const branchInfo = e.branches as any;
        if (!branchMap.has(bid)) {
          branchMap.set(bid, { name: branchInfo?.name || '', nameAr: branchInfo?.name_ar, points: [] });
        }
        branchMap.get(bid)!.points.push({
          date: format(new Date(e.submitted_at || e.created_at), 'dd/MM/yy'),
          score: Number(e.overall_percentage) || 0,
        });
      }
      return branchMap;
    },
  });

  const isLoading = branchesLoading || statsLoading || findingStatsLoading || criterionScoresLoading;

  // Build findings summary subtitle - show all statuses
  const findingsSummary = language === 'ar'
    ? `${findingStats?.open || 0} مفتوح، ${findingStats?.inProgress || 0} قيد المعالجة، ${findingStats?.pendingReview || 0} بانتظار المراجعة، ${findingStats?.resolved || 0} تم الحل، ${findingStats?.rejected || 0} مرفوض`
    : `${findingStats?.open || 0} open, ${findingStats?.inProgress || 0} in progress, ${findingStats?.pendingReview || 0} pending, ${findingStats?.resolved || 0} resolved, ${findingStats?.rejected || 0} rejected`;

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

  const resolutionLegendItems = useMemo(() => ([
    {
      name: language === 'ar' ? 'تم الحل' : 'Resolved',
      value: findingStats?.resolved || 0,
      color: 'hsl(var(--score-excellent))',
    },
    {
      name: language === 'ar' ? 'بانتظار المراجعة' : 'Pending Review',
      value: findingStats?.pendingReview || 0,
      color: 'hsl(var(--primary))',
    },
    {
      name: language === 'ar' ? 'قيد المعالجة' : 'In Progress',
      value: findingStats?.inProgress || 0,
      color: 'hsl(var(--score-average))',
    },
    {
      name: language === 'ar' ? 'مفتوح' : 'Open',
      value: findingStats?.open || 0,
      color: 'hsl(var(--score-critical))',
    },
    {
      name: language === 'ar' ? 'مرفوض' : 'Rejected',
      value: findingStats?.rejected || 0,
      color: 'hsl(var(--score-weak))',
    },
    {
      name: language === 'ar' ? 'متأخر' : 'Overdue',
      value: findingStats?.overdue || 0,
      color: 'hsl(var(--score-critical) / 0.8)',
    },
  ]), [findingStats, language]);

  const resolutionPieData = useMemo(() => {
    const total = resolutionLegendItems.reduce((sum, item) => sum + item.value, 0);
    return resolutionLegendItems
      .filter(item => item.value > 0)
      .map(item => ({
        ...item,
        percent: total > 0 ? Math.round((item.value / total) * 100) : 0,
      }));
  }, [resolutionLegendItems]);

  // Pre-compute label distribution data for resolution pie with collision avoidance
  const resolutionLabelDistribution = useMemo(() => {
    if (!resolutionPieData.length) return new Map();

    const total = resolutionPieData.reduce((sum, item) => sum + item.value, 0);
    const minGap = 20; // minimum vertical gap between labels
    const pieCx = 170; // half of 340
    const pieCy = 140; // half of 280
    const oR = 85;

    // Calculate base positions using angles
    let runningAngle = 90;
    const baseLabels = resolutionPieData.map((item, index) => {
      const sweepAngle = total > 0 ? (item.value / total) * 360 : 0;
      const midAngle = runningAngle - (sweepAngle / 2);
      runningAngle -= sweepAngle;

      const rad = (midAngle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const isRight = cos >= 0;

      // Natural Y position from angle
      const naturalY = pieCy - sin * (oR + 22);

      return {
        index,
        color: item.color,
        percent: item.percent,
        midAngleDeg: midAngle,
        isRight,
        naturalY,
        adjustedY: naturalY,
      };
    });

    // Separate into left and right sides, then resolve overlaps per side
    const rightLabels = baseLabels.filter(l => l.isRight).sort((a, b) => a.naturalY - b.naturalY);
    const leftLabels = baseLabels.filter(l => !l.isRight).sort((a, b) => a.naturalY - b.naturalY);

    const resolveOverlaps = (labels: typeof baseLabels) => {
      for (let i = 1; i < labels.length; i++) {
        const prev = labels[i - 1];
        const curr = labels[i];
        if (curr.adjustedY - prev.adjustedY < minGap) {
          curr.adjustedY = prev.adjustedY + minGap;
        }
      }
    };

    resolveOverlaps(rightLabels);
    resolveOverlaps(leftLabels);

    return new Map([...rightLabels, ...leftLabels].map(l => [l.index, l]));
  }, [resolutionPieData]);

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
        <div className="flex flex-row flex-wrap justify-center gap-8 items-start">
          {/* Evaluation Pie */}
          <div className="flex flex-col items-center cursor-pointer" onClick={() => navigate('/score-analysis')}>
            <span className="text-lg font-bold text-foreground mb-0">{language === 'ar' ? 'التقييم' : 'Evaluation'}</span>
            <div className="w-[280px] h-[280px] relative">
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
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ cx, cy, midAngle, outerRadius: or, percent: _p, index }) => {
                          const RADIAN = Math.PI / 180;
                          const radius = or + 30;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          const item = filtered[index];
                          if (!item) return null;
                          return (
                            <g>
                              <text x={x} y={y} fill={item.color} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight="bold">
                                {item.percent}%
                              </text>
                            </g>
                          );
                        }}
                        labelLine={false}
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
                <span className="text-2xl font-bold text-foreground">{overallScore}%</span>
              </div>
            </div>
          </div>
          {/* Resolution Pie */}
          <div className="flex flex-col items-center cursor-pointer" onClick={() => navigate('/findings')}>
            <span className="text-lg font-bold text-foreground mb-0">{language === 'ar' ? 'نسبة الحل' : 'Resolution'}</span>
            <div className="w-[280px] h-[280px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <Pie
                    data={resolutionPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                    startAngle={90}
                    endAngle={-270}
                    label={(props: any) => {
                      const info = resolutionLabelDistribution.get(props.index);
                      if (!info) return null;

                      const { cx, cy, outerRadius: or, midAngle } = props;
                      const RADIAN = Math.PI / 180;
                      const rad = midAngle * RADIAN;
                      const cos = Math.cos(rad);
                      const sin = Math.sin(rad);

                      // Point on pie edge
                      const edgeX = cx + cos * (or + 2);
                      const edgeY = cy - sin * (or + 2);

                      // Use collision-adjusted Y position
                      const labelY = info.adjustedY;
                      const isRight = info.isRight;

                      // Text X position
                      const textX = cx + (isRight ? or + 50 : -(or + 50));

                      // Bend point: go outward from edge, then horizontal to near text
                      const bendX = cx + cos * (or + 16);
                      const bendY = cy - sin * (or + 16);

                      // Line end: stop 20px before the text
                      const lineEndX = isRight ? textX - 20 : textX + 20;

                      const connectorPath = `M ${edgeX} ${edgeY} L ${bendX} ${bendY} L ${lineEndX} ${labelY}`;

                      return (
                        <g>
                          <path
                            d={connectorPath}
                            stroke={info.color}
                            strokeWidth={1.25}
                            fill="none"
                            opacity={0.85}
                          />
                          <text
                            x={textX}
                            y={labelY + 4}
                            textAnchor={isRight ? 'start' : 'end'}
                            fontSize={11}
                            fontWeight={700}
                            fill={info.color}
                          >
                            {info.percent}%
                          </text>
                        </g>
                      );
                    }}
                    labelLine={false}
                  >
                    {resolutionPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value}`, name]}
                    contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-foreground">
                  {resolutionPieData.length > 0 ? `${Math.round((resolutionLegendItems[0].value / resolutionLegendItems.reduce((s, i) => s + i.value, 0)) * 100) || 0}%` : '0%'}
                </span>
              </div>
            </div>
            {/* Legend below pie */}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2 max-w-[280px]">
              {resolutionLegendItems.map((item, i) => (
                <div key={i} className="flex items-center gap-1 text-xs">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="font-semibold text-foreground">({item.value})</span>
                </div>
              ))}
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
              subtitle={
                <span>
                  {t('dashboard.activeLocations')}
                  <span className="block text-[11px] text-muted-foreground/70 mt-0.5">
                    {language === 'ar'
                      ? `${evaluatedBranches} فرع مُقيَّم من أصل ${totalBranches}`
                      : `${evaluatedBranches} of ${totalBranches} branches evaluated`}
                  </span>
                </span>
              }
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

      {/* Score Distribution - Column Chart */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t('dashboard.scoreDistribution')}</h2>
        {(() => {
          const scoreData = [
            { name: language === 'ar' ? 'ممتاز (5)' : 'Excellent (5)', value: scoreDistribution.excellent, fill: 'hsl(142, 76%, 36%)', scoreRange: '5' },
            { name: language === 'ar' ? 'جيد (4)' : 'Good (4)', value: scoreDistribution.good, fill: 'hsl(142, 52%, 50%)', scoreRange: '4' },
            { name: language === 'ar' ? 'متوسط (3)' : 'Medium (3)', value: scoreDistribution.medium, fill: 'hsl(45, 93%, 47%)', scoreRange: '3' },
            { name: language === 'ar' ? 'سيء (0-2)' : 'Bad (0-2)', value: scoreDistribution.bad, fill: 'hsl(0, 84%, 50%)', scoreRange: '0-2' },
          ];
          const legendItems = [
            { label: language === 'ar' ? 'ممتاز (5)' : 'Excellent (5)', color: 'hsl(142, 76%, 36%)' },
            { label: language === 'ar' ? 'جيد (4)' : 'Good (4)', color: 'hsl(142, 52%, 50%)' },
            { label: language === 'ar' ? 'متوسط (3)' : 'Medium (3)', color: 'hsl(45, 93%, 47%)' },
            { label: language === 'ar' ? 'سيء (0-2)' : 'Bad (0-2)', color: 'hsl(0, 84%, 50%)' },
          ];
          return (
            <>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={scoreData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                    onClick={(state) => {
                      if (state && state.activePayload && state.activePayload.length > 0) {
                        const clicked = state.activePayload[0].payload;
                        navigate(`/findings?scoreRange=${clicked.scoreRange}`);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                      hide 
                    />
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
                      maxBarSize={60}
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
              {/* Legend below chart */}
              <div className="flex flex-wrap justify-center gap-4 mt-3">
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
      </div>

      {/* Resolution Overview */}
      <div className="glass-card p-6">
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
                { label: language === 'ar' ? 'مفتوح' : 'Open', count: findingStats?.open || 0, color: 'bg-score-critical', filter: 'open' },
                { label: language === 'ar' ? 'قيد المعالجة' : 'In Progress', count: findingStats?.inProgress || 0, color: 'bg-score-average', filter: 'in_progress' },
                { label: language === 'ar' ? 'بانتظار المراجعة' : 'Pending Review', count: findingStats?.pendingReview || 0, color: 'bg-primary', filter: 'pending_review' },
                { label: language === 'ar' ? 'تم الحل' : 'Resolved', count: findingStats?.resolved || 0, color: 'bg-score-excellent', filter: 'resolved' },
                { label: language === 'ar' ? 'مرفوض' : 'Rejected', count: findingStats?.rejected || 0, color: 'bg-score-weak', filter: 'rejected' },
                { label: language === 'ar' ? 'متأخر' : 'Overdue', count: findingStats?.overdue || 0, color: 'bg-orange-500', filter: 'overdue' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => navigate(`/findings?status=${item.filter}`)}
                  className="glass-menu-item active flex items-center gap-3 px-5 py-3.5 text-start"
                  style={{ marginBottom: 0 }}
                >
                  <div className={`w-4 h-4 rounded-full ${item.color} shadow-sm shrink-0`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-2xl font-bold text-foreground">{item.count}</p>
                  </div>
                  <span className="glass-corner-glow" />
                  <span className="glass-corner-glow-pink" />
                  <span className="glass-bottom-light" />
                </button>
              ))}
              <div className="glass-menu-item active flex items-center gap-3 px-5 py-3.5" style={{ marginBottom: 0, cursor: 'default' }}>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {language === 'ar' ? 'متوسط وقت الحل' : 'Avg Resolution Time'}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {findingStats?.avgResolutionDays || 0} <span className="text-sm font-normal text-muted-foreground">{language === 'ar' ? 'يوم' : 'days'}</span>
                  </p>
                </div>
                <span className="glass-corner-glow" />
                <span className="glass-corner-glow-pink" />
                <span className="glass-bottom-light" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Performance Trend Over Time - All Branches */}
      {branchTrendData && branchTrendData.size > 0 && (() => {
        // Build unified timeline
        const COLORS = ['hsl(var(--primary))', 'hsl(142, 76%, 36%)', 'hsl(45, 93%, 47%)', 'hsl(0, 84%, 50%)', 'hsl(280, 60%, 50%)', 'hsl(200, 80%, 50%)', 'hsl(30, 80%, 50%)', 'hsl(160, 60%, 40%)'];
        const branchEntries = Array.from(branchTrendData.entries()).filter(([, v]) => v.points.length >= 2);
        if (branchEntries.length === 0) return null;

        // Merge all dates
        const allDates = new Set<string>();
        branchEntries.forEach(([, v]) => v.points.forEach(p => allDates.add(p.date)));
        const sortedDates = Array.from(allDates);

        const chartData = sortedDates.map(date => {
          const row: any = { date };
          branchEntries.forEach(([bid, v]) => {
            const point = v.points.find(p => p.date === date);
            if (point) row[bid] = point.score;
          });
          return row;
        });

        return (
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              <TrendingUp className="w-5 h-5 inline-block me-2 text-primary" />
              {language === 'ar' ? 'اتجاه الأداء عبر الزمن' : 'Performance Trend Over Time'}
            </h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number, name: string) => {
                      const branch = branchTrendData.get(name);
                      const label = language === 'ar' ? (branch?.nameAr || branch?.name || name) : (branch?.name || name);
                      return [`${value}%`, label];
                    }}
                  />
                  <Legend
                    formatter={(value: string) => {
                      const branch = branchTrendData.get(value);
                      return language === 'ar' ? (branch?.nameAr || branch?.name || value) : (branch?.name || value);
                    }}
                    wrapperStyle={{ fontSize: '11px' }}
                  />
                  {branchEntries.map(([bid], idx) => (
                    <Line
                      key={bid}
                      type="monotone"
                      dataKey={bid}
                      stroke={COLORS[idx % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })()}

      {/* Branch Circles Grid */}
      <div className="glass-card p-6">
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
        <div className="glass-card overflow-hidden">
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
