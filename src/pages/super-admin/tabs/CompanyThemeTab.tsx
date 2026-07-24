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
import { Palette, Save, RotateCcw, Download, Upload, Key, Trash2, Copy, Plus, FlaskConical, History, Undo2, Eye, CheckCircle2, XCircle, Wand2, Image as ImageIcon } from 'lucide-react';
import type { CompanyTheme } from '@/contexts/CompanyThemeProvider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Bot, Sparkles } from 'lucide-react';

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

// ── Preset themes (click-to-apply) ─────────────────
const PRESETS: Array<{ id: string; en: string; ar: string; theme: CompanyTheme }> = [
  {
    id: 'ocean',
    en: 'Ocean Deep', ar: 'محيط عميق',
    theme: { colors: { primary: '199 89% 38%', primaryForeground: '0 0% 100%', accent: '43 90% 55%', accentForeground: '220 30% 18%', background: '210 40% 96%', foreground: '215 35% 18%' }, radius: '0.875rem', shadows: { soft: '0 8px 30px rgba(20,80,120,0.12)', medium: '0 14px 40px rgba(20,80,120,0.20)' } },
  },
  {
    id: 'sunset',
    en: 'Sunset', ar: 'غروب',
    theme: { colors: { primary: '20 90% 55%', primaryForeground: '0 0% 100%', accent: '330 75% 55%', accentForeground: '0 0% 100%', background: '30 40% 97%', foreground: '20 30% 20%' }, radius: '1rem', shadows: { soft: '0 8px 30px rgba(180,80,40,0.12)', medium: '0 14px 40px rgba(180,80,40,0.20)' } },
  },
  {
    id: 'forest',
    en: 'Forest', ar: 'غابة',
    theme: { colors: { primary: '150 55% 32%', primaryForeground: '0 0% 100%', accent: '35 70% 50%', accentForeground: '0 0% 100%', background: '120 20% 96%', foreground: '150 30% 15%' }, radius: '0.75rem', shadows: { soft: '0 8px 30px rgba(40,90,60,0.12)', medium: '0 14px 40px rgba(40,90,60,0.20)' } },
  },
  {
    id: 'royal',
    en: 'Royal', ar: 'ملكي',
    theme: { colors: { primary: '265 60% 45%', primaryForeground: '0 0% 100%', accent: '43 90% 55%', accentForeground: '260 30% 18%', background: '260 25% 96%', foreground: '260 30% 18%' }, radius: '1rem', shadows: { soft: '0 8px 30px rgba(90,60,150,0.14)', medium: '0 14px 40px rgba(90,60,150,0.22)' } },
  },
  {
    id: 'rose',
    en: 'Rose', ar: 'وردي',
    theme: { colors: { primary: '340 75% 50%', primaryForeground: '0 0% 100%', accent: '10 75% 55%', accentForeground: '0 0% 100%', background: '340 30% 97%', foreground: '340 30% 20%' }, radius: '1rem', shadows: { soft: '0 8px 30px rgba(180,40,90,0.12)', medium: '0 14px 40px rgba(180,40,90,0.22)' } },
  },
  {
    id: 'slate',
    en: 'Slate', ar: 'رمادي احترافي',
    theme: { colors: { primary: '215 35% 30%', primaryForeground: '0 0% 100%', accent: '200 80% 50%', accentForeground: '0 0% 100%', background: '210 20% 95%', foreground: '215 30% 18%' }, radius: '0.625rem', shadows: { soft: '0 8px 30px rgba(60,80,110,0.12)', medium: '0 14px 40px rgba(60,80,110,0.20)' } },
  },
  {
    id: 'emerald',
    en: 'Emerald', ar: 'زمرد',
    theme: { colors: { primary: '160 75% 35%', primaryForeground: '0 0% 100%', accent: '190 70% 45%', accentForeground: '0 0% 100%', background: '160 25% 96%', foreground: '175 30% 15%' }, radius: '0.875rem', shadows: { soft: '0 8px 30px rgba(20,110,90,0.12)', medium: '0 14px 40px rgba(20,110,90,0.20)' } },
  },
  {
    id: 'crimson',
    en: 'Crimson', ar: 'قرمزي',
    theme: { colors: { primary: '355 70% 45%', primaryForeground: '0 0% 100%', accent: '30 80% 50%', accentForeground: '0 0% 100%', background: '15 25% 96%', foreground: '355 30% 18%' }, radius: '0.75rem', shadows: { soft: '0 8px 30px rgba(170,40,50,0.12)', medium: '0 14px 40px rgba(170,40,50,0.22)' } },
  },
];

// ── Extract dominant palette from an image URL ─────
async function extractPaletteFromImage(url: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 72;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('no ctx'));
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        const buckets = new Map<string, { count: number; h: number; s: number; l: number }>();
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 200) continue;
          // Skip near-white / near-black
          const max = Math.max(r, g, b) / 255, min = Math.min(r, g, b) / 255;
          const l = (max + min) / 2;
          if (l > 0.94 || l < 0.06) continue;
          const s = max === min ? 0 : (l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min));
          if (s < 0.15) continue; // too gray
          let h = 0;
          if (max !== min) {
            const d = max - min;
            const rr = r / 255, gg = g / 255, bb = b / 255;
            switch (max) {
              case rr: h = (gg - bb) / d + (gg < bb ? 6 : 0); break;
              case gg: h = (bb - rr) / d + 2; break;
              case bb: h = (rr - gg) / d + 4; break;
            }
            h *= 60;
          }
          const bucket = Math.round(h / 15) * 15; // 15° buckets
          const key = `${bucket}`;
          const prev = buckets.get(key);
          if (prev) {
            prev.count++;
            prev.h += h; prev.s += s; prev.l += l;
          } else {
            buckets.set(key, { count: 1, h, s, l });
          }
        }
        const sorted = [...buckets.values()].sort((a, b) => b.count - a.count);
        if (!sorted.length) return reject(new Error('no colors'));
        const palette = sorted.slice(0, 4).map((b) => {
          const h = Math.round(b.h / b.count);
          const s = Math.round((b.s / b.count) * 100);
          const l = Math.round((b.l / b.count) * 100);
          return `${h} ${s}% ${l}%`;
        });
        resolve(palette);
      } catch (err) { reject(err); }
    };
    img.onerror = () => reject(new Error('image load failed'));
    img.src = url;
  });
}

function themeFromPalette(palette: string[]): CompanyTheme {
  const primary = palette[0] || '217 72% 42%';
  const accent = palette[1] || palette[0] || '43 90% 55%';
  // Derive light background from primary hue
  const m = primary.match(/^(-?\d+)\s+(-?\d+)%\s+(-?\d+)%$/);
  const h = m ? m[1] : '217';
  return {
    colors: {
      primary,
      primaryForeground: '0 0% 100%',
      accent,
      accentForeground: '0 0% 100%',
      background: `${h} 25% 96%`,
      foreground: `${h} 30% 18%`,
    },
    radius: '0.875rem',
    shadows: {
      soft: '0 8px 30px rgba(40,60,90,0.12)',
      medium: '0 14px 40px rgba(40,60,90,0.20)',
    },
  };
}

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

  // Each company (including sandbox) has its own theme; no inheritance from parent.
  const inherited = false;
  const baseTheme: CompanyTheme = useMemo(
    () => themeRow?.theme || DEFAULT_THEME,
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

  // ── Logo palette extraction ────────────────────────
  const [extracting, setExtracting] = useState(false);
  const [logoPalette, setLogoPalette] = useState<string[] | null>(null);
  const generateFromLogo = async () => {
    try {
      const path = company.logo_url;
      if (!path) {
        toast({ title: t('لا يوجد شعار', 'No logo uploaded'), description: t('ارفع شعار الشركة أولاً من صفحة الشركة.', 'Upload a logo on the company page first.'), variant: 'destructive' });
        return;
      }
      setExtracting(true);
      let url = path;
      if (!/^https?:\/\//i.test(path)) {
        const { data, error } = await supabase.storage.from('company-documents').createSignedUrl(path, 300);
        if (error || !data?.signedUrl) throw error || new Error('sign failed');
        url = data.signedUrl;
      }
      const palette = await extractPaletteFromImage(url);
      setLogoPalette(palette);
      setDraft(themeFromPalette(palette));
      toast({ title: t('تم توليد ثيم من الشعار — راجع ثم احفظ', 'Theme generated from logo — review then save') });
    } catch (e: any) {
      toast({ title: t('تعذّر قراءة الشعار', 'Could not read logo'), description: e?.message, variant: 'destructive' });
    } finally {
      setExtracting(false);
    }
  };

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
      setDraft(parsed?.theme || parsed);
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

  // ── Theme version history ─────────────────────────────
  const { data: versions } = useQuery({
    queryKey: ['company-theme-versions', company.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_theme_versions')
        .select('id, theme, label, source, changed_by, created_at')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const rollback = useMutation({
    mutationFn: async (theme: CompanyTheme | null) => {
      const { error } = await supabase
        .from('companies')
        .update({ theme: theme as any, theme_updated_at: new Date().toISOString() })
        .eq('id', company.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t('تم استرجاع الثيم', 'Theme restored') });
      qc.invalidateQueries({ queryKey: ['company-theme-editor', company.id] });
      qc.invalidateQueries({ queryKey: ['company-theme-versions', company.id] });
      qc.invalidateQueries({ queryKey: ['company-theme'] });
    },
    onError: (e: any) => toast({ title: t('فشل الاسترجاع', 'Restore failed'), description: e.message, variant: 'destructive' }),
  });

  // ── AI theme proposals ───────────────────────────────
  const { data: proposals } = useQuery({
    queryKey: ['company-theme-proposals', company.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_theme_proposals')
        .select('id, theme, source, status, created_at')
        .eq('company_id', company.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const approveProposal = useMutation({
    mutationFn: async ({ id, theme }: { id: string; theme: CompanyTheme }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const reviewedBy = userRes.user?.id ?? null;

      const { error: themeError } = await supabase
        .from('companies')
        .update({ theme: theme as any, theme_updated_at: new Date().toISOString() })
        .eq('id', company.id);
      if (themeError) throw themeError;

      const { error: proposalError } = await supabase
        .from('company_theme_proposals')
        .update({ status: 'approved', reviewed_by: reviewedBy, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (proposalError) throw proposalError;
    },
    onSuccess: () => {
      toast({ title: t('تم اعتماد الثيم', 'Theme proposal approved') });
      qc.invalidateQueries({ queryKey: ['company-theme-editor', company.id] });
      qc.invalidateQueries({ queryKey: ['company-theme-proposals', company.id] });
      qc.invalidateQueries({ queryKey: ['company-theme-versions', company.id] });
      qc.invalidateQueries({ queryKey: ['company-theme'] });
    },
    onError: (e: any) => toast({ title: t('فشل الاعتماد', 'Approval failed'), description: e.message, variant: 'destructive' }),
  });

  const rejectProposal = useMutation({
    mutationFn: async (id: string) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('company_theme_proposals')
        .update({ status: 'rejected', reviewed_by: userRes.user?.id ?? null, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t('تم رفض المقترح', 'Proposal rejected') });
      qc.invalidateQueries({ queryKey: ['company-theme-proposals', company.id] });
    },
    onError: (e: any) => toast({ title: t('فشل الرفض', 'Reject failed'), description: e.message, variant: 'destructive' }),
  });

  const endpoint = `${window.location.origin.replace('http://', 'https://')}/functions/v1/company-theme?company_id=${company.id}`;
  const supabaseEndpoint = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID || ''}.supabase.co/functions/v1/company-theme?company_id=${company.id}`;
  const currentThemeResponse = useMemo(() => ({
    company_id: company.id,
    slug: company.slug,
    theme: themeRow?.theme ?? null,
    effective_theme: baseTheme,
    inherited_from: inherited ? company.sandbox_of_company_id ?? null : null,
    updated_at: themeRow?.updated_at ?? null,
    accepted_payload_shape: {
      theme: {
        colors: {
          primary: 'H S% L%',
          primaryForeground: 'H S% L%',
          accent: 'H S% L%',
          accentForeground: 'H S% L%',
          background: 'H S% L%',
          foreground: 'H S% L%',
        },
        radius: '0.75rem',
        shadows: {
          soft: 'CSS box-shadow value',
          medium: 'CSS box-shadow value',
        },
      },
    },
  }), [baseTheme, company.id, company.sandbox_of_company_id, company.slug, inherited, themeRow?.theme, themeRow?.updated_at]);

  // ── Proposal link (GET, no headers/body/API key — for AI web fetchers like Claude) ──
  const proposeEndpoint = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID || ''}.supabase.co/functions/v1/company-theme-propose`;
  function base64UrlEncode(obj: unknown) {
    const str = JSON.stringify(obj);
    const b64 = btoa(unescape(encodeURIComponent(str)));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  const proposalUrlForDraft = () => {
    const url = new URL(proposeEndpoint);
    url.searchParams.set('company_id', company.id);
    url.searchParams.set('theme', base64UrlEncode({ theme: draft }));
    url.searchParams.set('source', 'claude');
    return url.toString();
  };

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
              'خصّص ألوان وشكل هذه الشركة. كل شركة (بما فيها التجريبية) لها ثيم مستقل تماماً.',
              'Customize this company\'s look. Every company (including sandboxes) has a fully independent theme.'
            )}
          </p>
        </div>
      </div>

      {company.is_sandbox && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 text-sm">
          <FlaskConical className="w-4 h-4" />
          {t('هذه شركة تجريبية بثيم مستقل تماماً عن الشركة الأصلية.',
             'This sandbox has its own theme, fully independent from parent.')}
        </div>
      )}

      {/* Presets gallery */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">{t('ثيمات جاهزة', 'Ready-made presets')}</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('اختر ثيماً جاهزاً بضغطة — يتحمّل في المعاينة، ثم احفظ من الأسفل.',
             'Click a preset to load it into the editor below, then Save to apply.')}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PRESETS.map((p) => {
            const c = p.theme.colors!;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => { setDraft(p.theme); toast({ title: t('تم تحميل الثيم — احفظ للتطبيق', 'Preset loaded — Save to apply') }); }}
                className="group text-start rounded-xl border border-border/60 bg-white/60 hover:bg-white transition p-3 space-y-2 hover:shadow-md"
                style={{ borderRadius: p.theme.radius }}
              >
                <div className="flex items-center gap-1.5">
                  {[c.primary, c.accent, c.background, c.foreground].map((col, i) => (
                    <span key={i} className="w-6 h-6 rounded-md border border-border/50" style={{ background: `hsl(${col})` }} />
                  ))}
                </div>
                <div className="text-sm font-medium">{isRTL ? p.ar : p.en}</div>
                <div
                  className="text-[11px] px-2 py-1 rounded-md inline-block"
                  style={{ background: `hsl(${c.primary})`, color: `hsl(${c.primaryForeground})` }}
                >
                  {t('عيّنة', 'Sample')}
                </div>
              </button>
            );
          })}
        </div>

        {/* Persistent Glass surface toggle — layered on top of any preset */}
        <div className="mt-2 flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-white/50 p-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {t('التأثير الزجاجي (Glassmorphism)', 'Glassmorphism effect')}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {t('يضيف تأثيراً زجاجياً شفافاً على البطاقات والقوائم مع الحفاظ على ألوان الثيم الحالي. متاح مع أي ثيم.',
                 'Adds a frosted glass surface to cards and menus while preserving the current palette. Available with any preset.')}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!!draft.glass}
            onClick={() => setDraft((d) => ({ ...d, glass: !d.glass }))}
            className="inline-flex items-center gap-2 shrink-0 cursor-pointer select-none"
          >
            <span
              className={`relative flex items-center w-11 h-6 rounded-full border overflow-hidden transition-colors ${
                draft.glass ? 'bg-primary border-primary justify-end' : 'bg-muted border-border justify-start'
              }`}
            >
              <span className="w-5 h-5 mx-0.5 rounded-full bg-white shadow transition-transform" />
            </span>
            <span className="text-sm font-medium">{draft.glass ? t('مُفعّل', 'On') : t('مُعطّل', 'Off')}</span>
          </button>
        </div>
      </Card>

      {/* Generate from logo */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">{t('توليد ثيم من الشعار', 'Generate theme from logo')}</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('يقوم النظام باستخراج الألوان المهيمنة من شعار الشركة ويولّد ثيماً مقترحاً. راجع في المحرر ثم احفظ.',
             'The system extracts dominant colors from the company logo and builds a suggested theme. Review in the editor then Save.')}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={generateFromLogo} disabled={extracting || !company.logo_url} className="gap-2">
            <Wand2 className="w-4 h-4" />
            {extracting ? t('جارٍ التحليل…', 'Analyzing…') : t('توليد من الشعار', 'Generate from logo')}
          </Button>
          {!company.logo_url && (
            <span className="text-xs text-muted-foreground">
              {t('لا يوجد شعار مرفوع لهذه الشركة.', 'No logo uploaded for this company.')}
            </span>
          )}
          {logoPalette && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{t('اللوحة:', 'Palette:')}</span>
              {logoPalette.map((c, i) => (
                <span key={i} className="w-6 h-6 rounded-md border border-border/50" style={{ background: `hsl(${c})` }} />
              ))}
            </div>
          )}
        </div>
      </Card>

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

      {/* Theme proposals for AI web fetchers (Claude, etc.) */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">
            {t('اقتراحات Claude للثيم', 'Claude theme proposals')}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t(
            'هذا الرابط يسمح لـ Claude بإنشاء مقترح ثيم فقط بدون مفتاح API. لن يتم تطبيق أي تغيير إلا بعد اعتمادك له من هنا.',
            'This link lets Claude create a theme proposal only, with no API key. Nothing is applied until you approve it here.'
          )}
        </p>

        <div className="rounded-lg bg-muted/40 border p-3 space-y-2">
          <div className="text-xs font-mono opacity-70">{t('رابط إنشاء المقترح:', 'Proposal URL:')}</div>
          <div className="text-xs font-mono break-all">
            {proposalUrlForDraft()}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="gap-2"
            onClick={() => {
              navigator.clipboard.writeText(proposalUrlForDraft());
              toast({ title: t('تم نسخ رابط المقترح', 'Proposal link copied') });
            }}
          >
            <Copy className="w-4 h-4" /> {t('نسخ رابط المقترح', 'Copy proposal link')}
          </Button>
        </div>

        <div className="text-xs text-primary bg-primary/5 border border-primary/20 rounded-lg p-3">
          {t(
            'آمن للمشاركة مع Claude: الرابط لا يحتوي على مفتاح ولا يغيّر الثيم مباشرة. سيظهر المقترح هنا للمراجعة والاعتماد.',
            'Safe to share with Claude: the link contains no key and does not change the theme directly. The proposal appears here for review and approval.'
          )}
        </div>

        <div className="space-y-2 pt-2 border-t border-border/50">
          <div className="text-sm font-medium">{t('المقترحات المعلقة', 'Pending proposals')}</div>
          {(!proposals || proposals.length === 0) && (
            <div className="text-sm text-muted-foreground py-4 text-center">
              {t('لا توجد مقترحات معلقة.', 'No pending proposals.')}
            </div>
          )}
          {proposals?.map((proposal) => {
            const proposedTheme = proposal.theme as CompanyTheme;
            const swatches = proposedTheme?.colors ? [proposedTheme.colors.primary, proposedTheme.colors.accent, proposedTheme.colors.background, proposedTheme.colors.foreground].filter(Boolean) : [];
            return (
              <div key={proposal.id} className="p-3 rounded-lg border bg-card/70 space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1">
                    {swatches.map((c, i) => (
                      <span key={i} className="w-6 h-6 rounded-md border border-border/60" style={{ background: `hsl(${c})` }} />
                    ))}
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <div className="text-sm font-medium truncate">{proposal.source || 'Claude'}</div>
                    <div className="text-[11px] text-muted-foreground">{new Date(proposal.created_at).toLocaleString()}</div>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setDraft(proposedTheme)}>
                    <Palette className="w-3 h-3" /> {t('معاينة', 'Preview')}
                  </Button>
                  <Button size="sm" className="gap-1" onClick={() => approveProposal.mutate({ id: proposal.id, theme: proposedTheme })} disabled={approveProposal.isPending}>
                    <CheckCircle2 className="w-3 h-3" /> {t('اعتماد', 'Approve')}
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1 text-destructive" onClick={() => rejectProposal.mutate(proposal.id)} disabled={rejectProposal.isPending}>
                    <XCircle className="w-3 h-3" /> {t('رفض', 'Reject')}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* External AI tool instructions */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">
            {t('تعليمات لأدوات الذكاء الاصطناعي الخارجية', 'Instructions for external AI tools')}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t(
            'انسخ التعليمات التالية والصقها في الأداة المفضلة لديك. التعليمات تحتوي شكل JSON الحالي، لذلك لا تحتاج الأداة لعمل GET إذا كان الوصول محجوباً.',
            'Copy the instructions below into your preferred AI tool. They include the current JSON shape, so the tool does not need GET if access is blocked.'
          )}
        </p>

        <Tabs defaultValue="chatgpt" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chatgpt" className="gap-2">
              <Bot className="w-4 h-4" /> ChatGPT
            </TabsTrigger>
            <TabsTrigger value="claude" className="gap-2">
              <Sparkles className="w-4 h-4" /> Claude
            </TabsTrigger>
          </TabsList>

          {(['chatgpt', 'claude'] as const).map((tool) => {
            const toolName = tool === 'chatgpt' ? 'ChatGPT' : 'Claude';
            const placeholderKey = '<MY_API_KEY>';
            const currentThemeJson = JSON.stringify(currentThemeResponse, null, 2);
            const buildInstructions = (key: string) => {
              const safeProposalUrl = proposalUrlForDraft();
              const isClaude = tool === 'claude';
              return `You are a brand theme designer for the company "${company.name_ar || company.name || ''}".

You will ${isClaude ? 'submit a safe pending theme proposal for this company' : 'edit this company\'s live theme through Rasdah\'s Theme API'}.

IMPORTANT
- The current theme JSON and accepted payload shape are already included below.
- Do NOT ask me to run GET/curl or paste JSON. If you cannot reach the endpoint, continue by designing the JSON payload from the included shape.
- ${isClaude ? 'For Claude, use the safe proposal link only. It is a normal GET URL, needs no headers, and does not apply changes directly.' : 'To actually save through the API, you need code execution (ChatGPT → Advanced Data Analysis). Plain web browsing often cannot send custom headers or PUT/POST bodies.'}
- If saving/proposal submission fails, output the final JSON payload only so I can paste/import it manually in Rasdah.

${isClaude ? `SAFE PROPOSAL ENDPOINT
Use only the proposal URL below. It needs no API key and creates a pending draft only.` : `ENDPOINT (API key can be passed either as header OR as ?api_key= query param)
${supabaseEndpoint}`}

${isClaude ? `EASIEST OPTION FOR CLAUDE — SAFE PROPOSAL LINK (GET, no headers/body/API key)
This documented proposal endpoint does not apply the theme directly and does not include any secret. It only creates a pending proposal that the Rasdah admin reviews and approves in the Theme page.

Build the theme JSON, base64url-encode {"theme": YOUR_THEME_OBJECT}, then visit this URL after replacing the theme parameter value:

${safeProposalUrl}

To use it:
1. Ask me for the brand direction.
2. Design the theme JSON using the shape below.
3. Replace the base64 "theme" value in the proposal URL with your own base64url-encoded JSON.
4. Visit the link. The page will confirm that a proposal was created.
5. Tell me to return to Rasdah and approve the pending proposal.
6. If visiting fails for any reason, fall back to the JSON payload for manual import.` : `AUTH — pick ONE of these:
  Header:  x-api-key: ${key}
  Header:  Authorization: Bearer ${key}
  Query:   append &api_key=${key} to the URL`}

HOW IT WORKS
1. Use this current response/shape instead of asking me to run GET:

${currentThemeJson}

2. Design a new theme. Colors must be HSL triples in the form "H S% L%" (no hsl() wrapper, no #hex). Keep the same top-level shape: { "theme": { "colors": ..., "radius": ..., "shadows": ... } }.

${isClaude ? `3. Submit the proposal using the safe proposal URL above. Do not use headers, API keys, PUT, or POST.

4. If your tool cannot visit the proposal URL, output only the final JSON payload so I can import it manually.` : `3. Save the new theme with PUT (or POST — both work):
   curl -X PUT "${supabaseEndpoint}&api_key=${key}" \\
     -H "Content-Type: application/json" \\
     -d '{ "theme": { ... } }'

   If your tool can't do PUT, use POST — the endpoint accepts both.
   If your tool can only do GET or cannot reach the endpoint, do not stop; provide the final JSON payload for manual import.`}

RULES
- Never invent field names. Use only the fields included in the current response/shape above.
- Always keep enough contrast between "background" and "foreground", and between each color and its *Foreground pair (WCAG AA minimum).
- ${isClaude ? 'After successful proposal submission, tell me to approve the pending proposal in Rasdah. If submission fails, show the payload you attempted to submit.' : 'After every successful save, show me the applied result. If saving fails, show the payload you attempted to save.'}
- Every save is auto-versioned server-side, so it's safe to iterate.

${isClaude ? 'NO API KEY IS NEEDED FOR THE SAFE PROPOSAL LINK.' : `MY API KEY: ${key === placeholderKey ? '<paste the key I generated in Rasdah here>' : key}`}

Now, ${tool === 'chatgpt' ? 'ask me what mood or brand direction I want' : 'ask me for the mood, brand keywords, or a reference image'}, then design and ${isClaude ? 'submit the proposal' : 'apply the theme'}.`;
            };

            const instructions = buildInstructions(placeholderKey);
            const instructionsWithFreshKey = freshKey ? buildInstructions(freshKey) : null;

            return (
              <TabsContent key={tool} value={tool} className="space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {t(`تعليمات جاهزة للصقها في ${toolName}`, `Ready-to-paste prompt for ${toolName}`)}
                  </span>
                  <div className="flex gap-2">
                    {instructionsWithFreshKey && (
                      <Button
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          navigator.clipboard.writeText(instructionsWithFreshKey);
                          toast({ title: t('تم النسخ مع المفتاح', 'Copied with key') });
                        }}
                      >
                        <Copy className="w-4 h-4" /> {t('نسخ مع المفتاح', 'Copy with key')}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        navigator.clipboard.writeText(instructions);
                        toast({ title: t('تم نسخ التعليمات', 'Instructions copied') });
                      }}
                    >
                      <Copy className="w-4 h-4" /> {t('نسخ', 'Copy')}
                    </Button>
                  </div>
                </div>
                <Textarea
                  readOnly
                  value={instructions}
                  className="font-mono text-xs min-h-[320px] bg-white/70"
                  onFocus={(e) => e.currentTarget.select()}
                />
              </TabsContent>
            );
          })}
        </Tabs>
      </Card>

      {/* Version history */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">{t('سجل نسخ الثيم', 'Theme version history')}</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t(
            'كل تعديل يُحفظ تلقائياً هنا. يمكنك المعاينة أو الاسترجاع لأي نسخة سابقة.',
            'Every change is auto-saved here. Preview or roll back to any previous version.'
          )}
        </p>

        {(!versions || versions.length === 0) && (
          <div className="text-sm text-muted-foreground py-6 text-center">
            {t('لا يوجد سجل بعد.', 'No history yet.')}
          </div>
        )}

        <div className="space-y-2">
          {versions?.map((v) => {
            const th = (v.theme as CompanyTheme | null);
            const swatches = th?.colors ? [th.colors.primary, th.colors.accent, th.colors.background, th.colors.foreground].filter(Boolean) : [];
            return (
              <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg border bg-white/60">
                <div className="flex items-center gap-1">
                  {swatches.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">{t('فارغ (توارث)', 'empty (inherit)')}</span>
                  )}
                  {swatches.map((c, i) => (
                    <span
                      key={i}
                      className="w-6 h-6 rounded-md border border-border/60"
                      style={{ background: `hsl(${c})` }}
                    />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {v.label || t('نسخة محفوظة', 'Saved version')}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(v.created_at).toLocaleString()} · {v.source}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setDraft(th || DEFAULT_THEME);
                    toast({ title: t('تم تحميلها في المحرر — راجع ثم احفظ', 'Loaded into editor — review then save') });
                  }}
                  className="gap-1"
                >
                  <Eye className="w-4 h-4" /> {t('معاينة', 'Preview')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={rollback.isPending}
                  onClick={() => {
                    if (confirm(t('استرجاع هذه النسخة كثيم حالي؟', 'Restore this version as current theme?'))) {
                      rollback.mutate(th);
                    }
                  }}
                  className="gap-1"
                >
                  <Undo2 className="w-4 h-4" /> {t('استرجاع', 'Restore')}
                </Button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
