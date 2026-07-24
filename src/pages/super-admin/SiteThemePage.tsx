import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Palette, Save, RotateCcw, ExternalLink, Sparkles, Copy } from 'lucide-react';
import type { SiteTheme } from '@/contexts/LandingThemeProvider';
import { SuperAdminHeader } from '@/components/SuperAdminHeader';

// ── HSL <→ HEX helpers (mirrors CompanyThemeTab) ───────────────
function hslToHex(hslTriple?: string) {
  if (!hslTriple) return '#000000';
  const m = hslTriple.trim().match(/^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%$/);
  if (!m) return '#000000';
  const h = +m[1], s = +m[2] / 100, l = +m[3] / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const mm = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60)      [r, g, b] = [c, x, 0];
  else if (h < 120)[r, g, b] = [x, c, 0];
  else if (h < 180)[r, g, b] = [0, c, x];
  else if (h < 240)[r, g, b] = [0, x, c];
  else if (h < 300)[r, g, b] = [x, 0, c];
  else             [r, g, b] = [c, 0, x];
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

const DEFAULT_THEME: SiteTheme = {
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

const PRESETS: Array<{ id: string; en: string; ar: string; theme: SiteTheme }> = [
  { id: 'ocean',   en: 'Ocean Deep',   ar: 'محيط عميق',    theme: { colors: { primary: '199 89% 38%', primaryForeground: '0 0% 100%', accent: '43 90% 55%',  accentForeground: '220 30% 18%', background: '210 40% 96%', foreground: '215 35% 18%' }, radius: '0.875rem' } },
  { id: 'forest',  en: 'Forest',       ar: 'غابة',         theme: { colors: { primary: '158 64% 32%', primaryForeground: '0 0% 100%', accent: '35 85% 55%',  accentForeground: '160 30% 18%', background: '150 25% 95%', foreground: '160 30% 18%' }, radius: '0.875rem' } },
  { id: 'sunset',  en: 'Sunset',       ar: 'غروب',         theme: { colors: { primary: '14 90% 52%',  primaryForeground: '0 0% 100%', accent: '40 95% 55%',  accentForeground: '20 40% 18%',  background: '30 40% 96%',  foreground: '20 40% 18%'  }, radius: '0.875rem' } },
  { id: 'royal',   en: 'Royal Purple', ar: 'أرجواني ملكي', theme: { colors: { primary: '265 65% 45%', primaryForeground: '0 0% 100%', accent: '320 75% 60%', accentForeground: '270 30% 18%', background: '270 25% 96%', foreground: '270 30% 18%' }, radius: '0.875rem' } },
  { id: 'graphite',en: 'Graphite',     ar: 'جرافيت',       theme: { colors: { primary: '220 15% 25%', primaryForeground: '0 0% 100%', accent: '200 60% 45%', accentForeground: '220 15% 20%', background: '220 15% 96%', foreground: '220 20% 18%' }, radius: '0.75rem'  } },
];

type ColorKey = keyof NonNullable<SiteTheme['colors']>;

const COLOR_FIELDS: Array<{ key: ColorKey; en: string; ar: string }> = [
  { key: 'primary',            en: 'Primary',            ar: 'اللون الأساسي' },
  { key: 'primaryForeground',  en: 'Primary text',       ar: 'نص فوق الأساسي' },
  { key: 'accent',             en: 'Accent',             ar: 'اللون المميز' },
  { key: 'accentForeground',   en: 'Accent text',        ar: 'نص فوق المميز' },
  { key: 'background',         en: 'Background',         ar: 'الخلفية' },
  { key: 'foreground',         en: 'Foreground',         ar: 'النص الأساسي' },
];

export default function SiteThemePage() {
  const { language, direction } = useLanguage();
  const isRTL = direction === 'rtl';
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: initial, isLoading } = useQuery({
    queryKey: ['site-theme', 'landing', 'admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('theme, updated_at')
        .eq('key', 'landing')
        .maybeSingle();
      if (error) throw error;
      return { theme: (data?.theme as SiteTheme | null) ?? {}, updated_at: data?.updated_at ?? null };
    },
  });

  const [theme, setTheme] = useState<SiteTheme>({});
  useEffect(() => {
    if (initial) setTheme((initial.theme && Object.keys(initial.theme).length ? initial.theme : DEFAULT_THEME) as SiteTheme);
  }, [initial]);

  const merged: SiteTheme = useMemo(() => ({
    ...theme,
    colors: { ...(DEFAULT_THEME.colors || {}), ...(theme.colors || {}) },
    radius: theme.radius || DEFAULT_THEME.radius,
    shadows: { ...(DEFAULT_THEME.shadows || {}), ...(theme.shadows || {}) },
  }), [theme]);

  const setColor = (k: ColorKey, hsl: string) =>
    setTheme((t) => ({ ...t, colors: { ...(t.colors || {}), [k]: hsl } }));

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ key: 'landing', theme: theme as any, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site-theme'] });
      toast({ title: isRTL ? 'تم الحفظ' : 'Saved', description: isRTL ? 'تم تحديث ثيم الموقع التعريفي.' : 'Landing site theme updated.' });
    },
    onError: (e: any) => toast({ title: isRTL ? 'فشل الحفظ' : 'Save failed', description: e.message, variant: 'destructive' }),
  });

  const resetToDefault = () => setTheme(DEFAULT_THEME);

  const promptForClaude = useMemo(() => {
    const currentJson = JSON.stringify(merged, null, 2);
    return isRTL
      ? `أنت مساعد لتصميم ثيم موقع "رصدة" التعريفي (الصفحة العامة على rasdah.com). عدّل الثيم التالي بحيث يعكس هوية عصرية واحترافية ومتوافقة مع الوضع الفاتح.\n\nالقيود:\n- الألوان يجب أن تكون HSL على شكل \"H S% L%\" (مثال: \"217 72% 42%\").\n- حافظ على تباين نص جيد بين primary/primaryForeground و accent/accentForeground.\n- استخدم أداة "apply_site_theme" في MCP لتطبيق الثيم مباشرةً بعد الاتفاق معي.\n\nالثيم الحالي:\n${currentJson}`
      : `You are helping design the theme for Rasdah's public landing site (rasdah.com). Update the theme below so the marketing page feels modern, professional, and light-mode friendly.\n\nConstraints:\n- All colors must be HSL triples formatted as "H S% L%" (e.g. "217 72% 42%").\n- Keep strong contrast between primary/primaryForeground and accent/accentForeground.\n- Use the MCP tool "apply_site_theme" to apply the theme after we agree on it.\n\nCurrent theme:\n${currentJson}`;
  }, [merged, isRTL]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#edf3ff] to-[#e8eff9] p-6" dir={direction}>
      <div className="absolute top-4 end-4 sm:top-6 sm:end-6"><SuperAdminHeader /></div>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/super-admin')} className="gap-2">
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            {isRTL ? 'رجوع' : 'Back'}
          </Button>
          <div className="flex items-center gap-2">
            <Palette className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">
              {isRTL ? 'ثيم الموقع التعريفي' : 'Landing Site Theme'}
            </h1>
          </div>
          <Button asChild variant="outline" size="sm" className="ms-auto gap-2">
            <a href="/" target="_blank" rel="noreferrer">
              <ExternalLink className="w-4 h-4" />
              {isRTL ? 'معاينة الموقع' : 'Preview site'}
            </a>
          </Button>
        </div>

        <Card className="p-6 mb-6 bg-white/70 backdrop-blur-xl border-white/60">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">{isRTL ? 'قوالب جاهزة' : 'Presets'}</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => setTheme(p.theme)}
                className="group rounded-xl border border-white/70 bg-white/70 p-3 text-start hover:shadow-md transition"
              >
                <div className="flex gap-1.5 mb-2">
                  {(['primary','accent','background','foreground'] as ColorKey[]).map((k) => (
                    <span key={k} className="w-6 h-6 rounded-md border border-white shadow-sm" style={{ background: hslToHex(p.theme.colors?.[k]) }} />
                  ))}
                </div>
                <div className="text-sm font-medium">{isRTL ? p.ar : p.en}</div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-6 mb-6 bg-white/70 backdrop-blur-xl border-white/60">
          <h2 className="font-semibold mb-4">{isRTL ? 'الألوان' : 'Colors'}</h2>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {COLOR_FIELDS.map((f) => {
                const hsl = merged.colors?.[f.key] || '0 0% 0%';
                return (
                  <div key={f.key} className="flex items-center gap-3">
                    <input
                      type="color"
                      value={hslToHex(hsl)}
                      onChange={(e) => setColor(f.key, hexToHsl(e.target.value))}
                      className="h-10 w-14 rounded-md border border-input bg-transparent cursor-pointer"
                      aria-label={isRTL ? f.ar : f.en}
                    />
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">{isRTL ? f.ar : f.en}</Label>
                      <Input
                        value={hsl}
                        onChange={(e) => setColor(f.key, e.target.value)}
                        className="h-9 font-mono text-xs"
                        placeholder="217 72% 42%"
                      />
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center gap-3 sm:col-span-2">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">{isRTL ? 'استدارة الحواف' : 'Radius'}</Label>
                  <Input
                    value={merged.radius || ''}
                    onChange={(e) => setTheme((t) => ({ ...t, radius: e.target.value }))}
                    className="h-9 font-mono text-xs"
                    placeholder="0.875rem"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-6">
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2">
              <Save className="w-4 h-4" />
              {isRTL ? 'حفظ الثيم' : 'Save theme'}
            </Button>
            <Button variant="outline" onClick={resetToDefault} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              {isRTL ? 'إعادة الافتراضي' : 'Reset to default'}
            </Button>
          </div>
        </Card>

        <Card className="p-6 mb-6 bg-white/70 backdrop-blur-xl border-white/60">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">{isRTL ? 'تعديل الثيم عبر ChatGPT / Claude' : 'Change the theme with ChatGPT / Claude'}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {isRTL
              ? 'اربط رصدة كأداة MCP في ChatGPT أو Claude، ثم الصق البرومبت التالي. المساعد بيقدر يطبّق الثيم مباشرة عبر أداة apply_site_theme.'
              : 'Connect Rasdah as an MCP tool in ChatGPT or Claude, then paste the prompt below. The assistant can apply the theme directly via the `apply_site_theme` tool.'}
          </p>
          <div className="relative">
            <pre className="text-xs bg-slate-950 text-slate-100 rounded-lg p-4 whitespace-pre-wrap max-h-72 overflow-auto">{promptForClaude}</pre>
            <Button
              size="sm"
              variant="outline"
              className="absolute top-2 end-2 gap-1.5"
              onClick={() => {
                navigator.clipboard.writeText(promptForClaude);
                toast({ title: isRTL ? 'تم النسخ' : 'Copied' });
              }}
            >
              <Copy className="w-3.5 h-3.5" />
              {isRTL ? 'نسخ' : 'Copy'}
            </Button>
          </div>
        </Card>

        {initial?.updated_at && (
          <div className="text-xs text-muted-foreground text-center">
            {isRTL ? 'آخر تحديث: ' : 'Last updated: '}{new Date(initial.updated_at).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}
          </div>
        )}
      </div>
    </div>
  );
}