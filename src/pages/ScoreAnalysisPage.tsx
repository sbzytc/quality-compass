import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QualityCircle } from '@/components/QualityCircle';
import { StatusBadge } from '@/components/StatusBadge';
import { useBranches, useBranchStats } from '@/hooks/useBranches';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGoBack } from '@/hooks/useGoBack';
import { Skeleton } from '@/components/ui/skeleton';

export default function ScoreAnalysisPage() {
  const navigate = useNavigate();
  const goBack = useGoBack('/dashboard/ceo');
  const { t, language, direction } = useLanguage();
  const { data: branches, isLoading: branchesLoading } = useBranches();
  const { data: stats, isLoading: statsLoading } = useBranchStats();

  const isLoading = branchesLoading || statsLoading;

  // Separate evaluated vs unevaluated branches
  const evaluatedBranches = branches?.filter(b => b.lastEvaluationDate !== null) || [];
  const unevaluatedBranches = branches?.filter(b => b.lastEvaluationDate === null) || [];

  // Calculate overall score only from evaluated branches
  const overallScore = evaluatedBranches.length > 0
    ? Math.round(evaluatedBranches.reduce((sum, b) => sum + b.overallScore, 0) / evaluatedBranches.length)
    : 0;
  const overallStatus = overallScore >= 90 ? 'excellent' : 
                        overallScore >= 75 ? 'good' : 
                        overallScore >= 60 ? 'average' : 
                        overallScore >= 40 ? 'weak' : 'critical';

  // Sort evaluated branches by score descending
  const sortedBranches = evaluatedBranches.slice().sort((a, b) => b.overallScore - a.overallScore);

  return (
    <div className="space-y-8">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={goBack}
          className="shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {language === 'ar' ? 'تحليل الدرجات' : 'Score Analysis'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' ? 'تفصيل درجات جميع الفروع' : 'Breakdown of scores across all branches'}
          </p>
        </div>
      </div>

      {/* Overall Score Summary */}
      <div className="bg-card rounded-xl border border-border p-8">
        <div className="flex flex-col md:flex-row items-center gap-8">
          {isLoading ? (
            <Skeleton className="w-40 h-40 rounded-full" />
          ) : (
            <QualityCircle
              score={overallScore}
              status={overallStatus as any}
              size="xl"
              showLabel
            />
          )}
          <div className="text-center md:text-start">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {language === 'ar' ? 'متوسط الدرجة الإجمالي' : 'Overall Average Score'}
            </h2>
            <p className="text-muted-foreground mb-4">
              {language === 'ar' 
                ? `محسوب من ${evaluatedBranches.length} فرع مُقيّم`
                : `Calculated from ${evaluatedBranches.length} evaluated branches`}
            </p>
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">
                {language === 'ar' 
                  ? 'المتوسط المرجح لجميع درجات الفروع'
                  : 'Weighted average of all branch scores'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Branch Scores Grid */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6">
          {language === 'ar' ? 'درجات الفروع' : 'Branch Scores'}
        </h2>
        
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : sortedBranches.length > 0 ? (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: { staggerChildren: 0.05 },
              },
            }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {sortedBranches.map((branch, index) => (
              <motion.div
                key={branch.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/branches/${branch.id}`)}
                className="bg-muted/30 rounded-xl p-6 cursor-pointer border border-border hover:border-primary/50 transition-all"
              >
                <div className="flex flex-col items-center text-center">
                  {/* Rank Badge */}
                  <div className="absolute top-3 right-3 bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full">
                    #{index + 1}
                  </div>
                  
                  <QualityCircle
                    score={branch.overallScore}
                    status={branch.status}
                    size="lg"
                  />
                  
                  <h3 className="mt-4 text-base font-semibold text-foreground line-clamp-1">
                    {language === 'ar' ? branch.nameAr || branch.name : branch.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">{branch.city}</p>
                  <StatusBadge status={branch.status} size="sm" className="mt-3" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>{t('common.noData')}</p>
          </div>
        )}
      </div>

      {/* Unevaluated Branches */}
      {!isLoading && unevaluatedBranches.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-6">
            {language === 'ar' ? 'فروع غير مُقيّمة' : 'Unevaluated Branches'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {unevaluatedBranches.map((branch) => (
              <div
                key={branch.id}
                onClick={() => navigate(`/branches/${branch.id}`)}
                className="bg-muted/30 rounded-xl p-6 cursor-pointer border border-dashed border-border hover:border-primary/50 transition-all"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-28 h-28 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-medium text-muted-foreground">
                      {language === 'ar' ? 'غير مُقيّم' : 'N/A'}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-foreground line-clamp-1">
                    {language === 'ar' ? branch.nameAr || branch.name : branch.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">{branch.city}</p>
                  <span className="mt-3 inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-full bg-muted text-muted-foreground border-border">
                    {language === 'ar' ? 'غير مُقيّم' : 'Unevaluated'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score Legend */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {language === 'ar' ? 'مفتاح الدرجات' : 'Score Legend'}
        </h2>
        <div className="flex flex-wrap gap-4">
          {[
            { label: language === 'ar' ? 'ممتاز (90-100%)' : 'Excellent (90-100%)', status: 'excellent' as const },
            { label: language === 'ar' ? 'جيد (75-89%)' : 'Good (75-89%)', status: 'good' as const },
            { label: language === 'ar' ? 'متوسط (60-74%)' : 'Average (60-74%)', status: 'average' as const },
            { label: language === 'ar' ? 'ضعيف (40-59%)' : 'Weak (40-59%)', status: 'weak' as const },
            { label: language === 'ar' ? 'حرج (0-39%)' : 'Critical (0-39%)', status: 'critical' as const },
          ].map((item) => (
            <div
              key={item.status}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50"
            >
              <div
                className={`w-3 h-3 rounded-full ${
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
              <span className="text-sm text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
