import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBranches } from '@/hooks/useBranches';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, ChevronDown, ChevronRight, CheckCircle2, AlertCircle, BarChart3, Building2 } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getScoreLevel } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

type PeriodTab = 'weekly' | 'monthly' | 'yearly';

export default function BranchPerformanceReport() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { profile, isAdmin, isExecutive } = useAuth();
  const { data: branches } = useBranches();
  const canSelectBranch = isAdmin || isExecutive;
  
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<PeriodTab>('monthly');
  const [expandedPeriod, setExpandedPeriod] = useState<number | null>(0);
  const dateLocale = isAr ? { locale: ar } : {};

  // Determine the effective branch ID
  const branchId = canSelectBranch ? selectedBranchId : profile?.branch_id;

  // Auto-select first branch for admin/exec if none selected
  const effectiveBranchId = branchId || '';

  // Fetch branch info
  const { data: branch } = useQuery({
    queryKey: ['perf-branch', effectiveBranchId],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('name, name_ar').eq('id', effectiveBranchId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveBranchId,
  });

  // Fetch all evaluations for this branch
  const { data: evaluations = [] } = useQuery({
    queryKey: ['perf-evals', effectiveBranchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluations')
        .select('id, overall_percentage, overall_score, submitted_at, period_type, status')
        .eq('branch_id', effectiveBranchId)
        .in('status', ['submitted', 'approved'])
        .eq('is_archived', false)
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveBranchId,
  });

  // Fetch category scores for all evaluations
  const evalIds = evaluations.map(e => e.id);
  const { data: categoryScores = [] } = useQuery({
    queryKey: ['perf-cat-scores', evalIds],
    queryFn: async () => {
      if (evalIds.length === 0) return [];
      const { data, error } = await supabase
        .from('evaluation_category_scores')
        .select('evaluation_id, category_id, score, max_score, percentage, template_categories:category_id(name, name_ar)')
        .in('evaluation_id', evalIds);
      if (error) throw error;
      return data || [];
    },
    enabled: evalIds.length > 0,
  });

  // Fetch findings stats per evaluation
  const { data: findingsData = [] } = useQuery({
    queryKey: ['perf-findings', evalIds],
    queryFn: async () => {
      if (evalIds.length === 0) return [];
      const { data, error } = await supabase
        .from('non_conformities')
        .select('evaluation_id, status')
        .in('evaluation_id', evalIds);
      if (error) throw error;
      return data || [];
    },
    enabled: evalIds.length > 0,
  });

  const periods = useMemo(() => {
    const now = new Date();
    const ps: { start: Date; end: Date; label: string }[] = [];

    if (activeTab === 'weekly') {
      for (let i = 0; i < 8; i++) {
        const w = subWeeks(now, i);
        ps.push({ start: startOfWeek(w, { weekStartsOn: 0 }), end: endOfWeek(w, { weekStartsOn: 0 }), label: isAr ? `أسبوع ${format(startOfWeek(w), 'd/M', dateLocale)}` : `Week of ${format(startOfWeek(w), 'MMM d')}` });
      }
    } else if (activeTab === 'monthly') {
      for (let i = 0; i < 6; i++) {
        const m = subMonths(now, i);
        ps.push({ start: startOfMonth(m), end: endOfMonth(m), label: format(m, isAr ? 'MMMM yyyy' : 'MMMM yyyy', dateLocale) });
      }
    } else {
      for (let i = 0; i < 3; i++) {
        const y = now.getFullYear() - i;
        ps.push({ start: new Date(y, 0, 1), end: new Date(y, 11, 31), label: `${y}` });
      }
    }
    return ps;
  }, [activeTab, isAr]);

  const periodResults = useMemo(() => {
    return periods.map((p, idx) => {
      const pEvals = evaluations.filter(e => {
        if (!e.submitted_at) return false;
        const d = new Date(e.submitted_at);
        return d >= p.start && d <= p.end && (activeTab === 'yearly' || e.period_type === activeTab);
      });

      const avg = pEvals.length > 0
        ? Math.round(pEvals.reduce((s, e) => s + (Number(e.overall_percentage) || 0), 0) / pEvals.length * 10) / 10
        : null;

      const evalIdsInPeriod = pEvals.map(e => e.id);
      const catMap: Record<string, { name: string; nameAr: string; totalScore: number; totalMax: number; count: number }> = {};
      categoryScores.filter(cs => evalIdsInPeriod.includes(cs.evaluation_id)).forEach(cs => {
        const catName = (cs.template_categories as any)?.name || 'Unknown';
        const catNameAr = (cs.template_categories as any)?.name_ar || catName;
        if (!catMap[cs.category_id]) catMap[cs.category_id] = { name: catName, nameAr: catNameAr, totalScore: 0, totalMax: 0, count: 0 };
        catMap[cs.category_id].totalScore += Number(cs.score);
        catMap[cs.category_id].totalMax += Number(cs.max_score);
        catMap[cs.category_id].count++;
      });
      const categories = Object.entries(catMap).map(([id, c]) => ({
        id,
        name: c.name,
        nameAr: c.nameAr,
        percentage: c.totalMax > 0 ? Math.round((c.totalScore / c.totalMax) * 100) : 0,
      }));

      const periodFindings = findingsData.filter(f => evalIdsInPeriod.includes(f.evaluation_id));
      const findingsStats = {
        total: periodFindings.length,
        open: periodFindings.filter(f => f.status === 'open').length,
        resolved: periodFindings.filter(f => f.status === 'resolved').length,
      };

      return { ...p, idx, avg, evalCount: pEvals.length, categories, findingsStats };
    });
  }, [periods, evaluations, categoryScores, findingsData, activeTab]);

  const branchName = isAr ? (branch?.name_ar || branch?.name) : branch?.name;

  // Show branch selector prompt for admin/exec with no branch selected
  if (canSelectBranch && !effectiveBranchId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{isAr ? 'تقرير أداء الفرع' : 'Branch Performance Report'}</h1>
          <p className="text-muted-foreground mt-1">{isAr ? 'اختر فرعاً لعرض تقرير الأداء' : 'Select a branch to view the performance report'}</p>
        </div>
        <Card className="p-8">
          <div className="flex flex-col items-center gap-4">
            <Building2 className="w-12 h-12 text-muted-foreground/50" />
            <h3 className="text-lg font-medium">{isAr ? 'اختر الفرع' : 'Select Branch'}</h3>
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder={isAr ? 'اختر فرعاً...' : 'Choose a branch...'} />
              </SelectTrigger>
              <SelectContent>
                {branches?.filter(b => b.isActive).map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {isAr ? (b.nameAr || b.name) : b.name} • {b.city || 'N/A'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>
      </div>
    );
  }

  // Show message for branch managers with no branch assigned
  if (!canSelectBranch && !effectiveBranchId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{isAr ? 'تقرير أداء الفرع' : 'Branch Performance Report'}</h1>
        </div>
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium">{isAr ? 'لا يوجد فرع مرتبط بحسابك' : 'No branch assigned to your account'}</h3>
          <p className="text-sm text-muted-foreground mt-2">{isAr ? 'يرجى التواصل مع المسؤول لربط حسابك بفرع' : 'Please contact your administrator to assign a branch'}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{isAr ? 'تقرير أداء الفرع' : 'Branch Performance Report'}</h1>
          <p className="text-muted-foreground mt-1">{branchName || '...'} — {isAr ? 'مقارنة الأداء بين الفترات' : 'Period-to-period performance comparison'}</p>
        </div>
        {canSelectBranch && (
          <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder={isAr ? 'تغيير الفرع...' : 'Change branch...'} />
            </SelectTrigger>
            <SelectContent>
              {branches?.filter(b => b.isActive).map(b => (
                <SelectItem key={b.id} value={b.id}>
                  {isAr ? (b.nameAr || b.name) : b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={v => { setActiveTab(v as PeriodTab); setExpandedPeriod(0); }}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="weekly">{isAr ? 'أسبوعي' : 'Weekly'}</TabsTrigger>
          <TabsTrigger value="monthly">{isAr ? 'شهري' : 'Monthly'}</TabsTrigger>
          <TabsTrigger value="yearly">{isAr ? 'سنوي' : 'Yearly'}</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6 space-y-4">
          {periodResults.map((period, i) => {
            const prevPeriod = periodResults[i + 1];
            const trend = period.avg != null && prevPeriod?.avg != null ? +(period.avg - prevPeriod.avg).toFixed(1) : null;
            const isExpanded = expandedPeriod === i;

            return (
              <Card key={i} className="overflow-hidden">
                <button
                  onClick={() => setExpandedPeriod(isExpanded ? null : i)}
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                    <div className={cn("text-start", isAr && "text-right")}>
                      <h3 className="font-semibold text-foreground">{period.label}</h3>
                      <p className="text-sm text-muted-foreground">
                        {period.evalCount} {isAr ? 'تقييم' : 'evaluations'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {trend !== null && (
                      <div className="flex items-center gap-1">
                        {trend > 0 ? <TrendingUp className="w-4 h-4 text-score-good" /> : trend < 0 ? <TrendingDown className="w-4 h-4 text-score-critical" /> : null}
                        <span className={cn("text-sm font-medium", trend > 0 ? "text-score-good" : trend < 0 ? "text-score-critical" : "text-muted-foreground")}>
                          {trend > 0 ? '+' : ''}{trend}%
                        </span>
                      </div>
                    )}
                    {period.avg != null ? (
                      <div className={cn(
                        "w-14 h-14 rounded-full flex items-center justify-center text-white font-bold",
                        period.avg >= 80 ? "bg-score-excellent" : period.avg >= 60 ? "bg-score-good" : period.avg >= 40 ? "bg-score-average" : "bg-score-critical"
                      )}>
                        {Math.round(period.avg)}%
                      </div>
                    ) : (
                      <Badge variant="secondary">{isAr ? 'لا تقييم' : 'No eval'}</Badge>
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && period.avg != null && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="border-t border-border p-6 space-y-6">
                        {/* Category Breakdown */}
                        <div>
                          <h4 className="text-sm font-semibold text-muted-foreground mb-3">{isAr ? 'تفصيل الفئات' : 'Category Breakdown'}</h4>
                          <div className="space-y-3">
                            {period.categories.map(cat => {
                              const prevCat = prevPeriod?.categories.find(c => c.id === cat.id);
                              const catTrend = prevCat ? cat.percentage - prevCat.percentage : null;

                              return (
                                <div key={cat.id} className="space-y-1">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium text-foreground">{isAr ? cat.nameAr : cat.name}</span>
                                    <div className="flex items-center gap-2">
                                      <span className={cn(
                                        "font-bold",
                                        cat.percentage >= 80 ? "text-score-excellent" : cat.percentage >= 60 ? "text-score-good" : cat.percentage >= 40 ? "text-score-average" : "text-score-critical"
                                      )}>
                                        {cat.percentage}%
                                      </span>
                                      {catTrend !== null && catTrend !== 0 && (
                                        <span className={cn("text-xs", catTrend > 0 ? "text-score-good" : "text-score-critical")}>
                                          {catTrend > 0 ? '↑' : '↓'}{Math.abs(catTrend)}%
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <Progress value={cat.percentage} className="h-2" />
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Findings Summary */}
                        <div>
                          <h4 className="text-sm font-semibold text-muted-foreground mb-3">{isAr ? 'ملخص الملاحظات' : 'Findings Summary'}</h4>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="bg-muted/50 rounded-lg p-3 text-center">
                              <AlertCircle className="w-5 h-5 text-score-critical mx-auto mb-1" />
                              <p className="text-xl font-bold text-foreground">{period.findingsStats.open}</p>
                              <p className="text-xs text-muted-foreground">{isAr ? 'مفتوحة' : 'Open'}</p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-3 text-center">
                              <CheckCircle2 className="w-5 h-5 text-score-good mx-auto mb-1" />
                              <p className="text-xl font-bold text-foreground">{period.findingsStats.resolved}</p>
                              <p className="text-xs text-muted-foreground">{isAr ? 'محلولة' : 'Resolved'}</p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-3 text-center">
                              <BarChart3 className="w-5 h-5 text-primary mx-auto mb-1" />
                              <p className="text-xl font-bold text-foreground">{period.findingsStats.total}</p>
                              <p className="text-xs text-muted-foreground">{isAr ? 'الإجمالي' : 'Total'}</p>
                            </div>
                          </div>
                          {period.findingsStats.total > 0 && (
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-muted-foreground">{isAr ? 'نسبة المعالجة' : 'Resolution Rate'}</span>
                                <span className="font-medium">{Math.round((period.findingsStats.resolved / period.findingsStats.total) * 100)}%</span>
                              </div>
                              <Progress value={(period.findingsStats.resolved / period.findingsStats.total) * 100} className="h-2" />
                            </div>
                          )}
                        </div>

                        {/* Comparison with previous */}
                        {prevPeriod?.avg != null && (
                          <div className="bg-muted/30 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                              {isAr ? `مقارنة مع ${prevPeriod.label}` : `Compared to ${prevPeriod.label}`}
                            </h4>
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">{prevPeriod.label}</p>
                                <p className="text-lg font-bold">{Math.round(prevPeriod.avg)}%</p>
                              </div>
                              <div className="flex-1 flex items-center justify-center">
                                {trend !== null && (
                                  <div className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-full",
                                    trend > 0 ? "bg-score-good/10 text-score-good" : trend < 0 ? "bg-score-critical/10 text-score-critical" : "bg-muted text-muted-foreground"
                                  )}>
                                    {trend > 0 ? <TrendingUp className="w-5 h-5" /> : trend < 0 ? <TrendingDown className="w-5 h-5" /> : null}
                                    <span className="font-bold text-lg">{trend > 0 ? '+' : ''}{trend}%</span>
                                  </div>
                                )}
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">{period.label}</p>
                                <p className="text-lg font-bold">{Math.round(period.avg!)}%</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
