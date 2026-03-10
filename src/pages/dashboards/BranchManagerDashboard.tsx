import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Clock, FileSearch, AlertCircle, Building2, Repeat } from 'lucide-react';
import { QualityCircle } from '@/components/QualityCircle';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBranches } from '@/hooks/useBranches';
import { getScoreLevel } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function BranchManagerDashboard() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { profile, isAdmin, isExecutive } = useAuth();
  const { data: branches } = useBranches();
  const isAr = language === 'ar';
  const dateLocale = isAr ? { locale: ar } : {};
  const canSelectBranch = isAdmin || isExecutive;

  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  // Admin/Executive select from dropdown; Branch Manager uses their assigned branch
  const branchId = canSelectBranch ? selectedBranchId : profile?.branch_id;

  // Fetch branch info
  const { data: branch } = useQuery({
    queryKey: ['manager-branch', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, name_ar, city')
        .eq('id', branchId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!branchId,
  });

  // Fetch latest evaluation for score
  const { data: latestEval } = useQuery({
    queryKey: ['manager-latest-eval', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluations')
        .select('id, overall_percentage, submitted_at, created_at')
        .eq('branch_id', branchId!)
        .in('status', ['submitted', 'approved'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!branchId,
  });

  // Fetch findings stats for this branch
  const { data: findingsStats } = useQuery({
    queryKey: ['manager-findings-stats', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('non_conformities')
        .select('status')
        .eq('branch_id', branchId!);
      if (error) throw error;

      const open = data?.filter(f => f.status === 'open').length || 0;
      const inProgress = data?.filter(f => f.status === 'in_progress').length || 0;
      const pendingReview = data?.filter(f => f.status === 'pending_review').length || 0;
      const resolved = data?.filter(f => f.status === 'resolved').length || 0;
      const total = data?.length || 0;

      return { open, inProgress, pendingReview, resolved, total };
    },
    enabled: !!branchId,
  });

  // Fetch previous evaluation for trend (only if there are 2+ evaluations)
  const { data: previousEval } = useQuery({
    queryKey: ['manager-prev-eval', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluations')
        .select('overall_percentage')
        .eq('branch_id', branchId!)
        .in('status', ['submitted', 'approved'])
        .order('created_at', { ascending: false })
        .range(1, 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!branchId,
  });

  const currentScore = latestEval?.overall_percentage ? Number(latestEval.overall_percentage) : null;
  const prevScore = previousEval?.overall_percentage ? Number(previousEval.overall_percentage) : null;
  const scoreDiff = currentScore != null && prevScore != null ? +(currentScore - prevScore).toFixed(1) : null;
  const scoreStatus = currentScore != null ? getScoreLevel(currentScore) : 'unrated' as const;

  const branchName = isAr ? (branch?.name_ar || branch?.name) : branch?.name;

  const priorityLabels: Record<string, { en: string; ar: string }> = {
    critical: { en: 'Critical', ar: 'حرج' },
    high: { en: 'High', ar: 'عالي' },
    medium: { en: 'Medium', ar: 'متوسط' },
    low: { en: 'Low', ar: 'منخفض' },
  };

  // Show branch selector for admin/exec when no branch selected
  if (canSelectBranch && !branchId) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('dashboard.branchManager.title')}</h1>
          <p className="text-muted-foreground mt-1">{isAr ? 'اختر فرعاً لعرض لوحة التحكم' : 'Select a branch to view the dashboard'}</p>
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
  if (!canSelectBranch && !branchId) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('dashboard.branchManager.title')}</h1>
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('dashboard.branchManager.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {branchName || '...'} {branch?.city ? `- ${branch.city}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {canSelectBranch && (
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger className="w-[220px]">
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            {t('common.lastUpdated')}: {format(new Date(), 'd MMM yyyy h:mm a', dateLocale)}
          </div>
        </div>
      </div>

      {/* Branch Score & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-xl border border-border p-6 flex flex-col items-center justify-center">
          <QualityCircle
            score={currentScore ?? 0}
            status={scoreStatus}
            size="xl"
          />
          <h3 className="mt-4 text-lg font-semibold text-foreground">{t('dashboard.currentScore')}</h3>
          <StatusBadge status={scoreStatus} className="mt-2" />
          {latestEval?.submitted_at && (
            <p className="text-sm text-muted-foreground mt-2">
              {t('dashboard.lastEvaluation')}: {format(new Date(latestEval.submitted_at), 'd MMM yyyy', dateLocale)}
            </p>
          )}
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <StatCard
            title={isAr ? 'ملاحظات مفتوحة' : 'Open Findings'}
            value={findingsStats?.open ?? '...'}
            subtitle={isAr ? 'تحتاج متابعة' : 'Need attention'}
            icon={AlertCircle}
            variant="critical"
            onClick={() => navigate('/findings')}
          />
          <StatCard
            title={isAr ? 'معلّقة' : 'Pending'}
            value={findingsStats?.inProgress ?? '...'}
            subtitle={isAr ? 'معيّنة لشخص ولم تُحل' : 'Assigned, not resolved'}
            icon={AlertTriangle}
            variant="average"
            onClick={() => navigate('/findings')}
          />
          <StatCard
            title={isAr ? 'قيد المراجعة' : 'Pending Review'}
            value={findingsStats?.pendingReview ?? '...'}
            subtitle={isAr ? 'بانتظار الموافقة' : 'Awaiting approval'}
            icon={FileSearch}
            variant="default"
            onClick={() => navigate('/findings')}
          />
          <StatCard
            title={isAr ? 'تم الحل' : 'Resolved'}
            value={findingsStats?.resolved ?? '...'}
            subtitle={isAr ? 'ملاحظات محلولة' : 'Resolved findings'}
            icon={CheckCircle2}
            variant="good"
            onClick={() => navigate('/findings')}
          />
        </div>
      </div>

      {/* Performance Trend Over Time */}
      <PerformanceTrendChart branchId={branchId!} isAr={isAr} />

      {/* Quick Link to Recurring Problems */}
      <Card
        className="p-4 cursor-pointer hover:shadow-md transition-shadow border-score-average/20 bg-score-average/5"
        onClick={() => navigate('/recurring-problems')}
      >
        <div className="flex items-center gap-3">
          <Repeat className="w-6 h-6 text-score-average" />
          <div>
            <h3 className="font-semibold text-foreground">{isAr ? 'المشاكل المتكررة' : 'Recurring Problems'}</h3>
            <p className="text-sm text-muted-foreground">{isAr ? 'عرض المعايير الأكثر تكراراً في الملاحظات' : 'View most frequently recurring criteria in findings'}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function PerformanceTrendChart({ branchId, isAr }: { branchId: string; isAr: boolean }) {
  const { data: trendData, isLoading } = useQuery({
    queryKey: ['branch-performance-trend', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluations')
        .select('overall_percentage, submitted_at, created_at')
        .eq('branch_id', branchId)
        .in('status', ['submitted', 'approved'])
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map((e, i) => ({
        date: format(new Date(e.submitted_at || e.created_at), 'dd/MM/yy'),
        score: Number(e.overall_percentage) || 0,
        index: i + 1,
      }));
    },
    enabled: !!branchId,
  });

  if (isLoading) return <Skeleton className="h-[250px] rounded-xl" />;
  if (!trendData || trendData.length < 2) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        <TrendingUp className="w-5 h-5 inline-block me-2 text-primary" />
        {isAr ? 'اتجاه الأداء عبر الزمن' : 'Performance Trend Over Time'}
      </h2>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
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
              formatter={(value: number) => [`${value}%`, isAr ? 'النسبة' : 'Score']}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              dot={{ r: 4, fill: 'hsl(var(--primary))' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
