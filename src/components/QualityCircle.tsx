import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ScoreLevel, getScoreLabel } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface QualityCircleProps {
  score: number;
  status: ScoreLevel;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  animate?: boolean;
  onClick?: () => void;
  className?: string;
}

const sizeClasses = {
  sm: 'w-12 h-12 text-sm',
  md: 'w-20 h-20 text-lg',
  lg: 'w-28 h-28 text-2xl',
  xl: 'w-36 h-36 text-3xl',
};

const statusClasses: Record<ScoreLevel, string> = {
  excellent: 'bg-score-excellent',
  good: 'bg-score-good',
  average: 'bg-score-average',
  weak: 'bg-score-weak',
  critical: 'bg-score-critical',
};

const glowClasses: Record<ScoreLevel, string> = {
  excellent: 'shadow-[0_0_30px_-5px_hsl(var(--score-excellent)/0.6)]',
  good: 'shadow-[0_0_30px_-5px_hsl(var(--score-good)/0.6)]',
  average: 'shadow-[0_0_30px_-5px_hsl(var(--score-average)/0.6)]',
  weak: 'shadow-[0_0_30px_-5px_hsl(var(--score-weak)/0.6)]',
  critical: 'shadow-[0_0_30px_-5px_hsl(var(--score-critical)/0.6)]',
};

export function QualityCircle({
  score,
  status,
  size = 'md',
  showLabel = false,
  animate = true,
  onClick,
  className,
}: QualityCircleProps) {
  const { language } = useLanguage();
  const Component = animate ? motion.div : 'div';
  const animationProps = animate
    ? {
        initial: { scale: 0.8, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        whileHover: onClick ? { scale: 1.05 } : undefined,
        whileTap: onClick ? { scale: 0.98 } : undefined,
        transition: { type: 'spring' as const, stiffness: 300, damping: 20 },
      }
    : {};

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <Component
        {...animationProps}
        onClick={onClick}
        className={cn(
          'rounded-full flex items-center justify-center font-bold text-white transition-shadow duration-300',
          sizeClasses[size],
          statusClasses[status],
          glowClasses[status],
          onClick && 'cursor-pointer hover:shadow-xl'
        )}
      >
        {score}%
      </Component>
      {showLabel && (
        <span className={cn(
          'text-sm font-medium',
          status === 'excellent' && 'text-score-excellent',
          status === 'good' && 'text-score-good',
          status === 'average' && 'text-score-average',
          status === 'weak' && 'text-score-weak',
          status === 'critical' && 'text-score-critical'
        )}>
          {getScoreLabel(status, language)}
        </span>
      )}
    </div>
  );
}
