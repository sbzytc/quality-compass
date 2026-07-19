import { useOutletContext } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Palette, Save, RotateCcw, Download, Upload, Key, Trash2, Copy, Plus, FlaskConical } from 'lucide-react';
import type { CompanyTheme } from '@/contexts/CompanyThemeProvider';

// ── HSL <→ HEX helpers ─────────────────────────────
function hslToHex(hslTriple?: string) {
  if (!hslTriple) return '#000000';
  const m = hslTriple.trim().match(/^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%$/);
  if (!m) return '#000000';
  const h = +m[1], s = +m[2] / 100, l = +m[3] / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const mm = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v: number) => Math.round((v + mm) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function hexToHsl(hex: string) {
  const m = hex.replace('#', '').match(/^([0-9a-f]{6})$/i);
  if (!m) return '0 0% 0%';
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255, g = ((int >> 8) & 255) / 255, b = (int & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const DEFAULT_THEME: CompanyTheme = {
  colors: {
    primary: '217 72% 42%',
    primaryForeground: '0 0% 100%',
    accent: '43 90% 55%',
    accentForeground: '220 30% 18%',
    background: '220 20% 92%',
    foreground: '220 30% 18%',
  },
  radius: '0.875rem',
  shadows: {
    soft: '0 8px 30px rgba(85,105,135,0.12)',
    medium: '0 14px 40px rgba(70,90,120,0.18)',
  },
};

const COLOR_FIELDS: Array<{ key: keyof NonNullable<CompanyTheme['colors']>; en: string; ar: string }> = [
  { key: 'primary',            en: 'Primary',            ar: 'اللون الأساسي' },
  { key: 'primaryForeground',  en: 'Primary text',       ar: 'نص فوق الأساسي' },
  { key: 'accent',             en: 'Accent',             ar: 'اللون الثانوي' },
  { key: 'accentForeground',   en: 'Accent text',        ar: 'نص فوق الثانوي' },
  { key: 'background',         en: 'Background',         ar: 'الخلفية' },
  { key: 'foreground',         en: 'Foreground text',    ar: 'النص العام' },
];

function randomKey() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return 'rsdah_' + Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}
async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function CompanyThemeTab() {
  const { company } = useOutletContext<{ company: any }>();
  const { direction } = useLanguage();
  const isRTL = direction === 'rtl';
  const t = (ar: string, en: string) => (isRTL ? ar : en);
  const qc = useQueryClient();

  // ── Load current theme + parent (for sandbox inheritance) ────────────
  const { data: themeRow, isLoading } = useQuery({
    queryKey: ['company-theme-editor', company.id],
    queryFn: async () => {
      const ids = [company.id, company.sandbox_of_company_id].filter(Boolean) as string[];
      const { data, error } = await supabase
        .from('companies')
        .select('id, theme, theme_updated_at')
        .in('id', ids);
      if (error) throw error;
      const self = data?.find((r) => r.id === company.id);
      const parent = company.sandbox_of_company_id
        ? data?.find((r) => r.id === company.sandbox_of_company_id)
        : null;
      return {
        theme: (self?.theme as CompanyTheme | null) ?? null,
        updated_at: self?.theme_updated_at ?? null,
        parentTheme: (parent?.theme as CompanyTheme | null) ?? null,
      };
    },
  });

  const inherited = !themeRow?.theme && !!themeRow?.parentTheme;
  const baseTheme: CompanyTheme = useMemo(
    () => themeRow?.theme || themeRow?.parentTheme || DEFAULT_THEME,
    [themeRow]
  );
  const [draft, setDraft] = useState<CompanyTheme>(baseTheme);
  useEffect(() => setDraft(baseTheme), [baseTheme]);

  const patchColor = (key: keyof NonNullable<CompanyTheme['colors']>, hex: string) => {
    setDraft((d) => ({ ...d, colors: { ...d.colors, [key]: hexToHsl(hex) } }));
  };

  const save = useMutation({
    mutationFn: async (theme: CompanyTheme | null) => {
      const { error } = await supabase
        .from('companies')
        .update({ theme: theme as any, theme_updated_at: new Date().toISOString() })
        .eq('id', company.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t('تم حفظ الثيم', 'Theme saved') });
      qc.invalidateQueries({ queryKey: ['company-theme-editor', company.id] });
      qc.invalidateQueries({ queryKey: ['company-theme'] });
    },
    onError: (e: any) => toast({ title: t('فشل الحفظ', 'Save failed'), description: e.message, variant: 'destructive' }),
  });

  const resetToInherit = () => save.mutate(null);
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${company.slug}-theme.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const importJson = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setDraft(parsed);
      toast({ title: t('تم استيراد الملف — راجع ثم احفظ', 'Imported — review then save') });
    } catch {
      toast({ title: t('ملف غير صالح', 'Invalid JSON'), variant: 'destructive' });
    }
  };

  // ── API keys ────────────────────────────────────────
  const { data: apiKeys } = useQuery({
    queryKey: ['company-theme-api-keys', company.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_theme_api_keys')
        .select('id, name, key_prefix, scopes, last_used_at, created_at, revoked_at')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [newKeyName, setNewKeyName] = useState('');
  const [freshKey, setFreshKey] = useState<string | null>(null);

  const createKey = useMutation({
    mutationFn: async () => {
      const name = newKeyName.trim() || 'External tool';
      const raw = randomKey();
      const key_prefix = raw.slice(0, 12);
      const key_hash = await sha256Hex(raw);
      const { error } = await supabase.from('company_theme_api_keys').insert({
        company_id: company.id,
        name,
        key_prefix,
        key_hash,
      });
      if (error) throw error;
      return raw;
    },
    onSuccess: (raw) => {
      setFreshKey(raw);
      setNewKeyName('');
      qc.invalidateQueries({ queryKey: ['company-theme-api-keys', company.id] });
    },
    onError: (e: any) => toast({ title: t('تعذّر إنشاء المفتاح', 'Could not create key'), description: e.message, variant: 'destructive' }),
  });

  const revokeKey = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('company_theme_api_keys')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t('تم إلغاء المفتاح', 'Key revoked') });
      qc.invalidateQueries({ queryKey: ['company-theme-api-keys', company.id] });
    },
  });

  const endpoint = `${window.location.origin.replace('http://', 'https://')}/functions/v1/company-theme?company_id=${company.id}`;
  const supabaseEndpoint = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID || ''}.supabase.co/functions/v1/company-theme?company_id=${company.id}`;

  const radiusPx = parseFloat(draft.radius || '0.875') * 16;

  if (isLoading) return <div className="p-8 text-muted-foreground">…</div>;

  return (
    <div className="space-y-6" dir={direction}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Palette className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t('ثيم الشركة', 'Company Theme')}</h1>
          <p className="text-sm text-muted-foreground">
            {t(
              'خصّص ألوان وشكل هذه الشركة. الشركة التجريبية ترث الثيم تلقائياً حتى تُعدَّل.',
              'Customize this company\'s look. Sandboxes inherit until you override.'
            )}
          </p>
        </div>
      </div>

      {company.is_sandbox && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 text-sm">
          <FlaskConical className="w-4 h-4" />
          {inherited
            ? t('هذه شركة تجريبية — تعرض ثيم الشركة الأصلية. أي تعديل سيصبح خاصاً بها.',
                'This is a sandbox — currently inheriting from parent. Editing detaches it.')
            : t('هذه شركة تجريبية بثيم مستقل عن الأصلية.',
                'This sandbox has its own theme, independent from parent.')}
        </div>
      )}

      {/* Editor */}
      <Card className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {COLOR_FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label className="text-sm">{isRTL ? f.ar : f.en}</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={hslToHex(draft.colors?.[f.key])}
                  onChange={(e) => patchColor(f.key, e.target.value)}
                  className="w-10 h-10 rounded-md border border-border cursor-pointer bg-transparent"
                />
                <Input
                  value={draft.colors?.[f.key] || ''}
                  onChange={(e) => setDraft((d) => ({ ...d, colors: { ...d.colors, [f.key]: e.target.value } }))}
                  placeholder="217 72% 42%"
                  className="font-mono text-xs"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 pt-2 border-t border-border/50">
          <Label>{t('نصف قطر الحواف', 'Border radius')} — {radiusPx.toFixed(0)}px</Label>
          <Slider
            min={0}
            max={2}
            step={0.0625}
            value={[parseFloat(draft.radius || '0.875')]}
            onValueChange={(v) => setDraft((d) => ({ ...d, radius: `${v[0]}rem` }))}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/50">
          <div className="space-y-1.5">
            <Label>{t('ظل ناعم', 'Soft shadow')}</Label>
            <Input
              className="font-mono text-xs"
              value={draft.shadows?.soft || ''}
              onChange={(e) => setDraft((d) => ({ ...d, shadows: { ...d.shadows, soft: e.target.value } }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('ظل متوسط', 'Medium shadow')}</Label>
            <Input
              className="font-mono text-xs"
              value={draft.shadows?.medium || ''}
              onChange={(e) => setDraft((d) => ({ ...d, shadows: { ...d.shadows, medium: e.target.value } }))}
            />
          </div>
        </div>

        {/* Preview */}
        <div
          className="rounded-xl p-5 border"
          style={{
            background: `hsl(${draft.colors?.background})`,
            color: `hsl(${draft.colors?.foreground})`,
            borderRadius: draft.radius,
            boxShadow: draft.shadows?.medium,
          }}
        >
          <div className="text-sm mb-3 opacity-75">{t('معاينة', 'Preview')}</div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center px-4 py-2 text-sm font-medium"
              style={{
                background: `hsl(${draft.colors?.primary})`,
                color: `hsl(${draft.colors?.primaryForeground})`,
                borderRadius: draft.radius,
              }}
            >
              {t('زر أساسي', 'Primary button')}
            </span>
            <span
              className="inline-flex items-center px-4 py-2 text-sm font-medium"
              style={{
                background: `hsl(${draft.colors?.accent})`,
                color: `hsl(${draft.colors?.accentForeground})`,
                borderRadius: draft.radius,
              }}
            >
              {t('زر ثانوي', 'Accent')}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button onClick={() => save.mutate(draft)} disabled={save.isPending} className="gap-2">
            <Save className="w-4 h-4" />
            {t('حفظ الثيم', 'Save theme')}
          </Button>
          <Button variant="outline" onClick={resetToInherit} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            {t('إعادة تعيين (توارث)', 'Reset (inherit)')}
          </Button>
          <Button variant="outline" onClick={exportJson} className="gap-2">
            <Download className="w-4 h-4" />
            {t('تصدير JSON', 'Export JSON')}
          </Button>
          <label className="inline-flex">
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])}
            />
            <span className="inline-flex items-center gap-2 h-10 px-4 py-2 text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer">
              <Upload className="w-4 h-4" /> {t('استيراد JSON', 'Import JSON')}
            </span>
          </label>
        </div>
      </Card>

      {/* API access */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">{t('واجهة API خارجية', 'External API access')}</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t(
            'أنشئ مفتاحاً لأي أداة خارجية (مثل سكربت، MCP، أو محرر ثيم) لقراءة/تحديث ثيم هذه الشركة عبر HTTP.',
            'Create a key for any external tool (script, MCP, theme editor) to read/write this company\'s theme over HTTP.'
          )}
        </p>

        <div className="rounded-lg bg-muted/40 border p-3 text-xs font-mono overflow-x-auto">
          <div className="opacity-70 mb-1">{t('نقطة النهاية:', 'Endpoint:')}</div>
          <div className="break-all">{supabaseEndpoint}</div>
          <div className="opacity-70 mt-3 mb-1">{t('مثال:', 'Example:')}</div>
          <pre className="whitespace-pre-wrap">{`# Read
curl -H "x-api-key: <YOUR_KEY>" "${supabaseEndpoint}"

# Write
curl -X PUT -H "x-api-key: <YOUR_KEY>" -H "content-type: application/json" \\
  -d '{"theme":{"colors":{"primary":"210 90% 50%"},"radius":"1rem"}}' \\
  "${supabaseEndpoint}"`}</pre>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder={t('اسم المفتاح (مثل: Figma Bridge)', 'Key name (e.g. Figma Bridge)')}
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
          />
          <Button onClick={() => createKey.mutate()} disabled={createKey.isPending} className="gap-2">
            <Plus className="w-4 h-4" /> {t('إنشاء مفتاح', 'Create key')}
          </Button>
        </div>

        {freshKey && (
          <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-4 space-y-2">
            <div className="text-sm font-medium text-amber-900">
              {t('انسخ المفتاح الآن — لن يُعرض مرة أخرى', 'Copy this key now — it will not be shown again')}
            </div>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-2 bg-white rounded font-mono text-xs break-all">{freshKey}</code>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(freshKey); toast({ title: t('تم النسخ', 'Copied') }); }}>
                <Copy className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setFreshKey(null)}>
                {t('إغلاق', 'Dismiss')}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {apiKeys?.length === 0 && (
            <div className="text-sm text-muted-foreground py-4 text-center">
              {t('لا توجد مفاتيح بعد.', 'No API keys yet.')}
            </div>
          )}
          {apiKeys?.map((k) => (
            <div key={k.id} className="flex items-center gap-3 p-3 rounded-lg border bg-white/60">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm flex items-center gap-2">
                  {k.name}
                  {k.revoked_at && <Badge variant="secondary" className="text-[10px]">{t('ملغى', 'Revoked')}</Badge>}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {k.key_prefix}••••••••
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {t('آخر استخدام:', 'Last used:')} {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : t('لم يستخدم', 'never')}
                </div>
              </div>
              {!k.revoked_at && (
                <Button size="sm" variant="ghost" onClick={() => revokeKey.mutate(k.id)} className="text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}