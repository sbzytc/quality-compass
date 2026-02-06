import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronDown, Camera, MessageSquare, AlertTriangle, Check, Save, ArrowLeft, MapPin, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getScoreLevel, ScoreLevel } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGoBack } from '@/hooks/useGoBack';
import { useBranches } from '@/hooks/useBranches';
import { toast } from 'sonner';

// Mock evaluation template with Arabic translations
const evaluationTemplate = {
  name: 'Restaurant Evaluation v1.0',
  nameAr: 'تقييم المطعم الإصدار 1.0',
  categories: [
    {
      id: 'cat-1',
      name: 'Building Condition',
      nameAr: 'حالة المبنى',
      weight: 10,
      criteria: [
        { id: 'c1-1', name: 'Exterior signage visible and clean', nameAr: 'اللافتات الخارجية مرئية ونظيفة', maxScore: 5, weight: 1, isCritical: false },
        { id: 'c1-2', name: 'Parking area maintained', nameAr: 'صيانة منطقة وقوف السيارات', maxScore: 5, weight: 1, isCritical: false },
        { id: 'c1-3', name: 'Entrance doors functional', nameAr: 'أبواب المدخل تعمل بشكل جيد', maxScore: 5, weight: 1, isCritical: false },
        { id: 'c1-4', name: 'Windows clean and undamaged', nameAr: 'النوافذ نظيفة وغير متضررة', maxScore: 5, weight: 1, isCritical: false },
      ],
    },
    {
      id: 'cat-2',
      name: 'Customer Area',
      nameAr: 'منطقة العملاء',
      weight: 15,
      criteria: [
        { id: 'c2-1', name: 'Floor cleanliness', nameAr: 'نظافة الأرضية', maxScore: 5, weight: 1, isCritical: false },
        { id: 'c2-2', name: 'Tables and chairs clean', nameAr: 'نظافة الطاولات والكراسي', maxScore: 5, weight: 1, isCritical: false },
        { id: 'c2-3', name: 'Lighting adequate', nameAr: 'الإضاءة كافية', maxScore: 5, weight: 1, isCritical: false },
        { id: 'c2-4', name: 'Temperature comfortable', nameAr: 'درجة الحرارة مريحة', maxScore: 5, weight: 1, isCritical: false },
        { id: 'c2-5', name: 'Restrooms clean and stocked', nameAr: 'دورات المياه نظيفة ومجهزة', maxScore: 5, weight: 2, isCritical: true },
      ],
    },
    {
      id: 'cat-3',
      name: 'Food Quality',
      nameAr: 'جودة الطعام',
      weight: 25,
      criteria: [
        { id: 'c3-1', name: 'Food temperature (hot items ≥63°C)', nameAr: 'درجة حرارة الطعام (الأصناف الساخنة ≥63 درجة)', maxScore: 5, weight: 2, isCritical: true },
        { id: 'c3-2', name: 'Food temperature (cold items ≤5°C)', nameAr: 'درجة حرارة الطعام (الأصناف الباردة ≤5 درجة)', maxScore: 5, weight: 2, isCritical: true },
        { id: 'c3-3', name: 'Food presentation', nameAr: 'طريقة تقديم الطعام', maxScore: 5, weight: 1, isCritical: false },
        { id: 'c3-4', name: 'Portion consistency', nameAr: 'ثبات حجم الحصص', maxScore: 5, weight: 1, isCritical: false },
        { id: 'c3-5', name: 'Taste and quality', nameAr: 'المذاق والجودة', maxScore: 5, weight: 2, isCritical: false },
      ],
    },
    {
      id: 'cat-4',
      name: 'Kitchen & Back Area',
      nameAr: 'المطبخ والمنطقة الخلفية',
      weight: 20,
      criteria: [
        { id: 'c4-1', name: 'Equipment cleanliness', nameAr: 'نظافة المعدات', maxScore: 5, weight: 1, isCritical: false },
        { id: 'c4-2', name: 'Food storage organization', nameAr: 'تنظيم تخزين الطعام', maxScore: 5, weight: 1, isCritical: false },
        { id: 'c4-3', name: 'Pest control measures', nameAr: 'إجراءات مكافحة الآفات', maxScore: 5, weight: 2, isCritical: true },
        { id: 'c4-4', name: 'Waste management', nameAr: 'إدارة النفايات', maxScore: 5, weight: 1, isCritical: false },
        { id: 'c4-5', name: 'Staff hygiene practices', nameAr: 'ممارسات النظافة الشخصية للموظفين', maxScore: 5, weight: 2, isCritical: true },
      ],
    },
  ],
};

interface Score {
  criterionId: string;
  score: number;
  notes: string;
}

export default function EvaluationForm() {
  const navigate = useNavigate();
  const goBack = useGoBack('/evaluations');
  const { t, direction } = useLanguage();
  const { data: branches, isLoading: branchesLoading } = useBranches();
  
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['cat-1']);
  const [scores, setScores] = useState<Record<string, Score>>({});
  const [currentNotes, setCurrentNotes] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const selectedBranch = branches?.find(b => b.id === selectedBranchId);

  // Get all unanswered criteria
  const getUnansweredCriteria = () => {
    const unanswered: { criterion: typeof evaluationTemplate.categories[0]['criteria'][0]; category: typeof evaluationTemplate.categories[0] }[] = [];
    evaluationTemplate.categories.forEach(category => {
      category.criteria.forEach(criterion => {
        if (scores[criterion.id]?.score === undefined) {
          unanswered.push({ criterion, category });
        }
      });
    });
    return unanswered;
  };

  const handleSubmit = () => {
    const unanswered = getUnansweredCriteria();
    
    if (unanswered.length > 0) {
      // Set validation errors
      setValidationErrors(unanswered.map(u => u.criterion.id));
      
      // Expand the category with the first unanswered question
      const firstUnansweredCategory = unanswered[0].category.id;
      if (!expandedCategories.includes(firstUnansweredCategory)) {
        setExpandedCategories(prev => [...prev, firstUnansweredCategory]);
      }
      
      // Show toast with the first missing question
      const firstMissing = unanswered[0];
      const criterionName = direction === 'rtl' ? firstMissing.criterion.nameAr : firstMissing.criterion.name;
      const categoryName = direction === 'rtl' ? firstMissing.category.nameAr : firstMissing.category.name;
      
      toast.error(
        direction === 'rtl' 
          ? `يرجى الإجابة على جميع الأسئلة. السؤال المفقود: "${criterionName}" في "${categoryName}"`
          : `Please answer all questions. Missing: "${criterionName}" in "${categoryName}"`,
        { duration: 5000 }
      );
      return;
    }
    
    // Clear validation errors and proceed with submission
    setValidationErrors([]);
    toast.success(direction === 'rtl' ? 'تم إرسال التقييم بنجاح' : 'Evaluation submitted successfully');
  };

  // Clear validation error when a score is set
  const setScoreWithValidation = (criterionId: string, score: number) => {
    setScores((prev) => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        criterionId,
        score,
        notes: prev[criterionId]?.notes || '',
      },
    }));
    // Remove from validation errors if present
    setValidationErrors(prev => prev.filter(id => id !== criterionId));
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };


  const setNotes = (criterionId: string, notes: string) => {
    setScores((prev) => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        criterionId,
        score: prev[criterionId]?.score || 0,
        notes,
      },
    }));
  };

  const getCategoryProgress = (categoryId: string) => {
    const category = evaluationTemplate.categories.find((c) => c.id === categoryId);
    if (!category) return { scored: 0, total: 0, percentage: 0 };

    const scored = category.criteria.filter((c) => scores[c.id]?.score !== undefined).length;
    const total = category.criteria.length;

    if (scored === 0) return { scored, total, percentage: 0 };

    const totalScore = category.criteria.reduce((sum, c) => sum + (scores[c.id]?.score || 0), 0);
    const maxScore = category.criteria.reduce((sum, c) => sum + c.maxScore, 0);
    const percentage = Math.round((totalScore / maxScore) * 100);

    return { scored, total, percentage };
  };

  const getOverallProgress = () => {
    const totalCriteria = evaluationTemplate.categories.reduce(
      (sum, cat) => sum + cat.criteria.length,
      0
    );
    const scoredCriteria = Object.keys(scores).filter(
      (id) => scores[id]?.score !== undefined
    ).length;
    return { scored: scoredCriteria, total: totalCriteria };
  };

  const getStatusColor = (status: ScoreLevel): string => {
    const colors: Record<ScoreLevel, string> = {
      excellent: 'bg-score-excellent',
      good: 'bg-score-good',
      average: 'bg-score-average',
      weak: 'bg-score-weak',
      critical: 'bg-score-critical',
    };
    return colors[status];
  };

  const progress = getOverallProgress();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={goBack}
              className="mt-1"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">
                {direction === 'rtl' ? 'تقييم جديد' : 'New Evaluation'}
              </h1>
              
              {/* Branch Selector */}
              <div className="mt-3">
                <label className="text-sm text-muted-foreground mb-2 block">
                  {direction === 'rtl' ? 'اختر الفرع' : 'Select Branch'}
                </label>
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                  <SelectTrigger className="w-full md:w-[300px]">
                    <MapPin className="w-4 h-4 me-2 text-muted-foreground" />
                    <SelectValue placeholder={direction === 'rtl' ? 'اختر الفرع للتقييم...' : 'Choose branch to evaluate...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {branchesLoading ? (
                      <SelectItem value="loading" disabled>
                        {direction === 'rtl' ? 'جاري التحميل...' : 'Loading...'}
                      </SelectItem>
                    ) : branches && branches.length > 0 ? (
                      branches.filter(b => b.isActive).map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name} • {branch.city || 'N/A'}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        {direction === 'rtl' ? 'لا توجد فروع' : 'No branches available'}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedBranch && (
                <p className="text-sm text-muted-foreground mt-2">
                  {direction === 'rtl' ? 'القالب:' : 'Template:'} {direction === 'rtl' ? evaluationTemplate.nameAr : evaluationTemplate.name}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Progress indicator */}
            <div className="text-end">
              <p className="text-sm text-muted-foreground">{direction === 'rtl' ? 'التقدم' : 'Progress'}</p>
              <p className={cn(
                "text-2xl font-bold",
                progress.scored === progress.total ? "text-score-excellent" : "text-foreground"
              )}>
                {progress.scored}/{progress.total}
              </p>
            </div>
            <Button 
              className="gap-2" 
              disabled={!selectedBranch}
              onClick={handleSubmit}
            >
              <Save className="w-4 h-4" />
              {direction === 'rtl' ? 'إرسال' : 'Submit'}
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(progress.scored / progress.total) * 100}%` }}
            className="h-full bg-primary rounded-full"
          />
        </div>
      </div>

      {/* Show message if no branch selected */}
      {!selectedBranch && (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <MapPin className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {direction === 'rtl' ? 'اختر فرعاً للبدء' : 'Select a Branch to Start'}
          </h3>
          <p className="text-muted-foreground">
            {direction === 'rtl' 
              ? 'اختر الفرع الذي تريد تقييمه من القائمة أعلاه'
              : 'Choose the branch you want to evaluate from the dropdown above'}
          </p>
        </div>
      )}

      {/* Categories - only show when branch is selected */}
      {selectedBranch && (
        <div className="space-y-4">
          {evaluationTemplate.categories.map((category) => {
            const isExpanded = expandedCategories.includes(category.id);
            const catProgress = getCategoryProgress(category.id);
            const catStatus = catProgress.percentage > 0 ? getScoreLevel(catProgress.percentage) : null;

            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl border border-border overflow-hidden"
              >
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div className={cn("text-start", direction === 'rtl' && 'text-right')}>
                      <h3 className="font-semibold text-foreground">
                        {direction === 'rtl' ? category.nameAr : category.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {catProgress.scored}/{catProgress.total} {direction === 'rtl' ? 'معيار تم تقييمه' : 'criteria scored'} •{' '}
                        {direction === 'rtl' ? 'الوزن:' : 'Weight:'} {category.weight}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {catStatus && (
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold',
                          getStatusColor(catStatus)
                        )}
                      >
                        {catProgress.percentage}%
                      </div>
                    )}
                    {catProgress.scored === catProgress.total && (
                      <Check className="w-5 h-5 text-score-excellent" />
                    )}
                  </div>
                </button>

                {/* Criteria */}
                {isExpanded && (
                  <div className="border-t border-border divide-y divide-border">
                    {category.criteria.map((criterion) => {
                      const currentScore = scores[criterion.id]?.score;
                      const showNotesInput = currentNotes === criterion.id;
                      const hasValidationError = validationErrors.includes(criterion.id);

                      return (
                        <div 
                          key={criterion.id} 
                          className={cn(
                            "p-4 transition-colors",
                            hasValidationError && "bg-destructive/5 border-s-4 border-destructive"
                          )}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {hasValidationError && (
                                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                                )}
                                <span className={cn(
                                  "font-medium",
                                  hasValidationError ? "text-destructive" : "text-foreground"
                                )}>
                                  {direction === 'rtl' ? criterion.nameAr : criterion.name}
                                </span>
                                {criterion.isCritical && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-score-critical/10 text-score-critical rounded-full">
                                    {direction === 'rtl' ? 'حرج' : 'Critical'}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {direction === 'rtl' ? 'أقصى درجة:' : 'Max score:'} {criterion.maxScore} • {direction === 'rtl' ? 'الوزن:' : 'Weight:'} {criterion.weight}x
                              </p>
                            </div>

                            {/* Score buttons */}
                            <div className="flex items-center gap-2">
                              {[0, 1, 2, 3, 4, 5].map((score) => (
                                <button
                                  key={score}
                                  onClick={() => setScoreWithValidation(criterion.id, score)}
                                  className={cn(
                                    'w-10 h-10 rounded-lg font-medium transition-all',
                                    currentScore === score
                                      ? cn(
                                          'text-white',
                                          getStatusColor(getScoreLevel((score / 5) * 100))
                                        )
                                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                  )}
                                >
                                  {score}
                                </button>
                              ))}
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  setCurrentNotes(showNotesInput ? null : criterion.id)
                                }
                                className={cn(
                                  scores[criterion.id]?.notes && 'text-primary'
                                )}
                              >
                                <MessageSquare className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <Camera className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Notes input */}
                          {showNotesInput && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-4"
                            >
                              <Textarea
                                placeholder={direction === 'rtl' ? 'أضف ملاحظات حول هذا المعيار...' : 'Add notes about this criterion...'}
                                value={scores[criterion.id]?.notes || ''}
                                onChange={(e) => setNotes(criterion.id, e.target.value)}
                                className="min-h-[80px]"
                              />
                            </motion.div>
                          )}

                          {/* Warning for low critical scores */}
                          {criterion.isCritical && currentScore !== undefined && currentScore < 3 && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-score-critical/10 text-score-critical"
                            >
                              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                              <p className="text-sm">
                                {direction === 'rtl' 
                                  ? 'هذا معيار حرج. الدرجة المنخفضة ستحد من التقييم العام.'
                                  : 'This is a critical criterion. A low score will cap the overall rating.'}
                              </p>
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
