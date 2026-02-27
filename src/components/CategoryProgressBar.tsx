import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ScoreLevel } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface CategoryProgressBarProps {
  name: string;
  percentage: number;
  status: ScoreLevel;
  failedCriteria?: number;
  showPercentage?: boolean;
  className?: string;
}

const barColors: Record<ScoreLevel, string> = {
  excellent: 'bg-score-excellent',
  good: 'bg-score-good',
  average: 'bg-score-average',
  weak: 'bg-score-weak',
  critical: 'bg-score-critical',
  unrated: 'bg-muted-foreground',
};

const bgColors: Record<ScoreLevel, string> = {
  excellent: 'bg-score-excellent/20',
  good: 'bg-score-good/20',
  average: 'bg-score-average/20',
  weak: 'bg-score-weak/20',
  critical: 'bg-score-critical/20',
  unrated: 'bg-muted/20',
};

export function CategoryProgressBar({
  name,
  percentage,
  status,
  failedCriteria = 0,
  showPercentage = true,
  className,
}: CategoryProgressBarProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-foreground">{name}</span>
        <div className="flex items-center gap-2">
          {failedCriteria > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-score-critical/10 text-score-critical font-medium">
              {isAr
                ? `${failedCriteria} ${failedCriteria === 1 ? 'مشكلة' : 'مشاكل'}`
                : `${failedCriteria} issue${failedCriteria > 1 ? 's' : ''}`}
            </span>
          )}
          {showPercentage && (
            <span className={cn(
              'text-sm font-semibold',
              status === 'excellent' && 'text-score-excellent',
              status === 'good' && 'text-score-good',
              status === 'average' && 'text-score-average',
              status === 'weak' && 'text-score-weak',
              status === 'critical' && 'text-score-critical'
            )}>
              {percentage}%
            </span>
          )}
        </div>
      </div>
      <div className={cn('h-2 rounded-full overflow-hidden', bgColors[status])}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn('h-full rounded-full', barColors[status])}
        />
      </div>
    </div>
  );
}
