import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBranches } from '@/hooks/useBranches';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, BarChart3, ArrowRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { QualityCircle } from '@/components/QualityCircle';
import { getScoreLevel } from '@/types';
import { Progress } from '@/components/ui/progress';

type PeriodTab = 'weekly' | 'monthly' | 'yearly';

interface PeriodData {
  branchId: string;
  branchName: string;
  periods: { label: string; score: number | null; evalCount: number }[];
}

export default function ReportsPage() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { profile, isAdmin, isExecutive, isBranchManager } = useAuth();
  const { data: branches } = useBranches();
  const [activeTab, setActiveTab] = useState<PeriodTab>('monthly');
  const [periodsToShow, setPeriodsToShow] = useState(4);
  const dateLocale = isAr ? { locale: ar } : {};

  // Fetch all evaluations with scores
  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ['reports-evaluations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluations')
        .select('id, branch_id, overall_percentage, submitted_at, period_type, status')
        .in('status', ['submitted', 'approved'])
        .eq('is_archived', false)
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const buildPeriodData = useMemo(() => {
    if (!branches || !evaluations.length) return [];

    const now = new Date();
    const periods: { start: Date; end: Date; label: string }[] = [];

    if (activeTab === 'weekly') {
      for (let i = 0; i < periodsToShow; i++) {
        const w = subWeeks(now, i);
        const s = startOfWeek(w, { weekStartsOn: 0 });
        const e = endOfWeek(w, { weekStartsOn: 0 });
        periods.push({ start: s, end: e, label: isAr ? `أسبوع ${format(s, 'd/M', dateLocale)}` : `Week ${format(s, 'MMM d')}` });
      }
    } else if (activeTab === 'monthly') {
      for (let i = 0; i < periodsToShow; i++) {
        const m = subMonths(now, i);
        const s = startOfMonth(m);
        const e = endOfMonth(m);
        periods.push({ start: s, end: e, label: format(m, isAr ? 'MMMM yyyy' : 'MMM yyyy', dateLocale) });
      }
    } else {
      // Yearly - show last 3 years
      for (let i = 0; i < 3; i++) {
        const year = now.getFullYear() - i;
        periods.push({ start: new Date(year, 0, 1), end: new Date(year, 11, 31), label: `${year}` });
      }
    }

    const result: PeriodData[] = (branches || []).filter(b => {
      if (!b.isActive) return false;
      // Branch managers can only see their own branch
      if (isBranchManager && !isAdmin && !isExecutive && profile?.branch_id) {
        return b.id === profile.branch_id;
      }
      return true;
    }).map(branch => {
      const branchEvals = evaluations.filter(e => e.branch_id === branch.id);

      const periodScores = periods.map(p => {
        const matching = branchEvals.filter(e => {
          if (!e.submitted_at) return false;
          const d = new Date(e.submitted_at);
          return d >= p.start && d <= p.end;
        });

        const avg = matching.length > 0
          ? matching.reduce((sum, e) => sum + (Number(e.overall_percentage) || 0), 0) / matching.length
          : null;

        return { label: p.label, score: avg !== null ? Math.round(avg * 10) / 10 : null, evalCount: matching.length };
      });

      return {
        branchId: branch.id,
        branchName: isAr ? (branch.nameAr || branch.name) : branch.name,
        periods: periodScores,
      };
    });

    return result;
  }, [branches, evaluations, activeTab, periodsToShow, isAr, isBranchManager, isAdmin, isExecutive, profile?.branch_id]);

  const getTrend = (periods: { score: number | null }[]) => {
    const current = periods[0]?.score;
    const previous = periods[1]?.score;
    if (current == null || previous == null) return null;
    return +(current - previous).toFixed(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{isAr ? 'التقارير والمقارنات' : 'Reports & Comparisons'}</h1>
          <p className="text-muted-foreground mt-1">{isAr ? 'مقارنة أداء الفروع عبر الفترات' : 'Compare branch performance across periods'}</p>
        </div>
        <Select value={String(periodsToShow)} onValueChange={v => setPeriodsToShow(Number(v))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">{isAr ? '3 فترات' : '3 periods'}</SelectItem>
            <SelectItem value="4">{isAr ? '4 فترات' : '4 periods'}</SelectItem>
            <SelectItem value="6">{isAr ? '6 فترات' : '6 periods'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as PeriodTab)}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="weekly">{isAr ? 'أسبوعي' : 'Weekly'}</TabsTrigger>
          <TabsTrigger value="monthly">{isAr ? 'شهري' : 'Monthly'}</TabsTrigger>
          <TabsTrigger value="yearly">{isAr ? 'سنوي' : 'Yearly'}</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">{isAr ? 'جاري التحميل...' : 'Loading...'}</div>
          ) : buildPeriodData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{isAr ? 'لا توجد بيانات' : 'No data available'}</div>
          ) : (
            <div className="space-y-4">
              {/* Table Header */}
              <div className="bg-muted/50 rounded-xl p-4 overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="text-sm text-muted-foreground">
                      <th className={cn("py-2 font-medium", isAr ? "text-right" : "text-left")} style={{ width: '200px' }}>
                        {isAr ? 'الفرع' : 'Branch'}
                      </th>
                      {buildPeriodData[0]?.periods.map((p, i) => (
                        <th key={i} className="py-2 font-medium text-center">{p.label}</th>
                      ))}
                      <th className="py-2 font-medium text-center">{isAr ? 'الاتجاه' : 'Trend'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {buildPeriodData.map(branch => {
                      const trend = getTrend(branch.periods);

                      return (
                        <tr key={branch.branchId} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 font-medium text-foreground">{branch.branchName}</td>
                          {branch.periods.map((p, i) => (
                            <td key={i} className="py-3 text-center">
                              {p.score !== null ? (
                                <div className="flex flex-col items-center gap-1">
                                  <span className={cn(
                                    "text-lg font-bold",
                                    p.score >= 80 ? "text-score-excellent" :
                                    p.score >= 60 ? "text-score-good" :
                                    p.score >= 40 ? "text-score-average" : "text-score-critical"
                                  )}>
                                    {p.score}%
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {p.evalCount} {isAr ? 'تقييم' : 'eval'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </td>
                          ))}
                          <td className="py-3 text-center">
                            {trend !== null ? (
                              <div className="flex items-center justify-center gap-1">
                                {trend > 0 ? <TrendingUp className="w-4 h-4 text-score-good" /> :
                                  trend < 0 ? <TrendingDown className="w-4 h-4 text-score-critical" /> :
                                  <Minus className="w-4 h-4 text-muted-foreground" />}
                                <span className={cn("font-medium",
                                  trend > 0 ? "text-score-good" : trend < 0 ? "text-score-critical" : "text-muted-foreground"
                                )}>
                                  {trend > 0 ? '+' : ''}{trend}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(() => {
                  // Compute overall average from ALL evaluations, not just current period
                  const allEvalPercentages = evaluations
                    .map(e => Number(e.overall_percentage) || 0)
                    .filter(p => p > 0);
                  const avg = allEvalPercentages.length > 0
                    ? Math.round(allEvalPercentages.reduce((a, b) => a + b, 0) / allEvalPercentages.length)
                    : 0;
                  
                  // Best/worst: use latest available score per branch (first non-null period)
                  const branchesWithScores = buildPeriodData
                    .map(b => {
                      const latestScore = b.periods.find(p => p.score !== null)?.score ?? null;
                      return { ...b, latestScore };
                    })
                    .filter(b => b.latestScore !== null);
                  const best = branchesWithScores.length > 0 ? branchesWithScores.reduce((best, b) => (b.latestScore! > best.latestScore!) ? b : best) : null;
                  const worst = branchesWithScores.length > 0 ? branchesWithScores.reduce((worst, b) => (b.latestScore! < worst.latestScore!) ? b : worst) : null;

                  return (
                    <>
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isAr ? 'المعدل العام' : 'Overall Average'}</CardTitle></CardHeader>
                        <CardContent><span className="text-3xl font-bold text-foreground">{avg}%</span></CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isAr ? 'أفضل فرع' : 'Best Branch'}</CardTitle></CardHeader>
                        <CardContent>
                          {best ? (
                            <>
                              <span className="text-lg font-bold text-score-excellent">{best.branchName}</span>
                              <span className="text-sm text-muted-foreground ms-2">{best.latestScore}%</span>
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">{isAr ? 'لا توجد بيانات' : 'No data'}</span>
                          )}
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isAr ? 'أضعف فرع' : 'Weakest Branch'}</CardTitle></CardHeader>
                        <CardContent>
                          {worst ? (
                            <>
                              <span className="text-lg font-bold text-score-critical">{worst.branchName}</span>
                              <span className="text-sm text-muted-foreground ms-2">{worst.latestScore}%</span>
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">{isAr ? 'لا توجد بيانات' : 'No data'}</span>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
