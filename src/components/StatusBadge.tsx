import { cn } from '@/lib/utils';
import { ScoreLevel, getScoreLabel } from '@/types';

interface StatusBadgeProps {
  status: ScoreLevel;
  size?: 'sm' | 'md';
  className?: string;
}

const statusStyles: Record<ScoreLevel, string> = {
  excellent: 'bg-score-excellent/10 text-score-excellent border-score-excellent/30',
  good: 'bg-score-good/10 text-score-good border-score-good/30',
  average: 'bg-score-average/10 text-score-average border-score-average/30',
  weak: 'bg-score-weak/10 text-score-weak border-score-weak/30',
  critical: 'bg-score-critical/10 text-score-critical border-score-critical/30',
};

export function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium border rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        statusStyles[status],
        className
      )}
    >
      <span
        className={cn(
          'rounded-full mr-1.5',
          size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
          status === 'excellent' && 'bg-score-excellent',
          status === 'good' && 'bg-score-good',
          status === 'average' && 'bg-score-average',
          status === 'weak' && 'bg-score-weak',
          status === 'critical' && 'bg-score-critical'
        )}
      />
      {getScoreLabel(status)}
    </span>
  );
}

// Priority badge for corrective actions
interface PriorityBadgeProps {
  priority: 'low' | 'medium' | 'high' | 'critical';
  size?: 'sm' | 'md';
  className?: string;
}

const priorityStyles = {
  low: 'bg-muted text-muted-foreground border-border',
  medium: 'bg-score-average/10 text-score-average border-score-average/30',
  high: 'bg-score-weak/10 text-score-weak border-score-weak/30',
  critical: 'bg-score-critical/10 text-score-critical border-score-critical/30',
};

const priorityLabels = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export function PriorityBadge({ priority, size = 'md', className }: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium border rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        priorityStyles[priority],
        className
      )}
    >
      {priorityLabels[priority]}
    </span>
  );
}

// Action status badge
interface ActionStatusBadgeProps {
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  size?: 'sm' | 'md';
  className?: string;
}

const actionStatusStyles = {
  pending: 'bg-muted text-muted-foreground border-border',
  in_progress: 'bg-primary/10 text-primary border-primary/30',
  completed: 'bg-score-excellent/10 text-score-excellent border-score-excellent/30',
  overdue: 'bg-score-critical/10 text-score-critical border-score-critical/30',
};

const actionStatusLabels = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  overdue: 'Overdue',
};

export function ActionStatusBadge({ status, size = 'md', className }: ActionStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium border rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        actionStatusStyles[status],
        className
      )}
    >
      {actionStatusLabels[status]}
    </span>
  );
}
