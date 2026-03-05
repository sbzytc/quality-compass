import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Clock, FileSearch, ExternalLink, AlertCircle, Building2 } from 'lucide-react';
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

  // Fetch active findings (in_progress + pending_review) for the list
  const { data: activeFindings = [] } = useQuery({
    queryKey: ['manager-active-findings', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('non_conformities')
        .select(`
          id,
          status,
          score,
          max_score,
          assigned_to,
          due_date,
          resolved_at,
          resolved_by,
          template_criteria:criterion_id(name, name_ar),
          profiles:assigned_to(full_name)
        `)
        .eq('branch_id', branchId!)
        .in('status', ['in_progress', 'pending_review'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!branchId,
  });

  // Fetch previous evaluation for trend
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

      {/* Active Findings List */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {isAr ? 'الملاحظات النشطة' : 'Active Findings'}
          </h2>
          <button
            onClick={() => navigate('/findings')}
            className="text-sm text-primary hover:underline"
          >
            {t('common.viewAll')} →
          </button>
        </div>
        <div className="divide-y divide-border">
          {activeFindings.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              {isAr ? 'لا توجد ملاحظات نشطة' : 'No active findings'}
            </div>
          ) : (
            activeFindings.map((finding: any) => {
              const criterionName = isAr
                ? (finding.template_criteria?.name_ar || finding.template_criteria?.name)
                : finding.template_criteria?.name;
              const assigneeName = finding.profiles?.full_name;
              const isInProgress = finding.status === 'in_progress';
              const isPendingReview = finding.status === 'pending_review';

              return (
                <div
                  key={finding.id}
                  className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate('/findings')}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground flex items-center gap-2">
                        {criterionName || '—'}
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {finding.score}/{finding.max_score}
                        {assigneeName && isInProgress && (
                          <> • {isAr ? 'معيّنة لـ' : 'Assigned to'}: {assigneeName}</>
                        )}
                      </p>
                      {finding.due_date && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t('common.dueDate')}: {format(new Date(finding.due_date), 'd MMM yyyy', dateLocale)}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full shrink-0 ${
                      isInProgress
                        ? 'bg-score-average/10 text-score-average'
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {isInProgress
                        ? (isAr ? 'معلّقة' : 'Pending')
                        : (isAr ? 'قيد المراجعة' : 'Under Review')
                      }
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Score Trend */}
      {scoreDiff !== null && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">{t('dashboard.scoreTrend')}</h2>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              {scoreDiff >= 0 ? (
                <TrendingUp className="w-5 h-5 text-score-good" />
              ) : (
                <TrendingDown className="w-5 h-5 text-score-critical" />
              )}
              <span className={`text-lg font-bold ${scoreDiff >= 0 ? 'text-score-good' : 'text-score-critical'}`}>
                {scoreDiff >= 0 ? '+' : ''}{scoreDiff}%
              </span>
              <span className="text-sm text-muted-foreground">
                {isAr ? 'مقارنة بالتقييم السابق' : 'vs previous evaluation'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
