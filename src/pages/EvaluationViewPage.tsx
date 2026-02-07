import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Building2, Calendar, User, ClipboardCheck, Lock, Pencil, Save, X } from 'lucide-react';
import { format, differenceInHours } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface EvaluationData {
  id: string;
  branch_id: string;
  template_id: string;
  assessor_id: string;
  status: string;
  overall_score: number | null;
  overall_percentage: number | null;
  notes: string | null;
  created_at: string;
  submitted_at: string | null;
  branches: { name: string; name_ar: string | null } | null;
  evaluation_templates: { name: string; name_ar: string | null } | null;
}

interface CategoryScore {
  id: string;
  name: string;
  name_ar: string | null;
  sort_order: number;
  weight: number;
  score: number;
  max_score: number;
  percentage: number;
}

interface CriterionScore {
  id: string;
  criterion_id: string;
  score: number;
  notes: string | null;
  criterion: {
    id: string;
    name: string;
    name_ar: string | null;
    max_score: number;
    is_critical: boolean;
    category_id: string;
    sort_order: number;
  };
}

export default function EvaluationViewPage() {
  const { evaluationId } = useParams<{ evaluationId: string }>();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'view';
  const navigate = useNavigate();
  const { t, language, direction } = useLanguage();
  const { user } = useAuth();
  
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [categoryScores, setCategoryScores] = useState<CategoryScore[]>([]);
  const [criterionScores, setCriterionScores] = useState<CriterionScore[]>([]);
  const [assessorName, setAssessorName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(mode === 'edit');
  const [editedScores, setEditedScores] = useState<Record<string, { score: number; notes: string }>>({});
  const [isSaving, setIsSaving] = useState(false);

  const dateLocale = language === 'ar' ? ar : enUS;

  // Check if user can edit
  const canEdit = () => {
    if (!user || !evaluation) return false;
    if (evaluation.assessor_id !== user.id) return false;
    if (evaluation.status === 'draft') return true;
    if (evaluation.submitted_at) {
      const hoursSinceSubmission = differenceInHours(new Date(), new Date(evaluation.submitted_at));
      return hoursSinceSubmission <= 24;
    }
    return false;
  };

  useEffect(() => {
    async function fetchEvaluation() {
      if (!evaluationId) return;

      setIsLoading(true);
      try {
        // Fetch evaluation
        const { data: evalData, error: evalError } = await supabase
          .from('evaluations')
          .select(`
            *,
            branches (name, name_ar),
            evaluation_templates (name, name_ar)
          `)
          .eq('id', evaluationId)
          .maybeSingle();

        if (evalError) throw evalError;
        if (!evalData) {
          toast.error(language === 'ar' ? 'التقييم غير موجود' : 'Evaluation not found');
          navigate('/evaluations/previous');
          return;
        }

        setEvaluation(evalData as EvaluationData);

        // Fetch assessor name
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', evalData.assessor_id)
          .maybeSingle();

        if (profileData) {
          setAssessorName(profileData.full_name);
        }

        // Fetch template categories (used to render the question groups)
        const { data: templateCategories, error: templateCatError } = await supabase
          .from('template_categories')
          .select('id, name, name_ar, sort_order, weight')
          .eq('template_id', evalData.template_id)
          .order('sort_order');

        if (templateCatError) throw templateCatError;

        // Fetch criterion scores
        const { data: critScores, error: critError } = await supabase
          .from('evaluation_criterion_scores')
          .select(`
            *,
            criterion:template_criteria (id, name, name_ar, max_score, is_critical, category_id, sort_order)
          `)
          .eq('evaluation_id', evaluationId);

        if (critError) throw critError;

        const sortedCriteria = (critScores || []).sort((a: any, b: any) =>
          (a.criterion?.sort_order || 0) - (b.criterion?.sort_order || 0)
        ) as CriterionScore[];

        setCriterionScores(sortedCriteria);

        // Compute category scores from criterion scores (evaluation_category_scores are not guaranteed to exist)
        const computedCategories: CategoryScore[] = (templateCategories || []).map((cat: any) => {
          const catCriteria = (critScores || []).filter((cs: any) => cs.criterion?.category_id === cat.id);
          const scoreSum = catCriteria.reduce((sum: number, cs: any) => sum + (Number(cs.score) || 0), 0);
          const maxSum = catCriteria.reduce((sum: number, cs: any) => sum + (Number(cs.criterion?.max_score) || 0), 0);
          const pct = maxSum > 0 ? Math.round((scoreSum / maxSum) * 100) : 0;

          return {
            id: cat.id,
            name: cat.name,
            name_ar: cat.name_ar,
            sort_order: cat.sort_order,
            weight: Number(cat.weight) || 0,
            score: scoreSum,
            max_score: maxSum,
            percentage: pct,
          };
        });

        setCategoryScores(computedCategories);

        // Initialize edited scores
        const initialScores: Record<string, { score: number; notes: string }> = {};
        (critScores || []).forEach((cs: any) => {
          initialScores[cs.criterion_id] = {
            score: cs.score,
            notes: cs.notes || '',
          };
        });
        setEditedScores(initialScores);

      } catch (error) {
        console.error('Error fetching evaluation:', error);
        toast.error(language === 'ar' ? 'خطأ في تحميل التقييم' : 'Error loading evaluation');
      } finally {
        setIsLoading(false);
      }
    }

    fetchEvaluation();
  }, [evaluationId, navigate, language]);

  const handleScoreChange = (criterionId: string, score: number) => {
    setEditedScores(prev => ({
      ...prev,
      [criterionId]: { ...prev[criterionId], score },
    }));
  };

  const handleNotesChange = (criterionId: string, notes: string) => {
    setEditedScores(prev => ({
      ...prev,
      [criterionId]: { ...prev[criterionId], notes },
    }));
  };

  const handleSave = async () => {
    if (!evaluationId) return;
    
    setIsSaving(true);
    try {
      // Update criterion scores
      for (const [criterionId, { score, notes }] of Object.entries(editedScores)) {
        await supabase
          .from('evaluation_criterion_scores')
          .update({ score, notes: notes || null })
          .eq('evaluation_id', evaluationId)
          .eq('criterion_id', criterionId);
      }

      // Recalculate category and overall scores would typically be handled by triggers
      // For now, just show success
      toast.success(language === 'ar' ? 'تم حفظ التغييرات' : 'Changes saved successfully');
      setIsEditing(false);
      
      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error(language === 'ar' ? 'خطأ في الحفظ' : 'Error saving changes');
    } finally {
      setIsSaving(false);
    }
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return 'text-score-excellent';
    if (percentage >= 70) return 'text-score-good';
    if (percentage >= 50) return 'text-score-average';
    if (percentage >= 30) return 'text-score-weak';
    return 'text-score-critical';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {language === 'ar' ? 'التقييم غير موجود' : 'Evaluation not found'}
        </p>
      </div>
    );
  }

  const branchName = language === 'ar' && evaluation.branches?.name_ar 
    ? evaluation.branches.name_ar 
    : evaluation.branches?.name || '';

  const templateName = language === 'ar' && evaluation.evaluation_templates?.name_ar
    ? evaluation.evaluation_templates.name_ar
    : evaluation.evaluation_templates?.name || '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/evaluations/previous')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              {isEditing ? (
                <>
                  <Pencil className="h-5 w-5" />
                  {language === 'ar' ? 'تعديل التقييم' : 'Edit Evaluation'}
                </>
              ) : (
                <>
                  <ClipboardCheck className="h-5 w-5" />
                  {language === 'ar' ? 'عرض التقييم' : 'View Evaluation'}
                </>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">{branchName} - {templateName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit() && !isEditing && (
            <Button onClick={() => setIsEditing(true)} className="gap-2">
              <Pencil className="h-4 w-4" />
              {language === 'ar' ? 'تعديل' : 'Edit'}
            </Button>
          )}
          {isEditing && (
            <>
              <Button 
                variant="outline" 
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                <X className="h-4 w-4 me-2" />
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                <Save className="h-4 w-4" />
                {isSaving 
                  ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') 
                  : (language === 'ar' ? 'حفظ' : 'Save')
                }
              </Button>
            </>
          )}
          {!canEdit() && user?.id !== evaluation.assessor_id && (
            <Badge variant="outline" className="gap-1">
              <Lock className="h-3 w-3" />
              {language === 'ar' ? 'للعرض فقط' : 'View Only'}
            </Badge>
          )}
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الفرع' : 'Branch'}</p>
                <p className="font-medium">{branchName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'المقيّم' : 'Assessor'}</p>
                <p className="font-medium">{assessorName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'التاريخ' : 'Date'}</p>
                <p className="font-medium">
                  {format(new Date(evaluation.created_at), 'MMM d, yyyy', { locale: dateLocale })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ClipboardCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'النتيجة' : 'Score'}</p>
                <p className={`font-bold text-lg ${getScoreColor(evaluation.overall_percentage || 0, 100)}`}>
                  {evaluation.overall_percentage != null ? `${Math.round(evaluation.overall_percentage)}%` : '-'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Scores */}
      <Card>
        <CardHeader>
          <CardTitle>{language === 'ar' ? 'نتائج الفئات' : 'Category Scores'}</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="space-y-2">
            {categoryScores.map((catScore) => {
              const categoryName = language === 'ar' && catScore.name_ar
                ? catScore.name_ar
                : catScore.name;

              const categoryCriteria = criterionScores.filter(
                cs => cs.criterion?.category_id === catScore.id
              );

              return (
                <AccordionItem
                  key={catScore.id}
                  value={catScore.id}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pe-4">
                      <span className="font-medium">{categoryName}</span>
                      <Badge
                        variant="outline"
                        className={getScoreColor(catScore.percentage, 100)}
                      >
                        {Math.round(catScore.percentage)}%
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      {categoryCriteria.map((critScore) => {
                        const criterionName = language === 'ar' && critScore.criterion?.name_ar
                          ? critScore.criterion.name_ar
                          : critScore.criterion?.name || '';
                        
                        const currentScore = isEditing 
                          ? editedScores[critScore.criterion_id]?.score ?? critScore.score
                          : critScore.score;
                        
                        const currentNotes = isEditing
                          ? editedScores[critScore.criterion_id]?.notes ?? critScore.notes ?? ''
                          : critScore.notes;

                        return (
                          <div 
                            key={critScore.id} 
                            className="p-4 bg-muted/50 rounded-lg space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{criterionName}</span>
                                {critScore.criterion?.is_critical && (
                                  <Badge variant="destructive" className="text-xs">
                                    {language === 'ar' ? 'حرج' : 'Critical'}
                                  </Badge>
                                )}
                              </div>
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: critScore.criterion?.max_score || 5 }, (_, i) => i + 1).map((score) => (
                                    <Button
                                      key={score}
                                      variant={currentScore === score ? 'default' : 'outline'}
                                      size="sm"
                                      className="w-8 h-8 p-0"
                                      onClick={() => handleScoreChange(critScore.criterion_id, score)}
                                    >
                                      {score}
                                    </Button>
                                  ))}
                                </div>
                              ) : (
                                <span className={`font-bold ${getScoreColor(critScore.score, critScore.criterion?.max_score || 5)}`}>
                                  {critScore.score} / {critScore.criterion?.max_score || 5}
                                </span>
                              )}
                            </div>
                            {(isEditing || currentNotes) && (
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">
                                  {language === 'ar' ? 'ملاحظات' : 'Notes'}
                                </p>
                                {isEditing ? (
                                  <Textarea
                                    value={currentNotes}
                                    onChange={(e) => handleNotesChange(critScore.criterion_id, e.target.value)}
                                    placeholder={language === 'ar' ? 'أضف ملاحظات...' : 'Add notes...'}
                                    className="min-h-[60px]"
                                  />
                                ) : (
                                  <p className="text-sm bg-background p-2 rounded">
                                    {currentNotes}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      {/* Evaluation Notes */}
      {evaluation.notes && (
        <Card>
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'ملاحظات التقييم' : 'Evaluation Notes'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{evaluation.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
