// SQCS Core Types

export type ScoreLevel = 'excellent' | 'good' | 'average' | 'weak' | 'critical';

// New 4-category scoring for individual criterion scores (0-5)
export type ScoreCategory = 'excellent' | 'good' | 'medium' | 'bad';

export interface Branch {
  id: string;
  name: string;
  nameAr?: string;
  region: string;
  city: string;
  overallScore: number;
  lastEvaluationDate: string;
  categoryScores: CategoryScore[];
  status: ScoreLevel;
}

export interface CategoryScore {
  id: string;
  name: string;
  nameAr?: string;
  score: number;
  maxScore: number;
  percentage: number;
  status: ScoreLevel;
  criteriaCount: number;
  failedCriteria: number;
}

export interface Criterion {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  categoryId: string;
  score: number;
  maxScore: number;
  weight: number;
  isCritical: boolean;
  notes?: string;
  attachments?: string[];
}

export interface NonConformity {
  id: string;
  criterionId: string;
  criterionName: string;
  categoryName: string;
  branchId: string;
  branchName: string;
  evaluationId: string;
  score: number;
  maxScore: number;
  assessorNotes: string;
  attachments: string[];
  createdAt: string;
  status: 'open' | 'in_progress' | 'resolved';
}

export interface CorrectiveAction {
  id: string;
  nonConformityId: string;
  description: string;
  owner: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  evidence?: string[];
  createdAt: string;
  completedAt?: string;
}

export interface Evaluation {
  id: string;
  branchId: string;
  branchName: string;
  assessorId: string;
  assessorName: string;
  templateId: string;
  templateVersion: string;
  overallScore: number;
  categoryScores: CategoryScore[];
  createdAt: string;
  submittedAt?: string;
  status: 'draft' | 'submitted' | 'approved';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'assessor' | 'branch_manager' | 'executive' | 'admin';
  branchId?: string;
  regionId?: string;
  organizationId: string;
  avatar?: string;
}

export interface EvaluationTemplate {
  id: string;
  name: string;
  version: string;
  categories: EvaluationCategory[];
  isActive: boolean;
  createdAt: string;
}

export interface EvaluationCategory {
  id: string;
  name: string;
  nameAr?: string;
  weight: number;
  criteria: EvaluationCriterion[];
}

export interface EvaluationCriterion {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  maxScore: number;
  weight: number;
  isCritical: boolean;
}

// Helper function to determine score level (percentage-based, for overall scores)
export function getScoreLevel(percentage: number): ScoreLevel {
  if (percentage >= 90) return 'excellent';
  if (percentage >= 80) return 'good';
  if (percentage >= 70) return 'average';
  if (percentage >= 60) return 'weak';
  return 'critical';
}

// Helper function to determine score category (criterion score 0-5)
export function getScoreCategory(score: number): ScoreCategory {
  if (score === 5) return 'excellent';
  if (score === 4) return 'good';
  if (score === 3) return 'medium';
  return 'bad'; // 0, 1, 2
}

// Map ScoreCategory to existing CSS color tokens
export function getScoreCategoryColor(category: ScoreCategory): string {
  const colors: Record<ScoreCategory, string> = {
    excellent: 'bg-score-excellent',
    good: 'bg-score-good',
    medium: 'bg-score-average',
    bad: 'bg-score-critical',
  };
  return colors[category];
}

export function getScoreLabel(level: ScoreLevel): string {
  const labels: Record<ScoreLevel, string> = {
    excellent: 'Excellent',
    good: 'Good',
    average: 'Average',
    weak: 'Weak',
    critical: 'Very Weak',
  };
  return labels[level];
}
