import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronDown, Camera, MessageSquare, AlertTriangle, Check, Save, ArrowLeft, MapPin, AlertCircle, Eye, Pencil, FileText, Clock, X, Image, CalendarDays, CalendarRange } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getScoreLevel, getScoreCategory, getScoreCategoryColor, ScoreLevel } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useGoBack } from '@/hooks/useGoBack';
import { useBranches } from '@/hooks/useBranches';
import { useTemplateByPeriod } from '@/hooks/useTemplateByPeriod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { differenceInHours } from 'date-fns';

type PeriodType = 'weekly' | 'monthly';

interface Score {
  criterionId: string;
  score: number;
  notes: string;
  attachments?: string[];
}

interface ExistingEvaluation {
  id: string;
  assessor_id: string;
  assessor_name: string;
  created_at: string;
  status: string;
}

export default function EvaluationForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draft');
  const goBack = useGoBack('/evaluations');
  const { t, direction } = useLanguage();
  const { user } = useAuth();
  const { data: branches, isLoading: branchesLoading } = useBranches();
  const [selectedPeriodType, setSelectedPeriodType] = useState<PeriodType | null>(null);
  const { data: templateData, isLoading: templateLoading } = useTemplateByPeriod(selectedPeriodType || 'weekly');
  
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [scores, setScores] = useState<Record<string, Score>>({});
  const [currentNotes, setCurrentNotes] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(draftId);
  const [isLoadingDraft, setIsLoadingDraft] = useState(!!draftId);
  const [evaluationStartTime, setEvaluationStartTime] = useState<Date | null>(null);
  
  // Duplicate evaluation check state
  const [existingEvaluation, setExistingEvaluation] = useState<ExistingEvaluation | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  
  // Image upload state
  const [uploadingCriterionId, setUploadingCriterionId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const selectedBranch = branches?.find(b => b.id === selectedBranchId);

  // Set active template ID when template data loads
  useEffect(() => {
    if (templateData?.id) {
      setActiveTemplateId(templateData.id);
    }
    // Expand first category by default
    if (templateData?.categories?.length && expandedCategories.length === 0) {
      setExpandedCategories([templateData.categories[0].id]);
    }
  }, [templateData]);

  // Load draft evaluation if draftId is provided
  // Load existing evaluation (draft or submitted within 24h)
  useEffect(() => {
    const loadEvaluation = async () => {
      if (!draftId) return;
      
      setIsLoadingDraft(true);
      try {
        // Fetch the evaluation (can be draft OR submitted)
        const { data: evaluation, error } = await supabase
          .from('evaluations')
          .select('*')
          .eq('id', draftId)
          .maybeSingle();
        
        if (error || !evaluation) {
          toast.error(direction === 'rtl' ? 'التقييم غير موجود' : 'Evaluation not found');
          navigate('/evaluations/new');
          return;
        }

        // Check if evaluation can still be edited
        if (evaluation.status === 'draft') {
          // Drafts expire after 5 hours
          const hoursSinceCreation = differenceInHours(new Date(), new Date(evaluation.created_at));
          if (hoursSinceCreation > 5) {
            toast.error(direction === 'rtl' ? 'انتهت صلاحية المسودة' : 'Draft has expired');
            navigate('/evaluations/new');
            return;
          }
        } else if (evaluation.status === 'submitted') {
          // Submitted evaluations can be edited within 24 hours
          if (evaluation.submitted_at) {
            const hoursSinceSubmission = differenceInHours(new Date(), new Date(evaluation.submitted_at));
            if (hoursSinceSubmission > 24) {
              toast.error(direction === 'rtl' ? 'انتهت فترة تعديل التقييم (24 ساعة)' : 'Edit window expired (24 hours)');
              navigate(`/evaluations/${draftId}`);
              return;
            }
          }
        }

        // Set branch ID
        setSelectedBranchId(evaluation.branch_id);
        setActiveTemplateId(evaluation.template_id);
        setCurrentDraftId(evaluation.id);

        // Fetch existing criterion scores for this evaluation
        const { data: criterionScores } = await supabase
          .from('evaluation_criterion_scores')
          .select('criterion_id, score, notes, attachments')
          .eq('evaluation_id', draftId);

        if (criterionScores && criterionScores.length > 0) {
          const loadedScores: Record<string, Score> = {};
          criterionScores.forEach(cs => {
            loadedScores[cs.criterion_id] = {
              criterionId: cs.criterion_id,
              score: cs.score,
              notes: cs.notes || '',
              attachments: cs.attachments || [],
            };
          });
          setScores(loadedScores);
        }

        const statusMsg = evaluation.status === 'draft' 
          ? (direction === 'rtl' ? 'تم تحميل المسودة' : 'Draft loaded successfully')
          : (direction === 'rtl' ? 'تم تحميل التقييم للتعديل' : 'Evaluation loaded for editing');
        toast.success(statusMsg);
      } catch (error) {
        console.error('Error loading evaluation:', error);
        toast.error(direction === 'rtl' ? 'فشل في تحميل التقييم' : 'Failed to load evaluation');
      } finally {
        setIsLoadingDraft(false);
      }
    };

    loadEvaluation();
  }, [draftId, navigate, direction]);

  // Check for existing evaluation when branch is selected
  const checkExistingEvaluation = async (branchId: string) => {
    if (!branchId) return;
    
    setIsCheckingDuplicate(true);
    
    try {
      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
      
      // Check for evaluations of this branch today
      const { data, error } = await supabase
        .from('evaluations')
        .select('id, assessor_id, created_at, status')
        .eq('branch_id', branchId)
        .gte('created_at', startOfDay)
        .lt('created_at', endOfDay)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('Error checking existing evaluation:', error);
        return;
      }
      
      if (data && data.length > 0) {
        const evaluation = data[0];
        
        // Fetch assessor name separately from profiles table
        let assessorName = 'Unknown';
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', evaluation.assessor_id)
          .single();
        
        if (profileData) {
          assessorName = profileData.full_name;
        }
        
        setExistingEvaluation({
          id: evaluation.id,
          assessor_id: evaluation.assessor_id,
          assessor_name: assessorName,
          created_at: evaluation.created_at,
          status: evaluation.status,
        });
        setShowDuplicateDialog(true);
      } else {
        setExistingEvaluation(null);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsCheckingDuplicate(false);
    }
  };

  // Handle branch selection
  const handleBranchSelect = (branchId: string) => {
    setSelectedBranchId(branchId);
    checkExistingEvaluation(branchId);
  };

  // Check if current user can edit the existing evaluation
  const canEditExisting = existingEvaluation && user?.id === existingEvaluation.assessor_id;

  // Handle viewing existing evaluation
  const handleViewExisting = () => {
    setShowDuplicateDialog(false);
    if (existingEvaluation) {
      navigate(`/evaluations/${existingEvaluation.id}`);
    }
  };

  // Handle editing existing evaluation (load as draft to continue editing)
  const handleEditExisting = () => {
    setShowDuplicateDialog(false);
    if (existingEvaluation) {
      // Navigate to the form with the existing evaluation as draft
      navigate(`/evaluations/new?draft=${existingEvaluation.id}`);
    }
  };

  // Handle starting new evaluation anyway (close dialog and clear selection)
  const handleCancelDuplicate = () => {
    setShowDuplicateDialog(false);
    setSelectedBranchId('');
    setExistingEvaluation(null);
  };

  // Get all unanswered criteria
  const getUnansweredCriteria = () => {
    if (!templateData) return [];
    const unanswered: { criterion: typeof templateData.categories[0]['criteria'][0]; category: typeof templateData.categories[0] }[] = [];
    templateData.categories.forEach(category => {
      category.criteria.forEach(criterion => {
        if (scores[criterion.id]?.score === undefined) {
          unanswered.push({ criterion, category });
        }
      });
    });
    return unanswered;
  };

  // Save as Draft function
  const handleSaveAsDraft = async () => {
    if (!selectedBranchId || !user) {
      toast.error(direction === 'rtl' ? 'يرجى اختيار فرع' : 'Please select a branch');
      return;
    }

    if (!activeTemplateId) {
      toast.error(direction === 'rtl' ? 'لا يوجد قالب نشط' : 'No active template available');
      return;
    }

    // Check if at least one score is filled
    const hasScores = Object.keys(scores).some(id => scores[id]?.score !== undefined);
    if (!hasScores) {
      toast.error(direction === 'rtl' ? 'يرجى إدخال درجة واحدة على الأقل للحفظ كمسودة' : 'Please enter at least one score to save as draft');
      return;
    }

    setIsSavingDraft(true);
    try {
      let evaluationId = currentDraftId;

      // If we have an existing draft, update it; otherwise create new
      if (currentDraftId) {
        // Update existing draft's updated_at
        const { error: updateError } = await supabase
          .from('evaluations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', currentDraftId);

        if (updateError) throw updateError;
      } else {
        // Create new evaluation as draft
        const { data: evaluation, error: evalError } = await supabase
          .from('evaluations')
          .insert({
            branch_id: selectedBranchId,
            template_id: activeTemplateId,
            assessor_id: user.id,
            status: 'draft',
            period_type: selectedPeriodType || 'weekly',
          })
          .select()
          .single();

        if (evalError) throw evalError;
        evaluationId = evaluation.id;
        setCurrentDraftId(evaluation.id);
      }

      // Save all criterion scores for this draft
      const scoreEntries = Object.values(scores).filter(s => s.score !== undefined);

      if (scoreEntries.length > 0) {
        // First delete existing scores for this evaluation
        await supabase
          .from('evaluation_criterion_scores')
          .delete()
          .eq('evaluation_id', evaluationId!);

        // Insert all current scores (including attachments)
        const scoresToInsert = scoreEntries.map(s => ({
          evaluation_id: evaluationId!,
          criterion_id: s.criterionId,
          score: s.score,
          notes: s.notes || null,
          attachments: s.attachments || [],
        }));

        const { error: scoresError } = await supabase
          .from('evaluation_criterion_scores')
          .insert(scoresToInsert);

        if (scoresError) {
          console.error('Error saving scores:', scoresError);
          throw scoresError;
        }
      }

      
      toast.success(
        direction === 'rtl' 
          ? 'تم حفظ المسودة بنجاح! لديك 5 ساعات لإكمالها.'
          : 'Draft saved successfully! You have 5 hours to complete it.',
        { duration: 4000 }
      );

      // Reset form
      setSelectedBranchId('');
      setSelectedPeriodType(null);
      setScores({});
      setExpandedCategories(['cat-1']);
      setCurrentNotes(null);
      setCurrentDraftId(null);
      
      // Navigate to previous evaluations
      navigate('/evaluations/previous');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error(direction === 'rtl' ? 'فشل في حفظ المسودة' : 'Failed to save draft');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
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
    setIsSubmitting(true);

    try {
      if (!activeTemplateId) {
        toast.error(direction === 'rtl' ? 'لا يوجد قالب نشط' : 'No active template available');
        return;
      }

      // If we have an existing draft, update it to submitted; otherwise create new
      let evaluationId = currentDraftId;

      if (currentDraftId) {
        const now = new Date();
        const startedAt = evaluationStartTime || now;
        const durationMinutes = Math.round((now.getTime() - startedAt.getTime()) / 60000);
        const { error: updateError } = await supabase
          .from('evaluations')
          .update({
            status: 'submitted',
            submitted_at: now.toISOString(),
            duration_minutes: durationMinutes,
          })
          .eq('id', currentDraftId);

        if (updateError) throw updateError;
      } else {
        // Create evaluation as submitted (need the id to persist answers)
        const now = new Date();
        const startTime = evaluationStartTime || now;
        const durationMinutes = Math.round((now.getTime() - startTime.getTime()) / 60000);
        const { data: evaluation, error: evalError } = await supabase
          .from('evaluations')
          .insert({
            branch_id: selectedBranchId,
            template_id: activeTemplateId,
            assessor_id: user?.id,
            status: 'submitted',
            submitted_at: now.toISOString(),
            started_at: startTime.toISOString(),
            duration_minutes: durationMinutes,
            period_type: selectedPeriodType || 'weekly',
          })
          .select()
          .single();

        if (evalError) throw evalError;
        evaluationId = evaluation.id;
      }

      // Persist all criterion scores for this submitted evaluation
      const scoreEntries = Object.values(scores).filter(s => s.score !== undefined);

      if (evaluationId && scoreEntries.length > 0) {
        // Replace existing scores (if any)
        await supabase
          .from('evaluation_criterion_scores')
          .delete()
          .eq('evaluation_id', evaluationId);

        const scoresToInsert = scoreEntries.map(s => ({
          evaluation_id: evaluationId,
          criterion_id: s.criterionId,
          score: s.score,
          notes: s.notes || null,
          attachments: s.attachments || [],
        }));

        const { error: scoresError } = await supabase
          .from('evaluation_criterion_scores')
          .insert(scoresToInsert);

        if (scoresError) throw scoresError;

        // Calculate and save overall score/percentage
        if (templateData) {
          let totalScore = 0;
          let totalMaxScore = 0;
          templateData.categories.forEach(category => {
            category.criteria.forEach(criterion => {
              const s = scores[criterion.id];
              if (s?.score !== undefined) {
                totalScore += s.score;
                totalMaxScore += criterion.maxScore;
              }
            });
          });
          const overallPercentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
          await supabase
            .from('evaluations')
            .update({
              overall_score: totalScore,
              overall_percentage: Math.round(overallPercentage * 100) / 100,
            })
            .eq('id', evaluationId);

          // Create non_conformities (findings) for criteria scoring 0-3
          const criticalFindings: {
            evaluation_id: string;
            branch_id: string;
            criterion_id: string;
            score: number;
            max_score: number;
            assessor_notes: string | null;
            attachments: string[];
          }[] = [];

          templateData.categories.forEach(category => {
            category.criteria.forEach(criterion => {
              const s = scores[criterion.id];
              if (s?.score !== undefined && s.score <= 3) {
                criticalFindings.push({
                  evaluation_id: evaluationId!,
                  branch_id: selectedBranchId,
                  criterion_id: criterion.id,
                  score: s.score,
                  max_score: criterion.maxScore,
                  assessor_notes: s.notes || null,
                  attachments: s.attachments || [],
                });
              }
            });
          });

          if (criticalFindings.length > 0) {
            // Delete existing findings for this evaluation (in case of re-submission)
            await supabase
              .from('non_conformities')
              .delete()
              .eq('evaluation_id', evaluationId!);

            const { error: findingsError } = await supabase
              .from('non_conformities')
              .insert(criticalFindings);

            if (findingsError) {
              console.error('Error creating findings:', findingsError);
              // Don't throw - evaluation is already saved, findings are secondary
            }
          }
        }
      }

      toast.success(
        direction === 'rtl' 
          ? 'تم إرسال التقييم بنجاح! يمكنك البدء بتقييم جديد.'
          : 'Evaluation submitted successfully! You can start a new evaluation.',
        { duration: 4000 }
      );

      // Reset form to empty state
      setSelectedBranchId('');
      setSelectedPeriodType(null);
      setScores({});
      setExpandedCategories(['cat-1']);
      setCurrentNotes(null);
      setCurrentDraftId(null);
      
      // Navigate to previous evaluations to see the submitted entry
      navigate('/evaluations/previous');
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      toast.error(direction === 'rtl' ? 'فشل في إرسال التقييم' : 'Failed to submit evaluation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear validation error when a score is set
  const setScoreWithValidation = (criterionId: string, score: number) => {
    // Start timer on first score entry
    if (!evaluationStartTime) {
      setEvaluationStartTime(new Date());
    }
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
        attachments: prev[criterionId]?.attachments || [],
      },
    }));
  };

  // Handle image upload for a criterion
  const handleImageUpload = async (criterionId: string, file: File) => {
    if (!user) {
      toast.error(direction === 'rtl' ? 'يجب تسجيل الدخول أولاً' : 'You must be logged in');
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error(direction === 'rtl' ? 'نوع الملف غير مدعوم. استخدم JPEG, PNG, GIF أو WebP' : 'Unsupported file type. Use JPEG, PNG, GIF or WebP');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(direction === 'rtl' ? 'حجم الملف كبير جداً. الحد الأقصى 5 ميغابايت' : 'File too large. Maximum 5MB');
      return;
    }

    setUploadingCriterionId(criterionId);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${criterionId}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('evaluation-attachments')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('evaluation-attachments')
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;

      // Add to attachments
      setScores((prev) => ({
        ...prev,
        [criterionId]: {
          ...prev[criterionId],
          criterionId,
          score: prev[criterionId]?.score || 0,
          notes: prev[criterionId]?.notes || '',
          attachments: [...(prev[criterionId]?.attachments || []), imageUrl],
        },
      }));

      toast.success(direction === 'rtl' ? 'تم رفع الصورة بنجاح' : 'Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(direction === 'rtl' ? 'فشل في رفع الصورة' : 'Failed to upload image');
    } finally {
      setUploadingCriterionId(null);
    }
  };

  // Remove attachment from a criterion
  const removeAttachment = (criterionId: string, attachmentUrl: string) => {
    setScores((prev) => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        criterionId,
        score: prev[criterionId]?.score || 0,
        notes: prev[criterionId]?.notes || '',
        attachments: (prev[criterionId]?.attachments || []).filter(url => url !== attachmentUrl),
      },
    }));
  };

  // Trigger file input click
  const triggerFileInput = (criterionId: string) => {
    fileInputRefs.current[criterionId]?.click();
  };

  const getCategoryProgress = (categoryId: string) => {
    if (!templateData) return { scored: 0, total: 0, percentage: 0 };
    const category = templateData.categories.find((c) => c.id === categoryId);
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
    if (!templateData) return { scored: 0, total: 0 };
    // Get all valid criterion IDs from the current template
    const validCriterionIds = new Set(
      templateData.categories.flatMap(cat => cat.criteria.map(c => c.id))
    );
    const totalCriteria = validCriterionIds.size;
    
    // Only count scores that belong to criteria in the current template
    const scoredCriteria = Object.keys(scores).filter(
      (id) => validCriterionIds.has(id) && scores[id]?.score !== undefined
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
      unrated: 'bg-muted-foreground',
    };
    return colors[status];
  };

  const progress = getOverallProgress();

  // Show loading state when loading a draft or template
  if (isLoadingDraft || (selectedPeriodType && templateLoading)) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">
                {direction === 'rtl' ? 'جاري التحميل...' : 'Loading...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error if period selected but no template found
  if (selectedPeriodType && !templateLoading && !templateData) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="w-12 h-12 text-destructive" />
              <h3 className="text-lg font-medium text-foreground">
                {direction === 'rtl' ? 'لا يوجد قالب تقييم نشط لهذه الفترة' : 'No Active Template for This Period'}
              </h3>
              <p className="text-muted-foreground">
                {direction === 'rtl' 
                  ? 'يرجى الاتصال بالمسؤول لإعداد قالب تقييم'
                  : 'Please contact an administrator to set up an evaluation template'}
              </p>
              <Button variant="outline" onClick={() => setSelectedPeriodType(null)}>
                {direction === 'rtl' ? 'اختيار فترة أخرى' : 'Choose Another Period'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                {currentDraftId 
                  ? (direction === 'rtl' ? 'إكمال التقييم' : 'Continue Evaluation')
                  : (direction === 'rtl' ? 'تقييم جديد' : 'New Evaluation')
                }
              </h1>
              
              {/* Branch Selector */}
              <div className="mt-3">
                <label className="text-sm text-muted-foreground mb-2 block">
                  {direction === 'rtl' ? 'اختر الفرع' : 'Select Branch'}
                </label>
                <Select value={selectedBranchId} onValueChange={handleBranchSelect}>
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
              
              {selectedBranch && selectedPeriodType && templateData && (
                <p className="text-sm text-muted-foreground mt-2">
                  {direction === 'rtl' ? 'القالب:' : 'Template:'} {direction === 'rtl' ? templateData.nameAr : templateData.name}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress.total > 0 ? (progress.scored / progress.total) * 100 : 0}%` }}
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

      {/* Period Type Selector - show after branch is selected */}
      {selectedBranch && !selectedPeriodType && (
        <div className="bg-card rounded-xl border border-border p-8">
          <h3 className="text-lg font-semibold text-foreground text-center mb-2">
            {direction === 'rtl' ? 'اختر نوع التقييم' : 'Select Evaluation Type'}
          </h3>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {direction === 'rtl' ? 'اختر الفترة الزمنية للتقييم' : 'Choose the evaluation period'}
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <button
              onClick={() => {
                setSelectedPeriodType('weekly');
                setScores({});
                setExpandedCategories([]);
              }}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all"
            >
              <CalendarDays className="w-10 h-10 text-primary" />
              <span className="font-semibold text-foreground">
                {direction === 'rtl' ? 'أسبوعي' : 'Weekly'}
              </span>
              <span className="text-xs text-muted-foreground">
                {direction === 'rtl' ? 'تقييم أسبوعي' : 'Weekly Evaluation'}
              </span>
            </button>
            <button
              onClick={() => {
                setSelectedPeriodType('monthly');
                setScores({});
                setExpandedCategories([]);
              }}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all"
            >
              <CalendarRange className="w-10 h-10 text-primary" />
              <span className="font-semibold text-foreground">
                {direction === 'rtl' ? 'شهري' : 'Monthly'}
              </span>
              <span className="text-xs text-muted-foreground">
                {direction === 'rtl' ? 'تقييم شهري' : 'Monthly Evaluation'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Categories - only show when branch is selected, period chosen, and template loaded */}
      {selectedBranch && selectedPeriodType && templateData && (
        <div className="space-y-4">
          {templateData.categories.map((category) => {
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
                                            getScoreCategoryColor(getScoreCategory(score))
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
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => triggerFileInput(criterion.id)}
                                disabled={uploadingCriterionId === criterion.id}
                                className={cn(
                                  (scores[criterion.id]?.attachments?.length ?? 0) > 0 && 'text-primary'
                                )}
                              >
                                {uploadingCriterionId === criterion.id ? (
                                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Camera className="w-4 h-4" />
                                )}
                              </Button>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                className="hidden"
                                ref={(el) => { fileInputRefs.current[criterion.id] = el; }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleImageUpload(criterion.id, file);
                                    e.target.value = ''; // Reset input
                                  }
                                }}
                              />
                            </div>
                          </div>

                          {/* Attachments preview */}
                          {(scores[criterion.id]?.attachments?.length ?? 0) > 0 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-4"
                            >
                              <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                                <Image className="w-4 h-4" />
                                <span>{direction === 'rtl' ? 'المرفقات' : 'Attachments'}</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {scores[criterion.id]?.attachments?.map((url, index) => (
                                  <div key={index} className="relative group">
                                    <img
                                      src={url}
                                      alt={`Attachment ${index + 1}`}
                                      className="w-20 h-20 object-cover rounded-lg border border-border"
                                    />
                                    <button
                                      onClick={() => removeAttachment(criterion.id, url)}
                                      className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}

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

      {/* Sticky Footer with Progress and Submit */}
      {selectedBranch && selectedPeriodType && templateData && (
        <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 -mx-6 mt-6">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            {/* Progress bar */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">
                  {direction === 'rtl' ? 'التقدم' : 'Progress'}
                </p>
                <p className={cn(
                  "text-xl font-bold",
                  progress.scored === progress.total ? "text-score-excellent" : "text-foreground"
                )}>
                  {progress.scored}/{progress.total}
                </p>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(progress.scored / progress.total) * 100}%` }}
                  className={cn(
                    "h-full rounded-full transition-colors",
                    progress.scored === progress.total ? "bg-score-excellent" : "bg-primary"
                  )}
                />
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Save as Draft Button */}
              <Button 
                variant="outline"
                size="lg"
                className="gap-2" 
                disabled={!selectedBranch || isSavingDraft || isSubmitting || progress.scored === 0}
                onClick={handleSaveAsDraft}
              >
                {isSavingDraft ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
                {direction === 'rtl' ? 'حفظ كمسودة' : 'Save Draft'}
              </Button>
              
              {/* Submit Button */}
              <Button 
                size="lg"
                className="gap-2 min-w-[140px]" 
                disabled={!selectedBranch || isSavingDraft || isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {direction === 'rtl' ? 'إرسال' : 'Submit'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Evaluation Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-score-average">
              <AlertTriangle className="w-5 h-5" />
              {direction === 'rtl' ? 'تقييم موجود' : 'Evaluation Exists'}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {direction === 'rtl' 
                ? `هذا الفرع تم تقييمه اليوم بواسطة "${existingEvaluation?.assessor_name}". يمكنك عرض التقييم السابق ${canEditExisting ? 'أو تعديله' : ''}.`
                : `This branch was already evaluated today by "${existingEvaluation?.assessor_name}". You can view the previous evaluation${canEditExisting ? ' or edit it' : ''}.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-4">
            {canEditExisting && (
              <Button onClick={handleEditExisting} className="gap-2 w-full">
                <Pencil className="w-4 h-4" />
                {direction === 'rtl' ? 'تعديل التقييم' : 'Edit Evaluation'}
              </Button>
            )}
            <Button variant="secondary" onClick={handleViewExisting} className="gap-2 w-full">
              <Eye className="w-4 h-4" />
              {direction === 'rtl' ? 'عرض التقييم' : 'View Evaluation'}
            </Button>
            <Button variant="outline" onClick={handleCancelDuplicate} className="w-full">
              {direction === 'rtl' ? 'اختر فرعاً آخر' : 'Choose Another Branch'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
