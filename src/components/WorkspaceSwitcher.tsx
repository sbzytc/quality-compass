import { Check, ChevronsUpDown, Building2, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useCurrentCompany } from '@/contexts/CurrentCompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const sectorLabels: Record<string, { en: string; ar: string }> = {
  fnb: { en: 'F&B / Restaurants', ar: 'مطاعم وأغذية' },
  clinic: { en: 'Healthcare', ar: 'رعاية صحية' },
  other: { en: 'Other', ar: 'أخرى' },
};

export function WorkspaceSwitcher() {
  const { currentCompany, companies, switchCompany, loading } = useCurrentCompany();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  if (loading || !currentCompany || companies.length === 0) return null;

  const displayName = (c: { name: string; name_ar: string | null }) =>
    isRTL ? (c.name_ar || c.name) : c.name;

  const realCompanies = companies.filter((c) => !c.is_sandbox);
  const sandboxCompanies = companies.filter((c) => c.is_sandbox);

  const renderItem = (c: (typeof companies)[number]) => (
    <DropdownMenuItem
      key={c.id}
      onClick={() => switchCompany(c.id)}
      className="flex items-center gap-2 cursor-pointer"
    >
      <Check
        className={cn(
          'h-4 w-4',
          c.id === currentCompany.id ? 'opacity-100 text-primary' : 'opacity-0'
        )}
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate flex items-center gap-1.5">
          {c.is_sandbox && <FlaskConical className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
          <span className="truncate">{displayName(c)}</span>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span>{sectorLabels[c.sector_type]?.[isRTL ? 'ar' : 'en'] || c.sector_type}</span>
          <span>·</span>
          <span className="capitalize">{c.membership_role}</span>
        </div>
      </div>
      {c.membership_role === 'owner' && !c.is_sandbox && (
        <Badge variant="secondary" className="text-[10px]">
          {isRTL ? 'مالك' : 'Owner'}
        </Badge>
      )}
      {c.is_sandbox && (
        <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-700">
          {isRTL ? 'تجريبي' : 'Sandbox'}
        </Badge>
      )}
    </DropdownMenuItem>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 max-w-[220px] backdrop-blur-md bg-white/40 border-white/40"
        >
          {currentCompany.is_sandbox
            ? <FlaskConical className="h-4 w-4 shrink-0 text-amber-600" />
            : <Building2 className="h-4 w-4 shrink-0 text-primary" />}
          <span className="truncate font-medium">{displayName(currentCompany)}</span>
          {companies.length > 1 && <ChevronsUpDown className="h-3.5 w-3.5 opacity-60 shrink-0" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-72">
        <DropdownMenuLabel>
          {isRTL ? 'مساحات العمل' : 'Workspaces'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {realCompanies.map(renderItem)}
        {sandboxCompanies.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-amber-700 flex items-center gap-1.5">
              <FlaskConical className="h-3.5 w-3.5" />
              {isRTL ? 'بيئات تجريبية' : 'Sandboxes'}
            </DropdownMenuLabel>
            {sandboxCompanies.map(renderItem)}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
