import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, TrendingUp, BarChart3, Building2, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useGoBack } from '@/hooks/useGoBack';
import { useCriticalFindings } from '@/hooks/useFindings';
import { useBranches } from '@/hooks/useBranches';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function RecurringProblemsPage() {
  const navigate = useNavigate();
  const goBack = useGoBack('/dashboard/branch-manager');
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { profile, isAdmin, isExecutive } = useAuth();
  const { data: branches } = useBranches();

  // For branch managers, filter by their branch
  const branchId = (!isAdmin && !isExecutive) ? profile?.branch_id || undefined : undefined;
  const { data: findings, isLoading } = useCriticalFindings({ branchId });

  // Group findings by criterion to find recurring problems
  const recurringProblems = useMemo(() => {
    if (!findings) return [];

    const criterionMap = new Map<string, {
      criterionId: string;
      criterionName: string;
      criterionNameAr?: string;
      categoryName: string;
      categoryNameAr?: string;
      count: number;
      branches: Set<string>;
      branchNames: Set<string>;
      avgScore: number;
      totalScore: number;
      statuses: Record<string, number>;
    }>();

    for (const f of findings) {
      const existing = criterionMap.get(f.criterionId);
      if (existing) {
        existing.count++;
        existing.branches.add(f.branchId);
        existing.branchNames.add(isAr ? (f.branchNameAr || f.branchName) : f.branchName);
        existing.totalScore += f.score;
        existing.avgScore = existing.totalScore / existing.count;
        existing.statuses[f.status] = (existing.statuses[f.status] || 0) + 1;
      } else {
        criterionMap.set(f.criterionId, {
          criterionId: f.criterionId,
          criterionName: f.criterionName,
          criterionNameAr: f.criterionNameAr,
          categoryName: f.categoryName,
          categoryNameAr: f.categoryNameAr,
          count: 1,
          branches: new Set([f.branchId]),
          branchNames: new Set([isAr ? (f.branchNameAr || f.branchName) : f.branchName]),
          avgScore: f.score,
          totalScore: f.score,
          statuses: { [f.status]: 1 },
        });
      }
    }

    return Array.from(criterionMap.values())
      .filter(p => p.count >= 2) // Only show problems that occurred 2+ times
      .sort((a, b) => b.count - a.count);
  }, [findings, isAr]);

  // Chart data - top 10 recurring
  const chartData = useMemo(() => {
    return recurringProblems.slice(0, 10).map(p => ({
      name: isAr ? (p.criterionNameAr || p.criterionName) : p.criterionName,
      shortName: (isAr ? (p.criterionNameAr || p.criterionName) : p.criterionName).substring(0, 20) + ((isAr ? (p.criterionNameAr || p.criterionName) : p.criterionName).length > 20 ? '...' : ''),
      count: p.count,
      avgScore: Math.round(p.avgScore * 10) / 10,
    }));
  }, [recurringProblems, isAr]);

  const getSeverityColor = (avgScore: number) => {
    if (avgScore === 0) return 'hsl(0, 84%, 50%)';
    if (avgScore === 1) return 'hsl(15, 80%, 50%)';
    if (avgScore === 2) return 'hsl(45, 93%, 47%)';
    return 'hsl(142, 52%, 50%)';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={goBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isAr ? 'المشاكل المتكررة' : 'Recurring Problems'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAr ? 'المعايير التي تتكرر فيها الملاحظات أكثر من مرة' : 'Criteria with findings that occur more than once'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : recurringProblems.length === 0 ? (
        <Card className="p-12 text-center">
          <Repeat className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">{isAr ? 'لا توجد مشاكل متكررة' : 'No Recurring Problems'}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr ? 'لم يتم رصد أي معيار تكررت فيه الملاحظات' : 'No criteria have been flagged more than once'}
          </p>
        </Card>
      ) : (
        <>
          {/* Chart */}
          {chartData.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                <BarChart3 className="w-5 h-5 inline-block me-2 text-primary" />
                {isAr ? 'أكثر المعايير تكراراً' : 'Most Recurring Criteria'}
              </h2>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis
                      type="category"
                      dataKey="shortName"
                      width={150}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [value, isAr ? 'التكرار' : 'Occurrences']}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={30}>
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={getSeverityColor(entry.avgScore)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Detailed list */}
          <div className="space-y-3">
            {recurringProblems.map((problem, idx) => {
              const openCount = problem.statuses['open'] || 0;
              const resolvedCount = problem.statuses['resolved'] || 0;
              const inProgressCount = (problem.statuses['in_progress'] || 0) + (problem.statuses['rejected'] || 0);

              return (
                <Card key={problem.criterionId} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-foreground">#{idx + 1}</span>
                        <h3 className="font-semibold text-foreground">
                          {isAr ? (problem.criterionNameAr || problem.criterionName) : problem.criterionName}
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {isAr ? (problem.categoryNameAr || problem.categoryName) : problem.categoryName}
                      </p>

                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge variant="outline" className="bg-score-critical/10 text-score-critical border-score-critical/20">
                          <Repeat className="w-3 h-3 me-1" />
                          {problem.count} {isAr ? 'تكرار' : 'times'}
                        </Badge>
                        <Badge variant="outline" className="text-muted-foreground">
                          <Building2 className="w-3 h-3 me-1" />
                          {problem.branches.size} {isAr ? 'فرع' : 'branches'}
                        </Badge>
                        <Badge variant="outline" className="text-muted-foreground">
                          {isAr ? 'متوسط الدرجة:' : 'Avg score:'} {Math.round(problem.avgScore * 10) / 10}/{5}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {openCount > 0 && <span className="text-score-critical">{openCount} {isAr ? 'مفتوح' : 'open'}</span>}
                        {inProgressCount > 0 && <span className="text-score-average">{inProgressCount} {isAr ? 'قيد المعالجة' : 'in progress'}</span>}
                        {resolvedCount > 0 && <span className="text-score-excellent">{resolvedCount} {isAr ? 'تم الحل' : 'resolved'}</span>}
                      </div>

                      {problem.branches.size > 1 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {isAr ? 'الفروع:' : 'Branches:'} {Array.from(problem.branchNames).join('، ')}
                        </p>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate('/findings')}>
                      {isAr ? 'التفاصيل' : 'Details'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
