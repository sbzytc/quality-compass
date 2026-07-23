import { Building2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBranchScope } from '@/contexts/BranchScopeContext';
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
  /** Force showing the dropdown even when there is only one branch. */
  alwaysShow?: boolean;
}

/**
 * Unified branch switcher. Renders nothing when the user has 0 or 1 accessible branches
 * (unless `alwaysShow` is set). Selecting a branch updates the global BranchScope and
 * causes any hook that reads it to refetch.
 */
export function BranchScopeSwitcher({ className, alwaysShow = false }: Props) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { selectedBranchId, setSelectedBranchId, accessibleBranches, hasChoice } = useBranchScope();

  if (!alwaysShow && !hasChoice) return null;
  if (accessibleBranches.length === 0) return null;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
      <Select
        value={selectedBranchId ?? undefined}
        onValueChange={(v) => setSelectedBranchId(v)}
      >
        <SelectTrigger className="w-[240px] h-9">
          <SelectValue placeholder={isAr ? 'اختر فرعاً...' : 'Choose a branch...'} />
        </SelectTrigger>
        <SelectContent>
          {accessibleBranches.map(b => (
            <SelectItem key={b.id} value={b.id}>
              {isAr ? (b.nameAr || b.name) : b.name}
              {b.city ? ` • ${b.city}` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}