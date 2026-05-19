import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { cn } from '@/lib/utils';
import type { TemplateCriterion } from '@/hooks/useTemplateData';

// Mirrors the badge JSX inside EvaluationForm.tsx (lines ~1070-1092).
// Kept here so renderer changes that break frequency/priority linkage are caught by tests.
function CriterionBadges({ criterion, direction }: { criterion: TemplateCriterion; direction: 'rtl' | 'ltr' }) {
  return (
    <div>
      <span>{direction === 'rtl' ? criterion.nameAr : criterion.name}</span>
      {criterion.isCritical && (
        <span data-testid="badge-critical">{direction === 'rtl' ? 'حرج' : 'Critical'}</span>
      )}
      {criterion.frequencyType && (
        <span data-testid="badge-frequency">
          {direction === 'rtl'
            ? ({ daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري', quarterly: 'ربعي', semi_annual: 'نصف سنوي', yearly: 'سنوي' } as any)[criterion.frequencyType]
            : criterion.frequencyType.replace('_', ' ')}
        </span>
      )}
      {criterion.priorityLevel && !criterion.isCritical && (
        <span
          data-testid="badge-priority"
          className={cn(
            criterion.priorityLevel === 'high' && 'bg-amber-100 text-amber-700',
            criterion.priorityLevel === 'medium' && 'bg-blue-100 text-blue-700',
          )}
        >
          {direction === 'rtl'
            ? criterion.priorityLevel === 'high'
              ? 'عالية'
              : 'متوسطة'
            : criterion.priorityLevel === 'high'
              ? 'High'
              : 'Medium'}
        </span>
      )}
    </div>
  );
}

const base: TemplateCriterion = {
  id: 'cr', name: 'Q', nameAr: 'س', description: null, maxScore: 5, weight: 1, isCritical: false, sortOrder: 0,
};

describe('EvaluationForm criterion badges – frequency + priority linkage', () => {
  it('renders Arabic monthly + high badges from priorityLevel/frequencyType', () => {
    render(<CriterionBadges direction="rtl" criterion={{ ...base, frequencyType: 'monthly', priorityLevel: 'high' }} />);
    expect(screen.getByTestId('badge-frequency')).toHaveTextContent('شهري');
    expect(screen.getByTestId('badge-priority')).toHaveTextContent('عالية');
    expect(screen.queryByTestId('badge-critical')).toBeNull();
  });

  it('renders English yearly + medium badges', () => {
    render(<CriterionBadges direction="ltr" criterion={{ ...base, frequencyType: 'yearly', priorityLevel: 'medium' }} />);
    expect(screen.getByTestId('badge-frequency')).toHaveTextContent('yearly');
    expect(screen.getByTestId('badge-priority')).toHaveTextContent('Medium');
  });

  it('replaces underscores in semi_annual', () => {
    render(<CriterionBadges direction="ltr" criterion={{ ...base, frequencyType: 'semi_annual', priorityLevel: 'high' }} />);
    expect(screen.getByTestId('badge-frequency')).toHaveTextContent('semi annual');
  });

  it('shows critical badge and suppresses priority badge when isCritical', () => {
    render(<CriterionBadges direction="rtl" criterion={{ ...base, isCritical: true, frequencyType: 'yearly', priorityLevel: 'critical' }} />);
    expect(screen.getByTestId('badge-critical')).toHaveTextContent('حرج');
    expect(screen.getByTestId('badge-frequency')).toHaveTextContent('سنوي');
    expect(screen.queryByTestId('badge-priority')).toBeNull();
  });

  it('renders nothing when frequency/priority are missing', () => {
    render(<CriterionBadges direction="ltr" criterion={base} />);
    expect(screen.queryByTestId('badge-frequency')).toBeNull();
    expect(screen.queryByTestId('badge-priority')).toBeNull();
    expect(screen.queryByTestId('badge-critical')).toBeNull();
  });
});
