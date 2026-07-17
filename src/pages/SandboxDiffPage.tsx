import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from '@/contexts/CurrentCompanyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FlaskConical, RefreshCw, ArrowUp, Loader2, RotateCcw } from 'lucide-react';

type DiffRow = { sandbox_id?: string; real_id?: string; row?: any; sandbox?: any; real?: any };
type TableDiff = { added: DiffRow[]; modified: DiffRow[]; deleted: DiffRow[] };
type FullDiff = {
  sandbox_company_id: string;
  real_company_id: string;
  generated_at: string;
  tables: Record<string, TableDiff>;
};

const PROMOTABLE = new Set(['regions', 'branches', 'feature_flags', 'company_off_days']);

const TABLE_LABELS: Record<string, { en: string; ar: string }> = {
  regions: { en: 'Regions', ar: 'المناطق' },
  branches: { en: 'Branches', ar: 'الفروع' },
  feature_flags: { en: 'Feature Flags', ar: 'إعدادات الميزات' },
  company_off_days: { en: 'Company Off Days', ar: 'أيام العطل' },
  evaluation_templates: { en: 'Evaluation Templates', ar: 'قوالب التقييم' },
  template_categories: { en: 'Template Categories', ar: 'أقسام القوالب' },
  template_criteria: { en: 'Template Criteria', ar: 'معايير القوالب' },
};

export default function SandboxDiffPage() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const navigate = useNavigate();
  const { currentCompany, isSandbox, refresh, switchCompany, companies } = useCurrentCompany();
  const [diff, setDiff] = useState<FullDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [selections, setSelections] = useState<Record<string, { add: Set<string>; update: Set<string>; delete: Set<string> }>>({});

  const loadDiff = async () => {
    if (!currentCompany || !isSandbox) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('get_sandbox_diff' as any, {
      _sandbox_company_id: currentCompany.id,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDiff(data as FullDiff);
    setSelections({});
  };

  useEffect(() => {
    loadDiff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCompany?.id]);

  const toggle = (table: string, kind: 'add' | 'update' | 'delete', id: string) => {
    setSelections((prev) => {
      const next = { ...prev };
      const bucket = next[table] || { add: new Set(), update: new Set(), delete: new Set() };
      const copy = new Set(bucket[kind]);
      copy.has(id) ? copy.delete(id) : copy.add(id);
      next[table] = { ...bucket, [kind]: copy };
      return next;
    });
  };

  const totalSelected = useMemo(() => {
    return Object.values(selections).reduce(
      (n, s) => n + s.add.size + s.update.size + s.delete.size,
      0,
    );
  }, [selections]);

  const promote = async () => {
    if (!diff || totalSelected === 0) return;
    const payload: Record<string, any> = {};
    for (const [table, sel] of Object.entries(selections)) {
      if (!PROMOTABLE.has(table)) continue;
      payload[table] = {
        add: Array.from(sel.add),
        update: Array.from(sel.update),
        delete: Array.from(sel.delete),
      };
    }
    if (Object.keys(payload).length === 0) {
      toast.error(isRTL ? 'اختر تغييرات من جدول قابل للترقية' : 'Select changes from a promotable table');
      return;
    }
    setPromoting(true);
    const { data, error } = await supabase.rpc('promote_sandbox_changes' as any, {
      _sandbox_company_id: diff.sandbox_company_id,
      _selections: payload,
    });
    setPromoting(false);
    if (error) return toast.error(error.message);
    toast.success(isRTL ? 'تم رفع التغييرات بنجاح' : 'Changes promoted successfully');
    console.info('promote result', data);
    await loadDiff();
  };

  const resetSandbox = async () => {
    if (!currentCompany || !isSandbox) return;
    if (!window.confirm(isRTL
      ? 'سيتم حذف كل التغييرات في الشركة التجريبية وإعادة إنشائها من الشركة الفعلية. هل أنت متأكد؟'
      : 'This will delete ALL changes in the sandbox and re-create it from the real company. Continue?'))
      return;
    setResetting(true);
    const { data, error } = await supabase.functions.invoke('reset-sandbox', {
      body: { sandbox_company_id: currentCompany.id },
    });
    setResetting(false);
    if (error) return toast.error(error.message);
    const newId = (data as any)?.new_sandbox_company_id;
    toast.success(isRTL ? 'تمت إعادة تعيين الشركة التجريبية' : 'Sandbox reset complete');
    await refresh();
    if (newId) {
      const c = companies.find((c) => c.id === newId);
      if (c) await switchCompany(newId);
    }
    loadDiff();
  };

  if (!currentCompany) return null;

  if (!isSandbox) {
    return (
      <Card className="p-8 text-center">
        <FlaskConical className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
        <h2 className="text-lg font-semibold mb-2">
          {isRTL ? 'صفحة الشركة التجريبية' : 'Sandbox page'}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {isRTL
            ? 'هذه الصفحة تظهر فقط عندما تكون داخل شركة تجريبية. بدّل إلى شركتك التجريبية من مبدّل مساحات العمل.'
            : 'This page is only available while inside a sandbox company. Switch to your sandbox from the workspace switcher.'}
        </p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          {isRTL ? 'رجوع' : 'Back'}
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-amber-600" />
            {isRTL ? 'مراجعة تغييرات الشركة التجريبية' : 'Sandbox Diff & Promote'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? 'اختر التغييرات التي تريد نقلها من الشركة التجريبية إلى الشركة الفعلية.'
              : 'Select changes to promote from the sandbox to the real company.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadDiff} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ms-1.5">{isRTL ? 'إعادة الحساب' : 'Recalculate'}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={resetSandbox} disabled={resetting} className="text-destructive">
            {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            <span className="ms-1.5">{isRTL ? 'إعادة تعيين التجريبي' : 'Reset Sandbox'}</span>
          </Button>
          <Button size="sm" onClick={promote} disabled={promoting || totalSelected === 0}>
            {promoting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            <span className="ms-1.5">
              {isRTL ? `ترقية المحدد (${totalSelected})` : `Promote Selected (${totalSelected})`}
            </span>
          </Button>
        </div>
      </div>

      {loading && !diff && (
        <Card className="p-8 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {isRTL ? 'جاري حساب الفروقات…' : 'Computing diff…'}
        </Card>
      )}

      {diff && (
        <Accordion type="multiple" className="space-y-2">
          {Object.entries(diff.tables).map(([table, td]) => {
            const count = (td.added?.length || 0) + (td.modified?.length || 0) + (td.deleted?.length || 0);
            const label = TABLE_LABELS[table]?.[isRTL ? 'ar' : 'en'] || table;
            const promotable = PROMOTABLE.has(table);
            return (
              <AccordionItem key={table} value={table} className="border rounded-lg bg-card px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="font-medium">{label}</span>
                    <Badge variant={count > 0 ? 'default' : 'secondary'} className="text-xs">
                      {count} {isRTL ? 'تغيير' : 'changes'}
                    </Badge>
                    {!promotable && count > 0 && (
                      <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-700">
                        {isRTL ? 'عرض فقط - الترقية قريبًا' : 'View only — promote coming soon'}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <TableSection
                    table={table}
                    td={td}
                    promotable={promotable}
                    isRTL={isRTL}
                    selection={selections[table]}
                    onToggle={toggle}
                  />
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}

function TableSection({
  table, td, promotable, isRTL, selection, onToggle,
}: {
  table: string;
  td: TableDiff;
  promotable: boolean;
  isRTL: boolean;
  selection?: { add: Set<string>; update: Set<string>; delete: Set<string> };
  onToggle: (table: string, kind: 'add' | 'update' | 'delete', id: string) => void;
}) {
  const added = td.added || [];
  const modified = td.modified || [];
  const deleted = td.deleted || [];
  if (added.length + modified.length + deleted.length === 0) {
    return <div className="py-3 text-sm text-muted-foreground">{isRTL ? 'لا توجد تغييرات' : 'No changes'}</div>;
  }
  return (
    <div className="space-y-4 py-2">
      {added.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-emerald-700 mb-2">
            + {isRTL ? 'مضاف' : 'Added'} ({added.length})
          </div>
          <div className="space-y-1">
            {added.map((r) => (
              <RowCard
                key={r.sandbox_id}
                checked={selection?.add.has(r.sandbox_id!) || false}
                disabled={!promotable}
                onToggle={() => onToggle(table, 'add', r.sandbox_id!)}
                summary={rowSummary(r.row)}
                details={r.row}
              />
            ))}
          </div>
        </div>
      )}
      {modified.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-amber-700 mb-2">
            ~ {isRTL ? 'معدّل' : 'Modified'} ({modified.length})
          </div>
          <div className="space-y-1">
            {modified.map((r) => (
              <RowCard
                key={r.sandbox_id}
                checked={selection?.update.has(r.sandbox_id!) || false}
                disabled={!promotable}
                onToggle={() => onToggle(table, 'update', r.sandbox_id!)}
                summary={rowSummary(r.sandbox)}
                details={diffFields(r.real, r.sandbox)}
                isDiff
              />
            ))}
          </div>
        </div>
      )}
      {deleted.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-rose-700 mb-2">
            − {isRTL ? 'محذوف' : 'Deleted'} ({deleted.length})
          </div>
          <div className="space-y-1">
            {deleted.map((r) => (
              <RowCard
                key={r.real_id}
                checked={selection?.delete.has(r.real_id!) || false}
                disabled={!promotable}
                onToggle={() => onToggle(table, 'delete', r.real_id!)}
                summary={rowSummary(r.row)}
                details={r.row}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function rowSummary(row: any): string {
  if (!row) return '(empty)';
  return row.name || row.name_ar || row.key || row.label || row.title || JSON.stringify(row).slice(0, 60);
}

function diffFields(realRow: any, sandboxRow: any): Record<string, { from: any; to: any }> {
  const out: Record<string, { from: any; to: any }> = {};
  const keys = new Set([...Object.keys(realRow || {}), ...Object.keys(sandboxRow || {})]);
  for (const k of keys) {
    const a = realRow?.[k];
    const b = sandboxRow?.[k];
    if (JSON.stringify(a) !== JSON.stringify(b)) out[k] = { from: a, to: b };
  }
  return out;
}

function RowCard({
  checked, disabled, onToggle, summary, details, isDiff,
}: {
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
  summary: string;
  details: any;
  isDiff?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-2">
      <Checkbox checked={checked} onCheckedChange={onToggle} disabled={disabled} className="mt-0.5" />
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-sm text-start font-medium truncate hover:underline block w-full"
        >
          {summary}
        </button>
        {expanded && (
          <div className="mt-2 rounded bg-background border p-2 text-xs font-mono max-h-64 overflow-auto">
            {isDiff ? (
              <div className="space-y-1">
                {Object.entries(details as Record<string, { from: any; to: any }>).map(([k, v]) => (
                  <div key={k}>
                    <span className="text-muted-foreground">{k}:</span>{' '}
                    <span className="text-rose-700 line-through">{JSON.stringify(v.from)}</span>
                    {' → '}
                    <span className="text-emerald-700">{JSON.stringify(v.to)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <pre className="whitespace-pre-wrap">{JSON.stringify(details, null, 2)}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}