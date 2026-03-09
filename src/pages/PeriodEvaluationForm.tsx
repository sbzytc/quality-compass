import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronDown, Camera, MessageSquare, AlertTriangle, Check, Save, ArrowLeft, MapPin, AlertCircle, X, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getScoreLevel, getScoreCategory, getScoreCategoryColor, ScoreLevel } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBranches } from '@/hooks/useBranches';
import { useTemplateByPeriod } from '@/hooks/useTemplateByPeriod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface Score {
  criterionId: string;
  score: number;
  notes: string;
  attachments?: string[];
}

type PeriodType = 'weekly' | 'monthly';

export default function PeriodEvaluationForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const periodType = (searchParams.get('period') || 'weekly') as PeriodType;
  const { direction, language } = useLanguage();
  const { user } = useAuth();
  const { data: branches, isLoading: branchesLoading } = useBranches();
  const { data: templateData, isLoading: templateLoading } = useTemplateByPeriod(periodType);
  const isAr = language === 'ar';

  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [scores, setScores] = useState<Record<string, Score>>({});
  const [currentNotes, setCurrentNotes] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [uploadingCriterionId, setUploadingCriterionId] = useState<string | null>(null);
  const [evaluationStartTime, setEvaluationStartTime] = useState<Date | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const selectedBranch = branches?.find(b => b.id === selectedBranchId);
  const periodLabels = {
    weekly: { en: 'Weekly Evaluation', ar: 'التقييم الأسبوعي' },
    monthly: { en: 'Monthly Evaluation', ar: 'التقييم الشهري' },
  };

  useEffect(() => {
    if (templateData?.categories?.length && expandedCategories.length === 0) {
      setExpandedCategories(templateData.categories.map(c => c.id));
    }
  }, [templateData]);

  const getUnansweredCriteria = () => {
    if (!templateData) return [];
    const unanswered: any[] = [];
    templateData.categories.forEach(category => {
      category.criteria.forEach(criterion => {
        if (scores[criterion.id]?.score === undefined) {
          unanswered.push({ criterion, category });
        }
      });
    });
    return unanswered;
  };

  const handleSubmit = async () => {
    const unanswered = getUnansweredCriteria();
    if (unanswered.length > 0) {
      setValidationErrors(unanswered.map(u => u.criterion.id));
      toast.error(isAr ? 'يرجى الإجابة على جميع الأسئلة' : 'Please answer all questions');
      return;
    }

    setValidationErrors([]);
    setIsSubmitting(true);

    try {
      if (!templateData?.id || !selectedBranchId || !user) return;

      const { data: evaluation, error: evalError } = await supabase
        .from('evaluations')
        .insert({
          branch_id: selectedBranchId,
          template_id: templateData.id,
          assessor_id: user.id,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          period_type: periodType,
        })
        .select()
        .single();

      if (evalError) throw evalError;

      const scoreEntries = Object.values(scores).filter(s => s.score !== undefined);
      if (scoreEntries.length > 0) {
        const scoresToInsert = scoreEntries.map(s => ({
          evaluation_id: evaluation.id,
          criterion_id: s.criterionId,
          score: s.score,
          notes: s.notes || null,
          attachments: s.attachments || [],
        }));

        const { error: scoresError } = await supabase
          .from('evaluation_criterion_scores')
          .insert(scoresToInsert);
        if (scoresError) throw scoresError;

        // Calculate overall
        let totalScore = 0, totalMaxScore = 0;
        templateData.categories.forEach(cat => {
          cat.criteria.forEach(cr => {
            const s = scores[cr.id];
            if (s?.score !== undefined) {
              totalScore += s.score;
              totalMaxScore += cr.maxScore;
            }
          });
        });
        const pct = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
        await supabase.from('evaluations').update({
          overall_score: totalScore,
          overall_percentage: Math.round(pct * 100) / 100,
        }).eq('id', evaluation.id);

        // Save category scores
        const catScores = templateData.categories.map(cat => {
          let catScore = 0, catMax = 0;
          cat.criteria.forEach(cr => {
            const s = scores[cr.id];
            if (s?.score !== undefined) { catScore += s.score; catMax += cr.maxScore; }
          });
          return {
            evaluation_id: evaluation.id,
            category_id: cat.id,
            score: catScore,
            max_score: catMax,
            percentage: catMax > 0 ? Math.round((catScore / catMax) * 100 * 100) / 100 : 0,
          };
        });
        await supabase.from('evaluation_category_scores').insert(catScores);

        // Create non-conformities for scores <= 3
        const findings: any[] = [];
        templateData.categories.forEach(cat => {
          cat.criteria.forEach(cr => {
            const s = scores[cr.id];
            if (s?.score !== undefined && s.score <= 3) {
              findings.push({
                evaluation_id: evaluation.id,
                branch_id: selectedBranchId,
                criterion_id: cr.id,
                score: s.score,
                max_score: cr.maxScore,
                assessor_notes: s.notes || null,
                attachments: s.attachments || [],
              });
            }
          });
        });
        if (findings.length > 0) {
          await supabase.from('non_conformities').insert(findings);
        }
      }

      toast.success(isAr ? 'تم إرسال التقييم بنجاح!' : 'Evaluation submitted successfully!');
      setSelectedBranchId('');
      setScores({});
      navigate('/evaluations/previous');
    } catch (error) {
      console.error('Error submitting:', error);
      toast.error(isAr ? 'فشل في إرسال التقييم' : 'Failed to submit evaluation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setScoreWithValidation = (criterionId: string, score: number) => {
    setScores(prev => ({
      ...prev,
      [criterionId]: { ...prev[criterionId], criterionId, score, notes: prev[criterionId]?.notes || '' },
    }));
    setValidationErrors(prev => prev.filter(id => id !== criterionId));
  };

  const setNotes = (criterionId: string, notes: string) => {
    setScores(prev => ({
      ...prev,
      [criterionId]: { ...prev[criterionId], criterionId, score: prev[criterionId]?.score || 0, notes, attachments: prev[criterionId]?.attachments || [] },
    }));
  };

  const handleImageUpload = async (criterionId: string, file: File) => {
    if (!user) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) { toast.error(isAr ? 'نوع ملف غير مدعوم' : 'Unsupported file type'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error(isAr ? 'حجم كبير جداً' : 'File too large'); return; }
    setUploadingCriterionId(criterionId);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${user.id}/${criterionId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('evaluation-attachments').upload(fileName, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('evaluation-attachments').getPublicUrl(fileName);
      setScores(prev => ({
        ...prev,
        [criterionId]: { ...prev[criterionId], criterionId, score: prev[criterionId]?.score || 0, notes: prev[criterionId]?.notes || '', attachments: [...(prev[criterionId]?.attachments || []), urlData.publicUrl] },
      }));
      toast.success(isAr ? 'تم رفع الصورة' : 'Image uploaded');
    } catch { toast.error(isAr ? 'فشل الرفع' : 'Upload failed'); }
    finally { setUploadingCriterionId(null); }
  };

  const removeAttachment = (criterionId: string, url: string) => {
    setScores(prev => ({
      ...prev,
      [criterionId]: { ...prev[criterionId], criterionId, score: prev[criterionId]?.score || 0, notes: prev[criterionId]?.notes || '', attachments: (prev[criterionId]?.attachments || []).filter(u => u !== url) },
    }));
  };

  const getCategoryProgress = (categoryId: string) => {
    if (!templateData) return { scored: 0, total: 0, percentage: 0 };
    const cat = templateData.categories.find(c => c.id === categoryId);
    if (!cat) return { scored: 0, total: 0, percentage: 0 };
    const scored = cat.criteria.filter(c => scores[c.id]?.score !== undefined).length;
    const total = cat.criteria.length;
    if (scored === 0) return { scored, total, percentage: 0 };
    const totalScore = cat.criteria.reduce((sum, c) => sum + (scores[c.id]?.score || 0), 0);
    const maxScore = cat.criteria.reduce((sum, c) => sum + c.maxScore, 0);
    return { scored, total, percentage: Math.round((totalScore / maxScore) * 100) };
  };

  const getOverallProgress = () => {
    if (!templateData) return { scored: 0, total: 0 };
    const ids = new Set(templateData.categories.flatMap(c => c.criteria.map(cr => cr.id)));
    const scored = Object.keys(scores).filter(id => ids.has(id) && scores[id]?.score !== undefined).length;
    return { scored, total: ids.size };
  };

  const getStatusColor = (status: ScoreLevel): string => {
    const colors: Record<ScoreLevel, string> = { excellent: 'bg-score-excellent', good: 'bg-score-good', average: 'bg-score-average', weak: 'bg-score-weak', critical: 'bg-score-critical', unrated: 'bg-muted-foreground' };
    return colors[status];
  };

  const progress = getOverallProgress();

  if (templateLoading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
      </div>
    );
  }

  if (!templateData) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-medium">{isAr ? 'لا يوجد قالب نشط' : 'No active template found'}</h3>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>{isAr ? 'رجوع' : 'Go Back'}</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="mt-1">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">
                {isAr ? periodLabels[periodType].ar : periodLabels[periodType].en}
              </h1>
              <Badge variant={periodType === 'weekly' ? 'default' : 'secondary'}>
                {periodType === 'weekly' ? (isAr ? 'أسبوعي' : 'Weekly') : (isAr ? 'شهري' : 'Monthly')}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {isAr ? templateData.nameAr : templateData.name} • {templateData.categories.length} {isAr ? 'فئات' : 'categories'}, {templateData.categories.reduce((s, c) => s + c.criteria.length, 0)} {isAr ? 'معيار' : 'criteria'}
            </p>

            <div className="mt-3">
              <label className="text-sm text-muted-foreground mb-2 block">{isAr ? 'اختر الفرع' : 'Select Branch'}</label>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger className="w-full md:w-[300px]">
                  <MapPin className="w-4 h-4 me-2 text-muted-foreground" />
                  <SelectValue placeholder={isAr ? 'اختر الفرع...' : 'Choose branch...'} />
                </SelectTrigger>
                <SelectContent>
                  {branches?.filter(b => b.isActive).map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name} • {b.city || 'N/A'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${progress.total > 0 ? (progress.scored / progress.total) * 100 : 0}%` }} className="h-full bg-primary rounded-full" />
        </div>
      </div>

      {!selectedBranch && (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <MapPin className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">{isAr ? 'اختر فرعاً للبدء' : 'Select a Branch to Start'}</h3>
        </div>
      )}

      {selectedBranch && templateData && (
        <div className="space-y-4">
          {templateData.categories.map(category => {
            const isExpanded = expandedCategories.includes(category.id);
            const catProg = getCategoryProgress(category.id);
            const catStatus = catProg.percentage > 0 ? getScoreLevel(catProg.percentage) : null;

            return (
              <motion.div key={category.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border overflow-hidden">
                <button onClick={() => setExpandedCategories(prev => prev.includes(category.id) ? prev.filter(id => id !== category.id) : [...prev, category.id])} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                    <div className={cn("text-start", direction === 'rtl' && 'text-right')}>
                      <h3 className="font-semibold text-foreground">{isAr ? category.nameAr : category.name}</h3>
                      <p className="text-sm text-muted-foreground">{catProg.scored}/{catProg.total} {isAr ? 'تم تقييمه' : 'scored'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {catStatus && <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold', getStatusColor(catStatus))}>{catProg.percentage}%</div>}
                    {catProg.scored === catProg.total && catProg.total > 0 && <Check className="w-5 h-5 text-score-excellent" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border divide-y divide-border">
                    {category.criteria.map(criterion => {
                      const currentScore = scores[criterion.id]?.score;
                      const showNotes = currentNotes === criterion.id;
                      const hasError = validationErrors.includes(criterion.id);

                      return (
                        <div key={criterion.id} className={cn("p-4", hasError && "bg-destructive/5 border-s-4 border-destructive")}>
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {hasError && <AlertCircle className="w-4 h-4 text-destructive" />}
                                <span className={cn("font-medium", hasError ? "text-destructive" : "text-foreground")}>
                                  {isAr ? criterion.nameAr : criterion.name}
                                </span>
                                {criterion.isCritical && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-score-critical/10 text-score-critical rounded-full">{isAr ? 'حرج' : 'Critical'}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {[0, 1, 2, 3, 4, 5].map(score => (
                                <button key={score} onClick={() => setScoreWithValidation(criterion.id, score)}
                                  className={cn('w-10 h-10 rounded-lg font-medium transition-all',
                                    currentScore === score ? cn('text-white', getScoreCategoryColor(getScoreCategory(score))) : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                  )}>
                                  {score}
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" onClick={() => setCurrentNotes(showNotes ? null : criterion.id)} className={cn(scores[criterion.id]?.notes && 'text-primary')}>
                                <MessageSquare className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => fileInputRefs.current[criterion.id]?.click()} disabled={uploadingCriterionId === criterion.id} className={cn((scores[criterion.id]?.attachments?.length ?? 0) > 0 && 'text-primary')}>
                                {uploadingCriterionId === criterion.id ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Camera className="w-4 h-4" />}
                              </Button>
                              <input type="file" accept="image/*" className="hidden" ref={el => { fileInputRefs.current[criterion.id] = el; }} onChange={e => { const f = e.target.files?.[0]; if (f) { handleImageUpload(criterion.id, f); e.target.value = ''; } }} />
                            </div>
                          </div>

                          {(scores[criterion.id]?.attachments?.length ?? 0) > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {scores[criterion.id]?.attachments?.map((url, i) => (
                                <div key={i} className="relative group">
                                  <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-border" />
                                  <button onClick={() => removeAttachment(criterion.id, url)} className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {showNotes && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
                              <Textarea placeholder={isAr ? 'أضف ملاحظات...' : 'Add notes...'} value={scores[criterion.id]?.notes || ''} onChange={e => setNotes(criterion.id, e.target.value)} className="min-h-[80px]" />
                            </motion.div>
                          )}

                          {criterion.isCritical && currentScore !== undefined && currentScore < 3 && (
                            <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-score-critical/10 text-score-critical">
                              <AlertTriangle className="w-4 h-4" />
                              <span className="text-sm font-medium">{isAr ? 'معيار حرج - درجة منخفضة!' : 'Critical criterion - Low score!'}</span>
                            </div>
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

      {/* Sticky Footer */}
      {selectedBranch && (
        <div className="sticky bottom-0 bg-card border-t border-border p-4 rounded-t-xl shadow-lg -mx-4 px-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <span className="text-xl font-bold text-foreground">{progress.scored}</span>
              <span className="text-muted-foreground">/{progress.total}</span>
              <span className="text-sm text-muted-foreground ms-2">{isAr ? 'تم الإجابة' : 'answered'}</span>
            </div>
            <Button onClick={handleSubmit} disabled={isSubmitting} size="lg" className="bg-primary text-primary-foreground">
              {isSubmitting ? (isAr ? 'جاري الإرسال...' : 'Submitting...') : (isAr ? 'إرسال التقييم' : 'Submit Evaluation')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
