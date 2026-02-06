import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronDown, Camera, MessageSquare, AlertTriangle, Check, Save, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { getScoreLevel, ScoreLevel } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGoBack } from '@/hooks/useGoBack';

// Mock evaluation template
const evaluationTemplate = {
  name: 'Restaurant Evaluation v1.0',
  categories: [
    {
      id: 'cat-1',
      name: 'Building Condition',
      weight: 10,
      criteria: [
        { id: 'c1-1', name: 'Exterior signage visible and clean', maxScore: 5, weight: 1, isCritical: false },
        { id: 'c1-2', name: 'Parking area maintained', maxScore: 5, weight: 1, isCritical: false },
        { id: 'c1-3', name: 'Entrance doors functional', maxScore: 5, weight: 1, isCritical: false },
        { id: 'c1-4', name: 'Windows clean and undamaged', maxScore: 5, weight: 1, isCritical: false },
      ],
    },
    {
      id: 'cat-2',
      name: 'Customer Area',
      weight: 15,
      criteria: [
        { id: 'c2-1', name: 'Floor cleanliness', maxScore: 5, weight: 1, isCritical: false },
        { id: 'c2-2', name: 'Tables and chairs clean', maxScore: 5, weight: 1, isCritical: false },
        { id: 'c2-3', name: 'Lighting adequate', maxScore: 5, weight: 1, isCritical: false },
        { id: 'c2-4', name: 'Temperature comfortable', maxScore: 5, weight: 1, isCritical: false },
        { id: 'c2-5', name: 'Restrooms clean and stocked', maxScore: 5, weight: 2, isCritical: true },
      ],
    },
    {
      id: 'cat-3',
      name: 'Food Quality',
      weight: 25,
      criteria: [
        { id: 'c3-1', name: 'Food temperature (hot items ≥63°C)', maxScore: 5, weight: 2, isCritical: true },
        { id: 'c3-2', name: 'Food temperature (cold items ≤5°C)', maxScore: 5, weight: 2, isCritical: true },
        { id: 'c3-3', name: 'Food presentation', maxScore: 5, weight: 1, isCritical: false },
        { id: 'c3-4', name: 'Portion consistency', maxScore: 5, weight: 1, isCritical: false },
        { id: 'c3-5', name: 'Taste and quality', maxScore: 5, weight: 2, isCritical: false },
      ],
    },
    {
      id: 'cat-4',
      name: 'Kitchen & Back Area',
      weight: 20,
      criteria: [
        { id: 'c4-1', name: 'Equipment cleanliness', maxScore: 5, weight: 1, isCritical: false },
        { id: 'c4-2', name: 'Food storage organization', maxScore: 5, weight: 1, isCritical: false },
        { id: 'c4-3', name: 'Pest control measures', maxScore: 5, weight: 2, isCritical: true },
        { id: 'c4-4', name: 'Waste management', maxScore: 5, weight: 1, isCritical: false },
        { id: 'c4-5', name: 'Staff hygiene practices', maxScore: 5, weight: 2, isCritical: true },
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
  const goBack = useGoBack('/dashboard/auditor');
  const { t, direction } = useLanguage();
  const [selectedBranch] = useState({ id: '1', name: 'Downtown Central', city: 'Riyadh' });
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['cat-1']);
  const [scores, setScores] = useState<Record<string, Score>>({});
  const [currentNotes, setCurrentNotes] = useState<string | null>(null);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const setScore = (criterionId: string, score: number) => {
    setScores((prev) => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        criterionId,
        score,
        notes: prev[criterionId]?.notes || '',
      },
    }));
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
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {direction === 'rtl' ? 'تقييم جديد' : 'New Evaluation'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {selectedBranch.name} • {selectedBranch.city}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {direction === 'rtl' ? 'القالب:' : 'Template:'} {evaluationTemplate.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-2xl font-bold text-foreground">
                {progress.scored}/{progress.total}
              </p>
            </div>
            <Button className="gap-2">
              <Save className="w-4 h-4" />
              Submit
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

      {/* Categories */}
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
                  <div className="text-left">
                    <h3 className="font-semibold text-foreground">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {catProgress.scored}/{catProgress.total} criteria scored •{' '}
                      Weight: {category.weight}%
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

                    return (
                      <div key={criterion.id} className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">
                                {criterion.name}
                              </span>
                              {criterion.isCritical && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-score-critical/10 text-score-critical rounded-full">
                                  Critical
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Max score: {criterion.maxScore} • Weight: {criterion.weight}x
                            </p>
                          </div>

                          {/* Score buttons */}
                          <div className="flex items-center gap-2">
                            {[0, 1, 2, 3, 4, 5].map((score) => (
                              <button
                                key={score}
                                onClick={() => setScore(criterion.id, score)}
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
                              placeholder="Add notes about this criterion..."
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
                              This is a critical criterion. A low score will cap the overall
                              rating.
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
    </div>
  );
}
