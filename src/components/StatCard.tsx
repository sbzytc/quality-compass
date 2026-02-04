import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'excellent' | 'good' | 'average' | 'weak' | 'critical';
  className?: string;
}

const variantStyles = {
  default: {
    icon: 'bg-primary/10 text-primary',
    border: '',
  },
  excellent: {
    icon: 'bg-score-excellent/10 text-score-excellent',
    border: 'border-l-4 border-l-score-excellent',
  },
  good: {
    icon: 'bg-score-good/10 text-score-good',
    border: 'border-l-4 border-l-score-good',
  },
  average: {
    icon: 'bg-score-average/10 text-score-average',
    border: 'border-l-4 border-l-score-average',
  },
  weak: {
    icon: 'bg-score-weak/10 text-score-weak',
    border: 'border-l-4 border-l-score-weak',
  },
  critical: {
    icon: 'bg-score-critical/10 text-score-critical',
    border: 'border-l-4 border-l-score-critical',
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  className,
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow',
        styles.border,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                'text-sm font-medium',
                trend.isPositive ? 'text-score-excellent' : 'text-score-critical'
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div className={cn('p-3 rounded-xl', styles.icon)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
}
